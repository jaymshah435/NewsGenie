import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { ErrorMessage, Loading } from "@/components/States";

test("loading state is shown", () => {
  render(<Loading />);
  expect(screen.getByRole("status")).toHaveTextContent("Loading…");
});

test("error state shows the message and a working Try again button", async () => {
  const retry = vi.fn();
  render(<ErrorMessage message="Cannot reach the server. Is the backend running?" onRetry={retry} />);

  expect(screen.getByRole("alert")).toHaveTextContent("Cannot reach the server");
  await userEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(retry).toHaveBeenCalledOnce();
});
