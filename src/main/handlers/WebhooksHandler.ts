import fs from 'fs';
import path from 'path';
import { createHash, createPrivateKey, sign } from 'crypto';
import https from 'https';
import nconf from 'nconf';
import { File, FormData } from 'formdata-node';
import got from 'got';
import { SyncAction } from '../../renderer/pages/Home';
import { executePSScript } from '../utils';

export const WEBHOOK = {
  SUCCESS: 'success',
  FAILURE: 'failure',
} as const;

type SendPayloadResponse = {
  status: (typeof WEBHOOK)[keyof typeof WEBHOOK];
  message?: string;
};

type DispatchActions = { [K in SyncAction]: () => void };

interface DispatchActionProps extends DispatchActions {
  preparePayload: () => {
    id: string;
    type: SyncAction | 'deleteUsers' | 'deleteGroups';
    checksum: string;
    fileName: string;
    signature: string;
  };
}

const dispatchActions = {
  // preparePayload: function () {
  //   return {
  //     id: nconf.get('appID'),
  //   };
  // },
  // partialGroups: function () {
  //   //
  // },
  // fullGroups: function () {
  //   //
  // },
  // partialUsers: function () {
  //   //
  // },
  // fullUsers: function () {
  //   //
  // },
};

/**
 * Sends the specified payload to Meveto for syncing.
 *
 * @param payloadType Type of the payload is the same as the action being performed.
 * @param fileName Name of the exported file by PowerShell that should be sent to Meveto.
 */
export const sendPayload = async (
  payloadType: SyncAction | 'deleteUsers' | 'deleteGroups',
  fileName: string
): Promise<SendPayloadResponse> => {
  // Check if the given file exists.
  const programFilesPath = process.env.ProgramFiles || 'C:\\Program Files';
  const mevetoExportsPath = path.join(programFilesPath, 'Meveto', 'Exports');
  const filePath = path.join(mevetoExportsPath, fileName);

  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
  } catch (error) {
    return { status: WEBHOOK.FAILURE, message: `Exported data could not be found at ${filePath}` };
  }

  // Produce checksum of the file using sha256
  let checksum: string | null = null;

  try {
    const fileContent = await fs.promises.readFile(filePath);
    const hash = createHash('sha256');
    hash.update(fileContent);
    checksum = hash.digest('base64');
  } catch (error) {
    return {
      status: WEBHOOK.FAILURE,
      message: `Exported data at ${filePath} could not be accessed for further processing.`,
    };
  }

  // Prepare payload for signing.
  const payload = {
    id: nconf.get('appID'),
    type: payloadType,
    fileName,
    checksum,
    timestamp: Math.floor(Date.now() / 1000),
  };

  // Sort payload alphabetically.
  const sortedPayload = Object.fromEntries(Object.entries(payload).sort());

  // Get the app's key for signing.
  let key = null;

  try {
    key = await executePSScript('getKey.ps1');

    if (!key) {
      return {
        status: WEBHOOK.FAILURE,
        message: "There was a problem while trying to retrieve the Connector's private key.",
      };
    }
  } catch (error) {
    return {
      status: WEBHOOK.FAILURE,
      message: "There was a problem while trying to retrieve the Connector's private key.",
    };
  }

  // Sign the sortedPayload after converting it to a string.
  const payloadString = JSON.stringify(sortedPayload);
  const signature = sign(null, Buffer.from(payloadString), createPrivateKey(key)).toString('base64');

  // Add signature to the final payload.
  const finalPayload = { ...payload, signature };

  // Construct HTTP request.
  const httpOptions: https.RequestOptions = {
    hostname: 'my.api.mockaroo.com',
    path: '/api/extensions/ldap-connector/webhook?key=14e90980',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Process the HTTP request.
  try {
    await new Promise<SendPayloadResponse>((resolve, reject) => {
      const req = https.request(httpOptions, (res) => {
        // Collect response data from the buffer.
        let responseData = Buffer.from([]);
        res.on('data', (chunk) => {
          responseData = Buffer.concat([responseData, chunk]);
        });

        // Process response upon request completion.
        res.on('end', () => {
          const response: SendPayloadResponse = JSON.parse(responseData.toString());

          // Response received from the Meveto side must be an object.
          if (!response || typeof response !== 'object') {
            reject(
              new Error(
                'Sync failed. Invalid or unexpected response received while attempting to sync data. Please contact our support if the issue persists.'
              )
            );

            return;
          }

          if (
            !(res.statusCode && res.statusCode >= 200 && res.statusCode < 300) ||
            response.status !== WEBHOOK.SUCCESS
          ) {
            reject(
              new Error(
                response.message || `Sync failed. Received unexpected status code of ${res.statusCode} from Meveto`
              )
            );

            return;
          }

          resolve(response);
        });
      });

      // Catch any TCP/IP level errors.
      req.on('error', (error) => {
        reject(
          new Error(
            error.message ||
              "Sync failed because an unexpected network error occurred. Please check your internet connection and make sure that your firewall settings isn't blocking the Connector."
          )
        );

        return;
      });

      // Execute the request.
      req.write(JSON.stringify(finalPayload));
      req.end();
    });
  } catch (error) {
    return {
      status: WEBHOOK.FAILURE,
      message:
        (error as Error).message ||
        'Sync failed because data could not be sent to Meveto. Please contact our support if the issue persists.',
    };
  }

  // After the initial HTTP request is successfully completed, upload the CSV file to Meveto.
  try {
    const form = new FormData();

    fs.readFile(filePath, (error, data) => {
      if (error) {
        console.error(`Error: ${error}`);
        return;
      }

      const file = new File(data, fileName, {
        type: 'text/csv',
      });

      form.set('syncFile', file);
    });
    const data = await got.post('https://httpbin.org/post', { body: form }).json();
  } catch (error) {
    return {
      status: WEBHOOK.FAILURE,
      message:
        (error as Error).message ||
        'Sync failed because data could not be sent to Meveto. Please contact our support if the issue persists.',
    };
  }

  return { status: WEBHOOK.SUCCESS };
};
