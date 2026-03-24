import { redirect } from "next/navigation";

export default async function CatalogEditorPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  redirect(`/catalogs/${jobId}/page-design`);
}
