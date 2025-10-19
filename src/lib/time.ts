import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { differenceInMinutes, isAfter, isBefore } from "date-fns";

export const DEFAULT_TIME_ZONE =
  process.env.SCHOOL_TIMEZONE ?? "Africa/Abidjan";

export const OPENING_HOURS = {
  start: "07:00",
  end: "20:00",
} as const;

export const SLOT_DURATION_MINUTES = 30;

function resolveZone(zone?: string): string {
  return zone ?? DEFAULT_TIME_ZONE;
}

function formatReferenceDay(date: Date, zone: string) {
  return formatInTimeZone(date, zone, "yyyy-MM-dd");
}

function minutesFromMidnight(date: Date, zone: string) {
  const label = formatInTimeZone(date, zone, "HH:mm");
  const [hours, minutes] = label.split(":").map(Number);
  return hours * 60 + minutes;
}

export function parseTime(
  time: string,
  zone?: string,
  referenceDate: Date = new Date(),
): Date {
  const normalizedZone = resolveZone(zone);
  if (!/^\d{2}:\d{2}$/.test(time)) {
    throw new Error(`Heure invalide: ${time}`);
  }

  const [hours, minutes] = time.split(":").map(Number);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error(`Heure invalide: ${time}`);
  }

  const dayLabel = formatReferenceDay(referenceDate, normalizedZone);
  const isoLabel = `${dayLabel}T${time}:00`;
  return fromZonedTime(isoLabel, normalizedZone);
}

export function toHHmm(date: Date, zone?: string): string {
  const normalizedZone = resolveZone(zone);
  return formatInTimeZone(date, normalizedZone, "HH:mm");
}

export function clampToOpeningHours(date: Date, zone?: string): Date {
  const normalizedZone = resolveZone(zone);
  const openingStart = parseTime(
    OPENING_HOURS.start,
    normalizedZone,
    date,
  );
  const openingEnd = parseTime(OPENING_HOURS.end, normalizedZone, date);

  if (isBefore(date, openingStart)) {
    return openingStart;
  }

  if (isAfter(date, openingEnd)) {
    return openingEnd;
  }

  return date;
}

export function generateSlots(
  date: Date,
  stepMinutes: number = SLOT_DURATION_MINUTES,
  zone?: string,
): Array<{ start: Date; end: Date }> {
  const normalizedZone = resolveZone(zone);
  const slots: Array<{ start: Date; end: Date }> = [];

  const start = parseTime(OPENING_HOURS.start, normalizedZone, date);
  const end = parseTime(OPENING_HOURS.end, normalizedZone, date);
  const totalMinutes = differenceInMinutes(end, start);

  if (stepMinutes <= 0) {
    throw new Error("Le pas doit etre strictement positif.");
  }

  for (
    let offset = 0;
    offset < totalMinutes;
    offset += stepMinutes
  ) {
    const slotStart = new Date(start.getTime() + offset * 60 * 1000);
    const slotEnd = new Date(slotStart.getTime() + stepMinutes * 60 * 1000);
    if (slotEnd > end) {
      break;
    }
    slots.push({ start: slotStart, end: slotEnd });
  }

  return slots;
}

export function isWeekend(date: Date, zone?: string): boolean {
  const normalizedZone = resolveZone(zone);
  const day = parseInt(formatInTimeZone(date, normalizedZone, "i"), 10);
  return day === 6 || day === 7;
}

export function getTimeZoneOffsetLabel(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("fr-FR", {
    timeZone: DEFAULT_TIME_ZONE,
    timeZoneName: "shortOffset",
    hour: "2-digit",
    minute: "2-digit",
  });

  const offsetPart = formatter
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;

  return offsetPart ?? "UTC";
}

export function isWithinOpeningHours(date: Date, zone?: string): boolean {
  const normalizedZone = resolveZone(zone);
  const clamped = clampToOpeningHours(date, normalizedZone);
  const openingEnd = parseTime(OPENING_HOURS.end, normalizedZone, date);
  return (
    toHHmm(clamped, normalizedZone) === toHHmm(date, normalizedZone) &&
    !isAfter(date, openingEnd)
  );
}

export function isAlignedToStep(
  date: Date,
  stepMinutes: number,
  zone?: string,
): boolean {
  const normalizedZone = resolveZone(zone);
  const minutesValue = minutesFromMidnight(date, normalizedZone);
  return minutesValue % stepMinutes === 0;
}

export function combineDateAndTime(
  dateIso: string,
  time: string,
  zone?: string,
): Date {
  const normalizedZone = resolveZone(zone);
  return fromZonedTime(`${dateIso}T${time}:00`, normalizedZone);
}
