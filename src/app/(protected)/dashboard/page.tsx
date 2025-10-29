import { addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DEFAULT_TIME_ZONE, combineDateAndTime } from "@/lib/time";
import { prisma } from "@/server/db/client";

const uiStrings = {
  headline: "Tableau de bord",
  subheadline: "Vue d'ensemble des reservations en cours et a venir.",
  dailyReservationsTitle: "Reservations du jour",
  dailyReservationsEmpty: "Aucune reservation prevue aujourd'hui.",
  occupancyTitle: "Taux d'occupation",
  occupancyDescription: "Etat des salles en temps reel",
  nextMeetingsTitle: "Prochains temps forts",
  nextMeetingsEmpty: "Aucune reservation a venir.",
  todayLabel: "Aujourd'hui",
  occupiedLabel: "Occupees",
  freeLabel: "Libres",
} as const;

function formatRange(start: Date, end: Date, zone: string) {
  const startLabel = formatInTimeZone(start, zone, "HH:mm");
  const endLabel = formatInTimeZone(end, zone, "HH:mm");
  return `${startLabel} - ${endLabel}`;
}

function formatHighlight(date: Date, zone: string) {
  return formatInTimeZone(date, zone, "EEEE d MMMM 'a' HH:mm", {
    locale: fr,
  });
}

function buildRoomMeta(room?: {
  building?: string | null;
  location?: string | null;
  category?: string | null;
  capacity?: number | null;
} | null) {
  if (!room) {
    return "";
  }

  const parts: string[] = [];
  if (room.building && room.building.trim().length > 0) {
    parts.push(room.building);
  }
  if (room.location && room.location.trim().length > 0) {
    parts.push(room.location);
  }
  if (room.category && room.category.trim().length > 0) {
    parts.push(room.category);
  }
  if (typeof room.capacity === "number") {
    parts.push(`${room.capacity} places`);
  }

  return parts.join(" \u00B7 ");
}

export default async function DashboardPage() {
  const zone = DEFAULT_TIME_ZONE;
  const now = new Date();
  const todayIso = formatInTimeZone(now, zone, "yyyy-MM-dd");
  const todayStart = combineDateAndTime(todayIso, "00:00", zone);
  const todayEnd = addDays(todayStart, 1);

  const [
    totalRooms,
    todaysReservations,
    occupiedRightNow,
    upcomingReservations,
  ] = await Promise.all([
    prisma.room.count(),
    prisma.reservation.findMany({
      where: {
        startTime: {
          gte: todayStart,
          lt: todayEnd,
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
      },
      orderBy: [{ startTime: "asc" }],
    }),
    prisma.reservation.findMany({
      where: {
        startTime: { lte: now },
        endTime: { gt: now },
      },
      select: {
        roomId: true,
      },
    }),
    prisma.reservation.findMany({
      where: {
        startTime: {
          gt: now,
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
      },
      orderBy: [{ startTime: "asc" }],
      take: 6,
    }),
  ]);

  const occupiedRoomIds = new Set(occupiedRightNow.map((item) => item.roomId));
  const occupiedRooms = occupiedRoomIds.size;
  const freeRooms = Math.max(totalRooms - occupiedRooms, 0);
  const occupancyRate =
    totalRooms > 0 ? Math.min((occupiedRooms / totalRooms) * 100, 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {uiStrings.headline}
        </h1>
        <p className="text-sm text-muted-foreground">{uiStrings.subheadline}</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>{uiStrings.dailyReservationsTitle}</CardTitle>
              <CardDescription>
                {uiStrings.todayLabel} {" \u00B7 "} {todaysReservations.length} reservation
                {todaysReservations.length > 1 ? "s" : ""}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {todaysReservations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {uiStrings.dailyReservationsEmpty}
              </p>
            ) : (
                            todaysReservations.map((reservation) => {
                const roomName = reservation.room?.name ?? reservation.roomId;
                const roomMeta = buildRoomMeta(reservation.room);
                const timeLabel = formatRange(
                  reservation.startTime,
                  reservation.endTime,
                  zone,
                );

                return (
                  <article
                    key={reservation.id}
                    className="flex items-start justify-between rounded-lg border bg-background/60 p-3 text-sm"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{reservation.title}</span>
                      <span className="text-muted-foreground">
                        {roomName}
                        {roomMeta && (
                          <>
                            {" \u00B7 "}
                            {roomMeta}
                          </>
                        )}
                        {" \u00B7 "}
                        {timeLabel}
                      </span>
                    </div>
                {uiStrings.todayLabel} {" \u00B7 "} {todaysReservations.length} reservation
                  </article>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{uiStrings.occupancyTitle}</CardTitle>
            <CardDescription>{uiStrings.occupancyDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">
                {uiStrings.occupiedLabel}
              </span>
              <span className="text-lg font-semibold">
                {occupiedRooms}/{totalRooms}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">
                {uiStrings.freeLabel}
              </span>
              <span className="text-lg font-semibold text-emerald-600">
                {freeRooms}/{totalRooms}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${occupancyRate}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 xl:col-span-3">
          <CardHeader>
            <CardTitle>{uiStrings.nextMeetingsTitle}</CardTitle>
            <CardDescription>Actions prioritaires a suivre</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {upcomingReservations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {uiStrings.nextMeetingsEmpty}
              </p>
            ) : (
              upcomingReservations.map((reservation) => {
                const roomName = reservation.room?.name ?? reservation.roomId;
                const roomMeta = buildRoomMeta(reservation.room);

                return (
                  <article
                    className="rounded-lg border bg-background/60 p-4 text-sm"
                    key={reservation.id}
                  >
                    <span className="text-muted-foreground">
                      {formatHighlight(reservation.startTime, zone)}
                    </span>
                    <p className="mt-1 font-medium text-foreground">
                      {reservation.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {roomName}
                    </p>
                    {roomMeta && (
                      <p className="text-xs text-muted-foreground">
                        {roomMeta}
                      </p>
                    )}
                  </article>
                );
              })
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}







