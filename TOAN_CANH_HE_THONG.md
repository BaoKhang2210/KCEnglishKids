# 🌟 TOÀN CẢNH HỆ THỐNG KCEnglishKids (SYSTEM OVERVIEW & DEVELOPER GUIDE)

> **Mục đích tài liệu:** Đây là tài liệu duy nhất cung cấp bức tranh toàn cảnh về kiến trúc, chức năng, phân quyền, tài khoản thử nghiệm, quy trình khởi chạy và chuẩn lập trình của dự án **KCEnglishKids**. 
> Bất kỳ lập trình viên hoặc phiên làm việc AI mới nào chỉ cần đọc file này là có thể nắm bắt 100% ngữ cảnh của hệ thống để tiếp tục phát triển mà không bị gián đoạn.

---

## 📌 1. THÔNG TIN CHUNG VỀ DỰ ÁN

- **Tên dự án:** KCEnglishKids — Nền tảng học tiếng Anh tương tác dành cho trẻ mầm non.
- **Tính chất:** Đề tài Khóa luận tốt nghiệp (KLTN) Đại học.
- **Đối tượng người dùng mục tiêu:**
  1. **Trẻ mầm non 3 – 6 tuổi:** Trực tiếp học từ vựng, mẫu câu, phát âm thông qua game tương tác đa giác quan và sự hướng dẫn của linh vật chú khỉ **Koko**.
  2. **Giáo viên mầm non (Teacher):** Dạy học tương tác trực tiếp trên lớp (Classroom Live Session), dạy mẫu câu phản xạ (TPR), quản lý kết quả học tập và gửi nhận xét tuần cho phụ huynh.
  3. **Quản trị viên nhà trường (Admin):** Quản lý tài khoản (Users), quản lý chương trình học (Curriculum: Topics, Lessons, Vocabularies), cấu hình danh mục trò chơi (Games Catalog), theo dõi báo cáo phân tích sư phạm (Analytics & Logs).
  4. **Phụ huynh (Parent):** Theo dõi tiến độ học tập, nhận thông báo nhận xét của cô giáo qua Sổ tay học tập tại nhà.
- **Triết lý sư phạm:**
  - **TPR (Total Physical Response):** Phản xạ toàn thân qua hành động, nghe - hiểu - thực hiện.
  - **Audio-Visual-Interactive:** Ưu tiên âm thanh chuẩn bản xứ, hình ảnh minh họa vector sắc nét (SVG), tương tác kéo thả / chạm chạm thân thiện với lứa tuổi chưa biết chữ.
  - **Gamification:** Hệ thống khen thưởng bằng Ngôi sao, Huy hiệu danh dự (Badges), Chuỗi ngày học liên tục (Daily Streak) và phản hồi tích cực từ mascot Koko.

---

## 🏗️ 2. KIẾN TRÚC MONOREPO & CẤU TRÚC THƯ MỤC

Dự án được cấu trúc theo mô hình **Monorepo** tinh gọn gồm 2 ứng dụng độc lập nhưng liên kết chặt chẽ:

