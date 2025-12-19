# Project Structure

```
vibehacks-weibodcast/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py        # FastAPI 入口
│   │   ├── config.py      # 配置管理
│   │   ├── weibo.py       # 微博抓取
│   │   ├── bailian.py     # 百炼脚本生成
│   │   └── minimax.py     # MiniMax 语音服务
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # 主组件
│   │   ├── main.jsx       # 入口
│   │   └── index.css      # 样式
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── .kiro/steering/        # AI 指导文档
```

## 模块职责

- `weibo.py` - 微博内容抓取
- `bailian.py` - 播客脚本生成（主持人/嘉宾对话）
- `minimax.py` - 音色克隆 + TTS 合成
- `main.py` - WebSocket API，协调整个流程
