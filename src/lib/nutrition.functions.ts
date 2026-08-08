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

type FdcNutrient = { nutrientName?: string; nutrientNumber?: string; value?: number; unitName?: string };
type FdcFood = {
  fdcId?: number;
  description?: string;
  brandName?: string;
  brandOwner?: string;
  dataType?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  foodNutrients?: FdcNutrient[];
};

function round(n: number): number {
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
}

function titleCase(s: string): string {
  const t = s.trim().replace(/\s+/g, " ");
  if (t !== t.toUpperCase()) return t;
  return t
    .toLowerCase()
    .split(" ")
    .map((w) => (w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** Nutrient numbers: 208 energy(kcal), 203 protein, 205 carbs, 204 fat. */
function pick(nutrients: FdcNutrient[], number: string, nameMatch: RegExp): number {
  const byNumber = nutrients.find((n) => n.nutrientNumber === number && typeof n.value === "number");
  if (byNumber) return byNumber.value as number;
  const kcalOnly = nutrients.find(
    (n) => nameMatch.test(n.nutrientName ?? "") && (n.unitName ?? "").toUpperCase() !== "KJ" && typeof n.value === "number",
  );
  return kcalOnly?.value ?? 0;
}

function mapFood(f: FdcFood): FoodResult | null {
  const name = (f.description ?? "").trim();
  if (!name) return null;
  const nutrients = f.foodNutrients ?? [];

  // FDC values are per 100 g / 100 ml. Scale to the label serving when available.
  const unit = (f.servingSizeUnit ?? "").toLowerCase();
  const scalable = (unit === "g" || unit === "ml" || unit === "grm" || unit === "mlt") && (f.servingSize ?? 0) > 0;
  const factor = scalable ? (f.servingSize as number) / 100 : 1;

  const calories = round(pick(nutrients, "208", /^energy$/i) * factor);
  if (calories <= 0) return null;

  const servingLabel = scalable
    ? f.householdServingFullText?.trim()
      ? `${f.householdServingFullText.trim()} (${f.servingSize}${unit})`
      : `${f.servingSize}${unit}`
    : "100 g / ml";

  return {
    id: String(f.fdcId ?? name),
    name: titleCase(name),
    brand: titleCase(f.brandName || f.brandOwner || (f.dataType === "Branded" ? "" : "Generic")),
    serving: servingLabel,
    calories,
    protein_g: round(pick(nutrients, "203", /protein/i) * factor),
    carbs_g: round(pick(nutrients, "205", /carbohydrate/i) * factor),
    fat_g: round(pick(nutrients, "204", /total lipid|^fat$/i) * factor),
  };
}

type OffProduct = {
  code?: string;
  product_name?: string;
  brands?: string;
  serving_size?: string;
  nutriments?: Record<string, number | string | undefined>;
};

function offNum(v: unknown): number {
  const n = typeof v === "string" ? Number.parseFloat(v) : typeof v === "number" ? v : 0;
  return round(n);
}

/** Fallback: Open Food Facts (Searchalicious index) for products USDA doesn't carry. */
async function searchOff(q: string): Promise<FoodResult[]> {
  const url =
    "https://search.openfoodfacts.org/search?" +
    new URLSearchParams({ q, page_size: "20" }).toString();
  try {
    const res = await fetch(url, { headers: { "User-Agent": "TitanElite/1.0 (nutrition tracker)" } });
    if (!res.ok) return [];
    const json = (await res.json()) as { hits?: OffProduct[] };
    const out: FoodResult[] = [];
    for (const p of json.hits ?? []) {
      const name = (p.product_name ?? "").trim();
      if (!name) continue;
      const n = p.nutriments ?? {};
      const servingCal = offNum(n["energy-kcal_serving"]);
      const hasServing = servingCal > 0 && !!p.serving_size;
      const calories = hasServing ? servingCal : offNum(n["energy-kcal_100g"]);
      if (calories <= 0) continue;
      out.push({
        id: `off-${p.code ?? out.length}`,
        name: titleCase(name),
        brand: titleCase((p.brands ?? "").split(",")[0] ?? ""),
        serving: hasServing ? (p.serving_size as string) : "100 g / ml",
        calories,
        protein_g: hasServing ? offNum(n["proteins_serving"]) : offNum(n["proteins_100g"]),
        carbs_g: hasServing ? offNum(n["carbohydrates_serving"]) : offNum(n["carbohydrates_100g"]),
        fat_g: hasServing ? offNum(n["fat_serving"]) : offNum(n["fat_100g"]),
      });
    }
    return out;
  } catch {
    return [];
  }
}

/** Search branded + generic foods and drinks (USDA FoodData Central, with Open Food Facts fallback). */
export const searchFoods = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string }) => ({ query: String(input.query ?? "").slice(0, 120) }))
  .handler(async ({ data }) => {
    const q = data.query.trim();
    if (q.length < 2) return [] as FoodResult[];

    const apiKey = process.env["FDC_API_KEY"] || "DEMO_KEY";
    const url =
      "https://api.nal.usda.gov/fdc/v1/foods/search?" +
      new URLSearchParams({
        api_key: apiKey,
        query: q,
        pageSize: "25",
        dataType: "Branded,Foundation,SR Legacy,Survey (FNDDS)",
        requireAllWords: "true",
      }).toString();

    const results: FoodResult[] = [];
    const seen = new Set<string>();

    try {
      const res = await fetch(url);
      if (res.ok) {
        const json = (await res.json()) as { foods?: FdcFood[] };
        for (const f of json.foods ?? []) {
          const mapped = mapFood(f);
          if (!mapped) continue;
          const key = `${mapped.name}|${mapped.brand}|${mapped.calories}`;
          if (seen.has(key)) continue;
          seen.add(key);
          results.push(mapped);
        }
      }
    } catch {
      // fall through to Open Food Facts
    }

    if (results.length < 5) {
      for (const r of await searchOff(q)) {
        const key = `${r.name}|${r.brand}|${r.calories}`;
        if (seen.has(key)) continue;
        seen.add(key);
        results.push(r);
      }
    }

    return results.slice(0, 25);
  });
