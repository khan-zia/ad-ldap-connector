import fs from 'fs';
import path from 'path';
import { createHash, createPrivateKey, sign } from 'crypto';
import https from 'https';
import nconf from 'nconf';
import { FormData } from 'formdata-node';
import { fileFromPath } from 'formdata-node/file-from-path';
import got, { HTTPError, Response } from 'got';
import { SyncAction } from '../../renderer/pages/Home';
import { executePSScript } from '../utils';
import log from '../utils/logger';

export const WEBHOOK = {
  SUCCESS: 'success',
  FAILURE: 'failure',
} as const;

type SendPayloadResponse = {
  status: (typeof WEBHOOK)[keyof typeof WEBHOOK];
  message?: string;
  payload?: {
    uploadUrl: string;
  };
};

/**
 * Sends the specified payload to Meveto for syncing. If a file is uploaded to Meveto, it
 * will be deleted after successful upload.
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
  const genericError =
    'Sync failed because data could not be sent to Meveto. Please contact our support if the issue persists.';

  log.debug('Attempting to send exported data to Meveto.', {
    payloadType,
    exportedDataLocation: filePath,
  });

  try {
    log.debug('Testing the specified file to ensure it exists and is readable.');
    await fs.promises.access(filePath, fs.constants.F_OK | fs.constants.R_OK);
  } catch (error) {
    log.error(
      'The specified files either do not exist or are not accessible due to file system permissions for the current user.'
    );

    return { status: WEBHOOK.FAILURE, message: `Exported data could not be found at ${filePath}` };
  }

  // Produce checksum of the file using sha256
  let checksum: string | null = null;

  try {
    log.debug('Producing a checksum of the specified file.');
    const fileContent = await fs.promises.readFile(filePath);
    const hash = createHash('sha256');
    hash.update(fileContent);
    checksum = hash.digest('base64');
  } catch (error) {
    log.error('There was either an error reading content of the file or when attempting to produce the checksum.', {
      error: (error as Error).message,
    });

    return {
      status: WEBHOOK.FAILURE,
      message: `Exported data at ${filePath} could not be accessed for further processing.`,
    };
  }

  // Prepare and sign payload.
  const payload = await signPayload({
    id: nconf.get('appID'),
    type: payloadType,
    fileName,
    checksum,
  });

  // if the signing process returned a string, that's an error.
  if (typeof payload === 'string') {
    return {
      status: WEBHOOK.FAILURE,
      message: payload,
    };
  }

  // Construct HTTP request.
  const url = new URL(nconf.get('webhookUrl'));

  // Process the HTTP request.
  let responseData: SendPayloadResponse;

  try {
    log.debug('Attempting to send the payload to Meveto using the specified webhook URL.');

    responseData = await got
      .post(url, {
        json: payload,
        retry: { limit: 0 },
      })
      .json();

    if (responseData.status !== WEBHOOK.SUCCESS || !responseData.payload) {
      log.error('Failed to send syncing payload. Meveto returned a status indicating failure.', responseData);

      return {
        status: WEBHOOK.FAILURE,
        message: responseData.message || genericError,
      };
    }
  } catch (error) {
    const err: HTTPError = error as HTTPError;
    const resBody = err.response?.body as string;
    let body: SendPayloadResponse | null = null;
    if (resBody) {
      body = JSON.parse(resBody) as SendPayloadResponse;
    }

    log.error(
      'Payload could not be sent to Meveto. Transport attempt resulted in an error that could be either due to a problem at the Meveto backend or the HTTP request from the connector. If the Meveto backend responded with an HTTP status other than the 2xx, that will also result in this message.',
      {
        error: body ? body.message : err.message,
      }
    );

    return {
      status: WEBHOOK.FAILURE,
      message: body ? body.message : genericError,
    };
  }

  log.debug('Signed payload has been successfully sent to Meveto. Meveto acknowledged with a 2xx HTTP response.');

  // After the initial HTTP request is successfully completed, upload the CSV file to AWS.
  try {
    log.debug('Attempting to upload the actual file that contains syncing data to Meveto.');

    const form = new FormData();
    form.set(fileName, fileFromPath(filePath));

    await got
      .put(responseData.payload.uploadUrl, {
        body: form,
        headers: {
          'Content-Type': 'text/csv',
        },
        retry: { limit: 0 },
      })
      .json();
  } catch (error) {
    const err: HTTPError = error as HTTPError;

    log.error('The syncing file could not be uploaded to AWS S3.', {
      errorMsg: err.message,
      body: err.response.body,
    });

    return {
      status: WEBHOOK.FAILURE,
      message: err.message || genericError,
    };
  }

  try {
    log.debug('Attempting to let Meveto know that the syncing file has been uploaded to S3.');

    // Prepare and sign payload.
    const payload = await signPayload({
      id: nconf.get('appID'),
      type: 'fileUploaded',
      fileName,
    });

    console.log(payload);

    responseData = await got
      .post(url, {
        json: payload,
        retry: { limit: 0 },
      })
      .json();

    if (responseData.status !== WEBHOOK.SUCCESS || !responseData.payload) {
      log.error(
        'Failed to let Meveto know about the file upload to S3. Meveto returned a status indicating failure.',
        responseData
      );

      return {
        status: WEBHOOK.FAILURE,
        message: responseData.message || genericError,
      };
    }
  } catch (error) {
    console.log('ohoo ooo');
    const err: HTTPError = error as HTTPError;
    const resBody = err.response?.body as string;
    let body: SendPayloadResponse | null = null;
    if (resBody) {
      body = JSON.parse(resBody) as SendPayloadResponse;
    }

    log.error('Failed to let Meveto know about the file upload to S3.', {
      error: body ? body.message : err.message,
    });

    return {
      status: WEBHOOK.FAILURE,
      message: body ? body.message : genericError,
    };
  }

  // After the file has been successfully sent to Meveto, delete it.
  log.debug('Attempting to delete the file as it is no longer needed.');

  fs.unlink(filePath, (err) => {
    if (err) {
      log.error(
        'File could not be deleted. This error was not shown to the user because the actual syncing has been completed.',
        {
          error: err.message,
        }
      );

      return;
    }

    log.debug('File has been successfully deleted.');
  });

  return { status: WEBHOOK.SUCCESS };
};

/**
 * Sends a webhook call to the Meveto server. This method is suitable for sending simple
 * json objects and expecting a json object back. The method will simply resolve a promise
 * with the webhook's response or without any data if there is no payload in the response.
 * It will reject in case of an error. Any none-2xx response will be treated as error.
 *
 * @param payload JSON payload to send.
 * @param sign Should the payload be signed using the app's private key? Defaults to false.
 * @param retries Number of times to try sending the payload again in case of none-2xx failure.
 * Defaults to 0 (no retries).
 */
