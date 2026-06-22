/**
 * Pawdrix CEO System v3 — Daily 7-Agent Orchestrator
 * Runs at 9am EST via GitHub Actions
 * Agents: CRIS (research) → SAM (content) | JUSTIN (analytics) | DAN (store fixes) | PRICE (pricing) | MAYA (email) | KAI (influencer)
 */
import { runCris } from './agents/cris.mjs';
import { runSam, parseBlogPosts } from './agents/sam.mjs';
import { runJustin } from './agents/justin.mjs';
import { runDan } from './agents/dan.mjs';
import { runPrice } from './agents/price.mjs';
import { runMaya } from './agents/maya.mjs';
import { runKai } from './agents/kai.mjs';
import { sendReport } from './utils/email.mjs';
import { publishBlogPost, getDefaultBlogId } from './utils/shopify.mjs';

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const start = Date.now();
  console.log(`\n🐾 Pawdrix CEO System v3 starting${DRY_RUN ? ' (DRY RUN)' : ''}...\n`);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'America/New_York',
  });

  // All agents run in parallel; SAM depends on CRIS
  const [justinResult, danResult, crisResult, priceResult, mayaResult, kaiResult] = await Promise.all([
    runJustin().catch(err => ({ error: err.message })),
    runDan().catch(err => [`❌ DAN crashed: ${err.message}`]),
    runCris().catch(err => `❌ CRIS crashed: ${err.message}`),
    runPrice().catch(err => ({ error: err.message, analysis: '', urgent: [] })),
    runMaya().catch(err => ({ error: err.message, campaign: '', subject: '' })),
    runKai().catch(err => ({ error: err.message, report: '', todayAction: '' })),
  ]);

  // SAM uses CRIS output
  const samResult = await runSam(crisResult).catch(err => ({
    error: err.message,
    adScripts: '',
    blogPosts: '',
  }));

  // Publish blog posts to Shopify (3/day)
  const blogPublishResults = await publishBlogs(samResult.blogPosts).catch(err => [
    `❌ Blog publish failed: ${err.message}`,
  ]);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  const urgentPricing = priceResult.urgent?.length ? ` | ⚠️ ${priceResult.urgent.length} pricing issues` : '';
  const subject = `🐾 Pawdrix Daily — ${today} | Revenue: $${justinResult.todayRevenue ?? '?'} | ${justinResult.todayOrders ?? 0} orders${urgentPricing}`;
  const html = buildEmail({ today, justinResult, danResult, crisResult, samResult, priceResult, mayaResult, kaiResult, blogPublishResults, elapsed });

  if (!DRY_RUN) {
    await sendReport(subject, html);
  } else {
    console.log('\n📧 DRY RUN — email not sent. Subject:', subject);
  }

  console.log(`\n✅ Pawdrix CEO System done in ${elapsed}s\n`);
}

async function publishBlogs(blogOutput) {
  if (!blogOutput || !process.env.SHOPIFY_ADMIN_API_TOKEN) return ['⏭️ Blog publish skipped (no token)'];

  const posts = parseBlogPosts(blogOutput);
  if (!posts.length) return ['⚠️ No blog posts parsed from SAM output'];

  const blogId = await getDefaultBlogId();
  if (!blogId) return ['⚠️ No Shopify blog found — create one at /admin/blogs'];

  const results = [];
  for (const post of posts) {
    try {
      await publishBlogPost({ ...post, blogId });
      results.push(`📝 Published: "${post.title}"`);
    } catch (err) {
      results.push(`❌ Failed to publish "${post.title}": ${err.message}`);
    }
  }
  return results;
}

