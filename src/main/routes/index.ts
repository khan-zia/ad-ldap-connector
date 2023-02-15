import express, { RequestHandler, Response } from 'express';
import nconf from 'nconf';
import { createCryptoKeypair, createNewID } from '../methods';
import { isElevated } from '../utils';

// Initialize the router.
const router = express.Router();

/**
 * This method executes the initial configuration of the app.
 * It will create a crypto keypair and a new ID for the app.
 * It returns the public key and the ID in response.
 */
const configure: RequestHandler = async (_, res: Response<Record<string, unknown>>) => {
  // Only admin users with elevated processes can run config.
  if (!isElevated()) {
    return res.json({success: false, message: 'Only Administrator users can configure the Meveto AD/LDAP Connector.'})
  }

  try {
    // Create a new ID for the app.
    createNewID();

    // Create crypto keypair. This encryptes and saves the private key using PowerShell.
    await createCryptoKeypair();

    // Finally, save configuration values. This will save appID and publicKey in the
    // config.json file.
    nconf.save((err: Error | null) => {
      if (err) {
        return res.json({ success: false, message: "There was a problem while trying to save configuration values." });
      }
    });

    // Return success response along with the app's ID and public key.
    return res.json({success: true, id: nconf.get('appID'), publicKey: nconf.get('publicKey')});
  } catch(error) {
    return res.json({ success: false, message: (error as Error).message });
  }
};

router.post('/configure', configure);

export default router;
