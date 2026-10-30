export type SearchInput = {
  destination: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  adults: number; // min 1
  children: number; // min 0
  childAges: number[]; // length === children, each 0–17
};

export type Stay = {
  source: "booking" | "airbnb";
  name: string;
  totalPrice: number; // INR, incl. taxes & fees
  pricePerNight: number; // INR
  currency: "INR";
  rating: number; // /10, already converted
  reviewCount: number | null;
  url: string;
  feesMayBeExtra: boolean; // Airbnb only, else false
};

export type TraceEvent = {
  t: number; // ms since the run started
  agent: string; // "booking" | "airbnb" | "orchestrator"
  type: "agent_started" | "tool_called" | "tool_returned" | "agent_finished" | "warning" | "error";
  message: string;
};

export type SourceResult =
  | { source: "booking" | "airbnb"; status: "ok"; stays: Stay[]; ms: number }
  | { source: "booking" | "airbnb"; status: "failed"; error: string; ms: number };
