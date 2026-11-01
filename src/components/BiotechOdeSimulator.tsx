import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, RotateCcw, Copy, Check, Terminal, Cpu, Download, 
  Sparkles, BookOpen, Calculator, Beaker, HelpCircle, ArrowRight, 
  BarChart2, ShieldCheck, RefreshCw, Send, ChevronRight, Activity,
  Sliders, Info, Zap, AlertCircle
} from 'lucide-react';

// ==================== INTERFACES & PRESETS ====================

interface BiotechParams {
  Vin: number;     // Basal transport capacity (mM/h)
  I: number;       // Insulin concentration (relative or nM)
  KI: number;      // Affinity constant for insulin
  SI: number;      // Insulin sensitivity index (1.0 = normal, 0.15 = severe resistance)
  k1: number;      // Mitochondrial glucose consumption rate
  k0: number;      // Basal non-mitochondrial consumption
  alpha: number;   // Mitochondrial biogenesis rate
  gamma: number;   // Mitochondrial decay / mitophagy rate
  kL: number;      // Milk synthesis rate coefficient
  delta: number;   // Milk clearance / secretion rate
}

const DEFAULT_PARAMS: BiotechParams = {
  Vin: 0.8,
  I: 1.0,
  KI: 1.0,
  SI: 1.0,
  k1: 0.35,
  k0: 0.15,
  alpha: 0.40,
  gamma: 0.30,
  kL: 0.50,
  delta: 0.25,
};

interface Preset {
  id: string;
  name: string;
  badge: string;
  description: string;
  params: Partial<BiotechParams>;
}

const PRESETS: Preset[] = [
  {
    id: 'normal',
    name: 'Fisiología Control (Saludable)',
    badge: 'Normosensible',
    description: 'Sensibilidad óptima a la insulina (S_I = 1.0). Transporte eficiente de glucosa y capacidad mitocondrial robusta.',
    params: { SI: 1.0, I: 1.0, alpha: 0.40, gamma: 0.30 }
  },
  {
    id: 'mild_ir',
    name: 'Resistencia a la Insulina Leve',
    badge: 'S_I = 0.50',
    description: 'Disminución moderada de la activación de GLUT dependiente de insulina en el epitelio mamario.',
    params: { SI: 0.5, I: 1.2, alpha: 0.38, gamma: 0.30 }
  },
  {
    id: 'severe_ir',
    name: 'Resistencia Severa (Meng et al.)',
    badge: 'S_I = 0.15',
    description: 'Caída drástica en la captación de glucosa celular y síntesis láctea (lactogénesis II comprometida).',
    params: { SI: 0.15, I: 1.5, alpha: 0.30, gamma: 0.35 }
  },
  {
    id: 'hyperinsulinemia',
    name: 'Hiperinsulinemia Compensatoria',
    badge: 'I = 3.0 / S_I = 0.35',
    description: 'Elevada secreción pancreática compensatoria intentando superar el defecto del receptor mamario.',
    params: { SI: 0.35, I: 3.0, alpha: 0.35, gamma: 0.32 }
  },
  {
    id: 'mitochondrial_dysfunction',
    name: 'Disfunción Mitocondrial Primaria',
    badge: 'α baja / γ alta',
    description: 'Mitofagia acelerada y menor biogénesis. Falla bioenergética mitocondrial independiente del transportador.',
    params: { SI: 0.9, I: 1.0, alpha: 0.18, gamma: 0.48 }
  }
];

interface SimulationPoint {
  t: number;
  G: number;
  M: number;
  L: number;
}

// ==================== NUMERICAL SOLVER (RK4) ====================

