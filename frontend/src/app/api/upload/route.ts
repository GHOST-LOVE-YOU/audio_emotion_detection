import fs from 'fs';
import { pipeline, Readable } from 'stream';
import { promisify } from 'util';
import { exec } from 'child_process';

const streamPipeline = promisify(pipeline);
const execPromise = promisify(exec);

// Helper function to convert ReadableStream to Node.js Readable stream
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
  const contentType = formData.get('content-type');

  // 检查file是否是一个文件类型
  if (file instanceof File && typeof filename === 'string') {
    const filePath = `public/uploads/${filename}`;
    const audioFilePath = `/app/audio_files/${filename.replace('.mp4', '.wav')}`;

    // 创建一个可写流
    const writableStream = fs.createWriteStream(filePath);

    // 使用pipeline安全地将读取流导入写入流
    try {
      const readableNodeStream = readableStreamFromWeb(file.stream());
      await streamPipeline(readableNodeStream, writableStream);

      // 使用ffmpeg提取音频
      await execPromise(`ffmpeg -i ${filePath} -vn -acodec pcm_s16le -ar 44100 -ac 2 ${audioFilePath}`);

      // 删除原始视频文件
      fs.unlinkSync(filePath);

      // post请求172.17.0.1:5000/hello, 传入audioFilePath, 接受返回的data
      const response = await fetch('http://172.17.0.1:5000/hello', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audioFilePath }),
      });
      const data = await response.json();
      const stamp = data.get('timeStamp')

      return new Response(JSON.stringify(stamp), { status: 200 });
    } catch (error) {
      console.error('Failed to upload file:', error);
      return new Response("Failed to upload file", { status: 500 });
    }
  } else {
    // 如果传入的不是文件类型或filename为空，返回错误响应
    return new Response("No file uploaded or filename is missing", { status: 400 });
  }
}
