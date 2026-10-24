import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { expect, test, vi } from "vitest";
import LoginPage from "@/pages/login";
import { AuthProvider } from "@/lib/auth";

test("login form shows an error on wrong password", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ detail: "Incorrect email or password." }), { status: 401 }),
  );

  render(
    <MemoryRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  );
  await userEvent.type(screen.getByLabelText("Email"), "alice@dailyplanet.com");
  await userEvent.type(screen.getByLabelText("Password"), "wrong");
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password.");
});
