export const Skeleton = ({ className = '' }: { className?: string }) => {
  return (
    <div className={`animate-pulse bg-gray-200 rounded-md ${className}`} />
  );
};

export const TableSkeleton = ({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-gray-100">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="p-4">
              <Skeleton className="h-5 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

export const CardSkeleton = () => {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
      <Skeleton className="h-6 w-3/4 mb-4" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
};
