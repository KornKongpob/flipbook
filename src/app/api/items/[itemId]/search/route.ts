import { NextResponse } from "next/server";
import type { Database } from "@/lib/database.types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { MakroSearchProvider } from "@/lib/catalog/matching/makro-provider";
import { scoreMatch } from "@/lib/catalog/matching/scoring";
import {
  getProductAssetSkuVariants,
  getProviderAssetSkuVariants,
  upsertMakroProductAsset,
} from "@/lib/catalog/product-assets";
import { resolveProductAssetPreviewUrl } from "@/lib/catalog/repository";

export const runtime = "nodejs";

const provider = new MakroSearchProvider();
type CatalogItemRow = Database["public"]["Tables"]["catalog_items"]["Row"];
type CatalogJobRow = Database["public"]["Tables"]["catalog_jobs"]["Row"];

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
      const asset = await upsertMakroProductAsset(admin, candidate).catch(() => null);

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
          alternateSkus: asset
            ? getProductAssetSkuVariants(asset)
            : getProviderAssetSkuVariants(candidate),
          productName: asset?.product_name ?? candidate.productName,
          normalizedName: asset?.normalized_name ?? candidate.normalizedName,
        },
      );
      const previewUrl = asset
        ? await resolveProductAssetPreviewUrl(asset)
        : candidate.imageUrl
          ? `/api/images/proxy?url=${encodeURIComponent(candidate.imageUrl)}`
          : null;

      return {
        ...candidate,
        assetId: asset?.id,
        previewUrl,
        confidence: score.confidence,
        reasons: score.reasons,
        exactSkuMatch: score.reasons.includes("exact_sku"),
      };
    }),
  );

  return NextResponse.json({
    results: results.sort((left, right) => {
      if (left.exactSkuMatch !== right.exactSkuMatch) {
        return left.exactSkuMatch ? -1 : 1;
      }

      return right.confidence - left.confidence;
    }),
  });
}
