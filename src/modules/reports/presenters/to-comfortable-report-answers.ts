import type { ExecutiveSummaryAnswer } from "../types";

function lowerInitial(value: string): string {
  return value.charAt(0).toLocaleLowerCase("pt-BR") + value.slice(1);
}

function toComfortableReportAnswers(
  answers: readonly ExecutiveSummaryAnswer[],
): ExecutiveSummaryAnswer[] {
  return answers.map((entry) => ({
    ...entry,
    answer:
      entry.key !== "immediate_action" ||
      entry.answer.startsWith("Agora, o mais importante é:")
        ? entry.answer
        : `Agora, o mais importante é: ${lowerInitial(entry.answer)}`,
  }));
}

export { toComfortableReportAnswers };
