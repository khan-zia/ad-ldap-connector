import express, { Request, RequestHandler, Response } from 'express';
import nconf from 'nconf';
import { check, validationResult } from 'express-validator';
import { SaveCredsRequestBody } from '../../renderer/pages/GetCredentials';
import { Config } from '../config/config';
import { createCryptoKeypair, createNewID } from '../handlers/ConfigHandler';
import { storeCredentials, testLDAPConnection } from '../handlers/CredsHandler';
import { sync as syncHandler } from '../handlers/SyncHandler';
import { isElevated } from '../utils';
import { LastSyncResponse, SyncAction } from '../../renderer/pages/Home';
import log from '../utils/logger';

// Initialize the router.
const router = express.Router();

/**
 * This is a middleware function that ensures the current process (request) is being
 * executed by an Admin or root user.
 */
const isAdmin: RequestHandler = async (_, res: Response<Record<string, unknown>>, next) => {
  log.debug('Determining if the current user is an admin or has privileged access.');

  if (!isElevated()) {
    log.debug('The current user is NOT an admin.');

    return res.json({
      success: false,
      message: 'Only Administrator users can configure the Meveto AD/LDAP Connector.',
    });
  }

  log.debug('The current user is an admin.');

  next();
};

/**
 * This method executes the initial configuration of the app.
 * It will create a crypto keypair and a new ID for the app.
 * It returns the public key and the ID in response.
 */
const configure: RequestHandler = async (_, res: Response<Record<string, unknown>>) => {
  log.debug('Attempting to configure the connector.');

  // App must not be already configured.
  const state: Config['state'] = nconf.get('state');
  if (state !== 'pendingConfig') {
    log.debug(`Connector can not be configured because the connector's state is: "${state}"`);

    return res.json({
      success: false,
      message: 'The Connector appears to be configured already. Please contact Meveto if you are facing any issues.',
    });
  }

  try {
    // Create a new ID for the app.
    createNewID();

    log.debug('New ID has been generated for the connector.');

    // Create crypto key pair. This encrypts and saves the private key using PowerShell.
    await createCryptoKeypair();

    log.debug('New key pair has been generated and processed successfully.');

    // Update app's state.
    nconf.set('state', 'pendingCredentials');

    log.debug('Connector\'s state has been set to "pendingCredentials" on the config object.');

    // Finally, save configuration values. This will save appID and publicKey in the
    // config.json file.
    nconf.save((err: Error | null) => {
      if (err) {
        log.error(
          'Failed to complete configuration because config object could not be updated. An error message is included in the context.',
          {
            error: err.message,
          }
        );

        return res.json({ success: false, message: 'There was a problem while trying to save configuration values.' });
      }
    });

    log.debug("Connector's configuration has been successfully completed.");
    log.flush();

    // Return success response along with the app's ID and public key.
    return res.json({
      success: true,
      id: nconf.get('appID'),
      publicKey: nconf.get('publicKey'),
      state: nconf.get('state'),
    });
  } catch (error) {
    log.error('Failed to complete configuration. An error message is included in the context.', {
      error: (error as Error).message,
    });

    log.flush();

    return res.json({ success: false, message: (error as Error).message });
  }
};

