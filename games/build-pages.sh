#!/usr/bin/env bash
# GitHub Pages용 index.html을 만들어요.
# 게임 파일은 Claude 아티팩트 형식(문서 머리 없이 내용만)이라, 여기서 HTML 문서 틀을 씌워요.
set -euo pipefail
cd "$(dirname "$0")/.."
out="${1:-_site}"
mkdir -p "$out"
{
  cat <<'HEAD'
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="떨어지는 쓰레기를 알맞은 수거함에 넣는 분리수거 게임. 헷갈리는 쓰레기 버리는 법도 알려줘요.">
<meta property="og:type" content="website">
<meta property="og:title" content="분리수거 대작전">
<meta property="og:description" content="치킨 뼈는 음식물일까 일반쓰레기일까? 헷갈리는 분리수거, 게임으로 알아봐요.">
</head>
<body>
HEAD
  cat "games/분리수거_대작전.html"
  printf '\n</body>\n</html>\n'
} > "$out/index.html"
echo "built $out/index.html"
