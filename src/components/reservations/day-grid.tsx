"use client";

import { differenceInMinutes, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  OPENING_HOURS,
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
} from "@/lib/departments";
import type { ReservationEvent } from "./week-grid";

const zone = process.env.NEXT_PUBLIC_SCHOOL_TIMEZONE ?? process.env.SCHOOL_TIMEZONE ?? "Africa/Abidjan";

const HOUR_SLOT_MINUTES = 60;
const MIN_COLUMN_WIDTH = 120;
const LANE_HEIGHT = 48;
const MIN_TIMELINE_HEIGHT = 72;
const CARD_TOP_OFFSET = 6;
const CARD_MIN_HEIGHT = 32;
const FALLBACK_CARD_COLORS = OBJECTIVE_COLORS.other;

type RoomSummary = {
  id: string;
  name: string;
  building?: string | null;
  location?: string | null;
  capacity?: number | null;
};

type DayGridProps = {
  date: string;
  rooms: RoomSummary[];
  reservations: ReservationEvent[];
  selectedRoomIds: string[];
  colorMode: ColorMode;
  onSlotSelect?: (slot: {
    date: string;
    start: string;
    roomId: string;
    durationMinutes: number;
  }) => void;
  onReservationSelect?: (reservation: ReservationEvent) => void;
};

function formatRoomMeta(room: RoomSummary) {
  const parts: string[] = [];
  if (typeof room.capacity === "number") {
    parts.push(`${room.capacity} places`);
  }
  if (room.location && room.location.length > 0) {
    parts.push(room.location);
  }
  if (room.building && room.building.length > 0) {
    parts.push(room.building);
  }
  return parts.join(" - ");
}

function getDepartmentColors(departmentId: ReservationEvent["departmentId"]) {
  if (!departmentId) {
    return null;
  }
  const department = DEPARTMENTS[departmentId];
  return department?.colors ?? null;
}

