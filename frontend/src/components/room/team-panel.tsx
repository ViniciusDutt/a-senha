import { PlayerCard } from "@/components/room/player-card";
import { cn } from "@/lib/utils";
import type { Room, Team } from "@/types/room";
import { Button } from "../ui/button";

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
        "relative flex flex-col md:flex-row h-36 md:h-20 w-full justify-end items-center gap-4 rounded-xl p-2 md:pl-4",
        backgroundClassName,
      )}
    >
      <h2 className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-y-1/2 -translate-x-1/2 text-2xl lg:text-5xl text-center font-bold text-white/20">
        {title}
      </h2>

      <div className="flex flex-col md:flex-row w-full md:items-end gap-2">
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

      {!isFull && (
        <Button
          size="sm"
          disabled={isDisabled}
          onClick={() => onSelectTeam(team)}>Entrar</Button>
      )}
    </div>
  );
}