```
KCEnglishKids/
├── client/                     # [FRONTEND] React 19 + TypeScript + Vite + Tailwind CSS v4 + PWA
│   ├── public/                 # Tài nguyên tĩnh: SVG assets, âm thanh (SFX, animal audio), SW
│   │   ├── audio/              # File âm thanh động vật, hiệu ứng game (pop, correct, cheer...)
│   │   ├── images/             # Minh họa từ vựng (vocabulary), animation nhân vật, storybook
│   │   └── pwa-icons/          # Icon ứng dụng PWA cài đặt trên di động
│   ├── src/
│   │   ├── components/         # Component dùng chung (StoryScene, KokoMascot, Shell...)
│   │   │   ├── child/          # Header trẻ em, Roadmap, Mini-game engines, Modals
│   │   │   ├── teacher/        # Component nghiệp vụ giáo viên (Closure, Guide, Observation)
│   │   │   └── layout/         # Shell bọc màn hình responsive
│   │   ├── context/            # Quản lý State toàn cục (AuthContext, RewardContext)
│   │   ├── dashboards/         # Màn hình làm việc theo phân quyền
│   │   │   ├── admin/          # Admin Dashboard, Users, Curriculum, Games, Schedule, Logs
│   │   │   └── teacher/        # Teacher Home, Classroom Session Setup, Live Session, Studio
│   │   ├── pages/child/        # Giao diện học sinh (ChildHomePage, Login, Recovery...)
│   │   ├── services/           # Lớp kết nối API backend (api.ts, mastery, outbox, stats...)
│   │   ├── styles/             # CSS mở rộng (admin.css, teacher.css, storybook.css)
│   │   └── utils/              # Tiện ích âm thanh, thời gian VN, lưu trữ trình duyệt
│   ├── package.json            # Scripts: dev (5173), build, test (Vitest)
│   └── vite.config.ts          # Cấu hình Vite, Tailwind v4, VitePWA & Proxy /api -> port 5000
│
├── KCEnglishKids_BE/           # [BACKEND] Node.js + Express 5 + MongoDB (Mongoose) + JWT
│   ├── src/
│   │   ├── config/             # Cấu hình DB (db.js) và JWT Secret (auth.js)
│   │   ├── controllers/        # Bộ điều khiển API (auth, lesson, learning, teacher, admin, ai...)
│   │   ├── middlewares/        # Xác thực JWT (protect), Rate limit, Xử lý lỗi (errorHandler)
│   │   ├── models/             # Schema Mongoose (User, Topic, Lesson, Vocabulary, Progress...)
│   │   ├── routes/             # Định tuyến REST API (/api/auth, /api/lessons, /api/ai...)
│   │   ├── seeds/              # Dữ liệu mẫu khởi tạo chuẩn (index.js, lessonData.js...)
│   │   ├── services/           # Nghiệp vụ backend (AI service, quy tắc ghi nhận, bảo mật)
│   │   └── server.js           # Điểm khởi chạy Express server (Port 5000)
│   ├── scripts/                # Scripts bảo trì DB, di chuyển dữ liệu, xuất backup
│   ├── tests/                  # Bộ kiểm thử backend tự động (node:test)
│   └── package.json            # Scripts: dev (nodemon), start, test, seed
│
├── shared/                     # Dữ liệu JSON chia sẻ chung giữa FE & BE
│   ├── earlyLearning.json      # Danh mục mục tiêu sư phạm theo lứa tuổi
│   ├── learningGames.json      # Đặc tả quy tắc và danh sách trò chơi
│   └── vocabularyAliases.json  # Từ điển đồng nghĩa và chuẩn hóa nhãn từ vựng
│
├── docs/                       # Tài liệu nghiên cứu, biên bản kiểm thử, tài liệu KLTN
│   ├── tong-quan-chuc-nang-va-cong-nghe.md  # Tài liệu chi tiết KLTN
│   └── ...                     # Các biên bản audit và báo cáo kỹ thuật
│
├── start-all.bat               # File script 1-click khởi chạy toàn bộ hệ thống trên Windows
├── stop-all.bat                # File script tắt toàn bộ tiến trình hệ thống
└── TOAN_CANH_HE_THONG.md       # [FILE NÀY] Bản đồ toàn cảnh hệ thống
```

---

## ⚡ 3. CỔNG MẠNG & HƯỚNG DẪN KHỞI CHẠY DỰ ÁN

### 3.1. Các dịch vụ & Cổng mạng (Ports)
| Dịch vụ | Địa chỉ / Cổng | Ghi chú |
| :--- | :--- | :--- |
| **MongoDB Local** | `mongodb://localhost:27017/kcenglishkids` | Windows Service `MongoDB` (luôn chạy nền) |
| **Backend API** | `http://localhost:5000` | Node.js Express 5 |
| **Frontend Web / PWA** | `http://localhost:5173` | Vite Dev Server (Proxy `/api` -> `5000`) |

### 3.2. Cách khởi chạy nhanh (Khuyên dùng)
- **Cách 1 (Một cú nhấp chuột):** Bấm đúp chuột vào file `start-all.bat` ở thư mục gốc. Script sẽ tự động bật cửa sổ chạy Backend (port 5000) và Frontend (port 5173). Khi không dùng nữa, chạy `stop-all.bat`.
- **Cách 2 (Khởi chạy thủ công bằng 2 terminal):**
  - **Terminal 1 (Backend):**
    ```powershell
    cd KCEnglishKids_BE
    npm run dev
    # Kết quả thành công: "KCEnglishKids API ready."
    ```
  - **Terminal 2 (Frontend):**
    ```powershell
    cd client
    npm run dev
    # Kết quả thành công: Local: http://localhost:5173/
    ```

---

## 🔑 4. DANH SÁCH TÀI KHOẢN ĐĂNG NHẬP (RBAC DEMO)

Hệ thống đã nạp sẵn dữ liệu chuẩn (seed data) với các tài khoản thử nghiệm đầy đủ quyền hạn:

