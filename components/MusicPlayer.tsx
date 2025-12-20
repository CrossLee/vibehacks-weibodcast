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
  Square,
  Share2,
  Download,
  Bluetooth,
  BluetoothConnected,
  Check
} from 'lucide-react';

// SpeechRecognition 类型声明
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  start(): void;
  stop(): void;
}

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
  // 分享卡片状态
  const [showShareCard, setShowShareCard] = useState(false);
  const [pendingShareNote, setPendingShareNote] = useState<InterruptNote | null>(null);
  const [transcribedText, setTranscribedText] = useState('');
  const [isPlayingSharePodcast, setIsPlayingSharePodcast] = useState(false);
  const [isPlayingShareVoice, setIsPlayingShareVoice] = useState(false);
  const [sharePodcastProgress, setSharePodcastProgress] = useState(0);
  const [sharePodcastCurrentTime, setSharePodcastCurrentTime] = useState(0);
  const [sharePodcastDuration, setSharePodcastDuration] = useState(0);
  const [shareVoiceProgress, setShareVoiceProgress] = useState(0);
  const [shareVoiceCurrentTime, setShareVoiceCurrentTime] = useState(0);
  // 蓝牙眼镜状态
  const [isGlassesConnected, setIsGlassesConnected] = useState(false);
  const [showGlassesModal, setShowGlassesModal] = useState(false);
  const [glassesRecording, setGlassesRecording] = useState(true);
  const [glassesAudioTime, setGlassesAudioTime] = useState(0);
  const [glassesWaveform, setGlassesWaveform] = useState<number[]>(new Array(12).fill(0));
  const [glassesRecordingDuration, setGlassesRecordingDuration] = useState(0);
  const [glassesTranscript, setGlassesTranscript] = useState('');
  const [glassesShowHighlight, setGlassesShowHighlight] = useState(false);
  const [glassesRecognitionState, setGlassesRecognitionState] = useState('待命');
  const glassesWaveformRef = useRef<number | null>(null);
  const glassesTimerRef = useRef<number | null>(null);
  const glassesMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const glassesAudioChunksRef = useRef<Blob[]>([]);
  const glassesRecognitionRef = useRef<SpeechRecognition | null>(null);
  const shareAudioRef = useRef<HTMLAudioElement | null>(null);
  const shareVoiceRef = useRef<HTMLAudioElement | null>(null);
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
      
      // 显示分享卡片而不是直接保存
      setPendingShareNote(note);
      setTranscribedText('正在识别语音内容...');
      setShowVoiceBubble(false);
      setShowShareCard(true);
      setAudioLevels(new Array(20).fill(0));
      
      // 模拟语音识别（实际项目中需要调用语音识别API）
      setTimeout(() => {
        setTranscribedText('（语音内容识别中，此功能需要接入语音识别服务）');
      }, 1500);
    }, 100);
  };

  // 确认分享并保存
  const handleConfirmShare = () => {
    if (pendingShareNote) {
      setLocalInterruptNotes(prev => [pendingShareNote, ...prev]);
      setSidebarTab('interaction');
    }
    handleCloseShareCard();
  };

  // 关闭分享卡片
  const handleCloseShareCard = () => {
    setShowShareCard(false);
    setPendingShareNote(null);
    setTranscribedText('');
    setIsPlayingSharePodcast(false);
    setIsPlayingShareVoice(false);
    setSharePodcastProgress(0);
    setSharePodcastCurrentTime(0);
    setSharePodcastDuration(0);
    setShareVoiceProgress(0);
    setShareVoiceCurrentTime(0);
    if (shareAudioRef.current) {
      shareAudioRef.current.pause();
      shareAudioRef.current = null;
    }
    if (shareVoiceRef.current) {
      shareVoiceRef.current.pause();
      shareVoiceRef.current = null;
    }
  };

  // 播放分享卡片中的播客片段
  const toggleSharePodcast = () => {
    if (!currentPodcast?.audioUrl) return;

    if (isPlayingSharePodcast) {
      shareAudioRef.current?.pause();
      setIsPlayingSharePodcast(false);
    } else {
      if (!shareAudioRef.current) {
        shareAudioRef.current = new Audio(currentPodcast.audioUrl);
        shareAudioRef.current.onended = () => setIsPlayingSharePodcast(false);
        shareAudioRef.current.onloadedmetadata = () => {
          if (shareAudioRef.current) {
            setSharePodcastDuration(shareAudioRef.current.duration);
          }
        };
        shareAudioRef.current.ontimeupdate = () => {
          if (shareAudioRef.current) {
            const current = shareAudioRef.current.currentTime;
            const duration = shareAudioRef.current.duration;
            setSharePodcastCurrentTime(current);
            setSharePodcastProgress((current / duration) * 100);
          }
        };
      }
      if (pendingShareNote && sharePodcastCurrentTime === 0) {
        shareAudioRef.current.currentTime = Math.max(0, pendingShareNote.audioTime - 5);
      }
      shareAudioRef.current.play();
      setIsPlayingSharePodcast(true);
    }
  };

  // 分享卡片播客进度条拖动
  const handleSharePodcastSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (shareAudioRef.current) {
      const time = (parseFloat(e.target.value) / 100) * shareAudioRef.current.duration;
      shareAudioRef.current.currentTime = time;
      setSharePodcastProgress(parseFloat(e.target.value));
    }
  };

  // 播放分享卡片中的语音评论
  const toggleShareVoice = () => {
    if (!pendingShareNote?.voiceUrl) return;

    if (isPlayingShareVoice) {
      shareVoiceRef.current?.pause();
      setIsPlayingShareVoice(false);
    } else {
      if (!shareVoiceRef.current) {
        shareVoiceRef.current = new Audio(pendingShareNote.voiceUrl);
        shareVoiceRef.current.onended = () => {
          setIsPlayingShareVoice(false);
          setShareVoiceProgress(0);
          setShareVoiceCurrentTime(0);
        };
        shareVoiceRef.current.ontimeupdate = () => {
          if (shareVoiceRef.current && pendingShareNote?.voiceDuration) {
            const current = shareVoiceRef.current.currentTime;
            setShareVoiceCurrentTime(current);
            setShareVoiceProgress((current / pendingShareNote.voiceDuration) * 100);
          }
        };
      }
      shareVoiceRef.current.play();
      setIsPlayingShareVoice(true);
    }
  };

  // 分享卡片语音进度条拖动
  const handleShareVoiceSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (shareVoiceRef.current && pendingShareNote?.voiceDuration) {
      const time = (parseFloat(e.target.value) / 100) * pendingShareNote.voiceDuration;
      shareVoiceRef.current.currentTime = time;
      setShareVoiceProgress(parseFloat(e.target.value));
    }
  };

  // 分享到社交媒体
  const handleShare = (platform: string) => {
    const shareText = `我在听「${currentPodcast?.title}」时留下了语音点评！`;
    const shareUrl = window.location.href;
    
    switch (platform) {
      case 'wechat':
        alert('请截图分享到微信');
        break;
      case 'weibo':
        window.open(`https://service.weibo.com/share/share.php?title=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        alert('链接已复制到剪贴板');
        break;
    }
  };

  // 蓝牙眼镜连接
  const handleGlassesConnect = async () => {
    if (!isGlassesConnected) {
      // 模拟连接
      setIsGlassesConnected(true);
    }
    // 暂停播客播放
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setGlassesAudioTime(audioRef.current.currentTime);
    }
    // 打开眼镜弹窗
    setShowGlassesModal(true);
    setGlassesRecording(true);
    setGlassesRecordingDuration(0);
    setGlassesTranscript('');
    setGlassesShowHighlight(false);
    setGlassesRecognitionState('待命');
    // 开始模拟波形动画
    startGlassesWaveform();
    // 开始计时
    glassesTimerRef.current = window.setInterval(() => {
      setGlassesRecordingDuration(prev => prev + 1);
    }, 1000);

    // 开始实际录音
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      glassesMediaRecorderRef.current = new MediaRecorder(stream);
      glassesAudioChunksRef.current = [];

      glassesMediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          glassesAudioChunksRef.current.push(e.data);
        }
      };

      glassesMediaRecorderRef.current.start(100);
      
      // 开始语音识别
      startGlassesSpeechRecognition();
    } catch (err) {
      console.error('Failed to start glasses recording:', err);
    }
  };

  // 开始眼镜语音识别
  const startGlassesSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.log('Speech recognition not supported');
      return;
    }

    glassesRecognitionRef.current = new SpeechRecognition();
    glassesRecognitionRef.current.continuous = true;
    glassesRecognitionRef.current.interimResults = true;
    glassesRecognitionRef.current.lang = 'zh-CN';

    glassesRecognitionRef.current.onstart = () => {
      setGlassesRecognitionState('正在聆听...');
    };

    glassesRecognitionRef.current.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const finalText = event.results[i][0].transcript;
          handleGlassesFinalTranscript(finalText);
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      if (interim) {
        setGlassesTranscript(interim);
        setGlassesRecognitionState('识别中...');
      }
    };

    glassesRecognitionRef.current.onend = () => {
      // 如果还在录音，重新开始识别
      if (glassesRecording) {
        glassesRecognitionRef.current?.start();
      }
    };

    glassesRecognitionRef.current.start();
  };

  // 处理眼镜语音识别最终结果
  const handleGlassesFinalTranscript = (text: string) => {
    if (!text || text.trim().length === 0) return;

    console.log('Glasses transcript:', text);
    setGlassesTranscript(text);
    setGlassesRecognitionState('意图确认');

    // 检测关键词
    const isHighlight =
      text.includes('很有道理') ||
      text.includes('有道理') ||
      text.includes('说得对') ||
      text.includes('道理');
    console.log('Is highlight:', isHighlight);
    if (isHighlight) {
      console.log('Setting glassesShowHighlight to true');
      setGlassesShowHighlight(true);
      // 5秒后隐藏高亮
      setTimeout(() => {
        setGlassesShowHighlight(false);
      }, 5000);
    }

    setTimeout(() => {
      setGlassesRecognitionState('正在聆听...');
    }, 1000);
  };

  // 手动触发高亮效果（用于测试）
  const triggerGlassesHighlight = () => {
    console.log('Manual trigger highlight');
    setGlassesShowHighlight(true);
    setGlassesTranscript('很有道理');
    setTimeout(() => {
      setGlassesShowHighlight(false);
    }, 5000);
  };

  // 模拟眼镜波形动画
  const startGlassesWaveform = () => {
    const animate = () => {
      setGlassesWaveform(prev => 
        prev.map(() => Math.random() * 0.8 + 0.2)
      );
      glassesWaveformRef.current = window.setTimeout(animate, 100);
    };
    animate();
  };

  // 眼镜端完成录音
  const handleGlassesFinish = () => {
    setGlassesRecording(false);
    // 停止波形动画
    if (glassesWaveformRef.current) {
      clearTimeout(glassesWaveformRef.current);
    }
    // 停止计时
    if (glassesTimerRef.current) {
      clearInterval(glassesTimerRef.current);
    }
    
    // 停止录音并保存
    if (glassesMediaRecorderRef.current) {
      glassesMediaRecorderRef.current.stop();
      glassesMediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      
      // 等待数据收集完成
      setTimeout(() => {
        const audioBlob = new Blob(glassesAudioChunksRef.current, { type: 'audio/webm' });
        const voiceUrl = URL.createObjectURL(audioBlob);
        
        // 创建一条眼镜端的互动记录
        if (currentPodcast) {
          const note: InterruptNote = {
            id: `glasses-${Date.now()}`,
            podcastId: currentPodcast.id,
            podcastTitle: currentPodcast.title,
            timestamp: Date.now(),
            audioTime: glassesAudioTime,
            content: `👓 智能眼镜语音留言 (${glassesRecordingDuration}秒)`,
            type: 'voice',
            voiceUrl,
            voiceDuration: glassesRecordingDuration
          };
          setLocalInterruptNotes(prev => [note, ...prev]);
          setSidebarTab('interaction');
        }
        
        // 关闭弹窗
        setShowGlassesModal(false);
        setGlassesWaveform(new Array(12).fill(0));
      }, 100);
    } else {
      // 如果没有录音，也创建记录（无音频）
      if (currentPodcast) {
        const note: InterruptNote = {
          id: `glasses-${Date.now()}`,
          podcastId: currentPodcast.id,
          podcastTitle: currentPodcast.title,
          timestamp: Date.now(),
          audioTime: glassesAudioTime,
          content: `👓 智能眼镜语音留言 (${glassesRecordingDuration}秒)`,
          type: 'voice',
          voiceDuration: glassesRecordingDuration
        };
        setLocalInterruptNotes(prev => [note, ...prev]);
        setSidebarTab('interaction');
      }
      // 关闭弹窗
      setTimeout(() => {
        setShowGlassesModal(false);
        setGlassesWaveform(new Array(12).fill(0));
      }, 500);
    }
  };

  // 关闭眼镜弹窗
  const handleCloseGlassesModal = () => {
    setShowGlassesModal(false);
    setGlassesRecording(false);
    if (glassesWaveformRef.current) {
      clearTimeout(glassesWaveformRef.current);
    }
    if (glassesTimerRef.current) {
      clearInterval(glassesTimerRef.current);
    }
    // 停止录音
    if (glassesMediaRecorderRef.current) {
      glassesMediaRecorderRef.current.stop();
      glassesMediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    // 停止语音识别
    if (glassesRecognitionRef.current) {
      glassesRecognitionRef.current.stop();
    }
    setGlassesWaveform(new Array(12).fill(0));
    setGlassesTranscript('');
    setGlassesShowHighlight(false);
  };

  // 清理眼镜相关资源
  useEffect(() => {
    return () => {
      if (glassesWaveformRef.current) {
        clearTimeout(glassesWaveformRef.current);
      }
      if (glassesTimerRef.current) {
        clearInterval(glassesTimerRef.current);
      }
      if (glassesRecognitionRef.current) {
        glassesRecognitionRef.current.stop();
      }
    };
  }, []);

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
      if (shareAudioRef.current) {
        shareAudioRef.current.pause();
      }
      if (shareVoiceRef.current) {
        shareVoiceRef.current.pause();
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

  // 获取嘉宾第一句话并添加红色标注
  const getGuestFirstLineWithHighlight = () => {
    if (!currentPodcast?.script) return { text: '', highlighted: '' };
    const lines = currentPodcast.script.split('\n');
    for (const line of lines) {
      if (
        line.includes('嘉宾') ||
        line.includes('Guest') ||
        line.includes(currentPodcast.guestName || '')
      ) {
        const match = line.match(/[：:]\s*[""]?(.+?)[""]?\s*$/);
        let text = '';
        if (match) {
          text = match[1];
        } else {
          const colonIndex =
            line.indexOf('：') !== -1 ? line.indexOf('：') : line.indexOf(':');
          if (colonIndex !== -1) text = line.slice(colonIndex + 1).trim();
        }
        if (text) {
          // 找出可以高亮的关键词
          const keywords = ['勇气', '恐惧', '坚持', '珍贵', '梦想', '创业', '理想', '执着', '美学', '生产力', '折腾', '生命'];
          let highlighted = '';
          for (const kw of keywords) {
            if (text.includes(kw)) {
              highlighted = kw;
              break;
            }
          }
          return { text, highlighted };
        }
      }
    }
    return { text: currentPodcast.title, highlighted: '' };
  };

  // 分享卡片组件 - 新设计
  const ShareCard = () => {
    const { text: guestLine, highlighted } = getGuestFirstLineWithHighlight();
    
    // 渲染带高亮的文字
    const renderHighlightedText = (text: string, keyword: string) => {
      if (!keyword || !text.includes(keyword)) {
        return <span>{text}</span>;
      }
      const parts = text.split(keyword);
      return (
        <>
          {parts.map((part, i) => (
            <React.Fragment key={i}>
              {part}
              {i < parts.length - 1 && (
                <span className="text-orange-500 font-bold">{keyword}</span>
              )}
            </React.Fragment>
          ))}
        </>
      );
    };

    return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in">
      {/* 顶部提示 */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-slate-400 text-sm">
        卡片已生成，立即分发至社交平台
      </div>

      {/* 返回按钮 */}
      <button
        onClick={handleCloseShareCard}
        className="absolute top-4 right-6 px-4 py-2 bg-slate-800 text-white rounded-full text-sm hover:bg-slate-700 transition-colors border border-slate-600"
      >
        返回列表
      </button>

      {/* 卡片主体 */}
      <div 
        className="w-[380px] rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%)',
          border: '1px solid #333'
        }}
      >
        {/* 头部 - Logo */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-lg">
              W!
            </div>
            <span className="text-white font-semibold text-lg">Weibodcast</span>
          </div>
        </div>

        {/* 播客片段区域 */}
        <div className="px-4 pb-4">
          <div className="flex items-start space-x-3">
            {/* 嘉宾头像 */}
            <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-slate-700">
              {currentPodcast?.guestName && currentPodcast.guestName !== 'Guest' ? (
                <img
                  src={`/image/${encodeURIComponent(currentPodcast.guestName)}.gif`}
                  alt={currentPodcast.guestName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music2 className="w-6 h-6 text-slate-500" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <span className="inline-block px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full mb-1">
                播客片段
              </span>
              <p className="text-white font-medium">
                {currentPodcast?.guestName || '嘉宾'}：{currentPodcast?.title?.slice(0, 12)}...
              </p>
            </div>
          </div>
        </div>

        {/* 高光时刻 - 嘉宾语录 */}
        <div className="mx-4 mb-4">
          <div 
            className="p-4 rounded-2xl relative"
            style={{
              background: 'linear-gradient(135deg, rgba(30,30,30,0.9) 0%, rgba(20,20,20,0.9) 100%)',
              border: '2px solid #f97316',
              boxShadow: '0 0 20px rgba(249, 115, 22, 0.3)'
            }}
          >
            <span className="absolute -top-3 left-4 px-2 py-0.5 bg-[#1a1a1a] text-orange-400 text-xs">
              高光时刻
            </span>
            <p className="text-white text-lg leading-relaxed font-medium">
              "{renderHighlightedText(guestLine, highlighted)}"
            </p>
          </div>
        </div>

        {/* 用户语音点评区域 */}
        <div className="mx-4 mb-4">
          <div 
            className="p-4 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
            }}
          >
            {/* 语音播放按钮 */}
            {pendingShareNote?.voiceUrl ? (
              <button
                onClick={toggleShareVoice}
                className="w-full flex items-center justify-center space-x-3 py-3 bg-white/20 hover:bg-white/30 rounded-xl transition-all mb-3"
              >
                {isPlayingShareVoice ? (
                  <>
                    <Pause className="w-6 h-6 text-white" />
                    <span className="text-white font-medium">暂停语音</span>
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6 text-white" />
                    <span className="text-white font-medium">播放我的语音点评 ({pendingShareNote.voiceDuration}秒)</span>
                  </>
                )}
              </button>
            ) : (
              <div className="py-3 text-white/60 text-center text-sm">
                暂无语音
              </div>
            )}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-white text-xs">听众</span>
              </div>
              <span className="text-white/80 text-sm">认证深度听众</span>
            </div>
          </div>
        </div>

        {/* 底部分享栏 */}
        <div className="px-4 py-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs tracking-widest uppercase">
              SHARED VIA WEIBODCAST
            </span>
            <div className="flex items-center space-x-2">
              {/* 分享按钮 */}
              <button
                onClick={() => handleShare('wechat')}
                className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center hover:scale-110 transition-transform"
                title="微信"
              >
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348z"/>
                </svg>
              </button>
              <button
                onClick={() => handleShare('weibo')}
                className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center hover:scale-110 transition-transform"
                title="微博"
              >
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10.098 20.323c-3.977.391-7.414-1.406-7.672-4.02-.259-2.609 2.759-5.047 6.74-5.441 3.979-.394 7.413 1.404 7.671 4.018.259 2.6-2.759 5.049-6.737 5.439z"/>
                </svg>
              </button>
              {/* 页面指示器 */}
              <div className="flex items-center space-x-1 ml-2">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <div className="w-2 h-2 rounded-full bg-slate-600" />
              </div>
            </div>
          </div>
        </div>

        {/* 保存按钮 */}
        <div className="px-4 pb-4">
          <button
            onClick={handleConfirmShare}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-medium hover:from-orange-400 hover:to-orange-500 transition-all"
          >
            保存到互动记录
          </button>
        </div>
      </div>
    </div>
  );
  };

  // 智能眼镜弹窗组件 - HUD 风格
  const GlassesModal = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in overflow-hidden"
      style={{
        background: 'radial-gradient(circle at 20% 30%, #ffffff 0%, transparent 70%), radial-gradient(circle at 80% 70%, #dcd0ff 0%, transparent 70%), linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)'
      }}
    >
      {/* 关闭按钮 */}
      <button
        onClick={handleCloseGlassesModal}
        className="absolute top-5 right-5 text-slate-500 hover:text-slate-800 transition-colors p-3 z-[200] bg-white/70 backdrop-blur-sm rounded-full cursor-pointer hover:bg-white shadow-lg"
      >
        <X className="w-6 h-6" />
      </button>

      {/* 连接状态提示 */}
      <div className="absolute top-5 left-5 flex items-center space-x-2 text-emerald-600 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full z-[150]">
        <BluetoothConnected className="w-5 h-5" />
        <span className="text-sm font-medium">智能眼镜已连接</span>
        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
      </div>

      {/* 测试按钮 - 手动触发高亮 */}
      <button
        onClick={triggerGlassesHighlight}
        className="absolute top-5 left-1/2 -translate-x-1/2 text-slate-600 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full text-sm hover:bg-white/70 transition-colors z-[150] cursor-pointer"
      >
        测试：模拟说"很有道理"
      </button>

      {/* 眼镜主体 */}
      <div className="glasses-wrapper flex items-center justify-center w-full max-w-[1100px]"
        style={{ perspective: '1500px', filter: 'drop-shadow(0 40px 80px rgba(0,0,0,0.25))' }}
      >
        <div className="flex items-center justify-center">
          {/* 左镜片 */}
          <div 
            className="relative overflow-hidden"
            style={{
              width: '420px',
              height: '320px',
              background: 'rgba(20, 20, 25, 0.45)',
              border: '14px solid #080808',
              borderRadius: '60px 60px 110px 110px',
              backdropFilter: 'blur(4px) brightness(0.85)',
              boxShadow: 'inset 0 0 60px rgba(0,0,0,0.7), inset 0 15px 30px rgba(255,255,255,0.05), 0 10px 30px rgba(0,0,0,0.3)',
              transform: 'perspective(600px) rotateY(3deg)'
            }}
          >
            {/* HUD 层 - 左镜片 */}
            <div className={`absolute inset-0 p-6 transition-all duration-400 ${glassesShowHighlight ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
              {/* 媒体/播客封面 - 只在检测到关键词时显示 */}
              <div className={`absolute top-8 left-6 w-32 h-32 transition-all duration-500 ${glassesShowHighlight ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-5'}`}>
                {currentPodcast?.guestName && currentPodcast.guestName !== 'Guest' ? (
                  <img
                    src={`/image/${encodeURIComponent(currentPodcast.guestName)}.gif`}
                    alt={currentPodcast.guestName}
                    className="w-full h-full object-contain"
                    style={{ filter: 'drop-shadow(0 0 10px rgba(0, 242, 255, 0.3))' }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-500/30 flex items-center justify-center">
                    <Music2 className="w-12 h-12 text-cyan-400/60" />
                  </div>
                )}
              </div>

              {/* 状态标签 - 只在检测到关键词时显示 */}
              <div className={`absolute bottom-6 left-6 flex flex-col gap-0.5 transition-all duration-500 ${glassesShowHighlight ? 'opacity-100' : 'opacity-0'}`}>
                <span className="text-[10px] text-white/50 tracking-[2.5px] uppercase font-semibold">
                  智能语境分析 @
                </span>
                <span 
                  className="text-2xl font-light font-mono"
                  style={{ color: '#00f2ff', textShadow: '0 0 15px rgba(0, 242, 255, 0.4)' }}
                >
                  {formatTime(glassesAudioTime)}
                </span>
              </div>
            </div>
          </div>

          {/* 鼻梁 */}
          <div 
            className="relative z-10 -mx-4"
            style={{
              width: '70px',
              height: '35px',
              background: '#080808',
              borderRadius: '4px 4px 20px 20px',
              boxShadow: 'inset 0 -5px 15px rgba(0,0,0,0.8)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          />

          {/* 右镜片 */}
          <div 
            className="relative overflow-hidden"
            style={{
              width: '420px',
              height: '320px',
              background: 'rgba(20, 20, 25, 0.45)',
              border: '14px solid #080808',
              borderRadius: '60px 60px 110px 110px',
              backdropFilter: 'blur(4px) brightness(0.85)',
              boxShadow: 'inset 0 0 60px rgba(0,0,0,0.7), inset 0 15px 30px rgba(255,255,255,0.05), 0 10px 30px rgba(0,0,0,0.3)',
              transform: 'perspective(600px) rotateY(-3deg)'
            }}
          >
            {/* HUD 层 - 右镜片 */}
            <div className="absolute inset-0 p-6">
              {/* 播客信息 */}
              <div className="absolute top-8 right-6 text-right">
                <p className="text-white text-sm font-medium truncate max-w-[200px]">{currentPodcast?.title}</p>
                <p className="text-white/40 text-xs mt-1">By Weibodcast AI</p>
              </div>

              {/* 状态显示 */}
              <div className="absolute bottom-8 right-6 text-right">
                <span className="text-[10px] text-white/50 tracking-[2.5px] uppercase">
                  {glassesRecognitionState}
                </span>
              </div>

              {/* 完成按钮 */}
              {glassesRecording && (
                <div className="absolute bottom-8 left-6">
                  <button
                    onClick={handleGlassesFinish}
                    className="px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105"
                    style={{
                      background: 'rgba(0, 242, 255, 0.2)',
                      border: '1px solid rgba(0, 242, 255, 0.5)',
                      color: '#00f2ff',
                      boxShadow: '0 0 20px rgba(0, 242, 255, 0.3)'
                    }}
                  >
                    <span className="flex items-center space-x-2">
                      <Check className="w-4 h-4" />
                      <span>说完了</span>
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 底部语音识别文字 */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-center">
        <span className={`text-sm text-slate-600 transition-opacity ${glassesTranscript ? 'opacity-100' : 'opacity-0'}`}>
          {glassesTranscript}
        </span>
      </div>

      {/* 底部波形和文字 */}
      <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex flex-col items-center">
        {/* 波形图 */}
        <div className={`flex items-center justify-center h-5 space-x-0.5 transition-all ${glassesShowHighlight ? 'opacity-100' : 'opacity-30'}`}>
          {glassesWaveform.map((level, i) => (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-75 ${glassesShowHighlight ? 'bg-cyan-500' : 'bg-slate-500'}`}
              style={{ 
                height: `${glassesRecording ? level * 16 : 4}px`,
              }}
            />
          ))}
        </div>
        
        {/* 提示文字 */}
        <p className="text-[9px] text-slate-400/50 tracking-[2px] uppercase mt-4">
          试着说："很有道理"
        </p>
      </div>

      {/* 录音时长显示 */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2">
        <span className={`text-sm text-slate-500 transition-opacity ${glassesRecording ? 'opacity-100' : 'opacity-0'}`}>
          {Math.floor(glassesRecordingDuration / 60).toString().padStart(2, '0')}:
          {(glassesRecordingDuration % 60).toString().padStart(2, '0')}
        </span>
      </div>
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
    {showShareCard && <ShareCard />}
    {showGlassesModal && <GlassesModal />}
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

            {/* 打断并对话 + 智能眼镜按钮 */}
            <div className="flex items-center space-x-2">
              {/* 打断并语音按钮 */}
              <div className="relative">
                <button
                  onClick={handleVoiceInterrupt}
                  className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full hover:from-orange-400 hover:to-red-400 transition-all shadow-lg hover:shadow-orange-500/30 text-sm font-medium"
                >
                  <Mic className="w-4 h-4" />
                  <span>打断并对话</span>
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

              {/* 蓝牙眼镜连接按钮 */}
              <button
                onClick={handleGlassesConnect}
                className={`flex items-center space-x-2 px-3 py-2 rounded-full transition-all text-sm font-medium ${
                  isGlassesConnected
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-600'
                }`}
              >
                {isGlassesConnected ? (
                  <>
                    <BluetoothConnected className="w-4 h-4" />
                    <span>眼镜已连接</span>
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  </>
                ) : (
                  <>
                    <Bluetooth className="w-4 h-4" />
                    <span>连接 AI 眼镜</span>
                  </>
                )}
              </button>
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