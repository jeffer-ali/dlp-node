import express from 'express';
import downloadRouter from './download';

const router = express.Router();

router.use('/crawler', downloadRouter);

export default router;
