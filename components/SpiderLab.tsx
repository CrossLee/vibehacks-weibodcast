import React, { useState } from 'react';
import { Bug, Search, Database, FileText, Wand2, Copy, AlertTriangle, Layout, Globe, Smartphone } from 'lucide-react';
import { LogEntry } from '../types';
import LogViewer from './LogViewer';
import { scrapeWeiboReal } from '../services/weiboServiceSpider';

interface SpiderLabProps {
  onConvert: (content: string) => void;
}

type Platform = 'weibo' | 'x' | 'xhs';

const SpiderLab: React.FC<SpiderLabProps> = ({ onConvert }) => {
  const [platform, setPlatform] = useState<Platform>('weibo');
  const [uid, setUid] = useState('1997678024236994771');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [rawContent, setRawContent] = useState('');
  const [isScraping, setIsScraping] = useState(false);

  const addLog = (log: LogEntry) => setLogs(prev => [...prev, log]);

  const handleScrape = async () => {
    setIsScraping(true);
    setLogs([]);
    setRawContent('');
    
    const internalAddLog = (message: string, type: LogEntry['type'] = 'info') => {
        addLog({
            id: Math.random().toString(36).substring(7),
            timestamp: new Date().toLocaleTimeString(),
            message,
            type
        });
    };

    try {
      if (platform === 'weibo') {
        const content = await scrapeWeiboReal(uid, addLog);
        setRawContent(content);
      } else {
        internalAddLog(`Platform ${platform.toUpperCase()} is currently in development. Showing simulation...`, 'warning');
        await new Promise(r => setTimeout(r, 1500));
        const mockData = `[2024-05-20] Simulation: Content from ${platform.toUpperCase()} for ID ${uid}.\n\n[2024-05-21] Simulation: Another post from ${platform.toUpperCase()}.`;
        setRawContent(mockData);
        internalAddLog(`Simulation complete for ${platform.toUpperCase()}`, 'success');
      }
    } catch (e: any) {
      // Error is logged within the service
    } finally {
      setIsScraping(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(rawContent);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in min-h-[700px]">
      {/* Left Column: Platform & Controls */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl space-y-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
              <Bug className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">Spider Lab</h3>
              <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Content Extraction</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {/* Platform Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Platform</label>
              <div className="relative">
                <select 
                  value={platform} 
                  onChange={(e) => setPlatform(e.target.value as Platform)} 
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500 transition appearance-none" 
                > 
                  <option value="weibo">微博 (Weibo)</option> 
                  <option value="x">X (Twitter)</option> 
                  <option value="xhs">小红书 (Xiaohongshu)</option> 
                </select> 
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-500"> 
                   <Globe className="w-4 h-4" /> 
                </div> 
              </div> 
            </div> 

            {/* ID Input */} 
            <div> 
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Target ID</label> 
              <div className="relative"> 
                <input 
                  type="text" 
                  value={uid} 
                  onChange={(e) => setUid(e.target.value)} 
                  placeholder="Enter User ID" 
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500 transition" 
                /> 
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-500"> 
                   <Smartphone className="w-4 h-4" /> 
                </div> 
              </div> 
            </div> 

            {/* Action Buttons */} 
            <div className="pt-2 space-y-3"> 
              <button 
                onClick={handleScrape} 
                disabled={isScraping || !uid} 
                className="w-full bg-green-600 hover:bg-green-500 disabled:bg-slate-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center space-x-2" 
              > 
                {isScraping ? ( 
                   <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 
                ) : ( 
                  <> 
                    <Search className="w-5 h-5" /> 
                    <span>开始爬取</span> 
                  </> 
                )} 
              </button> 

              <button 
                onClick={() => onConvert(rawContent)} 
                disabled={!rawContent || isScraping} 
                className={`w-full py-3.5 rounded-xl font-bold text-white shadow-xl transition-all flex items-center justify-center space-x-2 
                  ${(!rawContent || isScraping) 
                    ? 'bg-slate-700 cursor-not-allowed opacity-50' 
                    : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500' 
                  }`} 
              > 
                <Wand2 className="w-5 h-5" /> 
                <span>生成播客 (Bridge)</span> 
              </button> 
            </div> 
          </div> 
        </div> 

        <div className="bg-slate-800/30 p-5 rounded-2xl border border-slate-700/50"> 
            <h4 className="text-xs font-bold text-slate-300 mb-3 flex items-center uppercase tracking-widest"> 
                <Database className="w-3.5 h-3.5 mr-2 text-blue-400" /> 
                System Info 
            </h4> 
            <div className="space-y-3"> 
              <div className="flex items-center text-[11px] text-slate-500"> 
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2" /> 
                CORS Proxy: Active 
              </div> 
              <p className="text-[10px] text-slate-500 leading-relaxed"> 
                Weibo extraction uses m.weibo.cn mobile API. X and Xiaohongshu require enhanced authorization tokens and are currently in simulation mode. 
              </p> 
            </div> 
        </div> 
      </div> 

      {/* Right Column: Divided Vertically (Logs & Results) */} 
      <div className="lg:col-span-8 flex flex-col space-y-6"> 
        
        {/* Top Part: Execution Logs */} 
        <div className="h-1/2 flex flex-col"> 
          <div className="mb-2 flex items-center justify-between"> 
             <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center"> 
               <Layout className="w-3.5 h-3.5 mr-2" /> 
               Execution Logs 
             </h3> 
          </div> 
          <div className="flex-1 min-h-[250px]"> 
            <LogViewer logs={logs} isExpanded={true} /> 
          </div> 
        </div> 

        {/* Bottom Part: Scraping Results */} 
        <div className="h-1/2 flex flex-col"> 
          <div className="mb-2 flex items-center justify-between"> 
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center"> 
              <FileText className="w-3.5 h-3.5 mr-2" /> 
              Crawling Results 
            </h3> 
            {rawContent && ( 
              <button 
                onClick={copyToClipboard} 
                className="text-[10px] text-slate-400 hover:text-white flex items-center bg-slate-800 px-3 py-1 rounded-lg border border-slate-700 transition-colors" 
              > 
                <Copy className="w-3 h-3 mr-1.5" /> 
                Copy Data 
              </button> 
            )} 
          </div> 
          
          <div className="flex-1 bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden shadow-inner flex flex-col"> 
            <div className="flex-1 p-6 overflow-y-auto font-mono text-xs leading-relaxed scrollbar-hide"> 
              {rawContent ? ( 
                <div className="space-y-4"> 
                  {rawContent.split('\n\n').map((post, idx) => { 
                    // Expecting format: [Time] User: Content 
                    const match = post.match(/^\[(.*?)\] (.*?): (.*)/s); 
                    if (match) { 
                      return ( 
                        <div key={idx} className="group border-b border-slate-800/50 pb-4 last:border-0"> 
                          <div className="flex items-center text-green-500/70 mb-1 group-hover:text-green-400 transition-colors"> 
                            <span className="font-bold mr-2 text-[10px]">时间:</span> 
                            <span>{match[1]}</span> 
                          </div> 
                          <div className="text-slate-300"> 
                             <span className="text-slate-500 font-bold mr-2 text-[10px]">内容:</span> 
                             {match[3]} 
                          </div> 
                        </div> 
                      ); 
                    } 
                    return <div key={idx} className="text-slate-400 mb-2">{post}</div>; 
                  })} 
                </div> 
              ) : ( 
                <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-3 py-10"> 
                  {isScraping ? ( 
                    <div className="flex space-x-1"> 
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} /> 
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} /> 
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} /> 
                    </div> 
                  ) : ( 
                    <> 
                      <FileText className="w-10 h-10 opacity-10" /> 
                      <p className="text-center italic">Waiting for crawling to begin...<br/>Results will be formatted as "Time: Content"</p> 
                    </> 
                  )} 
                </div> 
              )} 
            </div> 
            
            <div className="px-6 py-3 bg-slate-800/50 border-t border-slate-700 flex items-center justify-between text-[10px] text-slate-500"> 
               <span>PLATFORM: {platform.toUpperCase()}</span> 
               <span>ID: {uid || 'NONE'}</span> 
            </div> 
          </div> 
        </div> 

      </div> 
    </div> 
  ); 
}; 

export default SpiderLab;