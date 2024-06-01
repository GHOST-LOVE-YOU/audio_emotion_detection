"use client"
import LineChart from '@/components/lineChart';
import RectangleChart from '@/components/rectangleChart';
import { useState, useRef } from 'react';
import { ChangeEvent } from 'react';

const emotions = ['Angry', 'Disgusted', 'Fearful', 'Happy', 'Neutral', 'Sad', 'Surprised'];
// const timeStamp = [[]]


const VideoUpload = () => {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [timeStamp, setTimeStamp] = useState<number[][]>([[]])

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files ? event.target.files[0] : null;
    if (file) {
      const src = URL.createObjectURL(file);
      setVideoSrc(src);
  
      const formData = new FormData();
      formData.append('file', file);
      formData.append('filename', file.name);
      formData.append('contentType', file.type);
  
      // 发送请求到后端API, 打印返回的信息, 没有返回就一直等待
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      const stamp = data.get('timeStamp')
      setTimeStamp(stamp)
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(parseFloat(videoRef.current.currentTime.toFixed(1)));
    }
  };

  // 如果没有上传视频, 展示一个简单的上传按钮
  if (!videoSrc) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-800">
        <input type="file" accept="video/*" onChange={handleFileChange} className="p-4 border rounded" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-5 gap-4 p-4 bg-gray-800 min-h-screen">
      <div className="col-span-3 p-4 rounded shadow-lg">
        <input type="file" accept="video/*" onChange={handleFileChange} className="mb-4 w-full p-2 border rounded" />
        {videoSrc && (
          <video
            ref={videoRef}
            src={videoSrc}
            controls
            autoPlay
            onTimeUpdate={handleTimeUpdate}
            className="w-full rounded"
          >
            Your browser does not support the video tag.
          </video>
        )}
      </div>
      <div className="col-span-2 flex flex-col space-y-12 py-12">
        {emotions.map((emotion, index) => (
          <div key={emotion} className="flex items-center space-x-2">
            <span className="text-sm w-20">{emotion}:</span>
            <div className="flex items-center space-x-2 w-full">
              <RectangleChart timeStamp={timeStamp} currentTime={currentTime} index={index} />
              <LineChart timeStamp={timeStamp} currentTime={currentTime} index={index} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VideoUpload;
