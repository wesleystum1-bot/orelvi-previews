#!/usr/bin/env node
/**
 * ORELVI blog builder. No dependencies.
 *
 *   node blog/_src/build.mjs
 *
 * Reads blog/_src/posts/*.md (front matter + a small Markdown subset) and
 * writes blog/index.html, blog/<slug>/index.html, sitemap.xml and robots.txt.
 * A post with `draft: true`, or a `date` in the future, is left out, so a
 * scheduled post can be committed ahead of time and goes up on the next build
 * on or after its date.
 *
 * Markdown subset: ## and ### headings, paragraphs, - and 1. lists,
 * > quotes, **bold**, *italic*, `code`, [text](url).
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const BLOG = join(ROOT, 'blog');
const SITE = 'https://wesleystum1-bot.github.io/orelvi-previews/';
const EMAIL = 'wesleystum1+orelvi@gmail.com';
const TODAY = process.env.BLOG_TODAY ?? new Date().toISOString().slice(0, 10);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function parse(file) {
  const raw = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`${file}: missing front matter`);
  const meta = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i < 0) continue;
    meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"(.*)"$/, '$1');
  }
  for (const k of ['title', 'slug', 'date', 'description']) {
    if (!meta[k]) throw new Error(`${file}: front matter needs ${k}`);
  }
  if (!/^[a-z0-9-]+$/.test(meta.slug)) throw new Error(`${file}: slug must be lowercase-with-dashes`);
  return { ...meta, body: m[2].trim() };
}

function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => `<a href="${u}">${t}</a>`);
}

function markdown(src) {
  const out = [];
  const blocks = src.split(/\n{2,}/);
  const toc = [];
  for (const b of blocks) {
    const lines = b.split('\n');
    const h = b.match(/^(#{2,3}) (.+)$/);
    if (h && lines.length === 1) {
      const id = h[2].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      if (h[1] === '##') toc.push({ id, text: h[2] });
      out.push(`<h${h[1].length} id="${id}">${inline(h[2])}</h${h[1].length}>`);
    } else if (lines.every((l) => /^- /.test(l))) {
      out.push(`<ul>${lines.map((l) => `<li>${inline(l.slice(2))}</li>`).join('')}</ul>`);
    } else if (lines.every((l) => /^\d+\. /.test(l))) {
      out.push(`<ol>${lines.map((l) => `<li>${inline(l.replace(/^\d+\. /, ''))}</li>`).join('')}</ol>`);
    } else if (lines.every((l) => /^> ?/.test(l))) {
      out.push(`<blockquote><p>${inline(lines.map((l) => l.replace(/^> ?/, '')).join(' '))}</p></blockquote>`);
    } else {
      out.push(`<p>${inline(lines.join(' '))}</p>`);
    }
  }
  return { html: out.join('\n'), toc };
}

const words = (s) => s.split(/\s+/).filter(Boolean).length;
const nice = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

const FAVICON = `<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 44 44' fill='none'%3E%3Cg transform='skewY(-24)'%3E%3Crect x='16' y='22' width='22' height='24' rx='3.5' fill='%23222' stroke='%23f4f2ee' stroke-width='3'/%3E%3Crect x='6' y='25' width='15' height='18' rx='3' fill='%23222' stroke='%23f4f2ee' stroke-width='3'/%3E%3C/g%3E%3C/svg%3E">`;
const WORDMARK = (href) => `<a class="word" href="__HREF__"><svg width="30" height="30" viewBox="0 0 44 44" fill="none" aria-hidden="true"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".7" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#f2cf98" stop-opacity=".35"/></linearGradient></defs><g transform="skewY(-24)"><rect x="16" y="22" width="22" height="24" rx="3.5" fill="url(#g)" stroke="currentColor" stroke-width="2.2"/><rect x="6" y="25" width="15" height="18" rx="3" fill="url(#g)" stroke="currentColor" stroke-width="2.2"/></g></svg><span>ORELVI</span></a>`.replace('__HREF__', href);

const CSS = `
@font-face{font-family:"Schibsted Grotesk";src:url(__UP__fonts/schibsted.woff2) format("woff2");font-weight:400 900;font-display:swap}
@font-face{font-family:"IBM Plex Mono";src:url(__UP__fonts/plex-mono.woff2) format("woff2");font-weight:500;font-display:swap}
:root{--paper:#060607;--ink:#f4f2ee;--ink-2:#c3beb5;--ink-3:#97928a;--rule:rgba(255,255,255,.12);--stamp:#f2cf98;--stamp-ink:#0b0b0c;
--glass:rgba(255,255,255,.045);--glass-line:rgba(255,255,255,.14);
--display:"Schibsted Grotesk",ui-sans-serif,system-ui,sans-serif;--mono:"IBM Plex Mono",ui-monospace,Menlo,Consolas,monospace;color-scheme:dark only}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;min-height:100vh;background:var(--paper);color:var(--ink);font:18px/1.7 var(--display);-webkit-font-smoothing:antialiased;overflow-x:hidden}
body::before{content:"";position:fixed;inset:-20%;z-index:-1;pointer-events:none;background:radial-gradient(40% 35% at 20% 10%,rgba(255,255,255,.07),transparent 70%),radial-gradient(35% 30% at 85% 25%,rgba(242,190,120,.11),transparent 70%)}
a{color:inherit;text-underline-offset:3px}
:focus-visible{outline:2px solid var(--ink);outline-offset:3px}
.shell{max-width:1080px;margin:0 auto;padding-inline:clamp(16px,4vw,40px)}
.mono{font:500 12px/1.4 var(--mono);letter-spacing:.1em;text-transform:uppercase}
header.mast .shell{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:68px}
.word{display:flex;align-items:center;gap:11px;text-decoration:none;font:800 19px/1 var(--display);letter-spacing:-.01em}
.mast nav{display:flex;gap:18px;align-items:center}
.mast nav a{color:var(--ink-2);font:600 14px/1 var(--display);text-decoration:none;padding:10px 0}
.mast nav a:hover,.mast nav a[aria-current]{color:var(--ink)}
main{padding-block:clamp(28px,5vw,64px) clamp(56px,8vw,96px)}
.eyebrow{color:var(--stamp);margin:0 0 16px}
h1{margin:0;font-size:clamp(34px,5vw,58px);line-height:1.02;letter-spacing:-.035em;font-weight:850;text-wrap:balance}
.lede{font-size:clamp(18px,1.6vw,21px);line-height:1.55;color:var(--ink-2);margin:20px 0 0;max-width:36em}
.posts{list-style:none;margin:40px 0 0;padding:0;display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr))}
.posts a{display:grid;gap:10px;align-content:start;height:100%;padding:24px;border-radius:16px;background:var(--glass);border:1px solid var(--glass-line);text-decoration:none;transition:border-color .2s,transform .2s}
.posts a:hover{border-color:rgba(242,207,152,.5);transform:translateY(-2px)}
.posts h2{margin:0;font-size:22px;line-height:1.2;letter-spacing:-.02em}
.posts p{margin:0;color:var(--ink-2);font-size:16px;line-height:1.55}
.posts .mono{color:var(--ink-3)}
article{max-width:720px;margin:0 auto}
.meta{display:flex;gap:14px;flex-wrap:wrap;color:var(--ink-3);margin:22px 0 0}
.toc{margin:34px 0 0;padding:18px 22px;border-radius:14px;background:var(--glass);border:1px solid var(--glass-line)}
.toc ol{margin:10px 0 0;padding-left:20px;color:var(--ink-2);font-size:16px}
.toc a{text-decoration:none}.toc a:hover{text-decoration:underline}
.body{margin-top:12px}
.body h2{font-size:clamp(25px,2.6vw,31px);line-height:1.15;letter-spacing:-.025em;margin:48px 0 0;scroll-margin-top:24px}
.body h3{font-size:21px;line-height:1.25;letter-spacing:-.015em;margin:32px 0 0}
.body p,.body ul,.body ol,.body blockquote{margin:16px 0 0;color:var(--ink-2)}
.body strong{color:var(--ink)}
.body li{margin:8px 0}
.body li::marker{color:var(--stamp)}
.body blockquote{border-left:3px solid var(--stamp);padding:4px 0 4px 18px}
.body blockquote p{margin:0;color:var(--ink)}
.body code{font:500 .85em var(--mono);background:rgba(255,255,255,.07);padding:2px 6px;border-radius:5px}
.cta{margin:56px 0 0;padding:clamp(22px,3vw,32px);border-radius:18px;background:var(--glass);border:1px solid var(--glass-line)}
.cta h2{margin:0;font-size:clamp(24px,2.6vw,30px);letter-spacing:-.025em;line-height:1.1}
.cta p{color:var(--ink-2);margin:12px 0 0}
.btns{display:flex;gap:12px;flex-wrap:wrap;margin-top:20px}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:50px;padding:0 22px;border-radius:999px;font:750 16px/1 var(--display);text-decoration:none;background:var(--ink);color:var(--stamp-ink)}
.btn.ghost{background:transparent;color:var(--ink);border:1px solid var(--glass-line)}
.more{margin:56px 0 0}
.more h2{font-size:20px;margin:0 0 4px}
footer{border-top:1px solid var(--rule);padding-block:26px;color:var(--ink-3);font-size:14px}
footer .shell{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
@media (max-width:560px){.mast nav a.hide-sm{display:none}}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
`;

function page({ up, title, description, canonical, ogType, jsonLd, current, main }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE}work/architectural-contractor/shot-desktop.jpg">
<meta name="twitter:card" content="summary_large_image">
${FAVICON}
<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>
<style>${CSS.replace(/__UP__/g, up)}</style>
</head>
<body>
<header class="mast">
  <div class="shell">
    ${WORDMARK(up)}
    <nav aria-label="Main"><a class="hide-sm" href="${up}#work">Work</a><a href="${up}blog/"${current === 'blog' ? ' aria-current="page"' : ''}>Blog</a><a href="${up}#pricing">Pricing</a><a href="${up}#book">Book a proof</a></nav>
  </div>
</header>
<main>
${main}
</main>
<footer><div class="shell"><span>ORELVI · Websites for any business</span><a href="mailto:${EMAIL}">${EMAIL}</a></div></footer>
</body>
</html>
`;
}

const CTA = (up) => `<aside class="cta">
  <h2>See your new site before you pay for it.</h2>
  <p>Book a free proof and we build a real website for your business first. If you like it, launching starts at $399. If you don’t, you owe nothing.</p>
  <div class="btns"><a class="btn" href="${up}#book">Book a free proof</a><a class="btn ghost" href="${up}#pricing">See pricing</a></div>
</aside>`;

/* ---------------------------------------------------------------- */

