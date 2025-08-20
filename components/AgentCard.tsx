import React from 'react';
import type { Agent } from '../types';
import { SparklesIcon } from './icons';

interface AgentCardProps {
  agent: Agent;
  onCardClick: (agent: Agent) => void;
}

const AgentCard = ({ agent, onCardClick }: AgentCardProps) => {
  return (
    <div
      onClick={() => onCardClick(agent)}
      onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && onCardClick(agent)}
      className="group bg-slate-800/50 backdrop-blur-sm border border-red-500/30 rounded-2xl p-6 flex flex-col h-full transition-all duration-300 hover:border-red-500/80 cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]"
      role="button"
      tabIndex={0}
      aria-label={`Interact with ${agent.name}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col">
          <h3 className="text-2xl font-bold text-red-400">{agent.name}</h3>
          <p className="text-md text-slate-400">{agent.role}</p>
        </div>
        <SparklesIcon className="w-6 h-6 text-red-400 opacity-0 group-hover:opacity-100 transform group-hover:scale-110 transition-all duration-300" />
      </div>
      <div className="mb-4">
        <h4 className="font-semibold text-slate-300 mb-2">Skills</h4>
        <div className="flex flex-wrap gap-2">
          {agent.skills.map((skill) => (
            <span key={skill} className="bg-slate-700 text-slate-300 text-xs font-medium px-2.5 py-1 rounded-full">
              {skill}
            </span>
          ))}
        </div>
      </div>
      <div className="flex-grow">
        <h4 className="font-semibold text-slate-300 mb-2">Personality</h4>
        <p className="text-slate-400 text-sm">{agent.personality}</p>
      </div>
    </div>
  );
};

export default AgentCard;