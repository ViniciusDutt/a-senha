import type { Team } from "@/types/room";

export function getTeamName(team: Team): string {
  return team === "team1" ? "Time 1" : "Time 2";
}
