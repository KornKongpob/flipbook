import { redirect } from "next/navigation";

export default async function CatalogPreviewPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  redirect(`/catalogs/${jobId}/editor`);
}
