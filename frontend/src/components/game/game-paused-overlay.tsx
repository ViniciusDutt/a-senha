"use client";

import { Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type { Player } from "@/types/room";

type GamePausedOverlayProps = {
  isPaused: boolean;
  disconnectedPlayers: Player[];
};

export function GamePausedOverlay({
  isPaused,
  disconnectedPlayers,
}: GamePausedOverlayProps) {
  const disconnectedNames = disconnectedPlayers
    .map((player) => player.name)
    .join(", ");

  return (
    <AnimatePresence>
      {isPaused && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 overflow-hidden bg-black/80 px-4 text-center"
        >
          <Loader2 className="size-8 animate-spin text-white" />

          <p className="text-lg font-semibold text-white">Partida pausada</p>

          <p className="max-w-sm text-sm text-white/70">
            {disconnectedNames
              ? `Aguardando ${disconnectedNames} reconectar...`
              : "Aguardando reconexão de um jogador..."}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
