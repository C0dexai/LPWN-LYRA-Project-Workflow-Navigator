import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Agent, ChatMessage } from '../types';
import { SparklesIcon, XIcon, UsersIcon, MicrophoneIcon, SpeakerWaveIcon } from './icons';
import { getAgentResponse } from '../services/geminiService';
import { getAgentChat, saveAgentChat } from '../services/dbService';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const SpeechRecognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

interface AgentInteractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: Agent | null;
}

const AgentInteractionModal = ({ isOpen, onClose, agent }: AgentInteractionModalProps) => {
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  const speak = useCallback((text: string, agent: Agent | null) => {
    if (!agent || typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    const targetGender = agent.gender === 'Male' ? 'male' : 'female';
    
    // Prioritize high-quality voices, then match gender, then fallback to any English voice
    // The .gender property on SpeechSynthesisVoice is non-standard; we check the name for gender keywords instead.
    const selectedVoice = voices.find(voice => voice.name.includes('Google') && voice.lang.startsWith('en') && voice.name.toLowerCase().includes(targetGender)) 
        || voices.find(voice => voice.lang.startsWith('en') && voice.name.toLowerCase().includes(targetGender))
        || voices.find(voice => voice.lang.startsWith('en'));

    if (selectedVoice) {
        utterance.voice = selectedVoice;
    }
    
    utterance.pitch = 1;
    utterance.rate = 1;

    window.speechSynthesis.speak(utterance);
  }, [voices]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, isLoading]);

  useEffect(() => {
    if (agent && isOpen) {
      const loadHistory = async () => {
        const history = await getAgentChat(agent.name);
        setChatHistory(history || []);
      };
      loadHistory();
    } else if (!isOpen) {
      window.speechSynthesis.cancel();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      const timer = setTimeout(() => {
        setUserInput('');
        setChatHistory([]);
        setIsLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, agent]);

  useEffect(() => {
    const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        if (availableVoices.length > 0) {
            setVoices(availableVoices);
        }
    };
    
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
    
    return () => {
        window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);
  
  useEffect(() => {
    if (!SpeechRecognition) {
      console.warn("Speech Recognition API not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
       const transcript = event.results[0][0].transcript;
       setUserInput(prev => (prev.trim() ? prev + ' ' : '') + transcript.trim());
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  const handleToggleListening = () => {
    if (!recognitionRef.current || isLoading) return;
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch(e) {
          console.error("Could not start recognition:", e);
      }
    }
  };
  
  const handleGenerate = useCallback(async () => {
    if (!agent || !userInput.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      author: 'user',
      text: userInput.trim(),
      timestamp: Date.now(),
    };
    
    const newHistoryWithUserMessage = [...chatHistory, userMessage];
    setChatHistory(newHistoryWithUserMessage);
    setIsLoading(true);
    setUserInput('');

    try {
      const result = await getAgentResponse(agent, userMessage.text);
      const agentMessage: ChatMessage = { author: 'agent', text: result, timestamp: Date.now() };
      const finalHistory = [...newHistoryWithUserMessage, agentMessage];
      setChatHistory(finalHistory);
      await saveAgentChat(agent.name, finalHistory);
      speak(result, agent);
    } catch (error) {
      console.error(error);
      const errorMessage: ChatMessage = { author: 'agent', text: 'An error occurred. Please try again.', timestamp: Date.now() };
      const finalHistory = [...newHistoryWithUserMessage, errorMessage];
      setChatHistory(finalHistory);
      await saveAgentChat(agent.name, finalHistory);
    } finally {
      setIsLoading(false);
    }
  }, [agent, userInput, isLoading, chatHistory, speak]);
  
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleGenerate();
    }
  };

  if (!agent) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className={`bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col p-6 relative transition-all duration-300 ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors" aria-label="Close">
          <XIcon className="w-6 h-6" />
        </button>
        
        <div className="flex-shrink-0 flex items-center gap-4 border-b border-slate-700 pb-4">
          <div className="bg-red-500/10 p-2 rounded-lg border border-red-500/30">
             <UsersIcon className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Chat with {agent.name}</h2>
            <p className="text-slate-400 mt-1">{agent.role}</p>
          </div>
        </div>

        <div ref={chatContainerRef} className="flex-grow my-4 overflow-y-auto pr-2 space-y-6">
          {chatHistory.map((msg, index) => (
            <div key={index} className={`flex items-end gap-2 ${msg.author === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`w-full max-w-lg p-3 rounded-xl ${msg.author === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-300 rounded-bl-none'}`}>
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              </div>
              {msg.author === 'agent' && (
                <button 
                  onClick={() => speak(msg.text, agent)}
                  className="p-1 text-slate-400 hover:text-white transition-colors self-center mb-1 flex-shrink-0"
                  aria-label="Read message aloud"
                >
                  <SpeakerWaveIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-end gap-2 justify-start">
               <div className="p-3 rounded-xl bg-slate-700 text-slate-300 rounded-bl-none">
                 <div className="flex items-center justify-center gap-2">
                    <span className="h-2 w-2 bg-red-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="h-2 w-2 bg-red-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="h-2 w-2 bg-red-400 rounded-full animate-bounce"></span>
                 </div>
               </div>
            </div>
          )}
        </div>

        <div className="mt-auto flex-shrink-0 flex items-center gap-2">
            <div className="flex-grow w-full bg-slate-700 border border-slate-600 rounded-lg flex items-center pr-2 focus-within:ring-2 focus-within:ring-red-500 focus-within:border-red-500 transition">
              <textarea
                id="userInput"
                rows={1}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask ${agent.name}...`}
                className="flex-grow w-full bg-transparent p-3 text-slate-200 placeholder-slate-500 focus:outline-none resize-none"
                disabled={isLoading}
              />
              <button
                onClick={handleToggleListening}
                disabled={isLoading || !recognitionRef.current}
                className={`p-2 rounded-full transition-colors duration-200 ${isListening ? 'bg-red-600 text-white animate-pulse' : 'text-slate-400 hover:bg-slate-600'}`}
                aria-label={isListening ? 'Stop listening' : 'Start listening'}
              >
                  <MicrophoneIcon className="w-5 h-5" />
              </button>
            </div>
          <button
            onClick={handleGenerate}
            disabled={isLoading || !userInput.trim()}
            className="bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold p-3 rounded-lg flex items-center justify-center gap-2 hover:from-red-700 hover:to-rose-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Send Message"
          >
            <SparklesIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentInteractionModal;