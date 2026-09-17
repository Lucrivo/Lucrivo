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
import { Textarea } from "@/components/ui/textarea";

import { changeAdminUser } from "../change-admin-user.action";
import type { AdminUser } from "../admin-users.schema";
import { formatDate } from "../admin-users.formatters";

type Action =
  | "courtesy_granted"
  | "courtesy_ended"
  | "blocked"
  | "unblocked"
  | "soft_deleted"
  | "restored";
const labels: Record<Action, string> = {
  courtesy_granted: "Conceder acesso de cortesia",
  courtesy_ended: "Encerrar acesso de cortesia",
  blocked: "Bloquear usuário",
  unblocked: "Desbloquear usuário",
  soft_deleted: "Excluir usuário",
  restored: "Restaurar usuário",
};

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
  const [expiry, setExpiry] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();
  const detail = `/admin/users/${user.id}${listContext ? `?from=${encodeURIComponent(listContext)}` : ""}`;

  function begin(next: Action) {
    setSuccess(false);
    setMessage("");
    setReason("");
    setExpiry("");
    setAction(next);
  }

  function submit() {
    if (!action || !reason.trim()) {
      setMessage("Informe o motivo da alteração.");
      return;
    }
    const courtesyExpiresAt =
      action === "courtesy_granted"
        ? expiry && !Number.isNaN(Date.parse(`${expiry}:00-03:00`))
          ? new Date(`${expiry}:00-03:00`).toISOString()
          : null
        : null;
    if (
      action === "courtesy_granted" &&
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
        courtesyExpiresAt,
        expectedVersion: user.version,
      });
      if (result.status === "updated") {
        setAction(null);
        setSuccess(true);
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
          invalid: "Confira o motivo e a data de validade.",
          error: "Não foi possível concluir a ação. Tente novamente.",
        }[result.status],
      );
    });
  }

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
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
            {user.state === "active" &&
              (user.courtesyExpiresAt &&
              new Date(user.courtesyExpiresAt) > new Date() ? (
                <DropdownMenuItem onClick={() => begin("courtesy_ended")}>
                  Encerrar cortesia
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => begin("courtesy_granted")}>
                  Alterar acesso
                </DropdownMenuItem>
              ))}
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
        {success && (
          <span role="status" className="text-success text-xs">
            Atualizado
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
            <div className="grid gap-2">
              <Label htmlFor={`expiry-${user.id}`}>Validade em São Paulo</Label>
              <Input
                id={`expiry-${user.id}`}
                type="datetime-local"
                value={expiry}
                onChange={(event) => setExpiry(event.target.value)}
              />
              {expiry && !Number.isNaN(Date.parse(`${expiry}:00-03:00`)) && (
                <p className="text-muted-foreground text-xs">
                  Expira em{" "}
                  {formatDate(new Date(`${expiry}:00-03:00`).toISOString())}
                </p>
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
