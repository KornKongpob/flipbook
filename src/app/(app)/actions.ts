"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { mergeCatalogStyleOptions } from "@/lib/catalog/style-options";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  approveCatalogItem,
  duplicateCatalogJob,
  moveCatalogItem,
  reorderCatalogItems,
  toggleCatalogItemVisibility,
  updateCatalogItemDisplayName,
  updateJobStyleOptions,
} from "@/lib/catalog/repository";

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase?.auth.signOut();
  redirect("/login");
}

export async function approveCandidateAction(formData: FormData) {
  const user = await requireUser();
  const itemId = String(formData.get("itemId"));
  const jobId = String(formData.get("jobId"));
  const assetId = String(formData.get("assetId"));
  const saveManualMapping = formData.get("saveManualMapping") === "on";

  await approveCatalogItem({
    userId: user.id,
    itemId,
    assetId,
    saveManualMapping,
  });

  revalidatePath(`/catalogs/${jobId}/review`);
  revalidatePath(`/catalogs/${jobId}/editor`);
}

export async function saveDisplayNameAction(formData: FormData) {
  const user = await requireUser();
  const itemId = String(formData.get("itemId"));
  const jobId = String(formData.get("jobId"));
  const displayName = String(formData.get("displayName") ?? "").trim();

  await updateCatalogItemDisplayName(user.id, itemId, displayName || null);

  revalidatePath(`/catalogs/${jobId}/editor`);
}

export async function moveItemAction(formData: FormData) {
  const user = await requireUser();
  const itemId = String(formData.get("itemId"));
  const jobId = String(formData.get("jobId"));
  const direction = String(formData.get("direction")) as "up" | "down";

  await moveCatalogItem(user.id, itemId, direction);

  revalidatePath(`/catalogs/${jobId}/editor`);
}

export async function reorderItemsAction(jobId: string, orderedItemIds: string[]) {
  const user = await requireUser();

  await reorderCatalogItems(user.id, jobId, orderedItemIds);

  revalidatePath(`/catalogs/${jobId}/editor`);
}

export async function toggleItemVisibilityAction(formData: FormData) {
  const user = await requireUser();
  const itemId = String(formData.get("itemId"));
  const jobId = String(formData.get("jobId"));
  const nextVisible = formData.get("nextVisible") === "true";

  await toggleCatalogItemVisibility(user.id, itemId, nextVisible);

  revalidatePath(`/catalogs/${jobId}/editor`);
}

export async function saveStyleOptionsAction(formData: FormData) {
  const user = await requireUser();
  const jobId = String(formData.get("jobId"));

  await updateJobStyleOptions(
    jobId,
    user.id,
    mergeCatalogStyleOptions({
      variant: String(formData.get("variant") ?? "promo"),
      flyerType: formData.get("flyerType"),
      layoutPreset: formData.get("layoutPreset"),
      baseFontSize: formData.get("baseFontSize"),
      showNormalPrice: formData.get("showNormalPrice") === "on",
      showPromoPrice: formData.get("showPromoPrice") === "on",
      showDiscountAmount: formData.get("showDiscountAmount") === "on",
      showDiscountPercent: formData.get("showDiscountPercent") === "on",
      showBarcode: formData.get("showBarcode") === "on",
      showDates: formData.get("showDates") === "on",
      showSku: formData.get("showSku") === "on",
      showPackSize: formData.get("showPackSize") === "on",
      promoStartDate: formData.get("promoStartDate"),
      promoEndDate: formData.get("promoEndDate"),
      pageBackgroundColor: formData.get("pageBackgroundColor"),
      pageBackgroundImageBucket: formData.get("pageBackgroundImageBucket"),
      pageBackgroundImagePath: formData.get("pageBackgroundImagePath"),
      pageBackgroundFit: formData.get("pageBackgroundFit"),
      pageBackgroundOpacity: formData.get("pageBackgroundOpacity"),
      pageBackgroundOffsetX: formData.get("pageBackgroundOffsetX"),
      pageBackgroundOffsetY: formData.get("pageBackgroundOffsetY"),
      pageBackgroundScale: formData.get("pageBackgroundScale"),
      pageBackgroundAnchor: formData.get("pageBackgroundAnchor"),
      headerMediaBucket: formData.get("headerMediaBucket"),
      headerMediaPath: formData.get("headerMediaPath"),
      headerMediaFit: formData.get("headerMediaFit"),
      headerMediaOpacity: formData.get("headerMediaOpacity"),
      headerMediaOffsetX: formData.get("headerMediaOffsetX"),
      headerMediaOffsetY: formData.get("headerMediaOffsetY"),
      headerMediaScale: formData.get("headerMediaScale"),
      footerMediaBucket: formData.get("footerMediaBucket"),
      footerMediaPath: formData.get("footerMediaPath"),
      footerMediaFit: formData.get("footerMediaFit"),
      footerMediaOpacity: formData.get("footerMediaOpacity"),
      footerMediaOffsetX: formData.get("footerMediaOffsetX"),
      footerMediaOffsetY: formData.get("footerMediaOffsetY"),
      footerMediaScale: formData.get("footerMediaScale"),
      pagePadding: formData.get("pagePadding"),
      pageGap: formData.get("pageGap"),
      headerSpace: formData.get("headerSpace"),
      footerSpace: formData.get("footerSpace"),
      cardPadding: formData.get("cardPadding"),
      cardRadius: formData.get("cardRadius"),
      imageAreaHeight: formData.get("imageAreaHeight"),
      cardImageFit: formData.get("cardImageFit"),
      cardImageScale: formData.get("cardImageScale"),
      titleFontSize: formData.get("titleFontSize"),
      skuFontSize: formData.get("skuFontSize"),
      promoPriceFontSize: formData.get("promoPriceFontSize"),
      normalPriceFontSize: formData.get("normalPriceFontSize"),
      cardBackgroundColor: formData.get("cardBackgroundColor"),
      cardBorderColor: formData.get("cardBorderColor"),
      imageBackgroundColor: formData.get("imageBackgroundColor"),
      titleColor: formData.get("titleColor"),
      metaColor: formData.get("metaColor"),
      promoPriceColor: formData.get("promoPriceColor"),
      normalPriceColor: formData.get("normalPriceColor"),
      discountBadgeBackgroundColor: formData.get("discountBadgeBackgroundColor"),
      discountBadgeTextColor: formData.get("discountBadgeTextColor"),
    }),
  );

  revalidatePath(`/catalogs/${jobId}/editor`);
}

export async function duplicateJobAction(formData: FormData) {
  const user = await requireUser();
  const jobId = String(formData.get("jobId"));
  const newJobId = await duplicateCatalogJob(jobId, user.id);

  redirect(`/catalogs/${newJobId}/editor`);
}
