/**
 * Export Clients API — generates CSV matching MyTAXPrepOffice import format
 *
 * MyTAXPrepOffice Client Import fields:
 * - Client (full name)
 * - SSN/EIN
 * - Email Address
 * - Phone
 * - Type (individual/business)
 * - Tag
 * - MyTAXPortal Status
 * - Accessible By
 *
 * Extended fields for new client creation:
 * - First Name
 * - Middle Initial
 * - Last Name
 * - Suffix
 * - Date of Birth
 * - Street Address
 * - Apt No
 * - City
 * - State
 * - Zip Code
 * - Cell Phone
 * - Daytime Phone
 * - Email
 * - Occupation
 * - Filing Status
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyAdmin(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Missing authorization');
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error('Invalid token');
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || !['owner', 'admin', 'tax_agent'].includes(profile.role)) {
    throw new Error('Insufficient permissions');
  }
  return { user, role: profile.role };
}

function splitName(fullName) {
  if (!fullName) return { firstName: '', middleInitial: '', lastName: '' };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], middleInitial: '', lastName: '' };
  if (parts.length === 2) return { firstName: parts[0], middleInitial: '', lastName: parts[1] };
  // Check if middle part is a single letter (initial)
  if (parts[1].length <= 2) {
    return {
      firstName: parts[0],
      middleInitial: parts[1].replace('.', ''),
      lastName: parts.slice(2).join(' '),
    };
  }
  return { firstName: parts[0], middleInitial: '', lastName: parts.slice(1).join(' ') };
}

function escapeCSV(value) {
  const str = String(value || '').replace(/"/g, '""');
  return `"${str}"`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await verifyAdmin(req.headers.authorization);

    const format = req.query.format || 'standard';

    // Fetch all profiles (clients)
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true });

    if (error) throw error;

    let csvContent = '';

    if (format === 'mytaxprepoffice') {
      // MyTAXPrepOffice compatible format
      const headers = [
        'Client', 'SSN/EIN', 'Email Address', 'Phone', 'Type', 'Tag',
        'MyTAXPortal Status', 'Accessible By',
      ];
      csvContent = headers.map(escapeCSV).join(',') + '\n';

      for (const profile of profiles) {
        const row = [
          profile.full_name || '',
          '', // SSN/EIN — not stored in our system for security
          profile.email || '',
          profile.phone || '',
          'individual',
          '',
          'Not Invited',
          'ROY RICHARDS',
        ];
        csvContent += row.map(escapeCSV).join(',') + '\n';
      }
    } else if (format === 'extended') {
      // Extended format with split names and addresses for direct data entry
      const headers = [
        'First Name', 'Middle Initial', 'Last Name',
        'SSN/EIN', 'Email Address', 'Cell Phone', 'Daytime Phone',
        'Street Address', 'Apt No', 'City', 'State', 'Zip Code',
        'Type', 'Filing Status', 'Date of Birth', 'Occupation',
        'Return Type', 'Accessible By',
      ];
      csvContent = headers.map(escapeCSV).join(',') + '\n';

      for (const profile of profiles) {
        const { firstName, middleInitial, lastName } = splitName(profile.full_name);
        const row = [
          firstName,
          middleInitial,
          lastName,
          '', // SSN/EIN
          profile.email || '',
          profile.phone || '',
          '', // Daytime phone
          profile.address || '',
          '', // Apt No
          profile.city || '',
          profile.state || '',
          profile.zip || '',
          'individual',
          '', // Filing status
          '', // DOB
          '', // Occupation
          '1040 - Individual',
          'ROY RICHARDS',
        ];
        csvContent += row.map(escapeCSV).join(',') + '\n';
      }
    } else {
      // Standard format — all available data
      const headers = [
        'Client', 'First Name', 'Middle Initial', 'Last Name',
        'Email Address', 'Phone', 'Street Address', 'City', 'State', 'Zip Code',
        'Type', 'Role', 'Joined',
      ];
      csvContent = headers.map(escapeCSV).join(',') + '\n';

      for (const profile of profiles) {
        const { firstName, middleInitial, lastName } = splitName(profile.full_name);
        const row = [
          profile.full_name || '',
          firstName,
          middleInitial,
          lastName,
          profile.email || '',
          profile.phone || '',
          profile.address || '',
          profile.city || '',
          profile.state || '',
          profile.zip || '',
          'individual',
          profile.role || 'tax_filer',
          profile.created_at ? new Date(profile.created_at).toLocaleDateString() : '',
        ];
        csvContent += row.map(escapeCSV).join(',') + '\n';
      }
    }

    // Log the export
    await supabase.from('export_logs').insert({
      export_type: `clients_${format}`,
      record_count: profiles.length,
      exported_by: (await supabase.auth.getUser(req.headers.authorization.replace('Bearer ', ''))).data.user?.id,
    }).catch(() => {});

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="richards-tax-clients-${format}-${new Date().toISOString().split('T')[0]}.csv"`);
    return res.status(200).send(csvContent);
  } catch (err) {
    console.error('Export clients error:', err);
    return res.status(err.message.includes('permission') ? 403 : 500).json({ error: err.message });
  }
}
