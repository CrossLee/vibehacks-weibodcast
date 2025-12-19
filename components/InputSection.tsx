import React, { useState, useEffect } from 'react';
import { Search, Upload, Wand2, UserCircle2, X, Music, Key, Users, AlertTriangle, ChevronDown } from 'lucide-react';
import { AppStatus } from '../types';
import { pcmToWavBlob } from '../services/audioUtils';

interface InputSectionProps {
  status: AppStatus;
  onStart: (userId: string, clonedFile: File | null, apiKey?: string, groupId?: string) => void;
  initialContentProvided?: boolean;
}

import { WEIBO_PRESETS } from '../constants';

const InputSection: React.FC<InputSectionProps> = ({ status, onStart, initialContentProvided }) => {
  const [userId, setUserId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUsingDummy, setIsUsingDummy] = useState(false);
  
  // If content is provided (from Spider Lab), we might want to auto-fill an ID or show a status
  // But for now, we just rely on the user to select voice or hit generate.
  // Actually, we can assume if initialContentProvided is true, we can skip ID validation strictly for scraping,
  // but we still need an ID for "preset" voice lookup.
  
  // MiniMax Config
  const [apiKey, setApiKey] = useState('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJHcm91cE5hbWUiOiLmtbfonrrnlKjmiLdfNDU0Mjc3MTcwMDE3MDA5NjY4IiwiVXNlck5hbWUiOiLmtbfonrrnlKjmiLdfNDU0Mjc3MTcwMDE3MDA5NjY4IiwiQWNjb3VudCI6IiIsIlN1YmplY3RJRCI6IjE5OTc2NzgwMjQyNDExODkwNzUiLCJQaG9uZSI6IjE4MDY4NDI4NzIwIiwiR3JvdXBJRCI6IjE5OTc2NzgwMjQyMzY5OTQ3NzEiLCJQYWdlTmFtZSI6IiIsIk1haWwiOiIiLCJDcmVhdGVUaW1lIjoiMjAyNS0xMi0xNyAxMzozMzozNSIsIlRva2VuVHlwZSI6MSwiaXNzIjoibWluaW1heCJ9.AenWH4oBFC3-Yjp0D63tJDRoy_YSAM5F-MrdKyWeg6lXmSqjG18FPE-3Lct32x4PRmvj6shLt3ZxY7yDQXkhDAMo0FfWqjFHLDWXIOJTrF8opQ7oDCRbYgvLPadnYFpMtACEEe0LbxphHz8VbYp6vuEV7QonlU5pAUDKU2T94nu1Qel0UoC2vFmYt1l9aic3JMehPeLFZlcA93stNAlolWh_ry31IPG9OYVjUnIrRXWB4vwd9FjXofb5m2uJvl23zrQEaohFiyh03fDzmkho-WxyKKnLuUN9Xp7NrLNco0mjrYSYougJkB0w7pAy_nuBsojLCnB9GSqof5NWEavWkw');
  const [groupId, setGroupId] = useState('1997678024236994771');
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    setIsUsingDummy(false);
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Create object URL for preview
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    }
  };

  const createDummyAudioFile = (filename: string): File => {
    // Generate 5 seconds of simple sine wave tone at 440Hz
    // Increased to 5s to meet minimum requirements for some cloning engines
    const sampleRate = 24000;
    const duration = 5; 
    const numSamples = sampleRate * duration;
    const buffer = new Int16Array(numSamples);
    const freq = 440; 
    
    for (let i = 0; i < numSamples; i++) {
        // Sine wave with fade in/out
        const envelope = Math.min(1, Math.min(i, numSamples - i) / 2000); 
        buffer[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate) * 0.3 * 32767 * envelope;
    }
    
    const blob = pcmToWavBlob(new Uint8Array(buffer.buffer), sampleRate);
    return new File([blob], filename, { type: "audio/wav" });
  };

  const clearFile = () => {
    setFile(null);
    setFileError(null);
    setIsUsingDummy(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handlePresetChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    
    if (!selectedId) {
        setUserId('');
        clearFile();
        return;
    }

    setUserId(selectedId);
    
    // Auto-populate voice sample for presets
    const preset = WEIBO_PRESETS.find(p => p.id === selectedId);
    if (preset) {
        setFileError(null);
        
        try {
            // Attempt to fetch real file from public directory (assuming it exists)
            const response = await fetch(`/${preset.filename}`);
            if (response.ok) {
                const blob = await response.blob();
                const filename = preset.filename.split('/').pop() || preset.filename;
                const realFile = new File([blob], filename, { type: response.headers.get('content-type') || 'audio/wav' });
                
                setFile(realFile);
                setIsUsingDummy(false);
                
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setPreviewUrl(URL.createObjectURL(realFile));
            } else {
                throw new Error("File not found");
            }
        } catch (error) {
            console.warn(`Could not load real audio for ${preset.name}, falling back to placeholder.`);
            // Fallback to dummy
            const filename = preset.filename.split('/').pop() || preset.filename;
            const dummyFile = createDummyAudioFile(filename);
            setFile(dummyFile);
            setIsUsingDummy(true);
            
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(URL.createObjectURL(dummyFile));
        }
    }
  };

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const isLoading = status !== AppStatus.IDLE && status !== AppStatus.COMPLETED && status !== AppStatus.ERROR;
  const isHybridMode = !!file;

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg">
      <div className="space-y-6">
        {/* Weibo ID Input with Dropdown */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Weibo User ID</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <UserCircle2 className="h-5 w-5 text-slate-500" />
            </div>
            
            {/* Input Field */}
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter ID or select preset"
              disabled={isLoading}
              className="block w-full pl-10 pr-32 py-3 border border-slate-600 rounded-lg leading-5 bg-slate-900 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition sm:text-sm"
            />

            {/* Dropdown Select (Overlaid on Right) */}
            <div className="absolute inset-y-0 right-0 flex items-center">
              <div className="relative h-full">
                <select
                  value={WEIBO_PRESETS.find(p => p.id === userId)?.id || ""}
                  onChange={handlePresetChange}
                  disabled={isLoading}
                  className="h-full pl-3 pr-8 bg-slate-800/80 border-l border-slate-600 text-slate-300 text-xs font-medium hover:bg-slate-700 focus:outline-none rounded-r-lg appearance-none cursor-pointer transition-colors"
                >
                  <option value="">手动</option>
                  {WEIBO_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Voice Cloning Upload */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Target Voice Sample
            <span className="ml-2 text-xs text-pink-400 bg-pink-400/10 px-2 py-0.5 rounded-full">MiniMax Cloning</span>
          </label>
          
          {!file ? (
            <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 ${fileError ? 'border-red-500/50 bg-red-500/5' : 'border-slate-600 hover:bg-slate-700/30'} border-dashed rounded-lg transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
              <div className="space-y-1 text-center relative">
                <Upload className={`mx-auto h-8 w-8 ${fileError ? 'text-red-400' : 'text-slate-400'}`} />
                <div className="flex text-sm text-slate-400 justify-center">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer rounded-md font-medium text-pink-500 hover:text-pink-400 focus-within:outline-none"
                  >
                    <span>Upload a file</span>
                    <input 
                      id="file-upload" 
                      name="file-upload" 
                      type="file" 
                      className="sr-only" 
                      accept="audio/*"
                      onChange={handleFileChange}
                      disabled={isLoading}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-slate-500">MP3, WAV up to 10MB</p>
                {fileError && <p className="text-xs text-red-400 mt-2">{fileError}</p>}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Card */}
              <div className="mt-1 bg-slate-700/30 border border-slate-600 rounded-lg p-4 transition-all animate-fade-in">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center shrink-0">
                        <Music className="w-5 h-5 text-pink-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">{file.name}</p>
                        <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button 
                      onClick={clearFile}
                      disabled={isLoading}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-600 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Remove file"
                    >
                      <X className="w-5 h-5" />
                    </button>
                </div>
                
                {previewUrl && (
                  <div className="space-y-2">
                    <audio 
                      controls 
                      src={previewUrl} 
                      className="w-full h-10 rounded outline-none" 
                      controlsList="nodownload"
                    >
                      Your browser does not support the audio element.
                    </audio>
                    {isUsingDummy && (
                         <div className="flex items-center text-[10px] text-yellow-400 bg-yellow-400/10 p-2 rounded">
                            <AlertTriangle className="w-3 h-3 mr-1.5" />
                            Audio missing: Using 5s Sine Wave placeholder. Place '{file.name}' in public/ to fix.
                         </div>
                    )}
                  </div>
                )}
              </div>

              {/* MiniMax Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                 {/* API Key */}
                 <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                    <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center">
                       <Key className="w-3 h-3 mr-1" />
                       MiniMax Key
                    </label>
                    <input
                       type="password"
                       value={apiKey}
                       onChange={(e) => setApiKey(e.target.value)}
                       placeholder="ey..."
                       className="block w-full px-3 py-2 border border-slate-600 rounded text-xs bg-slate-800 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-pink-500"
                    />
                 </div>
                 
                 {/* Group ID */}
                 <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                    <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center">
                       <Users className="w-3 h-3 mr-1" />
                       Group ID
                    </label>
                    <input
                       type="text"
                       value={groupId}
                       onChange={(e) => setGroupId(e.target.value)}
                       placeholder="123456"
                       className="block w-full px-3 py-2 border border-slate-600 rounded text-xs bg-slate-800 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-pink-500"
                    />
                 </div>
              </div>
              <p className="text-[10px] text-slate-500">
                Required for MiniMax Voice Cloning. Keys are not stored.
              </p>
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={() => onStart(userId, file, apiKey, groupId)}
          disabled={(!initialContentProvided && !userId) || isLoading || (isHybridMode && (!apiKey || !groupId))}
          className={`w-full flex items-center justify-center py-4 px-6 border border-transparent rounded-lg text-base font-bold text-white shadow-md transition-all
            ${((!initialContentProvided && !userId) || isLoading || (isHybridMode && (!apiKey || !groupId)))
              ? 'bg-slate-600 cursor-not-allowed' 
              : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 hover:shadow-lg transform hover:-translate-y-0.5'
            }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-5 w-5" />
              {initialContentProvided ? "Generate from Scraped Content" : "Generate Weibodcast"}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default InputSection;