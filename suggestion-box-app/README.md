# 익명 건의함 (Vercel 배포용)

Claude 로그인 없이 누구나 접속해 익명으로 건의를 남길 수 있는 Next.js 앱입니다.
`/` 는 누구나 열 수 있는 제출 페이지, `/admin` 은 암호로 보호된 확인 페이지입니다.

## 배포 방법 (Vercel)

1. 이 저장소를 GitHub에 두고, [vercel.com](https://vercel.com)에서 **Add New → Project**로
   이 저장소를 가져옵니다. Root Directory를 `suggestion-box-app`으로 지정하세요.
2. 프로젝트의 **Storage** 탭(또는 Vercel Marketplace)에서 **Upstash for Redis**를 추가합니다.
   연결하면 `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` 환경 변수가 자동으로 채워집니다.
3. **Settings → Environment Variables**에서 `ADMIN_PASSWORD`를 원하는 값으로 추가합니다.
   (이 값이 `/admin` 페이지 로그인 암호가 됩니다.)
4. Deploy를 누르면 끝입니다. 배포된 주소를 직원들에게 공유하면
   Claude 계정 없이도 누구나 제출할 수 있습니다.

## 로컬에서 실행하기

```bash
npm install
cp .env.example .env.local   # ADMIN_PASSWORD, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN 채우기
npm run dev
```

## 구조

- `app/page.js` — 공개 제출 페이지 (제출 폼)
- `app/admin/page.js` — 암호 로그인 후 접수 목록을 보는 페이지
- `app/api/suggestions/route.js` — 제출(POST, 공개) / 목록 조회(GET, 관리자 전용)
- `app/api/admin-login/route.js` — 관리자 로그인/로그아웃 (httpOnly 쿠키 발급)

관리자 인증은 서버에서만 비교하는 httpOnly 쿠키 기반이라, 브라우저 개발자 도구로
소스를 봐도 암호가 노출되지 않습니다.
