import type { Game } from "@/types/game";
import { getTeamName } from "@/utils/game-display";

type TurnFinishedPanelProps = {
  game: Game;
};

export function TurnFinishedPanel({ game }: TurnFinishedPanelProps) {
  const activeTeamScore =
    game.activeTeam === "team1" ? game.turnScores.team1 : game.turnScores.team2;

  return (
    <section className="rounded-2xl bg-black/50 p-6 text-center">
      <p className="text-sm text-white/60">Turno encerrado</p>

      <h2 className="mt-2 font-black text-4xl">
        {getTeamName(game.activeTeam)} acertou {activeTeamScore}
      </h2>

      <p className="mt-4 text-white/60">Preparando o próximo time...</p>
    </section>
  );
}
