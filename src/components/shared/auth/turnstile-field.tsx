"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

type TurnstileWidgetOptions = {
  sitekey: string;
  callback: (token: string) => void;
  "error-callback": () => void;
  "expired-callback": () => void;
  theme: "auto";
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileWidgetOptions) => string;
  remove: (widgetId: string) => void;
  reset: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

type TurnstileFieldProps = {
  siteKey: string;
  resetSignal: unknown;
};

function TurnstileField({ siteKey, resetSignal }: TurnstileFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string>(null);
  const initialSignalRef = useRef(resetSignal);
  const [token, setToken] = useState("");
  const [unavailable, setUnavailable] = useState(false);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || widgetIdRef.current) {
      return;
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme: "auto",
      callback: (nextToken) => {
        setUnavailable(false);
        setToken(nextToken);
      },
      "expired-callback": () => setToken(""),
      "error-callback": () => {
        setToken("");
        setUnavailable(true);
      },
    });
  }, [siteKey]);

  useEffect(() => {
    if (Object.is(initialSignalRef.current, resetSignal)) return;
    initialSignalRef.current = resetSignal;
    setToken("");

    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, [resetSignal]);

  useEffect(
    () => () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    },
    [],
  );

  if (!siteKey) {
    return (
      <p role="alert" className="text-destructive text-sm">
        Verificação de segurança indisponível. Tente novamente mais tarde.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Script
        id="cloudflare-turnstile-script"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={renderWidget}
        onError={() => setUnavailable(true)}
      />
      <input type="hidden" name="captchaToken" value={token} readOnly />
      <div ref={containerRef} />
      {unavailable && (
        <p role="alert" className="text-destructive text-sm">
          Verificação de segurança indisponível. Tente novamente mais tarde.
        </p>
      )}
    </div>
  );
}

export { TurnstileField };
