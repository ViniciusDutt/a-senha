import type { Game } from "@/types/game";

type GameScoreboardProps = {
  game: Game;
};

export function GameScoreboard({ game }: GameScoreboardProps) {
  return (
    <section className="grid grid-cols-2 gap-4">
      <div className="rounded-2xl bg-chart-2 p-5 text-center">
        <p className="font-semibold">Time 1</p>

        <p className="font-black text-4xl">{game.roundsWon.team1}</p>

        <p className="text-sm text-white/70">
          {game.turnScores.team1} acertos na rodada
        </p>
      </div>

      <div className="rounded-2xl bg-primary p-5 text-center">
        <p className="font-semibold">Time 2</p>

        <p className="font-black text-4xl">{game.roundsWon.team2}</p>

        <p className="text-sm text-white/70">
          {game.turnScores.team2} acertos na rodada
        </p>
      </div>
    </section>
  );
}
