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

  const baseUrl = (env.HEYZINE_API_BASE_URL ?? "https://heyzine.com/api1").replace(/\/+$/, "");
  const endpoint = `${baseUrl}/rest`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      pdf: pdfUrl,
      client_id: env.HEYZINE_CLIENT_ID,
      prev_next: true,
      show_info: false,
    }),
  });

  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.text();
      detail = body ? ` — ${body.slice(0, 200)}` : "";
    } catch {
      // ignore
    }
    throw new Error(`Heyzine conversion failed with status ${response.status}${detail}`);
  }

  return (await response.json()) as HeyzineFlipbookResponse;
}
