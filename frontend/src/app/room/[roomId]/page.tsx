"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { socket } from "@/lib/socket";
import type {
  JoinRoomResponse,
  ReconnectRoomResponse,
  Room,
  SelectTeamResponse,
  StartRoomResponse,
  Team,
} from "@/types/room";

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [name, setName] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);

  useEffect(() => {
    const storedPlayerId = sessionStorage.getItem(`room:${roomId}:playerId`);

    const storedRoom = sessionStorage.getItem(`room:${roomId}:state`);

    setPlayerId(storedPlayerId);

    if (storedRoom) {
      setRoom(JSON.parse(storedRoom) as Room);
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

      // Temporário, até criarmos a tela da partida.
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

    if (normalizedName.length < 2) {
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
        (response: JoinRoomResponse) => {
          setIsJoining(false);

          if (!response.success) {
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

          setPlayerId(joinedPlayerId);
          setRoom(joinedRoom);
          setHasJoined(true);
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
    if (isStarting) {
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

  if (!hasJoined) {
    return (
      <main>
        <h1>Entrar na sala</h1>

        <p>Sala: {roomId}</p>

        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Seu nome"
        />

        <button type="button" disabled={isJoining} onClick={handleJoinRoom}>
          {isJoining ? "Entrando..." : "Entrar"}
        </button>
      </main>
    );
  }

  if (!room) {
    return (
      <main>
        <p>Carregando sala...</p>
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
    <main>
      <h1>Lobby</h1>

      <p>Sala: {room.id}</p>
      <p>Status: {room.status}</p>

      <section>
        <h2>Sem time</h2>

        <ul>
          {unassignedPlayers.map((player) => (
            <li key={player.id}>
              {player.name}
              {player.isOwner ? " 👑" : ""}
              {!player.isConnected ? " — reconectando..." : ""}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Time 1</h2>

        <ul>
          {team1Players.map((player) => (
            <li key={player.id}>
              {player.name}
              {player.isOwner ? " 👑" : ""}
              {!player.isConnected ? " — reconectando..." : ""}
            </li>
          ))}
        </ul>

        <button
          type="button"
          disabled={room.status !== "lobby" || team1Players.length >= 2}
          onClick={() => handleSelectTeam("team1")}
        >
          Entrar no Time 1
        </button>
      </section>

      <section>
        <h2>Time 2</h2>

        <ul>
          {team2Players.map((player) => (
            <li key={player.id}>
              {player.name}
              {player.isOwner ? " 👑" : ""}
              {!player.isConnected ? " — reconectando..." : ""}
            </li>
          ))}
        </ul>

        <button
          type="button"
          disabled={room.status !== "lobby" || team2Players.length >= 2}
          onClick={() => handleSelectTeam("team2")}
        >
          Entrar no Time 2
        </button>
      </section>

      {isOwner && (
        <button
          type="button"
          disabled={!canStart || isStarting}
          onClick={handleStartRoom}
        >
          {isStarting
            ? "Iniciando..."
            : canStart
              ? "Iniciar partida"
              : "Aguardando os dois times"}
        </button>
      )}
    </main>
  );
}
