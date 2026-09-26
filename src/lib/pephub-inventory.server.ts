import { COMPOUNDS, aliasKey, slugify, matchCompound, parseStrength } from "@/lib/pephub-compounds";

type RawItem = {
  externalId: string;
  productName: string;
  variantName: string | null;
  price: number | null;
  originalPrice: number | null;
  inStock: boolean | null;
  url: string | null;
  image: string | null;
};

const UA = "Mozilla/5.0 (compatible; PepHubInventory/1.0; +https://peplog.io/pephub)";

async function getJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") ?? "").includes("json")) return null;
    return await res.json();
  } catch {
    return null;
  }
}

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

async function fetchShopify(base: string): Promise<RawItem[] | null> {
  const out: RawItem[] = [];
  for (let page = 1; page <= 8; page++) {
    const j = (await getJson(`${base}/products.json?limit=250&page=${page}`)) as { products?: any[] } | null;
    if (!j || !Array.isArray(j.products)) return page === 1 ? null : out;
    if (!j.products.length) break;
    for (const p of j.products) {
      const img = p.images?.[0]?.src ?? null;
      for (const v of p.variants ?? []) {
        const single = (p.variants?.length ?? 0) === 1 && /default/i.test(v.title ?? "");
        const price = num(v.price);
        const cmp = num(v.compare_at_price);
        out.push({
          externalId: `shopify-${v.id}`,
          productName: p.title,
          variantName: single ? null : v.title,
          price,
          originalPrice: cmp && price && cmp > price ? cmp : null,
          inStock: typeof v.available === "boolean" ? v.available : null,
          url: `${base}/products/${p.handle}${single ? "" : `?variant=${v.id}`}`,
          image: img,
        });
      }
    }
  }
  return out;
}

async function fetchWoo(base: string): Promise<RawItem[] | null> {
  const out: RawItem[] = [];
  for (let page = 1; page <= 10; page++) {
    const j = (await getJson(`${base}/wp-json/wc/store/v1/products?per_page=100&page=${page}`)) as any[] | null;
    if (!Array.isArray(j)) return page === 1 ? null : out;
    if (!j.length) break;
    for (const p of j) {
      const minor = Number(p.prices?.currency_minor_unit ?? 2);
      const conv = (v: unknown) => { const n = num(v); return n == null ? null : n / 10 ** minor; };
      const price = conv(p.prices?.price);
      const reg = conv(p.prices?.regular_price);
      out.push({
        externalId: `woo-${p.id}`,
        productName: String(p.name ?? "").replace(/&#8211;|&amp;/g, (m: string) => (m === "&amp;" ? "&" : "–")),
        variantName: null,
        price,
        originalPrice: reg && price && reg > price ? reg : null,
        inStock: typeof p.is_in_stock === "boolean" ? p.is_in_stock : null,
        url: p.permalink ?? null,
        image: p.images?.[0]?.src ?? null,
      });
    }
  }
  return out;
}

async function fetchFeed(url: string): Promise<RawItem[] | null> {
  const j = (await getJson(url)) as any;
  const arr = Array.isArray(j) ? j : Array.isArray(j?.products) ? j.products : null;
  if (!arr) return null;
  return arr.map((p: any, i: number) => ({
    externalId: `feed-${p.id ?? p.sku ?? i}`,
    productName: String(p.name ?? p.title ?? ""),
    variantName: p.variant ?? null,
    price: num(p.sale_price ?? p.price),
    originalPrice: num(p.sale_price) ? num(p.price) : null,
    inStock: typeof p.in_stock === "boolean" ? p.in_stock : null,
    url: p.url ?? p.link ?? null,
    image: p.image ?? null,
  })).filter((x: RawItem) => x.productName);
}

function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>/gi, " [link:$1] ")
    .replace(/<img [^>]*src="([^"]+)"[^>]*>/gi, " [img:$1] ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&#36;|&dollar;/g, "$").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
}

