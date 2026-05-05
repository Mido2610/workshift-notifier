# Workshift Notifier

Hệ thống tự động gửi tin nhắn báo lịch trực ca, tích hợp với [engineer-management](https://github.com/mmenuio/mmenu-mono-repo) và Google Calendar.

## Tính năng

- **Tự động đọc lịch** từ Google Calendar (Mmenu Product Calendar)
- **Gửi tin nhắn** qua Telegram + Slack (reuse API của engineer-management)
- **Scheduler** chạy mỗi phút, hỗ trợ:
  - Gửi đầu ngày (configurable time, default 07:30)
  - Nhắc trước ca X phút (default 30 phút)
- **Idempotent**: chạy lại không gửi trùng
- **Web UI** hiện đại: Dashboard, Config, Logs
- **Multi-user**: đăng nhập GitHub OAuth

## Kiến trúc

```
┌─────────────────┐     JWT      ┌──────────────────┐
│  React Frontend │ ──────────── │  NestJS Backend  │
│  (Vite + TW)    │              │  :4000           │
└─────────────────┘              └─────┬────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                   │
              ┌─────▼──────┐  ┌───────▼──────┐  ┌────────▼───────┐
              │  MongoDB   │  │Google Calendar│  │ engineer-mgmt  │
              │            │  │    API        │  │ /submit-message│
              └────────────┘  └──────────────┘  └────────────────┘
```

## Cài đặt

### Yêu cầu
- Node.js 20+
- MongoDB (local hoặc Atlas)
- Google Calendar API key hoặc Service Account
- GitHub OAuth App
- engineer-management backend đang chạy

### 1. Clone và cài packages

```bash
git clone https://github.com/Mido2610/workshift-notifier.git
cd workshift-notifier

cd backend && npm install
cd ../frontend && npm install
```

### 2. Cấu hình backend

```bash
cd backend
cp .env.example .env
```

Điền các giá trị trong `.env`:

| Biến | Mô tả |
|------|-------|
| `MONGODB_URI` | MongoDB connection string |
| `GITHUB_CLIENT_ID` | GitHub OAuth App Client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Client Secret |
| `GITHUB_REDIRECT_URI` | `http://localhost:4000/api/auth/github/callback` |
| `JWT_SECRET` | Secret key JWT (generate: `openssl rand -hex 32`) |
| `FRONTEND_URL` | `http://localhost:5174` |
| `EM_API_URL` | URL backend engineer-management đang chạy |
| `GOOGLE_API_KEY` | **Cách 1**: Google API Key (nếu calendar public) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | **Cách 2**: Service Account JSON (1 dòng) |
| `GOOGLE_CALENDAR_ID` | Calendar ID (đã có default sẵn) |

### 3. Cấu hình frontend

```bash
cd frontend
cp .env.example .env
# Sửa VITE_API_URL nếu cần
```

### 4. Tạo GitHub OAuth App

1. Vào [github.com/settings/developers](https://github.com/settings/developers)
2. **New OAuth App**
3. Authorization callback URL: `http://localhost:4000/api/auth/github/callback`
4. Copy Client ID + Client Secret → điền vào `.env`

### 5. Lấy Google Calendar credentials

**Cách A — API Key (đơn giản, cho calendar public):**
1. Vào [console.cloud.google.com](https://console.cloud.google.com)
2. APIs & Services → Credentials → Create API Key
3. Enable Google Calendar API
4. Paste vào `GOOGLE_API_KEY`

**Cách B — Service Account (cho calendar private):**
1. Vào GCP Console → IAM → Service Accounts → Create
2. Tạo key JSON → download
3. Share calendar với email của service account
4. Minify JSON thành 1 dòng: `jq -c . service-account.json`
5. Paste vào `GOOGLE_SERVICE_ACCOUNT_JSON`

### 6. Chạy local

```bash
# Terminal 1 — Backend
cd backend && npm run start:dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Mở: http://localhost:5174

## API Endpoints

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| `GET` | `/api/auth/github` | No | Redirect GitHub OAuth |
| `GET` | `/api/auth/me` | JWT | Lấy thông tin user |
| `GET` | `/api/calendar/month?year=&month=` | JWT | Lịch theo tháng |
| `GET` | `/api/calendar/events?date=` | JWT | Sự kiện theo ngày |
| `POST` | `/api/notification/send-now` | JWT | Gửi ngay thủ công |
| `GET` | `/api/notification/logs` | JWT | Lịch sử gửi |
| `GET` | `/api/notification/stats` | JWT | Thống kê |
| `GET` | `/api/config` | JWT | Lấy cấu hình |
| `POST` | `/api/config` | JWT | Cập nhật cấu hình |

## Deploy (Docker)

```bash
# Build + run tất cả services
docker-compose up -d

# Chỉ build lại backend
docker-compose up -d --build backend
```

## Cron hoạt động như thế nào

Scheduler chạy mỗi phút (`* * * * *`) và kiểm tra:

1. **Gửi đầu ngày**: Nếu giờ hiện tại khớp `dayStartTime` (±1 phút) → gửi tất cả ca trong ngày
2. **Nhắc trước ca**: Nếu có ca nào bắt đầu sau `sendBeforeMinutes` phút nữa → gửi nhắc

Mỗi thông báo được lưu vào MongoDB với `(date, calendarEventId, triggerType)` làm unique key → **không gửi trùng**.

## Bảo mật

- Không commit `.env` (đã có trong `.gitignore`)
- JWT token hết hạn sau 7 ngày
- Mọi API (trừ auth) đều require Bearer JWT
- Không hard-code bất kỳ token/credential nào trong code

## Liên quan

- engineer-management: `/Users/kietnguyen/mmenu-mono-repo/engineer-management`
- Google Calendar: [Mmenu Product Calendar](https://calendar.google.com/calendar/u/0/embed?src=c_93cae9ea9243fc7eb329137b547c18329f7de8069d5064dace1aaeb66df6eab6@group.calendar.google.com)
