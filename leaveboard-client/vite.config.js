import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env vars from .env files (and process.env) for this mode.
  // VITE_ALLOWED_HOSTS is a comma-separated list, e.g.:
  //   VITE_ALLOWED_HOSTS=localhost,127.0.0.1,digiflex.digithaigroup.com,digithai.freemyip.com
  const env = loadEnv(mode, process.cwd(), '')
  const allowedHosts = ['localhost', '127.0.0.1']
  if (env.VITE_ALLOWED_HOSTS) {
    allowedHosts.push(...env.VITE_ALLOWED_HOSTS.split(',').map(h => h.trim()).filter(Boolean))
  }

  return {
    plugins: [react()],
    server: {
      port: 7091,
      allowedHosts,
    },
    preview: {
      port: 7091,
      allowedHosts,
    },
    build: {
      outDir: 'dist',
    },
    optimizeDeps: {
      exclude: ["crypto"], // prevent vite from polyfilling browser crypto
    },
    resolve: {
      alias: {
        crypto: "crypto" // ensure it uses Node’s crypto
      }
    }
  }
})
