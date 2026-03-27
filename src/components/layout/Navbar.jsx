import { useState } from 'react';
import { NavLink, Link } from 'react-router';
import { useAuth } from '../../context/AuthContext';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/services', label: 'Services' },
  { to: '/about', label: 'About' },
  { to: '/resources', label: 'Resources' },
  { to: '/contact', label: 'Contact' },
];

function NavItem({ to, label, onClick }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        `transition-colors duration-200 ${
          isActive
            ? 'text-brand-blue-500 font-semibold'
            : 'text-gray-700 hover:text-brand-blue-500'
        }`
      }
    >
      {label}
    </NavLink>
  );
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();

  const closeMobile = () => setMobileOpen(false);

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="shrink-0">
            <img
              src="/assets/RichardsTaxNY-01.svg"
              alt="Richards Tax NY"
              className="h-14 w-auto"
            />
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <NavItem key={link.to} to={link.to} label={link.label} />
            ))}
          </div>

          {/* Desktop auth buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <button
                onClick={signOut}
                className="rounded-lg bg-brand-red-400 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-red-500"
              >
                Sign Out
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-brand-blue-500 transition-colors hover:bg-brand-blue-50"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="rounded-lg bg-brand-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-blue-600"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100 focus:outline-none"
            aria-label="Toggle menu"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-4 pt-2 space-y-2">
          {navLinks.map((link) => (
            <div key={link.to}>
              <NavItem to={link.to} label={link.label} onClick={closeMobile} />
            </div>
          ))}
          <div className="border-t border-gray-100 pt-3 flex flex-col gap-2">
            {user ? (
              <button
                onClick={() => {
                  signOut();
                  closeMobile();
                }}
                className="rounded-lg bg-brand-red-400 px-4 py-2 text-sm font-medium text-white text-center"
              >
                Sign Out
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={closeMobile}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-brand-blue-500 text-center hover:bg-brand-blue-50"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={closeMobile}
                  className="rounded-lg bg-brand-blue-500 px-4 py-2 text-sm font-medium text-white text-center"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
