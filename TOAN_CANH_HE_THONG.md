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
   ├── 12 mẫu Mini-Games dùng chung      ├── Dạy Mẫu câu phản xạ TPR      ├── Quản lý Chương trình học
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
3. **Kho 12 mẫu Mini-Games dùng chung phong phú:**
   - Chạm/chọn: Bubble Pop, Balloon Float, Tunnel Runner, Prize Wheel, Koko Says.
   - Tìm/ghép: Memory Match, Shadow Puzzle, Peek-a-Boo, Feed the Monsters, Mystery Boxes.
   - Ghép/xếp: Picture Builder, Koko’s Delivery.
   - Trang bài học và tab Trò chơi đều dùng `GameRunner`; hoạt động theo bài học của cô được quản lý riêng.
   - Đặc tả tại `shared/learningGames.json`; chọn trò tại `shared/gameSelection.cjs`. Admin bật/tắt và ưu tiên, hệ thống xoay vòng các trò phù hợp, mỗi bài tối đa 4 trò, hoàn thành 2 trò khác nhau.
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
1. **Phân tích điều hành & Giám sát giảng dạy hôm nay (`AdminDashboardPage.tsx`, `AdminAnalyticsPage.tsx`):**
   - Thống kê điều hành: phân bổ học sinh theo độ tuổi, số lượt làm bài, tỷ lệ nắm vững từ vựng (Mastery Rate).
   - **Giám sát Giảng dạy Hôm nay:** Tự động đối chiếu Thời khóa biểu trong ngày (giờ Việt Nam UTC+7) với phiên dạy thực tế. Cảnh báo đỏ nổi bật ngay lập tức khi phát hiện lớp có lịch học nhưng quá giờ giáo viên chưa vào lớp giảng dạy (`MISSED`).
2. **Quản lý Lớp học & Theo dõi Tiến độ 3 Tab (`AdminClassroomsPage.tsx`):**
   - Áp dụng nguyên tắc sư phạm nghiêm ngặt 1 Giáo viên - 1 Lớp học phụ trách.
   - Bảng cảnh báo đầu trang liệt kê các lớp bị quá giờ chưa dạy.
   - Mỗi thẻ lớp học hiển thị huy hiệu thời gian thực: *Đã dạy xong, Đang dạy trực tiếp, Quá giờ chưa dạy (cảnh báo nhấp nháy), Sắp tới giờ, Không có lịch*.
   - **Hộp thoại Chi tiết & Tiến độ Lớp học (3 Tab):**
     * **Tab 1 - Tiến độ Giáo trình:** Thanh tiến độ hoàn thành (X/36 bài - Y%), cây 9 Units theo syllabus chuẩn, đánh dấu trạng thái (Bài đang dạy / Đã dạy X buổi / Chưa học) và nút đặt bài hiện tại.
     * **Tab 2 - Giám sát Lịch & Buổi dạy:** Thẻ cảnh báo vắng dạy (kèm SĐT/Email giáo viên), Thời khóa biểu cố định trong tuần, Nhật ký các buổi dạy đã tổ chức với sĩ số và điểm trung bình.
     * **Tab 3 - Danh sách Học sinh:** Bảng danh sách bé thuộc biên chế lớp kèm mã PIN, liên hệ phụ huynh và nút tắt mở quản lý Excel.
3. **Quản lý tài khoản (`AdminUsersPage.tsx`):** Thêm mới, chỉnh sửa, khóa/mở tài khoản, cấp phát danh sách học sinh theo lớp học.
4. **Quản lý chương trình học (`AdminCurriculumPage.tsx`):** Cây phân cấp 3 Bộ sách -> 27 Units -> Bài học (Lessons) -> Từ vựng chuẩn hóa (Vocabulary).
5. **Kho trò chơi - Game Catalog (`AdminGamesPage.tsx`):**
   - Quản lý 12 Mini-games tương tác Giai đoạn 3 (Củng cố kiến thức).
   - Bật/tắt và sắp xếp thứ tự ưu tiên trò chơi.
   - Thuật toán bảo vệ sư phạm `assertLessonCoverage`: Chặn vô hiệu hóa nếu khiến bài học có ít hơn 2 trò chơi phù hợp với tính chất bộ từ vựng.
   - Trải nghiệm và chơi thử trực tiếp trên dữ liệu từ vựng thực của từng bài học ngay tại Admin.
