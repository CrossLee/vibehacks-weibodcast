"""微博内容抓取模块"""
import httpx
from typing import Callable
from .config import WEIBO_COOKIE


async def fetch_weibo_posts(user_id: str, log: Callable[[str], None]) -> list[dict]:
    """抓取用户最近10条微博"""
    log(f"开始抓取微博用户 {user_id} 的内容...")
    
    url = f"https://weibo.com/ajax/statuses/mymblog?uid={user_id}&page=1&feature=0"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Cookie": WEIBO_COOKIE,
        "Referer": f"https://weibo.com/u/{user_id}",
    }
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, headers=headers, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            
            posts = []
            for item in data.get("data", {}).get("list", [])[:10]:
                text = item.get("text_raw", "") or item.get("text", "")
                # 清理HTML标签
                import re
                text = re.sub(r'<[^>]+>', '', text)
                if text:
                    posts.append({
                        "id": item.get("id"),
                        "text": text,
                        "created_at": item.get("created_at", "")
                    })
            
            log(f"成功抓取 {len(posts)} 条微博")
            return posts
            
        except Exception as e:
            log(f"抓取微博失败: {str(e)}")
            raise
