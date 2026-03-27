export default function Card({ className = '', children, ...props }) {
  return (
    <div
      className={`rounded-xl bg-white p-6 shadow-md ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
