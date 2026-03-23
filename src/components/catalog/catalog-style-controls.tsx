"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";
import { ChevronDown, Loader2, RotateCcw, Upload } from "lucide-react";
import { Button, buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CATALOG_STYLE_PRESETS,
  type CatalogStyleOptions,
  type EditorCatalogStyleOptions,
} from "@/lib/catalog/style-options";
import { CATALOG_LAYOUT_PRESETS } from "@/lib/catalog/layout";

type MediaSlotKey = "background" | "header" | "footer";

interface CatalogStyleControlsProps {
  jobId: string;
  style: EditorCatalogStyleOptions;
  hasUnsavedStyleChanges: boolean;
  styleSaving: boolean;
  styleStatusLabel: string;
  styleSaveError: string | null;
  mediaUploading: Record<MediaSlotKey, boolean>;
  mediaErrors: Record<MediaSlotKey, string | null>;
  onStyleChange: (key: keyof EditorCatalogStyleOptions, value: string | number | boolean | null) => void;
  onSaveStyle: () => void | Promise<void>;
  onApplyPreset: (presetId: string) => void;
  onReset: () => void;
  onBackgroundUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onHeaderMediaUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onFooterMediaUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onClearMedia: (slot: MediaSlotKey) => void;
  onOpenExport: () => void | Promise<void>;
  exportPending: boolean;
}

const DISPLAY_FIELDS: Array<{ key: keyof CatalogStyleOptions; label: string }> = [
  { key: "showNormalPrice", label: "Normal price" },
  { key: "showPromoPrice", label: "Promo price" },
  { key: "showDiscountAmount", label: "Discount amount" },
  { key: "showDiscountPercent", label: "Percent off" },
  { key: "showSku", label: "SKU" },
  { key: "showPackSize", label: "Pack size" },
];

const COLOR_FIELDS: Array<{ key: keyof CatalogStyleOptions; label: string }> = [
  { key: "cardBackgroundColor", label: "Card background" },
  { key: "cardBorderColor", label: "Card border" },
  { key: "imageBackgroundColor", label: "Image background" },
  { key: "titleColor", label: "Title" },
  { key: "metaColor", label: "SKU / meta" },
  { key: "promoPriceColor", label: "Promo price" },
  { key: "normalPriceColor", label: "Normal price" },
  { key: "discountBadgeBackgroundColor", label: "Discount pill" },
  { key: "discountBadgeTextColor", label: "Discount pill text" },
];

const NUMBER_FIELDS: Array<{
  key: keyof CatalogStyleOptions;
  label: string;
  min: number;
  max: number;
  step?: number;
}> = [
  { key: "titleFontSize", label: "Title size", min: 10, max: 24 },
  { key: "skuFontSize", label: "SKU size", min: 8, max: 18 },
  { key: "promoPriceFontSize", label: "Promo price size", min: 16, max: 40 },
  { key: "normalPriceFontSize", label: "Normal price size", min: 8, max: 22 },
  { key: "headerSpace", label: "Header space", min: 0, max: 180 },
  { key: "footerSpace", label: "Footer space", min: 0, max: 120 },
  { key: "pagePadding", label: "Page padding", min: 8, max: 40 },
  { key: "pageGap", label: "Grid gap", min: 4, max: 24 },
  { key: "cardPadding", label: "Card padding", min: 6, max: 28 },
  { key: "cardRadius", label: "Card radius", min: 8, max: 32 },
  { key: "imageAreaHeight", label: "Image height", min: 64, max: 180 },
];

const CARD_IMAGE_FIT_OPTIONS: Array<{
  value: CatalogStyleOptions["cardImageFit"];
  label: string;
  description: string;
}> = [
  {
    value: "contain",
    label: "Show full product",
    description: "Keeps the full pack visible while reducing empty space with zoom.",
  },
  {
    value: "cover",
    label: "Fill frame more",
    description: "Uses more of the frame and may crop image edges slightly.",
  },
];

const CARD_IMAGE_PRESETS: Array<{
  label: string;
  fit: CatalogStyleOptions["cardImageFit"];
  scale: number;
}> = [
  { label: "Balanced", fit: "contain", scale: 1.12 },
  { label: "Tighter", fit: "contain", scale: 1.2 },
  { label: "Full frame", fit: "cover", scale: 1.04 },
];

