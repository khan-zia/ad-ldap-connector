import fs from 'fs';
import path from 'path';
import { createHash, sign } from 'crypto';
import nconf from 'nconf';
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

  // Prepare payload for signature.
  const payload = {
    id: nconf.get('appID'),
    type: payloadType,
    fileName,
    checksum,
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
  const hash = createHash('sha512').update(payloadString).digest();
  const signature = sign(null, hash, key).toString('base64');

  // Add signature to the final payload.
  const finalPayload = { ...payload, signature };

  console.log(finalPayload);

  return { status: WEBHOOK.SUCCESS };
};
