type ReportAiPromptMessage = {
  role: "user" | "assistant";
  content: string;
};

type CompletedReportAiTurn = {
  question: string;
  answer: string;
};

type BuildReportAiMessagesInput = {
  reportContext: string;
  conversationSummary: string;
  recentTurns: readonly CompletedReportAiTurn[];
  question: string;
};

function labelledUserData(label: string, value: string): ReportAiPromptMessage {
  return {
    role: "user",
    content: `${label}_INICIO\n${value}\n${label}_FIM`,
  };
}

function buildReportAiMessages({
  reportContext,
  conversationSummary,
  recentTurns,
  question,
}: BuildReportAiMessagesInput): ReportAiPromptMessage[] {
  const messages: ReportAiPromptMessage[] = [
    labelledUserData("DADOS_DO_RELATORIO", reportContext),
  ];

  if (conversationSummary.trim().length > 0) {
    messages.push(labelledUserData("RESUMO_DA_CONVERSA", conversationSummary));
  }

  for (const turn of recentTurns.slice(-10)) {
    messages.push(
      { role: "user", content: turn.question },
      { role: "assistant", content: turn.answer },
    );
  }

  messages.push({ role: "user", content: question });
  return messages;
}

export { buildReportAiMessages };
export type {
  BuildReportAiMessagesInput,
  CompletedReportAiTurn,
  ReportAiPromptMessage,
};
