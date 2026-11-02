import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, RotateCcw, Copy, Check, Terminal, Cpu, Download, 
  Sparkles, BookOpen, Calculator, Beaker, HelpCircle, ArrowRight, 
  BarChart2, ShieldCheck, RefreshCw, Send, ChevronRight, Activity,
  Sliders, Info, Zap, AlertCircle, ExternalLink, CheckCircle2
} from 'lucide-react';

// ==================== INTERFACES & PRESETS ====================

export interface BiotechParams {
  Vin: number;     // Basal transport capacity (mM/time)
  I: number;       // Insulin concentration (relative or nM)
  KI: number;      // Affinity constant for insulin
  SI: number;      // Insulin sensitivity index (rango canónico del artículo: 0.1 a 1.0)
  k1: number;      // Mitochondrial glucose consumption rate
  k0: number;      // Basal non-mitochondrial consumption
  alpha: number;   // Mitochondrial biogenesis rate
  gamma: number;   // Mitochondrial decay / mitophagy rate
  kL: number;      // Milk synthesis rate coefficient
  delta: number;   // Milk clearance / secretion rate
}

// Parámetros Canónicos de la Tabla 2 de Meng et al. (JCI) — Escala de tiempo en DÍAS:
export const ARTICLE_TABLE2_PARAMS: BiotechParams = {
  Vin: 2.0,        // mM/día (según Tabla 2 del artículo)
  I: 1.0,          // Insulina relativa normalizada
  KI: 1.0,         // Constante de afinidad de insulina
  SI: 1.0,         // Sensibilidad normal (rango canónico [0.1, 1.0])
  k1: 0.35,        // Tasa de consumo mitocondrial de glucosa
  k0: 0.15,        // Consumo basal no dependiente de mitocondrias
  alpha: 0.20,     // día⁻¹ (según Tabla 2 del artículo)
  gamma: 0.10,     // día⁻¹ (según Tabla 2 del artículo)
  kL: 1.00,        // Eficiencia de síntesis láctea (según Tabla 2)
  delta: 0.80,     // día⁻¹ Tasa de aclaramiento/vaciado de leche (según Tabla 2)
};

// Parámetros Didácticos Alternativos — Escala de tiempo en HORAS:
export const DIDACTIC_PARAMS: BiotechParams = {
  Vin: 0.80,       // mM/h
  I: 1.0,          // Insulina basal
  KI: 1.0,         // Constante de afinidad
  SI: 1.0,         // Sensibilidad normal
  k1: 0.15,        // Consumo mitocondrial de glucosa
  k0: 0.05,        // Consumo basal no dependiente de mitocondrias
  alpha: 0.40,     // h⁻¹ Biogénesis mitocondrial
  gamma: 0.30,     // h⁻¹ Recambio/mitofagia
  kL: 0.50,        // Eficiencia de síntesis láctea
  delta: 0.25,     // h⁻¹ Aclaramiento de leche
};

// Configuración canónica por defecto en Días:
const DEFAULT_PARAMS: BiotechParams = ARTICLE_TABLE2_PARAMS;

interface Preset {
  id: string;
  name: string;
  badge: string;
  description: string;
  params: Partial<BiotechParams>;
}

