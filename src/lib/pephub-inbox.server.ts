// Server-only vendor newsletter inbox watcher.
// Reads the shared PepHub deals inbox through the Gmail connector gateway,
// matches each vendor email to a trusted source, and turns sale/discount
// emails into PepHub promotions using the existing detection + email pipeline.

import { detectSale, fingerprintOf, confidenceLevel, getSettings, meetsThreshold } from "@/lib/pephub-monitor.server";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

type GmailHeader = { name: string; value: string };

function gatewayHeaders() {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const gmailKey = process.env.GOOGLE_MAIL_API_KEY;
  if (!lovableKey || !gmailKey) {
    throw new Error("The vendor inbox is not connected yet.");
  }
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": gmailKey,
  };
}

async function gmail<T>(path: string): Promise<T> {
  const res = await fetch(`${GATEWAY_URL}${path}`, { headers: gatewayHeaders() });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Inbox request failed [${res.status}]: ${body.slice(0, 400)}`);
  }
  return (await res.json()) as T;
}

function headerValue(headers: GmailHeader[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function parseFrom(raw: string): { email: string; name: string | null } {
  const match = raw.match(/<([^>]+)>/);
  const email = (match ? match[1] : raw).trim().toLowerCase();
  const name = raw.replace(/<[^>]*>/, "").replace(/"/g, "").trim() || null;
  return { email, name };
}

function b64urlDecode(data: string): string {
  try {
    const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(normalized);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

type GmailPart = {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
};

function extractBody(payload: GmailPart | undefined): string {
  if (!payload) return "";
  const out: string[] = [];
  const walk = (part: GmailPart) => {
    if (part.body?.data) {
      const text = b64urlDecode(part.body.data);
      out.push(part.mimeType === "text/html" ? stripHtml(text) : text);
    }
    for (const child of part.parts ?? []) walk(child);
  };
  walk(payload);
  return out.join("\n").replace(/\s+/g, " ").trim();
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname
      .replace(/^www\./, "")
      .toLowerCase();
  } catch {
    return null;
  }
}

function rootDomain(host: string): string {
  const parts = host.split(".");
  return parts.length > 2 ? parts.slice(-2).join(".") : host;
}

type SourceRow = {
  id: string;
  name: string;
  url: string;
  affiliate_url: string | null;
  discount_code: string | null;
  newsletter_email_domains: string | null;
};

function matchSource(fromEmail: string, fromName: string | null, sources: SourceRow[]): SourceRow | null {
  const domain = fromEmail.split("@")[1]?.toLowerCase() ?? "";
  if (!domain) return null;
  const root = rootDomain(domain);
  for (const s of sources) {
    const candidates = new Set<string>();
    const siteHost = hostOf(s.url);
    if (siteHost) candidates.add(rootDomain(siteHost));
    const affHost = hostOf(s.affiliate_url);
    if (affHost) candidates.add(rootDomain(affHost));
    for (const extra of (s.newsletter_email_domains ?? "").split(/[,\s]+/)) {
      const clean = extra.trim().replace(/^@/, "").toLowerCase();
      if (clean) candidates.add(rootDomain(clean));
    }
    if (candidates.has(root)) return s;
  }
  // Fall back to a sender display-name match (e.g. "Powerbuilt Labs <news@sendgrid.net>")
  const name = (fromName ?? "").toLowerCase();
  if (name.length > 2) {
    const hit = sources.find((s) => name.includes(s.name.toLowerCase()));
    if (hit) return hit;
  }
  return null;
}

/**
 * Scan the shared vendor inbox for new sale/discount emails.
 * Only messages not seen before are processed; each becomes a promotion
 * awaiting admin review (or auto-send, per monitor settings).
 */
export async function scanVendorInbox(
  triggeredBy: "admin" | "cron",
  opts: { maxMessages?: number; days?: number } = {},
): Promise<{ scanned: number; matched: number; salesFound: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const maxMessages = opts.maxMessages ?? 25;
  const days = opts.days ?? 14;

  const { data: sourceRows } = await supabaseAdmin
    .from("pephub_sources")
    .select("id, name, url, affiliate_url, discount_code, newsletter_email_domains")
    .eq("is_active", true);
  const sources = (sourceRows ?? []) as SourceRow[];

  const runStart = new Date().toISOString();
  const { data: run } = await supabaseAdmin
    .from("pephub_monitor_runs")
    .insert({ started_at: runStart, status: "running", sales_found: 0, triggered_by: triggeredBy })
    .select("id")
    .maybeSingle();
  const runId = run?.id as string | undefined;

  let scanned = 0;
  let matched = 0;
  let salesFound = 0;

  try {
    const list = await gmail<{ messages?: { id: string }[] }>(
      `/users/me/messages?maxResults=${maxMessages}&q=${encodeURIComponent(`newer_than:${days}d -in:chats`)}`,
    );
    const ids = (list.messages ?? []).map((m) => m.id);
    if (ids.length === 0) {
      if (runId) {
        await supabaseAdmin
          .from("pephub_monitor_runs")
          .update({ status: "success", completed_at: new Date().toISOString(), sales_found: 0 })
          .eq("id", runId);
      }
      return { scanned: 0, matched: 0, salesFound: 0 };
    }

    const { data: seenRows } = await supabaseAdmin
      .from("pephub_inbox_messages")
      .select("gmail_message_id")
      .in("gmail_message_id", ids);
    const seen = new Set((seenRows ?? []).map((r) => r.gmail_message_id as string));
    const fresh = ids.filter((id) => !seen.has(id));

    const settings = await getSettings();

    for (const id of fresh) {
      scanned += 1;
      const msg = await gmail<{
        id: string;
        snippet?: string;
        internalDate?: string;
        payload?: { headers?: GmailHeader[] } & GmailPart;
      }>(`/users/me/messages/${id}?format=full`);

      const headers = msg.payload?.headers ?? [];
      const { email: fromEmail, name: fromName } = parseFrom(headerValue(headers, "From"));
      const subject = headerValue(headers, "Subject");
      const receivedAt = msg.internalDate
        ? new Date(Number(msg.internalDate)).toISOString()
        : new Date().toISOString();

      const source = matchSource(fromEmail, fromName, sources);
      const record: Record<string, unknown> = {
        gmail_message_id: id,
        source_id: source?.id ?? null,
        from_email: fromEmail,
        from_name: fromName,
        subject,
        snippet: (msg.snippet ?? "").slice(0, 500),
        received_at: receivedAt,
        matched: Boolean(source),
        sale_detected: false,
        notes: source ? null : "Sender did not match any PepHub source",
      };

      if (!source) {
        await supabaseAdmin.from("pephub_inbox_messages").insert(record as never);
        continue;
      }
      matched += 1;

      const body = extractBody(msg.payload).slice(0, 12000);
      const emailText = `EMAIL FROM VENDOR NEWSLETTER\nFrom: ${fromName ?? ""} <${fromEmail}>\nSubject: ${subject}\nReceived: ${receivedAt}\n\n${body}`;

      let detection;
      try {
        detection = await detectSale(source.name, source.url, emailText);
      } catch (err) {
        record["notes"] = `Detection failed: ${err instanceof Error ? err.message : "unknown"}`;
        await supabaseAdmin.from("pephub_inbox_messages").insert(record as never);
        continue;
      }

      if (!detection.has_sale || detection.confidence_score <= 0) {
        record["notes"] = "No sale or discount in this email";
        await supabaseAdmin.from("pephub_inbox_messages").insert(record as never);
        continue;
      }

      const fingerprint = fingerprintOf(detection);
      const level = confidenceLevel(detection.confidence_score);
      const nowIso = new Date().toISOString();

      const { data: existing } = await supabaseAdmin
        .from("pephub_promotions")
        .select("id")
        .eq("source_id", source.id)
        .eq("fingerprint", fingerprint)
        .maybeSingle();

      let promotionId = existing?.id as string | undefined;

      if (existing) {
        await supabaseAdmin
          .from("pephub_promotions")
          .update({ last_verified_at: nowIso, missing_since: null })
          .eq("id", existing.id);
      } else {
        const status =
          settings.require_admin_approval || !settings.automatic_sending ? "pending_review" : "detected";
        const { data: inserted } = await supabaseAdmin
          .from("pephub_promotions")
          .insert({
            source_id: source.id,
            fingerprint,
            title: detection.title || `${source.name} email offer`,
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
            evidence: detection.evidence
              ? `From vendor email "${subject}": ${detection.evidence}`
              : `From vendor email "${subject}"`,
          } as never)
          .select("id")
          .maybeSingle();
        promotionId = inserted?.id as string | undefined;
        if (promotionId) salesFound += 1;
      }

      record["sale_detected"] = true;
      record["promotion_id"] = promotionId ?? null;
      record["notes"] = detection.title ?? "Sale detected";
      await supabaseAdmin.from("pephub_inbox_messages").insert(record as never);

      await supabaseAdmin
        .from("pephub_sources")
        .update({ last_sale_detected_at: nowIso })
        .eq("id", source.id);

      if (
        promotionId &&
        !existing &&
        settings.automatic_sending &&
        settings.sale_alerts_enabled &&
        !settings.require_admin_approval &&
        meetsThreshold(level, settings.minimum_confidence)
      ) {
        const { sendPromotionEmails } = await import("@/lib/pephub-monitor.server");
        await sendPromotionEmails(promotionId);
      }
    }

    if (runId) {
      await supabaseAdmin
        .from("pephub_monitor_runs")
        .update({ status: "success", completed_at: new Date().toISOString(), sales_found: salesFound })
        .eq("id", runId);
    }
    return { scanned, matched, salesFound };
  } catch (err) {
    if (runId) {
      await supabaseAdmin
        .from("pephub_monitor_runs")
        .update({
          status: "error",
          completed_at: new Date().toISOString(),
          error_message: err instanceof Error ? err.message : "Inbox scan failed",
        })
        .eq("id", runId);
    }
    throw err;
  }
}
