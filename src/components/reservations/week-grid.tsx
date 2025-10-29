"use client";

import { addDays, format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  OPENING_HOURS,
  SLOT_DURATION_MINUTES,
  combineDateAndTime,
  generateSlots,
  toHHmm,
} from "@/lib/time";
import {
  assignReservationLanes,
  getReservationLabelData,
} from "@/lib/reservations";
import {
  DEPARTMENTS,
  OBJECTIVE_COLORS,
  resolveObjectiveColorKey,
  type ColorMode,
  type DepartmentId,
} from "@/lib/departments";

const zone = process.env.NEXT_PUBLIC_SCHOOL_TIMEZONE ?? process.env.SCHOOL_TIMEZONE ?? "Africa/Abidjan";

const START_MINUTES = 8 * 60;
const END_MINUTES = 20 * 60;
const TOTAL_MINUTES = END_MINUTES - START_MINUTES;
const ROW_HEIGHT = 38;
const FALLBACK_CARD_COLORS = OBJECTIVE_COLORS.other;

export type ReservationEvent = {
  id: string;
  roomId: string;
  roomName: string;
  roomBuilding: string | null;
  roomCategory: string | null;
  roomLocation: string | null;
  roomCapacity: number | null;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  objective: string | null;
  participantGroup: string | null;
  note: string | null;
  createdBy: string;
  departmentId: DepartmentId | null;
  departmentLabel: string | null;
};

type SlotSelection = {
  date: string;
  start: string;
};

type WeekGridProps = {
  weekStart: string;
  reservations: ReservationEvent[];
  roomId: string;
  colorMode: ColorMode;
  onSlotSelect?: (slot: SlotSelection) => void;
  onReservationSelect?: (reservation: ReservationEvent) => void;
  onNavigate?: (direction: number) => void;
};

function buildWeekDays(startIso: string) {
  const startDate = parseISO(startIso);
  return Array.from({ length: 7 }, (_, index) => addDays(startDate, index));
}

function minutesSinceOpening(date: Date) {
  const hours = parseInt(formatInTimeZone(date, zone, "HH"), 10);
  const minutes = parseInt(formatInTimeZone(date, zone, "mm"), 10);
  return hours * 60 + minutes - START_MINUTES;
}

function getDepartmentColors(departmentId: DepartmentId | null) {
  if (!departmentId) {
    return null;
  }
  const department = DEPARTMENTS[departmentId];
  return department?.colors ?? null;
}

