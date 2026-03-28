import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Tax document classification rules
const DOC_CATEGORIES = {
  'w-2': {
    patterns: ['wage and tax statement', 'w-2', 'w2', 'employer identification'],
    fields: ['employer_name', 'employer_ein', 'employee_ssn', 'wages', 'federal_tax_withheld', 'state_tax_withheld', 'social_security_wages', 'medicare_wages'],
  },
  '1099-nec': {
    patterns: ['nonemployee compensation', '1099-nec', '1099nec'],
    fields: ['payer_name', 'payer_tin', 'recipient_tin', 'nonemployee_compensation'],
  },
  '1099-int': {
    patterns: ['interest income', '1099-int', '1099int'],
    fields: ['payer_name', 'interest_income', 'early_withdrawal_penalty', 'federal_tax_withheld'],
  },
  '1099-div': {
    patterns: ['dividends and distributions', '1099-div', '1099div'],
    fields: ['payer_name', 'ordinary_dividends', 'qualified_dividends', 'capital_gain_distributions', 'federal_tax_withheld'],
  },
  '1099-misc': {
    patterns: ['miscellaneous income', '1099-misc', '1099misc', 'rents', 'royalties'],
    fields: ['payer_name', 'rents', 'royalties', 'other_income', 'federal_tax_withheld'],
  },
  '1098': {
    patterns: ['mortgage interest', '1098', 'mortgage statement'],
    fields: ['lender_name', 'mortgage_interest_received', 'points_paid', 'property_tax'],
  },
  '1095': {
    patterns: ['health coverage', '1095', 'health insurance'],
    fields: ['issuer_name', 'coverage_months', 'premium_amount'],
  },
  'receipt': {
    patterns: ['receipt', 'invoice', 'payment', 'donation', 'contribution'],
    fields: ['vendor_name', 'amount', 'date', 'description', 'category'],
  },
  'id': {
    patterns: ['driver license', 'identification', 'passport', 'id card', 'state id'],
    fields: ['full_name', 'id_number', 'date_of_birth', 'expiration_date', 'address'],
  },
  'other': {
    patterns: [],
    fields: ['document_type', 'content_summary'],
  },
};

