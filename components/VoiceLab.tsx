import React, { useState } from 'react';
import { Upload, Music, Key, Users, Play, Wand2, FileAudio, CheckCircle2, AlertCircle } from 'lucide-react';
import LogViewer from './LogViewer';
import { LogEntry } from '../types';
import { uploadFileToMiniMax, generateMiniMaxAudio } from '../services/minimaxService';
import { pcmToWavBlob } from '../services/audioUtils';

const VoiceLab: React.FC = () => {
  // Config
  const [apiKey, setApiKey] = useState('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJHcm91cE5hbWUiOiLmtbfonrrnlKjmiLdfNDU0Mjc3MTcwMDE3MDA5NjY4IiwiVXNlck5hbWUiOiLmtbfonrrnlKjmiLdfNDU0Mjc3MTcwMDE3MDA5NjY4IiwiQWNjb3VudCI6IiIsIlN1YmplY3RJRCI6IjE5OTc2NzgwMjQyNDExODkwNzUiLCJQaG9uZSI6IjE4MDY4NDI4NzIwIiwiR3JvdXBJRCI6IjE5OTc2NzgwMjQyMzY5OTQ3NzEiLCJQYWdlTmFtZSI6IiIsIk1haWwiOiIiLCJDcmVhdGVUaW1lIjoiMjAyNS0xMi0xNyAxMzozMzozNSIsIlRva2VuVHlwZSI6MSwiaXNzIjoibWluaW1heCJ9.AenWH4oBFC3-Yjp0D63tJDRoy_YSAM5F-MrdKyWeg6lXmSqjG18FPE-3Lct32x4PRmvj6shLt3ZxY7yDQXkhDAMo0FfWqjFHLDWXIOJTrF8opQ7oDCRbYgvLPadnYFpMtACEEe0LbxphHz8VbYp6vuEV7QonlU5pAUDKU2T94nu1Qel0UoC2vFmYt1l9aic3JMehPeLFZlcA93stNAlolWh_ry31IPG9OYVjUnIrRXWB4vwd9FjXofb5m2uJvl23zrQEaohFiyh03fDzmkho-WxyKKnLuUN9Xp7NrLNco0mjrYSYougJkB0w7pAy_nuBsojLCnB9GSqof5NWEavWkw');
  const [groupId, setGroupId] = useState('1997678024236994771');
  
  // Clone State
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  
  // Synthesis State
  const [text, setText] = useState('This is a test of the cloned voice. How does it sound?');
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  
  // Process State
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    };
    setLogs(prev => [...prev, newLog]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setUploadedFileId(null); // Reset upload status
      addLog(`Selected file: ${selectedFile.name}`, 'info');
    }
  };

  const handleUploadAndClone = async () => {
    if (!file || !apiKey || !groupId) return;
    setIsLoading(true);
    addLog('Starting Upload & Clone process...', 'info');
    
    try {
        // Pass logger to service
        const fileId = await uploadFileToMiniMax(file, apiKey, groupId, (msg) => addLog(msg, 'info'));
        setUploadedFileId(fileId);
        addLog(`Clone Successful! File ID: ${fileId}`, 'success');
    } catch (e: any) {
        addLog(`Clone Failed: ${e.message}`, 'error');
    } finally {
        setIsLoading(false);
    }
  };

  const handleGenerateSpeech = async () => {
    if (!uploadedFileId || !apiKey || !groupId || !text) return;
    setIsLoading(true);
    addLog('Generating speech...', 'info');

    try {
        // Pass logger to service
        const { buffer, url } = await generateMiniMaxAudio(text, uploadedFileId, apiKey, groupId, (msg) => addLog(msg, 'info'));
        
        if (url) {
           // Use the direct URL if available (faster start, less memory)
           setGeneratedAudioUrl(url);
           addLog('Speech generated successfully. Playing from URL.', 'success');
        } else {
           // Fallback for hex audio or no-url responses
           const wavBlob = pcmToWavBlob(new Uint8Array(buffer), 32000); // MiniMax usually 32k
           const blobUrl = URL.createObjectURL(wavBlob);
           setGeneratedAudioUrl(blobUrl);
           addLog('Speech generated successfully (Blob).', 'success');
        }

    } catch (e: any) {
        addLog(`Generation Failed: ${e.message}`, 'error');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
      {/* LEFT COLUMN: Controls */}
      <div className="space-y-6">
        
        {/* 1. Configuration */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg">
           <h3 className="text-lg font-bold text-white mb-4 flex items-center">
             <Key className="w-5 h-5 mr-2 text-pink-400" />
             1. Configuration
           </h3>
           <div className="space-y-4">
             <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">MiniMax API Key</label>
                <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="ey..."
                    className="block w-full px-3 py-2 border border-slate-600 rounded text-sm bg-slate-900 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-pink-500 transition"
                />
             </div>
             <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Group ID</label>
                <input
                    type="text"
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    placeholder="123456"
                    className="block w-full px-3 py-2 border border-slate-600 rounded text-sm bg-slate-900 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-pink-500 transition"
                />
             </div>
           </div>
        </div>

        {/* 2. Upload & Clone */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg">
           <div className="flex justify-between items-center mb-4">
             <h3 className="text-lg font-bold text-white flex items-center">
               <Upload className="w-5 h-5 mr-2 text-blue-400" />
               2. Upload & Clone
             </h3>
             {uploadedFileId && (
               <span className="text-xs bg-green-900/50 text-green-400 px-2 py-1 rounded-full border border-green-800 flex items-center">
                 <CheckCircle2 className="w-3 h-3 mr-1" />
                 Ready
               </span>
             )}
           </div>
           
           <div className="space-y-4">
             {!file ? (
               <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 hover:bg-slate-700/30 transition-colors text-center cursor-pointer relative">
                 <input 
                   type="file" 
                   accept="audio/*" 
                   onChange={handleFileChange}
                   className="absolute inset-0 opacity-0 cursor-pointer"
                 />
                 <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                 <p className="text-sm text-slate-300">Click to select reference audio</p>
                 <p className="text-xs text-slate-500 mt-1">MP3/WAV, max 10MB</p>
               </div>
             ) : (
               <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 flex flex-col space-y-3">
                 <div className="flex items-center space-x-3">
                   <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center shrink-0">
                     <FileAudio className="w-5 h-5 text-blue-400" />
                   </div>
                   <div className="overflow-hidden">
                     <p className="text-sm font-medium text-slate-200 truncate">{file.name}</p>
                     <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                   </div>
                 </div>
                 {previewUrl && (
                    <audio controls src={previewUrl} className="w-full h-8 rounded" />
                 )}
               </div>
             )}
             
             <button
               onClick={handleUploadAndClone}
               disabled={!file || !apiKey || !groupId || isLoading}
               className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all
                 ${(!file || !apiKey || !groupId || isLoading)
                   ? 'bg-slate-600 cursor-not-allowed opacity-50'
                   : 'bg-blue-600 hover:bg-blue-500 hover:shadow-blue-500/25'
                 }`}
             >
               {isLoading && !uploadedFileId ? 'Uploading...' : 'Upload & Clone Voice'}
             </button>
             
             {uploadedFileId && (
               <div className="text-xs font-mono text-slate-500 break-all bg-black/20 p-2 rounded">
                 File ID: {uploadedFileId}
               </div>
             )}
           </div>
        </div>

        {/* 3. Synthesis */}
        <div className={`bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg transition-opacity duration-500 ${!uploadedFileId ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'}`}>
           <h3 className="text-lg font-bold text-white mb-4 flex items-center">
             <Wand2 className="w-5 h-5 mr-2 text-purple-400" />
             3. Generate Speech
           </h3>
           <div className="space-y-4">
             <textarea
               value={text}
               onChange={(e) => setText(e.target.value)}
               className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition text-sm min-h-[100px]"
               placeholder="Enter text to speak with the cloned voice..."
             />
             
             <button
               onClick={handleGenerateSpeech}
               disabled={!uploadedFileId || !text || isLoading}
               className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all
                 ${(!uploadedFileId || !text || isLoading)
                   ? 'bg-slate-600 cursor-not-allowed opacity-50'
                   : 'bg-purple-600 hover:bg-purple-500 hover:shadow-purple-500/25'
                 }`}
             >
               {isLoading && uploadedFileId ? 'Generating...' : 'Generate Audio'}
             </button>

             {generatedAudioUrl && (
               <div className="mt-4 p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg animate-fade-in-up">
                 <p className="text-xs text-purple-300 mb-2 font-semibold">Generated Result:</p>
                 <audio controls src={generatedAudioUrl} className="w-full h-10 rounded" />
               </div>
             )}
           </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Logs */}
      <div className="space-y-6">
         <h3 className="text-lg font-bold text-slate-400 flex items-center">
            Debug Logs
         </h3>
         <LogViewer logs={logs} isExpanded={true} />
         
         <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 text-xs text-slate-400">
            <h4 className="font-semibold text-slate-300 mb-2">Instructions</h4>
            <ol className="list-decimal pl-4 space-y-2">
               <li>Enter your MiniMax <strong>API Key</strong> and <strong>Group ID</strong>.</li>
               <li>Upload a clear audio sample (10s - 60s recommended) of the voice you want to clone.</li>
               <li>Click <strong>Upload & Clone Voice</strong>. This uploads the file to MiniMax servers.</li>
               <li>Once you see the "Ready" badge, enter text and click <strong>Generate Audio</strong>.</li>
            </ol>
         </div>
      </div>
    </div>
  );
};

export default VoiceLab;