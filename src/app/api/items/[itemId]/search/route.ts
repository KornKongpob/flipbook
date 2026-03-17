import { NextResponse } from "next/server";
import type { Database, Json } from "@/lib/database.types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { MakroSearchProvider } from "@/lib/catalog/matching/makro-provider";
import { scoreMatch } from "@/lib/catalog/matching/scoring";

export const runtime = "nodejs";

const provider = new MakroSearchProvider();
type CatalogItemRow = Database["public"]["Tables"]["catalog_items"]["Row"];
type CatalogJobRow = Database["public"]["Tables"]["catalog_jobs"]["Row"];
type ProductAssetRow = Database["public"]["Tables"]["product_assets"]["Row"];

export async function GET(
  request: Request,
  context: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await context.params;
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();

  if (!admin) {
    return NextResponse.json(
      { error: "Supabase service role is not configured." },
      { status: 503 },
    );
  }

  const itemResponse = await admin
    .from("catalog_items")
    .select("*")
    .eq("id", itemId)
    .maybeSingle();
  const item = itemResponse.data as CatalogItemRow | null;

  if (!item) {
    return NextResponse.json({ error: "Item not found." }, { status: 404 });
  }

  const jobResponse = await admin
    .from("catalog_jobs")
    .select("id, created_by")
    .eq("id", item.job_id)
    .maybeSingle();
  const job = jobResponse.data as Pick<CatalogJobRow, "id" | "created_by"> | null;

  if (!job || job.created_by !== user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const providerResults = await provider.search(query || item.sku || item.product_name);

  const results = await Promise.all(
    providerResults.map(async (candidate) => {
      const existing = candidate.sourceProductId
        ? await admin
            .from("product_assets")
            .select("*")
            .eq("source", "makro")
            .eq("source_product_id", candidate.sourceProductId)
            .maybeSingle()
        : { data: null, error: null };
      const existingAsset = existing.data as ProductAssetRow | null;

      const createdAssetResponse = existingAsset
        ? null
        : await admin
            .from("product_assets")
            .insert({
              source: "makro",
              source_product_id: candidate.sourceProductId,
              sku: candidate.sku,
              normalized_sku: candidate.normalizedSku,
              product_name: candidate.productName,
              normalized_name: candidate.normalizedName,
              product_url: candidate.productUrl,
              image_url: candidate.imageUrl,
              fetched_at: new Date().toISOString(),
              metadata_json: candidate.metadata as unknown as Json,
            })
            .select("*")
            .single();
      const asset =
        existingAsset ?? ((createdAssetResponse?.data as ProductAssetRow | null) ?? null);

      const score = scoreMatch(
        {
          sku: item.sku,
          normalizedSku: item.normalized_sku,
          productName: item.product_name,
          normalizedName: item.normalized_name,
          packSize: item.pack_size,
        },
        {
          sku: asset?.sku,
          normalizedSku: asset?.normalized_sku,
          productName: asset?.product_name ?? candidate.productName,
          normalizedName: asset?.normalized_name ?? candidate.normalizedName,
        },
      );

      return {
        ...candidate,
        assetId: asset?.id,
        confidence: score.confidence,
        reasons: score.reasons,
      };
    }),
  );

  return NextResponse.json({
    results: results.sort((left, right) => right.confidence - left.confidence),
  });
}