function buildEmail({ today, justinResult: j, danResult, crisResult, samResult: s, priceResult: p, mayaResult: m, kaiResult: k, blogPublishResults, elapsed }) {
  const metric = (value, label, emoji = '') => `
    <div style="display:inline-block;background:#f0f4ff;border-radius:10px;padding:14px 22px;margin:8px;text-align:center;min-width:100px">
      <div style="font-size:26px;font-weight:700;color:#1a1a2e">${emoji} ${value}</div>
      <div style="font-size:11px;color:#888;margin-top:4px;text-transform:uppercase;letter-spacing:1px">${label}</div>
    </div>`;

  const section = (title, content, color = '#1a1a2e') => `
    <div style="background:white;margin:3px 0;padding:22px 28px">
      <h2 style="color:${color};border-bottom:2px solid #f0f0f0;padding-bottom:10px;margin-top:0">${title}</h2>
      ${content}
    </div>`;

  const pre = (text) => `<pre style="background:#f8f9fa;padding:16px;border-radius:8px;white-space:pre-wrap;font-size:13px;line-height:1.6;overflow:auto;max-height:500px">${escHtml(text)}</pre>`;

  const analyticsContent = j.error
    ? `<p style="color:red">❌ Error: ${j.error}</p>`
    : `
      <div>
        ${metric(`$${j.todayRevenue}`, 'Today Revenue')}
        ${metric(j.todayOrders, 'Today Orders')}
        ${metric(j.revenueChange, 'vs Yesterday')}
        ${metric(j.activeProducts, 'Active Products')}
      </div>
      <p style="color:#666;font-size:13px;margin-top:12px">
        Yesterday: $${j.yesterdayRevenue} | ${j.yesterdayOrders} orders
        ${j.draftProducts?.length ? `<br>Draft products: ${j.draftProducts.join(', ')}` : ''}
        ${j.topProducts?.length ? `<br>Top sellers today: ${j.topProducts.join(' · ')}` : ''}
      </p>`;

  const danContent = Array.isArray(danResult)
    ? danResult.map(f => `<div style="padding:7px 0;border-bottom:1px solid #f5f5f5;font-size:14px">${escHtml(String(f))}</div>`).join('')
    : `<p style="color:red">${String(danResult)}</p>`;

  const blogContent = blogPublishResults
    .map(r => `<div style="padding:6px 0;font-size:14px">${escHtml(r)}</div>`).join('');

  const mayaContent = m?.error
    ? `<p style="color:red">❌ Error: ${m.error}</p>`
    : `
      <div style="background:#f0fff4;border:1px solid #86efac;border-radius:8px;padding:12px 16px;margin-bottom:12px">
        <strong>Subject:</strong> ${escHtml(m.subject || '')}<br>
        <strong>Audience:</strong> ${m.audienceSize} customers | ${m.repeatBuyers} repeat buyers
      </div>
      ${pre(m.campaign || '')}`;

  const kaiContent = k?.error
    ? `<p style="color:red">❌ Error: ${k.error}</p>`
    : `
      ${k.todayAction ? `<div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:12px 16px;margin-bottom:12px">
        🎯 <strong>TODAY'S ACTION:</strong> ${escHtml(k.todayAction)}
      </div>` : ''}
      ${pre(k.report || '')}`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;background:#f0f2f5;padding:16px">

  <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);color:white;padding:28px;border-radius:12px 12px 0 0">
    <h1 style="margin:0;font-size:22px">🐾 Pawdrix CEO Daily Report</h1>
    <p style="margin:8px 0 0;opacity:.8;font-size:14px">${today} &nbsp;·&nbsp; 7 Agents Active</p>
  </div>

  ${section('📊 JUSTIN — Store Analytics', analyticsContent)}
  ${section('🔧 DAN — Auto-Fixes Applied Today', danContent, '#0d6e3d')}
  ${section('📝 DAN — Blog Posts Published', blogContent || '<p style="color:#888">None</p>', '#0d6e3d')}
  ${section('💰 PRICE — Pricing Analysis', p?.error ? `<p style="color:red">Error: ${p.error}</p>` : `
    ${p?.urgent?.length ? `<div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:12px 16px;margin-bottom:12px">
      ⚠️ <strong>${p.urgent.length} products need price attention:</strong> ${p.urgent.map(u => escHtml(u)).join(', ')}
    </div>` : '<div style="color:#0d6e3d;margin-bottom:12px">✅ All prices look competitive</div>'}
    ${pre(p?.analysis || '')}
  `, '#c2410c')}
  ${section('📧 MAYA — Today\'s Email Campaign', mayaContent, '#0891b2')}
  ${section('🎯 KAI — Influencer & Viral Strategy', kaiContent, '#7c3aed')}
  ${section('🔍 CRIS — Today\'s 10 Winning Products', pre(String(crisResult)), '#7c3aed')}
  ${section('🎬 SAM — TikTok Ad Scripts', s.error ? `<p style="color:red">Error: ${s.error}</p>` : pre(s.adScripts), '#b45309')}
  ${section('📖 SAM — Blog Post Content', s.blogPosts ? pre(s.blogPosts) : '<p style="color:#888">None</p>', '#b45309')}

  <div style="background:#1a1a2e;color:#aaa;padding:16px 28px;border-radius:0 0 12px 12px;font-size:12px;text-align:center">
    Pawdrix CEO System v3 &nbsp;·&nbsp; 7 Agents &nbsp;·&nbsp; Generated in ${elapsed}s &nbsp;·&nbsp; Runs daily at 9am EST
    <br>Store: <a href="https://pawdrix.com" style="color:#6b9fff">pawdrix.com</a>
    &nbsp;·&nbsp; Admin: <a href="https://admin.shopify.com" style="color:#6b9fff">Shopify Admin</a>
  </div>

</body>
</html>`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

main().catch(err => {
  console.error('\n💥 CEO System crashed:', err);
  process.exit(1);
});
