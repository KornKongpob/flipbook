import { NextResponse } from "next/server";
import { getJobStatus } from "@/lib/catalog/repository";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
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
    const statusData = await getJobStatus(jobId, user.id);
    return NextResponse.json(statusData);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get job status.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
