## 数据集
kaggle开源数据集: [audio-emotions](https://www.kaggle.com/datasets/uldisvalainis/audio-emotions/data)
| 情绪 | 样本数 | 占比 |
| ------------- | ------------ | :-------------: |
| Angry | 2167 | 16.7% |
| Happy | 2167 | 16.46% |
| Sad | 2167 | 16.35% |
| Neutral | 1795 | 14.26% |
| Fearful | 2047 | 16.46% |
| Disgusted | 1863 | 15.03% |
| Surprised | 592 | 4.74% |

| 数据集 | 样本数 | 占比 |
| ---- | ---- | :----: |
| CREMA-D | 7,442 | 58.15% |
| TESS | 2,800 | 21.88% |
| RAVDESS | 2,076 | 16.22% |
| SAVEE | 480 | 3.75% |

## Docker部署界面
(仅测试了firefox, 其他浏览器可能会出现微小的排版问题)
![1717312315188.png](https://lsky.nezuko.me/i/2024/06/02/665c1b409f5a3.png)
![1717312352111.png](https://lsky.nezuko.me/i/2024/06/02/665c1b63676a8.png)
![1717312385423.png](https://lsky.nezuko.me/i/2024/06/02/665c1b85bb13f.png)

## Docker一键部署界面
**important!!! 该项目为课程作业, 原作者不会更新和维护, 由于对优化docker大小不太熟悉, 把整个fastai包全部打包,总大小有10.2G, model也过拟合的厉害, 只是针对"特定场景"具有很好的效果, 实际应用价值并不大**</br>
docker和docker-compose的安装参考[官网](https://docs.docker.com/get-docker/)
docker-compose.yml文件已在文件夹中
```
version: '3.8'

services:
  audio_frontend:
    image: ghcr.io/ghost-love-you/audio_frontend:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    volumes:
      - audio-files:/app/audio_files
    restart: always

  audio_backend:
    image: ghcr.io/ghost-love-you/audio_backend:latest
    ports:
      - "5000:5000"
    environment:
      - FLASK_ENV=production
    volumes:
      - audio-files:/app/audio_files
    restart: always

volumes:
  audio-files:
```

```
mkdir audio_emotion_detection
cd audio_emotion_detection
vim docker-compose.yml
docker-compose up -d
```

启用https推荐使用[nginx proxy manager](https://nezuko.me/wei-vpsshe-zhi-fan-xiang-dai-li/)