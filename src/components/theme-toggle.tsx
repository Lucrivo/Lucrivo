"use client";

import { LaptopIcon, MoonIcon, SunIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type Theme, useTheme } from "@/providers/theme-provider";

const options: { value: Theme; label: string; icon: typeof SunIcon }[] = [
  { value: "light", label: "Claro", icon: SunIcon },
  { value: "dark", label: "Escuro", icon: MoonIcon },
  { value: "system", label: "Sistema", icon: LaptopIcon },
];

function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={cn(
        "bg-card inline-flex rounded-xl border p-1 shadow-xs",
        className,
      )}
      aria-label="Selecionar tema"
    >
      {options.map(({ value, label, icon: Icon }) => (
        <Button
          key={value}
          type="button"
          variant={theme === value ? "secondary" : "ghost"}
          size="sm"
          aria-pressed={theme === value}
          onClick={() => setTheme(value)}
          className="min-w-0 flex-1 shadow-none"
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </Button>
      ))}
    </div>
  );
}

export { ThemeToggle };
