function FlowSummary({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-primary/20 bg-primary/5 grid gap-1 rounded-xl border p-4">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <div className="text-sm leading-relaxed font-semibold tabular-nums">
        {children}
      </div>
    </div>
  );
}

export { FlowSummary };
