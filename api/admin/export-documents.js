/**
 * Export Documents API — generates organized document list for download
 * Groups documents by client with clean naming
 *
 * Structure:
 * /clients/FIRSTNAME_LASTNAME/
 *   - w2.pdf
 *   - 1099-nec.pdf
 *   - receipt-001.pdf
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await verifyAdmin(req.headers.authorization);

    const status = req.query.status || 'all'; // all, approved, exported

    // Fetch documents with extraction data
    let query = supabase
      .from('document_uploads')
      .select('*, extraction_results(*)')
      .order('client_name', { ascending: true });

    if (status === 'approved') {
      query = query.eq('processing_status', 'approved');
    } else if (status === 'exported') {
      query = query.eq('processing_status', 'exported');
    } else if (status !== 'all') {
      query = query.eq('processing_status', status);
    }

    const { data: documents, error } = await query;
    if (error) throw error;

    // Group by client
    const clientGroups = {};
    for (const doc of documents || []) {
      const clientKey = doc.client_name || doc.client_email || 'Unknown';
      if (!clientGroups[clientKey]) {
        clientGroups[clientKey] = {
          client_name: clientKey,
          client_email: doc.client_email || '',
          documents: [],
        };
      }

      // Build extraction summary
      const extractions = {};
      for (const ext of doc.extraction_results || []) {
        extractions[ext.field_name] = ext.verified_value || ext.field_value || '';
      }

      clientGroups[clientKey].documents.push({
        id: doc.id,
        file_name: doc.file_name,
        file_path: doc.file_path,
        file_type: doc.file_type,
        category: doc.doc_category || 'other',
        tax_year: doc.doc_year || '',
        confidence: doc.confidence_score || 0,
        processing_status: doc.processing_status,
        uploaded_at: doc.created_at,
        extractions,
      });
    }

    // Generate manifest CSV
    const manifestHeaders = [
      'Client', 'Email', 'File', 'Category', 'Tax Year', 'Confidence',
      'Status', 'Storage Path', 'Uploaded',
    ];

    let manifestCSV = manifestHeaders.map((h) => `"${h}"`).join(',') + '\n';
    for (const client of Object.values(clientGroups)) {
      for (const doc of client.documents) {
        const row = [
          client.client_name,
          client.client_email,
          doc.file_name,
          doc.category,
          doc.tax_year,
          `${Math.round(doc.confidence * 100)}%`,
          doc.processing_status,
          doc.file_path,
          new Date(doc.uploaded_at).toLocaleDateString(),
        ];
        manifestCSV += row.map((v) => `"${String(v || '').replace(/"/g, '""')}"`).join(',') + '\n';
      }
    }

    // Also generate extraction data CSV (all fields from AI)
    const extractionRows = [];
    for (const client of Object.values(clientGroups)) {
      for (const doc of client.documents) {
        for (const [fieldName, fieldValue] of Object.entries(doc.extractions)) {
          extractionRows.push({
            client: client.client_name,
            file: doc.file_name,
            category: doc.category,
            field: fieldName,
            value: fieldValue,
          });
        }
      }
    }

    let extractionCSV = '"Client","File","Category","Field","Value"\n';
    for (const row of extractionRows) {
      extractionCSV += [row.client, row.file, row.category, row.field, row.value]
        .map((v) => `"${String(v || '').replace(/"/g, '""')}"`)
        .join(',') + '\n';
    }

    // Log the export
    await supabase.from('export_logs').insert({
      export_type: 'documents',
      record_count: documents?.length || 0,
    }).catch(() => {});

    return res.status(200).json({
      clients: Object.values(clientGroups),
      manifest_csv: manifestCSV,
      extraction_csv: extractionCSV,
      total_documents: documents?.length || 0,
      total_clients: Object.keys(clientGroups).length,
    });
  } catch (err) {
    console.error('Export documents error:', err);
    return res.status(err.message.includes('permission') ? 403 : 500).json({ error: err.message });
  }
}
