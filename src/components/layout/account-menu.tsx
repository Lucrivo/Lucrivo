"use client";

import { LogOutIcon, UserRoundIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AccountMenuProps = {
  email: string;
  logoutAction: () => Promise<void>;
};

function accountInitial(email: string) {
  return email.trim().charAt(0).toLocaleUpperCase("pt-BR") || "L";
}

function AccountMenu({ email, logoutAction }: AccountMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            className="rounded-full p-0 shadow-none"
            aria-label="Abrir menu da conta"
          />
        }
      >
        <Avatar size="lg" className="size-9">
          <AvatarFallback className="bg-brand-gradient text-primary-foreground font-semibold">
            {accountInitial(email)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-64 rounded-xl p-1.5 shadow-lg"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-3 px-2 py-2.5">
            <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
              <UserRoundIcon className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="text-foreground block text-sm font-semibold">
                Sua conta
              </span>
              <span className="block truncate font-normal" title={email}>
                {email}
              </span>
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <form action={logoutAction}>
          <DropdownMenuItem
            variant="destructive"
            render={<button type="submit" className="w-full" />}
            nativeButton
            className="h-9"
          >
            <LogOutIcon aria-hidden="true" />
            Sair da conta
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { AccountMenu };
