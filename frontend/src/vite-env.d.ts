/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Where the backend API runs. Default: http://localhost:8000 */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
