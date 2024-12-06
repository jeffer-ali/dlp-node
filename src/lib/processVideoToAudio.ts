const ffmpeg:any = require('fluent-ffmpeg');
import logger from '../utils/logger';

const processVideoToAudio = async ({ 
  filePath,
  fileName
}: { 
  filePath: string
  fileName: string
}) => {
  return new Promise((resolve, reject) => {
    ffmpeg(`${filePath}/video.mp4`)
    .inputOptions('-vn')
    .output(`${filePath}/audio.mp3`)
    .on("end", async () => {
      console.log("ffmpeg Processing finished：音频转换完成！");
      const audioLocation = `${filePath}/audio.mp3`;
      resolve({ 
        audioUrl: audioLocation
      });
    })
    .on("error", (err:any) => {
        // console.error("Error:", err);
        reject({ message: '音频处理失败' });
        logger.error(`Error in ffmpeg: ${err}`);
    })
    .run();
  })
}
export default processVideoToAudio