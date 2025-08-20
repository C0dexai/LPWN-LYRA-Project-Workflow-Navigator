import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TEMPLATE_REGISTRY } from '../constants';
import type { Container, Template, HandoverEntry, ContainerStatus, FsNode } from '../types';
import { getContainers, saveContainers } from '../services/dbService';
import { parseBuildPrompt, getDebugSuggestion } from '../services/geminiService';
import { SparklesIcon, XIcon } from './icons';
import ContainerCard from './ContainerCard';

// Filesystem generation logic
const REACT_VITE_FS: FsNode = {
  name: '/', type: 'directory', children: {
    'public': { name: 'public', type: 'directory', children: { 'vite.svg': { name: 'vite.svg', type: 'file', content: '<svg xmlns="http://www.w3.org/2000/svg" ...></svg>' } } },
    'src': {
      name: 'src', type: 'directory', children: {
        'components': { name: 'components', type: 'directory', children: {} },
        'App.css': { name: 'App.css', type: 'file', content: '/* CSS for App */' },
        'App.tsx': { name: 'App.tsx', type: 'file', content: 'import React from "react";\n\nconst App = () => <div>Hello World</div>;\n\nexport default App;' },
        'index.css': { name: 'index.css', type: 'file', content: '/* Main CSS */' },
        'main.tsx': { name: 'main.tsx', type: 'file', content: 'import React from "react";\nimport ReactDOM from "react-dom/client";\nimport App from "./App.tsx";\n\nReactDOM.createRoot(document.getElementById("root")!).render(<App />);' },
      }
    },
    '.gitignore': { name: '.gitignore', type: 'file', content: 'node_modules\ndist' },
    'index.html': { name: 'index.html', type: 'file', content: '<!DOCTYPE html><html><head><title>React App</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>' },
    'package.json': { name: 'package.json', type: 'file', content: '{\n  "name": "react-app",\n  "private": true,\n  "version": "0.0.0",\n  "type": "module",\n  "scripts": {\n    "dev": "vite",\n    "build": "vite build",\n    "start": "vite preview"\n  },\n  "dependencies": {\n    "react": "^18.2.0",\n    "react-dom": "^18.2.0"\n  },\n  "devDependencies": {\n    "@types/react": "^18.0.27",\n    "@types/react-dom": "^18.0.10",\n    "@vitejs/plugin-react": "^3.1.0",\n    "typescript": "^4.9.3",\n    "vite": "^4.1.0"\n  }\n}' },
    'tsconfig.json': { name: 'tsconfig.json', type: 'file', content: '{ "compilerOptions": { "target": "ESNext", "useDefineForClassFields": true, "lib": ["DOM", "DOM.Iterable", "ESNext"], "allowJs": false, "skipLibCheck": true, "esModuleInterop": false, "allowSyntheticDefaultImports": true, "strict": true, "forceConsistentCasingInFileNames": true, "module": "ESNext", "moduleResolution": "Node", "resolveJsonModule": true, "isolatedModules": true, "noEmit": true, "jsx": "react-jsx" }, "include": ["src"], "references": [{ "path": "./tsconfig.node.json" }] }' },
    'vite.config.js': { name: 'vite.config.js', type: 'file', content: 'import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\n\nexport default defineConfig({ plugins: [react()] });' },
    'webconsole.php': { name: 'webconsole.php', type: 'file', content: '<?php echo "Webconsole active."; ?>' },
    'script.py': { name: 'script.py', type: 'file', content: 'print("Python script executed.")' },
  }
};

const VANILLA_FS: FsNode = {
  name: '/', type: 'directory', children: {
    'src': {
      name: 'src', type: 'directory', children: {
        'index.js': { name: 'index.js', type: 'file', content: 'console.log("Hello, World!");' },
        'styles.css': { name: 'styles.css', type: 'file', content: 'body { font-family: sans-serif; }' },
      }
    },
    'index.html': { name: 'index.html', type: 'file', content: '<!DOCTYPE html><html><body><script src="/src/index.js"></script></body></html>' },
    'package.json': { name: 'package.json', type: 'file', content: '{\n  "name": "vanilla-app",\n  "version": "1.0.0"\n}' },
  }
};


