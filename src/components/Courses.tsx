import { BookOpen, Award, CheckSquare, Calendar, Compass } from 'lucide-react';
import { courses } from '../data';

export default function Courses() {
  return (
    <section id="docencia" className="py-24 bg-slate-50 border-b border-slate-100 math-grid-dense">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="font-mono text-xs text-indigo-600 font-semibold uppercase tracking-widest block mb-2 font-display">
            Cátedras e Instrucción
          </span>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-slate-900 tracking-tight">
            Cursos Docentes Universitarios
          </h2>
          <p className="mt-4 text-slate-500 font-normal text-md">
            El Dr. Erick Radaí imparte materias fundamentales de física y matemática tanto en licenciatura como en el bachillerato. En posgrado se enfoca en Didáctica de las matemáticas, Seminario de Investigación, entre otras.
          </p>
        </div>

        {/* Courses Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 hover:border-indigo-150 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div className="space-y-4">

                <h3 className="font-display font-bold text-lg text-slate-900 group-hover:text-indigo-950 transition-colors">
                  {course.name}
                </h3>
                
                <p className="text-xs text-slate-500 leading-relaxed font-normal">
                  {course.description}
                </p>

                <hr className="border-slate-100" />

                {/* Topics section */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                    Temario Destacado:
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-600 font-normal">
                    {course.topics.map((topic, index) => (
                      <li key={index} className="flex items-center space-x-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                        <span>{topic}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>

              {/* Semester info row */}
              <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between font-mono text-[10.5px] text-slate-400 font-semibold">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" /> {course.semester}
                </span>
                <span className="flex items-center gap-1 text-slate-500">
                  <Compass className="h-3.5 w-3.5" /> UMSNH Oficial
                </span>
              </div>

            </div>
          ))}
        </div>

        {/* Accolades snippet row */}
        <div className="mt-16 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 justify-between max-w-4xl mx-auto math-grid">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 flex-shrink-0">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-display font-bold text-slate-800 text-sm">
                Compromiso y Evaluación Docente UMSNH
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed font-normal mt-0.5">
                Calificación promedio sostenida de <span className="font-bold text-indigo-600">97.8/100</span> en las evaluaciones institucionales aplicadas por los alumnos e ingeniería correspondientes a los últimos 6 periodos.
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
