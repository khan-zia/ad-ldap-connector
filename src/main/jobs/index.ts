import { AsyncTask, SimpleIntervalJob, ToadScheduler } from 'toad-scheduler';
import nconf from 'nconf';
import { sync } from '../handlers/SyncHandler';
import log from '../utils/logger';
import { sendWebhook } from '../handlers/WebhooksHandler';

const heartBeat = new AsyncTask(
  'Connector Heartbeat',
  async () => {
    // Abort if not in production.
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    log.debug('Attempting to send a heartbeat signal to Meveto.');

    // Send a heartbeat signal to Meveto.
    const payload = {
      id: nconf.get('appID'),
      type: 'heartbeat',
    };

    await sendWebhook(payload, true);
    log.debug('Heartbeat signal successfully sent to Meveto.');
    log.flush();
  },
  (err) => {
    log.error('There was a problem while trying to send a heartbeat signal to Meveto.', {
      error: err.message,
    });
  }
);

const groupsSync = new AsyncTask(
  'Groups Partial Sync',
  async () => {
    // Abort if not in production.
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    log.debug('Attempting to perform a scheduled groups partial sync.');

    await sync('partialGroups');

    nconf.save((err: Error | null) => {
      if (err) {
        log.error("There was a problem while trying to update the connector's config after sync.", {
          error: err.message,
        });
      }
    });

    log.debug('Scheduled groups partial sync successfully completed.');
    log.flush();
  },
  (err) => {
    log.error('There was a problem while trying to complete a scheduled groups partial sync.', {
      error: err.message,
    });
  }
);

const usersSync = new AsyncTask(
  'Users Partial Sync',
  async () => {
    // Abort if not in production.
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    log.debug('Attempting to perform a scheduled users partial sync.');

    await sync('partialUsers');

    nconf.save((err: Error | null) => {
      if (err) {
        log.error("There was a problem while trying to update the connector's config after sync.", {
          error: err.message,
        });
      }
    });

    log.debug('Scheduled users partial sync successfully completed.');
    log.flush();
  },
  (err) => {
    log.error('There was a problem while trying to complete a scheduled users partial sync.', {
      error: err.message,
    });
  }
);

const heartBeatJob = new SimpleIntervalJob({ minutes: 5, runImmediately: true }, heartBeat, {
  preventOverrun: true,
});

const groupsSyncJob = new SimpleIntervalJob({ minutes: 15 }, groupsSync, {
  preventOverrun: true,
});

const usersSyncJob = new SimpleIntervalJob({ minutes: 15 }, usersSync, {
  preventOverrun: true,
});

/**
 * Begins jobs that will run after an interval.
 *
 * - Heartbeat Signal: Every 5 minutes.
 * - Partial Groups Sync: Every 15 minutes.
 * - Partial Users Sync: Every 15 minutes.
 */
export const beginScheduledJobs = (): void => {
  // Schedule required jobs.
  const scheduler = new ToadScheduler();

  // Begin heartbeat.
  scheduler.addSimpleIntervalJob(heartBeatJob);

  // Begin groups partial sync.
  scheduler.addSimpleIntervalJob(groupsSyncJob);

  // Begin users partial sync.
  scheduler.addSimpleIntervalJob(usersSyncJob);
};
