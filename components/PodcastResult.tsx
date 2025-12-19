import React, { useEffect, useRef, useState } from 'react';
import { Download, FileText, Music, AlertCircle, Mic2, UserCircle2, Disc3, X } from 'lucide-react';
import { SpeakerSegment, PodcastResult as PodcastResultType } from '../types';
import MusicPlayer from './MusicPlayer';

interface PodcastResultProps {
  title: string;
  script: string;
  audioUrl?: string;
  timeline?: SpeakerSegment[];
  guestName?: string;
  id?: string;
}

const PodcastResult: React.FC<PodcastResultProps> = ({ title, script, audioUrl, timeline, guestName, id }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentSpeaker, setCurrentSpeaker] = useState<'Host' | 'Guest' | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);

  // Auto-play when audioUrl changes (e.g., when selecting from history)
  useEffect(() => {
    if (audioUrl && audioRef.current) {
        audioRef.current.load();
        audioRef.current.play().catch(e => {
            console.log("Auto-play prevented by browser policy or missing file", e);
        });
    }
  }, [audioUrl]);

  // Timeline synchronization
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Debug timeline
    if (!timeline || timeline.length === 0) {
        console.warn("Timeline is empty or undefined");
    }

    let animationFrameId: number;

    const checkTime = () => {
        if (!timeline) return;
        const time = audio.currentTime;
        
        // Find active segment with a small buffer for smoother transition
        const segment = timeline.find(s => time >= s.startTime && time < s.endTime);
        
        if (segment) {
            if (currentSpeaker !== segment.speaker) {
                setCurrentSpeaker(segment.speaker);
            }
        } else {
            if (currentSpeaker !== null) {
                setCurrentSpeaker(null);
            }
        }
        
        if (!audio.paused) {
            animationFrameId = requestAnimationFrame(checkTime);
        }
    };

    const onPlay = () => {
        animationFrameId = requestAnimationFrame(checkTime);
        // Auto-enter fullscreen on play if desired? Maybe too intrusive.
        // setIsFullscreen(true);
    };

    const onPause = () => {
        setCurrentSpeaker(null);
        cancelAnimationFrame(animationFrameId);
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onPause);

    return () => {
        audio.removeEventListener('play', onPlay);
        audio.removeEventListener('pause', onPause);
        audio.removeEventListener('ended', onPause);
        cancelAnimationFrame(animationFrameId);
    };
  }, [timeline, audioUrl, currentSpeaker]); 

  // Crazy Party Animation
  const animationStyles = `
    @keyframes crazy-dance {
      0% { transform: translate(0, 0) rotate(0deg) scale(1); }
      25% { transform: translate(-20px, -30px) rotate(-10deg) scale(1.1); }
      50% { transform: translate(0, -10px) rotate(0deg) scale(1.05); }
      75% { transform: translate(20px, -20px) rotate(10deg) scale(1.1); }
      100% { transform: translate(0, 0) rotate(0deg) scale(1); }
    }
    .animate-crazy-dance {
      animation: crazy-dance 0.4s infinite ease-in-out;
    }
    
    @keyframes gentle-bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    .animate-gentle-bounce {
      animation: gentle-bounce 0.5s infinite ease-in-out;
    }
    
    @keyframes spin-avatar {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .animate-spin-avatar {
      animation: spin-avatar 3s linear infinite;
    }
  `;

  // 构建当前播客数据用于 MusicPlayer
  const currentPodcast: PodcastResultType = {
    id: id || 'current',
    timestamp: Date.now(),
    title,
    script,
    audioUrl,
    timeline,
    guestName
  };

  const PlayerModal = () => (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-3xl">
        <button 
          onClick={() => setShowPlayer(false)}
          className="absolute top-4 right-4 z-50 p-2 bg-white/10 rounded-full hover:bg-white/20 text-white transition-all"
        >
          <X className="w-6 h-6" />
        </button>
        <MusicPlayer history={[currentPodcast]} initialId={currentPodcast.id} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in-up">
      <style>{animationStyles}</style>
      
      {showPlayer && <PlayerModal />}

      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 p-6 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <Music className="mr-3 text-pink-400" />
            {title}
          </h2>
          {audioUrl && (
            <button 
               onClick={() => setShowPlayer(true)}
               className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-red-500 hover:from-pink-400 hover:to-red-400 text-white flex items-center justify-center transition-all hover:scale-110 shadow-lg shadow-pink-500/30"
               title="打开播放器"
            >
               <Disc3 className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} />
            </button>
          )}
        </div>

        {/* Visualizer & Audio Player */}
        <div className="p-6 bg-slate-800/50 border-b border-slate-700">
          
          {/* Visual Stage (Standard) */}
          {audioUrl && (
              <div className="flex justify-center items-end space-x-8 md:space-x-24 h-64 bg-slate-900/80 rounded-lg p-8 mb-6 border border-slate-700/50 relative overflow-hidden shadow-inner">
                  {/* Spotlight Effect */}
                  <div className="absolute top-0 left-1/4 w-32 h-32 bg-pink-500/10 blur-[50px] rounded-full pointer-events-none" />
                  <div className="absolute top-0 right-1/4 w-32 h-32 bg-blue-500/10 blur-[50px] rounded-full pointer-events-none" />

                  {/* Host */}
                  <div className={`flex flex-col items-center transition-all duration-300 ${currentSpeaker === 'Host' ? 'scale-110 opacity-100' : 'scale-90 opacity-50'}`}>
                       <div className={`relative transition-transform duration-100 ${currentSpeaker === 'Host' ? 'animate-gentle-bounce' : ''}`}>
                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 p-1 shadow-lg shadow-pink-500/20">
                                <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border-4 border-slate-900">
                                    <Mic2 className="w-10 h-10 md:w-12 md:h-12 text-pink-400" />
                                </div>
                            </div>
                       </div>
                       <span className={`mt-4 text-xs md:text-sm font-bold tracking-wider ${currentSpeaker === 'Host' ? 'text-pink-400' : 'text-slate-500'}`}>
                           HOST
                       </span>
                  </div>
                  
                  {/* Guest */}
                  <div className={`flex flex-col items-center transition-all duration-300 ${currentSpeaker === 'Guest' ? 'scale-110 opacity-100' : 'scale-90 opacity-50'}`}>
                       <div className={`relative transition-transform duration-100 ${currentSpeaker === 'Guest' ? 'animate-gentle-bounce' : ''}`}>
                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 p-1 shadow-lg shadow-blue-500/20">
                                <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border-4 border-slate-900 bg-white">
                                {guestName && guestName !== 'Guest' ? (
                                    <img 
                                        src={`/image/${encodeURIComponent(guestName)}.gif`} 
                                        alt={guestName}
                                        className={`w-full h-full object-cover rounded-full ${currentSpeaker === 'Guest' ? 'animate-spin-avatar' : ''}`}
                                        onError={(e) => {
                                            console.warn(`Failed to load image: ${e.currentTarget.src}`);
                                            e.currentTarget.style.display = 'none';
                                            e.currentTarget.parentElement?.classList.remove('bg-white');
                                            // Show fallback
                                            const parent = e.currentTarget.parentElement;
                                            if (parent && !parent.querySelector('.fallback-icon')) {
                                                const fallback = document.createElement('div');
                                                fallback.className = "fallback-icon flex items-center justify-center w-full h-full";
                                                fallback.innerHTML = '<svg class="w-12 h-12 text-blue-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/></svg>';
                                                parent.appendChild(fallback);
                                            }
                                        }}
                                    />
                                ) : (
                                    <UserCircle2 className="w-10 h-10 md:w-12 md:h-12 text-blue-400" />
                                )}
                            </div>
                            </div>
                       </div>
                       <span className={`mt-4 text-xs md:text-sm font-bold tracking-wider ${currentSpeaker === 'Guest' ? 'text-blue-400' : 'text-slate-500'}`}>
                           {guestName || 'GUEST'}
                       </span>
                  </div>
              </div>
          )}

          <div className="flex items-center justify-between mb-4">
             <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Podcast Audio</h3>
             {audioUrl && (
                <span className="text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded border border-green-500/20">
                   Active Session
                </span>
             )}
          </div>
          
          {audioUrl ? (
            <div className="flex flex-col space-y-4">
              <audio 
                ref={audioRef}
                controls 
                className="w-full h-12 rounded-lg" 
                src={audioUrl}
              >
                Your browser does not support the audio element.
              </audio>
              <div className="flex justify-end">
                <a 
                  href={audioUrl} 
                  download={`${title.replace(/\s+/g, '_')}.wav`}
                  className="flex items-center text-sm text-pink-400 hover:text-pink-300 transition-colors"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download Audio (.wav)
                </a>
              </div>
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center py-8 bg-slate-900/50 rounded-lg border border-slate-700 border-dashed text-slate-500 space-y-2">
                <AlertCircle className="w-6 h-6 opacity-50" />
                <p className="text-sm">Audio expired or generation in progress...</p>
                <p className="text-[10px] max-w-xs text-center opacity-70">
                    Note: Audio blobs are session-only. If you refreshed the page, you'll need to regenerate this podcast to hear it again.
                </p>
             </div>
          )}
        </div>

        {/* Script */}
        <div className="p-6">
           <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
             <FileText className="w-4 h-4 mr-2" />
             Generated Script
           </h3>
           <div className="bg-slate-900 rounded-lg p-6 max-h-96 overflow-y-auto font-mono text-sm leading-relaxed text-slate-300 border border-slate-700 whitespace-pre-wrap">
             {script}
           </div>
        </div>
      </div>
    </div>
  );
};

export default PodcastResult;