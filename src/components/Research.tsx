import { motion } from 'motion/react';
import { TrendingUp, Cpu, Settings, FolderGit2, CheckCircle2 } from 'lucide-react';
import { researchLines } from '../data';

// Map icons dynamically
const iconMap: { [key: string]: any } = {
  TrendingUp: <TrendingUp className="h-6 w-6 text-indigo-600" />,
  Cpu: <Cpu className="h-6 w-6 text-teal-600" />,
  Settings: <Settings className="h-6 w-6 text-amber-600" />,
};

export default function Research() {
  return (
    <section id="investigacion" className="py-24 bg-white border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="font-mono text-xs text-indigo-600 font-semibold uppercase tracking-widest block mb-2">
            Metodología y Aportación
          </span>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-slate-900 tracking-tight">
            Líneas de Investigación Activa
          </h2>
          <p className="mt-4 text-slate-500 font-normal text-md">
            El Dr. Erick Radaí enfoca su trabajo científico en dotar de sentido intuitivo y visual al rigor matemático, combinando la pedagogía teórica con recursos interactivos avanzados.
          </p>
        </div>

        {/* Research Lines Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {researchLines.map((line, idx) => (
            <motion.div
              key={line.id}
              initial={{ opacity: 0, scale: 0.98, y: 15 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="group bg-slate-50 hover:bg-white rounded-2xl p-6 border border-slate-200/80 hover:border-indigo-200 hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="h-12 w-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center group-hover:bg-indigo-50/50 group-hover:border-indigo-100 transition-colors duration-300">
                  {iconMap[line.icon] || <Settings className="h-6 w-6" />}
                </div>
                <h3 className="font-display font-bold text-lg text-slate-900 mt-5 mb-3 group-hover:text-indigo-950 transition-colors">
                  {line.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed font-normal">
                  {line.description}
                </p>
              </div>

              {/* Research Lines Specs */}
              <div className="mt-8 pt-5 border-t border-slate-200/50 flex items-center font-mono text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5 font-medium text-slate-500 group-hover:text-indigo-600 transition-colors">
                  <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500" /> Línea de Investigación
                </span>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
