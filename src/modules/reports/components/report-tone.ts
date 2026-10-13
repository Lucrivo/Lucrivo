import {
  CircleCheckIcon,
  CircleHelpIcon,
  OctagonAlertIcon,
  TriangleAlertIcon,
} from "lucide-react";

import type { ReportTone } from "../types";

const tonePresentation = {
  neutral: {
    icon: CircleHelpIcon,
    badge: "info" as const,
    border: "border-info/30",
    surface: "bg-info/4",
    value: "text-foreground",
  },
  positive: {
    icon: CircleCheckIcon,
    badge: "success" as const,
    border: "border-success/30",
    surface: "bg-success/4",
    value: "text-success",
  },
  warning: {
    icon: TriangleAlertIcon,
    badge: "warning" as const,
    border: "border-warning/35",
    surface: "bg-warning/5",
    value: "text-warning-foreground dark:text-warning",
  },
  critical: {
    icon: OctagonAlertIcon,
    badge: "destructive" as const,
    border: "border-destructive/30",
    surface: "bg-destructive/4",
    value: "text-destructive",
  },
} as const satisfies Record<
  ReportTone,
  {
    icon: typeof CircleHelpIcon;
    badge: "info" | "success" | "warning" | "destructive";
    border: string;
    surface: string;
    value: string;
  }
>;

export { tonePresentation };
