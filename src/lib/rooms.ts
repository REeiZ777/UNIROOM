const ROOM_ORDER_PATTERN =
  /^\s*(\d{1,3})\s*(?:[-–—]|(?:\s*-\s*)|(?:\s*[.:]\s*))/;

function resolveOrderPrefix(name: string): number | null {
  const match = ROOM_ORDER_PATTERN.exec(name);
  if (!match) {
    return null;
  }

  const parsed = Number.parseInt(match[1], 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function sortRoomsByDisplayOrder<T extends { name: string }>(
  rooms: readonly T[],
): T[] {
  return [...rooms].sort((a, b) => {
    const orderA = resolveOrderPrefix(a.name);
    const orderB = resolveOrderPrefix(b.name);

    if (orderA !== null && orderB !== null && orderA !== orderB) {
      return orderA - orderB;
    }

    if (orderA !== null && orderB === null) {
      return -1;
    }

    if (orderA === null && orderB !== null) {
      return 1;
    }

    return a.name.localeCompare(b.name, "fr", {
      numeric: true,
      sensitivity: "base",
    });
  });
}
