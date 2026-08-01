import { CircleQuestionMark, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sunbeam } from "@/components/ui/sunbeam";

type JoinRoomScreenProps = {
  name: string;
  isJoining: boolean;
  onNameChange: (name: string) => void;
  onJoin: () => void;
};

export function JoinRoomScreen({
  name,
  isJoining,
  onNameChange,
  onJoin,
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
        <Image src="/logo.svg" alt="A Senha Logo" width={256} height={56} />

        <Dialog>
          <DialogTrigger
            render={
              <Button variant="ghost">
                <CircleQuestionMark />
                Como jogar
              </Button>
            }
          />

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Como jogar</DialogTitle>
            </DialogHeader>

            <div className="max-h-[70vh] space-y-3 overflow-y-auto px-4">
              <DialogDescription>
                <strong>A Senha</strong> é um jogo de raciocínio rápido e
                trabalho em equipe disputado por dois times de duas pessoas.
              </DialogDescription>

              <DialogDescription>
                Cada dupla possui uma pessoa responsável pelas dicas e outra
                responsável por descobrir as senhas.
              </DialogDescription>

              <DialogDescription>
                Cada dica pode conter apenas uma palavra relacionada à senha.
              </DialogDescription>
            </div>
          </DialogContent>
        </Dialog>

        <div className="flex w-full max-w-lg flex-col items-center gap-4">
          <Input
            value={name}
            disabled={isJoining}
            onChange={(event) => onNameChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onJoin();
              }
            }}
            placeholder="Digite seu nome"
          />

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
      </motion.div>

      <Sunbeam />
    </main>
  );
}
