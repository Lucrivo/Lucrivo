"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PhoneInput,
  PhoneInputCountrySelect,
  PhoneInputCountrySelectContent,
  PhoneInputCountrySelectOptions,
  PhoneInputCountrySelectValue,
  PhoneInputInput,
  type Value,
} from "@/components/ui/phone-input";
import { SelectTrigger } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { saveOnboardingProfile } from "../actions/save-onboarding-profile.action";
import type {
  OnboardingData,
  SaveOnboardingResult,
} from "../onboarding.schema";

type OnboardingFormProps = {
  data: OnboardingData;
  mode: "onboarding" | "account";
  action?: (input: unknown) => Promise<SaveOnboardingResult>;
};

type SubmissionFeedback =
  | Extract<SaveOnboardingResult, { status: "invalid" }>
  | { status: "conflict" | "catalog_inactive" | "error" }
  | { status: "success" }
  | null;

const fieldClassName =
  "border-input bg-card focus-visible:border-ring focus-visible:ring-ring/20 aria-invalid:border-destructive aria-invalid:ring-destructive/15 h-10 w-full rounded-lg border px-3 text-base shadow-xs outline-none transition-colors focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-60 md:text-sm";

function errorId(field: string) {
  return `onboarding-${field}-error`;
}

function FieldError({ field, errors }: { field: string; errors?: string[] }) {
  if (!errors?.length) return null;

  return (
    <p id={errorId(field)} className="text-destructive text-sm">
      {errors[0]}
    </p>
  );
}

function feedbackMessage(feedback: Exclude<SubmissionFeedback, null>) {
  if (feedback.status === "invalid") {
    return "Revise os campos destacados e tente novamente.";
  }
  if (feedback.status === "conflict") {
    return "Seu perfil foi atualizado em outra sessão. Atualize a página e tente novamente.";
  }
  if (feedback.status === "catalog_inactive") {
    return "A opção escolhida não está mais disponível. Revise segmento e subcategoria antes de tentar novamente.";
  }
  if (feedback.status === "error") {
    return "Não foi possível salvar seu perfil agora. Tente novamente.";
  }
  return "Perfil atualizado";
}

