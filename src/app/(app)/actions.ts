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
      showNormalPrice: formData.get("showNormalPrice") === "on",
      showPromoPrice: formData.get("showPromoPrice") === "on",
      showDiscountAmount: formData.get("showDiscountAmount") === "on",
      showDiscountPercent: formData.get("showDiscountPercent") === "on",
      showSku: formData.get("showSku") === "on",
      showPackSize: formData.get("showPackSize") === "on",
      pageBackgroundColor: formData.get("pageBackgroundColor"),
      pageBackgroundImageBucket: formData.get("pageBackgroundImageBucket"),
      pageBackgroundImagePath: formData.get("pageBackgroundImagePath"),
      pageBackgroundFit: formData.get("pageBackgroundFit"),
      pageBackgroundOpacity: formData.get("pageBackgroundOpacity"),
      pagePadding: formData.get("pagePadding"),
      pageGap: formData.get("pageGap"),
      cardPadding: formData.get("cardPadding"),
      cardRadius: formData.get("cardRadius"),
      imageAreaHeight: formData.get("imageAreaHeight"),
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
