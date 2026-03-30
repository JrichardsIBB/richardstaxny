/**
 * TaxWise AI Chat API
 * Powered by Claude (Anthropic) with IRS data tools
 */
import Anthropic from '@anthropic-ai/sdk';
import { IRS_FORMS, IRS_PROCESSES, TAX_INFO_2025 } from './irs-search.js';
import { fetchIRSFeed } from './irs-feed.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Rate limiting (simple in-memory)
const rateLimits = {};
const RATE_LIMIT = 20; // requests per minute
const RATE_WINDOW = 60 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  if (!rateLimits[ip] || now - rateLimits[ip].start > RATE_WINDOW) {
    rateLimits[ip] = { start: now, count: 1 };
    return true;
  }
  rateLimits[ip].count++;
  return rateLimits[ip].count <= RATE_LIMIT;
}

// Richards Tax NY business information
const BUSINESS_INFO = {
  name: 'Richards Tax NY',
  owner: 'Roy Richards',
  address: '182 Hall Street, Brooklyn, NY 11205',
  phone: '(718) 622-4951',
  email: 'roy@richardstaxny.com',
  website: 'https://www.richardstaxny.com',
  hours: 'Monday – Friday, 10:00 AM – 6:00 PM',
  services: [
    'Individual Tax Preparation (1040)',
    'Business Tax Returns (LLC, S-Corp, C-Corp, Partnerships)',
    'Bookkeeping & Accounting',
    'Tax Planning & Advisory',
    'IRS Representation & Resolution',
    'Financial Consulting',
    'Quarterly Estimated Tax Filings',
    'Amended Returns (1040-X)',
    'Payroll Services (W-2, 1099)',
  ],
  pricing: 'Individual returns start at competitive rates. Business returns quoted based on scope. Free initial consultation available.',
};

const SYSTEM_PROMPT = `You are TaxWise, the AI tax assistant for Richards Tax NY — a professional tax preparation service in Brooklyn, New York.

## Your Identity
- Name: TaxWise
- Role: Friendly, knowledgeable tax assistant
- Tone: Professional but warm, like a helpful neighbor who happens to be a tax expert

## Richards Tax NY Business Info
- Owner: ${BUSINESS_INFO.owner}
- Address: ${BUSINESS_INFO.address}
- Phone: ${BUSINESS_INFO.phone}
- Email: ${BUSINESS_INFO.email}
- Website: ${BUSINESS_INFO.website}
- Hours: ${BUSINESS_INFO.hours}
- Services: ${BUSINESS_INFO.services.join(', ')}
- Pricing: ${BUSINESS_INFO.pricing}

## Current Date
Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

## Rules
1. USE YOUR TOOLS to look up IRS forms, processes, tax info, and news — do not guess or make up tax data.
2. Keep responses CONCISE — under 200 words. Users are on a chat widget, not reading essays.
3. Use **bold** for important terms and numbers.
4. Include IRS.gov links when referencing forms or processes.
5. NEVER provide specific tax advice for someone's personal situation. Say "Based on general IRS guidelines..." and recommend consulting a tax professional.
6. When a question relates to Richards Tax NY services, naturally mention them and encourage contacting the office.
7. For questions outside tax/finance, politely redirect: "I specialize in tax questions! For that, you might try..."
8. Add a brief disclaimer when answering situational tax questions: "This is general info, not tax advice."
9. If someone wants to schedule an appointment or needs personal help, direct them to call ${BUSINESS_INFO.phone} or visit ${BUSINESS_INFO.website}.
10. Format lists with numbers, not bullets, for better readability in the chat widget.`;