export function DayGrid({
  date,
  rooms,
  reservations,
  selectedRoomIds,
  colorMode,
  onSlotSelect,
  onReservationSelect,
}: DayGridProps) {
  const dayStart = combineDateAndTime(date, OPENING_HOURS.start, zone);
  const dayEnd = combineDateAndTime(date, OPENING_HOURS.end, zone);
  const totalMinutes = Math.max(1, differenceInMinutes(dayEnd, dayStart));
  const hourSlots = generateSlots(dayStart, HOUR_SLOT_MINUTES, zone);
  const timelineMinWidth = Math.max(hourSlots.length * MIN_COLUMN_WIDTH, 480);

  const selectedSet = selectedRoomIds.length > 0 ? new Set(selectedRoomIds) : null;
  const filteredRooms = selectedSet
    ? rooms.filter((room) => selectedSet.has(room.id))
    : rooms;
  const displayRooms = filteredRooms.length > 0 ? filteredRooms : rooms;

  const reservationsForDay = reservations.filter((reservation) => {
    const startDate = parseISO(reservation.startTime);
    return formatInTimeZone(startDate, zone, "yyyy-MM-dd") === date;
  });
  const showObjectiveDetails = colorMode === "objective";

  if (displayRooms.length === 0) {
    return (
      <section className="rounded-xl border bg-card/50 p-6 text-center text-sm text-muted-foreground shadow-sm">
        Aucune salle disponible pour cette date.
      </section>
    );
  }

  return (
    <TooltipProvider>
      <section className="overflow-x-auto rounded-xl border bg-card/50 shadow-sm">
        <div className="grid" style={{ gridTemplateColumns: `260px minmax(${timelineMinWidth}px, 1fr)` }}>
          <div className="sticky left-0 z-30 border-b border-r bg-card">
            <div className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Salle
            </div>
          </div>
          <div className="relative border-b bg-card" style={{ minWidth: `${timelineMinWidth}px` }}>
            <div className="flex h-10 items-center">
              {hourSlots.map((slot) => (
                <div
                  key={`header-label-${slot.start.toISOString()}`}
                  className="flex-1 min-w-[120px] text-center text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  {formatInTimeZone(slot.start, zone, "HH'H'")}
                </div>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-0 flex">
              {hourSlots.map((slot, index) => (
                <div key={`header-grid-${slot.start.toISOString()}`} className="relative flex-1 min-w-[120px]">
                  <div className="absolute inset-y-0 left-0 border-l border-border/60" />
                  {index === hourSlots.length - 1 && (
                    <div className="absolute inset-y-0 right-0 border-l border-border/60" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {displayRooms.map((room) => {
            const roomReservations = reservationsForDay.filter(
              (reservation) => reservation.roomId === room.id,
            );
            const positionedReservations = assignReservationLanes(roomReservations);
            const laneCount = positionedReservations.reduce(
              (max, reservation) => Math.max(max, reservation.laneCount),
              1,
            );
            const timelineHeight = Math.max(
              MIN_TIMELINE_HEIGHT,
              laneCount * LANE_HEIGHT,
            );
            const metaLabel = formatRoomMeta(room);

            return (
              <div key={room.id} className="contents">
                <div
                  className="sticky left-0 z-20 border-b border-r bg-card"
                  style={{ minHeight: `${timelineHeight}px` }}
                >
                  <div className="flex h-full flex-col justify-center gap-1 px-4 py-3">
                    <span className="font-medium text-foreground">{room.name}</span>
                    {metaLabel && (
                      <span className="text-xs text-muted-foreground">{metaLabel}</span>
                    )}
                  </div>
                </div>

                <div
                  className="relative border-b py-3 overflow-hidden"
                  style={{
                    minWidth: `${timelineMinWidth}px`,
                    height: `${timelineHeight}px`,
                  }}
                >
                  <div className="absolute inset-0 pointer-events-none">
                    {hourSlots.map((slot) => {
                      const offsetMinutes = differenceInMinutes(slot.start, dayStart);
                      const leftPercent = (offsetMinutes / totalMinutes) * 100;
                      return (
                        <div
                          key={`${room.id}-${slot.start.toISOString()}-grid`}
                          className="absolute top-0 bottom-0 border-l border-border/70"
                          style={{ left: `${leftPercent}%` }}
                        />
                      );
                    })}
                    <div className="absolute inset-y-0 right-0 border-l border-border/70" />
                  </div>

                  {hourSlots.map((slot) => {
                    const slotStart = differenceInMinutes(slot.start, dayStart);
                    const slotDuration = Math.max(
                      1,
                      differenceInMinutes(slot.end, slot.start),
                    );
                    const leftPercent = (slotStart / totalMinutes) * 100;
                    const widthPercent = (slotDuration / totalMinutes) * 100;
                    const startLabel = toHHmm(slot.start, zone);

                    return (
                      <button
                        key={`${room.id}-${slot.start.toISOString()}-slot`}
                        type="button"
                        className="absolute top-0 bottom-0 z-0 text-left text-xs text-muted-foreground/60 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        style={{
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`,
                        }}
                        onClick={() =>
                          onSlotSelect?.({
                            date,
                            start: startLabel,
                            roomId: room.id,
                            durationMinutes: HOUR_SLOT_MINUTES,
                          })
                        }
                      >
                        <span className="sr-only">
                          {`Ouvrir le formulaire pour ${room.name} a ${startLabel}`}
                        </span>
                      </button>
                    );
                  })}

                  {positionedReservations.map((reservation) => {
                    const startDate = parseISO(reservation.startTime);
                    const endDate = parseISO(reservation.endTime);
                    const minutesStart = Math.max(
                      0,
                      differenceInMinutes(startDate, dayStart),
                    );
                    const minutesEnd = Math.min(
                      totalMinutes,
                      differenceInMinutes(endDate, dayStart),
                    );
                    const durationMinutes = Math.max(minutesEnd - minutesStart, 15);

                    if (durationMinutes <= 0) {
                      return null;
                    }

                    const leftPercent = (minutesStart / totalMinutes) * 100;
                    const widthPercent = Math.max(
                      (durationMinutes / totalMinutes) * 100,
                      2,
                    );
                    const top = reservation.lane * LANE_HEIGHT + CARD_TOP_OFFSET;
                    const height = Math.max(
                      LANE_HEIGHT - CARD_TOP_OFFSET * 2,
                      CARD_MIN_HEIGHT,
                    );

                    const {
                      displayTitle,
                      secondaryLabel,
                      departmentLabel,
                      participantLabel,
                      primaryLabel,
                      groupLabel,
                      showParticipantInTooltip,
                    } = getReservationLabelData(reservation, colorMode);
                    const objectiveKey = resolveObjectiveColorKey(reservation.objective);
                    const objectiveColors = OBJECTIVE_COLORS[objectiveKey];
                    const departmentColors = getDepartmentColors(reservation.departmentId);
                    const cardColors =
                      colorMode === "department"
                        ? departmentColors ?? FALLBACK_CARD_COLORS
                        : objectiveColors;
                    const timeLabel = `${toHHmm(startDate, zone)} - ${toHHmm(
                      endDate,
                      zone,
                    )}`;
                    const categoryLabel =
                      reservation.roomCategory && reservation.roomCategory.length > 0
                        ? reservation.roomCategory
                        : null;
                    const buildingLabel =
                      reservation.roomBuilding && reservation.roomBuilding.length > 0
                        ? reservation.roomBuilding
                        : null;
                    const locationLabel =
                      reservation.roomLocation && reservation.roomLocation.length > 0
                        ? reservation.roomLocation
                        : null;
                    const capacityLabel =
                      typeof reservation.roomCapacity === "number"
                        ? `${reservation.roomCapacity} places`
                        : null;

                    return (
                      <Tooltip key={reservation.id}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => onReservationSelect?.(reservation)}
                            className="absolute z-[5] flex h-full w-full items-center justify-between gap-2 rounded-xl border px-4 py-2 text-left text-sm font-semibold shadow-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring overflow-hidden"
                            style={{
                              top,
                              left: `${leftPercent}%`,
                              width: `${widthPercent}%`,
                              height,
                              backgroundColor: cardColors.background,
                              borderColor: "transparent",
                              color: cardColors.text,
                            }}
                          >
                            <span className="truncate">{groupLabel}</span>
                            <span className="flex-shrink-0 text-xs font-medium opacity-90">
                              {timeLabel}
                            </span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs">
                          <p className="font-semibold">{primaryLabel}</p>
                          {showObjectiveDetails && secondaryLabel && (
                            <p>{secondaryLabel}</p>
                          )}
                          {!showObjectiveDetails && departmentLabel && (
                            <p>{departmentLabel}</p>
                          )}
                          {showParticipantInTooltip && <p>{participantLabel}</p>}
                          {categoryLabel && (
                            <p className="capitalize">{categoryLabel}</p>
                          )}
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
              </div>
            );
          })}
        </div>
      </section>
    </TooltipProvider>
  );
}