### 4.1. Tài khoản Trẻ em / Học sinh (`role: 'CHILD'`)
- **Trang đăng nhập:** `http://localhost:5173/login`
- **Hình thức đăng nhập:** Nhập Gmail / Số điện thoại + Mật khẩu (hoặc Đăng nhập nhanh tại lớp bằng Avatar + PIN 4 số).
- **Tài khoản tiêu biểu:**
  - **Bé Leo (Nhóm 3–4 tuổi - Lớp Mầm):**
    - Email: `leo@kcenglishkids.com` (hoặc SĐT: `0901234567`)
    - Mật khẩu: **`1232`** *(Mã bảo mật chống đoán dễ)*
    - Avatar: `lion` (Sư tử)
  - **Bé Mia (Nhóm 4–5 tuổi - Lớp Chồi):**
    - Email: `mia@kcenglishkids.com` (hoặc SĐT: `0902345678`)
    - Mật khẩu: **`1232`**
  - **Bé Toby (Nhóm 5–6 tuổi - Lớp Lá):**
    - Email: `toby@kcenglishkids.com` (hoặc SĐT: `0903456789`)
    - Mật khẩu: **`1232`**

### 4.2. Tài khoản Giáo viên (`role: 'TEACHER'`)
- **Trang đăng nhập:** `http://localhost:5173/teacher/login`
- **Email:** `teacher@kcenglishkids.com`
- **Mật khẩu:** **`Teacher@123`**
- **Quyền hạn:** Quản lý học sinh trong lớp được phân công, thiết lập buổi học trực tiếp, dạy mẫu câu, gửi nhận xét phụ huynh, theo dõi hồ sơ năng lực học sinh.

### 4.3. Tài khoản Quản trị viên (`role: 'ADMIN'`)
- **Trang đăng nhập:** `http://localhost:5173/admin/login`
- **Email:** `admin@kcenglishkids.com`
- **Mật khẩu:** **`Admin@123`**
- **Quyền hạn:** Toàn quyền hệ thống, quản lý người dùng, chỉnh sửa toàn bộ bài học / từ vựng, cấu hình mini-games, xem biểu đồ phân tích và log toàn vẹn dữ liệu.

---

## 🧩 5. BẢN ĐỒ CHỨC NĂNG CHI TIẾT THEO PHÂN HỆ

```
                                  KCEnglishKids System
                                           │
         ┌─────────────────────────────────┼────────────────────────────────┐
         │                                 │                                │
 👶 PHÂN HỆ TRẺ EM                 👩‍🏫 PHÂN HỆ GIÁO VIÊN            👑 PHÂN HỆ ADMIN
 (3–6 tuổi & Phụ huynh)           (Giảng dạy & Sư phạm)            (Quản trị hệ thống)
   ├── Bản đồ đảo học tập           ├── Bàn làm việc tổng quan       ├── Bảng phân tích Analytics
   ├── Lộ trình 3 nhóm tuổi         ├── Bật buổi học trực tiếp       ├── Quản lý Người dùng (Users)
   ├── 11 Mini-Games tương tác      ├── Dạy Mẫu câu phản xạ TPR      ├── Quản lý Chương trình học
   ├── Koko Mascot biểu cảm         ├── Hộp thư nhận xét Phụ huynh   ├── Cấu hình Game Catalog
   ├── Hệ thống thưởng Gamification ├── Hồ sơ quan sát năng lực      ├── Quản lý Lịch dạy & Lớp học
   └── Tự khôi phục mã PIN bí mật   └── Xem báo cáo tiến độ tuần     └── Nhật ký Audit & Bảo trì DB
```

### 5.1. Phân hệ Trẻ em (Child Workspace)
1. **Trang chủ Đảo phiêu lưu (`ChildHomePage.tsx`):**
   - Bản đồ đảo kỳ thú hiển thị trực quan các trạm bài học theo tiến trình.
   - Hiệu ứng đường đi phát sáng dẫn lối đến bài học tiếp theo, ngăn chặn nhấp nháy.
   - Thanh điều hướng trên cùng (Headbar) tông màu pastel dịu mắt, chống mỏi mắt cho trẻ.
2. **Lộ trình phân hóa theo 3 nhóm tuổi:**
   - **3–4 tuổi (Lớp Mầm - Book 1):** Học từ đơn qua hình ảnh lớn, tối đa 2-3 lựa chọn, ưu tiên âm thanh, không áp lực thời gian.
   - **4–5 tuổi (Lớp Chồi - Book 2):** Mở rộng trường từ vựng (gia đình, đồ chơi, đồ ăn), câu mệnh lệnh ngắn, mini-game tư duy tương phản.
   - **5–6 tuổi (Lớp Lá - Book 3):** Mẫu câu ghép nối (Subject + Verb + Object), phản xạ tình huống, game logic tìm bóng và ghi nhớ.
