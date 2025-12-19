
/**
 * Parses a script string into structured dialogue lines.
 * Supports various formats:
 * - Host: ... / Guest: ...
 * - **Host**: ... / **Guest**: ...
 * - 主持人: ... / 嘉宾: ...
 */
export const parseScript = (script: string): { speaker: 'Host' | 'Guest', text: string }[] => {
  const lines = script.split('\n').filter(line => line.trim() !== '');
  const parsedLines: { speaker: 'Host' | 'Guest', text: string }[] = [];
  
  lines.forEach(line => {
    // Regex explanation:
    // ^[\*#\s]*       : Start with optional markdown symbols (*, #) or whitespace
    // (Host|Guest|...) : Capture group 1 - Speaker Name (Case insensitive)
    // [\*#\s]*       : Optional markdown symbols or whitespace after name
    // [:：]           : Colon (English or Chinese)
    // \s*             : Optional whitespace
    // (.+)            : Capture group 2 - Dialogue text
    const match = line.match(/^[\*#\s]*(Host|Guest|主持人|嘉宾|A|B)[\*#\s]*[:：]\s*(.+)/i);
    
    if (match) {
      let rawSpeaker = match[1].toUpperCase();
      let speaker: 'Host' | 'Guest' = 'Host';

      // Map various labels to Host/Guest
      if (['HOST', '主持人', 'A'].includes(rawSpeaker)) {
        speaker = 'Host';
      } else if (['GUEST', '嘉宾', 'B'].includes(rawSpeaker)) {
        speaker = 'Guest';
      }

      const text = match[2].trim();
      if (text) {
        parsedLines.push({
            speaker,
            text
        });
      }
    } else {
        // Append continuation lines to the previous speaker's text
        if (parsedLines.length > 0) {
            const trimmedLine = line.trim();
            // Ignore lines that look like stage directions (in parentheses) if they are on their own line
            if (trimmedLine && !/^\(.*\)$/.test(trimmedLine) && !/^（.*）$/.test(trimmedLine)) {
                parsedLines[parsedLines.length - 1].text += ` ${trimmedLine}`;
            }
        }
    }
  });
  
  return parsedLines;
};
