import { executePSScript, sanitizePSResult } from '../utils';
import log from '../utils/logger';
import { sendWebhook, WEBHOOK, WebhookResponse } from './WebhooksHandler';

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

export const checkUpdatesIfAny = async (
  currentVersion: string
): Promise<{ version: string; updateUrl: string } | null> => {
  log.debug('Attempting to check if there are any updates available.');

  try {
    const updateResult: WebhookResponse<{
      updateUrl: null | string;
      version: string;
    }> = await sendWebhook({
      type: 'checkUpdate',
      version: currentVersion,
    });

    if (updateResult.status !== WEBHOOK.SUCCESS) {
      throw new Error(updateResult.message || 'Failed to fetch update information from Meveto.');
    }

    // Has been there been any update? If Update URL is set, there has been an update.
    if (updateResult.payload && updateResult.payload.updateUrl !== null) {
      return { version: updateResult.payload.version, updateUrl: updateResult.payload.updateUrl };
    }

    return null;
  } catch (error) {
    log.error('Attempt to check for updates failed. An error message is attached in context if any.', {
      error: (error as Error).message,
    });

    // Re-throw the error for the consumers to catch.
    throw new Error((error as Error).message);
  }
};

export const installUpdateFromUrl = async (updateUrl: string): Promise<void> => {
  log.debug(`Initiating update. Specified update URL: ${updateUrl}`);
  log.debug(
    'The node server will be reinstalled and further logs can not be caught. If there are no error logs after this, the update should be considered successful.'
  );
  log.flush();

  try {
    const result = await executePSScript('update.ps1', { updateUrl });

    // We do not expect anything back from the update script. Any returned feedback should be treated as
    // an exception thrown by the script (error).
    if (result) {
      const sanitized = sanitizePSResult(result);
      if (sanitized !== '') throw new Error(sanitized);
    }
  } catch (error) {
    log.error('Failed to update the connector.', {
      error: (error as Error).message,
    });

    // Re-throw the error for the consumers to catch.
    throw new Error((error as Error).message);
  }
};
