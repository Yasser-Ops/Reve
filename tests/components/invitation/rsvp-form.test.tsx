import {
  createEvent,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RsvpForm as JardinRsvpForm } from "@/components/invitation/templates/jardin/RsvpForm";
import { RsvpForm as LinRsvpForm } from "@/components/invitation/templates/lin/RsvpForm";
import { Lin } from "@/components/invitation/templates/lin";
import { Jardin } from "@/components/invitation/templates/jardin";
import { RSVP_COPY, RSVP_LIMITS } from "@/lib/schemas/rsvp";
import { entitlementsSchema } from "@/lib/schemas/invitation";
import { SAMPLE_CONTENT, SAMPLE_THEME } from "@/lib/sample-invitation";
import { linContentSchema } from "@/components/invitation/templates/lin/schema";
import { jardinContentSchema } from "@/components/invitation/templates/jardin/schema";

const submitRsvp = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rsvp/submit", () => ({ submitRsvp }));

const SLUG = "test-couple";

/**
 * A plain form GETs its own URL on submit, which reloaded the invitation and
 * replayed the envelope. The form stays on the page; it sends only from the
 * live invitation and says it is a preview everywhere else.
 */
describe.each([
  ["Lin", LinRsvpForm, "Submit"],
  ["Jardin", JardinRsvpForm, "Send word"],
])("%s RsvpForm", (_name, RsvpForm, label) => {
  const renderForm = (rsvpSlug: string | null) =>
    render(
      <RsvpForm
        accent="#8a6d3a"
        ink="#3a2f22"
        paper="#f5f0e6"
        rsvpSlug={rsvpSlug}
      />,
    );

  beforeEach(() => submitRsvp.mockReset());

  it("does not navigate on submit", () => {
    renderForm(null);
    const form = screen.getByRole("form", { name: "Reply" });
    const submit = createEvent.submit(form);

    fireEvent(form, submit);

    expect(submit.defaultPrevented).toBe(true);
  });

  it("with no slug, shows the preview line and never calls the action", async () => {
    const user = userEvent.setup();
    renderForm(null);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Your name"), "Sam");
    await user.click(screen.getByLabelText("Yes"));
    await user.click(screen.getByRole("button", { name: label }));

    expect(screen.getByRole("status")).toHaveTextContent(RSVP_COPY.PREVIEW);
    expect(submitRsvp).not.toHaveBeenCalled();
  });

  it("with a slug, sends the form plus the slug and swaps in the yes confirmation", async () => {
    submitRsvp.mockResolvedValue({ ok: true, attending: true });
    const user = userEvent.setup();
    renderForm(SLUG);

    await user.type(screen.getByLabelText("Your name"), "Sam");
    await user.click(screen.getByLabelText("Yes"));
    await user.click(screen.getByRole("button", { name: label }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        RSVP_COPY.THANKS_YES,
      ),
    );
    const sent = submitRsvp.mock.calls[0][1] as FormData;
    expect(sent.get("slug")).toBe(SLUG);
    expect(sent.get("name")).toBe("Sam");
    expect(sent.get("attending")).toBe("yes");
    expect(
      screen.queryByRole("form", { name: "Reply" }),
    ).not.toBeInTheDocument();
  });

  it("confirms a decline with its own line", async () => {
    submitRsvp.mockResolvedValue({ ok: true, attending: false });
    const user = userEvent.setup();
    renderForm(SLUG);

    await user.type(screen.getByLabelText("Your name"), "Sam");
    await user.click(screen.getByLabelText("No"));
    await user.click(screen.getByRole("button", { name: label }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(RSVP_COPY.THANKS_NO),
    );
  });

  it("shows a refusal and keeps what was typed", async () => {
    submitRsvp.mockResolvedValue({
      ok: false,
      message: "Replies are not open.",
    });
    const user = userEvent.setup();
    renderForm(SLUG);

    await user.type(screen.getByLabelText("Your name"), "Sam");
    await user.click(screen.getByLabelText("Yes"));
    await user.click(screen.getByRole("button", { name: label }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Replies are not open.",
      ),
    );
    expect(screen.getByLabelText("Your name")).toHaveValue("Sam");
    expect(screen.getByLabelText("Yes")).toBeChecked();
  });

  it("shows party size and dietary notes only for Yes", async () => {
    const user = userEvent.setup();
    renderForm(SLUG);
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Yes"));
    expect(screen.getByRole("spinbutton")).toHaveAttribute(
      "max",
      String(RSVP_LIMITS.PARTY_MAX),
    );
    expect(screen.getByLabelText("Dietary needs")).toBeInTheDocument();

    await user.click(screen.getByLabelText("No"));
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });

  it("carries a hidden honeypot that stays out of the tab order", () => {
    renderForm(SLUG);
    const trap = screen.getByLabelText("Company", {
      selector: "input",
      exact: false,
    });

    expect(trap).toHaveAttribute("tabindex", "-1");
    expect(trap).toHaveAttribute("autocomplete", "off");
    expect(trap.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});

describe.each([
  ["Lin", Lin, linContentSchema],
  ["Jardin", Jardin, jardinContentSchema],
])("%s reply section", (_name, Design, schema) => {
  /* The petal layer measures itself; jsdom has no ResizeObserver. */
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
  });

  const renderDesign = (rsvp: boolean) =>
    render(
      <Design
        content={schema.parse(SAMPLE_CONTENT)}
        entitlements={entitlementsSchema.parse({ rsvp })}
        theme={SAMPLE_THEME}
      />,
    );

  it("shows the reply card when the rsvp entitlement is on", () => {
    renderDesign(true);
    expect(screen.getByRole("form", { name: "Reply" })).toBeInTheDocument();
  });

  it("is absent when the rsvp entitlement is off", () => {
    renderDesign(false);
    expect(
      screen.queryByRole("form", { name: "Reply" }),
    ).not.toBeInTheDocument();
  });
});
