export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole = "admin" | "manager" | "operator";
export type AssetSource = "makro" | "manual_upload" | "manual_mapping" | "cached";
export type CatalogJobStatus =
  | "draft"
  | "uploaded"
  | "parsing"
  | "matching"
  | "needs_review"
  | "ready_to_generate"
  | "generating_pdf"
  | "pdf_ready"
  | "converting_flipbook"
  | "completed"
  | "failed"
  | "cancelled";
export type CatalogItemStatus =
  | "pending"
  | "matched"
  | "needs_review"
  | "approved"
  | "rejected"
  | "rendered";
export type FlipbookMode = "manual" | "client_id" | "disabled";
export type FlyerType = "promo" | "normal";

export interface CatalogCardElementLayoutSettings {
  x?: number | null;
  y?: number | null;
  width?: number | null;
  height?: number | null;
  visible?: boolean | null;
}

export interface MasterCardLayoutSettings {
  image?: CatalogCardElementLayoutSettings;
  discountBadge?: CatalogCardElementLayoutSettings;
  title?: CatalogCardElementLayoutSettings;
  meta?: CatalogCardElementLayoutSettings;
  promoPrice?: CatalogCardElementLayoutSettings;
  normalPrice?: CatalogCardElementLayoutSettings;
  discountPercent?: CatalogCardElementLayoutSettings;
  singlePrice?: CatalogCardElementLayoutSettings;
  strikeLine?: CatalogCardElementLayoutSettings;
}

export interface JobSettings {
  flyerType?: FlyerType;
  baseFontSize?: number | null;
  showBarcode?: boolean;
  showDates?: boolean;
  showPriceDecimals?: boolean;
  masterCardLayout?: MasterCardLayoutSettings | null;
  promoStartDate?: string | null;
  promoEndDate?: string | null;
}

export type GeneratedFileType =
  | "raw_upload"
  | "generated_pdf"
  | "manual_asset"
  | "preview_snapshot"
  | "flipbook_pdf";

