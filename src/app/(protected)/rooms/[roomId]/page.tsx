import { addDays, parseISO, startOfWeek } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { notFound } from "next/navigation";

import { combineDateAndTime } from "@/lib/time";
import { resolveDepartmentFromGroup } from "@/lib/departments";
import { prisma } from "@/server/db/client";

import { RoomViewContent } from "./room-view-content";

const zone = process.env.SCHOOL_TIMEZONE ?? "Africa/Abidjan";

type RoomPageProps = {
  params: {
    roomId: string;
  };
  searchParams?: Record<string, string | string[] | undefined>;
};

function resolveDateParam(value: string | undefined, fallbackIso: string) {
  if (!value) {
    return fallbackIso;
  }

  try {
    const parsed = parseISO(value);
    if (Number.isNaN(parsed.getTime())) {
      return fallbackIso;
    }
    return formatInTimeZone(parsed, zone, "yyyy-MM-dd");
  } catch {
    return fallbackIso;
  }
}

function mapReservation(reservation: {
  id: string;
  roomId: string;
  room: {
    name: string | null;
    building: string | null;
    category: string | null;
    location: string | null;
    capacity: number | null;
  } | null;
  user: { name: string | null; email: string | null } | null;
  title: string;
  objective: string | null;
  participantGroup: string | null;
  note: string | null;
  date: Date;
  startTime: Date;
  endTime: Date;
}) {
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
      reservation.user?.name ??
      reservation.user?.email ??
      "Auteur inconnu",
    departmentId: department?.id ?? null,
    departmentLabel: department?.label ?? null,
  };
}

export default async function RoomPage({
  params,
  searchParams = {},
}: RoomPageProps) {
  const [room, rooms] = await Promise.all([
    prisma.room.findUnique({
      where: { id: params.roomId },
      select: {
        id: true,
        name: true,
        capacity: true,
        location: true,
        building: true,
        category: true,
      },
    }),
    prisma.room.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!room) {
    notFound();
  }

  const todayIso = formatInTimeZone(new Date(), zone, "yyyy-MM-dd");
  const selectedDateIso = resolveDateParam(
    typeof searchParams.date === "string" ? searchParams.date : undefined,
    todayIso,
  );

  const weekStartIso = formatInTimeZone(
    startOfWeek(parseISO(selectedDateIso), { weekStartsOn: 1 }),
    zone,
    "yyyy-MM-dd",
  );

  const rangeStart = combineDateAndTime(weekStartIso, "00:00", zone);
  const rangeEnd = addDays(rangeStart, 7);

  const reservations = await prisma.reservation.findMany({
    where: {
      roomId: params.roomId,
      startTime: {
        gte: rangeStart,
        lt: rangeEnd,
      },
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

  const initialReservations = reservations.map(mapReservation);

  return (
    <RoomViewContent
      room={room}
      rooms={rooms}
      initialDate={selectedDateIso}
      initialReservations={initialReservations}
    />
  );
}
