/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_URI?: string;
  readonly VITE_SOCKET_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
