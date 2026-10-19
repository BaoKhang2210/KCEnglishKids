# 🚀 TIẾN ĐỘ TRIỂN KHAI HỆ THỐNG AI — KCENGLISHKIDS

> **Dự án:** KCEnglishKids — Nền tảng học tiếng Anh tương tác cho trẻ mầm non (3–6 tuổi)  
> **Cập nhật lần cuối:** 17/10/2026  
> **Trạng thái tổng thể:** Phase 1 & Phase 2 Đã hoàn tất 100% | Sẵn sàng demo & bảo vệ KLTN  

---

## 📊 Bảng theo dõi tiến độ tổng thể (Milestones Tracker)

| Giai đoạn (Phase) | Hạng mục / Tính năng | Đối tượng | Trạng thái | Kiểm thử / Build |
| :--- | :--- | :---: | :---: | :---: |
| **Phase 1** | **Gợi ý nhận xét phụ huynh (Smart Parent Notes)** | Giáo viên | ✅ Hoàn thành 100% | Pass live API |
| **Phase 1** | **Luyện phát âm cùng Koko (Speaking Coach)** | Học sinh | ✅ Hoàn thành 100% | Pass live API |
| **Phase 1** | **Hệ thống đánh giá cục bộ an toàn (Local-First)** | Cả hai | ✅ Hoàn thành 100% | 9/9 Unit Tests Pass |
| **Phase 2** | **Trợ lý soạn giáo án mầm non (AI Lesson Planner)** | Giáo viên | ✅ Hoàn thành 100% | 12/12 Unit Tests Pass |
| **Phase 2** | **Trợ lý nhắc bài Live Session (Live AI Copilot)** | Giáo viên | ✅ Hoàn thành 100% | Trình chiếu & Sync Real-time |
| **Phase 3** | **Phát hiện lỗ hổng phát âm cả lớp (Gap Detector)** | Giáo viên | ⏳ Định hướng tiếp theo | Tương lai |
| **Phase 3** | **Koko Object Hunter (Camera AI tìm đồ vật)** | Học sinh | ⏳ Định hướng tiếp theo | Tương lai |

---

## ✅ CHI TIẾT NHỮNG VIỆC ĐÃ HOÀN THÀNH

### Phase 1: Trợ lý học tập Local-First & Gợi ý phụ huynh
1. **Backend Service & API Routes (`KCEnglishKids_BE`)**:
   - Thuật toán chuẩn hóa transcript giọng nói (`normalizeTranscript`): loại bỏ dấu câu, mạo từ thừa, ký tự unicode tiếng Việt.
   - Đánh giá phát âm tương đối (`evaluatePronunciation`): Khoảng cách Levenshtein tính điểm 0-100%, 3 mức sao (1-3 sao), trạng thái cảm xúc linh vật Koko (`celebrating`, `happy`, `encouraging`).
   - Gợi ý nhận xét phụ huynh có căn cứ (`generateParentNote`): Tạo 3 phương án chuẩn mực (Praise, Encouragement, Practice Hint) dựa trên dữ liệu thật (độ chính xác, sao, streak, số bài hoàn thành).
   - Controller & Định tuyến bảo mật (`src/controllers/aiController.js` & `src/routes/aiRoutes.js`): Gắn middleware xác thực JWT (`protect`), kiểm tra quyền truy cập giáo viên - học sinh.
2. **Giao diện Giáo viên & Trẻ em (`client`)**:
   - Component `ParentNoteSuggestions.tsx`: Tích hợp tại 4 vị trí trong Teacher Workspace. Minh bạch trạng thái `Template mode — cloud AI off` đảm bảo tuân thủ đạo đức AI cho trẻ em.
   - Component `KokoSpeakingCoach.tsx` & Hook `useSpeakingCoach.ts`: Tích hợp tại Thẻ từ vựng tương tác (`BigInteractiveFlashcard`), Phòng thực hành câu (`InteractivePracticeStudio`), và Buổi dạy trực tiếp (`LiveSessionPage`).
   - Tối ưu hiển thị Responsive toàn màn hình (`max-w-[1920px]`, `w-full`) cho màn hình lớn 2K/4K.

---

### Phase 2: Trợ lý soạn giáo án & Kịch bản dạy học mầm non thông minh (AI Lesson Planner)
1. **Backend Engine (`src/services/aiService.js`)**:
   - [x] Triển khai động cơ sư phạm mầm non `generateLessonPlan()`:
     - Tự động phân bổ cấu trúc 4 giai đoạn chuẩn quốc tế:
       1. **Khởi động & Chào hỏi (Warm-up & Greeting)** (Bài hát chào hỏi + Trò chơi phản xạ Freeze Dance / Kể chuyện mini).
       2. **Giới thiệu & Vận động TPR (Presentation & TPR)** (Flashcard KCEnglishKids + Động tác cử chỉ cơ thể cho từng từ vựng).
       3. **Thực hành & Trò chơi tương tác (Practice & Games)** (Hộp quà bí mật Magic Box + Thử thách phát âm cùng Koko).
       4. **Khen thưởng & Tổng kết (Wrap-up & Celebration)** (Trao sao KCEnglishKids + Bài hát tạm biệt).
     - Linh hoạt điều chỉnh thời lượng chính xác: **15 phút**, **25 phút** (chuẩn mầm non), hoặc **35 phút** (nâng cao).
     - Tùy biến theo 3 nhóm tuổi: **3–4 tuổi (Book 1)**, **4–5 tuổi (Book 2)**, **5–6 tuổi (Book 3)**.
     - Tùy biến theo 3 phong cách giảng dạy: *Vận động sôi nổi TPR*, *Kể chuyện & Âm nhạc*, *Phản xạ tương tác nhóm*.
     - Tự động sinh khẩu lệnh tiếng Anh mẫu của cô (`Teacher Talk`) và cử chỉ vận động (`TPR Action`).
     - Tự động sinh tin nhắn sổ liên lạc gửi phụ huynh về nhà.
