import { isAfter, isBefore } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { z } from "zod";

import {
  DEFAULT_TIME_ZONE,
  OPENING_HOURS,
  SLOT_DURATION_MINUTES,
  combineDateAndTime,
  isAlignedToStep,
  isWeekend,
} from "@/lib/time";

const HHMM_REGEX = /^\d{2}:\d{2}$/;

const messages = {
  invalidRoom: "Salle requise.",
  invalidDate: "Date invalide.",
  invalidTime: "Heure invalide (format HH:mm).",
  invalidOrder: "L'heure de fin doit etre posterieure a l'heure de debut.",
  weekendNotAllowed: "Les reservations ne sont pas autorisees le week-end.",
  outsideOpeningHours:
    "Les horaires doivent se situer entre 07:00 et 20:00.",
  misalignedSlot: "Les horaires doivent etre multiples de 30 minutes.",
  invalidObjective: "L'objectif est requis.",
  invalidGroup: "Le groupe est requis.",
} as const;

const TitleSchema = z
  .string()
  .trim()
  .min(1, "Le titre est requis.")
  .max(80, "Le titre ne peut depasser 80 caracteres.");

const NoteSchema = z
  .string()
  .trim()
  .max(280, "La note ne peut depasser 280 caracteres.")
  .optional();

const ObjectiveSchema = z
  .string()
  .trim()
  .min(1, messages.invalidObjective)
  .max(80, "L'objectif ne peut depasser 80 caracteres.");

const GroupSchema = z
  .string()
  .trim()
  .min(1, messages.invalidGroup)
  .max(80, "Le groupe ne peut depasser 80 caracteres.");

export const ReservationInputSchema = z
  .object({
    roomId: z.string().trim().min(1, messages.invalidRoom),
    date: z
      .string()
      .trim()
      .refine(
        (value) => !Number.isNaN(Date.parse(value)),
        messages.invalidDate,
      ),
    start: z.string().trim().regex(HHMM_REGEX, messages.invalidTime),
    end: z.string().trim().regex(HHMM_REGEX, messages.invalidTime),
    objective: ObjectiveSchema,
    participantGroup: GroupSchema,
    title: TitleSchema,
    note: NoteSchema,
  })
  .superRefine((data, ctx) => {
    const zone = DEFAULT_TIME_ZONE;
    const referenceDate = new Date(data.date);

    if (Number.isNaN(referenceDate.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: messages.invalidDate,
        path: ["date"],
      });
      return;
    }

    let startDate: Date;
    let endDate: Date;

    try {
      startDate = combineDateAndTime(data.date, data.start, zone);
      endDate = combineDateAndTime(data.date, data.end, zone);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: messages.invalidTime,
        path: ["start"],
      });
      return;
    }

    if (!isBefore(startDate, endDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: messages.invalidOrder,
        path: ["end"],
      });
    }

    const todayIso = formatInTimeZone(new Date(), zone, "yyyy-MM-dd");
    const startIso = formatInTimeZone(startDate, zone, "yyyy-MM-dd");
    const isToday = startIso === todayIso;

    if (isWeekend(startDate, zone) && !isToday) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: messages.weekendNotAllowed,
        path: ["date"],
      });
    }

    const openingStart = combineDateAndTime(
      data.date,
      OPENING_HOURS.start,
      zone,
    );
    const openingEnd = combineDateAndTime(
      data.date,
      OPENING_HOURS.end,
      zone,
    );

    if (isBefore(startDate, openingStart) || isAfter(startDate, openingEnd)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: messages.outsideOpeningHours,
        path: ["start"],
      });
    }

    if (isBefore(endDate, openingStart) || isAfter(endDate, openingEnd)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: messages.outsideOpeningHours,
        path: ["end"],
      });
    }

    if (!isAlignedToStep(startDate, SLOT_DURATION_MINUTES, zone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: messages.misalignedSlot,
        path: ["start"],
      });
    }

    if (!isAlignedToStep(endDate, SLOT_DURATION_MINUTES, zone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: messages.misalignedSlot,
        path: ["end"],
      });
    }
  });

export type ReservationInput = z.infer<typeof ReservationInputSchema>;

function sanitizeText(value: string) {
  return value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

export function sanitizeReservationInput(
  input: ReservationInput,
): ReservationInput {
  const title = sanitizeText(input.title);
  if (!title.length) {
    throw new Error("Le titre ne peut pas Ãªtre vide.");
  }

  let note: string | undefined;
  if (typeof input.note === "string") {
    const sanitizedNote = sanitizeText(input.note);
    if (sanitizedNote.length > 0) {
      note = sanitizedNote;
    } else {
      note = undefined;
    }
  }

  const objective = sanitizeText(input.objective);
  if (!objective.length) {
    throw new Error(messages.invalidObjective);
  }

  const participantGroup = sanitizeText(input.participantGroup);
  if (!participantGroup.length) {
    throw new Error(messages.invalidGroup);
  }

  return {
    ...input,
    title,
    objective,
    participantGroup,
    note,
  };
}