const RANGE_INPUT_CLASSNAME = "h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-100 accent-brand";

function MediaPreview({
  previewUrl,
  alt,
  emptyLabel,
}: {
  previewUrl: string | null;
  alt: string;
  emptyLabel: string;
}) {
  return (
    <div className="h-28 overflow-hidden rounded-2xl border border-dashed border-line/80 bg-slate-50/80 shadow-inner">
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-muted">{emptyLabel}</div>
      )}
    </div>
  );
}

function MediaPanel({
  title,
  previewUrl,
  alt,
  emptyLabel,
  uploadLabel,
  fitName,
  fitValue,
  opacityName,
  opacityValue,
  offsetXName,
  offsetXValue,
  offsetYName,
  offsetYValue,
  scaleName,
  scaleValue,
  uploading,
  error,
  onUpload,
  onClear,
  onFitToZone,
  onCenter,
  onFitChange,
  onOpacityChange,
  onOffsetXChange,
  onOffsetYChange,
  onScaleChange,
  extraControls,
  showTitle = true,
}: {
  title: string;
  previewUrl: string | null;
  alt: string;
  emptyLabel: string;
  uploadLabel: string;
  fitName: string;
  fitValue: string;
  opacityName: string;
  opacityValue: number;
  offsetXName: string;
  offsetXValue: number;
  offsetYName: string;
  offsetYValue: number;
  scaleName: string;
  scaleValue: number;
  uploading: boolean;
  error: string | null;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onClear: () => void;
  onFitToZone: () => void;
  onCenter: () => void;
  onFitChange: (value: string) => void;
  onOpacityChange: (value: number) => void;
  onOffsetXChange: (value: number) => void;
  onOffsetYChange: (value: number) => void;
  onScaleChange: (value: number) => void;
  extraControls?: ReactNode;
  showTitle?: boolean;
}) {
  return (
    <div className="space-y-2">
      {showTitle ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{title}</p>
          {uploading ? <Loader2 className="size-3 animate-spin text-muted" /> : null}
        </div>
      ) : null}
      <div className="rounded-2xl border border-line/80 bg-gradient-to-b from-white via-white to-slate-50/60 p-4 shadow-sm space-y-4">
        <MediaPreview previewUrl={previewUrl} alt={alt} emptyLabel={emptyLabel} />
        <div className="flex flex-wrap items-center gap-2">
          <label className={buttonClassName("secondary", "h-8 cursor-pointer gap-1.5 px-3 text-xs") }>
            <Upload className="size-3" />
            {uploadLabel}
            <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
          </label>
          {previewUrl ? (
            <Button
              type="button"
              variant="secondary"
              onClick={onClear}
              className="h-8 px-3 text-xs"
            >
              Remove image
            </Button>
          ) : null}
        </div>
        {error ? <p className="text-[11px] text-rose-600">{error}</p> : null}
        {extraControls}
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1 text-[11px] text-muted">
            <span>Fit mode</span>
            <select
              name={fitName}
              value={fitValue}
              onChange={(event) => onFitChange(event.target.value)}
              className="h-10 w-full rounded-lg border border-line bg-white px-3 text-xs text-foreground"
            >
              <option value="cover">Cover</option>
              <option value="contain">Contain</option>
            </select>
          </label>
          <label className="space-y-1 text-[11px] text-muted">
            <span>Scale</span>
            <Input
              type="number"
              name={scaleName}
              min={0.5}
              max={2.5}
              step={0.1}
              value={String(scaleValue)}
              onChange={(event) => onScaleChange(Number(event.target.value))}
              className="h-9 text-xs"
            />
          </label>
          <label className="space-y-1 text-[11px] text-muted">
            <span>X offset</span>
            <Input
              type="number"
              name={offsetXName}
              min={-100}
              max={100}
              step={1}
              value={String(offsetXValue)}
              onChange={(event) => onOffsetXChange(Number(event.target.value))}
              className="h-9 text-xs"
            />
          </label>
          <label className="space-y-1 text-[11px] text-muted">
            <span>Y offset</span>
            <Input
              type="number"
              name={offsetYName}
              min={-100}
              max={100}
              step={1}
              value={String(offsetYValue)}
              onChange={(event) => onOffsetYChange(Number(event.target.value))}
              className="h-9 text-xs"
            />
          </label>
        </div>
        <label className="space-y-1 text-[11px] text-muted">
          <span>Opacity ({opacityValue.toFixed(2)})</span>
          <input
            type="range"
            name={opacityName}
            min="0"
            max="1"
            step="0.05"
            value={opacityValue}
            onChange={(event) => onOpacityChange(Number(event.target.value))}
            className={RANGE_INPUT_CLASSNAME}
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onCenter}
            className="h-8 px-3 text-xs"
          >
            Center
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onFitToZone}
            className="h-8 px-3 text-xs"
          >
            Fit to zone
          </Button>
        </div>
      </div>
    </div>
  );
}