function OnboardingForm({
  data,
  mode,
  action = saveOnboardingProfile,
}: OnboardingFormProps) {
  const router = useRouter();
  const profile = data.profile;
  const [fullName, setFullName] = React.useState(profile?.fullName ?? "");
  const [whatsappE164, setWhatsappE164] = React.useState<Value>(
    (profile?.whatsappE164 ?? "") as Value,
  );
  const [segmentId, setSegmentId] = React.useState(
    profile ? String(profile.segmentId) : "",
  );
  const [subcategoryChoice, setSubcategoryChoice] = React.useState(
    profile
      ? profile.subcategoryId === null
        ? "other"
        : String(profile.subcategoryId)
      : "",
  );
  const [customSubcategory, setCustomSubcategory] = React.useState(
    profile?.customSubcategory ?? "",
  );
  const [whatsappMarketingConsent, setWhatsappMarketingConsent] =
    React.useState(profile?.whatsappMarketingConsent ?? false);
  const [version, setVersion] = React.useState<number | null>(
    profile?.version ?? null,
  );
  const [feedback, setFeedback] = React.useState<SubmissionFeedback>(null);
  const [segmentAnnouncement, setSegmentAnnouncement] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const feedbackRef = React.useRef<HTMLDivElement>(null);

  const fieldErrors =
    feedback?.status === "invalid" ? feedback.fieldErrors : {};
  const selectedSegment = data.catalog.find(
    (segment) => String(segment.id) === segmentId,
  );
  const availableSegments = data.catalog.filter(
    (segment) =>
      segment.isActive ||
      (mode === "account" && profile?.segmentId === segment.id),
  );
  const availableSubcategories = (selectedSegment?.subcategories ?? []).filter(
    (subcategory) =>
      subcategory.isActive ||
      (mode === "account" &&
        profile?.segmentId === selectedSegment?.id &&
        profile?.subcategoryId === subcategory.id),
  );

  React.useEffect(() => {
    if (feedback && feedback.status !== "success") {
      feedbackRef.current?.focus();
    }
  }, [feedback]);

  function changeSegment(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextSegmentId = event.target.value;
    const hadSubcategory =
      subcategoryChoice !== "" || customSubcategory.trim() !== "";

    setSegmentId(nextSegmentId);
    setSubcategoryChoice("");
    setCustomSubcategory("");
    setFeedback(null);
    setSegmentAnnouncement(
      hadSubcategory
        ? "A subcategoria foi limpa após a troca de segmento."
        : "",
    );
  }

  function changeSubcategory(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextChoice = event.target.value;
    setSubcategoryChoice(nextChoice);
    if (nextChoice !== "other") setCustomSubcategory("");
    setFeedback(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setFeedback(null);

    const result = await action({
      fullName,
      whatsappE164,
      segmentId: Number(segmentId),
      subcategoryId:
        subcategoryChoice && subcategoryChoice !== "other"
          ? Number(subcategoryChoice)
          : null,
      customSubcategory:
        subcategoryChoice === "other" ? customSubcategory : null,
      whatsappMarketingConsent,
      expectedVersion: version,
    });

    if (result.status === "saved") {
      setVersion(result.version);
      if (mode === "onboarding") {
        router.replace("/quick-diagnosis");
        router.refresh();
      } else {
        setFeedback({ status: "success" });
      }
    } else {
      setFeedback(result);
      if (result.status === "catalog_inactive") router.refresh();
    }

    setPending(false);
  }

  return (
    <section className="w-full">
      <div className="mb-8 max-w-2xl">
        <h1 className="text-foreground text-3xl font-semibold tracking-[-0.025em] text-balance sm:text-4xl">
          {mode === "onboarding"
            ? "Conte um pouco sobre o seu negócio"
            : "Dados do seu negócio"}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl text-base leading-7">
          {mode === "onboarding"
            ? "Leva menos de um minuto. Essas informações ajudam o Lucrivo a tornar suas análises mais relevantes para a sua realidade."
            : "Mantenha seus dados atualizados para receber análises mais relevantes para a realidade do seu negócio."}
        </p>
      </div>

      {feedback && (
        <div
          ref={feedbackRef}
          role={feedback.status === "success" ? "status" : "alert"}
          tabIndex={feedback.status === "success" ? undefined : -1}
          className={cn(
            "mb-6 rounded-xl px-4 py-3 text-sm outline-none focus-visible:ring-3",
            feedback.status === "success"
              ? "bg-primary/10 text-foreground"
              : "bg-destructive/10 text-destructive focus-visible:ring-destructive/25",
          )}
        >
          <p className="font-medium">{feedbackMessage(feedback)}</p>
          {feedback.status === "invalid" && (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {Object.entries(feedback.fieldErrors).flatMap(([field, errors]) =>
                errors.map((message) => (
                  <li key={`${field}-${message}`}>{message}</li>
                )),
              )}
            </ul>
          )}
        </div>
      )}

      <form
        data-testid="onboarding-form"
        noValidate
        onSubmit={submit}
        className="space-y-6"
      >
        <div className="space-y-2">
          <Label htmlFor="onboarding-full-name">Nome</Label>
          <Input
            id="onboarding-full-name"
            name="fullName"
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
            minLength={2}
            maxLength={120}
            disabled={pending}
            aria-invalid={Boolean(fieldErrors.fullName?.length) || undefined}
            aria-describedby={
              fieldErrors.fullName?.length ? errorId("fullName") : undefined
            }
          />
          <FieldError field="fullName" errors={fieldErrors.fullName} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="onboarding-whatsapp">WhatsApp</Label>
          <PhoneInput
            preferredCountry="BR"
            value={whatsappE164}
            onValueChange={(value) => setWhatsappE164(value)}
            disabled={pending}
          >
            <div className="flex min-w-0">
              <PhoneInputCountrySelect>
                <SelectTrigger
                  aria-label="País do WhatsApp"
                  className="h-10 rounded-r-none border-r-0 px-2.5"
                >
                  <PhoneInputCountrySelectValue />
                </SelectTrigger>
                <PhoneInputCountrySelectContent align="start">
                  <PhoneInputCountrySelectOptions />
                </PhoneInputCountrySelectContent>
              </PhoneInputCountrySelect>
              <PhoneInputInput
                id="onboarding-whatsapp"
                name="whatsappE164"
                autoComplete="tel"
                placeholder="(11) 99999-9999"
                required
                aria-invalid={
                  Boolean(fieldErrors.whatsappE164?.length) || undefined
                }
                aria-describedby="onboarding-whatsapp-help"
                className="rounded-l-none"
              />
            </div>
          </PhoneInput>
          <p
            id="onboarding-whatsapp-help"
            className="text-muted-foreground text-sm"
          >
            Aceita números do Brasil e de outros países.
          </p>
          <FieldError field="whatsappE164" errors={fieldErrors.whatsappE164} />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="onboarding-segment">Segmento principal</Label>
            <select
              id="onboarding-segment"
              name="segmentId"
              value={segmentId}
              onChange={changeSegment}
              disabled={pending}
              required
              aria-invalid={Boolean(fieldErrors.segmentId?.length) || undefined}
              aria-describedby={
                fieldErrors.segmentId?.length ? errorId("segmentId") : undefined
              }
              className={fieldClassName}
            >
              <option value="">Selecione</option>
              {availableSegments.map((segment) => (
                <option key={segment.id} value={segment.id}>
                  {segment.name}
                  {!segment.isActive ? " — Arquivada" : ""}
                </option>
              ))}
            </select>
            <FieldError field="segmentId" errors={fieldErrors.segmentId} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="onboarding-subcategory">Subcategoria</Label>
            <select
              id="onboarding-subcategory"
              name="subcategoryId"
              value={subcategoryChoice}
              onChange={changeSubcategory}
              disabled={!segmentId || pending}
              required
              aria-invalid={
                Boolean(fieldErrors.subcategoryId?.length) || undefined
              }
              aria-describedby={
                fieldErrors.subcategoryId?.length
                  ? errorId("subcategoryId")
                  : undefined
              }
              className={fieldClassName}
            >
              <option value="">
                {segmentId ? "Selecione" : "Escolha um segmento primeiro"}
              </option>
              {availableSubcategories.map((subcategory) => (
                <option key={subcategory.id} value={subcategory.id}>
                  {subcategory.name}
                  {!subcategory.isActive ? " — Arquivada" : ""}
                </option>
              ))}
              {segmentId && <option value="other">Outro</option>}
            </select>
            <FieldError
              field="subcategoryId"
              errors={fieldErrors.subcategoryId}
            />
          </div>
        </div>

        <p className="sr-only" aria-live="polite">
          {segmentAnnouncement}
        </p>

        {subcategoryChoice === "other" && (
          <div className="space-y-2">
            <Label htmlFor="onboarding-custom-subcategory">
              Qual é a sua subcategoria?
            </Label>
            <Input
              id="onboarding-custom-subcategory"
              name="customSubcategory"
              value={customSubcategory}
              onChange={(event) => setCustomSubcategory(event.target.value)}
              required
              minLength={2}
              maxLength={80}
              disabled={pending}
              aria-invalid={
                Boolean(fieldErrors.customSubcategory?.length) || undefined
              }
              aria-describedby={
                fieldErrors.customSubcategory?.length
                  ? errorId("customSubcategory")
                  : undefined
              }
            />
            <FieldError
              field="customSubcategory"
              errors={fieldErrors.customSubcategory}
            />
          </div>
        )}

        <div className="bg-muted/55 rounded-xl p-4">
          <Label className="group/field-label items-start gap-3 leading-6">
            <Checkbox
              checked={whatsappMarketingConsent}
              onCheckedChange={(checked) =>
                setWhatsappMarketingConsent(checked === true)
              }
              disabled={pending}
              aria-describedby="onboarding-consent-help"
              className="mt-1"
            />
            <span>
              <span className="text-foreground block">
                Quero receber pelo WhatsApp novidades, conteúdos e ofertas do
                Lucrivo.
              </span>
              <span
                id="onboarding-consent-help"
                className="text-muted-foreground mt-1 block font-normal"
              >
                <span className="block">
                  Esta autorização é opcional e pode ser cancelada a qualquer
                  momento.
                </span>
                {mode === "account" && (
                  <span className="mt-1 block">
                    Esta escolha se aplica ao número de WhatsApp salvo acima.
                  </span>
                )}
              </span>
            </span>
          </Label>
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="w-full sm:w-auto"
        >
          {pending
            ? "Salvando..."
            : mode === "onboarding"
              ? "Começar meu diagnóstico"
              : "Salvar alterações"}
        </Button>
      </form>
    </section>
  );
}

export { OnboardingForm, type OnboardingFormProps };
