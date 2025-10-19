import { NextResponse } from "next/server";

import { prisma } from "@/server/db/client";
import { resolveDepartmentFromGroup } from "@/lib/departments";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const roomId = searchParams.get("roomId");

  if (!start || !end) {
    return NextResponse.json(
      { error: "start and end parameters are required" },
      { status: 400 },
    );
  }

  const startDate = new Date(start);
  const endDate = new Date(end);

  const reservations = await prisma.reservation.findMany({
    where: {
      date: {
        gte: startDate,
        lt: endDate,
      },
      ...(roomId ? { roomId } : {}),
    },
    include: {
      room: {
        select: {
          name: true,
          building: true,
          category: true,
          location: true,
          capacity: true,
        },
      },
      user: { select: { name: true, email: true } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  const payload = reservations.map((reservation) => {
    const department = resolveDepartmentFromGroup(
      reservation.participantGroup ?? null,
    );

    return {
      id: reservation.id,
      roomId: reservation.roomId,
      roomName: reservation.room?.name ?? reservation.roomId,
      roomBuilding: reservation.room?.building ?? null,
      roomCategory: reservation.room?.category ?? null,
      roomLocation: reservation.room?.location ?? null,
      roomCapacity: reservation.room?.capacity ?? null,
      title: reservation.title,
      objective: reservation.objective ?? null,
      participantGroup: reservation.participantGroup ?? null,
      note: reservation.note,
      date: reservation.date.toISOString(),
      startTime: reservation.startTime.toISOString(),
      endTime: reservation.endTime.toISOString(),
      createdBy:
        reservation.user?.name ?? reservation.user?.email ?? "Auteur inconnu",
      departmentId: department?.id ?? null,
      departmentLabel: department?.label ?? null,
    };
  });

  return NextResponse.json(payload);
}
