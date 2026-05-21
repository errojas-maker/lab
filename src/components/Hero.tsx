import { motion } from 'motion/react';
import { Award, BookOpen, GraduationCap, ArrowRight, Activity, Calendar } from 'lucide-react';
import { personalInfo } from '../data';

interface HeroProps {
  setActiveSection: (section: string) => void;
}

export default function Hero({ setActiveSection }: HeroProps) {
  const scrollToId = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const metrics = [
    {
      label: 'Cursos Impartidos',
      value: '+140 Cursos',
      subtext: 'Media Superior y Superior',
      icon: <Award className="h-5 w-5 text-amber-500" />
    },
    {
      label: 'Publicaciones',
      value: '+20',
      subtext: 'Artículos Indizados',
      icon: <BookOpen className="h-5 w-5 text-indigo-500" />
    },
    {
      label: 'Docencia Superior',
      value: '28 Años',
      subtext: 'Trayectoria Docente',
      icon: <GraduationCap className="h-5 w-5 text-emerald-500" />
    }
  ];

  return (
    <section id="sobre-mi" className="relative pt-32 pb-24 md:py-36 bg-slate-50 math-grid overflow-hidden">
      {/* Decorative math curves background */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <svg className="absolute top-1/4 right-0 w-[500px] h-[500px] text-slate-200" viewBox="0 0 100 100">
          <path d="M0,50 Q25,80 50,50 T100,50" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1,2" />
          <path d="M0,30 Q25,60 50,30 T100,30" fill="none" stroke="currentColor" strokeWidth="0.25" strokeDasharray="2,2" />
          <circle cx="50" cy="50" r="1.5" className="fill-indigo-400" />
          <circle cx="25" cy="65" r="1" className="fill-teal-400" />
          <circle cx="75" cy="35" r="1" className="fill-indigo-400" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Main Info Columns */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
            
            {/* Status pill */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center space-x-2 bg-indigo-50/80 px-3.5 py-1.5 rounded-full border border-indigo-100"
            >
              <Activity className="h-4 w-4 text-indigo-600 animate-pulse" />
              <span className="text-xs font-mono font-semibold tracking-wider text-indigo-900 uppercase">
                Universidad Michoacana de San Nicolás de Hidalgo
              </span>
            </motion.div>

            {/* Name and titles */}
            <div className="space-y-3">
              <motion.h1 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-slate-900 tracking-tight leading-none"
              >
                Erick Radaí <br/>
                <span className="text-indigo-900 bg-gradient-to-r from-indigo-900 to-indigo-600 bg-clip-text text-transparent">
                  Rojas Maldonado
                </span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="font-display text-lg sm:text-xl font-medium text-slate-600"
              >
                {personalInfo.title} • {personalInfo.role}
              </motion.p>
            </div>

            {/* Bio text */}
            <motion.p 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-base text-slate-500 leading-relaxed max-w-xl"
            >
              {personalInfo.bio}
            </motion.p>

            {/* CTA Actions */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
            >
              <button
                onClick={() => scrollToId('publicaciones')}
                id="hero-pub-cta"
                className="flex items-center justify-center space-x-2 w-full sm:w-auto px-6 py-3 bg-indigo-900 hover:bg-slate-800 text-white rounded-xl font-medium shadow-lg shadow-indigo-950/20 hover:shadow-xl transition-all duration-300"
              >
                <span>Ver Publicaciones</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              
              <button
                onClick={() => scrollToId('simulador')}
                id="hero-sim-cta"
                className="flex items-center justify-center space-x-2 w-full sm:w-auto px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-900 rounded-xl font-medium border border-slate-200 transition-colors duration-300"
              >
                <span>Simulador de Cálculo</span>
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </button>
            </motion.div>

            {/* ORCID / Identifiers links */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="pt-4 flex flex-wrap justify-center lg:justify-start gap-4 items-center font-mono text-xs text-slate-400"
            >
              <a 
                href={personalInfo.researchGate} 
                target="_blank" 
                rel="noreferrer" 
                className="hover:text-indigo-600 transition"
              >
                ResearchGate ↗
              </a>
              <span className="hidden sm:inline text-slate-300">•</span>
              <a 
                href={personalInfo.scholar} 
                target="_blank" 
                rel="noreferrer" 
                className="hover:text-indigo-600 transition"
              >
                Google Scholar ↗
              </a>
              <span className="hidden sm:inline text-slate-300">•</span>
              <span>ORCID: <span className="text-slate-500">{personalInfo.orcid}</span></span>
            </motion.div>

          </div>

          {/* Academic Profile Picture / Right Graphic */}
          <div className="lg:col-span-5 flex justify-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="relative w-full max-w-[340px]"
            >
              {/* Card visual background elements */}
              <div className="absolute inset-x-0 -bottom-6 top-6 bg-indigo-900/10 rounded-2xl transform rotate-3 blur-sm"></div>
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900/40 to-indigo-100/10 rounded-2xl"></div>

              {/* Picture Frame */}
              <div className="relative bg-white rounded-2xl px-6 py-8 border border-slate-200/80 shadow-2xl space-y-6 math-grid-dense">
                <div className="flex flex-col items-center text-center">
                  <div className="relative h-28 w-28 rounded-full ring-4 ring-indigo-50 border border-slate-200 overflow-hidden mb-4">
                    <img
                      src={personalInfo.avatar}
                      alt={personalInfo.name}
                      id="hero-profile-img"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover filter contrast-105"
                    />
                    <div className="absolute bottom-0 right-0 h-4 w-4 bg-emerald-500 rounded-full border-2 border-white ring-2 ring-emerald-100" />
                  </div>
                  <span className="font-display font-semibold text-slate-800 text-lg">{personalInfo.name}</span>
                  <span className="font-mono text-indigo-600 text-xs mt-0.5 tracking-wide">Doctor en Educación</span>
                  <p className="text-xs text-slate-400 mt-2 italic flex items-center justify-center gap-1">
                    <Calendar className="h-3 w-3" /> Trayectoria de 28 años
                  </p>
                </div>

                <hr className="border-slate-100" />

                {/* mini credentials details */}
                <div className="space-y-3 font-mono text-xs text-slate-500">
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-400">Adscripción</span>
                    <span className="text-slate-700 font-semibold text-right max-w-[150px] truncate">UMSNH, Morelia</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-400">Área Principal</span>
                    <span className="text-slate-700 font-semibold">Didáctica de Física-Mat</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-400">Investigador</span>
                    <span className="bg-indigo-50 text-indigo-900 px-1.5 py-0.5 rounded font-bold text-[10px]">Estatal ICTI</span>
                  </div>
                </div>
              </div>

            </motion.div>
          </div>

        </div>

        {/* Big Metrics Grid */}
        <div className="mt-20 border-t border-slate-200/80 pt-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {metrics.map((metric, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + idx * 0.1 }}
                className="bg-white rounded-xl p-5 border border-slate-200/80 hover:border-indigo-200 shadow-sm flex items-start space-x-4 transition-all duration-300"
              >
                <div className="p-3 bg-slate-50 rounded-lg">
                  {metric.icon}
                </div>
                <div>
                  <span className="block font-mono text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    {metric.label}
                  </span>
                  <span className="block text-2xl font-bold text-slate-800 mt-0.5 font-display select-none">
                    {metric.value}
                  </span>
                  <span className="block text-sm text-slate-500 font-normal">
                    {metric.subtext}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
