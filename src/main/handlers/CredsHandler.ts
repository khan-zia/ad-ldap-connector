import { SaveCredsRequestBody } from '../../renderer/pages/GetCredentials';
import { executePSScript, sanitizePSResult } from '../utils';
import nconf from 'nconf';
import log from '../utils/logger';

/**
 * This method tests connection to a specified LDAP server using specified base DN, username and
 * password. If the connection succeeds, the method will resolve a Promise with boolean "true" or
 * "false" if it fails. It will reject with an error message if available.
 */
export const testLDAPConnection = (credentials: SaveCredsRequestBody): Promise<boolean | string> =>
  new Promise((resolve, reject) => {
    log.debug('Attempting to test and validate the provided LDAP credentials.');

    executePSScript('connectLDAP.ps1', credentials)
      .then((result) => {
        if (result) {
          const sanitized = sanitizePSResult(result);

          if (sanitized === 'ConnectionSuccessful') {
            resolve(true);
            return;
          }

          log.error(
            'LDAP credentials validation failed. The PowerShell script responsible for validating the credentials did not return the expected response string of "ConnectionSuccessful". Output of the script is included.',
            {
              scriptOutPut: sanitized,
            }
          );

          reject(new Error(sanitized));
          return;
        }

        log.error(
          'LDAP credentials validation failed. The PowerShell script responsible for validating the credentials returned an empty response.'
        );

        reject(false);
      })
      .catch((error) => {
        log.error('LDAP credentials validation failed. An error message is included in the context.', {
          error: error.message,
        });

        reject(new Error(error.message));
      });
  });

/**
 * This method stores the LDAP connection string, base DN, username and password.
 * It will encrypt the password before storage.
 */
export const storeCredentials = (credentials: SaveCredsRequestBody): Promise<boolean | string> =>
  new Promise((resolve, reject) => {
    log.debug('Preparing LDAP credentials for storage.');

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
          return;
        }

        log.error(
          'Failed to encrypt the LDAP password. PowerShell script responsible for encryption returned an empty response.'
        );

        reject(false);
      })
      .catch((error) => {
        log.error('Failed to encrypt the LDAP password. PowerShell script error is included.', {
          error: error.message,
        });

        reject(new Error(error.message));
      });
  });
