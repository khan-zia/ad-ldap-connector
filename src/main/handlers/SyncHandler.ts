import nconf from 'nconf';
import { SyncAction } from '../../renderer/pages/Home';
import { currentADCompliantTimestamp, executePSScript } from '../utils';
import { sendPayload, WEBHOOK } from './WebhooksHandler';

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

  partialGroups: function () {
    return new Promise((resolve, reject) => {
      // If partial groups sync hasn't happened before, then attempt
      // a full groups sync instead.
      const lastSync = nconf.get('lastGroupsPartialSync');

      if (!lastSync) {
        this.fullGroups()
          .then(() => {
            // Set the last time for partial user sync.
            nconf.set('lastGroupsPartialSync', currentADCompliantTimestamp());

            resolve();
          })
          .catch((error) => reject(new Error(error.message)));
        return;
      }

      this.credentials()
        .then((creds) => {
          if (typeof creds !== 'object') {
            return;
          }

          executePSScript('exportGroups.ps1', { ...creds, dateString: lastSync } as Record<string, string>)
            .then((res: string | null) => {
              if (res && res === 'NoRecords') {
                reject(new Error('Nothing to sync since the last sync.'));
                return;
              }

              // Send the payload to Meveto
              const webhook = sendPayload();

              // Handle if the webhook failed.
              if (webhook.status === WEBHOOK.FAILURE) {
                reject(
                  new Error(
                    webhook.message ||
                      'There was a problem while trying to send data to Meveto. Contact our support if the issue persists.'
                  )
                );

                return;
              }

              // Set the last time of partial user sync.
              nconf.set('lastGroupsPartialSync', currentADCompliantTimestamp());

              resolve();
            })
            .catch((error) => {
              reject(new Error(error.message));
            });
        })
        .catch((error) => {
          reject(new Error(error.message));
        });
    });
  },

  fullGroups: function () {
    return new Promise((resolve, reject) => {
      this.credentials()
        .then((creds) => {
          executePSScript('exportGroups.ps1', creds as Record<string, string>)
            .then((res) => {
              // Send the payload to Meveto
              const webhook = sendPayload();

              // Handle if the webhook failed.
              if (webhook.status === WEBHOOK.FAILURE) {
                reject(
                  new Error(
                    webhook.message ||
                      'There was a problem while trying to send data to Meveto. Contact our support if the issue persists.'
                  )
                );

                return;
              }

              // Set the last time of full user sync.
              nconf.set('lastGroupsFullSync', currentADCompliantTimestamp());

              resolve();
            })
            .catch((error) => {
              reject(new Error(error.message));
            });
        })
        .catch((error) => {
          reject(new Error(error.message));
        });
    });
  },

  partialUsers: function () {
    return new Promise((resolve, reject) => {
      // If partial users sync hasn't happened before, then attempt
      // a full users sync instead.
      const lastSync = nconf.get('lastUsersPartialSync');

      if (!lastSync) {
        this.fullUsers()
          .then(() => {
            // Set the last time for partial user sync.
            nconf.set('lastUsersPartialSync', currentADCompliantTimestamp());

            resolve();
          })
          .catch((error) => reject(new Error(error.message)));
        return;
      }

      this.credentials()
        .then((creds) => {
          if (typeof creds !== 'object') {
            return;
          }

          executePSScript('exportUsers.ps1', { ...creds, dateString: lastSync } as Record<string, string>)
            .then((res: string | null) => {
              if (res && res === 'NoRecords') {
                reject(new Error('Nothing to sync since the last sync.'));
                return;
              }

              // Send the payload to Meveto
              const webhook = sendPayload();

              // Handle if the webhook failed.
              if (webhook.status === WEBHOOK.FAILURE) {
                reject(
                  new Error(
                    webhook.message ||
                      'There was a problem while trying to send data to Meveto. Contact our support if the issue persists.'
                  )
                );

                return;
              }

              // Set the last time of partial user sync.
              nconf.set('lastUsersPartialSync', currentADCompliantTimestamp());

              resolve();
            })
            .catch((error) => {
              reject(new Error(error.message));
            });
        })
        .catch((error) => {
          reject(new Error(error.message));
        });
    });
  },

  fullUsers: function () {
    return new Promise((resolve, reject) => {
      this.credentials()
        .then((creds) => {
          executePSScript('exportUsers.ps1', creds as Record<string, string>)
            .then((res) => {
              // Send the payload to Meveto
              const webhook = sendPayload();

              // Handle if the webhook failed.
              if (webhook.status === WEBHOOK.FAILURE) {
                reject(
                  new Error(
                    webhook.message ||
                      'There was a problem while trying to send data to Meveto. Contact our support if the issue persists.'
                  )
                );

                return;
              }

              // Set the last time of full user sync.
              nconf.set('lastUsersFullSync', currentADCompliantTimestamp());

              resolve();
            })
            .catch((error) => {
              reject(new Error(error.message));
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
