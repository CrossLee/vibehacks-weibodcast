export enum AppStatus {
  IDLE = 'IDLE',
  SCRAPING = 'SCRAPING',
  GENERATING_SCRIPT = 'GENERATING_SCRIPT',
  GENERATING_AUDIO = 'GENERATING_AUDIO',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface WeiboPost {
  id: string;
  content: string;
  date: string;
}

export interface PodcastScriptLine {
  speaker: string;
  text: string;
}

export interface SpeakerSegment {
  speaker: 'Host' | 'Guest';
  startTime: number;
  endTime: number;
}

export interface PodcastResult {
  id: string;
  timestamp: number;
  title: string;
  script: string;
  audioUrl?: string;
  timeline?: SpeakerSegment[];
  guestName?: string;
}

export enum VoiceOption {
  MALE = 'Fenrir',
  FEMALE = 'Kore',
  CLONED = 'Cloned' 
}

export interface InterruptNote {
  id: string;
  podcastId: string;
  podcastTitle: string;
  timestamp: number;
  audioTime: number;
  content: string;
  type: 'text' | 'voice';
  voiceUrl?: string;
  voiceDuration?: number;
}