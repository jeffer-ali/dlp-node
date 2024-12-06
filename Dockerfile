FROM node:slim

# 安装必要的依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 \
    python3-pip \
    ffmpeg \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install -U yt-dlp
# 检查安装版本
RUN yt-dlp --version

WORKDIR /app

COPY src /app/src
COPY types /app/types
COPY tsconfig.json /app/
COPY package.json /app/
COPY yarn.lock /app/
RUN mkdir -p /app/public/downloads

RUN yarn install 
RUN yarn build

CMD ["yarn", "start"]
