import React, { useState, useEffect, useCallback } from 'react';
import type { Activity } from '../types';
import { SparklesIcon, XIcon } from './icons';
import { getDetailedSuggestions } from '../services/geminiService';
import { getSuggestion, saveSuggestion } from '../services/dbService';

interface GeminiInteractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: Activity | null;
}

const GeminiInteractionModal = ({ isOpen, onClose, activity }: GeminiInteractionModalProps) => {
  const [projectContext, setProjectContext] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState('');

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal is closed
      setProjectContext('');
      setSuggestion('');
      setIsLoading(false);
    } else if (activity) {
      // When modal opens, try to load a cached suggestion in the background
      const loadCachedSuggestion = async () => {
        const cachedSuggestion = await getSuggestion(activity.name);
        if (cachedSuggestion) {
          setSuggestion(cachedSuggestion);
        }
      };
      loadCachedSuggestion();
    }
  }, [isOpen, activity]);

  const handleGenerate = useCallback(async () => {
    if (!activity) return;
    setIsLoading(true);
    try {
      const result = await getDetailedSuggestions(activity.name, projectContext);
      setSuggestion(result);
      await saveSuggestion(activity.name, result);
    } catch (error) {
      console.error(error);
      setSuggestion('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [activity, projectContext]);

  if (!isOpen || !activity) {
    return null;
  }

  const formattedSuggestion = suggestion.split('\n').map((line, index) => {
    line = line.replace(/^\s*-\s*/, '');
    if (line.trim() === '') return null;
    return (
      <li key={index} className="flex items-start gap-3">
        <span className="text-blue-400 mt-1.5">&#8226;</span>
        <span>{line}</span>
      </li>
    );
  });

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity duration-300"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col p-6 relative animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
          <XIcon className="w-6 h-6" />
        </button>
        
        <div className="flex-shrink-0">
          <h2 className="text-2xl font-bold text-slate-100">Ask LYRA</h2>
          <p className="text-slate-400 mt-1">Let's expand on: <span className="font-semibold text-blue-400">{activity.name}</span></p>
        </div>

        <div className="mt-4 flex-shrink-0">
          <label htmlFor="projectContext" className="block text-sm font-medium text-slate-300 mb-1">
            Briefly describe your project (optional)
          </label>
          <input
            id="projectContext"
            type="text"
            value={projectContext}
            onChange={(e) => setProjectContext(e.target.value)}
            placeholder="e.g., a social media app for pet owners"
            className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>

        <div className="mt-4 flex-grow overflow-y-auto pr-2">
            {isLoading && !suggestion ? (
                 <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                    <SparklesIcon className="w-10 h-10 animate-spin text-blue-500" />
                    <p className="mt-4">LYRA is thinking...</p>
                 </div>
            ) : suggestion && (
                 <div className="bg-slate-900/50 rounded-lg p-4">
                    <h3 className="font-semibold text-slate-200 mb-2">Here are some suggestions:</h3>
                    <ul className="text-slate-300 space-y-2">{formattedSuggestion}</ul>
                 </div>
            )}
        </div>


        <div className="mt-6 flex-shrink-0">
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:from-blue-600 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Generating..." : <><SparklesIcon className="w-5 h-5" /> Generate Suggestions</>}
          </button>
        </div>
      </div>
       <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
            animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default GeminiInteractionModal;
