/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COURT_ADDRESS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
