import React from 'react';
import type { WorkflowPhase, Activity } from '../types';
import { SparklesIcon } from './icons';

interface WorkflowPhaseCardProps {
  phase: WorkflowPhase;
  onActivityClick: (activity: Activity) => void;
}

const colorVariants: { [key: string]: { border: string; text: string; bg: string; icon: string; hoverBorder: string; } } = {
  blue: {
    border: 'border-blue-500/50',
    text: 'text-blue-400',
    bg: 'bg-blue-500/10',
    icon: 'text-blue-400',
    hoverBorder: 'hover:border-blue-500/80',
  },
  purple: {
    border: 'border-purple-500/50',
    text: 'text-purple-400',
    bg: 'bg-purple-500/10',
    icon: 'text-purple-400',
    hoverBorder: 'hover:border-purple-500/80',
  },
  green: {
    border: 'border-green-500/50',
    text: 'text-green-400',
    bg: 'bg-green-500/10',
    icon: 'text-green-400',
    hoverBorder: 'hover:border-green-500/80',
  },
  yellow: {
    border: 'border-yellow-500/50',
    text: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    icon: 'text-yellow-400',
    hoverBorder: 'hover:border-yellow-500/80',
  },
};

const WorkflowPhaseCard = ({ phase, onActivityClick }: WorkflowPhaseCardProps) => {
  const colors = colorVariants[phase.color] || colorVariants.blue;

  return (
    <div
      className={`bg-slate-800/50 backdrop-blur-sm border ${colors.border} rounded-2xl p-6 flex flex-col h-full transition-all duration-300 ${colors.hoverBorder} shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]`}
    >
      <div className="flex items-start gap-4 mb-4">
        <div className={`p-2 rounded-lg ${colors.bg}`}>
          <phase.icon className={`w-8 h-8 ${colors.icon}`} />
        </div>
        <div>
          <h2 className={`text-xl font-bold ${colors.text}`}>Phase {phase.phase}: {phase.title}</h2>
          <p className="text-sm text-slate-400 mt-1">
            <span className="font-semibold">Goal:</span> {phase.goal}
          </p>
        </div>
      </div>

      <div className="mt-4 flex-grow">
        <h3 className="text-md font-semibold text-slate-300 mb-3">Key Activities:</h3>
        <ul className="space-y-2">
          {phase.activities.map((activity) => (
            <li
              key={activity.name}
              onClick={() => onActivityClick(activity)}
              className="group flex items-center justify-between p-2 rounded-md hover:bg-slate-700/50 cursor-pointer transition-colors duration-200"
            >
              <span className="text-slate-300 group-hover:text-white">{activity.name}</span>
              <SparklesIcon className={`w-5 h-5 ${colors.text} opacity-0 group-hover:opacity-100 transition-opacity duration-200`} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default WorkflowPhaseCard;