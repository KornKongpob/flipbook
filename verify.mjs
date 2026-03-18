import https from "https";

const BASE = "https://flipbook-henna-nu.vercel.app";

function req(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const r = https.request({ hostname: u.hostname, path: u.pathname + u.search, port: 443, method: opts.method || "GET", headers: opts.headers || {} },
      (res) => { const c = []; res.on("data", d => c.push(d)); res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(c).toString("utf8") })); });
    r.on("error", reject);
    if (opts.body) r.write(opts.body);
    r.end();
  });
}

function storeCookies(headers, jar) {
  const sc = headers["set-cookie"];
  if (!sc) return;
  (Array.isArray(sc) ? sc : [sc]).forEach(c => { const [kv] = c.split(";"); const eq = kv.indexOf("="); if (eq > 0) jar[kv.slice(0,eq).trim()] = kv.slice(eq+1).trim(); });
}

function cookieStr(jar) { return Object.entries(jar).map(([k,v])=>`${k}=${v}`).join("; "); }

async function follow(url, cookies, max = 5) {
  let r = await req(url, { headers: { Cookie: cookieStr(cookies) } });
  storeCookies(r.headers, cookies);
  let n = 0;
  while (r.status >= 300 && r.status < 400 && r.headers.location && n++ < max) {
    const next = r.headers.location.startsWith("http") ? r.headers.location : BASE + r.headers.location;
    r = await req(next, { headers: { Cookie: cookieStr(cookies) } });
    storeCookies(r.headers, cookies);
  }
  return r;
}

async function run() {
  const cookies = {};
  console.log("=== VERIFICATION ===\n");

  // 1. Login + anon sign-in
  let r = await req(BASE + "/login");
  storeCookies(r.headers, cookies);
  const actions = [...r.body.matchAll(/\$ACTION_ID_([a-f0-9]+)/g)].map(m => m[1]);
  r = await req(BASE + "/login", { method: "POST", headers: { "Next-Action": actions[1] ?? actions[0], "Content-Type": "text/plain;charset=UTF-8", Cookie: cookieStr(cookies) }, body: "{}" });
  storeCookies(r.headers, cookies);
  console.log(`[AUTH] Sign-in: ${r.status}`);

  // 2. Dashboard
  r = await follow(BASE + "/dashboard", cookies);
  console.log(`[DASHBOARD] ${r.status}`);
  const hasUploadForm = r.body.includes("Upload") || r.body.includes("upload");
  console.log(`  Has upload references: ${hasUploadForm}`);

  // 3. Check deployed version has our fixes
  r = await follow(BASE + "/dashboard", cookies);
  
  // Check catalog-card-preview is now a client component (will have useState in bundle)
  const hasOnError = r.body.includes("onError") || r.body.includes("imgFailed");
  console.log(`  Card onError fix deployed: ${hasOnError}`);
  
  // Check new Makro URL (should not see /en/search anymore)
  const hasOldMakroUrl = r.body.includes("/en/search");
  const hasNewMakroUrl = r.body.includes("/th/c/all");
  console.log(`  Old Makro URL /en/search in body: ${hasOldMakroUrl}`);

  // 4. Library
  r = await follow(BASE + "/library", cookies);
  console.log(`\n[LIBRARY] ${r.status}`);
  
  // 5. New catalog page
  r = await follow(BASE + "/catalogs/new", cookies);
  console.log(`[NEW CATALOG] ${r.status}`);
  const hasTemplateSelect = r.body.includes("template") || r.body.includes("Template");
  console.log(`  Has template selection: ${hasTemplateSelect}`);
  
  // 6. Import API
  r = await req(BASE + "/api/templates/catalog-import", { headers: { Cookie: cookieStr(cookies) } });
  console.log(`\n[IMPORT TEMPLATE API] ${r.status} ${r.headers["content-type"]}`);
  
  // 7. Settings page
  r = await follow(BASE + "/settings", cookies);
  console.log(`[SETTINGS] ${r.status}`);
  
  // 8. Check sidebar in all pages
  r = await follow(BASE + "/dashboard", cookies);
  const hasSidebarStyles = r.body.includes('"color: #e2e8f0"') || r.body.includes("#94a3b8");
  const navLabels = ["Dashboard", "New Catalog", "Library", "Settings"].map(l => ({ label: l, found: r.body.includes(`>${l}<`) }));
  console.log(`\n[SIDEBAR] Has inline styles: ${hasSidebarStyles}`);
  navLabels.forEach(({label, found}) => console.log(`  ${label}: ${found ? "✅" : "❌"}`));
  
  // 9. Image proxy
  const testImg = "https://strapi-cdn.mango-prod.siammakro.cloud/uploads/thumbnail_test.jpg";
  const proxyUrl = `/api/images/proxy?url=${encodeURIComponent(testImg)}`;
  r = await req(BASE + proxyUrl, { headers: { Cookie: cookieStr(cookies) } });
  console.log(`\n[IMAGE PROXY] status=${r.status} ct=${r.headers["content-type"]} len=${r.body.length}`);
  console.log(`  Returns SVG placeholder (expected since CDN blocks Vercel): ${r.headers["content-type"]?.includes("svg")}`);

  console.log("\n✅ Verification complete");
}

run().catch(e => console.error("ERROR:", e.message));
