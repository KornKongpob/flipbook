import { NextResponse } from "next/server";
import type { Database } from "@/lib/database.types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type CatalogJobRow = Database["public"]["Tables"]["catalog_jobs"]["Row"];
type CatalogItemRow = Database["public"]["Tables"]["catalog_items"]["Row"];
type ProductCandidateRow = Database["public"]["Tables"]["product_match_candidates"]["Row"];
type FlipbookRow = Database["public"]["Tables"]["flipbooks"]["Row"];

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
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

  const summary: Record<string, unknown> = {
    userId: user.id,
    jobId,
  };

  try {
    const jobResponse = await admin.from("catalog_jobs").select("*").eq("id", jobId).maybeSingle();
    const job = jobResponse.data as CatalogJobRow | null;
    summary.jobError = jobResponse.error?.message ?? null;
    summary.job = job
      ? {
          id: job.id,
          created_by: job.created_by,
          status: job.status,
          has_column_mapping_json: Boolean(job.column_mapping_json),
        }
      : null;

    const itemsResponse = await admin
      .from("catalog_items")
      .select("*")
      .eq("job_id", jobId)
      .order("display_order", { ascending: true });
    const items = (itemsResponse.data ?? []) as CatalogItemRow[];
    summary.itemsError = itemsResponse.error?.message ?? null;
    summary.itemsCount = items.length;
    summary.itemIds = items.map((item) => item.id);

    const itemIds = items.map((item) => item.id);

    const candidatesResponse = itemIds.length
      ? await admin.from("product_match_candidates").select("*").in("item_id", itemIds)
      : { data: [], error: null };
    const candidates = (candidatesResponse.data ?? []) as ProductCandidateRow[];
    summary.candidatesError = candidatesResponse.error?.message ?? null;
    summary.candidatesCount = candidates.length;

    const filesResponse = await admin
      .from("generated_files")
      .select("*")
      .eq("job_id", jobId);
    summary.filesError = filesResponse.error?.message ?? null;
    summary.filesCount = filesResponse.data?.length ?? 0;

    const flipbookResponse = await admin.from("flipbooks").select("*").eq("job_id", jobId).maybeSingle();
    const flipbook = flipbookResponse.data as FlipbookRow | null;
    summary.flipbookError = flipbookResponse.error?.message ?? null;
    summary.flipbook = flipbook
      ? {
          id: flipbook.id,
          mode: flipbook.mode,
          provider_state: flipbook.provider_state,
        }
      : null;

    const eventsResponse = await admin
      .from("catalog_job_events")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false })
      .limit(40);
    summary.eventsError = eventsResponse.error?.message ?? null;
    summary.eventsCount = eventsResponse.data?.length ?? 0;

    const assetIds = [
      ...(items.map((item) => item.selected_asset_id).filter(Boolean) as string[]),
      ...(candidates.map((candidate) => candidate.asset_id) as string[]),
    ];

    const assetResponse = assetIds.length
      ? await admin.from("product_assets").select("*").in("id", [...new Set(assetIds)])
      : { data: [], error: null };
    summary.assetsError = assetResponse.error?.message ?? null;
    summary.assetsCount = assetResponse.data?.length ?? 0;

    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json(
      {
        ...summary,
        fatalError: error instanceof Error ? error.message : "Unknown error.",
      },
      { status: 500 },
    );
  }
}
