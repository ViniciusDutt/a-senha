import { randomInt } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { WsException } from "@nestjs/websockets";
import { Team } from "../rooms/enums/team.enum";
import type { Player } from "../rooms/types/player.type";
import type { Room } from "../rooms/types/room.type";
import { GAME_WORDS } from "./data/words";
import { GamePhase } from "./enums/game-phase.enum";
import type { Game } from "./types/game.type";
import type { PublicGame } from "./types/public-game.type";
import type { TeamRoles } from "./types/team-roles.type";

type StartTurnParams = {
  roomId: string;
  player: Player;
};

type StartTurnResult = {
  game: Game;
  publicGame: PublicGame;
  word: string;
};

type ChangeWordParams = {
  roomId: string;
  playerId: string;
};

type ChangeWordResult = {
  game: Game;
  publicGame: PublicGame;
  word: string;
};

type FinishTurnTransition = "next_turn" | "round_finished" | "game_finished";

type FinishTurnResult = {
  publicGame: PublicGame;
  transition: FinishTurnTransition;
};

type ReconnectGameResult = {
  publicGame: PublicGame;
  word: string | null;
};

type ReconnectGameParams = {
  roomId: string;
  player: Player;
};

@Injectable()
export class GameService {
  private readonly games = new Map<string, Game>();

  createGame(room: Room): Game {
    if (this.games.has(room.id)) {
      throw new WsException("A partida desta sala já foi criada.");
    }

    const team1Players = room.players.filter(player => player.team === Team.TEAM_1);

    const team2Players = room.players.filter(player => player.team === Team.TEAM_2);

    if (team1Players.length !== 2 || team2Players.length !== 2) {
      throw new WsException("Os dois times precisam ter exatamente dois jogadores.");
    }

    const team1Roles = this.createInitialRoles(team1Players[0]?.id, team1Players[1]?.id);

    const team2Roles = this.createInitialRoles(team2Players[0]?.id, team2Players[1]?.id);

    const game: Game = {
      roomId: room.id,

      round: 1,
      totalRounds: 5,

      activeTeam: Team.TEAM_1,
      phase: GamePhase.WAITING_TURN,

      roles: {
        team1: team1Roles,
        team2: team2Roles,
      },

      turnScores: {
        team1: 0,
        team2: 0,
      },

      roundsWon: {
        team1: 0,
        team2: 0,
      },

      roundWinner: null,
      winner: null,

      currentWord: null,
      usedWords: [],

      turnsPlayedInRound: [],

      turnStartedAt: null,
      turnEndsAt: null,

      createdAt: new Date(),
    };

    this.games.set(room.id, game);

    return game;
  }

  startTurn({ roomId, player }: StartTurnParams): StartTurnResult {
    const game = this.games.get(roomId.toUpperCase());

    if (!game) {
      throw new WsException("Partida não encontrada.");
    }

    if (game.phase !== GamePhase.WAITING_TURN) {
      throw new WsException("O turno não pode ser iniciado neste momento.");
    }

    const activeRoles = game.activeTeam === Team.TEAM_1 ? game.roles.team1 : game.roles.team2;

    if (player.id !== activeRoles.clueGiverId) {
      throw new WsException("Apenas o jogador responsável pelas dicas pode iniciar o turno.");
    }

    const word = this.selectNextWord(game);

    const startedAt = new Date();
    const endsAt = new Date(startedAt.getTime() + 30_000);

    game.phase = GamePhase.PLAYING;
    game.currentWord = word;
    game.usedWords.push(word);
    game.turnStartedAt = startedAt;
    game.turnEndsAt = endsAt;

    return {
      game,
      publicGame: this.toPublicGame(game),
      word,
    };
  }

