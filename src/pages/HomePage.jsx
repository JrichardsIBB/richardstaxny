import { Link } from 'react-router';
import { FaCertificate, FaHeadset, FaLock } from 'react-icons/fa';
import { services } from '../constants/services';
import Card from '../components/ui/Card';

const whyUs = [
  {
    icon: FaCertificate,
    title: 'Licensed & Certified',
    description:
      'Our team of licensed professionals stays current with ever-changing tax laws to deliver accurate, compliant returns every time.',
  },
  {
    icon: FaHeadset,
    title: 'Year-Round Support',
    description:
      'Tax season or not, we are here for you. Get expert guidance and answers to your questions any time of the year.',
  },
  {
    icon: FaLock,
    title: 'Secure & Confidential',
    description:
      'Your personal and financial information is protected with industry-standard encryption and strict confidentiality practices.',
  },
];

export default function HomePage() {
  const previewServices = services.slice(0, 4);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/assets/hero-bg.png')" }}
        />
        {/* Blue overlay at 40% opacity */}
        <div className="absolute inset-0 bg-brand-blue-500/40" />

        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:py-32 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Expert Tax Services in New York
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/90 sm:text-xl">
            Trusted tax preparation, planning, and advisory services for
            individuals and businesses across New York. Let us handle the
            numbers so you can focus on what matters most.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/services"
              className="inline-flex items-center rounded-lg bg-white px-6 py-3 font-semibold text-brand-blue-500 shadow transition hover:bg-gray-100"
            >
              Our Services
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center rounded-lg bg-brand-red-400 px-6 py-3 font-semibold text-white shadow transition hover:bg-brand-red-600"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* Services Preview */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">What We Offer</h2>
          <p className="mt-3 text-gray-600">
            Comprehensive tax and financial services tailored to your needs.
          </p>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {previewServices.map((service) => {
            const Icon = service.icon;
            return (
              <Card key={service.id} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-blue-50 text-brand-blue-500">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {service.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  {service.description}
                </p>
              </Card>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/services"
            className="font-semibold text-brand-blue-500 hover:underline"
          >
            View All Services &rarr;
          </Link>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Why Choose Richards Tax NY
          </h2>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {whyUs.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-blue-500 text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-brand-blue-700 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold text-white">
            Ready to file? Let&rsquo;s get started.
          </h2>
          <p className="mt-3 text-white/80">
            Contact us today and take the stress out of tax season.
          </p>
          <Link
            to="/contact"
            className="mt-8 inline-flex items-center rounded-lg bg-brand-red-400 px-7 py-3 font-semibold text-white shadow transition hover:bg-brand-red-600"
          >
            Contact Us
          </Link>
        </div>
      </section>
    </div>
  );
}
