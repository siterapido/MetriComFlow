import { execSync } from "node:child_process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

type GitInfo = {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
  url: string;
};

function buildCommitUrl(remote: string, hash: string) {
  if (!remote || !hash) {
    return "";
  }

  let normalized = remote.replace(/\.git$/, "");

  if (normalized.startsWith("git@")) {
    normalized = normalized.replace("git@", "https://").replace(":", "/");
  } else if (normalized.startsWith("http://")) {
    normalized = normalized.replace("http://", "https://");
  }

  return `${normalized}/commit/${hash}`;
}

function resolveGitInfo(): GitInfo {
  try {
    const hash = execSync("git rev-parse HEAD").toString().trim();
    const shortHash = execSync("git rev-parse --short HEAD").toString().trim();
    const message = execSync("git log -1 --pretty=%s").toString().trim();
    const author = execSync("git log -1 --pretty=%an").toString().trim();
    const date = execSync("git log -1 --pretty=%cI").toString().trim();
    let remote = "";

    try {
      remote = execSync("git config --get remote.origin.url").toString().trim();
    } catch (error) {
      remote = "";
    }

    return {
      hash,
      shortHash,
      message,
      author,
      date,
      url: buildCommitUrl(remote, hash),
    };
  } catch (error) {
    return {
      hash: "",
      shortHash: "",
      message: "",
      author: "",
      date: "",
      url: "",
    };
  }
}

const gitInfo = resolveGitInfo();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-popover', '@radix-ui/react-select'],
          query: ['@tanstack/react-query'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
    sourcemap: false,
    minify: 'terser',
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@tanstack/react-query',
      '@supabase/supabase-js',
      'react-router-dom',
      'date-fns',
      'lucide-react'
    ],
  },
  define: {
    __APP_ENV__: JSON.stringify(process.env.VITE_VERCEL_ENV || mode),
    __LATEST_COMMIT__: JSON.stringify(gitInfo),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    css: true,
  },
}));
