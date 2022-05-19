import { Message } from './typing';
import { APIClient } from './api';

export class incomingMessage {
  time: number;
  self_id: number;
  message_type: 'private' | 'group';
  sub_type: 'friend' | 'group' | 'group_self' | 'other';

  message_id: number;
  user_id: number;

  message: Message[];
  raw_message: string;

  font: number;
  sender: {
    user_id: number;
    nickname: string;
    sex: 'male' | 'female' | 'unknown';
    age: number;
    card?: string;
    area?: string;
    level?: string;
    role?: 'owner' | 'admin' | 'member';
    title?: string;
  };

  temp_source?: number;
  group_id?: number;

  apiClient: APIClient

  constructor(rawMessage: {[key: string]: any}, apiClient: APIClient) {
    this.time = rawMessage.time;
    this.self_id = rawMessage.self_id;
    this.message_type = rawMessage.message_type;
    this.sub_type = rawMessage.sub_type;

    this.message_id = rawMessage.message_id;
    this.user_id = rawMessage.user_id;

    this.message = rawMessage.message;
    this.raw_message = rawMessage.raw_message;

    this.font = rawMessage.font;

    this.sender = rawMessage.sender;

    this.temp_source = rawMessage.temp_source;
    this.group_id = rawMessage.group_id;
    

    this.apiClient = apiClient;
  }

  async reply(message: Message[]) {
    if (this.message_type === 'private') {
      return await this.apiClient.call('send_private_msg', {
        user_id: this.user_id,
        message: [
          {type: 'reply', data: {id: this.message_id}},
          ...message
        ]
      });
    } else if (this.message_type === 'group') {
      return await this.apiClient.call('send_group_msg', {
        group_id: this.group_id,
        message: [
          {type: 'reply', data: {id: this.message_id}},
          ...message
        ]
      });
    }
  }

  async replyText(text: string) {
    return await this.reply([{type: 'text', data: { text }}]);
  }
}