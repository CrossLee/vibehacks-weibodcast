import { useState, useRef } from 'react'

function App() {
  const [weiboId, setWeiboId] = useState('')
  const [audioFile, setAudioFile] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)
  const [script, setScript] = useState([])
  const audioRef = useRef(null)
  const fileInputRef = useRef(null)

  const addLog = (msg, isError = false) => {
    setLogs(prev => [...prev, { msg, isError, time: new Date().toLocaleTimeString() }])
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setAudioFile(file)
    }
  }

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleGenerate = async () => {
    if (!weiboId.trim()) {
      addLog('请输入微博用户ID', true)
      return
    }
    if (!audioFile) {
      addLog('请上传音色样本', true)
      return
    }

    setLoading(true)
    setLogs([])
    setAudioUrl(null)
    setScript([])
    addLog('开始生成播客...')

    try {
      const audioBase64 = await fileToBase64(audioFile)
      
      const ws = new WebSocket(`ws://${window.location.host}/ws/generate`)
      
      ws.onopen = () => {
        ws.send(JSON.stringify({
          weibo_id: weiboId.trim(),
          audio: audioBase64
        }))
      }

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data)
        
        if (data.type === 'log') {
          addLog(data.message)
        } else if (data.type === 'error') {
          addLog(data.message, true)
          setLoading(false)
        } else if (data.type === 'complete') {
          addLog('播客生成成功！')
          setScript(data.script || [])
          
          // 获取音频
          const resp = await fetch(`/audio/${data.audio_id}`)
          const audioData = await resp.json()
          
          const audioBlob = new Blob(
            [Uint8Array.from(atob(audioData.audio), c => c.charCodeAt(0))],
            { type: 'audio/mp3' }
          )
          const url = URL.createObjectURL(audioBlob)
          setAudioUrl(url)
          setLoading(false)
          
          // 自动播放
          setTimeout(() => {
            audioRef.current?.play()
          }, 500)
        }
      }

      ws.onerror = () => {
        addLog('WebSocket 连接失败', true)
        setLoading(false)
      }

    } catch (err) {
      addLog(`错误: ${err.message}`, true)
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h1>🎙️ Weibodcast</h1>
        <p className="subtitle">将微博内容转换为双人播客</p>

        <div className="form-group">
          <label>微博用户ID</label>
          <input
            type="text"
            placeholder="输入微博用户ID（数字）"
            value={weiboId}
            onChange={(e) => setWeiboId(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>嘉宾音色样本</label>
          <div 
            className={`file-upload ${audioFile ? 'has-file' : ''}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              disabled={loading}
            />
            {audioFile ? (
              <span>✅ {audioFile.name}</span>
            ) : (
              <span>点击上传音频文件（MP3/WAV）</span>
            )}
          </div>
        </div>

        <button 
          className="generate" 
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? '生成中...' : '🚀 生成播客'}
        </button>

        {logs.length > 0 && (
          <div className="logs">
            <h3>📋 执行日志</h3>
            {logs.map((log, i) => (
              <div key={i} className={`log-item ${log.isError ? 'error' : ''}`}>
                [{log.time}] {log.msg}
              </div>
            ))}
          </div>
        )}

        {audioUrl && (
          <div className="audio-player">
            <h3>🎧 生成的播客</h3>
            <audio ref={audioRef} controls src={audioUrl} />
          </div>
        )}

        {script.length > 0 && (
          <div className="script-preview">
            <h3>📝 播客脚本</h3>
            {script.map((line, i) => (
              <div key={i} className={`script-line ${line.role}`}>
                <div className="role-tag">
                  {line.role === 'host' ? '🎤 主持人' : '🎙️ 嘉宾'}
                </div>
                {line.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
