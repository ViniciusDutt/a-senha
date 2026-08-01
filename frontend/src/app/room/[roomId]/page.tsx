"use client";

import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";

import { GameCountdownOverlay } from "@/components/room/game-countdown-overlay";
import { JoinRoomScreen } from "@/components/room/join-room-screen";
import { LobbyHeader } from "@/components/room/lobby-header";
import { LobbyOwnerControls } from "@/components/room/lobby-owner-controls";
import { LobbyTeams } from "@/components/room/lobby-teams";
import { Author } from "@/components/ui/author";
import { Sunbeam } from "@/components/ui/sunbeam";
import { useRoomLobby } from "@/hooks/use-room-lobby";

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();

  const {
    room,
    name,
    setName,
    hasJoined,
    isJoining,
    isOwner,
    canStart,
    isStarting,
    isCountingDown,
    isResettingTeams,
    isRandomizingTeams,
    countdown,
    team1Players,
    team2Players,
    unassignedPlayers,
    joinRoom,
    selectTeam,
    startRoom,
    resetTeams,
    randomizeTeams,
    updateChatEnabled,
  } = useRoomLobby(roomId);

  if (!hasJoined) {
    return (
      <JoinRoomScreen
        name={name}
        isJoining={isJoining}
        onNameChange={setName}
        onJoin={joinRoom}
      />
    );
  }

  if (!room) {
    return (
      <main className="relative flex h-dvh w-screen items-center justify-center overflow-hidden">
        <Loader2 className="size-8 animate-spin" />
        <Sunbeam />
      </main>
    );
  }

  return (
    <main className="relative flex h-dvh w-screen flex-col items-center overflow-hidden">
      <div className="flex w-full max-w-lg flex-col items-center gap-10 p-4">
        <LobbyHeader room={room} unassignedPlayers={unassignedPlayers} />

        <LobbyTeams
          room={room}
          team1Players={team1Players}
          team2Players={team2Players}
          onSelectTeam={selectTeam}
        />

        {isOwner && (
          <LobbyOwnerControls
            room={room}
            status={{
              canStart,
              isStarting,
              isCountingDown,
              isResettingTeams,
              isRandomizingTeams,
            }}
            actions={{
              onResetTeams: resetTeams,
              onRandomizeTeams: randomizeTeams,
              onChatEnabledChange: updateChatEnabled,
              onStartRoom: startRoom,
            }}
          />
        )}
      </div>

      <Sunbeam />

      <Author />

      <GameCountdownOverlay countdown={countdown} />
    </main>
  );
}
