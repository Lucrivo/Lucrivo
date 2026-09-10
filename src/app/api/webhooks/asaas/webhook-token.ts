import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

function hasValidWebhookToken(
  received: string | null,
  expected: string,
): boolean {
  if (received === null) return false;

  const receivedDigest = createHash("sha256").update(received, "utf8").digest();
  const expectedDigest = createHash("sha256").update(expected, "utf8").digest();

  return timingSafeEqual(receivedDigest, expectedDigest);
}

export { hasValidWebhookToken };
