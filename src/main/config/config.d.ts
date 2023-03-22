export interface Config {
  state: 'pendingConfig' | 'pendingCredentials' | 'ready';
  port: string;
  appID: null | string;
  publicKey: null | string;
  webhookUrl: string;
  orgID: null | string;
  conString: null | string;
  baseDN: null | string;
  username: null | string;
  password: null | string;
  lastGroupsPartialSync: null | string;
  lastGroupsFullSync: null | string;
  lastUsersPartialSync: null | string;
  lastUsersFullSync: null | string;
}
