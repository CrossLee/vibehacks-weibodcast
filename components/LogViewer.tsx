import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';
import { Terminal, CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface LogViewerProps {
  logs: LogEntry[];
  isExpanded?: boolean;
}

const LogViewer: React.FC<LogViewerProps> = ({ logs, isExpanded = true }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      default: return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const getColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-blue-300';
    }
  };

  return (
    <div className={`w-full bg-slate-900 border border-slate-700 rounded-lg overflow-hidden shadow-2xl transition-all duration-300 ${isExpanded ? 'opacity-100 scale-100' : 'opacity-0 scale-95 hidden'}`}>
      <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-mono text-slate-400">WEIBO_SPIDER_PROCESS_LOG</span>
        </div>
        <div className="flex space-x-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
        </div>
      </div>
      
      <div 
        ref={scrollRef}
        className="h-64 overflow-y-auto p-4 font-mono text-xs md:text-sm space-y-1.5 bg-slate-900/95"
      >
        {logs.length === 0 && (
            <div className="text-slate-600 italic">Waiting for process to start...</div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="flex items-start space-x-3 hover:bg-slate-800/50 p-0.5 rounded">
            <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
            <span className="shrink-0 mt-0.5">{getIcon(log.type)}</span>
            <span className={`${getColor(log.type)} break-all`}>{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LogViewer;