type BillingCatalogCode = "launch" | "standard";

type LaunchOfferResolution =
  | {
      phase: "disabled" | "scheduled" | "expired";
      catalogCode: "standard";
      startsAt: string | null;
      endsAt: string | null;
    }
  | {
      phase: "active";
      catalogCode: "launch";
      startsAt: string;
      endsAt: string;
    }
  | {
      phase: "invalid";
      catalogCode: null;
      startsAt: null;
      endsAt: null;
    };

type ResolveLaunchOfferInput = {
  rawStartAt: string | undefined;
  now: Date;
};

const LAUNCH_OFFER_DURATION_MS = 15 * 24 * 60 * 60 * 1000;
const explicitOffsetPattern = /(Z|[+-]\d{2}:\d{2})$/;

const invalidResolution = {
  phase: "invalid",
  catalogCode: null,
  startsAt: null,
  endsAt: null,
} as const;

function resolveLaunchOffer({
  rawStartAt,
  now,
}: ResolveLaunchOfferInput): LaunchOfferResolution {
  if (rawStartAt === undefined) {
    return {
      phase: "disabled",
      catalogCode: "standard",
      startsAt: null,
      endsAt: null,
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

  const endMs = startMs + LAUNCH_OFFER_DURATION_MS;
  const startsAt = new Date(startMs).toISOString();
  const endsAt = new Date(endMs).toISOString();

  if (nowMs < startMs) {
    return {
      phase: "scheduled",
      catalogCode: "standard",
      startsAt,
      endsAt,
    };
  }

  if (nowMs >= endMs) {
    return {
      phase: "expired",
      catalogCode: "standard",
      startsAt,
      endsAt,
    };
  }

  return {
    phase: "active",
    catalogCode: "launch",
    startsAt,
    endsAt,
  };
}

export { LAUNCH_OFFER_DURATION_MS, resolveLaunchOffer };
export type { BillingCatalogCode, LaunchOfferResolution };
