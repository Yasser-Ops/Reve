"use client";

import { useState, useTransition } from "react";
import { submitRsvp } from "@/lib/rsvp/submit";
import { RSVP_COPY } from "@/lib/schemas/rsvp";

export const RSVP_STATE = {
  IDLE: "idle",
  SENDING: "sending",
  SENT: "sent",
  PREVIEW: "preview",
  ERROR: "error",
} as const;

type RsvpState = (typeof RSVP_STATE)[keyof typeof RSVP_STATE];

type Outcome = {
  state: RsvpState;
  message: string | null;
  attending: boolean | null;
};

const IDLE: Outcome = {
  state: RSVP_STATE.IDLE,
  message: null,
  attending: null,
};

/**
 * Drives a design's reply card. With no slug (anything but the live page) a
 * submit only explains it is a preview and never reaches the action, so a
 * draft or the store demo can never write a row. The form stays mounted
 * through a refusal so nothing the guest typed is lost.
 */
export function useRsvpSubmit(rsvpSlug: string | null) {
  const [outcome, setOutcome] = useState<Outcome>(IDLE);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    if (!rsvpSlug) {
      setOutcome({
        state: RSVP_STATE.PREVIEW,
        message: RSVP_COPY.PREVIEW,
        attending: null,
      });
      return;
    }
    formData.set("slug", rsvpSlug);
    startTransition(async () => {
      const result = await submitRsvp(null, formData);
      setOutcome(
        result.ok
          ? {
              state: RSVP_STATE.SENT,
              attending: result.attending,
              message: result.attending
                ? RSVP_COPY.THANKS_YES
                : RSVP_COPY.THANKS_NO,
            }
          : {
              state: RSVP_STATE.ERROR,
              message: result.message,
              attending: null,
            },
      );
    });
  }

  return {
    ...outcome,
    state: pending ? RSVP_STATE.SENDING : outcome.state,
    submit,
  };
}
