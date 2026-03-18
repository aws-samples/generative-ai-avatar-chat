#!/bin/bash
# CDK_DOCKER wrapper: x86_64 環境では docker buildx build --load に変換
case "$1" in
  build)
    if [ "$(uname -m)" = "x86_64" ]; then
      shift
      exec docker buildx build --builder arm-builder --load "$@"
    fi
    ;;
esac
exec docker "$@"
