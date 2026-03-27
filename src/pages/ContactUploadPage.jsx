import { useState } from 'react';
import { Link } from 'react-router';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import DocumentUploader from '../components/DocumentUploader';

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function ContactUploadPage() {
  const { user, loading: authLoading } = useAuth();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  }

  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = 'Name is required';
    if (!form.email.trim()) {
      next.email = 'Email is required';
    } else if (!validateEmail(form.email)) {
      next.email = 'Please enter a valid email address';
    }
    if (!form.message.trim()) next.message = 'Message is required';
    return next;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('contact_submissions').insert({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        message: form.message.trim(),
      });
      if (error) throw error;

      toast.success('Message sent! We will get back to you soon.');
      setForm({ name: '', email: '', phone: '', message: '' });
      setErrors({});
    } catch (err) {
      toast.error(err.message || 'Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* Page Header */}
      <section className="bg-brand-blue-500 py-16">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h1 className="text-4xl font-extrabold text-white">Contact Us</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90">
            Have a question or ready to get started? Reach out and we will be
            happy to help.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid gap-12 lg:grid-cols-2">
          {/* Section A: Contact Form */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Send Us a Message
            </h2>

            <Card>
              <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                  label="Name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  error={errors.name}
                  placeholder="Your full name"
                  required
                />
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  error={errors.email}
                  placeholder="you@example.com"
                  required
                />
                <Input
                  label="Phone (optional)"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="(555) 123-4567"
                />
                <Input
                  label="Message"
                  name="message"
                  type="textarea"
                  value={form.message}
                  onChange={handleChange}
                  error={errors.message}
                  placeholder="How can we help you?"
                  required
                />
                <Button type="submit" loading={submitting} className="w-full">
                  Send Message
                </Button>
              </form>
            </Card>
          </div>

          {/* Section B: Document Upload */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Upload Documents
            </h2>

            {authLoading ? (
              <Card className="flex items-center justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-blue-500 border-t-transparent" />
              </Card>
            ) : user ? (
              <DocumentUploader />
            ) : (
              <Card className="text-center py-12">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-blue-50 text-brand-blue-500">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Secure Document Upload
                </h3>
                <p className="mt-2 text-gray-600">
                  Log in to securely upload your tax documents.
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                  <Link
                    to="/login"
                    className="inline-flex items-center rounded-lg bg-brand-blue-500 px-5 py-2.5 font-semibold text-white transition hover:bg-brand-blue-600"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/signup"
                    className="inline-flex items-center rounded-lg border border-brand-blue-500 bg-white px-5 py-2.5 font-semibold text-brand-blue-500 transition hover:bg-brand-blue-50"
                  >
                    Sign Up
                  </Link>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
