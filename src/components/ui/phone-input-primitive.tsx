"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useControlled } from "@base-ui/utils/useControlled";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import * as React from "react";
import ReactPhoneInput, {
  getCountries,
  getCountryCallingCode,
  type Country,
  type Value,
} from "react-phone-number-input/input";

interface PhoneInputBaseProps {
  value?: Value;
  defaultValue?: Value;
  onValueChange?: (value: Value) => void;
  country?: Country | null;
  defaultCountry?: Country;
  onCountryChange?: (country: Country | null) => void;
  children?: React.ReactNode;
  disabled?: boolean;
}

interface PhoneInputWithoutInternationalProps extends PhoneInputBaseProps {
  international?: false;
  withCountryCallingCode?: never;
}

interface PhoneInputWithInternationalProps extends PhoneInputBaseProps {
  international: true;
  withCountryCallingCode?: boolean;
}

interface PhoneInputWithoutPreferredCountryProps extends PhoneInputBaseProps {
  preferredCountry?: never;
  defaultInternationalForPreferredCountry?: never;
}

interface PhoneInputWithPreferredCountryProps extends PhoneInputBaseProps {
  preferredCountry: Country;
  defaultInternationalForPreferredCountry?: boolean;
}

type PhoneInputProps = (
  PhoneInputWithoutInternationalProps | PhoneInputWithInternationalProps
) &
  (
    PhoneInputWithoutPreferredCountryProps | PhoneInputWithPreferredCountryProps
  );

interface PhoneInputContextProps {
  value: Value;
  onValueChange: (value: Value) => void;
  country: Country | null;
  onCountryChange: (country: Country | null) => void;
  preferredCountry: Country | undefined;
  defaultInternationalForPreferredCountry: boolean;
  international: boolean;
  withCountryCallingCode: boolean;
  disabled: boolean;
}

const PhoneInputContext = React.createContext<PhoneInputContextProps | null>(
  null,
);

function usePhoneInput() {
  const context = React.useContext(PhoneInputContext);

  if (!context) {
    throw new Error("usePhoneInput must be used within a <PhoneInput />.");
  }

  return context;
}

function PhoneInput({
  value: valueProp,
  defaultValue,
  onValueChange,
  country: countryProp,
  defaultCountry,
  onCountryChange,
  preferredCountry,
  defaultInternationalForPreferredCountry = false,
  international = false,
  withCountryCallingCode = false,
  disabled = false,
  children,
}: PhoneInputProps) {
  const [value, setValueUnwrapped] = useControlled({
    controlled: valueProp,
    default: (defaultValue ?? "") as Value,
    name: "PhoneInput",
    state: "value",
  });
  const setValue = useStableCallback((nextValue: Value) => {
    setValueUnwrapped(nextValue);
    onValueChange?.(nextValue);
  });

  const [country, setCountryUnwrapped] = useControlled({
    controlled: countryProp,
    default: defaultCountry ?? null,
    name: "PhoneInput",
    state: "country",
  });
  const setCountry = useStableCallback((nextCountry: Country | null) => {
    setCountryUnwrapped(nextCountry);
    onCountryChange?.(nextCountry);
  });

  return (
    <PhoneInputContext.Provider
      value={{
        value,
        onValueChange: setValue,
        country,
        onCountryChange: setCountry,
        preferredCountry,
        defaultInternationalForPreferredCountry,
        international,
        withCountryCallingCode,
        disabled,
      }}
    >
      {children}
    </PhoneInputContext.Provider>
  );
}

interface PhoneInputInputProps extends Omit<
  React.ComponentProps<typeof ReactPhoneInput>,
  | "value"
  | "onChange"
  | "inputComponent"
  | "international"
  | "withCountryCallingCode"
  | "useNationalFormatForDefaultCountryValue"
> {
  render?: React.ReactElement<React.ComponentProps<"input">>;
  smartCaret?: boolean;
}

function getInputComponent(
  render: React.ReactElement<React.ComponentProps<"input">>,
) {
  return function InputComponent(props: React.ComponentProps<"input">) {
    return React.cloneElement(render, mergeProps(props, render.props));
  };
}

function PhoneInputInput({
  render,
  disabled: disabledProp,
  ...props
}: PhoneInputInputProps) {
  const {
    value,
    onValueChange,
    country,
    preferredCountry,
    defaultInternationalForPreferredCountry,
    international,
    withCountryCallingCode,
    disabled,
  } = usePhoneInput();

  const inputComponent = React.useMemo(
    () => (render ? getInputComponent(render) : undefined),
    [render],
  );

  // react-phone-number-input keeps internal state. A stable callback plus a
  // deferred update prevents its semi-controlled input from rerendering forever.
  const handleChange = useStableCallback((nextValue: Value) => {
    setTimeout(() => onValueChange(nextValue ?? ("" as Value)));
  });

  return (
    <ReactPhoneInput
      data-slot="phone-input-input"
      inputComponent={inputComponent}
      country={country ?? undefined}
      {...(!country && { defaultCountry: preferredCountry })}
      useNationalFormatForDefaultCountryValue={
        !defaultInternationalForPreferredCountry
      }
      {...(country && { international })}
      {...(international && { withCountryCallingCode })}
      value={value}
      onChange={handleChange}
      disabled={disabled || disabledProp}
      {...props}
    />
  );
}

const INTERNATIONAL_COUNTRY_CODE = "international";

function PhoneInputCountrySelect({
  disabled: disabledProp,
  ...props
}: React.ComponentProps<"select">) {
  const { country, onCountryChange, disabled } = usePhoneInput();

  return (
    <select
      data-slot="phone-input-country-select"
      value={country ?? ""}
      disabled={disabled || disabledProp}
      onChange={(event) =>
        onCountryChange(
          event.target.value === INTERNATIONAL_COUNTRY_CODE
            ? null
            : (event.target.value as Country),
        )
      }
      {...props}
    />
  );
}

function PhoneInputCountrySelectOption(props: React.ComponentProps<"option">) {
  return <option data-slot="phone-input-country-select-option" {...props} />;
}

function PhoneInputCountryInternationalSelectOption({
  ...props
}: Omit<React.ComponentProps<"option">, "value">) {
  return (
    <PhoneInputCountrySelectOption
      value={INTERNATIONAL_COUNTRY_CODE}
      {...props}
    />
  );
}

function getCountryOptions() {
  return getCountries().map((countryCode) => ({
    countryCode,
    countryCallingCode: getCountryCallingCode(countryCode),
  }));
}

export {
  PhoneInput as Root,
  PhoneInputInput as Input,
  PhoneInputCountrySelect as CountrySelect,
  PhoneInputCountrySelectOption as CountrySelectOption,
  PhoneInputCountryInternationalSelectOption as CountryInternationalSelectOption,
  getCountryOptions,
  usePhoneInput,
  INTERNATIONAL_COUNTRY_CODE,
  type Country,
  type PhoneInputProps,
  type Value,
};
