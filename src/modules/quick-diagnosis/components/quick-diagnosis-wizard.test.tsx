import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { QuickDiagnosisWizard } from "./quick-diagnosis-wizard";

describe("QuickDiagnosisWizard", () => {
  function renderWizard() {
    const createDiagnosis = vi.fn();
    render(
      <QuickDiagnosisWizard
        createDiagnosis={createDiagnosis}
        createSubmissionId={() => "550e8400-e29b-41d4-a716-446655440000"}
      />,
    );
    return { createDiagnosis };
  }

  it("renders one focused step with deterministic progress", () => {
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

    expect(screen.getByText("1 de 7")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "1",
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuemax",
      "7",
    );
    expect(screen.getByRole("heading", { level: 2 })).toHaveFocus();
    expect(screen.getAllByTestId("wizard-step")).toHaveLength(1);
    expect(createSubmissionId).toHaveBeenCalledOnce();
    expect(createDiagnosis).not.toHaveBeenCalled();
  });

  it("moves forward and back while keeping one focused section", async () => {
    const user = userEvent.setup();
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

    await user.click(screen.getByRole("radio", { name: "Por hora" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByText("2 de 7")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Qual é sua meta mensal?",
      }),
    ).toHaveFocus();
    expect(screen.getAllByTestId("wizard-step")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Voltar" }));

    expect(screen.getByText("1 de 7")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Como você cobra hoje?",
      }),
    ).toHaveFocus();
    expect(screen.getAllByTestId("wizard-step")).toHaveLength(1);
    expect(createSubmissionId).toHaveBeenCalledOnce();
    expect(createDiagnosis).not.toHaveBeenCalled();
  });

  it.each([
    ["Por hora", "Valor por hora"],
    ["Por minuto", "Valor por minuto"],
    ["Por atendimento", "Valor por atendimento"],
  ])("renders only the price fields for %s", async (method, priceLabel) => {
    const user = userEvent.setup();
    const { createDiagnosis } = renderWizard();

    await user.click(screen.getByRole("radio", { name: method }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Renda mensal desejada"), "5000");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Despesas fixas mensais"), "1200");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Horas de trabalho por mês"), "160");
    await user.type(screen.getByLabelText("Dias de trabalho por semana"), "5");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByLabelText(priceLabel)).toBeInTheDocument();
    expect(screen.getAllByTestId("wizard-step")).toHaveLength(1);
    if (method === "Por atendimento") {
      expect(
        screen.getByLabelText("Duração média do atendimento"),
      ).toBeInTheDocument();
    } else {
      expect(
        screen.queryByLabelText("Duração média do atendimento"),
      ).not.toBeInTheDocument();
    }

    await user.type(screen.getByLabelText(priceLabel), "125");
    if (method === "Por atendimento") {
      await user.type(
        screen.getByLabelText("Duração média do atendimento"),
        "45",
      );
    }
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Impostos"), "6");
    await user.type(screen.getByLabelText("Taxa do cartão"), "3");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByText("7 de 7")).toBeInTheDocument();
    expect(screen.getAllByTestId("wizard-step")).toHaveLength(1);
    expect(createDiagnosis).not.toHaveBeenCalled();
  });

  it("completes all six input steps and preserves values when going back", async () => {
    const user = userEvent.setup();
    const { createDiagnosis } = renderWizard();

    await user.click(screen.getByRole("radio", { name: "Por hora" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Renda mensal desejada"), "5000");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Despesas fixas mensais"), "1200");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Horas de trabalho por mês"), "160");
    await user.type(screen.getByLabelText("Dias de trabalho por semana"), "5");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Valor por hora"), "125,90");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Impostos"), "6,25");
    await user.type(screen.getByLabelText("Taxa do cartão"), "3,50");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByText("7 de 7")).toBeInTheDocument();
    expect(screen.getAllByTestId("wizard-step")).toHaveLength(1);
    expect(createDiagnosis).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Voltar" }));
    expect(screen.getByLabelText("Impostos")).toHaveValue("6,25");
    expect(screen.getByLabelText("Taxa do cartão")).toHaveValue("3,50");
  });

  it("links work-routine errors and stays on the invalid step", async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.click(screen.getByRole("radio", { name: "Por hora" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(
      screen.getByLabelText("Horas de trabalho por mês"),
      "744,01",
    );
    await user.type(screen.getByLabelText("Dias de trabalho por semana"), "8");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    const hours = screen.getByLabelText("Horas de trabalho por mês");
    const days = screen.getByLabelText("Dias de trabalho por semana");
    expect(hours).toHaveAttribute("aria-invalid", "true");
    expect(hours).toHaveAttribute("aria-describedby", "monthlyWorkHours-error");
    expect(days).toHaveAttribute("aria-invalid", "true");
    expect(days).toHaveAttribute("aria-describedby", "weeklyWorkDays-error");
    expect(screen.getAllByRole("alert")).toHaveLength(2);
    expect(
      screen.getByRole("heading", { name: "Como é sua rotina de trabalho?" }),
    ).toBeInTheDocument();
  });

  it("rejects zero/fractional appointment values and excessive fees", async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.click(screen.getByRole("radio", { name: "Por atendimento" }));
    for (let step = 0; step < 4; step += 1) {
      await user.click(screen.getByRole("button", { name: "Continuar" }));
    }
    await user.type(screen.getByLabelText("Valor por atendimento"), "0");
    await user.type(
      screen.getByLabelText("Duração média do atendimento"),
      "45,5",
    );
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(
      screen.getByLabelText("Duração média do atendimento"),
    ).toHaveAttribute("aria-invalid", "true");

    await user.clear(screen.getByLabelText("Duração média do atendimento"));
    await user.type(
      screen.getByLabelText("Duração média do atendimento"),
      "45",
    );
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByLabelText("Valor por atendimento")).toHaveAttribute(
      "aria-invalid",
      "true",
    );

    await user.clear(screen.getByLabelText("Valor por atendimento"));
    await user.type(screen.getByLabelText("Valor por atendimento"), "350");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Impostos"), "100,01");
    await user.type(screen.getByLabelText("Taxa do cartão"), "100,01");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByLabelText("Impostos")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Taxa do cartão")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("supports keyboard radio selection and clears an old method price", async () => {
    const user = userEvent.setup();
    renderWizard();

    const hour = screen.getByRole("radio", { name: "Por hora" });
    hour.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Por minuto" })).toBeChecked();
    await user.click(hour);

    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Valor por hora"), "125");
    for (let step = 0; step < 4; step += 1) {
      await user.click(screen.getByRole("button", { name: "Voltar" }));
    }
    await user.click(screen.getByRole("radio", { name: "Por minuto" }));
    for (let step = 0; step < 4; step += 1) {
      await user.click(screen.getByRole("button", { name: "Continuar" }));
    }

    expect(screen.getByLabelText("Valor por minuto")).toHaveValue("");
    expect(screen.queryByLabelText("Valor por hora")).not.toBeInTheDocument();
  });
});
