import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.DASHSCOPE_API_KEY': JSON.stringify(env.DASHSCOPE_API_KEY),
        'process.env.BAILIAN_APP_ID': JSON.stringify(env.BAILIAN_APP_ID),
        'process.env.MINIMAX_API_KEY': JSON.stringify(env.MINIMAX_API_KEY),
        'process.env.MINIMAX_GROUP_ID': JSON.stringify(env.MINIMAX_GROUP_ID)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
