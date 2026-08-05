import { randomInt } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { WsException } from "@nestjs/websockets";

import { Team } from "../rooms/enums/team.enum";
import type { Player } from "../rooms/types/player.type";
import type { Room } from "../rooms/types/room.type";
import { TURN_DURATION_MS } from "./constants/game-timing.constants";
import { GAME_WORDS } from "./data/words";
import { GamePhase } from "./enums/game-phase.enum";
import type { Game } from "./types/game.type";
import type { PublicGame } from "./types/public-game.type";
import type { TeamRoles } from "./types/team-roles.type";

const TOTAL_ROUNDS = 5;
const MAX_INPUT_WORD_LENGTH = 30;

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

type ReconnectGameParams = {
  roomId: string;
  player: Player;
};

type ReconnectGameResult = {
  publicGame: PublicGame;
  word: string | null;
};

type PauseGameResult = {
  publicGame: PublicGame;
  remainingTurnMs: number | null;
};

type ResumeGameResult = {
  publicGame: PublicGame;
  remainingTurnMs: number | null;
};

type SubmitClueParams = {
  roomId: string;
  playerId: string;
  clue: string;
};

type SubmitClueResult = {
  publicGame: PublicGame;
};

type SubmitGuessParams = {
  roomId: string;
  playerId: string;
  guess: string;
};

type SubmitGuessResult = {
  game: Game;
  publicGame: PublicGame;
  isCorrect: boolean;
  word: string | null;
};

@Injectable()
export class GameService {
  private readonly games = new Map<string, Game>();

  createGame(room: Room): Game {
    const roomId = this.normalizeRoomId(room.id);

    if (this.games.has(roomId)) {
      throw new WsException("A partida desta sala já foi criada.");
    }

    const team1Players = this.getRoomTeamPlayers(room, Team.TEAM_1);

    const team2Players = this.getRoomTeamPlayers(room, Team.TEAM_2);

    this.assertValidGameTeams(team1Players, team2Players);

    const game = this.buildInitialGame({
      room,
      team1Roles: this.createInitialRoles(team1Players[0]?.id, team1Players[1]?.id),
      team2Roles: this.createInitialRoles(team2Players[0]?.id, team2Players[1]?.id),
    });

    this.games.set(roomId, game);

    return game;
  }

  deleteGame(roomId: string): void {
    this.games.delete(this.normalizeRoomId(roomId));
  }

  findGameByRoomId(roomId: string): Game | undefined {
    return this.games.get(this.normalizeRoomId(roomId));
  }

  isGameFinished(roomId: string): boolean {
    const game = this.findGameByRoomId(roomId);

    return game?.phase === GamePhase.GAME_FINISHED;
  }

  startTurn({ roomId, player }: StartTurnParams): StartTurnResult {
    const game = this.getGameOrThrow(roomId);

    this.assertGameIsNotPaused(game);

    if (game.phase !== GamePhase.WAITING_TURN) {
      throw new WsException("O turno não pode ser iniciado neste momento.");
    }

    const activeRoles = this.getActiveRoles(game);

    if (player.id !== activeRoles.clueGiverId) {
      throw new WsException("Apenas o jogador responsável pelas dicas pode iniciar o turno.");
    }

    const word = this.selectNextWord(game);
    const startedAt = new Date();

    game.phase = GamePhase.PLAYING;
    game.turnStartedAt = startedAt;
    game.turnEndsAt = new Date(startedAt.getTime() + TURN_DURATION_MS);

    this.resetTurnInteraction(game);

    return {
      game,
      publicGame: this.toPublicGame(game),
      word,
    };
  }

