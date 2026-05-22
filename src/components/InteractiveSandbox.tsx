import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Play, RotateCcw, LineChart, HelpCircle, Activity, ArrowRight, BookOpen, Layers, Sliders, Clock, Thermometer, ShieldAlert, Brain, Zap, RefreshCw, Pause } from 'lucide-react';

// ==================== INTERFACES & DEFINITIONS ====================

interface MathFunction {
  id: string;
  name: string;
  formulaTex: string;
  f: (x: number) => number;
  df: (x: number) => number;
}

interface ODEEquation {
  id: string;
  name: string;
  formulaTex: string;
  defaultY0: number;
  minY0: number;
  maxY0: number;
  f: (x: number, y: number) => number;
  exact: (x: number, y0: number) => number;
  description: string;
}

// ==================== NEURAL NETWORK MATHEMATICAL ENGINE ====================

interface NNNetwork {
  sizes: number[];
  weights: number[][][];
  biases: number[][];
  activations: number[][];
  zs: number[][];
  dWeights: number[][][];
  dBiases: number[][];
}

const nnActivationFunctions = {
  tanh: {
    f: (x: number) => Math.tanh(x),
    df: (y: number) => 1 - y * y // Activation derivative given a = tanh(x)
  },
  sigmoid: {
    f: (x: number) => 1 / (1 + Math.exp(-x)),
    df: (y: number) => y * (1 - y) // Derivative given a = sigmoid(x)
  },
  relu: {
    f: (x: number) => Math.max(0, x),
    df: (y: number) => y > 0 ? 1 : 0 // Derivative given a = relu(x)
  }
};

function nnInitNetwork(sizes: number[]): NNNetwork {
  const weights: number[][][] = [];
  const biases: number[][] = [];
  const activations: number[][] = [];
  const zs: number[][] = [];
  const dWeights: number[][][] = [];
  const dBiases: number[][] = [];

  for (let l = 0; l < sizes.length; l++) {
    activations.push(new Array(sizes[l]).fill(0));
    zs.push(new Array(sizes[l]).fill(0));
  }

  for (let l = 0; l < sizes.length - 1; l++) {
    const nextSize = sizes[l + 1];
    const currentSize = sizes[l];
    
    // Xavier initialization bounds
    const limitVal = Math.sqrt(6 / (currentSize + nextSize));
    const layerW: number[][] = [];
    const layerDW: number[][] = [];
    const layerB: number[] = [];
    const layerDB: number[] = [];
    
    for (let i = 0; i < nextSize; i++) {
      const neuronW: number[] = [];
      const neuronDW: number[] = [];
      for (let j = 0; j < currentSize; j++) {
        neuronW.push((Math.random() * 2 - 1) * limitVal);
        neuronDW.push(0);
      }
      layerW.push(neuronW);
      layerDW.push(neuronDW);
      // Initialize biases to small values
      layerB.push((Math.random() * 2 - 1) * 0.1);
      layerDB.push(0);
    }
    
    weights.push(layerW);
    biases.push(layerB);
    dWeights.push(layerDW);
    dBiases.push(layerDB);
  }

  return { sizes, weights, biases, activations, zs, dWeights, dBiases };
}

function nnForwardPass(net: NNNetwork, inputVal: number, actName: 'tanh' | 'sigmoid' | 'relu'): number {
  net.activations[0][0] = inputVal;
  const act = nnActivationFunctions[actName];

  for (let l = 0; l < net.sizes.length - 1; l++) {
    const currentSize = net.sizes[l];
    const nextSize = net.sizes[l + 1];
    const weights = net.weights[l];
    const biases = net.biases[l];
    const currentActs = net.activations[l];
    const nextActs = net.activations[l + 1];
    const nextZs = net.zs[l + 1];
    
    const isOutputLayer = (l === net.sizes.length - 2);

    for (let i = 0; i < nextSize; i++) {
      let sum = biases[i];
      for (let j = 0; j < currentSize; j++) {
        sum += weights[i][j] * currentActs[j];
      }
      nextZs[i] = sum;
      // Output layer is linear in function regression, hiddens use chosen activation
      nextActs[i] = isOutputLayer ? sum : act.f(sum);
    }
  }

  return net.activations[net.sizes.length - 1][0];
}

function nnBackpropagate(net: NNNetwork, target: number, actName: 'tanh' | 'sigmoid' | 'relu') {
  const L = net.sizes.length - 1;
  const deltas: number[][] = [];
  for (let l = 0; l <= L; l++) {
    deltas.push(new Array(net.sizes[l]).fill(0));
  }

  // Linear output loss delta: dE/dZ = (y_pred - y_target) * 1
  deltas[L][0] = net.activations[L][0] - target;

  const act = nnActivationFunctions[actName];

  // Backpropagate error terms to prior hidden layers
  for (let l = L - 1; l >= 1; l--) {
    const nextSize = net.sizes[l + 1];
    const currentSize = net.sizes[l];
    const weights = net.weights[l];
    const nextDeltas = deltas[l + 1];
    const currentActs = net.activations[l];

    for (let i = 0; i < currentSize; i++) {
      let sum = 0;
      for (let k = 0; k < nextSize; k++) {
        sum += weights[k][i] * nextDeltas[k];
      }
      // Multiply by activation derivative
      deltas[l][i] = sum * act.df(currentActs[i]);
    }
  }

  // Accumulate weight & bias updates
  for (let l = 0; l < L; l++) {
    const nextSize = net.sizes[l + 1];
    const currentSize = net.sizes[l];
    const currentActs = net.activations[l];
    const nextDeltas = deltas[l + 1];

    for (let i = 0; i < nextSize; i++) {
      net.dBiases[l][i] += nextDeltas[i];
      for (let j = 0; j < currentSize; j++) {
        net.dWeights[l][i][j] += nextDeltas[i] * currentActs[j];
      }
    }
  }
}

function nnZeroGradients(net: NNNetwork) {
  for (let l = 0; l < net.sizes.length - 1; l++) {
    const nextSize = net.sizes[l + 1];
    const currentSize = net.sizes[l];
    net.dBiases[l].fill(0);
    for (let i = 0; i < nextSize; i++) {
      net.dWeights[l][i].fill(0);
    }
  }
}

function nnApplyGradients(net: NNNetwork, lr: number, m: number, weightDecay: number) {
  for (let l = 0; l < net.sizes.length - 1; l++) {
    const nextSize = net.sizes[l + 1];
    const currentSize = net.sizes[l];

    for (let i = 0; i < nextSize; i++) {
      net.biases[l][i] -= lr * (net.dBiases[l][i] / m);
      for (let j = 0; j < currentSize; j++) {
        const wVal = net.weights[l][i][j];
        // Weight Decay (L2 regularization is mathematically perfect for preserving smoothness near limits)
        const regularizationPenalty = weightDecay * wVal;
        net.weights[l][i][j] -= lr * ((net.dWeights[l][i][j] / m) + regularizationPenalty);
      }
    }
  }
}

