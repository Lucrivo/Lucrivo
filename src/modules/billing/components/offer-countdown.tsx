"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type OfferCountdownProps = {
  endsAt: string;
  onExpire?: () => void;
  compact?: boolean;
};

const deadlineFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

function remainingFor(target: number): number {
  return Number.isFinite(target) ? Math.max(0, target - Date.now()) : 0;
}

function OfferCountdown({
  endsAt,
  onExpire,
  compact = false,
}: OfferCountdownProps) {
  const router = useRouter();
  const target = Date.parse(endsAt);
  const [remaining, setRemaining] = useState(() => remainingFor(target));
  const expiredRef = useRef(false);
  const initiallyActiveRef = useRef(remaining > 0);
  const expireActionRef = useRef(onExpire ?? (() => router.refresh()));

  useEffect(() => {
    expireActionRef.current = onExpire ?? (() => router.refresh());
  }, [onExpire, router]);

  useEffect(() => {
    expiredRef.current = false;
    initiallyActiveRef.current = remainingFor(target) > 0;
    const tick = () => {
      const next = remainingFor(target);
      setRemaining(next);
      if (next === 0 && initiallyActiveRef.current && !expiredRef.current) {
        expiredRef.current = true;
        expireActionRef.current();
      }
      return next;
    };
    if (tick() === 0) return;
    const interval = window.setInterval(tick, 1_000);
    return () => window.clearInterval(interval);
  }, [target]);

  const ended = remaining === 0;
  const totalSeconds = Math.floor(remaining / 1_000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const deadline = Number.isFinite(target)
    ? `Oferta válida até ${deadlineFormatter.format(new Date(target))}.`
    : "Oferta encerrada";

  return (
    <div
      className="offer-countdown min-w-0"
      data-compact={compact}
      role="region"
      aria-label="Tempo restante da oferta de lançamento"
    >
      <span className="sr-only" aria-live="polite">
        {ended ? "Oferta encerrada" : deadline}
      </span>
      {ended ? (
        <strong className="offer-countdown-ended">Oferta encerrada</strong>
      ) : (
        <dl
          className="offer-countdown-digits m-0 flex min-w-0 gap-2.5"
          data-countdown-digits
          aria-hidden="true"
        >
          <div className="grid min-w-0 flex-1 justify-items-center gap-0.5">
            <dd
              className="m-0 leading-none font-bold tabular-nums"
              suppressHydrationWarning
            >
              {days}
            </dd>
            <dt
              className="m-0 text-[0.625rem] leading-none opacity-90"
              suppressHydrationWarning
            >
              {days === 1 ? "dia" : "dias"}
            </dt>
          </div>
          <div className="grid min-w-0 flex-1 justify-items-center gap-0.5">
            <dd
              className="m-0 leading-none font-bold tabular-nums"
              suppressHydrationWarning
            >
              {String(hours).padStart(2, "0")}
            </dd>
            <dt className="m-0 text-[0.625rem] leading-none opacity-90">
              horas
            </dt>
          </div>
          <div className="grid min-w-0 flex-1 justify-items-center gap-0.5">
            <dd
              className="m-0 leading-none font-bold tabular-nums"
              suppressHydrationWarning
            >
              {String(minutes).padStart(2, "0")}
            </dd>
            <dt className="m-0 text-[0.625rem] leading-none opacity-90">min</dt>
          </div>
          <div className="grid min-w-0 flex-1 justify-items-center gap-0.5">
            <dd
              className="m-0 leading-none font-bold tabular-nums"
              suppressHydrationWarning
            >
              {String(seconds).padStart(2, "0")}
            </dd>
            <dt className="m-0 text-[0.625rem] leading-none opacity-90">seg</dt>
          </div>
        </dl>
      )}
    </div>
  );
}

export { OfferCountdown };
export type { OfferCountdownProps };
