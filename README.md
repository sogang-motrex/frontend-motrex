# frontend-motrex

AI 기반 특허 검색 및 기술 검토 지원 시스템의 **프론트엔드(웹 화면)** 저장소입니다.
기술 설명을 입력하면 관련 특허를 찾고, 근거가 달린 요약과 비교 검토 보고서 초안을 보여줍니다.

- 산학프로젝트 · 모트렉스 연계 과제
- 기술 스택: Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · TanStack Query

---

## 1. 준비물

아래 프로그램이 설치되어 있어야 합니다.

| 프로그램 | 확인 명령어 | 설치 |
|---|---|---|
| Git | `git --version` | https://git-scm.com |
| Node.js | `node -v` | https://nodejs.org (LTS 버전) |

> Node.js 버전은 프로젝트 최상위의 `.node-version` 파일에 적혀 있습니다.
> 버전 관리 도구 `fnm`이나 `nvm`을 쓰면 같은 버전으로 쉽게 맞출 수 있습니다.

---

## 2. 실행 방법

터미널에서 아래 명령어를 **순서대로** 입력하세요.

### ① 저장소 받기

```bash
git clone https://github.com/sogang-motrex/frontend-motrex.git
cd frontend-motrex
```

### ② 라이브러리 설치

```bash
npm install
```

처음 한 번만 하면 됩니다. 1~2분 정도 걸립니다.

### ③ 환경 변수 파일 만들기

```bash
cp .env.example .env.local
```

`.env.local`에는 백엔드(Spring Boot) 서버 주소가 들어갑니다. 기본값은 `http://localhost:8080`이며, 백엔드 주소가 다르면 이 파일의 `BACKEND_URL` 값을 바꾸세요.

> `.env.local`은 각자 컴퓨터용 설정이라 GitHub에 올라가지 않습니다.

### ④ 개발 서버 실행

```bash
npm run dev
```

터미널에 `Ready`가 뜨면 브라우저에서 아래 주소로 접속합니다.

👉 **http://localhost:3000**

서버를 끌 때는 터미널에서 `Ctrl + C`를 누릅니다.

---

## 3. 화면 둘러보기

현재는 백엔드 연결 전이라 **가짜 데이터**로 화면이 표시됩니다. 버튼을 누르면 실제 사용 흐름대로 다음 화면으로 이동합니다.

| 주소 | 화면 |
|---|---|
| `/search` | SCR-01 검색 입력 |
| `/searches/demo` | SCR-02 검색 결과 |
| `/patents/KR10-0000000` | SCR-03 특허 상세 |
| `/reviews/demo` | SCR-04 비교 검토 |
| `/reviews/demo/report` | SCR-05 보고서 |
| `/history` | 검토 이력 |
| `/health` | 백엔드 연결 확인 (개발용) |

추천 흐름: **특허 검색 → 결과 제목 클릭 → 비교에 추가 → 보고서 생성**

### 백엔드와 함께 실행하기

1. 백엔드(Spring Boot) 서버를 먼저 실행합니다.
2. `.env.local`의 `BACKEND_URL`이 백엔드 주소와 같은지 확인합니다.
3. `npm run dev`로 프론트엔드를 실행합니다.
4. http://localhost:3000/health 에서 **"연결됨"**이 나오면 정상입니다.

프론트엔드의 `/api/...` 요청은 Next.js가 백엔드로 대신 전달합니다(`next.config.ts`). 그래서 별도의 CORS 설정 없이 동작합니다.

---

## 4. 자주 쓰는 명령어

| 명령어 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 실행 (코드를 고치면 바로 반영) |
| `npm run build` | 배포용 빌드 (오류가 없는지 확인할 때도 사용) |
| `npm run start` | 빌드한 결과 실행 (`build` 후에 사용) |
| `npm run lint` | 코드 규칙 검사 |

---

## 5. 문제가 생겼을 때

**`Module not found: Can't resolve '...'`**
라이브러리가 설치되지 않은 상태입니다.

```bash
npm install
```

**고쳤는데도 예전 에러 화면이 계속 나올 때**
개발 서버의 캐시를 지우고 다시 실행합니다.

```bash
rm -rf .next
npm run dev
```

**`Port 3000 is in use`**
이미 다른 개발 서버가 켜져 있습니다. 켜져 있는 서버를 끄거나 아래 명령어로 정리합니다.

```bash
lsof -ti :3000 | xargs kill -9
```

**`/health`에서 "연결 실패"가 나올 때**
백엔드 서버가 꺼져 있거나 `.env.local`의 `BACKEND_URL`이 잘못된 경우입니다. 백엔드 없이 화면만 볼 때는 정상입니다.

---

## 6. 폴더 구조

```
frontend-motrex
├── app/
│   ├── (app)/            # 서비스 화면 (상단 메뉴가 붙는 페이지)
│   │   ├── search/       # SCR-01 검색 입력
│   │   ├── searches/     # SCR-02 검색 결과
│   │   ├── patents/      # SCR-03 특허 상세
│   │   ├── reviews/      # SCR-04 비교 검토, SCR-05 보고서
│   │   └── history/      # 검토 이력
│   ├── health/           # 백엔드 연결 확인 (개발용)
│   ├── layout.tsx        # 최상위 레이아웃
│   └── providers.tsx     # TanStack Query 설정
├── components/           # 공통 화면 부품
├── hooks/                # 공통 훅 (비동기 작업 상태 확인 등)
├── lib/
│   ├── api/              # 백엔드 API 요청 함수, 경로, 타입
│   └── mock/             # 화면 개발용 가짜 데이터
├── .env.example          # 환경 변수 예시
└── next.config.ts        # 백엔드 프록시 설정
```

---

## 7. 협업 규칙

- `main` 브랜치에 직접 올리지 않고, 기능마다 브랜치를 만들어 PR로 합칩니다.

```bash
git checkout main
git pull
git checkout -b feat/기능-이름
```

- 커밋 메시지는 `종류(범위): 설명` 형식을 따릅니다.
  - `feat`: 새 기능 · `fix`: 버그 수정 · `docs`: 문서 · `refactor`: 구조 개선 · `chore`: 설정
  - 예) `feat(search): add search result page`
