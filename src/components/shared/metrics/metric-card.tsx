import { type LucideIcon, ArrowDown, ArrowUp, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

type TrendDirection = "up" | "down" | "neutral";
type MetricTone = "success" | "danger" | "warning" | "info" | "neutral";

interface MetricTrend {
  value: string;
  direction?: TrendDirection;
  description?: string;
}

interface MetricStatus {
  label: string;
  tone?: MetricTone;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  description?: string;
  trend?: MetricTrend;
  status?: MetricStatus;
  className?: string;
  valueClassName?: string;
}

const toneStyles: Record<
  MetricTone,
  {
    text: string;
    background: string;
    dot: string;
  }
> = {
  success: {
    text: "text-emerald-600 dark:text-emerald-400",
    background: "bg-emerald-500/10 dark:bg-emerald-400/10",
    dot: "bg-emerald-500",
  },

  danger: {
    text: "text-destructive",
    background: "bg-destructive/10",
    dot: "bg-destructive",
  },

  warning: {
    text: "text-amber-600 dark:text-amber-400",
    background: "bg-amber-500/10 dark:bg-amber-400/10",
    dot: "bg-amber-500",
  },

  info: {
    text: "text-primary",
    background: "bg-primary/10",
    dot: "bg-primary",
  },

  neutral: {
    text: "text-muted-foreground",
    background: "bg-muted",
    dot: "bg-muted-foreground",
  },
};

function getTrendTone(direction: TrendDirection = "neutral"): MetricTone {
  if (direction === "up") return "success";
  if (direction === "down") return "danger";

  return "neutral";
}

function TrendIcon({ direction }: { direction: TrendDirection }) {
  const iconClassName = "size-3 stroke-[2.5]";

  if (direction === "up") {
    return <ArrowUp className={iconClassName} />;
  }

  if (direction === "down") {
    return <ArrowDown className={iconClassName} />;
  }

  return <Minus className={iconClassName} />;
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  status,
  className,
  valueClassName,
}: MetricCardProps) {
  const trendDirection = trend?.direction ?? "neutral";
  const trendTone = getTrendTone(trendDirection);
  const trendStyles = toneStyles[trendTone];

  const statusTone = status?.tone ?? "neutral";
  const statusStyles = toneStyles[statusTone];

  return (
    <div
      className={cn(
        "bg-card text-card-foreground relative min-w-0 rounded-xl border p-5",
        "shadow-sm transition-shadow duration-200",
        "hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="text-muted-foreground text-sm font-medium">
          {title}
        </span>

        {Icon && (
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg">
            <Icon className="text-primary size-[18px]" />
          </div>
        )}
      </div>

      <div className="mt-5 flex min-w-0 items-end gap-2">
        <strong
          className={cn(
            "truncate text-3xl font-semibold tracking-tight",
            valueClassName,
          )}
        >
          {value}
        </strong>

        {trend && (
          <div
            className={cn(
              "mb-1 flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5",
              "text-xs font-medium",
              trendStyles.text,
              trendStyles.background,
            )}
          >
            <TrendIcon direction={trendDirection} />

            <span>{trend.value}</span>
          </div>
        )}
      </div>

      {(description || trend?.description || status) && (
        <div className="mt-2 min-h-5">
          {status ? (
            <div
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium",
                statusStyles.text,
              )}
            >
              <span className={cn("size-1.5 rounded-full", statusStyles.dot)} />

              {status.label}
            </div>
          ) : (
            <p className="text-muted-foreground truncate text-xs">
              {trend?.description ?? description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
