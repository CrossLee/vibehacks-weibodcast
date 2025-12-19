import React from 'react';
import { History, Play, Trash2, Clock, Music } from 'lucide-react';
import { PodcastResult } from '../types';

interface HistoryListProps {
  history: PodcastResult[];
  activeId?: string;
  onSelect: (item: PodcastResult) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

const HistoryList: React.FC<HistoryListProps> = ({ history, activeId, onSelect, onDelete, onClear }) => {
  if (history.length === 0) {
    return (
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-3">
        <History className="w-10 h-10 text-slate-600" />
        <p className="text-slate-500 text-sm">No history yet.<br/>Your generated podcasts will appear here.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg flex flex-col h-full max-h-[600px]">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-300 flex items-center">
          <History className="w-4 h-4 mr-2 text-pink-500" />
          History ({history.length})
        </h3>
        <button 
          onClick={onClear}
          className="text-[10px] text-slate-500 hover:text-red-400 transition-colors uppercase tracking-wider font-bold"
        >
          Clear All
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-hide">
        {history.sort((a, b) => b.timestamp - a.timestamp).map((item) => (
          <div 
            key={item.id}
            onClick={() => onSelect(item)}
            className={`group relative p-3 rounded-lg border cursor-pointer transition-all duration-200 
              ${activeId === item.id 
                ? 'bg-pink-500/10 border-pink-500/50' 
                : 'bg-slate-900/50 border-slate-700 hover:border-slate-500 hover:bg-slate-800'
              }`}
          >
            <div className="flex items-start justify-between space-x-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center text-[10px] text-slate-500 mb-1">
                  <Clock className="w-3 h-3 mr-1" />
                  {new Date(item.timestamp).toLocaleString()}
                </div>
                <h4 className={`text-sm font-medium truncate ${activeId === item.id ? 'text-pink-400' : 'text-slate-200'}`}>
                  {item.title}
                </h4>
              </div>
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                    className="p-1.5 text-slate-500 hover:text-red-400 rounded-md hover:bg-slate-700"
                 >
                    <Trash2 className="w-3.5 h-3.5" />
                 </button>
              </div>
            </div>
            
            {activeId === item.id && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-pink-500 rounded-r-full" />
            )}
            
            <div className="mt-2 flex items-center justify-between">
               <div className="flex items-center text-[10px] text-slate-500 font-mono">
                  <Music className="w-3 h-3 mr-1 text-slate-600" />
                  {item.audioUrl ? 'Audio Ready' : 'Text Only'}
               </div>
               {activeId === item.id && <Play className="w-3 h-3 text-pink-500 animate-pulse" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryList;