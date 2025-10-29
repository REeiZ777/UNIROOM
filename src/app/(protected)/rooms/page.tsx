import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { sortRoomsByDisplayOrder } from "@/lib/rooms";
import { prisma } from "@/server/db/client";

const uiStrings = {
  headline: "Salles",
  subheadline:
    "Consultez l'etat de disponibilite des salles et accedez a leur planning detaille.",
  capacityLabel: "Capacite",
  locationLabel: "Localisation",
  buildingLabel: "Batiment",
  categoryLabel: "Categorie",
  unknown: "Non renseignee",
  available: "Libre maintenant",
  occupied: "Occupee maintenant",
  viewDetails: "Voir le planning",
} as const;

export default async function RoomsPage() {
  const now = new Date();
  const [roomsRaw, activeReservations] = await Promise.all([
    prisma.room.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        capacity: true,
        location: true,
        building: true,
        category: true,
      },
    }),
    prisma.reservation.findMany({
      where: {
        startTime: { lte: now },
        endTime: { gt: now },
      },
      select: { roomId: true },
    }),
  ]);

  const rooms = sortRoomsByDisplayOrder(roomsRaw);

  const occupiedRoomIds = new Set(
    activeReservations.map((reservation) => reservation.roomId),
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {uiStrings.headline}
        </h1>
        <p className="text-sm text-muted-foreground">{uiStrings.subheadline}</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rooms.map((room) => {
          const isOccupied = occupiedRoomIds.has(room.id);
          const badgeLabel = isOccupied
            ? uiStrings.occupied
            : uiStrings.available;
          const buildingLabel = room.building ?? uiStrings.unknown;
          const locationLabel = room.location ?? uiStrings.unknown;
          const categoryLabel =
            room.category && room.category.length > 0
              ? room.category
              : uiStrings.unknown;

          return (
            <Link
              key={room.id}
              href={`/rooms/${room.id}`}
              className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="transition hover:-translate-y-0.5 hover:shadow-lg">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle>{room.name}</CardTitle>
                    <CardDescription>
                      {buildingLabel}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={isOccupied ? "destructive" : "secondary"}
                    aria-label={`Statut de la salle ${room.name} : ${badgeLabel}`}
                  >
                    {badgeLabel}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>{uiStrings.capacityLabel}</span>
                    <span className="font-medium text-foreground">
                      {room.capacity ?? uiStrings.unknown}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>{uiStrings.locationLabel}</span>
                    <span className="font-medium text-foreground">
                      {locationLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>{uiStrings.categoryLabel}</span>
                    <span className="font-medium text-foreground">
                      {categoryLabel}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground transition group-hover:text-foreground">
                    {uiStrings.viewDetails}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
