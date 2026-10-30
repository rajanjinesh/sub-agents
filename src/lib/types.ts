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
  at: number; // epoch ms, used to merge traces from different agents in time order
  agent: string; // "booking" | "airbnb" | "orchestrator"
  type: "agent_started" | "tool_called" | "tool_returned" | "agent_finished" | "warning" | "error";
  message: string;
};

export type SourceResult =
  | { source: "booking" | "airbnb"; status: "ok"; stays: Stay[]; ms: number }
  | { source: "booking" | "airbnb"; status: "failed"; error: string; ms: number };

export type SearchResult = {
  stays: Stay[]; // ranked, max 6
  bestPickReason: string | null;
  sources: SourceResult[];
  trace: TraceEvent[]; // for learning/debugging
};

export type SseEvent =
  | { type: "source_started"; source: "booking" | "airbnb" }
  | { type: "source_done"; source: "booking" | "airbnb"; count: number }
  | { type: "source_failed"; source: "booking" | "airbnb"; error: string }
  | { type: "ranking_started" }
  | { type: "result"; result: SearchResult };
