import nconf from 'nconf';
import { SyncAction } from '../../renderer/pages/Home';
import { executePSScript } from '../utils';

type SyncActions = { [K in SyncAction]: () => Promise<string | void> };
interface SyncActionProps extends SyncActions {
  credentials: () => Promise<
    { server: string; username: string; password: string; searchBase: string | null } | string
  >;
}

const syncActions: SyncActionProps = {
  credentials: function () {
    return new Promise((resolve, reject) => {
      // Decrypt the password.
      executePSScript('decrypt.ps1', { value: nconf.get('password') })
        .then((decryptedPassword) => {
          if (decryptedPassword) {
            const searchBase = nconf.get('baseDN');
            resolve({
              server: nconf.get('conString')?.replace('LDAP://', '')?.replace('LDAPS://', ''),
              username: nconf.get('username'),
              password: decryptedPassword,
              searchBase: searchBase === '' ? null : searchBase,
            });

            return;
          }

          reject(new Error('AD/LDAP credentials could not be retrieved.'));
        })
        .catch((error) => {
          reject(new Error(`AD/LDAP credentials could not be retrieved. ${(error as Error).message}`));
        });
    });
  },

  partialGroups: () =>
    new Promise((resolve, reject) => {
      //
    }),

  fullGroups: function <T>(): Promise<T> {
    throw new Error('Function not implemented.');
  },

  partialUsers: function () {
    return new Promise((resolve, reject) => {
      // If partial users sync hasn't happened before, then attempt
      // a full users sync instead.
      const lastSync = nconf.get('lastUsersPartialSync');

      if (!lastSync) {
        this.fullUsers()
          .then(() => resolve())
          .catch((error) => reject(new Error(error.message)));
      }
    });
  },

  fullUsers: function () {
    return new Promise((resolve, reject) => {
      this.credentials()
        .then((creds) => {
          executePSScript('exportUsers.ps1', creds as Record<string, string>)
            .then(() => {
              console.log('RESOLVED>>>');
              resolve();
            })
            .catch((error) => {
              console.log('REJECTED.....');
              throw new Error(error.message);
            });
        })
        .catch((error) => {
          reject(new Error(error.message));
        });
    });
  },
};

/**
 * This method attempts to sync groups and users to Meveto organization.
 * The method accepts an action based on which it decides which syncing to process.
 *
 * The method will attempt to generate a CSV file of the required syncing action i.e.
 * users or groups and then sends the file to the Meveto backend for syncing. The method
 * will also update the last sync time for the syncing action that was just performed.
 *
 * @param action The syncing action.
 */
export const sync = (action: SyncAction): Promise<string | void> =>
  new Promise((resolve, reject) => {
    syncActions[action]()
      .then(() => {
        resolve();
      })
      .catch((error) => reject(new Error(error.message)));
  });
