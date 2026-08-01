"use client";

import { AnimatePresence, motion } from "motion/react";

type GameCountdownOverlayProps = {
  countdown: string | null;
};

export function GameCountdownOverlay({ countdown }: GameCountdownOverlayProps) {
  return (
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
  );
}
