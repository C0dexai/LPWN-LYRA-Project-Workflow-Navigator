import React, { useState } from 'react';
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
  const [priorityFilter, setPriorityFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');

  const priorityStyles = {
    High: 'bg-red-500',
    Medium: 'bg-yellow-500',
    Low: 'bg-sky-500',
  };

  const activeFilterBg: { [key: string]: string } = {
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
  };

  const filteredAndSortedActivities = (priorityFilter === 'All'
    ? [...phase.activities] // Create a shallow copy to sort
    : phase.activities.filter(a => a.priority === priorityFilter)
  ).sort((a, b) => {
    const priorityOrder = { High: 1, Medium: 2, Low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const FilterButton = ({ level }: { level: 'All' | 'High' | 'Medium' | 'Low' }) => (
    <button
      onClick={(e) => {
        e.stopPropagation(); // Prevent card click which would open the modal
        setPriorityFilter(level);
      }}
      className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
        priorityFilter === level
          ? `${activeFilterBg[phase.color]} text-white font-semibold`
          : 'bg-slate-700/50 hover:bg-slate-600 text-slate-300'
      }`}
    >
      {level}
    </button>
  );

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
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-md font-semibold text-slate-300">Key Activities:</h3>
          <div className="flex space-x-1">
            <FilterButton level="All" />
            <FilterButton level="High" />
            <FilterButton level="Medium" />
            <FilterButton level="Low" />
          </div>
        </div>
        <ul className="space-y-2">
          {filteredAndSortedActivities.length > 0 ? (
            filteredAndSortedActivities.map((activity) => (
              <li
                key={activity.name}
                onClick={() => onActivityClick(activity)}
                className="group flex items-center justify-between p-2 rounded-md hover:bg-slate-700/50 cursor-pointer transition-colors duration-200"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${priorityStyles[activity.priority]}`}
                    title={`Priority: ${activity.priority}`}
                  ></span>
                  <span className="text-slate-300 group-hover:text-white">{activity.name}</span>
                </div>
                <SparklesIcon className={`w-5 h-5 ${colors.text} opacity-0 group-hover:opacity-100 transition-opacity duration-200`} />
              </li>
            ))
          ) : (
            <li className="text-slate-500 text-sm text-center py-4">
              No activities with '{priorityFilter}' priority.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default WorkflowPhaseCard;