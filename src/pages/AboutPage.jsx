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
          Who We Are
        </h2>
        <div className="mt-6 space-y-4 text-gray-700 leading-relaxed">
          <p>
            Richards Tax NY was founded with a simple mission: to provide
            reliable, accurate, and affordable tax services to individuals and
            businesses throughout New York. With over 15 years of experience in
            tax preparation, planning, and advisory, our founder brings deep
            expertise and a genuine passion for helping clients achieve financial
            peace of mind.
          </p>
          <p>
            As a credentialed tax professional (CPA/EA), our founder stays at
            the forefront of federal and New York State tax law, ensuring every
            return is prepared with precision and every strategy is built on
            current regulations. From first-time filers to complex business
            entities, we treat every client with the same level of care and
            attention to detail.
          </p>
          <p>
            Our mission is to make tax season stress-free. We believe everyone
            deserves access to professional tax guidance without the
            intimidation or jargon. Whether you visit us in person or work with
            us remotely, you can count on personalized service and
            straightforward advice.
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
