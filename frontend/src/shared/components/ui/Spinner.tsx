export const Spinner = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <span
    className={`inline-block animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600 ${className}`}
  />
);
