import React from 'react';

export interface Activity {
  name: string;
}

export interface WorkflowPhase {
  phase: number;
  title: string;
  goal: string;
  activities: Activity[];
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export interface Agent {
  name: string;
  gender: 'Male' | 'Female';
  role: string;
  skills: string[];
  voice_style: string;
  personality: string;
  personality_prompt: string;
}

export interface AgentFamily {
  organization: string;
  headquarters: string;
  creed: string;
  members: Agent[];
  protocols: {
    orchestration: string;
    loyalty: string;
    motto: string;
  };
  colors: {
    primary: string;
    accent: string;
    neutral: string;
  };
}

export interface ChatMessage {
  author: 'user' | 'agent';
  text: string;
  timestamp: number;
}

export interface OrchestrationLogEntry {
  source: 'System' | 'Lyra' | 'Kara' | 'Meta-Agent';
  message: string;
  timestamp: string;
}

// Types for System Operator View
export interface Template {
  path: string;
  tags: string[];
}

export interface TemplateRegistry {
  TEMPLATES: { [key: string]: Template };
  UI: { [key: string]: Template };
  DATASTORE: { [key: string]: Template };
}

export interface HandoverEntry {
  action: 'create' | 'command' | 'feature-add' | 'error';
  by: string;
  at: string;
  details: {
    command?: string;
    status?: 'success' | 'failure';
    message?: string;
    [key: string]: any;
  };
}

export type ContainerStatus = 'initialized' | 'installing' | 'building' | 'running' | 'error' | 'success';

export interface FsNode {
  name: string;
  type: 'file' | 'directory';
  content?: string;
  children?: { [name: string]: FsNode };
}

export interface Container {
  id: string;
  operator: string;
  prompt: string;
  chosen_templates: {
    base: string;
    ui: string[];
    datastore: string[];
  };
  status: ContainerStatus;
  created_at: string;
  history: HandoverEntry[];
  filesystem: FsNode;
  currentPath: string;
}