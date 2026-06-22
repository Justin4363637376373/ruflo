/**
 * KAI — Influencer & Viral Content Finder Agent
 * Researches TikTok/Instagram trends for pet products daily.
 * Finds outreach angles, hashtag strategies, and micro-influencer scripts.
 * Uses Claude's knowledge of social media trends (can't scrape live feeds).
 */
import { shopifyGQL } from '../utils/shopify.mjs';
import { ask } from '../utils/claude.mjs';

export async function runKai() {
  console.log('🎯 KAI: Researching influencer & viral opportunities...');

  // Get active products to build outreach around
  const data = await shopifyGQL(`
    query {
      products(first: 20, query: "status:active") {
        edges {
          node {
            title
            tags
            variants(first: 1) {
              edges { node { price } }
            }
          }
        }
      }
    }
  `);

  const products = data.products.edges.map(({ node: p }) => ({
    title: p.title,
    tags: p.tags,
    price: p.variants.edges[0]?.node?.price || '?',
  }));

  const productList = products.map(p =>
    `- ${p.title} @ $${p.price} | Tags: ${p.tags.join(', ')}`
  ).join('\n');

  const system = `You are KAI, a social media and influencer marketing strategist for Pawdrix (pawdrix.com), a pet supplies dropshipping store.
You specialize in TikTok and Instagram growth for pet brands — organic virality, micro-influencer outreach, and trending sounds/formats.
You understand what makes pet content go viral: surprise moments, dog reactions, transformation videos, humor.`;

  const prompt = `Today's date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.

Create Pawdrix's daily influencer & viral content strategy report.

CURRENT PAWDRIX PRODUCTS:
${productList}

Output the following sections:

=== TRENDING FORMATS THIS WEEK ===
List 3 TikTok/Instagram video formats currently performing well for pet brands (based on your knowledge of 2025-2026 trends). For each: format name, why it works, which Pawdrix product fits best.

=== TOP 5 HASHTAG STRATEGY ===
Best hashtag combo for Pawdrix TikTok posts today (mix of niche + trending + brand).
Include estimated reach tier for each (small/medium/large).

=== MICRO-INFLUENCER OUTREACH SCRIPT ===
Write a DM template for reaching out to a pet micro-influencer (5k-50k followers) to promote one Pawdrix product. Keep it short, casual, genuine — not copy-paste spam. Offer: free product + 10% commission code.

=== VIRAL CONTENT IDEAS (3 IDEAS) ===
For Pawdrix's top products, write 3 specific video concepts that have high viral potential. For each:
- Hook (first 3 seconds)
- Format (POV / reaction / transformation / etc.)
- Best product to feature
- Why this will perform

=== TODAY'S ACTION ITEM ===
The single highest-ROI thing Pawdrix should post or do TODAY on social media (specific, actionable, 2 sentences max).`;

  const report = await ask(prompt, system, 'claude-haiku-4-5-20251001');

  // Extract the action item
  const actionMatch = report.match(/=== TODAY'S ACTION ITEM ===([\.\s\S]*?)(?:===|$)/);
  const todayAction = actionMatch ? actionMatch[1].trim() : '';

  console.log('✅ KAI: Influencer strategy ready');

  return {
    report,
    todayAction,
    productsAnalyzed: products.length,
  };
}
