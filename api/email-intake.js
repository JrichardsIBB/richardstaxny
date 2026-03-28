import { createClient } from '@supabase/supabase-js';

/**
 * Email Intake Webhook — receives inbound emails from SendGrid Inbound Parse
 *
 * Setup in SendGrid:
 * 1. Go to Settings → Inbound Parse
 * 2. Add host/domain: e.g., upload.richardstaxny.com
 * 3. Set destination URL: https://richardstaxny.com/api/email-intake
 * 4. Check "POST the raw, full MIME message"
 *
 * Clients can email their tax docs to: upload@richardstaxny.com
 * The system will match the sender to their account and auto-upload attachments.
 */

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '30mb', // Allow large email attachments
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      from: senderEmail,
      subject,
      attachments: attachmentCount,
      attachment_info: attachmentInfoRaw,
    } = req.body;

    // Parse sender email
    const emailMatch = senderEmail?.match(/<([^>]+)>/) || [null, senderEmail];
    const cleanEmail = (emailMatch[1] || senderEmail || '').toLowerCase().trim();

    if (!cleanEmail) {
      return res.status(400).json({ error: 'No sender email found' });
    }

    // Log the intake
    const { data: intakeLog } = await supabase
      .from('email_intake_log')
      .insert({
        sender_email: cleanEmail,
        subject: subject || '(no subject)',
        attachment_count: parseInt(attachmentCount) || 0,
        status: 'received',
        raw_payload: {
          from: senderEmail,
          subject,
          attachment_count: attachmentCount,
        },
      })
      .select()
      .single();

    // Try to match sender to a registered user
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', cleanEmail)
      .single();

    if (!profile) {
      // Unknown sender — mark as unmatched
      await supabase
        .from('email_intake_log')
        .update({ status: 'unmatched' })
        .eq('id', intakeLog.id);

      console.log(`Email intake: unmatched sender ${cleanEmail}`);
      return res.status(200).json({
        message: 'Email received but sender not matched to any account',
        sender: cleanEmail,
      });
    }

    // Update intake log with matched user
    await supabase
      .from('email_intake_log')
      .update({
        matched_user_id: profile.id,
        status: 'processed',
      })
      .eq('id', intakeLog.id);

    // Process attachments
    const numAttachments = parseInt(attachmentCount) || 0;
    let uploadedCount = 0;

    for (let i = 1; i <= numAttachments; i++) {
      const fileFieldName = `attachment${i}`;
      const file = req.body[fileFieldName];
      const infoKey = `attachment${i}`;

      // Parse attachment info
      let attachInfo = {};
      try {
        const parsed = typeof attachmentInfoRaw === 'string'
          ? JSON.parse(attachmentInfoRaw)
          : attachmentInfoRaw;
        attachInfo = parsed?.[infoKey] || {};
      } catch {
        // Ignore parse errors
      }

      if (!file) continue;

      const fileName = attachInfo.filename || `email-attachment-${i}`;
      const fileType = attachInfo['content-type'] || attachInfo.type || 'application/octet-stream';

      // Only accept allowed file types
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];

      if (!allowedTypes.some((t) => fileType.includes(t))) {
        console.log(`Skipping attachment ${fileName}: unsupported type ${fileType}`);
        continue;
      }

      // Sanitize filename
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${profile.id}/${Date.now()}-email-${safeName}`;

      // Upload to storage
      const fileBuffer = typeof file === 'string' ? Buffer.from(file, 'base64') : file;

      const { error: storageError } = await supabase.storage
        .from('client-documents')
        .upload(filePath, fileBuffer, {
          contentType: fileType,
        });

      if (storageError) {
        console.error(`Storage upload error for ${safeName}:`, storageError);
        continue;
      }

      // Insert document metadata
      await supabase.from('document_uploads').insert({
        user_id: profile.id,
        client_name: profile.full_name || cleanEmail,
        client_email: cleanEmail,
        file_name: safeName,
        file_path: filePath,
        file_size: fileBuffer.length || 0,
        file_type: fileType,
        status: 'pending',
        processing_status: 'pending',
      });

      uploadedCount++;
    }

    console.log(`Email intake: ${uploadedCount} files from ${cleanEmail} (${profile.full_name})`);

    return res.status(200).json({
      message: `Processed ${uploadedCount} attachments from ${cleanEmail}`,
      user: profile.full_name,
      uploaded: uploadedCount,
    });
  } catch (error) {
    console.error('Email intake error:', error);
    return res.status(500).json({ error: error.message });
  }
}
