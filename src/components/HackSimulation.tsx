import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, ShieldAlert, Cpu, Database, Wifi, Globe, Server, AlertTriangle, Key } from 'lucide-react';
import { detectOSAndBrowser } from '../utils/visitorDetector';

interface HackSimulationProps {
  isOpen: boolean;
  onClose: () => void;
}

// Simple and highly effective Web Audio API synthesizer for retro sound effects
class SoundFX {
  private ctx: AudioContext | null = null;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  // Soft keyboard tick sound
  playTick() {
    try {
      this.init();
      if (!this.ctx) return;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, this.ctx.currentTime);
      
      gain.gain.setValueAtTime(0.015, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.04);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch (e) {
      // Ignored if browser blocks audio
    }
  }

  // Positive access beep
  playAccessBeep() {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      // First beep
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.frequency.setValueAtTime(880, t);
      gain1.gain.setValueAtTime(0.05, t);
      gain1.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(t);
      osc1.stop(t + 0.16);

      // Second beep slightly offset
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.frequency.setValueAtTime(1200, t + 0.1);
      gain2.gain.setValueAtTime(0.06, t + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(t + 0.1);
      osc2.stop(t + 0.26);
    } catch (e) {}
  }

  // Dial up/Encryption noise
  playTunnelNoise() {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, t);
      // Random frequency sliding for a classic hacking modem vibe
      osc.frequency.linearRampToValueAtTime(800, t + 0.2);
      osc.frequency.linearRampToValueAtTime(400, t + 0.4);
      osc.frequency.linearRampToValueAtTime(1500, t + 0.6);
      osc.frequency.linearRampToValueAtTime(300, t + 0.8);
      osc.frequency.linearRampToValueAtTime(120, t + 1.2);

      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(t + 1.4);
    } catch (e) {}
  }

  // Warning Siren
  playEmergencySiren(durationSec: number) {
    try {
      this.init();
      if (!this.ctx) return null;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      
      // Control pitch over time (classic alarm frequency oscilation)
      let t = this.ctx.currentTime;
      const step = 0.4;
      for (let i = 0; i < durationSec / step; i++) {
        osc.frequency.linearRampToValueAtTime(i % 2 === 0 ? 880 : 440, t + (i+1) * step);
      }
      
      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.04, this.ctx.currentTime + durationSec - 0.2);
      gain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + durationSec);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + durationSec);
      
      return osc;
    } catch (e) {
      return null;
    }
  }

  // Shutdown Power Down frequency sweep
  playPowerDown() {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(10, t + 1.5);
      
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(t + 1.6);
    } catch (e) {}
  }
}

const sfx = new SoundFX();

