import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePersistedAuthEmail } from "./use-persisted-auth-email";

function EmailHarness() {
  const [email, setEmail] = usePersistedAuthEmail();

  return (
    <input
      aria-label="E-mail"
      value={email}
      onChange={(event) => setEmail(event.target.value)}
    />
  );
}

describe("usePersistedAuthEmail", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("restores the email after the auth screen is remounted", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<EmailHarness />);

    await user.type(screen.getByLabelText("E-mail"), "usuario@lucrivo.com");
    unmount();
    render(<EmailHarness />);

    expect(screen.getByLabelText("E-mail")).toHaveValue("usuario@lucrivo.com");
  });

  it("remains editable when session storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    const user = userEvent.setup();

    render(<EmailHarness />);
    const email = screen.getByLabelText("E-mail");
    await user.clear(email);
    await user.type(email, "usuario@lucrivo.com");

    expect(email).toHaveValue("usuario@lucrivo.com");
  });
});
