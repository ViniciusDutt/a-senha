"use client";

import { CircleQuestionMark, Copy, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
import type { Game } from "@/types/game";
import type {
  JoinRoomResponse,
  ReconnectRoomResponse,
  Room,
  SelectTeamResponse,
  StartRoomResponse,
  Team,
  UpdateRoomSettingsResponse,
  UpdateTeamsResponse,
} from "@/types/room";
import { sleep } from "@/utils/sleep";

type GameStartedPayload = {
  room: Room;
  game: Game;
};

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();

  const router = useRouter();
  const [countdown, setCountdown] = useState<string | null>(null);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [name, setName] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [chatTip, setChatTip] = useState(false);
  const [isResettingTeams, setIsResettingTeams] = useState(false);
  const [isRandomizingTeams, setIsRandomizingTeams] = useState(false);

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

    function handleGameCountdown() {
      void runCountdown();
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

    function handleGameStarted({
      room: startedRoom,
      game,
    }: GameStartedPayload) {
      saveRoom(startedRoom);

      sessionStorage.setItem(
        `room:${startedRoom.id}:game`,
        JSON.stringify(game),
      );

      router.push(`/room/${roomId}/game`);
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
    socket.on("game:countdown", handleGameCountdown);

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
      socket.off("game:countdown", handleGameCountdown);
    };
  }, [roomId, router.push]);

  async function runCountdown() {
    setIsStarting(true);
    setIsCountingDown(true);

    setCountdown("3");
    await sleep(1000);

    setCountdown("2");
    await sleep(1000);

    setCountdown("1");
    await sleep(1000);

    setCountdown("GO!");
    await sleep(1000);

    setCountdown(null);
    setIsCountingDown(false);
    setIsStarting(false);
  }

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
    if (isStarting || isCountingDown || !socket.connected || !canStart) {
      return;
    }

    setIsStarting(true);

    socket.emit(
      "room:start",
      {
        roomId,
      },
      (response: StartRoomResponse) => {
        if (!response.success) {
          setIsStarting(false);
          return;
        }

        const { room: updatedRoom, game } = response.data;

        setRoom(updatedRoom);

        sessionStorage.setItem(
          `room:${roomId}:state`,
          JSON.stringify(updatedRoom),
        );

        sessionStorage.setItem(`room:${roomId}:game`, JSON.stringify(game));
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

  function saveUpdatedRoom(updatedRoom: Room) {
    setRoom(updatedRoom);

    sessionStorage.setItem(
      `room:${updatedRoom.id}:state`,
      JSON.stringify(updatedRoom),
    );
  }

  function handleResetTeams() {
    if (
      !socket.connected ||
      !isOwner ||
      isResettingTeams ||
      isRandomizingTeams
    ) {
      return;
    }

    setIsResettingTeams(true);

    socket.emit(
      "room:reset-teams",
      {
        roomId,
      },
      (response: UpdateTeamsResponse) => {
        setIsResettingTeams(false);

        if (!response.success) {
          return;
        }

        saveUpdatedRoom(response.data.room);
      },
    );
  }

  function handleRandomizeTeams() {
    if (
      !socket.connected ||
      !isOwner ||
      room?.players.length !== 4 ||
      isResettingTeams ||
      isRandomizingTeams
    ) {
      return;
    }

    setIsRandomizingTeams(true);

    socket.emit(
      "room:randomize-teams",
      {
        roomId,
      },
      (response: UpdateTeamsResponse) => {
        setIsRandomizingTeams(false);

        if (!response.success) {
          return;
        }

        saveUpdatedRoom(response.data.room);
      },
    );
  }

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
            <Button
              type="button"
              variant="outline"
              disabled={
                isResettingTeams ||
                isRandomizingTeams ||
                room.players.every((player) => player.team === null)
              }
              onClick={handleResetTeams}
            >
              {isResettingTeams ? "Limpando..." : "Limpar times"}
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={
                room.players.length !== 4 ||
                isResettingTeams ||
                isRandomizingTeams
              }
              onClick={handleRandomizeTeams}
            >
              {isRandomizingTeams ? "Sorteando..." : "Sortear times"}
            </Button>
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
              disabled={!canStart || isStarting || isCountingDown}
              onClick={handleStartRoom}
              size="lg"
              className="flex-1"
            >
              {isCountingDown ? (
                "Iniciando..."
              ) : isStarting ? (
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
      <AnimatePresence>
        {countdown && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/80"
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={countdown}
                initial={{
                  opacity: 0,
                  scale: 5,
                  filter: "blur(24px)",
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  filter: "blur(0px)",
                }}
                exit={{
                  opacity: 0,
                  scale: 0.75,
                  filter: "blur(8px)",
                }}
                transition={{
                  duration: 0.45,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="select-none text-center font-black text-[clamp(8rem,30vw,24rem)] leading-none text-white"
              >
                {countdown}
              </motion.span>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
