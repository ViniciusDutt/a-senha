"use client";

import { Loader2 } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AdBanner from "@/components/ui/ad-banner";
import { Author } from "@/components/ui/author";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useScreenSize from "@/hooks/use-screen-size";
import { socket } from "@/lib/socket";
import type { CreateRoomResponse } from "@/types/room";
import { sleep } from "@/utils/sleep";
import { HowToPlayDialog } from "@/components/how-to-play-dialog";

export default function Home() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const screenSize = useScreenSize();

  function handleCreateRoom() {
    const normalizedName = name.trim();

    if (normalizedName.length < 2 || isLoading) {
      return;
    }

    setIsLoading(true);

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit(
      "room:create",
      { name: normalizedName },
      async (result: CreateRoomResponse) => {
        if (!result.success) {
          setIsLoading(false);
          return;
        }

        const { playerId, room } = result.data;

        localStorage.setItem(`room:${room.id}:playerId`, playerId);
        localStorage.setItem(`room:${room.id}:state`, JSON.stringify(room));

        await sleep(300);

        router.push(`/room/${room.id}`);
      },
    );
  }

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

  return (
    <main className="flex h-screen w-screen flex-col items-center justify-center px-4 lg:px-10">
      {screenSize.width < 768 ? (
        <div className="adsContainer">
          <AdBanner
            className="absolute top-1 left-1/2 -translate-x-1/2 rounded-xl w-76 h-13.5"
            dataAdFormat="auto"
            dataAdSlot="5034311157"
            dataFullWidthResponsive={false}
          />
        </div>
      ) : screenSize.width >= 768 && screenSize.width < 1024 ? (
        <div className="adsContainer">
          <AdBanner
            className="absolute top-1 left-1/2 -translate-x-1/2 rounded-xl w-183 h-23.5"
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

      <motion.div
        animate={{
          opacity: isLoading ? 0 : 1,
        }}
        transition={{
          duration: 0.3,
          ease: "easeInOut",
        }}
        className="flex w-full flex-col items-center gap-10"
      >
        <Image
          loading="eager"
          src="/logo.svg"
          alt="A Senha Logo"
          width={256}
          height={80}
        />

        <HowToPlayDialog />

        <div className="flex w-full max-w-lg flex-col items-center gap-4">
          <Input
            value={name}
            disabled={isLoading}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleCreateRoom();
              }
            }}
            placeholder="Digite seu nome"
          />

          <Button
            type="button"
            disabled={isLoading}
            onClick={handleCreateRoom}
            className="w-full"
            size="lg"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : "Criar sala"}
          </Button>
        </div>

        <Author />
      </motion.div>
    </main>
  );
}
