import { hexToUint8Array } from "./audioUtils";

const BASE_URL = 'https://api.minimaxi.com/v1';

type Logger = (message: string) => void;

/**
 * Generates audio using MiniMax T2A V2 (Standard TTS without cloning).
 * Endpoint: POST /t2a_v2
 */
export const generateMiniMaxTTS = async (
  text: string,
  apiKey: string,
  groupId: string,
  voiceId: string = "female-chengshu", // Default voice
  onLog?: Logger
): Promise<{ buffer: ArrayBuffer; url?: string }> => {
  const cleanApiKey = apiKey.trim();
  const cleanGroupId = groupId.trim();

  if (!cleanApiKey) throw new Error("MiniMax API Key is missing.");

  const payload = {
    model: "speech-2.6-hd",
    text: text,
    stream: false,
    voice_setting: {
      voice_id: voiceId,
      speed: 1,
      vol: 1,
      pitch: 0,
      emotion: "happy"
    },
    audio_setting: {
      sample_rate: 32000,
      bitrate: 128000,
      format: "mp3",
      channel: 1
    }
  };

  const url = `${BASE_URL}/t2a_v2?GroupId=${cleanGroupId}`;

  if (onLog) {
    onLog(`[Req] MiniMax TTS URL: ${url}`);
    onLog(`[Req] Payload: ${JSON.stringify(payload)}`);
  }

  // console.group("🗣️ [MiniMax] Generate TTS (Standard)");
  // console.log(`Endpoint: ${url}`);
  // console.log("Payload:", payload);
  // console.groupEnd();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cleanApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (onLog) onLog(`[Error] MiniMax TTS HTTP ${response.status}: ${errorText}`);
    throw new Error(`MiniMax TTS Request Failed (${response.status}): ${errorText}`);
  }

  const json = await response.json();

  if (onLog) {
      onLog(`[Resp] MiniMax TTS: ${JSON.stringify(json).substring(0, 500)}...`);
  }

  if (json.base_resp && json.base_resp.status_code !== 0) {
    throw new Error(`MiniMax API Error: ${json.base_resp.status_msg}`);
  }

  const hexAudio = json.data?.audio;
  if (!hexAudio) {
    throw new Error("MiniMax response missing audio data");
  }

  const buffer = hexToUint8Array(hexAudio).buffer as ArrayBuffer;
  return { buffer };
};
