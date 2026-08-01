import { Button } from "@/components/ui/button";
import type { Game } from "@/types/game";
import { getTeamName } from "@/utils/game-display";

type GameFinishedPanelProps = {
  game: Game;
  isOwner: boolean;
  isReturningToLobby: boolean;
  onRematch: () => void;
};

export function GameFinishedPanel({
  game,
  isOwner,
  isReturningToLobby,
  onRematch,
}: GameFinishedPanelProps) {
  return (
    <section className="rounded-2xl bg-black/50 p-8 text-center">
      <p className="text-sm text-white/60">Partida encerrada</p>

      <h1 className="mt-3 font-black text-5xl">
        {game.winner
          ? `${getTeamName(game.winner)} venceu!`
          : "A partida terminou empatada!"}
      </h1>

      <p className="mt-4 text-xl text-white/70">
        {game.roundsWon.team1} × {game.roundsWon.team2}
      </p>

      {isOwner ? (
        <Button
          type="button"
          size="lg"
          className="mt-8"
          disabled={isReturningToLobby}
          onClick={onRematch}
        >
          {isReturningToLobby ? "Voltando..." : "Jogar novamente"}
        </Button>
      ) : (
        <p className="mt-8 text-white/60">Aguardando o dono da sala...</p>
      )}
    </section>
  );
}
