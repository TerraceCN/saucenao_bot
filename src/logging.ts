import { Signale } from 'signale';

const config = {
  displayTimestamp: true,
  displayDate: true
};

export function getLogger(scope: string) {
  const logger = new Signale({ scope });
  logger.config(config);
  return logger;
}
