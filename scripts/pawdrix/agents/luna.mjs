/**
 * LUNA — Social Content Calendar Agent
 * Generates a 7-day TikTok + Instagram content calendar daily.
 * Picks trending formats, hooks, and captions for Pawdrix products.
 */
import { shopifyGQL } from '../utils/shopify.mjs';
import { ask } from '../utils/claude.mjs';

export async function runLuna() {
  console.log('📅 LUNA: Building social content calendar...');

  // Grab active products for content ideas
  const data = await shopifyGQL(`
    query {
      products(first: 20, query: "status:active") {
        edges {
          node {
            title
            handle
            variants(first: 1) {
              edges { node { price } }
            }
          }
        }
      }
    }
  `);

  const products = data.products.edges.map(e => ({
    title: e.node.title,
    handle: e.node.handle,
    price: e.node.variants.edges[0]?.node?.price || '0',
  }));

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const calendarPrompt = `You are LUNA, the social content agent for Pawdrix (pawdrix.com), a pet supplies store targeting dog and cat owners aged 18-35 on TikTok and Instagram.

Today is ${today}.

Active products to feature: ${products.slice(0, 12).map(p => `${p.title} ($${p.price})`).join(', ')}

Create a 7-day social content calendar starting today. For each day include:
- Platform (TikTok or Instagram or both)
- Content format (POV, unboxing, before/after, trending sound, stitch, duet, aesthetic reel, product demo, etc.)
- Hook (first 3 seconds — must stop the scroll)
- Caption with 5 hashtags
- Product to feature
- Best time to post

Format as a clean numbered list. Make the hooks viral-worthy — think what would make a pet parent stop scrolling at 11pm.`;

  const calendar = await ask(calendarPrompt, 'You are LUNA, a Gen Z social media strategist who deeply understands TikTok algorithm and pet content.', 'claude-haiku-4-5-20251001');

  console.log('✅ LUNA: Content calendar ready');

  return {
    calendarDate: today,
    contentCalendar: calendar,
  };
}
