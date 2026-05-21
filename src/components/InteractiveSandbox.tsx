import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Play, RotateCcw, LineChart, HelpCircle, Activity, ArrowRight, BookOpen, Layers, Sliders } from 'lucide-react';

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

export default function InteractiveSandbox() {
  const [activeTab, setActiveTab] = useState<'derivative' | 'ode' | 'incremental' | 'differential'>('derivative');

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
          <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200 shadow-sm flex-wrap justify-center gap-1">
            <button
              onClick={() => setActiveTab('derivative')}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold font-display transition-all duration-300 pointer-events-auto cursor-pointer ${
                activeTab === 'derivative'
                  ? 'bg-indigo-900 text-white shadow-md'
                  : 'text-slate-600 hover:text-indigo-900'
              }`}
            >
              1. Diferenciación Numérica (h → 0)
            </button>
            <button
              onClick={() => setActiveTab('incremental')}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold font-display transition-all duration-300 pointer-events-auto cursor-pointer ${
                activeTab === 'incremental'
                  ? 'bg-indigo-900 text-white shadow-md'
                  : 'text-slate-600 hover:text-indigo-900'
              }`}
            >
              2. Derivadas por Incrementos
            </button>
            <button
              onClick={() => setActiveTab('differential')}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold font-display transition-all duration-300 pointer-events-auto cursor-pointer ${
                activeTab === 'differential'
                  ? 'bg-indigo-900 text-white shadow-md'
                  : 'text-slate-600 hover:text-indigo-900'
              }`}
            >
              3. Concepto de Diferencial (dy vs Δy)
            </button>
            <button
              onClick={() => setActiveTab('ode')}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold font-display transition-all duration-300 pointer-events-auto cursor-pointer ${
                activeTab === 'ode'
                  ? 'bg-indigo-900 text-white shadow-md'
                  : 'text-slate-600 hover:text-indigo-900'
              }`}
            >
              4. Simulador de EDOs (Euler, Heun, RK4)
            </button>
          </div>
        </div>

        {/* ==================================== TAB 1: DERIVATIVE SIMULATOR ==================================== */}
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

      </div>
    </section>
  );
}
