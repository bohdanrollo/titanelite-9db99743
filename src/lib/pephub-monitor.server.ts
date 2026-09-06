// Server-only PepHub trusted-source sale monitoring engine.
// Fetches publicly available vendor pages, extracts promotion data with the
// Lovable AI gateway, de-duplicates promotions, and queues alert emails
// through the existing Titan Elite email infrastructure.

import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const SITE_URL = "https://titanelite.org";
const UA =
  "Mozilla/5.0 (compatible; TitanEliteSaleMonitor/1.0; +https://titanelite.org/pephub)";

export type Frequency = "1h" | "6h" | "12h" | "24h" | "disabled";

const FREQ_HOURS: Record<string, number> = { "1h": 1, "6h": 6, "12h": 12, "24h": 24 };

export type Detection = {
  has_sale: boolean;
  title: string | null;
  description: string | null;
  discount_type: string | null;
  discount_value: string | null;
  coupon_code: string | null;
  promotion_url: string | null;
  start_date: string | null;
  end_date: string | null;
  confidence_score: number;
  evidence: string | null;
};

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function looksBlocked(text: string, status: number): boolean {
  if (status === 401 || status === 403 || status === 429) return true;
  const t = text.toLowerCase().slice(0, 4000);
  return (
    t.includes("captcha") ||
    t.includes("cloudflare") && t.includes("checking your browser") ||
    t.includes("enable javascript and cookies to continue") ||
    t.includes("access denied")
  );
}

export function confidenceLevel(score: number): "high" | "medium" | "low" {
  if (score >= 80) return "high";
  if (score >= 55) return "medium";
  return "low";
}

const LEVEL_RANK: Record<string, number> = { low: 1, medium: 2, high: 3 };

export function meetsThreshold(level: string, threshold: string): boolean {
  return (LEVEL_RANK[level] ?? 0) >= (LEVEL_RANK[threshold] ?? 3);
}

function normalize(v: string | null | undefined): string {
  return (v ?? "").toLowerCase().replace(/[^a-z0-9%]+/g, "");
}

export function fingerprintOf(d: Detection): string {
  // Normalized promotion identity: discount + code + coarse title.
  const title = normalize(d.title).slice(0, 32);
  return [normalize(d.discount_type), normalize(d.discount_value), normalize(d.coupon_code), title]
    .join("|");
}

async function fetchPage(url: string): Promise<{ text: string; status: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: controller.signal,
    });
    const body = await res.text();
    return { text: body, status: res.status };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Many vendor storefronts render their banners in the browser, so the raw HTML
 * carries no sale copy. Pull readable strings out of embedded app data
 * (Next.js flight payloads, __NEXT_DATA__, JSON-LD, Shopify bootstraps).
 */
function extractEmbeddedData(html: string): string {
  const chunks: string[] = [];
  const scripts = html.match(/<script[\s\S]*?<\/script>/gi) ?? [];
  for (const script of scripts.slice(0, 200)) {
    const inner = script.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "");
    if (inner.length < 40 || inner.length > 300000) continue;
    // Keep human-readable string literals only.
    const strings = inner.match(/"((?:[^"\\]|\\.){6,200})"/g) ?? [];
    for (const raw of strings) {
      const value = raw.slice(1, -1).replace(/\\u0026/g, "&").replace(/\\"/g, '"').replace(/\\n/g, " ");
      if (!/[a-z]{3}/i.test(value)) continue;
      if (/^(https?:\/\/|\/|[a-f0-9]{16,}$)/i.test(value)) continue;
      if (/[{}<>]/.test(value)) continue;
      chunks.push(value);
    }
  }
  return chunks.join(" | ").replace(/\s+/g, " ").slice(0, 20000);
}

const SALE_HINT = /(sale|deal|promo|discount|coupon|% ?off|save \d|bogo|black friday|labor day|memorial day|cyber monday|holiday)/i;

