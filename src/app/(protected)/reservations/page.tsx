import { Suspense } from "react";

import { addDays, parseISO, startOfWeek } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import { prisma } from "@/server/db/client";
import { resolveDepartmentFromGroup } from "@/lib/departments";

import { ReservationsContent } from "./reservations-content";
import { ReservationsTable } from "./reservations-table";

const zone = process.env.SCHOOL_TIMEZONE ?? "Africa/Abidjan";

type ReservationsPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function parseDateParam(value: string | undefined, fallbackIso: string) {
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

export default async function ReservationsPage({
  searchParams = {},
}: ReservationsPageProps) {
  const rooms = await prisma.room.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      building: true,
      location: true,
      capacity: true,
    },
  });

  const todayIso = formatInTimeZone(new Date(), zone, "yyyy-MM-dd");
  const roomIdSet = new Set(rooms.map((room) => room.id));
  const roomParam =
    typeof searchParams.room === "string" ? searchParams.room.trim() : "";
  const selectedRoomIds =
    roomParam && roomParam !== "all"
      ? Array.from(
          new Set(
            roomParam
              .split(",")
              .map((value) => value.trim())
              .filter((value) => value.length > 0 && roomIdSet.has(value)),
          ),
        )
      : [];
  const tableRoomParamRaw =
    typeof searchParams.tableRoom === "string"
      ? searchParams.tableRoom.trim()
      : "";
  const tableRoomId =
    tableRoomParamRaw && roomIdSet.has(tableRoomParamRaw)
      ? tableRoomParamRaw
      : null;
  const tableDateParamRaw =
    typeof searchParams.tableDate === "string"
      ? searchParams.tableDate.trim()
      : "";
  const tableDate =
    tableDateParamRaw && tableDateParamRaw.length > 0
      ? (() => {
          try {
            const parsed = parseISO(tableDateParamRaw);
            return Number.isNaN(parsed.getTime()) ? null : tableDateParamRaw;
          } catch {
            return null;
          }
        })()
      : null;
  const parsedPage =
    typeof searchParams.page === "string"
      ? Number.parseInt(searchParams.page, 10)
      : 1;
  const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const selectedDateIso = parseDateParam(
    typeof searchParams.date === "string" ? searchParams.date : undefined,
    todayIso,
  );

  const referenceDate = parseISO(selectedDateIso);
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 7);

  const reservations = await prisma.reservation.findMany({
    where: {
      date: {
        gte: weekStart,
        lt: weekEnd,
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
      user: {
        select: { name: true, email: true },
      },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  const initialReservations = reservations.map((reservation) => {
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

  const tableSlot = (
    <Suspense
      key="reservations-table"
      fallback={
        <section className="rounded-xl border bg-card/30 p-6 text-sm text-muted-foreground">
          Chargement des reservations...
        </section>
      }
    >
      <ReservationsTable
        selectedDate={selectedDateIso}
        roomIds={selectedRoomIds}
        page={page}
        tableRoomId={tableRoomId}
        tableDate={tableDate}
      />
    </Suspense>
  );

  return (
    <ReservationsContent
      rooms={rooms}
      initialDate={selectedDateIso}
      initialReservations={initialReservations}
      initialRoomIds={selectedRoomIds}
      initialTableRoomId={tableRoomId}
      initialTableDate={tableDate}
      tableSlot={tableSlot}
    />
  );
}