type TableDefinition<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: TableDefinition<
        {
          id: string;
          full_name: string | null;
          role: AppRole;
          created_at: string;
          updated_at: string;
        },
        {
          id: string;
          full_name?: string | null;
          role?: AppRole;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          full_name?: string | null;
          role?: AppRole;
          created_at?: string;
          updated_at?: string;
        }
      >;
      catalog_templates: TableDefinition<
        {
          id: string;
          name: string;
          page_size: string;
          columns: number;
          rows: number;
          variant: string;
          show_normal_price: boolean;
          show_promo_price: boolean;
          show_discount_amount: boolean;
          show_discount_percent: boolean;
          show_sku: boolean;
          show_pack_size: boolean;
          theme_json: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          name: string;
          page_size?: string;
          columns?: number;
          rows?: number;
          variant?: string;
          show_normal_price?: boolean;
          show_promo_price?: boolean;
          show_discount_amount?: boolean;
          show_discount_percent?: boolean;
          show_sku?: boolean;
          show_pack_size?: boolean;
          theme_json?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          name?: string;
          page_size?: string;
          columns?: number;
          rows?: number;
          variant?: string;
          show_normal_price?: boolean;
          show_promo_price?: boolean;
          show_discount_amount?: boolean;
          show_discount_percent?: boolean;
          show_sku?: boolean;
          show_pack_size?: boolean;
          theme_json?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;
      catalog_jobs: TableDefinition<
        {
          id: string;
          created_by: string;
          template_id: string | null;
          job_name: string;
          source_file_bucket: string | null;
          source_file_path: string | null;
          source_file_name: string | null;
          status: CatalogJobStatus;
          parsed_row_count: number;
          matched_row_count: number;
          review_required_count: number;
          page_count: number;
          flipbook_mode: FlipbookMode;
          column_mapping_json: Json;
          style_options_json: Json;
          error_message: string | null;
          started_at: string | null;
          finished_at: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          created_by: string;
          template_id?: string | null;
          job_name: string;
          source_file_bucket?: string | null;
          source_file_path?: string | null;
          source_file_name?: string | null;
          status?: CatalogJobStatus;
          parsed_row_count?: number;
          matched_row_count?: number;
          review_required_count?: number;
          page_count?: number;
          flipbook_mode?: FlipbookMode;
          column_mapping_json?: Json;
          style_options_json?: Json;
          error_message?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          created_by?: string;
          template_id?: string | null;
          job_name?: string;
          source_file_bucket?: string | null;
          source_file_path?: string | null;
          source_file_name?: string | null;
          status?: CatalogJobStatus;
          parsed_row_count?: number;
          matched_row_count?: number;
          review_required_count?: number;
          page_count?: number;
          flipbook_mode?: FlipbookMode;
          column_mapping_json?: Json;
          style_options_json?: Json;
          error_message?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      catalog_items: TableDefinition<
        {
          id: string;
          job_id: string;
          row_no: number;
          sku: string | null;
          product_name: string;
          pack_size: string | null;
          unit: string | null;
          normal_price: number | null;
          promo_price: number | null;
          discount_amount: number | null;
          discount_percent: number | null;
          normalized_sku: string | null;
          normalized_name: string | null;
          display_name_override: string | null;
          display_order: number;
          render_variant: string | null;
          is_visible: boolean;
          match_status: CatalogItemStatus;
          selected_asset_id: string | null;
          confidence: number | null;
          review_note: string | null;
          metadata_json: Json;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          job_id: string;
          row_no: number;
          sku?: string | null;
          product_name: string;
          pack_size?: string | null;
          unit?: string | null;
          normal_price?: number | null;
          promo_price?: number | null;
          discount_amount?: number | null;
          discount_percent?: number | null;
          normalized_sku?: string | null;
          normalized_name?: string | null;
          display_name_override?: string | null;
          display_order?: number;
          render_variant?: string | null;
          is_visible?: boolean;
          match_status?: CatalogItemStatus;
          selected_asset_id?: string | null;
          confidence?: number | null;
          review_note?: string | null;
          metadata_json?: Json;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          job_id?: string;
          row_no?: number;
          sku?: string | null;
          product_name?: string;
          pack_size?: string | null;
          unit?: string | null;
          normal_price?: number | null;
          promo_price?: number | null;
          discount_amount?: number | null;
          discount_percent?: number | null;
          normalized_sku?: string | null;
          normalized_name?: string | null;
          display_name_override?: string | null;
          display_order?: number;
          render_variant?: string | null;
          is_visible?: boolean;
          match_status?: CatalogItemStatus;
          selected_asset_id?: string | null;
          confidence?: number | null;
          review_note?: string | null;
          metadata_json?: Json;
          created_at?: string;
          updated_at?: string;
        }
      >;
      product_assets: TableDefinition<
        {
          id: string;
          source: AssetSource;
          source_product_id: string | null;
          sku: string | null;
          normalized_sku: string | null;
          product_name: string;
          normalized_name: string | null;
          product_url: string | null;
          image_url: string | null;
          storage_bucket: string | null;
          storage_path: string | null;
          fetched_at: string | null;
          metadata_json: Json;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          source: AssetSource;
          source_product_id?: string | null;
          sku?: string | null;
          normalized_sku?: string | null;
          product_name: string;
          normalized_name?: string | null;
          product_url?: string | null;
          image_url?: string | null;
          storage_bucket?: string | null;
          storage_path?: string | null;
          fetched_at?: string | null;
          metadata_json?: Json;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          source?: AssetSource;
          source_product_id?: string | null;
          sku?: string | null;
          normalized_sku?: string | null;
          product_name?: string;
          normalized_name?: string | null;
          product_url?: string | null;
          image_url?: string | null;
          storage_bucket?: string | null;
          storage_path?: string | null;
          fetched_at?: string | null;
          metadata_json?: Json;
          created_at?: string;
          updated_at?: string;
        }
      >;
      product_match_candidates: TableDefinition<
        {
          id: string;
          item_id: string;
          asset_id: string;
          rank_no: number;
          confidence: number;
          match_reason: string | null;
          created_at: string;
        },
        {
          id?: string;
          item_id: string;
          asset_id: string;
          rank_no: number;
          confidence: number;
          match_reason?: string | null;
          created_at?: string;
        },
        {
          id?: string;
          item_id?: string;
          asset_id?: string;
          rank_no?: number;
          confidence?: number;
          match_reason?: string | null;
          created_at?: string;
        }
      >;
      manual_mappings: TableDefinition<
        {
          id: string;
          sku: string;
          normalized_sku: string;
          preferred_asset_id: string;
          locked_image: boolean;
          locked_name: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          sku: string;
          normalized_sku: string;
          preferred_asset_id: string;
          locked_image?: boolean;
          locked_name?: boolean;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          sku?: string;
          normalized_sku?: string;
          preferred_asset_id?: string;
          locked_image?: boolean;
          locked_name?: boolean;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        }
      >;
      generated_files: TableDefinition<
        {
          id: string;
          job_id: string;
          file_type: GeneratedFileType;
          storage_bucket: string;
          storage_path: string;
          public_url: string | null;
          file_size_bytes: number | null;
          checksum: string | null;
          created_at: string;
        },
        {
          id?: string;
          job_id: string;
          file_type: GeneratedFileType;
          storage_bucket: string;
          storage_path: string;
          public_url?: string | null;
          file_size_bytes?: number | null;
          checksum?: string | null;
          created_at?: string;
        },
        {
          id?: string;
          job_id?: string;
          file_type?: GeneratedFileType;
          storage_bucket?: string;
          storage_path?: string;
          public_url?: string | null;
          file_size_bytes?: number | null;
          checksum?: string | null;
          created_at?: string;
        }
      >;
      flipbooks: TableDefinition<
        {
          id: string;
          job_id: string;
          provider: string;
          mode: FlipbookMode;
          pdf_file_id: string | null;
          flipbook_url: string | null;
          thumbnail_url: string | null;
          provider_state: string | null;
          provider_response_json: Json;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          job_id: string;
          provider?: string;
          mode?: FlipbookMode;
          pdf_file_id?: string | null;
          flipbook_url?: string | null;
          thumbnail_url?: string | null;
          provider_state?: string | null;
          provider_response_json?: Json;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          job_id?: string;
          provider?: string;
          mode?: FlipbookMode;
          pdf_file_id?: string | null;
          flipbook_url?: string | null;
          thumbnail_url?: string | null;
          provider_state?: string | null;
          provider_response_json?: Json;
          created_at?: string;
          updated_at?: string;
        }
      >;
      catalog_job_events: TableDefinition<
        {
          id: number;
          job_id: string;
          level: string;
          step: string;
          message: string;
          metadata_json: Json;
          created_at: string;
        },
        {
          id?: number;
          job_id: string;
          level?: string;
          step: string;
          message: string;
          metadata_json?: Json;
          created_at?: string;
        },
        {
          id?: number;
          job_id?: string;
          level?: string;
          step?: string;
          message?: string;
          metadata_json?: Json;
          created_at?: string;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      app_role: AppRole;
      asset_source: AssetSource;
      catalog_job_status: CatalogJobStatus;
      catalog_item_status: CatalogItemStatus;
      flipbook_mode: FlipbookMode;
      generated_file_type: GeneratedFileType;
    };
    CompositeTypes: Record<string, never>;
  };
}
