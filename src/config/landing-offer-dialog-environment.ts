import "server-only";

function readLandingOfferDialogEnabled(
  value: string | undefined = process.env.LANDING_OFFER_DIALOG_ENABLED,
): boolean {
  return value === "true";
}

export { readLandingOfferDialogEnabled };