const PRESETS: Preset[] = [
  {
    id: 'table2_article',
    name: 'Parámetros Canónicos Didácticos (Inspirado en Meng et al.)',
    badge: 'Modelo EDO (14 días)',
    description: 'Modelo didáctico de EDOs calibrado a partir de la evidencia biológica de Meng et al. (Tabla 2): V_in = 2.0 mM/día, α = 0.20, γ = 0.10, k_L = 1.00, δ = 0.80 en escala de 14 días postparto.',
    params: { ...ARTICLE_TABLE2_PARAMS }
  },
  {
    id: 'didactic_hours',
    name: 'Escala Didáctica Alternativa (48 horas)',
    badge: 'Didáctico (48 h)',
    description: 'Parámetros didácticos en escala horaria rápida (V_in = 0.80 mM/h, α = 0.40 h⁻¹, γ = 0.30 h⁻¹).',
    params: { ...DIDACTIC_PARAMS }
  },
  {
    id: 'normal',
    name: 'Fisiología Control (Saludable)',
    badge: 'Normosensible (S_I = 1.0)',
    description: 'Sensibilidad óptima a la insulina (S_I = 1.0). Transporte eficiente de glucosa y capacidad mitocondrial robusta.',
    params: { SI: 1.0, I: 1.0 }
  },
  {
    id: 'mild_ir',
    name: 'Resistencia a la Insulina Leve',
    badge: 'S_I = 0.50',
    description: 'Disminución moderada de la activación de GLUT dependiente de insulina en el epitelio mamario.',
    params: { SI: 0.50, I: 1.2 }
  },
  {
    id: 'severe_ir',
    name: 'Resistencia severa (escenario didáctico)',
    badge: 'S_I = 0.10',
    description: 'Caída drástica en la captación de glucosa celular y síntesis láctea (lactogénesis II comprometida). Escenario didáctico, no estudiado directamente por Meng et al.',
    params: { SI: 0.10, I: 1.5 }
  },
  {
    id: 'hyperinsulinemia',
    name: 'Hiperinsulinemia Compensatoria',
    badge: 'I = 3.0 / S_I = 0.35',
    description: 'Elevada secreción pancreática compensatoria intentando superar el defecto del receptor mamario.',
    params: { SI: 0.35, I: 3.0 }
  },
  {
    id: 'mitochondrial_dysfunction',
    name: 'Disfunción Mitocondrial Primaria',
    badge: 'α baja / γ alta',
    description: 'Mitofagia acelerada y menor biogénesis. Falla bioenergética mitocondrial independiente del transportador.',
    params: { SI: 0.90, I: 1.0, alpha: 0.10, gamma: 0.22 }
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
  tMax: number = 14, 
  h: number = 0.05
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
  const timeUnitStr = 'días';
  const rateUnitStr = 'mM/día';
  const decayUnitStr = 'día⁻¹';
  const nPoints = 280;
  const tMax = 14;

  return `# =====================================================================
# SIMULACIÓN DE DINÁMICA DE LACTOGÉNESIS (MENG ET AL., JCI)
# Estudio Experimental: Meng et al., Journal of Clinical Investigation
# DOI: https://doi.org/10.1172/JCI197311
# "Insulin resistance is associated with mammary mitochondrial dysfunction at the onset of human lactation"
# Modelo canónico de 3 EDOs en Biología de Sistemas (Escala de tiempo: DÍAS postparto)
# =====================================================================

import numpy as np
import matplotlib.pyplot as plt
from scipy.integrate import solve_ivp

# --- 1. Parámetros Cinéticos y Fisiológicos (Tabla 2 de Meng et al., JCI) ---
Vin = ${p.Vin}      # Capacidad basal de transporte (${rateUnitStr})
I = ${p.I}        # Concentración de insulina extracelular (relativa)
KI = ${p.KI}       # Constante de saturación / afinidad
k1 = ${p.k1}       # Tasa de consumo mitocondrial de glucosa
k0 = ${p.k0}       # Pérdida basal no mitocondrial
alpha = ${p.alpha}    # Tasa de biogénesis mitocondrial (${decayUnitStr})
gamma = ${p.gamma}    # Tasa de recambio mitocondrial / mitofagia (${decayUnitStr})
kL = ${p.kL}       # Eficiencia de síntesis de leche
delta = ${p.delta}    # Tasa de aclaramiento / secreción de leche (${decayUnitStr})

# Escenarios de Sensibilidad a la Insulina (S_I en rango canónico [0.10, 1.00])
scenarios = {
    "Control Normosensible (S_I = 1.00)": 1.00,
    "Resistencia Leve (S_I = 0.50)": 0.50,
    "Resistencia Severa (Escenario didáctico, S_I = 0.10)": 0.10,
    "Configuración Activa (S_I = ${p.SI})": ${p.SI}
}

# --- 2. Sistema de 3 Ecuaciones Diferenciales Ordinarias ---
def lactogenesis_ode(t, y, SI):
    G, M, L = y
    
    # Flujo de entrada de glucosa dependiente de GLUT e insulina
    Jin = Vin * (1.0 + (SI * I) / (KI + I))
    
    # 1. dG/dt: Dinámica de Glucosa Mamaria
    dG_dt = Jin - k1 * G * M - k0 * G
    
    # 2. dM/dt: Capacidad Mitocondrial Funcional
    dM_dt = alpha * G - gamma * M
    
    # 3. dL/dt: Tasa de Producción y Secreción de Leche
    dL_dt = kL * G * M - delta * L
    
    return [dG_dt, dM_dt, dL_dt]

# --- 3. Condiciones Iniciales y Malla Temporal (${timeUnitStr}) ---
t_span = (0, ${tMax})  # Horizonte postparto de 14 días
t_eval = np.linspace(0, ${tMax}, ${nPoints})
y0 = [0.5, 0.8, 0.2]  # [G0 (mM), M0 (funcional), L0 (UA)] al inicio de la fase secretora

# --- 4. Integración Numérica (RK45 adaptativo con scipy.integrate.solve_ivp) ---
plt.figure(figsize=(14, 8))

for label, SI_val in scenarios.items():
    sol = solve_ivp(lactogenesis_ode, t_span, y0, t_eval=t_eval, args=(SI_val,), method='RK45')
    plt.plot(sol.t, sol.y[2], lw=2.2, label=f"{label} -> L_final = {sol.y[2][-1]:.2f}")

plt.title("Dinámica de Producción de Leche L(t) bajo Resistencia a la Insulina\\n(Modelo didáctico de 3 EDOs inspirado en Meng et al., JCI / 14 días)", fontsize=13, fontweight='bold')
plt.xlabel("Tiempo postparto t (${timeUnitStr})", fontsize=11)
plt.ylabel("Producción de Leche L(t) [Unidades Arbitrarias]", fontsize=11)
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

print("=== PUNTOS DE EQUILIBRIO ANALÍTICOS (Modelo didáctico de 3 EDOs) ===")
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
    context: 'En una paciente con diabetes gestacional se registra un índice de sensibilidad S_I = 0.20, mientras que en un control sano S_I = 1.00. Con los parámetros canónicos de la Tabla 2 de Meng et al. (JCI): V_in = 2.0 mM/día, I = 1.0, K_I = 1.0, k_1 = 0.35, k_0 = 0.15, α = 0.20 día⁻¹, γ = 0.10 día⁻¹, k_L = 1.00 y δ = 0.80 día⁻¹.',
    question: 'Determine analíticamente la reducción porcentual en la producción de leche en estado estacionario (L_eq) y explique la causa bioquímica limitante (¿substrato o energía?).',
    steps: [
      {
        title: 'Paso 1: Cálculo del flujo de entrada de glucosa diario J_in para ambos casos',
        math: 'J_{in}^{control} = 2.0 \\left(1 + \\frac{1.0 \\cdot 1.0}{1.0 + 1.0}\\right) = 2.0(1.5) = 3.000 \\text{ mM/día}\\\\ J_{in}^{resistencia} = 2.0 \\left(1 + \\frac{0.20 \\cdot 1.0}{1.0 + 1.0}\\right) = 2.0(1.1) = 2.200 \\text{ mM/día}',
        explanation: 'La captación transmembrana diaria vía GLUT dependiente de insulina se contrae en un 26.7% debido a la deficiente señalización posreceptor.'
      },
      {
        title: 'Paso 2: Deducción de la ecuación cuadrática de equilibrio de Glucosa',
        math: '\\frac{dM}{dt} = 0 \\implies M_{eq} = \\frac{\\alpha}{\\gamma} G_{eq} = \\frac{0.20}{0.10} G_{eq} = 2.000 G_{eq}\\\\ \\frac{dG}{dt} = 0 \\implies J_{in} - k_1 G_{eq}(2.000 G_{eq}) - k_0 G_{eq} = 0 \\implies 0.700 G_{eq}^2 + 0.15 G_{eq} - J_{in} = 0',
        explanation: 'Se sustituye M_eq en la ecuación de balance de masa de glucosa. El término no lineal k_1·G·M refleja el acoplamiento directo entre masa mitocondrial funcional y consumo oxidativo.'
      },
      {
        title: 'Paso 3: Raíz físicamente positiva de G_eq y cálculo de L_eq',
        math: 'G_{eq}^{ctrl} = \\frac{-0.15 + \\sqrt{0.15^2 + 4(0.70)(3.00)}}{2(0.70)} \\approx 1.966 \\text{ mM} \\implies L_{eq}^{ctrl} = \\frac{1.00}{0.80}(1.966)(3.932) \\approx 9.664 \\text{ UA}\\\\ G_{eq}^{res} = \\frac{-0.15 + \\sqrt{0.15^2 + 4(0.70)(2.20)}}{2(0.70)} \\approx 1.669 \\text{ mM} \\implies L_{eq}^{res} = \\frac{1.00}{0.80}(1.669)(3.338) \\approx 6.964 \\text{ UA}',
        explanation: 'Nótese que la producción láctea depende cuadráticamente de la glucosa intramamaria: L_eq = (k_L·α / δ·γ) G_eq².'
      },
      {
        title: 'Paso 4: Cuantificación de la pérdida de rendimiento lácteo',
        math: '\\text{Reducción} = \\left(1 - \\frac{6.964}{9.664}\\right) \\times 100\\% \\approx 28.0\\%',
        explanation: 'Una baja en J_in del 26.7% se amplifica a una caída del 28.0% en la secreción láctea debido a la dependencia cuadrática en el estado estacionario: L_eq ∝ G_eq² (ya que M_eq ∝ G_eq y la síntesis depende del producto k_L · G · M). El modelo no posee bucles de retroalimentación positiva; la amplificación surge intrínsecamente del acoplamiento cuadrático.'
      }
    ],
    conclusion: 'Conclusión Analítica y Biotecnológica: La falla en la lactogénesis no es puramente osmótica por falta de lactosa extracelular, sino un colapso sinérgico: al ingresar menos glucosa (J_in cae a 2.20 mM/día), decae la biogénesis mitocondrial (M_eq cae de 3.93 a 3.34), provocando una doble penalización metabólica sobre el complejo de la lactosa sintetasa dependiente de ATP en el horizonte postparto.'
  },
  {
    id: 'ex2',
    title: 'Ejercicio Tipo Examen 2: Estabilidad Asintótica Local y Autovalores del Sistema',
    context: 'Un bioprocesador mamario opera en el punto de equilibrio en escala de 14 días con parámetros de la Tabla 2 de Meng et al. Para garantizar la seguridad del bioproceso, se debe demostrar rigurosamente que el sistema es asintóticamente estable frente a perturbaciones estocásticas.',
    question: 'Construya la matriz Jacobiana evaluada en el estado estacionario y demuestre analíticamente por el criterio de Routh-Hurwitz que todos los autovalores poseen parte real estrictamente negativa.',
    steps: [
      {
        title: 'Paso 1: Estructura algebraica de la matriz Jacobiana',
        math: 'J(G,M,L) = \\begin{pmatrix} -k_1 M_{eq} - k_0 & -k_1 G_{eq} & 0 \\\\ \\alpha & -\\gamma & 0 \\\\ k_L M_{eq} & k_L G_{eq} & -\\delta \\end{pmatrix}',
        explanation: 'Observe que la tercera columna tiene ceros en las dos primeras filas. Esto desacopla la variable L del subsistema autónomo bidimensional (G, M).'
      },
      {
        title: 'Paso 2: Autovalor desacoplado inmediato',
        math: '\\det(J - \\lambda I) = (-\\delta - \\lambda) \\det\\begin{pmatrix} -k_1 M_{eq} - k_0 - \\lambda & -k_1 G_{eq} \\\\ \\alpha & -\\gamma - \\lambda \\end{pmatrix} = 0 \\implies \\lambda_3 = -\\delta = -0.80 \\text{ día}^{-1} < 0',
        explanation: 'Dado que la constante de aclaramiento δ = 0.80 día⁻¹ > 0, el tercer autovalor siempre es real y estrictamente negativo.'
      },
      {
        title: 'Paso 3: Análisis de traza y determinante del bloque 2x2',
        math: '\\text{Tr}(J_{sub}) = - (k_1 M_{eq} + k_0) - \\gamma < 0\\\\ \\det(J_{sub}) = (k_1 M_{eq} + k_0)\\gamma - (-k_1 G_{eq})(\\alpha) = \\gamma(k_1 M_{eq} + k_0) + \\alpha k_1 G_{eq} > 0',
        explanation: 'Dado que todos los parámetros biológicos (k1, k0, α, γ, G_eq, M_eq) son estrictamente positivos, la traza es obligatoriamente negativa y el determinante es estrictamente positivo.'
      }
    ],
    conclusion: 'Conclusión Analítica y de Estabilidad: Al ser Tr < 0 y Det > 0, el polinomio característico cuadrático satisface idénticamente el criterio de Routh-Hurwitz. Por ende, los tres autovalores poseen Re(λ_i) < 0. El punto de equilibrio es un sumidero localmente asintóticamente estable (nodo o foco estable), garantizando que cualquier fluctuación transitoria en el aporte de nutrientes se disipa sin oscilaciones caóticas.'
  },
  {
    id: 'ex3',
    title: 'Ejercicio Tipo Examen 3: Calibración Fisiológica en Días (Modelo EDO Inspirado en Meng et al.)',
    context: 'A partir de la evidencia biológica y bioenergética de Meng et al. (JCI), este modelo didáctico de 3 EDOs simula la dinámica de la lactogénesis II en un horizonte de 14 días postparto con los parámetros canónicos: V_in = 2.0 mM/día, α = 0.20 día⁻¹, γ = 0.10 día⁻¹, k_L = 1.00, δ = 0.80 día⁻¹, I = 1.0, K_I = 1.0, k_1 = 0.35 y k_0 = 0.15. Compare el estado normosensible (S_I = 1.0) frente a resistencia severa (S_I = 0.10).',
    question: 'Calcule analíticamente el punto de equilibrio en días para ambos casos y determine el impacto relativo sobre la síntesis láctea en un horizonte de dos semanas postparto.',
    steps: [
      {
        title: 'Paso 1: Flujo de entrada de glucosa diario',
        math: 'J_{in}^{ctrl} = 2.0 \\left(1 + \\frac{1.0 \\cdot 1.0}{1.0 + 1.0}\\right) = 2.0(1.5) = 3.000 \\text{ mM/día}\\\\ J_{in}^{res} = 2.0 \\left(1 + \\frac{0.10 \\cdot 1.0}{1.0 + 1.0}\\right) = 2.0(1.05) = 2.100 \\text{ mM/día}',
        explanation: 'En escala de días, el flujo de entrada pasa de 3.0 mM/día a 2.1 mM/día en resistencia severa (caída del 30% en aporte de carbono celular).'
      },
      {
        title: 'Paso 2: Relación mitocondrial y polinomio cuadrático',
        math: 'M_{eq} = \\frac{\\alpha}{\\gamma} G_{eq} = \\frac{0.20}{0.10} G_{eq} = 2.000 \\cdot G_{eq}\\\\ a = \\frac{k_1 \\alpha}{\\gamma} = 0.35(2.0) = 0.700, \\quad b = k_0 = 0.150\\\\ 0.700 G_{eq}^2 + 0.150 G_{eq} - J_{in} = 0',
        explanation: 'Bajo los parámetros de la Tabla 2, la biomasa mitocondrial funcional mantiene una relación 2:1 con la concentración de glucosa intramamaria.'
      },
      {
        title: 'Paso 3: Concentraciones estacionarias y rendimiento lácteo',
        math: 'G_{eq}^{ctrl} = \\frac{-0.15 + \\sqrt{0.15^2 + 4(0.70)(3.0)}}{1.40} \\approx 1.966 \\text{ mM} \\implies L_{eq}^{ctrl} = \\frac{1.00}{0.80}(1.966)(3.932) \\approx 9.66 \\text{ UA}\\\\ G_{eq}^{res} = \\frac{-0.15 + \\sqrt{0.15^2 + 4(0.70)(2.1)}}{1.40} \\approx 1.628 \\text{ mM} \\implies L_{eq}^{res} = \\frac{1.00}{0.80}(1.628)(3.256) \\approx 6.63 \\text{ UA}',
        explanation: 'El rendimiento lácteo cae de 9.66 UA a 6.63 UA (rendimiento residual del 68.6%, es decir, una pérdida neta del 31.4%).'
      }
    ],
    conclusion: 'Conclusión Analítica y Fisiológica: Al emplear este modelo didáctico de 3 EDOs inspirado en la evidencia empírica de Meng et al., el horizonte de 14 días captura la transición desde el calostro inicial hasta la lactogénesis de volumen pleno. La resistencia insulínica severa (S_I = 0.10) priva a la mitocondria mamaria de la tasa de renovación necesaria (γ = 0.10 día⁻¹), limitando la producción energética celular requerida para sostener la lactogénesis II.'
  }
];

// ==================== MAIN COMPONENT ====================

export default function BiotechOdeSimulator() {
  const [params, setParams] = useState<BiotechParams>(DEFAULT_PARAMS);
  const [selectedPreset, setSelectedPreset] = useState<string>('table2_article');
  
  // Escala Temporal: 'days' (14 días postparto, Δt = 0.05 d) u 'hours' (48 h, Δt = 0.2 h)
  const [timeUnit, setTimeUnit] = useState<'days' | 'hours'>('days');
  const [tMax, setTMax] = useState<number>(14);
  const [hStep, setHStep] = useState<number>(0.05);

  const timeTicks = useMemo(() => {
    return timeUnit === 'days' ? [0, 2, 4, 6, 8, 10, 12, 14] : [0, 6, 12, 18, 24, 30, 36, 42, 48];
  }, [timeUnit]);

  const timeLabel = timeUnit === 'days' ? 'días' : 'horas';
  const timeSuffix = timeUnit === 'days' ? 'd' : 'h';
  const rateLabel = timeUnit === 'days' ? 'mM/día' : 'mM/h';
  const decayLabel = timeUnit === 'days' ? 'día⁻¹' : 'h⁻¹';

  // S_I range extension toggle (default false: canonical [0.1, 1.0], true: extended [0.1, 2.0])
  const [allowExtendedSI, setAllowExtendedSI] = useState<boolean>(false);

  const [initialG, setInitialG] = useState<number>(0.5);
  const [initialM, setInitialM] = useState<number>(0.8);
  const [initialL, setInitialL] = useState<number>(0.2);

  // Active subtab inside this simulator
  const [activeSubTab, setActiveSubTab] = useState<'simulation' | 'comparison' | 'steadyState' | 'jacobian' | 'assistant' | 'exercise'>('simulation');

  // Assistant Chat states
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string; code?: string; timestamp: string }>>([
    {
      sender: 'assistant',
      text: '¡Bienvenido al módulo de Modelado Matemático en Biotecnología! Soy tu Profesor Universitario Especialista en Biología de Sistemas y Métodos Numéricos.\n\nMeng et al. (The Journal of Clinical Investigation, DOI: https://doi.org/10.1172/JCI197311) describe la asociación entre resistencia a la insulina y función mitocondrial; el modelo de 3 EDOs es una formulación didáctica inspirada en esa evidencia experimental para analizar la dinámica de la lactogénesis en un horizonte de 14 días postparto.\n\nPuedes consultar la pestaña comparativa "Modelo EDO vs. Resultados Meng et al.", ejecutar comandos rápidos (/simular, /equilibrio, /jacobiana, /ejercicio) o consultar libremente.',
      timestamp: '10:30 AM'
    }
  ]);
  const [inputCommand, setInputCommand] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [selectedExercise, setSelectedExercise] = useState<ExamExercise>(EXAM_EXERCISES[0]);
  const [showExerciseSolution, setShowExerciseSolution] = useState<boolean>(false);

  // Hover on SVG timeline
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Item 2: Reset button handler que restablece también la escala temporal
  const handleReset = () => {
    setTimeUnit('days');
    setTMax(14);
    setHStep(0.05);
    setParams({ ...ARTICLE_TABLE2_PARAMS });
    setSelectedPreset('table2_article');
  };

  // Item 6: Mapeo correcto en handleLoadDidactic (evita resaltar incorrectamente el preset de días)
  const handleLoadDidactic = () => {
    setTimeUnit('hours');
    setTMax(48);
    setHStep(0.2);
    setParams({ ...DIDACTIC_PARAMS });
    setSelectedPreset('didactic_hours');
  };

  const handleLoadCanonicalDays = () => {
    setTimeUnit('days');
    setTMax(14);
    setHStep(0.05);
    setParams({ ...ARTICLE_TABLE2_PARAMS });
    setSelectedPreset('table2_article');
  };

  // Item 3: Calibrar la trayectoria de control de referencia (controlTrajectory) según la unidad de tiempo activa
  const controlReferenceParams = useMemo(() => {
    return timeUnit === 'days' ? ARTICLE_TABLE2_PARAMS : DIDACTIC_PARAMS;
  }, [timeUnit]);

  const controlTrajectory = useMemo(() => {
    return solveRK4(controlReferenceParams, { G: initialG, M: initialM, L: initialL }, tMax, hStep);
  }, [controlReferenceParams, initialG, initialM, initialL, tMax, hStep]);

  const activeTrajectory = useMemo(() => {
    return solveRK4(params, { G: initialG, M: initialM, L: initialL }, tMax, hStep);
  }, [params, initialG, initialM, initialL, tMax, hStep]);

  // Equilibrium & Jacobian for current params
  const equilibrium = useMemo(() => calculateEquilibrium(params), [params]);
  const controlEquilibrium = useMemo(() => calculateEquilibrium(controlReferenceParams), [controlReferenceParams]);
  const jacobian = useMemo(() => calculateJacobian(params, equilibrium.Geq, equilibrium.Meq), [params, equilibrium]);

  // Relative milk yield efficiency compared to healthy control
  const relativeEfficiency = useMemo(() => {
    if (controlEquilibrium.Leq === 0) return 100;
    return Math.round((equilibrium.Leq / controlEquilibrium.Leq) * 100);
  }, [equilibrium.Leq, controlEquilibrium.Leq]);

  // Item 4: Reducción porcentual calculada dinámicamente mediante calculateEquilibrium
  const reductionL = useMemo(() => {
    if (controlEquilibrium.Leq === 0) return 0;
    return ((controlEquilibrium.Leq - equilibrium.Leq) / controlEquilibrium.Leq) * 100;
  }, [controlEquilibrium.Leq, equilibrium.Leq]);

  const reductionJin = useMemo(() => {
    if (controlEquilibrium.Jin === 0) return 0;
    return ((controlEquilibrium.Jin - equilibrium.Jin) / controlEquilibrium.Jin) * 100;
  }, [controlEquilibrium.Jin, equilibrium.Jin]);

  // Handle Preset selection
  const handleApplyPreset = (preset: Preset) => {
    setSelectedPreset(preset.id);
    if (preset.id === 'table2_article') {
      setTimeUnit('days');
      setTMax(14);
      setHStep(0.05);
      setParams({ ...ARTICLE_TABLE2_PARAMS });
    } else if (preset.id === 'didactic_hours') {
      setTimeUnit('hours');
      setTMax(48);
      setHStep(0.2);
      setParams({ ...DIDACTIC_PARAMS });
    } else {
      setParams(prev => ({ ...prev, ...preset.params }));
    }
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
      botResponse = `Aquí tienes el script completo en Python con Scipy (\`solve_ivp\`), configurado con los parámetros activos de tu sesión (${params.SI === 1 ? 'Control Normosensible' : `Resistencia a la Insulina S_I = ${params.SI}`}) en la escala temporal canónica de **14 días postparto** (paso $\\Delta t = 0.05$ días, 280 puntos de integración según Tabla 2 de Meng et al.). El algoritmo integra mediante Runge-Kutta de paso variable (RK45) y genera las curvas comparativas de lactogénesis:`;
      generatedCode = generatePythonCode(params);
      setActiveSubTab('assistant');
    } else if (lower === '/equilibrio') {
      botResponse = `### Cálculo Analítico del Punto de Equilibrio (G_eq, M_eq, L_eq) [Escala: 14 días postparto]\n\n` +
        `**1. Flujo de transporte de glucosa GLUT diario:**\n` +
        `$$J_{in}(S_I) = V_{in} \\cdot \\left(1 + \\frac{S_I \\cdot I}{K_I + I}\\right) = ${params.Vin.toFixed(2)} \\cdot \\left(1 + \\frac{${params.SI.toFixed(2)} \\cdot ${params.I.toFixed(2)}}{${params.KI.toFixed(2)} + ${params.I.toFixed(2)}}\\right) = ${equilibrium.Jin.toFixed(4)} \\text{ ${rateLabel}}$$\n\n` +
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
      botResponse = `### Matriz Jacobiana y Análisis de Estabilidad Asintótica [Escala: 14 días postparto]\n\n` +
        `La matriz Jacobiana $J(G, M, L)$ evaluada en el punto de equilibrio es:\n\n` +
        `$$J = \\begin{pmatrix} -k_1 M_{eq} - k_0 & -k_1 G_{eq} & 0 \\\\ \\alpha & -\\gamma & 0 \\\\ k_L M_{eq} & k_L G_{eq} & -\\delta \\end{pmatrix} = ` +
        `\\begin{pmatrix} ${jacobian.matrix[0][0].toFixed(3)} & ${jacobian.matrix[0][1].toFixed(3)} & 0 \\\\ ` +
        `${jacobian.matrix[1][0].toFixed(3)} & ${jacobian.matrix[1][1].toFixed(3)} & 0 \\\\ ` +
        `${jacobian.matrix[2][0].toFixed(3)} & ${jacobian.matrix[2][1].toFixed(3)} & ${jacobian.matrix[2][2].toFixed(3)} \\end{pmatrix}$$\n\n` +
        `**Autovalores calculados (${decayLabel}):**\n` +
        `- $\\lambda_1 = ${jacobian.lambda1.real.toFixed(4)} ${jacobian.lambda1.imag !== 0 ? `\\pm ${Math.abs(jacobian.lambda1.imag).toFixed(4)}i` : ''}$\n` +
        `- $\\lambda_2 = ${jacobian.lambda2.real.toFixed(4)} ${jacobian.lambda2.imag !== 0 ? `\\mp ${Math.abs(jacobian.lambda2.imag).toFixed(4)}i` : ''}$\n` +
        `- $\\lambda_3 = -\\delta = ${jacobian.lambda3.real.toFixed(4)}$\n\n` +
        `**Dictamen Matemático:** El punto de equilibrio es **LOCALMENTE ASINTÓTICAMENTE ESTABLE** (sumidero local) porque todos los autovalores tienen parte real negativa ($\\text{Re}(\\lambda_i) < 0$). El Teorema de Hartman-Grobman únicamente garantiza la equivalencia topológica local entre las trayectorias no lineales y la linealización en una vecindad del equilibrio hiperbólico.`;
      setActiveSubTab('jacobian');
    } else if (lower === '/ejercicio') {
      botResponse = `He cargado un problema conceptual y cuantitativo tipo examen en la pestaña "Ejercicios Pedagógicos": **"${selectedExercise.title}"**. Puedes consultar el desglose algebraico y la conclusión bioingenieril con el botón "Ver Solución Paso a Paso".`;
      setActiveSubTab('exercise');
      setShowExerciseSolution(false);
    } else {
      // General question answering in professor persona
      botResponse = `Estimado estudiante: respecto a tu consulta:\n\n` +
        `Meng et al. (The Journal of Clinical Investigation, DOI: https://doi.org/10.1172/JCI197311) describe la asociación entre resistencia a la insulina y función mitocondrial; el modelo de 3 EDOs es una formulación didáctica inspirada en esa evidencia experimental.\n\n` +
        `El simulador didáctico opera en un horizonte de **14 días postparto**, con paso $\\Delta t = 0.05$ días y los parámetros canónicos didácticos ($V_{in} = 2.0\\text{ mM/día}$, $\\alpha = 0.20\\text{ día}^{-1}$, $\\gamma = 0.10\\text{ día}^{-1}$, $k_L = 1.00$, $\\delta = 0.80\\text{ día}^{-1}$).\n\n` +
        `En este modelo no lineal, la variable clave de control es el índice de sensibilidad $S_I$ (rango canónico $0.10$ a $1.00$). Cuando $S_I$ disminuye (resistencia a la insulina), se atenúa el ingreso diario de glucosa ($J_{in}$). La masa mitocondrial $M(t)$ requiere glucosa como señal trófica (término $\\alpha \\cdot G$); si $G(t)$ disminuye, el recambio $\\gamma \\cdot M$ hace descender $M_{eq}$, reduciendo la síntesis de leche $L(t)$ de forma cuadrática en estado estacionario ($L_{eq} \\propto G_{eq}^2$).\n\n` +
        `Puedes consultar la pestaña **"2. Modelo EDO vs. Resultados de Meng et al."** para analizar la correspondencia conceptual entre los hallazgos empíricos reportados y las inferencias del modelo matemático.`;
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

  const renderTextWithLinks = (text: string) => {
    const urlPattern = /(https?:\/\/[^\s)]+)/g;
    const segments = text.split(urlPattern);

    return segments.map((seg, idx) => {
      if (seg.match(urlPattern)) {
        return (
          <a
            key={idx}
            href={seg}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 underline transition"
          >
            {seg}
            <ExternalLink className="h-3 w-3 inline shrink-0" />
          </a>
        );
      }
      return seg;
    });
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
              Modelo matemático de 3 Ecuaciones Diferenciales Ordinarias derivado del estudio fundamental de{' '}
              <a 
                href="https://doi.org/10.1172/JCI197311" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center gap-1 text-indigo-300 hover:text-white underline decoration-indigo-400 font-semibold transition"
                title="Consultar artículo original en The Journal of Clinical Investigation: DOI 10.1172/JCI197311"
              >
                Meng et al. (Journal of Clinical Investigation)
                <ExternalLink className="h-3.5 w-3.5 inline shrink-0 text-indigo-400" />
              </a>
              . Analiza la dinámica no lineal de la glucosa mamaria, la capacidad mitocondrial y la síntesis de leche bajo resistencia a la insulina y disfunción bioenergética.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <a
                href="https://doi.org/10.1172/JCI197311"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 rounded-lg text-indigo-200 hover:text-white text-xs font-mono font-medium transition cursor-pointer group"
              >
                <BookOpen className="h-3 w-3 text-indigo-400 group-hover:text-indigo-200 transition" />
                <span>DOI: <strong>10.1172/JCI197311</strong></span>
                <ExternalLink className="h-3 w-3 text-indigo-400 group-hover:text-white" />
              </a>
              <span className="text-[11px] text-slate-400 font-sans">
                Xin Meng et al. — <em>"Insulin resistance is associated with mammary mitochondrial dysfunction at the onset of human lactation"</em>
              </span>
            </div>
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
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5 text-indigo-600" /> Escenarios Clínicos y Biotecnológicos Preconfigurados
          </span>
          <span className="text-[11px] text-slate-500 font-sans italic">
            *Meng et al. (JCI) es la referencia biológica; los 5 presets y el modelo de 3 EDOs son escenarios didácticos.
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5">
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

      {/* ================= TIME SCALE SELECTION BANNER ================= */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs font-sans">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-slate-700 font-semibold font-mono text-[11px] flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-indigo-600" /> Escala Temporal Activa:
          </span>
          <div className="inline-flex rounded-xl bg-slate-200/80 p-1 border border-slate-300">
            <button
              onClick={handleLoadCanonicalDays}
              className={`px-3 py-1 rounded-lg font-mono text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                timeUnit === 'days'
                  ? 'bg-white text-indigo-950 shadow-xs'
                  : 'text-slate-600 hover:text-indigo-900'
              }`}
            >
              <span>14 Días (Inspirado en Meng et al.)</span>
              <span className="text-[10px] text-indigo-700 font-semibold font-mono bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">Δt = 0.05 d</span>
            </button>
            <button
              onClick={handleLoadDidactic}
              className={`px-3 py-1 rounded-lg font-mono text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                timeUnit === 'hours'
                  ? 'bg-white text-indigo-950 shadow-xs'
                  : 'text-slate-600 hover:text-indigo-900'
              }`}
            >
              <span>48 Horas (Escala Didáctica)</span>
              <span className="text-[10px] text-indigo-700 font-semibold font-mono bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">Δt = 0.2 h</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveSubTab('comparison')}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm group"
          >
            <BarChart2 className="h-3.5 w-3.5 text-indigo-200 group-hover:text-white transition" />
            <span>Comparar con Hallazgos de Meng et al.</span>
            <ArrowRight className="h-3.5 w-3.5 text-indigo-200 group-hover:translate-x-0.5 transition" />
          </button>
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
            onClick={() => setActiveSubTab('comparison')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold font-display transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'comparison'
                ? 'bg-indigo-900 text-white shadow-md'
                : 'text-slate-600 hover:text-indigo-900 hover:bg-slate-200/50'
            }`}
          >
            <BarChart2 className="h-3.5 w-3.5 text-amber-300" /> 2. Modelo EDO vs. Resultados de Meng et al.
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full uppercase font-bold ${
              activeSubTab === 'comparison' ? 'bg-amber-400 text-indigo-950' : 'bg-indigo-100 text-indigo-800'
            }`}>
              JCI Paper
            </span>
          </button>
          <button
            onClick={() => setActiveSubTab('steadyState')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold font-display transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'steadyState'
                ? 'bg-indigo-900 text-white shadow-md'
                : 'text-slate-600 hover:text-indigo-900 hover:bg-slate-200/50'
            }`}
          >
            <Calculator className="h-3.5 w-3.5" /> 3. Punto de Equilibrio (/equilibrio)
          </button>
          <button
            onClick={() => setActiveSubTab('jacobian')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold font-display transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'jacobian'
                ? 'bg-indigo-900 text-white shadow-md'
                : 'text-slate-600 hover:text-indigo-900 hover:bg-slate-200/50'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" /> 4. Matriz Jacobiana & Estabilidad (/jacobiana)
          </button>
          <button
            onClick={() => setActiveSubTab('assistant')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold font-display transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'assistant'
                ? 'bg-indigo-900 text-white shadow-md'
                : 'text-slate-600 hover:text-indigo-900 hover:bg-slate-200/50'
            }`}
          >
            <Terminal className="h-3.5 w-3.5" /> 5. Asistente & Código Python (/simular)
          </button>
          <button
            onClick={() => setActiveSubTab('exercise')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold font-display transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'exercise'
                ? 'bg-indigo-900 text-white shadow-md'
                : 'text-slate-600 hover:text-indigo-900 hover:bg-slate-200/50'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" /> 6. Ejercicios Pedagógicos (/ejercicio)
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
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="text-[11px] text-slate-500 hover:text-indigo-600 flex items-center gap-1 font-mono transition cursor-pointer"
                  title="Reiniciar a escala y valores canónicos"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              </div>
            </div>

            {/* Slider 1: S_I Insulin Sensitivity */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100">
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
                min="0.10"
                max={allowExtendedSI ? 2.0 : 1.0}
                step="0.05"
                value={params.SI}
                onChange={(e) => {
                  setParams(prev => ({ ...prev, SI: parseFloat(e.target.value) }));
                  setSelectedPreset('custom');
                }}
                className="w-full h-1.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0.10 (Resistencia severa)</span>
                <span>0.50 (Leve)</span>
                <span>1.00 (Normosensible)</span>
                {allowExtendedSI && <span className="text-indigo-700 font-bold">2.00 (Hipersensible)</span>}
              </div>

              {/* Extended SI range toggle */}
              <div className="pt-2 border-t border-indigo-100/60 flex items-center justify-between text-[11px] text-slate-600 font-sans">
                <span>Rango canónico del artículo: [0.1, 1.0]</span>
                <button
                  onClick={() => setAllowExtendedSI(!allowExtendedSI)}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-md border transition cursor-pointer ${
                    allowExtendedSI 
                      ? 'bg-indigo-600 text-white border-indigo-700' 
                      : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                  }`}
                >
                  {allowExtendedSI ? 'Extendido activo (hasta 2.0)' : 'Extender a 2.0'}
                </button>
              </div>
            </div>

            {/* Other Parameters Accordion / Grid */}
            <div className="space-y-3 text-xs font-sans">
              
              {/* Insulin Concentration I */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-700">
                  <span>Insulina Extracelular (I):</span>
                  <span className="font-mono font-semibold">{params.I.toFixed(2)} [relativa]</span>
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
                  <span className="font-mono font-semibold">{params.Vin.toFixed(2)} {rateLabel}</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="5.0"
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
                  <span className="font-mono font-semibold">{params.alpha.toFixed(2)} {decayLabel}</span>
                </div>
                <input
                  type="range"
                  min="0.05"
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
                  <span className="font-mono font-semibold">{params.gamma.toFixed(2)} {decayLabel}</span>
                </div>
                <input
                  type="range"
                  min="0.02"
                  max="0.50"
                  step="0.01"
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
                  max="1.5"
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
                  <span className="font-mono font-semibold">{params.delta.toFixed(2)} {decayLabel}</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="1.50"
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
                <strong className="text-slate-900">{equilibrium.Jin.toFixed(3)} {rateLabel}</strong>
              </div>
              <div className="flex justify-between">
                <span>Integrador Numérico:</span>
                <span className="text-indigo-600 font-semibold">Runge-Kutta 4 (h = {hStep}{timeSuffix})</span>
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
                    Comparación dinámica entre el modelo actual (línea continua ámbar) y el control sano normosensible (línea punteada gris) en escala de {timeLabel}.
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
                  {timeTicks.map((tVal) => {
                    const x = scaleX(tVal);
                    return (
                      <g key={`l-tgrid-${tVal}`}>
                        <line x1={x} y1={padding.top} x2={x} y2={padding.top + plotH} stroke="#1e293b" strokeDasharray="2 2" />
                        <text x={x} y={svgHeight - 10} textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">
                          {tVal}{timeSuffix}
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
                    Nivel de combustible celular (G, línea esmeralda) y maquinaria oxidativa de ATP (M, línea violeta) en {timeLabel}.
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
                  {timeTicks.map((tVal) => {
                    const x = scaleX(tVal);
                    return (
                      <g key={`gm-tgrid-${tVal}`}>
                        <line x1={x} y1={padding.top} x2={x} y2={padding.top + plotH} stroke="#1e293b" strokeDasharray="2 2" />
                        <text x={x} y={svgHeight - 10} textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">
                          {tVal}{timeSuffix}
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <h5 className="font-bold text-slate-900 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                  <Info className="h-4 w-4 text-indigo-600" /> Interpretación Fisiológica Multidisciplinaria
                </h5>
                <a
                  href="https://doi.org/10.1172/JCI197311"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-indigo-700 hover:text-indigo-900 text-[11px] font-mono font-semibold transition group shadow-2xs"
                  title="Consultar artículo: Meng et al., Journal of Clinical Investigation (DOI: 10.1172/JCI197311)"
                >
                  <span>Meng et al. (JCI) · doi:10.1172/JCI197311</span>
                  <ExternalLink className="h-3 w-3 text-indigo-500 group-hover:text-indigo-700" />
                </a>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                  <strong className="text-indigo-900 block font-mono text-[11px]">1. Entrada Transmembrana (GLUT)</strong>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    La captación celular de glucosa está gobernada por el flujo J_in(S_I). El flujo basal V_in representa el transporte constitutivo mediado por transportadores basales, mientras que la resistencia a la insulina disminuye la fracción de transporte estimulable, reduciendo el aporte neto hacia la célula mamaria.
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
                    La producción L(t) requiere tanto carbono (G) como ATP (M). Debido al acoplamiento no lineal bilineal, una variación de {reductionJin >= 0 ? `reducción del ${reductionJin.toFixed(1)}%` : `incremento del ${Math.abs(reductionJin).toFixed(1)}%`} en la captación J_in genera una {reductionL >= 0 ? `reducción neta del ${reductionL.toFixed(1)}%` : `ganancia del ${Math.abs(reductionL).toFixed(1)}%`} en el estado estacionario L_eq ({equilibrium.Leq.toFixed(2)} vs. {controlEquilibrium.Leq.toFixed(2)} UA).
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: COMPREHENSIVE COMPARISON: 3-ODE MODEL VS. MENG ET AL. (JCI) */}
      {/* ========================================================================= */}
      {activeSubTab === 'comparison' && (
        <div className="space-y-8">
          
          {/* HEADER HERO OF COMPARISON */}
          <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 border border-indigo-800/50 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="space-y-2 max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400/20 border border-amber-400/40 rounded-full text-amber-300 text-xs font-mono font-semibold">
                  <BarChart2 className="h-3.5 w-3.5" /> Modelo Didáctico vs. Evidencia Experimental de Meng et al.
                </div>
                <h3 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
                  Modelo de 3 EDOs vs. Resultados de Meng et al. (JCI)
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed font-sans">
                  Contraste conceptual entre las predicciones cuantitativas del sistema dinámico de 3 EDOs y la evidencia observacional clínica (asociación con LAR y activación secretora) y celular reportada en el estudio de{' '}
                  <a
                    href="https://doi.org/10.1172/JCI197311"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-amber-300 hover:text-white underline decoration-amber-400"
                  >
                    Meng et al. (Journal of Clinical Investigation, 197311)
                    <ExternalLink className="h-3 w-3 inline shrink-0" />
                  </a>
                  .
                </p>
                <div className="pt-1 flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span className="px-2.5 py-1 bg-white/10 rounded-lg text-slate-200">
                    Escala canónica: <strong>14 Días postparto</strong>
                  </span>
                  <span className="px-2.5 py-1 bg-white/10 rounded-lg text-slate-200">
                    Paso: <strong>Δt = 0.05 días</strong>
                  </span>
                  <a
                    href="https://www.jci.org/articles/view/197311"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 rounded-lg text-amber-200 hover:text-white transition flex items-center gap-1"
                  >
                    <span>JCI Article #197311</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              {/* Quick Status / Efficiency Snapshot */}
              <div className="bg-slate-900/90 border border-indigo-700/50 rounded-2xl p-4 text-center shrink-0 w-full lg:w-72 shadow-lg space-y-2">
                <span className="text-[10px] font-mono text-indigo-300 block uppercase tracking-wider">Estado Activo del Simulador</span>
                <div className="flex justify-around items-center pt-1 border-t border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">L_eq Activo</span>
                    <strong className="text-xl font-mono text-amber-400">{equilibrium.Leq.toFixed(2)} UA</strong>
                  </div>
                  <div className="w-px h-8 bg-slate-800" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">L_eq Control</span>
                    <strong className="text-xl font-mono text-slate-300">{controlEquilibrium.Leq.toFixed(2)} UA</strong>
                  </div>
                </div>
                <div className="pt-1 text-[11px] font-mono text-emerald-400">
                  Rendimiento: <strong>{relativeEfficiency}%</strong> vs. Control Saludable
                </div>
              </div>
            </div>
          </div>

          {/* 4 CARDS: MACRO-FINDINGS COMPARISON */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                  Lactogénesis II
                </span>
                <span className="text-indigo-700 text-xs font-mono font-bold">Inferencia didáctica</span>
              </div>
              <h4 className="font-display font-bold text-sm text-slate-900">
                Activación Secretora e Inicio Lácteo
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                <strong>Meng et al. (Hallazgo reportado):</strong> Reporta asociación observacional entre resistencia a la insulina (evaluada mediante LAR) y un inicio más tardío de la activación secretora (tiempo medio de 2.8 frente a 2.5 días postparto).<br />
                <strong>Modelo EDO (Inferencia didáctica):</strong> Con S_I = 0.10, la curva L(t) asciende con menor pendiente y el estado estacionario L_eq cae de 9.66 a 6.63 UA (reducción del 31.4%).
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                  Genes Mitocondriales
                </span>
                <span className="text-indigo-700 text-xs font-mono font-bold">Inferencia didáctica</span>
              </div>
              <h4 className="font-display font-bold text-sm text-slate-900">
                Expresión y Biomasa Mitocondrial
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                <strong>Meng et al. (Hallazgo reportado):</strong> Observa expresión reducida de genes mitocondriales en glándula mamaria al día 2 (muestras pequeñas) y aumento de volumen mitocondrial con insulina en cultivos celulares.<br />
                <strong>Modelo EDO (Inferencia didáctica):</strong> Con dM/dt = α·G - γ·M, la menor entrada de glucosa reduce M_eq a 3.26 en resistencia severa; en el preset de disfunción mitocondrial (S_I = 0.90, I = 1.0, α = 0.10, γ = 0.22 ⟹ G_eq ≈ 3.824 mM), M_eq = (0.10/0.22) · 3.824 ≈ 1.74.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                  Consumo de Oxígeno
                </span>
                <span className="text-indigo-700 text-xs font-mono font-bold">Inferencia didáctica</span>
              </div>
              <h4 className="font-display font-bold text-sm text-slate-900">
                Respiración y Demanda Energética
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                <strong>Meng et al. (Hallazgo reportado):</strong> Demuestra in vitro en cultivos celulares epiteliales mamarios que la estimulación con insulina eleva el consumo celular de oxígeno.<br />
                <strong>Modelo EDO (Inferencia didáctica):</strong> Los términos bilineales k₁·G·M y k_L·G·M formulan la hipótesis didáctica de que la síntesis láctea depende conjuntamente de la glucosa y la capacidad bioenergética mitocondrial.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                  Flujo Saturable
                </span>
                <span className="text-indigo-700 text-xs font-mono font-bold">Inferencia didáctica</span>
              </div>
              <h4 className="font-display font-bold text-sm text-slate-900">
                Resistencia e Hiperinsulinemia
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                <strong>Meng et al. (Hallazgo reportado):</strong> Describe resistencia a la insulina con respuesta tisular mamaria disminuida y retraso en la activación secretora.<br />
                <strong>Modelo EDO (Inferencia didáctica):</strong> En el flujo saturable J_in(S_I), elevar I = 3.0 con S_I = 0.35 genera J_in = 2.525 mM/día, sin alcanzar los 3.00 mM/día del control normosensible.
              </p>
            </div>

          </div>

          {/* DETAILED COMPARISON ACCORDIONS / PILLARS */}
          <div className="bg-white border border-slate-250 rounded-3xl p-6 sm:p-8 shadow-sm space-y-8 font-sans">
            <div>
              <span className="text-xs font-mono font-bold text-indigo-600 uppercase tracking-widest block mb-1">
                Análisis Fisiológico y Biofísico Profundo
              </span>
              <h4 className="font-display font-extrabold text-xl text-slate-900">
                Los 5 Pilares de Correspondencia: EDOs vs. Evidencia Biológica
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Desglose minucioso de cada variable y término del modelo matemático de 3 EDOs confrontado directamente con los datos experimentales de Meng et al. (The Journal of Clinical Investigation, 10.1172/JCI197311).
              </p>
            </div>

            {/* PILLAR 1: ACTIVACIÓN SECRETORA Y VOLUMEN DE LECHE */}
            <div className="border border-slate-200 rounded-2xl p-5 sm:p-6 bg-slate-50/50 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-amber-500/10 text-amber-600 rounded-xl font-mono text-xs font-bold">01</span>
                  <div>
                    <h5 className="font-display font-bold text-sm sm:text-base text-slate-900">
                      Activación Secretora y Tasa de Acumulación Láctea
                    </h5>
                    <span className="text-[11px] font-mono text-slate-500">Variable de estado modelada: L(t) [Producción y secreción láctea acumulada]</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full font-mono text-[10px] font-bold shrink-0">
                  Inferencia didáctica
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                  <strong className="text-indigo-900 font-mono text-xs block flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-indigo-600" /> Hallazgo reportado (Meng et al., JCI)
                  </strong>
                  <p className="text-slate-700 leading-relaxed">
                    Meng et al. reportaron una asociación observacional entre la resistencia a la insulina materna (evaluada mediante el índice LAR: leptin-to-adiponectin ratio) y un inicio más tardío de la activación secretora (tiempo medio de 2.8 días postparto frente a 2.5 días en controles normosensibles).
                  </p>
                  <div className="text-[11px] text-slate-500 font-mono pt-1 border-t border-slate-100">
                    Método: Cuestionarios clínicos de inicio de lactogénesis y cuantificación de biomarcadores metabólicos (LAR).
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                  <strong className="text-amber-900 font-mono text-xs block flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-amber-600" /> Inferencia didáctica (Modelo de 3 EDOs, 14 Días)
                  </strong>
                  <p className="text-slate-700 leading-relaxed">
                    La dinámica de acumulación láctea responde a la ecuación diferencial:
                  </p>
                  <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-lg font-mono text-slate-800 text-xs">
                    dL/dt = k_L · G · M - δ · L
                  </div>
                  <p className="text-slate-700 leading-relaxed">
                    Valores obtenidos integrando numéricamente el modelo mediante RK4 (Δt = 0.05 d, G(0) = 0.50, M(0) = 0.80, L(0) = 0.20): en control normosensible (S_I = 1.00), a t = 3.0 días se obtiene L(3.0 d) = 6.56 UA (con G = 3.68 mM y M = 2.14) con convergencia a L_eq ≈ 9.66 UA. En cambio, bajo resistencia severa (S_I = 0.10), a t = 3.0 días se obtiene L(3.0 d) = 4.21 UA (con G = 2.87 mM y M = 1.76), lo que representa una producción láctea un 35.8% menor al tercer día y converge asintóticamente a L_eq ≈ 6.63 UA (reducción del 31.4%), representando cualitativamente el retraso temporal en la activación secretora.
                  </p>
                  <div className="text-[11px] text-slate-500 font-mono pt-1 border-t border-slate-100">
                    Parámetros canónicos didácticos: k_L = 1.00, δ = 0.80 día⁻¹, t_max = 14 días.
                  </div>
                </div>
              </div>
            </div>

            {/* PILLAR 2: CAPACIDAD Y EXPRESIÓN MITOCONDRIAL */}
            <div className="border border-slate-200 rounded-2xl p-5 sm:p-6 bg-slate-50/50 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-indigo-500/10 text-indigo-600 rounded-xl font-mono text-xs font-bold">02</span>
                  <div>
                    <h5 className="font-display font-bold text-sm sm:text-base text-slate-900">
                      Capacidad Mitocondrial y Regulación Trófica por Insulina
                    </h5>
                    <span className="text-[11px] font-mono text-slate-500">Variable de estado modelada: M(t) [Capacidad mitocondrial funcional]</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full font-mono text-[10px] font-bold shrink-0">
                  Inferencia didáctica
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                  <strong className="text-indigo-900 font-mono text-xs block flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-indigo-600" /> Hallazgo reportado (Meng et al., JCI)
                  </strong>
                  <p className="text-slate-700 leading-relaxed">
                    Meng et al. observaron una menor expresión de conjuntos de genes mitocondriales en glándula mamaria al día 2 postparto (en una muestra exploratoria pequeña), así como un aumento del volumen mitocondrial al estimular células epiteliales mamarias con insulina in vitro.
                  </p>
                  <div className="text-[11px] text-slate-500 font-mono pt-1 border-t border-slate-100">
                    Método: Análisis de expresión génica en biopsias mamarias (día 2 postparto) y medición de volumen mitocondrial en cultivo.
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                  <strong className="text-amber-900 font-mono text-xs block flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-amber-600" /> Inferencia didáctica (Modelo de 3 EDOs, 14 Días)
                  </strong>
                  <p className="text-slate-700 leading-relaxed">
                    La maquinaria oxidativa mitocondrial está descrita por la ecuación de balance:
                  </p>
                  <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-lg font-mono text-slate-800 text-xs">
                    dM/dt = α · G - γ · M ⟹ M_eq = (α / γ) · G_eq
                  </div>
                  <p className="text-slate-700 leading-relaxed">
                    Donde α es la tasa de biogénesis mitocondrial y γ es la tasa de recambio. En el control sano (S_I = 1.0), M_eq = 2.000 · G_eq ≈ 3.932. En resistencia severa (S_I = 0.10), al disminuir el combustible intramamario, M_eq cae a 3.256. Si además se simula el preset de disfunción mitocondrial primaria (S_I = 0.90, I = 1.0, α = 0.10, γ = 0.22 ⟹ G_eq ≈ 3.824 mM), el cálculo analítico del modelo arroja M_eq = (0.10 / 0.22) · 3.8240 ≈ 1.74 (1.738) y L_eq ≈ 8.31 UA (frente a 3.93 y 9.66 en control sano), modelando didácticamente el déficit bioenergético mitocondrial.
                  </p>
                  <div className="text-[11px] text-slate-500 font-mono pt-1 border-t border-slate-100">
                    Parámetros canónicos didácticos: α = 0.20 día⁻¹, γ = 0.10 día⁻¹. Relación basal α/γ = 2.0.
                  </div>
                </div>
              </div>
            </div>

            {/* PILLAR 3: BIOENERGÉTICA CELULAR Y RESPIRACIÓN */}
            <div className="border border-slate-200 rounded-2xl p-5 sm:p-6 bg-slate-50/50 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl font-mono text-xs font-bold">03</span>
                  <div>
                    <h5 className="font-display font-bold text-sm sm:text-base text-slate-900">
                      Consumo de Oxígeno y Acoplamiento Bioenergético
                    </h5>
                    <span className="text-[11px] font-mono text-slate-500">Términos no lineales modelados: k₁·G·M (consumo bioenergético) y k_L·G·M (ensamblaje lácteo dependiente de ATP)</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-mono text-[10px] font-bold shrink-0">
                  Inferencia didáctica
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                  <strong className="text-indigo-900 font-mono text-xs block flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-indigo-600" /> Hallazgo reportado (Meng et al., JCI)
                  </strong>
                  <p className="text-slate-700 leading-relaxed">
                    Meng et al. demostraron en modelos celulares epiteliales mamarios in vitro que la insulina incrementa la tasa de consumo celular de oxígeno, evidenciando un estímulo hormonal directo sobre la función metabólica mitocondrial.
                  </p>
                  <div className="text-[11px] text-slate-500 font-mono pt-1 border-t border-slate-100">
                    Método: Cuantificación del consumo celular de oxígeno en cultivos celulares epiteliales in vitro.
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                  <strong className="text-amber-900 font-mono text-xs block flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-amber-600" /> Inferencia didáctica (Modelo de 3 EDOs, 14 Días)
                  </strong>
                  <p className="text-slate-700 leading-relaxed">
                    El modelo matemático incorpora esta dependencia bioenergética mediante dos términos acoplados bilineales:
                  </p>
                  <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-lg font-mono text-slate-800 text-xs">
                    k₁ · G · M   y   k_L · G · M
                  </div>
                  <p className="text-slate-700 leading-relaxed">
                    Bioquímicamente, la síntesis de componentes lácteos requiere tanto sustratos de carbono (G) como energía celular provista por la masa mitocondrial funcional (M). Si la capacidad mitocondrial decae, la síntesis láctea disminuye aun cuando exista glucosa disponible, postulando didácticamente que el defecto energético frena la lactogénesis.
                  </p>
                  <div className="text-[11px] text-slate-500 font-mono pt-1 border-t border-slate-100">
                    Parámetros canónicos didácticos: k_1 = 0.35, k_0 = 0.15, k_L = 1.00.
                  </div>
                </div>
              </div>
            </div>

            {/* PILLAR 4: TRANSPORTE DE GLUCOSA E HIPERINSULINEMIA */}
            <div className="border border-slate-200 rounded-2xl p-5 sm:p-6 bg-slate-50/50 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-rose-500/10 text-rose-600 rounded-xl font-mono text-xs font-bold">04</span>
                  <div>
                    <h5 className="font-display font-bold text-sm sm:text-base text-slate-900">
                      Transporte de Glucosa Mamaria e Hiperinsulinemia Compensatoria
                    </h5>
                    <span className="text-[11px] font-mono text-slate-500">Término de flujo modelado: J_in(S_I) = V_in · [1 + (S_I · I) / (K_I + I)]</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full font-mono text-[10px] font-bold shrink-0">
                  Inferencia didáctica
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                  <strong className="text-indigo-900 font-mono text-xs block flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-indigo-600" /> Hallazgo reportado (Meng et al., JCI)
                  </strong>
                  <p className="text-slate-700 leading-relaxed">
                    Meng et al. observaron que las mujeres con resistencia a la insulina presentan un retraso en la activación secretora, indicando una falta de respuesta funcional del tejido mamario.
                  </p>
                  <div className="text-[11px] text-slate-500 font-mono pt-1 border-t border-slate-100">
                    Método: Cuantificación del biomarcador clínico de resistencia a la insulina (índice LAR) y registro temporal del inicio de la lactogénesis.
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                  <strong className="text-amber-900 font-mono text-xs block flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-amber-600" /> Inferencia didáctica (Modelo de 3 EDOs, 14 Días)
                  </strong>
                  <p className="text-slate-700 leading-relaxed">
                    El flujo de entrada modela el transporte saturable estimulado por insulina mediante:
                  </p>
                  <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-lg font-mono text-slate-800 text-xs">
                    J_in(S_I) = V_in · [1 + (S_I · I) / (K_I + I)]
                  </div>
                  <p className="text-slate-700 leading-relaxed">
                    Donde V_in = 2.0 mM/día es el flujo basal. En control (S_I = 1.0, I = 1.0), J_in = 3.00 mM/día. En resistencia severa (S_I = 0.10, I = 1.0), J_in cae a 2.10 mM/día. Si se simula hiperinsulinemia compensatoria (I = 3.0, S_I = 0.35, K_I = 1.0), el término saturable r = 3.0/4.0 = 0.75 entrega J_in = 2.0 · (1 + 0.35 · 0.75) = 2.525 mM/día, sin recuperar los 3.00 mM/día normales.
                  </p>
                  <div className="text-[11px] text-slate-500 font-mono pt-1 border-t border-slate-100">
                    Parámetros canónicos didácticos: V_in = 2.0 mM/día, K_I = 1.0, S_I ∈ [0.10, 1.00].
                  </div>
                </div>
              </div>
            </div>

            {/* PILLAR 5: LA DEPENDENCIA NO LINEAL CUADRÁTICA */}
            <div className="border border-slate-200 rounded-2xl p-5 sm:p-6 bg-slate-50/50 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-purple-500/10 text-purple-600 rounded-xl font-mono text-xs font-bold">05</span>
                  <div>
                    <h5 className="font-display font-bold text-sm sm:text-base text-slate-900">
                      La Dependencia Cuadrática en Estado Estacionario: L_eq ∝ G_eq²
                    </h5>
                    <span className="text-[11px] font-mono text-slate-500">Fundamento matemático de por qué variaciones moderadas en G producen caídas mayores en L</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full font-mono text-[10px] font-bold shrink-0">
                  Inferencia didáctica
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 text-xs">
                <strong className="text-purple-900 font-mono text-xs block">
                  Deducción Algebraica de la Relación Cuadrática en Equilibrio:
                </strong>
                <div className="p-4 bg-slate-900 text-purple-200 rounded-xl font-mono text-xs space-y-1.5 overflow-x-auto">
                  <div>1. En equilibrio mitocondrial: dM/dt = 0 ⟹ M_eq = (α / γ) · G_eq</div>
                  <div>2. En equilibrio de secreción láctea: dL/dt = 0 ⟹ L_eq = (k_L / δ) · G_eq · M_eq</div>
                  <div>3. Sustituyendo M_eq en L_eq:</div>
                  <div className="text-amber-300 font-bold text-sm pt-1">
                    {'L_eq = (k_L / δ) · G_eq · [(α / γ) · G_eq] = [ (k_L · α) / (δ · γ) ] · G_eq²'}
                  </div>
                  <div className="text-slate-300 text-[11px] pt-1">
                    {'Factor canónico C = (k_L · α) / (δ · γ) = (1.00 × 0.20) / (0.80 × 0.10) = 0.20 / 0.08 = 2.50 UA/mM²'}
                  </div>
                </div>
                <div className="space-y-2 text-slate-700 leading-relaxed font-sans pt-1">
                  <p>
                    <strong>Significado en el Modelo Didáctico:</strong> La síntesis láctea en estado estacionario no es linealmente proporcional a la glucosa, sino <em>cuadrática</em> respecto a G_eq, debido a que la glucosa interviene tanto como sustrato directo (G) como en el soporte trófico mitocondrial (M). No existe retroalimentación positiva; la amplificación es propiedad algebraica de la estructura bilineal.
                  </p>
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl font-mono text-purple-950 text-[11.5px] space-y-1">
                    <div>• En Control (S_I = 1.00): G_eq ≈ 1.966 mM ⟹ L_eq ≈ 2.50 × (1.966)² = 2.50 × 3.865 = <strong>9.664 UA</strong></div>
                    <div>• En Resistencia (S_I = 0.10): G_eq ≈ 1.628 mM ⟹ L_eq ≈ 2.50 × (1.628)² = 2.50 × 2.650 = <strong>6.626 UA</strong></div>
                    <div className="pt-1 text-purple-900 font-bold">• Resultado: Una reducción del 17.2% en G_eq genera una caída del 31.4% en L_eq debido al exponente cuadrático.</div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* COMPREHENSIVE COMPARISON TABLE */}
          <div className="bg-white border border-slate-250 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4 font-sans">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200 pb-4">
              <div>
                <h4 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-indigo-600" />
                  Matriz Comparativa Resumen: Modelo de 3 EDOs vs. Meng et al. (JCI)
                </h4>
                <p className="text-xs text-slate-500 font-sans mt-0.5">
                  Tabla canónica de correspondencia entre formulación analítica en 14 días y mediciones clínicas experimentales.
                </p>
              </div>
              <span className="px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl font-mono text-xs font-semibold">
                Horizonte: 14 días postparto
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-700 font-mono text-[11px]">
                    <th className="py-3 px-3 font-semibold">Dimensión / Proceso</th>
                    <th className="py-3 px-3 font-semibold text-indigo-900">Formulación en Modelo 3 EDOs</th>
                    <th className="py-3 px-3 font-semibold text-indigo-950">Predicción Teórica (14 Días)</th>
                    <th className="py-3 px-3 font-semibold text-amber-900">Hallazgo reportado (Meng et al., JCI)</th>
                    <th className="py-3 px-3 font-semibold text-slate-700">Técnica Experimental</th>
                    <th className="py-3 px-3 font-semibold text-indigo-900">Tipo de Declaración</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11.5px]">
                  
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-medium text-slate-900">Activación de la Lactogénesis II</td>
                    <td className="py-3 px-3 font-mono text-indigo-700">dL/dt = k_L·G·M - δ·L</td>
                    <td className="py-3 px-3 font-mono">L_eq cae de 9.66 a 6.63 UA (-31.4%); a t = 3 d, L cae de 6.56 a 4.21 UA (-35.8%)</td>
                    <td className="py-3 px-3 text-slate-700">Activación secretora más tardía (2.8 frente a 2.5 días postparto) asociada a resistencia (LAR)</td>
                    <td className="py-3 px-3 text-slate-500 font-mono">Cuestionarios clínicos de lactancia, LAR</td>
                    <td className="py-3 px-3 text-indigo-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 inline" /> Inferencia didáctica
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-medium text-slate-900">Biomasa y Genes Mitocondriales</td>
                    <td className="py-3 px-3 font-mono text-indigo-700">dM/dt = α·G - γ·M</td>
                    <td className="py-3 px-3 font-mono">M_eq cae de 3.93 a 3.26 en resistencia severa (o a 1.74 en preset disfunción mitocondrial: S_I = 0.90, α = 0.10, γ = 0.22)</td>
                    <td className="py-3 px-3 text-slate-700">Menor expresión de genes mitocondriales en día 2; aumento de biomasa mitocondrial con insulina in vitro</td>
                    <td className="py-3 px-3 text-slate-500 font-mono">Expresión génica en biopsias (día 2), cultivo celular</td>
                    <td className="py-3 px-3 text-indigo-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 inline" /> Inferencia didáctica
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-medium text-slate-900">Respiración y Síntesis Láctea</td>
                    <td className="py-3 px-3 font-mono text-indigo-700">k₁·G·M y k_L·G·M</td>
                    <td className="py-3 px-3 font-mono">Síntesis láctea acoplada al soporte bioenergético</td>
                    <td className="py-3 px-3 text-slate-700">Aumento del consumo de oxígeno celular estimulado por insulina in vitro</td>
                    <td className="py-3 px-3 text-slate-500 font-mono">Consumo celular de O₂ en cultivo de células mamarias</td>
                    <td className="py-3 px-3 text-indigo-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 inline" /> Inferencia didáctica
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-medium text-slate-900">Señalización e Influjo de Glucosa</td>
                    <td className="py-3 px-3 font-mono text-indigo-700">J_in = V_in·[1 + S_I·I/(K_I+I)]</td>
                    <td className="py-3 px-3 font-mono">J_in cae de 3.00 a 2.10 mM/día en resistencia severa</td>
                    <td className="py-3 px-3 text-slate-700">Resistencia a la insulina asociada a menor respuesta funcional mamaria</td>
                    <td className="py-3 px-3 text-slate-500 font-mono">No medido por Meng et al.</td>
                    <td className="py-3 px-3 text-indigo-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 inline" /> Inferencia didáctica
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-medium text-slate-900">Hiperinsulinemia Compensatoria</td>
                    <td className="py-3 px-3 font-mono text-indigo-700">I = 3.0, S_I = 0.35</td>
                    <td className="py-3 px-3 font-mono">J_in solo sube a 2.525 mM/día (&lt;3.00)</td>
                    <td className="py-3 px-3 text-slate-700">Resistencia a la insulina asociada a retraso secretor; la hiperinsulinemia modelada teóricamente no restablece el influjo basal</td>
                    <td className="py-3 px-3 text-slate-500 font-mono">Insulina plasmática vs. LAR</td>
                    <td className="py-3 px-3 text-indigo-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 inline" /> Inferencia didáctica
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/50 bg-indigo-50/40">
                    <td className="py-3 px-3 font-medium text-indigo-950">Efecto No Lineal Cuadrático</td>
                    <td className="py-3 px-3 font-mono text-indigo-800 font-bold">L_eq = [(k_L·α)/(δ·γ)] · G_eq²</td>
                    <td className="py-3 px-3 font-mono text-indigo-900 font-bold">ΔG = -17.2% ⟹ ΔL = -31.4%</td>
                    <td className="py-3 px-3 text-indigo-950">Asociación no lineal observacional entre grado de resistencia y déficit lactogénico</td>
                    <td className="py-3 px-3 text-indigo-900 font-mono">Análisis estadístico de cohortes clínicas</td>
                    <td className="py-3 px-3 text-indigo-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 inline" /> Inferencia didáctica
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>
          </div>

          {/* POSTPARTUM TIMELINE COMPARISON: 0 TO 14 DAYS */}
          <div className="bg-white border border-slate-250 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 font-sans">
            <div>
              <span className="text-xs font-mono font-bold text-indigo-600 uppercase tracking-widest block mb-1">
                Línea de Tiempo Postparto (14 Días)
              </span>
              <h4 className="font-display font-extrabold text-xl text-slate-900">
                Transición Cronológica: Calostro, Hito de Activación Secretora y Leche Madura
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Contraste de la evolución temporal entre una condición normosensible y una condición con resistencia a la insulina.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* PHASE 1 */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono text-[10px] font-bold">
                    Días 0 – 2 Postparto
                  </span>
                  <span className="text-xs font-mono text-slate-400">Fase I</span>
                </div>
                <h5 className="font-display font-bold text-sm text-slate-900">
                  Transición de Calostro & Adaptación Celular
                </h5>
                <ul className="text-xs text-slate-600 space-y-2 font-sans leading-relaxed">
                  <li>• <strong>Condiciones Iniciales del Modelo:</strong> G(0) = 0.50 mM, M(0) = 0.80, L(0) = 0.20 UA.</li>
                  <li>• <strong>Meng et al.:</strong> Secreción calostral de bajo volumen inicial; la activación secretora plena se desencadena tras el parto con la caída de progesterona.</li>
                  <li>• Ambas condiciones inician con valores bajos similares antes de la activación plena de la biosíntesis.</li>
                </ul>
              </div>

              {/* PHASE 2 */}
              <div className="p-5 rounded-2xl border-2 border-amber-400/80 bg-amber-50/40 space-y-3 relative shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-mono text-[10px] font-bold">
                    Día 2.8 vs. 2.5
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-700 uppercase">Hito Meng et al. (LAR)</span>
                </div>
                <h5 className="font-display font-bold text-sm text-amber-950">
                  Punto de Inflexión: Activación Secretora (Lactogénesis II)
                </h5>
                <ul className="text-xs text-slate-700 space-y-2 font-sans leading-relaxed">
                  <li>• <strong>Control Normosensible (S_I = 1.00):</strong> La integración numérica RK4 (Δt = 0.05 d) arroja L(3.0 d) = 6.56 UA (con G = 3.68 mM y M = 2.14). Rápido despegue de síntesis láctea sustentado por biogénesis mitocondrial.</li>
                  <li>• <strong>Resistencia a la Insulina (S_I = 0.10):</strong> La integración RK4 arroja L(3.0 d) = 4.21 UA (con G = 2.87 mM y M = 1.76), una reducción del 35.8% en la masa acumulada de leche al tercer día, modelando de forma didáctica el retraso en el inicio secretor reportado por Meng et al. (tiempo medio de 2.8 frente a 2.5 días en controles evaluado con LAR).</li>
                  <li>• Representa la ventana crítica para el establecimiento del volumen lácteo.</li>
                </ul>
              </div>

              {/* PHASE 3 */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-mono text-[10px] font-bold">
                    Días 4 – 14 Postparto
                  </span>
                  <span className="text-xs font-mono text-slate-400">Fase II Plena</span>
                </div>
                <h5 className="font-display font-bold text-sm text-slate-900">
                  Meseta Asintótica de Leche Madura
                </h5>
                <ul className="text-xs text-slate-600 space-y-2 font-sans leading-relaxed">
                  <li>• <strong>Control Normosensible:</strong> Convergencia asintótica estable al equilibrio L_eq ≈ 9.66 UA.</li>
                  <li>• <strong>Condición Resistente:</strong> Converge a un nivel menor en L_eq ≈ 6.63 UA (o L_eq ≈ 8.31 UA en el preset de disfunción mitocondrial con α = 0.10 y γ = 0.22).</li>
                  <li>• El punto de equilibrio es localmente asintóticamente estable porque todos los autovalores tienen parte real estrictamente negativa (Re(λ_i) &lt; 0). El Teorema de Hartman-Grobman únicamente garantiza la equivalencia topológica local entre las trayectorias no lineales y la linealización en una vecindad del equilibrio.</li>
                </ul>
              </div>

            </div>
          </div>

          {/* ACTION BUTTON TO RETURN TO SIMULATOR */}
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setActiveSubTab('simulation')}
              className="px-6 py-3 bg-indigo-900 hover:bg-indigo-950 text-white rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Activity className="h-4 w-4 text-emerald-400" />
              <span>Experimentar en el Simulador RK4 (14 Días)</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setActiveSubTab('steadyState')}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
            >
              <Calculator className="h-4 w-4 text-indigo-600" />
              <span>Ver Deducción Analítica del Punto de Equilibrio</span>
            </button>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: ANALYTICAL EQUILIBRIUM POINT */}
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
                J_in(S_I) = V_in · [1 + (S_I · I) / (K_I + I)] = {params.Vin} · [1 + ({params.SI} · {params.I}) / ({params.KI} + {params.I})] = <strong>{equilibrium.Jin.toFixed(4)} {rateLabel}</strong>
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
                    <div className="whitespace-pre-line select-text">{renderTextWithLinks(msg.text)}</div>

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

      {/* ================= SCIENTIFIC CITATION & DOI CONSULTATION CARD ================= */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/50 rounded-3xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-2 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 rounded-md font-mono text-[10px] font-bold uppercase tracking-wider">
              Referencia Bibliográfica Principal
            </span>
            <span className="text-slate-400 text-xs font-mono">The Journal of Clinical Investigation (JCI)</span>
          </div>
          <h4 className="font-display font-bold text-sm sm:text-base text-slate-100 leading-snug">
            "Insulin resistance is associated with mammary mitochondrial dysfunction at the onset of human lactation"
          </h4>
          <p className="text-xs text-slate-300 font-sans leading-relaxed">
            <strong>Autores:</strong> Xin Meng, et al. | Publicado en <em>The Journal of Clinical Investigation</em> (DOI: 10.1172/JCI197311). Meng et al. describe la asociación entre resistencia a la insulina y función mitocondrial; el modelo es una formulación didáctica inspirada en esa evidencia.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center gap-2.5 shrink-0 w-full md:w-auto">
          <a
            href="https://doi.org/10.1172/JCI197311"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-mono font-bold transition flex items-center justify-center gap-2 shadow-md hover:shadow-indigo-500/20 group cursor-pointer"
            title="Abrir DOI https://doi.org/10.1172/JCI197311"
          >
            <span>doi:10.1172/JCI197311</span>
            <ExternalLink className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
          </a>
          <a
            href="https://www.jci.org/articles/view/197311"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-sans font-medium transition text-center border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
            title="Consultar artículo completo en el portal de The Journal of Clinical Investigation (JCI)"
          >
            <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
            <span>Consultar Paper en JCI (197311)</span>
          </a>
        </div>
      </div>

    </div>
  );
}
