i# KCEnglishKids — Interactive English Learning Platform (Ages 3–6)

**KCEnglishKids** là nền tảng học tiếng Anh tương tác dành cho trẻ từ 3–6 tuổi, kết nối chặt chẽ giữa **Khung chương trình chuẩn (Curriculum Foundation)** và **Trải nghiệm học tập tương tác (Application Learning Experience)**.

---

## 🌟 Kiến Trúc Hai Lớp (Two-Layer Architecture)

```
A. Tầng Chương Trình (Curriculum Foundation)
   Curriculum → Book (1, 2, 3) → Age Group (3-4, 4-5, 5-6) → 27 Units → Vocabulary / Patterns / Objectives

B. Tầng Trải Nghiệm Ứng Dụng (Application Learning Experience)
   Age Group → App Topic → Lesson → Content → Activity → Learning Session → Activity Result → Progress → Stars
```

- **3 Sách chuẩn**:
  - Book 1: Độ tuổi 3–4 (9 Units)
  - Book 2: Độ tuổi 4–5 (9 Units)
  - Book 3: Độ tuổi 5–6 (9 Units)
  - **Tổng cộng**: 27 Units chính thức (được phân loại `OFFICIAL_CURRICULUM`).
- **Vertical Slice Hiện Tại**:
  - Book 1 → Age 3–4 → Unit 5 (*"What is a pet?"*)
  - Topic: **Animals (Động vật)** → Lesson: **Pet Animals (Thú cưng quanh em)**
  - Từ vựng: `dog`, `cat`, `rabbit`, `fish`, `bird`, `turtle`, `hamster`, `lizard`
  - Hoạt động tương tác: **Listen & Choose** (Phát âm chuẩn + 3 lựa chọn hình ảnh trực quan)
  - Kết quả & Tiến độ: Tích luỹ điểm, 3 sao, vinh danh và lưu dữ liệu thực tế vào MongoDB.

---

## 🚀 Công Nghệ Sử Dụng

- **Frontend**:
  - React 19 + TypeScript + Vite 8
  - Tailwind CSS v4 (Thiết kế bo tròn, màu sắc sinh động, tối ưu tương tác chạm cho trẻ)
  - React Router DOM v7
  - Howler.js + Web Audio API Synthesis (Âm thanh phát âm + hiệu ứng tiếng chuông, tiếng kèn vinh danh khi hoàn thành)
  - Canvas Confetti (Hiệu ứng pháo hoa khi đạt sao)
  - Lucide Icons
- **Backend**:
  - Node.js + Express.js REST API
  - Mongoose 9 + MongoDB
  - JSON Web Tokens (JWT) + Bcryptjs
- **3 Tác Nhân (Actors)**:
  - **CHILD**: Đăng nhập bằng cách chọn Avatar + Mã PIN 4 số (không dùng form chữ phức tạp).
  - **ADMIN**: Quản lý chương trình 27 Units, chủ đề, bài học, xem thống kê KPI.
  - **TEACHER**: Quản lý lớp học, danh sách học sinh và tiến độ học tập.

---

## 📦 Cài Đặt & Chạy Ứng Dụng

### 1. Yêu Cầu Môi Trường
- Node.js 18+ (Đã kiểm thử trên Node v24.15.0)
- MongoDB Server đang chạy tại `mongodb://localhost:27017/kcenglishkids`

### 2. Cài Đặt & Chạy Backend
```bash
cd KCEnglishKids_BE
npm install
# Tạo file .env từ .env.example nếu cần tùy chỉnh
npm run seed      # Nạp dữ liệu 27 Units, 12 Topics, Từ vựng Pet Animals, Tài khoản mẫu
npm start         # Chạy Backend tại http://localhost:5000
npm run test:api  # Chạy bộ test tích hợp 13 API endpoints
```

### 3. Cài Đặt & Chạy Client (Học sinh & Giáo viên)
```bash
cd client
npm install
npm run dev       # Chạy Frontend tại http://localhost:5173
```

### 4. Cài Đặt & Chạy Admin Portal
```bash
cd admin
npm install
npm run dev       # Chạy Admin tại http://localhost:5174
```

---

## 🔑 Tài Khoản Demo

| Vai trò | Tên / Email | Avatar / Mật khẩu / PIN | Ghi chú |
| :--- | :--- | :--- | :--- |
| **CHILD** | `leo@kcenglishkids.com` | 🦁 Mật khẩu học tại nhà: `123456` / PIN: `1234` | Lớp Mầm (3–4 tuổi) |
| **CHILD** | `mia@kcenglishkids.com` | 🐼 Mật khẩu học tại nhà: `123456` / PIN: `5678` | Lớp Mầm (3–4 tuổi) |
| **CHILD** | `toby@kcenglishkids.com` | 🐰 Mật khẩu học tại nhà: `123456` / PIN: `1111` | Lớp Chồi (4–5 tuổi) |
| **ADMIN** | `admin@kcenglishkids.com` | Mật khẩu: `Admin@123` | Cổng Quản Trị `/admin/login` |
| **TEACHER** | `teacher@kcenglishkids.com`| Mật khẩu: `Teacher@123` | Cổng Giáo Viên `/teacher/login` |

---

## 📂 Cấu Trúc Thư Mục

```
KCEnglishKids/
├── KCEnglishKids_BE/     # Backend REST API (Express, Mongoose, MongoDB)
│   ├── src/
│   │   ├── config/       # Kết nối MongoDB
│   │   ├── models/       # 14 Mongoose Models (Curriculum, Topic, Lesson, Activity, User, Progress...)
│   │   ├── controllers/  # Logic điều hướng API
│   │   ├── services/     # Logic chấm điểm, sao, cập nhật tiến độ học tập
│   │   ├── routes/       # Express REST endpoints
│   │   ├── middlewares/  # JWT protect & role authorization, centralized error handler
│   │   ├── seeds/        # Script seed dữ liệu chuẩn 27 Units, Topics, Media, Users
│   │   ├── app.js        # Khởi tạo Express app
│   │   └── server.js     # Server entry point
│   ├── test-api.js       # Kiểm thử tự động toàn bộ 13 endpoints
│   ├── package.json
│   └── .env.example
│
├── client/               # Frontend Client (Học sinh & Giáo viên)
│   ├── src/
│   │   ├── components/
│   │   │   ├── child/    # ChildHeader, PinPad, VocabularyCard, AudioButton, ResultModal...
│   │   │   ├── admin/
│   │   │   └── teacher/
│   │   ├── pages/
│   │   │   ├── child/    # AvatarLoginPage, ChildHomePage, TopicDetailPage, LessonDetailPage, ActivityPlayPage
│   │   │   ├── admin/    # AdminLoginPage, AdminDashboardPage
│   │   │   └── teacher/  # TeacherLoginPage, TeacherDashboardPage
│   │   ├── context/      # AuthContext
│   │   ├── services/     # api.ts (REST client)
│   │   ├── utils/        # audio.ts (Howler + Web Audio API synthesis engine)
│   │   ├── types/        # TypeScript domain models
│   │   ├── App.tsx       # React Router setup
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
└── docs/
    ├── architecture.md
    ├── database.md
    └── api.md
```
