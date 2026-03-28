import { useState, useRef, useEffect } from 'react';

const BOT_NAME = 'TaxWise';

// Knowledge base for the bot
const knowledgeBase = [
  {
    keywords: ['hello', 'hi', 'hey', 'help', 'start'],
    response: `Hey there! I'm ${BOT_NAME}, your tax assistant. I can help with common tax questions, explain our services, or guide you around the site. What can I help you with?`,
  },
  {
    keywords: ['deadline', 'due date', 'when file', 'april'],
    response:
      'The federal tax filing deadline is typically April 15th. You can request a 6-month extension to October 15th, but any taxes owed are still due by April 15th. Need help filing? Head to our Contact page!',
  },
  {
    keywords: ['document', 'need', 'bring', 'what do i need', 'required'],
    response:
      'For your tax return, you will typically need: W-2s from employers, 1099 forms, Social Security statements, mortgage interest statements (1098), property tax records, charitable donation receipts, and a valid photo ID. You can upload these directly on our Contact page!',
  },
  {
    keywords: ['upload', 'send', 'submit', 'document'],
    response:
      'To upload documents: Sign in to your account, go to the Contact page, and scroll to "Upload Documents." You can drag and drop files or click to browse. We accept PDF, JPG, PNG, Word, and Excel files up to 25 MB.',
  },
  {
    keywords: ['refund', 'how long', 'when get', 'status'],
    response:
      'After filing, e-filed returns typically receive refunds within 21 days. Paper returns can take 6-8 weeks. You can check your refund status at irs.gov/refunds. Once we prepare your return, we will give you an estimated timeline.',
  },
  {
    keywords: ['cost', 'price', 'how much', 'fee', 'charge'],
    response:
      'Our pricing depends on the complexity of your return. Individual returns start at competitive rates, and business returns are quoted based on scope. Contact us for a free consultation and we will give you a clear estimate upfront!',
  },
  {
    keywords: ['service', 'offer', 'what do you do', 'provide'],
    response:
      'We offer Individual Tax Preparation, Business Tax Returns (LLC, S-Corp, C-Corp), Bookkeeping & Accounting, Tax Planning & Advisory, IRS Representation, and Financial Consulting. Check out our Services page for full details!',
  },
  {
    keywords: ['account', 'sign up', 'register', 'create account', 'login'],
    response:
      'Click "Sign Up" in the top right to create your account. You will need an email and a password (8+ characters with uppercase, lowercase, and a number). After verifying your email, you can log in and start uploading documents.',
  },
  {
    keywords: ['secure', 'safe', 'privacy', 'protect', 'encrypted'],
    response:
      'Absolutely! Your data is protected with industry-standard SSL/TLS encryption. Documents are stored in secure private storage with row-level security \u2014 only you and our authorized team can access your files. We take privacy seriously.',
  },
  {
    keywords: ['hours', 'open', 'office', 'visit', 'location', 'address'],
    response:
      'Our office is at 182 Hall Street, Brooklyn, NY 11205. We are open Monday through Friday, 10:00 AM to 6:00 PM. You can also call us at (718) 622-4951 or email roy@richardstaxny.com.',
  },
  {
    keywords: ['deduction', 'write off', 'deduct'],
    response:
      'Common deductions include mortgage interest, state/local taxes (up to $10,000), charitable contributions, medical expenses, student loan interest, and business expenses. The standard deduction for 2025 is $15,000 (single) or $30,000 (married filing jointly).',
  },
  {
    keywords: ['eitc', 'earned income', 'low income', 'credit'],
    response:
      'The Earned Income Tax Credit (EITC) is a refundable credit for low-to-moderate income workers. The max credit ranges from ~$632 (no children) to ~$7,830 (3+ children). Even if you owe no tax, you can receive it as a refund!',
  },
  {
    keywords: ['business', 'llc', 'corp', 's-corp', 'self-employed', 'freelance'],
    response:
      'We help freelancers, sole proprietors, LLCs, S-Corps, C-Corps, and partnerships. We can advise on the best entity structure, maximize your deductions, and handle quarterly estimated taxes. Let us set up a consultation!',
  },
  {
    keywords: ['estimated', 'quarterly', 'self-employment'],
    response:
      'If you expect to owe $1,000+ in taxes from self-employment or other non-withheld income, you should pay quarterly estimated taxes. Due dates: April 15, June 15, September 15, and January 15. We can help you calculate the right amount.',
  },
  {
    keywords: ['amend', 'mistake', 'fix', 'change', 'correction'],
    response:
      'If you need to fix a previously filed return, we can help you file an amended return (Form 1040-X). You generally have 3 years from the original filing date. Contact us and we will walk you through it.',
  },
  {
    keywords: ['thank', 'thanks', 'awesome', 'great', 'perfect'],
    response:
      "You're welcome! If you have any other questions, I'm here to help. You can also visit our Help Center for more detailed answers, or reach out to our team directly.",
  },
];

