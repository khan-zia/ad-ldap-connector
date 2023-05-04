import { executePSScript, sanitizePSResult } from '../utils';
import nconf from 'nconf';
import log from '../utils/logger';

export const checkUpdatesIfAny = (currentVersion: string): void => {
  log.debug('Attempting to check if there are any updates available.');

  try {
  } catch (error) {}
};

export const getCurrentVersion = (): Promise<string> =>
  new Promise((resolve, reject) => {
    log.debug("Attempting to retrieve the connector's current version.");

    executePSScript('getVersion.ps1')
      .then((result) => {
        if (result) {
          const sanitized = sanitizePSResult(result);

          if (sanitized === 'ConnectorNotFound') {
            log.error(
              "The powershell script failed to retrieve version of the currently installed connector. Apparently, it could not find the connector as an installed software on the user's system."
            );

            reject(
              new Error(
                'Failed to retrieve current version of the Meveto AD/LDAP Connector. If the connector is properly installed and this issue persists, please contact Meveto for assistance.'
              )
            );

            return;
          }

          resolve(sanitized);
        }
      })
      .catch((error) => {
        log.error(
          'Attempt to get current version of the connector failed. An error message is included in the context.',
          {
            error: error.message,
          }
        );

        reject(new Error(error.message));
      });
  });
