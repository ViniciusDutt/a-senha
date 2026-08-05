"use client";

import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { GameCountdownOverlay } from "@/components/room/game-countdown-overlay";
import { JoinRoomScreen } from "@/components/room/join-room-screen";
import { LobbyHeader } from "@/components/room/lobby-header";
import { LobbyOwnerControls } from "@/components/room/lobby-owner-controls";
import { LobbyTeams } from "@/components/room/lobby-teams";
import AdBanner from "@/components/ui/ad-banner";
import { Author } from "@/components/ui/author";
import { useRoomLobby } from "@/hooks/use-room-lobby";
import useScreenSize from "@/hooks/use-screen-size";

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
    error,
    clearError,
  } = useRoomLobby(roomId);
  const screenSize = useScreenSize();

  useEffect(() => {
    setTimeout(() => {
      var adsContainer = document.getElementsByClassName("adsContainer");
      var adsElement = document.getElementsByClassName("adsbygoogle");

      if (adsContainer) {
        for (const el of adsContainer) {
          el.setAttribute("style", "");
        }
      }
      if (adsElement) {
        for (const el of adsElement) {
          el.setAttribute("style", "");
        }
      }
    }, 700);
  }, []);

  if (!hasJoined) {
    return (
      <JoinRoomScreen
        name={name}
        isJoining={isJoining}
        error={error}
        onNameChange={setName}
        onJoin={joinRoom}
        onClearError={clearError}
      />
    );
  }

  if (!room) {
    return (
      <main className="relative flex h-dvh w-screen items-center justify-center overflow-hidden">
        <Loader2 className="size-8 animate-spin" />
      </main>
    );
  }

  return (
    <main className="relative flex h-dvh w-screen flex-col items-center overflow-hidden">
      {screenSize.width < 768 ? (
        <div className="adsContainer">
          <AdBanner
            className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-xl w-76 h-13.5"
            dataAdFormat="auto"
            dataAdSlot="5034311157"
            dataFullWidthResponsive={false}
          />
        </div>
      ) : screenSize.width >= 768 && screenSize.width < 1024 ? (
        <div className="adsContainer">
          <AdBanner
            className="absolute bottom-16 left-1/2 -translate-x-1/2 rounded-xl w-183 h-23.5"
            dataAdFormat="auto"
            dataAdSlot="9197897382"
            dataFullWidthResponsive={false}
          />
        </div>
      ) : (
        <>
          <div className="adsContainer">
            <AdBanner
              className="absolute top-1/2 left-4 -translate-y-1/2 rounded-xl w-41 h-151"
              dataAdFormat="auto"
              dataAdSlot="9197897382"
              dataFullWidthResponsive={false}
            />
          </div>
          <div className="adsContainer">
            <AdBanner
              className="absolute top-1/2 right-4 -translate-y-1/2 rounded-xl w-41 h-151"
              dataAdFormat="auto"
              dataAdSlot="9197897382"
              dataFullWidthResponsive={false}
            />
          </div>
        </>
      )}

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

      <Author />

      <GameCountdownOverlay countdown={countdown} />
    </main>
  );
}
