import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Star } from "lucide-react";

interface CelebrationOverlayProps {
  isVisible: boolean;
  onComplete: () => void;
}

export const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({
  isVisible,
  onComplete,
}) => {
  const [audio] = useState(new Audio("https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3"));

  useEffect(() => {
    if (isVisible) {
      // Configurar e tocar áudio
      audio.volume = 0.5;
      audio.currentTime = 0;
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.error("Erro ao reproduzir áudio:", error);
        });
      }

      // Timer para encerrar a animação
      const timer = setTimeout(() => {
        onComplete();
      }, 3500);

      return () => clearTimeout(timer);
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [isVisible, onComplete, audio]);

  // Partículas para o efeito de explosão
  const particles = Array.from({ length: 20 });

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          {/* Background Overlay */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Explosão de Luz de Fundo */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: [0, 1.5, 2], 
              opacity: [0, 0.8, 0] 
            }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute w-[600px] h-[600px] bg-gradient-radial from-yellow-400/40 to-transparent rounded-full blur-3xl"
          />

          {/* Partículas */}
          {particles.map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                x: 0, 
                y: 0, 
                scale: 0 
              }}
              animate={{ 
                x: (Math.random() - 0.5) * 800, 
                y: (Math.random() - 0.5) * 800, 
                scale: [0, 1, 0],
                rotate: Math.random() * 360
              }}
              transition={{ 
                duration: 2, 
                ease: "easeOut",
                delay: 0.1 
              }}
              className="absolute"
            >
              <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
            </motion.div>
          ))}

          {/* Conteúdo Central */}
          <div className="relative flex flex-col items-center justify-center">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                type: "spring", 
                stiffness: 200, 
                damping: 15,
                delay: 0.2 
              }}
              className="relative"
            >
              {/* Círculo brilhante atrás do troféu */}
              <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-xl animate-pulse" />
              
              <div className="relative bg-gradient-to-br from-yellow-300 to-yellow-600 p-8 rounded-full shadow-[0_0_50px_rgba(234,179,8,0.5)] border-4 border-yellow-200">
                <Trophy className="w-24 h-24 text-white drop-shadow-lg" strokeWidth={1.5} />
              </div>
            </motion.div>

            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="mt-8 text-center"
            >
              <h2 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200 drop-shadow-sm filter">
                Venda Realizada!
              </h2>
              <p className="text-white/80 mt-2 text-xl font-medium tracking-wide">
                Parabéns pela conquista
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};




