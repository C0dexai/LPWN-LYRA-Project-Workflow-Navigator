import React, { useState, useEffect, useRef } from 'react';
import type { Container, HandoverEntry, ContainerStatus, FsNode } from '../types';
import { getDebugSuggestion, getTerminalAIResponse } from '../services/geminiService';
import { SparklesIcon, XIcon, FileIcon, FolderIcon } from './icons';

// --- VFS UTILS ---
const getNodeByPath = (path: string, root: FsNode): FsNode | null => {
    if (path === '/') return root;
    const parts = path.split('/').filter(p => p);
    let currentNode: FsNode | undefined = root;
    for (const part of parts) {
        if (currentNode?.type === 'directory' && currentNode.children && currentNode.children[part]) {
            currentNode = currentNode.children[part];
        } else {
            return null;
        }
    }
    return currentNode || null;
};

const resolvePath = (currentPath: string, targetPath: string): string => {
    if (!targetPath) return currentPath;
    const isAbsolute = targetPath.startsWith('/');
    const baseParts = isAbsolute ? [] : currentPath.split('/').filter(p => p);
    const targetParts = targetPath.split('/').filter(p => p);

    for (const part of targetParts) {
        if (part === '..') {
            baseParts.pop();
        } else if (part !== '.') {
            baseParts.push(part);
        }
    }
    const newPath = '/' + baseParts.join('/');
    return newPath;
};

// Helper to immutably update the filesystem for adding/removing nodes
const modifyNodeChildren = (root: FsNode, path: string, modifier: (children: { [name: string]: FsNode }) => { [name: string]: FsNode }): FsNode => {
    const newRoot = JSON.parse(JSON.stringify(root)); // Deep clone
    const nodeToModify = getNodeByPath(path, newRoot);

    if (nodeToModify && nodeToModify.type === 'directory') {
        if (!nodeToModify.children) nodeToModify.children = {};
        nodeToModify.children = modifier(nodeToModify.children);
    }
    return newRoot;
};


