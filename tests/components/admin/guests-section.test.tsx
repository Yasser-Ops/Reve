import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GuestsSection } from "@/components/admin/GuestsSection";
import { adminRoutes } from "@/lib/routes";

const summary = {
  guests: [
    {
      name: "Layla",
      attending: true,
      partySize: 2,
      dietaryNotes: null,
      message: null,
      repliedAt: "2026-10-02T10:00:00Z",
      earlierReplies: 0,
    },
  ],
  coming: 2,
  declined: 0,
  replies: 1,
};

describe("GuestsSection", () => {
  it("shows the list and the CSV download when the plan includes replies", () => {
    render(<GuestsSection invitationId="i1" summary={summary} />);
    expect(screen.getByText("Layla")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Download CSV" }).getAttribute("href"),
    ).toBe(adminRoutes.guestsExport("i1"));
  });

  it("says why there is no list when the plan has no replies", () => {
    render(<GuestsSection invitationId="i1" summary={null} />);
    expect(
      screen.getByText("This plan does not include replies."),
    ).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
