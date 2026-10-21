import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { presentBillingMode } from "@/modules/admin/billing-mode";

import {
  accessLabel,
  accountLabel,
  formatDate,
} from "../admin-users.formatters";
import type { AdminUserDetail } from "../admin-users.schema";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 border-b py-3 last:border-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="min-w-0 text-sm leading-relaxed font-medium [overflow-wrap:anywhere]">
        {children}
      </dd>
    </div>
  );
}

function ProfileGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="min-w-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle>
          <h2 className="text-base font-semibold">{title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl>{children}</dl>
      </CardContent>
    </Card>
  );
}

function AdminUserProfile({ user }: { user: AdminUserDetail }) {
  const subcategory = user.subcategory
    ? (user.subcategory.customName ?? user.subcategory.name)
    : "Não informado";

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      <ProfileGroup title="Identidade">
        <Field label="Nome">
          {user.fullName ?? "Nome ainda não informado"}
        </Field>
        <Field label="E-mail">{user.email}</Field>
        <Field label="ID interno">{user.id}</Field>
      </ProfileGroup>

      <ProfileGroup title="Atividade">
        <Field label="Cadastro">{formatDate(user.createdAt)}</Field>
        <Field label="Onboarding">
          {formatDate(user.onboardingCompletedAt)}
        </Field>
        <Field label="Último acesso">{formatDate(user.lastSignInAt)}</Field>
        <Field label="Diagnósticos">{user.diagnosisCount}</Field>
      </ProfileGroup>

      <ProfileGroup title="Contexto do negócio">
        <Field label="Segmento">{user.segment?.name ?? "Não informado"}</Field>
        <Field label="Subcategoria">{subcategory}</Field>
      </ProfileGroup>

      <ProfileGroup title="Conta e acesso">
        <Field label="Estado da conta">
          <Badge variant={user.state === "active" ? "success" : "destructive"}>
            {accountLabel(user.state)}
          </Badge>
        </Field>
        <Field label="Origem do acesso">{accessLabel(user.access)}</Field>
        <Field label="Cortesia até">{formatDate(user.courtesyExpiresAt)}</Field>
        <Field label="Bloqueado em">{formatDate(user.blockedAt)}</Field>
        <Field label="Excluído em">{formatDate(user.deletedAt)}</Field>
        <Field label="Assinatura atual">
          {user.subscription
            ? `${presentBillingMode(user.subscription.billingMode)} · até ${formatDate(user.subscription.accessEndsAt)}`
            : "Nenhuma assinatura vigente"}
        </Field>
      </ProfileGroup>
    </div>
  );
}

export { AdminUserProfile };
