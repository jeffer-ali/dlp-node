import express from 'express';
import fs from "fs";
import path from 'path';
import logger from '../utils/logger';
import crypto from 'crypto';
// import getKeyframes from '../lib/getKeyframes';
import parseSubtitles from '../lib/parseSubtitles';
import processVideoToAudio from '../lib/processVideoToAudio';
import { useTecentAsr } from "../lib/asr";
import YTDlpWrap from '../lib/ytdlp';
const ytDlpWrap = new YTDlpWrap();

const router = express.Router();
const downloadsPath = path.join(__dirname, '../../public/downloads');
router.get('/', async (req, res) => {
  try {
    let { url } = req.query as { url: string };

    if(!url) {
      return res.status(400).json({ message: 'url is required' });
    }

    let infoParams = [
      url,
      '-S',
      'ext',
      // '--proxy=http://127.0.0.1:7890'
    ];
    let params = [
      url,
      '-S',
      'ext',
      '-o',
      `${downloadsPath}/%(id)s/video.%(ext)s`,
      '-o',
      `subtitle:${downloadsPath}/%(id)s/subs/subtitle.%(ext)s`,
      '--write-subs',
      '--sub-langs',
      'all',
      // '--proxy=http://127.0.0.1:7890'
    ];
    if(url.includes('bilibili.com')) {
      params = [
        url,
        '-f',
        'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4] / bv*+ba/b',
        '-o',
        `${downloadsPath}/%(id)s/video.%(ext)s`
      ];
    }

    const metadata = await ytDlpWrap.getVideoInfo(infoParams);
    if(!metadata) {
      return res.status(404).json({ message: '提取不到视频信息' });
    }
    if(metadata.duration > 300) {
      return res.status(400).json({ message: '视频长度不能超过5分钟' });
    }
    console.log('已获取视频信息');
    
    const result = await ytDlpWrap.execPromise(params);
    console.log('视频已下载', result);
    const id = crypto.randomBytes(7).toString('hex');
      

    // const keyframes:any = await getKeyframes({
    //   filePath: `${downloadsPath}/${metadata.id}`,
    //   staticPath: `${req.headers.host}/static/downloads/${metadata.id}/frames`
    // })

    const subsPath = `${downloadsPath}/${metadata.id}/subs`;
    let subtitlesData = null;
    if (fs.existsSync(subsPath)) {
      subtitlesData = await parseSubtitles(subsPath);
    } else {
      const audio:any = await processVideoToAudio({
        filePath: `${downloadsPath}/${metadata.id}`,
        fileName: 'audio'
      });
      console.log('开始音频识别，启动ASR服务');
      if (audio?.audioUrl) {
        const asrData = await useTecentAsr(`${req.headers.host}/static/downloads/${metadata.id}/audio.mp3`);
        subtitlesData = asrData || {};
      }
    }

    fs.rm(`${downloadsPath}/${metadata.id}`, { recursive: true, force: true }, (err) => {
      if (err) {
        console.error('Error removing directory:', err);
      } else {
        console.log('Directory removed successfully!');
      }
    });

    return res.status(200).json({
      data: {
        metadata,
        ...subtitlesData
      }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
    logger.error(`Error in generating summary: ${err.message}`);
  }
});

export default router;
