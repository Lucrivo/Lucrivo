# Offer Dialog Moments and Post-Diagnosis Simplification

**Date:** 2026-10-23
**Status:** Approved for implementation planning
**Surfaces:** Public landing offer dialog and post-diagnosis offer dialog

## Objective

Make every commercial offer dialog render accurate content in all three sales
moments while simplifying the post-diagnosis dialog to match the approved
`docs/design-references/post-diagnosis.jpeg` reference.

The three moments are:

1. launch price with access bonus;
2. launch price without a bonus;
3. standard pricing outside the launch campaign.

The pre-diagnosis dialog is intentionally excluded because its purpose and
message are generic rather than tied to a commercial phase.

## Commercial Moments

The active catalog is the source of truth for presentation:

| Catalog        | Moment            | Monthly presentation                                                                      |
| -------------- | ----------------- | ----------------------------------------------------------------------------------------- |
| `launch`       | Launch with bonus | R$ 39,90 on the first payment, two months of access, one bonus month, then R$ 49,90/month |
| `launch_price` | Launch price only | R$ 39,90 on the first payment, one month of access, no bonus, then R$ 49,90/month         |
| `standard`     | Standard period   | R$ 49,90/month, with no promotional badge, bonus, or differentiated renewal               |

Invalid campaign configuration remains fail-closed and must not be represented
as a valid standard period.

## Shared Presentation Model

Introduce one small presentation model or resolver for the three commercial
moments. It owns phase labels and the visibility of promotional information,
but not component markup or layout.

The landing and post-diagnosis dialogs remain separate components. Both consume
the same resolved commercial meaning so that price, bonus, renewal, and badge
copy cannot drift while each surface retains its own hierarchy and CTA.

Do not create one universal offer-dialog component. Their audiences, imagery,
and conversion actions are different enough that sharing markup would add
coupling without improving clarity.

## Post-Diagnosis Dialog

The dialog must become narrower and contain only the information represented in
the approved reference:

1. Lucrivo brand;
2. promotional badge only during either launch moment;
3. the post-diagnosis headline and supporting description;
4. two outcome-oriented benefits;
5. the supplied Lucrivo dashboard notebook image;
6. one compact monthly-price card;
7. bonus panel only when a bonus exists;
8. primary CTA to `/billing`;
9. immediate-access and cancel-anytime reassurance;
10. a discreet accessible close control.

Remove the semiannual-plan summary, material list, countdown, seven-day
guarantee sentence, and “Talvez mais tarde” action from this dialog. Those
items are not present in the reference and create unnecessary competition with
the primary offer.

The existing title remains:

> Você já descobriu como está seu preço. Agora saiba como lucrar mais.

The two benefits remain:

- Entenda quanto realmente sobra das suas vendas.
- Saiba quando vale a pena ajustar seu preço.

The primary action remains “Quero liberar meu acesso completo”.

### Responsive behavior

- Use a compact desktop container aligned with the established offer-dialog
  visual language rather than the current wide promotional panel.
- Keep the copy and notebook as the principal two-column composition on larger
  screens.
- Stack content on small screens without introducing additional information.
- Keep the primary CTA visible as early as practical and prevent horizontal
  scrolling at 360 CSS pixels.
- Preserve a maximum viewport-relative height with internal scrolling for short
  screens.

## Landing Offer Dialog

Keep the existing landing-specific layout and diagnosis CTA. Ensure its price
card accurately renders all three moments:

- show the launch badge, discounted first payment, renewal, and bonus copy for
  `launch`;
- show the launch badge, discounted first payment, and renewal without any
  bonus claim for `launch_price`;
- show standard monthly pricing without launch, bonus, or renewal copy for
  `standard`.

During the standard period, the landing dialog continues to respect the
existing offer-dialog feature flag. Active launch periods continue to show it
through the existing campaign behavior.

## Trigger Flow

After the first free diagnosis, eligible free users must receive the
post-diagnosis dialog in every valid commercial moment.

- The quick-diagnosis completion flow should use a generic offer-completion
  marker rather than treating the trigger as launch-only.
- The report page resolves the current catalog and fetches its active monthly
  and semiannual price pair.
- `launch`, `launch_price`, and `standard` can all construct the dialog
  presentation.
- A missing or invalid price pair, an invalid campaign configuration, a paid
  user, or an unrelated report navigation must not open the dialog.
- Closing the dialog removes its URL marker without losing the report page.

The authenticated billing banner is not a dialog and remains outside this
change. The pre-diagnosis dialog also remains unchanged.

## Accessibility

- Keep a semantic dialog title and description.
- Give the close control an explicit accessible label and a minimum 44-pixel
  target.
- Keep the notebook alternative text concise and product-specific.
- Decorative icons remain hidden from assistive technology.
- Preserve visible keyboard focus and sufficient contrast.
- Do not communicate the current commercial moment through color alone.

## Testing

Add or update tests for:

- landing dialog content in `launch`, `launch_price`, and `standard` catalogs;
- post-diagnosis dialog content in all three moments;
- absence of bonus claims outside the bonus moment;
- absence of launch claims during the standard period;
- automatic post-diagnosis triggering after the first free diagnosis in each
  valid moment;
- no dialog for invalid configuration, paid users, or normal report visits;
- URL cleanup when the post-diagnosis dialog closes.

Run targeted component and page tests, TypeScript validation, linting, the
Impeccable detector, and one bounded visual review covering desktop and mobile.

## Out of Scope

- Changing price amounts or billing catalog rules.
- Redesigning billing plan cards or the authenticated billing banner.
- Changing when the generic pre-diagnosis dialog appears.
- Adding new countdowns, discounts, testimonials, guarantees, or marketing
  claims.