/** Same-origin links whose URL or anchor text looks promotion related. */
function findSaleLinks(html: string, baseUrl: string): string[] {
  const out: string[] = [];
  const base = new URL(baseUrl);
  const anchors = html.match(/<a\b[^>]*href=["'][^"']+["'][^>]*>[\s\S]{0,160}?<\/a>/gi) ?? [];
  for (const a of anchors) {
    const href = a.match(/href=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    const label = stripHtml(a);
    if (!SALE_HINT.test(href) && !SALE_HINT.test(label)) continue;
    try {
      const abs = new URL(href, base);
      if (abs.origin !== base.origin) continue;
      abs.hash = "";
      if (!out.includes(abs.toString())) out.push(abs.toString());
    } catch {
      /* ignore malformed href */
    }
  }
  return out.slice(0, 3);
}

/**
 * Browser-style read: renders the page (JavaScript included) through a public
 * reader service and returns plain text. Best-effort — returns null on failure.
 */
async function fetchRendered(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { "User-Agent": UA, Accept: "text/plain", "X-Return-Format": "text" },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const text = (await res.text()).replace(/\s+/g, " ").trim();
    return text.length > 200 ? text.slice(0, 20000) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Collect everything a visitor would see: page text, embedded app data, sale pages, rendered view. */
async function collectSourceText(
  url: string,
  html: string,
): Promise<{ text: string; rendered: boolean }> {
  const parts: string[] = [];
  const visible = stripHtml(html);
  if (visible) parts.push(`HOMEPAGE TEXT: ${visible.slice(0, 12000)}`);

  const embedded = extractEmbeddedData(html);
  if (embedded && SALE_HINT.test(embedded)) parts.push(`EMBEDDED PAGE DATA: ${embedded}`);

  for (const link of findSaleLinks(html, url)) {
    try {
      const sub = await fetchPage(link);
      if (sub.status >= 400) continue;
      const subText = stripHtml(sub.text);
      if (subText.length > 100) parts.push(`PAGE ${link}: ${subText.slice(0, 6000)}`);
    } catch {
      /* skip unreachable sub-page */
    }
  }

  const joined = parts.join("\n\n");
  const needsRender = visible.length < 1500 || !SALE_HINT.test(joined);
  let rendered = false;
  if (needsRender) {
    const renderedText = await fetchRendered(url);
    if (renderedText) {
      rendered = true;
      parts.unshift(`BROWSER-RENDERED PAGE (what a visitor sees): ${renderedText}`);
    }
  }

  return { text: parts.join("\n\n").slice(0, 30000), rendered };
}


async function detectSale(sourceName: string, url: string, pageText: string): Promise<Detection> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI monitoring is not configured");
  const provider = createLovableAiGatewayProvider(apiKey);

  const today = new Date().toISOString().slice(0, 10);
  const prompt = `Today is ${today}. Below is the visible text of the public homepage of the vendor "${sourceName}" (${url}).

Decide whether the page clearly advertises an ACTIVE sale or promotion right now. The mere presence of the word "sale" (e.g. a "Sale" nav link, "final sale" policy text, or a permanent clearance category) is NOT a promotion.

Return STRICT JSON only, no markdown:
{
  "has_sale": boolean,
  "title": string|null,
  "description": string|null,
  "discount_type": "percent"|"amount"|"bogo"|"other"|null,
  "discount_value": string|null,
  "coupon_code": string|null,
  "promotion_url": string|null,
  "start_date": "YYYY-MM-DD"|null,
  "end_date": "YYYY-MM-DD"|null,
  "confidence_score": 0-100,
  "evidence": string|null
}

Scoring guide: 80-100 = an explicit, clearly current discount with concrete value and/or code; 55-79 = promotional language with unclear dates or value; below 55 = ambiguous, cached, or generic. Use evidence to quote the exact sale text you relied on. If no promotion, set has_sale false and confidence_score 0.

PAGE TEXT:
"""${pageText.slice(0, 12000)}"""`;

  const { text } = await generateText({
    model: provider("google/gemini-2.5-flash"),
    prompt,
  });

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Could not read a detection result");
  const parsed = JSON.parse(match[0]) as Partial<Detection>;
  return {
    has_sale: Boolean(parsed.has_sale),
    title: parsed.title ?? null,
    description: parsed.description ?? null,
    discount_type: parsed.discount_type ?? null,
    discount_value: parsed.discount_value ?? null,
    coupon_code: parsed.coupon_code ?? null,
    promotion_url: parsed.promotion_url ?? null,
    start_date: parsed.start_date ?? null,
    end_date: parsed.end_date ?? null,
    confidence_score: Math.max(0, Math.min(100, Number(parsed.confidence_score) || 0)),
    evidence: parsed.evidence ?? null,
  };
}

type Settings = {
  automatic_sending: boolean;
  require_admin_approval: boolean;
  minimum_confidence: string;
  monitoring_enabled: boolean;
  sale_alerts_enabled: boolean;
  admin_notify_email: string | null;
};

export async function getSettings(): Promise<Settings> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("pephub_monitor_settings")
    .select(
      "automatic_sending, require_admin_approval, minimum_confidence, monitoring_enabled, sale_alerts_enabled, admin_notify_email",
    )
    .eq("id", 1)
    .maybeSingle();
  return (data as Settings) ?? {
    automatic_sending: false,
    require_admin_approval: true,
    minimum_confidence: "high",
    monitoring_enabled: true,
    sale_alerts_enabled: true,
    admin_notify_email: null,
  };
}

