import React, { useState, useEffect } from 'react';
import { AppStatus, LogEntry, PodcastResult as PodcastResultType, SpeakerSegment } from './types';
import LogViewer from './components/LogViewer';
import InputSection from './components/InputSection';
import PodcastResult from './components/PodcastResult';
import HistoryList from './components/HistoryList';
import VoiceLab from './components/VoiceLab';
import { simulateScraping } from './services/weiboService';
import { parseScript } from './services/scriptUtils';
import { generatePodcastScript } from './services/bailianService';
import { uploadFileToMiniMax, generateMiniMaxAudio } from './services/minimaxService';
import { generateMiniMaxTTS } from './services/minimaxTTSService';
import { concatenateAudioBuffers } from './services/audioUtils';
import { Radio, Github, Mic2, LayoutDashboard, PlayCircle, Bug, Image } from 'lucide-react';
import { WEIBO_PRESETS } from './constants';
import MusicPlayer from './components/MusicPlayer';
import SpiderLab from './components/SpiderLab';
import ImageDance from './components/ImageLab';

type ViewMode = 'podcast' | 'voicelab' | 'player' | 'spider' | 'imagelab';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>('podcast');
  
  // Podcast Generator State
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [result, setResult] = useState<PodcastResultType | null>(null);
  
  // History State
  const [history, setHistory] = useState<PodcastResultType[]>([]);

  // Pre-filled content from SpiderLab
  const [initialContent, setInitialContent] = useState<string | undefined>(undefined);

  // Load history metadata from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('weibodcast_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Note: audioUrl won't work after refresh, but metadata is kept
        setHistory(parsed.map((p: any) => ({ ...p, audioUrl: undefined })));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  // Save history metadata to localStorage whenever it changes
  useEffect(() => {
    const metadataOnly = history.map(({ audioUrl, ...rest }) => rest);
    localStorage.setItem('weibodcast_history', JSON.stringify(metadataOnly));
  }, [history]);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    };
    setLogs(prev => [...prev, newLog]);
  };

  const handleStart = async (userId: string, file: File | null, apiKey?: string, groupId?: string) => {
    setStatus(AppStatus.SCRAPING);
    setLogs([]);
    setResult(null);

    const podcastId = Math.random().toString(36).substring(7);

    try {
      let scrapedContent = initialContent;
      
      // 1. Scrape (Only if no initial content provided)
      if (!scrapedContent) {
        addLog(`Initializing scraping process for user: ${userId}...`, 'info');
        scrapedContent = await simulateScraping(userId, (log) => setLogs(prev => [...prev, log]));
      } else {
        addLog(`Using pre-scraped content from Spider Lab.`, 'success');
        // Reset initial content after use so next run uses ID unless set again
        setInitialContent(undefined);
      }
      
      // 2. Generate Script
      setStatus(AppStatus.GENERATING_SCRIPT);
      addLog(`Sending to Aliyun Bailian for script generation...`, 'info');
      // Ensure scrapedContent is treated as string (it should be)
      const { title, script } = await generatePodcastScript(scrapedContent || '', (msg) => addLog(msg, 'info'));
      
      const intermediateResult: PodcastResultType = { 
        id: podcastId, 
        timestamp: Date.now(), 
        title, 
        script 
      };
      setResult(intermediateResult);
      addLog(`Script generated successfully: "${title}"`, 'success');

      // 3. Generate Audio
      setStatus(AppStatus.GENERATING_AUDIO);
      
      let finalAudioUrl: string;

      // Determine keys to use (passed from UI or environment)
      // Note: vite.config.ts define replaces process.env.MINIMAX_API_KEY with JSON.stringify(env.MINIMAX_API_KEY)
      const effectiveApiKey = apiKey || process.env.MINIMAX_API_KEY;
      const effectiveGroupId = groupId || process.env.MINIMAX_GROUP_ID;

      // Check if we have cloning capabilities
      const canClone = !!(file && effectiveApiKey && effectiveGroupId);
      const canUseMiniMaxTTS = !!(effectiveApiKey && effectiveGroupId);

      addLog(`Audio Generation Mode: ${canClone ? 'MiniMax Voice Cloning' : 'MiniMax Standard TTS'}`, 'info');
      
      if (!canUseMiniMaxTTS) {
          throw new Error("MiniMax API Key and Group ID are required for audio generation.");
      }

      // Unified Segment Generation Logic
      const segments = parseScript(script);
      addLog(`Parsed script into ${segments.length} segments.`, 'info');
      
      const audioBuffers: ArrayBuffer[] = [];
      const timeline: SpeakerSegment[] = [];
      let currentTime = 0;
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      let fileId: string | undefined;

      // If cloning is possible, upload the file first
      if (canClone && file) {
          addLog(`Uploading reference audio to MiniMax...`, 'info');
          try {
             fileId = await uploadFileToMiniMax(file, effectiveApiKey, effectiveGroupId, (msg) => addLog(msg, 'info'));
             addLog(`File uploaded successfully. ID: ${fileId}`, 'success');
          } catch (e: any) {
             addLog(`MiniMax Upload Failed: ${e.message}. Fallback to Standard TTS for Guest.`, 'error');
             // Proceed without cloning (fileId undefined)
          }
      }

      for (let i = 0; i < segments.length; i++) {
          const { speaker, text } = segments[i];
          if (!text || text.trim().length === 0) {
              addLog(`Skipping empty segment ${i+1}/${segments.length}`, 'warning');
              continue;
          }

          addLog(`Generating Segment ${i+1}/${segments.length} (${speaker})...`, 'info');
          
          let buffer: ArrayBuffer | null = null;
          
          try {
            if (speaker === 'Host') {
                // HOST: Always try MiniMax TTS
                const result = await generateMiniMaxTTS(text, effectiveApiKey, effectiveGroupId, 'Chinese (Mandarin)_Soft_Girl', (msg) => addLog(msg, 'info'));
                buffer = result.buffer;
            } else {
                // GUEST: Try Cloning -> MiniMax Preset
                if (fileId && effectiveApiKey && effectiveGroupId) {
                    // Option A: Cloning
                    try {
                        const result = await generateMiniMaxAudio(text, fileId, effectiveApiKey, effectiveGroupId, (msg) => addLog(msg, 'info'));
                        buffer = result.buffer;
                    } catch (e: any) {
                        addLog(`MiniMax Clone Error: ${e.message}. Fallback to Preset.`, 'warning');
                        // Fallback to Preset
                        const result = await generateMiniMaxTTS(text, effectiveApiKey, effectiveGroupId, 'female-shaonv', (msg) => addLog(msg, 'info'));
                        buffer = result.buffer;
                    }
                } else {
                    // Option B: MiniMax Preset (Standard Mode Guest)
                    // Use a female voice or distinct male voice for Guest
                    const result = await generateMiniMaxTTS(text, effectiveApiKey, effectiveGroupId, 'female-shaonv', (msg) => addLog(msg, 'info'));
                    buffer = result.buffer;
                }
            }

            if (buffer && buffer.byteLength > 0) {
                audioBuffers.push(buffer);
                
                // Calculate duration for timeline
                try {
                    // Clone buffer for decoding as it might be neutered
                    const tempBuffer = buffer.slice(0);
                    const audioBuffer = await audioContext.decodeAudioData(tempBuffer);
                    const duration = audioBuffer.duration;
                    
                    timeline.push({
                        speaker: speaker as 'Host' | 'Guest',
                        startTime: currentTime,
                        endTime: currentTime + duration
                    });
                    
                    // Add small padding to prevent overlap glitch
                    currentTime += duration;
                    
                    addLog(`Timeline: ${speaker} [${currentTime.toFixed(2)}s]`, 'info');
                } catch (e) {
                    addLog(`Warning: Failed to decode segment ${i+1} for timeline. Animation may be out of sync.`, 'warning');
                    console.warn("Failed to decode audio for timeline", e);
                }
            } else {
                addLog(`Generated empty audio buffer for segment ${i+1}. Skipping.`, 'error');
            }
          } catch (e: any) {
             addLog(`Failed to generate audio for segment ${i+1}: ${e.message}`, 'error');
          }
      }
      
      if (audioBuffers.length === 0) {
          throw new Error("No valid audio segments were generated. Please check logs for API errors.");
      }

      addLog(`Stitching ${audioBuffers.length} audio segments...`, 'info');
      const finalBlob = await concatenateAudioBuffers(audioBuffers);
      
      if (!(finalBlob instanceof Blob)) {
          throw new Error(`Concatenation failed: Result is not a Blob (Got: ${typeof finalBlob})`);
      }
      
      console.log("Final Blob:", finalBlob);
      finalAudioUrl = URL.createObjectURL(finalBlob);
      
      const preset = WEIBO_PRESETS.find(p => p.id === userId);
      const guestName = preset ? preset.name : 'Guest';

      const finalResult: PodcastResultType = { 
        ...intermediateResult, 
        audioUrl: finalAudioUrl,
        timeline,
        guestName
      };
      setResult(finalResult);
      setHistory(prev => [finalResult, ...prev]);
      
      addLog(`Audio synthesis complete.`, 'success');
      setStatus(AppStatus.COMPLETED);

    } catch (error: any) {
      console.error(error);
      setStatus(AppStatus.ERROR);
      addLog(`Error: ${error.message || 'Unknown error occurred'}`, 'error');
    }
  };

  const handleSelectHistory = (item: PodcastResultType) => {
    setResult(item);
    // Smooth scroll to top/result section if mobile
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteHistory = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
    if (result?.id === id) setResult(null);
  };

  const handleClearHistory = () => {
    if (confirm("Are you sure you want to clear your entire history?")) {
        setHistory([]);
        localStorage.removeItem('weibodcast_history');
    }
  };

  const handleSpiderConvert = (content: string) => {
    setInitialContent(content);
    setView('podcast');
    // We don't auto-start here because we need the user to potentially select a voice file
    // But we could auto-fill the InputSection state if we lifted that state up.
    // For now, let's just switch view and let the user click generate. 
    // Ideally, InputSection should show "Content Ready" state.
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-pink-500/30">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/20 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-pink-900/20 blur-[100px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col md:flex-row items-center justify-between mb-12 space-y-4 md:space-y-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <Radio className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                Weibodcast
              </h1>
              <p className="text-xs text-slate-500 font-mono tracking-wider">WEIBO TO PODCAST</p>
            </div>
          </div>
          
          <div className="flex items-center bg-slate-800/80 p-1 rounded-lg border border-slate-700/50 backdrop-blur-sm">
             <button
                onClick={() => setView('podcast')}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    view === 'podcast' 
                    ? 'bg-slate-700 text-white shadow' 
                    : 'text-slate-400 hover:text-white'
                }`}
             >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Generator
             </button>
             <button
                onClick={() => setView('voicelab')}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    view === 'voicelab' 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow' 
                    : 'text-slate-400 hover:text-white'
                }`}
             >
                <Mic2 className="w-4 h-4 mr-2" />
                Voice Lab
             </button>
             <button
                onClick={() => setView('spider')}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    view === 'spider' 
                    ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white shadow' 
                    : 'text-slate-400 hover:text-white'
                }`}
             >
                <Bug className="w-4 h-4 mr-2" />
                Spider Lab
             </button>
             <button
                onClick={() => setView('imagelab')}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    view === 'imagelab' 
                    ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow' 
                    : 'text-slate-400 hover:text-white'
                }`}
             >
                <Image className="w-4 h-4 mr-2" />
                Image Lab
             </button>
             <button
                onClick={() => setView('player')}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    view === 'player' 
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow' 
                    : 'text-slate-400 hover:text-white'
                }`}
             >
                <PlayCircle className="w-4 h-4 mr-2" />
                Player
             </button>
          </div>

          <a href="#" className="text-slate-500 hover:text-white transition-colors hidden md:block">
            <Github className="w-6 h-6" />
          </a>
        </header>

        {view === 'podcast' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
                {/* Left Column: Input & History */}
                <div className="lg:col-span-4 space-y-6">
                    <InputSection 
                        status={status} 
                        onStart={handleStart} 
                        initialContentProvided={!!initialContent}
                    />
                    
                    <HistoryList 
                        history={history} 
                        activeId={result?.id} 
                        onSelect={handleSelectHistory} 
                        onDelete={handleDeleteHistory}
                        onClear={handleClearHistory}
                    />

                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 text-xs text-slate-400 space-y-2">
                        <p className="font-semibold text-slate-300">Technology Stack:</p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li>Spider: Simulated (ID based)</li>
                            <li>Script: Aliyun Bailian</li>
                            <li>Synthesis: MiniMax</li>
                        </ul>
                    </div>
                </div>

                {/* Right Column: Logs & Result */}
                <div className="lg:col-span-8 space-y-6">
                    {(status !== AppStatus.IDLE && status !== AppStatus.COMPLETED) && (
                        <LogViewer logs={logs} isExpanded={true} />
                    )}

                    {result && (
                        <PodcastResult 
                            title={result.title} 
                            script={result.script} 
                            audioUrl={result.audioUrl}
                            id={result.id}
                            timeline={result.timeline}
                            guestName={result.guestName}
                            history={history}
                        />
                    )}

                    {!result && status === AppStatus.IDLE && (
                      <div className="flex flex-col items-center justify-center h-96 bg-slate-800/20 border border-slate-700/50 border-dashed rounded-2xl text-slate-500 space-y-4">
                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
                          <Radio className="w-8 h-8 opacity-20" />
                        </div>
                        <p className="text-sm font-medium">Ready to create your first Weibodcast</p>
                      </div>
                    )}
                </div>
            </div>
        ) : view === 'voicelab' ? (
            <VoiceLab />
        ) : view === 'spider' ? (
            <SpiderLab onConvert={handleSpiderConvert} />
        ) : view === 'imagelab' ? (
            <ImageDance />
        ) : (
            <MusicPlayer history={history} initialId={result?.id} />
        )}

      </div>
    </div>
  );
};

export default App;