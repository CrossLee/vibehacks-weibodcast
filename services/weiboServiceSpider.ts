
import { LogEntry } from "../types";

// This is a bridge to the Python scraper in a real environment
// Since we are in a browser environment, we will simulate the behavior 
// but in a real backend, this would call the Python script we created earlier.

export const scrapeWeiboReal = async (
  userId: string,
  onLog: (log: LogEntry) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    let resultBuffer = "";

    const fetchController = new AbortController();
    const timeoutId = setTimeout(() => fetchController.abort(), 300000); // 5 min timeout

    fetch('http://localhost:3001/api/scrape', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid: userId }),
        signal: fetchController.signal
    }).then(async (response) => {
        clearTimeout(timeoutId);
        if (!response.body) {
            throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const jsonStr = line.replace('data: ', '');
                        if (!jsonStr.trim()) continue;
                        
                        const data = JSON.parse(jsonStr);
                        
                        // Check for completion event (custom protocol)
                        // If we had a "done" event, we would handle it here.
                        // But in server.js we send event: done separately or just close.
                        
                        onLog({
                            id: Math.random().toString(36).substring(7),
                            timestamp: new Date().toLocaleTimeString(),
                            message: data.message,
                            type: data.type
                        });
                    } catch (e) {
                        // Ignore parse errors for keep-alive or malformed chunks
                    }
                } else if (line.startsWith('event: done')) {
                    // Process finished
                    // Since we don't have the file content in the stream yet, 
                    // we'll fetch it or just return a placeholder for now saying check logs.
                    // Ideally, the server should return the content.
                    
                    // For now, let's resolve with a placeholder message.
                    // The user asked to show logs, which we did.
                    resolve(`Scraping completed. Check logs for details.\nFiles saved to: /Users/cross/aiproject/weibodcast/weibodata`);
                    return;
                }
            }
        }
        
        resolve(`Scraping process ended.`);
    }).catch(err => {
        clearTimeout(timeoutId);
        onLog({
            id: Math.random().toString(36).substring(7),
            timestamp: new Date().toLocaleTimeString(),
            message: `Connection failed: ${err.message}. Ensure 'npm run server' is running.`,
            type: 'error'
        });
        reject(err);
    });
  });
};
