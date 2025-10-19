import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { PrismaClient, Role } from "@prisma/client";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL;

if (DATABASE_URL?.startsWith("file:./")) {
  const relativePath = DATABASE_URL.replace(/^file:/, "");
  const absolutePath = path.resolve(__dirname, "..", relativePath);
  process.env.DATABASE_URL = pathToFileURL(absolutePath).href;
}

const prisma = new PrismaClient();

const DEFAULT_TIME_ZONE = process.env.SCHOOL_TIMEZONE ?? "Africa/Abidjan";
const DEFAULT_ADMIN_PASSWORD = "Admin#12345";

type BaseRoomSeed = {
  name: string;
  building: string;
  capacity: number;
  location: string | null;
};

type RoomDefinition = BaseRoomSeed & {
  legacyNames?: string[];
};

const ROOM_DEFINITIONS: RoomDefinition[] = [
  {
    name: "Amphith\u00E9\u00E2tre",
    building: "Amphith\u00E9\u00E2tre",
    capacity: 150,
    location: null,
    legacyNames: ["Amphitheatre"],
  },
  {
    name: "Salle 1 ex-secretariat",
    building: "B\u00E2timent B",
    capacity: 20,
    location: null,
    legacyNames: ["Salle 1 (ex-secretariat)"],
  },
  {
    name: "Salle 2 ex-comptabilit\u00E9",
    building: "B\u00E2timent B",
    capacity: 20,
    location: null,
    legacyNames: ["Salle 2 (ex-comptabilite)"],
  },
  {
    name: "Salle rez-de-chauss\u00E9e",
    building: "B\u00E2timent C",
    capacity: 60,
    location: "rez-de-chauss\u00E9e",
    legacyNames: ["Salle rez-de-chaussee"],
  },
  {
    name: "Ex-salle des prof",
    building: "B\u00E2timent C",
    capacity: 20,
    location: null,
    legacyNames: ["Salle ex-prof"],
  },
  {
    name: "Salle 1 1er \u00E9tage",
    building: "B\u00E2timent C",
    capacity: 60,
    location: "1er \u00E9tage",
    legacyNames: ["Salle 1 - 1er etage"],
  },
  {
    name: "Salle 2 1er \u00E9tage",
    building: "B\u00E2timent C",
    capacity: 60,
    location: "1er \u00E9tage",
    legacyNames: ["Salle 2 - 1er etage"],
  },
  {
    name: "Salle 1 2e \u00E9tage",
    building: "B\u00E2timent C",
    capacity: 30,
    location: "2e \u00E9tage",
    legacyNames: ["Salle 1 - 2e etage"],
  },
  {
    name: "Salle de R\u00E9union",
    building: "B\u00E2timent C",
    capacity: 20,
    location: null,
    legacyNames: ["Salle de reunion"],
  },
  {
    name: "Salle 2 2e \u00E9tage",
    building: "B\u00E2timent C",
    capacity: 30,
    location: "2e \u00E9tage",
    legacyNames: ["Salle 2 - 2e etage"],
  },
  {
    name: "Salle 1 3e \u00E9tage",
    building: "B\u00E2timent C",
    capacity: 20,
    location: "3e \u00E9tage",
    legacyNames: ["Salle 1 - 3e etage"],
  },
  {
    name: "Salle 2 3e \u00E9tage",
    building: "B\u00E2timent C",
    capacity: 20,
    location: "3e \u00E9tage",
    legacyNames: ["Salle 2 - 3e etage (bureau MBA)", "Salle 2 - 3e etage"],
  },
];

function deriveRoomCategory({ name, building, capacity }: BaseRoomSeed): string {
  const normalizedName = name.trim().toLowerCase();
  if (normalizedName === "amphith\u00E9\u00E2tre") {
    return "amphith\u00E9\u00E2tre";
  }

  if (building === "B\u00E2timent B") {
    return "petite salle";
  }

  if (building === "B\u00E2timent C") {
    if (capacity >= 60) {
      return "grande salle";
    }
    if (capacity === 30) {
      return "salle moyenne";
    }
    return "petite salle";
  }

  return "petite salle";
}

