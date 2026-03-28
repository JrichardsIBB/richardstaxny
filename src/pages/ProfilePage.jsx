import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAdmin } from '../context/AdminContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'profile', label: 'Profile Info' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'security', label: 'Security' },
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

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const { profile } = useAdmin();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);

  // Profile fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  // Preferences
  const [theme, setTheme] = useState('system');
  const [textSize, setTextSize] = useState(100);
  const [timezone, setTimezone] = useState('America/New_York');

  // Notifications
  const [emailDocProcessed, setEmailDocProcessed] = useState(true);
  const [emailTaxTips, setEmailTaxTips] = useState(true);
  const [emailMarketing, setEmailMarketing] = useState(false);
  const [inAppSystem, setInAppSystem] = useState(true);
  const [inAppMessages, setInAppMessages] = useState(true);
  const [inAppDocuments, setInAppDocuments] = useState(true);

  // Security
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Load profile
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setAddress(profile.address || '');
      setCity(profile.city || '');
      setState(profile.state || '');
      setZip(profile.zip || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  // Load preferences from localStorage
  useEffect(() => {
    if (!user) return;
    const saved = localStorage.getItem(`settings_${user.id}`);
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p.theme) setTheme(p.theme);
        if (p.textSize) setTextSize(p.textSize);
        if (p.timezone) setTimezone(p.timezone);
        if (p.emailDocProcessed !== undefined) setEmailDocProcessed(p.emailDocProcessed);
        if (p.emailTaxTips !== undefined) setEmailTaxTips(p.emailTaxTips);
        if (p.emailMarketing !== undefined) setEmailMarketing(p.emailMarketing);
        if (p.inAppSystem !== undefined) setInAppSystem(p.inAppSystem);
        if (p.inAppMessages !== undefined) setInAppMessages(p.inAppMessages);
        if (p.inAppDocuments !== undefined) setInAppDocuments(p.inAppDocuments);
      } catch { /* ignore */ }
    }
  }, [user]);

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          zip: zip.trim(),
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (error) throw error;
      toast.success('Profile saved!');
    } catch (err) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `avatars/${user.id}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('client-documents')
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from('client-documents')
        .getPublicUrl(path);

      setAvatarUrl(urlData.publicUrl);
      toast.success('Avatar uploaded!');
    } catch (err) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  }

  function handleSavePreferences() {
    setSaving(true);
    localStorage.setItem(`settings_${user.id}`, JSON.stringify({
      theme, textSize, timezone,
      emailDocProcessed, emailTaxTips, emailMarketing,
      inAppSystem, inAppMessages, inAppDocuments,
    }));
    // Apply theme
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else if (theme === 'light') document.documentElement.classList.remove('dark');
    else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    }
    document.documentElement.style.fontSize = `${textSize}%`;
    setTimeout(() => { setSaving(false); toast.success('Preferences saved!'); }, 300);
  }

  async function handleUpdatePassword(e) {
    e.preventDefault();
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) { toast.error('Password needs uppercase, lowercase, and number'); return; }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) { toast.error('Password needs at least one special character'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password updated!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  const initials = fullName
    ? fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || '?';

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
    : '—';

  // Password strength checks
  const has8Chars = newPassword.length >= 8;
  const hasNumber = /\d/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

  function Checkbox({ checked, onChange, label, description }) {
    return (
      <label className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-blue-500 focus:ring-brand-blue-500"
        />
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
      </label>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="mx-auto max-w-4xl px-4">
        <div className="flex gap-6">
          {/* Left Sidebar */}
          <div className="w-72 shrink-0 space-y-4">
            {/* User Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-4">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-brand-blue-500 flex items-center justify-center text-white font-bold text-lg">
                    {initials}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{fullName || 'Set your name'}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-center">
                  <p className="text-[10px] text-gray-400 uppercase">Role</p>
                  <p className="text-sm font-semibold text-gray-900 capitalize">{profile?.role?.replace('_', ' ') || 'Member'}</p>
                </div>
                <div className="flex-1 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-center">
                  <p className="text-[10px] text-gray-400 uppercase">Member since</p>
                  <p className="text-sm font-semibold text-gray-900">{memberSince}</p>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors border-l-4 ${
                    activeTab === tab.id
                      ? 'bg-brand-blue-500 text-white border-brand-blue-600'
                      : 'text-gray-700 hover:bg-gray-50 border-transparent'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right Content */}
          <div className="flex-1 space-y-6">
            {/* Profile Info Tab */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-5">Profile Info</h2>

                {/* Avatar Upload */}
                <div className="mb-5">
                  <p className="text-sm font-medium text-gray-700 mb-2">Avatar</p>
                  <div className="flex items-center gap-4">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
                    ) : (
                      <div className="h-14 w-14 rounded-full bg-brand-blue-100 flex items-center justify-center text-brand-blue-600 font-bold text-lg">
                        {initials}
                      </div>
                    )}
                    <label className="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                      {uploading ? 'Uploading...' : 'Choose file'}
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
                    </label>
                    {!avatarUrl && <span className="text-xs text-gray-400">No file chosen</span>}
                  </div>
                </div>

                {/* Full Name */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="First and Last Name"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-blue-500 focus:outline-none focus:ring-2 focus:ring-brand-blue-500/20" />
                </div>

                {/* Phone */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-blue-500 focus:outline-none focus:ring-2 focus:ring-brand-blue-500/20" />
                </div>

                {/* Address */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Street address</label>
                  <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, Apt 4B"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-blue-500 focus:outline-none focus:ring-2 focus:ring-brand-blue-500/20" />
                </div>

                {/* City / State / Zip */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Brooklyn"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-blue-500 focus:outline-none focus:ring-2 focus:ring-brand-blue-500/20" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input type="text" value={state} onChange={(e) => setState(e.target.value)} placeholder="NY" maxLength={2}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-blue-500 focus:outline-none focus:ring-2 focus:ring-brand-blue-500/20" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                    <input type="text" value={zip} onChange={(e) => setZip(e.target.value)} placeholder="11205" maxLength={10}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-blue-500 focus:outline-none focus:ring-2 focus:ring-brand-blue-500/20" />
                  </div>
                </div>

                <button type="submit" disabled={saving}
                  className="rounded-lg bg-brand-blue-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue-600 disabled:opacity-50 transition">
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </form>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <>
                {/* Appearance */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-5">Appearance</h2>

                  <div className="rounded-lg border border-gray-200 p-4 mb-5">
                    <p className="text-sm font-medium text-gray-900 mb-3">Theme</p>
                    <div className="grid grid-cols-3 gap-2">
                      {['light', 'dark', 'system'].map((t) => (
                        <button key={t} onClick={() => setTheme(t)}
                          className={`rounded-lg border-2 px-4 py-2.5 text-sm font-medium capitalize transition-all ${
                            theme === t ? 'border-brand-blue-500 bg-white text-brand-blue-600 shadow-sm' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          }`}>
                          {t}{t === 'system' && <span className="ml-1 text-xs text-gray-400">(default)</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Text Size (Accessibility)</p>
                        <p className="text-xs text-gray-500">Adjust UI text size without affecting layout.</p>
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{textSize}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="range" min={85} max={130} step={5} value={textSize}
                        onChange={(e) => setTextSize(parseInt(e.target.value))}
                        className="flex-1 accent-brand-blue-500" />
                      <button onClick={() => setTextSize(100)} className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 transition">Reset</button>
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-gray-400">
                      <span>85%</span><span>100%</span><span>130%</span>
                    </div>
                  </div>
                </div>

                {/* Region */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Region</h2>
                  <div className="rounded-lg border border-gray-200 p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time zone</label>
                    <select value={timezone} onChange={(e) => setTimezone(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-blue-500 focus:outline-none focus:ring-2 focus:ring-brand-blue-500/20">
                      {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                  </div>
                </div>

                {/* Notifications */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-2">Notifications</h2>

                  <p className="text-sm font-semibold text-gray-700 mt-4 mb-3">Email Preferences</p>
                  <div className="space-y-2">
                    <Checkbox checked={emailDocProcessed} onChange={setEmailDocProcessed}
                      label="Document Updates" description="Get notified when your documents are processed or reviewed" />
                    <Checkbox checked={emailTaxTips} onChange={setEmailTaxTips}
                      label="Tax Tips & Education" description="Receive tips, deadlines, and tax planning advice" />
                    <Checkbox checked={emailMarketing} onChange={setEmailMarketing}
                      label="Marketing Communications" description="Get special offers, promotions, and announcements" />
                  </div>

                  <p className="text-sm font-semibold text-gray-700 mt-6 mb-3">In-App Notifications</p>
                  <div className="space-y-2">
                    <Checkbox checked={inAppSystem} onChange={setInAppSystem}
                      label="System Updates" description="Important system announcements, maintenance alerts, and platform updates" />
                    <Checkbox checked={inAppMessages} onChange={setInAppMessages}
                      label="Messages" description="New messages from Richards Tax NY staff" />
                    <Checkbox checked={inAppDocuments} onChange={setInAppDocuments}
                      label="Document Activity" description="Updates when documents are uploaded, processed, or reviewed" />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button onClick={handleSavePreferences} disabled={saving}
                    className="rounded-lg bg-brand-blue-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue-600 disabled:opacity-50 transition">
                    {saving ? 'Saving...' : 'Save preferences'}
                  </button>
                  <p className="text-xs text-gray-400">Essential account notifications will still be sent.</p>
                </div>
              </>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <>
                <form onSubmit={handleUpdatePassword} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-1">Security</h2>
                  <p className="text-sm text-gray-500 mb-5">Change Password</p>
                  <p className="text-xs text-gray-400 mb-4">Update your password to keep your account secure. Make sure to use a strong password.</p>

                  {/* New Password */}
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-10 text-sm focus:border-brand-blue-500 focus:outline-none focus:ring-2 focus:ring-brand-blue-500/20" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          {showPassword
                            ? <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                            : <><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>
                          }
                        </svg>
                      </button>
                    </div>

                    {/* Password requirements */}
                    {newPassword && (
                      <div className="mt-2 space-y-1 text-xs">
                        <p className={has8Chars ? 'text-green-600' : 'text-gray-400'}>
                          {has8Chars ? '\u2713' : '\u00D7'} At least 8 characters
                        </p>
                        <p className={hasNumber ? 'text-green-600' : 'text-gray-400'}>
                          {hasNumber ? '\u2713' : '\u00D7'} At least one number
                        </p>
                        <p className={hasSpecial ? 'text-green-600' : 'text-gray-400'}>
                          {hasSpecial ? '\u2713' : '\u00D7'} At least one special character
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
                    <div className="relative">
                      <input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your new password"
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-10 text-sm focus:border-brand-blue-500 focus:outline-none focus:ring-2 focus:ring-brand-blue-500/20" />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          {showConfirm
                            ? <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                            : <><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>
                          }
                        </svg>
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={saving || !newPassword || !confirmPassword}
                    className="rounded-lg bg-brand-blue-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue-600 disabled:opacity-50 transition">
                    {saving ? 'Updating...' : 'Update password'}
                  </button>
                  {(!newPassword || !confirmPassword) && (
                    <p className="text-xs text-gray-400 mt-2">Enter all fields to enable.</p>
                  )}

                  {/* Security Tips */}
                  <div className="mt-6 rounded-lg bg-brand-blue-50 border border-brand-blue-200 p-4">
                    <div className="flex items-start gap-2">
                      <svg className="h-5 w-5 text-brand-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-brand-blue-700">Password Security Tips</p>
                        <ul className="mt-1 text-xs text-brand-blue-600 space-y-0.5 list-disc list-inside">
                          <li>Use a unique password you don't use elsewhere</li>
                          <li>Avoid using personal information like birthdays or names</li>
                          <li>Consider using a password manager for stronger security</li>
                          <li>Update your password regularly for best security</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </form>

                {/* Sign Out */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-start gap-3">
                    <svg className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Sign Out</p>
                      <p className="text-xs text-gray-500 mt-0.5 mb-3">Sign out of your account on this device.</p>
                      <button onClick={signOut}
                        className="rounded-lg bg-red-500 px-5 py-2 text-sm font-semibold text-white hover:bg-red-600 transition">
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
