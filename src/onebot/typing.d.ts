export interface Message {
  type: string;
  data: {[key: string]: any}
}

export interface postData {
  time: number;
  self_id: number;
  post_type: 'message' | 'notice' | 'request' | 'meta_event';

  [k: string]: any
}
