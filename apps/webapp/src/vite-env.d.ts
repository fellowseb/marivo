/// <reference types="vite/client" />

interface ViteTypeOptions {
  strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY: string;
  readonly VITE_MARIVO_TRPC_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
