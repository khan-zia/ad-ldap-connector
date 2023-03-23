import crypto from 'crypto';
import { spawn } from 'child_process';
import path from 'path';
import nconf from 'nconf';
import { __dirname } from '../utils';
import log from '../utils/logger';

/**
 * Generates and returns an ID to be used as an identifier for this connector
 * instance. ID is of the following format.
 * 123456-12345-12345
 */
const generateID = (): string => {
  log.debug('Attempting to generate a new ID for the connector.');

  let str = '';
  for (let i = 0; i <= 4; i++) {
    str += i === 1 || i === 3 ? '-' : Math.floor(Math.random() * 90000) + 10000;
  }
  return str;
};

/**
 * Generates and stores a new ID for the app.
 * The ID will be stored insdie the default.json config file.
 */
export const createNewID = (): void => nconf.set('appID', generateID());

/**
 * Attempts to create a new crypto key pair on the device.
 * User must have elevated access to be able to create a key pair.
 * The private key file's permissions will be set such that only an admin level
 * user can read (view) it.
 */
export const createCryptoKeypair = (): Promise<void> =>
  new Promise((resolve, reject) => {
    log.debug('Attempting to generate a new key pair for the connector.');

    crypto.generateKeyPair(
      'ed25519',
      {
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        },
      },
      async (err, publicKey, privateKey) => {
        if (err) {
          log.error('New key pair could not be generated. An error message is included in the context object.', {
            error: err.message,
          });
          reject(new Error(`There was a problem while trying to generate a key pair: ${err.message}`));
          return;
        }

        log.debug('A new key pair has been generated.');

        try {
          // Attempt to securely store the private key.
          await storeKeys(privateKey);

          log.debug('Private key successfully stored on the system.');

          // Store the public key in config
          nconf.set('publicKey', publicKey);

          log.debug('Public key set on the config object.');

          // Resolve the promise
          resolve();
        } catch (error) {
          reject(
            new Error(
              `There was a problem while trying to generate a key pair: ${(error as Error | TypeError).message}`
            )
          );
        }
      }
    );
  });

/**
 * Stores the private key generated here on the node.js side and creates an AES key
 * on the PowerShell side. The AES key is used for encrypting sensitive info such as
 * AD user passwords. The private key here on the node.js side is used to authenticate
 * to Meveto.
 */
const storeKeys = (key: string): Promise<void> =>
  new Promise((resolve, reject) => {
    log.debug('Attempting to store the private key on the system.');
    const storageScript = path.join(__dirname(import.meta.url), '../../scripts/storeCryptoKeys.ps1');
    const encodedPrivateKey = Buffer.from(key).toString('base64');

    // Execute the script.
    const ps = spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', storageScript, encodedPrivateKey]);

    // Cath errors if any.
    ps.on('error', (error) => {
      log.error('Private key could not be stored. An error message is included in the context object.', {
        error: error.message,
      });
      reject(new Error(`The powershell process could not be run: ${error.message}`));
    });

    ps.stderr.on('data', (error) => {
      log.error('Private key could not be stored. An error message is included in the context object.', {
        error: error.toString(),
      });
      reject(new Error(`The powershell process could not be completed successfully: ${error.toString()}`));
    });

    ps.stdout.on('data', () => {
      // Butter output...
    });

    ps.on('exit', (code) => {
      // Must exit with code 0 to be considered successful.
      if (code !== 0) {
        log.error(`Private key could not be stored. PowerShell script exited with code: ${code}`);
        reject(new Error(`The powershell process could not be completed successfully. It exited with code: ${code}`));
      }

      resolve();
    });
  });
