import "server-only";

import { resolveLaunchOffer } from "@/modules/billing/domain/launch-offer";

type LaunchOfferEnvironment = Readonly<
  Record<string, string | undefined> & { LAUNCH_OFFER_START_AT?: string }
>;

function readLaunchOfferEnvironment(
  env: LaunchOfferEnvironment = process.env,
  now: () => Date = () => new Date(),
) {
  return resolveLaunchOffer({
    rawStartAt: env.LAUNCH_OFFER_START_AT,
    now: now(),
  });
}

export { readLaunchOfferEnvironment };
