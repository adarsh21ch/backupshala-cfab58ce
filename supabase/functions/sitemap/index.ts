// Dynamic sitemap.xml for Backupshala — lists static pages + published courses + approved creators
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SITE = "https://backupshala.com";

const STATIC_ROUTES = [
  "", "/explore", "/advanced", "/courses", "/about", "/contact",
  "/login", "/signup", "/refer-earn",
  "/privacy-policy", "/terms", "/refund-policy", "/cancellation-policy",
  "/shipping-policy", "/community-guidelines", "/content-policy", "/creator-agreement",
];

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const [{ data: courses }, { data: creators }] = await Promise.all([
    supabase.from("courses")
      .select("slug, updated_at")
      .eq("status", "published")
      .is("deleted_at", null)
      .limit(5000),
    supabase.from("profiles")
      .select("creator_slug, updated_at")
      .eq("is_creator", true)
      .eq("creator_approved", true)
      .not("creator_slug", "is", null)
      .limit(5000),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const urls: string[] = [];

  for (const r of STATIC_ROUTES) {
    urls.push(`<url><loc>${SITE}${r}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq></url>`);
  }
  for (const c of courses || []) {
    if (!c.slug) continue;
    const lm = (c.updated_at || today).slice(0, 10);
    urls.push(`<url><loc>${SITE}/courses/${c.slug}</loc><lastmod>${lm}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`);
  }
  for (const cr of creators || []) {
    if (!cr.creator_slug) continue;
    const lm = (cr.updated_at || today).slice(0, 10);
    urls.push(`<url><loc>${SITE}/creator/${cr.creator_slug}</loc><lastmod>${lm}</lastmod><changefreq>weekly</changefreq></url>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
