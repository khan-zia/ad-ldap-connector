import http from 'node:http';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import nconf from 'nconf';
import router from './routes';
import { __dirname } from './utils';
import { beginScheduledJobs } from './jobs';

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

// Begin scheduled jobs.
beginScheduledJobs();