  finishTurn(roomId: string): FinishTurnResult {
    const game = this.getGameOrThrow(roomId);

    if (game.phase !== GamePhase.PLAYING) {
      return {
        publicGame: this.toPublicGame(game),
        transition: this.getCurrentTransition(game),
      };
    }

    this.clearActiveTurn(game);

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

    if (this.shouldFinishGame(game)) {
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

  prepareNextTurn(roomId: string): PublicGame {
    const game = this.getGameOrThrow(roomId);

    if (game.phase !== GamePhase.TURN_FINISHED) {
      throw new WsException("O próximo turno não pode ser preparado agora.");
    }

    game.activeTeam = this.getOppositeTeam(game.activeTeam);

    game.phase = GamePhase.WAITING_TURN;

    this.clearActiveTurn(game);

    return this.toPublicGame(game);
  }

  advanceRound(roomId: string): PublicGame {
    const game = this.getGameOrThrow(roomId);

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

    this.clearActiveTurn(game);

    return this.toPublicGame(game);
  }

  submitClue({ roomId, playerId, clue }: SubmitClueParams): SubmitClueResult {
    const game = this.getInputModeGame(roomId);

    if (game.turnInputPhase !== "waiting_clue") {
      throw new WsException("Não é possível enviar uma dica neste momento.");
    }

    const activeRoles = this.getActiveRoles(game);

    if (playerId !== activeRoles.clueGiverId) {
      throw new WsException("Apenas o jogador responsável pelas dicas pode enviar uma dica.");
    }

    const validatedClue = this.validateSingleWord(clue, "dica");

    if (game.currentWord && this.areWordsEqual(validatedClue, game.currentWord)) {
      throw new WsException("A dica não pode ser igual à senha.");
    }

    game.currentClue = validatedClue;
    game.lastGuess = null;
    game.lastGuessResult = null;
    game.turnInputPhase = "waiting_guess";

    return {
      publicGame: this.toPublicGame(game),
    };
  }

  submitGuess({ roomId, playerId, guess }: SubmitGuessParams): SubmitGuessResult {
    const game = this.getInputModeGame(roomId);

    if (game.turnInputPhase !== "waiting_guess") {
      throw new WsException("Não é possível enviar um palpite neste momento.");
    }

    const activeRoles = this.getActiveRoles(game);

    if (playerId !== activeRoles.guesserId) {
      throw new WsException("Apenas o jogador responsável pelo palpite pode responder.");
    }

    const validatedGuess = this.validateSingleWord(guess, "palpite");

    if (!game.currentWord) {
      throw new WsException("A senha atual não foi encontrada.");
    }

    const isCorrect = this.areWordsEqual(validatedGuess, game.currentWord);

    game.lastGuess = validatedGuess;
    game.lastGuessResult = isCorrect ? "correct" : "wrong";

    game.turnInputPhase = "waiting_clue";

    let word: string | null = null;

    if (isCorrect) {
      this.incrementActiveTeamScore(game);
      word = this.selectNextWord(game);
    }

    return {
      game,
      publicGame: this.toPublicGame(game),
      isCorrect,
      word,
    };
  }

  correctWord({ roomId, playerId }: ChangeWordParams): ChangeWordResult {
    const game = this.getControllableGame({
      roomId,
      playerId,
    });

    if (game.inputModeEnabled) {
      throw new WsException("No modo por texto, o acerto é validado automaticamente.");
    }

    this.incrementActiveTeamScore(game);

    const word = this.selectNextWord(game);

    this.resetTurnInteraction(game);

    return {
      game,
      publicGame: this.toPublicGame(game),
      word,
    };
  }

  skipWord({ roomId, playerId }: ChangeWordParams): ChangeWordResult {
    const game = this.getControllableGame({
      roomId,
      playerId,
    });

    const word = this.selectNextWord(game);

    this.resetTurnInteraction(game);

    return {
      game,
      publicGame: this.toPublicGame(game),
      word,
    };
  }

  pauseGame(roomId: string): PauseGameResult {
    const game = this.getGameOrThrow(roomId);

    const wasAlreadyPaused = game.isPaused;

    game.isPaused = true;

    if (!wasAlreadyPaused && game.phase === GamePhase.PLAYING && game.turnEndsAt) {
      game.pausedRemainingTurnMs = Math.max(0, game.turnEndsAt.getTime() - Date.now());
    }

    return {
      publicGame: this.toPublicGame(game),
      remainingTurnMs: game.pausedRemainingTurnMs,
    };
  }

  resumeGame(roomId: string): ResumeGameResult {
    const game = this.getGameOrThrow(roomId);

    game.isPaused = false;

    const remainingTurnMs = game.pausedRemainingTurnMs;

    game.pausedRemainingTurnMs = null;

    if (remainingTurnMs !== null && game.phase === GamePhase.PLAYING) {
      game.turnEndsAt = new Date(Date.now() + remainingTurnMs);
    }

    return {
      publicGame: this.toPublicGame(game),
      remainingTurnMs,
    };
  }

  getReconnectState({ roomId, player }: ReconnectGameParams): ReconnectGameResult {
    const game = this.getGameOrThrow(roomId);

    const activeRoles = this.getActiveRoles(game);

    const isClueGiver = player.id === activeRoles.clueGiverId;

    const isOpponent = player.team !== null && player.team !== game.activeTeam;

    const canSeeWord = game.phase === GamePhase.PLAYING && (isClueGiver || isOpponent);

    return {
      publicGame: this.toPublicGame(game),
      word: canSeeWord ? game.currentWord : null,
    };
  }

  toPublicGame(game: Game): PublicGame {
    return {
      roomId: game.roomId,

      inputModeEnabled: game.inputModeEnabled,

      round: game.round,
      totalRounds: game.totalRounds,

      activeTeam: game.activeTeam,
      phase: game.phase,
      isPaused: game.isPaused,

      roles: game.roles,

      turnScores: game.turnScores,
      roundsWon: game.roundsWon,

      roundWinner: game.roundWinner,
      winner: game.winner,

      turnInputPhase: game.turnInputPhase,
      currentClue: game.currentClue,
      lastGuess: game.lastGuess,
      lastGuessResult: game.lastGuessResult,

      turnStartedAt: game.turnStartedAt,
      turnEndsAt: game.turnEndsAt,

      createdAt: game.createdAt,
    };
  }

  private buildInitialGame({
    room,
    team1Roles,
    team2Roles,
  }: {
    room: Room;
    team1Roles: TeamRoles;
    team2Roles: TeamRoles;
  }): Game {
    return {
      roomId: this.normalizeRoomId(room.id),

      inputModeEnabled: room.settings.chatEnabled,

      turnInputPhase: "waiting_clue",
      currentClue: null,
      lastGuess: null,
      lastGuessResult: null,

      round: 1,
      totalRounds: TOTAL_ROUNDS,

      activeTeam: Team.TEAM_1,
      phase: GamePhase.WAITING_TURN,
      isPaused: false,

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
      pausedRemainingTurnMs: null,

      createdAt: new Date(),
    };
  }

  private assertValidGameTeams(team1Players: Player[], team2Players: Player[]): void {
    if (team1Players.length !== 2 || team2Players.length !== 2) {
      throw new WsException("Os dois times precisam ter exatamente dois jogadores.");
    }
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

  private getGameOrThrow(roomId: string): Game {
    const game = this.games.get(this.normalizeRoomId(roomId));

    if (!game) {
      throw new WsException("Partida não encontrada.");
    }

    return game;
  }

  private getInputModeGame(roomId: string): Game {
    const game = this.getGameOrThrow(roomId);

    this.assertGameIsNotPaused(game);
    this.assertGameIsPlaying(game);

    if (!game.inputModeEnabled) {
      throw new WsException("O modo por texto não está ativo nesta partida.");
    }

    return game;
  }

  private getControllableGame({ roomId, playerId }: ChangeWordParams): Game {
    const game = this.getGameOrThrow(roomId);

    this.assertGameIsNotPaused(game);
    this.assertGameIsPlaying(game);

    const activeRoles = this.getActiveRoles(game);

    if (playerId !== activeRoles.clueGiverId) {
      throw new WsException("Apenas o jogador responsável pelas dicas pode controlar as senhas.");
    }

    return game;
  }

  private assertGameIsPlaying(game: Game): void {
    if (game.phase !== GamePhase.PLAYING) {
      throw new WsException("O turno não está em andamento.");
    }
  }

  private assertGameIsNotPaused(game: Game): void {
    if (game.isPaused) {
      throw new WsException("A partida está pausada aguardando a reconexão de um jogador.");
    }
  }

  private getActiveRoles(game: Game): TeamRoles {
    return game.activeTeam === Team.TEAM_1 ? game.roles.team1 : game.roles.team2;
  }

  private getOppositeTeam(team: Team): Team {
    return team === Team.TEAM_1 ? Team.TEAM_2 : Team.TEAM_1;
  }

  private incrementActiveTeamScore(game: Game): void {
    if (game.activeTeam === Team.TEAM_1) {
      game.turnScores.team1 += 1;
      return;
    }

    game.turnScores.team2 += 1;
  }

  private getRoomTeamPlayers(room: Room, team: Team): Player[] {
    return room.players.filter(player => player.team === team);
  }

  private clearActiveTurn(game: Game): void {
    game.currentWord = null;
    game.turnStartedAt = null;
    game.turnEndsAt = null;

    this.resetTurnInteraction(game);
  }

  private resetTurnInteraction(game: Game): void {
    game.turnInputPhase = "waiting_clue";
    game.currentClue = null;
    game.lastGuess = null;
    game.lastGuessResult = null;
  }

  private shouldFinishGame(game: Game): boolean {
    const reachedWinCondition = game.round <= game.totalRounds && this.hasGameWinner(game);

    if (reachedWinCondition) {
      return true;
    }

    const finishedNormalRounds = game.round >= game.totalRounds;

    const hasScoreDifference = game.roundsWon.team1 !== game.roundsWon.team2;

    return finishedNormalRounds && hasScoreDifference;
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

  private hasGameWinner(game: Game): boolean {
    const winsNeeded = this.getWinsNeeded(game);

    return game.roundsWon.team1 >= winsNeeded || game.roundsWon.team2 >= winsNeeded;
  }

  private getWinsNeeded(game: Game): number {
    return Math.floor(game.totalRounds / 2) + 1;
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

  private swapRoles(roles: TeamRoles): TeamRoles {
    return {
      clueGiverId: roles.guesserId,
      guesserId: roles.clueGiverId,
    };
  }

  private validateSingleWord(value: string, fieldName: "dica" | "palpite"): string {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
      throw new WsException(fieldName === "dica" ? "Digite uma dica." : "Digite um palpite.");
    }

    if (normalizedValue.split(/\s+/).length !== 1) {
      throw new WsException(`O ${fieldName} deve conter apenas uma palavra.`);
    }

    if (normalizedValue.length > MAX_INPUT_WORD_LENGTH) {
      throw new WsException(
        `O ${fieldName} deve ter no máximo ${MAX_INPUT_WORD_LENGTH} caracteres.`,
      );
    }

    return normalizedValue;
  }

  private areWordsEqual(firstWord: string, secondWord: string): boolean {
    return this.normalizeWord(firstWord) === this.normalizeWord(secondWord);
  }

  private normalizeWord(value: string): string {
    return value
      .trim()
      .toLocaleLowerCase("pt-BR")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");
  }

  private selectNextWord(game: Game): string {
    const word = this.getRandomWord(game);

    game.currentWord = word;
    game.usedWords.push(word);

    return word;
  }

  private getRandomWord(game: Game): string {
    const availableWords = GAME_WORDS.filter(word => !game.usedWords.includes(word));

    if (availableWords.length === 0) {
      throw new WsException("Não há mais senhas disponíveis.");
    }

    const word = availableWords[randomInt(availableWords.length)];

    if (!word) {
      throw new WsException("Não foi possível selecionar uma senha.");
    }

    return word;
  }

  private normalizeRoomId(roomId: string): string {
    return roomId.toUpperCase();
  }
}
