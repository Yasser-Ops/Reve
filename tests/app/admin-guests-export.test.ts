import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "../helpers/fake-supabase";

const state = vi.hoisted(() => ({
  fake: null as ReturnType<typeof fakeSupabase> | null,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => state.fake?.client,
}));
const requireAdmin = vi.hoisted(() => vi.fn(async () => ({ userId: "a1" })));
vi.mock("@/lib/auth/guards", () => ({ requireAdmin }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

import { GET } from "@/app/admin/invitations/[id]/export/route";

const ID = "3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b";
const call = (id: string) =>
  GET(new Request("http://localhost/x"), { params: Promise.resolve({ id }) });

const row = {
  name: "Layla",
  attending: true,
  party_size: 2,
  dietary_notes: null,
  message: null,
  created_at: "2026-10-02T10:00:00Z",
};

beforeEach(() => {
  requireAdmin.mockClear();
  state.fake = fakeSupabase({
    invitations: [{ data: { slug: "test-couple" } }],
    rsvps: [{ data: [row] }],
  });
});

describe("admin guest list export", () => {
  it("requires an admin before anything else", async () => {
    requireAdmin.mockRejectedValueOnce(new Error("NEXT_REDIRECT"));
    await expect(call(ID)).rejects.toThrow("NEXT_REDIRECT");
    expect(state.fake?.calls).toHaveLength(0);
  });

  it("is not found for an id that is not a uuid", async () => {
    await expect(call("nope")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(state.fake?.calls).toHaveLength(0);
  });

  it("is not found for an unknown invitation", async () => {
    state.fake = fakeSupabase({ invitations: [{ data: null }] });
    await expect(call(ID)).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("sends the CSV for any invitation, as an uncached download", async () => {
    const response = await call(ID);
    expect(response.headers.get("Content-Type")).toBe(
      "text/csv; charset=utf-8",
    );
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="guests-test-couple.csv"',
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.text()).toContain("Layla,Yes,2");
  });
});
