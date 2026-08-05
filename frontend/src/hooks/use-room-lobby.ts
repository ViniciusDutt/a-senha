"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { socket } from "@/lib/socket";
import type { Game } from "@/types/game";
import type {
  JoinRoomResponse,
  Player,
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

type UseRoomLobbyResult = {
  room: Room | null;
  playerId: string | null;
  currentPlayer: Player | undefined;

  name: string;
  setName: (name: string) => void;

  hasJoined: boolean;
  isJoining: boolean;
  isStarting: boolean;
  isCountingDown: boolean;
  isResettingTeams: boolean;
  isRandomizingTeams: boolean;

  countdown: string | null;

  team1Players: Player[];
  team2Players: Player[];
  unassignedPlayers: Player[];

  isOwner: boolean;
  canStart: boolean;

  error: string | null;
  clearError: () => void;

  joinRoom: () => void;
  selectTeam: (team: Team) => void;
  startRoom: () => void;
  resetTeams: () => void;
  randomizeTeams: () => void;
  updateChatEnabled: (enabled: boolean) => void;
};

export function useRoomLobby(roomId: string): UseRoomLobbyResult {
  const router = useRouter();

  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [hasJoined, setHasJoined] = useState(false);

  const [isJoining, setIsJoining] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(false);

  const [isResettingTeams, setIsResettingTeams] = useState(false);

  const [isRandomizingTeams, setIsRandomizingTeams] = useState(false);

  const [countdown, setCountdown] = useState<string | null>(null);

  const saveRoom = useCallback((updatedRoom: Room) => {
    setRoom(updatedRoom);

    localStorage.setItem(
      `room:${updatedRoom.id}:state`,
      JSON.stringify(updatedRoom),
    );
  }, []);

  const [error, setError] = useState<string | null>(null);

  const clearStoredRoom = useCallback(() => {
    localStorage.removeItem(`room:${roomId}:playerId`);

    localStorage.removeItem(`room:${roomId}:state`);

    localStorage.removeItem(`room:${roomId}:game`);
  }, [roomId]);

  const resetPlayerSession = useCallback(() => {
    clearStoredRoom();

    setPlayerId(null);
    setRoom(null);
    setHasJoined(false);
  }, [clearStoredRoom]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const runCountdown = useCallback(async () => {
    setIsStarting(true);
    setIsCountingDown(true);

    const countingAudio = new Audio("/counting.m4a");
    const goAudio = new Audio("/go.m4a");

    setCountdown("3");
    void countingAudio.play();
    await sleep(1_000);

    setCountdown("2");
    void countingAudio.play();
    await sleep(1_000);

    setCountdown("1");
    void countingAudio.play();
    await sleep(1_000);

    setCountdown("GO!");
    void goAudio.play();
    await sleep(1_000);

    setCountdown(null);
    setIsCountingDown(false);
    setIsStarting(false);
  }, []);

  useEffect(() => {
    const storedPlayerId = localStorage.getItem(`room:${roomId}:playerId`);

    const storedRoom = localStorage.getItem(`room:${roomId}:state`);

    setPlayerId(storedPlayerId);

    if (storedRoom) {
      try {
        setRoom(JSON.parse(storedRoom) as Room);
      } catch {
        localStorage.removeItem(`room:${roomId}:state`);
      }
    }

    function handleRoomUpdated(updatedRoom: Room) {
      saveRoom(updatedRoom);
    }

    function handleGameCountdown() {
      void runCountdown();
    }

    function handleGameStarted({
      room: startedRoom,
      game,
    }: GameStartedPayload) {
      saveRoom(startedRoom);

      localStorage.setItem(`room:${startedRoom.id}:game`, JSON.stringify(game));

      router.push(`/room/${startedRoom.id}/game`);
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
            resetPlayerSession();
            return;
          }

          saveRoom(response.data.room);
          setPlayerId(response.data.playerId);
          setHasJoined(true);
        },
      );
    }

    socket.on("room:updated", handleRoomUpdated);

    socket.on("game:countdown", handleGameCountdown);

    socket.on("game:started", handleGameStarted);

    if (storedPlayerId) {
      setHasJoined(true);

      socket.on("connect", reconnectPlayer);

      if (socket.connected) {
        reconnectPlayer();
      } else {
        socket.connect();
      }
    }

    return () => {
      socket.off("room:updated", handleRoomUpdated);

      socket.off("game:countdown", handleGameCountdown);

      socket.off("game:started", handleGameStarted);

      socket.off("connect", reconnectPlayer);
    };
  }, [roomId, router, runCountdown, saveRoom, resetPlayerSession]);

  const joinRoom = useCallback(() => {
    const normalizedName = name.trim();

    if (normalizedName.length < 2 || isJoining) {
      return;
    }

    setIsJoining(true);

    function emitJoinRoom() {
      socket.emit(
        "room:join",
        {
          roomId,
          name: normalizedName,
        },
        async (response: JoinRoomResponse) => {
          if (!response.success) {
            setError(response.message);
            setIsJoining(false);
            return;
          }

          const { playerId: joinedPlayerId, room: joinedRoom } = response.data;

          localStorage.setItem(
            `room:${joinedRoom.id}:playerId`,
            joinedPlayerId,
          );

          saveRoom(joinedRoom);

          await sleep(300);

          setPlayerId(joinedPlayerId);
          setHasJoined(true);
          setIsJoining(false);
        },
      );
    }

    if (socket.connected) {
      emitJoinRoom();
      return;
    }

    socket.connect();
    socket.once("connect", emitJoinRoom);
  }, [isJoining, name, roomId, saveRoom]);

  const selectTeam = useCallback(
    (team: Team) => {
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

          saveRoom(response.data.room);
        },
      );
    },
    [roomId, saveRoom],
  );

  const updateChatEnabled = useCallback(
    (enabled: boolean) => {
      if (!socket.connected) {
        return;
      }

      socket.emit(
        "room:update-settings",
        {
          roomId,
          chatEnabled: enabled,
        },
        (response: UpdateRoomSettingsResponse) => {
          if (!response.success) {
            return;
          }

          saveRoom(response.data.room);
        },
      );
    },
    [roomId, saveRoom],
  );

  const currentPlayer = useMemo(
    () => room?.players.find((player) => player.id === playerId),
    [playerId, room],
  );

  const team1Players = useMemo(
    () => room?.players.filter((player) => player.team === "team1") ?? [],
    [room],
  );

  const team2Players = useMemo(
    () => room?.players.filter((player) => player.team === "team2") ?? [],
    [room],
  );

  const unassignedPlayers = useMemo(
    () => room?.players.filter((player) => player.team === null) ?? [],
    [room],
  );

  const isOwner = currentPlayer?.isOwner === true;

  const allPlayersConnected =
    room?.players.every((player) => player.isConnected) ?? false;

  const canStart =
    room?.status === "lobby" &&
    team1Players.length === 2 &&
    team2Players.length === 2 &&
    allPlayersConnected;

  const startRoom = useCallback(() => {
    if (!socket.connected || !canStart || isStarting || isCountingDown) {
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

        saveRoom(updatedRoom);

        localStorage.setItem(`room:${roomId}:game`, JSON.stringify(game));
      },
    );
  }, [canStart, isCountingDown, isStarting, roomId, saveRoom]);

  const resetTeams = useCallback(() => {
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

        saveRoom(response.data.room);
      },
    );
  }, [isOwner, isRandomizingTeams, isResettingTeams, roomId, saveRoom]);

  const randomizeTeams = useCallback(() => {
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

        saveRoom(response.data.room);
      },
    );
  }, [isOwner, isRandomizingTeams, isResettingTeams, room, roomId, saveRoom]);

  return {
    room,
    playerId,
    currentPlayer,

    name,
    setName,

    hasJoined,
    isJoining,
    isStarting,
    isCountingDown,
    isResettingTeams,
    isRandomizingTeams,

    countdown,

    team1Players,
    team2Players,
    unassignedPlayers,

    isOwner,
    canStart,

    error,
    clearError,

    joinRoom,
    selectTeam,
    startRoom,
    resetTeams,
    randomizeTeams,
    updateChatEnabled,
  };
}
