import fs from 'fs';
import { pipeline, Readable } from 'stream';
import { promisify } from 'util';
import { exec } from 'child_process';

const streamPipeline = promisify(pipeline);
const execPromise = promisify(exec);

// 将ReadableStream转换为Node.js Readable流的辅助函数
function readableStreamFromWeb(readableStream: ReadableStream<Uint8Array>) {
  const reader = readableStream.getReader();
  return new Readable({
    async read() {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          this.push(null);
          break;
        }
        this.push(Buffer.from(value));
      }
    }
  });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');
  const filename = formData.get('filename');
  const contentType = formData.get('contentType');

  // 检查file是否是一个Blob类型
  if (file instanceof Blob && typeof filename === 'string') {
    const filePath = `/app/audio_files/${filename}`;
    const audioFilePath = `/app/audio_files/${filename.replace('.mp4', '.wav')}`;

    // 创建一个可写流
    const writableStream = fs.createWriteStream(filePath);

    // 使用pipeline安全地将读取流导入写入流
    try {
      console.log('Uploading file...');
      const readableNodeStream = readableStreamFromWeb(file.stream());
      await streamPipeline(readableNodeStream, writableStream);

      console.log('Extracting audio...');

      // 使用ffmpeg提取音频
      const { stdout, stderr } = await execPromise(`ffmpeg -n -i ${filePath} -vn -acodec pcm_s16le -ar 44100 -ac 2 ${audioFilePath}`);
      console.log('ffmpeg stdout:', stdout);
      console.log('ffmpeg stderr:', stderr);

      console.log('Audio extracted successfully!');
      // 删除原始视频文件
      fs.unlinkSync(filePath);

      // post请求audio_backend:5000/hello, 传入audioFilePath, 接受返回的data
      console.log('Sending POST request to audio_backend...');
      const response = await fetch('http://audio_backend:5000/hello', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audioFilePath }),
      });
      const data = await response.json();
      console.log('Received response:', data.stamp);
      const stamp = data.stamp;

      return new Response(JSON.stringify({ timeStamp: stamp }), { status: 200 });
    } catch (error) {
      console.error('Failed to upload file:', error);
      return new Response("Failed to upload file", { status: 500 });
    }
  } else {
    // 如果传入的不是文件类型或filename为空，返回错误响应
    console.error('Failed to upload file:');
    return new Response("No file uploaded or filename is missing", { status: 400 });
  }
}
