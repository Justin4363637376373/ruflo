import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function ask(prompt, system = '', model = 'claude-haiku-4-5-20251001') {
  const msg = await client.messages.create({
    model,
    max_tokens: 4096,
    ...(system ? { system } : {}),
    messages: [{ role: 'user', content: prompt }],
  });
  return msg.content[0].text;
}
