const DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;
const API_VERSION = '2024-10';

export async function shopifyGQL(query, variables = {}) {
  if (!DOMAIN || !TOKEN) throw new Error('Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_API_TOKEN');

  const res = await fetch(`https://${DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) throw new Error(`Shopify HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.errors) throw new Error(`Shopify GQL errors: ${JSON.stringify(json.errors)}`);
  return json.data;
}

export async function publishBlogPost({ title, slug, content, blogId }) {
  const mutation = `
    mutation CreateArticle($blogId: ID!, $article: ArticleCreateInput!) {
      articleCreate(blogId: $blogId, article: $article) {
        article { id title handle }
        userErrors { field message }
      }
    }
  `;
  return shopifyGQL(mutation, {
    blogId,
    article: {
      title,
      handle: slug,
      body: content,
      isPublished: true,
    },
  });
}

export async function getDefaultBlogId() {
  const data = await shopifyGQL(`{ blogs(first: 1) { edges { node { id } } } }`);
  return data.blogs.edges[0]?.node?.id ?? null;
}
