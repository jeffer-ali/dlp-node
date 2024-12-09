import fs from "fs";
import path from "path";
// import parseSRT, { SubtitleItem } from "parse-srt";

export interface SubtitleItem {
  text: string
  start: number
  end: number
}

const toSeconds = (time: string) => {
  const t = time.split(':')

  try {
    let s = t[2].split(',')

    if (s.length === 1) {
      s = t[2].split('.')
    }

    return parseFloat(t[0]) * 3600 + parseFloat(t[1]) * 60 + parseFloat(s[0]) + parseFloat(s[1]) / 1000
  } catch (e) {
    return 0
  }
}

// 读取 .vtt 文件的函数
const readVTTFile = async(filePath: string) => {
  return new Promise((resolve, reject) => {
    fs.readdir(filePath, (err, files) => {
      if (err) {
          // console.error('读取subs文件夹时发生错误:', err);
          return reject(err);
      }
  
      // 过滤出以subtitle开头并以.vtt结尾的文件
      const vttFiles = files.filter(file => file.startsWith('subtitle.'));

      // 只处理第一个找到的.vtt文件
      const subtitleFile = path.join(filePath, vttFiles[0]);

      fs.readFile(subtitleFile, 'utf8', (error, data) => {
        if (error) {
          return reject(error);
        }
        const content = data.replace(/\s*WEBVTT\s*/g, '');
        resolve(content);
      });
    });
  });
};

// 解析 .vtt 文件内容
const parseVTTContent = (content: any) => {
  const lines = content.split(/(?:\r\n|\r|\n)/gm)
  const result = [];
  const subs:SubtitleItem[] = [];
  let sub:any = {};
  let text:string[] = [];

  lines.forEach((line: string) => {
    line = line.trim();
    if (line.startsWith('WEBVTT')) {
      return; // 跳过文件头
    }
    if (!line) {
      // 空行表示一个 sub 的结束
      if (sub.start && sub.end) {
        subs.push(sub);
        sub = {}; // 重置 sub
        text = [];
      }
      return;
    }
    // 解析时间戳
    if (line.includes('-->')) {
      const time = line.split(/[\t ]*-->[\t ]*/);
      sub.start = toSeconds(time[0]);
      sub.end = toSeconds(time[1]);
    }
    // 解析字幕文本
    else {
      text.push(line);

      // Strip out other SSA-style tags
      sub.text = text.join('\\N').replace(/\{(\\[\w]+\(?([\w\d]+,?)+\)?)+\}/gi, '')

      // Escape HTML entities
      sub.text = sub.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')

      // Unescape great than and less than when it makes a valid html tag of a supported style (font, b, u, s, i)
      sub.text = sub.text.replace(/&lt;(\/?(font|b|u|i|s))((\s+(\w|\w[\w\-]*\w)(\s*=\s*(?:".*?"|'.*?'|[^'">\s]+))?)+\s*|\s*)(\/?)&gt;/gi, '<$1$3$7>')
      sub.text = sub.text.replace(/\\N/gi, '<br />')
      result.push(line)
    }
  });

  return {
    result: result.join(' '),
    resultDetail: subs
  }
};

export default async function parseSubtitles(filePath: string) {
  try {
    const content = await readVTTFile(filePath);
    if(content) {
      const parsed = parseVTTContent(content);
      // const parsed = parseSRT(content);
      console.log('字幕文件已解析完成！');
      return parsed;
    }
  } catch (error) {
    console.error('读取subs文件夹时发生错误:', error);
  }
}
