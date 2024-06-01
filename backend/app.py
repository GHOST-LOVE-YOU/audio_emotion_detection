#|export
import os
from fastai.vision.all import *
import numpy as np
import pandas as pd
import librosa

#|export
def _resnet_stem(*sizes):
    return [
        nn.Conv1d(sizes[i], sizes[i+1], kernel_size=3, stride = 2 if i==0 else 1)
            for i in range(len(sizes)-1)
    ] + [nn.MaxPool1d(kernel_size=3, stride=2, padding=1)]


def _conv_block(ni, nf, stride):
    return nn.Sequential(
        nn.Conv1d(ni, nf, kernel_size=3, stride=stride, padding=1),
        nn.BatchNorm1d(nf),
        nn.ReLU(),
        nn.Conv1d(nf, nf, kernel_size=3, stride=1, padding=1),
        nn.BatchNorm1d(nf)  # 注意此处没有ReLU
    )

class ResBlock(Module):
    def __init__(self, ni, nf, stride=1):
        self.convs = _conv_block(ni, nf, stride)
        # 如果输入和输出通道数不同或应用了stride，调整身份连接
        if ni != nf or stride != 1:
            self.idconv = nn.Sequential(
                nn.Conv1d(ni, nf, kernel_size=1, stride=stride),
                nn.BatchNorm1d(nf)  # 添加批量归一化
            )
        else:
            self.idconv = nn.Identity()

    def forward(self, x):
        identity = self.idconv(x)
        out = self.convs(x)
        return F.relu(out + identity)



class ResNet(nn.Sequential):
    def __init__(self, n_out, layers, expansion=1):
        stem = _resnet_stem(1,512, 256, 128, 64) # 我不希望一次增加太多参数, 原:1-->512
#         stem = _resnet_stem(1, 32, 64, 64, 128, 256)
        self.block_szs = [64, 64, 128, 256, 512]
        blocks = [self._make_layer(*o) for o in enumerate(layers)]
        super().__init__(*stem, *blocks,
                         nn.AdaptiveAvgPool1d(1), Flatten(),
                         nn.Linear(self.block_szs[-1], n_out))

    def _make_layer(self, idx, n_layers):
        stride = 1 if idx==0 else 2
        ch_in,ch_out = self.block_szs[idx:idx+2]
        return nn.Sequential(*[
            ResBlock(ch_in if i==0 else ch_out, ch_out, stride if i==0 else 1)
            for i in range(n_layers)
        ])
    
#|export
def get_x(r): return X[r]
def get_y(r): return y_cat[r]
learn_inf = load_learner('RES_896171.pkl')

#|export
def extract_features(data, sr=22050, frame_length=2048, hop_length=512):
    # 提取零交叉率（ZCR）特征
    zcr = librosa.feature.zero_crossing_rate(y=data, frame_length=frame_length, hop_length=hop_length)
    zcr = np.squeeze(zcr)

    # 提取均方根能量（RMSE）特征
    rmse = librosa.feature.rms(y=data, frame_length=frame_length, hop_length=hop_length)
    rmse = np.squeeze(rmse)

    # 提取增强的 MFCC 特征
    mfcc = librosa.feature.mfcc(y=data, sr=sr)
    mfcc = np.ravel(mfcc.T)

    features = np.hstack([zcr, rmse, mfcc])

    return features

#|export
def add_noise(data, noise_factor=0.005):
    noise = np.random.randn(len(data))
    augmented_data = data + noise_factor * noise
    return augmented_data

def shift(data, sr, shift_max, shift_direction='both'):
    shift = np.random.randint(sr * shift_max)
    if shift_direction == 'right':
        shift = -shift
    elif shift_direction == 'both':
        direction = np.random.choice(['left', 'right'])
        if direction == 'right':
            shift = -shift
    augmented_data = np.roll(data, shift)
    return augmented_data

def pitch_shift(data, sr, n_steps):
    return librosa.effects.pitch_shift(data, sr=sr, n_steps=n_steps)

# 处理单个文件, 这里不再传入文件了, 传入data可以只读一次, 加速计算
def process_file(data, target_duration=2.0, sr=22050):
    # data, sr = librosa.load(file_path, sr=target_sr, offset=offset)

    # 如果音频长度不足 target_duration 秒，则进行填充
    if len(data) < target_duration * sr:
        padding = target_duration * sr - len(data)
        data = np.pad(data, (0, int(padding)), 'constant')
    else:
        data = data[:int(target_duration * sr)]

    # 原始特征
    features = extract_features(data, sr)

    # 数据增强和特征提取
    augmented_features = []
    augmented_features.append(features)

    # 添加噪声
    noisy_data = add_noise(data)
    noisy_features = extract_features(noisy_data, sr)
    augmented_features.append(noisy_features)

    # 时间偏移
    shifted_data = shift(data, sr, shift_max=2)
    shifted_features = extract_features(shifted_data, sr)
    augmented_features.append(shifted_features)

    # 音高变化
    pitched_data = pitch_shift(data, sr, n_steps=2)
    pitched_features = extract_features(pitched_data, sr)
    augmented_features.append(pitched_features)

    return augmented_features

# 预测函数
def predict_emotion(data, sr=22050):
    augmented_features = process_file(data)

    # 准备所有增强特征，增加必要的维度并堆叠成一个批次
    all_features = np.array([features.astype(np.float32).reshape(1, -1) for features in augmented_features])
    all_features = np.stack(all_features).reshape(len(augmented_features), 1, -1)

    # 将特征转换为Tensor格式
    X_tensor = torch.tensor(all_features)

    learn_inf.model.eval()
    with torch.no_grad():
        output = learn_inf.model(X_tensor)
        probs = torch.nn.functional.softmax(output, dim=1)
        avg_probs = probs.mean(axis=0)
    return list(map(float, avg_probs.squeeze()))

# 主处理函数
def process_and_classify_audio(file_path, step=0.1, target_duration=2.0, target_sr=22050):
    data, sr = librosa.load(file_path, sr=target_sr)
    total_duration = len(data) / sr
    results = []

    current_offset = 0
    while current_offset + target_duration <= total_duration:
        end_sample = int((current_offset + target_duration) * sr)
        sample_data = data[int(current_offset * sr):end_sample]
        probs = predict_emotion(sample_data, sr)
        results.append(probs)
        current_offset += step

    # 处理最后两秒数据
    while current_offset <= total_duration:
        last_data = data[-int(target_duration * sr):]
        probs = predict_emotion(last_data, sr)
        results.append(probs)
        current_offset += step

    return results



from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/hello', methods=['POST'])
def hello():
    data = request.get_json()
    audioFilePath = data.get('audioFilePath')
    filename = audioFilePath.split('/')[-1]
    npmName = filename.split('.')[0]
    if os.path.exists(f'./stamp/{npmName}.npy'):
        stamp = np.load(f'./stamp/{npmName}.npy')
        return jsonify({stamp})
    else:
        stamp = process_and_classify_audio(audioFilePath)
        # 将stamp保存, 方便下次快速读取
        stamp = np.array(stamp)
        np.save(f'./stamp/{npmName}.npy', stamp)
        return jsonify({stamp})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
