import { Loader2 } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sunbeam } from "@/components/ui/sunbeam";
import { Author } from "../ui/author";
import { HowToPlayDialog } from "../how-to-play-dialog";

type JoinRoomScreenProps = {
  name: string;
  isJoining: boolean;
  error: string | null;
  onNameChange: (name: string) => void;
  onJoin: () => void;
  onClearError: () => void;
};

export function JoinRoomScreen({
  name,
  isJoining,
  error,
  onNameChange,
  onJoin,
  onClearError,
}: JoinRoomScreenProps) {
  return (
    <main className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden px-4 lg:px-10">
      <motion.div
        animate={{
          opacity: isJoining ? 0 : 1,
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
            disabled={isJoining}
            onChange={(event) => {
              onNameChange(event.target.value);
              onClearError();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onJoin();
              }
            }}
            placeholder="Digite seu nome"
          />

          {error && <p className="text-destructive text-sm">{error}</p>}

          <Button
            type="button"
            disabled={isJoining}
            onClick={onJoin}
            className="w-full"
            size="lg"
          >
            {isJoining ? <Loader2 className="animate-spin" /> : "Entrar"}
          </Button>
        </div>

        <Author />
      </motion.div>

      <Sunbeam />
    </main>
  );
}
