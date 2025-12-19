import { hexToUint8Array } from "./audioUtils";

const BASE_URL = 'https://api.minimaxi.com/v1';

type Logger = (message: string) => void;

/**
 * Uploads an audio file to MiniMax for voice cloning.
 * Endpoint: POST /files/upload
 * Returns the file_id.
 */
export const uploadFileToMiniMax = async (
  file: File, 
  apiKey: string, 
  groupId: string,
  onLog?: Logger
): Promise<string> => {
  const cleanApiKey = apiKey.trim();
  const cleanGroupId = groupId.trim();

  if (!cleanApiKey) {
    throw new Error("MiniMax API Key is missing.");
  }
  if (!cleanGroupId) {
    throw new Error("MiniMax Group ID is missing.");
  }

  const formData = new FormData();
  formData.append('file', file);
  // User specified purpose: prompt_audio (Do not revert)
  formData.append('purpose', 'prompt_audio'); 

  const url = `${BASE_URL}/files/upload?GroupId=${cleanGroupId}`;

  if (onLog) {
    onLog(`[Req] Upload URL: ${url}`);
    onLog(`[Req] File: ${file.name}, Size: ${file.size}`);
  }

  // Console Logs
  console.group("🎤 [MiniMax] Upload File (Clone Source)");
  console.log(`Endpoint: ${url}`);
  console.log("File:", file.name, file.size);
  console.log("Purpose: prompt_audio");
  console.groupEnd();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cleanApiKey}`
    },
    body: formData
  });

  const textResponse = await response.text();

  if (onLog) {
    onLog(`[Resp] Status: ${response.status}`);
    onLog(`[Resp] Body: ${textResponse.substring(0, 1000)}`);
  }

  if (!response.ok) {
    throw new Error(`MiniMax Upload Failed (${response.status}): ${textResponse}`);
  }

  let json;
  try {
    json = JSON.parse(textResponse);
  } catch (e) {
    throw new Error(`Failed to parse response JSON: ${textResponse}`);
  }
  
  if (json.base_resp && json.base_resp.status_code !== 0) {
    throw new Error(`MiniMax API Error: ${json.base_resp.status_msg}`);
  }

  // Handle potential response variations
  const fileId = json.file?.file_id || json.file_id;

  if (!fileId) {
    console.error("Invalid MiniMax Response:", json);
    throw new Error("Invalid response from MiniMax: Missing file_id");
  }

  return fileId;
};

/**
 * Generates audio using MiniMax Voice Clone (speech-2.6-hd).
 * Uses the uploaded file_id as reference.
 * Returns both the ArrayBuffer (for internal processing) and the URL (for UI display).
 */
export const generateMiniMaxAudio = async (
  text: string, 
  fileId: string, 
  apiKey: string, 
  groupId: string,
  onLog?: Logger
): Promise<{ buffer: ArrayBuffer; url?: string }> => {
  const cleanApiKey = apiKey.trim();
  const cleanGroupId = groupId.trim();

  if (!cleanApiKey) throw new Error("MiniMax API Key is missing.");
  
  // Implemented strict structure based on user request (Do not revert commented code)
  const payload = {
    file_id: fileId,
    voice_id: `voice_clone_${Date.now()}`, // Unique ID for this generation session
    // clone_prompt: {
    //   prompt_audio: fileId,
    //   prompt_text: 'This voice sounds natural and pleasant.'
    // },
    text: text,
    model: 'speech-2.6-hd',
    need_noise_reduction: false,
    need_volume_normalization: false,
    aigc_watermark: false
  };

  const url = `${BASE_URL}/voice_clone?GroupId=${cleanGroupId}`;

  if (onLog) {
    onLog(`[Req] Gen URL: ${url}`);
    onLog(`[Req] Payload: ${JSON.stringify(payload, null, 2)}`);
  }

  console.group("🗣️ [MiniMax] Generate Audio (Voice Clone)");
  console.log(`Endpoint: ${url}`);
  console.log("Payload:", payload);
  console.groupEnd();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cleanApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const textResponse = await response.text();

  if (onLog) {
    onLog(`[Resp] Status: ${response.status}`);
    // Truncate massive response log
    const logBody = textResponse.length > 2000 
        ? textResponse.substring(0, 500) + '... [TRUNCATED] ...' + textResponse.substring(textResponse.length - 100)
        : textResponse;
    onLog(`[Resp] Body: ${logBody}`);
  }

  if (!response.ok) {
    throw new Error(`MiniMax Voice Clone Failed (${response.status}): ${textResponse}`);
  }

  let json;
  try {
    json = JSON.parse(textResponse);
  } catch(e) {
    throw new Error("Failed to parse response JSON");
  }

  if (json.base_resp && json.base_resp.status_code !== 0) {
    throw new Error(`MiniMax API Error: ${json.base_resp.status_msg}`);
  }

  // Handle Response: speech-2.6-hd usually returns a URL or audio hex
  
  // 1. Check for demo_audio (Root level - preferred)
  if (json.demo_audio) {
      if (onLog) onLog(`[Info] Found demo_audio URL: ${json.demo_audio}`);
      try {
        const audioResp = await fetch(json.demo_audio);
        if (!audioResp.ok) throw new Error(`Download failed with status ${audioResp.status}`);
        const buffer = await audioResp.arrayBuffer();
        return { buffer, url: json.demo_audio };
      } catch (e: any) {
        throw new Error(`Failed to download audio from MiniMax URL: ${e.message}`);
      }
  }

  // 2. Check for audio_file_url (inside data - legacy/alternative)
  if (json.data && json.data.audio_file_url) {
      if (onLog) onLog(`[Info] Downloading audio from URL: ${json.data.audio_file_url}`);
      try {
        const audioResp = await fetch(json.data.audio_file_url);
        if (!audioResp.ok) throw new Error(`Download failed with status ${audioResp.status}`);
        const buffer = await audioResp.arrayBuffer();
        return { buffer, url: json.data.audio_file_url };
      } catch (e: any) {
        throw new Error(`Failed to download audio from MiniMax URL: ${e.message}`);
      }
  }

  // 3. Check for hex string
  const hexAudio = json.data?.audio;
  if (hexAudio) {
    if (onLog) onLog(`[Info] Found hex audio data.`);
    const uint8Array = hexToUint8Array(hexAudio);
    return { buffer: uint8Array.buffer as ArrayBuffer };
  }

  // 4. Fallback/Error
  console.error("Unexpected JSON structure:", json);
  throw new Error(`MiniMax did not return audio data. Response keys: ${Object.keys(json).join(', ')}`);
};