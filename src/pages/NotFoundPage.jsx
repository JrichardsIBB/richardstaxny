import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-7xl font-extrabold text-brand-blue-500">404</h1>
      <h2 className="mt-4 text-2xl font-bold text-gray-900">Page Not Found</h2>
      <p className="mt-2 text-gray-600">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex items-center rounded-lg bg-brand-blue-500 px-6 py-3 font-semibold text-white transition hover:bg-brand-blue-600"
      >
        Back to Home
      </Link>
    </div>
  );
}
