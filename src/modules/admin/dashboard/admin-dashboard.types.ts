type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

type AdminDashboardViewModel = {
  generatedAtLabel: string;
  metrics: {
    newUsers: { today: number; week: number; month: number };
    activeUsers: number;
    freeDiagnoses: number;
    activeSubscriptions: number;
    canceledSubscriptions: number;
    monthlyRevenueCents: number;
    cancellationOpeningBase: number;
    cancellationRateBasisPoints: number | null;
  };
  revenueHistory: Array<{
    period: string;
    label: string;
    valueCents: number;
  }>;
  userGrowth: Array<{ period: string; label: string; value: number }>;
  recentSubscriptions: Array<{
    id: string;
    email: string;
    billingModeLabel: "Mensal" | "Anual";
    createdAtLabel: string;
    status: { label: string; tone: StatusTone };
  }>;
};

export type { AdminDashboardViewModel, StatusTone };
