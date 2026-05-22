import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Header from './components/Header';
import Hero from './components/Hero';
import Research from './components/Research';
import Publications from './components/Publications';
import Courses from './components/Courses';
import InteractiveSandbox from './components/InteractiveSandbox';
import Contact from './components/Contact';
import { ArrowUp, Award, ExternalLink, GraduationCap, Mail } from 'lucide-react';
import { personalInfo } from './data';
import escudoImg from './escudo.svg';

export default function App() {
  const [activeSection, setActiveSection] = useState('sobre-mi');
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Monitor scroll progress to auto update state highlight on headers
  useEffect(() => {
    const handleScroll = () => {
      // Toggle back to top anchor
      setShowScrollTop(window.scrollY > 400);

      const navSections = ['sobre-mi', 'investigacion', 'publicaciones', 'docencia', 'trayectoria', 'simulador', 'contacto'];
      const scrollPosition = window.scrollY + 120; // offset corresponding to sticky header sizes

      for (let i = 0; i < navSections.length; i++) {
        const currentSection = navSections[i];
        const el = document.getElementById(currentSection);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;

          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(currentSection);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
    setActiveSection('sobre-mi');
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-700 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Sticky header controls */}
      <Header activeSection={activeSection} setActiveSection={setActiveSection} />

      {/* Main sections layout tree */}
      <main className="flex-grow">
        <Hero setActiveSection={setActiveSection} />
        <Research />
        <Publications />
        <Courses />
        <Experience />
        <InteractiveSandbox />
        <Contact />
      </main>

      {/* Elegant Academic Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 font-normal text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-800 pb-8">
            <div className="flex items-start space-x-4">
              <img 
                src={escudoImg}
                alt="Escudo UMSNH" 
                className="h-14 w-auto brightness-95 opacity-85 hover:opacity-100 transition-opacity select-none"
                referrerPolicy="no-referrer"
              />
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="font-display font-semibold text-white tracking-wide text-sm block">
                    Dr. Erick Radaí Rojas Maldonado
                  </span>
                </div>
                <p className="max-w-md text-slate-500">
                  Profesor e Investigador Titular de la Universidad Michoacana de San Nicolás de Hidalgo.
                </p>
              </div>
            </div>

            {/* Quick footer socials */}
            <div className="flex flex-wrap gap-4 text-slate-500 font-mono">
              <a href={personalInfo.researchGate} target="_blank" rel="noreferrer" className="hover:text-white transition flex items-center gap-1">
                ResearchGate <ExternalLink className="h-3 w-3" />
              </a>
              <a href={personalInfo.scholar} target="_blank" rel="noreferrer" className="hover:text-white transition flex items-center gap-1">
                Scholar <ExternalLink className="h-3 w-3" />
              </a>
              <a href={`mailto:${personalInfo.email}`} className="hover:text-white transition flex items-center gap-1">
                Contacto <Mail className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-slate-500">
            <p>
              © {new Date().getFullYear()} Erick Radaí Rojas Maldonado. Todos los derechos reservados.
            </p>
            <p className="flex items-center gap-1 select-none text-slate-600">
              <GraduationCap className="h-3.5 w-3.5" /> Universidad Michoacana de San Nicolás de Hidalgo — Morelia, Mich. México.
            </p>
          </div>

        </div>
      </footer>

      {/* Slide up back-to-top anchor anchor */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToTop}
            id="back-to-top-btn"
            className="fixed bottom-6 right-6 p-3 bg-indigo-900 hover:bg-slate-800 text-white rounded-full shadow-lg hover:shadow-xl transition-all z-40 outline-none select-none"
            aria-label="Ir arriba"
          >
            <ArrowUp className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>

    </div>
  );
}

// Inline Wrapper to bypass direct component imports limits if any or separate logic cleanly
import Experience from './components/Experience';
