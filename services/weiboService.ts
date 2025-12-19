import { LogEntry } from "../types";

const MOCK_CONTENT_LUO = `
[2023-10-27] 罗永浩: 今天发布的这款新手机，工业设计简直是灾难。我一直强调，美学是第一生产力。
[2023-10-28] 罗永浩: 创业的本质就是九死一生。我们在做 AR 眼镜的时候，每天都在解决不可能的问题。
[2023-10-29] 罗永浩: 直播带货不是终点，它只是为了还债。我的梦想依然是科技行业，是下一代计算平台。
[2023-10-30] 罗永浩: 刚刚看完苹果的发布会，感觉稍微有点失望，缺乏那种让人起鸡皮疙瘩的创新了。
[2023-10-31] 罗永浩: 有人问我为什么不退休？生命不息，折腾不止。
[2023-11-01] 罗永浩: 推荐大家看这本书《只有偏执狂才能生存》，特别是做产品的经理们。
`;

const MOCK_CONTENT_HE = `
[2023-10-27] 何广智: 最近坐地铁又被认出来了，那人问我“你是何广智吗？”我说“我是”。他说“那你怎么还坐地铁？”我说“因为穷啊！”
[2023-10-28] 何广智: “带刺的玫瑰”，这梗我也就还能玩两年。现在的脱口秀越来越难讲了，观众笑点都高了。
[2023-10-29] 何广智: 只有在舞台上的时候，我才觉得自己是个帅哥。下了台，看着镜子，害，还是那个来自山东的打工小伙。
[2023-10-30] 何广智: 剪头发被Tony老师忽悠办了张卡，出来才反应过来，我这发型需要办卡吗？我是不是被PUA了？
[2023-10-31] 何广智: 生活就是一场大型的脱口秀，只是有时候没人笑，只有自己想哭。这时候就得去便利店买根烤肠安慰自己。
[2023-11-01] 何广智: 真的很想谈恋爱，但是每次遇到喜欢的女生，我第一反应就是“她是不是眼神不好？”自卑刻在骨子里了。
`;

export const simulateScraping = (
  userId: string, 
  onLog: (log: LogEntry) => void
): Promise<string> => {
  return new Promise((resolve) => {
    let step = 0;
    const maxSteps = 15;
    
    // Normalize user ID
    const cleanId = userId.trim();
    
    // He Guangzhi ID: 5907116391
    const isHeGuangzhi = cleanId === '5907116391';
    const contentToUse = isHeGuangzhi ? MOCK_CONTENT_HE : MOCK_CONTENT_LUO;
    const userName = isHeGuangzhi ? '何广智 (He Guangzhi)' : '罗永浩 (Luo Yonghao)';

    const interval = setInterval(() => {
      step++;
      const id = Math.random().toString(36).substring(7);
      const timestamp = new Date().toLocaleTimeString();

      if (step === 1) {
        onLog({ id, timestamp, message: `Connecting to Weibo Mobile API for UserID: ${cleanId}...`, type: 'info' });
      } else if (step === 3) {
         onLog({ id, timestamp, message: `Successfully resolved container ID for ${userName}.`, type: 'success' });
      } else if (step > 3 && step < 12) {
        const page = step - 3;
        onLog({ id, timestamp, message: `Parsing page ${page}... Found ${Math.floor(Math.random() * 5) + 1} posts for ${userName}.`, type: 'info' });
      } else if (step === 12) {
        onLog({ id, timestamp, message: `Filtering non-text content and reposts...`, type: 'warning' });
      } else if (step === 14) {
        onLog({ id, timestamp, message: `Aggregating text data... Total characters: ${contentToUse.length}`, type: 'success' });
      } else if (step === maxSteps) {
        onLog({ id, timestamp, message: `Scraping Completed for ${userName}.`, type: 'success' });
        clearInterval(interval);
        resolve(contentToUse);
      }
    }, 400); 
  });
};
