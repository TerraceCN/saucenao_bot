import { getLogger } from '../logging';
import { APIClient } from './api';
import { incomingMessage } from './message';
import { postData } from './typing';


const logger = getLogger('event');

type messageCb = (inMessage: incomingMessage, apiClient: APIClient) => Promise<void>;
type handlerCallback = (data: any, apiClient: APIClient) => void | Promise<void>;

export class EventHandler {
  messageHandlers = new Map<string, messageCb[]>();
  noticeHandlers = new Map<string, handlerCallback[]>();
  requestHandlers = new Map<string, handlerCallback[]>();
  initHandlers: (() => any)[] = [];

  message(type: string | string[], handler: messageCb) {
    let types: string[];
    if (typeof type === 'string') {
      types = [type];
    } else {
      types = type;
    }
    types.forEach((type) => {
      if (!this.messageHandlers.has(type)) {
        this.messageHandlers.set(type, []);
      }
      this.messageHandlers.get(type).push(handler);
    });
  }

  handleMessage(type: string, data: postData, apiClient: APIClient) {
    if (this.messageHandlers.has(type)) {
      const inMessage = new incomingMessage(data, apiClient);
      this.messageHandlers
        .get(type)
        .map(handler => handler(inMessage, apiClient))
        .forEach((result) => {
          if (result instanceof Promise) {
            result.catch(e => logger.error(e));
          }
        });
    }
  }

  notice(type: string | string[], handler: handlerCallback) {
    let types: string[];
    if (typeof type === 'string') {
      types = [type];
    } else {
      types = type;
    }
    types.forEach((type) => {
      if (!this.noticeHandlers.has(type)) {
        this.noticeHandlers.set(type, []);
      }
      this.noticeHandlers.get(type).push(handler);
    });
  }

  handleNotice(type: string, data: postData, apiClient: APIClient) {
    if (this.noticeHandlers.has(type)) {
      this.noticeHandlers
        .get(type)
        .map(handler => handler(data, apiClient))
        .forEach((result) => {
          if (result instanceof Promise) {
            result.catch(e => logger.error(e));
          }
        });
    }
  }

  request(type: string | string[], handler: handlerCallback) {
    let types: string[];
    if (typeof type === 'string') {
      types = [type];
    } else {
      types = type;
    }
    types.forEach((type) => {
      if (!this.requestHandlers.has(type)) {
        this.requestHandlers.set(type, []);
      }
      this.requestHandlers.get(type).push(handler);
    });
  }

  handleRequest(type: string, data: postData, apiClient: APIClient) {
    if (this.requestHandlers.has(type)) {
      this.requestHandlers
        .get(type)
        .map(handler => handler(data, apiClient))
        .forEach((result) => {
          if (result instanceof Promise) {
            result.catch(e => logger.error(e));
          }
        });
    }
  }

  handle(data: postData, apiClient: APIClient) {
    switch (data.post_type) {
      case 'message':
        this.handleMessage(data.message_type, data, apiClient);
        break;
      case 'notice':
        this.handleNotice(data.notice_type, data, apiClient);
        break;
      case 'request':
        this.handleRequest(data.request_type, data, apiClient);
        break;
      case 'meta_event':
        break;
      default:
        logger.error(`Unknown post_type: ${data.post_type}`);
    }
  }

  init(handler: () => any) {
    this.initHandlers.push(handler);
  }

  handleInit(cb?: () => any) {
    this.initHandlers.forEach(async (handler) => {
      const result: any = handler();
      if (result instanceof Promise) {
        await result;
      }
    });
    if (cb) cb();
  }
}
