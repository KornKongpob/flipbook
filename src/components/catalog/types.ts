import type { Database, FlyerType, JobSettings } from "@/lib/database.types";

export type EventRow = Database["public"]["Tables"]["catalog_job_events"]["Row"];
export type { FlyerType, JobSettings };
