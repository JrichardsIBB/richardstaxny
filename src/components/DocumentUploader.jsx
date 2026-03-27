import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import Button from './ui/Button';
import Card from './ui/Card';
import Input from './ui/Input';
import FileDropzone from './ui/FileDropzone';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  reviewed: 'bg-blue-100 text-blue-800',
  complete: 'bg-green-100 text-green-800',
};

function sanitizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export default function DocumentUploader() {
  const { user } = useAuth();

  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploads, setUploads] = useState([]);
  const [loadingUploads, setLoadingUploads] = useState(true);
  const uploadingRef = useRef(false);

  // Pre-fill from user email
  useEffect(() => {
    if (user?.email) {
      setClientEmail(user.email);
      // Derive a display name from the email local part
      const localPart = user.email.split('@')[0];
      setClientName(
        localPart
          .replace(/[._-]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase()),
      );
    }
  }, [user]);

  // Fetch existing uploads
  const fetchUploads = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('document_uploads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setUploads(data || []);
    } catch (err) {
      console.error('Failed to fetch uploads:', err.message);
    } finally {
      setLoadingUploads(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUploads();
  }, [fetchUploads]);

  function handleFilesSelected(selectedFiles) {
    setFiles(selectedFiles);
  }

  async function handleUpload() {
    if (uploadingRef.current) return;
    if (files.length === 0) {
      toast.error('Please select at least one file.');
      return;
    }
    if (!clientName.trim()) {
      toast.error('Please enter your name.');
      return;
    }

    uploadingRef.current = true;
    setUploading(true);
    let successCount = 0;

    for (const file of files) {
      const safeName = sanitizeFileName(file.name);
      const filePath = `${user.id}/${Date.now()}-${safeName}`;

      try {
        // Upload to storage
        const { error: storageError } = await supabase.storage
          .from('client-documents')
          .upload(filePath, file);
        if (storageError) throw storageError;

        // Insert metadata
        const { error: dbError } = await supabase
          .from('document_uploads')
          .insert({
            user_id: user.id,
            client_name: clientName.trim(),
            client_email: clientEmail.trim(),
            file_name: safeName,
            file_path: filePath,
            file_size: file.size,
            file_type: file.type,
            status: 'pending',
          });
        if (dbError) throw dbError;

        successCount++;
        toast.success(`Uploaded: ${safeName}`);
      } catch (err) {
        toast.error(`Failed to upload ${safeName}: ${err.message}`);
      }
    }

    if (successCount > 0) {
      setFiles([]);
      fetchUploads();
    }

    setUploading(false);
    uploadingRef.current = false;
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="space-y-4">
          <Input
            label="Your Name"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Full name"
          />
          <Input
            label="Email"
            type="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            placeholder="you@example.com"
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Select Files
            </label>
            <FileDropzone onFilesSelected={handleFilesSelected} />
          </div>

          <Button
            onClick={handleUpload}
            loading={uploading}
            disabled={files.length === 0}
            className="w-full"
          >
            Upload {files.length > 0 ? `${files.length} File${files.length > 1 ? 's' : ''}` : 'Files'}
          </Button>
        </div>
      </Card>

      {/* Your Uploads */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Your Uploads
        </h3>

        {loadingUploads ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-blue-500 border-t-transparent" />
          </div>
        ) : uploads.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-gray-500">No documents uploaded yet.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {uploads.map((upload) => (
              <Card key={upload.id} className="flex items-center justify-between py-4 px-5">
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">
                    {upload.file_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(upload.created_at)}
                    {upload.file_size && ` \u00B7 ${formatSize(upload.file_size)}`}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                    STATUS_COLORS[upload.status] || STATUS_COLORS.pending
                  }`}
                >
                  {upload.status}
                </span>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
