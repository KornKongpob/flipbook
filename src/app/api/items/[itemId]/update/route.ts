import { NextResponse } from "next/server";
import { updateCatalogItemFields } from "@/lib/catalog/repository";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await context.params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const item = await updateCatalogItemFields(user.id, itemId, {
      displayName: body.displayName,
      normalPrice: "normalPrice" in body
        ? body.normalPrice == null || body.normalPrice === "" ? null : Number(body.normalPrice)
        : undefined,
      promoPrice: "promoPrice" in body
        ? body.promoPrice == null || body.promoPrice === "" ? null : Number(body.promoPrice)
        : undefined,
      packSize: body.packSize,
      unit: body.unit,
      slabPrices: "slabPrices" in body ? body.slabPrices : undefined,
    });
    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
