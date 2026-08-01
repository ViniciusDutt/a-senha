import type { Game } from "@/types/game";
import { getTeamName } from "@/utils/game-display";

type RoundFinishedPanelProps = {
  game: Game;
};

export function RoundFinishedPanel({ game }: RoundFinishedPanelProps) {
  return (
    <section className="rounded-2xl bg-black/50 p-6 text-center">
      <p className="text-sm text-white/60">Rodada {game.round} encerrada</p>

      <h2 className="mt-2 font-black text-4xl">
        {game.roundWinner
          ? `${getTeamName(game.roundWinner)} venceu`
          : "A rodada terminou empatada"}
      </h2>

      <p className="mt-4 text-white/60">
        Placar: {game.turnScores.team1} × {game.turnScores.team2}
      </p>

      <p className="mt-2 text-white/60">Preparando a próxima rodada...</p>
    </section>
  );
}
