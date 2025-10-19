import { describe, expect, it } from "vitest";
import { nextSaturday } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import {
  ReservationInput,
  ReservationInputSchema,
  sanitizeReservationInput,
} from "@/lib/validation";
import { DEFAULT_TIME_ZONE } from "@/lib/time";

function buildBaseInput(overrides: Partial<ReservationInput> = {}): ReservationInput {
  const today = formatInTimeZone(new Date(), DEFAULT_TIME_ZONE, "yyyy-MM-dd");

  return {
    roomId: "room-1",
    date: today,
    start: "09:00",
    end: "09:30",
    objective: "Reunion",
    participantGroup: "Equipe A",
    title: "RÃ©union",
    note: "Note facultative",
    ...overrides,
  };
}

describe("ReservationInputSchema", () => {
  it("accepts a valid payload", () => {
    const result = ReservationInputSchema.safeParse(buildBaseInput());
    expect(result.success).toBe(true);
  });

  it("rejects reservations scheduled on a weekend", () => {
    const saturday = formatInTimeZone(
      nextSaturday(new Date()),
      DEFAULT_TIME_ZONE,
      "yyyy-MM-dd",
    );
    const result = ReservationInputSchema.safeParse(
      buildBaseInput({ date: saturday }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("autorisees le week-end");
    }
  });

  it("rejects reservations with inverted times", () => {
    const result = ReservationInputSchema.safeParse(
      buildBaseInput({ start: "10:00", end: "09:30" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("fin doit etre posterieure");
    }
  });
});

describe("sanitizeReservationInput", () => {
  it("normalises title and removes dangerous characters", () => {
    const payload = buildBaseInput({
      title: "  RÃ©union\r\nimportante  ",
      note: "   \r\n  ",
    });
    const sanitized = sanitizeReservationInput(payload);
    expect(sanitized.title).toBe("RÃ©union importante");
    expect(sanitized.note).toBeUndefined();
  });

  it("throws when sanitization empties the title", () => {
    const payload = buildBaseInput({ title: " \n " });
    expect(() => sanitizeReservationInput(payload)).toThrowError(
      "Le titre ne peut pas Ãªtre vide.",
    );
  });

  it("preserves valid optional note content", () => {
    const payload = buildBaseInput({ note: "  Salle B \n Ã©tage 2  " });
    const sanitized = sanitizeReservationInput(payload);
    expect(sanitized.note).toBe("Salle B Ã©tage 2");
  });
});


