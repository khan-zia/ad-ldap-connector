import { SaveCredsRequestBody } from '../../renderer/pages/GetCredentials';
import { executePSScript, sanitizePSResult } from '../utils';
import nconf from 'nconf';

/**
 * This method tests connection to a specified LDAP server using specified base DN, username and
 * password. If the connection succeeds, the method will resolve a Promise with boolean "true" or
 * "false" if it fails. It will reject with an error message if available.
 */
export const testLDAPConnection = (credentials: Omit<SaveCredsRequestBody, 'orgID'>): Promise<boolean | string> =>
  new Promise((resolve, reject) => {
    executePSScript('connectLDAP.ps1', credentials)
      .then((result) => {
        if (result) {
          const sanitized = sanitizePSResult(result);

          if (sanitized === 'ConnectionSuccessful') {
            resolve(true);
          }

          reject(new Error(sanitized));
        }

        reject(false);
      })
      .catch((error) => {
        reject(new Error(error.message));
      });
  });

/**
 * This method stores the LDAP connection string, base DN, username and password.
 * It will encrypt the password before storage.
 */
export const storeCredentials = (credentials: Omit<SaveCredsRequestBody, 'orgID'>): Promise<boolean | string> =>
  new Promise((resolve, reject) => {
    executePSScript('encrypt.ps1', { value: credentials.password })
      .then((result) => {
        if (result) {
          const sanitized = sanitizePSResult(result);

          // Store values in the config
          nconf.set('conString', credentials.conString);
          nconf.set('baseDN', credentials.baseDN);
          nconf.set('username', credentials.username);
          nconf.set('password', sanitized);

          resolve(true);
        }

        reject(false);
      })
      .catch((error) => {
        reject(new Error(error.message));
      });
  });
