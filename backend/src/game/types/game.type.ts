import type { Team } from "../../rooms/enums/team.enum";
import type { GamePhase } from "../enums/game-phase.enum";
import type { TeamRoles } from "./team-roles.type";

export type TeamScore = {
  team1: number;
  team2: number;
};

export type Game = {
  roomId: string;

  round: number;
  totalRounds: number;

  activeTeam: Team;
  phase: GamePhase;

  roles: {
    team1: TeamRoles;
    team2: TeamRoles;
  };

  turnScores: TeamScore;
  roundsWon: TeamScore;

  roundWinner: Team | null;
  winner: Team | null;

  currentWord: string | null;
  usedWords: string[];

  turnsPlayedInRound: Team[];

  turnStartedAt: Date | null;
  turnEndsAt: Date | null;

  createdAt: Date;
};
