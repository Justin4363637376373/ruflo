/**
 * MAYA — Email Marketing Agent
 * Generates daily email campaigns for Pawdrix customers.
 * Pulls recent customers + top products, crafts targeted email copy,
 * and returns ready-to-send campaign HTML + subject line.
 */
import { shopifyGQL } from '../utils/shopify.mjs';
import { ask } from '../utils/claude.mjs';

export async function runMaya() {
  console.log('📧 MAYA: Building email campaign...');

  // Pull recent customers and top active products
  const data = await shopifyGQL(`
    query {
      customers(first: 50, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            email
            firstName
            numberOfOrders
            totalSpentV2 { amount }
          }
        }
      }
      products(first: 10, query: "status:active", sortKey: TITLE) {
        edges {
          node {
            title
            variants(first: 1) {
              edges { node { price compareAtPrice } }
            }
            onlineStoreUrl
          }
        }
      }
    }
  `);

  const customers = data.customers.edges.map(e => e.node);
  const totalCustomers = customers.length;
  const repeatBuyers = customers.filter(c => c.numberOfOrders > 1).length;

  const products = data.products.edges.map(({ node: p }) => {
    const v = p.variants.edges[0]?.node;
    return {
      title: p.title,
      price: v?.price ? `$${v.price}` : '?',
      compareAt: v?.compareAtPrice ? `$${v.compareAtPrice}` : null,
      url: p.onlineStoreUrl || 'https://pawdrix.com',
    };
  });

  const productList = products.map(p =>
    `- ${p.title} | ${p.price}${p.compareAt ? ` (was ${p.compareAt})` : ''}`
  ).join('\n');

  const system = `You are MAYA, an email marketing expert for Pawdrix (pawdrix.com), a US pet supplies store.
You write high-converting email campaigns for pet owners — warm, playful, urgent but not pushy.
You know email marketing: strong subject lines, preheader text, one clear CTA, urgency without spam triggers.`;

  const prompt = `Create today's Pawdrix email marketing campaign.

STORE DATA:
- Total customers in list: ${totalCustomers}
- Repeat buyers: ${repeatBuyers}
- Top products to feature:
${productList}

Write a complete email campaign with:

SUBJECT: [5-8 word subject line with urgency or curiosity — no emojis in subject]
PREHEADER: [One sentence preview text, 40-90 chars]

BODY:
- Opening hook (1-2 sentences, pet-parent focused, builds connection)
- Featured product spotlight (pick the BEST deal — one with a compare-at price if available)
- Why pet parents love it (2-3 bullet points, benefits not features)
- Social proof line (generic but believable: "Over 200 happy Pawdrix customers...")
- Urgency element (limited stock / limited time — keep it honest)
- CTA button text: [5 words max]
- CTA URL: https://pawdrix.com

End with:
DISCOUNT CODE: PAWFAM10 (10% off, mention it as exclusive for email subscribers)

Keep total body under 200 words. Conversational, not corporate.`;

  const campaign = await ask(prompt, system, 'claude-haiku-4-5-20251001');

  // Parse subject line
  const subjectMatch = campaign.match(/SUBJECT:\s*(.+)/);
  const subject = subjectMatch ? subjectMatch[1].trim() : 'Your pet deserves this today';

  console.log(`✅ MAYA: Campaign ready — Subject: "${subject}"`);

  return {
    campaign,
    subject,
    audienceSize: totalCustomers,
    repeatBuyers,
  };
}
