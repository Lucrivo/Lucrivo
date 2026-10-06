import type { ReportIndicatorDetail } from "../presenters/to-report-view-model";

function ReportDetailList({ details }: { details: ReportIndicatorDetail[] }) {
  if (details.length === 0) return null;

  return (
    <dl className="border-border/70 divide-border bg-background/70 grid divide-y rounded-xl border px-4">
      {details.map((detail) => (
        <div
          key={detail.id}
          className="grid min-w-0 gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-baseline sm:gap-4"
        >
          <dt className="font-medium break-words">{detail.label}</dt>
          <dd className="text-muted-foreground grid min-w-0 gap-1 break-words sm:text-right">
            <span>{detail.value}</span>
            {detail.supportingText ? (
              <span className="text-xs leading-5">{detail.supportingText}</span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export { ReportDetailList };