6. **Nhật ký & Toàn vẹn hệ thống (`AdminLogsPage.tsx`, `AdminSettingsPage.tsx`):** Theo dõi lịch sử hoạt động, trích xuất file sao lưu JSON an toàn toàn bộ hệ thống (`/api/admin/system/backup`).

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

## 🤖 7. AI ĐÃ TRIỂN KHAI VÀ CÁCH KÍCH HOẠT (01/11/2026)

Trước đợt sửa này, nhận xét phụ huynh dùng mẫu, giáo án được ghép bằng quy tắc TPR và phần nói chỉ so khớp chữ từ Web Speech API. Chúng chưa gọi AI tạo sinh và chưa đánh giá trực tiếp âm thanh.

Hiện có adapter Gemini tại `KCEnglishKids_BE/src/services/geminiProvider.js`:

| Chức năng | API | Hành vi |
| --- | --- | --- |
| Soạn giáo án | `POST /api/ai/generate-lesson-plan` | Gemini cá nhân hóa hoạt động/khẩu lệnh theo bài và yêu cầu cô nhập. Ứng dụng giữ nguyên nhóm từ, bốn giai đoạn và tổng số phút. Khi AI lỗi/chưa cấu hình, dùng mẫu sư phạm và hiển thị đúng nguồn. |
| Nhận xét gia đình | `POST /api/ai/generate-parent-note` | Ba bản nháp tiếng Việt từ số liệu thật; không gửi tên/ID học sinh tới Gemini. Cô chọn, chỉnh và tự gửi. Không suy diễn độ tự tin/phát âm từ điểm trò chơi. |
| Luyện nói theo từ nhận diện | `POST /api/ai/evaluate-pronunciation` | Web Speech API → chữ → so khớp quy tắc; không gọi đây là chấm âm vị. |
| Koko nghe âm thanh | `POST /api/ai/evaluate-audio` | Người lớn chủ động bật; ghi 6 giây, chuyển WAV mono 16 kHz tại trình duyệt rồi gửi Gemini để phản hồi khích lệ. Không lưu âm thanh/bản chép lời vào DB; điểm chỉ tham khảo. |
| Từ cần ôn của lớp | `GET /api/ai/class-gaps` | Phân tích bằng quy tắc từ số liệu lớp được phân công; không cần LLM. |
| Trạng thái khả dụng | `GET /api/ai/capabilities` | Cho giao diện biết có thể dùng Gemini/âm thanh hay chỉ chế độ cục bộ. Không trả khóa API. |

**Kích hoạt:** xem `KCEnglishKids_BE/.env.example`. Trong `.env` backend, đặt `AI_PROVIDER=gemini`, `GEMINI_API_KEY` và `GEMINI_MODEL` là model khả dụng cho khóa của bạn rồi khởi động lại backend. Không đặt khóa trong frontend/`VITE_*`. Phiên kiểm tra này chưa có khóa Gemini: đã kiểm thử adapter bằng phản hồi giả lập, chưa xác minh cuộc gọi cloud thực tế.

Có giới hạn lượt gọi theo tài khoản, giới hạn dung lượng, timeout 20 giây, kiểm tra cấu trúc đầu ra và fallback. Giáo án thành công được giữ trong bộ nhớ tối đa 10 phút (50 mục) để giảm gọi lặp. Chế độ âm thanh thông báo rõ việc gửi tới Google và cho phép chỉ nghe mẫu.

