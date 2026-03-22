"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";

export const OPEN_CATALOG_EXPORT_EVENT = "catalog-editor:open-export";

export function CatalogEditorExportButton() {
  const handleClick = useCallback(() => {
    window.dispatchEvent(new CustomEvent(OPEN_CATALOG_EXPORT_EVENT));
  }, []);

  return (
    <Button type="button" className="h-9 text-xs" onClick={handleClick}>
      Open export →
    </Button>
  );
}