export default function HackSimulation({ isOpen, onClose }: HackSimulationProps) {
  const [phase, setPhase] = useState<'boot' | 'login' | 'breach' | 'countdown' | 'crash'>('boot');
  const [logs, setLogs] = useState<string[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [countdown, setCountdown] = useState(5);
  const [shaking, setShaking] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const matrixCanvasRef = useRef<HTMLCanvasElement>(null);

  const stats = detectOSAndBrowser();

  // Scroll terminal logs to bottom when updated
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Matrix code rain animation background
  useEffect(() => {
    if (!isOpen || phase !== 'boot' && phase !== 'login' && phase !== 'countdown') return;
    const canvas = matrixCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const katakana = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZπ";
    const alphabet = katakana.split("");

    const fontSize = 14;
    const columns = canvas.width / fontSize;

    const rainDrops: number[] = [];

    for (let x = 0; x < columns; x++) {
      rainDrops[x] = 1;
    }

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#0f0'; // green text
      ctx.font = fontSize + 'px monospace';

      for (let i = 0; i < rainDrops.length; i++) {
        const text = alphabet[Math.floor(Math.random() * alphabet.length)];
        ctx.fillText(text, i * fontSize, rainDrops[i] * fontSize);

        if (rainDrops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          rainDrops[i] = 0;
        }
        rainDrops[i]++;
      }
    };

    const interval = setInterval(draw, 30);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, phase]);

  // Phase 1: Boot Sequencer Simulation
  useEffect(() => {
    if (!isOpen) return;
    
    // Reset state
    setPhase('boot');
    setLogs([]);
    setUsername('');
    setPassword('');
    setCountdown(5);
    setShaking(false);

    // Initialize Web Audio user trust
    sfx.init();

    const sequence = [
      { text: "INICIANDO PUENTE SEGURO DE ENRUTAMIENTO CEBOLLA... [TOR BRIDGE ACTIVE]", delay: 100 },
      { text: `SISTEMA LOCAL DETECTADO: UNIDAD ${stats.machineName} (${stats.os})`, delay: 500 },
      { text: "ESTABLECIENDO HANDSHAKE EN CAPA DE SEGURIDAD SSL 4096-BIT...", delay: 900 },
      { text: "ROUTING TRAFFIC THROUGH PARALLEL VPS PROXIES [MEX - CHE - ROU - SGP]", delay: 1400 },
      { text: "VINCULANDO ENTRADAS CON IP CENTRAL: 104.244.42.1 [ENCRIPTADO]", delay: 1800 },
      { text: "BYPASSING DISPOSITIVOS FIREWALL DE PREVENCIÓN DE INTRUSIONES...", delay: 2200 },
      { text: "CONEXIÓN EXITOSA. ACCEDIENDO AL SERVIDOR CENTRAL DE LA RED OSCURA...", delay: 2800 }
    ];

    let timerAccumulator = 0;

    // Fast tunneling modem noise synthesizer at the beginning
    setTimeout(() => {
      sfx.playTunnelNoise();
    }, 200);

    sequence.forEach((item) => {
      setTimeout(() => {
        setLogs(prev => [...prev, `[SYS]: ${item.text}`]);
        sfx.playTick();
      }, item.delay);
      timerAccumulator = Math.max(timerAccumulator, item.delay);
    });

    // Advance to Login Phase
    setTimeout(() => {
      setPhase('login');
      sfx.playAccessBeep();
    }, timerAccumulator + 800);

  }, [isOpen]);

  // Phase 2: Autonomous Login Injection Simulation
  useEffect(() => {
    if (phase !== 'login') return;

    // Simular mecanografiado automático (Auto typing of credentials)
    const userStr = 'anonymous_agent_2026';
    const passStr = '•••••••••••••••••••••';

    let userIndex = 0;
    const typeUser = setInterval(() => {
      if (userIndex < userStr.length) {
        setUsername(prev => prev + userStr[userIndex]);
        sfx.playTick();
        userIndex++;
      } else {
        clearInterval(typeUser);
        
        // Start typing password after user completes
        let passIndex = 0;
        const typePass = setInterval(() => {
          if (passIndex < passStr.length) {
            setPassword(prev => prev + passStr[passIndex]);
            sfx.playTick();
            passIndex++;
          } else {
            clearInterval(typePass);
            // Submit simulation!
            setTimeout(() => {
              sfx.playAccessBeep();
              setLogs(prev => [...prev, "[OK]: USUARIO AUTENTICADO COMO ROOT EN EL ENLACE OSCURO."]);
              setTimeout(() => {
                setPhase('breach');
              }, 600);
            }, 500);
          }
        }, 120);
      }
    }, 100);

    return () => {
      clearInterval(typeUser);
    };
  }, [phase]);

  // Phase 3 & 4: BREACH! (Flashing red lights and Warning sequence)
  useEffect(() => {
    if (phase !== 'breach') return;

    // Siren alarm sound triggers
    const sirenOsc = sfx.playEmergencySiren(12);

    const breachSequence = [
      { text: "💥 ADVERTENCIA CRIMINAL INTERNA: ACCESO NO AUTORIZADO DETECTADO", delay: 100 },
      { text: "💥 SEÑAL DE INTRUSIÓN REPORTADA AL DEPARTAMENTO DE SEGURIDAD", delay: 400 },
      { text: "🚨 CORRIENDO ALGORITMO EXPLOIT DE RETROALIMENTACIÓN CONTRA LA MÁQUINA DE ORIGEN...", delay: 1000 },
      { text: "🔍 EXTRACCION DE HASH HARDWARE COMPLETO: ADQUIRIDO.", delay: 1800 },
      { text: `⚠️ EQUIPO VULNERADO: ${stats.machineName}`, delay: 2400 },
      { text: `⚠️ DIRECCION IP DE TRÁFICO SECUESTRADA: VINCULADA AL NÚCLEO LOCAL`, delay: 3000 },
      { text: "💾 DESCARGANDO HISTORIAL DE CONSULTAS LOCALES... [100% COMPLETADO]", delay: 3700 },
      { text: "🌐 ESCANEANDO CLAVES DE CACHÉ DEL NAVEGADOR: EXPUESTOS (RECURSOS DE LECTURA COMPLETADOS)", delay: 4400 },
      { text: "🔥 ¡ESTADO DE INTEGRIDAD COMPROMETIDO! DAÑO LOCAL INEVITABLE", delay: 5200 },
      { text: "💀 REBOOT PREVENTIVO DE EMERGENCIA POR CARGA MALICIOSA EN CAMINO...", delay: 6000 }
    ];

    breachSequence.forEach((item) => {
      setTimeout(() => {
        setLogs(prev => [...prev, `[BREACH]: ${item.text}`]);
        setShaking(true);
        sfx.playTick();
        setTimeout(() => setShaking(false), 150);
      }, item.delay);
    });

    // Go to final countdown reboot
    setTimeout(() => {
      setPhase('countdown');
    }, 7200);

    return () => {
      if (sirenOsc) {
        try {
          sirenOsc.stop();
        } catch (e) {}
      }
    };
  }, [phase]);

  // Countdown timer clock
  useEffect(() => {
    if (phase !== 'countdown') return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setPhase('crash');
          sfx.playPowerDown();
          // Crash is active. Hold a glitch view for 2 seconds, then safely trigger onClose returning back to index
          setTimeout(() => {
            onClose();
          }, 2400);
          return 0;
        }
        sfx.playTick();
        setLogs(prevLogs => [...prevLogs, `[CONTEO REGRESIVO]: REINICIANDO TERMINAL EN EL SECTOR ${prev - 1}...`]);
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[120] overflow-hidden bg-black flex flex-col items-center justify-center font-mono ${shaking ? 'animate-bounce' : ''}`}>
      
      {/* Matrix digital rain backdrop screen filter */}
      <canvas ref={matrixCanvasRef} className="absolute inset-0 z-0 opacity-25 select-none pointer-events-none" />

      {/* Screen CRT Scanline grid aesthetic effect overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] opacity-85" />

      {/* Extreme terminal content box */}
      <div className="relative z-20 w-full max-w-4xl h-full max-h-[90vh] flex flex-col bg-black/95 border border-red-500/30 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.15)] overflow-hidden m-4">
        
        {/* Terminal frame Header */}
        <div className={`p-4 border-b flex justify-between items-center transition-colors duration-500 ${phase === 'breach' || phase === 'countdown' ? 'bg-red-950/80 border-red-500/40' : 'bg-slate-950 border-emerald-500/30'}`}>
          <div className="flex items-center space-x-2">
            <div className={`h-3 w-3 rounded-full animate-pulse mr-1 ${phase === 'breach' || phase === 'countdown' ? 'bg-red-500' : 'bg-green-500'}`} />
            <span className={`text-xs font-bold tracking-wider uppercase font-mono ${phase === 'breach' || phase === 'countdown' ? 'text-red-400' : 'text-green-400'}`}>
              {phase === 'breach' || phase === 'countdown' ? '⚠️ ESTADO GENERAL: SISTEMA SECUESTRADO ⚠️' : '👁️ DISPOSITIVO PROXIMA GENERACIÓN CONECTADO ACÓPLADO'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">ALGORITMO ESTRELLA V4.2</span>
        </div>

        {/* Phase transition panels switcher */}
        <div className="flex-1 p-6 overflow-y-auto flex flex-col space-y-4">
          
          {/* Main system activity logging stream */}
          <div className="flex-grow space-y-2 text-xs leading-relaxed max-h-[40vh] overflow-y-auto bg-black/50 border border-slate-900 rounded-xl p-4 font-mono select-all">
            {logs.map((log, i) => {
              const isBreach = log.includes('[BREACH]');
              const isSys = log.includes('[SYS]');
              return (
                <div 
                  key={i} 
                  className={`flex gap-2 font-mono ${isBreach ? 'text-rose-500 font-semibold' : isSys ? 'text-slate-400' : 'text-emerald-500'}`}
                >
                  <span className="opacity-40">{`>`}</span>
                  <span>{log}</span>
                </div>
              );
            })}
            <div ref={terminalEndRef} />
          </div>

          <AnimatePresence mode="wait">
            {/* BOOT / LOADING CONECTIVITY */}
            {phase === 'boot' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center justify-center p-8 text-center text-emerald-500 space-y-3"
              >
                <div className="p-4 bg-emerald-500/10 border border-emerald-400/20 rounded-full animate-spin">
                  <Wifi className="h-8 w-8" />
                </div>
                <p className="text-sm font-semibold tracking-widest animate-pulse">SINTONIZANDO RECEPTOR EXTREMO TOR BRIDGE...</p>
              </motion.div>
            )}

            {/* HOLLYWOOD CREDENTIALS Typing panel */}
            {phase === 'login' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-zinc-950/90 border border-emerald-500/20 rounded-2xl p-6 max-w-sm mx-auto w-full text-emerald-500 space-y-4 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
              >
                <div className="flex items-center gap-2 border-b border-emerald-500/20 pb-2.5">
                  <Key className="h-4 w-4 animate-bounce" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Terminal Onion Gateway login</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] text-emerald-700 font-mono uppercase">User Identity</label>
                    <div className="px-3 py-2 bg-black border border-emerald-500/20 rounded-lg text-emerald-400 select-none">
                      {username || <span className="text-emerald-950">Mecanografiando...</span>}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-emerald-700 font-mono uppercase">Decryption Hashphrase</label>
                    <div className="px-3 py-2 bg-black border border-emerald-500/20 rounded-lg text-emerald-400 tracking-widest select-none">
                      {password || <span className="text-emerald-950">Injectando token...</span>}
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-center text-emerald-600 animate-pulse font-mono">
                  ACCESO AUTORIZADO LOCAL • SECTOR OSCURO DETECTADO
                </div>
              </motion.div>
            )}

            {/* DREADED RED COMPROMISED SCREEN BREAK! */}
            {phase === 'breach' && (
              <motion.div 
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="bg-red-950/40 border-2 border-dashed border-red-500 p-6 rounded-2xl flex flex-col items-center justify-center text-center text-red-500 space-y-4 animate-pulse shadow-[inset_0_0_30px_rgba(239,68,68,0.2)]"
              >
                <AlertTriangle className="h-16 w-16 text-red-500 animate-bounce" />
                <div className="space-y-2">
                  <h3 className="text-lg font-bold tracking-widest uppercase">¡COMPUTADORA COMPROMETIDA EXTREMADAMENTE!</h3>
                  <p className="text-xs max-w-lg leading-relaxed text-red-300">
                    Señal en la nube recibida. El portal ha establecido un enchufe reverso en tu sistema operativo <strong>{stats.os}</strong>. Todos los puertos virtuales están volcando información de auditoría escolar e historiales de navegación hacia servidores espejo.
                  </p>
                </div>
              </motion.div>
            )}

            {/* COUNTDOWN FORCE RESTART PANIC */}
            {phase === 'countdown' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-6 space-y-4"
              >
                <p className="text-xs uppercase tracking-widest text-red-400 font-bold animate-pulse">
                  ALERTA: DISPOSITIVO BAJO ATAQUE EXTREMO. RECONSTRUCTORES EN FALLO GENERAL
                </p>
                
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-24 h-24 rounded-full border border-red-500/20 animate-ping" />
                  <div className="absolute w-20 h-20 rounded-full border-2 border-dashed border-red-500 animate-spin" />
                  <div className="text-4xl font-black text-rose-500 z-10 w-16 h-16 bg-red-950/50 border border-red-500 rounded-full flex items-center justify-center">
                    {countdown}
                  </div>
                </div>

                <p className="text-xs text-red-400/80 font-mono tracking-wide">
                  EXTRAYENDO CLAVES DE CACHÉ DE RESPUESTO... LA PÁGINA REINICIARA EN BRECE
                </p>
              </motion.div>
            )}

            {/* COMPLETE CRT TV NOISE AND POWER CLIPPED DUMP */}
            {phase === 'crash' && (
              <motion.div 
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white z-50 flex items-center justify-center"
              >
                <div className="w-full h-full bg-black flex flex-col justify-center items-center text-red-600 font-mono select-none">
                  {/* Digital screen noise look */}
                  <div className="text-center font-bold text-md tracking-wider uppercase animate-pulse space-y-2 pr-6 pl-6">
                    <p className="text-4xl mb-4">💥 ERROR DE VOLCADO GENERAL 💥</p>
                    <p className="font-mono text-zinc-650 text-xs">STATUS: CORE CLIPPED. SYSTEM FLUSHED.</p>
                    <p className="text-xs text-green-500 animate-pulse mt-4">REVERTIENDO CONEXIÓN EXTRA AL TRÁFICO LIMPIO... OK</p>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

        </div>

        {/* Footer info console bar labels */}
        <div className="p-4 bg-black border-t border-slate-900 flex flex-col sm:flex-row justify-between text-[11px] text-zinc-500 items-center font-mono gap-2">
          <div className="flex items-center space-x-2">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-ping" />
            <span>ALERTA SECURE-GATE: HOLLYWOOD VIBES OVER-ENGINEERED</span>
          </div>
          <div>ESTADO: SIMULACIÓN EDUCATIVA DIVERTIDA</div>
        </div>

      </div>
    </div>
  );
}
