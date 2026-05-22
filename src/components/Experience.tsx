import { motion } from 'motion/react';
import { Briefcase, Laptop, Landmark, ChevronRight } from 'lucide-react';
import { experience } from '../data';

export default function Experience() {
  // Helper matching icons for experience timeline
  const getExpIcon = (type: string) => {
    switch (type) {
      case 'academic':
        return <Landmark className="h-5 w-5 text-indigo-600" />;
      case 'research':
        return <Briefcase className="h-5 w-5 text-amber-500" />;
      default:
        return <Laptop className="h-5 w-5 text-teal-600" />;
    }
  };

  return (
    <section id="trayectoria" className="py-24 bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="font-mono text-xs text-indigo-600 font-semibold uppercase tracking-widest block mb-2 font-display">
            Trayectoria Profesional
          </span>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-slate-900 tracking-tight">
            Curriculum Vitae Destacado
          </h2>
          <p className="mt-4 text-slate-500 font-normal text-md">
            Un resumen estructurado de las cátedras universitarias y designaciones honoríficas de investigación del Dr. Erick Radaí.
          </p>
        </div>

        {/* Timeline block */}
        <div className="max-w-4xl mx-auto relative pl-6 sm:pl-8 border-l-2 border-slate-100 space-y-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-12"
          >
            {experience.map((exp) => (
              <div key={exp.id} className="relative group">
                
                {/* Time indicator circle anchor */}
                <div className="absolute -left-[45px] sm:-left-[49px] top-1.5 h-10 w-10 rounded-full border border-slate-200 bg-white shadow-sm flex items-center justify-center group-hover:border-indigo-300 transition-colors duration-300">
                  {getExpIcon(exp.type)}
                </div>

                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="font-mono text-xs font-semibold text-indigo-600">
                      {exp.period}
                    </span>
                    <span className="font-mono text-[11px] font-bold text-slate-400 uppercase">
                      {exp.location}
                    </span>
                  </div>
                  
                  <h3 className="font-display font-bold text-lg text-slate-900 group-hover:text-indigo-950 transition-colors">
                    {exp.role}
                  </h3>
                  
                  <p className="font-display font-semibold text-sm text-slate-600">
                    {exp.organization}
                  </p>

                  {/* Detailed Bullet descriptors */}
                  <ul className="mt-4 space-y-2.5">
                    {exp.description.map((desc, dIdx) => (
                      <li key={dIdx} className="text-xs text-slate-500 font-normal leading-relaxed flex items-start space-x-2">
                        <span className="text-slate-350 select-none mt-1.5">
                          <ChevronRight className="h-3 w-3 text-indigo-400" />
                        </span>
                        <span>{desc}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>
            ))}
          </motion.div>
        </div>

      </div>
    </section>
  );
}
