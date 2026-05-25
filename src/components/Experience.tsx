import { motion } from 'motion/react';
import { Briefcase, Laptop, Landmark, ChevronRight, Award, Users } from 'lucide-react';
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

  // Filter experiences
  const timelineExp = experience.filter(exp => exp.id !== 'exp_pifiems' && exp.id !== 'exp_vasco');
  const pifiemsExp = experience.find(exp => exp.id === 'exp_pifiems');

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
            {timelineExp.map((exp) => (
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

        {/* Coordinations and recognitions sections block */}
        <div className="mt-24 pt-16 border-t border-slate-100 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="font-display font-bold text-2xl text-slate-900 tracking-tight">
              Secciones Especiales Reconocidas
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Coordinaciones de programas científicos, acreditaciones oficiales e innovaciones pedagógicas en el ámbito digital.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* PIFIEMS block */}
            {pifiemsExp && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-slate-50 rounded-2xl p-6 border border-slate-200/60 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="absolute top-0 right-0 h-20 w-20 bg-indigo-50/70 rounded-bl-full flex items-center justify-center pl-4 pb-4 select-none">
                    <Users className="h-5 w-5 text-indigo-900/60" />
                  </div>
                  
                  <span className="font-mono text-xs font-bold text-indigo-650 bg-indigo-50 px-2.5 py-1 rounded">
                    {pifiemsExp.period}
                  </span>
                  
                  <h4 className="font-display font-bold text-lg text-slate-900 mt-4 leading-snug">
                    {pifiemsExp.role}
                  </h4>
                  
                  <p className="font-display font-semibold text-xs text-slate-550 mt-1.5">
                    {pifiemsExp.organization}
                  </p>

                  <ul className="mt-5 space-y-2.5 pt-4 border-t border-slate-200/50">
                    {pifiemsExp.description.map((desc, dIdx) => (
                      <li key={dIdx} className="text-xs text-slate-500 leading-relaxed flex items-start space-x-2">
                        <ChevronRight className="h-3.5 w-3.5 text-indigo-500 mt-0.5 flex-shrink-0" />
                        <span>{desc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}

            {/* Certifications Card */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-slate-50 rounded-2xl p-6 border border-slate-200/60 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="absolute top-0 right-0 h-20 w-20 bg-indigo-50/70 rounded-bl-full flex items-center justify-center pl-4 pb-4 select-none">
                  <Award className="h-5 w-5 text-indigo-900/60" />
                </div>

                <span className="font-mono text-xs font-bold text-indigo-650 bg-indigo-50 px-2.5 py-1 rounded">
                  Certificaciones Oficiales
                </span>

                <h4 className="font-display font-bold text-lg text-slate-900 mt-4 leading-snug">
                  Acreditaciones y Licencias Especiales
                </h4>

                <p className="mt-2 text-xs text-slate-500">
                  Certificaciones de competencia tecnológica y pedagógica emitidas por instituciones líderes:
                </p>

                <div className="mt-5 space-y-4 pt-4 border-t border-slate-200/50">
                  <div className="flex items-start space-x-3">
                    <span className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-mono text-[9px] font-bold mt-0.5 flex-shrink-0">
                      21
                    </span>
                    <div>
                      <h5 className="text-xs font-bold text-slate-800">Certificación de Apple Teacher</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Acreditación oficial pedagógica para la integración cognitiva de herramientas de ecosistemas interactivos de Apple (2021).</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <span className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-mono text-[9px] font-bold mt-0.5 flex-shrink-0">
                      21
                    </span>
                    <div>
                      <h5 className="text-xs font-bold text-slate-800">Desarrollo de Apps Móviles</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Certificación por la Universidad Complutense de Madrid — Diseño y arquitectura avanzada para dispositivos portátiles (2021).</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <span className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-mono text-[9px] font-bold mt-0.5 flex-shrink-0">
                      25
                    </span>
                    <div>
                      <h5 className="text-xs font-bold text-slate-800">Certificación en Aplicaciones de Google Ads</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Especialización verificada en optimización de audiencias digitales y analítica (Desde 2025).</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>

      </div>
    </section>
  );
}