export function WeekGrid({
  weekStart,
  reservations,
  roomId,
  colorMode,
  onSlotSelect,
  onReservationSelect,
  onNavigate,
}: WeekGridProps) {
  const days = buildWeekDays(weekStart);
  const totalRows = TOTAL_MINUTES / SLOT_DURATION_MINUTES;
  const containerHeight = totalRows * ROW_HEIGHT;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onNavigate?.(-1)}
        >
          Semaine precedente
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onNavigate?.(1)}
        >
          Semaine suivante
        </Button>
      </div>

      <TooltipProvider>
        <div className="overflow-x-auto rounded-xl border bg-card/50 p-3 shadow-sm sm:p-4">
          <div className="grid min-w-full grid-cols-[64px_repeat(7,minmax(0,1fr))] gap-2 md:min-w-[640px]">
            <div className="relative" style={{ height: containerHeight }}>
            {generateSlots(combineDateAndTime(weekStart, OPENING_HOURS.start, zone)).map(
              (slot, index) => {
                const startLabel = toHHmm(slot.start, zone);
                const isHour = startLabel.endsWith(":00");
                return (
                  <div
                    key={`label-${startLabel}`}
                    className="absolute left-0 right-0"
                    style={{ top: index * ROW_HEIGHT, height: ROW_HEIGHT }}
                  >
                    {isHour && (
                      <span className="text-xs text-muted-foreground">
                        {startLabel}
                      </span>
                    )}
                  </div>
                );
              },
            )}
            </div>

            {days.map((day) => {
            const dayIso = format(day, "yyyy-MM-dd");
            const dayLabel = format(day, "EEE d", { locale: fr });
            const slots = generateSlots(combineDateAndTime(dayIso, OPENING_HOURS.start, zone));

            const dayReservations = reservations
              .filter((reservation) => {
                const startDate = parseISO(reservation.startTime);
                return formatInTimeZone(startDate, zone, "yyyy-MM-dd") === dayIso;
              })
              .filter(
                (reservation) => roomId === "all" || reservation.roomId === roomId,
              );
            const positionedDayReservations =
              assignReservationLanes(dayReservations);

            return (
              <div
                key={dayIso}
                className="relative rounded-md border bg-background"
                style={{ height: containerHeight }}
              >
                <div className="sticky top-0 z-10 border-b bg-background/80 px-2 py-1 text-sm font-medium backdrop-blur-sm">
                  {dayLabel}
                </div>

                {slots.map((slot, index) => {
                  const startLabel = toHHmm(slot.start, zone);
                  return (
                    <button
                      key={`${dayIso}-${startLabel}`}
                      type="button"
                      className="absolute left-0 right-0 border-b border-dashed border-muted-foreground/20 text-left text-xs text-muted-foreground/70 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      style={{
                        top: index * ROW_HEIGHT,
                        height: ROW_HEIGHT,
                      }}
                      onClick={() =>
                        onSlotSelect?.({
                          date: dayIso,
                          start: startLabel,
                        })
                      }
                    >
                      <span className="sr-only">{`Ouvrir le formulaire pour le ${dayLabel} a ${startLabel}`}</span>
                    </button>
                  );
                })}

                {positionedDayReservations.map((reservation) => {
                  const startDate = parseISO(reservation.startTime);
                  const endDate = parseISO(reservation.endTime);
                  const minutesStart = minutesSinceOpening(startDate);
                  const minutesEnd = minutesSinceOpening(endDate);
                  const durationMinutes = minutesEnd - minutesStart;
                  const top = (minutesStart / SLOT_DURATION_MINUTES) * ROW_HEIGHT;
                  const height = Math.max(
                    (durationMinutes / SLOT_DURATION_MINUTES) * ROW_HEIGHT,
                    ROW_HEIGHT / 2,
                  );

                  const timeLabel = `${toHHmm(startDate, zone)} - ${toHHmm(
                    endDate,
                    zone,
                  )}`;
                  const {
                    secondaryLabel,
                    departmentLabel,
                    participantLabel,
                    primaryLabel,
                    groupLabel,
                    showParticipantInTooltip,
                  } = getReservationLabelData(reservation, colorMode);
                  const widthPercent = 100 / reservation.laneCount;
                  const leftPercent = widthPercent * reservation.lane;
                  const buildingLabel =
                    reservation.roomBuilding && reservation.roomBuilding.length > 0
                      ? reservation.roomBuilding
                      : null;
                  const categoryLabel =
                    reservation.roomCategory && reservation.roomCategory.length > 0
                      ? reservation.roomCategory
                      : null;
                  const locationLabel =
                    reservation.roomLocation && reservation.roomLocation.length > 0
                      ? reservation.roomLocation
                      : null;
                  const capacityLabel =
                    typeof reservation.roomCapacity === "number"
                      ? `${reservation.roomCapacity} places`
                      : null;
                  const objectiveKey = resolveObjectiveColorKey(
                    reservation.objective,
                  );
                  const objectiveColors = OBJECTIVE_COLORS[objectiveKey];
                  const departmentColors = getDepartmentColors(
                    reservation.departmentId,
                  );
                  const cardColors =
                    colorMode === "department"
                      ? departmentColors ?? FALLBACK_CARD_COLORS
                      : objectiveColors;
                  return (
                    <Tooltip key={reservation.id}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => onReservationSelect?.(reservation)}
                          className="absolute flex h-full w-full flex-col items-start justify-center gap-1 rounded-md border px-3 py-1.5 text-left text-xs font-medium shadow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          style={{
                            top,
                            height,
                            left: `calc(${leftPercent}% + 0.25rem)`,
                            width: `calc(${widthPercent}% - 0.5rem)`,
                            backgroundColor: cardColors.background,
                            borderColor: "transparent",
                            color: cardColors.text,
                          }}
                        >
                          <span className="w-full truncate text-sm font-semibold leading-tight">
                            {groupLabel}
                          </span>
                          <span className="w-full text-xs font-normal leading-tight opacity-90">
                            {timeLabel}
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        <p className="font-semibold">{primaryLabel}</p>
                        {colorMode === "objective" && secondaryLabel && (
                          <p>{secondaryLabel}</p>
                        )}
                        {colorMode === "department" && departmentLabel && (
                          <p>{departmentLabel}</p>
                        )}
                        {showParticipantInTooltip && <p>{participantLabel}</p>}
                        {categoryLabel && <p className="capitalize">{categoryLabel}</p>}
                        {buildingLabel && <p>{buildingLabel}</p>}
                        {locationLabel && <p>{locationLabel}</p>}
                        <p>{reservation.roomName}</p>
                        {capacityLabel && <p>{capacityLabel}</p>}
                        <p>{timeLabel}</p>
                        {reservation.note && (
                          <p className="mt-1 text-muted-foreground">
                            {reservation.note}
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            );
            })}
          </div>
        </div>
      </TooltipProvider>
    </div>
  );
}