const saveCredentials: RequestHandler = async (
  req: Request<object, object, SaveCredsRequestBody>,
  res: Response<Record<string, unknown>>
) => {
  log.debug('Attempting to save LDAP credentials.');

  // Input validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    log.debug(
      'Saving LDAP credentials failed because of input validation errors. Errors have been included in the context.',
      {
        errors: errors.array(),
      }
    );

    return res.status(400).json({ errors: errors.array() });
  }

  const ldapCreds = req.body;

  try {
    await testLDAPConnection(ldapCreds);
    log.debug('LDAP credentials have been successfully validated.');

    await storeCredentials(ldapCreds);
    log.debug('LDAP credentials have been prepared and set on the config object.');

    // Update the app's state.
    nconf.set('state', 'ready');

    log.debug('LDAP credentials have been processed. The connector\'s state has been set to "ready".');

    // Save config.
    nconf.save((err: Error | null) => {
      if (err) {
        log.error(
          'Failed to store LDAP credentials on the config object. An error message is included in the context.',
          {
            error: err.message,
          }
        );

        return res.json({ success: false, message: 'There was a problem while trying to save credentials.' });
      }
    });

    log.debug('LDAP credentials have been successfully validated and stored.');
    log.flush();

    return res.json({
      success: true,
    });
  } catch (error) {
    log.error(
      'Failed to store LDAP credentials. An error message along with the supplied input have been sent on the context object.',
      {
        error: (error as Error).message,
        userInput: {
          connectionString: ldapCreds.conString,
          baseDN: ldapCreds.baseDN,
          username: ldapCreds.username,
          password: 'Omitted for security. An incorrect password could have been the reason for failure.',
        },
      }
    );
    log.flush();

    return res.json({ success: false, message: (error as Error).message });
  }
};

const sync: RequestHandler = async (
  req: Request<object, object, { syncAction: SyncAction }>,
  res: Response<Record<string, unknown>>
) => {
  const { syncAction } = req.body;

  try {
    await syncHandler(syncAction);

    log.debug('Syncing operation successfully completed. This means syncing data bas been sent to Meveto if any.');

    // Save config.
    nconf.save((err: Error | null) => {
      if (err) {
        log.error("An error was encountered when trying to update the Connector's config after syncing.", {
          error: err.message,
        });

        return res.json({
          success: false,
          message: `Error when finalizing syncing operation: "${err.message}". Contact our support if the issue persists.`,
        });
      }
    });

    log.debug("Connector's config has been updated after syncing. Operation completed.");
    log.flush();

    return res.json({
      success: true,
    });
  } catch (error) {
    log.error('Syncing operation failed.', {
      error: (error as Error).message,
    });

    return res.json({ success: false, message: (error as Error).message });
  }
};

router.get('/state', (_, res: Response<Record<string, unknown>>) => {
  // Return current state of the connector.
  const state: Config['state'] = nconf.get('state');
  res.json({ success: true, state });
});

/** Retrieves the app's ID and public key if set. */
router.get('/info', (_, res: Response<Record<string, unknown>>) => {
  const id: Config['appID'] = nconf.get('appID');
  const publicKey: Config['publicKey'] = nconf.get('publicKey');
  res.json({ success: true, id, publicKey });
});

/** Retrieves the app's last sync time for groups and users. */
router.get('/last-sync', (_, res: Response<LastSyncResponse>) => {
  const partialGroup: Config['lastGroupsPartialSync'] = nconf.get('lastGroupsPartialSync');
  const fullGroup: Config['lastGroupsFullSync'] = nconf.get('lastGroupsFullSync');
  const partialUser: Config['lastUsersPartialSync'] = nconf.get('lastUsersPartialSync');
  const fullUser: Config['lastUsersFullSync'] = nconf.get('lastUsersFullSync');

  res.json({
    success: true,
    lastSync: {
      partialGroup,
      fullGroup,
      partialUser,
      fullUser,
    },
  });
});

router.post('/configure', isAdmin, configure);

router.post(
  '/save',
  isAdmin,
  [
    check('conString')
      .exists({ checkNull: true })
      .withMessage('Please provide an LDAP connection string for your Active Directory.')
      .bail()
      .matches(/^(?:LDAP|LDAPS):\/\/.{5,}/)
      .withMessage('The LDAP connection string is invalid.'),
    check('baseDN').if(check('baseDN').notEmpty()).isString().withMessage('Format of the base base DN is invalid.'),
    check('username').exists({ checkNull: true }).withMessage('Specify your Active Directory/LDAP username.'),
    check('password').exists({ checkNull: true }).withMessage('Specify your Active Directory/LDAP password.'),
  ],
  saveCredentials
);

router.post('/sync', isAdmin, sync);

export default router;
