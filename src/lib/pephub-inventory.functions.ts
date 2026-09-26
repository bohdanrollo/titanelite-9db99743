import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type InvListing = {
  id: string;
  productName: string;
  variantName: string | null;
  strength: string | null;
  totalMg: number | null;
  price: number | null;
  originalPrice: number | null;
  pricePerMg: number | null;
  inStock: boolean | null;
  url: string | null;
  image: string | null;
  lastChecked: string;
  vendorId: string;
  vendorName: string;
  vendorLogo: string | null;
  compoundName: string | null;
  previousPrice?: number | null;
};

export type InvHistoryPoint = { day: string; low: number };

export type InvCompound = { id: string; name: string; slug: string; category: string | null; listings: number };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requireMember(context: any) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: role } = await context.supabase.from("user_roles").select("role")
    .eq("user_id", context.userId).eq("role", "admin").maybeSingle();
  if (role) return supabaseAdmin;
  const email = (context.claims?.email as string | undefined)?.toLowerCase() ?? "";
  const { data } = await supabaseAdmin.from("marketing_subscribers")
    .select("subscribed, age_21_confirmed, research_use_confirmed")
    .or(`user_id.eq.${context.userId}${email ? `,email.ilike.${email}` : ""}`).limit(1).maybeSingle();
  if (!data?.subscribed || !data.age_21_confirmed || !data.research_use_confirmed) throw new Error("PepHub membership required");
  return supabaseAdmin;
}

/** Build a vendor link: product URL with the vendor's affiliate ref applied when configured. */
function vendorLink(productUrl: string | null, affiliateUrl: string | null) {
  if (!productUrl) return affiliateUrl;
  if (!affiliateUrl) return productUrl;
  try {
    const aff = new URL(affiliateUrl);
    const out = new URL(productUrl);
    aff.searchParams.forEach((v, k) => out.searchParams.set(k, v));
    return out.toString();
  } catch {
    return productUrl;
  }
}

const LISTING_COLS = "id, product_name, variant_name, strength_text, total_mg, price, original_price, in_stock, product_url, product_image, last_checked, source_id, compound_id, pephub_sources!inner(id, name, url, logo_url, affiliate_url, is_active, inventory_tracking_enabled), pephub_compounds(canonical_name)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toListing(r: any): InvListing {
  const s = r.pephub_sources;
  const price = r.price == null ? null : Number(r.price);
  const mg = r.total_mg == null ? null : Number(r.total_mg);
  return {
    id: r.id, productName: r.product_name, variantName: r.variant_name, strength: r.strength_text, totalMg: mg,
    price, originalPrice: r.original_price == null ? null : Number(r.original_price),
    pricePerMg: price && mg ? Math.round((price / mg) * 100) / 100 : null,
    inStock: r.in_stock, url: vendorLink(r.product_url, s.affiliate_url || s.url), image: r.product_image,
    lastChecked: r.last_checked, vendorId: s.id, vendorName: s.name, vendorLogo: s.logo_url,
    compoundName: r.pephub_compounds?.canonical_name ?? null,
  };
}

/** Overview: compounds with live listing counts + recent products. */
export const invOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireMember(context);
    const [{ data: comps }, { data: prods }, { data: recent }] = await Promise.all([
      db.from("pephub_compounds").select("id, canonical_name, slug, category").eq("active", true),
      db.from("pephub_products").select("compound_id, pephub_sources!inner(is_active, inventory_tracking_enabled)")
        .eq("active", true).not("compound_id", "is", null)
        .eq("pephub_sources.is_active", true).eq("pephub_sources.inventory_tracking_enabled", true).limit(10000),
      db.from("pephub_products").select(LISTING_COLS).eq("active", true)
        .eq("pephub_sources.is_active", true).eq("pephub_sources.inventory_tracking_enabled", true)
        .order("updated_at", { ascending: false }).limit(8),
    ]);
    const counts = new Map<string, number>();
    for (const p of prods ?? []) counts.set(p.compound_id!, (counts.get(p.compound_id!) ?? 0) + 1);
    const compounds: InvCompound[] = (comps ?? [])
      .map((c) => ({ id: c.id, name: c.canonical_name, slug: c.slug, category: c.category, listings: counts.get(c.id) ?? 0 }))
      .filter((c) => c.listings > 0)
      .sort((a, b) => b.listings - a.listings);
    return { compounds, totalProducts: prods?.length ?? 0, recent: (recent ?? []).map(toListing) };
  });

