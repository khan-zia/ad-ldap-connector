import express, { Request, RequestHandler, Response } from 'express';
import nconf from 'nconf';
import { SaveCredsRequestBody } from '../../renderer/pages/GetCredentials';
import { Config } from '../config/config';
import { createCryptoKeypair, createNewID } from '../handlers/ConfigHandler';
import { storeCredentials, testLDAPConnection } from '../handlers/CredsHandler';
import { isElevated } from '../utils';

// Initialize the router.
const router = express.Router();

/**
 * This is a middleware function that ensures the current process (request) is being
 * executed by an Admin or root user.
 */
const isAdmin: RequestHandler = async (_, res: Response<Record<string, unknown>>, next) => {
  if (!isElevated()) {
    return res.json({
      success: false,
      message: 'Only Administrator users can configure the Meveto AD/LDAP Connector.',
    });
  }

  next();
};

/**
 * This method executes the initial configuration of the app.
 * It will create a crypto keypair and a new ID for the app.
 * It returns the public key and the ID in response.
 */
const configure: RequestHandler = async (_, res: Response<Record<string, unknown>>) => {
  // App must not be already configurted.
  if (nconf.get('state') !== 'pendingConfig') {
    return res.json({
      success: false,
      message: 'The Connector appears to be configured already. Please contact Meveto if you are facing any issues.',
    });
  }

  try {
    // Create a new ID for the app.
    createNewID();

    // Create crypto keypair. This encryptes and saves the private key using PowerShell.
    await createCryptoKeypair();

    // Update app's state.
    nconf.set('state', 'pendingCredentials');

    // Finally, save configuration values. This will save appID and publicKey in the
    // config.json file.
    nconf.save((err: Error | null) => {
      if (err) {
        return res.json({ success: false, message: 'There was a problem while trying to save configuration values.' });
      }
    });

    // Return success response along with the app's ID and public key.
    return res.json({
      success: true,
      id: nconf.get('appID'),
      publicKey: nconf.get('publicKey'),
      state: nconf.get('state'),
    });
  } catch (error) {
    return res.json({ success: false, message: (error as Error).message });
  }
};

const saveCredentials: RequestHandler = async (
  req: Request<{}, {}, SaveCredsRequestBody>,
  res: Response<Record<string, unknown>>
) => {
  try {
    const { orgID, ...ldapCreds } = req.body;
    await testLDAPConnection(ldapCreds);
    await storeCredentials(ldapCreds);    

    return res.json({
      success: true,
    });
  } catch (error) {
    return res.json({ success: false, message: (error as Error).message });
  }
};

router.get('/state', (_, res: Response<Record<string, unknown>>) => {
  // Return current state of the connector.
  const state: Config['state'] = nconf.get('state');

  res.json({ success: true, state });
});

/**
 * Retrieves the app's ID and public key if set.
 */
router.get('/info', (_, res: Response<Record<string, unknown>>) => {
  const id: Config['appID'] = nconf.get('appID');
  const publicKey: Config['publicKey'] = nconf.get('publicKey');

  res.json({ success: true, id, publicKey });
});

router.post('/configure', isAdmin, configure);
router.post('/save', isAdmin, saveCredentials);

export default router;
