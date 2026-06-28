/**
 * DAN — Store Fixes Agent
 * Auto-fixes without approval: inventory policy, alt text, publish ready drafts, SEO basics
 * Asks King first for: prices, checkout settings, deleting anything
 */
import { shopifyGQL } from '../utils/shopify.mjs';

export async function runDan() {
  console.log('🔧 DAN: Running store fixes...');
  const fixes = [];

  const results = await Promise.allSettled([
    fixInventoryPolicy(),
    fixAltText(),
    publishReadyDrafts(),
  ]);

  for (const r of results) {
    if (r.status === 'fulfilled') fixes.push(...r.value);
    else fixes.push(`❌ Fix error: ${r.reason?.message}`);
  }

  console.log(`✅ DAN: ${fixes.length} actions taken`);
  return fixes;
}

async function fixInventoryPolicy() {
  const fixes = [];

  const data = await shopifyGQL(`
    query {
      products(first: 50) {
        edges {
          node {
            id
            title
            variants(first: 100) {
              edges {
                node {
                  id
                  inventoryPolicy
                }
              }
            }
          }
        }
      }
    }
  `);

  for (const { node: product } of data.products.edges) {
    const needsFix = product.variants.edges.some(e => e.node.inventoryPolicy !== 'CONTINUE');
    if (!needsFix) continue;

    for (const { node: variant } of product.variants.edges) {
      if (variant.inventoryPolicy === 'CONTINUE') continue;
      await shopifyGQL(`
        mutation UpdateVariantPolicy($id: ID!) {
          productVariantUpdate(id: $id, input: { inventoryPolicy: CONTINUE }) {
            userErrors { field message }
          }
        }
      `, { id: variant.id });
    }
    fixes.push(`✅ Inventory → CONTINUE: "${product.title}"`);
  }

  if (!fixes.length) fixes.push('✅ Inventory policy: all variants already set to CONTINUE');
  return fixes;
}

async function fixAltText() {
  const fixes = [];

  const data = await shopifyGQL(`
    query {
      products(first: 50) {
        edges {
          node {
            id
            title
            media(first: 10) {
              edges {
                node {
                  id
                  alt
                  mediaContentType
                }
              }
            }
          }
        }
      }
    }
  `);

  for (const { node: product } of data.products.edges) {
    const missing = product.media.edges.filter(
      e => e.node.mediaContentType === 'IMAGE' && (!e.node.alt || !e.node.alt.trim())
    );
    if (!missing.length) continue;

    const mediaInput = missing.map(e => ({
      id: e.node.id,
      alt: `${product.title} — Pawdrix Pet Supplies`,
    }));

    await shopifyGQL(`
      mutation UpdateAlt($productId: ID!, $media: [UpdateMediaInput!]!) {
        productUpdateMedia(productId: $productId, media: $media) {
          userErrors { field message }
        }
      }
    `, { productId: product.id, media: mediaInput });

    fixes.push(`✅ Alt text fixed (${missing.length} images): "${product.title}"`);
  }

  if (!fixes.length) fixes.push('✅ Alt text: all product images already have alt text');
  return fixes;
}

async function publishReadyDrafts() {
  const fixes = [];

  const data = await shopifyGQL(`
    query {
      products(first: 20, query: "status:draft") {
        edges {
          node {
            id
            title
            description
            variants(first: 1) {
              edges { node { price } }
            }
            media(first: 1) {
              edges { node { id } }
            }
          }
        }
      }
    }
  `);

  for (const { node: p } of data.products.edges) {
    const hasImage = p.media.edges.length > 0;
    const hasDesc = (p.description || '').length > 80;
    const price = parseFloat(p.variants.edges[0]?.node?.price || 0);
    const hasPrice = price > 0;

    if (hasImage && hasDesc && hasPrice) {
      await shopifyGQL(`
        mutation PublishDraft($id: ID!) {
          productUpdate(id: $id, input: { status: ACTIVE }) {
            userErrors { field message }
          }
        }
      `, { id: p.id });
      fixes.push(`🚀 Published draft: "${p.title}" @ $${price}`);
    } else {
      const missing = [
        !hasImage && 'image',
        !hasDesc && 'description (too short)',
        !hasPrice && 'price',
      ].filter(Boolean);
      fixes.push(`⏳ Draft not ready — "${p.title}" missing: ${missing.join(', ')}`);
    }
  }

  if (!fixes.length) fixes.push('✅ No draft products found');
  return fixes;
}
