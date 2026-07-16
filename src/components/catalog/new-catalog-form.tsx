"use client";

import { useState } from "react";
import { BadgePercent, Download, Layers3 } from "lucide-react";
import { Button, buttonClassName } from "@/components/ui/button";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBanner } from "@/components/ui/status-banner";
import { SurfaceCard, SurfaceCardBody, SurfaceCardHeader } from "@/components/ui/surface-card";
import { FLIPBOOK_MODE_OPTIONS } from "@/lib/catalog/constants";
import type { CatalogPricingMode } from "@/lib/catalog/slab-pricing";

interface CatalogTemplateOption {
  id: string;
  name: string;
  variant: string;
}

const MODE_OPTIONS: Array<{
  value: CatalogPricingMode;
  label: string;
  description: string;
}> = [
  {
    value: "promotion",
    label: "Promotion catalog",
    description: "Regular price, promo price, and calculated savings.",
  },
  {
    value: "slab",
    label: "Slab price catalog",
    description: "One or more quantity tiers with a price for each slab.",
  },
];

export function NewCatalogForm({
  templates,
  error,
}: {
  templates: CatalogTemplateOption[];
  error?: string;
}) {
  const [pricingMode, setPricingMode] = useState<CatalogPricingMode>("promotion");
  const requiredColumns = pricingMode === "slab"
    ? [
        ["Item number", "SKU / Makro lookup key"],
        ["Slab price", "Use a single Slab price column or numbered Slab N price columns"],
      ]
    : [
        ["Item number", "SKU / Makro lookup key"],
        ["Normal price", "Regular retail price"],
        ["Promo price", "Promotional price"],
      ];

  return (
    <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
      <SurfaceCard>
        <SurfaceCardHeader>
          <h2 className="text-sm font-semibold text-foreground">
            {pricingMode === "slab" ? "Slab spreadsheet checklist" : "Promotion spreadsheet checklist"}
          </h2>
          <p className="mt-1 text-xs text-muted">The checklist and download update with the selected catalog type.</p>
        </SurfaceCardHeader>
        <SurfaceCardBody>
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">Required columns</p>
          <ul className="space-y-3 text-sm">
            {requiredColumns.map(([name, description]) => (
              <li key={name} className="flex items-start gap-2.5">
                <span className="status-dot status-dot-brand mt-1.5" />
                <div>
                  <span className="font-medium text-foreground">{name}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-muted">{description}</span>
                </div>
              </li>
            ))}
          </ul>

          {pricingMode === "slab" ? (
            <div className="mt-5 rounded-xl border border-sky-100 bg-sky-50/70 p-3">
              <p className="text-xs font-semibold text-sky-800">Multiple slab tiers</p>
              <p className="mt-1 text-xs leading-5 text-sky-700">
                Pair columns such as Slab 1 min qty + Slab 1 price, then repeat for Slab 2, Slab 3, and more.
              </p>
            </div>
          ) : null}

          <div className="mt-5 rounded-xl bg-gray-50 p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Optional</p>
            <p className="text-sm text-muted-strong">Item name, normal price for slab catalogs, pack size, and unit</p>
          </div>

          <a
            href={`/api/templates/catalog-import?pricingMode=${pricingMode}`}
            className={buttonClassName("secondary", "mt-5 w-full gap-1.5")}
          >
            <Download className="size-3.5" />
            Download {pricingMode === "slab" ? "slab" : "promotion"} template
          </a>
        </SurfaceCardBody>
      </SurfaceCard>

      <SurfaceCard>
        <SurfaceCardHeader>
          <h2 className="text-sm font-semibold text-foreground">Job setup</h2>
          <p className="mt-1 text-xs text-muted">Choose the pricing model before uploading so the workbook is validated correctly.</p>
        </SurfaceCardHeader>
        <SurfaceCardBody>
          <form action="/api/jobs/import" method="post" encType="multipart/form-data" className="space-y-5">
            <fieldset className="space-y-2" aria-describedby="pricing-mode-help">
              <legend className="text-sm font-medium text-foreground">Catalog price type</legend>
              <p id="pricing-mode-help" className="text-xs text-muted">This controls import validation, product editing, preview, and PDF output.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {MODE_OPTIONS.map((option) => {
                  const selected = pricingMode === option.value;
                  const Icon = option.value === "slab" ? Layers3 : BadgePercent;

                  return (
                    <label
                      key={option.value}
                      className={`relative flex cursor-pointer gap-3 rounded-xl border p-4 text-left shadow-sm transition ${selected ? "border-brand bg-brand-soft/20 ring-2 ring-brand/10" : "border-line bg-white hover:border-brand/40"}`}
                    >
                      <input
                        type="radio"
                        name="pricingMode"
                        value={option.value}
                        checked={selected}
                        onChange={() => setPricingMode(option.value)}
                        className="sr-only"
                      />
                      <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${selected ? "bg-brand text-white" : "bg-slate-100 text-muted-strong"}`}>
                        <Icon className="size-4" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-foreground">{option.label}</span>
                        <span className="mt-1 block text-xs leading-5 text-muted">{option.description}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="jobName">
                Job name <span className="text-brand">*</span>
              </label>
              <Input id="jobName" name="jobName" placeholder={pricingMode === "slab" ? "e.g. July 2026 Wholesale Slab Prices" : "e.g. July 2026 Beverage Promotions"} required />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="templateId">Layout template</label>
              <Select id="templateId" name="templateId" required defaultValue={templates[0]?.id} disabled={!templates.length}>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>{template.name} ({template.variant})</option>
                ))}
              </Select>
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-foreground">Flipbook integration</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {FLIPBOOK_MODE_OPTIONS.map((option) => (
                  <label key={option.value} className="relative flex cursor-pointer flex-col rounded-xl border border-line bg-card p-4 shadow-sm transition hover:border-brand/50 hover:bg-brand-soft/10 has-[:checked]:border-brand has-[:checked]:bg-brand-soft/20">
                    <input type="radio" name="flipbookMode" value={option.value} defaultChecked={option.value === "client_id"} className="peer sr-only" />
                    <span className="mb-1 pr-5 text-sm font-semibold text-foreground">{option.label}</span>
                    <span className="text-xs leading-relaxed text-muted">{option.description}</span>
                    <span className="absolute right-4 top-4 hidden size-4 items-center justify-center rounded-full bg-brand text-white peer-checked:flex" aria-hidden="true">✓</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="space-y-1.5 pt-2">
              <label className="text-sm font-medium text-foreground" htmlFor="workbook">
                Excel file <span className="text-brand">*</span>
              </label>
              <FileDropzone name="workbook" accept=".xlsx" required id="workbook" />
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line bg-gray-50/50 px-4 py-3 text-sm text-muted-strong transition hover:bg-gray-50">
              <input type="checkbox" name="reuseManualMappings" defaultChecked className="size-4 rounded accent-brand" />
              Reuse saved manual mappings when SKU matches
            </label>

            {error ? <StatusBanner tone="danger" title="Could not create the catalog job" description={error} /> : null}
            {!templates.length ? <StatusBanner tone="danger" title="No active layout template" description="Ask an administrator to activate at least one catalog template before creating a job." /> : null}

            <Button className="h-10 w-full text-base" disabled={!templates.length}>Create catalog job</Button>
          </form>
        </SurfaceCardBody>
      </SurfaceCard>
    </div>
  );
}
