import React, { useState, useRef, useEffect } from 'react'; 
import { Upload, Play, Pause, RefreshCw, PartyPopper, Trash2, Ghost } from 'lucide-react'; 

interface DancerState { 
  id: number; 
  x: number; 
  y: number; 
  rotation: number; 
  scale: number; 
} 

const ImageDance: React.FC = () => { 
  const [image, setImage] = useState<string | null>(null); 
  const [isDancing, setIsDancing] = useState(false); 
  const [dancers, setDancers] = useState<DancerState[]>([]); 
  const timerRefs = useRef<(number | null)[]>([]); 

  // Initialize 5 dancers 
  useEffect(() => { 
    const initialDancers = Array.from({ length: 5 }, (_, i) => ({ 
      id: i, 
      x: 20 + Math.random() * 60, 
      y: 20 + Math.random() * 60, 
      rotation: (Math.random() - 0.5) * 40, 
      scale: 0.8 + Math.random() * 0.4 
    })); 
    setDancers(initialDancers); 
    timerRefs.current = new Array(5).fill(null); 
  }, []); 

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => { 
    if (e.target.files && e.target.files[0]) { 
      const reader = new FileReader(); 
      reader.onload = (event) => { 
        setImage(event.target?.result as string); 
      }; 
      reader.readAsDataURL(e.target.files[0]); 
    } 
  }; 

  const startDance = () => { 
    setIsDancing(true); 
  }; 

  const stopDance = () => { 
    setIsDancing(false); 
    timerRefs.current.forEach(timer => { 
      if (timer) window.clearTimeout(timer); 
    }); 
    // Reset positions loosely 
    setDancers(prev => prev.map(d => ({ 
      ...d, 
      x: 30 + (d.id * 10), 
      y: 50, 
      rotation: 0 
    }))); 
  }; 

  useEffect(() => { 
    if (isDancing) { 
      dancers.forEach((dancer, index) => { 
        const moveDancer = () => { 
          setDancers(prev => { 
            const next = [...prev]; 
            next[index] = { 
              ...next[index], 
              x: 15 + Math.random() * 70, 
              y: 15 + Math.random() * 70, 
              rotation: (Math.random() - 0.5) * 120, // Wild rotation 
            }; 
            return next; 
          }); 

          const nextDelay = 100 + Math.random() * 400; 
          timerRefs.current[index] = window.setTimeout(moveDancer, nextDelay); 
        }; 

        moveDancer(); 
      }); 
    } 

    return () => { 
      timerRefs.current.forEach(timer => { 
        if (timer) window.clearTimeout(timer); 
      }); 
    }; 
  }, [isDancing]); 

  return ( 
    <div className="flex flex-col space-y-6 animate-fade-in"> 
      <div className="bg-slate-800 rounded-3xl p-8 border border-slate-700 shadow-2xl overflow-hidden relative min-h-[650px] flex flex-col"> 
        {/* Stage Header */} 
        <div className="flex items-center justify-between mb-8 z-20"> 
          <div className="flex items-center space-x-3"> 
            <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center"> 
              <PartyPopper className="w-6 h-6 text-yellow-500" /> 
            </div> 
            <div> 
              <h2 className="text-xl font-bold text-white leading-tight">Quintet Dance Party</h2> 
              <p className="text-xs text-slate-500 font-mono">5X THE CHAOS • 5X THE ELASTICITY</p> 
            </div> 
          </div> 

          <div className="flex items-center space-x-3"> 
            {image && ( 
              <button 
                onClick={() => isDancing ? stopDance() : startDance()} 
                className={`flex items-center px-6 py-2.5 rounded-full font-bold transition-all shadow-lg ${ 
                  isDancing 
                  ? 'bg-red-500 hover:bg-red-400 text-white' 
                  : 'bg-yellow-500 hover:bg-yellow-400 text-slate-900' 
                }`} 
              > 
                {isDancing ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />} 
                {isDancing ? 'HALT CHAOS' : 'START THE SQUAD'} 
              </button> 
            )} 
            {image && !isDancing && ( 
              <button 
                onClick={() => setImage(null)} 
                className="p-2.5 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors" 
              > 
                <Trash2 className="w-5 h-5" /> 
              </button> 
            )} 
          </div> 
        </div> 

        {/* The Stage */} 
        <div 
          className="flex-1 relative bg-slate-900/50 rounded-2xl border border-slate-700/50 overflow-hidden shadow-inner flex items-center justify-center group" 
        > 
          {/* Grid Background */} 
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ 
            backgroundImage: `radial-gradient(circle, #4b5563 1px, transparent 1px)`, 
            backgroundSize: '40px 40px' 
          }} /> 

          {!image ? ( 
            <label className="cursor-pointer group flex flex-col items-center text-slate-500 hover:text-yellow-500 transition-colors z-10"> 
              <div className="w-24 h-24 rounded-full border-4 border-dashed border-slate-700 flex items-center justify-center mb-4 group-hover:border-yellow-500/50 transition-colors"> 
                <Upload className="w-10 h-10" /> 
              </div> 
              <span className="text-base font-bold">Deploy Your Dancer Squad</span> 
              <p className="text-xs opacity-60 mt-2">Upload one photo, get five dancers!</p> 
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} /> 
            </label> 
          ) : ( 
            <> 
              {dancers.map((dancer, idx) => ( 
                <div 
                  key={dancer.id} 
                  className="absolute transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]" 
                  style={{ 
                    left: `${dancer.x}%`, 
                    top: `${dancer.y}%`, 
                    transform: `translate(-50%, -50%) rotate(${dancer.rotation}deg) scale(${dancer.scale})`, 
                    zIndex: idx + 10 
                  }} 
                > 
                  <div className={`relative transition-all duration-200 ${isDancing ? 'animate-chaotic-bounce' : ''}`} 
                       style={{ animationDelay: `${idx * 0.12}s` }}> 
                    <img 
                      src={image} 
                      alt={`Dancer ${idx}`} 
                      className="max-w-[140px] max-h-[140px] rounded-2xl shadow-2xl border-2 border-white/20 object-contain hover:scale-110 transition-transform" 
                    /> 
                    
                    {isDancing && ( 
                      <div className="absolute -top-4 -left-4 pointer-events-none"> 
                         <Ghost className="w-6 h-6 text-yellow-400/30 animate-pulse" /> 
                      </div> 
                    )} 
                  </div> 
                </div> 
              ))} 
              
              {/* Central Party Indicator */} 
              {isDancing && ( 
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center"> 
                   <div className="w-[500px] h-[500px] bg-yellow-500/5 rounded-full animate-ping opacity-20" /> 
                </div> 
              )} 
            </> 
          )} 
        </div> 

        {/* Controls Footer */} 
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-400 text-[11px] uppercase tracking-wider"> 
          <div className="bg-slate-700/20 p-4 rounded-xl border border-slate-700/50 flex flex-col items-center text-center"> 
            <RefreshCw className="w-4 h-4 mb-2 text-blue-400" /> 
            <h4 className="font-bold text-slate-300">ASYNCHRONOUS CHAOS</h4> 
            <p>Each squad member operates on their own erratic timeline.</p> 
          </div> 
          <div className="bg-slate-700/20 p-4 rounded-xl border border-slate-700/50 flex flex-col items-center text-center"> 
            <PartyPopper className="w-4 h-4 mb-2 text-pink-400" /> 
            <h4 className="font-bold text-slate-300">SQUASH & STRETCH</h4> 
            <p>Extreme deformation logic for peak visual comedy.</p> 
          </div> 
          <div className="bg-slate-700/20 p-4 rounded-xl border border-slate-700/50 flex flex-col items-center text-center"> 
            <Ghost className="w-4 h-4 mb-2 text-green-400" /> 
            <h4 className="font-bold text-slate-300">CROWD DYNAMICS</h4> 
            <p>Watch as they accidentally form hilarious geometric shapes.</p> 
          </div> 
        </div> 
      </div> 

      <style>{` 
        @keyframes chaotic-bounce { 
          0%, 100% { 
            transform: scale(1, 1) translateY(0); 
          } 
          15% { 
            transform: scale(1.4, 0.6) translateY(15px); 
          } 
          35% { 
            transform: scale(0.6, 1.5) translateY(-50px); 
          } 
          55% { 
            transform: scale(1.2, 0.8) translateY(0); 
          } 
          75% { 
            transform: scale(0.8, 1.2) translateY(-20px); 
          } 
        } 
        .animate-chaotic-bounce { 
          animation: chaotic-bounce 0.55s infinite ease-in-out; 
        } 
      `}</style> 
    </div> 
  ); 
}; 

export default ImageDance;
