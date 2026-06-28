/**
 * REX — Reviews & Reputation Agent
 * Checks Judge.me review counts per product, surfaces products with zero reviews,
 * generates review request copy, and flags reputation gaps.
 */
import { shopifyGQL } from '../utils/shopify.mjs';
import { ask } from '../utils/claude.mjs';

export async function runRex() {
  console.log('⭐ REX: Checking reviews & reputation...');

  const data = await shopifyGQL(`
    query {
      products(first: 50, query: "status:active") {
        edges {
          node {
            id
            title
            handle
            metafields(first: 5, namespace: "judgeme") {
              edges {
                node { key value }
              }
            }
          }
        }
      }
    }
  `);

  const products = data.products.edges.map(e => e.node);

  // Check Judge.me metafields for review counts
  const noReviews = [];
  const hasReviews = [];

  for (const p of products) {
    const ratingField = p.metafields.edges.find(e => e.node.key === 'rating');
    const countField = p.metafields.edges.find(e => e.node.key === 'rating_count');
    const count = parseInt(countField?.node?.value || '0');

    if (count === 0) {
      noReviews.push(p.title);
    } else {
      hasReviews.push({ title: p.title, count, rating: ratingField?.node?.value });
    }
  }

  // Generate review strategy copy using Claude
  const strategyPrompt = `You are REX, the reviews agent for Pawdrix (pawdrix.com), a pet supplies dropshipping store.

Products WITH reviews (${hasReviews.length}): ${hasReviews.map(p => `${p.title} (${p.count} reviews, ${p.rating}★)`).join(', ') || 'None yet'}

Products with ZERO reviews (${noReviews.length}): ${noReviews.slice(0, 10).join(', ')}

Write a short daily review strategy update with:
1. Priority: which 3 products need reviews the most urgently and why
2. One SMS-style post-purchase review request message (under 160 chars) to send to recent buyers
3. One TikTok caption idea using social proof (e.g. "X people already bought this")
4. One tip to get more organic reviews this week

Keep it punchy, no fluff. This goes in a CEO email report.`;

  const strategy = await ask(strategyPrompt, 'You are REX, the reviews agent. Be direct and actionable.', 'claude-haiku-4-5-20251001');

  console.log('✅ REX: Review audit complete');

  return {
    totalProducts: products.length,
    productsWithReviews: hasReviews.length,
    productsWithZeroReviews: noReviews.length,
    zeroReviewProducts: noReviews,
    reviewStrategy: strategy,
  };
}
