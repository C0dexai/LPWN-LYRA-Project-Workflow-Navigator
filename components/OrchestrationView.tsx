import React, { useState, useEffect, useRef } from 'react';
import { getOrchestrationLog } from '../services/geminiService';
import type { OrchestrationLogEntry } from '../types';
import { SparklesIcon, GitBranchIcon, UsersIcon } from './icons';

const OrchestrationView = () => {
  const [topic, setTopic] = useState('Agile Sprint Planning workflow update');
  const [isLoading, setIsLoading] = useState(false);
  const [log, setLog] = useState<OrchestrationLogEntry[]>([]);
  const [displayedLog, setDisplayedLog] = useState<OrchestrationLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (displayedLog.length < log.length) {
      const timer = setTimeout(() => {
        setDisplayedLog(log.slice(0, displayedLog.length + 1));
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [log, displayedLog]);
  
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [displayedLog]);

  const handleInitiateSync = async () => {
    if (!topic.trim()) return;
    setIsLoading(true);
    setLog([]);
    setDisplayedLog([]);
    setError(null);
    try {
      const result = await getOrchestrationLog(topic);
      setLog(result);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to run orchestration. Please check the console.');
    } finally {
      setIsLoading(false);
    }
  };

  const getSourceStyles = (source: OrchestrationLogEntry['source']) => {
    switch (source) {
      case 'Lyra':
        return 'bg-blue-500/10 border border-blue-500/30 text-blue-300';
      case 'Kara':
        return 'bg-red-500/10 border border-red-500/30 text-red-300';
      case 'System':
        return 'bg-slate-600/20 border border-slate-600/30 text-slate-400';
      case 'Meta-Agent':
        return 'bg-purple-500/10 border border-purple-500/30 text-purple-300';
      default:
        return 'bg-slate-700 border-slate-600';
    }
  };

  return (
    <div className="animate-fade-in-up">
      <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 mb-8 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
        <h2 className="text-xl font-bold text-slate-100 mb-2">Orchestration Control</h2>
        <p className="text-slate-400 mb-4">Define a topic for knowledge synchronization and initiate the A2A workflow.</p>
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., A new security protocol"
            className="flex-grow bg-slate-700 border border-slate-600 rounded-md p-3 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
          />
          <button
            onClick={handleInitiateSync}
            disabled={isLoading || !topic}
            className="bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 hover:from-purple-700 hover:to-fuchsia-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Orchestrating..." : <><SparklesIcon className="w-5 h-5" /> Initiate Sync</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-11 gap-4 lg:gap-8 items-center mb-8">
        <div className="lg:col-span-5 bg-slate-800/50 p-6 rounded-2xl border border-blue-500/30 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
          <h3 className="text-lg font-bold text-blue-400">Domain A: Project Workflow</h3>
          <p className="text-slate-400 text-sm mb-4">Managed by Lyra, focusing on guidance, planning, and project clarity.</p>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-500/20"><UsersIcon className="w-6 h-6 text-blue-300"/></div>
            <span className="font-semibold text-slate-200">Agent: Lyra</span>
          </div>
        </div>
        
        <div className="lg:col-span-1 flex justify-center items-center">
            <div className="w-full h-0.5 bg-slate-700 relative lg:w-0.5 lg:h-24">
                <div className="absolute inset-0 flex items-center justify-center">
                    <GitBranchIcon className="w-10 h-10 text-slate-500 bg-gray-900 px-1"/>
                </div>
            </div>
        </div>

        <div className="lg:col-span-5 bg-slate-800/50 p-6 rounded-2xl border border-red-500/30 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
          <h3 className="text-lg font-bold text-red-400">Domain B: CASSA VEGAS Ops</h3>
          <p className="text-slate-400 text-sm mb-4">Managed by Kara, ensuring financial integrity and operational efficiency.</p>
           <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-red-500/20"><UsersIcon className="w-6 h-6 text-red-300"/></div>
            <span className="font-semibold text-slate-200">Agent: Kara</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
        <h2 className="text-xl font-bold text-slate-100 mb-4">Orchestration Ledger</h2>
        <div ref={logContainerRef} className="h-96 bg-slate-900/70 rounded-lg p-4 overflow-y-auto font-mono text-sm space-y-3">
            {displayedLog.map((entry, index) => (
                <div key={index} className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start animate-fade-in">
                    <div className="flex items-center gap-4 flex-shrink-0">
                        <span className="w-20 text-slate-500">[{new Date(entry.timestamp).toLocaleTimeString()}]</span>
                        <span className={`font-semibold w-24 text-center py-0.5 rounded text-xs ${getSourceStyles(entry.source)}`}>{entry.source}</span>
                    </div>
                    <p className="flex-grow text-slate-300 leading-relaxed break-words">{entry.message}</p>
                </div>
            ))}
            {isLoading && displayedLog.length === 0 && (
                 <div className="flex items-center justify-center h-full text-slate-400">
                    <SparklesIcon className="w-10 h-10 animate-spin text-purple-500" />
                    <p className="mt-4 ml-4">Waiting for Meta-Agent supervision...</p>
                 </div>
            )}
            {error && (
                <div className="flex items-center justify-center h-full text-red-400 p-4 text-center">
                    <p>{error}</p>
                </div>
            )}
            {!isLoading && log.length === 0 && !error && (
                <div className="flex items-center justify-center h-full text-slate-500">
                    <p>Ledger is awaiting a new synchronization task.</p>
                </div>
            )}
        </div>
      </div>
      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.5s ease-out forwards; }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
};
export default OrchestrationView;