// --- TERMINAL COMPONENT ---
interface TerminalProps {
    container: Container;
    onUpdateContainer: (updatedContainer: Container) => void;
}
const Terminal = ({ container, onUpdateContainer }: TerminalProps) => {
    const [history, setHistory] = useState<{ input: string; output: React.ReactNode }[]>([]);
    const [input, setInput] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const endOfTerminalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endOfTerminalRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history]);

    const executeCommand = async (commandStr: string) => {
        const [command, ...args] = commandStr.trim().split(' ');
        let output: React.ReactNode = `command not found: ${command}`;

        const updateFilesystem = (newFs: FsNode) => onUpdateContainer({ ...container, filesystem: newFs });
        const updateCurrentPath = (newPath: string) => onUpdateContainer({ ...container, currentPath: newPath });

        switch(command) {
            case '':
                output = null;
                break;
            case 'help':
                output = (
                    <div className="text-slate-300">
                        <p className="font-bold">Available Commands:</p>
                        <ul className="list-disc list-inside">
                            <li><span className="text-teal-400">help</span>: Show this help message.</li>
                            <li><span className="text-teal-400">ls</span>: List directory contents.</li>
                            <li><span className="text-teal-400">cd [path]</span>: Change directory.</li>
                             <li><span className="text-teal-400">pwd</span>: Print working directory.</li>
                            <li><span className="text-teal-400">cat [file]</span>: Display file content.</li>
                            <li><span className="text-teal-400">touch [file]</span>: Create a new empty file.</li>
                            <li><span className="text-teal-400">mkdir [dir]</span>: Create a new directory.</li>
                            <li><span className="text-teal-400">clear</span>: Clear the terminal screen.</li>
                            <li><span className="text-teal-400">php webconsole.php</span>: Simulate PHP webconsole.</li>
                            <li><span className="text-teal-400">python script.py</span>: Simulate Python script execution.</li>
                            <li><span className="text-teal-400">ai [prompt]</span>: Ask the AI assistant for help.</li>
                        </ul>
                    </div>
                );
                break;
            case 'clear':
                setHistory([]);
                return;
            case 'ls':
                const node = getNodeByPath(container.currentPath, container.filesystem);
                if (node?.type === 'directory' && node.children) {
                    const children = Object.values(node.children);
                     if (children.length === 0) {
                        output = null;
                    } else {
                        output = children.map(child => (
                            <span key={child.name} className={`${child.type === 'directory' ? 'text-blue-400' : 'text-slate-300'} mr-4`}>{child.name}</span>
                        ));
                    }
                } else {
                    output = `ls: cannot access '${container.currentPath}': Not a directory`;
                }
                break;
            case 'pwd':
                output = container.currentPath;
                break;
            case 'cat':
                const catPath = resolvePath(container.currentPath, args[0] || '');
                const fileNode = getNodeByPath(catPath, container.filesystem);
                if (fileNode?.type === 'file') {
                    output = <pre className="whitespace-pre-wrap">{fileNode.content || '(empty file)'}</pre>;
                } else {
                    output = `cat: ${args[0]}: No such file or not a file`;
                }
                break;
            case 'cd':
                const newPath = resolvePath(container.currentPath, args[0] || '/');
                const targetNode = getNodeByPath(newPath, container.filesystem);
                if (targetNode && targetNode.type === 'directory') {
                    updateCurrentPath(newPath);
                    output = null;
                } else {
                    output = `cd: no such file or directory: ${args[0] || ''}`;
                }
                break;
            case 'mkdir':
                const dirName = args[0];
                if (!dirName) {
                    output = 'mkdir: missing operand';
                    break;
                }
                 if (/[/\\]/.test(dirName)) {
                    output = `mkdir: invalid directory name: ${dirName}`;
                    break;
                }
                const currentDir = getNodeByPath(container.currentPath, container.filesystem);
                if (currentDir?.children?.[dirName]) {
                    output = `mkdir: cannot create directory ‘${dirName}’: File exists`;
                } else {
                    const newFs = modifyNodeChildren(container.filesystem, container.currentPath, (children) => ({
                        ...children,
                        [dirName]: { name: dirName, type: 'directory', children: {} }
                    }));
                    updateFilesystem(newFs);
                    output = null;
                }
                break;
             case 'touch':
                const fileName = args[0];
                if (!fileName) {
                    output = 'touch: missing file operand';
                    break;
                }
                if (/[/\\]/.test(fileName)) {
                    output = `touch: invalid file name: ${fileName}`;
                    break;
                }
                const parentDir = getNodeByPath(container.currentPath, container.filesystem);
                if (parentDir?.children?.[fileName]) {
                    output = null; // Touching existing file does nothing in this sim
                } else {
                    const newFs = modifyNodeChildren(container.filesystem, container.currentPath, (children) => ({
                        ...children,
                        [fileName]: { name: fileName, type: 'file', content: '' }
                    }));
                    updateFilesystem(newFs);
                    output = null;
                }
                break;
            case 'ai':
                setIsAiLoading(true);
                const aiPrompt = args.join(' ');
                try {
                    const aiResponse = await getTerminalAIResponse(aiPrompt, container.filesystem, container.currentPath);
                    output = <div className="whitespace-pre-wrap">{aiResponse}</div>
                } catch(e: any) {
                    output = `AI Error: ${e.message}`;
                } finally {
                    setIsAiLoading(false);
                }
                break;
            case 'php':
                if (args[0] === 'webconsole.php' && getNodeByPath(resolvePath(container.currentPath, 'webconsole.php'), container.filesystem)) {
                    output = 'Simulated PHP execution: Webconsole active. Host directory structure bridged.';
                } else {
                    output = 'php: script not found.';
                }
                break;
             case 'python':
                if (args[0] === 'script.py' && getNodeByPath(resolvePath(container.currentPath, 'script.py'), container.filesystem)) {
                    output = 'Simulated Python execution: script.py finished successfully.';
                } else {
                    output = 'python: script not found.';
                }
                break;
        }
        
        if (output !== null) {
          setHistory(h => [...h, { input: commandStr, output }]);
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            executeCommand(input);
            setInput('');
        }
    };

    return (
        <div className="bg-slate-900 h-96 flex flex-col font-mono text-sm p-3 rounded-b-lg lg:rounded-bl-lg lg:rounded-br-none" onClick={e => e.currentTarget.querySelector('input')?.focus()}>
            <div className="flex-grow overflow-y-auto pr-2">
                {history.map((line, index) => (
                    <div key={index}>
                        <div className="flex items-center">
                            <span className="text-cyan-400">andoy@{container.id.slice(0, 8)}:{container.currentPath}$</span>
                            <span className="pl-2 text-slate-100">{line.input}</span>
                        </div>
                        <div className="text-slate-300 pl-1">{line.output}</div>
                    </div>
                ))}
                {isAiLoading && <div className="text-purple-400">Codex is thinking...</div>}
                <div ref={endOfTerminalRef} />
            </div>
            <div className="flex items-center pt-2">
                <span className="text-cyan-400">andoy@{container.id.slice(0, 8)}:{container.currentPath}$</span>
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isAiLoading}
                    className="flex-grow bg-transparent text-slate-200 outline-none pl-2"
                    autoFocus
                />
            </div>
        </div>
    );
};

