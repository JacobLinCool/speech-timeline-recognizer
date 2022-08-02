# speech-timeline-recognizer

## How to Setup

1. Install PNPM: <https://pnpm.io/installation>
2. Install Node.js 18: `pnpm env use -g 18`
3. Run `pnpm i` to install all dependencies. It will take a while since it downloads a big model (1~2 GB)

[The model (vosk-model-cn-0.22)](https://alphacephei.com/vosk/models) is released under the [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) license.

## How to Use

1. Build it: `pnpm build`
2. Run it: `pnpm start --help`

```sh
pnpm start --expect "The expected result" "The path to the wav file"
```

```sh
pnpm start -o results.json -e "我的濾水器有點問題水位指示過高而且一直漏水能請你禮拜二上午派工程師來看看嗎這個禮拜我只有那天有空請記得跟我確認時間非常感謝" data/sub-*/*_text-01.wav
```

## Docker

If you have Docker installed, you can use it to run the app. The model has been included in the Docker image.

```sh
docker run --rm jacoblincool/str --help
```

> I have already built the image for `x64` and `arm64` architectures. For other architectures, you can build it yourself with `pnpm docker` command.

You may want to bind volume to the container.

```sh
docker run --rm -v "$(pwd)/data:/data" jacoblincool/str -o data/results.json -e "我的濾水器有點問題水位指示過高而且一直漏水能請你禮拜二上午派工程師來看看嗎這個禮拜我只有那天有空請記得跟我確認時間非常感謝" data/sub-*/*_text-01.wav
```
