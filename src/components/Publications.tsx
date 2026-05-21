import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Quote, FileText, ChevronDown, ChevronUp, Link, Filter, ClipboardCheck } from 'lucide-react';
import { publications } from '../data';
import { Publication } from '../types';

export default function Publications() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('Todas');
  const [expandedPubId, setExpandedPubId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Collect all unique tags for filtration
  const allTags = ['Todas', ...Array.from(new Set(publications.flatMap(pub => pub.tags)))];

  // Filters logic
  const filteredPublications = publications.filter(pub => {
    const matchesTag = selectedTag === 'Todas' || pub.tags.includes(selectedTag);
    const matchesQuery = 
      pub.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pub.journal.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pub.authors.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTag && matchesQuery;
  });

  const toggleAbstract = (id: string) => {
    setExpandedPubId(expandedPubId === id ? null : id);
  };

  const copyCitation = (pub: Publication) => {
    // APA citation compile
    const doiPart = pub.doi ? ` DOI: https://doi.org/${pub.doi}` : '';
    const volPart = pub.volume ? ` ${pub.volume}` : '';
    const pagesPart = pub.pages ? `, ${pub.pages}` : '';
    const apaString = `${pub.authors} (${pub.year}). ${pub.title}. _${pub.journal}_,${volPart}${pagesPart}.${doiPart}`;
    
    navigator.clipboard.writeText(apaString);
    setCopiedId(pub.id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  return (
    <section id="publicaciones" className="py-24 bg-slate-50 math-grid-dense">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="font-mono text-xs text-indigo-600 font-semibold uppercase tracking-widest block mb-2 font-display">
            Artículos y Conferencias
          </span>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-slate-900 tracking-tight">
            Publicaciones Destacadas
          </h2>
          <p className="mt-4 text-slate-500 font-normal text-md">
            Consulte la lista indizada de artículos científicos enfocados a la investigación educativa. Filtre por tema u obtenga citas en formato APA instantáneamente.
          </p>
        </div>

        {/* Filters and search controls block */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-md mb-10 max-w-5xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            
            {/* Search inputs */}
            <div className="relative md:col-span-7">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </span>
              <input
                type="text"
                value={searchQuery}
                placeholder="Buscar por título, coautor o revista..."
                onChange={(e) => setSearchQuery(e.target.value)}
                id="pub-search-input"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:outline-none rounded-xl text-slate-700 text-sm placeholder-slate-400 transition"
              />
            </div>

            {/* Quick stats indicator */}
            <div className="md:col-span-5 flex items-center justify-end font-mono text-xs text-slate-400 font-semibold space-x-3">
              <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg text-slate-600">
                <FileText className="h-3.5 w-3.5" /> Mostrados: {filteredPublications.length} de {publications.length}
              </span>
            </div>
          </div>

          {/* Tag categories filters */}
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-5">
            <span className="text-xs font-mono font-bold text-slate-400 mr-2 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" /> Categorías:
            </span>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold font-display transition-all outline-none select-none duration-250 ${
                  selectedTag === tag
                    ? 'bg-indigo-900 text-white shadow-md shadow-indigo-900/10'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Publications feed lists */}
        <div className="max-w-5xl mx-auto space-y-6">
          <AnimatePresence mode="popLayout">
            {filteredPublications.map((pub, index) => {
              const isExpanded = expandedPubId === pub.id;
              const isCopied = copiedId === pub.id;
              
              return (
                <motion.div
                  key={pub.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="bg-white rounded-2xl p-6 border border-slate-200/80 hover:border-indigo-150 shadow-sm hover:shadow-md transition-all duration-300 relative group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      
                      {/* Journal metadata info */}
                      <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                        <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">
                          {pub.year}
                        </span>
                        <span className="text-slate-400 font-semibold italic">
                          {pub.journal}
                        </span>
                        {pub.volume && (
                          <span className="text-slate-300 font-semibold">
                            Vol. {pub.volume}
                          </span>
                        )}
                      </div>

                      {/* Main Title */}
                      <h3 className="font-display font-bold text-lg text-slate-900 hover:text-indigo-900 transition-colors">
                        {pub.title}
                      </h3>

                      {/* Authors block */}
                      <p className="text-xs text-slate-500 font-normal">
                        Autores: <span className="font-medium text-slate-700">{pub.authors}</span>
                      </p>
                    </div>

                    {/* Citations index tag */}
                    <div className="h-10 w-10 flex flex-col justify-center items-center bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700 font-mono flex-shrink-0 select-none">
                      <span className="font-bold text-xs">{pub.citations}</span>
                      <span className="text-[8px] font-semibold text-indigo-400 uppercase leading-none -mt-0.5">citas</span>
                    </div>
                  </div>

                  {/* Tag components */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {pub.tags.map(tag => (
                      <span 
                        key={tag} 
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-50 text-slate-400 font-mono tracking-wide"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Abstract section expanding container */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-5 pt-4 border-t border-slate-100 text-xs text-slate-500 leading-relaxed font-normal">
                          <p className="font-semibold text-slate-700 font-mono mb-2 uppercase text-[10px] tracking-wider">Resumen / Abstract:</p>
                          {pub.abstract}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <hr className="border-slate-100 my-4" />

                  {/* Actions buttons shelf */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleAbstract(pub.id)}
                      id={`btn-abstract-${pub.id}`}
                      className="inline-flex items-center space-x-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold font-display select-none outline-none"
                    >
                      <span>{isExpanded ? 'Ocultar Resumen' : 'Ver Resumen'}</span>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>

                    <div className="flex items-center space-x-2">
                      
                      {/* Copy APA button */}
                      <button
                        onClick={() => copyCitation(pub)}
                        id={`btn-cite-${pub.id}`}
                        className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all select-none outline-none ${
                          isCopied 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-250' 
                            : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                        title="Copiar cita en formato APA"
                      >
                        {isCopied ? (
                          <>
                            <ClipboardCheck className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Copiado</span>
                          </>
                        ) : (
                          <>
                            <Quote className="h-3.5 w-3.5 text-slate-400" />
                            <span>Citar APA</span>
                          </>
                        )}
                      </button>

                      {/* Official Journal DOI link */}
                      {pub.link && (
                        <a
                          href={pub.link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 text-indigo-700 hover:text-indigo-900 transition"
                        >
                          <Link className="h-3.5 w-3.5" />
                          <span>Visitar URL</span>
                        </a>
                      )}
                    </div>
                  </div>

                </motion.div>
              );
            })}

            {/* Empty Search Result page */}
            {filteredPublications.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16 bg-white border border-slate-200 rounded-2xl"
              >
                <div className="max-w-xs mx-auto space-y-3">
                  <span className="text-4xl">🔬</span>
                  <h4 className="font-display font-semibold text-slate-800">No se encontraron artículos</h4>
                  <p className="text-xs text-slate-400">Intente modificar los términos de búsqueda o cambiar el filtro de categorías.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}
