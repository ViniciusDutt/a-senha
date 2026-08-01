"use client";

import { CircleQuestionMark, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Room } from "@/types/room";

type LobbyOwnerControlsStatus = {
  canStart: boolean;
  isStarting: boolean;
  isCountingDown: boolean;
  isResettingTeams: boolean;
  isRandomizingTeams: boolean;
};

type LobbyOwnerControlsActions = {
  onResetTeams: () => void;
  onRandomizeTeams: () => void;
  onChatEnabledChange: (enabled: boolean) => void;
  onStartRoom: () => void;
};

type LobbyOwnerControlsProps = {
  room: Room;
  status: LobbyOwnerControlsStatus;
  actions: LobbyOwnerControlsActions;
};

export function LobbyOwnerControls({
  room,
  status,
  actions,
}: LobbyOwnerControlsProps) {
  const [isChatTipOpen, setIsChatTipOpen] = useState(false);

  const {
    canStart,
    isStarting,
    isCountingDown,
    isResettingTeams,
    isRandomizingTeams,
  } = status;

  const { onResetTeams, onRandomizeTeams, onChatEnabledChange, onStartRoom } =
    actions;

  const areAllTeamsEmpty = room.players.every((player) => player.team === null);

  const canRandomizeTeams = room.players.length === 4;

  const isChangingTeams = isResettingTeams || isRandomizingTeams;

  return (
    <div className="flex w-full flex-col items-center justify-center gap-4 lg:absolute lg:bottom-14 lg:left-1/2 lg:max-w-lg lg:-translate-x-1/2">
      <div className="flex w-full gap-4">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={isChangingTeams || areAllTeamsEmpty}
          onClick={onResetTeams}
        >
          {isResettingTeams ? "Limpando..." : "Limpar times"}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={!canRandomizeTeams || isChangingTeams}
          onClick={onRandomizeTeams}
        >
          {isRandomizingTeams ? "Sorteando..." : "Sortear times"}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="chat"
          checked={room.settings.chatEnabled}
          disabled={isStarting || isCountingDown}
          onCheckedChange={onChatEnabledChange}
        />

        <Label htmlFor="chat">Modo por texto</Label>

        <HoverCard open={isChatTipOpen} onOpenChange={setIsChatTipOpen}>
          <HoverCardTrigger
            delay={0}
            render={
              <button
                type="button"
                aria-label="Explicação do modo por texto"
                onClick={() => {
                  setIsChatTipOpen((current) => !current);
                }}
              >
                <CircleQuestionMark className="size-5" />
              </button>
            }
          />

          <HoverCardContent side="top">
            Ative para enviar dicas e palpites pelo jogo. Desative caso os
            jogadores estejam juntos presencialmente ou em chamada.
          </HoverCardContent>
        </HoverCard>
      </div>

      <Button
        type="button"
        size="lg"
        className="w-full"
        disabled={!canStart || isStarting || isCountingDown || isChangingTeams}
        onClick={onStartRoom}
      >
        {isCountingDown ? (
          "Iniciando..."
        ) : isStarting ? (
          <>
            <Loader2 className="animate-spin" />
            Iniciando...
          </>
        ) : canStart ? (
          "Iniciar partida"
        ) : (
          "Aguardando"
        )}
      </Button>
    </div>
  );
}