/** Search products by free text (matches compound aliases and product names). */
export const invSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ q: z.string().trim().min(1).max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await requireMember(context);
    const key = data.q.toLowerCase().replace(/[^a-z0-9]/g, "");
    const safe = data.q.replace(/[%,()]/g, " ");
    const { data: aliases } = key
      ? await db.from("pephub_compound_aliases").select("compound_id").ilike("alias_key", `${key}%`).limit(20)
      : { data: [] };
    const ids = [...new Set((aliases ?? []).map((a) => a.compound_id))];
    let q = db.from("pephub_products").select(LISTING_COLS).eq("active", true)
      .eq("pephub_sources.is_active", true).eq("pephub_sources.inventory_tracking_enabled", true);
    q = ids.length ? q.or(`compound_id.in.(${ids.join(",")}),product_name.ilike.%${safe}%`) : q.ilike("product_name", `%${safe}%`);
    const { data: rows, error } = await q.limit(300);
    if (error) throw new Error(error.message);
    void db.from("pephub_inventory_events").insert({ event_type: "search", query: data.q.slice(0, 80), user_id: context.userId }).then(() => {});
    const { data: comps } = ids.length
      ? await db.from("pephub_compounds").select("id, canonical_name, slug, category").in("id", ids)
      : { data: [] };
    return {
      compounds: (comps ?? []).map((c) => ({ id: c.id, name: c.canonical_name, slug: c.slug, category: c.category, listings: 0 })),
      listings: (rows ?? []).map(toListing),
    };
  });

/** Comparison page for one compound. */
export const invCompound = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ slug: z.string().trim().min(1).max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await requireMember(context);
    const { data: c } = await db.from("pephub_compounds").select("id, canonical_name, slug, category, description").eq("slug", data.slug).maybeSingle();
    if (!c) return { compound: null, listings: [] as InvListing[], history: [] as InvHistoryPoint[] };
    const { data: rows, error } = await db.from("pephub_products").select(LISTING_COLS)
      .eq("compound_id", c.id).eq("active", true)
      .eq("pephub_sources.is_active", true).eq("pephub_sources.inventory_tracking_enabled", true).limit(500);
    if (error) throw new Error(error.message);
    const listings = (rows ?? []).map(toListing);
    const ids = listings.map((l) => l.id);
    const since = new Date(Date.now() - 90 * 86400000).toISOString();
    const { data: hist } = ids.length
      ? await db.from("pephub_price_history").select("product_id, price, recorded_at").in("product_id", ids)
          .gte("recorded_at", since).order("recorded_at", { ascending: true }).limit(5000)
      : { data: [] };
    const byDay = new Map<string, number>();
    const perProduct = new Map<string, number[]>();
    for (const h of hist ?? []) {
      if (h.price == null) continue;
      const p = Number(h.price);
      const day = h.recorded_at.slice(0, 10);
      byDay.set(day, Math.min(byDay.get(day) ?? Infinity, p));
      const arr = perProduct.get(h.product_id) ?? [];
      if (arr[arr.length - 1] !== p) arr.push(p);
      perProduct.set(h.product_id, arr);
    }
    for (const l of listings) {
      const arr = perProduct.get(l.id) ?? [];
      const prev = arr.length >= 2 ? arr[arr.length - 2] : null;
      l.previousPrice = prev != null && l.price != null && prev > l.price ? prev : null;
    }
    const history: InvHistoryPoint[] = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([day, low]) => ({ day, low }));
    return { compound: { name: c.canonical_name, slug: c.slug, category: c.category, description: c.description }, listings, history };
  });

// ---------------- Admin ----------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requireAdmin(context: any) {
  const { data } = await context.supabase.from("user_roles").select("role")
    .eq("user_id", context.userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Admin only");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const adminInvVendors = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context);
    const [{ data: sources }, { data: prods }] = await Promise.all([
      db.from("pephub_sources").select("id, name, url, is_active, inventory_tracking_enabled, inventory_feed_url, inventory_sync_hours, last_inventory_sync, inventory_sync_status, inventory_sync_error").order("sort_order"),
      db.from("pephub_products").select("source_id, in_stock, compound_id").eq("active", true).limit(20000),
    ]);
    const stats = new Map<string, { total: number; inStock: number; unmatched: number }>();
    for (const p of prods ?? []) {
      const s = stats.get(p.source_id) ?? { total: 0, inStock: 0, unmatched: 0 };
      s.total++; if (p.in_stock) s.inStock++; if (!p.compound_id) s.unmatched++;
      stats.set(p.source_id, s);
    }
    return { vendors: (sources ?? []).map((s) => ({ ...s, ...(stats.get(s.id) ?? { total: 0, inStock: 0, unmatched: 0 }) })) };
  });

