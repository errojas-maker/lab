import { useEffect, useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Shield, Globe, Monitor, Clock, Database, RefreshCw, 
  Trash2, HelpCircle, X, Download, Eye, Terminal, Search
} from 'lucide-react';
import { 
  fetchVisitorInfo, 
  getInitialAcademicLogs, 
  VisitorLogEntry 
} from '../utils/visitorDetector';

interface VisitorLogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VisitorLog({ isOpen, onClose }: VisitorLogProps) {
  const [logs, setLogs] = useState<VisitorLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  // Secure authorization/passcode system for administration
  const [showPasscodePrompt, setShowPasscodePrompt] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState('');

  useEffect(() => {
    // Read from localStorage or seed
    const stored = localStorage.getItem('portal_visitor_log');
    if (stored) {
      try {
        setLogs(JSON.parse(stored));
      } catch (e) {
        setLogs(getInitialAcademicLogs());
      }
    } else {
      const seeded = getInitialAcademicLogs();
      setLogs(seeded);
      localStorage.setItem('portal_visitor_log', JSON.stringify(seeded));
    }
  }, []);

  // Fetch current user access info on component mount/load
  useEffect(() => {
    if (isOpen) {
      registerCurrentSession();
    }
  }, [isOpen]);

  const registerCurrentSession = async () => {
    setLoading(true);
    try {
      const current = await fetchVisitorInfo();
      
      const stored = localStorage.getItem('portal_visitor_log');
      let currentLogs: VisitorLogEntry[] = stored ? JSON.parse(stored) : getInitialAcademicLogs();

      // Check if current user is already registered in the session list to prevent duplicates in short intervals
      const hasRecent = currentLogs.some(
        l => l.ip === current.ip && l.os === current.os && l.browser === current.browser
      );

      if (!hasRecent) {
        currentLogs = [current, ...currentLogs];
        localStorage.setItem('portal_visitor_log', JSON.stringify(currentLogs));
      }
      setLogs(currentLogs);
    } catch (e) {
      console.error("Failed to register session logs:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleClearLogs = () => {
    setShowPasscodePrompt(true);
    setPasscodeError('');
    setPasscodeInput('');
  };

  const handleVerifyAndClear = (e: FormEvent) => {
    e.preventDefault();
    if (passcodeInput.trim() === '2026') {
      const seeded = getInitialAcademicLogs();
      setLogs(seeded);
      localStorage.setItem('portal_visitor_log', JSON.stringify(seeded));
      setShowPasscodePrompt(false);
      setPasscodeInput('');
      setPasscodeError('');
    } else {
      setPasscodeError('Firma o clave autorizada incorrecta. Intente de nuevo.');
    }
  };

  const handleExportCSV = () => {
    // Create CSV content
    const headers = "ID,Direccion IP,Fecha y Hora,Ubicacion/Lugar,Identificador de Maquina,Sistema Operativo,Navegador\n";
    const rows = logs.map(l => 
      `"${l.id}","${l.ip}","${l.timestamp}","${l.location.replace(/"/g, '""')}","${l.machineName}","${l.os}","${l.browser}"`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bitacora_consultas_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered queries match
  const filteredLogs = logs.filter(l => 
    l.ip.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.os.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.machineName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto flex items-center justify-center p-4">
          
          {/* Backdrop screen filter lock */}
          <motion.div 
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Main Overlay Modal Panel */}
          <motion.div 
            className="relative w-full max-w-4xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
          >
            {/* Admin Passcode Verification Overlay */}
            <AnimatePresence>
              {showPasscodePrompt && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex flex-col justify-center items-center p-6 text-center"
                >
                  <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-2xl p-8 space-y-6 text-slate-800">
                    <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto">
                      <Shield className="h-6 w-6" />
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className="font-display font-bold text-lg text-slate-900">Control de Seguridad</h3>
                      <p className="text-xs text-slate-500 font-sans px-2">
                        Para evitar que cualquier usuario limpie la bitácora de auditoría, se requiere ingresar la clave de firma autorizada.
                      </p>
                    </div>

                    <form onSubmit={handleVerifyAndClear} className="space-y-4">
                      <div>
                        <input
                          type="password"
                          placeholder="Clave de administrador..."
                          value={passcodeInput}
                          onChange={(e) => setPasscodeInput(e.target.value)}
                          className="w-full px-4 py-2.5 text-sm border border-slate-250 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-sans text-center text-slate-900 placeholder:text-slate-400 font-medium"
                          autoFocus
                        />
                        {passcodeError && (
                          <p className="text-[11px] text-rose-600 font-medium mt-1.5 animate-pulse">
                            {passcodeError}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowPasscodePrompt(false);
                            setPasscodeInput('');
                            setPasscodeError('');
                          }}
                          className="flex-1 py-2 px-4 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-2 px-4 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition cursor-pointer"
                        >
                          Autorizar y Vaciar
                        </button>
                      </div>
                    </form>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Header / Brand Title section */}
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 rounded-xl">
                  <Terminal className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-md font-display font-bold tracking-tight">
                    Auditoría de Consultas & Bitácora de Tráfico
                  </h2>
                  <p className="text-[11px] font-mono text-slate-400 uppercase tracking-widest mt-0.5">
                    Consola de Telecomunicación y Auditoría
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowHelp(!showHelp)}
                  title="Ayuda de Privacidad"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-705 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <HelpCircle className="h-4.5 w-4.5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {/* Quick security help callout banner */}
            <AnimatePresence>
              {showHelp && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-indigo-50 border-b border-indigo-100 text-indigo-900 p-5 text-xs leading-relaxed font-sans scroll-smooth"
                >
                  <div className="flex items-start space-x-3">
                    <Shield className="h-5 w-5 text-indigo-650 flex-shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <p className="font-bold uppercase font-mono text-[10px] tracking-wider text-indigo-950">Nota de Cumplimiento de Seguridad del Navegador:</p>
                      <p>
                        Por motivos de diseño y en estricto cumplimiento con la <strong>seguridad del sistema de caja de arena (Sandboxing) de Javascript</strong> de los navegadores web modernos (Chrome, Safari, Firefox), <strong>no es posible extraer el Hostname físico descriptivo o Nombre de Máquina real</strong> del núcleo de tu computadora (ejemplo: <code>MacBook-Pro-de-Erick.local</code>).
                      </p>
                      <p>
                        Para solventar esto de manera limpia e innovadora, este portal integra un algoritmo que procesa una <strong>firma virtual única cifrada (Hash de Dispositivo)</strong> basada en características inertes (núcleos de CPU, perfilador de pantalla y UserAgent), garantizando el correcto orden de auditoría sin vulnerar tu sistema.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Controls / Filter row block */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-3 justify-between items-center">
              
              {/* Search input bar */}
              <div className="relative w-full sm:w-80 font-sans">
                <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrar por IP, lugar, OS o estación..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-250 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800"
                />
              </div>

              {/* Functional CTA buttons panel */}
              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                <button
                  onClick={registerCurrentSession}
                  disabled={loading}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-slate-200/80 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Actualizar</span>
                </button>

                <button
                  onClick={handleExportCSV}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-semibold border border-indigo-100 transition cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Exportar CSV</span>
                </button>

                <button
                  onClick={handleClearLogs}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold border border-rose-100 transition cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Limpiar</span>
                </button>
              </div>

            </div>

            {/* Logs List Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <Database className="h-10 w-10 text-slate-350 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700 font-display">No hay registros coincidentes</p>
                  <p className="text-xs text-slate-400">Intenta modificando tu término de búsqueda.</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  {/* Table headers */}
                  <div className="grid grid-cols-12 gap-2 bg-slate-900 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider py-3 px-4 select-none">
                    <div className="col-span-3 flex items-center gap-1.5">
                      <Globe className="h-3 w-3" /> Dirección IP
                    </div>
                    <div className="col-span-3 flex items-center gap-1.5">
                      <Clock className="h-3 w-3" /> Fecha y Hora
                    </div>
                    <div className="col-span-3 flex items-center gap-1.5">
                      <Monitor className="h-3 w-3" /> Equipo (Virtuelle Identif.)
                    </div>
                    <div className="col-span-3 flex items-center gap-1.5">
                      <FileText className="h-3 w-3" /> Sistema / Ubicación
                    </div>
                  </div>

                  {/* Table Rows */}
                  <div className="divide-y divide-slate-150">
                    {filteredLogs.map((log) => (
                      <div 
                        key={log.id} 
                        className={`grid grid-cols-12 gap-2 text-xs py-3.5 px-4 font-normal items-center transition-colors ${
                          log.isCurrentUser 
                            ? 'bg-indigo-50/60 hover:bg-indigo-50' 
                            : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        {/* IP column field */}
                        <div className="col-span-3 flex flex-col">
                          <span className="font-mono font-semibold text-slate-900 flex items-center gap-1.5">
                            {log.ip}
                            {log.isCurrentUser && (
                              <span className="bg-indigo-700 text-white font-mono text-[8px] px-1 rounded uppercase font-bold tracking-tight animate-pulse">
                                Tú
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-slate-400 leading-none mt-0.5 font-sans">
                            Conexión de entrada
                          </span>
                        </div>

                        {/* Timestamp columns */}
                        <div className="col-span-3 text-slate-600 font-mono text-[11px] leading-relaxed">
                          {log.timestamp}
                        </div>

                        {/* Machine virtual name columns */}
                        <div className="col-span-3 flex flex-col">
                          <span className="font-mono text-indigo-950 font-bold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg w-fit text-[10px]">
                            {log.machineName}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5 leading-none font-sans">
                            {log.browser}
                          </span>
                        </div>

                        {/* OS / Location column */}
                        <div className="col-span-3 flex flex-col">
                          <span className="font-sans font-semibold text-slate-800">
                            {log.os}
                          </span>
                          <span className="text-[10px] text-indigo-700 font-medium leading-normal mt-0.5 truncate font-sans">
                            📍 {log.location}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              )}
            </div>

            {/* Footer Statistics Bar banner */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 text-[10.5px] font-mono text-slate-400 flex flex-col sm:flex-row justify-between gap-2.5 items-center">
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold uppercase text-slate-350">
                  Total de Accesos Auditados: {logs.length}
                </span>
              </div>
              
              <div className="text-slate-500 font-sans text-[10px]">
                Auditoría Educativa de Tráfico Académico
              </div>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
