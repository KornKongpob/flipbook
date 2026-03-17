import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ALLOWED_HOSTS = [
  "strapi-cdn.mango-prod.siammakro.cloud",
  "images.makro.pro",
  "www.makro.pro",
  "makro.pro",
  "cdnc.heyzine.com",
];

export async function GET(request: Request) {
  const rawUrl = new URL(request.url).searchParams.get("url");

  if (!rawUrl) {
    return new NextResponse("Missing url param", { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }

  const isAllowed = ALLOWED_HOSTS.some(
    (host) => parsedUrl.hostname === host || parsedUrl.hostname.endsWith(`.${host}`),
  );

  if (!isAllowed) {
    return new NextResponse("Host not allowed", { status: 403 });
  }

  const upstream = await fetch(rawUrl, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      referer: "https://www.makro.pro/",
      accept: "image/webp,image/avif,image/apng,image/*,*/*;q=0.8",
    },
    next: { revalidate: 86400 },
  }).catch(() => null);

  if (!upstream?.ok) {
    return new NextResponse("Upstream fetch failed", { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
  const buffer = await upstream.arrayBuffer();

  return new NextResponse(buffer, {
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