// --- FILE EXPLORER COMPONENT ---
interface FileExplorerProps {
    filesystem: FsNode;
}
const FileSystemNode = ({ node, level }: { node: FsNode; level: number }) => {
    const [isOpen, setIsOpen] = useState(level === 0);

    if (node.type === 'directory') {
        return (
            <div style={{ paddingLeft: `${level * 1}rem` }}>
                <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 text-slate-300 hover:text-white w-full text-left py-1">
                    <FolderIcon className="w-4 h-4 text-sky-400 flex-shrink-0" />
                    <span className="truncate">{node.name === '/' ? 'root' : node.name}</span>
                </button>
                {isOpen && node.children && (
                    <div>
                        {Object.values(node.children).sort((a,b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name)).map(child => (
                            <FileSystemNode key={child.name} node={child} level={level + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    }
    return (
        <div style={{ paddingLeft: `${level * 1}rem` }} className="flex items-center gap-2 text-slate-400 py-1">
            <FileIcon className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <span className="truncate">{node.name}</span>
        </div>
    );
};
const FileExplorer = ({ filesystem }: FileExplorerProps) => (
    <div className="bg-slate-800/80 h-96 overflow-y-auto p-3 rounded-b-lg lg:rounded-br-lg lg:rounded-bl-none font-sans text-sm">
        <FileSystemNode node={filesystem} level={0} />
    </div>
);


// --- CONTAINER EXPLORER (LAYOUT) ---
interface ContainerExplorerProps {
    container: Container;
    onUpdateContainer: (updatedContainer: Container) => void;
}
const ContainerExplorer = ({ container, onUpdateContainer }: ContainerExplorerProps) => {
    return (
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 bg-slate-700/50 rounded-lg">
            <Terminal container={container} onUpdateContainer={onUpdateContainer} />
            <FileExplorer filesystem={container.filesystem} />
        </div>
    );
};


// --- MAIN CONTAINER CARD ---
const ContainerCard = ({ container, onUpdateContainer, onDeleteContainer }: { container: Container; onUpdateContainer: (updatedContainer: Container) => void; onDeleteContainer: (containerId: string) => void; }) => {
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [isDebugging, setIsDebugging] = useState(false);
  const [debugSuggestion, setDebugSuggestion] = useState('');

  const statusStyles: { [key in ContainerStatus]: { border: string; bg: string; text: string; } } = {
    initialized: { border: 'border-slate-500', bg: 'bg-slate-500', text: 'text-slate-300' },
    installing: { border: 'border-yellow-500', bg: 'bg-yellow-500', text: 'text-yellow-300' },
    building: { border: 'border-yellow-500', bg: 'bg-yellow-500', text: 'text-yellow-300' },
    running: { border: 'border-green-500', bg: 'bg-green-500', text: 'text-green-300' },
    success: { border: 'border-green-500', bg: 'bg-green-500', text: 'text-green-300' },
    error: { border: 'border-red-500', bg: 'bg-red-500', text: 'text-red-300' },
  };
  const currentStatusStyle = statusStyles[container.status];

  const runCommand = (command: 'npm install' | 'npm run build' | 'npm start', duration: number, successChance: number, nextStatus: ContainerStatus, loadingStatus: ContainerStatus) => {
    let updatedContainer = { ...container };
    const newHistory: HandoverEntry = {
      action: 'command', by: 'andoy', at: new Date().toISOString(), details: { command }
    };
    updatedContainer = { ...updatedContainer, status: loadingStatus, history: [...updatedContainer.history, newHistory] };
    onUpdateContainer(updatedContainer);

    setTimeout(() => {
      const isSuccess = Math.random() < successChance;
      if (isSuccess) {
        newHistory.details.status = 'success';
        updatedContainer.status = nextStatus;

        if (command === 'npm run build') {
            const buildOutput: FsNode = {
                name: 'dist', type: 'directory', children: {
                    'index.html': { name: 'index.html', type: 'file', content: '<!-- Production Build -->'},
                    'assets': { name: 'assets', type: 'directory', children: {
                        'index.js': { name: 'index.js', type: 'file', content: '/* Minified JS */' },
                        'index.css': { name: 'index.css', type: 'file', content: '/* Minified CSS */' },
                    }}
                }
            };
            updatedContainer.filesystem = modifyNodeChildren(updatedContainer.filesystem, '/', (children) => ({
                ...children,
                'dist': buildOutput
            }));
            newHistory.details.message = 'Build successful. Output generated in /dist directory.';
        }
      } else {
        newHistory.details.status = 'failure';
        newHistory.details.message = `Simulated error during ${command}. Check logs for details.`;
        updatedContainer.status = 'error';
      }
      onUpdateContainer({ ...updatedContainer, history: [...container.history, newHistory] });
    }, duration);
  };

  const handleDebug = async () => {
      setIsDebugging(true);
      setDebugSuggestion('');
      try {
        const suggestion = await getDebugSuggestion(container.history);
        setDebugSuggestion(suggestion);
      } catch (e) {
        setDebugSuggestion('Failed to get debug suggestions. Please try again.');
      } finally {
        setIsDebugging(false);
      }
  };

  return (
    <div className={`bg-slate-800/60 border ${currentStatusStyle.border}/50 rounded-xl p-4 transition-all duration-300`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs text-slate-400 font-mono">ID: {container.id}</p>
          <p className="text-sm text-slate-300 mt-1">Prompt: "{container.prompt}"</p>
        </div>
        <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${currentStatusStyle.bg}/20 ${currentStatusStyle.text}`}>{container.status.toUpperCase()}</span>
             <button onClick={() => onDeleteContainer(container.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                <XIcon className="w-4 h-4" />
            </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-4 text-xs">
        <span className="font-bold text-slate-400">Templates:</span>
        <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded">{container.chosen_templates.base}</span>
        {container.chosen_templates.ui.map(t => <span key={t} className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded">{t}</span>)}
        {container.chosen_templates.datastore.map(t => <span key={t} className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded">{t}</span>)}
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        <button onClick={() => runCommand('npm install', 3000, 0.9, 'success', 'installing')} disabled={container.status !== 'initialized'} className="text-xs bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-200 px-3 py-1 rounded-md transition">Install</button>
        <button onClick={() => runCommand('npm run build', 4000, 0.85, 'success', 'building')} disabled={container.status !== 'success'} className="text-xs bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-200 px-3 py-1 rounded-md transition">Build</button>
        <button onClick={() => runCommand('npm start', 2000, 0.95, 'running', 'building')} disabled={container.status !== 'success'} className="text-xs bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-200 px-3 py-1 rounded-md transition">Start</button>
        <button onClick={handleDebug} disabled={container.status !== 'error' || isDebugging} className="text-xs bg-red-500/50 hover:bg-red-500/80 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-red-200 px-3 py-1 rounded-md transition">{isDebugging ? 'Analyzing...' : 'Debug'}</button>
         <button onClick={() => setIsExplorerOpen(!isExplorerOpen)} className="text-xs bg-teal-500/50 hover:bg-teal-500/80 text-teal-200 px-3 py-1 rounded-md transition">
            {isExplorerOpen ? 'Close' : 'Explore'}
        </button>
      </div>
      
      {debugSuggestion && (
         <div className="mt-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
            <h4 className="font-bold text-teal-400 mb-2">Debugging Suggestion</h4>
            <div className="text-sm text-slate-300 whitespace-pre-wrap">{debugSuggestion}</div>
         </div>
      )}

      <div className="mt-4">
        <button onClick={() => setIsHistoryVisible(!isHistoryVisible)} className="text-sm text-slate-400 hover:text-white">
          {isHistoryVisible ? 'Hide' : 'Show'} Build History
        </button>
        {isHistoryVisible && (
          <div className="mt-2 p-3 bg-slate-900/70 rounded-lg font-mono text-xs text-slate-300 max-h-48 overflow-y-auto">
            {container.history.map((entry, index) => (
              <div key={index} className={`py-1 ${entry.details.status === 'failure' ? 'text-red-400' : ''}`}>
                <span className="text-slate-500 mr-2">[{new Date(entry.at).toLocaleTimeString()}]</span>
                <span className="font-bold mr-2">{entry.action.toUpperCase()}</span>
                <span>{entry.details.command || JSON.stringify(entry.details)}</span>
                 {entry.details.message && <div className="pl-4 text-slate-400">↳ {entry.details.message}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {isExplorerOpen && <ContainerExplorer container={container} onUpdateContainer={onUpdateContainer} />}
    </div>
  );
};

export default ContainerCard;
