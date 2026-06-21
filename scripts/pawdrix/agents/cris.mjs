/**
 * CRIS — Research Agent
 * Finds 10 winning pet products daily with AliExpress links
 */
import { ask } from '../utils/claude.mjs';

const EXISTING_PRODUCTS = [
  'FurFree Easy Roller', 'DreamDonut Calming Pet Bed', 'EasyPet Auto Feeder & Fountain',
  'Cozy Paw Flannel Blanket', 'ChirpChase Feather Bird Toy', 'FlexScratch Foldable Cat Scratcher',
  'GlowTrim Pro Pet Nail Scissors', 'TrailMate Pet Carrier Pack', 'BounceBuddy Pro Interactive Pet Ball',
  'CozyCat Round Tunnel Nest', 'EasyClean Silicone Pet Feeding Mat', 'QuackTreat Interactive Duck Puzzle Toy',
  'TidyPet Felt Pet Toy Storage Basket', 'Cozy Den Pet House Bed', 'Rugged Multi Dog Trail Leash',
  'PawPointer Laser & LED Keychain Pet Toy', 'Rainbow Shark Squeaky Plush Dog Toy',
  'Puzzle Play Box for Cats', 'CalmPaws Lick & Slow Bowl', 'TrailGuard Pet Tracker',
];

export async function runCris() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'America/New_York',
  });

  const month = new Date().toLocaleString('en-US', { month: 'long', timeZone: 'America/New_York' });

  const system = `You are CRIS, the product research agent for Pawdrix (pawdrix.com), a US pet dropshipping store.

Your rules:
- Find products NOT already in the catalog: ${EXISTING_PRODUCTS.join(', ')}
- Each product must meet: 500+ AliExpress reviews, 4+ stars, ships to US under 14 days
- Source price $3–15 (sell price $15–50 on Pawdrix)
- Mix: exactly 5 dog products, 5 cat products
- Prioritize: TikTok viral potential, seasonal relevance for ${month}, solves a real pain point
- AliExpress search URL format: https://www.aliexpress.com/wholesale?SearchText=KEYWORDS+HERE`;

  const prompt = `Today is ${today}. Find 10 winning pet products for Pawdrix to consider adding.

For each of the 10 products, output EXACTLY this format:

---
#N [DOG/CAT] Product Name
Pain Point: [one sentence — what problem does this solve?]
Why It'll Sell: [trend, season, or viral angle]
Suggested Pawdrix Name: [catchy branded name]
Source Price: $X–$Y | Sell Price: $XX.99
AliExpress Search: https://www.aliexpress.com/wholesale?SearchText=KEYWORDS
⚠️ Manual check required: Verify 500+ reviews, 4★+, ships to US ≤14 days
---

Make hooks emotional or funny. Think like a TikTok viewer, not a catalog buyer.`;

  console.log('🔍 CRIS: Researching winning products...');
  const result = await ask(prompt, system);
  console.log('✅ CRIS: Found 10 products');
  return result;
}
