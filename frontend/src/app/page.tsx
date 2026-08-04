"use client";

import { CircleQuestionMark, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Author } from "@/components/ui/author";
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
import { socket } from "@/lib/socket";
import type { CreateRoomResponse } from "@/types/room";
import { sleep } from "@/utils/sleep";
import AdBanner from "@/components/ui/ad-banner";
import useScreenSize from "@/hooks/use-screen-size";

export default function Home() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const screenSize = useScreenSize()

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
    setTimeout(function () {
      var adsContainer = document.getElementsByClassName('adsContainer');
      var adsElement = document.getElementsByClassName('adsbygoogle');

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
  }, [])

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
            <div className=" max-h-[70vh] overflow-y-auto px-4">
              <div className="space-y-3">
                <DialogDescription>
                  <strong>A Senha</strong> é um jogo de raciocínio rápido e
                  trabalho em equipe disputado por dois times de duas pessoas.
                </DialogDescription>

                <DialogDescription>
                  A partida possui <strong>5 rodadas</strong>. Em cada rodada,
                  os dois times jogam separadamente, um de cada vez, e têm{" "}
                  <strong>30 segundos</strong> para acertar o maior número
                  possível de palavras, chamadas de senhas.
                </DialogDescription>

                <h3 className="font-semibold text-lg">
                  Como funciona uma rodada
                </h3>

                <DialogDescription>
                  Em cada dupla, uma pessoa será responsável por dar as dicas e
                  a outra deverá tentar descobrir a senha.
                </DialogDescription>

                <DialogDescription>
                  A pessoa que dá as dicas pode falar apenas{" "}
                  <strong>uma palavra por vez</strong>, sempre relacionada à
                  senha. Depois de cada dica, seu parceiro pode tentar
                  responder.
                </DialogDescription>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Exemplo</h3>

                <DialogDescription>
                  A senha é: <strong>Cabide</strong>
                </DialogDescription>

                <DialogDescription>
                  Dica: <strong>Roupa</strong>
                </DialogDescription>

                <DialogDescription>
                  Resposta: <strong>Camisa</strong>
                </DialogDescription>

                <DialogDescription>
                  Nova dica: <strong>Pendurar</strong>
                </DialogDescription>

                <DialogDescription>
                  Resposta: <strong>Cabide</strong>
                </DialogDescription>

                <DialogDescription>
                  A dupla marca um ponto e recebe a próxima senha.
                </DialogDescription>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Regras das dicas</h3>

                <ul className="list-disc space-y-2 pl-5 text-muted-foreground text-sm">
                  <li>Cada dica deve conter apenas uma palavra.</li>
                  <li>A pessoa não pode falar a própria senha.</li>
                  <li>
                    Não é permitido falar parte da senha ou uma variação muito
                    próxima.
                  </li>
                  <li>A dica deve ter alguma relação com a senha.</li>
                  <li>
                    Não é permitido soletrar, fazer gestos ou indicar letras.
                  </li>
                  <li>
                    É possível dar várias dicas para a mesma senha, desde que
                    sejam faladas uma de cada vez.
                  </li>
                  <li>
                    Caso a dupla fique presa em uma senha, a pessoa que dá as
                    dicas pode pulá-la e seguir para a próxima.
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Pontuação</h3>

                <DialogDescription>
                  Cada senha acertada dentro dos 30 segundos vale{" "}
                  <strong>1 ponto</strong>.
                </DialogDescription>

                <DialogDescription>
                  Depois que os dois times jogarem, vence a rodada o time que
                  tiver acertado mais senhas.
                </DialogDescription>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Troca de funções</h3>

                <DialogDescription>
                  A cada nova rodada, os jogadores da dupla trocam de função:
                </DialogDescription>

                <ul className="list-disc space-y-2 pl-5 text-muted-foreground text-sm">
                  <li>quem deu as dicas passa a responder;</li>
                  <li>quem respondeu passa a dar as dicas.</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Vitória</h3>

                <DialogDescription>
                  Depois das 5 rodadas, vence o time que tiver conquistado mais
                  rodadas.
                </DialogDescription>

                <DialogDescription>
                  Em caso de empate no placar final, uma rodada extra de
                  desempate poderá ser disputada.
                </DialogDescription>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
