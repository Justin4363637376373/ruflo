/**
 * PRICE — Pricing Optimizer Agent
 * Pulls Pawdrix product prices, compares against market rates for dropshipped pet products,
 * flags mispriced items, and suggests optimal price points.
 * Note: Can't scrape live competitor sites (403 blocked) — uses Claude's market knowledge
 * + Shopify data to benchmark. Flag outputs are added to the daily CEO report.
 */
import { shopifyGQL } from '../utils/shopify.mjs';
import { ask } from '../utils/claude.mjs';

export async function runPrice() {
  console.log('💰 PRICE: Analyzing pricing...');

  // Pull all active products with prices
  const data = await shopifyGQL(`
    query {
      products(first: 50, query: "status:active") {
        edges {
          node {
            id
            title
            tags
            variants(first: 5) {
              edges {
                node {
                  id
                  title
                  price
                  compareAtPrice
                }
              }
            }
          }
        }
      }
    }
  `);

  const products = data.products.edges.map(({ node: p }) => ({
    id: p.id,
    title: p.title,
    tags: p.tags,
    variants: p.variants.edges.map(({ node: v }) => ({
      id: v.id,
      name: v.title,
      price: parseFloat(v.price),
      compareAt: v.compareAtPrice ? parseFloat(v.compareAtPrice) : null,
    })),
    minPrice: Math.min(...p.variants.edges.map(e => parseFloat(e.node.price))),
    maxPrice: Math.max(...p.variants.edges.map(e => parseFloat(e.node.price))),
  }));

  const catalog = products.map(p =>
    `- ${p.title} | Price: $${p.minPrice}${p.minPrice !== p.maxPrice ? `–$${p.maxPrice}` : ''} | Tags: ${p.tags.join(', ')}`
  ).join('\n');

  const system = `You are PRICE, a pricing optimization specialist for Pawdrix (pawdrix.com), a US pet dropshipping store.
You know market rates for pet products sold on Amazon, Chewy, TikTok Shop, and AliExpress-based dropshipping stores.
You understand dropshipping margins: typical source cost is 20-35% of sell price.
Your job: identify pricing mistakes and opportunities — not just "raise prices", but find the sweet spots.`;

  const prompt = `Analyze the pricing for Pawdrix's 20 active products. Benchmark against typical market prices for similar pet products on Amazon, Chewy, and TikTok Shop in 2026.

CURRENT PAWDRIX CATALOG:
${catalog}

For EACH product, output:
PRODUCT: [name]
CURRENT: $[price]
MARKET RATE: $[low]–$[high] (what competitors charge)
STATUS: [✅ Good | ⚠️ Too Low | 🔴 Too High | 💡 Opportunity]
ACTION: [specific recommendation, 1 sentence]
COMPARE-AT: [suggested compare-at/was price for FOMO if applicable]

After all products, output:
=== SUMMARY ===
- Top 3 price changes to make TODAY (highest impact)
- Any products where adding a compare-at price would boost conversions
- Estimated revenue impact if top 3 changes are made`;

  const analysis = await ask(prompt, system, 'claude-sonnet-4-6');

  // Parse out urgent flags (Too Low or Too High)
  const urgent = [];
  const lines = analysis.split('\n');
  let currentProduct = '';
  for (const line of lines) {
    if (line.startsWith('PRODUCT:')) currentProduct = line.replace('PRODUCT:', '').trim();
    if (line.startsWith('STATUS:') && (line.includes('⚠️') || line.includes('🔴'))) {
      urgent.push(currentProduct);
    }
  }

  console.log(`✅ PRICE: Analysis complete — ${urgent.length} pricing issues found`);

  return {
    analysis,
    urgent,
    productCount: products.length,
  };
}
