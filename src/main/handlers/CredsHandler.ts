import { SaveCredsRequestBody } from '../../renderer/pages/GetCredentials';
import { executePSScript } from '../utils';

/**
 * This method tests connection to a specified LDAP server using specified base DN, username and
 * password. If the connection succeeds, the method will resolve a Promise with boolean "true" or
 * "false" if it fails.
 */
export const testLDAPConnection = (credentials: Omit<SaveCredsRequestBody, 'orgID'>): Promise<boolean> =>
  new Promise((resolve, reject) => {
    // LDAP://MEVETO-DC01.meveto.com
    // CN=Users,DC=meveto,DC=com
    // CN=Administrator,CN=Users,DC=meveto,DC=com
    // -37hCwVV?$aOIe;0eGEHgUbJMlCbosZo
    executePSScript('connectLDAP.ps1', credentials).then(() => {
      //
    }).catch(() => {
      //
    });
  });
