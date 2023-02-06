import express, { RequestHandler, Response } from 'express';
import { createCryptoKeypair } from '../methods';

// Initialize the router.
const router = express.Router();

/**
 * This method executes the initial configuration of the app.
 */
const configure: RequestHandler = (_, res: Response<Record<string, unknown>>) => {
  createCryptoKeypair()
    .then(() => res.json({ success: true }))
    .catch((err: Error) => res.json({ success: false, message: err.message }));
};

router.post('/configure', configure);

export default router;
