import type { Prisma, PrismaClient } from "@prisma/client";

import { combineDateAndTime } from "@/lib/time";
import { prisma } from "@/server/db/client";

export type HasOverlapInput = {
  roomId: string;
  date: string;
  start: string;
  end: string;
  excludeId?: string;
};

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export async function hasOverlap(
  input: HasOverlapInput,
  db: PrismaExecutor = prisma,
): Promise<boolean> {
  const { roomId, date, start, end, excludeId } = input;

  const startTime = combineDateAndTime(date, start);
  const endTime = combineDateAndTime(date, end);
  const day = combineDateAndTime(date, "00:00");

  const conflict = await db.reservation.findFirst({
    where: {
      roomId,
      date: day,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      startTime: {
        lt: endTime,
      },
      endTime: {
        gt: startTime,
      },
    },
  });

  return Boolean(conflict);
}
