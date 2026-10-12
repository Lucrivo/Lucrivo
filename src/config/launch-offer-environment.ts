import "server-only";

import { resolveLaunchOffer } from "@/modules/billing/domain/launch-offer";

function readLaunchOfferEnvironment(
  env: NodeJS.ProcessEnv = process.env,
  now: () => Date = () => new Date(),
) {
  return resolveLaunchOffer({
    rawStartAt: env.LAUNCH_OFFER_START_AT,
    now: now(),
  });
}

export { readLaunchOfferEnvironment };
