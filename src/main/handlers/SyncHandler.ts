import nconf from 'nconf';
import { SyncAction } from '../../renderer/pages/Home';

const syncActions: { [K in SyncAction]: <T>() => Promise<T> } = {
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
        resolve(this.fullUsers());
      }
    });
  },

  fullUsers: function () {
    return new Promise((resolve, reject) => {
      // If partial users sync hasn't happened before, then attempt
      // a full users sync instead.
      const lastSync = nconf.get('lastUsersPartialSync');

      if (!lastSync) {
        resolve(this.fullUsers());
      }
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
export const sync = (action: SyncAction): Promise<boolean | string> =>
  new Promise((resolve, reject) => {
    syncActions[action]();
    resolve(true);
  });
