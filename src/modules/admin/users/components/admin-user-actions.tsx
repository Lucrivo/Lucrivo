"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontalIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

import { changeAdminUser } from "../change-admin-user.action";
import { formatDate } from "../admin-users.formatters";
import type { AdminUser } from "../admin-users.schema";

type Action =
  | "courtesy_granted"
  | "courtesy_ended"
  | "blocked"
  | "unblocked"
  | "soft_deleted"
  | "restored";
type CourtesyMode = "1" | "7" | "30" | "custom";

const labels: Record<Action, string> = {
  courtesy_granted: "Gerenciar cortesia",
  courtesy_ended: "Encerrar cortesia",
  blocked: "Bloquear usuário",
  unblocked: "Desbloquear usuário",
  soft_deleted: "Excluir usuário",
  restored: "Restaurar usuário",
};
const courtesyOptions = [
  { value: "1", label: "1 dia" },
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "custom", label: "Personalizar" },
] as const;

function AdminUserActions({
  user,
  listContext = "",
}: {
  user: AdminUser;
  listContext?: string;
}) {
  const router = useRouter();
  const [action, setAction] = useState<Action | null>(null);
  const [reason, setReason] = useState("");
  const [courtesyMode, setCourtesyMode] = useState<CourtesyMode>("7");
  const [expiry, setExpiry] = useState("");
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const detail = `/admin/users/${user.id}${listContext ? `?from=${encodeURIComponent(listContext)}` : ""}`;
  const hasActiveCourtesy =
    user.courtesyExpiresAt !== null &&
    new Date(user.courtesyExpiresAt) > new Date();

  function begin(next: Action) {
    setSuccessMessage("");
    setMessage("");
    setReason("");
    setExpiry("");
    setCourtesyMode("7");
    setAction(next);
  }

  function customExpiry() {
    if (!expiry || Number.isNaN(Date.parse(`${expiry}:00-03:00`))) return null;
    return new Date(`${expiry}:00-03:00`).toISOString();
  }

  function submit() {
    if (!action || !reason.trim()) {
      setMessage("Informe o motivo da alteração.");
      return;
    }
    const isPreset = action === "courtesy_granted" && courtesyMode !== "custom";
    const courtesyDurationDays = isPreset
      ? (Number(courtesyMode) as 1 | 7 | 30)
      : null;
    const courtesyExpiresAt =
      action === "courtesy_granted" && courtesyMode === "custom"
        ? customExpiry()
        : null;
    if (
      action === "courtesy_granted" &&
      courtesyMode === "custom" &&
      (!courtesyExpiresAt || new Date(courtesyExpiresAt) <= new Date())
    ) {
      setMessage("Escolha uma data e horário futuros em São Paulo.");
      return;
    }

    startTransition(async () => {
      const result = await changeAdminUser({
        userId: user.id,
        action,
        reason,
        courtesyDurationDays,
        courtesyExpiresAt,
        expectedVersion: user.version,
      });
      if (result.status === "updated") {
        const feedback =
          action === "courtesy_granted" && result.courtesyExpiresAt
            ? `Atualizado. Cortesia até ${formatDate(result.courtesyExpiresAt)}.`
            : action === "courtesy_ended"
              ? "Atualizado. Cortesia encerrada."
              : "Atualizado.";
        setAction(null);
        setSuccessMessage(feedback);
        router.refresh();
        return;
      }
      setMessage(
        {
          paid_conflict:
            "Há acesso pago vigente. Resolva a assinatura antes de bloquear ou excluir.",
          conflict:
            "O cadastro mudou desde que esta tela foi aberta. Atualize a página e tente novamente.",
          not_found: "Este usuário não está mais disponível.",
          invalid: "Confira o motivo e a validade da cortesia.",
          error: "Não foi possível concluir a ação. Tente novamente.",
        }[result.status],
      );
    });
  }

  const absoluteExpiry = customExpiry();

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label={`Ações para ${user.email}`}
              />
            }
          >
            <MoreHorizontalIcon aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={detail} />}>
              Ver usuário
            </DropdownMenuItem>
            <DropdownMenuItem
              render={
                <Link
                  href={`${detail}${detail.includes("?") ? "&" : "?"}tab=history`}
                />
              }
            >
              Ver histórico
            </DropdownMenuItem>
            <DropdownMenuItem
              render={
                <Link
                  href={`${detail}${detail.includes("?") ? "&" : "?"}tab=subscription`}
                />
              }
            >
              Ver assinatura
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {user.state === "active" && (
              <DropdownMenuItem onClick={() => begin("courtesy_granted")}>
                Gerenciar cortesia
              </DropdownMenuItem>
            )}
            {user.state !== "deleted" &&
              (user.state === "blocked" ? (
                <DropdownMenuItem onClick={() => begin("unblocked")}>
                  Desbloquear
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => begin("blocked")}>
                  Bloquear
                </DropdownMenuItem>
              ))}
            {user.state === "deleted" ? (
              <DropdownMenuItem onClick={() => begin("restored")}>
                Restaurar
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => begin("soft_deleted")}
              >
                Excluir
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {successMessage && (
          <span
            role="status"
            aria-label={successMessage}
            className="text-success max-w-64 text-right text-xs"
          >
            {successMessage}
          </span>
        )}
      </div>

      <Dialog
        open={action !== null}
        onOpenChange={(open) => {
          if (!open) setAction(null);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>
              {action ? labels[action] : "Alterar usuário"}
            </DialogTitle>
            <DialogDescription>
              {user.email}. Esta alteração será registrada no histórico e exige
              um motivo.
              {(action === "blocked" || action === "soft_deleted") &&
                user.hasPaidAccess &&
                " Há acesso pago vigente; o sistema recusará o bloqueio ou a exclusão até que a assinatura seja resolvida."}
              {action === "soft_deleted" &&
                " A exclusão é lógica: mantém diagnósticos, contratos e pagamentos e não cancela cobranças."}
            </DialogDescription>
          </DialogHeader>

          {action === "courtesy_granted" && (
            <div className="grid gap-3">
              <Label>Duração</Label>
              <RadioGroup
                aria-label="Duração da cortesia"
                value={courtesyMode}
                onValueChange={(value) => {
                  if (
                    value === "1" ||
                    value === "7" ||
                    value === "30" ||
                    value === "custom"
                  ) {
                    setCourtesyMode(value);
                  }
                }}
                className="grid gap-2 sm:grid-cols-4"
              >
                {courtesyOptions.map((option) => (
                  <label
                    key={option.value}
                    className="has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5 flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium"
                  >
                    <RadioGroupItem value={option.value} />
                    {option.label}
                  </label>
                ))}
              </RadioGroup>
              {courtesyMode === "custom" ? (
                <div className="grid gap-2">
                  <Label htmlFor={`expiry-${user.id}`}>
                    Validade em São Paulo
                  </Label>
                  <Input
                    id={`expiry-${user.id}`}
                    type="datetime-local"
                    value={expiry}
                    onChange={(event) => setExpiry(event.target.value)}
                  />
                  {absoluteExpiry && (
                    <p className="text-muted-foreground text-xs">
                      Expira em {formatDate(absoluteExpiry)}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {courtesyMode} {courtesyMode === "1" ? "dia" : "dias"} a
                  partir da confirmação
                </p>
              )}
              {hasActiveCourtesy && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAction("courtesy_ended")}
                >
                  Encerrar cortesia
                </Button>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor={`reason-${user.id}`}>Motivo</Label>
            <Textarea
              id={`reason-${user.id}`}
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Descreva por que esta alteração é necessária"
            />
          </div>
          {message && (
            <p role="alert" className="text-destructive text-sm">
              {message}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setAction(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant={action === "soft_deleted" ? "destructive" : "default"}
              disabled={pending}
              onClick={submit}
            >
              {pending ? "Salvando…" : "Confirmar alteração"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export { AdminUserActions };
