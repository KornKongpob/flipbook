import { NextResponse } from "next/server";
import { bulkApproveCatalogItems } from "@/lib/catalog/repository";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const minConfidence: number | undefined =
      typeof body.minConfidence === "number" ? body.minConfidence : undefined;
    const itemIds: string[] | undefined = Array.isArray(body.itemIds) ? body.itemIds : undefined;

    const result = await bulkApproveCatalogItems({
      userId: user.id,
      jobId,
      minConfidence,
      itemIds,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bulk approve failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
