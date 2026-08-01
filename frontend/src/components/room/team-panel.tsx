import { PlayerCard } from "@/components/room/player-card";
import { cn } from "@/lib/utils";
import type { Room, Team } from "@/types/room";

type Player = Room["players"][number];

type TeamPanelProps = {
  title: string;
  team: Team;
  players: Player[];
  allPlayers: Player[];
  roomStatus: Room["status"];
  backgroundClassName: string;
  buttonClassName: string;
  onSelectTeam: (team: Team) => void;
};

export function TeamPanel({
  title,
  team,
  players,
  allPlayers,
  roomStatus,
  backgroundClassName,
  buttonClassName,
  onSelectTeam,
}: TeamPanelProps) {
  const isFull = players.length >= 2;
  const isDisabled = roomStatus !== "lobby" || isFull;

  return (
    <div
      className={cn(
        "relative flex min-h-24 w-full items-center gap-4 rounded-xl p-2 pl-4",
        backgroundClassName,
      )}
    >
      <h2 className="pointer-events-none absolute left-6 top-1/2 z-0 -translate-y-1/2 text-5xl font-bold text-white/20">
        {title}
      </h2>

      <div className="flex w-full items-end gap-6">
        {players.map((player) => {
          const avatarIndex = allPlayers.findIndex(
            (roomPlayer) => roomPlayer.id === player.id,
          );

          return (
            <PlayerCard
              key={player.id}
              player={player}
              avatarNumber={avatarIndex + 1}
            />
          );
        })}
      </div>

      <button
        type="button"
        disabled={isDisabled}
        onClick={() => onSelectTeam(team)}
        className={cn(
          "h-full shrink-0 cursor-pointer rounded-lg px-4 font-medium",
          "transition-opacity disabled:cursor-not-allowed disabled:opacity-50",
          buttonClassName,
        )}
      >
        {isFull ? "Cheio" : "Entrar"}
      </button>
    </div>
  );
}
