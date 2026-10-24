// Loading and error states used on every page.

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 p-4 text-sm text-slate-500">
      <span className="size-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
      {label}
    </div>
  );
}

export function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-center justify-between gap-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="rounded-md border border-red-300 bg-white px-3 py-1 font-medium hover:bg-red-100">
          Try again
        </button>
      )}
    </div>
  );
}
