import { forwardRef } from 'react';

const Input = forwardRef(function Input(
  { label, error, type = 'text', className = '', id, ...props },
  ref,
) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      )}
      {type === 'textarea' ? (
        <textarea
          ref={ref}
          id={inputId}
          aria-describedby={errorId}
          aria-invalid={error ? true : undefined}
          className={`w-full rounded-lg border px-4 py-2 transition focus:outline-none focus:ring-2 ${
            error
              ? 'border-brand-red-400 focus:border-brand-red-400 focus:ring-brand-red-400/30'
              : 'border-gray-300 focus:border-brand-blue-500 focus:ring-brand-blue-500/30'
          }`}
          rows={4}
          {...props}
        />
      ) : (
        <input
          ref={ref}
          id={inputId}
          type={type}
          aria-describedby={errorId}
          aria-invalid={error ? true : undefined}
          className={`w-full rounded-lg border px-4 py-2 transition focus:outline-none focus:ring-2 ${
            error
              ? 'border-brand-red-400 focus:border-brand-red-400 focus:ring-brand-red-400/30'
              : 'border-gray-300 focus:border-brand-blue-500 focus:ring-brand-blue-500/30'
          }`}
          {...props}
        />
      )}
      {error && (
        <p id={errorId} className="mt-1 text-sm text-brand-red-400">
          {error}
        </p>
      )}
    </div>
  );
});

export default Input;
