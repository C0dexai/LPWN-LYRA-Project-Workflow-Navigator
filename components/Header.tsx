import React from 'react';

interface HeaderProps {
  activeView: 'workflow' | 'agents' | 'orchestration' | 'operator';
}

const Header = ({ activeView }: HeaderProps) => {
  const headers = {
    workflow: {
      title: 'LYRA Project Navigator',
      gradient: 'from-blue-400 to-purple-500',
      description: 'Welcome. I am LYRA, here to be the heart of your project. Together, let\'s illuminate the path forward and bring your vision to life. Select any activity below, and I will offer my guidance.',
    },
    agents: {
      title: 'CASSA VEGAS',
      gradient: 'from-red-500 to-yellow-400',
      description: 'Code. Loyalty. Family. Worldwide. Meet the crew.',
    },
    orchestration: {
      title: 'A2A Orchestration',
      gradient: 'from-purple-400 to-fuchsia-500',
      description: 'Supervised, autonomous collaboration between AI agents across distinct operational domains.',
    },
    operator: {
      title: 'System Operator',
      gradient: 'from-teal-400 to-cyan-500',
      description: 'AI-assisted application building and orchestration. Describe your application, and the system will construct it from the template registry.',
    },
  };

  const currentHeader = headers[activeView];

  return (
    <header className="text-center pt-8 pb-4 text-slate-200">
      <h1 className={`text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${currentHeader.gradient} mb-2`}>
        {currentHeader.title}
      </h1>
      <p className="text-lg text-slate-400 max-w-3xl mx-auto">
        {currentHeader.description}
      </p>
    </header>
  );
};

export default Header;