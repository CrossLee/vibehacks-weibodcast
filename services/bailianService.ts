import axios from 'axios';

/**
 * Service to interact with Aliyun Bailian (DashScope) API.
 */

// Define response types
interface BailianResponse {
  output: {
    text: string;
    finish_reason: string;
  };
  usage: {
    output_tokens: number;
    input_tokens: number;
  };
  request_id: string;
}

type Logger = (message: string) => void;

/**
 * Generates a podcast script based on scraped Weibo content using Bailian App.
 */
export const generatePodcastScript = async (weiboContent: string, onLog?: Logger): Promise<{ title: string; script: string }> => {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  const appId = process.env.BAILIAN_APP_ID;

  if (!apiKey || !appId) {
    throw new Error("Missing DASHSCOPE_API_KEY or BAILIAN_APP_ID environment variables.");
  }

  const url = `https://dashscope.aliyuncs.com/api/v1/apps/${appId}/completion`;

  // The prompt only needs to contain the content, as the agent has predefined instructions.
  const prompt = weiboContent.substring(0, 5000);

  const data = {
    input: {
      prompt: prompt
    },
    parameters: {},
    debug: {}
  };

  if (onLog) {
      onLog(`[Bailian Req] URL: ${url}`);
      onLog(`[Bailian Req] Payload: ${JSON.stringify(data, null, 2)}`);
  }

  try {
    const response = await axios.post<BailianResponse>(url, data, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (onLog) {
        onLog(`[Bailian Resp] Status: ${response.status}`);
        onLog(`[Bailian Resp] Body: ${JSON.stringify(response.data, null, 2)}`);
    }

    if (response.status === 200 && response.data?.output?.text) {
      const text = response.data.output.text;
      
      // Robust parsing of the result
      let title = "Weibo Insights Podcast";
      let script = text;

      // 1. Attempt to extract Title
      // Support: "Title: xxx", "标题：xxx", "# xxx" (Markdown H1/H2), "Podcast Title: xxx"
      const titleRegex = /(?:^|\n)(?:Title|标题|Podcast Title)[:：]\s*(.+)|(?:^|\n)#{1,2}\s+(.+)/i;
      const titleMatch = text.match(titleRegex);
      
      if (titleMatch) {
          // titleMatch[1] matches "Title: ...", titleMatch[2] matches "# ..."
          const rawTitle = titleMatch[1] || titleMatch[2];
          if (rawTitle) {
              title = rawTitle.trim().replace(/^['"]|['"]$/g, '').replace(/\*\*/g, '');
          }
      }

      // 2. Extract Script
      // Strategies:
      // A. Look for "Script:" or "正文:" or "脚本:" marker
      // B. Look for first speaker line (Host:|Guest:|主持人:|嘉宾:|A:|B:)
      
      const scriptMarkerRegex = /(?:Script|正文|脚本)[:：]/i;
      const scriptMarkerMatch = text.match(scriptMarkerRegex);
      
      if (scriptMarkerMatch) {
          script = text.substring(scriptMarkerMatch.index! + scriptMarkerMatch[0].length).trim();
      } else {
          // Fallback: Look for first speaker
          // We look for the pattern at the start of a line
          const firstSpeakerMatch = text.match(/(?:^|\n)\s*(?:Host|Guest|主持人|嘉宾|A|B)\s*[:：]/i);
          if (firstSpeakerMatch) {
              script = text.substring(firstSpeakerMatch.index!).trim();
          }
      }

      return { title, script };
    } else {
      throw new Error(`Bailian API Error: ${JSON.stringify(response.data)}`);
    }
  } catch (error: any) {
    console.error("Error calling DashScope:", error);
    if (error.response) {
       throw new Error(`Bailian API Error (${error.response.status}): ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
};

// Re-export audio generation functions from geminiService (since Bailian is only text generation here)
// Or implement similar if Bailian has audio. For now, we reuse geminiService's audio part but we need to resolve imports carefully.
// To avoid circular deps or confusion, we will just keep using geminiService for audio generation in App.tsx
// This service only replaces the TEXT generation part.
