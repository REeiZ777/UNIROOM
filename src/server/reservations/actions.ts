"use server";

import { headers as nextHeaders } from "next/headers";
import type { Role } from "@prisma/client";

import { DEFAULT_TIME_ZONE, combineDateAndTime } from "@/lib/time";
import { getClientIpFromHeaders } from "@/lib/request-ip";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import {
  ReservationInput,
  ReservationInputSchema,
  ReservationPayload,
  sanitizeReservationInput,
} from "@/lib/validation";
import { getSession } from "@/server/auth/session";
import { prisma } from "@/server/db/client";
import { logger } from "@/server/logger";

import { hasOverlap } from "./conflict";

const messages = {
  invalidPayload: "Les donnees de reservation sont invalides.",
  conflict: "Ce creneau est deja reserve pour cette salle.",
  notFound: "Reservation introuvable.",
  forbidden: "Action non autorisee.",
  invalidSession: "Session invalide, veuillez vous reconnecter.",
} as const;

const RATE_LIMIT_MESSAGE =
  "Trop de requêtes ont été effectuées sur les réservations. Merci de patienter avant de réessayer.";
const RESERVATION_LIMIT = {
  limit: 30,
  windowMs: 60 * 1000,
} as const;

function extractFirstIssue(
  result: ReturnType<typeof ReservationInputSchema.safeParse>,
) {
  if (result.success) {
    return undefined;
  }
  return result.error.issues[0]?.message ?? messages.invalidPayload;
}

function buildStoredDates(data: ReservationPayload) {
  const zone = DEFAULT_TIME_ZONE;
  return {
    day: combineDateAndTime(data.date, "00:00", zone),
    startTime: combineDateAndTime(data.date, data.start, zone),
    endTime: combineDateAndTime(data.date, data.end, zone),
  };
}

async function getClientIp() {
  try {
    const headerSource = nextHeaders();
    const headerList = headerSource instanceof Promise ? await headerSource : headerSource;
    return getClientIpFromHeaders(headerList);
  } catch {
    return "0.0.0.0";
  }
}

function enforceReservationRateLimit(ipAddress: string, action: string) {
  try {
    enforceRateLimit(
      {
        key: `reservations:${ipAddress}`,
        limit: RESERVATION_LIMIT.limit,
        windowMs: RESERVATION_LIMIT.windowMs,
      },
      RATE_LIMIT_MESSAGE,
    );
  } catch (error) {
    if (error instanceof RateLimitError) {
      logger.warn(
        { ipAddress, action },
        "Limite de requêtes atteinte pour les réservations",
      );
    }
    throw error;
  }
}

type Actor = {
  id?: string;
  role?: Role;
};

async function resolveActor(explicitUserId?: string): Promise<Actor> {
  if (explicitUserId) {
    return { id: explicitUserId };
  }

  try {
    const session = await getSession();
    return {
      id: session?.user?.id,
      role: session?.user?.role,
    };
  } catch {
    return {};
  }
}

function canManageReservation(ownerId: string, actor: Actor): boolean {
  if (!actor.id) {
    return false;
  }

  if (actor.id === ownerId) {
    return true;
  }

  return actor.role === "ADMIN";
}

export async function createReservation(
  input: ReservationInput & { userId?: string },
) {
  const ipAddress = await getClientIp();
  enforceReservationRateLimit(ipAddress, "reservations.create");

  const { userId, ...reservation } = input;
  const parsed = ReservationInputSchema.safeParse(reservation);

  if (!parsed.success) {
    throw new Error(extractFirstIssue(parsed) ?? messages.invalidPayload);
  }

  const sanitized = sanitizeReservationInput(parsed.data);

  const actor = await resolveActor(userId);
  if (!actor.id) {
    throw new Error(messages.invalidSession);
  }
  const authorId = actor.id as string;

  return prisma.$transaction(async (tx) => {
    const overlap = await hasOverlap(sanitized, tx);
    if (overlap) {
      throw new Error(messages.conflict);
    }

    const { day, startTime, endTime } = buildStoredDates(sanitized);

    const created = await tx.reservation.create({
      data: {
        roomId: sanitized.roomId,
        userId: authorId,
        date: day,
        startTime,
        endTime,
        title: sanitized.title,
        objective: sanitized.objective,
        participantGroup: sanitized.participantGroup,
        note: sanitized.note ?? null,
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
    });
    logger.info(
      {
        action: "reservations.create",
        reservationId: created.id,
        userId: authorId,
        ipAddress,
      },
      "Réservation créée",
    );
    return created;
  });
}

export async function updateReservation(
  id: string,
  input: ReservationInput,
) {
  const ipAddress = await getClientIp();
  enforceReservationRateLimit(ipAddress, "reservations.update");

  const parsed = ReservationInputSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error(extractFirstIssue(parsed) ?? messages.invalidPayload);
  }

  const sanitized = sanitizeReservationInput(parsed.data);

  const actor = await resolveActor();
  if (!actor.id) {
    throw new Error(messages.invalidSession);
  }
  const authorId = actor.id as string;

  return prisma.$transaction(async (tx) => {
    const existing = await tx.reservation.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!existing) {
      throw new Error(messages.notFound);
    }

    if (!canManageReservation(existing.userId, actor)) {
      throw new Error(messages.forbidden);
    }

    const overlap = await hasOverlap(
      { ...sanitized, excludeId: id },
      tx,
    );
    if (overlap) {
      throw new Error(messages.conflict);
    }

    const { day, startTime, endTime } = buildStoredDates(sanitized);

    const updated = await tx.reservation.update({
      where: { id },
      data: {
        roomId: sanitized.roomId,
        date: day,
        startTime,
        endTime,
        title: sanitized.title,
        objective: sanitized.objective,
        participantGroup: sanitized.participantGroup,
        note: sanitized.note ?? null,
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
    });
    logger.info(
      {
        action: "reservations.update",
        reservationId: updated.id,
        userId: authorId,
        ipAddress,
      },
      "Réservation mise à jour",
    );
    return updated;
  });
}

export async function deleteReservation(id: string) {
  const ipAddress = await getClientIp();
  enforceReservationRateLimit(ipAddress, "reservations.delete");

  const actor = await resolveActor();
  if (!actor.id) {
    throw new Error(messages.invalidSession);
  }
  const authorId = actor.id as string;

  return prisma.$transaction(async (tx) => {
    const existing = await tx.reservation.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!existing) {
      throw new Error(messages.notFound);
    }

    if (!canManageReservation(existing.userId, actor)) {
      throw new Error(messages.forbidden);
    }

    const removed = await tx.reservation.delete({
      where: { id },
      select: { id: true },
    });

    logger.info(
      {
        action: "reservations.delete",
        reservationId: removed.id,
        userId: authorId,
        ipAddress,
      },
      "Réservation supprimée",
    );

    return removed;
  });
}