Tham khảo kỹ thuật chính thức: [Gemini structured output](https://ai.google.dev/gemini-api/docs/generate-content/structured-output), [Gemini audio](https://ai.google.dev/gemini-api/docs/audio).

## 🧭 8. CÁC LUỒNG ĐÃ SỬA (01/11/2026)

- **Số phút buổi học:** dùng chia ngân sách giáo án, hiển thị đồng hồ và nhắc cô tổng kết; cô chủ động kết thúc. Tất cả thời lượng hợp lệ 10–120 phút đều có tổng thời gian các giai đoạn/hoạt động khớp nhau. Giáo án chuyển sang chuẩn bị buổi dạy giữ đúng số phút.
- **Phân quyền:** lịch và buổi học phải đồng thời khớp giáo viên cùng lớp đang được phân công. Đọc trực tiếp buổi cũ cũng kiểm tra quyền lớp. Lộ trình/giáo trình chỉ lấy sách hoặc nhóm tuổi của lớp phụ trách; không có lớp thì không trả cả giáo trình trường. Admin giữ phạm vi quản trị.
- **Kho trò chơi:** cấu hình mẫu trò ở trên; hoạt động/câu hỏi của buổi dạy đặt trong vùng mở rộng riêng. Có thống kê số bài đủ điều kiện và chơi thử theo học liệu thật. Không thể lưu cấu hình làm bài đang hoạt động mất khả năng hoàn thành chặng 3.
- **Tab Trò chơi của bé:** dùng cùng registry/runner với bài học, chỉ lấy từ đã khám phá hoặc có lượt luyện thật; bộ lọc bài/Unit lấy từ DB. Đã bỏ từ giả, mức thành thạo giả và game riêng không tuân theo catalog. Không có từ thì hướng dẫn bé về hành trình.
- **Lượt chơi:** đếm lần thử theo từng vòng, kể cả khi từ lặp lại. Remount mẫu trò mỗi vòng để dọn timer cũ. Sai nhiều thì gợi ý, không tự tính như bé đã chọn đúng. Checkpoint giữ đúng thứ tự server đã cấp.
- **Giao ôn ở nhà:** thay tên “Bài ôn cô duyệt”; đây là gợi ý cá nhân của cô cho gia đình, không phải điều kiện bắt buộc để học bài mới. Chọn học sinh/bài → chọn từ và 2–5 bước chơi → Giao ôn. Bé xem tại `/my-learning`. Bản mới thay bản đang giao; thu hồi ẩn nội dung, lịch sử vẫn giữ. Một từ dùng nghe/luyện nói, từ hai từ có thể chơi chọn tranh. Sửa xử lý liên kết học sinh, lỗi tải, gửi lặp, đổi lớp và chờ API.
- **Huy hiệu/sticker:** 35 ảnh Microsoft Fluent Emoji 3D lưu cục bộ, bản quyền MIT tại `client/public/images/rewards/fluent-3d/LICENSE.txt`. Chạy lại trình nhập bằng `client/scripts/import-reward-art.ps1`. Sticker được tặng từ rương hoàn thành Unit, không phải ngẫu nhiên sau mỗi game.

**Kiểm tra:** `npm.cmd test --prefix KCEnglishKids_BE`, `npm.cmd test --prefix client`, `npm.cmd run build --prefix client`. Kiểm tra HTTP + MongoDB đầy đủ luồng ôn bằng `node audits/learning-system.acceptance.js` trong backend; script chỉ tạo và xóa DB thử có tên riêng, không sửa DB học thật. Báo cáo: `docs/learning-system-validation-2026-11-01.json`.

---

> **Lưu ý cho phiên làm việc mới:** Mỗi khi bắt đầu một phiên làm việc mới, hãy đọc file này trước tiên để có bức tranh tổng thể và nắm vững các quy chuẩn vận hành của dự án!
