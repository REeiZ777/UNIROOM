import { addDays, parseISO, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

import type { ReservationEvent } from "@/components/reservations/week-grid";
import {
  getReservationDisplayTitle,
  getReservationSecondaryLabel,
} from "@/lib/reservations";
import { resolveDepartmentFromGroup } from "@/lib/departments";
import { prisma } from "@/server/db/client";

import { ReservationTableActions } from "./reservation-table-actions";
import { ReservationTablePagination } from "./reservation-table-pagination";

type ReservationsTableProps = {
  selectedDate: string;
  roomIds: string[];
  page: number;
  tableRoomId?: string | null;
  tableDate?: string | null;
  pageSize?: number;
};

const zone =
  process.env.NEXT_PUBLIC_SCHOOL_TIMEZONE ??
  process.env.SCHOOL_TIMEZONE ??
  "Africa/Abidjan";

function getWeekRange(dateIso: string) {
  const baseDate = startOfWeek(parseISO(dateIso), { weekStartsOn: 1 });
  const end = addDays(baseDate, 7);
  return { start: baseDate, end };
}

function toReservationEvent(
  reservation: {
    id: string;
    roomId: string;
    roomName?: string | null;
    roomBuilding?: string | null;
    roomCategory?: string | null;
    roomLocation?: string | null;
    roomCapacity?: number | null;
    title: string;
    objective: string | null;
    participantGroup: string | null;
    note: string | null;
    date: Date;
    startTime: Date;
    endTime: Date;
    userName?: string | null;
    userEmail?: string | null;
  },
): ReservationEvent {
  const department = resolveDepartmentFromGroup(reservation.participantGroup);

  return {
    id: reservation.id,
    roomId: reservation.roomId,
    roomName: reservation.roomName ?? reservation.roomId,
    roomBuilding: reservation.roomBuilding ?? null,
    roomCategory: reservation.roomCategory ?? null,
    roomLocation: reservation.roomLocation ?? null,
    roomCapacity: reservation.roomCapacity ?? null,
    title: reservation.title,
    objective: reservation.objective,
    participantGroup: reservation.participantGroup,
    note: reservation.note,
    date: reservation.date.toISOString(),
    startTime: reservation.startTime.toISOString(),
    endTime: reservation.endTime.toISOString(),
    createdBy: reservation.userName ?? reservation.userEmail ?? "Auteur inconnu",
    departmentId: department?.id ?? null,
    departmentLabel: department?.label ?? null,
  };
}

export async function ReservationsTable({
  selectedDate,
  roomIds,
  page,
  tableRoomId,
  tableDate,
  pageSize = 10,
}: ReservationsTableProps) {
  const effectivePage = Number.isNaN(page) || page < 1 ? 1 : page;
  const take = pageSize;
  const skip = (effectivePage - 1) * take;
  const { start, end } = getWeekRange(selectedDate);

  const activeRoomIds =
    Array.isArray(roomIds) && roomIds.length > 0 ? roomIds : null;
  const normalizedTableRoom =
    tableRoomId && tableRoomId !== "all" ? tableRoomId : null;

  let tableDateStart: Date | null = null;
  let tableDateEnd: Date | null = null;
  if (tableDate) {
    const parsed = parseISO(tableDate);
    if (!Number.isNaN(parsed.getTime())) {
      tableDateStart = parsed;
      tableDateEnd = addDays(parsed, 1);
    }
  }

  const where = {
    date:
      tableDateStart && tableDateEnd
        ? {
            gte: tableDateStart,
            lt: tableDateEnd,
          }
        : {
            gte: start,
            lt: end,
          },
    ...(normalizedTableRoom
      ? { roomId: normalizedTableRoom }
      : activeRoomIds
        ? { roomId: { in: activeRoomIds } }
        : {}),
  };

  const [reservations, totalCount] = await Promise.all([
    prisma.reservation.findMany({
      where,
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
      skip,
      take,
    }),
    prisma.reservation.count({ where }),
  ]);

  const rows = reservations.map((reservation) => {
    const event = toReservationEvent({
      id: reservation.id,
      roomId: reservation.roomId,
      roomName: reservation.room?.name,
      roomBuilding: reservation.room?.building,
      roomCategory: reservation.room?.category,
      roomLocation: reservation.room?.location,
      roomCapacity: reservation.room?.capacity ?? null,
      title: reservation.title,
      objective: reservation.objective,
      participantGroup: reservation.participantGroup,
      note: reservation.note,
      date: reservation.date,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      userName: reservation.user?.name,
      userEmail: reservation.user?.email,
    });

    const dateLabel = formatInTimeZone(
      reservation.startTime,
      zone,
      "EEEE d MMMM yyyy",
      { locale: fr },
    );
    const timeLabel = `${formatInTimeZone(
      reservation.startTime,
      zone,
      "HH:mm",
    )} - ${formatInTimeZone(reservation.endTime, zone, "HH:mm")}`;

    return {
      event,
      dateLabel,
      timeLabel,
      displayTitle: getReservationDisplayTitle(event),
      secondaryLabel: getReservationSecondaryLabel(event),
    };
  });

  const hasPrevious = effectivePage > 1;
  const hasNext = skip + reservations.length < totalCount;
  const totalPages = Math.max(1, Math.ceil(totalCount / take));

  return (
    <section className="rounded-xl border bg-card/50 shadow-sm">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold">Liste des reservations</h2>
          <p className="text-sm text-muted-foreground">
            Affinez et administrez les reservations selon vos filtres.
          </p>
        </div>
        <span className="text-sm text-muted-foreground">
          {totalCount} {totalCount > 1 ? "resultats" : "resultat"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-6 py-3 text-left font-medium">Details</th>
              <th className="px-6 py-3 text-left font-medium">Salle</th>
              <th className="px-6 py-3 text-left font-medium">Date</th>
              <th className="px-6 py-3 text-left font-medium">Heures</th>
              <th className="px-6 py-3 text-left font-medium">Cree par</th>
              <th className="px-6 py-3 text-left font-medium">Note</th>
              <th className="px-6 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-background/60">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-16 text-center text-sm text-muted-foreground"
                >
                  Aucune reservation ne correspond aux filtres actuels.
                </td>
              </tr>
            ) : (
              rows.map(({ event, dateLabel, timeLabel, displayTitle, secondaryLabel }) => (
                <tr key={event.id} className="hover:bg-muted/40">
                  <td className="px-6 py-4">
                    <span className="font-medium text-foreground">{displayTitle}</span>
                    {secondaryLabel && (
                      <span className="mt-1 block text-xs text-muted-foreground">{secondaryLabel}</span>
                    )}
                    {event.roomCategory && (
                      <span className="block text-xs text-muted-foreground capitalize">{event.roomCategory}</span>
                    )}
                    {event.roomBuilding && (
                      <span className="block text-xs text-muted-foreground">{event.roomBuilding}</span>
                    )}
                    {event.roomLocation && (
                      <span className="block text-xs text-muted-foreground">{event.roomLocation}</span>
                    )}
                    {typeof event.roomCapacity === "number" && (
                      <span className="block text-xs text-muted-foreground">
                        {event.roomCapacity} places
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {event.roomName}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{dateLabel}</td>
                  <td className="px-6 py-4 text-muted-foreground">{timeLabel}</td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {event.createdBy}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    <span className="line-clamp-2 max-w-xs">
                      {event.note && event.note.trim().length > 0 ? event.note : "Aucune note"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <ReservationTableActions reservation={event} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t px-6 py-4">
        <ReservationTablePagination
          currentPage={effectivePage}
          totalPages={totalPages}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
        />
      </div>
    </section>
  );
}
