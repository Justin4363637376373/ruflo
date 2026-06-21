/**
 * SAM — Content & Ads Agent
 * Writes TikTok ad scripts + 3 SEO blog posts daily
 */
import { ask } from '../utils/claude.mjs';

export async function runSam(crisProducts) {
  const system = `You are SAM, the content and advertising specialist for Pawdrix (pawdrix.com).
Rules:
- TikTok scripts are EXACTLY 15 seconds total. No exceptions.
- Hook must stop the scroll in 3 seconds — emotional, shocking, or funny
- Always end with: "Link in bio. Use code PAWDRIX15 for 15% off at pawdrix.com"
- Blog posts: 350–450 words, H1 keyword in title, natural keyword use, ends with CTA to /collections/all`;

  const [adScripts, blogPosts] = await Promise.all([
    generateAdScripts(crisProducts, system),
    generateBlogPosts(system),
  ]);

  return { adScripts, blogPosts };
}

async function generateAdScripts(crisProducts, system) {
  const prompt = `CRIS found these products today:

${crisProducts}

Pick the TOP 2 products with the highest TikTok viral potential.

For each product, write:

=== PRODUCT: [Name] ===

🎬 15-SECOND TIKTOK SCRIPT
[0–3s HOOK]:
[3–12s BODY]:
[12–15s CTA]: "Link in bio. Use code PAWDRIX15 for 15% off at pawdrix.com"

📱 ON-SCREEN VISUALS: [what the video should show, shot by shot]
🎯 TARGET AUDIENCE: [who to target]
🏷️ CAPTION: [full TikTok caption with hashtags]
⏰ BEST POST TIME: [day + time EST]

---`;

  console.log('🎬 SAM: Writing ad scripts...');
  const result = await ask(prompt, system);
  console.log('✅ SAM: Ad scripts ready');
  return result;
}

async function generateBlogPosts(system) {
  const month = new Date().toLocaleString('en-US', { month: 'long', timeZone: 'America/New_York' });

  const prompt = `Write 3 SEO blog posts for pawdrix.com/blogs/news. ${month} context.

Each post must be 350–450 words. Format EXACTLY as:

=== BLOG POST 1 ===
TITLE: [H1 title with primary keyword]
SLUG: [url-friendly-slug]
META: [155-char meta description]
CONTENT:
[Full blog post. Use ## for H2 subheadings. End with a CTA paragraph linking to /collections/all]

=== BLOG POST 2 ===
[same format]

=== BLOG POST 3 ===
[same format]

Topics:
1. "${month} pet care tips every dog owner needs to know"
2. "Why indoor cats get bored (and the $20 fix that works)"
3. "Best pet gadgets for busy owners in 2026"`;

  console.log('📝 SAM: Writing blog posts...');
  const result = await ask(prompt, system);
  console.log('✅ SAM: Blog posts ready');
  return result;
}

export function parseBlogPosts(samOutput) {
  const posts = [];
  const blocks = samOutput.split(/=== BLOG POST \d+ ===/g).slice(1);

  for (const block of blocks) {
    const title = block.match(/TITLE:\s*(.+)/)?.[1]?.trim();
    const slug = block.match(/SLUG:\s*(.+)/)?.[1]?.trim();
    const contentMatch = block.match(/CONTENT:\s*([\s\S]+)/);
    const content = contentMatch?.[1]?.trim();
    if (title && slug && content) posts.push({ title, slug, content });
  }

  return posts;
}
