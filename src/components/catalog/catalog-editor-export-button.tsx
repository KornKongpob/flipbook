"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";

export const OPEN_CATALOG_EXPORT_EVENT = "catalog-editor:open-export";

export function CatalogEditorExportButton() {
  const handleClick = useCallback(() => {
    window.dispatchEvent(new CustomEvent(OPEN_CATALOG_EXPORT_EVENT));
  }, []);

  return (
    <Button
      type="button"
      className="h-auto min-h-9 max-w-full px-3 py-2 text-center text-xs leading-4"
      onClick={handleClick}
    >
      Open Export Hub
    </Button>
  );
}
