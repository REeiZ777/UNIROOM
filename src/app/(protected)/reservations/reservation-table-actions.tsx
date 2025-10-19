"use client";

import { Button } from "@/components/ui/button";
import type { ReservationEvent } from "@/components/reservations/week-grid";
import { useReservationInteractions } from "@/components/reservations/reservation-interactions";

type ReservationTableActionsProps = {
  reservation: ReservationEvent;
};

export function ReservationTableActions({
  reservation,
}: ReservationTableActionsProps) {
  const { editReservation, deleteReservation } = useReservationInteractions();

  return (
    <div className="flex justify-end gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => editReservation(reservation)}
      >
        Modifier
      </Button>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        onClick={() => deleteReservation(reservation)}
      >
        Supprimer
      </Button>
    </div>
  );
}