export const createInitialFileSystem = (templates: { base: string; ui: string[]; datastore: string[] }): FsNode => {
  const fs = JSON.parse(JSON.stringify(templates.base.includes('REACT') ? REACT_VITE_FS : VANILLA_FS));

  if (templates.ui.includes('TAILWIND') && fs.children) {
    fs.children['tailwind.config.js'] = { name: 'tailwind.config.js', type: 'file', content: '/** @type {import(\'tailwindcss\').Config} */\nmodule.exports = { content: ["./src/**/*.{js,jsx,ts,tsx}"], theme: { extend: {}, }, plugins: [], }' };
  }
  
  if (templates.datastore.includes('IndexedDB') && fs.children && fs.children['src']?.children) {
     fs.children['src'].children['db.js'] = { name: 'db.js', type: 'file', content: '// IndexedDB setup code' };
  }

  return fs;
};


// Sub-component for displaying a template category
const TemplateRegistryCard = ({ title, templates, color }: { title: string; templates: { [key: string]: Template }; color: string }) => (
  <div className={`bg-slate-800/50 border border-${color}-500/30 rounded-xl p-4`}>
    <h3 className={`text-lg font-bold text-${color}-400 mb-3`}>{title}</h3>
    <div className="space-y-2">
      {Object.entries(templates).map(([key, template]) => (
        <div key={key} className="bg-slate-700/50 p-2 rounded-md">
          <p className="font-semibold text-slate-200">{key}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {template.tags.map(tag => (
              <span key={tag} className="text-xs bg-slate-600 text-slate-300 px-2 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const SystemOperatorView = () => {
  const [prompt, setPrompt] = useState('');
  const [containers, setContainers] = useState<Container[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const savedContainers = await getContainers();
      if (savedContainers) {
        setContainers(savedContainers);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (containers.length > 0) {
      saveContainers(containers);
    }
  }, [containers]);
  
  const handleUpdateContainer = (updatedContainer: Container) => {
    setContainers(prev => prev.map(c => c.id === updatedContainer.id ? updatedContainer : c));
  };

  const handleDeleteContainer = (containerId: string) => {
    setContainers(prev => prev.filter(c => c.id !== containerId));
  }

  const handleInitiateBuild = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const chosen_templates = await parseBuildPrompt(prompt);
      const filesystem = createInitialFileSystem(chosen_templates);
      const newContainer: Container = {
        id: `cntr_${Math.random().toString(36).substr(2, 16)}`,
        operator: 'andoy',
        prompt,
        chosen_templates,
        status: 'initialized',
        created_at: new Date().toISOString(),
        history: [{
          action: 'create',
          by: 'andoy',
          at: new Date().toISOString(),
          details: { ...chosen_templates }
        }],
        filesystem,
        currentPath: '/',
      };
      setContainers(prev => [...prev, newContainer]);
      setPrompt('');
    } catch (e: any) {
      setError(e.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in-up">
      {/* Left Column: Template Registry */}
      <div className="lg:col-span-1 space-y-4">
        <h2 className="text-xl font-bold text-slate-100">Template Registry</h2>
        <TemplateRegistryCard title="Base Templates" templates={TEMPLATE_REGISTRY.TEMPLATES} color="blue" />
        <TemplateRegistryCard title="UI Libraries" templates={TEMPLATE_REGISTRY.UI} color="purple" />
        <TemplateRegistryCard title="Datastores" templates={TEMPLATE_REGISTRY.DATASTORE} color="green" />
      </div>

      {/* Right Column: Operator Console */}
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Operator Console</h2>
          <div className="mt-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <label htmlFor="build-prompt" className="block text-sm font-medium text-slate-300 mb-1">
              Describe the application to build:
            </label>
            <textarea
              id="build-prompt"
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., 'Build a fancy to-do app with React, Tailwind, and IndexedDB'"
              className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
            />
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            <button
              onClick={handleInitiateBuild}
              disabled={isLoading || !prompt}
              className="w-full mt-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 hover:from-teal-600 hover:to-cyan-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Analyzing..." : <><SparklesIcon className="w-5 h-5" /> Initiate Build</>}
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-100 mb-4">Active Containers</h2>
          <div className="space-y-4">
            {containers.length > 0 ? (
                [...containers].reverse().map(container => (
                    <ContainerCard 
                        key={container.id} 
                        container={container} 
                        onUpdateContainer={handleUpdateContainer}
                        onDeleteContainer={handleDeleteContainer}
                    />
                ))
            ) : (
              <div className="text-center py-10 border-2 border-dashed border-slate-700 rounded-xl text-slate-500">
                <p>No active containers.</p>
                <p className="text-sm">Use the console to initiate a new build.</p>
              </div>
            )}
          </div>
        </div>
      </div>
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

export default SystemOperatorView;