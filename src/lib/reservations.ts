import { parseISO } from "date-fns";

import { DEPARTMENTS, type ColorMode, type DepartmentId } from "./departments";

const PRIORITY_OBJECTIVES = new Set(["cours", "examen"]);

type TimedReservation = {
  startTime: string;
  endTime: string;
};

export type ReservationWithLayout<T extends TimedReservation> = T & {
  lane: number;
  laneCount: number;
};

type ReservationSummaryInput = {
  title: string;
  objective?: string | null;
  participantGroup?: string | null;
};

type ReservationLabelInput = {
  title: string;
  objective: string | null;
  participantGroup: string | null;
  departmentId: DepartmentId | null;
  departmentLabel: string | null;
};

export type ReservationLabelData = {
  displayTitle: string;
  secondaryLabel: string | null;
  departmentLabel: string | null;
  participantLabel: string | null;
  primaryLabel: string;
  groupLabel: string;
  showParticipantInTooltip: boolean;
};

export function getReservationDisplayTitle({
  title,
  objective,
  participantGroup,
}: ReservationSummaryInput): string {
  const trimmedObjective = objective?.trim();
  const trimmedGroup = participantGroup?.trim();
  const trimmedTitle = title.trim();

  if (
    trimmedObjective &&
    PRIORITY_OBJECTIVES.has(trimmedObjective.toLowerCase())
  ) {
    if (trimmedGroup && trimmedGroup.length > 0) {
      return `${trimmedObjective} - ${trimmedGroup}`;
    }
    return trimmedObjective;
  }

  if (trimmedTitle.length > 0) {
    return trimmedTitle;
  }

  if (trimmedObjective && trimmedObjective.length > 0) {
    return trimmedObjective;
  }

  return "Reservation";
}

export function getReservationSecondaryLabel({
  objective,
  participantGroup,
}: {
  objective?: string | null;
  participantGroup?: string | null;
}): string | null {
  const trimmedObjective = objective?.trim() ?? "";
  const trimmedGroup = participantGroup?.trim() ?? "";

  if (!trimmedObjective && !trimmedGroup) {
    return null;
  }

  if (trimmedObjective && trimmedGroup) {
    return `${trimmedObjective} - ${trimmedGroup}`;
  }

  return trimmedObjective || trimmedGroup || null;
}

export function getReservationLabelData(
  reservation: ReservationLabelInput,
  colorMode: ColorMode,
): ReservationLabelData {
  const displayTitle = getReservationDisplayTitle(reservation);
  const secondaryLabel = getReservationSecondaryLabel(reservation);
  const departmentLabel =
    reservation.departmentLabel ??
    (reservation.departmentId
      ? DEPARTMENTS[reservation.departmentId]?.label ?? null
      : null);
  const participantLabel =
    reservation.participantGroup &&
    reservation.participantGroup.trim().length > 0
      ? reservation.participantGroup.trim()
      : null;
  const primaryLabel =
    colorMode === "objective"
      ? displayTitle
      : departmentLabel ?? participantLabel ?? displayTitle;
  const groupLabel = participantLabel ?? displayTitle;
  const showParticipantInTooltip = Boolean(
    participantLabel &&
      (colorMode !== "department" ||
        !departmentLabel ||
        participantLabel.toLowerCase() !== departmentLabel.toLowerCase()),
  );

  return {
    displayTitle,
    secondaryLabel,
    departmentLabel,
    participantLabel,
    primaryLabel,
    groupLabel,
    showParticipantInTooltip,
  };
}

export function assignReservationLanes<
  T extends TimedReservation,
>(reservations: T[]): Array<ReservationWithLayout<T>> {
  const positioned = reservations.map((reservation) => ({
    ...reservation,
    lane: 0,
    laneCount: 1,
  })) as Array<ReservationWithLayout<T>>;

  const sorted = reservations
    .map((reservation, index) => ({ reservation, index }))
    .sort((a, b) =>
      a.reservation.startTime.localeCompare(b.reservation.startTime),
    );

  const active: Array<{ lane: number; end: Date; index: number }> = [];

  for (const { reservation, index } of sorted) {
    const startDate = parseISO(reservation.startTime);
    const endDate = parseISO(reservation.endTime);

    for (let i = active.length - 1; i >= 0; i -= 1) {
      if (active[i].end <= startDate) {
        active.splice(i, 1);
      }
    }

    let lane = 0;
    while (active.some((item) => item.lane === lane)) {
      lane += 1;
    }

    positioned[index] = { ...positioned[index], lane };
    active.push({ lane, end: endDate, index });

    const laneCount = active.length;
    for (const item of active) {
      if (positioned[item.index].laneCount < laneCount) {
        positioned[item.index] = {
          ...positioned[item.index],
          laneCount,
        };
      }
    }
  }

  return positioned;
}


