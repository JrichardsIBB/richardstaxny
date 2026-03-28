import { useState } from 'react';
import { Link } from 'react-router';

const categories = [
  { id: 'tax-basics', label: 'Tax Basics' },
  { id: 'filing', label: 'Filing & Deadlines' },
  { id: 'deductions', label: 'Deductions & Credits' },
  { id: 'business', label: 'Business Taxes' },
  { id: 'using-site', label: 'Using This Site' },
];

const faqs = [
  // Tax Basics
  {
    category: 'tax-basics',
    question: 'What documents do I need to file my taxes?',
    answer:
      'Common documents include your W-2 (from employers), 1099 forms (for freelance/contract income, interest, dividends), Social Security statements, mortgage interest statements (1098), property tax records, charitable donation receipts, and a valid photo ID. If you have investments, you may also need brokerage statements.',
  },
  {
    category: 'tax-basics',
    question: 'What is the difference between a W-2 and a 1099?',
    answer:
      'A W-2 is issued by employers to employees and shows wages earned and taxes withheld. A 1099 is used for other types of income such as freelance work (1099-NEC), interest (1099-INT), dividends (1099-DIV), or miscellaneous income. If you receive a 1099, taxes are typically not withheld and you may owe self-employment tax.',
  },
  {
    category: 'tax-basics',
    question: 'Do I need to file taxes if I earned very little income?',
    answer:
      'Filing requirements depend on your filing status, age, and income level. For 2025, single filers under 65 generally must file if gross income exceeds $14,600. However, even if you are not required to file, you may want to if you had taxes withheld or qualify for refundable credits like the Earned Income Tax Credit.',
  },
  {
    category: 'tax-basics',
    question: 'What is adjusted gross income (AGI)?',
    answer:
      'AGI is your total gross income minus specific deductions like student loan interest, IRA contributions, and self-employment tax. Your AGI is used to determine eligibility for many tax credits and deductions. You can find your AGI on line 11 of your Form 1040.',
  },

  // Filing & Deadlines
  {
    category: 'filing',
    question: 'When is the tax filing deadline?',
    answer:
      'The federal tax filing deadline is typically April 15th each year. If April 15th falls on a weekend or holiday, the deadline is extended to the next business day. You can request a 6-month extension (until October 15th), but this only extends the filing deadline, not the payment deadline.',
  },
  {
    category: 'filing',
    question: 'What happens if I miss the filing deadline?',
    answer:
      'If you owe taxes, you may face a failure-to-file penalty (5% of unpaid taxes per month, up to 25%) and a failure-to-pay penalty (0.5% per month). Interest also accrues on unpaid taxes. If you are owed a refund, there is no penalty for filing late, but you should file within 3 years to claim your refund.',
  },
  {
    category: 'filing',
    question: 'Should I file jointly or separately with my spouse?',
    answer:
      'In most cases, filing jointly results in lower taxes due to higher income thresholds, more deductions, and access to more credits. However, filing separately may be beneficial if one spouse has significant medical expenses, student loan payments under income-driven repayment, or if you want to keep finances separate. We can help you compare both options.',
  },
  {
    category: 'filing',
    question: 'Can I amend my tax return if I made a mistake?',
    answer:
      'Yes, you can file an amended return using Form 1040-X. You generally have 3 years from the original filing date to amend. Common reasons include unreported income, incorrect filing status, or missed deductions and credits. Contact us and we can help you file the amendment.',
  },

  // Deductions & Credits
  {
    category: 'deductions',
    question: 'What is the standard deduction for this year?',
    answer:
      'For 2025, the standard deduction is $15,000 for single filers, $30,000 for married filing jointly, and $22,500 for head of household. If you are 65 or older or blind, you may qualify for an additional standard deduction amount. You should itemize only if your deductions exceed the standard deduction.',
  },
  {
    category: 'deductions',
    question: 'What expenses can I deduct?',
    answer:
      'Common deductions include mortgage interest, state and local taxes (up to $10,000), charitable contributions, medical expenses exceeding 7.5% of AGI, student loan interest (up to $2,500), and educator expenses. Business owners can deduct business expenses, home office costs, vehicle expenses, and health insurance premiums.',
  },
  {
    category: 'deductions',
    question: 'What is the Earned Income Tax Credit (EITC)?',
    answer:
      'The EITC is a refundable tax credit for low-to-moderate income workers. The amount depends on your income, filing status, and number of qualifying children. For 2025, the maximum credit ranges from about $632 (no children) to $7,830 (three or more children). Even if you owe no tax, you can receive the EITC as a refund.',
  },
  {
    category: 'deductions',
    question: 'Can I claim the Child Tax Credit?',
    answer:
      'You may claim up to $2,000 per qualifying child under age 17. The credit begins to phase out at $200,000 for single filers ($400,000 for joint filers). Up to $1,700 of the credit is refundable as the Additional Child Tax Credit, meaning you can receive it even if you owe no tax.',
  },

  // Business Taxes
  {
    category: 'business',
    question: 'Do I need to file quarterly estimated taxes?',
    answer:
      'If you expect to owe $1,000 or more in taxes and your income is not subject to withholding (self-employment, investments, etc.), you should file quarterly estimated taxes. The due dates are April 15, June 15, September 15, and January 15. Failure to pay estimated taxes can result in penalties.',
  },
  {
    category: 'business',
    question: 'What business expenses can I write off?',
    answer:
      'Common deductible business expenses include office rent, utilities, supplies, business insurance, marketing costs, professional services, travel, meals (50% deductible), vehicle expenses, equipment, software, and employee wages. You must keep accurate records and receipts for all deductions.',
  },
  {
    category: 'business',
    question: 'Should I choose an LLC, S-Corp, or C-Corp?',
    answer:
      'Each entity type has different tax implications. An LLC offers flexibility and pass-through taxation. An S-Corp can help reduce self-employment taxes for profitable businesses. A C-Corp has its own tax rate (21%) but may result in double taxation on dividends. We can help you choose the best structure for your situation.',
  },
  {
    category: 'business',
    question: 'What is the Qualified Business Income (QBI) deduction?',
    answer:
      'The QBI deduction allows eligible self-employed individuals and small business owners to deduct up to 20% of their qualified business income. This applies to pass-through entities like sole proprietorships, partnerships, S-Corps, and some trusts. Income limits and other restrictions may apply depending on your business type.',
  },

  // Using This Site
  {
    category: 'using-site',
    question: 'How do I create an account?',
    answer:
      'Click the "Sign Up" button in the top right corner. Enter your email address and create a password (must be at least 8 characters with uppercase, lowercase, and a number). You will receive a verification email. Click the link in the email to activate your account.',
  },
  {
    category: 'using-site',
    question: 'How do I upload my tax documents?',
    answer:
      'After signing in, go to the Contact page. Scroll down to the "Upload Documents" section. You can drag and drop files or click to browse. We accept PDF, JPG, PNG, Word, and Excel files up to 25 MB each. Your documents are encrypted and stored securely.',
  },
  {
    category: 'using-site',
    question: 'Is my information secure on this site?',
    answer:
      'Absolutely. We use industry-standard encryption (SSL/TLS) for all data in transit. Your uploaded documents are stored in a secure, private cloud storage bucket with row-level security, meaning only you and our authorized team can access your files. We never share your information with third parties.',
  },
  {
    category: 'using-site',
    question: 'How do I contact Richards Tax NY?',
    answer:
      'You can reach us several ways: fill out the contact form on our Contact page, call us at (718) 622-4951, email roy@richardstaxny.com, or visit our office at 182 Hall Street, Brooklyn, NY 11205. Our office hours are Monday through Friday, 10:00 AM to 6:00 PM.',
  },
  {
    category: 'using-site',
    question: 'How long does it take to get my tax return prepared?',
    answer:
      'Once we receive all your documents, a standard individual return typically takes 3-5 business days. Business returns and more complex situations may take 5-10 business days. During peak tax season (February-April), turnaround times may be slightly longer. We will keep you updated on the progress.',
  },
];

