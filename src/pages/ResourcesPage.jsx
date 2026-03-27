import { FaCalendarAlt, FaExternalLinkAlt, FaLightbulb } from 'react-icons/fa';
import { taxDeadlines, taxTips, helpfulLinks } from '../constants/resources';
import Card from '../components/ui/Card';

export default function ResourcesPage() {
  return (
    <div>
      {/* Page Header */}
      <section className="bg-brand-blue-500 py-16">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h1 className="text-4xl font-extrabold text-white">Resources</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90">
            Important dates, helpful tips, and useful links to keep you informed
            throughout the year.
          </p>
        </div>
      </section>

      {/* Tax Deadlines */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="flex items-center gap-3 mb-8">
          <FaCalendarAlt className="h-6 w-6 text-brand-blue-500" />
          <h2 className="text-2xl font-bold text-gray-900">
            Key Tax Deadlines
          </h2>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-brand-blue-50">
                <th className="px-6 py-3 text-sm font-semibold text-brand-blue-700">
                  Date
                </th>
                <th className="px-6 py-3 text-sm font-semibold text-brand-blue-700">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {taxDeadlines.map((deadline, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {deadline.date}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {deadline.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Tax Tips */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-center gap-3 mb-8">
            <FaLightbulb className="h-6 w-6 text-brand-blue-500" />
            <h2 className="text-2xl font-bold text-gray-900">Tax Tips</h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {taxTips.map((tip, idx) => (
              <Card key={idx}>
                <h3 className="text-lg font-semibold text-gray-900">
                  {tip.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  {tip.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Helpful Links */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="flex items-center gap-3 mb-8">
          <FaExternalLinkAlt className="h-5 w-5 text-brand-blue-500" />
          <h2 className="text-2xl font-bold text-gray-900">Helpful Links</h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {helpfulLinks.map((link, idx) => (
            <a
              key={idx}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group"
            >
              <Card className="h-full transition group-hover:shadow-lg group-hover:border-brand-blue-200">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-brand-blue-500 group-hover:underline">
                  {link.title}
                  <FaExternalLinkAlt className="h-3 w-3 opacity-60" />
                </h3>
                <p className="mt-2 text-sm text-gray-600">{link.description}</p>
              </Card>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
