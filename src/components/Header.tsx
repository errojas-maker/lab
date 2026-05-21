import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, GraduationCap, Menu, X, Globe, ExternalLink } from 'lucide-react';
import { personalInfo } from '../data';

interface HeaderProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

export default function Header({ activeSection, setActiveSection }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'sobre-mi', label: 'Sobre Mí' },
    { id: 'investigacion', label: 'Investigación' },
    { id: 'publicaciones', label: 'Publicaciones' },
    { id: 'docencia', label: 'Docencia' },
    { id: 'trayectoria', label: 'Curriculum' },
    { id: 'simulador', label: 'Simulador' },
    { id: 'contacto', label: 'Contacto' },
  ];

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    setMobileMenuOpen(false);
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

  return (
    <header
      id="main-header"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'py-3 shadow-md glass border-b border-slate-200/80' : 'py-5 bg-white/0 border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => scrollToSection('sobre-mi')}>
            <div>
              <span className="font-display font-semibold text-slate-900 text-sm tracking-wide block">
                Dr. Erick Radaí Rojas
              </span>
              <span className="font-mono text-indigo-600 text-[10px] tracking-wider block -mt-1 uppercase">
                UMSNH • Bachillerato PILB
              </span>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-btn-${item.id}`}
                  onClick={() => scrollToSection(item.id)}
                  className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 outline-none select-none ${
                    isActive ? 'text-indigo-900' : 'text-slate-600 hover:text-indigo-600'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavBackground"
                      className="absolute inset-0 bg-indigo-50/70 py-1.5 px-3 rounded-lg border-b border-indigo-200/50"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Quick Contact Button */}
          <div className="hidden lg:flex items-center space-x-3">
            <a
              href={`mailto:${personalInfo.email}`}
              id="header-contact-btn"
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-900 text-white rounded-lg shadow-md shadow-indigo-900/10 hover:bg-slate-800 transition-all duration-200 text-sm font-medium"
            >
              <Mail className="h-4 w-4" />
              <span>Contactar</span>
            </a>
          </div>

          {/* Mobile menu button */}
          <div className="flex lg:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              aria-expanded="false"
            >
              <span className="sr-only">Abrir menú</span>
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white border-t border-slate-100"
          >
            <div className="px-4 pt-2 pb-4 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`w-full text-left block px-4 py-3 rounded-lg text-base font-medium ${
                    activeSection === item.id
                      ? 'bg-indigo-50 text-indigo-900 border-l-4 border-indigo-600'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <div className="pt-4 border-t border-slate-100 px-4">
                <a
                  href={`mailto:${personalInfo.email}`}
                  className="flex items-center justify-center space-x-2 w-full py-3 bg-indigo-900 text-white rounded-lg shadow-md hover:bg-slate-800 transition duration-200"
                >
                  <Mail className="h-4 w-4" />
                  <span>Contactar Dr. Erick</span>
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
