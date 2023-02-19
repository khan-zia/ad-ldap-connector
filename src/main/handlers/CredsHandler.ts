import { SaveCredsRequestBody } from '../../renderer/pages/GetCredentials';

/**
 * This method tests connection to a specified LDAP server using specified base DN, username and
 * password. If the connection succeeds, the method will resolve a Promise with boolean "true" or
 * "false" if it fails.
 */
export const testLDAPConnection = (credentials: Omit<SaveCredsRequestBody, 'orgID'>): Promise<boolean> =>
  new Promise((resolve, reject) => {
    //
  });