/** Check one source. Returns number of new promotions detected. */
export async function monitorSource(
  sourceId: string,
  triggeredBy: "cron" | "admin" = "cron",
): Promise<{ salesFound: number; status: string; error?: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const settings = await getSettings();

  const { data: source } = await supabaseAdmin
    .from("pephub_sources")
    .select("id, name, url, affiliate_url, discount_code")
    .eq("id", sourceId)
    .maybeSingle();
  if (!source) return { salesFound: 0, status: "error", error: "Source not found" };

  const { data: run } = await supabaseAdmin
    .from("pephub_monitor_runs")
    .insert({ source_id: sourceId, triggered_by: triggeredBy })
    .select("id")
    .maybeSingle();

  const finish = async (
    status: string,
    salesFound: number,
    errorMessage: string | null,
    monitoringStatus: string,
  ) => {
    if (run?.id) {
      await supabaseAdmin
        .from("pephub_monitor_runs")
        .update({
          completed_at: new Date().toISOString(),
          status,
          sales_found: salesFound,
          error_message: errorMessage,
        })
        .eq("id", run.id);
    }
    const patch: Record<string, any> = {
      last_checked_at: new Date().toISOString(),
      monitoring_status: monitoringStatus,
      monitoring_error: errorMessage,
    };
    if (status === "success") {
      patch["last_successful_check_at"] = new Date().toISOString();
      patch["failure_count"] = 0;
      if (salesFound > 0) patch["last_sale_detected_at"] = new Date().toISOString();
    }
    await supabaseAdmin.from("pephub_sources").update(patch as never).eq("id", sourceId);
  };

  const bumpFailure = async (message: string, monitoringStatus: string) => {
    const { data: cur } = await supabaseAdmin
      .from("pephub_sources")
      .select("failure_count")
      .eq("id", sourceId)
      .maybeSingle();
    const count = (cur?.failure_count ?? 0) + 1;
    await supabaseAdmin.from("pephub_sources").update({ failure_count: count }).eq("id", sourceId);
    await finish("error", 0, message, monitoringStatus);
    if (count >= 3 && settings.admin_notify_email) {
      const { sendAppEmail } = await import("@/lib/email/send.server");
      await sendAppEmail({
        templateName: "pephub-sale",
        recipientEmail: settings.admin_notify_email,
        idempotencyKey: `pephub-monitor-error-${sourceId}-${count}`,
        templateData: {
          vendor_name: source.name,
          sale_title: "Monitoring error",
          discount: `${count} failed checks`,
          promotion_url: source.url,
          pephub_url: `${SITE_URL}/pephub`,
        },
      }).catch(() => undefined);
    }
    return { salesFound: 0, status: monitoringStatus, error: message };
  };

  let page: { text: string; status: number };
  try {
    page = await fetchPage(source.url);
  } catch (err) {
    return bumpFailure(
      `Unable to retrieve public promotion information: ${err instanceof Error ? err.message : "request failed"}`,
      "error",
    );
  }

  if (looksBlocked(page.text, page.status)) {
    return bumpFailure(
      "Monitoring unavailable — the site blocks automated access. This source must be checked manually.",
      "unavailable",
    );
  }
  if (page.status >= 400) {
    return bumpFailure(`Unable to retrieve public promotion information (HTTP ${page.status}).`, "error");
  }

  const text = stripHtml(page.text);
  if (text.length < 200) {
    return bumpFailure("Monitoring unavailable — no readable public page content.", "unavailable");
  }

  let detection: Detection;
  try {
    detection = await detectSale(source.name, source.url, text);
  } catch (err) {
    return bumpFailure(
      `Detection failed: ${err instanceof Error ? err.message : "unknown error"}`,
      "error",
    );
  }

  if (!detection.has_sale || detection.confidence_score <= 0) {
    // Mark previously seen active promotions as missing for expiry verification.
    await supabaseAdmin
      .from("pephub_promotions")
      .update({ missing_since: new Date().toISOString() })
      .eq("source_id", sourceId)
      .is("missing_since", null)
      .in("status", ["detected", "pending_review", "approved", "email_sent", "email_queued"]);
    await finish("success", 0, null, "no_sale");
    return { salesFound: 0, status: "no_sale" };
  }

  const fingerprint = fingerprintOf(detection);
  const level = confidenceLevel(detection.confidence_score);
  const nowIso = new Date().toISOString();

  const { data: existing } = await supabaseAdmin
    .from("pephub_promotions")
    .select("id, status")
    .eq("source_id", sourceId)
    .eq("fingerprint", fingerprint)
    .maybeSingle();

  let promotionId = existing?.id as string | undefined;
  let isNew = false;

  if (existing) {
    await supabaseAdmin
      .from("pephub_promotions")
      .update({
        last_verified_at: nowIso,
        missing_since: null,
        confidence_score: detection.confidence_score,
        confidence_level: level,
        end_date: detection.end_date,
        description: detection.description,
        evidence: detection.evidence,
      })
      .eq("id", existing.id);
  } else {
    isNew = true;
    const status = settings.require_admin_approval || !settings.automatic_sending
      ? "pending_review"
      : "detected";
    const { data: inserted, error } = await supabaseAdmin
      .from("pephub_promotions")
      .insert({
        source_id: sourceId,
        fingerprint,
        title: detection.title || "Promotion detected",
        description: detection.description,
        discount_type: detection.discount_type,
        discount_value: detection.discount_value,
        coupon_code: detection.coupon_code || source.discount_code,
        promotion_url: detection.promotion_url || source.affiliate_url || source.url,
        start_date: detection.start_date,
        end_date: detection.end_date,
        confidence_score: detection.confidence_score,
        confidence_level: level,
        status,
        evidence: detection.evidence,
      })
      .select("id")
      .maybeSingle();
    if (error && !error.message.includes("duplicate")) {
      return bumpFailure(`Could not save promotion: ${error.message}`, "error");
    }
    promotionId = inserted?.id as string | undefined;
  }

  // Mark other promotions for this source as missing (only this one is live).
  await supabaseAdmin
    .from("pephub_promotions")
    .update({ missing_since: nowIso })
    .eq("source_id", sourceId)
    .neq("fingerprint", fingerprint)
    .is("missing_since", null);

  await finish("success", isNew ? 1 : 0, null, "sale_detected");

  // Automatic emailing (safe rollout: off by default).
  if (
    isNew &&
    promotionId &&
    settings.automatic_sending &&
    settings.sale_alerts_enabled &&
    !settings.require_admin_approval &&
    meetsThreshold(level, settings.minimum_confidence)
  ) {
    await sendPromotionEmails(promotionId);
  }

  return { salesFound: isNew ? 1 : 0, status: "sale_detected" };
}

