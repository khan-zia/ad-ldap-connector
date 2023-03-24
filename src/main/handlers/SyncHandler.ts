import nconf from 'nconf';
import { SyncAction } from '../../renderer/pages/Home';
import { currentADCompliantTimestamp, executePSScript } from '../utils';
import log from '../utils/logger';
import { sendPayload, WEBHOOK } from './WebhooksHandler';

type SyncActions = { [K in SyncAction]: () => Promise<string | void> };
interface SyncActionProps extends SyncActions {
  credentials: () => Promise<
    { server: string; username: string; password: string; searchBase: string | null } | string
  >;
  executeAction: (
    action: SyncAction,
    scriptName: 'exportUsers.ps1' | 'exportGroups.ps1',
    exportFileNamePrefix: 'groups' | 'users',
    lastSync?: string
  ) => Promise<string | void>;
}

const syncActions: SyncActionProps = {
  credentials: function () {
    return new Promise((resolve, reject) => {
      log.debug('Collecting LDAP credentials.');

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

          log.error('LDAP password could not be decrypted. The PowerShell script did not return any result.', {
            hint: 'It is possible that the password was initially encrypted by a different system user and the connector is now being ran by a different user.',
          });

          reject(new Error('AD/LDAP credentials could not be retrieved.'));
        })
        .catch((error) => {
          log.error('LDAP password could not be decrypted. The PowerShell script resulted in an error.', {
            error: (error as Error).message,
            hint: 'It is possible that the password was initially encrypted by a different system user and the connector is now being ran by a different user.',
          });

          reject(new Error(`AD/LDAP credentials could not be retrieved. ${(error as Error).message}`));
        });
    });
  },

  executeAction: function (action, scriptName, exportFileNamePrefix, lastSync) {
    return new Promise((resolve, reject) => {
      this.credentials()
        .then((creds) => {
          if (typeof creds !== 'object') {
            log.debug('Collected LDAP credentials should have been an object but received a different value.', {
              received: creds,
            });

            return;
          }

          log.debug('LDAP credentials collected.');

          // Prepare name for the exported file.
          const unixTimestamp = Math.floor(Date.now() / 1000);
          const fileName = `${exportFileNamePrefix}_${nconf.get('appID')}_${unixTimestamp}.csv`;

          const scriptParams: Record<string, string | null> = {
            ...creds,
            fileName,
          };

          if (lastSync) {
            scriptParams.dateString = lastSync;
          }

          log.debug('Attempting to export required data.');

          executePSScript(scriptName, scriptParams)
            .then(async (result) => {
              // Abort syncing if no syncing is needed.
              if (result && result === 'NoActionNeeded') {
                log.debug('New data is not available yet. Syncing completed without exporting any data.');
                resolve();
              }

              log.debug(
                'Required data successfully exported to the specified location with the following names. Note that the "deleted" version of the data may not have actually been exported if there were no deleted objects to sync.',
                {
                  exportedFileName: fileName,
                  deletedObjectsFileNameIfAny: `deleted_${fileName}`,
                }
              );

              // Send the payload to Meveto
              const webhook = await sendPayload(action, fileName);

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

              resolve();
            })
            .catch((error) => {
              log.error('The PowerShell script to export the required data resulted in an error.', {
                error: error.message,
              });

              reject(new Error(error.message));
            });
        })
        .catch((error) => {
          reject(new Error(error.message));
        });
    });
  },

  partialGroups: function () {
    return new Promise((resolve, reject) => {
      const lastSync = nconf.get('lastGroupsPartialSync');
      let execute;

      // If partial groups sync hasn't happened before, then attempt a full groups sync instead.
      if (!lastSync) {
        execute = this.fullGroups();
      } else {
        execute = this.executeAction('partialGroups', 'exportGroups.ps1', 'groups', lastSync);
      }

      execute
        .then(() => {
          // Set the last time for partial user sync.
          nconf.set('lastGroupsPartialSync', currentADCompliantTimestamp());
          resolve();
        })
        .catch((error) => reject(new Error(error.message)));
    });
  },

  fullGroups: function () {
    return new Promise((resolve, reject) => {
      this.executeAction('fullGroups', 'exportGroups.ps1', 'groups')
        .then(() => {
          // Set the last time for partial user sync.
          nconf.set('lastGroupsFullSync', currentADCompliantTimestamp());
          resolve();
        })
        .catch((error) => reject(new Error(error.message)));
    });
  },

  partialUsers: function () {
    return new Promise((resolve, reject) => {
      const lastSync = nconf.get('lastUsersPartialSync');
      let execute;

      // If partial users sync hasn't happened before, then attempt a full users sync instead.
      if (!lastSync) {
        execute = this.fullUsers();
      } else {
        execute = this.executeAction('partialUsers', 'exportUsers.ps1', 'users', lastSync);
      }

      execute
        .then(() => {
          // Set the last time for partial user sync.
          nconf.set('lastUsersPartialSync', currentADCompliantTimestamp());
          resolve();
        })
        .catch((error) => reject(new Error(error.message)));
    });
  },

  fullUsers: function () {
    return new Promise((resolve, reject) => {
      this.executeAction('fullUsers', 'exportUsers.ps1', 'users')
        .then(() => {
          // Set the last time for partial user sync.
          nconf.set('lastUsersFullSync', currentADCompliantTimestamp());
          resolve();
        })
        .catch((error) => reject(new Error(error.message)));
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
    log.debug(`Attempting to perform syncing operation: "${action}"`);

    syncActions[action]()
      .then(() => {
        resolve();
      })
      .catch((error) => reject(new Error(error.message)));
  });
