import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type FoodResult = {
  id: string;
  name: string;
  brand: string;
  serving: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

type OffProduct = {
  code?: string;
  product_name?: string;
  brands?: string;
  serving_size?: string;
  nutriments?: Record<string, number | string | undefined>;
};

function num(v: unknown): number {
  const n = typeof v === "string" ? Number.parseFloat(v) : typeof v === "number" ? v : 0;
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
}

/** Search branded + generic foods/drinks via Open Food Facts. */
export const searchFoods = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string }) => ({ query: String(input.query ?? "").slice(0, 120) }))
  .handler(async ({ data }) => {
    const q = data.query.trim();
    if (q.length < 2) return [] as FoodResult[];

    const url =
      "https://world.openfoodfacts.org/cgi/search.pl?" +
      new URLSearchParams({
        search_terms: q,
        search_simple: "1",
        action: "process",
        json: "1",
        page_size: "30",
        fields: "code,product_name,brands,serving_size,nutriments",
      }).toString();

    let products: OffProduct[] = [];
    try {
      const res = await fetch(url, { headers: { "User-Agent": "TitanElite/1.0 (nutrition tracker)" } });
      if (!res.ok) return [] as FoodResult[];
      const json = (await res.json()) as { products?: OffProduct[] };
      products = json.products ?? [];
    } catch {
      return [] as FoodResult[];
    }

    const out: FoodResult[] = [];
    for (const p of products) {
      const name = (p.product_name ?? "").trim();
      if (!name) continue;
      const n = p.nutriments ?? {};

      const servingCal = num(n["energy-kcal_serving"]);
      const per100Cal = num(n["energy-kcal_100g"]);
      const hasServing = servingCal > 0 && !!p.serving_size;

      const calories = hasServing ? servingCal : per100Cal;
      if (calories <= 0) continue;

      out.push({
        id: p.code ?? `${name}-${out.length}`,
        name,
        brand: (p.brands ?? "").split(",")[0]?.trim() ?? "",
        serving: hasServing ? (p.serving_size as string) : "100 g / ml",
        calories,
        protein_g: hasServing ? num(n["proteins_serving"]) : num(n["proteins_100g"]),
        carbs_g: hasServing ? num(n["carbohydrates_serving"]) : num(n["carbohydrates_100g"]),
        fat_g: hasServing ? num(n["fat_serving"]) : num(n["fat_100g"]),
      });
      if (out.length >= 20) break;
    }
    return out;
  });