function isDue(frequency: string, lastChecked: string | null): boolean {
  if (frequency === "disabled") return false;
  const hours = FREQ_HOURS[frequency] ?? 6;
  if (!lastChecked) return true;
  return Date.now() - new Date(lastChecked).getTime() >= hours * 3600_000 - 60_000;
}

/** Run monitoring for every enabled source that is due. */
export async function runDueMonitoring(
  opts: { force?: boolean; triggeredBy?: "cron" | "admin" } = {},
): Promise<{ checked: number; salesFound: number; skipped: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const settings = await getSettings();
  if (!settings.monitoring_enabled && !opts.force) return { checked: 0, salesFound: 0, skipped: 0 };

  const { data: sources } = await supabaseAdmin
    .from("pephub_sources")
    .select("id, monitoring_frequency, last_checked_at")
    .eq("monitoring_enabled", true);

  let checked = 0;
  let salesFound = 0;
  let skipped = 0;
  for (const s of sources ?? []) {
    if (!opts.force && !isDue(s.monitoring_frequency ?? "6h", s.last_checked_at)) {
      skipped += 1;
      continue;
    }
    const res = await monitorSource(s.id, opts.triggeredBy ?? "cron");
    checked += 1;
    salesFound += res.salesFound;
  }
  await expirePromotions();
  return { checked, salesFound, skipped };
}

