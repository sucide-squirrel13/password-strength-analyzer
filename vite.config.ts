import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  plugins: [
    {
      name: 'csp-dev-hmr',
      transformIndexHtml(html: string): string {
        if (command !== 'serve') {
          return html;
        }
        return html
          .replace("style-src 'self';", "style-src 'self' 'unsafe-inline';")
          .replace(
            "connect-src 'none';",
            "connect-src 'self' ws://localhost:* wss://localhost:* ws://127.0.0.1:* wss://127.0.0.1:*;"
          );
      }
    }
  ],
  build: {
    assetsInlineLimit: 0,
    sourcemap: false
  },
  server: {
    host: '127.0.0.1'
  },
  preview: {
    host: '127.0.0.1',
    headers: {
      'Content-Security-Policy': "frame-ancestors 'none'",
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Permissions-Policy': 'geolocation=(), camera=(), microphone=()'
    }
  }
}));
