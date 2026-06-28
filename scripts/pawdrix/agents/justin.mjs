/**
 * JUSTIN — Analytics Agent
 * Pulls real Shopify data: sessions, orders, revenue vs yesterday
 */
import { shopifyGQL } from '../utils/shopify.mjs';

export async function runJustin() {
  console.log('📊 JUSTIN: Pulling Shopify analytics...');

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const todayISO = todayStart.toISOString();
  const yesterdayISO = yesterdayStart.toISOString();

  const query = `
    query DailyStats($todayQuery: String!, $yesterdayQuery: String!) {
      todayOrders: orders(first: 250, query: $todayQuery) {
        edges {
          node {
            totalPriceSet { shopMoney { amount } }
            financialStatus
            lineItems(first: 5) {
              edges { node { title quantity } }
            }
          }
        }
      }
      yesterdayOrders: orders(first: 250, query: $yesterdayQuery) {
        edges {
          node {
            totalPriceSet { shopMoney { amount } }
            financialStatus
          }
        }
      }
      products: products(first: 250, query: "status:active") {
        edges {
          node { title totalInventory }
        }
      }
      draftProducts: products(first: 10, query: "status:draft") {
        edges { node { title } }
      }
    }
  `;

  const data = await shopifyGQL(query, {
    todayQuery: `created_at:>=${todayISO}`,
    yesterdayQuery: `created_at:>=${yesterdayISO} created_at:<${todayISO}`,
  });

  const calcStats = (orders) => {
    const paid = orders.edges.filter(e => e.node.financialStatus === 'PAID');
    const revenue = paid.reduce((s, e) => s + parseFloat(e.node.totalPriceSet.shopMoney.amount), 0);
    return { count: paid.length, revenue };
  };

  const today = calcStats(data.todayOrders);
  const yesterday = calcStats(data.yesterdayOrders);

  const revenueChange = yesterday.revenue === 0
    ? (today.revenue > 0 ? '🆕 First revenue!' : '→ $0')
    : `${today.revenue >= yesterday.revenue ? '📈' : '📉'} ${((today.revenue - yesterday.revenue) / yesterday.revenue * 100).toFixed(0)}%`;

  // Top products from today's orders
  const topProducts = {};
  for (const { node: order } of data.todayOrders.edges) {
    if (order.financialStatus === 'PAID') {
      for (const { node: item } of order.lineItems.edges) {
        topProducts[item.title] = (topProducts[item.title] || 0) + item.quantity;
      }
    }
  }
  const topList = Object.entries(topProducts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([title, qty]) => `${title} (×${qty})`);

  const activeProducts = data.products.edges.length;
  const draftProducts = data.draftProducts.edges.map(e => e.node.title);

  console.log('✅ JUSTIN: Analytics pulled');

  return {
    todayRevenue: today.revenue.toFixed(2),
    todayOrders: today.count,
    yesterdayRevenue: yesterday.revenue.toFixed(2),
    yesterdayOrders: yesterday.count,
    revenueChange,
    activeProducts,
    draftProducts,
    topProducts: topList,
  };
}
