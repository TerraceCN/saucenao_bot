import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import axios from 'axios';

import { getLogger } from '../logging';
import { EventHandler } from './event';
import { APIClient } from './api';

const logger = getLogger('onebot');

export class OneBot extends EventHandler {
  server = createServer();
  wss = new WebSocketServer({ noServer: true });
  apiClientMap = new Map<string, APIClient>();

  constructor() {
    super();

    this.server.on('request', async (request, response) => {
      const url = new URL(request.url, `http://${request.headers.host}`);
      if (url.pathname === '/proxy') {
        if (!url.searchParams.get('url')) {
          response.writeHead(403).write('require url');
          return ;
        }
        try {
          const { status, data } = await axios.get(
            url.searchParams.get('url'),
            {
              responseType: 'arraybuffer',
              ...(
                process.env.HTTP_PROXY_HOST && process.env.HTTP_PROXY_PORT
                ? {proxy: { host: process.env.HTTP_PROXY_HOST, port: parseInt(process.env.HTTP_PROXY_PORT) }}
                : {}
              )
            }
          );
          response.writeHead(status).end(data);
        } catch (e) {
          if (e.response) {
            response.writeHead(e.response.status).end(e.response.data);
          } else {
            response.writeHead(500).end(e.message);
          }
          response.writeHead(500).end();
          logger.error(`Proxy Error: ${e.message}`);
        }
      } else {
        response.writeHead(404).end();
      }
    });

    this.server.on('upgrade', (request, socket, head) => {
      if (request.url === '/') {         // Handler
        this.wss.handleUpgrade(request, socket, head, (client) => {
          this.wss.emit('connection', client, request);
        });
      } else {                           // Invalid Handler
        logger.error(`Invalid URL: ${request.url} from ${request.headers['x-self-id']}`);
        socket.destroy();
      }
    });

    this.wss.on('connection', (client, request) => {
      if (typeof request.headers['x-self-id'] === 'undefined') {
        logger.error('Client missing x-self-id header');
        return;
      }

      logger.info(`Client connected: ${request.headers['x-self-id']}`);
      const apiClient = new APIClient(client);
      this.apiClientMap.set(request.headers['x-self-id'] as string, apiClient);

      client.on('message', (rawData) => {
        try {
          const data = JSON.parse(rawData.toString());
          
          if ('post_type' in data) {
            this.handle(data, apiClient);
          } else {
            apiClient.handle(data);
          }
        } catch (error) {
          if (error instanceof SyntaxError) {
            logger.error(`Client ${request.headers['x-self-id']} sent invalid JSON: ${rawData}`);
          } else {
            logger.error(error)
          }
        }
      });

      client.on('close', () => {
        logger.info(`Client disconnected: ${request.headers['x-self-id']}`);
        this.apiClientMap.delete(request.headers['x-self-id'] as string);
      });
    });
  }

  listen(port: number = 8080) {
    this.handleInit(() => {
      this.server.listen(port, () => {
        logger.info('Onebot is listening on port 8080');
      });
    });
  }
}
