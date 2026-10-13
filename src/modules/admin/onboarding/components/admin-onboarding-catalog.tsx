"use client";

import {
  type FormEvent,
  type MouseEvent,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  InfoIcon,
  PencilIcon,
  PlusIcon,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import {
  changeBusinessCatalog,
  type ChangeBusinessCatalogResult,
} from "../change-business-catalog.action";
import type {
  AdminBusinessCatalog,
  AdminBusinessSegment,
  AdminBusinessSubcategory,
  BusinessCatalogMutation,
} from "../admin-onboarding.schema";

type Editor =
  | { kind: "segment"; item: AdminBusinessSegment | null }
  | {
      kind: "subcategory";
      segment: AdminBusinessSegment;
      item: AdminBusinessSubcategory | null;
    };

type StatusTarget =
  | { kind: "segment"; item: AdminBusinessSegment; nextActive: boolean }
  | {
      kind: "subcategory";
      item: AdminBusinessSubcategory;
      segmentName: string;
      nextActive: boolean;
    };

function failureMessage(status: ChangeBusinessCatalogResult["status"]) {
  return {
    conflict: "Atualize a página para carregar a versão mais recente.",
    duplicate: "Já existe um item com esse nome.",
    not_found: "Este item não está mais disponível.",
    invalid: "Confira o nome e a ordem informados.",
    error: "Não foi possível salvar a alteração. Tente novamente.",
    saved: "",
  }[status];
}

function CatalogForm({
  editor,
  pending,
  message,
  onCancel,
  onSubmit,
}: {
  editor: Editor;
  pending: boolean;
  message: string;
  onCancel: () => void;
  onSubmit: (mutation: BusinessCatalogMutation) => void;
}) {
  const item = editor.item;
  const creating = item === null;
  const [name, setName] = useState(item?.name ?? "");
  const [sortOrder, setSortOrder] = useState(item?.sortOrder ?? 0);
  const [isActive, setIsActive] = useState(item?.isActive ?? true);
  const kindLabel = editor.kind === "segment" ? "segmento" : "subcategoria";
  const title = creating
    ? `Nov${editor.kind === "segment" ? "o" : "a"} ${kindLabel}`
    : `Editar ${kindLabel}`;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(
      editor.kind === "segment"
        ? {
            kind: "segment",
            id: item?.id ?? null,
            name,
            sortOrder,
            isActive: item?.isActive ?? isActive,
            expectedVersion: item?.version ?? null,
          }
        : {
            kind: "subcategory",
            id: item?.id ?? null,
            segmentId: editor.segment.id,
            name,
            sortOrder,
            isActive: item?.isActive ?? isActive,
            expectedVersion: item?.version ?? null,
          },
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          {editor.kind === "subcategory"
            ? `Esta subcategoria pertence a ${editor.segment.name} e não poderá ser movida para outro segmento.`
            : "Defina um nome claro e a posição usada na ordenação do catálogo."}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <Label htmlFor="catalog-item-name">Nome</Label>
        <Input
          id="catalog-item-name"
          autoFocus
          required
          minLength={2}
          maxLength={editor.kind === "segment" ? 60 : 80}
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={pending}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="catalog-item-order">Ordem</Label>
        <Input
          id="catalog-item-order"
          type="number"
          required
          min={0}
          max={10_000}
          step={1}
          value={sortOrder}
          onChange={(event) => setSortOrder(event.target.valueAsNumber)}
          disabled={pending}
        />
        <p className="text-muted-foreground text-xs">
          Use um número entre 0 e 10.000. Valores menores aparecem primeiro.
        </p>
      </div>
      {creating ? (
        <div className="bg-muted/25 flex items-center justify-between gap-4 rounded-xl border px-4 py-3">
          <div>
            <Label htmlFor="catalog-item-active">Criar como ativo</Label>
            <p className="text-muted-foreground mt-1 text-xs">
              Itens ativos ficam disponíveis no onboarding.
            </p>
          </div>
          <Switch
            id="catalog-item-active"
            checked={isActive}
            onCheckedChange={setIsActive}
            disabled={pending}
          />
        </div>
      ) : (
        <p className="bg-muted/25 text-muted-foreground rounded-xl border px-4 py-3 text-xs leading-5">
          O status é alterado separadamente, sempre com confirmação.
        </p>
      )}

      {message ? (
        <p role="alert" className="text-destructive text-sm">
          {message}
        </p>
      ) : null}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={pending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending
            ? "Salvando…"
            : creating
              ? `Criar ${kindLabel}`
              : "Salvar alterações"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function AdminOnboardingCatalog({
  catalog,
}: {
  catalog: AdminBusinessCatalog;
}) {
  const router = useRouter();
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [statusTarget, setStatusTarget] = useState<StatusTarget | null>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function rememberTrigger(event: MouseEvent<HTMLElement>) {
    returnFocusRef.current = event.currentTarget;
  }

  function restoreFocus() {
    const target = returnFocusRef.current;
    window.setTimeout(() => target?.focus(), 0);
  }

  function openEditor(next: Editor, event: MouseEvent<HTMLElement>) {
    rememberTrigger(event);
    setMessage("");
    setEditor(next);
  }

  function closeEditor() {
    setEditor(null);
    setMessage("");
    restoreFocus();
  }

  function openStatus(next: StatusTarget, event: MouseEvent<HTMLElement>) {
    rememberTrigger(event);
    setMessage("");
    setStatusTarget(next);
  }

  function closeStatus() {
    setStatusTarget(null);
    setMessage("");
    restoreFocus();
  }

  function save(mutation: BusinessCatalogMutation, afterSave: () => void) {
    if (pending) return;
    setMessage("");
    startTransition(async () => {
      try {
        const result = await changeBusinessCatalog(mutation);
        if (result.status === "saved") {
          afterSave();
          router.refresh();
          return;
        }
        setMessage(failureMessage(result.status));
      } catch {
        setMessage(failureMessage("error"));
      }
    });
  }

  function saveEditor(mutation: BusinessCatalogMutation) {
    save(mutation, closeEditor);
  }

  function saveStatus() {
    if (!statusTarget) return;
    const mutation: BusinessCatalogMutation =
      statusTarget.kind === "segment"
        ? {
            kind: "segment",
            id: statusTarget.item.id,
            name: statusTarget.item.name,
            sortOrder: statusTarget.item.sortOrder,
            isActive: statusTarget.nextActive,
            expectedVersion: statusTarget.item.version,
          }
        : {
            kind: "subcategory",
            id: statusTarget.item.id,
            segmentId: statusTarget.item.segmentId,
            name: statusTarget.item.name,
            sortOrder: statusTarget.item.sortOrder,
            isActive: statusTarget.nextActive,
            expectedVersion: statusTarget.item.version,
          };
    save(mutation, closeStatus);
  }

  return (
    <>
      <Card className="border-border/70 min-w-0 rounded-2xl shadow-sm">
        <CardHeader className="gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div>
            <CardTitle>
              <h2>Catálogo de negócios</h2>
            </CardTitle>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-6">
              Organize as opções apresentadas aos clientes sem apagar o
              histórico já associado a elas.
            </p>
          </div>
          <Button
            type="button"
            onClick={(event) =>
              openEditor({ kind: "segment", item: null }, event)
            }
          >
            <PlusIcon aria-hidden="true" />
            Novo segmento
          </Button>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="bg-primary/5 border-primary/15 flex gap-3 rounded-xl border p-4">
            <InfoIcon
              aria-hidden="true"
              className="text-primary mt-0.5 size-4 shrink-0"
            />
            <p className="text-muted-foreground text-sm leading-6">
              A opção <strong className="text-foreground">Outro</strong> é
              oferecida automaticamente no onboarding e não é um item editável
              deste catálogo.
            </p>
          </div>

          {catalog.length === 0 ? (
            <div className="bg-muted/20 grid min-h-48 place-items-center rounded-xl border border-dashed px-6 text-center">
              <div>
                <p className="font-medium">Nenhum segmento cadastrado</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Crie o primeiro segmento para começar a organizar o
                  onboarding.
                </p>
              </div>
            </div>
          ) : (
            <Accordion multiple className="rounded-xl border px-4">
              {catalog.map((segment) => (
                <AccordionItem key={segment.id} value={String(segment.id)}>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2">
                    <AccordionTrigger className="min-w-0 py-2">
                      <span className="flex min-w-0 flex-wrap items-center gap-2 pr-3">
                        <span className="truncate">{segment.name}</span>
                        {!segment.isActive ? (
                          <Badge variant="outline">Arquivado</Badge>
                        ) : null}
                        <span className="text-muted-foreground text-xs font-normal tabular-nums">
                          Ordem {segment.sortOrder} ·{" "}
                          {segment.subcategories.length}{" "}
                          {segment.subcategories.length === 1
                            ? "subcategoria"
                            : "subcategorias"}
                        </span>
                      </span>
                    </AccordionTrigger>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-lg"
                        aria-label={`Editar segmento ${segment.name}`}
                        onClick={(event) =>
                          openEditor({ kind: "segment", item: segment }, event)
                        }
                      >
                        <PencilIcon aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-lg"
                        aria-label={`${segment.isActive ? "Arquivar" : "Restaurar"} segmento ${segment.name}`}
                        onClick={(event) =>
                          openStatus(
                            {
                              kind: "segment",
                              item: segment,
                              nextActive: !segment.isActive,
                            },
                            event,
                          )
                        }
                      >
                        {segment.isActive ? (
                          <ArchiveIcon aria-hidden="true" />
                        ) : (
                          <ArchiveRestoreIcon aria-hidden="true" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <AccordionContent className="pb-4">
                    <div className="bg-muted/15 rounded-xl border">
                      <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="font-medium">Subcategorias</h3>
                          <p className="text-muted-foreground mt-0.5 text-xs">
                            Especialidades exibidas dentro de {segment.name}.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(event) =>
                            openEditor(
                              { kind: "subcategory", segment, item: null },
                              event,
                            )
                          }
                          aria-label={`Nova subcategoria em ${segment.name}`}
                        >
                          <PlusIcon aria-hidden="true" />
                          Nova subcategoria
                        </Button>
                      </div>
                      {segment.subcategories.length === 0 ? (
                        <p className="text-muted-foreground px-4 py-5 text-sm">
                          Nenhuma subcategoria cadastrada neste segmento.
                        </p>
                      ) : (
                        <ul className="divide-y">
                          {segment.subcategories.map((subcategory) => (
                            <li
                              key={subcategory.id}
                              className="flex min-w-0 items-center gap-3 px-3 py-2.5"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="truncate font-medium">
                                    {subcategory.name}
                                  </span>
                                  {!subcategory.isActive ? (
                                    <Badge variant="outline">Arquivada</Badge>
                                  ) : null}
                                </div>
                                <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
                                  Ordem {subcategory.sortOrder}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-lg"
                                  aria-label={`Editar subcategoria ${subcategory.name}`}
                                  onClick={(event) =>
                                    openEditor(
                                      {
                                        kind: "subcategory",
                                        segment,
                                        item: subcategory,
                                      },
                                      event,
                                    )
                                  }
                                >
                                  <PencilIcon aria-hidden="true" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-lg"
                                  aria-label={`${subcategory.isActive ? "Arquivar" : "Restaurar"} subcategoria ${subcategory.name}`}
                                  onClick={(event) =>
                                    openStatus(
                                      {
                                        kind: "subcategory",
                                        item: subcategory,
                                        segmentName: segment.name,
                                        nextActive: !subcategory.isActive,
                                      },
                                      event,
                                    )
                                  }
                                >
                                  {subcategory.isActive ? (
                                    <ArchiveIcon aria-hidden="true" />
                                  ) : (
                                    <ArchiveRestoreIcon aria-hidden="true" />
                                  )}
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={editor !== null}
        onOpenChange={(open) => {
          if (!open && editor) closeEditor();
        }}
      >
        <DialogContent showCloseButton={false} className="sm:max-w-lg">
          {editor ? (
            <CatalogForm
              key={`${editor.kind}-${editor.item?.id ?? "new"}`}
              editor={editor}
              pending={pending}
              message={message}
              onCancel={closeEditor}
              onSubmit={saveEditor}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={statusTarget !== null}
        onOpenChange={(open) => {
          if (!open && statusTarget) closeStatus();
        }}
      >
        <AlertDialogContent>
          {statusTarget ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {statusTarget.nextActive ? "Restaurar" : "Arquivar"}{" "}
                  {statusTarget.kind === "segment"
                    ? "segmento"
                    : "subcategoria"}
                  ?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {statusTarget.nextActive
                    ? `${statusTarget.item.name} voltará a aparecer como opção disponível no onboarding.`
                    : `${statusTarget.item.name} deixará de aparecer para novos preenchimentos. Perfis já associados serão preservados.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              {message ? (
                <p role="alert" className="text-destructive text-sm">
                  {message}
                </p>
              ) : null}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={pending} onClick={closeStatus}>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  type="button"
                  variant={statusTarget.nextActive ? "default" : "destructive"}
                  disabled={pending}
                  onClick={saveStatus}
                >
                  {pending
                    ? "Salvando…"
                    : `${statusTarget.nextActive ? "Restaurar" : "Arquivar"} ${
                        statusTarget.kind === "segment"
                          ? "segmento"
                          : "subcategoria"
                      }`}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : null}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export { AdminOnboardingCatalog };
