import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HeroVideoDialog } from "./hero-video-dialog";

describe("HeroVideoDialog", () => {
  it("explains that the presentation is not available when no URL is configured", () => {
    render(<HeroVideoDialog videoUrl={null} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Assistir à apresentação" }),
    );

    expect(
      screen.getByRole("dialog", { name: "Conheça o Lucrivo" }),
    ).toBeVisible();
    expect(
      screen.getByText(
        "A apresentação será publicada em breve. Enquanto isso, você pode conhecer os planos e começar seu diagnóstico.",
      ),
    ).toBeVisible();
    expect(
      screen.queryByTitle("Apresentação do Lucrivo"),
    ).not.toBeInTheDocument();
  });

  it("loads the privacy-enhanced YouTube player only after the dialog opens", async () => {
    render(
      <HeroVideoDialog videoUrl="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />,
    );

    expect(
      screen.queryByTitle("Apresentação do Lucrivo"),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Assistir à apresentação" }),
    );

    expect(screen.getByTitle("Apresentação do Lucrivo")).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0",
    );

    fireEvent.click(screen.getByRole("button", { name: "Fechar vídeo" }));

    await waitFor(() =>
      expect(
        screen.queryByTitle("Apresentação do Lucrivo"),
      ).not.toBeInTheDocument(),
    );
  });

  it("falls back safely when the configured URL is not a YouTube video", () => {
    render(<HeroVideoDialog videoUrl="https://example.com/video" />);

    fireEvent.click(
      screen.getByRole("button", { name: "Assistir à apresentação" }),
    );

    expect(
      screen.queryByTitle("Apresentação do Lucrivo"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/A apresentação será publicada em breve/),
    ).toBeVisible();
  });
});
