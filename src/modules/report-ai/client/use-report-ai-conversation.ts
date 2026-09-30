"use client";

import { useCallback, useReducer, useRef } from "react";

import { reportAiHistorySchema } from "../schemas/report-ai.schema";
import type {
  ReportAiHistory,
  ReportAiRetry,
  ReportAiTurnDto,
} from "../report-ai.types";
import { readReportAiEventStream } from "./report-ai-stream";

type ConversationStateName = "idle" | "loading_history" | "streaming" | "error";
type ConversationError = { code: string; retry: ReportAiRetry };

type ConversationState = {
  history: ReportAiHistory;
  draft: string;
  streamingText: string;
  pendingQuestion: string | null;
  state: ConversationStateName;
  error: ConversationError | null;
};

type ConversationAction =
  | { type: "draft_changed"; value: string }
  | { type: "history_loading" }
  | { type: "history_loaded"; history: ReportAiHistory }
  | { type: "send_started"; question: string }
  | { type: "delta_received"; text: string }
  | { type: "completed"; turn: ReportAiTurnDto }
  | { type: "failed"; error: ConversationError };

function reducer(
  state: ConversationState,
  action: ConversationAction,
): ConversationState {
  switch (action.type) {
    case "draft_changed":
      return { ...state, draft: action.value.slice(0, 2_000) };
    case "history_loading":
      return { ...state, state: "loading_history", error: null };
    case "history_loaded":
      return {
        ...state,
        history: action.history,
        streamingText: "",
        pendingQuestion: null,
        state: "idle",
        error: null,
      };
    case "send_started":
      return {
        ...state,
        streamingText: "",
        pendingQuestion: action.question,
        state: "streaming",
        error: null,
      };
    case "delta_received":
      return { ...state, streamingText: state.streamingText + action.text };
    case "completed":
      return {
        ...state,
        history: {
          ...state.history,
          turns: [
            ...state.history.turns.filter((turn) => turn.id !== action.turn.id),
            action.turn,
          ],
        },
        draft: "",
        streamingText: "",
        pendingQuestion: null,
        state: "idle",
        error: null,
      };
    case "failed":
      return { ...state, state: "error", error: action.error };
  }
}

type UseReportAiConversationConfig = {
  diagnosisId: number;
  reportVersion: number;
  canAsk: boolean;
  initialHistory: ReportAiHistory;
};

type UseReportAiConversationResult = ConversationState & {
  setDraft(value: string): void;
  selectVersion(version: number): Promise<void>;
  send(): Promise<void>;
  retry(): Promise<void>;
};

function errorRetryForStatus(status: number, code: string): ReportAiRetry {
  if (code === "generation_in_progress" || status === 503)
    return "same_request";
  return "new_request";
}

async function readHttpError(response: Response): Promise<ConversationError> {
  try {
    const body: unknown = await response.json();
    const code =
      body &&
      typeof body === "object" &&
      "error" in body &&
      typeof body.error === "string"
        ? body.error
        : "service_unavailable";
    return { code, retry: errorRetryForStatus(response.status, code) };
  } catch {
    return { code: "service_unavailable", retry: "same_request" };
  }
}

function useReportAiConversation({
  diagnosisId,
  reportVersion,
  canAsk,
  initialHistory,
}: UseReportAiConversationConfig): UseReportAiConversationResult {
  const [state, dispatch] = useReducer(reducer, {
    history: initialHistory,
    draft: "",
    streamingText: "",
    pendingQuestion: null,
    state: "idle",
    error: null,
  });
  const inFlight = useRef(false);
  const activeRequestId = useRef<string | null>(null);

  const performSend = useCallback(
    async (question: string, requestId: string) => {
      if (inFlight.current) return;
      inFlight.current = true;
      dispatch({ type: "send_started", question });

      try {
        const response = await fetch(
          `/api/reports/${diagnosisId}/ai/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requestId, reportVersion, question }),
          },
        );
        if (!response.ok) {
          dispatch({ type: "failed", error: await readHttpError(response) });
          return;
        }

        let terminal = false;
        for await (const event of readReportAiEventStream(response)) {
          if (event.type === "delta") {
            dispatch({ type: "delta_received", text: event.text });
          } else if (event.type === "completed") {
            terminal = true;
            activeRequestId.current = null;
            dispatch({ type: "completed", turn: event.turn });
          } else if (event.type === "failed") {
            terminal = true;
            dispatch({
              type: "failed",
              error: { code: event.code, retry: event.retry },
            });
          }
        }
        if (!terminal) {
          dispatch({
            type: "failed",
            error: { code: "service_unavailable", retry: "same_request" },
          });
        }
      } catch {
        dispatch({
          type: "failed",
          error: { code: "service_unavailable", retry: "same_request" },
        });
      } finally {
        inFlight.current = false;
      }
    },
    [diagnosisId, reportVersion],
  );

  const send = useCallback(async () => {
    const question = state.draft.trim();
    if (
      inFlight.current ||
      !canAsk ||
      state.history.selectedVersion !== reportVersion ||
      question.length === 0 ||
      question.length > 2_000
    ) {
      return;
    }

    const requestId = crypto.randomUUID();
    activeRequestId.current = requestId;
    await performSend(question, requestId);
  }, [
    canAsk,
    performSend,
    reportVersion,
    state.draft,
    state.history.selectedVersion,
  ]);

  const retry = useCallback(async () => {
    if (inFlight.current || !state.error || !canAsk) return;
    const question = (state.pendingQuestion ?? state.draft).trim();
    if (question.length === 0 || question.length > 2_000) return;

    const requestId =
      state.error.retry === "same_request" && activeRequestId.current
        ? activeRequestId.current
        : crypto.randomUUID();
    activeRequestId.current = requestId;
    await performSend(question, requestId);
  }, [canAsk, performSend, state.draft, state.error, state.pendingQuestion]);

  const selectVersion = useCallback(
    async (version: number) => {
      if (inFlight.current || !Number.isSafeInteger(version) || version < 0)
        return;
      inFlight.current = true;
      dispatch({ type: "history_loading" });
      try {
        const response = await fetch(
          `/api/reports/${diagnosisId}/ai/conversations?version=${version}`,
          { cache: "no-store" },
        );
        if (!response.ok) {
          dispatch({ type: "failed", error: await readHttpError(response) });
          return;
        }
        const parsed = reportAiHistorySchema.safeParse(await response.json());
        if (!parsed.success) throw new Error("invalid_history");
        dispatch({ type: "history_loaded", history: parsed.data });
      } catch {
        dispatch({
          type: "failed",
          error: { code: "service_unavailable", retry: "same_request" },
        });
      } finally {
        inFlight.current = false;
      }
    },
    [diagnosisId],
  );

  return {
    ...state,
    setDraft(value) {
      dispatch({ type: "draft_changed", value });
    },
    selectVersion,
    send,
    retry,
  };
}

export { useReportAiConversation };
export type { UseReportAiConversationConfig, UseReportAiConversationResult };
