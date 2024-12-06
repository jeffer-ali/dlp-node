const tencentcloud: any = require("tencentcloud-sdk-nodejs-asr");
import fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

//腾讯sdk
const AsrClient = tencentcloud.asr.v20190614.Client;
const clientConfig = {
  credential: {
    secretId: process.env.ASR_SECRETID,
    secretKey: process.env.ASR_SECRETKEY
  },
  region: "",
  profile: {
    httpProfile: {
      endpoint: "asr.tencentcloudapi.com",
    },
  },
};

const client = new AsrClient(clientConfig);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 转换毫秒为时间格式的函数
const formatTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
};

//轮询查询语音识别任务
const pullRecTask = async (TaskId: any) => {
  const params = { TaskId };

  try {
    const data = await client.DescribeTaskStatus(params);
    const {
      Data: { Status, Result, ResultDetail },
    } = data;

    if (Status === 2) {
      console.log('ASR轮询任务完成', Result);
      // console.log("\n------------------------\n");
      // console.log(ResultDetail);
      const extractedDetails = ResultDetail.map((item: any) => ({
        text: item.FinalSentence,
        startMs: item.StartMs,
        endMs: item.EndMs,
        // startTime: formatTime(item.StartMs),
        // endTime: formatTime(item.EndMs),
      }));

      const mergedData = extractedDetails.reduce((acc: any, current: any) => {
        if (acc.length === 0) {
          acc.push({ ...current });
        } else {
          let lastChar = acc[acc.length-1].text.slice(-1);
          if(lastChar === '、') {           
            acc[acc.length-1].text += current.text; // 组合句子
            acc[acc.length-1].endMs = current.endMs
            acc[acc.length-1].endTime = current.endTime
          } else {
            acc.push({ ...current });
          }
        }
      
        return acc;
      }, []);

      return {
        result: Result,
        resultDetail: mergedData
      }
    } else if (Status === 3) {
      console.log("提取失败");
      return "";
    } else {
      await sleep(3000); // 等待 3 秒
      return await pullRecTask(TaskId); // 递归调用
    }
  } catch (err) {
    console.error("error", err);
    return "";
  }
};

async function fileToBase64(filePath: string): Promise<string> {
  try {
    const data = await fs.promises.readFile(filePath);
    return data.toString('base64');
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
}

// 腾讯语音识别
export const useTecentAsr = async (filePath: string) => {
  const base64Audio = await fileToBase64(filePath);
  const params = {
    EngineModelType: "16k_zh_large",
    // SourceType: 0,
    // Url: filePath,
    SourceType: 1,
    Data: base64Audio,
    ChannelNum: 1,
    ResTextFormat: 3,
  };

  try {
    const data = await client.CreateRecTask(params);
    const {
      Data: { TaskId },
    } = data;
    console.log('ASR轮询任务开始', TaskId);

    const result = await pullRecTask(TaskId);
    return result;
  } catch (err) {
    console.error("error", err);
    return "";
  }
};
