import express from 'express';
import http from 'http';
import cors from 'cors';
import nconf from 'nconf';
import path from 'path';
import router from './routes';
import { __dirname } from './utils';

const app = express();

// Create an HTTP server.
const httpServer = http.createServer(app);

app.use(express.json());
app.use(cors());
app.use(router);

// Initialize config.
nconf.env({ lowerCase: true }).file(path.join(__dirname(import.meta.url), './config/default.json'));

httpServer.listen(nconf.get('port'), () => {
  console.log(`Server is running at http://localhost:${nconf.get('port')}`);
});