function StyleSection({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  description: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-2xl border border-line/80 bg-white/85 shadow-sm backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 bg-gradient-to-r from-white via-white to-slate-50/80 px-4 py-4 text-left transition hover:from-slate-50 hover:to-white"
      >
        <div className="min-w-0">
          <p className="text-[13px] font-semibold tracking-[-0.01em] text-foreground">{title}</p>
          <p className="mt-1 text-[11px] leading-5 text-muted-strong">{description}</p>
        </div>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line/80 bg-white shadow-sm">
          <ChevronDown className={`size-4 text-muted transition ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open ? <div className="border-t border-line/70 bg-slate-50/35 px-4 py-4">{children}</div> : null}
    </section>
  );
}

export function CatalogStyleControls({
  jobId,
  style,
  hasUnsavedStyleChanges,
  styleSaving,
  styleStatusLabel,
  styleSaveError,
  mediaUploading,
  mediaErrors,
  onStyleChange,
  onSaveStyle,
  onApplyPreset,
  onReset,
  onBackgroundUpload,
  onHeaderMediaUpload,
  onFooterMediaUpload,
  onClearMedia,
  onOpenExport,
  exportPending,
}: CatalogStyleControlsProps) {
  const isUploadingMedia = mediaUploading.background || mediaUploading.header || mediaUploading.footer;

  return (
    <div className="overflow-hidden rounded-2xl border border-line/80 bg-white/85 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.35)] backdrop-blur-sm">
      <div className="border-b border-line/70 bg-gradient-to-br from-slate-50 via-white to-brand-soft/10 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Design studio</p>
            <p className="mt-1 text-sm font-semibold text-foreground">Style Options</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-strong">
              Refine layout, media, and typography while the A4 preview stays pinned for live feedback.
            </p>
          </div>
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium shadow-sm ${styleSaveError ? "border-rose-200 bg-rose-50 text-rose-700" : styleSaving || hasUnsavedStyleChanges ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {styleSaveError ? "Save failed" : styleSaving ? "Saving…" : hasUnsavedStyleChanges ? "Unsaved" : "Saved"}
          </span>
        </div>
      </div>
      <form onSubmit={(event) => event.preventDefault()} className="space-y-3 bg-[linear-gradient(180deg,rgba(248,250,252,0.68)_0%,rgba(255,255,255,0.96)_100%)] p-4">
        <input type="hidden" name="jobId" value={jobId} />
        <input type="hidden" name="layoutPreset" value={style.layoutPreset} />
        <input type="hidden" name="pageBackgroundImageBucket" value={style.pageBackgroundImageBucket ?? ""} />
        <input type="hidden" name="pageBackgroundImagePath" value={style.pageBackgroundImagePath ?? ""} />
        <input type="hidden" name="headerMediaBucket" value={style.headerMediaBucket ?? ""} />
        <input type="hidden" name="headerMediaPath" value={style.headerMediaPath ?? ""} />
        <input type="hidden" name="footerMediaBucket" value={style.footerMediaBucket ?? ""} />
        <input type="hidden" name="footerMediaPath" value={style.footerMediaPath ?? ""} />
        <StyleSection
          title="Layout & presets"
          description="Choose the overall page structure first, then fine tune details."
          defaultOpen
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted">Style presets</p>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onReset}
                  className="h-8 gap-1 rounded-xl px-2.5 text-[11px] text-muted hover:text-foreground"
                >
                  <RotateCcw className="size-3" /> Reset
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {CATALOG_STYLE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onApplyPreset(preset.id)}
                    className="rounded-xl border border-line/80 bg-white px-2 py-2.5 text-[11px] font-medium text-foreground shadow-sm transition hover:border-brand/30 hover:bg-brand-soft/10"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted">Layout preset</p>
                <span className="text-[11px] text-muted">Applies to the whole catalog job</span>
              </div>
              <div className="grid gap-2">
                {CATALOG_LAYOUT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onStyleChange("layoutPreset", preset.id)}
                    className={`rounded-2xl border px-3 py-3 text-left shadow-sm transition ${style.layoutPreset === preset.id ? "border-brand/30 bg-brand-soft/15 shadow-[0_14px_28px_-22px_rgba(37,99,235,0.8)]" : "border-line/80 bg-white hover:border-brand/20"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{preset.label}</p>
                        <p className="mt-1 text-[11px] leading-5 text-muted-strong">{preset.description}</p>
                      </div>
                      <span className="rounded-full border border-line bg-white/90 px-2 py-1 text-[10px] font-semibold text-muted-strong shadow-sm">
                        {preset.columns}×{preset.rows}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-muted">Layout variant</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "promo", label: "Promo flyer" },
                  { value: "clean", label: "Clean grid" },
                ].map((variant) => (
                  <label
                    key={variant.value}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-line/80 bg-white p-3 text-xs shadow-sm transition has-[:checked]:border-brand has-[:checked]:bg-brand-soft/10"
                  >
                    <input
                      type="radio"
                      name="variant"
                      value={variant.value}
                      checked={style.variant === variant.value}
                      onChange={() => onStyleChange("variant", variant.value)}
                      className="accent-brand"
                    />
                    {variant.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </StyleSection>

        <StyleSection
          title="Content visibility"
          description="Show or hide the main product details displayed on each card."
        >
          <div className="space-y-3">
            <div className="rounded-2xl border border-line/80 bg-gradient-to-br from-white via-white to-sky-50/50 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Visible on card</p>
                  <p className="mt-1 text-[11px] leading-5 text-muted-strong">
                    Quickly control which product details appear across the whole catalog layout.
                  </p>
                </div>
                <span className="rounded-full border border-line/80 bg-white px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm">
                  {DISPLAY_FIELDS.filter((field) => Boolean(style[field.key])).length}/{DISPLAY_FIELDS.length}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
            {DISPLAY_FIELDS.map((field) => (
              <label
                key={field.key}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-line/80 bg-white px-3 py-3 text-xs text-muted-strong shadow-sm transition hover:border-brand/20 has-[:checked]:border-brand/30 has-[:checked]:bg-brand-soft/10 has-[:checked]:text-foreground"
              >
                <input
                  type="checkbox"
                  name={field.key}
                  checked={Boolean(style[field.key])}
                  onChange={(event) => onStyleChange(field.key, event.target.checked)}
                  className="accent-brand"
                />
                <div className="min-w-0">
                  <span className="block text-xs font-semibold">{field.label}</span>
                  <span className="mt-0.5 block text-[10px] text-muted-strong">
                    {Boolean(style[field.key]) ? "Shown in cards" : "Hidden from cards"}
                  </span>
                </div>
              </label>
            ))}
            </div>
          </div>
        </StyleSection>

        <StyleSection
          title="A4 background"
          description="Manage the full-page artwork and safe-area anchoring."
        >
          <MediaPanel
            title="A4 background"
            previewUrl={style.pageBackgroundPreviewUrl}
            alt="Background preview"
            emptyLabel="No background image"
            uploadLabel="Upload background"
            fitName="pageBackgroundFit"
            fitValue={style.pageBackgroundFit}
            opacityName="pageBackgroundOpacity"
            opacityValue={style.pageBackgroundOpacity}
            offsetXName="pageBackgroundOffsetX"
            offsetXValue={style.pageBackgroundOffsetX}
            offsetYName="pageBackgroundOffsetY"
            offsetYValue={style.pageBackgroundOffsetY}
            scaleName="pageBackgroundScale"
            scaleValue={style.pageBackgroundScale}
            uploading={mediaUploading.background}
            error={mediaErrors.background}
            onUpload={onBackgroundUpload}
            onClear={() => onClearMedia("background")}
            onCenter={() => {
              onStyleChange("pageBackgroundOffsetX", 0);
              onStyleChange("pageBackgroundOffsetY", 0);
            }}
            onFitToZone={() => {
              onStyleChange("pageBackgroundAnchor", "safeArea");
              onStyleChange("pageBackgroundOffsetX", 0);
              onStyleChange("pageBackgroundOffsetY", 0);
              onStyleChange("pageBackgroundScale", 1);
            }}
            onFitChange={(value) => onStyleChange("pageBackgroundFit", value)}
            onOpacityChange={(value) => onStyleChange("pageBackgroundOpacity", value)}
            onOffsetXChange={(value) => onStyleChange("pageBackgroundOffsetX", value)}
            onOffsetYChange={(value) => onStyleChange("pageBackgroundOffsetY", value)}
            onScaleChange={(value) => onStyleChange("pageBackgroundScale", value)}
            extraControls={(
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="space-y-1 text-[11px] text-muted">
                  <span>Background color</span>
                  <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-2 py-1.5">
                    <input
                      type="color"
                      name="pageBackgroundColor"
                      value={style.pageBackgroundColor}
                      onChange={(event) => onStyleChange("pageBackgroundColor", event.target.value)}
                      className="h-8 w-10 rounded border-0 bg-transparent p-0"
                    />
                    <span className="font-mono text-[11px] text-foreground">{style.pageBackgroundColor}</span>
                  </div>
                </label>
                <label className="space-y-1 text-[11px] text-muted">
                  <span>Anchor</span>
                  <select
                    name="pageBackgroundAnchor"
                    value={style.pageBackgroundAnchor}
                    onChange={(event) => onStyleChange("pageBackgroundAnchor", event.target.value)}
                    className="h-10 w-full rounded-lg border border-line bg-white px-3 text-xs text-foreground"
                  >
                    <option value="page">Full page</option>
                    <option value="safeArea">Safe area</option>
                  </select>
                </label>
              </div>
            )}
            showTitle={false}
          />
        </StyleSection>

        <StyleSection
          title="Header media"
          description="Control the top media strip without losing sight of the A4 preview."
        >
          <MediaPanel
            title="Header media"
            previewUrl={style.headerMediaPreviewUrl}
            alt="Header media preview"
            emptyLabel="No header media"
            uploadLabel="Upload header media"
            fitName="headerMediaFit"
            fitValue={style.headerMediaFit}
            opacityName="headerMediaOpacity"
            opacityValue={style.headerMediaOpacity}
            offsetXName="headerMediaOffsetX"
            offsetXValue={style.headerMediaOffsetX}
            offsetYName="headerMediaOffsetY"
            offsetYValue={style.headerMediaOffsetY}
            scaleName="headerMediaScale"
            scaleValue={style.headerMediaScale}
            uploading={mediaUploading.header}
            error={mediaErrors.header}
            onUpload={onHeaderMediaUpload}
            onClear={() => onClearMedia("header")}
            onCenter={() => {
              onStyleChange("headerMediaOffsetX", 0);
              onStyleChange("headerMediaOffsetY", 0);
            }}
            onFitToZone={() => {
              onStyleChange("headerMediaFit", "cover");
              onStyleChange("headerMediaOffsetX", 0);
              onStyleChange("headerMediaOffsetY", 0);
              onStyleChange("headerMediaScale", 1);
            }}
            onFitChange={(value) => onStyleChange("headerMediaFit", value)}
            onOpacityChange={(value) => onStyleChange("headerMediaOpacity", value)}
            onOffsetXChange={(value) => onStyleChange("headerMediaOffsetX", value)}
            onOffsetYChange={(value) => onStyleChange("headerMediaOffsetY", value)}
            onScaleChange={(value) => onStyleChange("headerMediaScale", value)}
            showTitle={false}
          />
        </StyleSection>

        <StyleSection
          title="Footer media"
          description="Manage the bottom media strip and its reserved space."
        >
          <MediaPanel
            title="Footer media"
            previewUrl={style.footerMediaPreviewUrl}
            alt="Footer media preview"
            emptyLabel="No footer media"
            uploadLabel="Upload footer media"
            fitName="footerMediaFit"
            fitValue={style.footerMediaFit}
            opacityName="footerMediaOpacity"
            opacityValue={style.footerMediaOpacity}
            offsetXName="footerMediaOffsetX"
            offsetXValue={style.footerMediaOffsetX}
            offsetYName="footerMediaOffsetY"
            offsetYValue={style.footerMediaOffsetY}
            scaleName="footerMediaScale"
            scaleValue={style.footerMediaScale}
            uploading={mediaUploading.footer}
            error={mediaErrors.footer}
            onUpload={onFooterMediaUpload}
            onClear={() => onClearMedia("footer")}
            onCenter={() => {
              onStyleChange("footerMediaOffsetX", 0);
              onStyleChange("footerMediaOffsetY", 0);
            }}
            onFitToZone={() => {
              onStyleChange("footerMediaFit", "cover");
              onStyleChange("footerMediaOffsetX", 0);
              onStyleChange("footerMediaOffsetY", 0);
              onStyleChange("footerMediaScale", 1);
            }}
            onFitChange={(value) => onStyleChange("footerMediaFit", value)}
            onOpacityChange={(value) => onStyleChange("footerMediaOpacity", value)}
            onOffsetXChange={(value) => onStyleChange("footerMediaOffsetX", value)}
            onOffsetYChange={(value) => onStyleChange("footerMediaOffsetY", value)}
            onScaleChange={(value) => onStyleChange("footerMediaScale", value)}
            showTitle={false}
          />
        </StyleSection>

        <StyleSection
          title="Colors"
          description="Theme the cards, price emphasis, and discount badge colors."
        >
          <div className="space-y-3">
            <div className="rounded-2xl border border-line/80 bg-gradient-to-br from-white via-white to-rose-50/45 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Color system</p>
              <p className="mt-1 text-[11px] leading-5 text-muted-strong">
                Fine tune the palette used in cards, prices, and discount highlights without leaving the live preview.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
            {COLOR_FIELDS.map((field) => (
              <label key={field.key} className="rounded-2xl border border-line/80 bg-white p-3 shadow-sm transition hover:border-brand/20">
                <span className="block text-[11px] font-medium text-muted">{field.label}</span>
                <div className="mt-2 flex items-center gap-3 rounded-xl border border-line/70 bg-slate-50/60 px-2.5 py-2">
                  <span
                    className="size-8 shrink-0 rounded-xl border border-white shadow-sm"
                    style={{ backgroundColor: String(style[field.key]) }}
                  />
                  <input
                    type="color"
                    name={field.key}
                    value={String(style[field.key])}
                    onChange={(event) => onStyleChange(field.key, event.target.value)}
                    className="h-8 w-10 shrink-0 rounded border-0 bg-transparent p-0"
                  />
                  <span className="min-w-0 truncate font-mono text-[11px] font-semibold text-foreground">
                    {style[field.key]}
                  </span>
                </div>
              </label>
            ))}
            </div>
          </div>
        </StyleSection>

        <StyleSection
          title="Typography & spacing"
          description="Adjust font sizes and spacing while the A4 preview stays in view."
          defaultOpen
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-line/80 bg-gradient-to-br from-white via-white to-amber-50/50 p-4 shadow-sm space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Product image framing</p>
                <p className="text-[11px] leading-5 text-muted-strong">
                  Bring the product closer to the card edges, especially on the top and bottom, without disturbing the text layout.
                </p>
              </div>
              <div className="space-y-3">
                <div className="inline-flex rounded-2xl border border-line/80 bg-white p-1 shadow-sm">
                  {CARD_IMAGE_FIT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onStyleChange("cardImageFit", option.value)}
                      className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${style.cardImageFit === option.value ? "bg-brand text-white shadow-sm" : "text-muted-strong hover:bg-slate-50 hover:text-foreground"}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px] sm:items-end">
                  <label className="space-y-2 text-[11px] text-muted">
                    <div className="flex items-center justify-between gap-3">
                      <span>Image zoom</span>
                      <span className="rounded-full bg-white px-2 py-1 font-semibold text-foreground shadow-sm">{style.cardImageScale.toFixed(2)}×</span>
                    </div>
                    <div className="rounded-2xl border border-line/80 bg-white px-3 py-3 shadow-sm">
                      <input
                        type="range"
                        name="cardImageScale"
                        min={1}
                        max={1.35}
                        step={0.01}
                        value={style.cardImageScale}
                        onChange={(event) => onStyleChange("cardImageScale", Number(event.target.value))}
                        className={RANGE_INPUT_CLASSNAME}
                      />
                      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-strong">
                        <span>Less zoom</span>
                        <span>More zoom</span>
                      </div>
                    </div>
                  </label>

                  <div className="rounded-2xl border border-line/80 bg-white px-4 py-3 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Current</p>
                    <p className="mt-2 text-lg font-semibold tracking-[-0.02em] text-foreground">{style.cardImageScale.toFixed(2)}×</p>
                    <p className="mt-1 text-[11px] leading-5 text-muted-strong">
                      {style.cardImageFit === "contain" ? "Show the full pack with tighter framing." : "Fill the frame more aggressively."}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] text-muted">Quick presets</span>
                  <div className="flex flex-wrap gap-2">
                    {CARD_IMAGE_PRESETS.map((preset) => (
                      <button
                        key={`${preset.fit}-${preset.scale}`}
                        type="button"
                        onClick={() => {
                          onStyleChange("cardImageFit", preset.fit);
                          onStyleChange("cardImageScale", preset.scale);
                        }}
                        className="rounded-full border border-line/80 bg-white px-3 py-1.5 text-[11px] font-medium text-muted-strong shadow-sm transition hover:border-brand/25 hover:text-foreground"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {NUMBER_FIELDS.map((field) => (
                <label key={field.key} className="space-y-1 text-[11px] text-muted">
                  <span>{field.label}</span>
                  <Input
                    type="number"
                    name={field.key}
                    min={field.min}
                    max={field.max}
                    step={field.step ?? 1}
                    value={String(style[field.key])}
                    onChange={(event) => onStyleChange(field.key, Number(event.target.value))}
                    className="h-9 text-xs"
                  />
                </label>
              ))}
            </div>
          </div>
        </StyleSection>

        <StyleSection
          title="Export"
          description="Check save status and open the export workspace once the design is ready."
          defaultOpen
        >
          <div className="space-y-3">
            <div className={`rounded-2xl border p-4 shadow-sm ${styleSaveError ? "border-rose-200 bg-rose-50/80" : hasUnsavedStyleChanges ? "border-amber-200 bg-amber-50/80" : "border-emerald-200 bg-emerald-50/80"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Ready to export</p>
                  <p className="mt-1 text-[11px] leading-5 text-muted-strong">
                    {styleSaveError ? styleSaveError : styleStatusLabel}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm ${styleSaveError ? "bg-rose-100 text-rose-700" : hasUnsavedStyleChanges ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {styleSaveError ? "Needs fix" : hasUnsavedStyleChanges ? "Unsaved changes" : "Ready"}
                </span>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="secondary"
                className="h-10 gap-1.5 rounded-xl text-xs"
                disabled={!hasUnsavedStyleChanges || isUploadingMedia || styleSaving || exportPending}
                onClick={onSaveStyle}
              >
                {styleSaving && !exportPending ? <Loader2 className="size-3 animate-spin" /> : null}
                {hasUnsavedStyleChanges ? "Save style" : "Saved"}
              </Button>
              <Button
                type="button"
                className="h-10 gap-1.5 rounded-xl text-xs"
                disabled={isUploadingMedia || styleSaving || exportPending}
                onClick={onOpenExport}
              >
                {(exportPending || styleSaving) && <Loader2 className="size-3 animate-spin" />}
                {hasUnsavedStyleChanges ? "Save + export" : "Open export"}
              </Button>
            </div>
          </div>
        </StyleSection>
      </form>
    </div>
  );
}