function FAQItem({ question, answer }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
        aria-expanded={open}
      >
        <span className="font-medium text-gray-800 pr-4">{question}</span>
        <svg
          className={`h-5 w-5 text-brand-blue-500 shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-4 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-3">
          {answer}
        </div>
      )}
    </div>
  );
}

export default function HelpCenterPage() {
  const [activeCategory, setActiveCategory] = useState('tax-basics');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFaqs = searchQuery.trim()
    ? faqs.filter(
        (faq) =>
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : faqs.filter((faq) => faq.category === activeCategory);

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero */}
      <section className="bg-brand-blue-500 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Help Center
          </h1>
          <p className="text-brand-blue-100 text-lg mb-8">
            Find answers to common tax questions and learn how to use our site.
          </p>

          {/* Search */}
          <div className="relative max-w-xl mx-auto">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search for answers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border-0 py-3.5 pl-12 pr-4 text-gray-800 shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-4xl px-4 py-12">
        {/* Category Tabs */}
        {!searchQuery.trim() && (
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-brand-blue-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Search results label */}
        {searchQuery.trim() && (
          <div className="mb-6 flex items-center justify-between">
            <p className="text-gray-600">
              {filteredFaqs.length} result{filteredFaqs.length !== 1 ? 's' : ''} for{' '}
              <span className="font-semibold text-gray-800">"{searchQuery}"</span>
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-sm text-brand-blue-500 hover:underline"
            >
              Clear search
            </button>
          </div>
        )}

        {/* FAQ List */}
        <div className="space-y-3">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq, idx) => (
              <FAQItem key={idx} question={faq.question} answer={faq.answer} />
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-2">No results found.</p>
              <p className="text-sm text-gray-400">
                Try a different search term or{' '}
                <Link to="/contact" className="text-brand-blue-500 hover:underline">
                  contact us
                </Link>{' '}
                for help.
              </p>
            </div>
          )}
        </div>

        {/* Still need help */}
        <div className="mt-12 bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Still have questions?
          </h2>
          <p className="text-gray-600 mb-6">
            Our team is ready to help. Reach out and we will get back to you promptly.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/contact"
              className="inline-flex items-center justify-center rounded-lg bg-brand-blue-500 px-6 py-2.5 font-semibold text-white transition hover:bg-brand-blue-600"
            >
              Contact Us
            </Link>
            <a
              href="tel:7186224951"
              className="inline-flex items-center justify-center rounded-lg border border-brand-blue-500 px-6 py-2.5 font-semibold text-brand-blue-500 transition hover:bg-brand-blue-50"
            >
              Call (718) 622-4951
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
