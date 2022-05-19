import { randomUUID } from 'crypto';
import { WebSocket } from 'ws';

import { getLogger } from '../logging';

const logger = getLogger('api');

interface APICallResult {
  status: string;
  retcode: number;
  msg?: string;
  data: { [key: string]: any } | null;
  echo?: string;
}

class APICallError extends Error {
  action: string;
  result: APICallResult;

  constructor(action: string, result: APICallResult) {
    super(`Failed to call ${action}, Retcode: ${result.retcode}, msg: ${result?.msg ?? 'unknown'}`);
    this.action = action;
    this.result = result;
  }
}

type CallListItem = {
  action: string,
  resolve: (value: APICallResult) => void,
  reject: (value?: APICallError) => void
};

export class APIClient {
  ws: WebSocket;
  callList: Map<string, CallListItem>

  constructor(ws: WebSocket) {
    this.ws = ws;
    this.callList = new Map<string, CallListItem>();
  }

  handle(data: APICallResult) {
    const echo = data.echo;
    const call = this.callList.get(echo);
    if (call) {
      this.callList.delete(echo);
      if (data.status === 'ok' || data.status === 'async') {
        call.resolve(data);
      } else {
        call.reject(new APICallError(call.action, data));
      }
    } else {
      logger.warn(`Unknown echo: ${echo}`);
    }
  }

  call(action: string, params: { [key: string]: any } = {}) {
    const echo = randomUUID();
    const promise = new Promise<APICallResult>((resolve, reject) => {
      this.callList.set(echo, { action, resolve, reject });
      try {
        const data = JSON.stringify({
          action,
          params,
          echo
        });
        // logger.debug(data);
        this.ws.send(data);
      } catch (error) {
        reject(error);
      }
    });
    return promise;
  }
}
