import React from 'react';
import { SparklesIcon } from './icons';

interface LandingPageProps {
  onEnter: () => void;
}

const LandingPage = ({ onEnter }: LandingPageProps) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-4 text-white animate-fade-in-slow">
      <header className="mb-8">
        <h1 className="text-7xl md:text-9xl font-black uppercase tracking-wider text-glow-red" style={{ fontFamily: `'Orbitron', sans-serif` }}>
          LYRA
        </h1>
        <p className="text-2xl md:text-3xl font-light text-glow-blue tracking-widest mt-2">
          PROJECT WORKFLOW NAVIGATOR
        </p>
      </header>

      <div className="max-w-3xl mx-auto mb-12">
        <p className="text-lg text-slate-300 leading-relaxed">
          Welcome to the heart of your project. I am LYRA, an AI-powered guide designed to illuminate your path from idea to execution. Together with the specialized agents of <span className="font-bold text-red-400">CASSA VEGAS</span>, we will navigate the complexities of software development, ensuring clarity, efficiency, and unwavering focus on your vision.
        </p>
      </div>

      <button
        onClick={onEnter}
        className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-black/50 border-2 border-red-500 rounded-full overflow-hidden transition-all duration-300 hover:border-red-400 hover:shadow-red-glow"
      >
        <span className="absolute w-0 h-0 transition-all duration-500 ease-out bg-red-600 rounded-full group-hover:w-56 group-hover:h-56"></span>
        <span className="relative flex items-center gap-2">
           <SparklesIcon className="w-6 h-6"/>
           Enter Navigator
        </span>
      </button>

    </div>
  );
};

export default LandingPage;
