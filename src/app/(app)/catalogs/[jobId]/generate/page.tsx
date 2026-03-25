import { redirect } from "next/navigation";

export default async function CatalogGeneratePage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  redirect(`/catalogs/${jobId}/result#generate`);
}
