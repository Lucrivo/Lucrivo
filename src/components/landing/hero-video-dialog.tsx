"use client";

import { useMemo, useState } from "react";
import { PlayCircleIcon, XIcon } from "@phosphor-icons/react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{6,}$/;

function getYouTubeVideoId(value: string | null | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    let videoId: string | null = null;

    if (hostname === "youtu.be") {
      videoId = url.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (
      hostname === "youtube.com" ||
      hostname.endsWith(".youtube.com") ||
      hostname === "youtube-nocookie.com" ||
      hostname.endsWith(".youtube-nocookie.com")
    ) {
      if (url.pathname === "/watch") {
        videoId = url.searchParams.get("v");
      } else {
        const [type, id] = url.pathname.split("/").filter(Boolean);
        if (["embed", "shorts", "live"].includes(type)) videoId = id ?? null;
      }
    }

    return videoId && YOUTUBE_ID_PATTERN.test(videoId) ? videoId : null;
  } catch {
    return null;
  }
}

function HeroVideoDialog({ videoUrl }: { videoUrl?: string | null }) {
  const [open, setOpen] = useState(false);
  const videoId = useMemo(() => getYouTubeVideoId(videoUrl), [videoUrl]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        type="button"
        className="button button-secondary"
        aria-label="Assistir à apresentação"
      >
        <PlayCircleIcon aria-hidden="true" size={20} weight="fill" />
        Assistir à apresentação
      </DialogTrigger>

      <DialogContent className="hero-video-dialog" showCloseButton={false}>
        <DialogClose type="button" className="hero-video-dialog-close">
          <XIcon aria-hidden="true" size={20} weight="bold" />
          <span className="sr-only">Fechar vídeo</span>
        </DialogClose>

        <DialogHeader className="hero-video-dialog-header">
          <DialogTitle>Conheça o Lucrivo</DialogTitle>
          <DialogDescription>
            Veja como o Lucrivo transforma os dados do seu negócio em um
            diagnóstico claro sobre preço e rentabilidade.
          </DialogDescription>
        </DialogHeader>

        {videoId && open ? (
          <div className="hero-video-frame">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`}
              title="Apresentação do Lucrivo"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="hero-video-empty">
            <span className="hero-video-empty-icon" aria-hidden="true">
              <PlayCircleIcon size={38} weight="duotone" />
            </span>
            <p>
              A apresentação será publicada em breve. Enquanto isso, você pode
              conhecer os planos e começar seu diagnóstico.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export { HeroVideoDialog, getYouTubeVideoId };
