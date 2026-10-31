/* Blog: posts live in Supabase (public.blog_posts, supabase/v13_blog.sql) and are rendered on request by /api/seo,
   so a post is live as soon as an admin publishes it, without a new build. Bodies are Markdown (a safe subset). */
const S = require('./site.js');
const SP = require('./seo-pages.js');
const { anonClient } = require('./server.js');
const { esc } = S;
const { H, pageObj } = SP;

const CATS = ['basics', 'planets', 'festivals', 'transits', 'remedies', 'matching', 'muhurta', 'numerology', 'news'];
const PER_PAGE = 12;
const COLS = 'id,lang,slug,title,excerpt,body,category,tags,cover_url,group_key,published_at,updated_at';

// ---------- Markdown (safe subset: headings, paragraphs, bold, italic, links, images, lists, quotes, rules) ----------
const safeUrl = u => /^(https:\/\/|\/(?!\/))[^\s"'<>]*$/.test(u) ? u : null;
function inline(s) {
  let out = esc(s);
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt, u) => { const url = safeUrl(u.replace(/&amp;/g, '&')); return url ? `<img src="${esc(url)}" alt="${alt}" loading="lazy">` : m; });
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, txt, u) => { const url = safeUrl(u.replace(/&amp;/g, '&')); return url ? `<a href="${esc(url)}"${/^https:/.test(url) ? ' rel="noopener" target="_blank"' : ''}>${txt}</a>` : m; });
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  return out;
}
function markdown(md) {
  const lines = String(md || '').replace(/\r/g, '').split('\n'), html = [], toc = [];
  let para = [], list = null, quote = [];
  const flushP = () => { if (para.length) html.push(`<p>${inline(para.join(' '))}</p>`); para = []; };
  const flushL = () => { if (list) html.push(`<${list.t}>${list.items.map(i => `<li>${inline(i)}</li>`).join('')}</${list.t}>`); list = null; };
  const flushQ = () => { if (quote.length) html.push(`<blockquote>${inline(quote.join(' '))}</blockquote>`); quote = []; };
  const flush = () => { flushP(); flushL(); flushQ(); };
  for (const raw of lines) {
    const l = raw.trimEnd();
    let m;
    if (!l.trim()) { flush(); continue; }
    if ((m = l.match(/^(#{2,4})\s+(.+)$/))) {
      flush(); const lv = m[1].length, txt = m[2].trim(), id = 'h-' + (toc.length + 1);
      if (lv === 2) toc.push({ id, txt });
      html.push(`<h${lv} id="${id}">${inline(txt)}</h${lv}>`); continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(l.trim())) { flush(); html.push('<hr>'); continue; }
    if ((m = l.match(/^>\s?(.*)$/))) { flushP(); flushL(); quote.push(m[1]); continue; }
    if ((m = l.match(/^\s*[-*]\s+(.+)$/))) { flushP(); flushQ(); if (!list || list.t !== 'ul') { flushL(); list = { t: 'ul', items: [] }; } list.items.push(m[1]); continue; }
    if ((m = l.match(/^\s*\d+[.)]\s+(.+)$/))) { flushP(); flushQ(); if (!list || list.t !== 'ol') { flushL(); list = { t: 'ol', items: [] }; } list.items.push(m[1]); continue; }
    flushL(); flushQ(); para.push(l.trim());
  }
  flush();
  return { html: html.join('\n'), toc };
}
const plain = md => String(md || '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[#>*_`-]/g, ' ').replace(/\s+/g, ' ').trim();
const readMins = md => Math.max(1, Math.round(plain(md).split(' ').length / 200));

// ---------- Data ----------
async function db() { const c = anonClient(); if (!c) throw new Error('Supabase not configured'); return c; }
async function listPosts(lang, { cat, page = 1, limit = PER_PAGE } = {}) {
  const c = await db();
  let q = c.from('blog_posts').select(COLS, { count: 'exact' }).eq('status', 'published').eq('lang', lang).order('published_at', { ascending: false }).range((page - 1) * limit, page * limit - 1);
  if (cat) q = q.eq('category', cat);
  const { data, error, count } = await q; if (error) throw error;
  return { posts: data || [], total: count || 0 };
}
async function getPost(lang, slug) {
  const c = await db();
  const { data, error } = await c.from('blog_posts').select(COLS).eq('status', 'published').eq('lang', lang).eq('slug', slug).maybeSingle();
  if (error) throw error; return data;
}
async function siblings(post) {
  const c = await db(), out = { translations: [], related: [] };
  if (post.group_key) { const { data } = await c.from('blog_posts').select('lang,slug,title').eq('status', 'published').eq('group_key', post.group_key).neq('lang', post.lang); out.translations = data || []; }
  const { data } = await c.from('blog_posts').select('slug,title,excerpt,category,cover_url,published_at,body').eq('status', 'published').eq('lang', post.lang).eq('category', post.category).neq('slug', post.slug).order('published_at', { ascending: false }).limit(3);
  out.related = data || []; return out;
}
async function allPublished() {
  const c = await db();
  const { data, error } = await c.from('blog_posts').select('lang,slug,updated_at,category').eq('status', 'published').limit(5000);
  if (error) throw error; return data || [];
}

// ---------- Pages ----------
// The layout fills {{key}} placeholders after the body is in, so text from the database must not contain "{{"
const noBraces = pg => { for (const k of ['body', 'title', 'desc', 'h1']) if (typeof pg[k] === 'string') pg[k] = pg[k].replace(/\{\{/g, '{&#8203;{'); return pg; };
const crumbsBase = h => ({ name: h.t('seo.blog.crumb'), slug: 'blog/' });
function card(h, p) {
  const date = p.published_at ? h.fDate.format(new Date(p.published_at)) : '';
  return `<a class="card blog-card" href="${h.base}blog/${p.slug}/">${p.cover_url ? `<img src="${esc(p.cover_url)}" alt="" loading="lazy">` : `<span class="blog-ph cat-${esc(p.category)}" aria-hidden="true"></span>`}
    <div><span class="tag gold">${esc(h.t('seo.blog.cat.' + p.category))}</span><h3>${esc(p.title)}</h3><p>${esc(p.excerpt || plain(p.body).slice(0, 150) + '…')}</p><small class="muted">${esc(date)} · ${esc(h.t('seo.blog.mins', { n: readMins(p.body) }))}</small></div></a>`;
}
function catChips(h, cur) {
  return `<nav class="chips blog-cats" aria-label="${esc(h.t('seo.blog.catsH'))}"><a class="chip" href="${h.base}blog/"${!cur ? ' aria-current="page"' : ''}>${esc(h.t('seo.blog.all'))}</a>${CATS.map(c => `<a class="chip" href="${h.base}blog/category/${c}/"${cur === c ? ' aria-current="page"' : ''}>${esc(h.t('seo.blog.cat.' + c))}</a>`).join('')}</nav>`;
}
async function indexPage(lang, { cat, page = 1 } = {}) {
  const h = H(lang), { t } = h;
  const { posts, total } = await listPosts(lang, { cat, page });
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const base = cat ? `blog/category/${cat}/` : 'blog/';
  const pager = pages > 1 ? `<nav class="blog-pager">${page > 1 ? `<a class="btn-line" href="${h.base}${base}${page > 2 ? '?p=' + (page - 1) : ''}">← ${esc(t('seo.blog.newer'))}</a>` : '<span></span>'}<span class="muted">${page} / ${pages}</span>${page < pages ? `<a class="btn-line" href="${h.base}${base}?p=${page + 1}">${esc(t('seo.blog.older'))} →</a>` : '<span></span>'}</nav>` : '';
  const h1 = cat ? t('seo.blog.catH1', { c: t('seo.blog.cat.' + cat) }) : t('seo.blog.h1');
  const body = `<main class="wrap page seo-page blog-page">${h.crumbsHtml(cat ? [crumbsBase(h), { name: t('seo.blog.cat.' + cat) }] : [{ name: t('seo.blog.crumb') }])}
  <div class="page-hero"><p class="eyebrow">${esc(t('seo.blog.eye'))}</p><h1>${esc(h1)}</h1><p class="lede">${esc(t('seo.blog.lede'))}</p></div>
  ${catChips(h, cat)}
  ${posts.length ? `<div class="blog-grid">${posts.map(p => card(h, p)).join('')}</div>` : `<div class="card blog-empty"><p>${esc(t('seo.blog.empty'))}</p><a class="btn-line" href="${h.base}blog/">${esc(t('seo.blog.all'))}</a></div>`}
  ${pager}
  ${h.cta(t('seo.blog.cta'), '', t('seo.blog.ctaBtn'))}</main>`;
  const slug = base + (page > 1 ? `?p=${page}` : '');
  return noBraces({ ...pageObj(h, { id: 'blog', slug: base, title: cat ? t('seo.blog.catTitle', { c: t('seo.blog.cat.' + cat) }) : t('seo.blog.title'), desc: t('seo.blog.desc'), h1, body, priority: '0.7', freq: 'daily', crumbs: cat ? [{ name: L2 => L2.seo.blog.crumb, slug: 'blog/' }, { name: L2 => S.tr(L2, 'seo.blog.cat.' + cat), slug: base }] : [{ name: L2 => L2.seo.blog.crumb, slug: 'blog/' }] }), noindex: page > 1 || !posts.length, canonicalSlug: slug });
}
async function postPage(lang, slug) {
  const h = H(lang), { t } = h, p = await getPost(lang, slug);
  if (!p) return null;
  const { translations, related } = await siblings(p);
  const md = markdown(p.body), date = h.fDate.format(new Date(p.published_at || p.updated_at));
  const tr = translations.length ? `<p class="blog-tr">${esc(t('seo.blog.alsoIn'))} ${translations.map(x => `<a href="${S.ALL[x.lang].meta.path}blog/${x.slug}/" hreflang="${S.ALL[x.lang].meta.htmlLang}">${esc(S.ALL[x.lang].meta.langName || x.lang)}</a>`).join(' · ')}</p>` : '';
  const toc = md.toc.length >= 3 ? `<nav class="card blog-toc"><b>${esc(t('seo.blog.toc'))}</b><ol>${md.toc.map(x => `<li><a href="#${x.id}">${inline(x.txt)}</a></li>`).join('')}</ol></nav>` : '';
  const body = `<main class="wrap page article seo-page blog-post">${h.crumbsHtml([crumbsBase(h), { name: t('seo.blog.cat.' + p.category), slug: `blog/category/${p.category}/` }, { name: p.title }])}
  <article><header class="article-head blog-head"><div><p class="eyebrow"><a href="${h.base}blog/category/${p.category}/">${esc(t('seo.blog.cat.' + p.category))}</a></p><h1>${esc(p.title)}</h1>${p.excerpt ? `<p class="lede">${esc(p.excerpt)}</p>` : ''}<p class="muted small">${esc(date)} · ${esc(t('seo.blog.mins', { n: readMins(p.body) }))}</p>${tr}</div></header>
  ${p.cover_url ? `<img class="blog-cover" src="${esc(p.cover_url)}" alt="">` : ''}
  ${toc}
  <div class="card prose blog-body">${md.html}</div>
  ${p.tags && p.tags.length ? `<p class="blog-tags">${p.tags.map(x => `<span class="tag">#${esc(x)}</span>`).join(' ')}</p>` : ''}</article>
  ${h.cta(t('seo.blog.cta'), '', t('seo.blog.ctaBtn'))}
  ${related.length ? `<h2 class="sub-h">${esc(t('seo.blog.relatedH'))}</h2><div class="blog-grid">${related.map(x => card(h, x)).join('')}</div>` : ''}
  <p><a class="btn-line" href="${h.base}blog/">← ${esc(t('seo.blog.back'))}</a></p></main>`;
  const pg = pageObj(h, { id: 'blogpost', slug: `blog/${p.slug}/`, article: true, title: `${p.title} | ${t('seo.blog.crumb')} | Grahavani`, desc: (p.excerpt || plain(p.body)).slice(0, 158), h1: p.title, body, priority: '0.6', crumbs: [{ name: L2 => L2.seo.blog.crumb, slug: 'blog/' }, { name: p.title, slug: `blog/${p.slug}/` }] });
  // Only link hreflang alternates that really exist
  pg.altLangs = [lang, ...translations.map(x => x.lang)];
  pg.altSlugs = Object.fromEntries([[lang, `blog/${p.slug}/`], ...translations.map(x => [x.lang, `blog/${x.slug}/`])]);
  pg.ogImage = p.cover_url || null; pg.langFallback = 'blog/';
  return noBraces(pg);
}
async function sitemap() {
  const rows = await allPublished(), langs = S.LANGS;
  const urls = [];
  for (const l of langs) urls.push(`  <url><loc>${S.url(l, 'blog/')}</loc><changefreq>daily</changefreq><priority>0.7</priority></url>`);
  for (const r of rows) urls.push(`  <url><loc>${S.url(r.lang, `blog/${r.slug}/`)}</loc><lastmod>${String(r.updated_at).slice(0, 10)}</lastmod><priority>0.6</priority></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

module.exports = { CATS, markdown, indexPage, postPage, sitemap };