  finishTurn(roomId: string): FinishTurnResult {
    const game = this.games.get(roomId.toUpperCase());

    if (!game) {
      throw new WsException("Partida não encontrada.");
    }

    if (game.phase !== GamePhase.PLAYING) {
      return {
        publicGame: this.toPublicGame(game),
        transition: this.getCurrentTransition(game),
      };
    }

    game.currentWord = null;
    game.turnStartedAt = null;
    game.turnEndsAt = null;

    if (!game.turnsPlayedInRound.includes(game.activeTeam)) {
      game.turnsPlayedInRound.push(game.activeTeam);
    }

    if (game.turnsPlayedInRound.length === 1) {
      game.phase = GamePhase.TURN_FINISHED;

      return {
        publicGame: this.toPublicGame(game),
        transition: "next_turn",
      };
    }

    this.finishRound(game);

    const hasReachedNormalWinCondition = game.round <= game.totalRounds && this.hasGameWinner(game);

    if (hasReachedNormalWinCondition) {
      this.finishGame(game);

      return {
        publicGame: this.toPublicGame(game),
        transition: "game_finished",
      };
    }

    const hasFinishedNormalRounds = game.round >= game.totalRounds;

    const hasScoreDifference = game.roundsWon.team1 !== game.roundsWon.team2;

    if (hasFinishedNormalRounds && hasScoreDifference) {
      this.finishGame(game);

      return {
        publicGame: this.toPublicGame(game),
        transition: "game_finished",
      };
    }

    game.phase = GamePhase.ROUND_FINISHED;

    return {
      publicGame: this.toPublicGame(game),
      transition: "round_finished",
    };
  }

  getReconnectState({ roomId, player }: ReconnectGameParams): ReconnectGameResult {
    const game = this.games.get(roomId.toUpperCase());

    if (!game) {
      throw new WsException("Partida não encontrada.");
    }

    const activeRoles = game.activeTeam === Team.TEAM_1 ? game.roles.team1 : game.roles.team2;

    const isClueGiver = activeRoles.clueGiverId === player.id;

    const isOpponent = player.team !== null && player.team !== game.activeTeam;

    const canSeeWord = game.phase === GamePhase.PLAYING && (isClueGiver || isOpponent);

    return {
      publicGame: this.toPublicGame(game),
      word: canSeeWord ? game.currentWord : null,
    };
  }

  prepareNextTurn(roomId: string): PublicGame {
    const game = this.games.get(roomId.toUpperCase());

    if (!game) {
      throw new WsException("Partida não encontrada.");
    }

    if (game.phase !== GamePhase.TURN_FINISHED) {
      throw new WsException("O próximo turno não pode ser preparado agora.");
    }

    game.activeTeam = game.activeTeam === Team.TEAM_1 ? Team.TEAM_2 : Team.TEAM_1;

    game.phase = GamePhase.WAITING_TURN;
    game.currentWord = null;
    game.turnStartedAt = null;
    game.turnEndsAt = null;

    return this.toPublicGame(game);
  }

  advanceRound(roomId: string): PublicGame {
    const game = this.games.get(roomId.toUpperCase());

    if (!game) {
      throw new WsException("Partida não encontrada.");
    }

    if (game.phase !== GamePhase.ROUND_FINISHED) {
      throw new WsException("A próxima rodada não pode ser iniciada agora.");
    }

    game.round += 1;

    game.turnScores = {
      team1: 0,
      team2: 0,
    };

    game.turnsPlayedInRound = [];
    game.roundWinner = null;

    game.roles = {
      team1: this.swapRoles(game.roles.team1),
      team2: this.swapRoles(game.roles.team2),
    };

    game.activeTeam = game.round % 2 === 1 ? Team.TEAM_1 : Team.TEAM_2;

    game.phase = GamePhase.WAITING_TURN;
    game.currentWord = null;
    game.turnStartedAt = null;
    game.turnEndsAt = null;

    return this.toPublicGame(game);
  }

  correctWord({ roomId, playerId }: ChangeWordParams): ChangeWordResult {
    const game = this.getPlayingGame(roomId, playerId);

    if (game.activeTeam === Team.TEAM_1) {
      game.turnScores.team1 += 1;
    } else {
      game.turnScores.team2 += 1;
    }

    const word = this.selectNextWord(game);

    return {
      game,
      publicGame: this.toPublicGame(game),
      word,
    };
  }

  skipWord({ roomId, playerId }: ChangeWordParams): ChangeWordResult {
    const game = this.getPlayingGame(roomId, playerId);

    const word = this.selectNextWord(game);

    return {
      game,
      publicGame: this.toPublicGame(game),
      word,
    };
  }

