import { getEnv } from "@/lib/env";

export interface HeyzineFlipbookResponse {
  id: string;
  url: string;
  thumbnail?: string;
  pdf?: string;
  state?: string;
  meta?: {
    num_pages?: number;
    aspect_ratio?: number;
  };
}

export async function createHeyzineFlipbook(pdfUrl: string) {
  const env = getEnv().data;

  if (!env?.HEYZINE_CLIENT_ID) {
    return null;
  }

  const response = await fetch(`${env.HEYZINE_API_BASE_URL}/rest`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      pdf: pdfUrl,
      client_id: env.HEYZINE_CLIENT_ID,
      prev_next: true,
      show_info: false,
      download: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Heyzine conversion failed with status ${response.status}.`);
  }

  return (await response.json()) as HeyzineFlipbookResponse;
}
