import React, { useState, useRef, useEffect, useMemo } from 'react';
import { PodcastResult, InterruptNote } from '../types';
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
  ChevronRight,
  X,
  MessageSquarePlus,
  Save,
  Clock,
  MessageCircle,
  Trash2,
  Mic,
  Square
} from 'lucide-react';

interface DancerState { 
  id: number; 
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

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
  const [volume, setVolume] = useState(70);
  const [showDanceParty, setShowDanceParty] = useState(false);
  const [dancers, setDancers] = useState<DancerState[]>([]);
  const [showInterruptBubble, setShowInterruptBubble] = useState(false);
  const [interruptContent, setInterruptContent] = useState('');
  const [interruptAudioTime, setInterruptAudioTime] = useState(0);
  const [sidebarTab, setSidebarTab] = useState<'playlist' | 'interaction'>('playlist');
  // 本地管理 interruptNotes 状态
  const [localInterruptNotes, setLocalInterruptNotes] = useState<InterruptNote[]>([]);
  // 语音录制状态
  const [showVoiceBubble, setShowVoiceBubble] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceAudioTime, setVoiceAudioTime] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(20).fill(0));
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingNoteId, setPlayingNoteId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const noteAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasAutoPlayed = useRef(false);
  const animationRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gravityTimerRef = useRef<number | null>(null);
  const gravityEnabledRef = useRef(false); // 用 ref 避免闭包问题

  // 物理参数
  const PHYSICS = {
    gravity: 0.5,
    bounceDamping: 0.85,
    friction: 0.995,
  };

  // 生成固定的撒花数据，不会因为 state 更新而重新渲染
  const confettiPieces = useMemo(() => {
    const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#1dd1a1'];
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 8 + Math.random() * 12,
      delay: Math.random() * 3,
      duration: 3 + Math.random() * 2,
    }));
  }, []);

  const currentPodcast = history[currentIndex];

  // Debug: 监控 localInterruptNotes 变化
  useEffect(() => {
    console.log('MusicPlayer: localInterruptNotes updated:', localInterruptNotes);
  }, [localInterruptNotes]);

  // 音量控制
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

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

  // 舞蹈动画逻辑 - 物理弹力球
  useEffect(() => {
    if (showDanceParty) {
      // 初始化 10 个舞者，随机位置和速度（初始速度更大，让它们先飞起来）
      const initialDancers = Array.from({ length: 10 }, (_, i) => ({
        id: i,
        x: 100 + Math.random() * 600,
        y: 200 + Math.random() * 200,
        vx: (Math.random() - 0.5) * 15,
        vy: -8 - Math.random() * 8, // 初始向上的速度
        size: 180 + Math.random() * 80,
      }));
      setDancers(initialDancers);
      gravityEnabledRef.current = false;

      // 3秒后启用重力，让图片陆续落下
      gravityTimerRef.current = window.setTimeout(() => {
        gravityEnabledRef.current = true;
      }, 3000);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (gravityTimerRef.current) {
        clearTimeout(gravityTimerRef.current);
      }
      gravityEnabledRef.current = false;
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (gravityTimerRef.current) {
        clearTimeout(gravityTimerRef.current);
      }
    };
  }, [showDanceParty]);

  // 物理动画循环
  useEffect(() => {
    if (!showDanceParty || dancers.length === 0) return;

    const animate = () => {
      const container = containerRef.current;
      if (!container) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const rect = container.getBoundingClientRect();

      setDancers(prevDancers => 
        prevDancers.map(dancer => {
          let { x, y, vx, vy, size } = dancer;

          // 只有启用重力后才应用重力
          if (gravityEnabledRef.current) {
            vy += PHYSICS.gravity;
          }

          // 应用摩擦力
          vx *= PHYSICS.friction;
          vy *= PHYSICS.friction;

          // 更新位置
          x += vx;
          y += vy;

          const halfSize = size / 2;

          // 边界碰撞检测
          if (x < halfSize) {
            x = halfSize;
            vx = -vx * PHYSICS.bounceDamping;
          } else if (x > rect.width - halfSize) {
            x = rect.width - halfSize;
            vx = -vx * PHYSICS.bounceDamping;
          }

          if (y < halfSize) {
            y = halfSize;
            vy = -vy * PHYSICS.bounceDamping;
          } else if (y > rect.height - halfSize - 60) { // 底部留空间给标题
            y = rect.height - halfSize - 60;
            vy = -vy * PHYSICS.bounceDamping;
            vx *= 0.95; // 底部额外摩擦
          }

          return { ...dancer, x, y, vx, vy };
        })
      );

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [showDanceParty, dancers.length]);

  const openDanceParty = () => {
    if (currentPodcast?.guestName && currentPodcast.guestName !== 'Guest') {
      setShowDanceParty(true);
    }
  };

  const closeDanceParty = () => {
    setShowDanceParty(false);
    setDancers([]);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  // 点击舞者给一个向上的力
  const handleDancerClick = (id: number) => {
    setDancers(prev => prev.map(d => 
      d.id === id ? { 
        ...d, 
        vy: -12 - Math.random() * 5,
        vx: (Math.random() - 0.5) * 10
      } : d
    ));
  };

  // 打断并对话
  const handleInterrupt = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setInterruptAudioTime(audioRef.current.currentTime);
      setShowInterruptBubble(true);
      setInterruptContent('');
    }
  };

  // 保存打断笔记
  const handleSaveInterrupt = () => {
    if (!interruptContent.trim() || !currentPodcast) return;
    
    const note: InterruptNote = {
      id: `note-${Date.now()}`,
      podcastId: currentPodcast.id,
      podcastTitle: currentPodcast.title,
      timestamp: Date.now(),
      audioTime: interruptAudioTime,
      content: interruptContent.trim(),
      type: 'text'
    };
    
    // 直接更新本地状态
    setLocalInterruptNotes(prev => [note, ...prev]);
    setShowInterruptBubble(false);
    setInterruptContent('');
    // 保存后自动切换到 Interaction tab
    setSidebarTab('interaction');
  };

  // 删除打断笔记
  const handleDeleteNote = (noteId: string) => {
    setLocalInterruptNotes(prev => prev.filter(note => note.id !== noteId));
  };

  // 打断并语音
  const handleVoiceInterrupt = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setVoiceAudioTime(audioRef.current.currentTime);
      setShowVoiceBubble(true);
      setRecordingDuration(0);
      startRecording();
    }
  };

  // 开始录音
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 创建音频分析器
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 64;
      
      // 开始录音
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorderRef.current.start(100);
      setIsRecording(true);
      
      // 开始计时
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      // 开始波形动画
      updateAudioLevels();
    } catch (err) {
      console.error('Failed to start recording:', err);
      alert('无法访问麦克风，请检查权限设置');
      setShowVoiceBubble(false);
    }
  };

  // 更新音频波形
  const updateAudioLevels = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // 取20个采样点
    const levels = [];
    const step = Math.floor(dataArray.length / 20);
    for (let i = 0; i < 20; i++) {
      levels.push(dataArray[i * step] / 255);
    }
    setAudioLevels(levels);
    
    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevels);
    }
  };

  // 停止录音并保存
  const stopRecordingAndSave = () => {
    if (!mediaRecorderRef.current || !currentPodcast) return;
    
    mediaRecorderRef.current.stop();
    setIsRecording(false);
    
    // 停止计时
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    
    // 停止波形动画
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // 关闭音频流
    mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    
    // 等待数据收集完成
    setTimeout(() => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const voiceUrl = URL.createObjectURL(audioBlob);
      
      const note: InterruptNote = {
        id: `voice-${Date.now()}`,
        podcastId: currentPodcast.id,
        podcastTitle: currentPodcast.title,
        timestamp: Date.now(),
        audioTime: voiceAudioTime,
        content: `语音留言 (${recordingDuration}秒)`,
        type: 'voice',
        voiceUrl,
        voiceDuration: recordingDuration
      };
      
      setLocalInterruptNotes(prev => [note, ...prev]);
      setShowVoiceBubble(false);
      setSidebarTab('interaction');
      setAudioLevels(new Array(20).fill(0));
    }, 100);
  };

  // 关闭语音气泡
  const handleCloseVoiceBubble = () => {
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsRecording(false);
    setShowVoiceBubble(false);
    setAudioLevels(new Array(20).fill(0));
  };

  // 播放语音笔记
  const playVoiceNote = (note: InterruptNote) => {
    if (!note.voiceUrl) return;
    
    if (playingNoteId === note.id) {
      // 停止播放
      if (noteAudioRef.current) {
        noteAudioRef.current.pause();
        noteAudioRef.current = null;
      }
      setPlayingNoteId(null);
    } else {
      // 停止之前的播放
      if (noteAudioRef.current) {
        noteAudioRef.current.pause();
      }
      
      // 开始新的播放
      noteAudioRef.current = new Audio(note.voiceUrl);
      noteAudioRef.current.onended = () => setPlayingNoteId(null);
      noteAudioRef.current.play();
      setPlayingNoteId(note.id);
    }
  };

  // 清理录音资源
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (noteAudioRef.current) {
        noteAudioRef.current.pause();
      }
    };
  }, []);

  // 关闭气泡
  const handleCloseBubble = () => {
    setShowInterruptBubble(false);
    setInterruptContent('');
  };

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

  const guestImageUrl = currentPodcast?.guestName && currentPodcast.guestName !== 'Guest' 
    ? `/image/${encodeURIComponent(currentPodcast.guestName)}.gif` 
    : null;

  // 全屏舞蹈派对组件
  const DancePartyOverlay = () => (
    <div ref={containerRef} className="fixed inset-0 z-[100] bg-slate-900 overflow-hidden">
      <button 
        onClick={(e) => {
          e.stopPropagation();
          closeDanceParty();
        }}
        className="absolute top-4 right-4 z-[200] p-3 bg-red-500 rounded-full hover:bg-red-400 text-white transition-all shadow-lg cursor-pointer"
      >
        <X className="w-6 h-6" />
      </button>
      
      {/* Grid Background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle, #4b5563 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />

      {/* Confetti 撒花效果 */}
      {confettiPieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute pointer-events-none"
          style={{
            left: `${piece.x}%`,
            top: '-20px',
            zIndex: 150,
            animation: `confetti-fall ${piece.duration}s linear ${piece.delay}s infinite`,
          }}
        >
          <div
            style={{
              width: piece.size,
              height: piece.size,
              backgroundColor: piece.color,
              borderRadius: piece.id % 2 === 0 ? '50%' : '2px',
              animation: 'confetti-spin 2s linear infinite',
            }}
          />
        </div>
      ))}
      
      {/* Dancers - 物理弹力球效果 */}
      {guestImageUrl && dancers.map((dancer) => (
        <div
          key={dancer.id}
          className="absolute cursor-pointer transition-shadow hover:shadow-[0_0_30px_rgba(236,72,153,0.5)]"
          style={{
            left: dancer.x,
            top: dancer.y,
            width: dancer.size,
            height: dancer.size,
            transform: 'translate(-50%, -50%)',
            zIndex: 50
          }}
          onClick={() => handleDancerClick(dancer.id)}
        >
          <img
            src={guestImageUrl}
            alt={`Dancer ${dancer.id}`}
            className="w-full h-full rounded-2xl shadow-2xl border-2 border-white/20 object-cover"
            style={{
              boxShadow: `0 0 20px rgba(255, 255, 255, 0.3),
                         inset 0 8px 20px rgba(255, 255, 255, 0.2),
                         inset 0 -8px 20px rgba(0, 0, 0, 0.3)`
            }}
          />
        </div>
      ))}
      
      {/* Central Party Indicator */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[1]">
        <div className="w-[500px] h-[500px] bg-pink-500/5 rounded-full animate-ping opacity-20" />
      </div>
    
      {/* Title */}
      <div className="absolute bottom-4 left-0 right-0 text-center z-[100]">
        <h2 className="text-2xl font-bold text-white">{currentPodcast?.title}</h2>
        <p className="text-slate-400 mt-2">🎉 点击图片让 {currentPodcast?.guestName} 弹跳！🎉</p>
      </div>
      
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0.8; }
        }
        @keyframes confetti-spin {
          0% { transform: rotateX(0) rotateY(0); }
          100% { transform: rotateX(360deg) rotateY(360deg); }
        }
      `}</style>
    </div>
  );

  if (!currentPodcast) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-700/50 border-dashed">
        <Music2 className="w-16 h-16 mb-4 opacity-20" />
        <p>No podcasts in history to play.</p>
      </div>
    );
  }

  return (
    <>
    {showDanceParty && <DancePartyOverlay />}
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

      {/* Sidebar: Playlist / Interaction */}
      <div className="w-full md:w-80 border-r border-slate-700/50 flex flex-col z-10 bg-slate-900/40 backdrop-blur-md">
        {/* Tab Header */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex bg-slate-800/50 rounded-lg p-1">
            <button
              onClick={() => setSidebarTab('playlist')}
              className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-all ${
                sidebarTab === 'playlist'
                  ? 'bg-pink-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ListMusic className="w-4 h-4 mr-2" />
              Playlist
            </button>
            <button
              onClick={() => setSidebarTab('interaction')}
              className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-all ${
                sidebarTab === 'interaction'
                  ? 'bg-purple-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Interaction
              {localInterruptNotes.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                  {localInterruptNotes.length}
                </span>
              )}
            </button>
          </div>
        </div>
        
        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
          {sidebarTab === 'playlist' ? (
            // Playlist Tab
            history.map((item, idx) => (
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
            ))
          ) : (
            // Interaction Tab
            localInterruptNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                <MessageCircle className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">暂无互动记录</p>
                <p className="text-xs mt-1 text-slate-600">播放时点击"打断并对话"添加</p>
              </div>
            ) : (
              localInterruptNotes.map((note) => (
                <div 
                  key={note.id}
                  className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-purple-500/30 transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-xs text-purple-400 font-medium truncate">{note.podcastTitle}</p>
                        {note.type === 'voice' && (
                          <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 text-[10px] rounded">语音</span>
                        )}
                      </div>
                      <div className="flex items-center text-[10px] text-slate-500 mt-1">
                        <Clock className="w-3 h-3 mr-1" />
                        <span>{formatTime(note.audioTime)}</span>
                        <span className="mx-2">·</span>
                        <span>{new Date(note.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {note.type === 'voice' ? (
                    <button
                      onClick={() => playVoiceNote(note)}
                      className="mt-2 w-full flex items-center justify-center space-x-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      {playingNoteId === note.id ? (
                        <>
                          <Pause className="w-4 h-4 text-orange-400" />
                          <span className="text-sm text-orange-400">停止播放</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 text-slate-300" />
                          <span className="text-sm text-slate-300">播放语音 ({note.voiceDuration}秒)</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <p className="text-sm text-slate-300 mt-2 line-clamp-3">{note.content}</p>
                  )}
                </div>
              ))
            )
          )}
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
              <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.05)_0%,rgba(0,0,0,0.8)_100%)] z-10 pointer-events-none" /> 
              <div className="absolute inset-0 flex items-center justify-center z-20"> 
                <div 
                  className={`w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-inner relative overflow-hidden ${guestImageUrl ? 'cursor-pointer hover:ring-4 hover:ring-pink-400/50 transition-all hover:scale-105' : ''}`}
                  onClick={guestImageUrl ? openDanceParty : undefined}
                  title={guestImageUrl ? '点击开启舞蹈派对' : undefined}
                > 
                   {currentPodcast.guestName && currentPodcast.guestName !== 'Guest' ? (
                     <img 
                       src={`/image/${encodeURIComponent(currentPodcast.guestName)}.gif`} 
                       alt={currentPodcast.guestName}
                       className="w-full h-full object-cover"
                       onError={(e) => {
                         e.currentTarget.style.display = 'none';
                       }}
                     />
                   ) : (
                     <>
                       <Disc className="w-14 h-14 md:w-16 md:h-16 text-white/20 absolute" /> 
                       <div className="text-white font-bold text-xl md:text-2xl z-10 px-4 drop-shadow-md"> 
                          {currentPodcast.title.charAt(0)} 
                       </div> 
                     </>
                   )}
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

            {/* 打断并对话按钮 */}
            <div className="relative">
              <button
                onClick={handleInterrupt}
                className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full hover:from-purple-400 hover:to-pink-400 transition-all shadow-lg hover:shadow-purple-500/30 text-sm font-medium"
              >
                <MessageSquarePlus className="w-4 h-4" />
                <span>对话</span>
              </button>

              {/* 文字气泡弹窗 */}
              {showInterruptBubble && (
                <div className="absolute bottom-full right-0 mb-3 w-80 bg-slate-800 rounded-2xl shadow-2xl border border-slate-600 overflow-hidden z-50 animate-fade-in">
                  {/* 气泡箭头 */}
                  <div className="absolute -bottom-2 right-8 w-4 h-4 bg-slate-800 border-r border-b border-slate-600 transform rotate-45" />
                  
                  {/* 引用播客样式 */}
                  <div className="p-4 bg-slate-700/50 border-b border-slate-600">
                    <div className="flex items-start space-x-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shrink-0">
                        {currentPodcast?.guestName && currentPodcast.guestName !== 'Guest' ? (
                          <img 
                            src={`/image/${encodeURIComponent(currentPodcast.guestName)}.gif`}
                            alt={currentPodcast.guestName}
                            className="w-full h-full object-cover rounded-lg"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <Music2 className="w-6 h-6 text-white/60" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">{currentPodcast?.title}</p>
                        <div className="flex items-center text-xs text-slate-400 mt-1">
                          <Clock className="w-3 h-3 mr-1" />
                          <span>暂停于 {formatTime(interruptAudioTime)}</span>
                        </div>
                      </div>
                      <button
                        onClick={handleCloseBubble}
                        className="text-slate-400 hover:text-white transition-colors p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 输入区域 */}
                  <div className="p-4">
                    <textarea
                      value={interruptContent}
                      onChange={(e) => setInterruptContent(e.target.value)}
                      placeholder="写下你的想法..."
                      className="w-full h-24 bg-slate-900/50 border border-slate-600 rounded-xl p-3 text-white text-sm placeholder-slate-500 resize-none focus:outline-none focus:border-pink-500 transition-colors"
                    />
                    <div className="flex justify-end mt-3">
                      <button
                        onClick={handleSaveInterrupt}
                        disabled={!interruptContent.trim()}
                        className="flex items-center space-x-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-400 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Save className="w-4 h-4" />
                        <span>保存</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 打断并语音按钮 */}
            <div className="relative">
              <button
                onClick={handleVoiceInterrupt}
                className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full hover:from-orange-400 hover:to-red-400 transition-all shadow-lg hover:shadow-orange-500/30 text-sm font-medium"
              >
                <Mic className="w-4 h-4" />
                <span>语音</span>
              </button>

              {/* 语音气泡弹窗 */}
              {showVoiceBubble && (
                <div className="absolute bottom-full right-0 mb-3 w-80 bg-slate-800 rounded-2xl shadow-2xl border border-slate-600 overflow-hidden z-50 animate-fade-in">
                  {/* 气泡箭头 */}
                  <div className="absolute -bottom-2 right-8 w-4 h-4 bg-slate-800 border-r border-b border-slate-600 transform rotate-45" />
                  
                  {/* 引用播客样式 */}
                  <div className="p-4 bg-slate-700/50 border-b border-slate-600">
                    <div className="flex items-start space-x-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shrink-0">
                        {currentPodcast?.guestName && currentPodcast.guestName !== 'Guest' ? (
                          <img 
                            src={`/image/${encodeURIComponent(currentPodcast.guestName)}.gif`}
                            alt={currentPodcast.guestName}
                            className="w-full h-full object-cover rounded-lg"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <Music2 className="w-6 h-6 text-white/60" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">{currentPodcast?.title}</p>
                        <div className="flex items-center text-xs text-slate-400 mt-1">
                          <Clock className="w-3 h-3 mr-1" />
                          <span>暂停于 {formatTime(voiceAudioTime)}</span>
                        </div>
                      </div>
                      <button
                        onClick={handleCloseVoiceBubble}
                        className="text-slate-400 hover:text-white transition-colors p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 录音区域 */}
                  <div className="p-4">
                    {/* 波形图 */}
                    <div className="flex items-center justify-center h-16 bg-slate-900/50 rounded-xl mb-4 px-2">
                      {audioLevels.map((level, i) => (
                        <div
                          key={i}
                          className="w-1.5 mx-0.5 bg-gradient-to-t from-orange-500 to-red-400 rounded-full transition-all duration-75"
                          style={{ 
                            height: `${Math.max(4, level * 48)}px`,
                            opacity: isRecording ? 1 : 0.3
                          }}
                        />
                      ))}
                    </div>
                    
                    {/* 录音时长 */}
                    <div className="text-center mb-4">
                      <span className="text-2xl font-mono text-white">
                        {Math.floor(recordingDuration / 60).toString().padStart(2, '0')}:
                        {(recordingDuration % 60).toString().padStart(2, '0')}
                      </span>
                      {isRecording && (
                        <span className="ml-2 inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      )}
                    </div>
                    
                    {/* 完成按钮 */}
                    <button
                      onClick={stopRecordingAndSave}
                      disabled={recordingDuration < 1}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-400 hover:to-red-400 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Square className="w-4 h-4" />
                      <span>我说完了</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="hidden md:flex items-center space-x-4"> 
              <div className="flex items-center text-slate-500 group"> 
                <Volume2 className="w-5 h-5 mr-3 group-hover:text-pink-500 transition-colors" /> 
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={volume} 
                  onChange={(e) => setVolume(parseInt(e.target.value))} 
                  className="w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500 hover:accent-pink-400 transition-all" 
                /> 
              </div> 
            </div> 
          </div> 
        </div> 
      </div> 
    </div> 
    </>
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