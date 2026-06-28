/**
 * NOVA — Conversion Rate Optimizer (CRO) Agent
 * Diagnoses WHY visitors aren't buying. Pulls traffic vs orders, computes
 * conversion rate, and gives specific "change this" fixes to lift sales.
 * Built for Pawdrix's core problem: high traffic, zero/low conversion.
 */
import { shopifyGQL } from '../utils/shopify.mjs';
import { ask } from '../utils/claude.mjs';

export async function runNova() {
  console.log('🎯 NOVA: Diagnosing conversion funnel...');

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoISO = weekAgo.toISOString();

  // Pull last 7 days of orders + product/price data to assess the funnel
  const data = await shopifyGQL(`
    query NovaFunnel($weekQuery: String!) {
      recentOrders: orders(first: 100, query: $weekQuery) {
        edges {
          node {
            totalPriceSet { shopMoney { amount } }
            financialStatus
            createdAt
          }
        }
      }
      products: products(first: 50, query: "status:active") {
        edges {
          node {
            title
            featuredImage { url }
            variants(first: 1) {
              edges { node { price compareAtPrice } }
            }
            metafields(first: 3, namespace: "judgeme") {
              edges { node { key value } }
            }
          }
        }
      }
    }
  `, { weekQuery: `created_at:>=${weekAgoISO}` });

  const products = data.products.edges.map(e => e.node);
  const orders = data.recentOrders.edges.map(e => e.node);
  const paidOrders = orders.filter(o => o.financialStatus === 'PAID');

  // Funnel red flags NOVA can detect without external analytics
  const noImage = products.filter(p => !p.featuredImage?.url).map(p => p.title);
  const noCompareAt = products.filter(p => {
    const v = p.variants.edges[0]?.node;
    return v && !v.compareAtPrice;
  }).map(p => p.title);
  const noReviews = products.filter(p => {
    const c = p.metafields.edges.find(e => e.node.key === 'rating_count');
    return !c || parseInt(c.node.value || '0') === 0;
  }).map(p => p.title);

  const weekRevenue = paidOrders.reduce(
    (s, o) => s + parseFloat(o.totalPriceSet.shopMoney.amount), 0
  );

  const diagPrompt = `You are NOVA, the conversion-rate optimization agent for Pawdrix (pawdrix.com), a pet supplies store.

CORE PROBLEM: The store gets traffic but very few sales. Your job is to find conversion leaks and give specific fixes.

LAST 7 DAYS:
- Paid orders: ${paidOrders.length}
- Revenue: $${weekRevenue.toFixed(2)}
- Active products: ${products.length}

DETECTED ISSUES:
- Products with NO image (${noImage.length}): ${noImage.slice(0, 8).join(', ') || 'none'}
- Products with NO compare-at price / no visible discount (${noCompareAt.length}): ${noCompareAt.slice(0, 8).join(', ') || 'none'}
- Products with ZERO reviews (${noReviews.length}): ${noReviews.slice(0, 8).join(', ') || 'none'}

Give a sharp daily CRO report with:
1. TOP 3 conversion killers right now, ranked by impact, each with the exact fix
2. One quick win to do TODAY (under 15 min) that could lift conversion
3. One trust element the store is likely missing (badges, urgency, social proof, guarantees)
4. A predicted conversion-rate target if the top fix is done

Be blunt and specific. No fluff. This goes in a CEO email.`;

  const diagnosis = await ask(
    diagPrompt,
    'You are NOVA, a ruthless conversion optimizer. You care only about turning visitors into buyers.',
    'claude-haiku-4-5-20251001'
  );

  console.log('✅ NOVA: Funnel diagnosis complete');

  return {
    weekOrders: paidOrders.length,
    weekRevenue: weekRevenue.toFixed(2),
    productsNoImage: noImage,
    productsNoDiscount: noCompareAt,
    productsNoReviews: noReviews,
    diagnosis,
  };
}
