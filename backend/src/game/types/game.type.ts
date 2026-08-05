import type { Team } from "../../rooms/enums/team.enum";
import type { GamePhase } from "../enums/game-phase.enum";
import type { TeamRoles } from "./team-roles.type";

export type TeamScore = {
  team1: number;
  team2: number;
};

export type TurnInputPhase = "waiting_clue" | "waiting_guess";

export type GuessResult = "correct" | "wrong" | null;

export type Game = {
  roomId: string;

  inputModeEnabled: boolean;

  round: number;
  totalRounds: number;

  activeTeam: Team;
  phase: GamePhase;
  isPaused: boolean;

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

  turnInputPhase: TurnInputPhase;
  currentClue: string | null;
  lastGuess: string | null;
  lastGuessResult: GuessResult;

  turnsPlayedInRound: Team[];

  turnStartedAt: Date | null;
  turnEndsAt: Date | null;
  pausedRemainingTurnMs: number | null;

  createdAt: Date;
};
