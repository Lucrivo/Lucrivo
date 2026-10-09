import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it } from "vitest";

import {
  PhoneInput,
  PhoneInputCountrySelect,
  PhoneInputCountrySelectContent,
  PhoneInputCountrySelectOptions,
  PhoneInputCountrySelectValue,
  PhoneInputInput,
  type Value,
} from "./phone-input";
import { SelectTrigger } from "./select";

function PhoneHarness({
  initialValue = "" as Value,
  invalid = false,
}: {
  initialValue?: Value;
  invalid?: boolean;
}) {
  const [value, setValue] = React.useState<Value>(initialValue);

  return (
    <>
      <PhoneInput preferredCountry="BR" value={value} onValueChange={setValue}>
        <div className="flex">
          <PhoneInputCountrySelect>
            <SelectTrigger aria-label="País do WhatsApp">
              <PhoneInputCountrySelectValue />
            </SelectTrigger>
            <PhoneInputCountrySelectContent>
              <PhoneInputCountrySelectOptions />
            </PhoneInputCountrySelectContent>
          </PhoneInputCountrySelect>
          <PhoneInputInput
            aria-label="WhatsApp"
            aria-invalid={invalid || undefined}
          />
        </div>
      </PhoneInput>
      <output aria-label="Valor E.164">{value}</output>
    </>
  );
}

describe("PhoneInput", () => {
  it("offers a keyboard-operable country trigger defaulted visually to Brazil", async () => {
    const user = userEvent.setup();
    render(<PhoneHarness />);

    const trigger = screen.getByRole("combobox", { name: "País do WhatsApp" });
    expect(trigger).toHaveTextContent("BR");

    await user.tab();
    expect(trigger).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(
      await screen.findByRole("option", { name: /Internacional/i }),
    ).toBeVisible();
  });

  it("turns a Brazilian national number into E.164", async () => {
    const user = userEvent.setup({ delay: 5 });
    render(<PhoneHarness />);

    await user.type(
      screen.getByRole("textbox", { name: "WhatsApp" }),
      "11999999999",
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Valor E.164")).toHaveTextContent(
        "+5511999999999",
      );
    });
  });

  it("keeps focus and the canonical value while editing an initial number", async () => {
    const user = userEvent.setup();
    render(<PhoneHarness initialValue={"+5511999999999" as Value} />);

    const input = screen.getByRole("textbox", { name: "WhatsApp" });
    await user.click(input);
    await user.keyboard("{End}{Backspace}9");

    expect(input).toHaveFocus();
    await waitFor(() => {
      expect(screen.getByLabelText("Valor E.164")).toHaveTextContent(
        "+5511999999999",
      );
    });
  });

  it("supports selecting and entering an international number", async () => {
    const user = userEvent.setup({ delay: 5 });
    render(<PhoneHarness />);

    await user.click(
      screen.getByRole("combobox", { name: "País do WhatsApp" }),
    );
    await user.click(
      await screen.findByRole("option", { name: /Portugal.*\+351/i }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "WhatsApp" }),
      "912345678",
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Valor E.164")).toHaveTextContent(
        "+351912345678",
      );
    });
  });

  it("forwards the invalid state to the native input", () => {
    render(<PhoneHarness invalid />);

    expect(screen.getByRole("textbox", { name: "WhatsApp" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
});
