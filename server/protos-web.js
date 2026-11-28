/* protos.uz — Protos AI sayti uchun proksi.
   Sahifalar GitHub Pages'dan olinadi (repo: Bu-qanday-ishlaydi/protos/), protos.uz manzilida ko'rsatiladi.
   Cloudflare: Workers → protos-web → Settings → Domains & Routes → Custom domain: protos.uz va www.protos.uz */

const ORIGIN = 'https://mamarajabovd31-creator.github.io/Bu-qanday-ishlaydi';
const SITE = 'https://protos.uz';
const PAGES = ['/', '/studio/', '/oferta/', '/maxfiylik/'];

const ROBOTS = `User-agent: *\nAllow: /\nDisallow: /studio/\n\nSitemap: ${SITE}/sitemap.xml\n`;
const SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.filter(p => p !== '/studio/').map(p => `  <url><loc>${SITE}${p}</loc><changefreq>weekly</changefreq><priority>${p === '/' ? '1.0' : '0.3'}</priority></url>`).join('\n')}
</urlset>
`;

export default {
  async fetch(req) {
    const url = new URL(req.url);

    // www.protos.uz va http → https://protos.uz
    if (url.hostname.startsWith('www.') || url.protocol === 'http:') {
      return Response.redirect(SITE + url.pathname + url.search, 301);
    }
    if (url.pathname === '/robots.txt') return new Response(ROBOTS, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    if (url.pathname === '/sitemap.xml') return new Response(SITEMAP, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });

    // /img/* — repo ildizidagi rasmlar, qolgan hammasi /protos/ ichidan
    let path = url.pathname;
    if (!path.startsWith('/img/')) {
      if (path === '/protos' || path.startsWith('/protos/')) {           // eski havolalar
        return Response.redirect(SITE + path.replace(/^\/protos/, '') + url.search, 301);
      }
      if (!path.endsWith('/') && !/\.[a-z0-9]+$/i.test(path)) {       // /studio → /studio/
        return Response.redirect(SITE + path + '/' + url.search, 301);
      }
      path = '/protos' + path;
    }

    const r = await fetch(ORIGIN + path, { cf: { cacheTtl: 300, cacheEverything: true } });
    const type = r.headers.get('Content-Type') || '';
    const headers = new Headers(r.headers);
    headers.set('Cache-Control', type.includes('text/html') ? 'public, max-age=300' : 'public, max-age=86400');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.delete('x-github-request-id'); headers.delete('via'); headers.delete('x-proxy-cache');

    if (r.status === 404) {
      const nf = await fetch(ORIGIN + '/protos/');
      return new Response(await nf.text(), { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    if (!type.includes('text/html')) return new Response(r.body, { status: r.status, headers });

    // GitHub manzillarini protos.uz ga almashtirish (canonical, og:url, JSON-LD)
    let html = await r.text();
    html = html.split(ORIGIN + '/protos/').join(SITE + '/').split(ORIGIN + '/img/').join(SITE + '/img/');
    return new Response(html, { status: r.status, headers });
  }
};
