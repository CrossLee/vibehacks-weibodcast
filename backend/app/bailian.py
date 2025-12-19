"""百炼智能体 - 播客脚本生成"""
from openai import OpenAI
from typing import Callable
from .config import DASHSCOPE_API_KEY

SYSTEM_PROMPT = """你是一个专业的播客脚本编写者。根据提供的微博内容，生成一段双人播客对话脚本。

要求：
1. 主持人(HOST)负责引导话题、提问和总结
2. 嘉宾(GUEST)是微博博主，分享观点和见解
3. 对话自然流畅，有互动感
4. 每段对话控制在2-3句话

输出格式（严格遵循）：
HOST: 主持人的话
GUEST: 嘉宾的话
HOST: 主持人的话
...

直接输出脚本，不要有其他内容。"""


async def generate_podcast_script(posts: list[dict], log: Callable[[str], None]) -> list[dict]:
    """生成播客脚本"""
    log("正在生成播客脚本...")
    
    # 整理微博内容
    content = "\n\n".join([f"微博{i+1}: {p['text']}" for i, p in enumerate(posts)])
    
    client = OpenAI(
        api_key=DASHSCOPE_API_KEY,
        base_url="https://dashscope.aliyuncs.com/compatible-mode/v1"
    )
    
    try:
        response = client.chat.completions.create(
            model="qwen-max",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"请根据以下微博内容生成播客脚本：\n\n{content}"}
            ],
            temperature=0.8
        )
        
        script_text = response.choices[0].message.content
        log("脚本生成完成")
        
        # 解析脚本
        lines = []
        for line in script_text.strip().split("\n"):
            line = line.strip()
            if line.startswith("HOST:"):
                lines.append({"role": "host", "text": line[5:].strip()})
            elif line.startswith("GUEST:"):
                lines.append({"role": "guest", "text": line[6:].strip()})
        
        log(f"解析出 {len(lines)} 段对话")
        return lines
        
    except Exception as e:
        log(f"脚本生成失败: {str(e)}")
        raise