async function upsertRooms() {
  const roomSeeds = ROOM_DEFINITIONS.map((room) => ({
    ...room,
    category: deriveRoomCategory(room),
  }));

  const rooms = await Promise.all(
    roomSeeds.map(async (room) => {
      const { legacyNames = [], category, ...seed } = room;
      const existing = await prisma.room.findFirst({
        where: {
          name: {
            in: [seed.name, ...legacyNames],
          },
        },
        select: { id: true },
      });

      const data = {
        name: seed.name,
        capacity: seed.capacity,
        location: seed.location,
        building: seed.building,
        category,
      };

      if (existing) {
        return prisma.room.update({
          where: { id: existing.id },
          data,
        });
      }

      return prisma.room.create({ data });
    }),
  );

  await prisma.room.deleteMany({
    where: {
      id: {
        notIn: rooms.map((room) => room.id),
      },
    },
  });

  return rooms.reduce<Record<string, string>>((accumulator, room) => {
    accumulator[room.name] = room.id;
    return accumulator;
  }, {});
}

async function upsertAdmins(hashedPassword: string) {
  const admins = [
    {
      email: "directeur@uniroom.school",
      name: "Directeur UNIROOM",
    },
    {
      email: "cpe@uniroom.school",
      name: "Conseiller Principal d\u0027Education",
    },
    {
      email: "secretaire@uniroom.school",
      name: "Secr\u00E9taire UNIROOM",
    },
  ] as const;

  const users = await Promise.all(
    admins.map(({ email, name }) =>
      prisma.user.upsert({
        where: { email },
        update: {
          name,
          role: Role.ADMIN,
        },
        create: {
          email,
          name,
          role: Role.ADMIN,
          passwordHash: hashedPassword,
        },
      }),
    ),
  );

  return users.reduce<Record<string, string>>((accumulator, user) => {
    accumulator[user.email] = user.id;
    return accumulator;
  }, {});
}

function buildTodaySlots() {
  const todayLabel = formatInTimeZone(
    new Date(),
    DEFAULT_TIME_ZONE,
    "yyyy-MM-dd",
  );

  const toUtc = (time: string) =>
    fromZonedTime(`${todayLabel}T${time}:00`, DEFAULT_TIME_ZONE);

  return {
    reservationDate: fromZonedTime(`${todayLabel}T00:00:00`, DEFAULT_TIME_ZONE),
    slots: [
      { start: toUtc("09:00"), end: toUtc("10:00") },
      { start: toUtc("14:00"), end: toUtc("15:30") },
    ],
  };
}

async function upsertDemoReservations(
  roomIds: Record<string, string>,
  userIds: Record<string, string>,
) {
  const { reservationDate, slots } = buildTodaySlots();

  const reservations = [
    {
      title: "R\u00E9union p\u00E9dagogique",
      objective: "Reunion",
      participantGroup: "Equipe pedagogique",
      note: "Pr\u00E9paration des emplois du temps.",
      roomId: roomIds["Salle de R\u00E9union"],
      userId: userIds["directeur@uniroom.school"],
      ...slots[0],
    },
    {
      title: "Accueil des \u00E9tudiants",
      objective: "Reunion",
      participantGroup: "Conseil de vie scolaire",
      note: "Brief quotidien avec le CPE.",
      roomId: roomIds["Amphith\u00E9\u00E2tre"],
      userId: userIds["cpe@uniroom.school"],
      ...slots[1],
    },
  ];

  await Promise.all(
    reservations.map(({ title, note, objective, participantGroup, roomId, userId, start, end }) => {
      if (!roomId || !userId) {
        throw new Error(
          `Impossible de cr\u00E9er la r\u00E9servation "${title}" : chambre ou utilisateur introuvable.`,
        );
      }

      return prisma.reservation.upsert({
        where: {
          roomId_date_startTime_endTime_title: {
            roomId,
            date: reservationDate,
            startTime: start,
            endTime: end,
            title,
          },
        },
        update: {
          note,
          userId,
          objective,
          participantGroup,
        },
        create: {
          title,
          note,
          objective,
          participantGroup,
          date: reservationDate,
          startTime: start,
          endTime: end,
          roomId,
          userId,
        },
      });
    }),
  );
}

type HashPasswordFn = (
  plainText: string,
  saltRounds?: number,
) => Promise<string>;

async function resolveHashPassword(): Promise<HashPasswordFn> {
  const modulePath = pathToFileURL(
    path.resolve(__dirname, "../src/server/security/password.ts"),
  ).href;

  const passwordModule = await import(modulePath);
  return passwordModule.hashPassword as HashPasswordFn;
}

async function main() {
  const hashPassword = await resolveHashPassword();
  const hashedPassword = await hashPassword(DEFAULT_ADMIN_PASSWORD);
  const roomIds = await upsertRooms();
  const userIds = await upsertAdmins(hashedPassword);
  await upsertDemoReservations(roomIds, userIds);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Erreur lors du seed Prisma :", error);
    await prisma.$disconnect();
    process.exit(1);
  });
