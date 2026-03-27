import { Link } from 'react-router';
import { services } from '../constants/services';
import Card from '../components/ui/Card';

export default function ServicesPage() {
  return (
    <div>
      {/* Page Header */}
      <section className="bg-brand-blue-500 py-16">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h1 className="text-4xl font-extrabold text-white">Our Services</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90">
            From individual tax returns to business advisory, we provide a full
            range of professional tax and financial services.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid gap-8 sm:grid-cols-2">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <Card key={service.id} className="flex flex-col">
                <div className="mb-4 flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-blue-50 text-brand-blue-500">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {service.title}
                  </h2>
                </div>

                <p className="text-gray-600 leading-relaxed">
                  {service.description}
                </p>

                <ul className="mt-4 space-y-2">
                  {service.details.map((detail) => (
                    <li
                      key={detail}
                      className="flex items-start gap-2 text-sm text-gray-700"
                    >
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-blue-500" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Need help with your taxes?
          </h2>
          <p className="mt-3 text-gray-600">
            Get in touch today and let our experts handle the details.
          </p>
          <Link
            to="/contact"
            className="mt-6 inline-flex items-center rounded-lg bg-brand-red-400 px-7 py-3 font-semibold text-white shadow transition hover:bg-brand-red-600"
          >
            Contact Us
          </Link>
        </div>
      </section>
    </div>
  );
}
