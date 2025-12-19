# Technology Stack

## 后端
- Python 3.11+
- FastAPI - Web框架
- WebSocket - 实时日志推送
- httpx - HTTP客户端

## 前端
- React 18
- Vite - 构建工具

## 外部服务
- 百炼 (DashScope) - qwen-max 模型生成播客脚本
- MiniMax - 语音克隆 + TTS
- 微博 API - 内容抓取

## 常用命令

```bash
# 后端
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 前端
cd frontend
npm install
npm run dev
```

## 环境变量

复制 `backend/.env.example` 为 `backend/.env` 并填写：
- DASHSCOPE_API_KEY
- MINIMAX_API_KEY
- MINIMAX_GROUP_ID
- WEIBO_COOKIE
