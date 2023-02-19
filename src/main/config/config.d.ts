export interface Config {
  state: 'pendingConfig' | 'pendingCredentials' | 'ready';
  port: string;
  appID: null | string;
  publicKey: null | string;
  orgID: null | string;
  conString: null | string;
  baseDN: null | string;
  username: null | string;
  password: null | string;
}
