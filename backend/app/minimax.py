"""MiniMax 语音克隆和TTS"""
import httpx
import base64
import os
from typing import Callable
from .config import MINIMAX_API_KEY, MINIMAX_GROUP_ID

# 主持人使用的默认音色
HOST_VOICE_ID = "male-qn-qingse"


async def clone_voice(audio_data: bytes, log: Callable[[str], None]) -> str:
    """克隆音色，返回 voice_id"""
    log("正在克隆音色...")
    
    url = f"https://api.minimax.chat/v1/voice_clone?GroupId={MINIMAX_GROUP_ID}"
    headers = {
        "Authorization": f"Bearer {MINIMAX_API_KEY}",
        "Content-Type": "application/json"
    }
    
    audio_base64 = base64.b64encode(audio_data).decode()
    
    payload = {
        "voice_id": f"clone_{os.urandom(4).hex()}",
        "audio": audio_base64,
        "audio_format": "mp3"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(url, headers=headers, json=payload, timeout=60)
            resp.raise_for_status()
            data = resp.json()
            
            voice_id = data.get("voice_id")
            log(f"音色克隆成功: {voice_id}")
            return voice_id
            
        except Exception as e:
            log(f"音色克隆失败: {str(e)}")
            raise


async def text_to_speech(text: str, voice_id: str, log: Callable[[str], None]) -> bytes:
    """文字转语音"""
    url = f"https://api.minimax.chat/v1/t2a_v2?GroupId={MINIMAX_GROUP_ID}"
    headers = {
        "Authorization": f"Bearer {MINIMAX_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "speech-01-turbo",
        "text": text,
        "voice_setting": {
            "voice_id": voice_id,
            "speed": 1.0,
            "vol": 1.0,
            "pitch": 0
        },
        "audio_setting": {
            "sample_rate": 32000,
            "bitrate": 128000,
            "format": "mp3"
        }
    }
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(url, headers=headers, json=payload, timeout=120)
            resp.raise_for_status()
            data = resp.json()
            
            audio_hex = data.get("data", {}).get("audio")
            if audio_hex:
                return bytes.fromhex(audio_hex)
            raise Exception("No audio data in response")
            
        except Exception as e:
            log(f"TTS失败: {str(e)}")
            raise


async def generate_podcast_audio(
    script: list[dict], 
    guest_voice_id: str,
    log: Callable[[str], None]
) -> bytes:
    """生成完整播客音频"""
    log("开始生成播客音频...")
    
    audio_parts = []
    
    for i, line in enumerate(script):
        role = line["role"]
        text = line["text"]
        voice_id = HOST_VOICE_ID if role == "host" else guest_voice_id
        
        log(f"生成第 {i+1}/{len(script)} 段 ({role})...")
        audio = await text_to_speech(text, voice_id, log)
        audio_parts.append(audio)
    
    # 简单拼接MP3（实际生产中应使用ffmpeg处理）
    log("合并音频...")
    combined = b"".join(audio_parts)
    
    log("播客音频生成完成")
    return combined
