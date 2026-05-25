import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import escudoImg from '../escudo.svg';

interface IntroAnimationProps {
  onComplete: () => void;
}

export default function IntroAnimation({ onComplete }: IntroAnimationProps) {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Elegant incremental progress simulation
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        // Starts fast, slows down at the end for an organic feel
        const step = prev < 60 ? Math.random() * 15 + 10 : Math.random() * 5 + 2;
        return Math.min(100, prev + step);
      });
    }, 120);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress === 100) {
      // Small delay at 100% for readability before dismiss
      const timeout = setTimeout(() => {
        setIsExiting(true);
        const exitTimeout = setTimeout(() => {
          onComplete();
        }, 800); // Exiting animation duration
        return () => clearTimeout(exitTimeout);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [progress, onComplete]);

  // Letters for the staggered reveal of the main title
  const titleText = "DR. ERICK RADAÍ ROJAS";
  const titleLetters = titleText.split("");

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          id="intro-animation-screen"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 text-white overflow-hidden select-none"
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            y: -40,
            clipPath: 'polygon(0 0, 100% 0, 100% 0, 0 0)',
            transition: { duration: 0.8, ease: [0.77, 0, 0.175, 1] } 
          }}
        >
          {/* Subtle math grid & glow effects */}
          <div className="absolute inset-0 pointer-events-none opacity-20">
            {/* Elegant grid background */}
            <div 
              className="absolute inset-0" 
              style={{
                backgroundImage: 'radial-gradient(circle, #3b82f6 1px, transparent 1px), linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)',
                backgroundSize: '40px 40px, 40px 40px, 40px 40px',
                backgroundPosition: 'center center'
              }}
            />
            {/* Soft background blue ambient glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-900/10 to-blue-900/15 rounded-full blur-[120px]" />
          </div>

          <div className="relative flex flex-col items-center text-center max-w-lg px-4 space-y-8 z-10">
            
            {/* Shield with complex spinning concentric rings */}
            <div className="relative flex items-center justify-center">
              {/* Outer decorative orbit */}
              <motion.div 
                className="absolute w-32 h-32 rounded-full border border-dashed border-indigo-500/30"
                animate={{ rotate: 360 }}
                transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
              />
              
              {/* Mid ring with double colored dashes */}
              <motion.div 
                className="absolute w-28 h-28 rounded-full border-2 border-dashed border-indigo-400/50 border-t-transparent border-b-transparent"
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
              />

              {/* Inner ambient flare */}
              <motion.div 
                className="absolute w-24 h-24 rounded-full bg-indigo-500/10 blur-md"
                animate={{ scale: [0.9, 1.1, 0.9] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Centered Avatar/Shield */}
              <motion.div
                className="relative w-20 h-20 bg-slate-900 rounded-2xl border border-slate-800/80 p-3.5 flex items-center justify-center shadow-2xl"
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.8, ease: 'easeOut' }}
              >
                <img 
                  src={escudoImg} 
                  alt="Escudo UMSNH" 
                  className="h-full w-auto object-contain filter drop-shadow-md select-none"
                  referrerPolicy="no-referrer"
                />
              </motion.div>
            </div>

            {/* University Tagline */}
            <motion.div 
              className="text-[9px] font-mono tracking-[0.25em] text-indigo-400 uppercase font-bold"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              Universidad Michoacana de San Nicolás de Hidalgo
            </motion.div>

            {/* Main Staggered Name Reveal */}
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-display font-black tracking-wider text-white">
                {titleLetters.map((char, index) => (
                  <motion.span
                    key={index}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.6 + index * 0.03,
                      duration: 0.4,
                      ease: 'easeOut'
                    }}
                    className={char === " " ? "inline-block w-2" : "inline-block"}
                  >
                    {char}
                  </motion.span>
                ))}
              </h1>

              {/* Interactive subtitle */}
              <motion.p
                className="text-[11px] font-mono text-slate-400 tracking-[0.1em] uppercase block"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4, duration: 0.8 }}
              >
                PROFESOR-INVESTIGADOR TITULAR
              </motion.p>
            </div>

            {/* Loading / Progress system details */}
            <div className="w-56 space-y-2 pt-4">
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                <span>CONECTANDO PORTAL ACADÉMICO</span>
                <span className="text-indigo-400 font-bold">{Math.round(progress)}%</span>
              </div>
              
              {/* Outer bar */}
              <div className="h-[3px] w-full bg-slate-800 rounded-full overflow-hidden relative">
                {/* Inner active progress indicator */}
                <motion.div 
                  className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-indigo-600 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Status micro lines */}
              <div className="h-4 overflow-hidden relative text-center">
                <AnimatePresence mode="wait">
                  {progress < 40 ? (
                    <motion.span 
                      key="st1" 
                      className="text-[9px] font-mono text-slate-600 uppercase tracking-wider block"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                    >
                      Cargando módulos interactivos...
                    </motion.span>
                  ) : progress < 75 ? (
                    <motion.span 
                      key="st2" 
                      className="text-[9px] font-mono text-slate-600 uppercase tracking-wider block"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                    >
                      Iniciando simuladores pedagógicos...
                    </motion.span>
                  ) : (
                    <motion.span 
                      key="st3" 
                      className="text-[9px] font-mono text-indigo-400/80 uppercase tracking-wider block font-bold"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                    >
                      Sistema listo para visualización.
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>

          </div>

          {/* Decorative design corner marks */}
          <div className="absolute top-8 left-8 w-6 h-6 border-t border-l border-slate-800 pointer-events-none" />
          <div className="absolute top-8 right-8 w-6 h-6 border-t border-r border-slate-800 pointer-events-none" />
          <div className="absolute bottom-8 left-8 w-6 h-6 border-b border-l border-slate-800 pointer-events-none" />
          <div className="absolute bottom-8 right-8 w-6 h-6 border-b border-r border-slate-800 pointer-events-none" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