export default function InteractiveSandbox() {
  const [activeTab, setActiveTab] = useState<'limit' | 'forensic' | 'derivative' | 'riemann' | 'incremental' | 'differential' | 'ode' | 'neuralLimit' | 'music'>('limit');

  // ==================== NEURAL NETWORK LIMITS STATES ====================
  const [nnTargetFnId, setNnTargetFnId] = useState<'hole' | 'jump' | 'smooth'>('hole');
  const [nnHiddenSize1, setNnHiddenSize1] = useState<number>(8); // Neurons in first hidden layer
  const [nnHiddenSize2, setNnHiddenSize2] = useState<number>(4); // Neurons in second hidden layer (0 to disable)
  const [nnActivation, setNnActivation] = useState<'tanh' | 'sigmoid' | 'relu'>('tanh');
  const [nnLearningRate, setNnLearningRate] = useState<number>(0.08);
  const [nnHoleSize, setNnHoleSize] = useState<number>(0.5); // size of hole around x = 2
  const [nnEpochs, setNnEpochs] = useState<number>(0);
  const [nnIsTraining, setNnIsTraining] = useState<boolean>(false);
  const [nnTrainingSpeed, setNnTrainingSpeed] = useState<number>(8); // iterations per frame
  const [nnWeightDecay, setNnWeightDecay] = useState<number>(0.0005); // L2 stabilization
  const [nnTestX, setNnTestX] = useState<number>(2.0); // probe value to inspect network prediction
  const [nnSelectedNode, setNnSelectedNode] = useState<{ layer: number; index: number } | null>(null);
  const [nnLossHistory, setNnLossHistory] = useState<number[]>([]);
  const [nnTick, setNnTick] = useState<number>(0); // manual force-update trigger for neural visualization
  const [nnShowNetworkGradients, setNnShowNetworkGradients] = useState<boolean>(false);

  // ==================== CÁLCULO Y MÚSICA STATES (ANALOGÍA DE BEETHOVEN) ====================
  const [musicScenario, setMusicScenario] = useState<'beethoven' | 'sine' | 'theremin'>('beethoven');
  const [musicIsPlaying, setMusicIsPlaying] = useState<boolean>(false);
  const [musicPlaybackTime, setMusicPlaybackTime] = useState<number>(0);
  const [musicVolume, setMusicVolume] = useState<number>(0.5);
  const [musicEnableDerivativeVoice, setMusicEnableDerivativeVoice] = useState<boolean>(true);
  const [musicBeethovenSpeed, setMusicBeethovenSpeed] = useState<number>(1.0);
  const [musicThereminFreq, setMusicThereminFreq] = useState<number>(440);
  const [musicThereminY, setMusicThereminY] = useState<number>(160); // canvas pixel y coordinate
  const [musicThereminPoints, setMusicThereminPoints] = useState<{ t: number; f: number; df: number }[]>([]);
  const [musicThereminSoundActive, setMusicThereminSoundActive] = useState<boolean>(false);

  // References for Web Audio API nodes
  const musicAudioContextRef = React.useRef<AudioContext | null>(null);
  const musicOsc1Ref = React.useRef<OscillatorNode | null>(null);
  const musicGain1Ref = React.useRef<GainNode | null>(null);
  const musicOsc2Ref = React.useRef<OscillatorNode | null>(null);
  const musicGain2Ref = React.useRef<GainNode | null>(null);

  // Analytical continuous model for Beethoven's 5th motif pitch and volume
  const getBeethovenMathValues = React.useCallback((t: number) => {
    // Sigmoid parameters for smooth transitions
    const w = 0.035; // width of transition
    const sig = (u: number) => 1 / (1 + Math.exp(-u));
    const dsig = (u: number) => {
      const s = sig(u);
      return s * (1 - s);
    };

    // Transition times and heights for Pitch
    const times_p = [0.75, 2.05, 2.40, 3.15, 4.60];
    const deltas_p = [-80.87, -111.13, 249.23, -55.57, -193.66];
    
    let p = 392; // Sol4 starting freq
    let dp = 0;
    
    for (let i = 0; i < times_p.length; i++) {
      const u = (t - times_p[i]) / w;
      p += deltas_p[i] * sig(u);
      dp += (deltas_p[i] / w) * dsig(u);
    }

    // Smooth Volume Envelopes
    let v = 0;
    let dv = 0;

    if (t < 0.75) {
      // Swells representing Sol-Sol-Sol
      v = 0.75 * Math.pow(Math.sin(4 * Math.PI * t), 2);
      dv = 0.75 * 8 * Math.PI * Math.sin(4 * Math.PI * t) * Math.cos(4 * Math.PI * t);
    } else if (t >= 0.75 && t < 2.05) {
      // Note 4: Mi bemol (sustained fermata with decay)
      const attack_u = (t - 0.77) / 0.02;
      const decay_u = (t - 1.95) / 0.03;
      v = 0.8 * sig(attack_u) * (1 - sig(decay_u)) * (1 - 0.35 * (t - 0.75));
      const eps = 0.01;
      const v_plus = 0.8 * sig((t + eps - 0.77) / 0.02) * (1 - sig((t + eps - 1.95) / 0.03)) * (1 - 0.35 * (t + eps - 0.75));
      dv = (v_plus - v) / eps;
    } else if (t >= 2.05 && t < 2.40) {
      // Pause
      v = 0;
      dv = 0;
    } else if (t >= 2.40 && t < 3.15) {
      // Fa-Fa-Fa
      v = 0.75 * Math.pow(Math.sin(4 * Math.PI * (t - 2.40)), 2);
      dv = 0.75 * 8 * Math.PI * Math.sin(4 * Math.PI * (t - 2.40)) * Math.cos(4 * Math.PI * (t - 2.40));
    } else {
      // Note 8: Re (sustained fermata with decay)
      const attack_u = (t - 3.17) / 0.02;
      const decay_u = (t - 4.50) / 0.03;
      v = 0.8 * sig(attack_u) * (1 - sig(decay_u)) * (1 - 0.28 * (t - 3.15));
      const eps = 0.01;
      const v_plus = 0.8 * sig((t + eps - 3.17) / 0.02) * (1 - sig((t + eps - 4.50) / 0.03)) * (1 - 0.28 * (t + eps - 3.15));
      dv = (v_plus - v) / eps;
    }

    // Clamp volume
    v = Math.max(0, Math.min(1.0, v));

    return { p, dp, v, dv };
  }, []);

  const initMusicAudio = () => {
    if (musicAudioContextRef.current) return;
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtxClass();
      musicAudioContextRef.current = ctx;

      // Primary oscillator & gain (sound voice)
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      musicOsc1Ref.current = osc;
      musicGain1Ref.current = gain;

      // Secondary oscillator & gain (derivative voice)
      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      const gain2 = ctx.createGain();
      gain2.gain.setValueAtTime(0, ctx.currentTime);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start();

      musicOsc2Ref.current = osc2;
      musicGain2Ref.current = gain2;
    } catch (e) {
      console.error("Audio Context initialization failed:", e);
    }
  };

  const stopMusicAudio = React.useCallback(() => {
    try {
      if (musicGain1Ref.current) {
        musicGain1Ref.current.gain.setValueAtTime(0, musicAudioContextRef.current?.currentTime || 0);
      }
      if (musicGain2Ref.current) {
        musicGain2Ref.current.gain.setValueAtTime(0, musicAudioContextRef.current?.currentTime || 0);
      }
      setMusicIsPlaying(false);
      setMusicThereminSoundActive(false);
    } catch (err) {
      console.warn(err);
    }
  }, []);

  // Cleanup music dynamic loop on tab change
  React.useEffect(() => {
    stopMusicAudio();
  }, [activeTab, stopMusicAudio]);

  // Clean oscillators on unmount
  React.useEffect(() => {
    return () => {
      try {
        if (musicOsc1Ref.current) musicOsc1Ref.current.stop();
        if (musicOsc2Ref.current) musicOsc2Ref.current.stop();
        if (musicAudioContextRef.current) musicAudioContextRef.current.close();
      } catch (e) {}
    };
  }, []);

  // Playback timer ticker loop hook
  React.useEffect(() => {
    if (!musicIsPlaying) {
      try {
        if (musicGain1Ref.current) musicGain1Ref.current.gain.setValueAtTime(0, musicAudioContextRef.current?.currentTime || 0);
        if (musicGain2Ref.current) musicGain2Ref.current.gain.setValueAtTime(0, musicAudioContextRef.current?.currentTime || 0);
      } catch (err) {}
      return;
    }

    let lastTime = performance.now();
    let frameId: number;

    const playLoop = () => {
      const now = performance.now();
      const deltaSec = ((now - lastTime) / 1000) * musicBeethovenSpeed;
      lastTime = now;

      setMusicPlaybackTime((prev) => {
        let next = prev + deltaSec;
        const maxDur = musicScenario === 'beethoven' ? 4.65 : 4.0;
        if (next >= maxDur) {
          next = 0; // loop
        }
        return next;
      });

      frameId = requestAnimationFrame(playLoop);
    };

    frameId = requestAnimationFrame(playLoop);
    return () => cancelAnimationFrame(frameId);
  }, [musicIsPlaying, musicBeethovenSpeed, musicScenario]);

  // Set real-time parameters dynamically on current playhead ticks
  React.useEffect(() => {
    if (!musicIsPlaying || !musicAudioContextRef.current) return;
    const ctx = musicAudioContextRef.current;
    
    if (musicScenario === 'beethoven') {
      const t = musicPlaybackTime;
      const { p, dp, v, dv } = getBeethovenMathValues(t);

      if (musicOsc1Ref.current) {
        musicOsc1Ref.current.frequency.setTargetAtTime(p, ctx.currentTime, 0.01);
      }
      if (musicGain1Ref.current) {
        musicGain1Ref.current.gain.setTargetAtTime(v * musicVolume, ctx.currentTime, 0.01);
      }

      if (musicEnableDerivativeVoice && musicOsc2Ref.current && musicGain2Ref.current) {
        // Map absolute derivative pitch transitions and envelope derivatives
        const derFreq = 220 + Math.min(800, Math.abs(dp) * 0.9) + Math.min(400, Math.abs(dv) * 200);
        musicOsc2Ref.current.frequency.setTargetAtTime(derFreq, ctx.currentTime, 0.01);

        const derVolume = Math.min(0.35, (Math.abs(dp) / 450) + (Math.abs(dv) / 3)) * musicVolume;
        musicGain2Ref.current.gain.setTargetAtTime(derVolume, ctx.currentTime, 0.01);
      } else if (musicGain2Ref.current) {
        musicGain2Ref.current.gain.setTargetAtTime(0, ctx.currentTime, 0.01);
      }
    } else if (musicScenario === 'sine') {
      const t = musicPlaybackTime;
      const f_mod = 0.5; // Sine amplitude period of 2 seconds
      const p = 440; // Base tone

      const v = 0.5 + 0.45 * Math.sin(2 * Math.PI * f_mod * t);
      const dv = 0.45 * 2 * Math.PI * f_mod * Math.cos(2 * Math.PI * f_mod * t);

      if (musicOsc1Ref.current) {
        musicOsc1Ref.current.frequency.setTargetAtTime(p, ctx.currentTime, 0.01);
      }
      if (musicGain1Ref.current) {
        musicGain1Ref.current.gain.setTargetAtTime(v * musicVolume, ctx.currentTime, 0.01);
      }

      if (musicEnableDerivativeVoice && musicOsc2Ref.current && musicGain2Ref.current) {
        musicOsc2Ref.current.frequency.setTargetAtTime(660, ctx.currentTime, 0.01); // E5
        const derGain = Math.abs(dv) * 0.35 * musicVolume;
        musicGain2Ref.current.gain.setTargetAtTime(derGain, ctx.currentTime, 0.01);
      } else if (musicGain2Ref.current) {
        musicGain2Ref.current.gain.setTargetAtTime(0, ctx.currentTime, 0.01);
      }
    }
  }, [musicPlaybackTime, musicIsPlaying, musicScenario, musicVolume, musicEnableDerivativeVoice, getBeethovenMathValues]);

  // ==================== NEURAL NETWORK SYSTEM EFFECTS & UTILITIES ====================
  const nnNetworkRef = React.useRef<NNNetwork | null>(null);

  // Helper to generate the training dataset (excluding the interval centered at x=2.0)
  const generateNnDataset = React.useCallback((fnId: 'hole' | 'jump' | 'smooth', holeSize: number) => {
    const data: { x: number; y: number }[] = [];
    const N = 80; // Dense training points for quick precise learning
    const minX = 0;
    const maxX = 4;
    for (let i = 0; i <= N; i++) {
      const x = minX + (i / N) * (maxX - minX);
      
      // Exclude points inside the hole zone [2.0 - holeSize / 2, 2.0 + holeSize / 2]
      if (fnId === 'hole' && Math.abs(x - 2.0) < holeSize / 2) {
        continue;
      }
      if (fnId === 'jump' && Math.abs(x - 2.0) < holeSize / 3) {
        // Exclude a tiny bit of the boundary for sharp step definition
        continue;
      }
      
      let y = 0;
      if (fnId === 'hole') {
        y = Math.abs(x - 2.0) < 1e-9 ? 4.0 : ((x * x) - 4.0) / (x - 2.0);
      } else if (fnId === 'jump') {
        y = x >= 2.0 ? 3.5 : 1.5;
      } else {
        y = Math.sin(1.2 * Math.PI * x) + 2.5; // continuous waves
      }
      data.push({ x, y });
    }
    return data;
  }, []);

  // Effect to reinitialize weights whenever structure or model changes
  React.useEffect(() => {
    const sizes = [1, nnHiddenSize1];
    if (nnHiddenSize2 > 0) {
      sizes.push(nnHiddenSize2);
    }
    sizes.push(1);
    
    nnNetworkRef.current = nnInitNetwork(sizes);
    setNnEpochs(0);
    setNnLossHistory([]);
    setNnSelectedNode(null);
    setNnTick(t => t + 1);
  }, [nnHiddenSize1, nnHiddenSize2, nnTargetFnId, nnActivation]);

  // Effect to animate Backpropagation Training Loop in real-time
  React.useEffect(() => {
    if (!nnIsTraining) return;

    let frameId: number;
    const loop = () => {
      const net = nnNetworkRef.current;
      if (!net) return;

      const dataset = generateNnDataset(nnTargetFnId, nnHoleSize);
      if (dataset.length === 0) return;

      let latestMSE = 0;
      
      // Perform multiple gradient updates per animation frame for visual performance
      for (let step = 0; step < nnTrainingSpeed; step++) {
        nnZeroGradients(net);
        
        let batchLoss = 0;
        for (let i = 0; i < dataset.length; i++) {
          const px = dataset[i].x;
          const py = dataset[i].y;
          
          // Normalize input x in [0, 4] to [-1, 1] for neural learning stability
          const normX = (px - 2.0) / 2.0;
          nnForwardPass(net, normX, nnActivation);
          
          const pred = net.activations[net.sizes.length - 1][0];
          const err = pred - py;
          batchLoss += 0.5 * err * err;
          
          nnBackpropagate(net, py, nnActivation);
        }
        
        nnApplyGradients(net, nnLearningRate, dataset.length, nnWeightDecay);
        latestMSE = batchLoss / dataset.length;
      }

      setNnEpochs(prev => prev + nnTrainingSpeed);
      setNnLossHistory(prev => {
        const next = [...prev, latestMSE];
        if (next.length > 80) next.shift();
        return next;
      });
      setNnTick(t => t + 1);

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [nnIsTraining, nnTargetFnId, nnHoleSize, nnLearningRate, nnWeightDecay, nnActivation, nnTrainingSpeed, generateNnDataset]);

  // ==================== case study: mayfair diner forensic states ====================
  const [mayfairH, setMayfairH] = useState<number>(4.0); // Hours body was in walk-in before 6:00 a.m.
  const [mayfairT0, setMayfairT0] = useState<number>(85.0); // Core body temp at 6:00 a.m.
  const [mayfairTm, setMayfairTm] = useState<number>(50.0); // Refrigerator walk-in temperature
  const [mayfairTroom, setMayfairTroom] = useState<number>(70.0); // Diner room temperature
  const [mayfairTdeath, setMayfairTdeath] = useState<number>(98.6); // Normal body temperature
  const [mayfairT630, setMayfairT630] = useState<number>(84.0); // Core body temp at 6:30 a.m. (for k estimation)

  // ==================== RIEMANN INTEGRATION STATES ====================
  const [riemannN, setRiemannN] = useState<number>(8); // Number of partitions (n)
  const [riemannMethod, setRiemannMethod] = useState<'left' | 'right' | 'midpoint' | 'trapezoid'>('right');
  const [selectedRiemannFnId, setSelectedRiemannFnId] = useState<'quadratic' | 'sin' | 'exp'>('quadratic');
  const [hoveredRectIdx, setHoveredRectIdx] = useState<number | null>(null);

  // ==================== TAB 0: LIMIT EYE-OPENER & FORMAL DEFINITION STATES ====================
  const [selectedLimitFnId, setSelectedLimitFnId] = useState<string>('hole');
  const [limitA] = useState<number>(2.0); // Point a is fixed at 2.0 to make visualization robust
  const [limitX, setLimitX] = useState<number>(1.5); // Current x slider
  const [epsilon, setEpsilon] = useState<number>(0.7); // Epsilon tolerance
  const [delta, setDelta] = useState<number>(0.5); // Delta neighborhood

  // Limit function calculations
  const limitFunctions = [
    {
      id: 'hole',
      name: 'Discontinuidad Evitable f(x) = (x² - 4) / (x - 2)',
      formulaTex: 'f(x) = (x² - 4) / (x - 2)',
      f: (x: number) => Math.abs(x - 2) < 1e-9 ? 4 : (x*x - 4) / (x - 2),
      L: 4.0,
      description: 'Esta función no está definida en x = 2 (da una indeterminación 0/0), dejando un "balazo" en la curva. Sin embargo, su límite cuando x aproxima a 2 es exactamente 4.'
    },
    {
      id: 'quadratic',
      name: 'Polinómica Continua f(x) = x² - x + 1',
      formulaTex: 'f(x) = x² - x + 1',
      f: (x: number) => x*x - x + 1,
      L: 3.0,
      description: 'Una curva continua estándar. Aquí, el límite cuando x tiende a 2 es directamente igual al valor de la función evaluado en f(2) = 3.'
    }
  ];

  const currentLimitFn = limitFunctions.find(fn => fn.id === selectedLimitFnId) || limitFunctions[0];

  // Axis scale helpers for limits: X in [0, 4], Y in [0, 6]
  const widthL = 500;
  const heightL = 320;
  const scaleXL = (val: number) => (val / 4) * (widthL - 60) + 40;
  const scaleYL = (val: number) => heightL - 30 - (val / 6) * (heightL - 50);

  // Check if delta choice is compatible with epsilon (didactic core logic)
  const checkDeltaValidity = () => {
    // We sample points in [a - delta, a + delta] to verify if all of them are inside f(a) +- epsilon
    const samples = 40;
    for (let i = 0; i <= samples; i++) {
      const pct = i / samples;
      const xSample = (limitA - delta) + pct * (2 * delta);
      // Skip exactly testing the hole itself to reflect the definition of a limit (x never reaches a)
      if (Math.abs(xSample - limitA) < 1e-4) continue;
      const ySample = currentLimitFn.f(xSample);
      if (Math.abs(ySample - currentLimitFn.L) > epsilon + 1e-5) {
        return false;
      }
    }
    return true;
  };
  const isDeltaValid = checkDeltaValidity();

  // ==================== TAB 4: DIFFERENTIAL STATES & CONSTANTS ====================
  const [selectedDiffId, setSelectedDiffId] = useState<string>('root');
  const [diffX, setDiffX] = useState<number>(2.0);
  const [diffDx, setDiffDx] = useState<number>(0.8);

  interface DifferentialFunction {
    id: string;
    name: string;
    formulaLabel: string;
    f: (x: number) => number;
    df: (x: number) => number;
    dfLabel: string;
    description: string;
    explanation: string;
  }

  const differentialFunctions: DifferentialFunction[] = [
    {
      id: 'root',
      name: 'Función Raíz f(x) = √x',
      formulaLabel: 'f(x) = √x',
      f: (x) => Math.sqrt(x),
      df: (x) => 0.5 / Math.sqrt(x),
      dfLabel: "f'(x) = 1 / (2√x)",
      description: 'Muestra de forma excelente cómo la aproximación lineal (tangente) se sitúa por encima de la curva cóncava.',
      explanation: 'Para f(x) = √x, el diferencial es dy = (1 / (2√x)) * dx. Observe cómo al disminuir dx, el error entre dy (tangente) y Δy (curva) disminuye de manera acelerada.'
    },
    {
      id: 'square',
      name: 'Función Cuadrática f(x) = 0.5x²',
      formulaLabel: 'f(x) = 0.5x²',
      f: (x) => 0.5 * x * x,
      df: (x) => x,
      dfLabel: "f'(x) = x",
      description: 'Un clásico del cálculo donde el error es exactamente proporcional al cuadrado de dx (E = 0.5·(dx)²).',
      explanation: 'Para f(x) = 0.5x², el incremento real es Δy = x·dx + 0.5·(dx)². Al restar el diferencial dy = x·dx, el error remanente es exactamente 0.5·(dx)².'
    },
    {
      id: 'sine',
      name: 'Función Seno f(x) = sen(x) + 2',
      formulaLabel: 'f(x) = sen(x) + 2',
      f: (x) => Math.sin(x) + 2,
      df: (x) => Math.cos(x),
      dfLabel: "f'(x) = cos(x)",
      description: 'Una función oscilatoria donde el signo del error cambia según la concavidad (convexa vs cóncava).',
      explanation: 'Aquí f\'\'(x) = -sen(x). En zonas cóncavas la tangente queda por encima (dy > Δy) y en zonas convexas queda por debajo (dy < Δy) de la curva.'
    }
  ];

  const currentDiffFn = differentialFunctions.find(fn => fn.id === selectedDiffId) || differentialFunctions[0];
  const widthDiff = 500;
  const heightDiff = 320;
  const maxDiffYValue = selectedDiffId === 'root' ? 3.0 : (selectedDiffId === 'square' ? 15.0 : 4.0);
  const scaleXDiff = (xVal: number) => (xVal / 5) * (widthDiff - 60) + 40;
  const scaleYDiff = (yVal: number) => heightDiff - 35 - (yVal / maxDiffYValue) * (heightDiff - 55);

  const stepsDiff = 80;
  let diffCurvePoints = '';
  for (let i = 0; i <= stepsDiff; i++) {
    const xVal = (i / stepsDiff) * 5;
    const yVal = currentDiffFn.f(xVal);
    diffCurvePoints += `${i === 0 ? 'M' : 'L'} ${scaleXDiff(xVal)} ${scaleYDiff(yVal)} `;
  }

  const diffY0 = currentDiffFn.f(diffX);
  const diffY1 = currentDiffFn.f(diffX + diffDx);
  const diffSlopeTangent = currentDiffFn.df(diffX);
  const calculatedDy = diffSlopeTangent * diffDx;
  const calculatedDeltaY = diffY1 - diffY0;
  const diffYTangent = diffY0 + calculatedDy;

  const getDiffTangentLinePoints = () => {
    const xStart = Math.max(0, diffX - 1.2);
    const xEnd = Math.min(5, diffX + diffDx + 0.8);
    const yStart = diffSlopeTangent * (xStart - diffX) + diffY0;
    const yEnd = diffSlopeTangent * (xEnd - diffX) + diffY0;
    return { x1: scaleXDiff(xStart), y1: scaleYDiff(yStart), x2: scaleXDiff(xEnd), y2: scaleYDiff(yEnd) };
  };

  const diffTanLine = getDiffTangentLinePoints();

  // ==================== TAB 1: DERIVATIVE STATES & CONSTANTS ====================
  const [selectedFnId, setSelectedFnId] = useState<string>('cubic');
  const [x0, setX0] = useState<number>(2.5);
  const [h, setH] = useState<number>(1.2);
  const [showSecant, setShowSecant] = useState<boolean>(true);
  const [showTangent, setShowTangent] = useState<boolean>(true);

  // ==================== TAB 3: INCREMENTAL DERIVATIVE STATES ====================
  const [selectedIncId, setSelectedIncId] = useState<string>('square');
  const [incX, setIncX] = useState<number>(2.0);
  const [incDx, setIncDx] = useState<number>(0.5);

  interface IncrementalFunction {
    id: string;
    name: string;
    formulaLabel: string;
    f: (x: number) => number;
    df: (x: number) => number;
    step1Symbolic: (x: number, dx: number) => string;
    step2Symbolic: (x: number, dx: number) => string;
    step3Symbolic: (x: number, dx: number) => string;
    step4Symbolic: (x: number) => string;
  }

  const incrementalFunctions: IncrementalFunction[] = [
    {
      id: 'square',
      name: 'Función Cuadrática f(x) = x²',
      formulaLabel: 'f(x) = x²',
      f: (x) => x * x,
      df: (x) => 2 * x,
      step1Symbolic: (x, dx) => `f(x + Δx) = (x + Δx)² = x² + 2x·Δx + (Δx)² = (${x} + ${dx})² = ${x * x} + 2(${x})(${dx}) + (${dx})² = ${x * x} + ${2 * x * dx} + ${(dx * dx).toFixed(4)} = ${((x + dx) * (x + dx)).toFixed(4)}`,
      step2Symbolic: (x, dx) => `Δy = f(x + Δx) - f(x) = [x² + 2x·Δx + (Δx)²] - [x²] = 2x·Δx + (Δx)² = 2(${x})(${dx}) + (${dx})² = ${2 * x * dx} + ${(dx * dx).toFixed(4)} = ${(((x + dx) * (x + dx)) - (x * x)).toFixed(4)}`,
      step3Symbolic: (x, dx) => `Δy/Δx = [2x·Δx + (Δx)²] / Δx = 2x + Δx = 2(${x}) + ${dx} = ${2 * x} + ${dx} = ${(2 * x + dx).toFixed(4)}`,
      step4Symbolic: (x) => `f'(x) = lim(Δx → 0) [2x + Δx] = 2x = 2(${x}) = ${(2 * x).toFixed(4)}`
    },
    {
      id: 'quadratic',
      name: 'Función f(x) = 2x² + 3x',
      formulaLabel: 'f(x) = 2x² + 3x',
      f: (x) => 2 * x * x + 3 * x,
      df: (x) => 4 * x + 3,
      step1Symbolic: (x, dx) => `f(x + Δx) = 2(x + Δx)² + 3(x + Δx) = 2(x² + 2x·Δx + (Δx)²) + 3x + 3·Δx\n= 2x² + 4x·Δx + 2(Δx)² + 3x + 3·Δx\n= 2(${x})² + 4(${x})(${dx}) + 2(${dx})² + 3(${x}) + 3(${dx})\n= ${2 * x * x} + ${4 * x * dx} + ${(2 * dx * dx).toFixed(4)} + ${3 * x} + ${(3 * dx).toFixed(4)} = ${(2 * (x + dx) * (x + dx) + 3 * (x + dx)).toFixed(4)}`,
      step2Symbolic: (x, dx) => {
        const val1 = 2 * (x + dx) * (x + dx) + 3 * (x + dx);
        const val0 = 2 * x * x + 3 * x;
        return `Δy = f(x + Δx) - f(x) = [2x² + 4x·Δx + 2(Δx)² + 3x + 3·Δx] - [2x² + 3x]\n= 4x·Δx + 2(Δx)² + 3·Δx\n= 4(${x})(${dx}) + 2(${dx})² + 3(${dx}) = ${4 * x * dx} + ${(2 * dx * dx).toFixed(4)} + ${(3 * dx).toFixed(4)} = ${(val1 - val0).toFixed(4)}`;
      },
      step3Symbolic: (x, dx) => `Δy/Δx = [4x·Δx + 2(Δx)² + 3·Δx] / Δx = 4x + 3 + 2·Δx\n= 4(${x}) + 3 + 2(${dx}) = ${4 * x} + 3 + ${(2 * dx).toFixed(4)} = ${(4 * x + 3 + 2 * dx).toFixed(4)}`,
      step4Symbolic: (x) => `f'(x) = lim(Δx → 0) [4x + 3 + 2·Δx] = 4x + 3 = 4(${x}) + 3 = ${(4 * x + 3).toFixed(4)}`
    },
    {
      id: 'cubic_simple',
      name: 'Función Cúbica f(x) = x³',
      formulaLabel: 'f(x) = x³',
      f: (x) => x * x * x,
      df: (x) => 3 * x * x,
      step1Symbolic: (x, dx) => `f(x + Δx) = (x + Δx)³ = x³ + 3x²·Δx + 3x·(Δx)² + (Δx)³\n= (${x})³ + 3(${x})²(${dx}) + 3(${x})(${dx})² + (${dx})³\n= ${x * x * x} + ${3 * x * x * dx} + ${(3 * x * dx * dx).toFixed(4)} + ${(dx * dx * dx).toFixed(4)} = ${Math.pow(x + dx, 3).toFixed(4)}`,
      step2Symbolic: (x, dx) => `Δy = f(x + Δx) - f(x) = [x³ + 3x²·Δx + 3x·(Δx)² + (Δx)³] - [x³]\n= 3x²·Δx + 3x·(Δx)² + (Δx)³\n= 3(${x})²(${dx}) + 3(${x})(${dx})² + (${dx})³ = ${3 * x * x * dx} + ${(3 * x * dx * dx).toFixed(4)} + ${(dx * dx * dx).toFixed(4)} = ${(Math.pow(x + dx, 3) - (x * x * x)).toFixed(4)}`,
      step3Symbolic: (x, dx) => `Δy/Δx = [3x²·Δx + 3x·(Δx)² + (Δx)³] / Δx = 3x² + 3x·Δx + (Δx)²\n= 3(${x})² + 3(${x})(${dx}) + (${dx})² = ${3 * x * x} + ${(3 * x * dx).toFixed(4)} + ${(dx * dx).toFixed(4)} = ${(3 * x * x + 3 * x * dx + dx * dx).toFixed(4)}`,
      step4Symbolic: (x) => `f'(x) = lim(Δx → 0) [3x² + 3x·Δx + (Δx)²] = 3x² = 3(${x})² = ${(3 * x * x).toFixed(4)}`
    }
  ];

  const currentIncFn = incrementalFunctions.find(fn => fn.id === selectedIncId) || incrementalFunctions[0];
  const widthInc = 500;
  const heightInc = 320;
  const maxYValue = selectedIncId === 'square' ? 25 : (selectedIncId === 'quadratic' ? 55 : 85);
  const scaleXInc = (xVal: number) => (xVal / 5) * (widthInc - 60) + 40;
  const scaleYInc = (yVal: number) => heightInc - 35 - (yVal / maxYValue) * (heightInc - 55);

  const stepsInc = 80;
  let incCurvePoints = '';
  for (let i = 0; i <= stepsInc; i++) {
    const xVal = (i / stepsInc) * 5;
    const yVal = currentIncFn.f(xVal);
    incCurvePoints += `${i === 0 ? 'M' : 'L'} ${scaleXInc(xVal)} ${scaleYInc(yVal)} `;
  }

  const incY0 = currentIncFn.f(incX);
  const incY1 = currentIncFn.f(incX + incDx);
  const incSlopeSecant = (incY1 - incY0) / incDx;
  const incSlopeTangent = currentIncFn.df(incX);

  const getIncSecantLinePoints = () => {
    const xStart = Math.max(0, incX - 1);
    const xEnd = Math.min(5, incX + incDx + 1);
    const yStart = incSlopeSecant * (xStart - incX) + incY0;
    const yEnd = incSlopeSecant * (xEnd - incX) + incY0;
    return { x1: scaleXInc(xStart), y1: scaleYInc(yStart), x2: scaleXInc(xEnd), y2: scaleYInc(yEnd) };
  };

  const getIncTangentLinePoints = () => {
    const xStart = Math.max(0, incX - 1);
    const xEnd = Math.min(5, incX + 1.5);
    const yStart = incSlopeTangent * (xStart - incX) + incY0;
    const yEnd = incSlopeTangent * (xEnd - incX) + incY0;
    return { x1: scaleXInc(xStart), y1: scaleYInc(yStart), x2: scaleXInc(xEnd), y2: scaleYInc(yEnd) };
  };

  const incSecLine = getIncSecantLinePoints();
  const incTanLine = getIncTangentLinePoints();

  const functions: MathFunction[] = [
    {
      id: 'cubic',
      name: 'Polinómica de 3er Grado',
      formulaTex: 'f(X) = 0.08X³ - 0.7X² + 1.8X + 1',
      f: (x) => 0.08 * Math.pow(x, 3) - 0.7 * Math.pow(x, 2) + 1.8 * x + 1,
      df: (x) => 0.24 * Math.pow(x, 2) - 1.4 * x + 1.8,
    },
    {
      id: 'sine',
      name: 'Ondulatoria (Seno amplificado)',
      formulaTex: 'f(X) = 1.8 · sen(0.9X - 1) + 2.5',
      f: (x) => 1.8 * Math.sin(0.9 * x - 1.0) + 2.5,
      df: (x) => 1.8 * 0.9 * Math.cos(0.9 * x - 1.0),
    },
    {
      id: 'bell',
      name: 'Curva de Distribución (Campana)',
      formulaTex: 'f(X) = 4 · e^(-0.1(X-4.5)²) + 0.5',
      f: (x) => 4 * Math.exp(-0.1 * Math.pow(x - 4.5, 2)) + 0.5,
      df: (x) => 4 * (-0.2 * (x - 4.5)) * Math.exp(-0.1 * Math.pow(x - 4.5, 2)),
    }
  ];

  const currentFn = functions.find(fn => fn.id === selectedFnId) || functions[0];

  // Derivative SVG layout bounds X: [0, 8], Y: [0, 5]
  const widthD = 500;
  const heightD = 320;
  const scaleXD = (x: number) => (x / 8) * (widthD - 60) + 40;
  const scaleYD = (y: number) => heightD - 30 - (y / 5) * (heightD - 50);

  const inverseXD = (pixelX: number) => {
    const rawVal = ((pixelX - 40) / (widthD - 60)) * 8;
    return Math.max(0.1, Math.min(7.9, rawVal));
  };

  const handleSvgDerivativeClick = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const computedX0 = inverseXD(clickX);
    setX0(Number(computedX0.toFixed(2)));
  };

  const stepsD = 100;
  let dCurvePoints = '';
  for (let i = 0; i <= stepsD; i++) {
    const xVal = (i / stepsD) * 8;
    const yVal = currentFn.f(xVal);
    dCurvePoints += `${i === 0 ? 'M' : 'L'} ${scaleXD(xVal)} ${scaleYD(yVal)} `;
  }

  const y0 = currentFn.f(x0);
  const dy0 = currentFn.df(x0);
  const xH = x0 + h;
  const yH = currentFn.f(xH);
  const mSec = (yH - y0) / h;

  const getSecantLinePoints = () => {
    const xStart = Math.max(0, x0 - 2);
    const xEnd = Math.min(8, xH + 2);
    const yStart = mSec * (xStart - x0) + y0;
    const yEnd = mSec * (xEnd - x0) + y0;
    return { x1: scaleXD(xStart), y1: scaleYD(yStart), x2: scaleXD(xEnd), y2: scaleYD(yEnd) };
  };

  const getTangentLinePoints = () => {
    const xStart = Math.max(0, x0 - 2.5);
    const xEnd = Math.min(8, x0 + 2.5);
    const yStart = dy0 * (xStart - x0) + y0;
    const yEnd = dy0 * (xEnd - x0) + y0;
    return { x1: scaleXD(xStart), y1: scaleYD(yStart), x2: scaleXD(xEnd), y2: scaleYD(yEnd) };
  };

  const secLine = getSecantLinePoints();
  const tanLine = getTangentLinePoints();

  const resetDerivative = () => {
    setX0(2.5);
    setH(1.2);
    setSelectedFnId('cubic');
    setShowSecant(true);
    setShowTangent(true);
  };


  // ==================== TAB 2: ODE SIMULATOR STATES & CONSTANTS ====================
  const [selectedOdeId, setSelectedOdeId] = useState<string>('logistic');
  const [odeY0, setOdeY0] = useState<number>(0.5);
  const [odeH, setOdeH] = useState<number>(0.4);
  const [odeSteps, setOdeSteps] = useState<number>(10);
  const [showEuler, setShowEuler] = useState<boolean>(true);
  const [showHeun, setShowHeun] = useState<boolean>(true);
  const [showRK4, setShowRK4] = useState<boolean>(true);
  const [showExact, setShowExact] = useState<boolean>(true);
  const [showVectorField, setShowVectorField] = useState<boolean>(true);

  const odes: ODEEquation[] = [
    {
      id: 'logistic',
      name: 'Población Logística (Crecimiento Limitado)',
      formulaTex: 'dy/dx = y · (1 - y/4)',
      defaultY0: 0.5,
      minY0: 0.2,
      maxY0: 3.8,
      f: (x, y) => y * (1 - y / 4),
      exact: (x, y0) => {
        const K = 4;
        const C = (K / y0) - 1;
        return K / (1 + C * Math.exp(-x));
      },
      description: 'Modela el crecimiento sujeto al límite físico de sustento (K = 4). Las curvas forman trayectorias sigmoides elegantes que convergen hacia la capacidad máxima.'
    },
    {
      id: 'decay',
      name: 'Decaimiento Radioactivo',
      formulaTex: 'dy/dx = -0.6 · y',
      defaultY0: 4.5,
      minY0: 1.0,
      maxY0: 4.8,
      f: (x, y) => -0.6 * y,
      exact: (x, y0) => y0 * Math.exp(-0.6 * x),
      description: 'Describe sistemas donde la pérdida de masa o energía es directamente proporcional al estado instantáneo. Todas las trayectorias caen gradualmente hacia la asíntota cero.'
    },
    {
      id: 'cooling_sin',
      name: 'Enfriamiento con Oscilación Ambiental',
      formulaTex: 'dy/dx = sen(x) - y',
      defaultY0: 2.5,
      minY0: 0.5,
      maxY0: 4.5,
      f: (x, y) => Math.sin(x) - y,
      exact: (x, y0) => {
        const C = y0 + 0.5;
        return C * Math.exp(-x) + 0.5 * Math.sin(x) - 0.5 * Math.cos(x);
      },
      description: 'Modelado térmico donde el ambiente experimenta ciclos de frío y calor (ondas senoidales). El objeto sigue esta variación adaptando un desfase termodinámico.'
    }
  ];

  const currentOde = odes.find(o => o.id === selectedOdeId) || odes[0];

  // Axis bounds for ODE plot: X: [0, 6], Y: [0, 5]
  const widthO = 500;
  const heightO = 320;
  const scaleXO = (x: number) => (x / 6) * (widthO - 60) + 40;
  const scaleYO = (y: number) => heightO - 30 - (y / 5) * (heightO - 50);

  const handleOdeOdeIdChange = (id: string) => {
    setSelectedOdeId(id);
    const targetOde = odes.find(o => o.id === id);
    if (targetOde) {
      setOdeY0(targetOde.defaultY0);
    }
  };

  // Runge-Kutta, Heun, and Euler math loops
  const runNumericalSimulations = () => {
    const eulerPts: { x: number; y: number }[] = [];
    const heunPts: { x: number; y: number }[] = [];
    const rk4Pts: { x: number; y: number }[] = [];

    // 1. Euler calculation
    let cx = 0;
    let cy = odeY0;
    eulerPts.push({ x: cx, y: cy });
    for (let i = 0; i < odeSteps; i++) {
      if (cx > 6) break;
      const slope = currentOde.f(cx, cy);
      cy = cy + odeH * slope;
      cx = cx + odeH;
      // Clamp for visual sanity
      eulerPts.push({ x: cx, y: Math.max(-1, Math.min(6, cy)) });
    }

    // 2. Heun calculation (Improved Euler)
    cx = 0;
    cy = odeY0;
    heunPts.push({ x: cx, y: cy });
    for (let i = 0; i < odeSteps; i++) {
      if (cx > 6) break;
      const k1 = currentOde.f(cx, cy);
      const k2 = currentOde.f(cx + odeH, cy + odeH * k1);
      cy = cy + (odeH / 2) * (k1 + k2);
      cx = cx + odeH;
      heunPts.push({ x: cx, y: Math.max(-1, Math.min(6, cy)) });
    }

    // 3. Runge-Kutta 4th Order
    cx = 0;
    cy = odeY0;
    rk4Pts.push({ x: cx, y: cy });
    for (let i = 0; i < odeSteps; i++) {
      if (cx > 6) break;
      const k1 = currentOde.f(cx, cy);
      const k2 = currentOde.f(cx + odeH / 2, cy + (odeH * k1) / 2);
      const k3 = currentOde.f(cx + odeH / 2, cy + (odeH * k2) / 2);
      const k4 = currentOde.f(cx + odeH, cy + odeH * k3);
      cy = cy + (odeH / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
      cx = cx + odeH;
      rk4Pts.push({ x: cx, y: Math.max(-1, Math.min(6, cy)) });
    }

    return { eulerPts, heunPts, rk4Pts };
  };

  const { eulerPts, heunPts, rk4Pts } = runNumericalSimulations();

  // Helper paths for plotting ODE curves
  const getOdeSvgPath = (points: { x: number; y: number }[]) => {
    return points
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${scaleXO(p.x)} ${scaleYO(p.y)}`)
      .join(' ');
  };

  // Smooth Exact analytical line path points generator
  const odeExactPointsCount = 120;
  let exactCurvePoints = '';
  for (let i = 0; i <= odeExactPointsCount; i++) {
    const xVal = (i / odeExactPointsCount) * 6;
    const yVal = currentOde.exact(xVal, odeY0);
    if (yVal >= -0.5 && yVal <= 5.5) {
      exactCurvePoints += `${i === 0 ? 'M' : 'L'} ${scaleXO(xVal)} ${scaleYO(yVal)} `;
    }
  }

  // Draw vector field slopes ticks grid layout representation
  const vectorFieldLines = [];
  if (showVectorField) {
    const stepGx = 0.6;
    const stepGy = 0.5;
    for (let gx = 0.3; gx <= 5.7; gx += stepGx) {
      for (let gy = 0.25; gy <= 4.75; gy += stepGy) {
        const m = currentOde.f(gx, gy);
        const theta = Math.atan(m);
        const L = 0.12; // mathematical length limit
        const dx = L * Math.cos(theta);
        const dy = L * Math.sin(theta);

        vectorFieldLines.push({
          x1: scaleXO(gx - dx),
          y1: scaleYO(gy - dy),
          x2: scaleXO(gx + dx),
          y2: scaleYO(gy + dy)
        });
      }
    }
  }

  const finalEvalX = Math.min(6, odeSteps * odeH);
  const exactFinalVal = currentOde.exact(finalEvalX, odeY0);

  const getFinalApproximations = () => {
    const eulerFinal = eulerPts[Math.min(odeSteps, eulerPts.length - 1)]?.y ?? 0;
    const heunFinal = heunPts[Math.min(odeSteps, heunPts.length - 1)]?.y ?? 0;
    const rk4Final = rk4Pts[Math.min(odeSteps, rk4Pts.length - 1)]?.y ?? 0;

    return { eulerFinal, heunFinal, rk4Final };
  };

  const { eulerFinal, heunFinal, rk4Final } = getFinalApproximations();

  const resetOde = () => {
    setSelectedOdeId('logistic');
    setOdeY0(0.5);
    setOdeH(0.4);
    setOdeSteps(10);
    setShowEuler(true);
    setShowHeun(true);
    setShowRK4(true);
    setShowExact(true);
    setShowVectorField(true);
  };

  return (
    <section id="simulador" className="py-24 bg-white border-b border-slate-100 math-grid scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="text-center max-w-4xl mx-auto mb-10">
          <span className="font-mono text-xs text-indigo-600 font-semibold uppercase tracking-widest block mb-2 font-display">
            Laboratorio de Análisis Numérico
          </span>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-slate-900 tracking-tight">
            Laboratorio de Cálculo Virtual EDO-Derivadas
          </h2>
          <p className="mt-4 text-slate-500 font-normal text-sm max-w-3xl mx-auto">
            Herramientas interactivas diseñadas por la línea de investigación didáctica del Dr. Erick Radaí para simplificar la transición cognitiva desde el límite elemental del cálculo hasta la resolución aproximada de problemas físicos reales.
          </p>
        </div>

        {/* Dynamic Segment controller Tab */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200 shadow-sm flex-wrap justify-center gap-1 font-sans">
            <button
              onClick={() => setActiveTab('limit')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold font-display transition-all duration-300 pointer-events-auto cursor-pointer ${
                activeTab === 'limit'
                  ? 'bg-indigo-900 text-white shadow-md'
                  : 'text-slate-600 hover:text-indigo-900 hover:bg-slate-200/50'
              }`}
            >
              1. Límite ε - δ
            </button>
            <button
              onClick={() => setActiveTab('forensic')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold font-display transition-all duration-300 pointer-events-auto cursor-pointer ${
                activeTab === 'forensic'
                  ? 'bg-indigo-900 text-white shadow-md'
                  : 'text-slate-600 hover:text-indigo-900 hover:bg-slate-200/50'
              }`}
            >
              2. Caso Forense: Mayfair Diner
            </button>
            <button
              onClick={() => setActiveTab('riemann')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold font-display transition-all duration-300 pointer-events-auto cursor-pointer ${
                activeTab === 'riemann'
                  ? 'bg-indigo-900 text-white shadow-md'
                  : 'text-slate-600 hover:text-indigo-900 hover:bg-slate-200/50'
              }`}
            >
              3. Sumas de Riemann
            </button>
            <button
              onClick={() => setActiveTab('derivative')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold font-display transition-all duration-300 pointer-events-auto cursor-pointer ${
                activeTab === 'derivative'
                  ? 'bg-indigo-900 text-white shadow-md'
                  : 'text-slate-600 hover:text-indigo-900 hover:bg-slate-200/50'
              }`}
            >
              4. Diferenciación Numérica
            </button>
            <button
              onClick={() => setActiveTab('incremental')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold font-display transition-all duration-300 pointer-events-auto cursor-pointer ${
                activeTab === 'incremental'
                  ? 'bg-indigo-900 text-white shadow-md'
                  : 'text-slate-600 hover:text-indigo-950 hover:bg-slate-200/50'
              }`}
            >
              5. Derivadas por Incrementos
            </button>
            <button
              onClick={() => setActiveTab('differential')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold font-display transition-all duration-300 pointer-events-auto cursor-pointer ${
                activeTab === 'differential'
                  ? 'bg-indigo-900 text-white shadow-md'
                  : 'text-slate-600 hover:text-indigo-900 hover:bg-slate-200/50'
              }`}
            >
              6. Diferencial dy vs Δy
            </button>
            <button
              onClick={() => setActiveTab('ode')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold font-display transition-all duration-300 pointer-events-auto cursor-pointer ${
                activeTab === 'ode'
                  ? 'bg-indigo-900 text-white shadow-md'
                  : 'text-slate-600 hover:text-indigo-900 hover:bg-slate-200/50'
              }`}
            >
              7. Métodos EDOs
            </button>
            <button
              onClick={() => setActiveTab('neuralLimit')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold font-display transition-all duration-300 pointer-events-auto cursor-pointer ${
                activeTab === 'neuralLimit'
                  ? 'bg-indigo-900 text-white shadow-md'
                  : 'text-slate-600 hover:text-indigo-900 hover:bg-slate-200/50'
              }`}
            >
              8. Redes Neuronales y Límites
            </button>
            <button
              onClick={() => setActiveTab('music')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold font-display transition-all duration-300 pointer-events-auto cursor-pointer ${
                activeTab === 'music'
                  ? 'bg-indigo-900 text-white shadow-md'
                  : 'text-slate-600 hover:text-indigo-900 hover:bg-slate-200/50'
              }`}
            >
              9. Cálculo y Música (Beethoven)
            </button>
          </div>
        </div>

        {/* ==================================== TAB 0: LIMIT SIMULATOR ==================================== */}
        {activeTab === 'limit' && (() => {
          // Dynamic curve rendering inside the local render block
          const limitCurveSteps = 120;
          let limitCurvePoints = '';
          for (let i = 0; i <= limitCurveSteps; i++) {
            const xVal = (i / limitCurveSteps) * 4;
            // Draw continuous line; we'll overlay the hollow dot visually on top
            const yVal = selectedLimitFnId === 'hole' ? (xVal + 2) : (xVal*xVal - xVal + 1);
            limitCurvePoints += `${i === 0 ? 'M' : 'L'} ${scaleXL(xVal)} ${scaleYL(yVal)} `;
          }

          const currentY = currentLimitFn.f(limitX);
          const diffFromL = Math.abs(currentY - currentLimitFn.L);
          const isCurrentXInDelta = Math.abs(limitX - limitA) <= delta;
          const isCurrentYInEpsilon = diffFromL <= epsilon;

          return (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch max-w-6xl mx-auto">
              {/* Left Column: Pedagogical Controls & Dynamic Feedback */}
              <div className="lg:col-span-5 bg-slate-50 border border-slate-200 p-6 rounded-2xl flex flex-col justify-between math-grid-dense">
                <div className="space-y-6">
                  {/* 1. Curve choice */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase">
                      1. Seleccione un Escenario de Límite
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {limitFunctions.map(fn => (
                        <button
                          key={fn.id}
                          onClick={() => {
                            setSelectedLimitFnId(fn.id);
                            // Reset test X point to be close
                            setLimitX(fn.id === 'hole' ? 1.5 : 1.4);
                          }}
                          className={`text-left px-4 py-2.5 rounded-xl text-xs font-semibold font-display border transition-all ${
                            selectedLimitFnId === fn.id
                              ? 'bg-indigo-900 text-white border-indigo-900 shadow-md shadow-indigo-900/10'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <span className="block font-medium">{fn.name}</span>
                          <span className={`block font-mono text-[9px] mt-0.5 ${selectedLimitFnId === fn.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                            L = {fn.L} cuando x → {limitA}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Epsilon Slider (Error Tolerance) */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-mono font-bold">
                      <span className="text-slate-400 uppercase">2. Tolerancia vertical (ε / Epsilon)</span>
                      <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded text-[11px] font-mono">
                        ε = {epsilon.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.20"
                      max="1.50"
                      step="0.05"
                      value={epsilon}
                      onChange={(e) => setEpsilon(parseFloat(e.target.value))}
                      className="w-full accent-indigo-900 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
                    />
                    <span className="text-[9.5px] text-slate-400 block -mt-1 font-mono">Define el margen aceptable alrededor del valor límite esperado [L - ε, L + ε]</span>
                  </div>

                  {/* 3. Delta Slider (Neighborhood Radius) */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-mono font-bold">
                      <span className="text-slate-405 uppercase">3. Radio del Vecindario (δ / Delta)</span>
                      <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded text-[11px] font-mono">
                        δ = {delta.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="1.10"
                      step="0.05"
                      value={delta}
                      onChange={(e) => setDelta(parseFloat(e.target.value))}
                      className="w-full accent-amber-500 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
                    />
                    <span className="text-[9.5px] text-slate-400 block -mt-1 font-mono">Define la proximidad controlada en el eje de entrada: [a - δ, a + δ]</span>
                  </div>

                  {/* 4. Current testing X value slider */}
                  <div className="space-y-2 border-t border-slate-200/50 pt-4">
                    <div className="flex justify-between items-center text-xs font-mono font-bold">
                      <span className="text-slate-400 uppercase">4. Probar Punto Móvil (x)</span>
                      <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded text-[11px] font-mono">
                        x = {limitX.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.80"
                      max="3.20"
                      step="0.02"
                      value={limitX}
                      onChange={(e) => setLimitX(parseFloat(e.target.value))}
                      className="w-full accent-rose-600 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
                    />
                    <span className="text-[9.5px] text-slate-400 block -mt-1 font-mono">Arrastre para observar si su f(x) aterriza dentro de la franja ε</span>
                  </div>
                </div>

                {/* Didactic Rigorous Verification badge */}
                <div className="mt-8 space-y-3 font-mono">
                  <div className="flex justify-between text-[9.5px] font-bold text-slate-400 pb-1 border-b border-slate-800">
                    <span>ESTADO FORMAL COUPLER (0 &lt; |x - a| &lt; δ)</span>
                    <span>VERIFICACIÓN</span>
                  </div>
                  
                  {isDeltaValid ? (
                    <div className="p-3.5 bg-emerald-900/90 text-emerald-100 rounded-xl text-xs space-y-1 border border-emerald-500/20 leading-relaxed">
                      <p className="font-bold flex items-center gap-1 text-emerald-300">
                        <span>✓</span> DEFINICIÓN COINCIDENTE
                      </p>
                      <p className="text-[11px] text-emerald-200/90 font-normal">
                        Para su radio <span className="font-bold">δ = {delta.toFixed(2)}</span>, TODOS los puntos satisfacen el criterio de Weierstrass: quedan confinados en la banda vertical <span className="font-bold">ε = {epsilon.toFixed(2)}</span>. ¡Búsqueda exitosa!
                      </p>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-amber-950/90 text-amber-150 rounded-xl text-xs space-y-1 border border-amber-500/20 leading-relaxed">
                      <p className="font-bold flex items-center gap-1 text-amber-300">
                        <span>⚠️</span> EXCESO DE TOLERANCIA
                      </p>
                      <p className="text-[11px] text-amber-200/90 font-normal">
                        Hay puntos en el intervalo δ cuyo cálculo sale fuera de la tolerancia ε seleccionada. <span className="font-bold underline">Contraiga el radio δ</span> o aumente la franja vertical ε para re-comprobar.
                      </p>
                    </div>
                  )}

                  {/* Current point live metrics */}
                  <div className="bg-slate-905 bg-slate-900 rounded-xl p-3 text-[11px] text-slate-350 space-y-1.5">
                    <div className="flex justify-between">
                      <span>Proximidad |x - a|:</span>
                      <span className={isCurrentXInDelta ? 'text-amber-300' : 'text-slate-500'}>
                        {Math.abs(limitX - limitA).toFixed(3)} {isCurrentXInDelta ? '(< δ)' : '(fuera de δ)'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Error |f(x) - L|:</span>
                      <span className={isCurrentYInEpsilon ? 'text-emerald-300' : 'text-rose-300'}>
                        {diffFromL.toFixed(3)} {isCurrentYInEpsilon ? '(< ε)' : '(> ε !)'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: High Fidelity SVG epsilon-delta plots */}
              <div className="lg:col-span-7 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                    <span className="font-display font-bold text-sm text-slate-800 flex items-center gap-1.5">
                      <LineChart className="h-4 w-4 text-indigo-600" />
                      Visualizador Dinámico de Entornos Riemann-Cauchy
                    </span>
                    <span className="font-mono text-[10px] bg-slate-100 text-slate-550 px-2 py-0.5 rounded font-bold uppercase select-none">
                      x → {limitA}
                    </span>
                  </div>

                  {/* Main SVG Plotting Canvas */}
                  <div className="relative border border-slate-100 bg-slate-50/50 rounded-xl overflow-hidden">
                    <svg width="100%" height={heightL} viewBox={`0 0 ${widthL} ${heightL}`} className="select-none">
                      {/* Grid background ticks */}
                      {Array.from({ length: 9 }).map((_, i) => (
                        <line
                          key={`lim-gx-${i}`}
                          x1={scaleXL(0.5 * i)}
                          y1={30}
                          x2={scaleXL(0.5 * i)}
                          y2={heightL - 30}
                          stroke="#eef2f6"
                          strokeWidth={1}
                        />
                      ))}
                      {Array.from({ length: 7 }).map((_, i) => (
                        <line
                          key={`lim-gy-${i}`}
                          x1={40}
                          y1={scaleYL(i)}
                          x2={widthL - 20}
                          y2={scaleYL(i)}
                          stroke="#eef2f6"
                          strokeWidth={1}
                        />
                      ))}

                      {/* 1. Epsilon Horizontal band region [L - eps, L + eps] */}
                      <rect
                        x={40}
                        y={scaleYL(currentLimitFn.L + epsilon)}
                        width={widthL - 60}
                        height={scaleYL(currentLimitFn.L - epsilon) - scaleYL(currentLimitFn.L + epsilon)}
                        className="fill-indigo-50/45 stroke-indigo-150 stroke-1 stroke-dashed"
                        style={{ fillOpacity: 0.55 }}
                      />

                      {/* 2. Delta Vertical band region [a - delta, a + delta] */}
                      <rect
                        x={scaleXL(limitA - delta)}
                        y={30}
                        width={scaleXL(limitA + delta) - scaleXL(limitA - delta)}
                        height={heightL - 60}
                        className="fill-amber-50/20 stroke-amber-200/40 stroke-1"
                        style={{ fillOpacity: 0.35 }}
                      />

                      {/* Weierstrass target labels on axes */}
                      {/* Target a line */}
                      <line
                        x1={scaleXL(limitA)}
                        y1={30}
                        x2={scaleXL(limitA)}
                        y2={heightL - 30}
                        stroke="#94a3b8"
                        strokeWidth={1}
                        strokeDasharray="2,2"
                      />
                      {/* Target L line */}
                      <line
                        x1={40}
                        y1={scaleYL(currentLimitFn.L)}
                        x2={widthL - 25}
                        y2={scaleYL(currentLimitFn.L)}
                        stroke="#94a3b8"
                        strokeWidth={1}
                        strokeDasharray="2,2"
                      />

                      {/* Axis Markers */}
                      {/* Epsilon upper border */}
                      <line x1={32} y1={scaleYL(currentLimitFn.L + epsilon)} x2={40} y2={scaleYL(currentLimitFn.L + epsilon)} stroke="#4f46e5" strokeWidth={1.5} />
                      <text x={10} y={scaleYL(currentLimitFn.L + epsilon) + 3} className="font-mono text-[9px] fill-indigo-600 font-semibold">L+ε</text>
                      {/* Epsilon lower border */}
                      <line x1={32} y1={scaleYL(currentLimitFn.L - epsilon)} x2={40} y2={scaleYL(currentLimitFn.L - epsilon)} stroke="#4f46e5" strokeWidth={1.5} />
                      <text x={10} y={scaleYL(currentLimitFn.L - epsilon) + 3} className="font-mono text-[9px] fill-indigo-600 font-semibold">L-ε</text>

                      {/* Delta left border */}
                      <line x1={scaleXL(limitA - delta)} y1={heightL - 30} x2={scaleXL(limitA - delta)} y2={heightL - 22} stroke="#d97706" strokeWidth={1.5} />
                      <text x={scaleXL(limitA - delta) - 10} y={heightL - 12} className="font-mono text-[9px] fill-amber-600 font-semibold">a-δ</text>
                      {/* Delta right border */}
                      <line x1={scaleXL(limitA + delta)} y1={heightL - 30} x2={scaleXL(limitA + delta)} y2={heightL - 22} stroke="#d97706" strokeWidth={1.5} />
                      <text x={scaleXL(limitA + delta) - 10} y={heightL - 12} className="font-mono text-[9px] fill-amber-600 font-semibold">a+δ</text>

                      {/* Center target node a label */}
                      <circle cx={scaleXL(limitA)} cy={heightL - 30} r={2.5} className="fill-slate-800" />
                      <text x={scaleXL(limitA) - 3} y={heightL - 35} className="font-mono text-[10px] fill-slate-800 font-bold">a</text>

                      {/* Dynamic actual curve of limits */}
                      <path
                        d={limitCurvePoints}
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth={2.4}
                        className="drop-shadow-sm select-none"
                      />

                      {/* Hole visual represent (removable discontinuity!) */}
                      {selectedLimitFnId === 'hole' && (
                        <>
                          <circle
                            cx={scaleXL(limitA)}
                            cy={scaleYL(currentLimitFn.L)}
                            r={5.5}
                            className="fill-white stroke-indigo-600 stroke-2"
                          />
                          <line
                            x1={scaleXL(limitA) - 7}
                            y1={scaleYL(currentLimitFn.L) + 7}
                            x2={scaleXL(limitA) + 7}
                            y2={scaleYL(currentLimitFn.L) - 7}
                            stroke="#cbd5e1"
                            strokeWidth={1}
                          />
                        </>
                      )}

                      {/* Active point test x projection lines inside simulation */}
                      <line
                        x1={scaleXL(limitX)}
                        y1={scaleYL(currentY)}
                        x2={scaleXL(limitX)}
                        y2={heightL - 30}
                        stroke="#e11d48"
                        strokeWidth={1}
                        strokeDasharray="3,3"
                      />
                      <line
                        x1={40}
                        y1={scaleYL(currentY)}
                        x2={scaleXL(limitX)}
                        y2={scaleYL(currentY)}
                        stroke="#e11d48"
                        strokeWidth={1}
                        strokeDasharray="3,3"
                      />

                      {/* Active point indicator node Q */}
                      <circle
                        cx={scaleXL(limitX)}
                        cy={scaleYL(currentY)}
                        r={5}
                        className="fill-rose-500 stroke-white stroke-2 shadow-sm animate-pulse"
                      />
                      <text
                        x={scaleXL(limitX) - 15}
                        y={scaleYL(currentY) - 10}
                        className="font-mono text-[9px] font-bold fill-rose-600 bg-white px-0.5 rounded shadow-sm border border-slate-100"
                      >
                        f(x)
                      </text>

                      {/* X point visual cursor location */}
                      <circle cx={scaleXL(limitX)} cy={heightL - 30} r={4} className="fill-rose-600 stroke-white stroke-1" />
                      <text x={scaleXL(limitX) - 3} y={heightL - 35} className="font-mono text-[9px] font-semibold fill-rose-700">x</text>

                      {/* Center expected Limit L indicator node */}
                      <circle cx={40} cy={scaleYL(currentLimitFn.L)} r={3} className="fill-indigo-600" />
                      <text x={12} y={scaleYL(currentLimitFn.L) + 3} className="font-mono text-[10px] fill-indigo-750 font-bold">L</text>
                    </svg>
                  </div>
                </div>

                {/* Pedagogical text breakdown */}
                <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start space-x-3 text-xs text-indigo-900 font-normal leading-relaxed">
                  <BookOpen className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold font-display text-sm text-indigo-950">Explicación Didáctica y Pedagógica:</h5>
                    <p className="mt-1 text-indigo-900/90 text-[11.5px]">
                      Históricamente, los estudiantes se topan con una barrera conceptual fundamental al aprender límites: la necesidad de que una variable <span className="font-mono bg-indigo-100 px-1 py-0.5 rounded text-indigo-805 font-semibold">x</span> "llegue" o "toque" al punto de acumulación <span className="font-mono bg-indigo-100 px-1 py-0.5 rounded text-indigo-805 font-semibold">a</span>. El Dr. Erick propone un enfoque visual basado en <span className="font-semibold">tolerancias de vecindades controladas</span>.
                    </p>
                    <p className="mt-2 text-indigo-900/90 text-[11.5px]">
                      Observe la <strong className="font-semibold text-indigo-950">Discontinuidad Evitable</strong>: en <span className="font-mono bg-indigo-100 px-1 py-0.5 rounded text-indigo-805 font-semibold">x = 2.00</span> el denominador de la fracción se anula, resultando geométricamente en un <strong className="font-bold text-indigo-950">vacío gráfico (balazo)</strong>. Sin embargo, no nos interesa el valor exacto de la función en <span className="font-mono bg-indigo-100 px-1 py-0.5 rounded text-indigo-850 font-bold">a</span>, sino su tendencia a medida que <span className="font-mono bg-indigo-100 px-1 py-0.5 rounded text-indigo-850 font-bold">x</span> se adentra en la vecindad del eje horizontal definida por <span className="font-mono font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">δ</span> (Delta).
                    </p>
                    <p className="mt-2 text-indigo-900/90 text-[11.5px]">
                      El límite formal <span className="font-mono bg-indigo-900 text-white px-2 py-1 rounded inline-block font-bold">lim<sub>x → a</sub> f(x) = L</span> queda rigurosamente demostrado cuando usted puede contraer el radio de entrada <span className="font-mono font-bold bg-amber-100 text-amber-800 px-1 py-0.5 rounded">δ</span> de manera tal que obligue a que todas las imágenes de salida correspondientes queden confinadas dentro del margen de error admisible <span className="font-mono font-bold bg-indigo-150 bg-indigo-200 text-indigo-900 px-1 py-0.5 rounded">ε</span> (Epsilon).
                    </p>
                    <p className="mt-2 text-indigo-900/90 text-[11.5px] border-t border-indigo-200/50 pt-2 font-mono text-[11px] bg-indigo-100/30 p-2 rounded-lg">
                      <strong className="block text-indigo-950 font-sans font-bold text-[12px] mb-1">Definición Formal de Weierstrass (ε - δ):</strong>
                      ∀ ε &gt; 0, ∃ δ &gt; 0 tales que si: 0 &lt; |x - a| &lt; δ ⇒ |f(x) - L| &lt; ε.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ==================================== TAB 2: Case Study "Murder at Mayfair Diner" ==================================== */}
        {activeTab === 'forensic' && (() => {
          const k = (mayfairT0 > mayfairT630 && mayfairT630 > mayfairTm)
            ? 2 * Math.log((mayfairT0 - mayfairTm) / (mayfairT630 - mayfairTm))
            : 0.057971;

          const tdFreezer = Math.log((mayfairTdeath - mayfairTm) / (mayfairT0 - mayfairTm)) / k;
          let td = tdFreezer;
          let diedInFreezer = true;

          if (tdFreezer > mayfairH) {
            const num = mayfairTdeath - mayfairTroom;
            const denom = (mayfairT0 - mayfairTm) * Math.exp(k * mayfairH) - (mayfairTroom - mayfairTm);
            if (denom > 0 && num > 0) {
              td = mayfairH + Math.log(num / denom) / k;
              diedInFreezer = false;
            }
          }

          if (isNaN(td) || td < 0) {
            td = tdFreezer;
          }

          // Clock conversion
          const getClockTime = (hoursBefore6: number) => {
            let decimalHour = 6.0 - hoursBefore6;
            while (decimalHour < 0) {
              decimalHour += 24;
            }
            const totalMinutes = Math.round(decimalHour * 60);
            const h24 = (Math.floor(totalMinutes / 60)) % 24;
            const mins = totalMinutes % 60;
            const ampm = h24 >= 12 ? 'p.m.' : 'a.m.';
            let h12 = h24 % 12;
            if (h12 === 0) h12 = 12;
            const minStr = mins < 10 ? `0${mins}` : `${mins}`;
            return `${h12}:${minStr} ${ampm}`;
          };

          const getSuspectInfo = (hoursBefore6: number) => {
            let decimalHour = 6.0 - hoursBefore6;
            while (decimalHour < 0) {
              decimalHour += 24;
            }
            const t = decimalHour; // Float 0-24
            
            // Suspect time boundaries
            if (t >= 17.0 && t <= 18.25) {
              return {
                name: 'Twinkles (Ex-esposa)',
                alibi: 'Discutió a gritos con Joe Wood entre las 5:00 p.m. y las 6:00 p.m., y huyó apresuradamente poco después.',
                color: 'text-pink-600',
                fill: '#db2777',
                bg: 'bg-pink-50 border-pink-200',
                badge: 'bg-pink-100 text-pink-700',
                description: 'La hora estimada del deceso coincide directamente con el altercado violento de Twinkles.'
              };
            } else if (t >= 22.0 && t <= 23.0) {
              return {
                name: 'Slim (El Corredor de Apuestas)',
                alibi: 'Visto murmurando intensamente con Joe Wood entre las 10:00 p.m. y las 11:00 p.m. con ademanes nerviosos.',
                color: 'text-amber-600',
                fill: '#d97706',
                bg: 'bg-amber-50 border-amber-200',
                badge: 'bg-amber-100 text-amber-700',
                description: 'El deceso concuerda con la tensa reunión privada de Slim con la víctima.'
              };
            } else if (t > 23.0 || t < 2.5) {
              return {
                name: 'Shorty (El Cocinero)',
                alibi: 'Discutió por el plato de ternera, se tomó un descanso misteriosamente largo a las 10:30 p.m., y abandonó el diner furioso a las 2:00 a.m. al cierre.',
                color: 'text-indigo-600',
                fill: '#4f46e5',
                bg: 'bg-indigo-50 border-indigo-200',
                badge: 'bg-indigo-100 text-indigo-700',
                description: 'La muerte ocurrió de madrugada dentro del local. Shorty tenía acceso al sótano y estuvo allí.'
              };
            } else {
              return {
                name: 'Ningún sospechoso con ventana directa',
                alibi: 'La hora cae en un vacío de coartadas temporales registradas en los testimonios policiacos.',
                color: 'text-slate-500',
                fill: '#64748b',
                bg: 'bg-slate-50 border-slate-200',
                badge: 'bg-slate-100 text-slate-700',
                description: 'Mueva los parámetros ambientales de enfriamiento de la autopsia para recalcular.'
              };
            }
          };

          const suspect = getSuspectInfo(td);

          // Build cooling curve coordinates: 0 (4pm previous day) to 14.5 (6:30am today)
          const pointsCount = 120;
          let pathD = '';
          const getTempAtTau = (tau: number) => {
            const tau_d = 14.0 - td;
            const tau_move = 14.0 - mayfairH;
            if (tau < tau_d) {
              return mayfairTdeath;
            }
            if (tau <= tau_move) {
              const t = 14.0 - tau;
              return mayfairTroom + (mayfairT0 - mayfairTm) * Math.exp(k * t) - (mayfairTroom - mayfairTm) * Math.exp(k * (t - mayfairH));
            } else {
              const t = 14.0 - tau;
              return mayfairTm + (mayfairT0 - mayfairTm) * Math.exp(k * t);
            }
          };

          const width = 500;
          const height = 310;
          const scaleX = (tau: number) => (tau / 14.5) * (width - 60) + 45;
          const scaleY = (temp: number) => height - 35 - ((temp - 40) / 60) * (height - 55);

          for (let i = 0; i <= pointsCount; i++) {
            const tau = (i / pointsCount) * 14.5;
            const temp = getTempAtTau(tau);
            const xSvg = scaleX(tau);
            const ySvg = scaleY(temp);
            if (i === 0) {
              pathD += `M ${xSvg} ${ySvg}`;
            } else {
              pathD += ` L ${xSvg} ${ySvg}`;
            }
          }

          const deathTau = 14.0 - td;
          const moveTau = 14.0 - mayfairH;

          // Help check time to standard values
          const hoursToDinerTimeLabel = (hBefore6: number) => {
            let decimalHour = 6.0 - hBefore6;
            while (decimalHour < 0) {
              decimalHour += 24;
            }
            const h24 = Math.floor(decimalHour);
            const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
            const ampm = h24 >= 12 ? 'pm' : 'am';
            return `${h12} ${ampm}`;
          };

          return (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch max-w-6xl mx-auto font-sans">
              {/* Controls and autopsy sliders */}
              <div className="lg:col-span-5 bg-slate-50 border border-slate-200 p-6 rounded-2xl flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-mono font-bold text-indigo-900 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                      <Clock className="h-4 w-4 text-indigo-600" />
                      LEY DE ENFRIAMIENTO FORENSE
                    </h3>
                    <h4 className="text-slate-800 font-display font-bold text-lg mt-1">
                      Misterio Forense en el Diner Mayfair
                    </h4>
                    <p className="text-slate-500 text-xs leading-relaxed mt-1">
                      Joe D. Wood fue hallado sin vida en el sótano del diner a las 5:30 am. Modifique los parámetros de la autopsia para reconstruir el deceso aplicando la EDO de enfriamiento de Newton combinada con la función escalón de Heaviside.
                    </p>
                  </div>

                  {/* Slider 1: h (time placed in walkin) */}
                  <div className="bg-white border border-slate-100 p-3.5 rounded-xl space-y-2 shadow-sm">
                    <div className="flex justify-between items-center text-xs font-mono font-bold">
                      <span className="text-slate-500">1. Traslado al congelador (h)</span>
                      <span className="text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded text-[11px] font-bold">
                        {hoursToDinerTimeLabel(mayfairH)} ({mayfairH.toFixed(1)}h antes)
                      </span>
                    </div>
                    <input
                      type="range"
                      min="2.0"
                      max="12.0"
                      step="0.5"
                      value={mayfairH}
                      onChange={(e) => setMayfairH(parseFloat(e.target.value))}
                      className="w-full accent-indigo-900 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Controla cuándo se movió el cuerpo al refrigerador (50°F) desde la sala principal (70°F).
                    </p>
                  </div>

                  {/* Slider 2: Refrigerator temp */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white border border-slate-100 p-3 rounded-lg shadow-sm space-y-1">
                      <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase">Temp. Congelador (Tm)</label>
                      <input
                        type="number"
                        min="40"
                        max="60"
                        step="0.5"
                        value={mayfairTm}
                        onChange={(e) => setMayfairTm(parseFloat(e.target.value) || 50)}
                        className="w-full text-center bg-slate-50 border border-slate-200 rounded p-1 text-xs font-mono font-bold"
                      />
                    </div>
                    <div className="bg-white border border-slate-100 p-3 rounded-lg shadow-sm space-y-1">
                      <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase">Temp. Diner (Troom)</label>
                      <input
                        type="number"
                        min="65"
                        max="80"
                        step="0.5"
                        value={mayfairTroom}
                        onChange={(e) => setMayfairTroom(parseFloat(e.target.value) || 70)}
                        className="w-full text-center bg-slate-50 border border-slate-200 rounded p-1 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>

                  {/* Sliders for body temps */}
                  <div className="bg-white border border-slate-100 p-3.5 rounded-xl space-y-3.5 shadow-sm">
                    {/* T0 at 6 am */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-mono font-bold">
                        <span className="text-slate-500">T(6:00 am) llegada</span>
                        <span className="text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                          {mayfairT0.toFixed(1)} °F
                        </span>
                      </div>
                      <input
                        type="range"
                        min="75.0"
                        max="95.0"
                        step="0.5"
                        value={mayfairT0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setMayfairT0(val);
                          if (mayfairT630 >= val) {
                            setMayfairT630(val - 1.0);
                          }
                        }}
                        className="w-full accent-indigo-900 bg-slate-200 h-1 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* T6:30 am */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-mono font-bold">
                        <span className="text-slate-500">T(6:30 am)</span>
                        <span className="text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                          {mayfairT630.toFixed(1)} °F
                        </span>
                      </div>
                      <input
                        type="range"
                        min="74.0"
                        max={(mayfairT0 - 0.5).toString()}
                        step="0.5"
                        value={mayfairT630}
                        onChange={(e) => setMayfairT630(parseFloat(e.target.value))}
                        className="w-full accent-indigo-900 bg-slate-200 h-1 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Tdeath */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-mono font-bold">
                        <span className="text-slate-500">Temp. en vida (T_muerte)</span>
                        <span className="text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                          {mayfairTdeath.toFixed(1)} °F
                        </span>
                      </div>
                      <input
                        type="range"
                        min="96.0"
                        max="100.0"
                        step="0.1"
                        value={mayfairTdeath}
                        onChange={(e) => setMayfairTdeath(parseFloat(e.target.value))}
                        className="w-full accent-indigo-900 bg-slate-200 h-1 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>

                </div>

                {/* Autopsy verdict footer */}
                <div className="p-4 bg-slate-900 text-slate-400 font-mono rounded-xl mt-6 space-y-2 bg-slate-950">
                  <div className="flex justify-between items-center text-xs">
                    <span>Constante experimental (k):</span>
                    <span className="text-white font-bold">{k.toFixed(5)} hr⁻¹</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span>Tiempo total de enfriamiento:</span>
                    <span className="text-white font-bold">{td.toFixed(2)} horas</span>
                  </div>
                </div>

              </div>

              {/* Graphic curve and autopsies analysis */}
              <div className="lg:col-span-7 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <Thermometer className="h-4.5 w-4.5 text-indigo-600 animate-pulse" />
                    <span className="font-display font-bold text-sm text-slate-800">Gráfico de Enfriamiento Continuo Recíproco</span>
                  </div>

                  {/* SVG Plot Mayfair */}
                  <div className="relative border border-slate-100 bg-slate-50/50 rounded-xl overflow-hidden shadow-inner">
                    <svg
                      width="100%"
                      height={height}
                      viewBox={`0 0 ${width} ${height}`}
                      className="select-none"
                    >
                      {/* Grid background ticks */}
                      {Array.from({ length: 8 }).map((_, i) => {
                        const tauVal = i * 2;
                        return (
                          <line
                            key={`mgrid-x-${i}`}
                            x1={scaleX(tauVal)}
                            y1={20}
                            x2={scaleX(tauVal)}
                            y2={height - 30}
                            stroke="#f1f5f9"
                            strokeWidth={1}
                          />
                        );
                      })}
                      {Array.from({ length: 7 }).map((_, i) => {
                        const tempVal = 40 + i * 10;
                        return (
                          <line
                            key={`mgrid-y-${i}`}
                            x1={40}
                            y1={scaleY(tempVal)}
                            x2={width - 15}
                            y2={scaleY(tempVal)}
                            stroke="#f1f5f9"
                            strokeWidth={1}
                          />
                        );
                      })}

                      {/* Moving to refrigerator vertical line and box */}
                      {moveTau > 0 && moveTau < 14.5 && (
                        <>
                          <line
                            x1={scaleX(moveTau)}
                            y1={20}
                            x2={scaleX(moveTau)}
                            y2={height - 30}
                            stroke="#cbd5e1"
                            strokeWidth={1.5}
                            strokeDasharray="4,4"
                          />
                          <text
                            x={scaleX(moveTau) <= 240 ? scaleX(moveTau) + 6 : scaleX(moveTau) - 6}
                            y={40}
                            textAnchor={scaleX(moveTau) <= 240 ? 'start' : 'end'}
                            className="font-mono text-[9px] font-bold fill-slate-400"
                          >
                            Traslado al Congelador
                          </text>
                        </>
                      )}

                      {/* Time of death vertical line and box */}
                      {deathTau > 0 && deathTau < 14.5 && (
                        <>
                          <line
                            x1={scaleX(deathTau)}
                            y1={20}
                            x2={scaleX(deathTau)}
                            y2={height - 30}
                            stroke={suspect.fill}
                            strokeWidth={1.8}
                            strokeDasharray="2,2"
                          />
                          <circle
                            cx={scaleX(deathTau)}
                            cy={scaleY(mayfairTdeath)}
                            r={5.5}
                            fill={suspect.fill}
                            className="stroke-white stroke-2 animate-ping"
                          />
                          <circle
                            cx={scaleX(deathTau)}
                            cy={scaleY(mayfairTdeath)}
                            r={5}
                            fill={suspect.fill}
                            className="stroke-white stroke-1.5"
                          />
                          <text
                            x={scaleX(deathTau) + 8}
                            y={scaleY(mayfairTdeath) - 5}
                            className="font-sans font-bold text-[9.5px]"
                            fill={suspect.fill}
                          >
                            Homicidio ({getClockTime(td)})
                          </text>
                        </>
                      )}

                      {/* Standard Body temperature line at 98.6 */}
                      <line
                        x1={40}
                        y1={scaleY(mayfairTdeath)}
                        x2={width - 15}
                        y2={scaleY(mayfairTdeath)}
                        stroke="#f43f5e"
                        strokeWidth={1}
                        strokeDasharray="5,5"
                        opacity={0.6}
                      />

                      {/* Plot path of body temperature */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#312e81"
                        strokeWidth={3}
                        strokeLinecap="round"
                        className="drop-shadow-sm"
                      />

                      {/* Core body temp circle at 0h (6 am arrival) */}
                      <circle
                        cx={scaleX(14)}
                        cy={scaleY(mayfairT0)}
                        r={4.5}
                        className="fill-indigo-900 stroke-white stroke-1"
                      />
                      <text
                        x={scaleX(14) - 45}
                        y={scaleY(mayfairT0) + 12}
                        className="font-mono text-[8px] font-bold fill-indigo-950"
                      >
                        6 am ({mayfairT0.toFixed(1)}°F)
                      </text>

                      {/* Core body temp circle at -0.5h (6:30 am check) */}
                      <circle
                        cx={scaleX(14.5)}
                        cy={scaleY(mayfairT630)}
                        r={4}
                        className="fill-indigo-800 stroke-white stroke-1"
                      />
                      <text
                        x={scaleX(14.5) - 62}
                        y={scaleY(mayfairT630) - 8}
                        className="font-mono text-[8px] font-bold fill-indigo-900"
                      >
                        6:30 am ({mayfairT630.toFixed(1)}°F)
                      </text>

                      {/* Legend and axes labels */}
                      {Array.from({ length: 8 }).map((_, i) => {
                        const tauVal = i * 2;
                        const label = hoursToDinerTimeLabel(14.0 - tauVal);
                        return (
                          <text
                            key={`mlbl-x-${i}`}
                            x={scaleX(tauVal)}
                            y={height - 12}
                            textAnchor="middle"
                            className="font-mono text-[8px] fill-slate-400"
                          >
                            {label}
                          </text>
                        );
                      })}
                      {Array.from({ length: 7 }).map((_, i) => {
                        const tempVal = 40 + i * 10;
                        return (
                          <text
                            key={`mlbl-y-${i}`}
                            x={15}
                            y={scaleY(tempVal) + 3}
                            className="font-mono text-[8px] fill-slate-400 text-right"
                          >
                            {tempVal}°
                          </text>
                        );
                      })}

                    </svg>
                  </div>
                </div>

                {/* Verdict report card */}
                <div className={`mt-5 p-5 border rounded-2xl p-4.5 space-y-3 shadow-sm ${suspect.bg} transition-all duration-300`}>
                  <div className="flex justify-between items-start flex-col sm:flex-row gap-2">
                    <div>
                      <span className="font-mono text-[10px] font-bold text-indigo-900 uppercase block tracking-widest leading-none mb-1">
                        INFORME FISCAL MAYFAIR
                      </span>
                      <h4 className="font-display font-extrabold text-base text-slate-800 leading-tight">
                        Sospechoso Clave: <span className={suspect.color}>{suspect.name}</span>
                      </h4>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-mono font-bold uppercase ${suspect.badge}`}>
                      U = {diedInFreezer ? '0 (Forente)' : '1 (Trasladado)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-sans mt-1">
                    {suspect.description}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono italic leading-relaxed pt-1.5 border-t border-slate-200/50">
                    Coartada del Sospechoso: &ldquo;{suspect.alibi}&rdquo;
                  </p>
                </div>

              </div>

              {/* Comprehensive Didactic Section */}
              <div className="lg:col-span-12 bg-slate-50 border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                <div className="border-b border-slate-200 pb-3">
                  <h3 className="font-display font-bold text-lg text-slate-800 flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-indigo-600 animate-pulse" />
                    El Modelo Matemático Paso a Paso: Zill Sección 7.3
                  </h3>
                  <p className="text-slate-500 text-xs mt-1">
                    Para entender los límites del cálculo forense y por qué es rigurosamente didáctico el modelaje de este homidicio.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Newtonian Cooling Backwards */}
                  <div className="bg-white border border-slate-150 rounded-xl p-5 shadow-sm space-y-2 font-sans">
                    <span className="font-mono text-[10px] font-bold text-indigo-600 uppercase tracking-widest block">1. Tiempo Retrógrado de Marlow</span>
                    <h4 className="font-display font-bold text-slate-800 text-sm">¿Por qué el modelo es y(t) = 50 + 35·e<sup>kt</sup>?</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Detective Daphne decide usar un tiempo <span className="font-mono bg-slate-100 px-1 py-0.5 rounded font-bold">t ≥ 0</span> que va hacia el pasado (<span className="font-mono">t=0</span> es 6:00 am, <span className="font-mono">t=4</span> es 2:00 am). Por lo tanto, el deceso ocurrió en un tiempo positivo del modelo. Como el cadáver se calienta a medida que retrocedemos, la tasa <span className="font-mono">dT/dt</span> es positiva:
                    </p>
                    <div className="p-3 bg-slate-50 rounded-lg text-center font-mono text-xs text-slate-800 leading-normal">
                      <strong>dT/dt = k(T - T_m)</strong> , con k &gt; 0
                      <br /> 
                      T(t) = T_m + (T(0) - T_m)e<sup>kt</sup>
                    </div>
                  </div>

                  {/* Math behind move with unit step function */}
                  <div className="bg-white border border-slate-150 rounded-xl p-5 shadow-sm space-y-2 font-sans">
                    <span className="font-mono text-[10px] font-bold text-emerald-600 uppercase tracking-widest block">2. La Función de Heaviside (U)</span>
                    <h4 className="font-display font-semibold text-slate-800 text-sm">Función Escalón Unitario t_traslado (h)</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      El traslado del diner a temperatura ambiente (70°F) al congelador (50°F) sucedió <span className="font-mono">h</span> horas antes de las 6:00 am. En variable retrógrada, para tiempos recientes (<span className="font-mono">t &lt; h</span>) la temperatura es 50°F, y para tiempos distantes (<span className="font-mono">t ≥ h</span>) es 70°F. Esto se modela elegantemente como:
                    </p>
                    <div className="p-3 bg-slate-50 rounded-lg text-center font-mono text-xs text-slate-800 leading-normal">
                      <strong>T_m(t) = 50 + 20·&Upsilon;(t - h)</strong>
                      <br />
                      donde &Upsilon;(x) = 0 para x &lt; 0, y 1 para x &ge; 0
                    </div>
                  </div>
                </div>

                {/* Analytical breakdown for Large h */}
                <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm space-y-3 font-sans">
                  <h4 className="font-display font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <BookOpen className="h-4.5 w-4.5 text-indigo-600" />
                    ¿Por qué valores grandes de h dan el mismo tiempo de deceso?
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Si el cuerpo fue trasladado al refrigerador a las 6:00 p.m. previous day (<span className="font-mono">h = 12</span>), y el homicidio ocurrió a las 12:20 a.m. (<span className="font-mono">t_death = 5.66</span>), el deceso ocurrió <strong>después</strong> del traslado en tiempo real (es decir, <span className="font-mono">t_death &lt; h</span> en variable retrógrada).
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Por ende, el cadáver estuvo dentro del congelador durante toda su etapa de enfriamiento, y nunca estuvo bajo la temperatura de 70°F. Por eso, para cualquier tiempo de traslado mayor a 5.66 horas (<span className="font-mono font-bold bg-indigo-50 text-indigo-700 px-1 py-0.5 rounded">h ≥ 5.66</span> horas), el modelo predice exactamente la misma hora invariante: <strong>12:20 a.m.</strong>, convirtiendo al cocinero Shorty en el único culpable potencial.
                  </p>
                </div>

              </div>

            </div>
          );
        })()}

        {/* ==================================== TAB 3: RIEMANN INTEGRATION SIMULATOR ==================================== */}
        {activeTab === 'riemann' && (() => {
          // List of functions for Riemann simulation
          const riemannFns = {
            quadratic: {
              id: 'quadratic',
              a: 0,
              b: 3,
              maxYSelector: 8,
              f: (x: number) => x * x - x + 1,
              exact: 7.5,
              formulaTex: 'x² - x + 1',
              formulaLabel: 'f(x) = x² - x + 1',
              name: 'Polinómica cuadrática',
              desc: 'Una curva parabólica continua y positiva en el intervalo [0, 3]. Ideal para evaluar sesgos geométricos fáciles.'
            },
            sin: {
              id: 'sin',
              a: 0,
              b: Math.PI,
              maxYSelector: 3.5,
              f: (x: number) => Math.sin(x) + 2,
              exact: 2 + 2 * Math.PI, // approx 8.2831853
              formulaTex: 'sen(x) + 2',
              formulaLabel: 'f(x) = sen(x) + 2',
              name: 'Seno desplazado',
              desc: 'Forma sinusoidal suave en [0, π]. Ilustra la simetría y compensación de errores en sumas de punto medio y trapezoide.'
            },
            exp: {
              id: 'exp',
              a: 0,
              b: 4,
              maxYSelector: 1.8,
              f: (x: number) => Math.exp(-x / 2) + 0.5,
              exact: 4 - 2 * Math.exp(-2), // approx 3.729329
              formulaTex: 'e⁻ˣ/² + 0.5',
              formulaLabel: 'f(x) = e⁻ˣ/² + 0.5',
              name: 'Decaimiento exponencial',
              desc: 'Una curva asintótica decreciente y muy suave. Magnífico caso para analizar sesgos sistemáticos en extremos izquierdo/derecho.'
            }
          };

          const currentFn = riemannFns[selectedRiemannFnId];
          const a = currentFn.a;
          const b = currentFn.b;
          const minY = 0;
          const maxY = currentFn.maxYSelector;

          // SVG Dimension and Scale maps
          const widthR = 500;
          const heightR = 310;
          const scaleXR = (val: number) => 45 + ((val - a) / (b - a)) * (widthR - 65);
          const scaleYR = (val: number) => heightR - 35 - ((val - minY) / (maxY - minY)) * (heightR - 55);

          // Real-time Partition computations
          const dx = (b - a) / riemannN;
          const partitions = [];
          let approxArea = 0;

          for (let i = 0; i < riemannN; i++) {
            const xStart = a + i * dx;
            const xEnd = a + (i + 1) * dx;
            let xEval = xStart;
            let yEval = 0;
            let area = 0;

            if (riemannMethod === 'left') {
              xEval = xStart;
              yEval = currentFn.f(xEval);
              area = yEval * dx;
            } else if (riemannMethod === 'right') {
              xEval = xEnd;
              yEval = currentFn.f(xEval);
              area = yEval * dx;
            } else if (riemannMethod === 'midpoint') {
              xEval = (xStart + xEnd) / 2;
              yEval = currentFn.f(xEval);
              area = yEval * dx;
            } else if (riemannMethod === 'trapezoid') {
              const yStart = currentFn.f(xStart);
              const yEnd = currentFn.f(xEnd);
              yEval = (yStart + yEnd) / 2;
              area = yEval * dx;
            }

            approxArea += area;
            partitions.push({
              index: i,
              xStart,
              xEnd,
              xEval,
              yEval,
              area
            });
          }

          const exactArea = currentFn.exact;
          const absError = Math.abs(exactArea - approxArea);
          const relErrorPct = (absError / exactArea) * 100;
          const isUnderEstimated = approxArea < exactArea;

          // Curve plotting coordinates list
          let curvePathD = '';
          const curveSteps = 120;
          for (let s = 0; s <= curveSteps; s++) {
            const xVal = a + (s / curveSteps) * (b - a);
            const yVal = currentFn.f(xVal);
            const px = scaleXR(xVal);
            const py = scaleYR(yVal);
            if (s === 0) {
              curvePathD += `M ${px} ${py}`;
            } else {
              curvePathD += ` L ${px} ${py}`;
            }
          }

          const exactAreaPathD = `${curvePathD} L ${scaleXR(b)} ${scaleYR(0)} L ${scaleXR(a)} ${scaleYR(0)} Z`;

          // Dynamic convergence helper for tables
          const getSumForN = (nVal: number) => {
            const tempDx = (b - a) / nVal;
            let sum = 0;
            for (let j = 0; j < nVal; j++) {
              const xs = a + j * tempDx;
              const xe = a + (j + 1) * tempDx;
              if (riemannMethod === 'left') {
                sum += currentFn.f(xs) * tempDx;
              } else if (riemannMethod === 'right') {
                sum += currentFn.f(xe) * tempDx;
              } else if (riemannMethod === 'midpoint') {
                sum += currentFn.f((xs + xe) / 2) * tempDx;
              } else if (riemannMethod === 'trapezoid') {
                sum += ((currentFn.f(xs) + currentFn.f(xe)) / 2) * tempDx;
              }
            }
            return sum;
          };

          const hoveredCell = hoveredRectIdx !== null ? partitions[hoveredRectIdx] : null;

          return (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch max-w-6xl mx-auto font-sans">
              
              {/* Controls and sliders */}
              <div className="lg:col-span-5 bg-slate-50 border border-slate-200 p-6 rounded-2xl flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-mono font-bold text-indigo-900 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                      <LineChart className="h-4 w-4 text-indigo-600" />
                      SUMAS DE RIEMANN DINÁMICAS
                    </h3>
                    <h4 className="text-slate-800 font-display font-bold text-lg mt-1">
                      Aproximación Numérica de la Integral Definida
                    </h4>
                    <p className="text-slate-500 text-xs leading-relaxed mt-1">
                      La integral definida representa el límite de las Sumas de Riemann cuando el número de particiones tiende a infinito (n → ∞). Examine cómo variando la granularidad y el punto de muestreo incide directamente en el error sistemático.
                    </p>
                  </div>

                  {/* 1. Function Selector Cards */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase">
                      1. Seleccione la función f(x)
                    </label>
                    <div className="grid grid-cols-1 gap-1.5">
                      {Object.values(riemannFns).map((fn) => (
                        <button
                          key={fn.id}
                          onClick={() => setSelectedRiemannFnId(fn.id as any)}
                          className={`text-left p-3 rounded-xl border text-xs transition-all pointer-events-auto cursor-pointer ${
                            selectedRiemannFnId === fn.id
                              ? 'bg-indigo-900 text-white border-indigo-900 shadow-md shadow-indigo-900/10'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <div className="flex justify-between items-center font-bold">
                            <span>{fn.name}</span>
                            <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded ${
                              selectedRiemannFnId === fn.id ? 'bg-indigo-950 text-indigo-200' : 'bg-slate-50 text-slate-400'
                            }`}>
                              {fn.formulaLabel}
                            </span>
                          </div>
                          <p className={`text-[10.5px] leading-snug mt-1 ${selectedRiemannFnId === fn.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {fn.desc}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Riemann Method Selection */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase">
                      2. Esquema de Integración
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      {[
                        { id: 'left', label: 'Izquierda', sym: 'L_n' },
                        { id: 'right', label: 'Derecha', sym: 'R_n' },
                        { id: 'midpoint', label: 'Punto Medio', sym: 'M_n' },
                        { id: 'trapezoid', label: 'Trapezoide', sym: 'T_n' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setRiemannMethod(m.id as any)}
                          className={`p-2.5 rounded-xl border font-sans text-xs flex flex-col items-center justify-center transition-all cursor-pointer ${
                            riemannMethod === m.id
                              ? 'bg-amber-500 border-amber-500 text-slate-950 font-bold shadow-sm'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          <span className="text-[11px] leading-tight font-black">{m.label}</span>
                          <span className={`font-mono text-[9px] mt-0.5 ${
                            riemannMethod === m.id ? 'text-amber-900 font-extrabold' : 'text-slate-400'
                          }`}>
                            {m.sym}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Slider for partitions Count n */}
                  <div className="bg-white border border-slate-150 p-4 rounded-2xl shadow-sm space-y-2.5">
                    <div className="flex justify-between items-center text-xs font-mono font-bold">
                      <span className="text-slate-400 uppercase">3. Particiones (n)</span>
                      <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[11px] font-extrabold">
                        n = {riemannN}
                      </span>
                    </div>

                    <input
                      type="range"
                      min="1"
                      max="150"
                      step="1"
                      value={riemannN}
                      onChange={(e) => setRiemannN(parseInt(e.target.value) || 8)}
                      className="w-full accent-indigo-900 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
                    />

                    {/* Step Increments to allow fast adjustments */}
                    <div className="flex justify-between items-center pt-1 gap-1">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setRiemannN(prev => Math.max(1, prev - 1))}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-mono font-bold cursor-pointer"
                        >
                          -1
                        </button>
                        <button
                          onClick={() => setRiemannN(prev => Math.max(1, prev - 10))}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-mono font-bold cursor-pointer"
                        >
                          -10
                        </button>
                      </div>
                      <span className="text-[9px] font-mono text-slate-400">
                        Δx = {dx.toFixed(5)}
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setRiemannN(prev => Math.min(150, prev + 10))}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-mono font-bold cursor-pointer"
                        >
                          +10
                        </button>
                        <button
                          onClick={() => setRiemannN(prev => Math.min(150, prev + 1))}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-mono font-bold cursor-pointer"
                        >
                          +1
                        </button>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Didactic mathematical display card in console style */}
                <div className="p-4 bg-slate-900 text-slate-300 font-mono rounded-xl mt-6 space-y-2 bg-slate-950 text-[11px] leading-normal border border-slate-800">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 uppercase font-bold text-[9px]">Aproximación Riemann ({riemannMethod.toUpperCase()}):</span>
                    <span className="text-amber-400 font-semibold text-[11.5px]">{approxArea.toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 uppercase font-bold text-[9px]">Cálculo Analítico Real:</span>
                    <span className="text-emerald-400 font-semibold text-[11.5px]">{exactArea.toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-800 pt-1.5 mt-1.5">
                    <span className="text-slate-500 uppercase font-bold text-[9px]">Error de Aproximación:</span>
                    <span className={`${isUnderEstimated ? 'text-amber-500' : 'text-indigo-400'} font-bold`}>
                      {absError.toFixed(6)} ({relErrorPct.toFixed(3)}%)
                    </span>
                  </div>
                </div>

              </div>

              {/* Graphic curve plot and dynamic regions visualizer */}
              <div className="lg:col-span-7 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-4.5 w-4.5 text-indigo-600 animate-pulse" />
                      <span className="font-display font-bold text-sm text-slate-800">Gráfico de Riemann y Envolvente Analítica</span>
                    </div>
                    <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full font-mono font-bold uppercase">
                      f(x) sobre [{a === 0 ? '0' : a.toFixed(1)}, {b === Math.PI ? 'π' : b.toFixed(1)}]
                    </span>
                  </div>

                  {/* SVG Canvas Plotter overlay */}
                  <div className="relative border border-slate-150 bg-slate-50 rounded-xl overflow-hidden shadow-inner">
                    <svg
                      width="100%"
                      height={heightR}
                      viewBox={`0 0 ${widthR} ${heightR}`}
                      className="select-none font-sans"
                    >
                      {/* Grid background ticks & lines */}
                      {Array.from({ length: 7 }).map((_, i) => {
                        const tickX = a + (i / 6) * (b - a);
                        return (
                          <line
                            key={`rgrid-x-${i}`}
                            x1={scaleXR(tickX)}
                            y1={20}
                            x2={scaleXR(tickX)}
                            y2={heightR - 30}
                            stroke="#f1f5f9"
                            strokeWidth={1.5}
                          />
                        );
                      })}
                      {Array.from({ length: 6 }).map((_, i) => {
                        const tickY = minY + (i / 5) * (maxY - minY);
                        return (
                          <line
                            key={`rgrid-y-${i}`}
                            x1={40}
                            y1={scaleYR(tickY)}
                            x2={widthR - 15}
                            y2={scaleYR(tickY)}
                            stroke="#f1f5f9"
                            strokeWidth={1.5}
                          />
                        );
                      })}

                      {/* True Area Under the Curve background shade */}
                      <path
                        d={exactAreaPathD}
                        fill="rgba(16, 185, 129, 0.08)"
                        stroke="none"
                      />

                      {/* Riemann Sum partition elements (rects or trapezoids) */}
                      {partitions.map((part, i) => {
                        const isHovered = hoveredRectIdx === i;
                        const rectW = scaleXR(part.xEnd) - scaleXR(part.xStart);
                        const rectH = scaleYR(0) - scaleYR(part.yEval);

                        const rectFill = isHovered 
                          ? 'rgba(245, 158, 11, 0.28)' 
                          : i % 2 === 0 ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.18)';
                        const rectStroke = isHovered ? '#f59e0b' : 'rgba(99, 102, 241, 0.35)';
                        const rectStrokeW = isHovered ? 2 : 1;

                        if (riemannMethod === 'trapezoid') {
                          // Draw beautiful custom polygon coordinates representing the Trapezoid
                          const pts = `
                            ${scaleXR(part.xStart)},${scaleYR(0)}
                            ${scaleXR(part.xStart)},${scaleYR(currentFn.f(part.xStart))}
                            ${scaleXR(part.xEnd)},${scaleYR(currentFn.f(part.xEnd))}
                            ${scaleXR(part.xEnd)},${scaleYR(0)}
                          `;
                          return (
                            <polygon
                              key={`rpart-${i}`}
                              points={pts}
                              fill={rectFill}
                              stroke={rectStroke}
                              strokeWidth={rectStrokeW}
                              strokeLinejoin="round"
                              onMouseEnter={() => setHoveredRectIdx(i)}
                              onMouseLeave={() => setHoveredRectIdx(null)}
                              className="transition-all duration-150 cursor-pointer"
                            />
                          );
                        } else {
                          // Standard Riemann Sum rectangular bars
                          return (
                            <rect
                              key={`rpart-${i}`}
                              x={scaleXR(part.xStart)}
                              y={scaleYR(part.yEval)}
                              width={rectW}
                              height={Math.max(0, rectH)}
                              fill={rectFill}
                              stroke={rectStroke}
                              strokeWidth={rectStrokeW}
                              onMouseEnter={() => setHoveredRectIdx(i)}
                              onMouseLeave={() => setHoveredRectIdx(null)}
                              className="transition-all duration-150 cursor-pointer"
                            />
                          );
                        }
                      })}

                      {/* Overlay of continuous analytical mathematical curve f(x) */}
                      <path
                        d={curvePathD}
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth={3}
                        strokeLinecap="round"
                        className="drop-shadow-sm"
                      />

                      {/* Display the evaluation nodes when hovering or when N is small */}
                      {riemannN <= 32 && partitions.map((part, i) => {
                        const isHovered = hoveredRectIdx === i;
                        if (riemannMethod === 'trapezoid') {
                          // Trapezoidal points evaluated
                          return (
                            <g key={`reval-pts-${i}`}>
                              <circle
                                cx={scaleXR(part.xStart)}
                                cy={scaleYR(currentFn.f(part.xStart))}
                                r={2.5}
                                fill="#10b981"
                              />
                              <circle
                                cx={scaleXR(part.xEnd)}
                                cy={scaleYR(currentFn.f(part.xEnd))}
                                r={2.5}
                                fill="#10b981"
                              />
                            </g>
                          );
                        }
                        return (
                          <circle
                            key={`reval-pts-${i}`}
                            cx={scaleXR(part.xEval)}
                            cy={scaleYR(part.yEval)}
                            r={isHovered ? 4.5 : 2}
                            fill={isHovered ? '#d97706' : '#4f46e5'}
                            className="stroke-white stroke-1 z-20"
                          />
                        );
                      })}

                      {/* Render a tracking indicator tag showing the analytical values at hover */}
                      {hoveredCell !== null && (
                        <line
                          x1={scaleXR(hoveredCell.xEval)}
                          y1={20}
                          x2={scaleXR(hoveredCell.xEval)}
                          y2={heightR - 30}
                          stroke="#d97706"
                          strokeWidth={1}
                          strokeDasharray="4,4"
                          opacity={0.6}
                        />
                      )}

                      {/* Axes ticks with standard mathematical scales */}
                      {Array.from({ length: 7 }).map((_, i) => {
                        const tickX = a + (i / 6) * (b - a);
                        let label = tickX.toFixed(2);
                        if (selectedRiemannFnId === 'sin') {
                          if (i === 0) label = '0';
                          else if (i === 3) label = 'π/2';
                          else if (i === 6) label = 'π';
                          else label = (tickX / Math.PI).toFixed(2) + 'π';
                        }
                        return (
                          <text
                            key={`rtlbl-x-${i}`}
                            x={scaleXR(tickX)}
                            y={heightR - 12}
                            textAnchor="middle"
                            className="font-mono text-[8.5px] fill-slate-400 font-bold"
                          >
                            {label}
                          </text>
                        );
                      })}
                      {Array.from({ length: 6 }).map((_, i) => {
                        const tickY = minY + (i / 5) * (maxY - minY);
                        return (
                          <text
                            key={`rtlbl-y-${i}`}
                            x={17}
                            y={scaleYR(tickY) + 3}
                            className="font-mono text-[8.5px] fill-slate-400 text-right"
                          >
                            {tickY.toFixed(1)}
                          </text>
                        );
                      })}

                      {/* Axis Label details */}
                      <text x={widthR - 25} y={heightR - 30} className="font-mono text-[9px] fill-slate-500 font-bold">x</text>
                      <text x={38} y={25} className="font-mono text-[9px] fill-slate-500 font-bold">y</text>
                    </svg>
                  </div>
                </div>

                {/* Audit focusing card details displaying selected partition metrics */}
                <div className={`mt-5 p-4 border rounded-2xl transition-all duration-300 min-h-[105px] flex flex-col justify-center shadow-sm ${
                  hoveredCell !== null 
                    ? 'bg-amber-50/50 border-amber-200 text-amber-950' 
                    : 'bg-indigo-50/30 border-indigo-100 text-slate-500'
                }`}>
                  {hoveredCell !== null ? (
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                          DETALLE ELEMENTAL DE PARTICIÓN (SUBINTERVALO {hoveredCell.index + 1} de {riemannN})
                        </span>
                        <span className="font-mono text-[9.5px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                          f(x_i*) · Δx
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                        <div className="bg-white/80 p-2 rounded-lg border border-amber-100">
                          <span className="text-[9.5px] text-amber-700/80 font-mono block uppercase font-bold">Límites:</span>
                          <span className="font-mono text-[11.5px] font-bold">
                            [{hoveredCell.xStart.toFixed(3)}, {hoveredCell.xEnd.toFixed(3)}]
                          </span>
                        </div>
                        <div className="bg-white/80 p-2 rounded-lg border border-amber-100">
                          <span className="text-[9.5px] text-amber-700/80 font-mono block uppercase font-bold">Punto Muestreo x_i*:</span>
                          <span className="font-mono text-[11.5px] font-bold">{hoveredCell.xEval.toFixed(4)}</span>
                        </div>
                        <div className="bg-white/80 p-2 rounded-lg border border-amber-100">
                          <span className="text-[9.5px] text-amber-700/80 font-mono block uppercase font-bold">Altura f(x_i*):</span>
                          <span className="font-mono text-[11.5px] font-bold">{hoveredCell.yEval.toFixed(4)}</span>
                        </div>
                        <div className="bg-white/80 p-2 rounded-lg border border-amber-100">
                          <span className="text-[9.5px] text-amber-700/80 font-mono block uppercase font-bold">Área de Barra:</span>
                          <span className="font-mono text-[11.5px] font-bold text-amber-900 font-extrabold">
                            {hoveredCell.area.toFixed(5)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-1">
                      <p className="text-xs font-semibold text-indigo-950 font-display flex items-center justify-center gap-1.5">
                        💡 Audite la Partición en Tiempo Real
                      </p>
                      <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                        Pase el cursor sobre las barras de la gráfica interactiva para examinar las coordenadas, anchos dX, alturas f(x_i*) y áreas detalladas correspondientes a cada subintervalo elemental.
                      </p>
                    </div>
                  )}
                </div>

              </div>

              {/* Comprehensive Didactic Section comparing multiple partitions to show convergence limits */}
              <div className="lg:col-span-12 bg-slate-50 border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                <div className="border-b border-slate-200 pb-3 flex justify-between items-center flex-wrap gap-2">
                  <div>
                    <h3 className="font-display font-bold text-lg text-slate-800 flex items-center gap-2">
                      <HelpCircle className="h-5 w-5 text-indigo-600" />
                      Análisis de Convergencia del Límite de Riemann
                    </h3>
                    <p className="text-slate-500 text-xs mt-1">
                      Observe el comportamiento asintótico cuando n → ∞. La definición formal de Cauchy afirma que el error de discretización se anula al refinar infinitamente las particiones.
                    </p>
                  </div>
                  <span className="text-xs font-semibold font-mono bg-indigo-50 text-indigo-800 px-3 py-1 rounded-full border border-indigo-100 uppercase tracking-wide">
                    Método Activo: {riemannMethod === 'trapezoid' ? 'Trapecios' : riemannMethod.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                  
                  {/* Real-time calculated partitions matrix table */}
                  <div className="md:col-span-7 bg-white border border-slate-150 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                    <div>
                      <h4 className="font-display font-semibold text-slate-800 text-xs uppercase tracking-wider block mb-2 font-mono text-[10px] text-indigo-900 border-b border-slate-100 pb-1.5">
                        Matriz de Refinamiento de Particiones Evaluada en Vivo
                      </h4>
                      <p className="text-[11px] text-slate-400 mb-3 leading-snug">
                        Computado para el esquema seleccionado en tiempo real en base a la discretización numérica dX sobre el mismo intervalo:
                      </p>
                      
                      <div className="overflow-x-auto rounded-lg border border-slate-100">
                        <table className="min-w-full divide-y divide-slate-100 text-left text-[11px] font-mono">
                          <thead className="bg-slate-50 text-slate-400 text-[8.5px] uppercase font-bold tracking-wider">
                            <tr>
                              <th className="px-3 py-2.5">Particiones (N)</th>
                              <th className="px-3 py-2.5 text-center">Delta x (Δx)</th>
                              <th className="px-3 py-2.5 text-center">Integración Riemann</th>
                              <th className="px-3 py-2.5 text-center">Error Absoluto</th>
                              <th className="px-3 py-2.5 text-right">Tasa Reducción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-600">
                            {[4, 10, 25, 100].map((nVal) => {
                              const calcArea = getSumForN(nVal);
                              const localErr = Math.abs(exactArea - calcArea);
                              const isCurrentN = riemannN === nVal;
                              return (
                                <tr 
                                  key={`conv-n-${nVal}`} 
                                  className={`transition-all ${isCurrentN ? 'bg-amber-50 font-bold text-amber-950' : 'hover:bg-slate-50'}`}
                                >
                                  <td className="px-3 py-3 flex items-center gap-1.5">
                                    <span className={`h-1.5 w-1.5 rounded-full ${isCurrentN ? 'bg-amber-500 animate-ping' : 'bg-indigo-300'}`} />
                                    <span>N = {nVal} particiones</span>
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    {((b - a) / nVal).toFixed(5)}
                                  </td>
                                  <td className="px-3 py-3 text-center text-slate-900 font-semibold">
                                    {calcArea.toFixed(6)}
                                  </td>
                                  <td className="px-3 py-3 text-center font-bold text-rose-500">
                                    {localErr.toFixed(6)}
                                  </td>
                                  <td className="px-3 py-3 text-right text-emerald-600 font-bold">
                                    {((1 - (localErr / Math.abs(exactArea - getSumForN(4)))) * 100).toFixed(1)}% mejor
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400 font-mono italic leading-relaxed mt-3 pt-2.5 border-t border-slate-100">
                      *Tasa de Reducción medida con respecto al error inicial calibrado de N = 4.
                    </p>
                  </div>

                  {/* Geometric error visualization & explanation cards */}
                  <div className="md:col-span-5 bg-white border border-slate-150 rounded-2xl p-5 shadow-sm space-y-4">
                    <div>
                      <h4 className="font-display font-semibold text-slate-800 text-xs uppercase block font-mono text-[10px] text-indigo-900 tracking-wider">
                        Comportamiento Geométrico de Errores
                      </h4>
                      <div className="space-y-3 mt-3.5">
                        
                        <div className="flex items-start gap-2.5 text-xs text-slate-600">
                          <span className="flex-shrink-0 h-5 w-5 bg-indigo-100 rounded-full flex items-center justify-center font-bold text-indigo-700 text-[10px]">
                            A
                          </span>
                          <p className="leading-snug">
                            <strong>Suma Izquierda ({relErrorPct.toFixed(2)}% err)</strong>: En pendientes crecientes (como <span className="font-serif italic text-indigo-900">x²</span> en su tramo positivo) queda <u>por debajo</u> de la curva real (infraestimación / subevaluación), mientras que en pendientes decrecientes queda <u>por arriba</u> (supraestimación).
                          </p>
                        </div>

                        <div className="flex items-start gap-2.5 text-xs text-slate-600">
                          <span className="flex-shrink-0 h-5 w-5 bg-indigo-100 rounded-full flex items-center justify-center font-bold text-indigo-700 text-[10px]">
                            B
                          </span>
                          <p className="leading-snug">
                            <strong>Punto Medio vs Trapezoide</strong>: Al emplear el comportamiento interno de la curva o conectar linealmente las imágenes con segmentos secantes, los métodos de Punto Medio o Trapezoide logran compensar las discrepancias cóncavas y reducen el error en órdenes de convergencia cuadrática <span className="font-serif italic text-indigo-900">O(h²)</span>.
                          </p>
                        </div>

                        <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100 text-[11px] text-indigo-950">
                          <span className="font-black font-mono block text-indigo-900 mb-1 text-[10px] uppercase tracking-wider">Cálculo Analítico Exacto:</span>
                          <div className="flex items-center gap-1 my-1.5 font-serif text-[13px] bg-white px-3 py-2 rounded-lg border border-indigo-50/80 w-fit text-indigo-950 shadow-sm">
                            <span className="text-lg leading-none">∫</span>
                            <span className="flex flex-col text-[8.5px] items-center -ml-1.5 mr-0.5 leading-none">
                              <span className="translate-y-[1px]">{selectedRiemannFnId === 'sin' ? 'π' : b}</span>
                              <span className="-translate-y-[1px]">{a}</span>
                            </span>
                            <span className="italic mr-1">f(x) dx</span>
                            <span className="text-slate-400 font-sans font-normal text-xs">=</span>
                            <span className="italic ml-1">F({selectedRiemannFnId === 'sin' ? 'π' : b}) - F({a})</span>
                            <span className="text-slate-400 font-sans font-normal text-xs">=</span>
                            <span className="font-mono font-bold text-emerald-600 text-xs">{exactArea.toFixed(5)}</span>
                          </div>
                          <p className="text-slate-500 text-[10.5px] leading-tight font-sans">
                            De acuerdo con el <strong>Teorema Fundamental del Cálculo</strong>, la integral exacta se calcula evaluando la antiderivada <span className="font-serif italic">F(x)</span> en los extremos del intervalo.
                          </p>
                        </div>

                      </div>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          );
        })()}

        {/* ==================================== TAB 4: DERIVATIVE SIMULATOR ==================================== */}
        {activeTab === 'derivative' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch max-w-6xl mx-auto">

            {/* Controls Panel & Math Formulas */}
            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 p-6 rounded-2xl flex flex-col justify-between math-grid-dense">
              <div className="space-y-6">

                {/* Function selector widget */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase">
                    1. Seleccione una Función f(x)
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {functions.map(fn => (
                      <button
                        key={fn.id}
                        onClick={() => setSelectedFnId(fn.id)}
                        id={`fn-sel-${fn.id}`}
                        className={`text-left px-4 py-2.5 rounded-xl text-xs font-semibold font-display border transition-all ${
                          selectedFnId === fn.id
                            ? 'bg-indigo-900 text-white border-indigo-900 shadow-md shadow-indigo-900/10'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span className="block font-medium">{fn.name}</span>
                        <span className={`block font-mono text-[9px] mt-0.5 ${selectedFnId === fn.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                          {fn.formulaTex}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Slider for X0 variable */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono font-bold">
                    <span className="text-slate-400 uppercase">2. Posición de Evaluación (X₀)</span>
                    <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                      X₀ = {x0.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="5.5"
                    step="0.05"
                    value={x0}
                    onChange={(e) => setX0(parseFloat(e.target.value))}
                    id="slider-x0"
                    className="w-full accent-indigo-900 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-400 font-mono block leading-tight">Clikee en el lienzo derecho para reubicar X₀ inmediatamente</span>
                </div>

                {/* Slider for Secant H variable */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono font-bold">
                    <span className="text-slate-400 uppercase">3. Intervalo Incremento (h)</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] transition duration-200 ${
                      h < 0.2 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      h = {h.toFixed(2)} {h < 0.25 ? '≈ Límite Cero' : ''}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.02"
                    max="2.2"
                    step="0.02"
                    value={h}
                    onChange={(e) => setH(parseFloat(e.target.value))}
                    id="slider-h"
                    className="w-full accent-rose-600 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Visualization Toggles */}
                <div className="space-y-2 border-t border-slate-200/50 pt-4">
                  <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase">
                    4. Trazado en Lienzo
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowSecant(!showSecant)}
                      id="toggle-secant"
                      className={`flex-1 py-1.5 px-3 rounded-lg text-[10.5px] font-mono font-semibold border transition ${
                        showSecant
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : 'bg-white border-slate-200 text-slate-400'
                      }`}
                    >
                      Secante P-Q
                    </button>
                    <button
                      onClick={() => setShowTangent(!showTangent)}
                      id="toggle-tangent"
                      className={`flex-1 py-1.5 px-3 rounded-lg text-[10.5px] font-mono font-semibold border transition ${
                        showTangent
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-white border-slate-200 text-slate-400'
                      }`}
                    >
                      Tangente f'(x)
                    </button>
                  </div>
                </div>

              </div>

              {/* Diagnostics Stats Summary */}
              <div className="mt-8 bg-slate-900 rounded-xl p-4 text-white space-y-3 font-mono">
                <div className="flex justify-between text-[9.5px] font-bold text-slate-400 pb-1.5 border-b border-slate-800">
                  <span>VARIABLE</span>
                  <span>EVALUACIÓN DE CAMBIO</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Punto P(X₀, f(X₀))</span>
                    <span className="text-indigo-200">({x0.toFixed(2)}, {y0.toFixed(2)})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Punto Q(X₀+h, f(X₀+h))</span>
                    <span className="text-rose-200">({(x0 + h).toFixed(2)}, {yH.toFixed(2)})</span>
                  </div>
                  <hr className="border-slate-800 my-1.5" />
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-[11px] font-semibold text-rose-300">Pendiente m Secante</span>
                    <span className="font-bold text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded text-xs">{mSec.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-[11px] font-semibold text-emerald-300">Derivada f'(x) Real</span>
                    <span className="font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded text-xs">{dy0.toFixed(4)}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* SVG Plotter Frame */}
            <div className="lg:col-span-7 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <LineChart className="h-4 w-4 text-indigo-600" />
                    <span className="font-display font-bold text-sm text-slate-800">Gráfico Interactivo de Variación</span>
                  </div>
                  <button
                    onClick={resetDerivative}
                    id="reset-derivative"
                    className="p-1 px-2.5 hover:bg-slate-50 border border-slate-200 rounded text-[10px] font-mono font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1.5 cursor-pointer pointer-events-auto"
                    title="Restablecer valores"
                  >
                    <RotateCcw className="h-3 w-3" /> Reiniciar
                  </button>
                </div>

                {/* Main SVG Plots Container */}
                <div className="relative border border-slate-100 bg-slate-50/50 rounded-xl overflow-hidden cursor-crosshair">
                  <svg
                    width="100%"
                    height={heightD}
                    viewBox={`0 0 ${widthD} ${heightD}`}
                    onClick={handleSvgDerivativeClick}
                    className="select-none"
                  >
                    {/* Grid Lines background */}
                    {Array.from({ length: 9 }).map((_, i) => (
                      <line
                        key={`grid-x-${i}`}
                        x1={scaleXD(i)}
                        y1={30}
                        x2={scaleXD(i)}
                        y2={heightD - 30}
                        stroke="#e2e8f0"
                        strokeWidth={0.5}
                      />
                    ))}
                    {Array.from({ length: 6 }).map((_, i) => (
                      <line
                        key={`grid-y-${i}`}
                        x1={40}
                        y1={scaleYD(i)}
                        x2={widthD - 20}
                        y2={scaleYD(i)}
                        stroke="#e2e8f0"
                        strokeWidth={0.5}
                      />
                    ))}

                    {/* Mathematical Function curve */}
                    <path
                      d={dCurvePoints}
                      fill="none"
                      stroke="#4f46e5"
                      strokeWidth={2.5}
                      className="drop-shadow-sm"
                    />

                    {/* Draw Dotted Secant line */}
                    {showSecant && (
                      <line
                        x1={secLine.x1}
                        y1={secLine.y1}
                        x2={secLine.x2}
                        y2={secLine.y2}
                        stroke="#f43f5e"
                        strokeWidth={1.5}
                        strokeDasharray="4,4"
                      />
                    )}

                    {/* Draw Solid Tangent line */}
                    {showTangent && (
                      <line
                        x1={tanLine.x1}
                        y1={tanLine.y1}
                        x2={tanLine.x2}
                        y2={tanLine.y2}
                        stroke="#10b981"
                        strokeWidth={2.2}
                      />
                    )}

                    {/* Draw Punto Q (x0 + h, f(x0 + h)) */}
                    {showSecant && (
                      <>
                        <circle
                          cx={scaleXD(x0 + h)}
                          cy={scaleYD(yH)}
                          r={5.5}
                          className="fill-rose-500 stroke-white stroke-2 shadow-sm"
                        />
                        <text
                          x={scaleXD(x0 + h) + 8}
                          y={scaleYD(yH) - 8}
                          className="font-mono text-[9px] font-bold fill-rose-600 bg-white px-0.5 rounded"
                        >
                          Q
                        </text>
                      </>
                    )}

                    {/* Draw Punto P (x0, f(x0)) */}
                    <circle
                      cx={scaleXD(x0)}
                      cy={scaleYD(y0)}
                      r={6}
                      className="fill-indigo-600 stroke-white stroke-2 shadow-sm"
                    />
                    <text
                      x={scaleXD(x0) - 12}
                      y={scaleYD(y0) - 10}
                      className="font-mono text-[9px] font-bold fill-indigo-700"
                    >
                      P(x₀)
                    </text>

                    {/* Mathematical Interval Highlight brackets */}
                    <line
                      x1={scaleXD(x0)}
                      y1={heightD - 25}
                      x2={scaleXD(x0 + h)}
                      y2={heightD - 25}
                      stroke="#a855f7"
                      strokeWidth={1.5}
                    />
                    <text
                      x={scaleXD(x0 + h / 2) - 8}
                      y={heightD - 12}
                      className="font-mono text-[9px] font-bold fill-purple-600 text-center animate-pulse"
                    >
                      h
                    </text>

                    {/* Boundary markers endpoints */}
                    <circle cx={scaleXD(x0)} cy={heightD - 25} r={2} className="fill-purple-600" />
                    <circle cx={scaleXD(x0 + h)} cy={heightD - 25} r={2} className="fill-purple-600" />

                    {/* X axis labels */}
                    <text x={scaleXD(x0) - 8} y={heightD - 35} className="font-mono text-[8px] fill-slate-400">x₀</text>
                    <text x={scaleXD(x0 + h) - 15} y={heightD - 35} className="font-mono text-[8px] fill-slate-400">x₀+h</text>

                  </svg>
                </div>
              </div>

              {/* Interactive insights card footer */}
              <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start space-x-3 text-xs text-indigo-900 font-normal">
                <BookOpen className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold font-display">Reflexión Didáctica del Dr. Erick:</p>
                  <p className="text-indigo-850 mt-1 leading-relaxed text-[11.5px]">
                    El núcleo del obstáculo epistemológico del cálculo reside en concebir "la tasa de cambio instantánea". Al empujar el control <span className="font-mono font-semibold">h</span> hacia límites inferiores, los dos puntos se fusionan, haciendo coincidir de forma natural e intuitiva la secante aproximada con la derivada analítica real.
                  </p>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ==================================== TAB 2-ALT (TAB 3): INCREMENTAL DERIVATIVE ==================================== */}
        {activeTab === 'incremental' && (
          <div className="space-y-8 max-w-6xl mx-auto">
            
            {/* Split layout: Controls + Visual graph */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              
              {/* Left Controls Column */}
              <div className="lg:col-span-5 bg-slate-50 border border-slate-200 p-6 rounded-2xl flex flex-col justify-between math-grid-dense">
                <div className="space-y-6">
                  
                  {/* Function selection */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase">
                      1. Seleccione una Función f(x)
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {incrementalFunctions.map(fn => (
                        <button
                          key={fn.id}
                          onClick={() => {
                            setSelectedIncId(fn.id);
                          }}
                          className={`text-left px-4 py-3 rounded-xl text-xs font-semibold font-display border transition-all cursor-pointer ${
                            selectedIncId === fn.id
                              ? 'bg-indigo-900 text-white border-indigo-900 shadow-md shadow-indigo-900/10'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <span className="block font-medium">{fn.name}</span>
                          <span className={`block font-mono text-[10px] mt-0.5 ${selectedIncId === fn.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {fn.formulaLabel}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Slider X0 */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-mono font-bold">
                      <span className="text-slate-400 uppercase">2. Punto de Evaluación (x)</span>
                      <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                        x = {incX.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="3.5"
                      step="0.1"
                      value={incX}
                      onChange={(e) => setIncX(parseFloat(e.target.value))}
                      className="w-full accent-indigo-900 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Slider Delta X */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-mono font-bold">
                      <span className="text-slate-400 uppercase">3. Incremento (Δx)</span>
                      <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded text-[11px]">
                        Δx = {incDx.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.10"
                      max="1.20"
                      step="0.05"
                      value={incDx}
                      onChange={(e) => setIncDx(parseFloat(e.target.value))}
                      className="w-full accent-rose-600 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
                    />
                  </div>

                </div>

                {/* Mathematical stats comparing derivative with incremental ratio */}
                <div className="mt-8 bg-slate-900 rounded-xl p-4 text-white space-y-3 font-mono">
                  <div className="flex justify-between text-[9.5px] font-bold text-slate-400 pb-1.5 border-b border-slate-800">
                    <span>CONCEPTO DE CAMBIO</span>
                    <span>VALOR</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Punto de partida P(x, f(x))</span>
                      <span className="text-indigo-200">({incX.toFixed(2)}, {incY0.toFixed(2)})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Punto incrementado Q(x+Δx, f(x+Δx))</span>
                      <span className="text-rose-200">({(incX + incDx).toFixed(2)}, {incY1.toFixed(2)})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Incremento de y (Δy)</span>
                      <span className="text-amber-250">{(incY1 - incY0).toFixed(4)}</span>
                    </div>
                    <hr className="border-slate-800 my-1.5" />
                    <div className="flex justify-between items-center">
                      <span className="text-rose-300 text-[11px] font-semibold">Cociente Diferencial Δy/Δx</span>
                      <span className="font-bold text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded text-xs">{incSlopeSecant.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-emerald-300 text-[11px] font-semibold">Derivada Instantánea f\'(x)</span>
                      <span className="font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded text-xs">{incSlopeTangent.toFixed(4)}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Graphical Display Column */}
              <div className="lg:col-span-7 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2">
                      <LineChart className="h-4 w-4 text-indigo-600" />
                      <span className="font-display font-bold text-sm text-slate-800">Visualización de f(x + Δx) y Secante vs Tangente</span>
                    </div>
                    <button
                      onClick={() => {
                        setIncX(2.0);
                        setIncDx(0.5);
                        setSelectedIncId('square');
                      }}
                      className="p-1 px-2.5 hover:bg-slate-50 border border-slate-200 rounded text-[10px] font-mono font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1.5 cursor-pointer pointer-events-auto"
                    >
                      <RotateCcw className="h-3 w-3" /> Reiniciar
                    </button>
                  </div>

                  {/* SVG Plot for increments */}
                  <div className="relative border border-slate-100 bg-slate-50/50 rounded-xl overflow-hidden">
                    <svg
                      width="100%"
                      height={heightInc}
                      viewBox={`0 0 ${widthInc} ${heightInc}`}
                      className="select-none"
                    >
                      {/* Grid background */}
                      {Array.from({ length: 6 }).map((_, i) => (
                        <line
                          key={`inc-grid-x-${i}`}
                          x1={scaleXInc(i)}
                          y1={20}
                          x2={scaleXInc(i)}
                          y2={heightInc - 30}
                          stroke="#e2e8f0"
                          strokeWidth={0.5}
                        />
                      ))}
                      {Array.from({ length: 6 }).map((_, i) => (
                        <line
                          key={`inc-grid-y-${i}`}
                          x1={40}
                          y1={scaleYInc((i / 5) * maxYValue)}
                          x2={widthInc - 25}
                          y2={scaleYInc((i / 5) * maxYValue)}
                          stroke="#e2e8f0"
                          strokeWidth={0.5}
                        />
                      ))}

                      {/* Smooth original math function curve */}
                      <path
                        d={incCurvePoints}
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth={2.5}
                      />

                      {/* Secant line layout (red dashed) */}
                      <line
                        x1={incSecLine.x1}
                        y1={incSecLine.y1}
                        x2={incSecLine.x2}
                        y2={incSecLine.y2}
                        stroke="#f43f5e"
                        strokeWidth={1.5}
                        strokeDasharray="4,4"
                      />

                      {/* Tangent line layout (green solid) */}
                      <line
                        x1={incTanLine.x1}
                        y1={incTanLine.y1}
                        x2={incTanLine.x2}
                        y2={incTanLine.y2}
                        stroke="#10b981"
                        strokeWidth={2.2}
                      />

                      {/* Increments indicators */}
                      {/* Run segment Δx (horizontal segment) */}
                      <line
                        x1={scaleXInc(incX)}
                        y1={scaleYInc(incY0)}
                        x2={scaleXInc(incX + incDx)}
                        y2={scaleYInc(incY0)}
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        strokeDasharray="2,2"
                      />
                      {/* Rise segment Δy (vertical segment) */}
                      <line
                        x1={scaleXInc(incX + incDx)}
                        y1={scaleYInc(incY0)}
                        x2={scaleXInc(incX + incDx)}
                        y2={scaleYInc(incY1)}
                        stroke="#ec4899"
                        strokeWidth={2}
                        strokeDasharray="2,2"
                      />

                      {/* Point P */}
                      <circle
                        cx={scaleXInc(incX)}
                        cy={scaleYInc(incY0)}
                        r={5.5}
                        className="fill-indigo-700 stroke-white stroke-2 shadow-sm"
                      />
                      <text
                        x={scaleXInc(incX) - 25}
                        y={scaleYInc(incY0) - 8}
                        className="font-mono text-[9px] font-bold fill-indigo-800"
                      >
                        P(x, f(x))
                      </text>

                      {/* Point Q */}
                      <circle
                        cx={scaleXInc(incX + incDx)}
                        cy={scaleYInc(incY1)}
                        r={5.5}
                        className="fill-rose-600 stroke-white stroke-2 shadow-sm"
                      />
                      <text
                        x={scaleXInc(incX + incDx) + 8}
                        y={scaleYInc(incY1) - 8}
                        className="font-mono text-[9px] font-bold fill-rose-700"
                      >
                        Q(x+Δx, f(x+Δx))
                      </text>

                      {/* Δx brace label */}
                      <text
                        x={scaleXInc(incX + incDx/2) - 8}
                        y={scaleYInc(incY0) + 12}
                        className="font-mono text-[9px] font-bold fill-purple-700"
                      >
                        Δx
                      </text>

                      {/* Δy label */}
                      <text
                        x={scaleXInc(incX + incDx) + 6}
                        y={scaleYInc((incY0 + incY1)/2) + 3}
                        className="font-mono text-[9px] font-bold fill-pink-700"
                      >
                        Δy
                      </text>

                      {/* Grid values */}
                      {Array.from({ length: 6 }).map((_, i) => (
                        <text
                          key={`axis-x-${i}`}
                          x={scaleXInc(i) - 4}
                          y={heightInc - 12}
                          className="font-mono text-[8.5px] fill-slate-400"
                        >
                          {i}
                        </text>
                      ))}
                      {Array.from({ length: 6 }).map((_, i) => {
                        const val = Math.round((i / 5) * maxYValue);
                        return (
                          <text
                            key={`axis-y-${i}`}
                            x={15}
                            y={scaleYInc(val) + 3}
                            className="font-mono text-[8.5px] fill-slate-400"
                          >
                            {val}
                          </text>
                        );
                      })}

                    </svg>
                  </div>
                </div>

                <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-[11.5px] text-indigo-900 leading-relaxed font-normal">
                  <p className="font-semibold font-display">Concepto de Incrementos:</p>
                  <p className="text-[11px] text-indigo-950 mt-0.5">
                    Este enfoque es la base rigurosa del Cálculo. El cociente <span className="font-mono font-semibold">Δy/Δx</span> representa la velocidad promedio o la pendiente del segmento secante. Al aproximar infinitesimalmente el valor <span className="font-mono font-semibold">Δx → 0</span>, esa secante rota de manera gradual hasta transformarse en la tangente exacta instantánea.
                  </p>
                </div>

              </div>

            </div>

            {/* Explanation box under "Regla de los 4 pasos" */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              
              <div className="border-b border-slate-200 pb-3">
                <h3 className="font-display font-bold text-lg text-slate-800 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-indigo-600" />
                  Procedimiento de Derivación por Incrementos (Regla de los 4 Pasos)
                </h3>
                <p className="text-slate-500 text-xs mt-1">
                  Desarrollo paso a paso para la función elegida en el punto <span className="font-mono font-semibold">x = {incX.toFixed(2)}</span> y con incremento <span className="font-mono font-semibold">Δx = {incDx.toFixed(2)}</span>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Paso 1 */}
                <div className="bg-white border border-slate-150 rounded-xl p-4 shadow-sm hover:border-slate-350 transition">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="h-6 w-6 bg-indigo-100 text-indigo-800 font-bold font-mono text-xs flex items-center justify-center rounded-full">1</span>
                    <h4 className="font-display font-bold text-slate-800 text-sm">Incrementar la Variable x</h4>
                  </div>
                  <p className="text-xs text-slate-500 leading-normal mb-3">
                    Se evalúa la función reemplazando todas las <span className="font-mono">x</span> por la expresión incrementada <span className="font-mono">(x + Δx)</span>.
                  </p>
                  <pre className="bg-slate-900 text-white rounded-lg p-3 text-[10.5px] font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed border border-slate-850">
                    {currentIncFn.step1Symbolic(incX, incDx)}
                  </pre>
                </div>

                {/* Paso 2 */}
                <div className="bg-white border border-slate-150 rounded-xl p-4 shadow-sm hover:border-slate-350 transition">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="h-6 w-6 bg-indigo-100 text-indigo-800 font-bold font-mono text-xs flex items-center justify-center rounded-full">2</span>
                    <h4 className="font-display font-bold text-slate-800 text-sm">Obtener la Diferencia de la Función (Δy)</h4>
                  </div>
                  <p className="text-xs text-slate-500 leading-normal mb-3">
                    Se resta la función original de la incrementada: <span className="font-mono">f(x + Δx) - f(x)</span>. Todos los términos puros que no contengan <span className="font-mono">Δx</span> se cancelan dinámicamente.
                  </p>
                  <pre className="bg-slate-900 text-white rounded-lg p-3 text-[10.5px] font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed border border-slate-850">
                    {currentIncFn.step2Symbolic(incX, incDx)}
                  </pre>
                </div>

                {/* Paso 3 */}
                <div className="bg-white border border-slate-150 rounded-xl p-4 shadow-sm hover:border-slate-355 transition">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="h-6 w-6 bg-indigo-100 text-indigo-800 font-bold font-mono text-xs flex items-center justify-center rounded-full">3</span>
                    <h4 className="font-display font-bold text-slate-800 text-sm">Formulación del Cociente Diferencial</h4>
                  </div>
                  <p className="text-xs text-slate-500 leading-normal mb-3">
                    Se divide el incremento de la función entre el incremento <span className="font-mono">Δx</span>. Se simplifica algebraicamente cancelando la indeterminación <span className="font-mono">Δx/Δx</span>.
                  </p>
                  <pre className="bg-slate-900 text-white rounded-lg p-3 text-[10.5px] font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed border border-slate-850">
                    {currentIncFn.step3Symbolic(incX, incDx)}
                  </pre>
                </div>

                {/* Paso 4 */}
                <div className="bg-white border border-slate-150 rounded-xl p-4 shadow-sm hover:border-slate-355 transition">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="h-6 w-6 bg-indigo-100 text-indigo-800 font-bold font-mono text-xs flex items-center justify-center rounded-full">4</span>
                    <h4 className="font-display font-bold text-slate-800 text-sm">Aplicación del Límite (cuando Δx → 0)</h4>
                  </div>
                  <p className="text-xs text-slate-500 leading-normal mb-3">
                    Se toma el límite matemático de la expresión simplificada cuando <span className="font-mono">Δx</span> se aproxima a cero. El resultado final es la derivada instantánea real.
                  </p>
                  <pre className="bg-slate-900 text-white rounded-lg p-3 text-[10.5px] font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed border border-slate-850">
                    {currentIncFn.step4Symbolic(incX)}
                  </pre>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* ==================================== TAB 4: CONCEPT OF DIFFERENTIAL ==================================== */}
        {activeTab === 'differential' && (
          <div className="space-y-8 max-w-6xl mx-auto">
            
            {/* Split layout: Controls + Visual graph */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              
              {/* Left Controls Column */}
              <div className="lg:col-span-5 bg-slate-50 border border-slate-200 p-6 rounded-2xl flex flex-col justify-between math-grid-dense">
                <div className="space-y-6">
                  
                  {/* Function selection */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase">
                      1. Seleccione una Función f(x)
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {differentialFunctions.map(fn => (
                        <button
                          key={fn.id}
                          onClick={() => {
                            setSelectedDiffId(fn.id);
                          }}
                          className={`text-left px-4 py-3 rounded-xl text-xs font-semibold font-display border transition-all cursor-pointer ${
                            selectedDiffId === fn.id
                              ? 'bg-indigo-900 text-white border-indigo-900 shadow-md shadow-indigo-900/10'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <span className="block font-medium">{fn.name}</span>
                          <span className={`block font-mono text-[10px] mt-0.5 ${selectedDiffId === fn.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {fn.formulaLabel} | {fn.dfLabel}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Slider X */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-mono font-bold">
                      <span className="text-slate-400 uppercase">2. Punto de Evaluación (x)</span>
                      <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                        x = {diffX.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="3.5"
                      step="0.1"
                      value={diffX}
                      onChange={(e) => setDiffX(parseFloat(e.target.value))}
                      className="w-full accent-indigo-900 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Slider Delta X (dx) */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-mono font-bold">
                      <span className="text-slate-400 uppercase">3. Incremento Diferencial (dx = Δx)</span>
                      <span className="text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded text-[11px]">
                        dx = {diffDx.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.10"
                      max="1.40"
                      step="0.05"
                      value={diffDx}
                      onChange={(e) => setDiffDx(parseFloat(e.target.value))}
                      className="w-full accent-purple-600 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
                    />
                  </div>

                </div>

                {/* Mathematical stats comparing Delta Y and dy */}
                <div className="mt-8 bg-slate-900 rounded-xl p-4 text-white space-y-3 font-mono">
                  <div className="flex justify-between text-[9.5px] font-bold text-slate-400 pb-1.5 border-b border-slate-800">
                    <span>CÁLCULO FORMAL</span>
                    <span>RESULTADO NUMÉRICO</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Punto Inicial P(x, y)</span>
                      <span className="text-indigo-200">f({diffX.toFixed(2)}) = {diffY0.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Pendiente de Tangente f'(x)</span>
                      <span className="text-emerald-300">{diffSlopeTangent.toFixed(4)}</span>
                    </div>
                    <hr className="border-slate-800 my-1.5" />
                    
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-emerald-300 font-semibold text-[11px]">Diferencial dy</span>
                        <span className="text-[8.5px] text-slate-400">dy = f'(x)·dx</span>
                      </div>
                      <span className="font-bold text-emerald-400 bg-emerald-950/40 px-2 py-1 rounded text-xs">
                        {calculatedDy.toFixed(4)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-rose-300 font-semibold text-[11px]">Incremento Real Δy</span>
                        <span className="text-[8.5px] text-slate-400 font-mono">f(x+dx) - f(x)</span>
                      </div>
                      <span className="font-bold text-rose-400 bg-rose-950/40 px-2 py-1 rounded text-xs text-right">
                        {calculatedDeltaY.toFixed(4)}
                      </span>
                    </div>

                    <hr className="border-slate-800 my-1.5" />

                    <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-amber-300 font-semibold text-[11px]">Error de Aproximación</span>
                        <span className="text-[8.5px] text-slate-400">Error |Δy - dy|</span>
                      </div>
                      <span className="font-bold text-amber-400 bg-amber-950/40 px-2 py-1 rounded text-xs">
                        {Math.abs(calculatedDeltaY - calculatedDy).toFixed(5)}
                      </span>
                    </div>

                    <div className="text-[9px] text-slate-500 pt-1 text-center bg-slate-950/20 p-2 rounded-lg">
                      Obsérvese cómo el Error disminuye drásticamente a medida que el incremento dx se hace menor.
                    </div>
                  </div>
                </div>

              </div>

              {/* Graphical Display Column */}
              <div className="lg:col-span-7 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2">
                      <LineChart className="h-4 w-4 text-indigo-600" />
                      <span className="font-display font-bold text-sm text-slate-800">Representación Geométrica del Diferencial</span>
                    </div>
                    <button
                      onClick={() => {
                        setDiffX(2.0);
                        setDiffDx(0.8);
                        setSelectedDiffId('root');
                      }}
                      className="p-1 px-2.5 hover:bg-slate-50 border border-slate-200 rounded text-[10px] font-mono font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1.5 cursor-pointer pointer-events-auto"
                    >
                      <RotateCcw className="h-3 w-3" /> Reiniciar
                    </button>
                  </div>

                  {/* SVG Plot for differentials */}
                  <div className="relative border border-slate-100 bg-slate-50/50 rounded-xl overflow-hidden">
                    <svg
                      width="100%"
                      height={heightDiff}
                      viewBox={`0 0 ${widthDiff} ${heightDiff}`}
                      className="select-none"
                    >
                      {/* Grid background */}
                      {Array.from({ length: 6 }).map((_, i) => (
                        <line
                          key={`diff-grid-x-${i}`}
                          x1={scaleXDiff(i)}
                          y1={20}
                          x2={scaleXDiff(i)}
                          y2={heightDiff - 30}
                          stroke="#e2e8f0"
                          strokeWidth={0.5}
                        />
                      ))}
                      {Array.from({ length: 6 }).map((_, i) => (
                        <line
                          key={`diff-grid-y-${i}`}
                          x1={40}
                          y1={scaleYDiff((i / 5) * maxDiffYValue)}
                          x2={widthDiff - 25}
                          y2={scaleYDiff((i / 5) * maxDiffYValue)}
                          stroke="#e2e8f0"
                          strokeWidth={0.5}
                        />
                      ))}

                      {/* Smooth original math function curve */}
                      <path
                        d={diffCurvePoints}
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth={2.5}
                      />

                      {/* Tangent line layout (green solid) */}
                      <line
                        x1={diffTanLine.x1}
                        y1={diffTanLine.y1}
                        x2={diffTanLine.x2}
                        y2={diffTanLine.y2}
                        stroke="#10b981"
                        strokeWidth={2}
                      />

                      {/* Guides / Increments Indicators on graph */}
                      {/* Base horizontal line showing dx (from x to x+dx, at y=y0) */}
                      <line
                        x1={scaleXDiff(diffX)}
                        y1={scaleYDiff(diffY0)}
                        x2={scaleXDiff(diffX + diffDx)}
                        y2={scaleYDiff(diffY0)}
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        strokeDasharray="3,3"
                      />

                      {/* Delta y vertical indicator (from f(x) to f(x+dx)) in Rose */}
                      <line
                        x1={scaleXDiff(diffX + diffDx) + 6}
                        y1={scaleYDiff(diffY0)}
                        x2={scaleXDiff(diffX + diffDx) + 6}
                        y2={scaleYDiff(diffY1)}
                        stroke="#f43f5e"
                        strokeWidth={2.5}
                      />

                      {/* dy vertical indicator (from f(x) to tangent point) in Emerald */}
                      <line
                        x1={scaleXDiff(diffX + diffDx) - 6}
                        y1={scaleYDiff(diffY0)}
                        x2={scaleXDiff(diffX + diffDx) - 6}
                        y2={scaleYDiff(diffYTangent)}
                        stroke="#10b981"
                        strokeWidth={2.5}
                      />

                      {/* Point P (x0, f(x0)) */}
                      <circle
                        cx={scaleXDiff(diffX)}
                        cy={scaleYDiff(diffY0)}
                        r={6}
                        className="fill-indigo-700 stroke-white stroke-2"
                      />
                      <text
                        x={scaleXDiff(diffX) - 30}
                        y={scaleYDiff(diffY0) - 10}
                        className="font-mono text-[9px] font-bold fill-indigo-900"
                      >
                        P(x, f(x))
                      </text>

                      {/* Point Q (x + dx, f(x + dx)) on Curve */}
                      <circle
                        cx={scaleXDiff(diffX + diffDx)}
                        cy={scaleYDiff(diffY1)}
                        r={5.5}
                        className="fill-rose-600 stroke-white stroke-2"
                      />
                      <text
                        x={scaleXDiff(diffX + diffDx) + 12}
                        y={scaleYDiff(diffY1) + 3}
                        className="font-mono text-[9px] font-bold fill-rose-700"
                      >
                        Q(Curva: f(x+dx))
                      </text>

                      {/* Point R (x + dx, f(x) + dy) on Tangent Line */}
                      <circle
                        cx={scaleXDiff(diffX + diffDx)}
                        cy={scaleYDiff(diffYTangent)}
                        r={5.5}
                        className="fill-emerald-600 stroke-white stroke-2"
                      />
                      <text
                        x={scaleXDiff(diffX + diffDx) + 12}
                        y={scaleYDiff(diffYTangent) - 6}
                        className="font-mono text-[9px] font-bold fill-emerald-800"
                      >
                        R(Tangente: f(x)+dy)
                      </text>

                      {/* Labels for elements */}
                      {/* dx label on horizontal purple line */}
                      <text
                        x={scaleXDiff(diffX + diffDx / 2) - 18}
                        y={scaleYDiff(diffY0) + 15}
                        className="font-mono text-[9px] font-extrabold fill-purple-700 bg-white"
                      >
                        dx = Δx
                      </text>

                      {/* dy segment label (Emerald) */}
                      <text
                        x={scaleXDiff(diffX + diffDx) - 24}
                        y={scaleYDiff(diffY0 + calculatedDy / 2) + 3}
                        className="font-mono text-[9.5px] font-bold fill-emerald-750"
                      >
                        dy
                      </text>

                      {/* Δy segment label (Rose) */}
                      <text
                        x={scaleXDiff(diffX + diffDx) + 12}
                        y={scaleYDiff(diffY0 + calculatedDeltaY / 2) + 15}
                        className="font-mono text-[9.5px] font-bold fill-rose-650"
                      >
                        Δy
                      </text>

                      {/* Values of Axis */}
                      {Array.from({ length: 6 }).map((_, i) => (
                        <text
                          key={`axis-diff-x-${i}`}
                          x={scaleXDiff(i) - 4}
                          y={heightDiff - 12}
                          className="font-mono text-[8.5px] fill-slate-400"
                        >
                          {i}
                        </text>
                      ))}
                      {Array.from({ length: 6 }).map((_, i) => {
                        const val = (i / 5) * maxDiffYValue;
                        return (
                          <text
                            key={`axis-diff-y-${i}`}
                            x={12}
                            y={scaleYDiff(val) + 3}
                            className="font-mono text-[8.5px] fill-slate-400"
                          >
                            {val.toFixed(1)}
                          </text>
                        );
                      })}

                    </svg>
                  </div>
                </div>

                <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-[11px] text-indigo-900 leading-relaxed font-normal">
                  <p className="font-semibold font-display text-[11.5px]">Interpretación Didáctica:</p>
                  <p className="text-[11px] text-indigo-950 mt-0.5">
                    El incremento <span className="font-mono font-semibold text-rose-600">Δy</span> mide la altura real sobre la curva. El diferencial <span className="font-mono font-semibold text-emerald-600 font-bold">dy</span> mide la altura aproximada sobre la recta tangente. Conforme reduzca <span className="font-mono font-semibold text-purple-600">dx</span>, los puntos <span className="font-semibold text-rose-600">Q</span> e <span className="font-semibold text-emerald-600">R</span> se aproximan mutuamente de forma increíble, ilustrando la potencia de la aproximación lineal.
                  </p>
                </div>

              </div>

            </div>

            {/* Comprehensive Didactic Section */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              
              <div className="border-b border-slate-200 pb-3">
                <h3 className="font-display font-bold text-lg text-slate-800 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-indigo-600" />
                  El Concepto Matemático de Diferencial a Fondo
                </h3>
                <p className="text-slate-500 text-xs mt-1">
                  Explicación paso a paso de por qué esta es una de las conceptualizaciones más profundas e intuitivas del análisis académico.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Definicion de dx */}
                <div className="bg-white border border-slate-150 rounded-xl p-5 shadow-sm space-y-2 font-sans">
                  <span className="font-mono text-[10px] font-bold text-purple-600 uppercase tracking-wider block">Variable Independiente</span>
                  <h4 className="font-display font-bold text-slate-800 text-sm">Incremento dx = Δx</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Es la alteración arbitraria dada a la variable de entrada. Tanto la curva real como su recta de aproximación lineal comparten exactamente el mismo valor de entrada <span className="font-mono">dx</span>.
                  </p>
                  <p className="text-xs bg-purple-50 text-purple-800 p-2.5 rounded-lg font-mono text-[10.5px]">
                    Cambio de entrada: {diffDx.toFixed(4)}
                  </p>
                </div>

                {/* Diferencial dy */}
                <div className="bg-white border border-slate-150 rounded-xl p-5 shadow-sm space-y-2 font-sans">
                  <span className="font-mono text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Linealización (Aproximación)</span>
                  <h4 className="font-display font-bold text-slate-800 text-sm">El Diferencial dy = f'(x) dx</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Representa el cambio estimado en <span className="font-mono">y</span> suponiendo un ritmo de cambio uniforme. Es muy fácil de calcular computacionalmente porque no requiere resolver la estructura compleja de la función real.
                  </p>
                  <p className="text-xs bg-emerald-50 text-emerald-800 p-2.5 rounded-lg font-mono text-[10.5px]">
                    f'({diffX.toFixed(2)})·dx = {calculatedDy.toFixed(4)}
                  </p>
                </div>

                {/* Incremento real */}
                <div className="bg-white border border-slate-150 rounded-xl p-5 shadow-sm space-y-2 font-sans">
                  <span className="font-mono text-[10px] font-bold text-rose-500 uppercase tracking-wider block">Cambio Exacto (Curva)</span>
                  <h4 className="font-display font-bold text-slate-800 text-sm">Incremento Real Δy</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Es la variación analítica real de la función original. En situaciones de modelado real, calcular esto a veces exige tiempo. El diferencial <span className="font-mono">dy</span> sirve de sustituto de muy bajo coste en cercanías del punto.
                  </p>
                  <p className="text-xs bg-rose-50 text-rose-800 p-2.5 rounded-lg font-mono text-[10.5px]">
                    Δy = {calculatedDeltaY.toFixed(4)}
                  </p>
                </div>

              </div>

              {/* Dynamic Interactive Conclusion */}
              <div className="bg-indigo-900 text-white rounded-xl p-5 space-y-2">
                <h4 className="font-display font-bold text-sm tracking-tight flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  Didáctica Aplicada: El Análisis del Error de Aproximación
                </h4>
                <p className="text-[11.5px] text-indigo-150 leading-relaxed font-sans">
                  {currentDiffFn.explanation}
                </p>
                <div className="pt-2 flex flex-col sm:flex-row gap-3 text-[10.5px] items-start sm:items-center">
                  <span className="bg-indigo-950 px-2.5 py-1 rounded text-purple-300 font-mono font-bold">
                    dx = {diffDx.toFixed(4)}
                  </span>
                  <span className="text-indigo-300 hidden sm:inline font-mono">→</span>
                  <span className="bg-indigo-950 px-2.5 py-1 rounded text-amber-300 font-mono font-bold font-semibold">
                    Error |Δy - dy| = {Math.abs(calculatedDeltaY - calculatedDy).toFixed(6)}
                  </span>
                  <span className="text-indigo-300 hidden sm:inline font-mono">→</span>
                  <span className="bg-indigo-950 px-2.5 py-1 rounded text-emerald-300 font-mono font-bold">
                     dy [f'(x) dx] = {calculatedDy.toFixed(4)}
                  </span>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ==================================== TAB 2: ODE SIMULATOR ==================================== */}
        {activeTab === 'ode' && (
          <div className="space-y-8 max-w-6xl mx-auto">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              
              {/* Controls Panel & Math Formulas */}
              <div className="lg:col-span-5 bg-slate-50 border border-slate-200 p-6 rounded-2xl flex flex-col justify-between math-grid-dense">
                <div className="space-y-5">
                  
                  {/* ODE Selector widget */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase">
                      1. Seleccione un Fenómeno Físico EDO
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {odes.map(ode => (
                        <button
                          key={ode.id}
                          onClick={() => handleOdeOdeIdChange(ode.id)}
                          id={`ode-sel-${ode.id}`}
                          className={`text-left px-4 py-2.5 rounded-xl text-xs font-semibold font-display border transition-all ${
                            selectedOdeId === ode.id
                              ? 'bg-indigo-900 text-white border-indigo-900 shadow-md shadow-indigo-900/10'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold">{ode.name}</span>
                            <span className={`font-mono text-[9.5px] px-2 py-0.5 rounded ${
                              selectedOdeId === ode.id ? 'bg-indigo-950 text-indigo-200' : 'bg-slate-50 text-slate-500'
                            }`}>
                              dy/dx
                            </span>
                          </div>
                          <span className={`block font-mono text-[10px] mt-1 ${selectedOdeId === ode.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {ode.formulaTex}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Slider for Init Cond Y0 */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-mono font-bold">
                      <span className="text-slate-400 uppercase">2. Condición Inicial y(0) = y₀</span>
                      <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                        y₀ = {odeY0.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={currentOde.minY0}
                      max={currentOde.maxY0}
                      step="0.1"
                      value={odeY0}
                      onChange={(e) => setOdeY0(parseFloat(e.target.value))}
                      className="w-full accent-indigo-900 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-400 leading-tight">
                      {currentOde.description}
                    </p>
                  </div>

                  {/* Sliders for H (dx step) of ODE simulation */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200/50">
                    
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-mono font-bold">
                        <span className="text-slate-400 uppercase">Paso Δx (h)</span>
                        <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
                          h = {odeH.toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.2"
                        step="0.05"
                        value={odeH}
                        onChange={(e) => setOdeH(parseFloat(e.target.value))}
                        className="w-full accent-amber-600 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-mono font-bold">
                        <span className="text-slate-400 uppercase">Total Pasos (N)</span>
                        <span className="text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">
                          N = {odeSteps}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="15"
                        step="1"
                        value={odeSteps}
                        onChange={(e) => setOdeSteps(parseInt(e.target.value))}
                        className="w-full accent-indigo-900 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
                      />
                    </div>

                  </div>

                  {/* Layer check toggles */}
                  <div className="space-y-2 border-t border-slate-200/50 pt-3">
                    <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase">
                      3. Métodos y Elementos Gráficos
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                      
                      <button
                        onClick={() => setShowEuler(!showEuler)}
                        className={`flex items-center gap-1.5 py-1 px-2.5 rounded border transition text-left cursor-pointer ${
                          showEuler ? 'bg-red-50 border-red-200 text-red-800' : 'bg-white border-slate-100 text-slate-300'
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${showEuler ? 'bg-red-500' : 'bg-slate-300'}`} />
                        <span>Euler (1er Orden)</span>
                      </button>

                      <button
                        onClick={() => setShowHeun(!showHeun)}
                        className={`flex items-center gap-1.5 py-1 px-2.5 rounded border transition text-left cursor-pointer ${
                          showHeun ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-white border-slate-100 text-slate-300'
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${showHeun ? 'bg-amber-500' : 'bg-slate-300'}`} />
                        <span>Heun (2do Orden)</span>
                      </button>

                      <button
                        onClick={() => setShowRK4(!showRK4)}
                        className={`flex items-center gap-1.5 py-1 px-2.5 rounded border transition text-left cursor-pointer ${
                          showRK4 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-slate-100 text-slate-300'
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${showRK4 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span>RK4 (4to Orden)</span>
                      </button>

                      <button
                        onClick={() => setShowExact(!showExact)}
                        className={`flex items-center gap-1.5 py-1 px-2.5 rounded border transition text-left cursor-pointer ${
                          showExact ? 'bg-indigo-50 border-indigo-200 text-indigo-850' : 'bg-white border-slate-100 text-slate-300'
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${showExact ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                        <span>Exacta Analítica</span>
                      </button>

                    </div>

                    <button
                      onClick={() => setShowVectorField(!showVectorField)}
                      className={`w-full mt-2 py-1 px-2 rounded border text-center text-[9.5px] font-mono cursor-pointer transition ${
                        showVectorField ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-white border-slate-100 text-slate-300'
                      }`}
                    >
                      {showVectorField ? 'Ocultar Campo de Pendientes dy/dx' : 'Mostrar Campo de Pendientes dy/dx'}
                    </button>
                  </div>

                </div>

                {/* Legend coordinates panel */}
                <div className="mt-6 p-3 bg-slate-900 text-[11px] text-slate-400 font-mono rounded-lg flex justify-between items-center bg-slate-950">
                  <span>Trayectoria evaluada en:</span>
                  <span className="text-white font-bold">x = {finalEvalX.toFixed(2)} unidades</span>
                </div>

              </div>

              {/* ODE Canvas SVG */}
              <div className="lg:col-span-7 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
                <div>
                  
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-4 w-4 text-indigo-600 animate-pulse" />
                      <span className="font-display font-bold text-sm text-slate-800">Campos Vectoriales y Curvas Integrales</span>
                    </div>
                    <button
                      onClick={resetOde}
                      className="p-1 px-2.5 hover:bg-slate-50 border border-slate-200 rounded text-[10px] font-mono font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1.5 cursor-pointer pointer-events-auto"
                      title="Restablecer"
                    >
                      <RotateCcw className="h-3 w-3" /> Reiniciar
                    </button>
                  </div>

                  {/* ODE SVG plots */}
                  <div className="relative border border-slate-100 bg-slate-50/50 rounded-xl overflow-hidden shadow-inner">
                    <svg
                      width="100%"
                      height={heightO}
                      viewBox={`0 0 ${widthO} ${heightO}`}
                      className="select-none"
                    >
                      {/* Grid background ticks */}
                      {Array.from({ length: 7 }).map((_, i) => (
                        <line
                          key={`ogrid-x-${i}`}
                          x1={scaleXO(i)}
                          y1={20}
                          x2={scaleXO(i)}
                          y2={heightO - 30}
                          stroke="#f1f5f9"
                          strokeWidth={1}
                        />
                      ))}
                      {Array.from({ length: 6 }).map((_, i) => (
                        <line
                          key={`ogrid-y-${i}`}
                          x1={40}
                          y1={scaleYO(i)}
                          x2={widthO - 20}
                          y2={scaleYO(i)}
                          stroke="#f1f5f9"
                          strokeWidth={1}
                        />
                      ))}

                      {/* Vector slope field background arrows */}
                      {showVectorField && vectorFieldLines.map((line, idx) => (
                        <line
                          key={`vf-${idx}`}
                          x1={line.x1}
                          y1={line.y1}
                          x2={line.x2}
                          y2={line.y2}
                          stroke="#cbd5e1"
                          strokeWidth={1.2}
                          strokeLinecap="round"
                          opacity={0.85}
                        />
                      ))}

                      {/* Real Smooth Analytical solution curve */}
                      {showExact && (
                        <path
                          d={exactCurvePoints}
                          fill="none"
                          stroke="#4f46e5"
                          strokeWidth={3}
                          opacity={0.8}
                        />
                      )}

                      {/* Euler path approximations (Red) */}
                      {showEuler && (
                        <>
                          <path
                            d={getOdeSvgPath(eulerPts)}
                            fill="none"
                            stroke="#f43f5e"
                            strokeWidth={1.5}
                            strokeDasharray="3,3"
                          />
                          {eulerPts.map((pt, idx) => (
                            <circle
                              key={`euler-dot-${idx}`}
                              cx={scaleXO(pt.x)}
                              cy={scaleYO(pt.y)}
                              r={3.5}
                              className="fill-rose-500 stroke-white stroke-1"
                              title={`Euler (${pt.x.toFixed(2)}, ${pt.y.toFixed(3)})`}
                            />
                          ))}
                        </>
                      )}

                      {/* Heun path approximations (Orange) */}
                      {showHeun && (
                        <>
                          <path
                            d={getOdeSvgPath(heunPts)}
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth={1.8}
                          />
                          {heunPts.map((pt, idx) => (
                            <rect
                              key={`heun-rect-${idx}`}
                              x={scaleXO(pt.x) - 3}
                              y={scaleYO(pt.y) - 3}
                              width={6}
                              height={6}
                              className="fill-amber-500 stroke-white stroke-1"
                              title={`Heun (${pt.x.toFixed(2)}, ${pt.y.toFixed(3)})`}
                            />
                          ))}
                        </>
                      )}

                      {/* RK4 path approximations (Green) */}
                      {showRK4 && (
                        <>
                          <path
                            d={getOdeSvgPath(rk4Pts)}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth={2.2}
                          />
                          {rk4Pts.map((pt, idx) => (
                            <circle
                              key={`rk4-dot-${idx}`}
                              cx={scaleXO(pt.x)}
                              cy={scaleYO(pt.y)}
                              r={4}
                              className="fill-emerald-500 stroke-white stroke-1"
                              title={`RK4 (${pt.x.toFixed(2)}, ${pt.y.toFixed(3)})`}
                            />
                          ))}
                        </>
                      )}

                      {/* Initial condition dot marker */}
                      <circle
                        cx={scaleXO(0)}
                        cy={scaleYO(odeY0)}
                        r={5.5}
                        className="fill-indigo-900 stroke-white stroke-2 shadow-sm animate-pulse"
                      />
                      <text
                        x={scaleXO(0) + 10}
                        y={scaleYO(odeY0) + 3}
                        className="font-mono text-[9px] font-bold fill-indigo-950"
                      >
                        y₀({odeY0.toFixed(1)})
                      </text>

                      {/* Axis indicators */}
                      <text x={38} y={30} className="font-mono text-[8px] fill-slate-400">y</text>
                      <text x={widthO - 30} y={heightO - 35} className="font-mono text-[8px] fill-slate-400">x</text>

                      {/* Tick labels */}
                      {Array.from({ length: 7 }).map((_, i) => (
                        <text
                          key={`lbl-x-${i}`}
                          x={scaleXO(i) - 4}
                          y={heightO - 12}
                          className="font-mono text-[8.5px] fill-slate-400"
                        >
                          {i}
                        </text>
                      ))}
                      {Array.from({ length: 6 }).map((_, i) => (
                        <text
                          key={`lbl-y-${i}`}
                          x={15}
                          y={scaleYO(i) + 3}
                          className="font-mono text-[8.5px] fill-slate-400"
                        >
                          {i}
                        </text>
                      ))}

                    </svg>
                  </div>

                </div>

                {/* Insight banner footer */}
                <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-500 flex items-start gap-2.5">
                  <span className="flex-shrink-0 h-4 w-4 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 text-[10px] font-bold">i</span>
                  <p className="leading-normal">
                    Observe cómo el método de **Runge-Kutta 4** (verde) se superpone casi de forma idéntica sobre la línea analítica real, mientras que **Euler** (rojo) diverge debido a la pérdida de precisión de primer orden. Esta comparación visual aclara de forma pedagógica el orden de magnitud del error local de truncamiento tridimensional.
                  </p>
                </div>

              </div>

            </div>

            {/* Error Matrix Table Panel */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center space-x-2.5 mb-4 border-b border-slate-200 pb-3">
                <Sliders className="h-4.5 w-4.5 text-indigo-600" />
                <h3 className="font-display font-bold text-base text-slate-800">
                  Matriz de Error y Convergencia de Algoritmos (Evaluación en x = {finalEvalX.toFixed(2)})
                </h3>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs font-mono">
                  
                  <thead className="bg-slate-100 text-slate-500 text-[9.5px] font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Esquema Numérico</th>
                      <th className="px-4 py-3">Error Local</th>
                      <th className="px-4 py-3 text-center">Valor Aproximado</th>
                      <th className="px-4 py-3 text-center">Valor Real (Exacto)</th>
                      <th className="px-4 py-3 text-center">Error Absoluto</th>
                      <th className="px-4 py-3 text-right">Eficiencia Didáctica</th>
                    </tr>
                  </thead>

                  <tbody className="bg-white divide-y divide-slate-150 text-slate-600 font-normal">
                    
                    {/* Euler Method row info */}
                    <tr className={showEuler ? 'opacity-100 bg-red-50/10' : 'opacity-40'}>
                      <td className="px-4 py-3.5 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        <span className="font-bold text-slate-800">Euler Simple</span>
                      </td>
                      <td className="px-4 py-3.5 text-[9.5px]">Primer Orden - O(h¹)</td>
                      <td className="px-4 py-3.5 text-center text-slate-900 font-semibold">{eulerFinal.toFixed(5)}</td>
                      <td className="px-4 py-3.5 text-center text-slate-500 font-semibold">{exactFinalVal.toFixed(5)}</td>
                      <td className="px-4 py-3.5 text-center font-bold text-rose-600">
                        {Math.abs(eulerFinal - exactFinalVal).toFixed(5)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-sans text-[11px] font-medium text-slate-400">
                        ⭐ <span className="text-[10px] text-slate-400">(Educativo / Transitorio)</span>
                      </td>
                    </tr>

                    {/* Heun Method row info */}
                    <tr className={showHeun ? 'opacity-100 bg-amber-50/10' : 'opacity-40'}>
                      <td className="px-4 py-3.5 flex items-center gap-2">
                        <span className="h-2 w-2 rect bg-amber-500" />
                        <span className="font-bold text-slate-800">Euler Mejorado / Heun</span>
                      </td>
                      <td className="px-4 py-3.5 text-[9.5px]">Segundo Orden - O(h²)</td>
                      <td className="px-4 py-3.5 text-center text-slate-900 font-semibold">{heunFinal.toFixed(5)}</td>
                      <td className="px-4 py-3.5 text-center text-slate-500 font-semibold">{exactFinalVal.toFixed(5)}</td>
                      <td className="px-4 py-3.5 text-center font-bold text-amber-600">
                        {Math.abs(heunFinal - exactFinalVal).toFixed(5)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-sans text-[11px] font-medium text-amber-600">
                        ⭐⭐⭐ <span className="text-[10px] text-slate-400">(Aproximación Media)</span>
                      </td>
                    </tr>

                    {/* RK4 Method row info */}
                    <tr className={showRK4 ? 'opacity-100 bg-emerald-50/10' : 'opacity-40'}>
                      <td className="px-4 py-3.5 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="font-bold text-slate-800">Runge-Kutta 4 (RK4)</span>
                      </td>
                      <td className="px-4 py-3.5 text-[9.5px]">Cuarto Orden - O(h⁴)</td>
                      <td className="px-4 py-3.5 text-center text-slate-900 font-semibold">{rk4Final.toFixed(5)}</td>
                      <td className="px-4 py-3.5 text-center text-slate-500 font-semibold">{exactFinalVal.toFixed(5)}</td>
                      <td className="px-4 py-3.5 text-center font-bold text-emerald-600">
                        {Math.abs(rk4Final - exactFinalVal).toFixed(5)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-sans text-[11px] font-medium text-emerald-600">
                        ⭐⭐⭐⭐⭐ <span className="text-[10px] text-slate-500 font-semibold">(Alta Fidelidad Estándar)</span>
                      </td>
                    </tr>

                  </tbody>

                </table>
              </div>

            </div>

          </div>
        )}

        {/* ==================================== TAB 8: NEURAL LIMIT SIMULATOR ==================================== */}
        {activeTab === 'neuralLimit' && (() => {
          const net = nnNetworkRef.current;
          
          // Safety fallback representation
          const sizes = net ? net.sizes : [1, nnHiddenSize1, 1];
          const totalLayers = sizes.length;

          // Helper to execute forward pass of current network on a specific test X
          const evaluateNN = (xVal: number) => {
            if (!net) return 0;
            const normX = (xVal - 2.0) / 2.0; // scale standard [0, 4] input to normalized [-1, 1]
            return nnForwardPass(net, normX, nnActivation);
          };

          // Diagnostic limit approximations
          const deltaH = 0.05;
          const leftLimitNN = evaluateNN(2.0 - deltaH);
          const rightLimitNN = evaluateNN(2.0 + deltaH);
          const valueNN = evaluateNN(2.0);
          const limitJoint = (leftLimitNN + rightLimitNN) / 2;
          const currentLoss = nnLossHistory[nnLossHistory.length - 1] ?? 0;

          let targetFnLabel = '';
          let targetFnFormula = '';
          let targetLimitDesc = '';
          let isLimitConverged = false;

          if (nnTargetFnId === 'hole') {
            targetFnLabel = 'Polinómica del Bache (Removible)';
            targetFnFormula = 'f(x) = (x² - 4) / (x - 2)';
            targetLimitDesc = 'L = 4.00';
            isLimitConverged = Math.abs(limitJoint - 4.0) < 0.25;
          } else if (nnTargetFnId === 'jump') {
            targetFnLabel = 'Discontinuidad de Salto';
            targetFnFormula = 'f(x) = 1.5 (x < 2) | 3.5 (x ≥ 2)';
            targetLimitDesc = 'No existe (Laterales disjuntos)';
            isLimitConverged = Math.abs(leftLimitNN - 1.5) < 0.25 && Math.abs(rightLimitNN - 3.5) < 0.25;
          } else {
            targetFnLabel = 'Onda Continua Interpolada';
            targetFnFormula = 'f(x) = sen(1.2π·x) + 2.5';
            const trueLimitValue = Math.sin(1.2 * Math.PI * 2.0) + 2.5; // ≈ 3.451
            targetLimitDesc = `L ≈ ${trueLimitValue.toFixed(2)}`;
            isLimitConverged = Math.abs(limitJoint - trueLimitValue) < 0.20;
          }

          // Scales for Plot: widthP = 500, heightP = 300
          const widthP = 500;
          const heightP = 300;
          const scaleXP = (x: number) => 45 + (x / 4.0) * (widthP - 75);
          const scaleYP = (y: number) => heightP - 40 - ((y - 0.5) / 5.5) * (heightP - 70); // Y in [0.5, 6.0]

          // Compute neural curve path
          const curveSteps = 120;
          let nnCurveD = '';
          for (let i = 0; i <= curveSteps; i++) {
            const xVal = (i / curveSteps) * 4.0;
            const yVal = evaluateNN(xVal);
            nnCurveD += `${i === 0 ? 'M' : 'L'} ${scaleXP(xVal)} ${scaleYP(yVal)}`;
          }

          // Compute analytical target path
          let analyticCurveD = '';
          for (let i = 0; i <= curveSteps; i++) {
            const xVal = (i / curveSteps) * 4.0;
            let yVal = 0;
            if (nnTargetFnId === 'hole') {
              yVal = Math.abs(xVal - 2.0) < 1e-9 ? 4.0 : ((xVal * xVal) - 4.0) / (xVal - 2.0);
            } else if (nnTargetFnId === 'jump') {
              yVal = xVal >= 2.0 ? 3.5 : 1.5;
            } else {
              yVal = Math.sin(1.2 * Math.PI * xVal) + 2.5;
            }
            analyticCurveD += `${i === 0 ? 'M' : 'L'} ${scaleXP(xVal)} ${scaleYP(yVal)}`;
          }

          // Fetch dataset array to render
          const datasetPoints = generateNnDataset(nnTargetFnId, nnHoleSize);

          // Help coordinate mapper for visualization of layers
          // Neural Graph size: widthGen = 500, heightGen = 260
          const widthGen = 500;
          const heightGen = 260;
          const getNeuronCoords = (layerIdx: number, neuronIdx: number) => {
            const cx = 55 + layerIdx * ((widthGen - 110) / (totalLayers - 1));
            const size = sizes[layerIdx];
            let cy = heightGen / 2;
            if (size > 1) {
              cy = 30 + neuronIdx * ((heightGen - 60) / (size - 1));
            }
            return { cx, cy };
          };

          return (
            <div className="space-y-8 max-w-6xl mx-auto">
              
              {/* Introduction Hero banner */}
              <div className="bg-slate-900 border border-slate-850 text-white p-6 rounded-2xl relative overflow-hidden shadow-lg">
                <div className="relative z-10 max-w-4xl">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="p-1 px-2.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-[10px] font-mono uppercase tracking-wider text-indigo-300 font-bold flex items-center gap-1.5">
                      <Zap className="h-3 w-3 text-indigo-400 animate-pulse" /> Inteligencia Artificial en Didáctica
                    </span>
                  </div>
                  <h3 className="font-display font-extrabold text-2xl tracking-tight text-white flex items-center gap-2">
                    <Brain className="h-6.5 w-6.5 text-indigo-400" /> ¿Cómo "Aprende" una Red Neuronal un Límite Matemático?
                  </h3>
                  <p className="mt-3 text-slate-350 text-xs leading-relaxed font-sans max-w-3xl">
                    De acuerdo con el <strong>Teorema de Aproximación Universal</strong>, una red neuronal feedforward con capas ocultas y activaciones continuas puede aprender y generalizar formas de cualquier función matemática. 
                    <br className="mb-2" />
                    <strong>El experimento didáctico:</strong> Generamos datos de entrenamiento de un modelo matemático pero dejamos una <strong className="text-amber-400">exclusión o "agujero de datos" (bache)</strong> de ancho variable alrededor del punto crítico <span className="font-serif italic text-indigo-200">x = 2.0</span>. El sistema Backpropagation obligará a la red a aproximar los puntos visibles, pero al aproximarse a <span className="font-serif italic text-indigo-200">x = 2.0</span>, al ser la red una composición continua <span className="font-mono text-indigo-300">tanh / sigmoid</span>, su inferencia en la exclusión es estrictamente el <strong>Límite Continuo Generalizado</strong> de la red: <span className="font-serif italic text-indigo-200">NN(2) = lim(x→2) NN(x)</span>.
                  </p>
                </div>
                <div className="absolute top-0 right-0 h-full w-1/3 opacity-15 pointer-events-none select-none bg-[radial-gradient(circle_at_right,rgba(99,102,241,0.25),transparent_70%)] hidden lg:block" />
              </div>

              {/* Core Simulator body */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                
                {/* Visual controls and config panels */}
                <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
                  
                  {/* Select problem function */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center space-x-2 border-b border-slate-200 pb-2.5">
                      <Sliders className="h-4 w-4 text-indigo-600" />
                      <h4 className="font-display font-bold text-sm text-slate-800">1. Seleccionar Modelo Físico/Matemático</h4>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      <button
                        onClick={() => {
                          setNnTargetFnId('hole');
                          setNnIsTraining(false);
                        }}
                        className={`text-left p-3 rounded-xl border text-xs transition-all flex flex-col pointer-events-auto cursor-pointer ${
                          nnTargetFnId === 'hole'
                            ? 'bg-indigo-900 text-white border-indigo-950 shadow'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="font-bold flex items-center justify-between w-full">
                          <span>Polinómica con Bache (Discontinuidad Evitable)</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${nnTargetFnId === 'hole' ? 'bg-indigo-950 text-indigo-300' : 'bg-slate-100 text-slate-550'}`}>
                            f(x) = (x²-4)/(x-2)
                          </span>
                        </span>
                        <p className={`text-[10.5px] leading-snug mt-1.5 ${nnTargetFnId === 'hole' ? 'text-indigo-200' : 'text-slate-500'}`}>
                          No definida en x = 2. Excelente para probar si la red auto-completa el "limite continuador" en la ausencia de muestras locales.
                        </p>
                      </button>

                      <button
                        onClick={() => {
                          setNnTargetFnId('jump');
                          setNnIsTraining(false);
                        }}
                        className={`text-left p-3 rounded-xl border text-xs transition-all flex flex-col pointer-events-auto cursor-pointer ${
                          nnTargetFnId === 'jump'
                            ? 'bg-indigo-900 text-white border-indigo-950 shadow'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="font-bold flex items-center justify-between w-full">
                          <span>Discontinuidad de Salto (Límite Inexistente)</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${nnTargetFnId === 'jump' ? 'bg-indigo-950 text-indigo-300' : 'bg-slate-100 text-slate-550'}`}>
                            Paso Escalonado
                          </span>
                        </span>
                        <p className={`text-[10.5px] leading-snug mt-1.5 ${nnTargetFnId === 'jump' ? 'text-indigo-200' : 'text-slate-500'}`}>
                          Los límites laterales son distintos (1.5 vs 3.5). Observa la curvatura que genera la red continuous para salvar la brecha del salto cuántico.
                        </p>
                      </button>

                      <button
                        onClick={() => {
                          setNnTargetFnId('smooth');
                          setNnIsTraining(false);
                        }}
                        className={`text-left p-3 rounded-xl border text-xs transition-all flex flex-col pointer-events-auto cursor-pointer ${
                          nnTargetFnId === 'smooth'
                            ? 'bg-indigo-900 text-white border-indigo-950 shadow'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="font-bold flex items-center justify-between w-full">
                          <span>Onda Continua (Interpolación General)</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${nnTargetFnId === 'smooth' ? 'bg-indigo-950 text-indigo-300' : 'bg-slate-100 text-slate-550'}`}>
                            f(x)=sen(1.2πx)+2.5
                          </span>
                        </span>
                        <p className={`text-[10.5px] leading-snug mt-1.5 ${nnTargetFnId === 'smooth' ? 'text-indigo-200' : 'text-slate-500'}`}>
                          Elipse sinusoidal fluida. Demuestra qué tan bien puede extrapolado de límites curvos un perceptrón con solo unas pocas neuronas.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Topology Slider and Act Selector */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                      <Layers className="h-4 w-4 text-indigo-600" />
                      <h4 className="font-display font-bold text-sm text-slate-800">2. Estructura de la Red Neuronal</h4>
                    </div>

                    <div className="space-y-3.5">
                      {/* Activation function selector */}
                      <div>
                        <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                          <span>Función de Activación (Hiden Layers)</span>
                          <span className="text-indigo-600 font-mono font-bold capitalize">{nnActivation}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(['tanh', 'sigmoid', 'relu'] as const).map(actName => (
                            <button
                              key={actName}
                              onClick={() => {
                                setNnActivation(actName);
                                setNnIsTraining(false);
                              }}
                              className={`py-1.5 px-2 rounded-lg text-xs font-mono font-semibold border transition pointer-events-auto cursor-pointer ${
                                nnActivation === actName
                                  ? 'bg-indigo-50 border-indigo-400 text-indigo-700 shadow-xs'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-550/10'
                              }`}
                            >
                              {actName}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Config layers sizes */}
                      <div>
                        <div className="flex justify-between text-xs font-semibold text-slate-700">
                          <span>Tamaño Capa Oculta 1</span>
                          <span className="text-indigo-600 font-mono font-bold">{nnHiddenSize1} Neuronas</span>
                        </div>
                        <input
                          type="range"
                          min="2"
                          max="12"
                          value={nnHiddenSize1}
                          onChange={(e) => {
                            setNnHiddenSize1(parseInt(e.target.value));
                            setNnIsTraining(false);
                          }}
                          className="w-full mt-1 accent-indigo-600 pointer-events-auto cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-semibold text-slate-700">
                          <span>Tamaño Capa Oculta 2</span>
                          <span className="text-indigo-600 font-mono font-bold">
                            {nnHiddenSize2 > 0 ? `${nnHiddenSize2} Neuronas` : 'Capas Desactivada'}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="8"
                          value={nnHiddenSize2}
                          onChange={(e) => {
                            setNnHiddenSize2(parseInt(e.target.value));
                            setNnIsTraining(false);
                          }}
                          className="w-full mt-1 accent-indigo-600 pointer-events-auto cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Hyperparameters Config */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                      <Sliders className="h-4 w-4 text-indigo-600" />
                      <h4 className="font-display font-bold text-sm text-slate-800">3. Configurar Aprendizaje (Hiperparámetros)</h4>
                    </div>

                    <div className="space-y-3.5 text-xs font-sans">
                      {/* Learning Rate */}
                      <div>
                        <div className="flex justify-between text-slate-700 font-semibold">
                          <span>Tasa de Aprendizaje (η)</span>
                          <span className="text-indigo-600 font-mono font-bold">{nnLearningRate.toFixed(3)}</span>
                        </div>
                        <input
                          type="range"
                          min="0.01"
                          max="0.4"
                          step="0.01"
                          value={nnLearningRate}
                          onChange={(e) => setNnLearningRate(parseFloat(e.target.value))}
                          className="w-full mt-1 accent-indigo-600 pointer-events-auto cursor-pointer"
                        />
                      </div>

                      {/* Excluded Zone Width */}
                      {nnTargetFnId === 'hole' && (
                        <div>
                          <div className="flex justify-between text-slate-700 font-semibold">
                            <span>Ancho Exclusión de Datos (Agujero Δx)</span>
                            <span className="text-indigo-600 font-mono font-bold">± {(nnHoleSize / 2).toFixed(2)} ([{(2 - nnHoleSize/2).toFixed(2)}, {(2 + nnHoleSize/2).toFixed(2)}])</span>
                          </div>
                          <input
                            type="range"
                            min="0.0"
                            max="1.5"
                            step="0.1"
                            value={nnHoleSize}
                            onChange={(e) => {
                              setNnHoleSize(parseFloat(e.target.value));
                              setNnIsTraining(false);
                            }}
                            className="w-full mt-1 accent-indigo-600 pointer-events-auto cursor-pointer"
                          />
                        </div>
                      )}

                      {/* Weight decay */}
                      <div>
                        <div className="flex justify-between text-slate-700 font-semibold">
                          <span>Regularización L2 (Weight Decay)</span>
                          <span className="text-indigo-600 font-mono font-bold">{nnWeightDecay.toFixed(5)}</span>
                        </div>
                        <input
                          type="range"
                          min="0.0"
                          max="0.005"
                          step="0.0001"
                          value={nnWeightDecay}
                          onChange={(e) => setNnWeightDecay(parseFloat(e.target.value))}
                          className="w-full mt-1 accent-indigo-600 pointer-events-auto cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Engine Action Dashboard */}
                  <div className="bg-slate-900 border border-slate-850 text-white rounded-2xl p-5 shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4.5 w-4.5 text-emerald-400 animate-pulse" />
                        <span className="font-display font-medium text-xs text-slate-200">Panel de Ejecución</span>
                      </div>
                      <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold uppercase">
                        {nnIsTraining ? 'Entrenando' : 'Detenido'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="bg-slate-850 border border-slate-800 p-2.5 rounded-xl">
                        <span className="block text-[9.5px] text-slate-400 font-sans uppercase font-semibold">Épocas de Entrenamiento</span>
                        <strong className="block text-lg font-mono text-indigo-300 mt-0.5">{nnEpochs}</strong>
                      </div>
                      <div className="bg-slate-850 border border-slate-800 p-2.5 rounded-xl">
                        <span className="block text-[9.5px] text-slate-400 font-sans uppercase font-semibold">Error Medio (MSE)</span>
                        <strong className={`block text-lg font-mono mt-0.5 ${currentLoss < 0.05 ? 'text-emerald-450' : 'text-amber-450'}`}>
                          {currentLoss > 0 ? currentLoss.toFixed(6) : 'S/I'}
                        </strong>
                      </div>
                    </div>

                    {/* Controller Action buttons */}
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setNnIsTraining(!nnIsTraining)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold font-display shadow transition pointer-events-auto cursor-pointer ${
                            nnIsTraining
                              ? 'bg-rose-600 text-white hover:bg-rose-700'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {nnIsTraining ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          {nnIsTraining ? 'Pausar Entrenamiento' : 'Iniciar Aprendizaje'}
                        </button>

                        <button
                          disabled={nnIsTraining}
                          onClick={() => {
                            if (!net) return;
                            const dataset = generateNnDataset(nnTargetFnId, nnHoleSize);
                            let batchLoss = 0;
                            // Execute 100 fast iterations
                            for (let step = 0; step < 150; step++) {
                              nnZeroGradients(net);
                              batchLoss = 0;
                              for (let i = 0; i < dataset.length; i++) {
                                const px = dataset[i].x;
                                const py = dataset[i].y;
                                nnForwardPass(net, (px - 2.0) / 2.0, nnActivation);
                                const pred = net.activations[net.sizes.length - 1][0];
                                batchLoss += 0.5 * (pred - py) * (pred - py);
                                nnBackpropagate(net, py, nnActivation);
                              }
                              nnApplyGradients(net, nnLearningRate, dataset.length, nnWeightDecay);
                            }
                            setNnEpochs(e => e + 150);
                            setNnLossHistory(prev => {
                              const next = [...prev, batchLoss / dataset.length];
                              if (next.length > 80) next.shift();
                              return next;
                            });
                            setNnTick(t => t + 1);
                          }}
                          className="flex items-center justify-center p-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-750 text-indigo-300 transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                          title="Avanzar +150 Épocas instantáneamente en segundo plano"
                        >
                          <Zap className="h-4 w-4 text-amber-400" />
                          <span className="text-xs font-bold ml-1">+150 Épocas</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            const sizes = [1, nnHiddenSize1];
                            if (nnHiddenSize2 > 0) {
                              sizes.push(nnHiddenSize2);
                            }
                            sizes.push(1);
                            nnNetworkRef.current = nnInitNetwork(sizes);
                            setNnEpochs(0);
                            setNnLossHistory([]);
                            setNnSelectedNode(null);
                            setNnTick(t => t + 1);
                            setNnIsTraining(false);
                          }}
                          className="p-2 rounded-xl bg-slate-800 border border-slate-705 text-slate-400 hover:bg-slate-750 hover:text-white transition cursor-pointer"
                          title="Volver a barajar todos los parámetros aleatoriamente"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Adjust rendering iterations speed */}
                      <div className="flex items-center justify-between text-[11px] text-slate-450 px-1 pt-1.5 border-t border-slate-850">
                        <span>Fracciones de entrenamiento por ciclo visual:</span>
                        <select
                          value={nnTrainingSpeed}
                          onChange={(e) => setNnTrainingSpeed(parseInt(e.target.value))}
                          className="bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-mono rounded px-1.5 py-0.5 outline-none cursor-pointer"
                        >
                          <option value="1">1x (Lento)</option>
                          <option value="4">4x (Medio)</option>
                          <option value="8">8x (Normal)</option>
                          <option value="16">16x (Acelerado)</option>
                          <option value="32">32x (Máximo)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Plot Panel and Neuron Graph Inspector */}
                <div className="lg:col-span-7 space-y-8 flex flex-col justify-between">
                  
                  {/* Scatter plot of prediction and target */}
                  <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="font-display font-extrabold text-sm text-slate-800">
                          Aproximador Universal de Funciones & Límites
                        </h4>
                        <span className="font-mono text-[9px] text-indigo-600 block leading-tight mt-0.5">
                          Función Objetivo: {targetFnLabel} | {targetFnFormula}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[10.5px]">
                        <div className="flex items-center gap-1.5 text-slate-500 font-sans">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                          <span>Puntos Muestreados</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-indigo-600 font-semibold font-sans">
                          <span className="h-0.5 w-3.5 bg-indigo-600 inline-block rounded-full" />
                          <span>Red Predicha</span>
                        </div>
                      </div>
                    </div>

                    {/* SVG plotting area */}
                    <div className="relative">
                      <svg width="100%" height={heightP} viewBox={`0 0 ${widthP} ${heightP}`} className="select-none overflow-visible">
                        {/* Background mesh grid */}
                        {Array.from({ length: 9 }).map((_, i) => {
                          const xVal = i * 0.5;
                          const px = scaleXP(xVal);
                          return (
                            <g key={`nplot-grid-x-${i}`}>
                              <line
                                x1={px}
                                y1={scaleYP(0.5)}
                                x2={px}
                                y2={scaleYP(5.5)}
                                className="stroke-slate-100"
                                strokeWidth={1}
                              />
                              <text x={px - 4} y={heightP - 12} className="font-mono text-[8.5px] fill-slate-400">
                                {xVal.toFixed(1)}
                              </text>
                            </g>
                          );
                        })}
                        {Array.from({ length: 6 }).map((_, i) => {
                          const yVal = 1.0 + i * 1.0;
                          const py = scaleYP(yVal);
                          return (
                            <g key={`nplot-grid-y-${i}`}>
                              <line
                                x1={scaleXP(0.0)}
                                y1={py}
                                x2={scaleXP(4.0)}
                                y2={py}
                                className="stroke-slate-100"
                                strokeWidth={1}
                              />
                              <text x={12} y={py + 3} className="font-mono text-[8.5px] fill-slate-400">
                                {yVal.toFixed(1)}
                              </text>
                            </g>
                          );
                        })}

                        {/* Exclusion hole area overlay highlight */}
                        {nnTargetFnId === 'hole' && nnHoleSize > 0 && (
                          <rect
                            x={scaleXP(2.0 - nnHoleSize / 2)}
                            y={scaleYP(5.5)}
                            width={scaleXP(2.0 + nnHoleSize / 2) - scaleXP(2.0 - nnHoleSize / 2)}
                            height={scaleYP(0.5) - scaleYP(5.5)}
                            fill="url(#exclPattern)"
                            className="opacity-35"
                          />
                        )}

                        <defs>
                          <pattern id="exclPattern" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                            <line x1="0" y1="0" x2="0" y2="10" stroke="#f59e0b" strokeWidth="2.5" />
                          </pattern>
                        </defs>

                        {/* Analytic target function line (Dotted thin representation) */}
                        <path
                          d={analyticCurveD}
                          fill="none"
                          stroke="#cbd5e1"
                          strokeWidth={1.5}
                          strokeDasharray="4,4"
                        />

                        {/* Plot exclusion hole boundaries (Amber markers) */}
                        {nnTargetFnId === 'hole' && (
                          <g>
                            <line
                              x1={scaleXP(2.0 - nnHoleSize / 2)}
                              y1={scaleYP(0.5)}
                              x2={scaleXP(2.0 - nnHoleSize / 2)}
                              y2={scaleYP(5.5)}
                              stroke="#f59e0b"
                              strokeWidth={1.2}
                              strokeDasharray="2,3"
                            />
                            <line
                              x1={scaleXP(2.0 + nnHoleSize / 2)}
                              y1={scaleYP(0.5)}
                              x2={scaleXP(2.0 + nnHoleSize / 2)}
                              y2={scaleYP(5.5)}
                              stroke="#f59e0b"
                              strokeWidth={1.2}
                              strokeDasharray="2,3"
                            />
                          </g>
                        )}

                        {/* Training Dataset scatter points (Skip exclusion zone) */}
                        {datasetPoints.map((pt, idx) => (
                          <circle
                            key={`nn-pt-${idx}`}
                            cx={scaleXP(pt.x)}
                            cy={scaleYP(pt.y)}
                            r={nnTargetFnId === 'hole' ? 1.8 : 2.2}
                            className="fill-slate-450 stroke-white"
                            strokeWidth={0.5}
                            opacity={0.8}
                          />
                        ))}

                        {/* Neural System predicted curve path */}
                        <path
                          d={nnCurveD}
                          fill="none"
                          stroke="#4f46e5"
                          strokeWidth={2.8}
                          className="drop-shadow-lg"
                        />

                        {/* Removable Hole "balazo" indicator */}
                        {nnTargetFnId === 'hole' && (
                          <circle
                            cx={scaleXP(2.0)}
                            cy={scaleYP(4.0)}
                            r={5}
                            className="fill-white stroke-slate-450"
                            strokeWidth={2}
                          />
                        )}

                        {/* Live Probe Interactor Line */}
                        <g>
                          <line
                            x1={scaleXP(nnTestX)}
                            y1={scaleYP(0.5)}
                            x2={scaleXP(nnTestX)}
                            y2={scaleYP(5.5)}
                            stroke="#818cf8"
                            strokeWidth={1.5}
                            strokeDasharray="3,1"
                          />
                          {/* Inner pointer dot overlay */}
                          <circle
                            cx={scaleXP(nnTestX)}
                            cy={scaleYP(evaluateNN(nnTestX))}
                            r={5.5}
                            className="fill-indigo-650 stroke-white"
                            strokeWidth={1.5}
                          />
                        </g>

                      </svg>

                      {/* Hover/slide probe interactor panel */}
                      <div className="mt-3.5 bg-slate-550/5 border border-slate-200/60 rounded-xl p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <label className="text-xs font-semibold text-slate-700 flex justify-between">
                            <span>Sonda de Análisis de Inferencia (Arrastre para explorar):</span>
                            <span className="font-mono font-bold text-indigo-600">x_sonda = {nnTestX.toFixed(2)}</span>
                          </label>
                          <input
                            type="range"
                            min="0.1"
                            max="3.9"
                            step="0.02"
                            value={nnTestX}
                            onChange={(e) => setNnTestX(parseFloat(e.target.value))}
                            className="w-full h-1 accent-indigo-600 pointer-events-auto cursor-pointer"
                          />
                        </div>
                        <div className="bg-white border rounded-lg px-3 py-1.5 flex flex-col justify-center text-[11px] font-mono w-full md:w-44 text-slate-600 space-y-0.5">
                          <div>Sonda exacto: <strong className="text-slate-800">{evaluateNN(nnTestX).toFixed(4)}</strong></div>
                          {nnTargetFnId === 'hole' && Math.abs(nnTestX - 2.0) < nnHoleSize / 2 ? (
                            <div className="text-[10px] text-amber-600 font-sans font-bold flex items-center gap-0.5 mt-0.5">⚠️ Zona sin muestras</div>
                          ) : (
                            <div className="text-[10px] text-indigo-500 font-sans flex items-center gap-0.5">✓ Zona con muestras</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Advanced limits comparison forensic module */}
                    <div className="mt-4 p-4 rounded-xl border border-indigo-150/50 bg-indigo-50/20 text-xs text-indigo-950 font-sans grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-mono font-bold text-slate-500 block">Límitante Analítico Real:</span>
                        <div className="font-serif italic text-sm text-indigo-950">{targetLimitDesc}</div>
                        <p className="text-[10px] text-slate-500 leading-tight">Límite riguroso resuelto de manera simbólica.</p>
                      </div>

                      <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-200 md:pl-4 pt-2.5 md:pt-0">
                        <span className="text-[10px] uppercase font-mono font-bold text-slate-500 block">Límites Laterales Red (NN):</span>
                        <div className="font-mono text-xs text-indigo-900 mt-0.5">
                          lim(x→2⁻) ≈ <strong>{leftLimitNN.toFixed(4)}</strong>
                          <br className="mb-0.5" />
                          lim(x→2⁺) ≈ <strong>{rightLimitNN.toFixed(4)}</strong>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight">Modelado por aproximación a h = ± {deltaH}.</p>
                      </div>

                      <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-200 md:pl-4 pt-2.5 md:pt-0">
                        <span className="text-[10px] uppercase font-mono font-bold text-slate-500 block">Evaluación en el Agujero:</span>
                        <div className="font-mono text-xs text-indigo-950 mt-0.5">
                          lim Medio ≈ <strong className="text-indigo-600">{limitJoint.toFixed(4)}</strong>
                          <br />
                          NN(2.00) = <strong className="text-emerald-700">{valueNN.toFixed(4)}</strong>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight">Valor interpolado por auto-completar analítico.</p>
                      </div>

                    </div>

                  </div>

                  {/* Topologic Architecture Flow and Weights weights visualization */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center space-x-2">
                        <Layers className="h-4 w-4 text-indigo-600" />
                        <h4 className="font-display font-bold text-sm text-slate-800">
                          4. Topología Neuronal e Inspector de Parámetros
                        </h4>
                      </div>
                      <button
                        onClick={() => setNnShowNetworkGradients(!nnShowNetworkGradients)}
                        className="py-1 px-2.5 rounded border text-[10.5px] font-sans font-semibold transition cursor-pointer bg-white text-slate-550 border-slate-200 hover:bg-slate-50"
                      >
                        {nnShowNetworkGradients ? 'Ver Valores de Pesos/Sesgos' : 'Ver Magnitud del Gradiente'}
                      </button>
                    </div>

                    <p className="text-[10.5px] leading-normal text-slate-500">
                      Haga clic en cualquier <strong className="text-indigo-600">Neurona (círculo)</strong> en la red de abajo para abrir el <strong>Inspector Forense de Caja Negra</strong> y observar sus parámetros, señales de activación e impulsos de error durante el Backprop.
                    </p>

                    {/* SVG diagram representing network hierarchy */}
                    <div className="bg-slate-900 rounded-xl overflow-hidden p-3 border border-slate-800 relative">
                      <svg width="100%" height={heightGen} viewBox={`0 0 ${widthGen} ${heightGen}`} className="select-none overflow-visible">
                        
                        {/* We draw the connection lines (weights) first to render them behind the neurons */}
                        {net && sizes.map((size, lIdx) => {
                          if (lIdx === totalLayers - 1) return null;
                          const nextSize = sizes[lIdx + 1];
                          const weights = net.weights[lIdx];
                          const dWeights = net.dWeights[lIdx];

                          return Array.from({ length: size }).map((_, j) => {
                            const fromCoords = getNeuronCoords(lIdx, j);
                            return Array.from({ length: nextSize }).map((_, i) => {
                              const toCoords = getNeuronCoords(lIdx + 1, i);
                              
                              const weight = weights[i]?.[j] ?? 0.0;
                              const dwGradient = dWeights[i]?.[j] ?? 0.0;
                              
                              // Select magnitude to render thickness
                              const magnitude = nnShowNetworkGradients ? Math.abs(dwGradient) * 15 : Math.abs(weight);
                              const strokeW = Math.max(0.6, Math.min(5.0, magnitude * 1.5));
                              
                              // Emerald for positive weights, Rose for negative weights
                              const isPositive = nnShowNetworkGradients ? (dwGradient >= 0) : (weight >= 0);
                              let connColor = isPositive ? 'rgba(16, 185, 129, 0.45)' : 'rgba(244, 63, 94, 0.45)';

                              // Highlight connections related to the selected neuron
                              const isFromSelected = nnSelectedNode?.layer === lIdx && nnSelectedNode?.index === j;
                              const isToSelected = nnSelectedNode?.layer === lIdx + 1 && nnSelectedNode?.index === i;
                              if (nnSelectedNode) {
                                if (isFromSelected || isToSelected) {
                                  connColor = isPositive ? 'rgba(52, 211, 153, 0.9)' : 'rgba(251, 113, 133, 0.9)';
                                } else {
                                  connColor = 'rgba(255, 255, 255, 0.05)';
                                }
                              }

                              return (
                                <line
                                  key={`nn-conn-${lIdx}-${j}-${i}`}
                                  x1={fromCoords.cx}
                                  y1={fromCoords.cy}
                                  x2={toCoords.cx}
                                  y2={toCoords.cy}
                                  stroke={connColor}
                                  strokeWidth={strokeW}
                                  className="transition-all duration-300"
                                />
                              );
                            });
                          });
                        })}

                        {/* Draw the neuron circles */}
                        {sizes.map((size, lIdx) => {
                          const label = lIdx === 0 ? 'X' : lIdx === totalLayers - 1 ? 'Salida' : `Ocul.${lIdx}`;
                          return Array.from({ length: size }).map((_, i) => {
                            const { cx, cy } = getNeuronCoords(lIdx, i);
                            
                            const isSelected = nnSelectedNode?.layer === lIdx && nnSelectedNode?.index === i;
                            
                            let nodeFill = 'fill-slate-850';
                            let nodeStroke = 'stroke-slate-700';
                            if (lIdx === 0) {
                              nodeFill = 'fill-indigo-950';
                              nodeStroke = 'stroke-indigo-400';
                            } else if (lIdx === totalLayers - 1) {
                              nodeFill = 'fill-emerald-950';
                              nodeStroke = 'stroke-emerald-400';
                            }

                            if (isSelected) {
                              nodeStroke = 'stroke-amber-400';
                            }

                            return (
                              <g
                                key={`nn-node-grp-${lIdx}-${i}`}
                                className="cursor-pointer pointer-events-auto"
                                onClick={() => setNnSelectedNode({ layer: lIdx, index: i })}
                              >
                                {isSelected && (
                                  <circle
                                    cx={cx}
                                    cy={cy}
                                    r={14}
                                    className="fill-none stroke-amber-400/50 animate-ping"
                                    strokeWidth={1}
                                  />
                                )}
                                <circle
                                  cx={cx}
                                  cy={cy}
                                  r={10.5}
                                  className={`${nodeFill} ${nodeStroke} transition-all duration-300`}
                                  strokeWidth={isSelected ? 2 : 1.5}
                                />
                                {/* Micro index indicator inside node */}
                                <text
                                  x={cx - 3.5}
                                  y={cy + 3}
                                  className="fill-slate-300 font-mono text-[8px] font-bold"
                                >
                                  {lIdx === 0 ? 'x' : lIdx === totalLayers - 1 ? 'y' : `${i + 1}`}
                                </text>
                                
                                {/* Micro text description of layers name (Rendered once per layer header) */}
                                {i === 0 && (
                                  <text
                                    x={cx - 15}
                                    y={15}
                                    className="fill-slate-450 font-display text-[8.5px] font-bold uppercase tracking-wider"
                                  >
                                    {label}
                                  </text>
                                )}
                              </g>
                            );
                          });
                        })}

                      </svg>
                    </div>

                    {/* Selected neuron forensic data sheet panel */}
                    {nnSelectedNode && net ? (() => {
                      const { layer, index } = nnSelectedNode;
                      
                      let nodeTitle = '';
                      let nodeBiasStr = '';
                      let nodeBiasGradStr = '';
                      let activationFormula = '';
                      let activationValue = 0.0;
                      let weightsList: { from: number; w: number; dw: number }[] = [];

                      if (layer === 0) {
                        nodeTitle = `Nodo de Entrada (x normalized)`;
                        const currVal = (nnTestX - 2.0) / 2.0;
                        nodeBiasStr = 'S/I (Sensor primario)';
                        activationFormula = `a(x) = (x_sonda - 2) / 2 = (${nnTestX.toFixed(2)} - 2)/2`;
                        activationValue = currVal;
                      } else {
                        const isFinal = (layer === totalLayers - 1);
                        nodeTitle = isFinal ? 'Neurona de Regresión Final (Salida)' : `Neurona Capa Oculta ${layer}, Índice #${index + 1}`;
                        
                        const bias = net.biases[layer - 1][index] ?? 0.0;
                        const dBias = net.dBiases[layer - 1][index] ?? 0.0;
                        nodeBiasStr = bias.toFixed(5);
                        nodeBiasGradStr = dBias.toFixed(5);

                        activationFormula = isFinal ? 'Activación Lineal (Identidad f(sum))' : `Activada via h(${nnActivation})`;
                        
                        // Current activation value at latest probe test slider
                        nnForwardPass(net, (nnTestX - 2.0)/2.0, nnActivation);
                        activationValue = net.activations[layer][index] ?? 0.0;

                        // Fetch weights feeding inside
                        const neuronW = net.weights[layer - 1][index] ?? [];
                        const neuronDW = net.dWeights[layer - 1][index] ?? [];
                        for (let j = 0; j < neuronW.length; j++) {
                          weightsList.push({
                            from: j + 1,
                            w: neuronW[j],
                            dw: neuronDW[j]
                          });
                        }
                      }

                      return (
                        <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-4 space-y-3 font-mono text-[10.5px]">
                          <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                            <span className="font-bold text-indigo-400 flex items-center gap-1">
                              <Zap className="h-3.5 w-3.5 text-amber-500" /> Inspector de Caja Negra
                            </span>
                            <span className="text-slate-400 text-[9.5px]">{nodeTitle}</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <div>Sesgo (Bias b): <strong className="text-white text-xs">{nodeBiasStr}</strong></div>
                              {layer > 0 && (
                                <div>Gradiente b (dE/db): <strong className="text-rose-400 font-bold">{nodeBiasGradStr}</strong></div>
                              )}
                              <div>Fórmula: <span className="text-indigo-300 font-sans block mt-0.5">{activationFormula}</span></div>
                            </div>

                            <div className="space-y-1.5">
                              <div>Sonda Activación a: <strong className="text-emerald-400 text-xs">{activationValue.toFixed(6)}</strong></div>
                              <p className="text-[9.5px] text-slate-400 font-sans leading-tight">
                                Este es el diferencial que empuja o frena la pendiente local para aproximar la topología del límite matemático.
                              </p>
                            </div>
                          </div>

                          {weightsList.length > 0 && (
                            <div className="pt-2 border-t border-slate-800 space-y-1">
                              <span className="text-indigo-300 font-sans font-bold block text-[9.5px]">Pesos Sináptico de entrada (Weights w_j):</span>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[9px] pt-1">
                                {weightsList.map(item => (
                                  <div key={`param-sheet-w-${item.from}`} className="bg-slate-850 p-1.5 rounded border border-slate-800">
                                    <div className="text-slate-400 flex justify-between">
                                      <span>Nodo {layer === 1 ? 'X' : `#${item.from}`} →</span>
                                    </div>
                                    <strong className="block text-white mt-0.5">{item.w.toFixed(5)}</strong>
                                    <span className="block text-[8.5px] text-rose-305 mt-0.5">dE/dw: {item.dw.toFixed(4)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        </div>
                      );
                    })() : (
                      <div className="bg-slate-900/60 p-4 rounded-xl border border-dashed border-slate-800 text-slate-500 font-mono text-[10.5px] text-center">
                        Haga clic en un nodo de la red en el panel superior para activar el inspector de peso sinápticos y gradientes acumulados.
                      </div>
                    )}

                  </div>

                </div>

              </div>

              {/* === NOTA PEDAGÓGICA VANGUARDISTA === */}
              <div id="neural-pedagogical-evaluation-notations" className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 border border-indigo-900/50 rounded-2xl p-6 md:p-8 text-slate-100 shadow-xl relative overflow-hidden mt-8">
                <div className="absolute top-0 right-0 h-40 w-40 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.4),transparent_70%)]" />
                <div className="flex flex-col md:flex-row items-start gap-4">
                  <div className="p-3 bg-indigo-500/10 border border-indigo-400/20 rounded-xl text-indigo-400 shrink-0">
                    <BookOpen id="pedagogy-book-icon-badge" className="h-6 w-6" />
                  </div>
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] tracking-widest font-mono text-indigo-400 uppercase font-bold">Nota Didáctica de Vanguardia</span>
                      <h4 className="font-display font-extrabold text-lg text-white mt-1">
                        El Concepto de Límite como Inferencia y Continuidad en Redes Neuronales
                      </h4>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      ¿Cómo puede un estudiante interactuar con este cerebro artificial para asimilar profundamente la noción de <strong>límite matemático</strong>?
                      La magia educativa aquí reside en presenciar a una red neuronal resolver un <strong>vacío absoluto de información</strong>. 
                      Tradicionalmente, el cálculo enseña el límite como la aproximación numérica infinitesimal de un punto <span className="font-serif italic text-indigo-355 font-bold">x → a</span>. 
                      Este simulador integra el <strong>Teorema de Aproximación Universal</strong> con la matemática clásica para ofrecer una perspectiva totalmente nueva:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2 text-xs font-sans">
                      <div className="bg-slate-850/60 border border-slate-800/80 rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="h-5 w-5 rounded-md bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 flex items-center justify-center font-mono font-bold text-[10px]">1</span>
                          <strong className="text-indigo-300">Aprender del Vacío</strong>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Al configurar un <span className="text-amber-400 font-semibold">Agujero de Exclusión (Δx)</span> en <span className="font-mono text-indigo-200">x = 2.0</span>, la red es entrenada sin muestras en esta zona. El alumno comprende vivamente lo que implica deducir la conducta de un sistema donde no tenemos datos empíricos tangibles.
                        </p>
                      </div>

                      <div className="bg-slate-850/60 border border-slate-800/80 rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="h-5 w-5 rounded-md bg-emerald-500/10 border border-emerald-400/20 text-emerald-450 flex items-center justify-center font-mono font-bold text-[10px]">2</span>
                          <strong className="text-emerald-350">Límite por Definición Física</strong>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Debido a que el perceptrón se compone de neuronas continuas diferenciables (<span className="font-mono text-indigo-200">tanh / sigmoid</span>), el mapeo resultante es inherentemente continuo. La predicción de la red en el centro del bache representa geométricamente el <strong>límite continuador de la topología</strong>: <span className="font-serif italic text-emerald-450 text-xs font-bold animate-pulse">NN(2) = lim(x→2) NN(x)</span>.
                        </p>
                      </div>

                      <div className="bg-slate-850/60 border border-slate-800/80 rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="h-5 w-5 rounded-md bg-rose-500/10 border border-rose-400/20 text-rose-400 flex items-center justify-center font-mono font-bold text-[10px]">3</span>
                          <strong className="text-rose-350">La Ruptura del Espacio-Tiempo</strong>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Si activas la <span className="text-rose-300 font-semibold">Discontinuidad de Salto</span>, los límites laterales se bifurcan (<span className="text-slate-200 font-mono">1.5 vs 3.5</span>). El alumno verá a la red estirarse en una forzada curva "S" para aproximar ambos extremos, demostrando visualmente el colapso del límite general por contradicción espacial.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 p-4 rounded-xl border border-indigo-900/40 bg-indigo-950/40 text-xs">
                      <h5 className="font-bold text-indigo-300 flex items-center gap-1.5 mb-1.5">
                        <Brain className="h-4 w-4 text-indigo-400" /> Hoja de Ruta de Exploración para el Estudiante:
                      </h5>
                      <ul className="list-disc pl-5 space-y-2 text-slate-350 font-sans leading-relaxed text-[11px]">
                        <li>
                          <strong>Desafía al Oráculo:</strong> Selecciona la opción <span className="text-indigo-200 font-semibold">Polinómica con Bache</span>, ajusta el bache al máximo (<span className="text-amber-400 font-mono">± 0.75</span>) y haz clic en <span className="text-indigo-200 font-semibold">Iniciar Aprendizaje</span>. Una vez que el error MSE sea mínimo, desplaza la sonda manual y colócala exactamente en <span className="text-emerald-400 font-bold font-mono">2.00</span>. ¿Cómo es posible que prediga con exactitud la proximidad de <span className="font-mono text-emerald-400 font-bold">4.00</span> sin haber visto un solo punto de datos allí? Felicidades: has comprobado experimentalmente el concepto del <strong>límite removible por continuidad inducida</strong>.
                        </li>
                        <li>
                          <strong>Flexibilidad Dimensional:</strong> Modifica el número de neuronas ocultas. Verás que a mayor número de parámetros, la transición en la discontinuidad de salto se vuelve infinitamente más empinada. Esto enseña al alumno que los límites laterales divergentes son insolubles de forma perfecta excepto en infinitas dimensiones matemáticas de pesos.
                        </li>
                        <li>
                          <strong>Epistemología Artificial:</strong> En Machine Learning, generalizar es aproximar límites seguros de eventos no observados en el universo físico. ¡El límite no es solo una abstracción académica; es el pilar de la inferencia inteligente!
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          );
        })()}

        {activeTab === 'music' && (() => {
          // pre-sample Beethoven
          const beethovenSamplesCount = 150;
          const beethovenData: { t: number, p: number, dp: number, v: number, dv: number }[] = [];
          for (let i = 0; i < beethovenSamplesCount; i++) {
            const t = (i / (beethovenSamplesCount - 1)) * 4.65;
            const { p, dp, v, dv } = getBeethovenMathValues(t);
            beethovenData.push({ t, p, dp, v, dv });
          }

          // pre-sample slow sine
          const sineSamplesCount = 150;
          const sineData: { t: number, v: number, dv: number }[] = [];
          for (let i = 0; i < sineSamplesCount; i++) {
            const t = (i / (sineSamplesCount - 1)) * 4.0;
            const f_mod = 0.5;
            const v = 0.5 + 0.45 * Math.sin(2 * Math.PI * f_mod * t);
            const dv = 0.45 * 2 * Math.PI * f_mod * Math.cos(2 * Math.PI * f_mod * t);
            sineData.push({ t, v, dv });
          }

          // Scales for SVM plots
          const svgW = 500;
          const svgH = 150;
          const mapRange = (val: number, inMin: number, inMax: number, outMin: number, outMax: number) => {
            return outMin + ((val - inMin) / (inMax - inMin)) * (outMax - outMin);
          };

          // Render selected graphs
          let topPath = '';
          let bottomPath = '';
          let topLabel = '';
          let bottomLabel = '';
          let topYRange: [number, number] = [0, 1];
          let bottomYRange: [number, number] = [-1, 1];
          
          const tMax = musicScenario === 'beethoven' ? 4.65 : 4.0;
          const playheadX = mapRange(musicPlaybackTime, 0, tMax, 35, svgW - 25);

          if (musicScenario === 'beethoven') {
            topYRange = [100, 420];
            bottomYRange = [-2200, 2200];
            topLabel = "Frecuencia Fundamental f(t) [Tono]";
            bottomLabel = "Tasa de Cambio Instantánea df/dt [Variación de Notas]";
            
            topPath = beethovenData.map((d, i) => {
              const xPos = mapRange(d.t, 0, 4.65, 35, svgW - 25);
              const yPos = mapRange(d.p, 100, 450, svgH - 20, 15);
              return `${i === 0 ? 'M' : 'L'} ${xPos} ${yPos}`;
            }).join(' ');

            bottomPath = beethovenData.map((d, i) => {
              const xPos = mapRange(d.t, 0, 4.65, 35, svgW - 25);
              const yPos = mapRange(d.dp, -3000, 3000, svgH - 15, 15);
              return `${i === 0 ? 'M' : 'L'} ${xPos} ${yPos}`;
            }).join(' ');
          } else if (musicScenario === 'sine') {
            topYRange = [0, 1];
            bottomYRange = [-1.5, 1.5];
            topLabel = "Amplitud de Intensidad f(t) [Volumen]";
            bottomLabel = "Tasa de Cambio de Volumen df/dt [Crescendo / Decrescendo]";

            topPath = sineData.map((d, i) => {
              const xPos = mapRange(d.t, 0, 4.0, 35, svgW - 25);
              const yPos = mapRange(d.v, 0, 1, svgH - 20, 15);
              return `${i === 0 ? 'M' : 'L'} ${xPos} ${yPos}`;
            }).join(' ');

            bottomPath = sineData.map((d, i) => {
              const xPos = mapRange(d.t, 0, 4.0, 35, svgW - 25);
              const yPos = mapRange(d.dv, -1.5, 1.5, svgH - 15, 15);
              return `${i === 0 ? 'M' : 'L'} ${xPos} ${yPos}`;
            }).join(' ');
          }

          const handleThereminMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Reverse y so top is high pitch
            const pctY = 1 - (y / rect.height);
            const freq = 130 + pctY * 670; // 130Hz to 800Hz
            
            // Horizontal position acts as elapsed time t
            const pctX = x / rect.width;
            const t = pctX * 4.0;
            
            setMusicThereminY(y);
            setMusicThereminFreq(freq);
            initMusicAudio();
            if (musicAudioContextRef.current?.state === 'suspended') {
              musicAudioContextRef.current.resume();
            }
            
            // Play live frequency!
            if (musicOsc1Ref.current) {
              musicOsc1Ref.current.frequency.setTargetAtTime(freq, musicAudioContextRef.current?.currentTime || 0, 0.01);
            }
            if (musicGain1Ref.current) {
              musicGain1Ref.current.gain.setTargetAtTime(musicVolume * 0.7, musicAudioContextRef.current?.currentTime || 0, 0.01);
            }
            
            // Calculate numerical derivative with respect to previous point in history
            setMusicThereminPoints((prev) => {
              const lastPoint = prev[prev.length - 1];
              let df = 0;
              if (lastPoint) {
                const dFreq = freq - lastPoint.f;
                const dT = t - lastPoint.t;
                df = dT !== 0 ? (dFreq / dT) : 0;
              }
              
              // Limit to 100 points
              const nextList = [...prev, { t, f: freq, df }];
              if (nextList.length > 120) {
                nextList.shift();
              }
              return nextList;
            });

            // Play derivative voice!
            if (musicEnableDerivativeVoice && musicOsc2Ref.current && musicGain2Ref.current) {
              // For derivative sound, let's play a frequency offset by the absolute rate of change
              const lastPt = musicThereminPoints[musicThereminPoints.length - 1];
              const dfVal = lastPt ? lastPt.df : 0;
              const derFreq = 300 + Math.min(700, Math.abs(dfVal) * 0.3);
              musicOsc2Ref.current.frequency.setTargetAtTime(derFreq, musicAudioContextRef.current?.currentTime || 0, 0.01);
              
              const derGain = Math.min(0.35, Math.abs(dfVal) / 800) * musicVolume;
              musicGain2Ref.current.gain.setTargetAtTime(derGain, musicAudioContextRef.current?.currentTime || 0, 0.01);
            }
          };
          
          const handleThereminMouseLeave = () => {
            // Silence oscillator
            if (musicGain1Ref.current) {
              musicGain1Ref.current.gain.setTargetAtTime(0, musicAudioContextRef.current?.currentTime || 0, 0.01);
            }
            if (musicGain2Ref.current) {
              musicGain2Ref.current.gain.setTargetAtTime(0, musicAudioContextRef.current?.currentTime || 0, 0.01);
            }
          };

          const startMusicPlayback = () => {
            initMusicAudio();
            if (musicAudioContextRef.current?.state === 'suspended') {
              musicAudioContextRef.current.resume();
            }
            setMusicIsPlaying(true);
          };

          return (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch max-w-6xl mx-auto">
              {/* Controls Column */}
              <div className="lg:col-span-5 bg-slate-50 border border-slate-200 p-6 rounded-2xl flex flex-col justify-between math-grid-dense">
                <div className="space-y-6">
                  <div>
                    <span className="bg-indigo-100 text-indigo-900 border border-indigo-200 text-[10.5px] font-mono px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                      Cálculo & Arte
                    </span>
                    <h3 className="font-display font-extrabold text-xl text-slate-900 mt-2">
                      Análisis Didáctico de Frecuencias y Derivadas
                    </h3>
                    <p className="text-slate-500 font-sans text-xs mt-1.5 leading-relaxed">
                      Estrategia análoga basada en el estudio publicado: el sonido y la sinfonía de Beethoven como representaciones sensoriales de tasas de cambio instantáneas y puntos críticos.
                    </p>
                  </div>

                  {/* Scenario selection */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-mono uppercase text-slate-550 font-bold tracking-widest">
                      Seleccionar Experimento Audiodidáctico
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => {
                          stopMusicAudio();
                          setMusicScenario('beethoven');
                          setMusicPlaybackTime(0);
                        }}
                        className={`p-2.5 rounded-xl text-center border font-sans text-xs font-semibold leading-tight transition-all py-3 ${
                          musicScenario === 'beethoven'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-[1.02]'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        🎹 Beethoven No. 5
                      </button>
                      <button
                        onClick={() => {
                          stopMusicAudio();
                          setMusicScenario('sine');
                          setMusicPlaybackTime(0);
                        }}
                        className={`p-2.5 rounded-xl text-center border font-sans text-xs font-semibold leading-tight transition-all py-3 ${
                          musicScenario === 'sine'
                            ? 'bg-slate-900 text-white border-slate-950 shadow-md scale-[1.02]'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        🔊 Onda de Intensidad
                      </button>
                      <button
                        onClick={() => {
                          stopMusicAudio();
                          setMusicScenario('theremin');
                        }}
                        className={`p-2.5 rounded-xl text-center border font-sans text-xs font-semibold leading-tight transition-all py-3 ${
                          musicScenario === 'theremin'
                            ? 'bg-slate-900 text-white border-slate-950 shadow-md scale-[1.02]'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        🎨 Theremin Táctil
                      </button>
                    </div>
                  </div>

                  {/* Controls sliders */}
                  <div className="space-y-4 pt-1">
                    <div className="bg-white border border-slate-150 p-4 rounded-xl space-y-3 shadow-none">
                      <div className="flex justify-between items-center text-xs font-sans">
                        <span className="font-semibold text-slate-700">Manejo de Volumen</span>
                        <span className="font-mono text-indigo-700 font-bold">{(musicVolume * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={musicVolume}
                        onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                        className="w-full accent-indigo-600 shrink-0 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />

                      <label className="flex items-center gap-2.5 pt-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={musicEnableDerivativeVoice}
                          onChange={(e) => setMusicEnableDerivativeVoice(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 h-4 w-4"
                        />
                        <div className="text-left">
                          <span className="text-xs font-bold text-slate-800 block">Activar Voz de la Derivada</span>
                          <span className="text-[10px] text-slate-500 block leading-tight font-sans">
                            Sintoniza un segundo oscilador cuya sonoridad y volumen representan el valor de la derivada en tiempo real.
                          </span>
                        </div>
                      </label>
                    </div>

                    {musicScenario === 'beethoven' && (
                      <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-indigo-900">Velocidad del Tempo</span>
                          <span className="font-mono text-indigo-750 font-bold">{musicBeethovenSpeed.toFixed(2)}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.4"
                          max="2.0"
                          step="0.1"
                          value={musicBeethovenSpeed}
                          onChange={(e) => setMusicBeethovenSpeed(parseFloat(e.target.value))}
                          className="w-full accent-indigo-650 shrink-0 h-1.5 bg-indigo-100 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    )}
                  </div>

                  {/* Playback Trigger Button */}
                  {musicScenario !== 'theremin' && (
                    <button
                      onClick={() => {
                        if (musicIsPlaying) {
                          stopMusicAudio();
                        } else {
                          startMusicPlayback();
                        }
                      }}
                      className={`w-full py-3 px-4 rounded-xl font-display font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all ${
                        musicIsPlaying
                          ? 'bg-rose-600 text-white hover:bg-rose-700'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200'
                      }`}
                    >
                      {musicIsPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
                      {musicIsPlaying ? "Pausar Simulación Sonora" : "Escuchar y Visualizar Derivada"}
                    </button>
                  )}
                </div>

                {/* Instant math readings */}
                <div className="bg-slate-900 text-white p-4 rounded-xl font-mono text-[11px] space-y-2 mt-4">
                  <div className="text-slate-400 border-b border-slate-800 pb-1.5 text-[10px] uppercase font-bold tracking-wider">
                    Panel de Telemetría Acústica
                  </div>
                  {musicScenario !== 'theremin' ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Tiempo de Playhead:</span>
                        <span className="text-emerald-400 font-bold">{musicPlaybackTime.toFixed(3)} s</span>
                      </div>
                      {musicScenario === 'beethoven' ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Tono Fundamental f(t):</span>
                            <span className="text-indigo-300 font-bold">{getBeethovenMathValues(musicPlaybackTime).p.toFixed(2)} Hz</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Derivada df/dt (Tono):</span>
                            <span className={`${Math.abs(getBeethovenMathValues(musicPlaybackTime).dp) > 50 ? 'text-amber-450 font-bold animate-pulse' : 'text-slate-400'}`}>
                              {getBeethovenMathValues(musicPlaybackTime).dp.toFixed(2)} Hz/s
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Volumen Relativo (v):</span>
                            <span className="text-teal-350">{getBeethovenMathValues(musicPlaybackTime).v.toFixed(3)} V</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Volumen f(t):</span>
                            <span className="text-teal-350 font-bold">{(0.5 + 0.45 * Math.sin(2 * Math.PI * 0.5 * musicPlaybackTime)).toFixed(3)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Derivada df/dt [Modulación]:</span>
                            <span className="text-amber-400 font-bold">{(0.45 * Math.PI * Math.cos(Math.PI * musicPlaybackTime)).toFixed(3)} /s</span>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Frequency live [Osc1]:</span>
                        <span className="text-emerald-400 font-bold">{musicThereminFreq.toFixed(1)} Hz</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Instant slope dy/dt:</span>
                        <span className="text-amber-400 font-bold">
                          {musicThereminPoints.length > 0 ? musicThereminPoints[musicThereminPoints.length - 1].df.toFixed(1) : "0.0"} Hz/s
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Right Canvas Column */}
              <div className="lg:col-span-7 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative overflow-hidden flex flex-col justify-between">
                {musicScenario !== 'theremin' ? (
                  <div className="space-y-6">
                    {/* SVG 1: Primary Function */}
                    <div>
                      <h4 className="text-[12px] font-mono text-slate-650 font-bold mb-2 uppercase tracking-wide flex justify-between">
                        <span>{topLabel}</span>
                        <span className="font-mono text-indigo-700">f(t)</span>
                      </h4>
                      <div className="relative w-full border border-slate-150 rounded-xl bg-slate-50/50 p-2 overflow-hidden">
                        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto">
                          {/* Grid Lines */}
                          <line x1={35} y1={svgH - 20} x2={svgW - 25} y2={svgH - 20} className="stroke-slate-300" />
                          <line x1={35} y1={20} x2={35} y2={svgH - 20} className="stroke-slate-300" />
                          
                          {/* Y-axis Ticks */}
                          <text x={30} y={135} className="text-[9px] fill-slate-400 font-mono text-right" textAnchor="end">
                            {topYRange[0]}
                          </text>
                          <text x={30} y={25} className="text-[9px] fill-slate-400 font-mono text-right" textAnchor="end">
                            {topYRange[1]}
                          </text>

                          {/* Function Curve */}
                          <path
                            d={topPath}
                            fill="none"
                            className="stroke-indigo-600 stroke-[2.5]"
                          />

                          {/* Sweeping Playhead */}
                          <line
                            x1={playheadX}
                            y1={10}
                            x2={playheadX}
                            y2={svgH - 10}
                            className="stroke-rose-500 stroke-[1.5] stroke-dasharray-[3,3]"
                          />
                          <circle cx={playheadX} cy={
                            musicScenario === 'beethoven'
                              ? mapRange(getBeethovenMathValues(musicPlaybackTime).p, 100, 450, svgH - 20, 15)
                              : mapRange(0.5 + 0.45 * Math.sin(2 * Math.PI * 0.5 * musicPlaybackTime), 0, 1, svgH - 20, 15)
                          } r={5} className="fill-rose-500" />
                        </svg>
                      </div>
                    </div>

                    {/* SVG 2: Derivative */}
                    <div>
                      <h4 className="text-[12px] font-mono text-slate-650 font-bold mb-2 uppercase tracking-wide flex justify-between">
                        <span>{bottomLabel}</span>
                        <span className="font-mono text-amber-700">df/dt</span>
                      </h4>
                      <div className="relative w-full border border-slate-150 rounded-xl bg-slate-50/50 p-2 overflow-hidden">
                        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto">
                          {/* Grid Lines */}
                          <line x1={35} y1={svgH / 2} x2={svgW - 25} y2={svgH / 2} className="stroke-slate-300 stroke-dasharray-[2,2]" />
                          <line x1={35} y1={svgH - 15} x2={svgW - 25} y2={svgH - 15} className="stroke-slate-300" />
                          <line x1={35} y1={15} x2={35} y2={svgH - 15} className="stroke-slate-300" />

                          {/* Y-axis ticks */}
                          <text x={30} y={svgH / 2 + 3} className="text-[9px] fill-slate-400 font-mono text-right" textAnchor="end">
                            0
                          </text>

                          {/* Derivative Curve */}
                          <path
                            d={bottomPath}
                            fill="none"
                            className="stroke-amber-600 stroke-[2.5]"
                          />

                          {/* Sweeping Playhead */}
                          <line
                            x1={playheadX}
                            y1={10}
                            x2={playheadX}
                            y2={svgH - 10}
                            className="stroke-rose-500 stroke-[1.5] stroke-dasharray-[3,3]"
                          />
                          <circle cx={playheadX} cy={
                            musicScenario === 'beethoven'
                              ? mapRange(getBeethovenMathValues(musicPlaybackTime).dp, -3000, 3000, svgH - 15, 15)
                              : mapRange(0.45 * Math.PI * Math.cos(Math.PI * musicPlaybackTime), -1.5, 1.5, svgH - 15, 15)
                          } r={5} className="fill-rose-500" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col h-full justify-between space-y-4">
                    <div>
                      <h4 className="font-display font-bold text-slate-800 text-sm">
                        Espacio de Trazado de Melodía Humana (Theremin de Frecuencia)
                      </h4>
                      <p className="text-xs text-slate-500 font-sans leading-normal mt-1 mb-3">
                        Desplace su cursor horizontal y verticalmente por el panel para tocar el Theremin. El eje vertical altera la frecuencia fundamental f(t) [Tono], mientras que el movimiento horizontal representa el transcurso del tiempo t. Escuche el oscilador secundario (Derivada) sonar más agudo y fuerte ante aceleraciones bruscas en la curva.
                      </p>
                    </div>

                    <div
                      onMouseMove={handleThereminMouseMove}
                      onMouseLeave={handleThereminMouseLeave}
                      onTouchMove={(e) => {
                        if (e.touches.length > 0) {
                          const touch = e.touches[0];
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = touch.clientX - rect.left;
                          const y = touch.clientY - rect.top;
                          const fakeEvent = {
                            clientX: touch.clientX,
                            clientY: touch.clientY,
                            currentTarget: e.currentTarget,
                            preventDefault: () => {}
                          } as any;
                          handleThereminMouseMove(fakeEvent);
                        }
                      }}
                      onTouchEnd={handleThereminMouseLeave}
                      className="relative grow h-64 border border-dashed border-indigo-200 bg-gradient-to-b from-indigo-50/10 to-indigo-100/30 rounded-xl cursor-crosshair overflow-hidden touch-none"
                    >
                      {/* Live cursor indicators */}
                      <div
                        className="absolute h-px bg-slate-300 w-full pointer-events-none"
                        style={{ top: musicThereminY }}
                      />
                      <div
                        className="absolute w-px bg-slate-300 h-full pointer-events-none"
                        style={{ left: musicThereminPoints.length > 0 ? (musicThereminPoints[musicThereminPoints.length - 1].t / 4.0) * 100 + "%" : "50%" }}
                      />

                      {musicThereminPoints.length > 0 && (
                        <div
                          className="absolute h-4 w-4 bg-indigo-600 border-2 border-white rounded-full -ml-2 -mt-2 pointer-events-none flex items-center justify-center animate-pulse"
                          style={{
                            left: (musicThereminPoints[musicThereminPoints.length - 1].t / 4.0) * 100 + "%",
                            top: musicThereminY
                          }}
                        />
                      )}

                      {/* Vector representation of mouse path history */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        {musicThereminPoints.length > 1 && (
                          <path
                            d={musicThereminPoints.map((d, i) => {
                              const x = (d.t / 4.0) * 500;
                              const y = 256 * (1 - (d.f - 130) / 670);
                              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                            }).join(' ')}
                            fill="none"
                            className="stroke-indigo-600 stroke-[3] opacity-80"
                          />
                        )}
                      </svg>
                      
                      <div className="absolute top-3 left-3 bg-white/80 border border-slate-200/50 p-1 px-2.5 rounded-full font-mono text-[9px] text-indigo-900 font-bold backdrop-blur">
                        Tono: {musicThereminFreq.toFixed(0)} Hz
                      </div>
                      
                      {musicThereminPoints.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs font-semibold select-none pointer-events-none">
                          👉 DESLIZA EL CURSOR AQUÍ PARA TOCAR 👈
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* === NOTA PEDAGÓGICA VANGUARDISTA === */}
              <div id="music-pedagogical-evaluation-notations" className="col-span-1 lg:col-span-12 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 border border-indigo-900/50 rounded-2xl p-6 md:p-8 text-slate-100 shadow-xl relative overflow-hidden mt-8">
                <div className="absolute top-0 right-0 h-40 w-40 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.4),transparent_70%)]" />
                <div className="flex flex-col md:flex-row items-start gap-4">
                  <div className="p-3 bg-indigo-500/10 border border-indigo-400/20 rounded-xl text-indigo-400 shrink-0">
                    <BookOpen id="pedagogy-book-icon-badge" className="h-6 w-6" />
                  </div>
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] tracking-widest font-mono text-indigo-400 uppercase font-bold">Nota Didáctica de Vanguardia</span>
                      <h4 className="font-display font-extrabold text-lg text-white mt-1">
                        Cálculo y Música: La Transmisión Sensorial del Concepto de Derivada
                      </h4>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      ¿Cómo superar el bloqueo abstracto del cálculo en un salón de clases? El Dr. Erick Radaí Rojas Maldonado propone usar <strong>analogías acústico-musicales</strong> como puente cognitivo cognitivamente potente. Integrar el oído humano, el sentido del ritmo y la visión analítica de gráficas instantáneas permite asimilar la derivada de forma profundamente intuitiva:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2 text-xs font-sans">
                      <div className="bg-slate-850/60 border border-slate-800/80 rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="h-5 w-5 rounded-md bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 flex items-center justify-center font-mono font-bold text-[10px]">1</span>
                          <strong className="text-indigo-300">La Derivada de un Cambio de Tono</strong>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          En el <strong>Motivo de Beethoven (Sinfonía del Destino)</strong>, cada sol o mi bemol constituye una nota sostenida donde la frecuencia permanece constante: la tasa de cambio es idéntica a <span className="font-semibold text-emerald-400">cero</span> (<span className="text-indigo-200 font-mono">df/dt = 0</span>). Sin embargo, en el instante de transición entre notas, surge un cambio abrupto y veloz: la derivada se dispara formando un <strong>pico Dirac-delta</strong> que el oído detecta como salto melódico transitorio.
                        </p>
                      </div>

                      <div className="bg-slate-850/60 border border-slate-800/80 rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="h-5 w-5 rounded-md bg-emerald-500/10 border border-emerald-400/20 text-emerald-450 flex items-center justify-center font-mono font-bold text-[10px]">2</span>
                          <strong className="text-emerald-350">La Derivada de una Oscilación</strong>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Al experimentar con la <strong>Onda de Intensidad (Volumen)</strong>, el alumno escucha el volumen inflarse y deprimirse cíclicamente. Aquí se ratifica militarmente el extremo relativo: cuando el sonido alcanza su punto de máxima potencia o su silencio absoluto, la pendiente se detiene instantáneamente (<span className="text-emerald-400 font-mono">dv/dt = 0</span>). El estudiante conecta el silencio del oscilador secundario con el teorema fundamental del punto crítico.
                        </p>
                      </div>

                      <div className="bg-slate-850/60 border border-slate-800/80 rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="h-5 w-5 rounded-md bg-rose-500/10 border border-rose-400/20 text-rose-450 flex items-center justify-center font-mono font-bold text-[10px]">3</span>
                          <strong className="text-rose-350">Hapticidad Kinestésica</strong>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          La interacción con el <strong>Theremin Táctil</strong> estimula la propiocepción física. Al deslizar el puntero despacio, el oscilador derivativo genera un tono sutil y apagado. Al acelerar bruscamente la mano, la pendiente se recrudece matemáticamente y el segundo motor audiorevela un chillido alarmante, asociando la aceleración física del alumno con el vector incremental analítico.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 p-4 rounded-xl border border-indigo-900/40 bg-indigo-950/40 text-xs">
                      <h5 className="font-bold text-indigo-300 flex items-center gap-1.5 mb-1.5">
                        <Brain className="h-4 w-4 text-indigo-400" /> Hoja de Ruta del Explorador:
                      </h5>
                      <ul className="list-disc pl-5 space-y-2 text-slate-350 font-sans leading-relaxed text-[11px]">
                        <li>
                          <strong>Sintonía de Picos:</strong> Activa el <strong>Motivo de Beethoven No. 5</strong>, activa la "Voz de la Derivada" y dale play. Note cómo, durante la larga nota de llegada <em>(Fermata en Mi bemol)</em>, la música principal suena de manera pura, mientras la voz de la derivada (segundo tono agudo) decae rápidamente a cero. En el instante preciso de transición de Sol a Mi♭, se oye un "chirp" agudo. Esto demuestra cómo la derivada física detecta discontinuidades locales y variaciones del espectro.
                        </li>
                        <li>
                          <strong>Auditando Extremos:</strong> Selecciona la <strong>Onda de Intensidad</strong>. Cierra los ojos y atiende al tono de zumbido secundario de la derivada. ¿Cuándo se apaga? Notarás que el zumbido se desvanece por completo exactamente en los momentos de mayor volumen y de silencio total. Esto evidencia físicamente que el cambio se suspende instantáneamente en los extremos locales (<span className="text-emerald-450 font-bold font-mono">df'(t) = 0</span>).
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      </div>
    </section>
  );
}
