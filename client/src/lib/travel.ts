/*
 * Travel planner design philosophy: typed trip data stays calm and durable, with serializable
 * dates, locally stored cover images, and stable IDs ready for a future backend.
 */
export type TripStatus = "planning" | "idea" | "ready";

export type SavedPlace = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  providerId?: string;
  category?: string;
  photoUrl?: string;
};

export type Activity = {
  id: string;
  title: string;
  time?: string;
  location?: string;
  notes?: string;
};

export type ItineraryDay = {
  id: string;
  date: string;
  activities: Activity[];
};

export type Trip = {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  description?: string;
  coverImage?: string;
  status: TripStatus;
  pinnedPlaces: SavedPlace[];
  itinerary: ItineraryDay[];
};

export const TRIPS_STORAGE_KEY = "travel-planner:v2:trips";
export const PLACES_STORAGE_KEY = "travel-planner:v2:places";

export const tripDays = (startDate: string, endDate: string) => {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
};

export function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Keep the interaction usable when browser storage is unavailable.
  }
}

export function createTrip(destination: string, startDate: string, endDate: string, description = "", coverImage = ""): Trip {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${destination}`;
  const days = tripDays(startDate, endDate);
  const itinerary = Array.from({ length: days }, (_, index) => {
    const date = new Date(`${startDate}T00:00:00`);
    date.setDate(date.getDate() + index);
    return {
      id: `${id}-day-${index + 1}`,
      date: date.toISOString().slice(0, 10),
      activities: index === 0 ? [{ id: `${id}-activity-1`, title: "Arrival and settle in", time: "15:00", location: destination, notes: "" }] : [],
    } satisfies ItineraryDay;
  });

  return { id, destination, startDate, endDate, description, coverImage, status: "planning", pinnedPlaces: [], itinerary };
}

export const formatShortDate = (date: string) =>
  new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${date}T00:00:00`));

export function createShareUrl(trip: Trip) {
  const bytes = new TextEncoder().encode(JSON.stringify(trip));
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return `${window.location.origin}${window.location.pathname}#trip=${btoa(binary)}`;
}

export function readSharedTrip(hash: string): Trip | null {
  const encoded = new URLSearchParams(hash.replace(/^#/, "")).get("trip");
  if (!encoded) return null;
  try {
    const binary = atob(encoded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as Trip;
  } catch {
    return null;
  }
}