3. **Kho 11 Mini-Games tương tác phong phú:**
   - `Listen & Choose`: Nghe phát âm và chọn tranh đúng.
   - `Animal Sound`: Lắng nghe tiếng kêu động vật tự nhiên và chọn bạn thú cưng.
   - `Line Match`: Nối từ vựng với hình ảnh tương ứng.
   - `Picture Builder`: Ghép các mảnh ghép để tạo thành bức tranh hoàn chỉnh.
   - `Memory Match`: Lật thẻ bài tìm cặp hình giống nhau.
   - `Koko Says (TPR)`: Lắng nghe khẩu lệnh và làm theo hành động của Koko.
   - `Star Catcher`: Bắt các ngôi sao mang từ vựng mục tiêu.
   - `Balloon Float`: Làm nổ bong bóng từ vựng đúng.
   - `Shadow Puzzle`: Kéo thả hình ảnh vào bóng đen tương ứng.
   - `Feed the Monsters`: Cho quái vật dễ thương ăn đúng món từ vựng yêu cầu.
   - `Bubble Pop`: Chạm nhanh vào các bọt nước phát âm đúng.
4. **Gamification & Linh vật Koko (`KokoMascot.tsx`):**
   - Bạn khỉ Koko đồng hành tương tác: biểu cảm vui mừng, vỗ tay, nhún nhảy, nói khích lệ bé.
   - Huy hiệu (Badges), số sao tích lũy, chuỗi ngày học liên tục (Streak).
5. **Cơ chế tự lấy lại PIN bằng "Bạn bí mật" (`RecoverAccountPage.tsx`):**
   - Bé tự chọn 2 hình con vật bí mật lúc cài PIN. Khi quên, bé chỉ cần chọn lại đúng 2 bạn thú là đổi được PIN mới ngay, không cần SMS/Email OTP phức tạp.

### 5.2. Phân hệ Giáo viên (Teacher Workspace)
1. **Bàn làm việc giảng dạy (`TeacherHome.tsx`):** Thống kê nhanh sĩ số, bài học đang dạy, danh sách việc cần làm (Teacher Tasks).
2. **Thiết lập buổi học trên lớp (`ClassroomSessionSetup.tsx` & `LiveSessionPage.tsx`):**
   - Kết nối máy chiếu hoặc màn hình cảm ứng tương tác trong lớp học.
   - Tổ chức cho cả lớp tham gia trò chơi, chấm sao thưởng trực tiếp cho học sinh tại chỗ.
3. **Dạy mẫu câu phản xạ TPR (`SentenceTeachingPage.tsx`):** Trình diễn các mẫu câu tiếng Anh bằng tranh động và hành động tương tác.
4. **Sổ nhật ký sư phạm (`ObservationPortfolio.tsx`):** Đánh giá mức độ tự tin, phát âm to rõ, và khả năng hợp tác của từng bé theo tiêu chuẩn giáo dục mầm non.
5. **Hộp thư gửi nhận xét cho gia đình (`TeacherInbox.tsx`):** Soạn thảo nhận xét tuần, đánh giá điểm mạnh để gửi vào sổ liên lạc điện tử của phụ huynh.

### 5.3. Phân hệ Quản trị viên (Admin Workspace)
1. **Phân tích điều hành (`AdminDashboardPage.tsx`, `AdminAnalyticsPage.tsx`):** Biểu đồ thời gian thực về phân bổ học sinh theo độ tuổi, số lượt làm bài, tỷ lệ nắm vững từ vựng (Mastery Rate).
2. **Quản lý tài khoản (`AdminUsersPage.tsx`):** Thêm mới, chỉnh sửa, khóa/mở tài khoản, cấp phát danh sách học sinh theo lớp học.
3. **Quản lý chương trình học (`AdminCurriculumPage.tsx`):** Cây phân cấp Chủ đề (Topics) -> Bài học (Lessons) -> Từ vựng (Vocabulary).
4. **Cấu hình danh mục trò chơi (`AdminGamesPage.tsx`):** Bật/tắt trò chơi, điều chỉnh số câu hỏi và thời lượng cho từng lứa tuổi.
5. **Nhật ký & Toàn vẹn hệ thống (`AdminLogsPage.tsx`, `AdminSettingsPage.tsx`):** Theo dõi lịch sử hoạt động, kiểm tra tính toàn vẹn của cơ sở dữ liệu.

