"use client";

import { createContext, useContext } from "react";

import type { ReservationEvent } from "@/components/reservations/week-grid";

type ReservationInteractionsContextValue = {
  viewReservation: (reservation: ReservationEvent) => void;
  editReservation: (reservation: ReservationEvent) => void;
  deleteReservation: (reservation: ReservationEvent) => void;
};

const ReservationInteractionsContext =
  createContext<ReservationInteractionsContextValue>({
    viewReservation: () => {},
    editReservation: () => {},
    deleteReservation: () => {},
  });

export function ReservationInteractionsProvider({
  value,
  children,
}: {
  value: ReservationInteractionsContextValue;
  children: React.ReactNode;
}) {
  return (
    <ReservationInteractionsContext.Provider value={value}>
      {children}
    </ReservationInteractionsContext.Provider>
  );
}

export function useReservationInteractions() {
  const context = useContext(ReservationInteractionsContext);
  if (!context) {
    throw new Error(
      "useReservationInteractions doit etre utilise dans le ReservationInteractionsProvider",
    );
  }
  return context;
}
