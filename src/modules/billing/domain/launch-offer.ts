type BillingCatalogCode = "launch" | "launch_price" | "standard";
type ActiveLaunchOfferPhase = "bonus_active" | "price_active";

type ConfiguredLaunchOfferTimestamps = {
  startsAt: string;
  bonusEndsAt: string;
  promotionEndsAt: string;
};

type LaunchOfferResolution =
  | {
      phase: "disabled";
      catalogCode: "standard";
      startsAt: null;
      bonusEndsAt: null;
      promotionEndsAt: null;
    }
  | ({
      phase: "scheduled" | "expired";
      catalogCode: "standard";
    } & ConfiguredLaunchOfferTimestamps)
  | ({
      phase: "bonus_active";
      catalogCode: "launch";
      endsAt: string;
    } & ConfiguredLaunchOfferTimestamps)
  | ({
      phase: "price_active";
      catalogCode: "launch_price";
      endsAt: string;
    } & ConfiguredLaunchOfferTimestamps)
  | {
      phase: "invalid";
      catalogCode: null;
      startsAt: null;
      bonusEndsAt: null;
      promotionEndsAt: null;
    };

type ResolveLaunchOfferInput = {
  rawStartAt: string | undefined;
  now: Date;
};

const LAUNCH_BONUS_DURATION_MS = 15 * 24 * 60 * 60 * 1000;
const LAUNCH_PRICE_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const explicitOffsetPattern = /(Z|[+-]\d{2}:\d{2})$/;

const invalidResolution = {
  phase: "invalid",
  catalogCode: null,
  startsAt: null,
  bonusEndsAt: null,
  promotionEndsAt: null,
} as const;

function isPromotionalCatalog(
  code: BillingCatalogCode,
): code is "launch" | "launch_price" {
  return code === "launch" || code === "launch_price";
}

function isLaunchOfferActive(
  resolution: LaunchOfferResolution,
): resolution is Extract<
  LaunchOfferResolution,
  { phase: ActiveLaunchOfferPhase }
> {
  return (
    resolution.phase === "bonus_active" || resolution.phase === "price_active"
  );
}

function resolveLaunchOffer({
  rawStartAt,
  now,
}: ResolveLaunchOfferInput): LaunchOfferResolution {
  if (rawStartAt === undefined) {
    return {
      phase: "disabled",
      catalogCode: "standard",
      startsAt: null,
      bonusEndsAt: null,
      promotionEndsAt: null,
    };
  }

  const nowMs = now.getTime();

  if (
    rawStartAt.length === 0 ||
    !explicitOffsetPattern.test(rawStartAt) ||
    !Number.isFinite(nowMs)
  ) {
    return invalidResolution;
  }

  const startMs = Date.parse(rawStartAt);
  if (!Number.isFinite(startMs)) return invalidResolution;

  const bonusEndMs = startMs + LAUNCH_BONUS_DURATION_MS;
  const promotionEndMs = startMs + LAUNCH_PRICE_DURATION_MS;
  const timestamps = {
    startsAt: new Date(startMs).toISOString(),
    bonusEndsAt: new Date(bonusEndMs).toISOString(),
    promotionEndsAt: new Date(promotionEndMs).toISOString(),
  };

  if (nowMs < startMs) {
    return {
      phase: "scheduled",
      catalogCode: "standard",
      ...timestamps,
    };
  }

  if (nowMs < bonusEndMs) {
    return {
      phase: "bonus_active",
      catalogCode: "launch",
      ...timestamps,
      endsAt: timestamps.bonusEndsAt,
    };
  }

  if (nowMs < promotionEndMs) {
    return {
      phase: "price_active",
      catalogCode: "launch_price",
      ...timestamps,
      endsAt: timestamps.promotionEndsAt,
    };
  }

  return {
    phase: "expired",
    catalogCode: "standard",
    ...timestamps,
  };
}

export {
  LAUNCH_BONUS_DURATION_MS,
  LAUNCH_PRICE_DURATION_MS,
  isLaunchOfferActive,
  isPromotionalCatalog,
  resolveLaunchOffer,
};
export type {
  ActiveLaunchOfferPhase,
  BillingCatalogCode,
  LaunchOfferResolution,
};
