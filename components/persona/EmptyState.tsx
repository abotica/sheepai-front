interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-rule bg-paper px-4 py-6 text-center">
      <p className="font-sans text-[13px] text-ink-dim">{message}</p>
    </div>
  );
}
