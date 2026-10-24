import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { Filters, defaultFilters } from "@/components/Filters";
import type { User } from "@/lib/auth";

const erin: User = {
  email: "erin@newsgroup.com",
  name: "Erin Patel",
  data_until: "2026-06-30",
  organizations: [
    { id: "dailyplanet", name: "The Daily Planet", role: "standard" },
    { id: "metrotimes", name: "Metro Times", role: "standard" },
  ],
};

const alice: User = { ...erin, organizations: [{ id: "dailyplanet", name: "The Daily Planet", role: "admin" }] };

test("organization filter only lists the user's own organizations", () => {
  render(<Filters user={erin} value={defaultFilters(erin)} onChange={() => {}} />);
  const options = screen.getAllByRole("option", { name: /organizations|Planet|Metro/ }).map((o) => o.textContent);
  expect(options).toEqual(["All my organizations", "The Daily Planet", "Metro Times"]);
});

test("users with one organization see no organization filter", () => {
  render(<Filters user={alice} value={defaultFilters(alice)} onChange={() => {}} />);
  expect(screen.queryByLabelText("Organization")).not.toBeInTheDocument();
});

test("period picker sets the date range", async () => {
  const onChange = vi.fn();
  render(<Filters user={alice} value={defaultFilters(alice)} onChange={onChange} />);
  expect(screen.getByLabelText("Period")).toHaveValue("Last 30 days");

  await userEvent.selectOptions(screen.getByLabelText("Period"), "Last 7 days");
  expect(onChange).toHaveBeenCalledWith({ org: "", start: "2026-06-24", end: "2026-06-30" });
});
