import { useCallback, useState } from 'react';
import { FaCloudUploadAlt } from 'react-icons/fa';

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileDropzone({
  onFilesSelected,
  accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx',
  multiple = true,
  maxSize = 25 * 1024 * 1024, // 25 MB
}) {
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState([]);

  const processFiles = useCallback(
    (incoming) => {
      const valid = [];
      const rejected = [];

      Array.from(incoming).forEach((f) => {
        if (f.size > maxSize) {
          rejected.push(`${f.name} exceeds ${formatFileSize(maxSize)} limit`);
        } else {
          valid.push(f);
        }
      });

      setErrors(rejected);

      if (valid.length) {
        setFiles((prev) => {
          const next = [...prev, ...valid];
          onFilesSelected?.(next);
          return next;
        });
      }
    },
    [onFilesSelected, maxSize],
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      processFiles(e.dataTransfer.files);
    },
    [processFiles],
  );

  const handleChange = useCallback(
    (e) => {
      processFiles(e.target.files);
      e.target.value = '';
    },
    [processFiles],
  );

  const removeFile = (index) => {
    setFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      onFilesSelected?.(next);
      return next;
    });
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition cursor-pointer ${
          dragging
            ? 'border-brand-blue-500 bg-brand-blue-50'
            : 'border-gray-300 bg-gray-50 hover:border-brand-blue-400'
        }`}
      >
        <FaCloudUploadAlt className="mb-3 h-10 w-10 text-brand-blue-400" />
        <p className="mb-1 text-sm font-medium text-gray-700">
          Drag & drop files here, or{' '}
          <label className="cursor-pointer font-semibold text-brand-blue-500 hover:underline">
            browse
            <input
              type="file"
              multiple={multiple}
              accept={accept}
              onChange={handleChange}
              className="hidden"
            />
          </label>
        </p>
        <p className="text-xs text-gray-500">
          PDF, images, Word, Excel up to {formatFileSize(maxSize)}
        </p>
      </div>

      {/* Validation errors */}
      {errors.length > 0 && (
        <ul className="mt-2 space-y-1">
          {errors.map((err, i) => (
            <li key={i} className="text-sm text-brand-red-400">
              {err}
            </li>
          ))}
        </ul>
      )}

      {/* File list */}
      {files.length > 0 && (
        <ul className="mt-3 divide-y divide-gray-100 rounded-lg border border-gray-200">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between px-4 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-700">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="ml-3 shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-brand-red-400 transition-colors"
                aria-label={`Remove ${file.name}`}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