// Tool definitions
const TOOLS = [
  {
    name: 'search_irs_forms',
    description: 'Search the IRS forms and processes database for information about specific tax forms (W-2, 1040, 1099, etc.), filing procedures, refund status, payment plans, and other IRS processes. Also returns 2025 tax bracket and deduction info.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query for IRS forms or processes (e.g., "W-2", "check refund", "payment plan", "tax brackets")',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_irs_news',
    description: 'Get the latest IRS news, updates, tax tips, and deadline announcements from official IRS RSS feeds.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'search_irs_website',
    description: 'Search IRS.gov directly for information not found in the local database. Use this as a fallback when the local forms/processes database does not have the answer.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query for IRS.gov',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_business_info',
    description: 'Get Richards Tax NY business details including address, phone, hours, services offered, and pricing information.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];

// Tool execution
async function executeTool(name, input) {
  switch (name) {
    case 'search_irs_forms': {
      const query = input.query.toLowerCase().trim();
      const results = { forms: [], processes: [], taxInfo: null };

      for (const [key, form] of Object.entries(IRS_FORMS)) {
        const searchText = `${key} ${form.name} ${form.title} ${form.description}`.toLowerCase();
        if (query.split(' ').some((w) => w.length > 2 && searchText.includes(w))) {
          results.forms.push(form);
        }
      }

      for (const [key, process] of Object.entries(IRS_PROCESSES)) {
        const searchText = `${key} ${process.title} ${process.steps.join(' ')}`.toLowerCase();
        if (query.split(' ').some((w) => w.length > 2 && searchText.includes(w))) {
          results.processes.push(process);
        }
      }

      if (query.includes('bracket') || query.includes('rate') || query.includes('deduction') || query.includes('standard') || query.includes('credit') || query.includes('eitc')) {
        results.taxInfo = TAX_INFO_2025;
      }

      return JSON.stringify(results);
    }

    case 'get_irs_news': {
      try {
        const items = await fetchIRSFeed();
        return JSON.stringify({ items: (items || []).slice(0, 5) });
      } catch {
        return JSON.stringify({ items: [], error: 'Unable to fetch IRS news at this time.' });
      }
    }

    case 'search_irs_website': {
      try {
        const { parse } = await import('node-html-parser');
        const searchUrl = `https://www.irs.gov/search?search_api_fulltext=${encodeURIComponent(input.query)}&op=Search`;
        const resp = await fetch(searchUrl, {
          headers: { 'User-Agent': 'RichardsTaxNY/1.0 TaxWise Bot' },
        });
        if (!resp.ok) throw new Error('IRS search failed');
        const html = await resp.text();
        const root = parse(html);

        const results = [];
        const items = root.querySelectorAll('.search-result, .views-row');
        for (const item of items.slice(0, 3)) {
          const titleEl = item.querySelector('h3 a, h2 a, .title a, a');
          const snippetEl = item.querySelector('.search-snippet, .field-content, p');
          if (titleEl) {
            const href = titleEl.getAttribute('href') || '';
            results.push({
              title: titleEl.text.trim(),
              url: href.startsWith('http') ? href : `https://www.irs.gov${href}`,
              snippet: snippetEl?.text?.trim()?.substring(0, 200) || '',
            });
          }
        }

        return JSON.stringify({ results });
      } catch (err) {
        return JSON.stringify({ results: [], error: 'Unable to search IRS.gov at this time.' });
      }
    }

    case 'get_business_info': {
      return JSON.stringify(BUSINESS_INFO);
    }

    default:
      return JSON.stringify({ error: 'Unknown tool' });
  }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limit
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
  }

  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'AI service not configured' });
    }

    // Build conversation messages (cap at last 10 exchanges)
    const messages = [];
    const recentHistory = history.slice(-20); // 10 exchanges = 20 messages
    for (const msg of recentHistory) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
    messages.push({ role: 'user', content: message });

    // Call Claude with tools
    let response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });

    // Handle tool use loop (max 3 iterations)
    let iterations = 0;
    while (response.stop_reason === 'tool_use' && iterations < 3) {
      iterations++;

      const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use');
      const toolResults = [];

      for (const toolUse of toolUseBlocks) {
        const result = await executeTool(toolUse.name, toolUse.input);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result,
        });
      }

      // Continue conversation with tool results
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });

      response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages,
      });
    }

    // Extract text response
    const textBlocks = response.content.filter((b) => b.type === 'text');
    const responseText = textBlocks.map((b) => b.text).join('\n');

    // Extract any URLs mentioned for sources
    const urlRegex = /https?:\/\/www\.irs\.gov[^\s)"]*/g;
    const sources = [...new Set(responseText.match(urlRegex) || [])].map((url) => ({ url }));

    return res.status(200).json({
      response: responseText,
      sources,
    });
  } catch (err) {
    console.error('Chat API error:', err);
    return res.status(500).json({
      error: 'I had trouble processing that. Please try again or call us at (718) 622-4951.',
    });
  }
}
