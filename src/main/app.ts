import express from 'express';
import http from 'http';
import cors from 'cors';
import router from './routes';

const PORT = 6970;
const app = express();

// Create an HTTP server.
const httpServer = http.createServer(app);

app.use(express.json());
app.use(cors());
app.use(router);

httpServer.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