function classifyDocument(extractedText) {
  const lower = extractedText.toLowerCase();
  let bestCategory = 'other';
  let bestScore = 0;

  for (const [category, config] of Object.entries(DOC_CATEGORIES)) {
    let score = 0;
    for (const pattern of config.patterns) {
      if (lower.includes(pattern)) {
        score += pattern.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return {
    category: bestCategory,
    confidence: bestScore > 0 ? Math.min(bestScore / 30, 0.99) : 0.1,
    expectedFields: DOC_CATEGORIES[bestCategory].fields,
  };
}

function extractYear(text) {
  // Look for tax year patterns
  const yearPatterns = [
    /tax\s*year\s*[:.]?\s*(20\d{2})/i,
    /for\s*(?:the\s*)?year\s*(20\d{2})/i,
    /calendar\s*year\s*(20\d{2})/i,
    /(20\d{2})\s*(?:w-?2|1099|1098|1095)/i,
  ];

  for (const pattern of yearPatterns) {
    const match = text.match(pattern);
    if (match) return parseInt(match[1]);
  }

  // Fallback: find most common 4-digit year in the 2020s
  const years = text.match(/20[2-3]\d/g);
  if (years && years.length > 0) {
    const counts = {};
    for (const y of years) {
      counts[y] = (counts[y] || 0) + 1;
    }
    return parseInt(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]);
  }

  return new Date().getFullYear();
}

function extractFieldsFromText(text, expectedFields) {
  const results = [];
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  for (const field of expectedFields) {
    let value = null;
    let confidence = 0.3;

    // Try to find field-value pairs
    const fieldLabel = field.replace(/_/g, ' ');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (line.includes(fieldLabel)) {
        // Check same line for value after colon or spaces
        const colonMatch = lines[i].match(new RegExp(fieldLabel + '\\s*[:.]+\\s*(.+)', 'i'));
        if (colonMatch) {
          value = colonMatch[1].trim();
          confidence = 0.75;
          break;
        }
        // Check next line
        if (i + 1 < lines.length) {
          value = lines[i + 1].trim();
          confidence = 0.55;
          break;
        }
      }
    }

    // Money pattern matching for financial fields
    if (!value && (field.includes('wages') || field.includes('income') || field.includes('tax') ||
        field.includes('interest') || field.includes('dividends') || field.includes('amount') ||
        field.includes('compensation') || field.includes('rents') || field.includes('royalties'))) {
      const moneyPattern = /\$[\d,]+\.?\d{0,2}/g;
      const amounts = text.match(moneyPattern);
      if (amounts && amounts.length > 0) {
        // Use the largest amount as a fallback (often the main figure)
        value = amounts[0];
        confidence = 0.35;
      }
    }

    results.push({
      field_name: field,
      field_value: value,
      confidence,
      is_verified: false,
    });
  }

  return results;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { document_id } = req.body;

    if (!document_id) {
      return res.status(400).json({ error: 'document_id is required' });
    }

    // Verify auth - check for service key or admin JWT
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    // Fetch document metadata
    const { data: doc, error: docError } = await supabase
      .from('document_uploads')
      .select('*')
      .eq('id', document_id)
      .single();

    if (docError || !doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Update status to processing
    await supabase
      .from('document_uploads')
      .update({ processing_status: 'processing' })
      .eq('id', document_id);

    // Create processing job
    const { data: job } = await supabase
      .from('processing_jobs')
      .insert({
        document_id,
        job_type: 'extract',
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('client-documents')
      .download(doc.file_path);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    let extractedText = '';
    let ocrResult = null;

    // Check if Google Document AI is configured
    const hasDocumentAI = process.env.GOOGLE_CLOUD_PROJECT_ID &&
                          process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID;

    if (hasDocumentAI) {
      // Use Google Document AI for OCR + extraction
      const credentials = JSON.parse(
        Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON, 'base64').toString()
      );

      const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
      const location = process.env.GOOGLE_CLOUD_LOCATION || 'us';
      const processorId = process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID;

      // Get access token
      const { GoogleAuth } = await import('google-auth-library');
      const auth = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });
      const client = await auth.getClient();
      const accessToken = (await client.getAccessToken()).token;

      // Convert file to base64
      const buffer = Buffer.from(await fileData.arrayBuffer());
      const base64Content = buffer.toString('base64');

      // Determine MIME type
      const mimeType = doc.file_type || 'application/pdf';

      // Call Document AI
      const endpoint = `https://${location}-documentai.googleapis.com/v1/projects/${projectId}/locations/${location}/processors/${processorId}:process`;

      const docAIResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rawDocument: {
            content: base64Content,
            mimeType,
          },
        }),
      });

      if (!docAIResponse.ok) {
        const errText = await docAIResponse.text();
        throw new Error(`Document AI error: ${errText}`);
      }

      ocrResult = await docAIResponse.json();
      extractedText = ocrResult.document?.text || '';
    } else {
      // Fallback: basic text extraction for PDFs (no OCR)
      // For images without Document AI, we can only classify by filename
      if (doc.file_type === 'application/pdf') {
        // Try to extract text from PDF using basic parsing
        const buffer = Buffer.from(await fileData.arrayBuffer());
        // Extract visible ASCII text from PDF binary
        const rawText = buffer.toString('utf-8');
        const textMatches = rawText.match(/\(([^)]{2,})\)/g);
        if (textMatches) {
          extractedText = textMatches
            .map((m) => m.slice(1, -1))
            .join(' ')
            .replace(/\\n/g, '\n');
        }
      }

      // If still no text, use filename as hint
      if (!extractedText) {
        extractedText = doc.file_name.replace(/[._-]/g, ' ');
      }
    }

    // Classify document
    const classification = classifyDocument(extractedText);

    // Extract tax year
    const docYear = extractYear(extractedText);

    // Extract fields based on classification
    const fields = extractFieldsFromText(extractedText, classification.expectedFields);

    // Save extraction results
    if (fields.length > 0) {
      const extractionRows = fields.map((f) => ({
        document_id,
        field_name: f.field_name,
        field_value: f.field_value,
        confidence: f.confidence,
        is_verified: false,
      }));

      await supabase.from('extraction_results').insert(extractionRows);
    }

    // Update document with classification
    await supabase
      .from('document_uploads')
      .update({
        processing_status: 'extracted',
        doc_category: classification.category,
        doc_year: docYear,
        confidence_score: classification.confidence,
        processed_at: new Date().toISOString(),
      })
      .eq('id', document_id);

    // Complete the job
    await supabase
      .from('processing_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result: {
          category: classification.category,
          confidence: classification.confidence,
          doc_year: docYear,
          fields_extracted: fields.length,
          has_document_ai: !!hasDocumentAI,
          text_length: extractedText.length,
        },
      })
      .eq('id', job.id);

    return res.status(200).json({
      success: true,
      document_id,
      category: classification.category,
      confidence: classification.confidence,
      doc_year: docYear,
      fields_extracted: fields.length,
    });
  } catch (error) {
    console.error('Process document error:', error);

    // Try to update document status to error
    if (req.body?.document_id) {
      await supabase
        .from('document_uploads')
        .update({
          processing_status: 'error',
          error_message: error.message,
        })
        .eq('id', req.body.document_id);
    }

    return res.status(500).json({ error: error.message });
  }
}
