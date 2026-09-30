import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useReportAiConversation } = vi.hoisted(() => ({
  useReportAiConversation: vi.fn(),
}));

vi.mock("../client/use-report-ai-conversation", () => ({
  useReportAiConversation,
}));

import type { ReportAiHistory } from "../report-ai.types";
import { ReportAiAssistant } from "./report-ai-assistant";

const emptyHistory: ReportAiHistory = {
  currentVersion: 3,
  selectedVersion: 3,
  versions: [3, 2],
  summary: "",
  turns: [],
};

function viewModel(overrides: Record<string, unknown> = {}) {
  return {
    history: emptyHistory,
    draft: "",
    setDraft: vi.fn(),
    streamingText: "",
    pendingQuestion: null,
    state: "idle",
    error: null,
    selectVersion: vi.fn(),
    send: vi.fn().mockResolvedValue(undefined),
    retry: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function renderAssistant(
  props: Partial<React.ComponentProps<typeof ReportAiAssistant>> = {},
) {
  return render(
    <ReportAiAssistant
      diagnosisId={42}
      reportVersion={3}
      canAsk
      initialHistory={emptyHistory}
      {...props}
    />,
  );
}

describe("ReportAiAssistant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useReportAiConversation.mockReturnValue(viewModel());
  });

  it("opens the assistant with an empty-state suggestion", async () => {
    const user = userEvent.setup();
    renderAssistant();

    const trigger = screen.getByRole("button", {
      name: "Abrir Assistente Lucrivo",
    });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);

    expect(
      screen.getByRole("heading", { name: "Assistente Lucrivo" }),
    ).toBeVisible();
    expect(screen.getByText("Por que minha margem está baixa?")).toBeVisible();
    expect(
      screen.getByText(
        "Posso ajudar a interpretar os resultados e explicar os próximos passos deste relatório.",
      ),
    ).toBeVisible();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("closes with Escape and restores focus to the trigger", async () => {
    const user = userEvent.setup();
    renderAssistant();
    const trigger = screen.getByRole("button", {
      name: "Abrir Assistente Lucrivo",
    });
    await user.click(trigger);
    await user.keyboard("{Escape}");

    await waitFor(() => expect(trigger).toHaveFocus());
    expect(
      screen.queryByRole("heading", { name: "Assistente Lucrivo" }),
    ).not.toBeInTheDocument();
  });

  it("submits a suggestion through the conversation hook", async () => {
    const conversation = viewModel();
    useReportAiConversation.mockReturnValue(conversation);
    const user = userEvent.setup();
    renderAssistant();
    await user.click(
      screen.getByRole("button", { name: "Abrir Assistente Lucrivo" }),
    );

    await user.click(
      screen.getByRole("button", { name: "Por que minha margem está baixa?" }),
    );

    expect(conversation.setDraft).toHaveBeenCalledWith(
      "Por que minha margem está baixa?",
    );
    expect(conversation.send).toHaveBeenCalledOnce();
  });

  it("disables the composer while streaming and announces the response", async () => {
    useReportAiConversation.mockReturnValue(
      viewModel({
        draft: "Pergunta",
        pendingQuestion: "Pergunta",
        streamingText: "Sua margem está",
        state: "streaming",
      }),
    );
    const user = userEvent.setup();
    renderAssistant();
    await user.click(
      screen.getByRole("button", { name: "Abrir Assistente Lucrivo" }),
    );

    expect(
      screen.getByRole("textbox", { name: "Sua pergunta" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Enviando pergunta" }),
    ).toBeDisabled();
    expect(
      screen.getByText("Sua margem está").closest("[aria-live]"),
    ).toHaveAttribute("aria-live", "polite");
  });

  it("announces provider and history waits", async () => {
    useReportAiConversation.mockReturnValue(
      viewModel({
        pendingQuestion: "Pergunta",
        state: "streaming",
      }),
    );
    const user = userEvent.setup();
    const { rerender } = renderAssistant();
    await user.click(
      screen.getByRole("button", { name: "Abrir Assistente Lucrivo" }),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Analisando este relatório…",
    );

    useReportAiConversation.mockReturnValue(
      viewModel({ state: "loading_history" }),
    );
    rerender(
      <ReportAiAssistant
        diagnosisId={42}
        reportVersion={3}
        canAsk
        initialHistory={emptyHistory}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Carregando histórico…",
    );
  });

  it("shows the character count near the limit", async () => {
    useReportAiConversation.mockReturnValue(
      viewModel({ draft: "a".repeat(1_950) }),
    );
    const user = userEvent.setup();
    renderAssistant();
    await user.click(
      screen.getByRole("button", { name: "Abrir Assistente Lucrivo" }),
    );

    expect(screen.getByText("1.950/2.000 caracteres")).toBeVisible();
  });

  it("makes a previous version read-only", async () => {
    useReportAiConversation.mockReturnValue(
      viewModel({ history: { ...emptyHistory, selectedVersion: 2 } }),
    );
    const user = userEvent.setup();
    renderAssistant();
    await user.click(
      screen.getByRole("button", { name: "Abrir Assistente Lucrivo" }),
    );

    expect(
      screen.getByText(
        "Este histórico pertence a uma versão anterior do relatório e está disponível apenas para leitura.",
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("textbox", { name: "Sua pergunta" }),
    ).toBeDisabled();
  });

  it("keeps history visible with a billing CTA when the plan is inactive", async () => {
    const user = userEvent.setup();
    renderAssistant({ canAsk: false });
    await user.click(
      screen.getByRole("button", { name: "Abrir Assistente Lucrivo" }),
    );

    expect(
      screen.getByText(
        "Seu histórico continua disponível. Reative uma assinatura paga para enviar novas perguntas.",
      ),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Ver planos" })).toHaveAttribute(
      "href",
      "/billing",
    );
  });

  it("renders safe failure copy and retries", async () => {
    const conversation = viewModel({
      error: { code: "provider_timeout", retry: "new_request" },
      state: "error",
      pendingQuestion: "Pergunta",
    });
    useReportAiConversation.mockReturnValue(conversation);
    const user = userEvent.setup();
    renderAssistant();
    await user.click(
      screen.getByRole("button", { name: "Abrir Assistente Lucrivo" }),
    );

    expect(
      screen.getByText(
        "A resposta demorou mais que o esperado. Você pode tentar novamente.",
      ),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Tentar como nova pergunta" }),
    );
    expect(conversation.retry).toHaveBeenCalledOnce();
  });
});
