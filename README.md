# 플래너 — 할일 + 계획 관리 앱

할일(칸반) → 주간 계획 → 1년 목표를 하나로 연결해 관리하는 앱입니다.
요구사항은 [docs/PRD.md](docs/PRD.md), 설계는 [docs/PLAN.md](docs/PLAN.md) 를 참고하세요.

Next.js 14 (App Router) · TypeScript · MongoDB(Mongoose) · Tailwind CSS · Zustand · dnd-kit

## 실행

```bash
npm install
cp .env.example .env   # MONGODB_URI 설정
npm run db             # (선택) MongoDB 가 없을 때: 개발용 로컬 DB 를 27017 포트에 띄움
npm run dev            # http://localhost:3000
```

`npm run db` 는 mongodb-memory-server 로 실제 mongod 를 실행하며 데이터는 `.data/db` 에 보존됩니다.
이미 MongoDB 가 있다면 `.env` 의 `MONGODB_URI` 만 맞추면 됩니다.

## GitHub 로그인 설정

모든 화면과 API 는 로그인해야 쓸 수 있고, 각 사용자는 자기 할일·주간 계획·목표만 봅니다.

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**
2. 다음과 같이 입력합니다.
   | 항목 | 값 (로컬 개발 예시) |
   |------|------|
   | Homepage URL | `http://localhost:3000` |
   | Authorization callback URL | `http://localhost:3000/auth/github/callback` |
3. 생성된 **Client ID** 와 **Generate a new client secret** 으로 만든 시크릿을 `.env` 에 넣습니다.
   ```bash
   GITHUB_CLIENT_ID=...
   GITHUB_CLIENT_SECRET=...
   APP_URL=http://localhost:3000   # 콜백 URL 의 앞부분과 같아야 함
   ```
   시크릿은 환경 변수로만 읽으며 코드에 넣지 않습니다. 배포 환경에서는 그 주소로 OAuth App 을 하나 더 만들거나
   콜백 URL 을 바꾸고 `APP_URL` 도 맞춥니다.

| 경로 | 설명 |
|------|------|
| `GET /auth/github` | GitHub 인증 화면으로 이동 (CSRF 방지용 `state` 쿠키 설정) |
| `GET /auth/github/callback` | `state` 확인 → 토큰 교환 → GitHub `login`, `avatar_url` 을 users 에 저장 → 세션 시작 |
| `POST /auth/logout` | DB 의 세션 문서 삭제 + 세션 쿠키 만료 |
| `GET /api/me` | 로그인한 사용자의 username, avatarUrl |

세션은 30일 유효한 httpOnly 쿠키이며 DB(`sessions`)에는 토큰의 SHA-256 해시만 저장합니다.
GitHub access token 은 프로필 조회에만 쓰고 저장하지 않습니다.

### 로그인 도입 전 데이터 마이그레이션

할일·주간 계획·목표에 `userId` 필드가 추가되었습니다. 그 전에 만든 데이터는 `userId` 가 없어 **아무에게도 보이지 않으므로**,
한 번 로그인한 뒤 원래 주인에게 할당합니다.

```bash
npm run migrate:user-id -- <GitHub username>
```

- `userId` 가 없는 문서만 그 사용자에게 할당하므로 여러 번 실행해도 안전합니다.
- 예전의 `weekStart` 단일 unique 인덱스를 `{ userId, weekStart }` unique 로 바꿉니다.
  이 단계 전에는 다른 사용자가 기존 데이터와 같은 주의 주간 계획을 만들 수 없습니다(409).

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` / `npm start` | 프로덕션 빌드 / 실행 |
| `npm run lint` | ESLint |
| `npm test` | 단위 + API 통합 테스트 (인메모리 MongoDB 사용, 첫 실행 시 바이너리 다운로드) |
| `npm run db` | 개발용 로컬 MongoDB |
| `npm run migrate:user-id -- <username>` | 로그인 도입 전 데이터를 GitHub 사용자에게 할당 |

## 화면

- `/` 대시보드 — 이번 주 목표 체크, 상태별 할일 수, 주간 진행률, 1년 목표별 진행률
- `/todos` 칸반 보드 — 드래그앤드랍으로 상태/순서 변경, 카드를 눌러 수정
- `/weekly`, `/weekly/[id]` 주간 계획 — 주간 목표(최대 5개), 요일별 할일 배치, 메모, 회고
- `/goals` 1년 목표 — 목표별 진행률

## 동작 규칙

- **순서**: 카드의 `order` 는 fractional index 문자열입니다. 카드를 옮기면 그 카드 1건만 `PATCH` 합니다.
  키가 32자를 넘으면 서버가 해당 컬럼을 재정규화합니다.
- **High 우선순위**는 컬럼 상단에 고정됩니다. 드래그해도 High 그룹과 일반 그룹의 경계는 넘지 않습니다.
- **목표 연결**: 할일에 목표를 직접 지정하지 않으면 소속 주간 계획의 목표를 따릅니다.
  목표 진행률은 이렇게 연결된 할일의 완료율입니다.
- **주간 진행률**은 두 가지를 함께 보여 줍니다: 주간 목표 달성률(`goals[].done`)과 그 주에 속한 할일의 완료율.
- **주의 시작**은 월요일입니다. 주간 계획은 사용자마다 주당 하나만 만들 수 있습니다(중복 시 409).
- **다른 사용자의 데이터**는 목록에 나오지 않고, id 로 접근해도 존재를 드러내지 않도록 404 입니다.
  다른 사용자의 목표/주간 계획에 할일을 연결하려 하면 400 입니다.
