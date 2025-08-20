import React, { useState, useCallback } from 'react';
import { AGENT_FAMILY } from '../constants';
import AgentCard from './AgentCard';
import type { Agent } from '../types';
import AgentInteractionModal from './AgentInteractionModal';

const AgentsView = () => {
  const [activeTab, setActiveTab] = useState<'All' | 'Male' | 'Female'>('All');
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const handleAgentClick = useCallback((agent: Agent) => {
    setSelectedAgent(agent);
    setIsAgentModalOpen(true);
  }, []);

  const closeAgentModal = useCallback(() => {
    setIsAgentModalOpen(false);
    // Delay setting agent to null to allow for fade-out animation
    setTimeout(() => setSelectedAgent(null), 300);
  }, []);

  const filteredAgents = AGENT_FAMILY.members.filter(agent => {
    if (activeTab === 'All') return true;
    return agent.gender === activeTab;
  });

  const getTabClass = (tabName: 'All' | 'Male' | 'Female') => {
    return `px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-red-500 ${
      activeTab === tabName
        ? 'bg-red-600 text-white shadow-md'
        : 'text-slate-300 hover:bg-slate-700/50'
    }`;
  };

  return (
    <div className="animate-fade-in-up">
      <div className="flex justify-center mb-8">
        <div className="flex space-x-2 bg-slate-800/80 p-1 rounded-lg" role="tablist" aria-label="Filter Agents">
          <button id="tab-all" role="tab" aria-selected={activeTab === 'All'} aria-controls="panel-all" onClick={() => setActiveTab('All')} className={getTabClass('All')}>All Members</button>
          <button id="tab-male" role="tab" aria-selected={activeTab === 'Male'} aria-controls="panel-male" onClick={() => setActiveTab('Male')} className={getTabClass('Male')}>Male</button>
          <button id="tab-female" role="tab" aria-selected={activeTab === 'Female'} aria-controls="panel-female" onClick={() => setActiveTab('Female')} className={getTabClass('Female')}>Female</button>
        </div>
      </div>
      <div role="tabpanel" id={`panel-${activeTab.toLowerCase()}`} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredAgents.map((agent: Agent) => (
          <AgentCard key={agent.name} agent={agent} onCardClick={handleAgentClick} />
        ))}
      </div>
      
      <AgentInteractionModal
        isOpen={isAgentModalOpen}
        onClose={closeAgentModal}
        agent={selectedAgent}
      />

      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
            animation: fade-in-up 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default AgentsView;
