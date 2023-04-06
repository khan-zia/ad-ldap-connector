import http from 'node:http';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import nconf from 'nconf';
import { ToadScheduler, SimpleIntervalJob, Task } from 'toad-scheduler';
import router from './routes';
import { __dirname } from './utils';
import { AsyncTask } from 'toad-scheduler/dist/lib/common/AsyncTask';
import { sendWebhook } from './handlers/WebhooksHandler';
import log from './utils/logger';

const app = express();

// Create an HTTP server.
const httpServer = http.createServer(app);

// Bootstrap Express middleware.
app.use(express.json());
app.use(cors());
app.use(router);

// Initialize config.
nconf.env({ lowerCase: true }).file(path.join(__dirname(import.meta.url), './config/default.json'));

// Start the server.
httpServer.listen(nconf.get('port'), () => {
  console.log(`Meveto AD/LDAP Connector is running at http://localhost:${nconf.get('port')}`);
});

// Schedule required jobs.
const scheduler = new ToadScheduler();

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
      type: 'heartbeat',
    };

    await sendWebhook(payload, true);
    log.debug('Heartbeat signal successfully sent to Meveto.');
  },
  (err) => {
    log.error('There was a problem while trying to send a heartbeat signal to Meveto.', {
      error: err.message,
    });
  }
);

const heartBeatJob = new SimpleIntervalJob({ minutes: 5, runImmediately: true }, heartBeat, {
  preventOverrun: true,
});

// Begin heartbeat.
scheduler.addSimpleIntervalJob(heartBeatJob);
