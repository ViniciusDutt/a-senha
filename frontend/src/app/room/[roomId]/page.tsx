"use client";

import { CircleQuestionMark, Copy, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { JoinRoomScreen } from "@/components/room/join-room-screen";
import { PlayerCard } from "@/components/room/player-card";
import { TeamPanel } from "@/components/room/team-panel";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Label } from "@/components/ui/label";
import { Sunbeam } from "@/components/ui/sunbeam";
import { Switch } from "@/components/ui/switch";
import { socket } from "@/lib/socket";
import type {
  JoinRoomResponse,
  ReconnectRoomResponse,
  Room,
  SelectTeamResponse,
  StartRoomResponse,
  Team,
  UpdateRoomSettingsResponse,
} from "@/types/room";
import { sleep } from "@/utils/sleep";

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [name, setName] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [chatTip, setChatTip] = useState(false);

  useEffect(() => {
    const storedPlayerId = sessionStorage.getItem(`room:${roomId}:playerId`);

    const storedRoom = sessionStorage.getItem(`room:${roomId}:state`);

    setPlayerId(storedPlayerId);

    if (storedRoom) {
      try {
        setRoom(JSON.parse(storedRoom) as Room);
      } catch {
        sessionStorage.removeItem(`room:${roomId}:state`);
      }
    }

    function saveRoom(updatedRoom: Room) {
      setRoom(updatedRoom);

      sessionStorage.setItem(
        `room:${updatedRoom.id}:state`,
        JSON.stringify(updatedRoom),
      );
    }

    function handleRoomUpdated(updatedRoom: Room) {
      saveRoom(updatedRoom);
    }

    function handleGameStarted(updatedRoom: Room) {
      saveRoom(updatedRoom);

      window.alert("Partida iniciada!");
    }

    function reconnectPlayer() {
      if (!storedPlayerId) {
        return;
      }

      socket.emit(
        "room:reconnect",
        {
          roomId,
          playerId: storedPlayerId,
        },
        (response: ReconnectRoomResponse) => {
          if (!response.success) {
            sessionStorage.removeItem(`room:${roomId}:playerId`);
            sessionStorage.removeItem(`room:${roomId}:state`);

            setPlayerId(null);
            setRoom(null);
            setHasJoined(false);

            return;
          }

          saveRoom(response.data.room);
          setPlayerId(response.data.playerId);
          setHasJoined(true);
        },
      );
    }

    socket.on("room:updated", handleRoomUpdated);
    socket.on("game:started", handleGameStarted);

    if (storedPlayerId) {
      setHasJoined(true);

      if (socket.connected) {
        reconnectPlayer();
      } else {
        socket.connect();
        socket.once("connect", reconnectPlayer);
      }
    }

    return () => {
      socket.off("room:updated", handleRoomUpdated);
      socket.off("game:started", handleGameStarted);
      socket.off("connect", reconnectPlayer);
    };
  }, [roomId]);

  function handleJoinRoom() {
    const normalizedName = name.trim();

    if (normalizedName.length < 2 || isJoining) {
      return;
    }

    setIsJoining(true);

    const joinRoom = () => {
      socket.emit(
        "room:join",
        {
          roomId,
          name: normalizedName,
        },
        async (response: JoinRoomResponse) => {
          if (!response.success) {
            setIsJoining(false);
            return;
          }

          const { playerId: joinedPlayerId, room: joinedRoom } = response.data;

          sessionStorage.setItem(
            `room:${joinedRoom.id}:playerId`,
            joinedPlayerId,
          );

          sessionStorage.setItem(
            `room:${joinedRoom.id}:state`,
            JSON.stringify(joinedRoom),
          );

          await sleep(300);

          setPlayerId(joinedPlayerId);
          setRoom(joinedRoom);
          setHasJoined(true);
          setIsJoining(false);
        },
      );
    };

    if (socket.connected) {
      joinRoom();
      return;
    }

    socket.connect();
    socket.once("connect", joinRoom);
  }

  function handleSelectTeam(team: Team) {
    if (!socket.connected) {
      return;
    }

    socket.emit(
      "room:select-team",
      {
        roomId,
        team,
      },
      (response: SelectTeamResponse) => {
        if (!response.success) {
          return;
        }

        const updatedRoom = response.data.room;

        setRoom(updatedRoom);

        sessionStorage.setItem(
          `room:${roomId}:state`,
          JSON.stringify(updatedRoom),
        );
      },
    );
  }

  function handleStartRoom() {
    if (isStarting || !socket.connected) {
      return;
    }

    setIsStarting(true);

    socket.emit(
      "room:start",
      {
        roomId,
      },
      (response: StartRoomResponse) => {
        setIsStarting(false);

        if (!response.success) {
          return;
        }

        const updatedRoom = response.data.room;

        setRoom(updatedRoom);

        sessionStorage.setItem(
          `room:${roomId}:state`,
          JSON.stringify(updatedRoom),
        );
      },
    );
  }

  function handleChatEnabledChange(chatEnabled: boolean) {
    socket.emit(
      "room:update-settings",
      {
        roomId,
        chatEnabled,
      },
      (response: UpdateRoomSettingsResponse) => {
        if (!response.success) {
          return;
        }

        const updatedRoom = response.data.room;

        setRoom(updatedRoom);

        sessionStorage.setItem(
          `room:${roomId}:state`,
          JSON.stringify(updatedRoom),
        );
      },
    );
  }

  async function handleCopyRoomLink() {
    const roomLink = `${window.location.origin}/room/${roomId}`;

    try {
      await navigator.clipboard.writeText(roomLink);

      setHasCopied(true);

      window.setTimeout(() => {
        setHasCopied(false);
      }, 2000);
    } catch {
      setHasCopied(false);
    }
  }

  if (!hasJoined) {
    return (
      <JoinRoomScreen
        name={name}
        isJoining={isJoining}
        onNameChange={setName}
        onJoin={handleJoinRoom}
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

  const team1Players = room.players.filter((player) => player.team === "team1");

  const team2Players = room.players.filter((player) => player.team === "team2");

  const unassignedPlayers = room.players.filter(
    (player) => player.team === null,
  );

  const currentPlayer = room.players.find((player) => player.id === playerId);

  const isOwner = currentPlayer?.isOwner === true;

  const allPlayersConnected = room.players.every(
    (player) => player.isConnected,
  );

  const canStart =
    room.status === "lobby" &&
    team1Players.length === 2 &&
    team2Players.length === 2 &&
    allPlayersConnected;

  return (
    <main className="relative flex h-dvh w-screen flex-col items-center overflow-hidden">
      <div className="flex w-full max-w-lg flex-col items-center gap-10 p-4">
        <div className="flex w-full flex-col gap-6">
          <div className="relative flex min-h-23 w-full items-center justify-center gap-10 rounded-2xl bg-black/50 px-6 py-2">
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
              onClick={handleCopyRoomLink}
              className="mt-0.5 shrink-0"
            >
              <Copy />

              {hasCopied ? "Copiado" : "Copiar"}
            </Button>
          </div>
        </div>

        <div className="flex w-full flex-col items-center gap-6 lg:absolute lg:left-1/2 lg:top-1/2 lg:max-w-122 lg:-translate-x-1/2 lg:-translate-y-1/2">
          <TeamPanel
            title="Time 1"
            team="team1"
            players={team1Players}
            allPlayers={room.players}
            roomStatus={room.status}
            backgroundClassName="bg-chart-2"
            buttonClassName="aspect-square bg-primary shadow-[0_4px_0_#9a003a]"
            onSelectTeam={handleSelectTeam}
          />

          <span className="text-5xl" aria-hidden="true">
            ⚔️
          </span>

          <TeamPanel
            title="Time 2"
            team="team2"
            players={team2Players}
            allPlayers={room.players}
            roomStatus={room.status}
            backgroundClassName="bg-primary"
            buttonClassName="aspect-square bg-chart-2 shadow-[0_4px_0_#004995]"
            onSelectTeam={handleSelectTeam}
          />
        </div>

        {isOwner && (
          <div className="flex flex-col w-full items-center justify-center gap-4 lg:absolute lg:bottom-14 lg:left-1/2 lg:max-w-lg lg:-translate-x-1/2">
            <div className="flex items-center gap-2">
              <Switch
                id="chat"
                checked={room.settings.chatEnabled}
                onCheckedChange={handleChatEnabledChange}
              />

              <Label htmlFor="chat">Chat da Partida</Label>

              <HoverCard open={chatTip} onOpenChange={setChatTip}>
                <HoverCardTrigger
                  delay={0}
                  render={
                    <button
                      type="button"
                      onClick={() => setChatTip((prev) => !prev)}
                    >
                      <CircleQuestionMark />
                    </button>
                  }
                />

                <HoverCardContent side="top">
                  Ative o chat caso os jogadores não estejam juntos
                  presencialmente ou em chamada.
                </HoverCardContent>
              </HoverCard>
            </div>
            <Button
              type="button"
              disabled={!canStart || isStarting}
              onClick={handleStartRoom}
              size="lg"
              className="w-full"
            >
              {isStarting ? (
                <Loader2 className="animate-spin" />
              ) : canStart ? (
                "Iniciar partida"
              ) : (
                "Aguardando"
              )}
            </Button>
          </div>
        )}
      </div>

      <Sunbeam />

      <span className="fixed text-xs bottom-2 text-white/50">
        Feito por{" "}
        <Link
          href="https://linkedin.com/in/ViniciusDutt"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold underline"
        >
          Vinícius Dutra
        </Link>
      </span>
    </main>
  );
}
