import React, { useState, useRef, useEffect } from 'react';
import { PodcastResult } from '../types';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  ListMusic, 
  Disc, 
  Volume2, 
  Music2, 
  Calendar, 
  ChevronRight 
} from 'lucide-react';

interface MusicPlayerProps {
  history: PodcastResult[];
  initialId?: string;
  onClose?: () => void;
  autoPlay?: boolean;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ history, initialId, onClose, autoPlay = false }) => {
  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = history.findIndex(item => item.id === initialId);
    return idx >= 0 ? idx : 0;
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasAutoPlayed = useRef(false);

  const currentPodcast = history[currentIndex];

  // 自动播放
  useEffect(() => {
    if (autoPlay && !hasAutoPlayed.current && audioRef.current && currentPodcast?.audioUrl) {
      hasAutoPlayed.current = true;
      // 延迟一点确保 audio 元素已准备好
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().then(() => {
            setIsPlaying(true);
          }).catch((e) => {
            console.log('Auto-play failed:', e);
            setIsPlaying(false);
          });
        }
      }, 100);
    }
  }, [autoPlay, currentPodcast?.audioUrl]);

  useEffect(() => {
    if (audioRef.current && currentPodcast?.audioUrl) {
      audioRef.current.load();
      if (isPlaying) {
        audioRef.current.play().catch(() => setIsPlaying(false));
      }
    }
  }, [currentIndex, currentPodcast?.audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => setIsPlaying(false));
    }
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % history.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + history.length) % history.length);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const p = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(isNaN(p) ? 0 : p);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const time = (parseFloat(e.target.value) / 100) * audioRef.current.duration;
      audioRef.current.currentTime = time;
      setProgress(parseFloat(e.target.value));
    }
  };

  if (!currentPodcast) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-700/50 border-dashed">
        <Music2 className="w-16 h-16 mb-4 opacity-20" />
        <p>No podcasts in history to play.</p>
      </div>
    );
  }

  return (
    <div className="relative h-[600px] bg-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col md:flex-row animate-fade-in">
      {/* Background Blur Effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-pink-600/30 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full bg-blue-600/30 blur-[120px] animate-pulse" />
      </div>

      <audio 
        ref={audioRef} 
        src={currentPodcast.audioUrl} 
        onTimeUpdate={handleTimeUpdate} 
        onEnded={handleNext} 
        onPlay={() => setIsPlaying(true)} 
        onPause={() => setIsPlaying(false)} 
      />

      {/* Sidebar: Playlist */}
      <div className="w-full md:w-80 border-r border-slate-700/50 flex flex-col z-10 bg-slate-900/40 backdrop-blur-md">
        <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center">
            <ListMusic className="w-5 h-5 mr-2 text-pink-500" />
            Playlist
          </h2>
          <span className="text-xs text-slate-500 font-mono">{history.length} items</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
          {history.map((item, idx) => (
            <button 
              key={item.id} 
              onClick={() => setCurrentIndex(idx)} 
              className={`w-full text-left p-3 rounded-xl transition-all flex items-center space-x-3 group 
                ${idx === currentIndex 
                  ? 'bg-pink-500/10 border border-pink-500/20' 
                  : 'hover:bg-slate-800/50 border border-transparent' 
                }`} 
            > 
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors 
                ${idx === currentIndex ? 'bg-pink-500 text-white' : 'bg-slate-800 text-slate-500 group-hover:text-slate-300'} 
              `}> 
                {idx === currentIndex && isPlaying ? ( 
                  <div className="flex items-end space-x-0.5 h-3"> 
                    <div className="w-1 bg-white animate-[bounce_0.6s_infinite]" style={{height: '60%'}}></div> 
                    <div className="w-1 bg-white animate-[bounce_0.8s_infinite]" style={{height: '100%'}}></div> 
                    <div className="w-1 bg-white animate-[bounce_0.7s_infinite]" style={{height: '80%'}}></div> 
                  </div> 
                ) : ( 
                  <Music2 className="w-5 h-5" /> 
                )} 
              </div> 
              <div className="min-w-0 flex-1"> 
                <p className={`text-sm font-medium truncate ${idx === currentIndex ? 'text-pink-400' : 'text-slate-300'}`}> 
                  {item.title} 
                </p> 
                <div className="flex items-center text-[10px] text-slate-500 mt-1"> 
                  <Calendar className="w-3 h-3 mr-1" /> 
                  {new Date(item.timestamp).toLocaleDateString()} 
                </div> 
              </div> 
              {idx === currentIndex && <ChevronRight className="w-4 h-4 text-pink-500" />} 
            </button> 
          ))} 
        </div> 
      </div> 

      {/* Main Content: Player Disc */} 
      <div className="flex-1 flex flex-col z-10 relative"> 
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center"> 
          {/* Rotating Disc Container */} 
          <div className="relative group"> 
            <div className={`relative w-48 h-48 md:w-56 md:h-56 rounded-full border-[10px] border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden transition-transform duration-700 
              ${isPlaying ? 'animate-[spin_10s_linear_infinite]' : ''} 
            `}> 
              {/* Vinyl Texture */} 
              <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.05)_0%,rgba(0,0,0,0.8)_100%)] z-10" /> 
              <div className="absolute inset-0 flex items-center justify-center"> 
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-inner relative overflow-hidden"> 
                   <Disc className="w-14 h-14 md:w-16 md:h-16 text-white/20 absolute" /> 
                   <div className="text-white font-bold text-xl md:text-2xl z-10 px-4 drop-shadow-md"> 
                      {currentPodcast.title.charAt(0)} 
                   </div> 
                </div> 
              </div> 
              {/* Grooves */} 
              <div className="absolute inset-0 rounded-full border border-white/5 m-4" /> 
              <div className="absolute inset-0 rounded-full border border-white/5 m-8" /> 
              <div className="absolute inset-0 rounded-full border border-white/5 m-12" /> 
            </div> 

            {/* Tonearm Stylus (Static visual) */} 
            <div className={`absolute -right-4 top-0 w-24 h-40 origin-top-right transition-transform duration-500 pointer-events-none 
              ${isPlaying ? 'rotate-12' : 'rotate-0'} 
            `}> 
               <div className="w-2 h-32 bg-slate-700 rounded-full absolute right-4 top-0 shadow-lg" /> 
               <div className="w-6 h-6 bg-slate-600 rounded-full absolute right-2 top-0 border-2 border-slate-500" /> 
               <div className="w-4 h-8 bg-slate-500 rounded-sm absolute right-3 bottom-0 shadow-md" /> 
            </div> 
          </div> 

          <div className="mt-6 space-y-1"> 
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight"> 
              {currentPodcast.title} 
            </h1> 
            <p className="text-slate-400 text-sm font-medium tracking-widest uppercase"> 
              By Weibodcast AI 
            </p> 
          </div> 
        </div> 

        {/* Controls Area */} 
        <div className="p-4 bg-slate-900/60 backdrop-blur-xl border-t border-slate-700/50 space-y-4"> 
          {/* Progress Bar */} 
          <div className="space-y-2"> 
             <input 
                type="range" 
                value={progress} 
                onChange={handleSeek} 
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500 hover:accent-pink-400 transition-all" 
             /> 
             <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase tracking-widest"> 
                <span>{audioRef.current ? formatTime(audioRef.current.currentTime) : '00:00'}</span> 
                <span>{audioRef.current ? formatTime(audioRef.current.duration) : '00:00'}</span> 
             </div> 
          </div> 

          {/* Buttons */} 
          <div className="flex items-center justify-between"> 
            <div className="flex items-center space-x-6"> 
              <button 
                onClick={handlePrev} 
                className="text-slate-400 hover:text-white transition-colors p-2" 
              > 
                <SkipBack className="w-6 h-6" /> 
              </button> 
              
              <button 
                onClick={togglePlay} 
                className="w-16 h-16 rounded-full bg-white text-slate-900 flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl shadow-white/10" 
              > 
                {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />} 
              </button> 

              <button 
                onClick={handleNext} 
                className="text-slate-400 hover:text-white transition-colors p-2" 
              > 
                <SkipForward className="w-6 h-6" /> 
              </button> 
            </div> 

            <div className="hidden md:flex items-center space-x-4"> 
              <div className="flex items-center text-slate-500 group"> 
                <Volume2 className="w-5 h-5 mr-3 group-hover:text-pink-500 transition-colors" /> 
                <div className="w-24 h-1 bg-slate-700 rounded-full relative overflow-hidden"> 
                   <div className="absolute inset-0 bg-pink-500 w-[70%]" /> 
                </div> 
              </div> 
            </div> 
          </div> 
        </div> 
      </div> 
    </div> 
  ); 
}; 

// Helper: Format seconds to MM:SS 
const formatTime = (seconds: number) => { 
  if (isNaN(seconds)) return '00:00'; 
  const m = Math.floor(seconds / 60); 
  const s = Math.floor(seconds % 60); 
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`; 
}; 

export default MusicPlayer;