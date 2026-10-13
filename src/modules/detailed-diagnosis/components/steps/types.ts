import type React from "react";

import type {
  DetailedWizardAction,
  DetailedWizardState,
} from "../detailed-wizard-state";

type DetailedStepProps = {
  state: DetailedWizardState;
  dispatch: React.Dispatch<DetailedWizardAction>;
};

export { type DetailedStepProps };
