import { describe, expect, it } from "vitest";
import { formatInTimeZone } from "date-fns-tz";

import {
  OPENING_HOURS,
  SLOT_DURATION_MINUTES,
  combineDateAndTime,
  generateSlots,
  isAlignedToStep,
  isWithinOpeningHours,
  parseTime,
  toHHmm,
} from "@/lib/time";

const zone = "Africa/Abidjan";

describe("time utilities", () => {
  it("parses time strings using the provided zone", () => {
    const reference = new Date("2025-01-01T00:00:00.000Z");
    const result = parseTime("09:15", zone, reference);
    const formatted = formatInTimeZone(result, zone, "HH:mm");
    expect(formatted).toBe("09:15");
  });

  it("generates slots aligned with the opening hours", () => {
    const reference = new Date("2025-01-01T00:00:00.000Z");
    const slots = generateSlots(reference, SLOT_DURATION_MINUTES, zone);
    const expectedSlots =
      ((Number(OPENING_HOURS.end.split(":")[0]) * 60 +
        Number(OPENING_HOURS.end.split(":")[1])) -
        (Number(OPENING_HOURS.start.split(":")[0]) * 60 +
          Number(OPENING_HOURS.start.split(":")[1]))) /
      SLOT_DURATION_MINUTES;
    expect(slots).toHaveLength(expectedSlots);
    expect(toHHmm(slots[0].start, zone)).toBe(OPENING_HOURS.start);
    expect(toHHmm(slots.at(-1)!.end, zone)).toBe(OPENING_HOURS.end);
  });

  it("validates alignment to slot duration", () => {
    const aligned = combineDateAndTime("2025-01-02", "10:30", zone);
    const misaligned = combineDateAndTime("2025-01-02", "10:45", zone);
    expect(isAlignedToStep(aligned, SLOT_DURATION_MINUTES, zone)).toBe(true);
    expect(isAlignedToStep(misaligned, SLOT_DURATION_MINUTES, zone)).toBe(false);
  });

  it("checks if a date is within opening hours", () => {
    const inside = combineDateAndTime("2025-01-02", "12:00", zone);
    const before = combineDateAndTime("2025-01-02", "06:30", zone);
    const after = combineDateAndTime("2025-01-02", "20:30", zone);

    expect(isWithinOpeningHours(inside, zone)).toBe(true);
    expect(isWithinOpeningHours(before, zone)).toBe(false);
    expect(isWithinOpeningHours(after, zone)).toBe(false);
  });
});