export const adminInvUpdateVendor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    tracking: z.boolean().optional(),
    feedUrl: z.string().trim().url().max(500).nullable().or(z.literal("")).optional(),
    hours: z.number().int().min(1).max(168).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    const patch: { inventory_tracking_enabled?: boolean; inventory_feed_url?: string | null; inventory_sync_hours?: number } = {};
    if (data.tracking !== undefined) patch.inventory_tracking_enabled = data.tracking;
    if (data.feedUrl !== undefined) patch.inventory_feed_url = data.feedUrl || null;
    if (data.hours !== undefined) patch.inventory_sync_hours = data.hours;
    const { error } = await db.from("pephub_sources").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminInvSyncNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { syncSource } = await import("@/lib/pephub-inventory.server");
    return await syncSource(data.id, "manual");
  });

/** Record an outbound vendor click. */
export const invTrackClick = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ productId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await requireMember(context);
    const { data: p } = await db.from("pephub_products").select("source_id").eq("id", data.productId).maybeSingle();
    if (!p) return { ok: false };
    await db.from("pephub_inventory_events").insert({ event_type: "click", product_id: data.productId, source_id: p.source_id, user_id: context.userId });
    return { ok: true };
  });

export const adminInvUnmatched = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context);
    const [{ data: prods }, { data: comps }] = await Promise.all([
      db.from("pephub_products").select("id, product_name, variant_name, strength_text, match_confidence, pephub_sources(name)")
        .eq("active", true).is("compound_id", null).order("product_name").limit(500),
      db.from("pephub_compounds").select("id, canonical_name").eq("active", true).order("canonical_name"),
    ]);
    return {
      products: (prods ?? []).map((p) => ({ id: p.id, name: [p.product_name, p.variant_name].filter(Boolean).join(" — "), strength: p.strength_text, confidence: p.match_confidence, vendor: (p.pephub_sources as { name: string } | null)?.name ?? "" })),
      compounds: (comps ?? []).map((c) => ({ id: c.id, name: c.canonical_name })),
    };
  });

export const adminInvMap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    productId: z.string().uuid(),
    compoundId: z.string().uuid().nullable().optional(),
    newCompound: z.string().trim().min(2).max(80).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    let compoundId = data.compoundId ?? null;
    if (data.newCompound) {
      const slug = data.newCompound.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const { data: existing } = await db.from("pephub_compounds").select("id").eq("slug", slug).maybeSingle();
      if (existing) compoundId = existing.id;
      else {
        const { data: created, error } = await db.from("pephub_compounds").insert({ canonical_name: data.newCompound, slug }).select("id").single();
        if (error) throw new Error(error.message);
        compoundId = created.id;
        await db.from("pephub_compound_aliases").insert({ compound_id: created.id, alias_key: slug.replace(/-/g, "") });
      }
    }
    const { error } = await db.from("pephub_products").update({ compound_id: compoundId, match_confidence: "manual" }).eq("id", data.productId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminInvAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context);
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: ev } = await db.from("pephub_inventory_events").select("event_type, query, product_id, source_id, pephub_products(product_name), pephub_sources(name)")
        .gte("created_at", since).limit(20000);
    const tally = (keys: string[]) => {
      const m = new Map<string, number>();
      for (const k of keys) m.set(k, (m.get(k) ?? 0) + 1);
      return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([label, count]) => ({ label, count }));
    };
    const searches = (ev ?? []).filter((e) => e.event_type === "search");
    const clicks = (ev ?? []).filter((e) => e.event_type === "click");
    return {
      searchCount: searches.length,
      clickCount: clicks.length,
      topSearches: tally(searches.map((e) => (e.query ?? "").toLowerCase().trim()).filter(Boolean)),
      topProducts: tally(clicks.map((e) => (e.pephub_products as { product_name: string } | null)?.product_name ?? "Removed product")),
      topVendors: tally(clicks.map((e) => (e.pephub_sources as { name: string } | null)?.name ?? "Unknown")),
    };
  });
