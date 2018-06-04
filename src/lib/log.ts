import * as Winston from 'winston';
import { LOG_LEVEL } from './config';

const logger = Winston.createLogger({
  level: LOG_LEVEL,
  format: Winston.format.json(),
  transports: [
    new Winston.transports.File({ filename: 'error.log', level: 'error' }),
    new Winston.transports.File({ filename: 'combined.log' }),
    new Winston.transports.Console({
      format: Winston.format.simple(),
    }),
  ],
});

export default logger;
