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

  const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="#f1f5f9"/><text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" font-size="10" fill="#94a3b8">No image</text></svg>`;

  const upstream = await fetch(rawUrl, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      referer: "https://www.makro.pro/",
      accept: "image/webp,image/avif,image/apng,image/jpeg,image/png,image/*,*/*;q=0.8",
      "accept-encoding": "gzip, deflate, br",
    },
  }).catch(() => null);

  if (!upstream) {
    return new NextResponse(PLACEHOLDER_SVG, {
      headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=60" },
    });
  }

  if (!upstream.ok) {
    return new NextResponse(PLACEHOLDER_SVG, {
      headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=60" },
      status: 200,
    });
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
