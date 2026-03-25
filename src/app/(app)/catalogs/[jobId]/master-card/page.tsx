import { redirect } from "next/navigation";

export default async function CatalogMasterCardPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  redirect(`/catalogs/${jobId}/page-design?mode=card`);
}
