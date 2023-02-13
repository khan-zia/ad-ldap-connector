import crypto from 'crypto';
import { spawn } from 'child_process';
import { isElevated } from '../utils';
import path from 'path';

/**
 * Attempts to create a new crypto key pair on the device.
 * User must have elevated access to be able to create a key pair.
 * The private key file's permissions will be set such that only an admin level
 * user can read (view) it.
 */
export const createCryptoKeypair = (): Promise<void> =>
  new Promise((resolve, reject) => {
    // To create a key pair, the user must be an admin.
    if (isElevated()) {
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
        (err, publicKey, privateKey) => {
          if (err) {
            reject(new Error(`There was a problem while trying to generate a key pair: ${err.message}`));
            return;
          }

          try {
            // Attempt to securely store the private key.
            console.log('Here is the private key that was generated before storage.');
            console.log(privateKey);
            storePrivateKey(privateKey);

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
    } else {
      reject(new Error('Only an admin user can configure the AD/LDAP Connector.'));
    }
  });

/**
 * Store private key. It will store the key securely.
 *
 * - Windows: Windows Credentials Manager.
 * - Mac: Not implemented yet but it should use KeyChain.
 * - Linux: Not implemented yet but it should use Secret Service API/libsecret.
 */
const storePrivateKey = (key: string): void => {
  const storageScript = path.join(__dirname, '../../scripts/storePrivateKey.ps1');
  const encodedPrivateKey = Buffer.from(key).toString("base64");

  // Execute the script.
  const ps = spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', storageScript, encodedPrivateKey], {
    // runas: 'Administrator',
    // windowsHide: true
  });

  // Cath errors if any.
  ps.on('error', (error) => {
    throw new Error(`The powershell process could not be run: ${error.message}`);
  });
  ps.stderr.on('data', (error) => {
    throw new Error(`The powershell process could not be completed successfully: ${error}`);
  });

  ps.stdout.on('data', (data) => {
    console.log({ data: data.toString() });
  });

  ps.on('exit', (code) => {
    console.log(`Powershell process exited with code ${code}`);
  });
};
