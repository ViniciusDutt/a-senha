import {
  Eye,
  Lightbulb,
  MessageCircleQuestionMark,
  Unplug,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Game } from "@/types/game";
import type { Player } from "@/types/room";

type GameHeaderProps = {
  game: Game;
  players: Player[];
  timeLeft: number;
  isClueGiver: boolean;
  isGuesser: boolean;
};

export function GameHeader({ game, players, timeLeft }: GameHeaderProps) {
  const isTiebreaker = game.round > game.totalRounds;

  const team1Players = players.filter((player) => player.team === "team1");
  const team2Players = players.filter((player) => player.team === "team2");

  const getRoleIcon = (player: Player) => {
    if (player.team !== game.activeTeam) {
      return <Eye size={16} />;
    }

    const roles = player.team === "team1" ? game.roles.team1 : game.roles.team2;

    if (player.id === roles.clueGiverId) {
      return <Lightbulb size={16} />;
    }
    if (player.id === roles.guesserId) {
      return <MessageCircleQuestionMark size={16} />;
    }

    return <Eye size={16} />;
  };

  const renderPlayer = (player: Player) => {
    const avatarIndex = players.findIndex((p) => p.id === player.id);

    return (
      <div key={player.id} className="flex flex-col items-center gap-1">
        <div
          className={cn(
            "relative size-6 rounded-sm overflow-clip border-2",
            player.team === "team1" ? "border-chart-2" : "border-primary",
          )}
        >
          <Image
            src={`/avatars/avatar${avatarIndex + 1}.svg`}
            alt={`Avatar de ${player.name}`}
            title={`Avatar de ${player.name}`}
            fill
            sizes="40px"
            className={cn(
              "object-cover",
              !player.isConnected && "brightness-30",
            )}
          />

          {!player.isConnected && (
            <Unplug
              aria-label="Jogador desconectado"
              className="absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 text-chart-1"
            />
          )}
        </div>
        {getRoleIcon(player)}
      </div>
    );
  };

  return (
    <header className="grid grid-cols-3 rounded-2xl bg-black/50 p-4">
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-bold text-chart-2">Time 1</p>
        <div className="flex items-center gap-2">
          {team1Players.map(renderPlayer)}
        </div>

        <div className="flex items-center gap-2">
          <p className="text-5xl font-bold" title="Acertos na rodada">
            {game.turnScores.team1}
          </p>
          <p className="text-2xl font-bold" title="Rodadas ganhas">
            {game.roundsWon.team1}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-white font-bold">
          {isTiebreaker
            ? `Extra ${game.round - game.totalRounds}`
            : `Rodada ${game.round}/${game.totalRounds}`}
        </p>
        {game.phase === "playing" ? (
          <div className="mb-6 flex justify-center">
            <div className="flex size-18 items-center justify-center rounded-full border-4 border-white/20 bg-black/30">
              <span className="font-black text-4xl">{timeLeft}</span>
            </div>
          </div>
        ) : (
          <p className="text-3xl font-bold">vs</p>
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-bold text-primary">Time 2</p>
        <div className="flex items-center gap-2">
          {team2Players.map(renderPlayer)}
        </div>

        <div className="flex items-center gap-2">
          <p className="text-2xl font-bold" title="Rodadas ganhas">
            {game.roundsWon.team2}
          </p>
          <p className="text-5xl font-bold" title="Acertos na rodada">
            {game.turnScores.team2}
          </p>
        </div>
      </div>
    </header>
  );
}
