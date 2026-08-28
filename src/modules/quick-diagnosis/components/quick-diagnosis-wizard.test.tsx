import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { QuickDiagnosisWizard } from "./quick-diagnosis-wizard";

describe("QuickDiagnosisWizard", () => {
  function renderWizard(
    createDiagnosis = vi.fn(),
    createSubmissionId = vi.fn(() => "550e8400-e29b-41d4-a716-446655440000"),
  ) {
    render(
      <QuickDiagnosisWizard
        createDiagnosis={createDiagnosis}
        createSubmissionId={createSubmissionId}
      />,
    );
    return { createDiagnosis, createSubmissionId };
  }

  async function completeValidDiagnosis() {
    const user = userEvent.setup();
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
    return user;
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

  it("reviews grouped, formatted answers and edits each source step", async () => {
    const { createDiagnosis } = renderWizard();
    const user = await completeValidDiagnosis();

    expect(screen.getByText("7 de 7")).toBeInTheDocument();
    expect(screen.getByText("Por hora")).toBeInTheDocument();
    expect(screen.getByText("R$ 5.000,00")).toBeInTheDocument();
    expect(screen.getByText("160 horas por mês")).toBeInTheDocument();
    expect(screen.getByText("6,25%")).toBeInTheDocument();
    expect(createDiagnosis).not.toHaveBeenCalled();

    const edits = [
      ["Editar forma de cobrança", "Como você cobra hoje?"],
      ["Editar meta mensal", "Qual é sua meta mensal?"],
      ["Editar despesas fixas", "Quais são suas despesas fixas?"],
      ["Editar rotina", "Como é sua rotina de trabalho?"],
      ["Editar preço atual", "Qual é seu preço atual?"],
      ["Editar taxas", "Quais taxas incidem nas vendas?"],
    ] as const;

    for (const [buttonName, heading] of edits) {
      await user.click(screen.getByRole("button", { name: buttonName }));
      expect(
        screen.getByRole("heading", { name: heading }),
      ).toBeInTheDocument();
      while (!screen.queryByText("7 de 7")) {
        await user.click(screen.getByRole("button", { name: "Continuar" }));
      }
    }

    await user.click(
      screen.getByRole("button", { name: "Editar meta mensal" }),
    );
    expect(screen.getByLabelText("Renda mensal desejada")).toHaveValue("5000");
  });

  it("locks submission and renders success with a clean new diagnosis", async () => {
    let resolveDiagnosis: (result: {
      status: "success";
      diagnosisId: number;
    }) => void = () => undefined;
    const createDiagnosis = vi.fn(
      () =>
        new Promise<{ status: "success"; diagnosisId: number }>((resolve) => {
          resolveDiagnosis = resolve;
        }),
    );
    const createSubmissionId = vi
      .fn()
      .mockReturnValueOnce("550e8400-e29b-41d4-a716-446655440000")
      .mockReturnValueOnce("550e8400-e29b-41d4-a716-446655440001");
    renderWizard(createDiagnosis, createSubmissionId);
    const user = await completeValidDiagnosis();

    const confirm = screen.getByRole("button", {
      name: "Confirmar diagnóstico",
    });
    await user.dblClick(confirm);

    expect(createDiagnosis).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Enviando..." })).toBeDisabled();
    expect(createDiagnosis).toHaveBeenCalledWith(
      expect.objectContaining({
        submissionId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    );

    resolveDiagnosis({ status: "success", diagnosisId: 42 });
    expect(
      await screen.findByRole("heading", { name: "Diagnóstico salvo" }),
    ).toHaveFocus();
    expect(
      screen.getByRole("link", { name: "Ir para o dashboard" }),
    ).toHaveAttribute("href", "/dashboard");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Iniciar outro diagnóstico" }),
    );
    expect(screen.getByText("1 de 7")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Por hora" })).not.toBeChecked();
    expect(createSubmissionId).toHaveBeenCalledTimes(2);
  });

  it.each([
    [
      "create_failed",
      "Não foi possível salvar o diagnóstico. Tente novamente.",
    ],
    ["unauthorized", "Sua sessão expirou. Entre novamente para continuar."],
  ] as const)("preserves the review after %s", async (error, message) => {
    const createDiagnosis = vi
      .fn()
      .mockResolvedValue({ status: "error", error });
    renderWizard(createDiagnosis);
    const user = await completeValidDiagnosis();

    await user.click(
      screen.getByRole("button", { name: "Confirmar diagnóstico" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByText("7 de 7")).toBeInTheDocument();
    expect(screen.getByText("R$ 5.000,00")).toBeInTheDocument();
    if (error === "unauthorized") {
      expect(
        screen.getByRole("link", { name: "Entrar novamente" }),
      ).toHaveAttribute("href", "/login");
    }

    await user.click(
      screen.getByRole("button", { name: "Confirmar diagnóstico" }),
    );
    expect(createDiagnosis).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        submissionId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    );
  });

  it("routes invalid server fields to the earliest step and focuses the input", async () => {
    const createDiagnosis = vi.fn().mockResolvedValue({
      status: "error",
      error: "invalid_input",
      fieldErrors: {
        taxRate: ["Taxa inválida."],
        desiredMonthlyIncome: ["Meta inválida."],
      },
    });
    renderWizard(createDiagnosis);
    const user = await completeValidDiagnosis();

    await user.click(
      screen.getByRole("button", { name: "Confirmar diagnóstico" }),
    );

    expect(await screen.findByLabelText("Renda mensal desejada")).toHaveFocus();
    expect(screen.getByRole("alert")).toHaveTextContent("Meta inválida.");
  });

  it("regenerates an invalid uneditable submission id", async () => {
    const createDiagnosis = vi
      .fn()
      .mockResolvedValueOnce({
        status: "error",
        error: "invalid_input",
        fieldErrors: { submissionId: ["Identificador inválido."] },
      })
      .mockResolvedValueOnce({ status: "success", diagnosisId: 42 });
    const createSubmissionId = vi
      .fn()
      .mockReturnValueOnce("550e8400-e29b-41d4-a716-446655440000")
      .mockReturnValueOnce("550e8400-e29b-41d4-a716-446655440001");
    renderWizard(createDiagnosis, createSubmissionId);
    const user = await completeValidDiagnosis();

    await user.click(
      screen.getByRole("button", { name: "Confirmar diagnóstico" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Como você cobra hoje?" }),
    ).toBeInTheDocument();

    for (let step = 0; step < 6; step += 1) {
      await user.click(screen.getByRole("button", { name: "Continuar" }));
    }
    await user.click(
      screen.getByRole("button", { name: "Confirmar diagnóstico" }),
    );

    expect(createDiagnosis).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        submissionId: "550e8400-e29b-41d4-a716-446655440001",
      }),
    );
  });
});
