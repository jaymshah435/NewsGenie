import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { ApprovalCard, type PendingAction } from "@/components/ApprovalCard";

const proposal: PendingAction = {
  id: "a1",
  org_id: "dailyplanet",
  setting: "Moderation alert threshold",
  old_value: 60,
  new_value: 75,
  status: "pending",
  error: null,
};

test("Approve calls the approve endpoint and shows the result", async () => {
  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(JSON.stringify({ ...proposal, status: "approved" }), { status: 200 }));

  render(<ApprovalCard action={proposal} orgName="The Daily Planet" />);
  expect(screen.getByText(/from/)).toHaveTextContent("from 60 to 75");

  await userEvent.click(screen.getByRole("button", { name: "Approve" }));

  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toBe("http://localhost:8000/api/assistant/actions/a1/approve");
  expect(options?.method).toBe("POST");
  expect(await screen.findByRole("status")).toHaveTextContent("Approved. The threshold is now 75.");
});
