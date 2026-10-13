"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { CheckIcon, GlobeIcon } from "lucide-react";
import * as React from "react";
import { getCountryCallingCode } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import ptBR from "react-phone-number-input/locale/pt-BR";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import * as PhoneInputPrimitive from "@/components/ui/phone-input-primitive";
import { cn } from "@/lib/utils";

interface PhoneInputFlagProps extends React.ComponentProps<
  NonNullable<(typeof flags)[keyof typeof flags]>
> {
  country: PhoneInputPrimitive.Country | null;
}

function PhoneInputFlag({ country, ...props }: PhoneInputFlagProps) {
  const CountryFlag = country ? flags[country] : null;

  return (
    <span
      className={cn(
        "flex overflow-hidden rounded-xs [&>svg:not([class*='size-'])]:size-full",
        CountryFlag &&
          "[&>svg:not([class*='size-'])]:h-4 [&>svg:not([class*='size-'])]:w-6",
      )}
    >
      {CountryFlag ? (
        <CountryFlag {...props} />
      ) : (
        <GlobeIcon className="text-muted-foreground size-4" />
      )}
    </span>
  );
}

function PhoneInput(
  props: React.ComponentProps<typeof PhoneInputPrimitive.Root>,
) {
  return <PhoneInputPrimitive.Root {...props} />;
}

function PhoneInputInput(
  props: React.ComponentProps<typeof PhoneInputPrimitive.Input>,
) {
  const render = React.useMemo(() => <Input />, []);

  return (
    <PhoneInputPrimitive.Input
      data-slot="phone-input-input"
      render={render}
      {...props}
    />
  );
}

type PhoneInputCountrySelectProps = Omit<
  React.ComponentProps<typeof Select>,
  "value" | "onValueChange"
>;

function PhoneInputCountrySelect(props: PhoneInputCountrySelectProps) {
  const { country, onCountryChange, disabled } =
    PhoneInputPrimitive.usePhoneInput();

  return (
    <Select
      data-slot="phone-input-country-select"
      value={country ?? ""}
      onValueChange={(value) =>
        onCountryChange(
          value === PhoneInputPrimitive.INTERNATIONAL_COUNTRY_CODE
            ? null
            : (value as PhoneInputPrimitive.Country),
        )
      }
      disabled={disabled || props.disabled}
      {...props}
    />
  );
}

function PhoneInputCountrySelectValue({
  placeholder,
  children,
  ...props
}: React.ComponentProps<typeof SelectValue>) {
  const { country, preferredCountry } = PhoneInputPrimitive.usePhoneInput();
  const displayedCountry = country ?? preferredCountry ?? null;
  const countryLabel = displayedCountry
    ? ptBR[displayedCountry]
    : "Internacional";

  return (
    <SelectValue
      data-slot="phone-input-country-select-value"
      placeholder={
        placeholder ?? (
          <>
            <PhoneInputFlag country={displayedCountry} title={countryLabel} />
            <span className="sr-only">
              {displayedCountry ?? "Internacional"}
            </span>
          </>
        )
      }
      {...props}
    >
      {children ?? (
        <>
          <PhoneInputFlag country={displayedCountry} title={countryLabel} />
          <span className="sr-only">{displayedCountry ?? "Internacional"}</span>
        </>
      )}
    </SelectValue>
  );
}

function PhoneInputCountrySelectContent({
  className,
  ...props
}: React.ComponentProps<typeof SelectContent>) {
  return (
    <SelectContent
      data-slot="phone-input-country-select-content"
      className={cn("w-auto", className)}
      {...props}
    />
  );
}

function PhoneInputCountrySelectOptions() {
  return (
    <>
      <PhoneInputCountrySelectInternationalItem />
      {PhoneInputPrimitive.getCountryOptions().map((option) => (
        <PhoneInputCountrySelectItem
          key={option.countryCode}
          value={option.countryCode}
        />
      ))}
    </>
  );
}

function PhoneInputCountrySelectInternationalItem(
  props: Omit<React.ComponentProps<typeof SelectItem>, "value">,
) {
  const { country } = PhoneInputPrimitive.usePhoneInput();

  return (
    <SelectPrimitive.Item
      data-slot="phone-input-country-select-international-item"
      className="focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-default items-center justify-between gap-2 rounded-md py-2 pr-8 pl-2 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0"
      value={PhoneInputPrimitive.INTERNATIONAL_COUNTRY_CODE}
      {...props}
    >
      <span className="flex items-center gap-2">
        <span className="flex h-4 w-6 items-center justify-center">
          <PhoneInputFlag country={null} title="Internacional" />
        </span>
        <SelectPrimitive.ItemText>Internacional</SelectPrimitive.ItemText>
      </span>
      {country === null && (
        <span className="absolute right-2 flex size-4 items-center justify-center">
          <CheckIcon className="size-4" />
        </span>
      )}
    </SelectPrimitive.Item>
  );
}

interface PhoneInputCountrySelectItemProps extends Omit<
  React.ComponentProps<typeof SelectPrimitive.Item>,
  "value"
> {
  value: PhoneInputPrimitive.Country;
}

function PhoneInputCountrySelectItem({
  className,
  value,
  ...props
}: PhoneInputCountrySelectItemProps) {
  return (
    <SelectPrimitive.Item
      data-slot="phone-input-country-select-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-default items-center justify-between gap-2 rounded-md py-2 pr-8 pl-2 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      value={value}
      {...props}
    >
      <span className="flex items-center gap-2">
        <PhoneInputFlag country={value} title={ptBR[value]} />
        <SelectPrimitive.ItemText>{ptBR[value]}</SelectPrimitive.ItemText>
      </span>
      <span className="text-muted-foreground">
        {`+${getCountryCallingCode(value)}`}
      </span>
      <span className="absolute right-2 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  );
}

export type { Country, Value } from "@/components/ui/phone-input-primitive";

export {
  PhoneInput,
  PhoneInputFlag,
  PhoneInputInput,
  PhoneInputCountrySelect,
  PhoneInputCountrySelectContent,
  PhoneInputCountrySelectInternationalItem,
  PhoneInputCountrySelectItem,
  PhoneInputCountrySelectOptions,
  PhoneInputCountrySelectValue,
};
