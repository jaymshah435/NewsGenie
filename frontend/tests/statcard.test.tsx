import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { StatCard, formatChange } from "@/components/StatCard";

test("% change is written with an arrow and a sign", () => {
  expect(formatChange(12.3)).toBe("▲ +12.3% vs previous period");
  expect(formatChange(-4)).toBe("▼ -4% vs previous period");
  expect(formatChange(0)).toBe("No change vs previous period");
  expect(formatChange(null)).toBe("No data for the previous period");
});

test("stat card shows the total and the change line", () => {
  render(<StatCard label="Flagged" value="11,611" change={12.3} />);
  expect(screen.getByText("11,611")).toBeInTheDocument();
  expect(screen.getByText("▲ +12.3% vs previous period")).toBeInTheDocument();
});