const files = readdirSync(join(HERE, 'posts')).filter((f) => f.endsWith('.md')).sort();
const all = files.map((f) => parse(join(HERE, 'posts', f)));
const slugs = new Set();
for (const p of all) {
  if (slugs.has(p.slug)) throw new Error(`duplicate slug ${p.slug}`);
  slugs.add(p.slug);
}
const live = all
  .filter((p) => p.draft !== 'true' && p.date <= TODAY)
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.title.localeCompare(b.title)));

/* Clear generated post folders so an unpublished or renamed post goes away. */
for (const d of readdirSync(BLOG, { withFileTypes: true })) {
  if (d.isDirectory() && d.name !== '_src') rmSync(join(BLOG, d.name), { recursive: true, force: true });
}

for (const p of live) {
  const { html, toc } = markdown(p.body);
  const url = `${SITE}blog/${p.slug}/`;
  const mins = Math.max(2, Math.round(words(p.body) / 230));
  const others = live.filter((x) => x.slug !== p.slug).slice(0, 3);
  const main = `<article class="shell">
  <p class="eyebrow mono"><a href="../">ORELVI blog</a>${p.tag ? ` · ${esc(p.tag)}` : ''}</p>
  <h1>${esc(p.title)}</h1>
  <p class="lede">${esc(p.description)}</p>
  <p class="meta mono"><time datetime="${p.date}">${nice(p.date)}</time><span>${mins} min read</span></p>
  ${toc.length >= 3 ? `<nav class="toc" aria-label="In this article"><span class="mono">In this article</span><ol>${toc.map((t) => `<li><a href="#${t.id}">${esc(t.text)}</a></li>`).join('')}</ol></nav>` : ''}
  <div class="body">
${html}
  </div>
  ${CTA('../../')}
  ${others.length ? `<section class="more"><h2>Keep reading</h2><ul class="posts">${others.map((o) => `<li><a href="../${o.slug}/"><span class="mono">${nice(o.date)}</span><h2>${esc(o.title)}</h2><p>${esc(o.description)}</p></a></li>`).join('')}</ul></section>` : ''}
</article>`;
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'BlogPosting',
    headline: p.title, description: p.description, datePublished: p.date, dateModified: p.updated ?? p.date,
    mainEntityOfPage: url, url,
    author: { '@type': 'Organization', name: 'ORELVI', url: SITE },
    publisher: { '@type': 'Organization', name: 'ORELVI', url: SITE },
  };
  mkdirSync(join(BLOG, p.slug), { recursive: true });
  writeFileSync(join(BLOG, p.slug, 'index.html'), page({
    up: '../../', title: `${p.title} · ORELVI`, description: p.description, canonical: url,
    ogType: 'article', jsonLd, current: 'blog', main,
  }));
}

