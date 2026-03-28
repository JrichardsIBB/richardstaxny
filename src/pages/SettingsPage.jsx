import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'notifications', label: 'Notifications' },
  { id: 'preferences', label: 'Preferences' },
];

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Phoenix',
  'America/Detroit',
  'America/Indiana/Indianapolis',
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('notifications');
  const [saving, setSaving] = useState(false);

  // Notification settings
  const [emailDocUploaded, setEmailDocUploaded] = useState(true);
  const [emailDocProcessed, setEmailDocProcessed] = useState(true);
  const [emailDocReviewed, setEmailDocReviewed] = useState(true);
  const [emailNewsletter, setEmailNewsletter] = useState(false);
  const [emailReminders, setEmailReminders] = useState(true);

  // Preference settings
  const [theme, setTheme] = useState('system');
  const [textSize, setTextSize] = useState(100);
  const [timezone, setTimezone] = useState('America/New_York');

  // Load saved settings from localStorage
  useEffect(() => {
    if (!user) return;
    const key = `settings_${user.id}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.emailDocUploaded !== undefined) setEmailDocUploaded(parsed.emailDocUploaded);
        if (parsed.emailDocProcessed !== undefined) setEmailDocProcessed(parsed.emailDocProcessed);
        if (parsed.emailDocReviewed !== undefined) setEmailDocReviewed(parsed.emailDocReviewed);
        if (parsed.emailNewsletter !== undefined) setEmailNewsletter(parsed.emailNewsletter);
        if (parsed.emailReminders !== undefined) setEmailReminders(parsed.emailReminders);
        if (parsed.theme) setTheme(parsed.theme);
        if (parsed.textSize) setTextSize(parsed.textSize);
        if (parsed.timezone) setTimezone(parsed.timezone);
      } catch {
        // Ignore
      }
    }

    // Apply saved theme
    const savedTheme = localStorage.getItem(`theme_${user.id}`);
    if (savedTheme) setTheme(savedTheme);

    // Apply saved text size
    const savedSize = localStorage.getItem(`textSize_${user.id}`);
    if (savedSize) {
      setTextSize(parseInt(savedSize));
      document.documentElement.style.fontSize = `${savedSize}%`;
    }
  }, [user]);

  function applyTheme(newTheme) {
    setTheme(newTheme);
    localStorage.setItem(`theme_${user.id}`, newTheme);

    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (newTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // System
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }

  function applyTextSize(size) {
    setTextSize(size);
    localStorage.setItem(`textSize_${user.id}`, size);
    document.documentElement.style.fontSize = `${size}%`;
  }

  function handleSave() {
    setSaving(true);
    const key = `settings_${user.id}`;
    const settings = {
      emailDocUploaded,
      emailDocProcessed,
      emailDocReviewed,
      emailNewsletter,
      emailReminders,
      theme,
      textSize,
      timezone,
    };
    localStorage.setItem(key, JSON.stringify(settings));

    setTimeout(() => {
      setSaving(false);
      toast.success('Settings saved!');
    }, 300);
  }

  function ToggleSwitch({ enabled, onChange, label, description }) {
    return (
      <div className="flex items-center justify-between py-3">
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
        <button
          type="button"
          onClick={() => onChange(!enabled)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
            enabled ? 'bg-brand-blue-500' : 'bg-gray-200'
          }`}
          role="switch"
          aria-checked={enabled}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="mx-auto max-w-3xl px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Settings</h1>

        <div className="flex gap-6">
          {/* Sidebar Tabs */}
          <div className="w-48 shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-brand-blue-500 text-white'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Notifications</h2>
                <p className="text-sm text-gray-500 mb-5">Choose what email notifications you receive.</p>

                <div className="divide-y divide-gray-100">
                  <ToggleSwitch
                    enabled={emailDocUploaded}
                    onChange={setEmailDocUploaded}
                    label="Document uploaded"
                    description="Get notified when a document is successfully uploaded"
                  />
                  <ToggleSwitch
                    enabled={emailDocProcessed}
                    onChange={setEmailDocProcessed}
                    label="Document processed"
                    description="Get notified when AI finishes processing your document"
                  />
                  <ToggleSwitch
                    enabled={emailDocReviewed}
                    onChange={setEmailDocReviewed}
                    label="Document reviewed"
                    description="Get notified when your document has been reviewed by staff"
                  />
                  <ToggleSwitch
                    enabled={emailReminders}
                    onChange={setEmailReminders}
                    label="Tax deadline reminders"
                    description="Receive reminders about upcoming tax deadlines"
                  />
                  <ToggleSwitch
                    enabled={emailNewsletter}
                    onChange={setEmailNewsletter}
                    label="Newsletter & tips"
                    description="Receive occasional tax tips and updates"
                  />
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-lg bg-brand-blue-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-blue-600 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="space-y-6">
                {/* Appearance */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">Preferences</h2>
                  <p className="text-sm text-gray-500 mb-5">Appearance</p>

                  {/* Theme */}
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-5">
                    <p className="text-sm font-medium text-gray-900 mb-3">Theme</p>
                    <div className="grid grid-cols-3 gap-2">
                      {['light', 'dark', 'system'].map((t) => (
                        <button
                          key={t}
                          onClick={() => applyTheme(t)}
                          className={`rounded-lg border-2 px-4 py-2.5 text-sm font-medium capitalize transition-all ${
                            theme === t
                              ? 'border-brand-blue-500 bg-white text-brand-blue-600 shadow-sm'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {t}
                          {t === 'system' && (
                            <span className="ml-1 text-xs text-gray-400">(default)</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Text Size */}
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Text Size (Accessibility)</p>
                        <p className="text-xs text-gray-500">Adjust UI text size without affecting layout.</p>
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{textSize}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={85}
                        max={130}
                        step={5}
                        value={textSize}
                        onChange={(e) => applyTextSize(parseInt(e.target.value))}
                        className="flex-1 accent-brand-blue-500"
                      />
                      <button
                        onClick={() => applyTextSize(100)}
                        className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
                      >
                        Reset
                      </button>
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-gray-400">
                      <span>85%</span>
                      <span>100%</span>
                      <span>130%</span>
                    </div>
                  </div>
                </div>

                {/* Region */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                    <p className="text-sm font-medium text-gray-900 mb-3">Region</p>
                    <div>
                      <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">
                        Time zone
                      </label>
                      <select
                        id="timezone"
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-blue-500 focus:outline-none focus:ring-2 focus:ring-brand-blue-500/20"
                      >
                        {TIMEZONES.map((tz) => (
                          <option key={tz} value={tz}>{tz}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="rounded-lg bg-brand-blue-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-blue-600 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