/** Last resort: read the vendor's public shop pages with AI. Only returns products literally shown. */
async function fetchWithAi(startUrl: string): Promise<RawItem[] | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  const origin = new URL(startUrl).origin;
  const pages = [startUrl, `${origin}/shop`, `${origin}/products`, `${origin}/collections/all`, `${origin}/store`];
  let text = "";
  for (const u of pages) {
    try {
      const res = await fetch(u, { headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36" }, signal: AbortSignal.timeout(20000) });
      if (!res.ok) continue;
      const t = htmlToText(await res.text());
      if (/\$\s?\d/.test(t)) text += `\n\n=== PAGE ${res.url} ===\n${t.slice(0, 30000)}`;
    } catch { /* skip */ }
    if (text.length > 60000) break;
  }
  if (!text) return null;
  const { generateText } = await import("ai");
  const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
  const provider = createLovableAiGatewayProvider(key);
  const { text: out } = await generateText({
    model: provider("google/gemini-2.5-flash"),
    prompt: `Extract every product listing from these store pages. Return ONLY a JSON array of objects: {"name": string, "variant": string|null, "price": number|null, "compare_at_price": number|null, "in_stock": boolean|null, "url": string|null, "image": string|null}.
Rules: include only products literally shown with their name. Never guess: if a price, stock status, url or image is not explicitly present, use null. "in_stock" is false only if the page says sold out / out of stock. URLs must be absolute (base ${origin}). No duplicates.\n${text}`,
  });
  const m = out.match(/\[[\s\S]*\]/);
  if (!m) return null;
  let arr: any[];
  try { arr = JSON.parse(m[0]); } catch { return null; }
  const items = arr.filter((p) => p && typeof p.name === "string" && p.name.trim()).map((p) => {
    let url: string | null = null;
    try { url = p.url ? new URL(p.url, origin).toString() : null; } catch { url = null; }
    const price = num(p.price), cmp = num(p.compare_at_price);
    return {
      externalId: `ai-${aliasKey((url ?? "") + p.name + (p.variant ?? ""))}`.slice(0, 200),
      productName: String(p.name).trim(), variantName: p.variant ? String(p.variant) : null,
      price, originalPrice: cmp && price && cmp > price ? cmp : null,
      inStock: typeof p.in_stock === "boolean" ? p.in_stock : null, url,
      image: typeof p.image === "string" ? p.image : null,
    };
  });
  return items.length ? items : null;
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Make sure the compound dictionary exists in the database; returns name -> id. */
export async function ensureCompounds(): Promise<Map<string, string>> {
  const db = await admin();
  const { data: existing } = await db.from("pephub_compounds").select("id, canonical_name");
  const map = new Map((existing ?? []).map((r) => [r.canonical_name, r.id]));
  const missing = COMPOUNDS.filter((c) => !map.has(c.name));
  if (missing.length) {
    const { data } = await db.from("pephub_compounds")
      .insert(missing.map((c) => ({ canonical_name: c.name, slug: slugify(c.name), category: c.category })))
      .select("id, canonical_name");
    for (const r of data ?? []) map.set(r.canonical_name, r.id);
    const aliasRows = missing.flatMap((c) => [aliasKey(c.name), ...c.aliases].map((a) => ({ compound_id: map.get(c.name)!, alias_key: a })));
    const uniq = [...new Map(aliasRows.map((r) => [r.alias_key, r])).values()];
    await db.from("pephub_compound_aliases").upsert(uniq, { onConflict: "alias_key", ignoreDuplicates: true });
  }
  return map;
}

export type SyncResult = { status: "success" | "failed"; method: string | null; added: number; updated: number; priceChanges: number; deactivated: number; error?: string };

export async function syncSource(sourceId: string, triggeredBy: string): Promise<SyncResult> {
  const db = await admin();
  const { data: src } = await db.from("pephub_sources")
    .select("id, url, inventory_data_source, inventory_feed_url").eq("id", sourceId).maybeSingle();
  if (!src) throw new Error("Source not found");
  const { data: run } = await db.from("pephub_inventory_syncs").insert({ source_id: sourceId, triggered_by: triggeredBy }).select("id").single();
  const base = new URL(src.url).origin;

  let items: RawItem[] | null = null;
  let method: string | null = null;
  try {
    if (src.inventory_feed_url) { items = await fetchFeed(src.inventory_feed_url); method = "feed"; }
    if (!items) { items = await fetchShopify(base); method = "shopify"; }
    if (!items) { items = await fetchWoo(base); method = "woocommerce"; }
    if (!items) { items = await fetchWithAi(src.url); method = "ai"; }
  } catch { items = null; }

  const now = new Date().toISOString();
  if (!items || !items.length) {
    const error = "Couldn't read this store's catalog (the site may block automated visitors). Add a product feed URL for this vendor.";
    await db.from("pephub_inventory_syncs").update({ status: "failed", completed_at: now, error_message: error }).eq("id", run!.id);
    await db.from("pephub_sources").update({ inventory_sync_status: "failed", inventory_sync_error: error, last_inventory_sync: now }).eq("id", sourceId);
    return { status: "failed", method: null, added: 0, updated: 0, priceChanges: 0, deactivated: 0, error };
  }

  const compounds = await ensureCompounds();
  const { data: existing } = await db.from("pephub_products")
    .select("id, external_id, price, original_price, in_stock, compound_id, match_confidence").eq("source_id", sourceId);
  const byExt = new Map((existing ?? []).map((r) => [r.external_id, r]));
  let added = 0, updated = 0, priceChanges = 0;
  const seen = new Set<string>();
  const history: { product_id: string; source_id: string; price: number | null; original_price: number | null; in_stock: boolean | null }[] = [];

  for (const it of items) {
    if (seen.has(it.externalId)) continue;
    seen.add(it.externalId);
    const full = [it.productName, it.variantName].filter(Boolean).join(" ");
    const m = matchCompound(it.productName);
    const { strength, totalMg } = parseStrength(full);
    const prev = byExt.get(it.externalId);
    const row = {
      source_id: sourceId, external_id: it.externalId, product_name: it.productName, variant_name: it.variantName,
      strength_text: strength, total_mg: totalMg, price: it.price, original_price: it.originalPrice, in_stock: it.inStock,
      product_url: it.url, product_image: it.image, data_source: method!, active: true, missing_count: 0, last_checked: now,
      // Never override an admin's manual mapping.
      ...(prev?.match_confidence === "manual" ? {} : { compound_id: m.confidence === "high" ? compounds.get(m.name) ?? null : null, match_confidence: m.confidence }),
    };
    if (prev) {
      await db.from("pephub_products").update(row).eq("id", prev.id);
      updated++;
      if (Number(prev.price) !== Number(it.price) || prev.in_stock !== it.inStock) {
        if (Number(prev.price) !== Number(it.price)) priceChanges++;
        history.push({ product_id: prev.id, source_id: sourceId, price: it.price, original_price: it.originalPrice, in_stock: it.inStock });
      }
    } else {
      const { data: ins } = await db.from("pephub_products").insert(row).select("id").single();
      if (ins) { added++; history.push({ product_id: ins.id, source_id: sourceId, price: it.price, original_price: it.originalPrice, in_stock: it.inStock }); }
    }
  }
  if (history.length) await db.from("pephub_price_history").insert(history);

  // Missing products: deactivate only after 3 consecutive missed syncs.
  let deactivated = 0;
  for (const r of existing ?? []) {
    if (seen.has(r.external_id)) continue;
    const { data: cur } = await db.from("pephub_products").select("missing_count, active").eq("id", r.id).single();
    const mc = (cur?.missing_count ?? 0) + 1;
    const off = mc >= 3 && cur?.active;
    if (off) deactivated++;
    await db.from("pephub_products").update({ missing_count: mc, ...(mc >= 3 ? { active: false } : {}) }).eq("id", r.id);
  }

  await db.from("pephub_inventory_syncs").update({ status: "success", method, completed_at: now, added, updated, price_changes: priceChanges, deactivated }).eq("id", run!.id);
  await db.from("pephub_sources").update({ inventory_sync_status: "success", inventory_sync_error: null, last_inventory_sync: now }).eq("id", sourceId);
  return { status: "success", method, added, updated, priceChanges, deactivated };
}

/** Called from the hourly monitor cron: sync tracked vendors whose interval has elapsed. */
export async function runDueInventorySyncs() {
  const db = await admin();
  const { data } = await db.from("pephub_sources")
    .select("id, last_inventory_sync, inventory_sync_hours").eq("is_active", true).eq("inventory_tracking_enabled", true);
  const due = (data ?? []).filter((s) => !s.last_inventory_sync ||
    Date.now() - new Date(s.last_inventory_sync).getTime() >= (s.inventory_sync_hours || 6) * 3600_000 - 5 * 60_000);
  const results = [];
  for (const s of due) {
    try { results.push(await syncSource(s.id, "cron")); } catch (e) { results.push({ error: String(e) }); }
  }
  return { synced: results.length };
}
