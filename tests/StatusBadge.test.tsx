import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/Badge";

describe("StatusBadge", () => {
  it("renders the status text with underscores replaced by spaces", () => {
    render(<StatusBadge status="ON_TRIP" />);
    expect(screen.getByText("ON TRIP")).toBeInTheDocument();
  });

  it("renders dispatched status", () => {
    render(<StatusBadge status="DISPATCHED" />);
    expect(screen.getByText("DISPATCHED")).toBeInTheDocument();
  });

  it("falls back to gray for unknown statuses", () => {
    const { container } = render(<StatusBadge status="WEIRD_STATUS" />);
    expect(screen.getByText("WEIRD STATUS")).toBeInTheDocument();
    expect(container.querySelector("span")).toBeTruthy();
  });
});
