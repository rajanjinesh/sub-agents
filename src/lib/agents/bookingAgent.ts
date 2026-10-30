import { searchBooking } from "../hasdata/tools";
import type { SearchInput } from "../types";
import { runSubagent, type AgentRun } from "./subagent";

export function runBookingAgent(input: SearchInput): Promise<AgentRun> {
  return runSubagent(
    {
      source: "booking",
      system:
        "You find stays on Booking.com. Use your tool once. Don't rank or filter, just report what the tool returned in one short line.",
      toolName: "search_booking",
      toolDescription: "Search Booking.com for stays. Returns the best-matching stays after product rules.",
      execute: searchBooking,
    },
    input,
  );
}
