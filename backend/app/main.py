"""FastAPI 主应用"""
import asyncio
import base64
import uuid
from fastapi import FastAPI, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .weibo import fetch_weibo_posts
from .bailian import generate_podcast_script
from .minimax import clone_voice, generate_podcast_audio

app = FastAPI(title="Weibodcast API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 存储生成的音频
audio_storage: dict[str, bytes] = {}


@app.websocket("/ws/generate")
async def websocket_generate(websocket: WebSocket):
    """WebSocket 端点 - 生成播客并实时推送日志"""
    await websocket.accept()
    
    try:
        # 接收参数
        data = await websocket.receive_json()
        weibo_id = data.get("weibo_id")
        audio_base64 = data.get("audio")  # base64 编码的音频
        
        if not weibo_id or not audio_base64:
            await websocket.send_json({"type": "error", "message": "缺少参数"})
            return
        
        logs = []
        
        def log(msg: str):
            logs.append(msg)
            asyncio.create_task(websocket.send_json({"type": "log", "message": msg}))
        
        # 1. 抓取微博
        posts = await fetch_weibo_posts(weibo_id, log)
        if not posts:
            await websocket.send_json({"type": "error", "message": "未获取到微博内容"})
            return
        
        # 2. 生成脚本
        script = await generate_podcast_script(posts, log)
        if not script:
            await websocket.send_json({"type": "error", "message": "脚本生成失败"})
            return
        
        # 3. 克隆音色
        audio_data = base64.b64decode(audio_base64)
        guest_voice_id = await clone_voice(audio_data, log)
        
        # 4. 生成音频
        podcast_audio = await generate_podcast_audio(script, guest_voice_id, log)
        
        # 5. 存储并返回
        audio_id = str(uuid.uuid4())
        audio_storage[audio_id] = podcast_audio
        
        log("播客生成完成！")
        
        await websocket.send_json({
            "type": "complete",
            "audio_id": audio_id,
            "script": script
        })
        
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_json({"type": "error", "message": str(e)})


@app.get("/audio/{audio_id}")
async def get_audio(audio_id: str):
    """获取生成的音频"""
    audio = audio_storage.get(audio_id)
    if not audio:
        return JSONResponse({"error": "Audio not found"}, status_code=404)
    
    return JSONResponse(
        content={"audio": base64.b64encode(audio).decode()},
        media_type="application/json"
    )


@app.get("/health")
async def health():
    return {"status": "ok"}
