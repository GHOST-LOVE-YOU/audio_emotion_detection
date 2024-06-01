# Use BuildKit for building
# Run with DOCKER_BUILDKIT=1 docker build -t ghcr.io/ghost-love-you/audio_backend .

FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt requirements.txt

# Add pip config with a different mirror and increased timeout
RUN mkdir -p /root/.pip && \
    echo "[global]\n\
timeout = 100\n\
index-url = https://pypi.tuna.tsinghua.edu.cn/simple\n\
trusted-host = pypi.tuna.tsinghua.edu.cn\n" > /root/.pip/pip.conf

# Update pip and install requirements with retry mechanism
RUN pip install -r requirements.txt
    
COPY . .

CMD ["python", "app.py"]
