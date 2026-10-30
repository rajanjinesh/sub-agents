export type Source = "booking" | "airbnb";

export const SOURCES: Source[] = ["booking", "airbnb"];

/** Display names used in the UI copy. */
export const SOURCE_LABEL: Record<Source, string> = { booking: "Booking.com", airbnb: "Airbnb" };
