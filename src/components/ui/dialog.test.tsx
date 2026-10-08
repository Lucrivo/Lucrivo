import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "./alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./dialog";

describe("dialog motion", () => {
  it("keeps the regular dialog exit frame until the portal unmounts", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Editar dados</DialogTitle>
          <DialogDescription>Atualize os dados do relatório.</DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    expect(document.querySelector('[data-slot="dialog-overlay"]')).toHaveClass(
      "data-closed:fill-mode-forwards",
    );
    expect(document.querySelector('[data-slot="dialog-content"]')).toHaveClass(
      "data-closed:fill-mode-forwards",
      "motion-reduce:data-open:zoom-in-100",
      "motion-reduce:data-closed:zoom-out-100",
    );
  });

  it("keeps the alert dialog exit frame until the portal unmounts", () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogTitle>Excluir relatório?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação removerá o relatório da sua biblioteca.
          </AlertDialogDescription>
        </AlertDialogContent>
      </AlertDialog>,
    );

    expect(
      document.querySelector('[data-slot="alert-dialog-overlay"]'),
    ).toHaveClass("data-closed:fill-mode-forwards");
    expect(
      document.querySelector('[data-slot="alert-dialog-content"]'),
    ).toHaveClass(
      "data-closed:fill-mode-forwards",
      "motion-reduce:data-open:zoom-in-100",
      "motion-reduce:data-closed:zoom-out-100",
    );
  });
});
