/**
 * Service to interact with the custom Java Backend for CosyVoice.
 * 
 * Endpoints:
 * 1. POST /voice/fork/create - Enrolls a voice from an audio file.
 * 2. POST /voice/chat - Synthesizes audio using the enrolled voice.
 */

// Helper for long-running requests (default 5 minutes)
async function fetchWithTimeout(resource: string, options: RequestInit & { timeout?: number } = {}) {
  const { timeout = 300000, ...rest } = options; // 5 minutes default
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(resource, {
      ...rest,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    // Enhance error message for AbortError
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout/1000} seconds`);
    }
    throw error;
  }
}

/**
 * Uploads an audio file to the backend to create a voice clone.
 * Returns the generated voiceId.
 */
export const enrollVoice = async (file: File, backendUrl: string): Promise<string> => {
  // Ensure backend URL doesn't have a trailing slash
  const baseUrl = backendUrl.replace(/\/$/, "");
  
  const voiceName = `weibodcast_${Date.now()}`;
  const formData = new FormData();
  formData.append("voiceSource", file);
  formData.append("name", voiceName); 

  // --- DEBUG LOGS START ---
  console.group("🎤 [Backend Request] Enroll Voice");
  console.log("URL:", `${baseUrl}/voice/fork/create`);
  console.log("Payload (FormData):", {
      voiceSource: `File(name=${file.name}, size=${file.size})`,
      name: voiceName
  });
  console.groupEnd();
  // --- DEBUG LOGS END ---

  try {
    const response = await fetchWithTimeout(`${baseUrl}/voice/fork/create`, {
      method: 'POST',
      body: formData,
      mode: 'cors' // Explicitly request CORS
    });

    if (!response.ok) {
        let errorMsg = `Backend Enrollment Error (${response.status})`;
        try {
            const errorText = await response.text();
            console.error("Backend Error Response:", errorText);
            errorMsg += `: ${errorText.substring(0, 100)}`;
        } catch (e) { /* ignore */ }
        throw new Error(errorMsg);
    }

    const json = await response.json();
    
    // --- DEBUG LOGS START ---
    console.group("🎤 [Backend Response] Enroll Voice");
    console.log("Status:", response.status);
    console.log("Body:", json);
    console.groupEnd();
    // --- DEBUG LOGS END ---

    // Logic based on provided Vue code: result.code === 200 || result.success === true
    if (json.code === 200 || json.success === true) {
        if (json.data && typeof json.data === 'object' && json.data.voiceId) {
            return json.data.voiceId;
        }
        if (typeof json.data === 'string') {
            return json.data;
        }
    }
    
    throw new Error(json.msg || "Voice enrollment failed: Invalid response format");

  } catch (error: any) {
    console.error("Enrollment failed:", error);
    // Pass through specific error messages
    throw new Error(`Voice Cloning Failed: ${error.message}. Ensure backend is running at ${baseUrl}`);
  }
};

/**
 * Generates audio for a specific text using the cloned voiceId via the backend.
 * Returns an ArrayBuffer of the audio.
 */
export const generateClonedAudio = async (text: string, voiceId: string, backendUrl: string): Promise<ArrayBuffer> => {
    const baseUrl = backendUrl.replace(/\/$/, "");
    
    const params = new URLSearchParams();
    params.append('message', text);
    params.append('voiceId', voiceId);
    params.append('textToVoice', 'true'); // Force TTS mode

    const fullUrl = `${baseUrl}/voice/chat?${params.toString()}`;

    // --- DEBUG LOGS START ---
    console.group("🗣️ [Backend Request] Synthesize (Chat)");
    console.log("URL:", fullUrl);
    console.log("Query Params:", {
        message: text,
        voiceId: voiceId,
        textToVoice: 'true'
    });
    console.groupEnd();
    // --- DEBUG LOGS END ---

    try {
        const response = await fetchWithTimeout(fullUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({}),
            mode: 'cors'
        });

        if (!response.ok) {
            throw new Error(`Backend Synthesis Error (${response.status})`);
        }

        const json = await response.json();
        
        // --- DEBUG LOGS START ---
        console.group("🗣️ [Backend Response] Synthesize (Chat)");
        console.log("Status:", response.status);
        console.log("Body:", json);
        console.groupEnd();
        // --- DEBUG LOGS END ---

        let audioUrl = '';
        if (json.code === 200 || json.success === true) {
             if (typeof json.data === 'string') {
                 audioUrl = json.data;
             } else if (json.data && typeof json.data === 'object') {
                 audioUrl = json.data.audioUrl || json.data.url;
             }
        }

        if (!audioUrl) {
            throw new Error(`Backend returned success but no audio URL found. Msg: ${json.msg}`);
        }

        // Fetch audio
        // Note: Audio file fetch might also need CORS if it's on a different CDN/domain
        const audioResponse = await fetchWithTimeout(audioUrl, { mode: 'cors' });
        if (!audioResponse.ok) {
            throw new Error(`Failed to download generated audio from ${audioUrl}`);
        }
        
        return await audioResponse.arrayBuffer();

    } catch (error: any) {
        console.error("Synthesis failed:", error);
        throw new Error(`Cloned Voice Synthesis Failed: ${error.message}`);
    }
};