export const sendWebhook = async (
  payload: Record<string, unknown>,
  sign = false,
  retries = 0
): Promise<Record<string, unknown> | string> => {
  log.debug('Attempting to send a webhook call to Meveto. Payload attached.', payload);

  try {
    let signed = null;

    if (sign) {
      signed = await signPayload(payload);

      // If the response is a string, then it's an error.
      if (typeof signed === 'string') {
        return signed;
      }
    }

    const response: Record<string, unknown> = await got
      .post(nconf.get('webhookUrl'), {
        json: sign ? signed : payload,
        retry: { limit: retries },
      })
      .json();

    log.debug('Webhook call successfully sent to Meveto.');

    return response;
  } catch (error) {
    log.error('There was a problem while trying to send webhook call to Meveto.', {
      error: (error as Error).message,
    });

    return (error as Error).message || 'The webhook call could not be executed properly.';
  }
};

/**
 * Signs the given payload using the app's private key. It will return a new payload
 * which will contain 2 new keys "signature" set to the value of the payload's
 * signature and "timestamp" set to the time of signature in unix seconds.
 *
 * This method will return a "string" in case of any error and the string will contain a
 * description of the error.
 *
 * @param payload The payload to sign. Must be a valid JSON.
 */
export const signPayload = async (payload: Record<string, unknown>): Promise<Record<string, unknown> | string> => {
  log.debug("Preparing and signing payload for Meveto using the connector's private key.");

  // First, get the app's key for signing.
  let key = null;

  try {
    key = await executePSScript('getKey.ps1');

    if (!key) {
      log.error('The PowerShell script to retrieve private key resulted in an empty response.');
    }
  } catch (error) {
    log.error('The PowerShell script to retrieve private key of the connector resulted in an error.', {
      error: (error as Error).message,
    });
  }

  // If the key is still null or empty, it could not be retrieved.
  if (!key) {
    return "There was a problem while trying to retrieve the connector's private key.";
  }

  log.debug('Private key of the connector has been retrieved for signing.');

  // Add timestamp to the payload.
  payload = {
    ...payload,
    timestamp: Math.floor(Date.now() / 1000),
  };

  try {
    // Sort payload alphabetically.
    const sortedPayload = Object.fromEntries(Object.entries(payload).sort());

    // Sign the sortedPayload after converting it to a string.
    const payloadString = JSON.stringify(sortedPayload);
    const signature = sign(null, Buffer.from(payloadString), createPrivateKey(key)).toString('base64');

    // Add signature to the final payload and return it.
    return { ...payload, signature };
  } catch (error) {
    log.error('There was a problem while trying to sign the payload.', {
      error: (error as Error).message,
    });

    return 'There was a problem while trying to sign the payload.';
  }
};
