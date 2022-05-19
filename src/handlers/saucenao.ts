import axios from 'axios';

import { onebot } from '..';
import { Message } from '../onebot/typing';
import { getLogger } from '../logging';


const logger = getLogger('saucenao');

function cfmBuilder(name: string, uin: string) {
  return (content: Message[]) => {
    return {
      type: "node",
      data: {
        name,
        uin,
        content
      }
    } as Message;
  };
}

onebot.message('group', async (inMessage, apiClient) => {
  const messages: Message[] = inMessage.message;

  if (
    messages.length === 1
    && messages[0].type === 'text'
    && (messages[0].data.text as string).trim() === '搜图'
  ) {
    await inMessage.replyText('搜图用法: \n 搜图 <图片>');
    return;
  }

  if (!(
    messages.length === 2
    && messages[0].type === 'text'
    && messages[0].data.text === '搜图'
    && messages[1].type === 'image'
  )) {
    return;
  }

  if (process.env.SAUCENAO_APIKEY === undefined) {
    logger.error('SAUCENAO_APIKEY is not defined');
    await inMessage.replyText('SAUCENAO APIKEY未配置，功能不可用');
    return;
  }

  await inMessage.replyText('搜图中...');

  try {
    const { data: imageData } = await apiClient.call('get_image', { file: messages[1].data.file });

    const { data: userData } = await apiClient.call('get_login_info');
    const user_id = (userData.user_id as number).toString();
    const nickname = userData.nickname as string;
    const cfm = cfmBuilder(nickname, user_id);

    const { data: resultData } = await axios.get('https://saucenao.com/search.php', {
      params: {
        db: process.env.SAUCENAO_DB ?? '999',
        output_type: process.env.SAUCENAO_OUTPUT_TYPE ?? '2',
        api_key: process.env.SAUCENAO_APIKEY,
        numres: process.env.SAUCENAO_NUMRES ?? '4',
        url: imageData.url,
      },
      ...(
        process.env.HTTP_PROXY_HOST && process.env.HTTP_PROXY_PORT
        ? {proxy: { host: process.env.HTTP_PROXY_HOST, port: parseInt(process.env.HTTP_PROXY_PORT) }}
        : {}
      )
    });

    const resultMessage: Message[] = [
      {type: 'text', data: {text: '搜图结果：'}}
    ];

    if (resultData.results.length === 0) {
      resultMessage.push(cfm([{type: 'text', data: {text: '未找到结果'}}]));
    } else {
      resultData.results.forEach((result: any) => {
        resultMessage.push(cfm([
          {
            type: 'image',
            data: {
              file:
                process.env.HOST_URL
                ? `${process.env.HOST_URL}/proxy?url=${encodeURIComponent(result.header.thumbnail)}`
                : result.header.thumbnail,
              type: 'show'
            }
          },
          {
            type: 'text',
            data: {
              text:
                `Similarity: ${result.header.similarity}\n`
                + `Title: ${result.data.title ?? 'undefined'}\n`
                + (result.data.ext_urls ? `URLs:\n` + (result.data.ext_urls as string[]).join('\n') : '')
                + (result.data.eng_name ? `\nEnglish name: ${result.data.eng_name}` : '')
                + (result.data.jp_name ? `\nJapanese name: ${result.data.jp_name}` : '')
            }
          }
        ]));
      });
    }
    await apiClient.call('send_group_forward_msg', {
      group_id: inMessage.group_id,
      messages: resultMessage
    });
  } catch (e) {
    logger.error(e);
    inMessage.replyText('搜图失败');
    return ;
  }
});
