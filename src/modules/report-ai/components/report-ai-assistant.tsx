"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpIcon,
  MessageCircleIcon,
  RotateCcwIcon,
  XIcon,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { useReportAiConversation } from "../client/use-report-ai-conversation";
import type { ReportAiHistory } from "../report-ai.types";

const suggestions = [
  "Por que minha margem está baixa?",
  "Qual é o ponto mais importante deste relatório?",
  "Que próximo passo devo considerar?",
];

const failureMessages: Record<string, string> = {
  provider_rejected:
    "Não foi possível responder a esta pergunta. Reformule o texto e tente novamente.",
  provider_timeout:
    "A resposta demorou mais que o esperado. Você pode tentar novamente.",
  generation_in_progress:
    "Já existe uma resposta em andamento para esta conversa. Aguarde um momento.",
  persistence_failed:
    "A resposta não pôde ser salva com segurança. Tente novamente.",
  rate_limited:
    "Muitas perguntas foram enviadas em pouco tempo. Aguarde um minuto e tente novamente.",
  monthly_limit: "O limite mensal de perguntas foi atingido.",
};

type ReportAiAssistantProps = {
  diagnosisId: number;
  reportVersion: number;
  canAsk: boolean;
  initialHistory: ReportAiHistory;
};

function ReportAiAssistant({
  diagnosisId,
  reportVersion,
  canAsk,
  initialHistory,
}: ReportAiAssistantProps) {
  const [open, setOpen] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const conversation = useReportAiConversation({
    diagnosisId,
    reportVersion,
    canAsk,
    initialHistory,
  });
  const isCurrentVersion =
    conversation.history.selectedVersion === reportVersion;
  const isBusy =
    conversation.state === "streaming" ||
    conversation.state === "loading_history";
  const composerDisabled = !canAsk || !isCurrentVersion || isBusy;
  const canSubmit = !composerDisabled && conversation.draft.trim().length > 0;

  useEffect(() => {
    if (open) titleRef.current?.focus();
  }, [open]);

  function submitSuggestion(suggestion: string) {
    conversation.setDraft(suggestion);
    void conversation.send();
  }

  function submit() {
    if (canSubmit) void conversation.send();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            type="button"
            aria-label="Abrir Assistente Lucrivo"
            aria-expanded={open}
            className="fixed right-4 bottom-4 z-40 size-14 rounded-full shadow-lg sm:right-6 sm:bottom-6"
          />
        }
      >
        <MessageCircleIcon aria-hidden="true" className="size-5" />
      </SheetTrigger>

      <SheetContent
        side="right"
        showCloseButton={false}
        className="inset-0 h-dvh w-full max-w-none gap-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[32rem] sm:max-w-[calc(100vw-2rem)]"
      >
        <SheetHeader className="border-border shrink-0 border-b px-4 py-3 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle
                ref={titleRef}
                tabIndex={-1}
                className="text-lg font-semibold tracking-tight outline-none"
              >
                Assistente Lucrivo
              </SheetTitle>
              <SheetDescription>
                Explicações baseadas somente neste relatório.
              </SheetDescription>
            </div>
            <SheetClose
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Fechar Assistente Lucrivo"
                />
              }
            >
              <XIcon aria-hidden="true" />
            </SheetClose>
          </div>

          {conversation.history.versions.length > 1 ? (
            <label className="text-muted-foreground mt-3 flex items-center gap-2 text-xs">
              Versão do relatório
              <select
                value={conversation.history.selectedVersion}
                disabled={isBusy}
                onChange={(event) =>
                  void conversation.selectVersion(Number(event.target.value))
                }
                className="border-input bg-card text-foreground focus-visible:border-ring focus-visible:ring-ring/20 h-8 rounded-lg border px-2 text-xs outline-none focus-visible:ring-3 disabled:opacity-60"
              >
                {conversation.history.versions.map((version) => (
                  <option key={version} value={version}>
                    Versão {version}
                    {version === reportVersion ? " (atual)" : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
          {!isCurrentVersion ? (
            <p className="bg-muted text-muted-foreground mb-5 rounded-xl px-3 py-2.5 text-sm leading-5">
              Este histórico pertence a uma versão anterior do relatório e está
              disponível apenas para leitura.
            </p>
          ) : null}

          {conversation.history.turns.length === 0 &&
          !conversation.pendingQuestion ? (
            <div className="mx-auto flex min-h-56 max-w-sm flex-col justify-center gap-5 text-center">
              <p className="text-muted-foreground leading-6">
                Posso ajudar a interpretar os resultados e explicar os próximos
                passos deste relatório.
              </p>
              {canAsk && isCurrentVersion ? (
                <div className="grid gap-2">
                  {suggestions.map((suggestion) => (
                    <Button
                      key={suggestion}
                      type="button"
                      variant="outline"
                      className="h-auto justify-start py-2.5 text-left whitespace-normal"
                      onClick={() => submitSuggestion(suggestion)}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-5">
              {conversation.history.turns.map((turn) => (
                <article key={turn.id} className="grid gap-2.5">
                  <p className="bg-primary text-primary-foreground ml-auto max-w-[88%] rounded-2xl rounded-br-md px-3.5 py-2.5 leading-5 whitespace-pre-wrap">
                    {turn.question}
                  </p>
                  {turn.answer ? (
                    <p className="bg-muted text-foreground max-w-[92%] rounded-2xl rounded-bl-md px-3.5 py-2.5 leading-6 whitespace-pre-wrap">
                      {turn.answer}
                    </p>
                  ) : null}
                </article>
              ))}

              {conversation.pendingQuestion ? (
                <div className="grid gap-2.5">
                  <p className="bg-primary text-primary-foreground ml-auto max-w-[88%] rounded-2xl rounded-br-md px-3.5 py-2.5 leading-5 whitespace-pre-wrap">
                    {conversation.pendingQuestion}
                  </p>
                  {conversation.streamingText ? (
                    <p
                      aria-live="polite"
                      aria-atomic="false"
                      className="bg-muted text-foreground max-w-[92%] rounded-2xl rounded-bl-md px-3.5 py-2.5 leading-6 whitespace-pre-wrap"
                    >
                      {conversation.streamingText}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}

          {conversation.error ? (
            <div className="border-destructive/25 bg-destructive/5 mt-5 rounded-xl border p-3">
              <p className="text-foreground text-sm leading-5" role="alert">
                {failureMessages[conversation.error.code] ??
                  "Não foi possível concluir a resposta. Tente novamente."}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => void conversation.retry()}
              >
                <RotateCcwIcon aria-hidden="true" />
                {conversation.error.retry === "new_request"
                  ? "Tentar como nova pergunta"
                  : "Tentar novamente"}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="border-border bg-popover shrink-0 border-t p-4 sm:p-5">
          {!canAsk ? (
            <div className="mb-4 grid gap-3">
              <p className="text-muted-foreground text-sm leading-5">
                Seu histórico continua disponível. Reative uma assinatura paga
                para enviar novas perguntas.
              </p>
              <Link
                href="/billing"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "w-fit",
                )}
              >
                Ver planos
              </Link>
            </div>
          ) : null}

          <div className="relative">
            <Textarea
              aria-label="Sua pergunta"
              value={conversation.draft}
              maxLength={2_000}
              rows={3}
              disabled={composerDisabled}
              placeholder={
                isCurrentVersion
                  ? "Pergunte sobre os números e orientações deste relatório"
                  : "Selecione a versão atual para perguntar"
              }
              className="max-h-36 min-h-24 resize-none pr-12"
              onChange={(event) => conversation.setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit();
                }
              }}
            />
            <Button
              type="button"
              size="icon"
              aria-label={isBusy ? "Enviando pergunta" : "Enviar pergunta"}
              disabled={!canSubmit}
              className="absolute right-2 bottom-2"
              onClick={submit}
            >
              <ArrowUpIcon aria-hidden="true" />
            </Button>
          </div>
          <div className="mt-2 flex min-h-4 justify-between gap-3 text-xs">
            <p className="text-muted-foreground">
              Enter envia · Shift + Enter quebra a linha
            </p>
            {conversation.draft.length >= 1_800 ? (
              <p className="text-muted-foreground tabular-nums">
                {conversation.draft.length.toLocaleString("pt-BR")}/2.000
                caracteres
              </p>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export { ReportAiAssistant };
export type { ReportAiAssistantProps };