function solveRK4(
  params: BiotechParams, 
  initialState: { G: number; M: number; L: number }, 
  tMax: number = 48, 
  h: number = 0.2
): SimulationPoint[] {
  const points: SimulationPoint[] = [];
  let t = 0;
  let { G, M, L } = initialState;

  const Jin = params.Vin * (1 + (params.SI * params.I) / (params.KI + params.I));

  const f = (_t: number, y: [number, number, number]): [number, number, number] => {
    const [g, m, l] = y;
    const dG = Jin - params.k1 * g * m - params.k0 * g;
    const dM = params.alpha * g - params.gamma * m;
    const dL = params.kL * g * m - params.delta * l;
    return [dG, dM, dL];
  };

  points.push({ t: 0, G, M, L });

  const steps = Math.ceil(tMax / h);
  for (let i = 0; i < steps; i++) {
    const k1 = f(t, [G, M, L]);
    const k2 = f(t + h / 2, [
      G + (h / 2) * k1[0],
      M + (h / 2) * k1[1],
      L + (h / 2) * k1[2]
    ]);
    const k3 = f(t + h / 2, [
      G + (h / 2) * k2[0],
      M + (h / 2) * k2[1],
      L + (h / 2) * k2[2]
    ]);
    const k4 = f(t + h, [
      G + h * k3[0],
      M + h * k3[1],
      L + h * k3[2]
    ]);

    G += (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    M += (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    L += (h / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
    t += h;

    // Numerical safeguard against negative concentration values
    G = Math.max(0, G);
    M = Math.max(0, M);
    L = Math.max(0, L);

    points.push({ t, G, M, L });
  }

  return points;
}

// ==================== ANALYTICAL EQUILIBRIUM & JACOBIAN ====================

function calculateEquilibrium(p: BiotechParams) {
  const Jin = p.Vin * (1 + (p.SI * p.I) / (p.KI + p.I));
  
  // Quadratic equation for G_eq:
  // a * G^2 + b * G + c = 0
  // where a = (k1 * alpha) / gamma, b = k0, c = -Jin
  const a = (p.k1 * p.alpha) / p.gamma;
  const b = p.k0;
  const c = -Jin;

  const discriminant = b * b - 4 * a * c;
  const Geq = (-b + Math.sqrt(discriminant)) / (2 * a);
  const Meq = (p.alpha / p.gamma) * Geq;
  const Leq = (p.kL / p.delta) * Geq * Meq;

  return { Jin, a, b, c, discriminant, Geq, Meq, Leq };
}

function calculateJacobian(p: BiotechParams, Geq: number, Meq: number) {
  // Jacobian elements:
  // J11 = -k1*M - k0,   J12 = -k1*G,   J13 = 0
  // J21 = alpha,        J22 = -gamma,  J23 = 0
  // J31 = kL*M,         J32 = kL*G,    J33 = -delta
  const j11 = -p.k1 * Meq - p.k0;
  const j12 = -p.k1 * Geq;
  const j13 = 0;

  const j21 = p.alpha;
  const j22 = -p.gamma;
  const j23 = 0;

  const j31 = p.kL * Meq;
  const j32 = p.kL * Geq;
  const j33 = -p.delta;

  // Submatrix 2x2 for G and M:
  const trace = j11 + j22;
  const det = j11 * j22 - j12 * j21;
  const disc = trace * trace - 4 * det;

  let lambda1: { real: number; imag: number };
  let lambda2: { real: number; imag: number };

  if (disc >= 0) {
    lambda1 = { real: (trace + Math.sqrt(disc)) / 2, imag: 0 };
    lambda2 = { real: (trace - Math.sqrt(disc)) / 2, imag: 0 };
  } else {
    lambda1 = { real: trace / 2, imag: Math.sqrt(-disc) / 2 };
    lambda2 = { real: trace / 2, imag: -Math.sqrt(-disc) / 2 };
  }

  const lambda3 = { real: -p.delta, imag: 0 };

  const isStable = lambda1.real < 0 && lambda2.real < 0 && lambda3.real < 0;

  return {
    matrix: [
      [j11, j12, j13],
      [j21, j22, j23],
      [j31, j32, j33]
    ],
    trace,
    det,
    disc,
    lambda1,
    lambda2,
    lambda3,
    isStable
  };
}

// ==================== PYTHON SCRIPT GENERATOR ====================

function generatePythonCode(p: BiotechParams): string {
  return `# =====================================================================
# SIMULACIÓN DE DINÁMICA DE LACTOGÉNESIS (MENG ET AL., JCI)
# Modelo de 3 EDOs no lineales con Resistencia a la Insulina y Mitocondria
# Generado por el Asistente Didáctico de Modelado Matemático en Biotecnología
# =====================================================================

import numpy as np
import matplotlib.pyplot as plt
from scipy.integrate import solve_ivp

# --- 1. Parámetros Cinéticos y Fisiológicos ---
Vin = ${p.Vin}      # Capacidad basal de transporte (mM/h)
I = ${p.I}        # Concentración de insulina extracelular
KI = ${p.KI}       # Constante de saturación / afinidad
k1 = ${p.k1}       # Tasa de consumo mitocondrial de glucosa
k0 = ${p.k0}       # Pérdida basal no mitocondrial
alpha = ${p.alpha}    # Tasa de biogénesis mitocondrial
gamma = ${p.gamma}    # Tasa de recambio mitocondrial (mitofagia)
kL = ${p.kL}       # Eficiencia de síntesis de leche
delta = ${p.delta}    # Tasa de secreción / eliminación de leche

# Escenarios de Sensibilidad a la Insulina (S_I)
scenarios = {
    "Control Normosensible (S_I = 1.00)": 1.00,
    "Resistencia Leve (S_I = 0.50)": 0.50,
    "Resistencia Severa (S_I = 0.15)": 0.15,
    "Configuración Activa (S_I = ${p.SI})": ${p.SI}
}

# --- 2. Definición del Sistema de EDOs ---
def lactogenesis_ode(t, y, SI):
    G, M, L = y
    
    # Flujo de entrada mediado por GLUT dependiente de insulina
    Jin = Vin * (1.0 + (SI * I) / (KI + I))
    
    # Ecuaciones diferenciales ordinarias de Meng et al.
    dG_dt = Jin - k1 * G * M - k0 * G
    dM_dt = alpha * G - gamma * M
    dL_dt = kL * G * M - delta * L
    
    return [dG_dt, dM_dt, dL_dt]

# --- 3. Condiciones Iniciales y Malla Temporal ---
t_span = (0, 48)  # 48 horas de seguimiento tras el parto
t_eval = np.linspace(0, 48, 500)
y0 = [0.5, 0.8, 0.2]  # [G0, M0, L0] al inicio de la fase secretora

# --- 4. Integración Numérica (Runge-Kutta orden 4/5 RK45) ---
plt.figure(figsize=(14, 8))

for label, SI_val in scenarios.items():
    sol = solve_ivp(lactogenesis_ode, t_span, y0, t_eval=t_eval, args=(SI_val,), method='RK45')
    plt.plot(sol.t, sol.y[2], lw=2.2, label=f"{label} -> L_final = {sol.y[2][-1]:.2f}")

plt.title("Dinámica de Producción de Leche L(t) bajo Resistencia a la Insulina", fontsize=14, fontweight='bold')
plt.xlabel("Tiempo postparto t (horas)", fontsize=12)
plt.ylabel("Producción de Leche L(t) [Unidades Arbitrarias]", fontsize=12)
plt.grid(True, linestyle='--', alpha=0.6)
plt.legend(frameon=True, facecolor='white', loc='lower right')
plt.tight_layout()
plt.show()

# --- 5. Cálculo Analítico del Estado Estacionario ---
def analytical_steady_state(SI_val):
    Jin = Vin * (1.0 + (SI_val * I) / (KI + I))
    a = (k1 * alpha) / gamma
    b = k0
    c = -Jin
    G_eq = (-b + np.sqrt(b**2 - 4 * a * c)) / (2 * a)
    M_eq = (alpha / gamma) * G_eq
    L_eq = (kL / delta) * G_eq * M_eq
    return G_eq, M_eq, L_eq

print("=== PUNTOS DE EQUILIBRIO ANALÍTICOS ===")
for label, SI_val in scenarios.items():
    G_eq, M_eq, L_eq = analytical_steady_state(SI_val)
    print(f"{label}: G_eq = {G_eq:.4f} mM, M_eq = {M_eq:.4f}, L_eq = {L_eq:.4f}")
`;
}

// ==================== EXERCISE GENERATOR ====================

interface ExamExercise {
  id: string;
  title: string;
  context: string;
  question: string;
  steps: { title: string; math: string; explanation: string }[];
  conclusion: string;
}

const EXAM_EXERCISES: ExamExercise[] = [
  {
    id: 'ex1',
    title: 'Ejercicio Tipo Examen 1: Impacto de Resistencia a la Insulina en la Tasa Límite de Lactosa',
    context: 'En una paciente con diabetes gestacional se registra un índice de sensibilidad S_I = 0.20, mientras que en un control sano S_I = 1.00. Suponga V_in = 0.8 mM/h, I = 1.0, K_I = 1.0, k_1 = 0.35, k_0 = 0.15, α = 0.40, γ = 0.30, k_L = 0.50 y δ = 0.25.',
    question: 'Determine analíticamente la reducción porcentual en la producción de leche en estado estacionario (L_eq) y explique la causa bioquímica limitante (¿substrato o energía?).',
    steps: [
      {
        title: 'Paso 1: Cálculo del flujo de entrada de glucosa J_in para ambos casos',
        math: 'J_{in}^{control} = 0.8 \\left(1 + \\frac{1.0 \\cdot 1.0}{1.0 + 1.0}\\right) = 0.8(1.5) = 1.200 \\text{ mM/h}\\\\ J_{in}^{resistencia} = 0.8 \\left(1 + \\frac{0.20 \\cdot 1.0}{1.0 + 1.0}\\right) = 0.8(1.1) = 0.880 \\text{ mM/h}',
        explanation: 'La captación transmembrana vía GLUT dependiente de insulina se contrae en un 26.7% debido a la deficiente señalización posreceptor.'
      },
      {
        title: 'Paso 2: Deducción de la ecuación cuadrática de equilibrio de Glucosa',
        math: '\\frac{dM}{dt} = 0 \\implies M_{eq} = \\frac{\\alpha}{\\gamma} G_{eq} = \\frac{0.40}{0.30} G_{eq} = 1.333 G_{eq}\\\\ \\frac{dG}{dt} = 0 \\implies J_{in} - k_1 G_{eq}(1.333 G_{eq}) - k_0 G_{eq} = 0 \\implies 0.4667 G_{eq}^2 + 0.15 G_{eq} - J_{in} = 0',
        explanation: 'Se sustituye M_eq en la ecuación de conservación de glucosa. El término no lineal k_1·G·M refleja el acoplamiento directo entre masa mitocondrial y fosforilación oxidativa.'
      },
      {
        title: 'Paso 3: Raíz físicamente positiva de G_eq y cálculo de L_eq',
        math: 'G_{eq}^{ctrl} = \\frac{-0.15 + \\sqrt{0.15^2 + 4(0.4667)(1.20)}}{2(0.4667)} \\approx 1.451 \\text{ mM} \\implies L_{eq}^{ctrl} = \\frac{0.50}{0.25}(1.451)(1.935) \\approx 5.615\\\\ G_{eq}^{res} = \\frac{-0.15 + \\sqrt{0.15^2 + 4(0.4667)(0.88)}}{2(0.4667)} \\approx 1.222 \\text{ mM} \\implies L_{eq}^{res} = \\frac{0.50}{0.25}(1.222)(1.629) \\approx 3.981',
        explanation: 'Nótese que la producción láctea depende cuadráticamente de la glucosa intramamaria: L_eq ∝ G_eq².'
      },
      {
        title: 'Paso 4: Cuantificación de la pérdida de rendimiento',
        math: '\\text{Reducción} = \\left(1 - \\frac{3.981}{5.615}\\right) \\times 100\\% \\approx 29.1\\%',
        explanation: 'Una baja en J_in del 26.7% se amplifica a una caída del 29.1% en la secreción láctea debido a la retroalimentación positiva mitocondrial.'
      }
    ],
    conclusion: 'Conclusión Analítica y Biotecnológica: La falla en la lactogénesis no es puramente osmótica por falta de lactosa extracelular, sino un colapso sinérgico: al ingresar menos glucosa, decae la biogénesis mitocondrial (M_eq cae de 1.935 a 1.629), provocando una doble penalización metabólica sobre el complejo de la lactosa sintetasa dependiente de ATP.'
  },
  {
    id: 'ex2',
    title: 'Ejercicio Tipo Examen 2: Estabilidad Asintótica Local y Autovalores del Sistema',
    context: 'Un bioprocesador mamario opera en el punto de equilibrio. Para garantizar la seguridad del bioproceso, se debe demostrar rigurosamente que el sistema es asintóticamente estable frente a perturbaciones estocásticas.',
    question: 'Construya la matriz Jacobiana evaluada en el estado estacionario y demuestre analíticamente por el criterio de Routh-Hurwitz que todos los autovalores poseen parte real estrictamente negativa.',
    steps: [
      {
        title: 'Paso 1: Estructura algebraica de la matriz Jacobiana',
        math: 'J(G,M,L) = \\begin{pmatrix} -k_1 M_{eq} - k_0 & -k_1 G_{eq} & 0 \\\\ \\alpha & -\\gamma & 0 \\\\ k_L M_{eq} & k_L G_{eq} & -\\delta \\end{pmatrix}',
        explanation: 'Observe que la tercera columna tiene ceros en las dos primeras filas. Esto desacopla la variable L del subsistema autónomo bidimensional (G, M).'
      },
      {
        title: 'Paso 2: Autovalor desacoplado inmediato',
        math: '\\det(J - \\lambda I) = (-\\delta - \\lambda) \\det\\begin{pmatrix} -k_1 M_{eq} - k_0 - \\lambda & -k_1 G_{eq} \\\\ \\alpha & -\\gamma - \\lambda \\end{pmatrix} = 0 \\implies \\lambda_3 = -\\delta < 0',
        explanation: 'Dado que la constante de aclaramiento δ > 0, el tercer autovalor siempre es real y negativo (-δ = -0.25 h⁻¹).'
      },
      {
        title: 'Paso 3: Análisis de traza y determinante del bloque 2x2',
        math: '\\text{Tr}(J_{sub}) = - (k_1 M_{eq} + k_0) - \\gamma < 0\\\\ \\det(J_{sub}) = (k_1 M_{eq} + k_0)\\gamma - (-k_1 G_{eq})(\\alpha) = \\gamma(k_1 M_{eq} + k_0) + \\alpha k_1 G_{eq} > 0',
        explanation: 'Dado que todos los parámetros biológicos (k1, k0, α, γ, G_eq, M_eq) son estrictamente positivos, la traza es obligatoriamente negativa y el determinante es estrictamente positivo.'
      }
    ],
    conclusion: 'Conclusión Analítica y de Estabilidad: Al ser Tr < 0 y Det > 0, el polinomio característico cuadrático satisface idénticamente el criterio de Routh-Hurwitz. Por ende, los tres autovalores poseen Re(λ_i) < 0. El punto de equilibrio es un sumidero localmente asintóticamente estable (nodo o foco estable), garantizando que cualquier fluctuación transitoria en el aporte de nutrientes se disipa sin oscilaciones caóticas.'
  }
];

// ==================== MAIN COMPONENT ====================

export default function BiotechOdeSimulator() {
  const [params, setParams] = useState<BiotechParams>(DEFAULT_PARAMS);
  const [selectedPreset, setSelectedPreset] = useState<string>('normal');
  const [tMax, setTMax] = useState<number>(48);
  const [hStep, setHStep] = useState<number>(0.2);
  const [initialG, setInitialG] = useState<number>(0.5);
  const [initialM, setInitialM] = useState<number>(0.8);
  const [initialL, setInitialL] = useState<number>(0.2);

  // Active subtab inside this simulator
  const [activeSubTab, setActiveSubTab] = useState<'simulation' | 'steadyState' | 'jacobian' | 'assistant' | 'exercise'>('simulation');

  // Assistant Chat states
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string; code?: string; timestamp: string }>>([
    {
      sender: 'assistant',
      text: '¡Bienvenido al módulo de Modelado Matemático en Biotecnología! Soy tu Profesor Universitario Especialista en Biología de Sistemas y Métodos Numéricos.\n\nAquí analizamos el sistema de 3 EDOs derivado de Meng et al. (JCI) sobre la lactogénesis humana bajo resistencia a la insulina y disfunción mitocondrial.\n\nPuedes ejecutar comandos rápidos con un clic o consultar libremente.',
      timestamp: '10:30 AM'
    }
  ]);
  const [inputCommand, setInputCommand] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [selectedExercise, setSelectedExercise] = useState<ExamExercise>(EXAM_EXERCISES[0]);
  const [showExerciseSolution, setShowExerciseSolution] = useState<boolean>(false);

  // Hover on SVG timeline
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // --- Run simulations for both Active Params and Reference Control ---
  const activeTrajectory = useMemo(() => {
    return solveRK4(params, { G: initialG, M: initialM, L: initialL }, tMax, hStep);
  }, [params, initialG, initialM, initialL, tMax, hStep]);

  const controlTrajectory = useMemo(() => {
    return solveRK4(DEFAULT_PARAMS, { G: initialG, M: initialM, L: initialL }, tMax, hStep);
  }, [initialG, initialM, initialL, tMax, hStep]);

  // Equilibrium & Jacobian for current params
  const equilibrium = useMemo(() => calculateEquilibrium(params), [params]);
  const controlEquilibrium = useMemo(() => calculateEquilibrium(DEFAULT_PARAMS), []);
  const jacobian = useMemo(() => calculateJacobian(params, equilibrium.Geq, equilibrium.Meq), [params, equilibrium]);

  // Relative milk yield efficiency compared to healthy control
  const relativeEfficiency = useMemo(() => {
    if (controlEquilibrium.Leq === 0) return 100;
    return Math.round((equilibrium.Leq / controlEquilibrium.Leq) * 100);
  }, [equilibrium.Leq, controlEquilibrium.Leq]);

  // Handle Preset selection
  const handleApplyPreset = (preset: Preset) => {
    setSelectedPreset(preset.id);
    setParams({ ...DEFAULT_PARAMS, ...preset.params });
  };

  // Assistant Command Execution
  const executeCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { sender: 'user' as const, text: trimmed, timestamp: time };

    let botResponse = '';
    let generatedCode: string | undefined = undefined;

    const lower = trimmed.toLowerCase();

    if (lower === '/simular') {
      botResponse = `Aquí tienes el script completo en Python con Scipy (\`solve_ivp\`), configurado con los parámetros activos de tu sesión (${params.SI === 1 ? 'Control Normosensible' : `Resistencia a la Insulina S_I = ${params.SI}`}). El algoritmo integra mediante Runge-Kutta de paso variable (RK45) y genera las curvas comparativas de lactogénesis:`;
      generatedCode = generatePythonCode(params);
      setActiveSubTab('assistant');
    } else if (lower === '/equilibrio') {
      botResponse = `### Cálculo Analítico del Punto de Equilibrio (G_eq, M_eq, L_eq)\n\n` +
        `**1. Flujo de transporte de glucosa GLUT:**\n` +
        `$$J_{in}(S_I) = V_{in} \\cdot \\left(1 + \\frac{S_I \\cdot I}{K_I + I}\\right) = ${params.Vin.toFixed(2)} \\cdot \\left(1 + \\frac{${params.SI.toFixed(2)} \\cdot ${params.I.toFixed(2)}}{${params.KI.toFixed(2)} + ${params.I.toFixed(2)}}\\right) = ${equilibrium.Jin.toFixed(4)} \\text{ mM/h}$$\n\n` +
        `**2. Equilibrio mitocondrial:**\n` +
        `$$\\frac{dM}{dt} = 0 \\implies M_{eq} = \\frac{\\alpha}{\\gamma} G_{eq} = \\frac{${params.alpha.toFixed(2)}}{${params.gamma.toFixed(2)}} G_{eq} = ${(params.alpha / params.gamma).toFixed(4)} \\cdot G_{eq}$$\n\n` +
        `**3. Conservación de masa de Glucosa (Ecuación cuadrática):**\n` +
        `$$\\frac{dG}{dt} = 0 \\implies \\left(\\frac{k_1 \\alpha}{\\gamma}\\right) G_{eq}^2 + k_0 G_{eq} - J_{in} = 0$$\n` +
        `$$${equilibrium.a.toFixed(4)} G_{eq}^2 + ${equilibrium.b.toFixed(4)} G_{eq} - ${equilibrium.Jin.toFixed(4)} = 0$$\n\n` +
        `**Valores analíticos en reposo estacionario:**\n` +
        `- **Glucosa mamaria:** $G_{eq} = ${equilibrium.Geq.toFixed(4)} \\text{ mM}$\n` +
        `- **Masa mitocondrial funcional:** $M_{eq} = ${equilibrium.Meq.toFixed(4)}$\n` +
        `- **Rendimiento de leche:** $L_{eq} = \\frac{k_L}{\\delta} G_{eq} M_{eq} = ${equilibrium.Leq.toFixed(4)} \\text{ UA}$\n\n` +
        `*Conclusión:* Frente al control normal (${controlEquilibrium.Leq.toFixed(2)} UA), este estado entrega un rendimiento relativo del **${relativeEfficiency}%**.`;
      setActiveSubTab('steadyState');
    } else if (lower === '/jacobiana') {
      botResponse = `### Matriz Jacobiana y Análisis de Estabilidad Asintótica\n\n` +
        `La matriz Jacobiana $J(G, M, L)$ evaluada en el punto de equilibrio es:\n\n` +
        `$$J = \\begin{pmatrix} -k_1 M_{eq} - k_0 & -k_1 G_{eq} & 0 \\\\ \\alpha & -\\gamma & 0 \\\\ k_L M_{eq} & k_L G_{eq} & -\\delta \\end{pmatrix} = ` +
        `\\begin{pmatrix} ${jacobian.matrix[0][0].toFixed(3)} & ${jacobian.matrix[0][1].toFixed(3)} & 0 \\\\ ` +
        `${jacobian.matrix[1][0].toFixed(3)} & ${jacobian.matrix[1][1].toFixed(3)} & 0 \\\\ ` +
        `${jacobian.matrix[2][0].toFixed(3)} & ${jacobian.matrix[2][1].toFixed(3)} & ${jacobian.matrix[2][2].toFixed(3)} \\end{pmatrix}$$\n\n` +
        `**Autovalores calculados:**\n` +
        `- $\\lambda_1 = ${jacobian.lambda1.real.toFixed(4)} ${jacobian.lambda1.imag !== 0 ? `\\pm ${Math.abs(jacobian.lambda1.imag).toFixed(4)}i` : ''}$\n` +
        `- $\\lambda_2 = ${jacobian.lambda2.real.toFixed(4)} ${jacobian.lambda2.imag !== 0 ? `\\mp ${Math.abs(jacobian.lambda2.imag).toFixed(4)}i` : ''}$\n` +
        `- $\\lambda_3 = -\\delta = ${jacobian.lambda3.real.toFixed(4)}$\n\n` +
        `**Dictamen Matemático:** Todos los autovalores poseen $\\text{Re}(\\lambda_i) < 0$. Por el Teorema de Hartman-Grobman y el Criterio de Routh-Hurwitz, el sistema es **LOCALMENTE ASINTÓTICAMENTE ESTABLE** (Atractor de sumidero).`;
      setActiveSubTab('jacobian');
    } else if (lower === '/ejercicio') {
      botResponse = `He cargado un problema conceptual y cuantitativo tipo examen en la pestaña "Ejercicios Pedagógicos": **"${selectedExercise.title}"**. Puedes consultar el desglose algebraico y la conclusión bioingenieril con el botón "Ver Solución Paso a Paso".`;
      setActiveSubTab('exercise');
      setShowExerciseSolution(false);
    } else {
      // General question answering in professor persona
      botResponse = `Estimado estudiante: analizando tu consulta bajo el prisma de la biología de sistemas y el estudio de Meng et al. (JCI):\n\n` +
        `En este modelo no lineal, la variable clave de control es el índice de sensibilidad $S_I$. Cuando $S_I$ se degrada (resistencia a la insulina), no solamente cae el ingreso de glucosa ($J_{in}$), sino que el acoplamiento no lineal $k_1 \\cdot G \\cdot M$ provoca una desincronización bioenergética. La masa mitocondrial $M(t)$ requiere glucosa como señal trófica y sustrato (término $\\alpha \\cdot G$); si $G(t)$ disminuye, la tasa de recambio mitocondrial $\\gamma \\cdot M$ domina, reduciendo $M$ y por ende derrumbando la síntesis de leche $L(t)$ de forma no lineal.\n\n` +
        `Puedes simular este comportamiento en tiempo real con los controles deslizantes o ejecutar \`/simular\`, \`/equilibrio\`, \`/jacobiana\` o \`/ejercicio\`.`;
    }

    setMessages(prev => [...prev, userMsg, { sender: 'assistant', text: botResponse, code: generatedCode, timestamp: time }]);
    setInputCommand('');
  };

  const handleCopyCode = (codeStr: string) => {
    navigator.clipboard.writeText(codeStr);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadPy = (codeStr: string) => {
    const blob = new Blob([codeStr], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulacion_lactogenesis_SI_${params.SI}.py`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // SVGs plotting scales
  const svgWidth = 600;
  const svgHeight = 260;
  const padding = { top: 20, right: 30, bottom: 35, left: 45 };
  const plotW = svgWidth - padding.left - padding.right;
  const plotH = svgHeight - padding.top - padding.bottom;

  // Max value across both trajectories for SVG scaling
  const maxL = useMemo(() => {
    let m = 6;
    activeTrajectory.forEach(pt => { if (pt.L > m) m = pt.L; });
    controlTrajectory.forEach(pt => { if (pt.L > m) m = pt.L; });
    return Math.ceil(m * 1.15);
  }, [activeTrajectory, controlTrajectory]);

  const maxGM = useMemo(() => {
    let m = 3;
    activeTrajectory.forEach(pt => {
      if (pt.G > m) m = pt.G;
      if (pt.M > m) m = pt.M;
    });
    return Math.ceil(m * 1.2);
  }, [activeTrajectory]);

  // Scalers
  const scaleX = (t: number) => padding.left + (t / tMax) * plotW;
  const scaleYL = (val: number) => padding.top + plotH - (val / maxL) * plotH;
  const scaleYGM = (val: number) => padding.top + plotH - (val / maxGM) * plotH;

  // Paths
  const pathActiveL = useMemo(() => {
    return activeTrajectory.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(pt.t).toFixed(1)} ${scaleYL(pt.L).toFixed(1)}`).join(' ');
  }, [activeTrajectory, tMax, maxL]);

  const pathControlL = useMemo(() => {
    return controlTrajectory.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(pt.t).toFixed(1)} ${scaleYL(pt.L).toFixed(1)}`).join(' ');
  }, [controlTrajectory, tMax, maxL]);

  const pathActiveG = useMemo(() => {
    return activeTrajectory.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(pt.t).toFixed(1)} ${scaleYGM(pt.G).toFixed(1)}`).join(' ');
  }, [activeTrajectory, tMax, maxGM]);

  const pathActiveM = useMemo(() => {
    return activeTrajectory.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(pt.t).toFixed(1)} ${scaleYGM(pt.M).toFixed(1)}`).join(' ');
  }, [activeTrajectory, tMax, maxGM]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* ================= HEADER HERO ================= */}
      <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 border border-indigo-900/40 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-indigo-300 text-xs font-mono font-semibold">
              <Beaker className="h-3.5 w-3.5" /> Biología de Sistemas & Métodos Numéricos
            </div>
            <h3 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
              Simulador EDOs de Lactogénesis Humana
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed font-sans">
              Modelo matemático de 3 Ecuaciones Diferenciales Ordinarias derivado del estudio fundamental de <strong>Meng et al. (Journal of Clinical Investigation)</strong>. Analiza la dinámica no lineal de la glucosa mamaria, la capacidad mitocondrial y la síntesis de leche bajo resistencia a la insulina y disfunción bioenergética.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-3 px-4 text-center shrink-0 w-full sm:w-auto">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">Rendimiento Relativo</span>
              <span className={`text-2xl font-black font-mono ${relativeEfficiency >= 90 ? 'text-emerald-400' : relativeEfficiency >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                {relativeEfficiency}%
              </span>
              <span className="text-[10px] text-slate-400 block">vs. Control Saludable</span>
            </div>
          </div>
        </div>

        {/* Mathematical Model Quick Banner */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs text-indigo-200">
          <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-xl">
            <span className="text-slate-400 text-[10px] block">1. Glucosa Mamaria (dG/dt)</span>
            <span className="text-emerald-350 font-bold">J_in(S_I) - k₁·G·M - k₀·G</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-xl">
            <span className="text-slate-400 text-[10px] block">2. Mitocondria Funcional (dM/dt)</span>
            <span className="text-indigo-300 font-bold">α·G - γ·M</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-xl">
            <span className="text-slate-400 text-[10px] block">3. Producción de Leche (dL/dt)</span>
            <span className="text-amber-350 font-bold">k_L·G·M - δ·L</span>
          </div>
        </div>
      </div>

      {/* ================= CLINICAL & BIOTECH PRESETS ================= */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5 text-indigo-600" /> Escenarios Clínicos y Biotecnológicos Preconfigurados
          </span>
          <span className="text-[11px] text-slate-400 font-sans">Seleccione para contrastar</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleApplyPreset(preset)}
              className={`p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                selectedPreset === preset.id
                  ? 'bg-indigo-900 text-white border-indigo-700 shadow-md ring-2 ring-indigo-500/20'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${
                    selectedPreset === preset.id ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-indigo-800'
                  }`}>
                    {preset.badge}
                  </span>
                </div>
                <h4 className="font-display font-bold text-xs leading-tight mb-1">{preset.name}</h4>
                <p className={`text-[10.5px] leading-relaxed line-clamp-2 ${selectedPreset === preset.id ? 'text-indigo-200' : 'text-slate-500'}`}>
                  {preset.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ================= NAVIGATION SUBTABS ================= */}
      <div className="flex justify-center">
        <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200 shadow-sm flex-wrap justify-center gap-1 font-sans">
          <button
            onClick={() => setActiveSubTab('simulation')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold font-display transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'simulation'
                ? 'bg-indigo-900 text-white shadow-md'
                : 'text-slate-600 hover:text-indigo-900 hover:bg-slate-200/50'
            }`}
          >
            <Activity className="h-3.5 w-3.5" /> 1. Simulación Dinámica RK4
          </button>
          <button
            onClick={() => setActiveSubTab('steadyState')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold font-display transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'steadyState'
                ? 'bg-indigo-900 text-white shadow-md'
                : 'text-slate-600 hover:text-indigo-900 hover:bg-slate-200/50'
            }`}
          >
            <Calculator className="h-3.5 w-3.5" /> 2. Punto de Equilibrio (/equilibrio)
          </button>
          <button
            onClick={() => setActiveSubTab('jacobian')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold font-display transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'jacobian'
                ? 'bg-indigo-900 text-white shadow-md'
                : 'text-slate-600 hover:text-indigo-900 hover:bg-slate-200/50'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" /> 3. Matriz Jacobiana & Estabilidad (/jacobiana)
          </button>
          <button
            onClick={() => setActiveSubTab('assistant')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold font-display transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'assistant'
                ? 'bg-indigo-900 text-white shadow-md'
                : 'text-slate-600 hover:text-indigo-900 hover:bg-slate-200/50'
            }`}
          >
            <Terminal className="h-3.5 w-3.5" /> 4. Asistente & Código Python (/simular)
          </button>
          <button
            onClick={() => setActiveSubTab('exercise')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold font-display transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'exercise'
                ? 'bg-indigo-900 text-white shadow-md'
                : 'text-slate-600 hover:text-indigo-900 hover:bg-slate-200/50'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" /> 5. Ejercicios Pedagógicos (/ejercicio)
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: DYNAMIC SIMULATION & VISUALIZER */}
      {/* ========================================================================= */}
      {activeSubTab === 'simulation' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: SLIDERS & BIO-ENGINEERING CONTROLS */}
          <div className="lg:col-span-4 bg-white border border-slate-250 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h4 className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
                <Sliders className="h-4 w-4 text-indigo-600" /> Parámetros del Bioproceso
              </h4>
              <button
                onClick={() => setParams(DEFAULT_PARAMS)}
                className="text-[11px] text-slate-500 hover:text-indigo-600 flex items-center gap-1 font-mono transition"
                title="Reiniciar a valores normales"
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
            </div>

            {/* Slider 1: S_I Insulin Sensitivity */}
            <div className="space-y-1.5 p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100">
              <div className="flex justify-between items-center text-xs font-sans">
                <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
                  Sensibilidad a la Insulina (S_I)
                </span>
                <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                  {params.SI.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.05"
                max="2.0"
                step="0.05"
                value={params.SI}
                onChange={(e) => {
                  setParams(prev => ({ ...prev, SI: parseFloat(e.target.value) }));
                  setSelectedPreset('custom');
                }}
                className="w-full h-1.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>0.05 (Resistencia severa)</span>
                <span>1.0 (Normal)</span>
                <span>2.0 (Hipersensible)</span>
              </div>
            </div>

            {/* Other Parameters Accordion / Grid */}
            <div className="space-y-3 text-xs font-sans">
              
              {/* Insulin Concentration I */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-700">
                  <span>Insulina Extracelular (I):</span>
                  <span className="font-mono font-semibold">{params.I.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="4.0"
                  step="0.1"
                  value={params.I}
                  onChange={(e) => setParams(prev => ({ ...prev, I: parseFloat(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              {/* V_in Basal Transport */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-700">
                  <span>Capacidad Basal GLUT (V_in):</span>
                  <span className="font-mono font-semibold">{params.Vin.toFixed(2)} mM/h</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="2.0"
                  step="0.05"
                  value={params.Vin}
                  onChange={(e) => setParams(prev => ({ ...prev, Vin: parseFloat(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              {/* alpha Mitochondrial Biogenesis */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-700">
                  <span>Biogénesis Mitocondrial (α):</span>
                  <span className="font-mono font-semibold">{params.alpha.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={params.alpha}
                  onChange={(e) => setParams(prev => ({ ...prev, alpha: parseFloat(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              {/* gamma Mitophagy / Turnover */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-700">
                  <span>Recambio / Mitofagia (γ):</span>
                  <span className="font-mono font-semibold">{params.gamma.toFixed(2)} h⁻¹</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.8"
                  step="0.05"
                  value={params.gamma}
                  onChange={(e) => setParams(prev => ({ ...prev, gamma: parseFloat(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              {/* k_L Milk Synthesis Coupling */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-700">
                  <span>Acoplamiento Síntesis Leche (k_L):</span>
                  <span className="font-mono font-semibold">{params.kL.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.2"
                  step="0.05"
                  value={params.kL}
                  onChange={(e) => setParams(prev => ({ ...prev, kL: parseFloat(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              {/* delta Milk Clearance */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-700">
                  <span>Tasa de Secreción / Succión (δ):</span>
                  <span className="font-mono font-semibold">{params.delta.toFixed(2)} h⁻¹</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.6"
                  step="0.05"
                  value={params.delta}
                  onChange={(e) => setParams(prev => ({ ...prev, delta: parseFloat(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

            </div>

            {/* Quick numerical properties */}
            <div className="pt-3 border-t border-slate-200 space-y-2 text-[11px] font-mono text-slate-600 bg-slate-50 p-3 rounded-2xl">
              <div className="flex justify-between">
                <span>Flujo de Entrada J_in:</span>
                <strong className="text-slate-900">{equilibrium.Jin.toFixed(3)} mM/h</strong>
              </div>
              <div className="flex justify-between">
                <span>Integrador Numérico:</span>
                <span className="text-indigo-600 font-semibold">Runge-Kutta 4 (h = {hStep}h)</span>
              </div>
            </div>

          </div>

          {/* RIGHT: INTERACTIVE DUAL TIME-SERIES GRAPHS */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* GRAPH 1: MILK PRODUCTION L(t) (ACTIVE vs CONTROL) */}
            <div className="bg-white border border-slate-250 rounded-3xl p-6 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h4 className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-amber-500" />
                    Producción y Secreción de Leche: L(t)
                  </h4>
                  <p className="text-[11px] text-slate-500 font-sans">
                    Comparación dinámica entre el modelo actual (línea continua ámbar) y el control sano normosensible (línea punteada gris).
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-amber-500" />
                    <span className="text-slate-700 font-bold">Activo: {activeTrajectory[activeTrajectory.length - 1].L.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 border-t border-dashed border-slate-400" />
                    <span className="text-slate-500">Control: {controlTrajectory[controlTrajectory.length - 1].L.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* SVG Canvas for L(t) */}
              <div className="relative w-full bg-slate-950 rounded-2xl overflow-hidden p-2">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full h-auto select-none"
                  onMouseLeave={() => setHoverIndex(null)}
                >
                  {/* Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
                    const y = padding.top + plotH * frac;
                    const val = maxL * (1 - frac);
                    return (
                      <g key={`l-grid-${idx}`}>
                        <line x1={padding.left} y1={y} x2={svgWidth - padding.right} y2={y} stroke="#1e293b" strokeDasharray="3 3" />
                        <text x={padding.left - 8} y={y + 3} textAnchor="end" fill="#64748b" fontSize="9" fontFamily="monospace">
                          {val.toFixed(1)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Time Axis Grid */}
                  {[0, 12, 24, 36, 48].map((tVal) => {
                    const x = scaleX(tVal);
                    return (
                      <g key={`l-tgrid-${tVal}`}>
                        <line x1={x} y1={padding.top} x2={x} y2={padding.top + plotH} stroke="#1e293b" strokeDasharray="2 2" />
                        <text x={x} y={svgHeight - 10} textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">
                          {tVal}h
                        </text>
                      </g>
                    );
                  })}

                  {/* Steady State Asymptote Lines */}
                  <line
                    x1={padding.left}
                    y1={scaleYL(equilibrium.Leq)}
                    x2={svgWidth - padding.right}
                    y2={scaleYL(equilibrium.Leq)}
                    stroke="#f59e0b"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    opacity="0.4"
                  />

                  {/* Control Curve (Dashed) */}
                  <path
                    d={pathControlL}
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="2"
                    strokeDasharray="5 5"
                    opacity="0.75"
                  />

                  {/* Active Curve */}
                  <path
                    d={pathActiveL}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />

                  {/* Equilibrium point dot */}
                  <circle
                    cx={scaleX(tMax)}
                    cy={scaleYL(activeTrajectory[activeTrajectory.length - 1].L)}
                    r="4.5"
                    fill="#f59e0b"
                    className="animate-pulse"
                  />
                </svg>
              </div>
            </div>

            {/* GRAPH 2: CELLULAR GLUCOSE G(t) & MITOCHONDRIAL CAPACITY M(t) */}
            <div className="bg-white border border-slate-250 rounded-3xl p-6 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h4 className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-emerald-600" />
                    Dinámica Intracelular: Glucosa G(t) & Mitocondria M(t)
                  </h4>
                  <p className="text-[11px] text-slate-500 font-sans">
                    Nivel de combustible celular (G, línea esmeralda) y maquinaria oxidativa de ATP (M, línea violeta).
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-emerald-400" />
                    <span className="text-emerald-700 font-bold">G(t): {activeTrajectory[activeTrajectory.length - 1].G.toFixed(2)} mM</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-indigo-400" />
                    <span className="text-indigo-700 font-bold">M(t): {activeTrajectory[activeTrajectory.length - 1].M.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* SVG Canvas for G(t) & M(t) */}
              <div className="relative w-full bg-slate-950 rounded-2xl overflow-hidden p-2">
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto select-none">
                  {/* Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
                    const y = padding.top + plotH * frac;
                    const val = maxGM * (1 - frac);
                    return (
                      <g key={`gm-grid-${idx}`}>
                        <line x1={padding.left} y1={y} x2={svgWidth - padding.right} y2={y} stroke="#1e293b" strokeDasharray="3 3" />
                        <text x={padding.left - 8} y={y + 3} textAnchor="end" fill="#64748b" fontSize="9" fontFamily="monospace">
                          {val.toFixed(1)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Time Axis Grid */}
                  {[0, 12, 24, 36, 48].map((tVal) => {
                    const x = scaleX(tVal);
                    return (
                      <g key={`gm-tgrid-${tVal}`}>
                        <line x1={x} y1={padding.top} x2={x} y2={padding.top + plotH} stroke="#1e293b" strokeDasharray="2 2" />
                        <text x={x} y={svgHeight - 10} textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">
                          {tVal}h
                        </text>
                      </g>
                    );
                  })}

                  {/* Curves */}
                  <path d={pathActiveG} fill="none" stroke="#10b981" strokeWidth="2.8" strokeLinecap="round" />
                  <path d={pathActiveM} fill="none" stroke="#818cf8" strokeWidth="2.8" strokeLinecap="round" />

                  <circle cx={scaleX(tMax)} cy={scaleYGM(activeTrajectory[activeTrajectory.length - 1].G)} r="4" fill="#10b981" />
                  <circle cx={scaleX(tMax)} cy={scaleYGM(activeTrajectory[activeTrajectory.length - 1].M)} r="4" fill="#818cf8" />
                </svg>
              </div>
            </div>

            {/* METABOLIC FLOW / BIOLOGICAL CONTEXT CARD */}
            <div className="bg-gradient-to-r from-indigo-50/60 via-slate-50 to-amber-50/60 border border-slate-200 rounded-3xl p-5 space-y-3 font-sans text-xs">
              <h5 className="font-bold text-slate-900 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                <Info className="h-4 w-4 text-indigo-600" /> Interpretación Fisiológica Multidisciplinaria (Meng et al.)
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                  <strong className="text-indigo-900 block font-mono text-[11px]">1. Entrada Transmembrana (GLUT)</strong>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    La captación de glucosa está gobernada por J_in(S_I). En resistencia a la insulina (S_I &lt; 0.5), la translocación de GLUT4 se apaga, limitando el flujo basal V_in independientemente de la glucemia materna.
                  </p>
                </div>
                <div className="p-3 bg-white border border-slate-250 rounded-xl space-y-1">
                  <strong className="text-emerald-900 block font-mono text-[11px]">2. Bioenergética Mitocondrial</strong>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    La glucosa no solo se usa para lactosa; también sustenta la biogénesis mitocondrial (α · G). Sin energía de la cadena de transporte de electrones (M), decae el acoplamiento no lineal k₁ · G · M.
                  </p>
                </div>
                <div className="p-3 bg-white border border-slate-250 rounded-xl space-y-1">
                  <strong className="text-amber-900 block font-mono text-[11px]">3. Rendimiento de Lactogénesis</strong>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    La producción L(t) requiere tanto carbono (G) como ATP (M). Debido a la no linealidad, una caída del 25% en la captación produce un derrumbe cercano al 30-40% en la tasa de síntesis láctea.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: ANALYTICAL EQUILIBRIUM POINT */}
      {/* ========================================================================= */}
      {activeSubTab === 'steadyState' && (
        <div className="bg-white border border-slate-250 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <span className="text-xs font-mono font-bold text-indigo-600 uppercase tracking-widest block mb-1">
              Comando Rápido: /equilibrio
            </span>
            <h3 className="font-display font-extrabold text-xl text-slate-900">
              Cálculo Analítico Paso a Paso del Punto de Equilibrio (G_eq, M_eq, L_eq)
            </h3>
            <p className="text-xs text-slate-500 font-sans mt-1">
              Resolución matemática rigurosa en estado estacionario (dG/dt = 0, dM/dt = 0, dL/dt = 0) con sustitución numérica de los parámetros activos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-4 text-center">
              <span className="text-[10px] font-mono text-indigo-700 uppercase font-bold block">Glucosa Mamaria (G_eq)</span>
              <span className="text-2xl font-black font-mono text-indigo-950 mt-1 block">
                {equilibrium.Geq.toFixed(4)} <span className="text-xs font-normal">mM</span>
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block font-sans">Concentración intracelular en equilibrio</span>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 text-center">
              <span className="text-[10px] font-mono text-emerald-700 uppercase font-bold block">Capacidad Mitocondrial (M_eq)</span>
              <span className="text-2xl font-black font-mono text-emerald-950 mt-1 block">
                {equilibrium.Meq.toFixed(4)}
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block font-sans">Biomasa mitocondrial funcional</span>
            </div>

            <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 text-center">
              <span className="text-[10px] font-mono text-amber-700 uppercase font-bold block">Producción Láctea (L_eq)</span>
              <span className="text-2xl font-black font-mono text-amber-950 mt-1 block">
                {equilibrium.Leq.toFixed(4)} <span className="text-xs font-normal">UA</span>
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block font-sans">Tasa límite de síntesis y secreción</span>
            </div>
          </div>

          {/* Derivation Steps */}
          <div className="space-y-4 pt-2 font-sans text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <strong className="text-indigo-900 font-mono text-xs block">Paso 1: Flujo de entrada insulino-dependiente J_in</strong>
              <div className="p-3 bg-white border rounded-xl font-mono text-slate-800">
                J_in(S_I) = V_in · [1 + (S_I · I) / (K_I + I)] = {params.Vin} · [1 + ({params.SI} · {params.I}) / ({params.KI} + {params.I})] = <strong>{equilibrium.Jin.toFixed(4)} mM/h</strong>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                El transportador GLUT posee una cinética tipo Michaelis-Menten estimulada por el receptor de insulina acoplado al índice de sensibilidad S_I.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <strong className="text-indigo-900 font-mono text-xs block">Paso 2: Despeje del equilibrio mitocondrial</strong>
              <div className="p-3 bg-white border rounded-xl font-mono text-slate-800">
                dM/dt = 0 ⟹ α · G_eq - γ · M_eq = 0 ⟹ M_eq = (α / γ) · G_eq = ({params.alpha} / {params.gamma}) · G_eq = <strong>{(params.alpha / params.gamma).toFixed(4)} · G_eq</strong>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                La densidad de crestas mitocondriales y ATP disponible es proporcional a la abundancia de glucosa como sustrato trófico.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <strong className="text-indigo-900 font-mono text-xs block">Paso 3: Ecuación cuadrática no lineal para G_eq</strong>
              <div className="p-3 bg-white border rounded-xl font-mono text-slate-800 space-y-1">
                <div>dG/dt = 0 ⟹ J_in - k₁ · G_eq · M_eq - k₀ · G_eq = 0</div>
                <div>⟹ J_in - k₁ · G_eq · [(α/γ) · G_eq] - k₀ · G_eq = 0</div>
                <div>⟹ [k₁·α / γ] · G_eq² + k₀ · G_eq - J_in = 0</div>
                <div className="text-indigo-700 font-bold pt-1">
                  [{equilibrium.a.toFixed(4)}] · G_eq² + [{equilibrium.b.toFixed(4)}] · G_eq - [{equilibrium.Jin.toFixed(4)}] = 0
                </div>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl font-mono text-emerald-950">
                Discriminante Δ = b² - 4ac = ({equilibrium.b.toFixed(4)})² - 4({equilibrium.a.toFixed(4)})(-{equilibrium.Jin.toFixed(4)}) = {equilibrium.discriminant.toFixed(4)} &gt; 0<br />
                Raíz positiva física: G_eq = [-b + √Δ] / [2a] = <strong>{equilibrium.Geq.toFixed(4)} mM</strong>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <strong className="text-indigo-900 font-mono text-xs block">Paso 4: Tasa límite de producción láctea L_eq</strong>
              <div className="p-3 bg-white border rounded-xl font-mono text-slate-800">
                dL/dt = 0 ⟹ k_L · G_eq · M_eq - δ · L_eq = 0 ⟹ L_eq = (k_L / δ) · G_eq · M_eq = ({params.kL} / {params.delta}) · ({equilibrium.Geq.toFixed(4)}) · ({equilibrium.Meq.toFixed(4)}) = <strong>{equilibrium.Leq.toFixed(4)} UA</strong>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Nótese la dependencia cuadrática L_eq = [k_L · α / (δ · γ)] · G_eq². Por esta razón matemática intrínseca, pequeños descensos en la sensibilidad a la insulina (S_I) penalizan con severidad cuadrática la lactogénesis en madres con diabetes gestacional o síndrome metabólico.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: JACOBIAN MATRIX & STABILITY */}
      {/* ========================================================================= */}
      {activeSubTab === 'jacobian' && (
        <div className="bg-white border border-slate-250 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <span className="text-xs font-mono font-bold text-indigo-600 uppercase tracking-widest block mb-1">
              Comando Rápido: /jacobiana
            </span>
            <h3 className="font-display font-extrabold text-xl text-slate-900">
              Matriz Jacobiana y Estabilidad Local por Autovalores
            </h3>
            <p className="text-xs text-slate-500 font-sans mt-1">
              Evaluación de las derivadas parciales en el espacio de fase 3D y demostración formal por el criterio de Routh-Hurwitz.
            </p>
          </div>

          {/* Matrix Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="p-5 bg-slate-950 text-white rounded-2xl font-mono space-y-3">
              <span className="text-[11px] text-slate-400 block uppercase font-bold">Matriz Jacobiana Evaluada J(G_eq, M_eq, L_eq):</span>
              <div className="grid grid-cols-3 gap-2 text-center text-xs py-2 bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="text-rose-400 font-bold">{jacobian.matrix[0][0].toFixed(3)}</span>
                <span className="text-rose-400 font-bold">{jacobian.matrix[0][1].toFixed(3)}</span>
                <span className="text-slate-500">0.000</span>

                <span className="text-emerald-400 font-bold">{jacobian.matrix[1][0].toFixed(3)}</span>
                <span className="text-rose-400 font-bold">{jacobian.matrix[1][1].toFixed(3)}</span>
                <span className="text-slate-500">0.000</span>

                <span className="text-amber-400 font-bold">{jacobian.matrix[2][0].toFixed(3)}</span>
                <span className="text-amber-400 font-bold">{jacobian.matrix[2][1].toFixed(3)}</span>
                <span className="text-rose-400 font-bold">{jacobian.matrix[2][2].toFixed(3)}</span>
              </div>
              <div className="text-[10px] text-slate-400 leading-tight">
                La columna 3 desacopla la secreción láctea (λ₃ = -δ = -{params.delta}).
              </div>
            </div>

            <div className="p-5 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3 font-sans">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <h4 className="font-display font-bold text-sm text-emerald-950">
                  Dictamen de Estabilidad: {jacobian.isStable ? 'LOCALMENTE ASINTÓTICAMENTE ESTABLE' : 'INESTABLE'}
                </h4>
              </div>
              <div className="space-y-1.5 font-mono text-xs text-slate-700">
                <div>• Autovalor 1 (λ₁): <strong className="text-emerald-800">{jacobian.lambda1.real.toFixed(4)} {jacobian.lambda1.imag !== 0 ? `± ${Math.abs(jacobian.lambda1.imag).toFixed(4)}i` : ''}</strong></div>
                <div>• Autovalor 2 (λ₂): <strong className="text-emerald-800">{jacobian.lambda2.real.toFixed(4)} {jacobian.lambda2.imag !== 0 ? `∓ ${Math.abs(jacobian.lambda2.imag).toFixed(4)}i` : ''}</strong></div>
                <div>• Autovalor 3 (λ₃): <strong className="text-emerald-800">{jacobian.lambda3.real.toFixed(4)}</strong> (-δ directo)</div>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Al ser todos los autovalores con parte real estrictamente negativa (Re(λ) &lt; 0), el punto de equilibrio es un <strong>nodo/foco atractor estable</strong>.
              </p>
            </div>
          </div>

          {/* Routh-Hurwitz Proof */}
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 font-sans text-xs">
            <h5 className="font-bold text-slate-900 font-mono text-xs uppercase">
              Demostración Analítica General por Criterio de Routh-Hurwitz (Bloque 2x2):
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-white border rounded-xl space-y-1">
                <span className="font-mono font-bold text-indigo-900">1. Traza Negativa (Tr &lt; 0):</span>
                <p className="font-mono text-slate-700">
                  Tr(J_sub) = -(k₁·M_eq + k₀) - γ = {jacobian.trace.toFixed(4)} &lt; 0
                </p>
                <p className="text-[11px] text-slate-500">
                  Dado que k₁, M_eq, k₀ y γ son estrictamente positivos por termodinámica, la traza siempre es negativa.
                </p>
              </div>

              <div className="p-3 bg-white border rounded-xl space-y-1">
                <span className="font-mono font-bold text-indigo-900">2. Determinante Positivo (Det &gt; 0):</span>
                <p className="font-mono text-slate-700">
                  Det(J_sub) = γ(k₁·M_eq + k₀) + α·k₁·G_eq = {jacobian.det.toFixed(4)} &gt; 0
                </p>
                <p className="text-[11px] text-slate-500">
                  La suma de productos de coeficientes estrictamente positivos garantiza un determinante positivo sin posibilidad de cambio de signo.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 4: DIDACTIC ASSISTANT & PYTHON SCRIPT GENERATOR */}
      {/* ========================================================================= */}
      {activeSubTab === 'assistant' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* QUICK COMMANDS LAUNCHPAD */}
          <div className="lg:col-span-4 bg-white border border-slate-250 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="pb-3 border-b border-slate-200">
              <span className="text-[10px] font-mono text-indigo-600 font-bold uppercase tracking-wider block">Consola Pedagógica</span>
              <h4 className="font-display font-bold text-sm text-slate-900">Comandos Rápidos</h4>
              <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                Haz clic en cualquier comando para que el profesor universitario lo resuelva:
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => executeCommand('/simular')}
                className="w-full p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-2xl text-left transition flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <div className="font-mono font-bold text-xs text-indigo-700">/simular</div>
                  <div className="text-[10.5px] text-slate-500 font-sans">Generar script en Python (solve_ivp / ODE)</div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition" />
              </button>

              <button
                onClick={() => executeCommand('/equilibrio')}
                className="w-full p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-2xl text-left transition flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <div className="font-mono font-bold text-xs text-indigo-700">/equilibrio</div>
                  <div className="text-[10.5px] text-slate-500 font-sans">Cálculo analítico del estado estacionario</div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition" />
              </button>

              <button
                onClick={() => executeCommand('/jacobiana')}
                className="w-full p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-2xl text-left transition flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <div className="font-mono font-bold text-xs text-indigo-700">/jacobiana</div>
                  <div className="text-[10.5px] text-slate-500 font-sans">Matriz Jacobiana y autovalores de Lyapunov</div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition" />
              </button>

              <button
                onClick={() => executeCommand('/ejercicio')}
                className="w-full p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-2xl text-left transition flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <div className="font-mono font-bold text-xs text-indigo-700">/ejercicio</div>
                  <div className="text-[10.5px] text-slate-500 font-sans">Problema tipo examen conceptual y numérico</div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition" />
              </button>
            </div>

            <div className="p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100 text-[11px] text-indigo-950 font-sans space-y-1">
              <strong className="block font-mono text-[10px] text-indigo-800 uppercase">Perfil Académico del Asistente</strong>
              <p className="leading-relaxed">
                Tono universitario estimulante. Conecta siempre el rigor de las EDOs (linealidad, estabilidad, integración RK4) con el significado celular y biotecnológico.
              </p>
            </div>
          </div>

          {/* CHAT INTERACTIVE STREAM */}
          <div className="lg:col-span-8 bg-white border border-slate-250 rounded-3xl p-6 shadow-sm flex flex-col h-[600px]">
            <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h4 className="font-display font-bold text-sm text-slate-900">
                  Asistente Didáctico de Modelado Matemático en Biotecnología
                </h4>
              </div>
              <span className="text-[10px] font-mono text-slate-400">En línea</span>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[90%] p-4 rounded-2xl text-xs font-sans leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-indigo-900 text-white rounded-br-none'
                        : 'bg-slate-50 text-slate-800 border border-slate-200 rounded-bl-none space-y-3'
                    }`}
                  >
                    <div className="whitespace-pre-line select-text">{msg.text}</div>

                    {/* Code Block if any */}
                    {msg.code && (
                      <div className="mt-3 bg-slate-950 text-slate-200 p-4 rounded-xl border border-slate-800 font-mono text-[11px] space-y-2 overflow-x-auto">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                          <span className="text-slate-400 text-[10px]">Python (scipy.integrate.solve_ivp)</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleCopyCode(msg.code!)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] flex items-center gap-1 transition cursor-pointer"
                            >
                              {copiedCode ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                              {copiedCode ? 'Copiado' : 'Copiar'}
                            </button>
                            <button
                              onClick={() => handleDownloadPy(msg.code!)}
                              className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] flex items-center gap-1 transition cursor-pointer"
                            >
                              <Download className="h-3 w-3" /> .py
                            </button>
                          </div>
                        </div>
                        <pre className="max-h-72 overflow-y-auto select-all leading-tight">
                          {msg.code}
                        </pre>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 font-mono px-1">{msg.timestamp}</span>
                </div>
              ))}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeCommand(inputCommand);
              }}
              className="pt-3 border-t border-slate-200 flex gap-2"
            >
              <input
                type="text"
                placeholder="Escribe un comando (/simular, /equilibrio, /jacobiana, /ejercicio) o una consulta..."
                value={inputCommand}
                onChange={(e) => setInputCommand(e.target.value)}
                className="flex-1 px-4 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans text-slate-900 placeholder:text-slate-400"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-indigo-900 hover:bg-indigo-950 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
              >
                <Send className="h-3.5 w-3.5" /> Enviar
              </button>
            </form>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 5: EXAM-STYLE EXERCISES & PEDAGOGICAL BREAKDOWNS */}
      {/* ========================================================================= */}
      {activeSubTab === 'exercise' && (
        <div className="bg-white border border-slate-250 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
            <div>
              <span className="text-xs font-mono font-bold text-indigo-600 uppercase tracking-widest block mb-1">
                Comando Rápido: /ejercicio
              </span>
              <h3 className="font-display font-extrabold text-xl text-slate-900">
                Problemas de Examen y Andamiaje Pedagógico
              </h3>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                Desglose analítico paso a paso (equilibrio, Jacobiana, valores propios y conclusión de bioprocesos).
              </p>
            </div>

            <div className="flex gap-2">
              {EXAM_EXERCISES.map((ex, idx) => (
                <button
                  key={ex.id}
                  onClick={() => {
                    setSelectedExercise(ex);
                    setShowExerciseSolution(false);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold font-mono transition cursor-pointer ${
                    selectedExercise.id === ex.id
                      ? 'bg-indigo-900 text-white shadow'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Problema {idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Active Exercise Box */}
          <div className="space-y-4">
            <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-2">
              <span className="text-[10px] font-mono text-indigo-700 uppercase font-bold tracking-wider block">
                Enunciado del Problema
              </span>
              <h4 className="font-display font-bold text-sm text-indigo-950">
                {selectedExercise.title}
              </h4>
              <p className="text-xs text-slate-700 font-sans leading-relaxed">
                {selectedExercise.context}
              </p>
              <div className="p-3 bg-white border border-indigo-200 rounded-xl font-sans text-xs font-bold text-indigo-950">
                Pregunta: {selectedExercise.question}
              </div>
            </div>

            {/* Toggle Solution */}
            <div className="flex justify-center">
              <button
                onClick={() => setShowExerciseSolution(!showExerciseSolution)}
                className="px-5 py-2.5 bg-indigo-900 hover:bg-indigo-950 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow cursor-pointer"
              >
                <Sparkles className="h-4 w-4 text-amber-300" />
                {showExerciseSolution ? 'Ocultar Desglose Analítico' : 'Ver Solución Paso a Paso del Profesor'}
              </button>
            </div>

            {/* Solution Drawer */}
            <AnimatePresence>
              {showExerciseSolution && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4 pt-2"
                >
                  <h5 className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-indigo-600" /> Desglose Paso a Paso del Profesor:
                  </h5>

                  <div className="space-y-3 font-sans text-xs">
                    {selectedExercise.steps.map((step, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                        <strong className="text-indigo-900 font-mono text-xs block">
                          {step.title}
                        </strong>
                        <div className="p-3 bg-white border rounded-xl font-mono text-slate-900 whitespace-pre-line leading-relaxed">
                          {step.math}
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
                          {step.explanation}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Analytical Conclusion */}
                  <div className="p-5 bg-gradient-to-r from-emerald-50 to-indigo-50 border border-emerald-200 rounded-2xl space-y-2">
                    <strong className="text-emerald-950 font-mono text-xs uppercase flex items-center gap-1.5 font-bold">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" /> Conclusión Analítica y Biotecnológica:
                    </strong>
                    <p className="text-xs text-slate-800 leading-relaxed font-sans">
                      {selectedExercise.conclusion}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

    </div>
  );
}
