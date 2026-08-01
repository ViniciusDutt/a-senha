import { Button } from "@/components/ui/button";

type WaitingTurnPanelProps = {
  isClueGiver: boolean;
  isStartingTurn: boolean;
  onStartTurn: () => void;
};

export function WaitingTurnPanel({
  isClueGiver,
  isStartingTurn,
  onStartTurn,
}: WaitingTurnPanelProps) {
  return (
    <section className="flex flex-col items-center gap-4 rounded-2xl bg-black/50 p-6">
      <p className="text-center text-white/70">O turno ainda não começou.</p>

      {isClueGiver && (
        <Button
          type="button"
          size="lg"
          disabled={isStartingTurn}
          onClick={onStartTurn}
        >
          {isStartingTurn ? "Iniciando..." : "Começar turno"}
        </Button>
      )}
    </section>
  );
}
