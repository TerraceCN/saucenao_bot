import 'dotenv/config';
import { OneBot } from './onebot';

export const onebot = new OneBot();

export * as handlers from './handlers';

onebot.listen(parseInt(process.env.PORT ?? '8080'));
