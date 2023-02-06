/// <reference types="vite/client" />

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface ImportMetaEnv {
  readonly MAIN_PORT: number;
  readonly MAIN_PRIVATE_KEY_NAME: string;
  readonly MAIN_PUBLIC_KEY_NAME: string;
}
