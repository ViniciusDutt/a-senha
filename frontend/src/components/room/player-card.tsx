import { Unplug } from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import type { Room } from "@/types/room";

type Player = Room["players"][number];

type PlayerCardProps = {
  player: Player;
  avatarNumber: number;
};

export function PlayerCard({ player, avatarNumber }: PlayerCardProps) {
  return (
    <div className="relative z-10 flex min-w-14 flex-col items-center">
      {player.isOwner && (
        <span className="absolute -top-4 z-10" title="Dono da sala">
          👑
        </span>
      )}

      <div className="relative size-10 overflow-hidden rounded-lg">
        <Image
          src={`/avatars/avatar${avatarNumber}.svg`}
          alt={`Avatar de ${player.name}`}
          fill
          sizes="40px"
          className={cn("object-cover", !player.isConnected && "brightness-30")}
        />

        {!player.isConnected && (
          <Unplug
            aria-label="Jogador desconectado"
            className="absolute left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 text-chart-1"
          />
        )}
      </div>

      <span className="max-w-20 truncate text-center text-sm">
        {player.name}
      </span>
    </div>
  );
}
