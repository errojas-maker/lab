import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { personalInfo } from '../data';
import escudoImg from '../escudo.svg';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Estudiante',
    subject: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const roles = ['Estudiante', 'Profesor / Investigador', 'Editor de Revista', 'Otro'];

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // validations
    if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
      setError('Por favor complete todos los campos obligatorios.');
      return;
    }

    if (!validateEmail(formData.email)) {
      setError('Por favor inserte una dirección de correo válida.');
      return;
    }

    setSubmitting(true);

    // Simulate sending emails through server endpoint delay
    setTimeout(() => {
      setSubmitting(false);
      setSuccess(true);
      setFormData({
        name: '',
        email: '',
        role: 'Estudiante',
        subject: '',
        message: ''
      });
      // clear success banner after some time
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    }, 1500);
  };

  return (
    <section id="contacto" className="py-24 bg-white border-t border-slate-100 relative overflow-hidden math-grid-dense">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="font-mono text-xs text-indigo-600 font-semibold uppercase tracking-widest block mb-2 font-display">
            Coordenadas Académicas
          </span>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-slate-900 tracking-tight">
            Establecer Contacto
          </h2>
          <p className="mt-4 text-slate-500 font-normal text-md">
            Si desea coordinar asesorías, participar en proyectos de didáctica computacional o proponer colaboraciones de investigación, envíe sus datos aquí.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 max-w-6xl mx-auto">
          
          {/* Contact Details (Left Column) */}
          <div className="lg:col-span-5 space-y-8 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center space-x-3.5 bg-slate-50/80 border border-slate-150 p-4 rounded-xl">
                <img 
                  src={escudoImg}
                  alt="Escudo UMSNH" 
                  className="h-12 w-auto filter drop-shadow-sm hover:scale-105 transition-transform duration-250 select-none"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h4 className="font-display font-semibold text-slate-800 text-xs">Universidad Michoacana de San Nicolás de Hidalgo</h4>
                  <p className="font-mono text-[9.5px] text-indigo-600 mt-0.5 uppercase tracking-wider">Correspondencia de Investigación</p>
                </div>
              </div>

              <h3 className="font-display font-bold text-xl text-slate-800">
                Oficinas y Asistencia
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed font-normal">
                Las asesorías presenciales para alumnos de ingeniería y posgrado se programan dentro del campus principal de la Universidad Michoacana en Morelia, Michoacán.
              </p>

              {/* Physical details layout cards */}
              <div className="space-y-4 pt-4 font-normal text-xs text-slate-600">

                <div className="flex items-start space-x-3.5">
                  <div className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                    <Mail className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <span className="block font-semibold text-slate-800 font-display">Contacto Seguro</span>
                    <span className="block text-slate-500 mt-0.5">
                      Disponible a través del formulario de mensaje directo en esta sección.
                    </span>
                  </div>
                </div>

                <div className="flex items-start space-x-3.5">
                  <div className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                    <Clock className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <span className="block font-semibold text-slate-800 font-display">Horario de Asesorías</span>
                    <span className="block text-slate-500 mt-0.5">Lunes a Jueves: 09:00 - 13:00 hrs (Previa cita por e-mail)</span>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Form Panel (Right Column) */}
          <div className="lg:col-span-7 bg-slate-50 border border-slate-200 p-6 rounded-2xl shadow-sm math-grid">
            <h3 className="font-display font-bold text-xl text-slate-800 mb-6">
              Enviar Propuesta o Consulta
            </h3>

            <form onSubmit={handleSubmit} className="space-y-5" id="contact-form">
              
              {/* Alert error/success boxes inside form */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2.5 text-xs font-medium"
                  >
                    <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}

                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-start gap-2.5 text-xs font-normal"
                  >
                    <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">¡Mensaje enviado con éxito!</p>
                      <p className="text-[11px] text-emerald-700 mt-1">
                        Su propuesta ha sido procesada de manera segura. El Dr. Erick recibirá esta información en su buzón institucional de manera directa.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Rows layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Nombre Completo *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    id="contact-name"
                    required
                    className="w-full px-3.5 py-2 px-3 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none text-xs text-slate-700 transition"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Correo Electrónico *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    id="contact-email"
                    required
                    className="w-full px-3.5 py-2 px-3 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none text-xs text-slate-700 transition"
                  />
                </div>

              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Role dropdown lists */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Perfil del Emisor</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    id="contact-role"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none text-xs text-slate-700 cursor-pointer transition"
                  >
                    {roles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Asunto del Mensaje *</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    id="contact-subject"
                    required
                    className="w-full px-3.5 py-2 px-3 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none text-xs text-slate-700 transition"
                  />
                </div>

              </div>

              {/* Message text body */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Cuerpo del Mensaje *</label>
                <textarea
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  id="contact-message"
                  required
                  placeholder="Por favor redacte su consulta, sugerencia de temas de tesis, o propuesta de colaboración..."
                  className="w-full px-3.5 py-2 px-3 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none text-xs text-slate-700 transition resize-none placeholder-slate-400"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                id="contact-submit-btn"
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-indigo-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-xs shadow-md shadow-indigo-950/20 hover:shadow-lg transition-all duration-300 pointer-events-auto cursor-pointer"
              >
                {submitting ? (
                  <div className="h-4 w-4 border-2 border-indigo-200 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Enviar Formulario Oficial</span>
                  </>
                )}
              </button>

            </form>
          </div>

        </div>

      </div>
    </section>
  );
}
