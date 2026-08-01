"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CreateRoomResponse } from "@/types/room";
import { socket } from "@/lib/socket";

export default function Home() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function handleCreateRoom() {
    const normalizedName = name.trim();

    if (normalizedName.length < 2) {
      return;
    }

    setIsLoading(true);

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit(
      "room:create",
      { name: normalizedName },
      (result: CreateRoomResponse) => {
        setIsLoading(false);

        if (!result.success) {
          return;
        }

        const { playerId, room } = result.data;

        sessionStorage.setItem(`room:${room.id}:playerId`, playerId);
        sessionStorage.setItem(`room:${room.id}:state`, JSON.stringify(room));

        router.push(`/room/${room.id}`);
      },
    );
  }

  return (
    <main>
      <h1>A Senha</h1>

      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Seu nome"
      />

      <button type="button" disabled={isLoading} onClick={handleCreateRoom}>
        {isLoading ? "Criando..." : "Criar sala"}
      </button>
    </main>
  );
}
