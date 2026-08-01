import type { Game } from "./game.type";

export type PublicGame = Omit<Game, "currentWord" | "usedWords" | "turnsPlayedInRound">;
