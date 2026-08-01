import type { Game } from "@/types/game";

import { getTeamName } from "@/utils/game-display";

type GameHeaderProps = {
  game: Game;
};

export function GameHeader({ game }: GameHeaderProps) {
  const isTiebreaker = game.round > game.totalRounds;

  return (
    <header className="flex items-center justify-between rounded-2xl bg-black/50 p-4">
      <div>
        <p className="text-sm text-white/50">
          {isTiebreaker ? "Desempate" : "Rodada"}
        </p>

        <p className="font-bold text-2xl">
          {isTiebreaker
            ? `Extra ${game.round - game.totalRounds}`
            : `${game.round}/${game.totalRounds}`}
        </p>
      </div>

      <div className="text-right">
        <p className="text-sm text-white/50">Jogando agora</p>

        <p className="font-bold text-xl">{getTeamName(game.activeTeam)}</p>
      </div>
    </header>
  );
}
