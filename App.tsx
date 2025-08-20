import React, { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import WorkflowPhaseCard from './components/WorkflowPhaseCard';
import GeminiInteractionModal from './components/GeminiInteractionModal';
import AgentsView from './components/AgentsView';
import OrchestrationView from './components/OrchestrationView';
import SystemOperatorView from './components/SystemOperatorView';
import LandingPage from './components/LandingPage';
import { WORKFLOW_PHASES } from './constants';
import type { Activity } from './types';
import { LightbulbIcon, UsersIcon, GitBranchIcon, TerminalSquareIcon } from './components/icons';
import { initDB } from './services/dbService';

const App = () => {
  const [appState, setAppState] = useState<'landing' | 'main'>('landing');
  const [activeView, setActiveView] = useState<'workflow' | 'agents' | 'orchestration' | 'operator'>('workflow');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  useEffect(() => {
    initDB();
  }, []);

  const handleEnterApp = useCallback(() => {
    setAppState('main');
  }, []);

  const handleActivityClick = useCallback((activity: Activity) => {
    setSelectedActivity(activity);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedActivity(null);
  }, []);
  
  const NavButton = ({ isActive, onClick, children, activeClass, inactiveClass }: {
    isActive: boolean;
    onClick: () => void;
    children: React.ReactNode;
    activeClass: string;
    inactiveClass: string;
  }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 font-semibold rounded-t-lg border-b-2 transition-colors duration-300 ${
        isActive
          ? activeClass
          : inactiveClass
      }`}
      aria-current={isActive ? 'page' : undefined}
    >
      {children}
    </button>
  );

  if (appState === 'landing') {
    return <LandingPage onEnter={handleEnterApp} />;
  }

  return (
    <div className="min-h-screen text-white antialiased animate-fade-in-main">
      <div className="relative z-10 container mx-auto px-4 py-8">
        <a href="/" aria-label="Home" className="brand-link absolute top-8 right-4 z-20">
            <img
                src="https://andiegogiap.com/assets/aionex-icon-256.png"
                alt="AIONEX"
                width="128"
                height="128"
                style={{height: '40px', width: 'auto', display: 'block'}}
                loading="eager"
                decoding="async"
            />
        </a>
        <Header activeView={activeView} />
        
        <nav className="flex justify-center border-b border-slate-700/50 mb-8" role="navigation">
          <NavButton 
            isActive={activeView === 'workflow'} 
            onClick={() => setActiveView('workflow')}
            activeClass="border-blue-500 text-white"
            inactiveClass="border-transparent text-slate-400 hover:text-white hover:border-slate-600"
          >
            <LightbulbIcon className="w-5 h-5" />
            <span>Workflow Navigator</span>
          </NavButton>
          <NavButton 
            isActive={activeView === 'agents'} 
            onClick={() => setActiveView('agents')}
            activeClass="border-red-500 text-white"
            inactiveClass="border-transparent text-slate-400 hover:text-white hover:border-slate-600"
          >
            <UsersIcon className="w-5 h-5" />
            <span>Cassa Vegas Family</span>
          </NavButton>
          <NavButton 
            isActive={activeView === 'orchestration'} 
            onClick={() => setActiveView('orchestration')}
            activeClass="border-purple-500 text-white"
            inactiveClass="border-transparent text-slate-400 hover:text-white hover:border-slate-600"
          >
            <GitBranchIcon className="w-5 h-5" />
            <span>Orchestration</span>
          </NavButton>
          <NavButton 
            isActive={activeView === 'operator'} 
            onClick={() => setActiveView('operator')}
            activeClass="border-teal-500 text-white"
            inactiveClass="border-transparent text-slate-400 hover:text-white hover:border-slate-600"
          >
            <TerminalSquareIcon className="w-5 h-5" />
            <span>System Operator</span>
          </NavButton>
        </nav>

        {activeView === 'workflow' && (
          <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {WORKFLOW_PHASES.map((phase) => (
              <WorkflowPhaseCard 
                key={phase.phase} 
                phase={phase} 
                onActivityClick={handleActivityClick}
              />
            ))}
          </main>
        )}

        {activeView === 'agents' && <AgentsView />}
        
        {activeView === 'orchestration' && <OrchestrationView />}
        
        {activeView === 'operator' && <SystemOperatorView />}

      </div>

      <GeminiInteractionModal
        isOpen={isModalOpen}
        onClose={closeModal}
        activity={selectedActivity}
      />
    </div>
  );
};

export default App;