/** Expire promotions past their end date or missing from the source for 48h. */
export async function expirePromotions(): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const today = new Date().toISOString().slice(0, 10);
  const cutoff = new Date(Date.now() - 48 * 3600_000).toISOString();

  const { data: byDate } = await supabaseAdmin
    .from("pephub_promotions")
    .update({ status: "expired" })
    .lt("end_date", today)
    .not("end_date", "is", null)
    .neq("status", "expired")
    .select("id");

  const { data: byMissing } = await supabaseAdmin
    .from("pephub_promotions")
    .update({ status: "expired" })
    .lt("missing_since", cutoff)
    .neq("status", "expired")
    .select("id");

  return (byDate?.length ?? 0) + (byMissing?.length ?? 0);
}

function fmtDate(v: string | null): string {
  if (!v) return "";
  const d = new Date(`${v}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function templateDataFor(promo: Record<string, any>, source: Record<string, any>) {
  const discount = [promo["discount_value"], promo["discount_type"] === "percent" ? "OFF" : ""]
    .filter(Boolean)
    .join(" ")
    .trim();
  return {
    vendor_name: source["name"],
    sale_title: promo["title"],
    discount: discount || promo["title"],
    coupon_code: promo["coupon_code"] || "",
    sale_start: fmtDate(promo["start_date"]),
    sale_end: fmtDate(promo["end_date"]),
    promotion_url: source["affiliate_url"] || promo["promotion_url"] || source["url"],
    pephub_url: `${SITE_URL}/pephub`,
    detection_date: new Date(promo["first_detected_at"]).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
  };
}

/** Send a preview of the alert to a single address (admin testing only). */
export async function sendTestPromotionEmail(promotionId: string, toEmail: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendAppEmail } = await import("@/lib/email/send.server");
  const { data: promo } = await supabaseAdmin
    .from("pephub_promotions")
    .select("*, pephub_sources(name, url, affiliate_url)")
    .eq("id", promotionId)
    .maybeSingle();
  if (!promo) throw new Error("Promotion not found");
  const source = (promo as any).pephub_sources ?? {};
  const res = await sendAppEmail({
    templateName: "pephub-sale",
    recipientEmail: toEmail,
    idempotencyKey: `pephub-sale-test-${promotionId}-${Date.now()}`,
    templateData: templateDataFor(promo as any, source),
  });
  return { queued: res.queued };
}

/**
 * Queue the alert to every opted-in PepHub member exactly once.
 * The (promotion_id, email) unique index guarantees no duplicate sends,
 * even if this runs concurrently or repeatedly.
 */
export async function sendPromotionEmails(promotionId: string): Promise<{ sent: number; total: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendAppEmail } = await import("@/lib/email/send.server");

  const { data: promo } = await supabaseAdmin
    .from("pephub_promotions")
    .select("*, pephub_sources(name, url, affiliate_url)")
    .eq("id", promotionId)
    .maybeSingle();
  if (!promo) throw new Error("Promotion not found");
  if ((promo as any).status === "expired") throw new Error("This promotion has expired");

  const settings = await getSettings();
  if (!settings.sale_alerts_enabled) throw new Error("Sale alerts are turned off");

  const source = (promo as any).pephub_sources ?? {};
  const data = templateDataFor(promo as any, source);

  const { data: members } = await supabaseAdmin
    .from("pephub_members")
    .select("id, name, email")
    .eq("subscribed", true);

  let sent = 0;
  for (const m of members ?? []) {
    const email = m.email.toLowerCase();
    // Claim the recipient first — unique index makes this idempotent.
    const { data: claimed, error: claimErr } = await supabaseAdmin
      .from("pephub_sale_emails")
      .insert({ promotion_id: promotionId, member_id: m.id, email, status: "queued" })
      .select("id")
      .maybeSingle();
    if (claimErr || !claimed) continue; // already emailed about this promotion

    const res = await sendAppEmail({
      templateName: "pephub-sale",
      recipientEmail: m.email,
      idempotencyKey: `pephub-sale-${promotionId}-${email}`,
      templateData: { ...data, name: m.name },
    });

    await supabaseAdmin
      .from("pephub_sale_emails")
      .update(
        res.queued
          ? { status: "sent", sent_at: new Date().toISOString() }
          : { status: "failed", error_message: "Email could not be queued" },
      )
      .eq("id", claimed.id);
    if (res.queued) sent += 1;
  }

  await supabaseAdmin
    .from("pephub_promotions")
    .update({
      status: "email_sent",
      email_sent_at: new Date().toISOString(),
      recipients: ((promo as any).recipients ?? 0) + sent,
    })
    .eq("id", promotionId);

  return { sent, total: (members ?? []).length };
}
