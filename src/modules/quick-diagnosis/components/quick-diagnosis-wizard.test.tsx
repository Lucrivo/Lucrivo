import type { ChangeEvent, Dispatch } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CreateServiceDiagnosisAction } from "./service/service-diagnosis-wizard";
import type {
  ServiceWizardAction,
  ServiceWizardState,
} from "./service/service-wizard-state";

type MockServiceWizardProps = {
  state: ServiceWizardState;
  dispatch: Dispatch<ServiceWizardAction>;
  createDiagnosis: CreateServiceDiagnosisAction;
  onBackToType: () => void;
};

const { serviceWizardProps } = vi.hoisted(() => ({
  serviceWizardProps: vi.fn(),
}));

vi.mock("./service/service-diagnosis-wizard", () => ({
  ServiceDiagnosisWizard: (props: MockServiceWizardProps) => {
    serviceWizardProps(props);

    return (
      <div data-testid="service-wizard">
        <label htmlFor="service-draft">Renda mensal desejada</label>
        <input
          id="service-draft"
          value={props.state.values.desiredMonthlyIncome}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            props.dispatch({
              type: "setField",
              field: "desiredMonthlyIncome",
              value: event.target.value,
            })
          }
        />
        <span>{props.state.values.submissionId}</span>
        <button type="button" onClick={props.onBackToType}>
          Editar tipo de diagnóstico
        </button>
      </div>
    );
  },
}));

import { QuickDiagnosisWizard } from "./quick-diagnosis-wizard";

describe("QuickDiagnosisWizard category orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderWizard() {
    const createDiagnosis = vi.fn();
    const createSubmissionId = vi.fn(
      () => "550e8400-e29b-41d4-a716-446655440000",
    );

    render(
      <QuickDiagnosisWizard
        createDiagnosis={createDiagnosis}
        createSubmissionId={createSubmissionId}
      />,
    );

    return { createDiagnosis, createSubmissionId };
  }

  it("shows only Service as available on the focused first global step", () => {
    const { createDiagnosis, createSubmissionId } = renderWizard();

    expect(screen.getByText("1 de 8")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "1",
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuemax",
      "8",
    );
    expect(
      screen.getByRole("heading", { name: "O que você quer analisar?" }),
    ).toHaveFocus();
    expect(screen.getAllByTestId("wizard-step")).toHaveLength(1);
    expect(screen.getByRole("radio", { name: "Serviço" })).toBeEnabled();
    expect(screen.getByRole("radio", { name: "Produto" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Produção" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(createSubmissionId).toHaveBeenCalledOnce();
    expect(createDiagnosis).not.toHaveBeenCalled();
  });

  it("requires an available diagnosis type before continuing", async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Selecione o que você quer analisar.",
    );
    expect(screen.queryByTestId("service-wizard")).not.toBeInTheDocument();
  });

  it("injects the exact Service action and preserves its controlled draft", async () => {
    const user = userEvent.setup();
    const { createDiagnosis, createSubmissionId } = renderWizard();

    await user.click(screen.getByRole("radio", { name: "Serviço" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByTestId("service-wizard")).toBeInTheDocument();
    expect(serviceWizardProps.mock.calls.at(-1)?.[0].createDiagnosis).toBe(
      createDiagnosis,
    );
    await user.type(screen.getByLabelText("Renda mensal desejada"), "5000");
    expect(screen.getByLabelText("Renda mensal desejada")).toHaveValue("5000");
    expect(
      screen.getByText("550e8400-e29b-41d4-a716-446655440000"),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Editar tipo de diagnóstico" }),
    );
    expect(
      screen.getByRole("heading", { name: "O que você quer analisar?" }),
    ).toHaveFocus();
    expect(screen.getByRole("radio", { name: "Serviço" })).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByLabelText("Renda mensal desejada")).toHaveValue("5000");
    expect(
      screen.getByText("550e8400-e29b-41d4-a716-446655440000"),
    ).toBeInTheDocument();
    expect(createSubmissionId).toHaveBeenCalledOnce();
  });
});
