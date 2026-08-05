"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { socket } from "@/lib/socket";

export function WordResultFlash() {
  const [flash, setFlash] = useState<"correct" | "skip" | null>(null);

  useEffect(() => {
    function handleWordResult(payload: { isCorrect: boolean }) {
      setFlash(payload.isCorrect ? "correct" : "skip");
      setTimeout(() => setFlash(null), 500); // Flash duration
    }

    socket.on("game:word-result", handleWordResult);

    return () => {
      socket.off("game:word-result", handleWordResult);
    };
  }, []);

  return (
    <AnimatePresence>
      {flash && (
        <motion.div
          initial={{ opacity: 0.3 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className={`fixed inset-0 z-50 flex items-center justify-center pointer-events-none ${
            flash === "correct" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          <span className="text-7xl font-bold text-white">
            {flash === "correct" ? "Acertou!" : "Pulou"}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
