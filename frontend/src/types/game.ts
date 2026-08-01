import type { Room, Team } from "./room";

export type GamePhase =
  | "waiting_turn"
  | "playing"
  | "turn_finished"
  | "round_finished"
  | "game_finished";

export type TeamRoles = {
  clueGiverId: string;
  guesserId: string;
};

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

  turnStartedAt: string | null;
  turnEndsAt: string | null;

  createdAt: string;
};

export type StartTurnResponse =
  | {
      success: true;
      data: {
        game: Game;
      };
    }
  | {
      success: false;
      message: string;
    };

export type GameWordPayload = {
  word: string;
};

export type ChangeWordResponse =
  | {
      success: true;
      data: {
        game: Game;
      };
    }
  | {
      success: false;
      message: string;
    };

export type RematchResponse =
  | {
      success: true;
      data: {
        room: Room;
      };
    }
  | {
      success: false;
      message: string;
    };

export type ReconnectGameResponse =
  | {
      success: true;
      data: {
        playerId: string;
        room: Room;
        game: Game;
        word: string | null;
      };
    }
  | {
      success: false;
      message: string;
    };