const indexMain = `<section class="shell">
  <p class="eyebrow mono">ORELVI blog</p>
  <h1>Plain answers about websites for business owners.</h1>
  <p class="lede">What a website should cost, what it has to do on a phone, and how to tell if yours is losing you work. Written by the people who build them.</p>
  <ul class="posts">${live.map((p) => `<li><a href="${p.slug}/"><span class="mono">${nice(p.date)}${p.tag ? ` · ${esc(p.tag)}` : ''}</span><h2>${esc(p.title)}</h2><p>${esc(p.description)}</p></a></li>`).join('')}</ul>
  ${CTA('../')}
</section>`;
writeFileSync(join(BLOG, 'index.html'), page({
  up: '../', title: 'Blog · ORELVI', description: 'Plain answers about small business websites: cost, phones, speed, search and what actually wins customers.',
  canonical: `${SITE}blog/`, ogType: 'website', current: 'blog', main: indexMain,
  jsonLd: { '@context': 'https://schema.org', '@type': 'Blog', name: 'ORELVI blog', url: `${SITE}blog/`,
    blogPost: live.map((p) => ({ '@type': 'BlogPosting', headline: p.title, url: `${SITE}blog/${p.slug}/`, datePublished: p.date })) },
}));

/* Sitemap: the agency site, its standing pages, and every live post. */
const staticPaths = ['', 'waitlist/', 'rail/', 'blog/']
  .filter((p) => p === '' || existsSync(join(ROOT, p, 'index.html')));
const urls = [
  ...staticPaths.map((p) => ({ loc: SITE + p, lastmod: p === 'blog/' && live[0] ? live[0].date : null })),
  ...live.map((p) => ({ loc: `${SITE}blog/${p.slug}/`, lastmod: p.updated ?? p.date })),
];
writeFileSync(join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`);
/* Prospect previews are private-ish pitches to one business each: keep them
   out of search so a business never finds its own unpaid preview on Google. */
const previews = readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith('.') && !['blog', 'fonts', 'social', 'waitlist', 'rail', 'work'].includes(d.name)
    && existsSync(join(ROOT, d.name, 'index.html')))
  .map((d) => d.name).sort();
writeFileSync(join(ROOT, 'robots.txt'), `User-agent: *
${previews.map((p) => `Disallow: /orelvi-previews/${p}/\nDisallow: /${p}/`).join('\n')}
Disallow: /orelvi-previews/blog/_src/
Disallow: /blog/_src/

Sitemap: ${SITE}sitemap.xml
`);

console.log(`blog: ${live.length} live post(s), ${all.length - live.length} scheduled or draft; sitemap ${urls.length} url(s); ${previews.length} preview folder(s) kept out of search`);
