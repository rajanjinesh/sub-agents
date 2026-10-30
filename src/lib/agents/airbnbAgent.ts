import { searchAirbnb } from "../hasdata/tools";
import type { SearchInput } from "../types";
import { runSubagent, type AgentRun } from "./subagent";

export function runAirbnbAgent(input: SearchInput): Promise<AgentRun> {
  return runSubagent(
    {
      source: "airbnb",
      system:
        "You find stays on Airbnb. Use your tool once. Don't rank or filter, just report what the tool returned in one short line.",
      toolName: "search_airbnb",
      toolDescription: "Search Airbnb for stays. Returns the best-matching stays after product rules.",
      execute: searchAirbnb,
    },
    input,
  );
}
