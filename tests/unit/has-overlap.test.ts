import { describe, expect, it, vi } from "vitest";

import { combineDateAndTime } from "@/lib/time";
import { hasOverlap, type HasOverlapInput } from "@/server/reservations/conflict";

type ReservationQuery = { where: Record<string, unknown> };
type ReservationModelMock = {
  findFirst: (query: ReservationQuery) => Promise<unknown>;
};
type PrismaExecutorShape = {
  reservation: ReservationModelMock;
};
type HasOverlapExecutor = NonNullable<Parameters<typeof hasOverlap>[1]>;

function buildInput(overrides: Partial<HasOverlapInput> = {}): HasOverlapInput {
  return {
    roomId: "room-1",
    date: "2025-01-10",
    start: "09:00",
    end: "09:30",
    ...overrides,
  };
}

function createDbMock(implementation: ReservationModelMock["findFirst"]) {
  const findFirst = vi.fn<ReservationModelMock["findFirst"]>(implementation);

  const db: PrismaExecutorShape = {
    reservation: {
      findFirst,
    },
  };

  return { db, findFirst };
}

describe("hasOverlap", () => {
  it("returns true when an overlap is detected", async () => {
    const overlapReservation = {
      id: "existing",
      startTime: combineDateAndTime("2025-01-10", "09:00"),
      endTime: combineDateAndTime("2025-01-10", "10:00"),
    };

    const { db, findFirst } = createDbMock(async () => overlapReservation);

    await expect(
      hasOverlap(
        buildInput(),
        db as unknown as HasOverlapExecutor,
      ),
    ).resolves.toBe(true);

    const callArgs = findFirst.mock.calls[0]?.[0] ?? {};
    const where = (callArgs as ReservationQuery).where ?? {};
    expect(where.startTime).toEqual({
      lt: combineDateAndTime("2025-01-10", "09:30"),
    });
    expect(where.endTime).toEqual({
      gt: combineDateAndTime("2025-01-10", "09:00"),
    });
  });

  it("returns false when reservations touch but do not overlap", async () => {
    const { db, findFirst } = createDbMock(async () => null);

    await expect(
      hasOverlap(
        buildInput({ start: "10:00", end: "10:30" }),
        db as unknown as HasOverlapExecutor,
      ),
    ).resolves.toBe(false);

    expect(findFirst).toHaveBeenCalledTimes(1);
  });

  it("excludes the provided reservation id when checking overlaps", async () => {
    const { db, findFirst } = createDbMock(async () => null);

    await hasOverlap(
      buildInput({ excludeId: "reservation-123" }),
      db as unknown as HasOverlapExecutor,
    );

    const callArgs = findFirst.mock.calls[0]?.[0] ?? {};
    const where = (callArgs as ReservationQuery).where ?? {};
    expect(where.id).toEqual({ not: "reservation-123" });
  });
});
