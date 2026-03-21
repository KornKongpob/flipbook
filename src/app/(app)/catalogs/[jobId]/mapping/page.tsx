import { redirect } from "next/navigation";

export default async function CatalogMappingPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  redirect(`/catalogs/${jobId}/matching`);
}