---

## 🛡️ 6. NGUYÊN TẮC LẬP TRÌNH & KINH NGHIỆM XỬ LÝ LỖI (DEVELOPER RULES)

Các quy tắc sau đây là **bắt buộc** để duy trì tính ổn định của hệ thống:

### 6.1. Nguyên tắc gọi API an toàn (`client/src/services/api.ts`)
- **Tuyệt đối không gọi `await res.json()` trực tiếp:** 
  Khi server backend bị tắt hoặc proxy Vite trả về trang HTML 502/504, việc gọi `res.json()` sẽ làm văng lỗi cú pháp thô thiển: `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`.
- **Luôn dùng `handleResponse(res)`:**
  Hàm này đã được xây dựng sẵn trong `api.ts`. Nó kiểm tra `Content-Type`, bọc `try-catch`, và trả về thông báo lỗi thân thiện bằng tiếng Việt nếu server mất kết nối.

### 6.2. Quy tắc giao diện tràn màn hình (Full-Width Responsive)
- Giao diện của cả 3 phân hệ (Trẻ em, Giáo viên, Admin) được thiết kế theo hướng **tràn đều toàn bộ màn hình** (`width: 100%`).
- **Không đặt `max-w-5xl mx-auto`** hoặc `max-width: 1600px; margin: auto;` làm khung bao bọc ngoài cùng vì sẽ làm giao diện bị co thành một dải hẹp ở giữa màn hình lớn.
- Dùng padding linh hoạt: `w-full px-4 sm:px-8 lg:px-12`.

### 6.3. Khung hình StoryScene
- Các hình nền bối cảnh (StoryScene: classroom, adventure, studio, celebration...) có tỷ lệ chuẩn **3:2 (1536×1024)**.
- Hiển thị thông qua component `<StoryBackdrop>` hoặc `<StoryBanner>` với hiệu ứng viền phản quang ambient glow mờ ảo phía sau, **không chèn lớp phủ màu xanh đậm (`rgba(7,36,30,0.94)`)** làm che mất chi tiết tác phẩm.

### 6.4. Chạy lệnh môi trường Windows PowerShell
- Luôn sử dụng lệnh **`npm.cmd`** thay vì `npm` trần để tránh lỗi phân quyền `ExecutionPolicy` của PowerShell:
  - Frontend: `npm.cmd test --prefix client -- --run`
  - Build: `npm.cmd run build --prefix client`
- Khi nối chuỗi lệnh trong PowerShell, dùng dấu chấm phẩy `;` thay vì `&&`.

---

## 🤖 7. KẾ HOẠCH BƯỚC TIẾP THEO: TRIỂN KHAI HỆ THỐNG AI

Dự án đã chuẩn bị sẵn cấu trúc Endpoint và Service tại backend (`KCEnglishKids_BE/src/services/aiService.js` và `aiController.js`). Bước quan trọng cuối cùng trước khi bảo vệ khóa luận là tích hợp AI tạo sinh (Google Gemini API):

1. **Koko AI Speaking Coach (`/api/ai/evaluate-pronunciation`):**
   - Đánh giá âm thanh giọng nói của trẻ khi phát âm các từ vựng tiếng Anh.
   - Đưa ra điểm số trực quan (1-3 sao) và lời nhận xét khích lệ ấm áp từ linh vật Koko bằng tiếng Việt/tiếng Anh.
2. **AI Lesson Plan Copilot (`/api/ai/generate-lesson-plan`):**
   - Giáo viên nhập yêu cầu bằng ngôn ngữ tự nhiên (Ví dụ: *"Soạn giáo án 20 phút dạy từ vựng hoa quả cho lớp Mầm 3-4 tuổi"*).
   - Gemini sinh tự động cấu trúc bài giảng chuẩn TPR: Khởi động (Warm-up) -> Khám phá từ vựng -> Hoạt động tương tác -> Tổng kết (Cool-down).
3. **AI Parent Note Generator (`/api/ai/generate-parent-note`):**
   - Phân tích điểm số, số từ đã thuộc và các mini-game bé đã chơi trong tuần.
   - Tự động soạn sẵn đoạn tin nhắn nhận xét ấm áp, tinh tế để cô giáo duyệt và gửi tới phụ huynh chỉ bằng 1 nút bấm.

---

> **Lưu ý cho phiên làm việc mới:** Mỗi khi bắt đầu một phiên làm việc mới, hãy đọc file này trước tiên để có bức tranh tổng thể và nắm vững các quy chuẩn vận hành của dự án!
