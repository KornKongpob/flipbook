import { Loader2 } from "lucide-react";
import { SurfaceCard, SurfaceCardBody, SurfaceCardHeader } from "@/components/ui/surface-card";

export default function CatalogWorkflowLoading() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="rounded-3xl border border-white/60 bg-white/70 px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-2">
            <div className="h-3 w-28 rounded-full bg-gray-100 animate-pulse" />
            <div className="h-8 w-64 rounded-full bg-gray-100 animate-pulse" />
            <p className="text-sm text-muted-strong">
              Preparing the next catalog step and loading the latest job data…
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft/20 px-3 py-2 text-sm font-medium text-brand">
            <Loader2 className="size-4 animate-spin" />
            Loading workflow step…
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <SurfaceCard>
          <SurfaceCardHeader>
            <div className="space-y-2">
              <div className="h-4 w-40 rounded-full bg-gray-100 animate-pulse" />
              <div className="h-3 w-72 rounded-full bg-gray-100 animate-pulse" />
            </div>
          </SurfaceCardHeader>
          <SurfaceCardBody className="space-y-4">
            <div className="h-28 rounded-2xl bg-gray-100 animate-pulse" />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
              <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
              <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
            </div>
            <div className="h-56 rounded-2xl bg-gray-100 animate-pulse" />
          </SurfaceCardBody>
        </SurfaceCard>

        <SurfaceCard>
          <SurfaceCardHeader>
            <div className="space-y-2">
              <div className="h-4 w-28 rounded-full bg-gray-100 animate-pulse" />
              <div className="h-3 w-36 rounded-full bg-gray-100 animate-pulse" />
            </div>
          </SurfaceCardHeader>
          <SurfaceCardBody className="space-y-3">
            <div className="h-20 rounded-2xl bg-gray-100 animate-pulse" />
            <div className="h-20 rounded-2xl bg-gray-100 animate-pulse" />
            <div className="h-20 rounded-2xl bg-gray-100 animate-pulse" />
          </SurfaceCardBody>
        </SurfaceCard>
      </div>
    </div>
  );
}
