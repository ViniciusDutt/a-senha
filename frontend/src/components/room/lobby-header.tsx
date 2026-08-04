"use client";

import { Copy } from "lucide-react";
import { useState } from "react";

import { PlayerCard } from "@/components/room/player-card";
import { Button } from "@/components/ui/button";
import type { Player, Room } from "@/types/room";

type LobbyHeaderProps = {
  room: Room;
  unassignedPlayers: Player[];
};

export function LobbyHeader({ room, unassignedPlayers }: LobbyHeaderProps) {
  const [hasCopied, setHasCopied] = useState(false);

  async function handleCopyRoomLink() {
    const roomLink = `${window.location.origin}/room/${room.id}`;

    try {
      await navigator.clipboard.writeText(roomLink);

      setHasCopied(true);

      window.setTimeout(() => {
        setHasCopied(false);
      }, 2_000);
    } catch {
      setHasCopied(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="relative flex min-h-23 w-full items-center justify-center gap-6 rounded-2xl bg-black/50 px-6 py-2">
        <h2 className="pointer-events-none absolute z-0 text-5xl font-bold text-white/10">
          Lobby
        </h2>

        {unassignedPlayers.map((player) => {
          const avatarIndex = room.players.findIndex(
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

      <div className="flex w-full items-center justify-between gap-2 rounded-xl bg-white p-1 pl-2">
        <p className="min-w-0 truncate text-black text-sm">
          {typeof window !== "undefined"
            ? `${window.location.host}/room/${room.id}`
            : `/room/${room.id}`}
        </p>

        <Button
          type="button"
          className="mt-0.5 shrink-0"
          onClick={handleCopyRoomLink}
        >
          <Copy />

          {hasCopied ? "Copiado" : "Copiar"}
        </Button>
      </div>
    </div>
  );
}
