import { FaBalanceScale, FaGraduationCap, FaUsers } from 'react-icons/fa';
import Card from '../components/ui/Card';

const values = [
  {
    icon: FaBalanceScale,
    title: 'Integrity',
    description:
      'We uphold the highest ethical standards in every engagement. Honesty and transparency guide every recommendation we make.',
  },
  {
    icon: FaGraduationCap,
    title: 'Expertise',
    description:
      'Our team holds advanced credentials and participates in ongoing education to stay ahead of complex and evolving tax regulations.',
  },
  {
    icon: FaUsers,
    title: 'Client-Focused',
    description:
      'Your goals are our priority. We take the time to understand your unique situation and deliver personalized solutions that work.',
  },
];

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-brand-blue-500 py-16">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h1 className="text-4xl font-extrabold text-white">About Us</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90">
            Dedicated professionals committed to your financial success.
          </p>
        </div>
      </section>

      {/* About */}
      <section className="mx-auto max-w-4xl px-4 py-20">
        <h2 className="text-2xl font-bold text-gray-900">
          About RichardsTaxNY
        </h2>
        <h3 className="mt-2 text-lg font-semibold text-brand-blue-500">
          Our Founder
        </h3>
        <div className="mt-4 space-y-4 text-gray-700 leading-relaxed">
          <p>
            Roy Richards began his journey in accounting at Borough of Manhattan
            Community College, earning his degree before joining H&R Block in
            1985. With over four decades of tax preparation experience, Roy has
            helped countless individuals and businesses navigate their finances
            with confidence.
          </p>
          <p>
            At Richards Tax and Finance Services, Roy is passionate about
            ensuring clients get the maximum return they deserve. He offers not
            only personal and business tax preparation, but also financial
            guidance—helping clients make wise investments and plan for their
            future.
          </p>
          <p>
            Whether you need bookkeeping, tax advice, or help with your business
            returns, Roy brings the same care and expertise to every client. His
            mission is simple: to make taxes stress-free and to help you thrive
            financially.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Our Values
          </h2>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {values.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-blue-500 text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