2. **Controller & Route (`src/controllers/aiController.js`, `src/routes/aiRoutes.js`)**:
   - [x] Tạo controller `generateLessonPlan` hỗ trợ truyền `lessonId` (tự động truy vấn từ vựng và câu từ MongoDB) hoặc các tham số tùy biến.
   - [x] Đăng ký route `POST /api/ai/generate-lesson-plan` với `protect`, `authorize('TEACHER', 'ADMIN')` và rate limit.
   - [x] Viết 3 unit tests mới trong `tests/ai.test.js`: **Toàn bộ 12/12 test cases pass 100%**.
3. **Giao diện Không gian Soạn bài Giáo viên (`client`)**:
   - [x] Khai báo kiểu dữ liệu trong `client/src/types/index.ts` (`LessonPlan`, `LessonPlanPhase`, `LessonPlanActivity`, `LessonPlanRequest`).
   - [x] Khai báo hàm gọi API `aiApi.generateLessonPlan` trong `client/src/services/api.ts`.
   - [x] Xây dựng trang chuyên dụng `TeacherLessonPlanner.tsx`:
     - Bảng điều khiển chọn lớp, bài học, thời lượng và phong cách.
     - Hiển thị kịch bản 4 giai đoạn trực quan với nhãn thời gian, huy hiệu màu sắc, khẩu lệnh của cô và cử chỉ TPR.
     - Nút **Sao chép kịch bản (Copy)** với phản hồi toast.
     - Nút **In giáo án (Print/PDF)** chuẩn trang in.
     - Nút 1-Click **"Áp dụng vào Buổi dạy trực tiếp"** chuyển thẳng sang phòng Live Session.
   - [x] Thêm link **"✨ Soạn giáo án AI"** vào Sidebar điều hướng và thanh Header của `TeacherWorkspace.tsx`.
   - [x] Thêm nút liên kết **"✨ Xem gợi ý giáo án AI"** trong màn hình chuẩn bị buổi học `ClassroomSessionSetup.tsx`.
   - [x] Đăng ký route `/teacher/lesson-planner` trong `App.tsx`.
   - [x] Biên dịch `client` (`tsc -b && vite build`): **Build thành công 0 lỗi**.
   - [x] Biên dịch `admin`: **Build thành công 0 lỗi**.
4. **Trợ lý nhắc bài thời gian thực trên màn hình dạy học trực tiếp (Live AI Teacher Copilot Teleprompter)**:
   - [x] Tạo component `LiveSessionCopilotDrawer.tsx`: Ngăn kéo trượt thông minh từ mép phải màn hình dạy học (`LiveSessionPage`).
   - [x] **Đồng bộ thời gian thực theo thẻ bài học (Real-time Phase Sync)**:
     - Khi giáo viên dạy đến từ vựng nào (`currentVocab`), Copilot tự động phân tích và hiển thị ngay cử chỉ mầm non **TPR Mime Action** (Ví dụ: `book` ➔ *Hai lòng bàn tay chắp lại rồi mở ra như trang sách đang lật*).
     - Hiển thị khẩu lệnh tiếng Anh cô nên hô to (`Teacher Talk`) kèm nút sao chép nhanh (`Copy`).
     - Tự động đồng bộ theo 4 tiến trình: Khởi động (Warm-up), Giảng bài (Presentation), Trò chơi (Games), và Tổng kết (Review).
   - [x] **Điều phối lớp học thông minh (Classroom Management Cues)**:
     - Tích hợp 4 câu khẩu lệnh sư phạm mầm non phản xạ tức thì: *Tập trung chú ý* (`1, 2, 3, eyes on me!`), *Lắng nghe trật tự* (`Hands on knees!`), *Khen ngợi* (`High-five little star!`), *Đồng thanh hô to* (`Say it loud!`).
   - [x] **Phím tắt tiện dụng**: Hỗ trợ phím tắt `Alt+K` để mở/đóng nhanh ngăn kéo trợ lý mà không làm gián đoạn máy chiếu của trẻ; phím `Esc` hoặc nút đóng để ẩn đi.
   - [x] Đã kiểm thử trình duyệt thực tế và ghi lại hình ảnh nghiệm thu trực quan.

---

## 🔮 ĐỊNH HƯỚNG TƯƠNG LAI (PHASE 3)
1. **Class Learning Gap Detector**: Báo cáo phân tích ma trận lỗi phát âm của cả lớp, tự động phát hiện nhóm từ vựng có tỷ lệ nhớ dưới 70%.
2. **Koko Object Hunter**: Mini-game thực tế ảo on-device sử dụng TensorFlow.js nhận diện đồ vật thật xung quanh lớp học qua camera.
3. **Koko Home-Bridge**: Tự động tổng hợp bản tin học tập tuần gửi gợi ý câu giao tiếp tiếng Anh đơn giản cho phụ huynh đồng hành cùng con tại nhà.