  deleteGame(roomId: string): void {
    this.games.delete(roomId.toUpperCase());
  }

  isGameFinished(roomId: string): boolean {
    const game = this.games.get(roomId.toUpperCase());

    return game?.phase === GamePhase.GAME_FINISHED;
  }

  findGameByRoomId(roomId: string): Game | undefined {
    return this.games.get(roomId.toUpperCase());
  }

  toPublicGame(game: Game): PublicGame {
    return {
      roomId: game.roomId,
      round: game.round,
      totalRounds: game.totalRounds,
      activeTeam: game.activeTeam,
      phase: game.phase,
      roles: game.roles,
      turnScores: game.turnScores,
      roundsWon: game.roundsWon,
      roundWinner: game.roundWinner,
      winner: game.winner,
      turnStartedAt: game.turnStartedAt,
      turnEndsAt: game.turnEndsAt,
      createdAt: game.createdAt,
    };
  }

  private hasGameWinner(game: Game): boolean {
    const winsNeeded = this.getWinsNeeded(game);

    return game.roundsWon.team1 >= winsNeeded || game.roundsWon.team2 >= winsNeeded;
  }

  private getWinsNeeded(game: Game): number {
    return Math.floor(game.totalRounds / 2) + 1;
  }

  private swapRoles(roles: TeamRoles): TeamRoles {
    return {
      clueGiverId: roles.guesserId,
      guesserId: roles.clueGiverId,
    };
  }

  private finishGame(game: Game): void {
    game.phase = GamePhase.GAME_FINISHED;

    if (game.roundsWon.team1 > game.roundsWon.team2) {
      game.winner = Team.TEAM_1;
      return;
    }

    if (game.roundsWon.team2 > game.roundsWon.team1) {
      game.winner = Team.TEAM_2;
      return;
    }

    game.winner = null;
  }

  private finishRound(game: Game): void {
    const team1Score = game.turnScores.team1;
    const team2Score = game.turnScores.team2;

    if (team1Score > team2Score) {
      game.roundWinner = Team.TEAM_1;
      game.roundsWon.team1 += 1;
      return;
    }

    if (team2Score > team1Score) {
      game.roundWinner = Team.TEAM_2;
      game.roundsWon.team2 += 1;
      return;
    }

    game.roundWinner = null;
  }

  private getCurrentTransition(game: Game): FinishTurnTransition {
    if (game.phase === GamePhase.GAME_FINISHED) {
      return "game_finished";
    }

    if (game.phase === GamePhase.ROUND_FINISHED) {
      return "round_finished";
    }

    return "next_turn";
  }

  private selectNextWord(game: Game): string {
    const word = this.getRandomWord(game);

    game.currentWord = word;
    game.usedWords.push(word);

    return word;
  }

  private getPlayingGame(roomId: string, playerId: string): Game {
    const game = this.games.get(roomId.toUpperCase());

    if (!game) {
      throw new WsException("Partida não encontrada.");
    }

    if (game.phase !== GamePhase.PLAYING) {
      throw new WsException("O turno não está em andamento.");
    }

    const activeRoles = game.activeTeam === Team.TEAM_1 ? game.roles.team1 : game.roles.team2;

    if (playerId !== activeRoles.clueGiverId) {
      throw new WsException("Apenas o jogador responsável pelas dicas pode controlar as senhas.");
    }

    return game;
  }

  private createInitialRoles(
    clueGiverId: string | undefined,
    guesserId: string | undefined,
  ): TeamRoles {
    if (!clueGiverId || !guesserId) {
      throw new WsException("Não foi possível definir os papéis da dupla.");
    }

    return {
      clueGiverId,
      guesserId,
    };
  }

  private getRandomWord(game: Game): string {
    const availableWords = GAME_WORDS.filter(word => !game.usedWords.includes(word));

    if (availableWords.length === 0) {
      throw new WsException("Não há mais senhas disponíveis.");
    }

    const index = randomInt(availableWords.length);
    const word = availableWords[index];

    if (!word) {
      throw new WsException("Não foi possível selecionar uma senha.");
    }

    return word;
  }
}