function getLocalResponse(message) {
  const lower = message.toLowerCase().trim();

  if (!lower) return null;

  let bestMatch = null;
  let bestScore = 0;

  for (const entry of knowledgeBase) {
    let score = 0;
    for (const keyword of entry.keywords) {
      if (lower.includes(keyword)) {
        score += keyword.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  if (bestMatch && bestScore > 0) {
    return bestMatch.response;
  }

  return null;
}

function formatIRSResponse(results) {
  let response = '';

  if (results.forms && results.forms.length > 0) {
    const form = results.forms[0];
    response += `**${form.name}: ${form.title}**\n\n`;
    response += `${form.description}\n\n`;
    if (form.who_files) response += `Who files: ${form.who_files}\n`;
    if (form.deadline) response += `Deadline: ${form.deadline}\n`;
    if (form.key_boxes) response += `Key fields: ${form.key_boxes}\n`;
    response += `\nMore info: ${form.url}`;

    if (results.forms.length > 1) {
      response += '\n\nRelated forms: ' + results.forms.slice(1, 3).map((f) => f.name).join(', ');
    }
  }

  if (results.processes && results.processes.length > 0 && !response) {
    const proc = results.processes[0];
    response += `**${proc.title}**\n\n`;
    proc.steps.forEach((step, i) => {
      response += `${i + 1}. ${step}\n`;
    });
    response += `\nMore info: ${proc.url}`;
  }

  if (results.taxInfo && !response) {
    const info = results.taxInfo;
    response += '**2025 Standard Deductions:**\n';
    response += `Single: $${info.standard_deductions.single.toLocaleString()}\n`;
    response += `Married Filing Jointly: $${info.standard_deductions.married_joint.toLocaleString()}\n`;
    response += `Head of Household: $${info.standard_deductions.head_of_household.toLocaleString()}\n`;
    response += `\nChild Tax Credit: $${info.child_tax_credit.toLocaleString()} per child\n`;
    response += `Social Security Wage Base: $${info.social_security_wage_base.toLocaleString()}`;
  }

  return response;
}

async function searchIRS(query) {
  try {
    const resp = await fetch(`/api/irs-search?q=${encodeURIComponent(query)}`);
    if (!resp.ok) return null;
    const results = await resp.json();
    if (results.forms?.length > 0 || results.processes?.length > 0 || results.taxInfo) {
      return formatIRSResponse(results);
    }
    return null;
  } catch {
    return null;
  }
}

function BotMessage({ text, isUser }) {
  if (isUser) return <span>{text}</span>;

  // Render formatted bot messages (bold, links, newlines)
  const lines = text.split('\n');
  return (
    <span className="whitespace-pre-wrap">
      {lines.map((line, i) => {
        // Bold text: **text**
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <span key={i}>
            {parts.map((part, j) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>;
              }
              // Links: https://...
              const linkParts = part.split(/(https?:\/\/[^\s]+)/g);
              return linkParts.map((lp, k) => {
                if (lp.match(/^https?:\/\//)) {
                  return (
                    <a key={k} href={lp} target="_blank" rel="noopener noreferrer"
                      className="text-brand-blue-500 underline hover:text-brand-blue-600 break-all">
                      IRS.gov Link
                    </a>
                  );
                }
                return <span key={k}>{lp}</span>;
              });
            })}
            {i < lines.length - 1 && '\n'}
          </span>
        );
      })}
    </span>
  );
}

export default function TaxBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [messages, setMessages] = useState([
    {
      from: 'bot',
      text: `Hi! I'm ${BOT_NAME}, your tax assistant at Richards Tax NY. How can I help you today?`,
    },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  // Nudge message after 15 seconds of inactivity
  useEffect(() => {
    if (isOpen || nudgeDismissed) return;
    const timer = setTimeout(() => setShowNudge(true), 15000);
    return () => clearTimeout(timer);
  }, [isOpen, nudgeDismissed]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function getResponse(text) {
    const lower = text.toLowerCase();

    // Check if this is an IRS form/process query — search IRS first
    const irsTerms = ['w-2', 'w2', '1040', '1099', '1098', '1095', '4868', 'schedule',
      'k-1', 'k1', '941', '1120', '1065', 'form', 'irs', 'file tax', 'filing',
      'refund', 'transcript', 'payment plan', 'amend', 'ein', 'estimated tax',
      'identity theft', 'bracket', 'deduction', 'standard deduction', 'eitc',
      'child tax credit', 'self-employment', 'sole proprietor', 'quarterly'];

    const isIRSQuery = irsTerms.some((term) => lower.includes(term));

    if (isIRSQuery) {
      const irsResponse = await searchIRS(text);
      if (irsResponse) return irsResponse;
    }

    // Try local knowledge base
    const localResponse = getLocalResponse(text);
    if (localResponse) return localResponse;

    // If not an IRS query, still try IRS as fallback
    if (!isIRSQuery) {
      const irsResponse = await searchIRS(text);
      if (irsResponse) return irsResponse;
    }

    // Default fallback
    return `Great question! I searched our knowledge base and the IRS database but couldn't find an exact match. For personalized help, please visit our Contact page or call us at (718) 622-4951. You can also check our Help Center for common tax questions!`;
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { from: 'user', text: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    // Show typing indicator
    setMessages((prev) => [...prev, { from: 'bot', text: '...', typing: true }]);

    const botResponse = await getResponse(userMsg.text);

    // Replace typing indicator with response
    setMessages((prev) => [
      ...prev.filter((m) => !m.typing),
      { from: 'bot', text: botResponse },
    ]);
  }

  async function handleQuickAction(text) {
    setMessages((prev) => [...prev, { from: 'user', text }]);
    setMessages((prev) => [...prev, { from: 'bot', text: '...', typing: true }]);

    const botResponse = await getResponse(text);

    setMessages((prev) => [
      ...prev.filter((m) => !m.typing),
      { from: 'bot', text: botResponse },
    ]);
  }

  return (
    <>
      {/* Nudge Bubble */}
      {!isOpen && showNudge && !nudgeDismissed && (
        <div className="fixed bottom-20 right-6 z-50 max-w-[240px] animate-bounce-in">
          <div className="relative bg-white rounded-xl shadow-lg border border-gray-200 px-4 py-3">
            <button
              onClick={() => setNudgeDismissed(true)}
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-300 text-xs"
              aria-label="Dismiss"
            >
              &times;
            </button>
            <p className="text-sm text-gray-700">
              Have tax questions? I can help!
            </p>
          </div>
          <div className="absolute -bottom-1.5 right-8 w-3 h-3 bg-white border-r border-b border-gray-200 rotate-45" />
        </div>
      )}

      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => { setIsOpen(true); setShowNudge(false); setNudgeDismissed(true); }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-brand-blue-500 px-5 py-3 text-white shadow-lg hover:bg-brand-blue-600 transition-all duration-300 hover:scale-105 group"
          aria-label="Open TaxWise assistant"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
            />
          </svg>
          <span className="font-semibold text-sm">{BOT_NAME}</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] max-h-[520px] flex flex-col rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden animate-in">
          {/* Header */}
          <div className="bg-brand-blue-500 px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">{BOT_NAME}</h3>
                <p className="text-brand-blue-100 text-xs">Tax Assistant</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Close assistant"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50 min-h-0" style={{ maxHeight: '320px' }}>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.from === 'user'
                      ? 'bg-brand-blue-500 text-white rounded-br-md'
                      : 'bg-white text-gray-700 border border-gray-200 rounded-bl-md shadow-sm'
                  } ${msg.typing ? 'animate-pulse' : ''}`}
                >
                  {msg.typing ? (
                    <span className="flex gap-1 py-1">
                      <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  ) : (
                    <BotMessage text={msg.text} isUser={msg.from === 'user'} />
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions (only show at start) */}
          {messages.length <= 1 && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-1.5">
              {['What is a W-2?', 'How to file taxes', 'Check my refund', 'Tax brackets 2025'].map(
                (action) => (
                  <button
                    key={action}
                    onClick={() => handleQuickAction(action)}
                    className="text-xs px-3 py-1.5 rounded-full bg-white border border-gray-200 text-brand-blue-500 hover:bg-brand-blue-50 transition-colors"
                  >
                    {action}
                  </button>
                )
              )}
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSend} className="px-3 py-3 bg-white border-t border-gray-200 flex gap-2 shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:border-brand-blue-500 focus:ring-1 focus:ring-brand-blue-500/30"
            />
            <button
              type="submit"
              className="rounded-full bg-brand-blue-500 p-2 text-white hover:bg-brand-blue-600 transition-colors"
              aria-label="Send message"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
