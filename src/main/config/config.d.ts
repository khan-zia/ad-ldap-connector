export interface Config {
  state: 'pendingConfig' | 'pendingCredentials' | 'ready';
  port: string;
  appID: null | string;
  publicKey: null | string;
}
