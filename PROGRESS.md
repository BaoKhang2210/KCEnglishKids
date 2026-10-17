# 📋 NHẬT KÝ TIẾN ĐỘ DỰ ÁN KCENGLISKHIDS (PROGRESS TRACKING)

> **Dự án:** Nền tảng học tiếng Anh tương tác cho trẻ em 3–6 tuổi (KCEnglishKids)  
> **Thời gian cập nhật gần nhất:** 2026-10-17  
> **Tài liệu tham chiếu chuẩn:** `.qoder/repowiki/en/content/`, `PLAN.md`, `README.md`

---

## 🧭 1. TỔNG QUAN KIẾN TRÚC & PHÂN HỆ

Hệ thống gồm 3 phân hệ chính:
1. **`KCEnglishKids_BE`**: Backend Express REST API + MongoDB (Port 5000)
2. **`client`**: Ứng dụng dành cho Trẻ em (Học tập tương tác) & Giáo viên (Teacher Dashboard, Live Session) (Port 5173)
3. **`admin`**: Cổng quản trị dành cho Quản trị viên (Port 5174)

---

## 🎯 2. TRỌNG TÂM HOÀN THIỆN: 10 NHẬN XÉT CỦA GIÁO VIÊN HƯỚNG DẪN (TEACHER MODULE)

| Mã | Nhận xét của GVHD | Giải pháp kỹ thuật & File thực hiện | Trạng thái |
| :---: | :--- | :--- | :---: |
| **GV-01** | **Hiển thị theo giáo trình, buổi**<br>*(Biết rõ đang học đến buổi nào, bài nào theo giáo trình chuẩn)* | - Backend: Thêm `sessionNumber: Number` trong `ClassroomSession.js`, populate `curriculumUnits`, `topic`, `book` trong `classroomSessionController.js`.<br>- Frontend: Header phòng học `LiveSessionPage.tsx` hiển thị huy hiệu `BUỔI {session.sessionNumber}` và `Book {bookNumber} • Unit {unitNumber} • {lessonTitle}`. Bảng khóa biểu `ClassroomSessionSetup.tsx` thể hiện lộ trình buổi 1, 2, 3...<br>📁 `ClassroomSession.js`, `classroomSessionController.js`, `ClassroomSessionSetup.tsx`, `LiveSessionPage.tsx` | ✅ Hoàn thành |
| **GV-02** | **Bảng khóa biểu hiển thị đang học lesson**<br>*(Mục chọn bài phải hiện đầy đủ, trực quan)* | - Xây dựng "Bảng khóa biểu phân phối buổi học" (Syllabus Timetable) gồm 7 cột: Buổi gợi ý, Giáo trình & Unit, Bài học (Anh + Việt), Số từ vựng, Số trò chơi, Trạng thái (Đã dạy / Đang chọn / Sẵn sàng), Thao tác chọn nhanh.<br>- Hỗ trợ chuyển đổi giữa Bảng khóa biểu và Dạng thẻ, tìm kiếm và lọc theo Giáo trình (Book 1, 2, 3) và Unit.<br>📁 `ClassroomSessionSetup.tsx` | ✅ Hoàn thành |
| **GV-03** | **Thêm "Ôn cũ học mới" vào đầu buổi học**<br>*(Giúp giáo viên ôn tập từ vựng & mẫu câu bài trước)* | - Thêm tùy chọn `[x] Kích hoạt pha "Ôn Cũ Học Mới" (Warm-up)` tại bước tạo buổi dạy.<br>- Trong `LiveSessionPage.tsx`, bổ sung tab **`🔥 0. Ôn Cũ Học Mới`** xuất hiện đầu tiên: tự động nạp từ vựng các bài học trước, Flashcard cỡ lớn cho máy chiếu, ẩn/hiện nghĩa tiếng Việt để đố trẻ, đọc vào mic nhận diện giọng nói có fanfare/pháo hoa, nút thưởng sao cả lớp (+1 ⭐) và quay chọn bé ngẫu nhiên, nút chuyển tiếp sang bài mới.<br>📁 `ClassroomSession.js`, `classroomSessionController.js`, `ClassroomSessionSetup.tsx`, `LiveSessionPage.tsx` | ✅ Hoàn thành |
| **GV-04** | **Avatar Sổ liên lạc ở giao diện cho trẻ**<br>*(Nơi bé & phụ huynh xem nhận xét và bài tập được giao)* | - Nâng cấp nút mở sổ liên lạc trong `ChildHeader.tsx` thành Avatar Sổ liên lạc hoạt hình nổi bật (`📒 Sổ liên lạc`) có gradient ấm áp và chấm tròn thông báo phát sáng (`ping animate`).<br>- Mở modal `ParentNotebookModal.tsx` với 2 tab: Phiếu thông báo từ cô giáo & Bài tập được giao.<br>📁 `ChildHeader.tsx`, `ParentNotebookModal.tsx` | ✅ Hoàn thành |
| **GV-05** | **Mẫu câu nhận xét chọn nhanh**<br>*(Thay vì phải gõ tay nhận xét cho từng bé)* | - Tích hợp bộ mẫu nhận xét phong phú (`quickReviewChips`) phân theo nhóm chủ đề: Xuất sắc, Phát âm to rõ, Phản xạ nhanh, Tiến bộ vượt bậc, Rất chăm chỉ, Cần luyện thêm.<br>- Áp dụng ở cả modal chấm bài tập và modal gửi thông báo phụ huynh trong `TeacherWorkspace.tsx`.<br>📁 `TeacherWorkspace.tsx` | ✅ Hoàn thành |
| **GV-06** | **Ghi chú riêng cho Giáo viên chủ nhiệm (GVCN)**<br>*(Bảo mật thông tin nội bộ của lớp)* | - Backend: Bổ sung `isHomeroomOnly: Boolean` vào `TeacherNote.js`. API `teacherController.js` chỉ cho phép GVCN hoặc chính tác giả đọc ghi chú nội bộ.<br>- Frontend: Checkbox `[x] Ghi chú nội bộ (Chỉ GVCN & tác giả được xem)`, bộ mẫu ghi chú nhanh của GVCN, hiển thị badge `🔒 Chỉ GVCN xem`.<br>📁 `TeacherNote.js`, `teacherController.js`, `api.ts`, `TeacherWorkspace.tsx` | ✅ Hoàn thành |
| **GV-07** | **Nhận xét chuyển thành dạng thông báo (thay vì chat)**<br>*(Hiện từng thông báo rõ ràng, trang trọng)* | - Loại bỏ hoàn toàn khung chat 2 chiều cũ ở cả màn hình Giáo viên và màn hình Phụ huynh.<br>- Chuyển thành hệ thống **Phiếu thông báo học tập chính thức (Notification Cards)** độc lập: có tiêu đề, ngày gửi, người gửi, số sao, điểm số và lời nhận xét sư phạm.<br>📁 `ParentNotebookModal.tsx`, `TeacherWorkspace.tsx` | ✅ Hoàn thành |
| **GV-08** | **Bỏ giao cho cá nhân, chỉ giao cho toàn bộ lớp**<br>*(Đơn giản hóa quy trình giao bài của giáo viên)* | - Bỏ lựa chọn giao cho học sinh cá nhân. Form tạo bài tập và bảng bài tập luôn cố định áp dụng cho toàn bộ lớp học (`assignedToType: 'CLASS'`).<br>📁 `TeacherWorkspace.tsx` | ✅ Hoàn thành |
| **GV-09** | **Đổi "Chiếu mẫu câu" thành "Bắt đầu học mẫu câu"**<br>*(Đúng thuật ngữ sư phạm tương tác)* | - Cập nhật nhãn nút bấm, tiêu đề và link điều hướng sang "Bắt đầu học mẫu câu" trên toàn bộ phân hệ giáo viên.<br>📁 `SentenceTeachingPage.tsx`, `TeacherWorkspace.tsx`, `LiveSessionPage.tsx` | ✅ Hoàn thành |
| **GV-10** | **Giao bài phải biết trẻ nào chưa làm, đã làm**<br>*(Theo dõi tỷ lệ nộp bài và trạng thái từng bé)* | - Bảng bài tập hiển thị thanh tiến độ `{completedCount}/{totalCount} bé đã làm ({percent}%)`.<br>- Modal chi tiết phân nhóm rõ ràng: Nhóm "Đã làm xong" (kèm điểm số, số sao, thời gian nộp bài, nút xem bài làm) và Nhóm "Chưa làm" (kèm badge Chưa hoàn thành và nút gửi nhắc nhở).<br>📁 `TeacherWorkspace.tsx`, `teacherController.js` | ✅ Hoàn thành |

---

## 🛡️ 3. PHÂN HỆ QUẢN TRỊ VIÊN (ADMIN PORTAL)

| STT | Hạng mục công việc | Trạng thái | Chi tiết kỹ thuật & File liên quan |
| :---: | :--- | :---: | :--- |
| **A1** | **Tách cấu trúc Modular cho Admin Dashboard** | ⏳ Tiếp theo | Tách `AdminDashboardPage.tsx` (>880 dòng) thành các component tab riêng biệt (`OverviewTab`, `UsersTab`, `CurriculumTab`, `AuditTab`...). |
| **A2** | **Quản lý Chủ đề (Topics) & Bài học (Lessons) CRUD** | ⏳ Tiếp theo | Thêm mới, chỉnh sửa, ẩn/hiện Chủ đề và Bài học trong chương trình. |
| **A3** | **Quản lý Hoạt động & Trò chơi (Activities)** | ⏳ Tiếp theo | Xem danh sách 306 activities, lọc theo loại game, cấu hình điểm số/sao. |
| **A4** | **Quản lý Từ vựng & Media (Vocabulary & Assets)** | ⏳ Tiếp theo | Quản lý danh mục từ vựng, hình ảnh, file âm thanh. |
| **A5** | **Nâng cấp Quản lý Người dùng & Bảo mật** | ⏳ Tiếp theo | Phân trang, tìm kiếm; bảo mật không trả mật khẩu băm/PIN ra ngoài. |
| **A6** | **Nâng cấp Nhật ký Hệ thống (Audit Logs)** | ⏳ Tiếp theo | Phân trang, bộ lọc theo loại sự kiện và khoảng thời gian. |

---

## 📝 4. NHẬT KÝ CHI TIẾT CÁC PHIÊN LÀM VIỆC (SESSION LOGS)

### 📌 Phiên làm việc #1 (2026-10-17)
- **Mục tiêu:** Khởi động toàn bộ hệ thống, kiểm tra cơ sở dữ liệu thực tế, nghiên cứu sâu tài liệu `.qoder` và thiết lập kế hoạch hành động.
- **Kết quả đạt được:**
  - ✅ Khởi chạy thành công Backend (port 5000), Client (port 5173), Admin (port 5174) và xác minh kết nối MongoDB (21 collections đầy đủ).
  - ✅ Tạo script khởi động nhanh [start-all.bat](file:///d:/Dulieu/KLTN/KCEnglishKids/start-all.bat) và script dừng [stop-all.bat](file:///d:/Dulieu/KLTN/KCEnglishKids/stop-all.bat).
  - ✅ Nghiên cứu toàn bộ kho tri thức `.qoder/repowiki/en/content/` và `PLAN.md`.
  - ✅ Thiết lập file theo dõi tiến độ [PROGRESS.md](file:///d:/Dulieu/KLTN/KCEnglishKids/PROGRESS.md).

### 📌 Phiên làm việc #2 (2026-10-17)
- **Mục tiêu:** Tiếp nhận và phân tích 10 nhận xét chi tiết của GVHD cho phân hệ Giáo viên; cập nhật kế hoạch và bắt tay vào triển khai từng hạng mục.
- **Nội dung thực hiện:**
  - Ghi nhận đầy đủ 10 yêu cầu cốt lõi (GV-01 đến GV-10) vào bảng theo dõi tiến độ.
  - Sửa backend hỗ trợ `isHomeroomOnly`, `sessionNumber`, `includeWarmup`.
  - Hoàn thiện GV-04 (Avatar sổ liên lạc), GV-05 (Mẫu nhận xét nhanh), GV-06 (Ghi chú GVCN), GV-07 (Nhận xét dạng thông báo), GV-08 (Giao bài cho cả lớp), GV-09 (Đổi nhãn "Bắt đầu học mẫu câu"), GV-10 (Thống kê trẻ đã làm/chưa làm).

### 📌 Phiên làm việc #3 (2026-10-17)
- **Mục tiêu:** Hoàn thiện dứt điểm các hạng mục GV-01, GV-02, GV-03 (Bảng khóa biểu lộ trình, Tiến độ bài học & Pha Ôn Cũ Học Mới); kiểm tra toàn diện TypeScript & Build.
- **Kết quả đạt được:**
  - ✅ **Hoàn thành GV-01 & GV-02**: Nâng cấp toàn diện [ClassroomSessionSetup.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/client/src/dashboards/teacher/ClassroomSessionSetup.tsx) với Bảng khóa biểu phân phối buổi học (Syllabus Timetable) 7 cột, lọc theo Giáo trình (Book 1, 2, 3) và Unit, phân biệt rõ bài đã dạy và bài kế tiếp, tự động tính buổi học tiếp theo của lớp.
  - ✅ **Hoàn thành GV-03**: Xây dựng pha **`🔥 0. Ôn Cũ Học Mới` (Warm-up Phase)** trong [LiveSessionPage.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/client/src/dashboards/teacher/LiveSessionPage.tsx) với đầy đủ Flashcard tương tác máy chiếu, ẩn/hiện nghĩa tiếng Việt & phát âm, đọc vào Mic nhận diện giọng nói kèm tiếng vỗ tay/pháo hoa, nút thưởng sao cả lớp (+1 ⭐) và quay gọi học sinh ngẫu nhiên, nút chuyển tiếp sang bài học mới.
  - ✅ **Cập nhật Top Header trong Live Session**: Hiển thị nổi bật `BUỔI {session.sessionNumber} • Book {bookNumber} • Unit {unitNumber} • {lessonTitle} • {classroom.name}`.
  - ✅ **Kiểm tra biên dịch & Build**: Chạy `npm.cmd run build` trên cả `client` (Port 5173) và `admin` (Port 5174), khắc phục toàn bộ lỗi lints/types. Cả 2 frontend đều build thành công tuyệt đối 100% (exit code 0).

### 📌 Phiên làm việc #4 (2026-10-17)
- **Mục tiêu:** Hoàn thiện 5 yêu cầu mở rộng quan trọng của người dùng:
  1. Dễ dàng nhìn thấy tên giáo viên ở mọi giao diện.
  2. Mỗi lớp ứng với 1 độ tuổi nên 3–4 tuổi chỉ hiện nội dung quyển sách 1, 4–5 tuổi sách 2, 5–6 tuổi sách 3.
  3. Quan sát bài học theo đúng thứ tự trang sách (Unit 1..9, Lesson displayOrder).
  4. Lịch giảng dạy & Tiến độ cho giáo viên: xem đã dạy đến đâu trong sách, tuần trước vào ngày đó đã dạy bài gì.
  5. Quản trị viên (Admin) cấp phát tài khoản cho học sinh & giáo viên đồng thời quản lý phân chia lớp cho giáo viên dạy.
- **Kết quả đạt được:**
  - ✅ **Hiển thị rõ tên giáo viên ở mọi giao diện**:
    - [TeacherWorkspace.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/client/src/dashboards/teacher/TeacherWorkspace.tsx): Banner chào mừng nổi bật `Cô giáo: {user.name}` kèm Avatar gradient, huy hiệu `Giáo viên Tiếng Anh Mầm Non`. Thẻ Profile giáo viên phụ trách cố định trên Sidebar desktop và Drawer mobile.
    - [LiveSessionPage.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/client/src/dashboards/teacher/LiveSessionPage.tsx): Top Bar hiển thị huy hiệu `👩‍🏫 Cô: {teacherDisplayName}` trực quan và trang trọng.
    - [ClassroomSessionSetup.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/client/src/dashboards/teacher/ClassroomSessionSetup.tsx): Banner `👩‍🏫 Cô giáo phụ trách: {classroom.teacher.name}`.
  - ✅ **Khóa giáo trình theo độ tuổi lớp (3-4 tuổi -> Sách 1, 4-5 tuổi -> Sách 2, 5-6 tuổi -> Sách 3)**:
    - Trong [ClassroomSessionSetup.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/client/src/dashboards/teacher/ClassroomSessionSetup.tsx): Tự động xác định `targetBookNumber`, khóa chặt nội dung chỉ hiển thị đúng quyển sách của lớp đó, ngăn chọn nhầm sang sách của độ tuổi khác.
    - Sắp xếp bài học tuần tự nghiêm ngặt theo trang sách: `Unit 1..9` ➔ `Lesson displayOrder`, gắn nhãn `Bài {index}`.
  - ✅ **Sổ Lịch Giảng Dạy & Bản Đồ Giáo Trình Cho Giáo Viên**:
    - Xây dựng component mới [TeacherTeachingSchedule.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/client/src/dashboards/teacher/TeacherTeachingSchedule.tsx) và đăng ký route `/teacher/schedule` trong [App.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/client/src/App.tsx).
    - **Tab Lịch Tuần (Weekly Calendar)**: Cho phép chuyển tuần trước/tuần này/tuần sau; 7 cột ngày thể hiện các buổi đã dạy; đặc biệt có **khung đối chiếu "Cùng ngày này tuần trước đã dạy bài gì"** trả lời trực tiếp nhu cầu ôn tập của giáo viên.
    - **Tab Bản Đồ Sách (Syllabus Roadmap)**: Xếp theo đúng thứ tự sách, thanh tiến độ tổng thể %, đánh dấu bài đã dạy, bài tiếp theo cần dạy và bài chưa học, kèm nút "Dạy bài này ngay".
  - ✅ **Quản trị viên quản lý phân chia lớp & cấp phát tài khoản**:
    - Backend [adminController.js](file:///d:/Dulieu/KLTN/KCEnglishKids/KCEnglishKids_BE/src/controllers/adminController.js) & [adminRoutes.js](file:///d:/Dulieu/KLTN/KCEnglishKids/KCEnglishKids_BE/src/routes/adminRoutes.js): 5 API quản lý lớp học (`GET/POST/PUT/DELETE /api/admin/classrooms`, `POST /assign-students`), hỗ trợ gán giáo viên và phân bổ học sinh.
    - Frontend Admin [AdminDashboardPage.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/admin/src/pages/AdminDashboardPage.tsx):
      - Thêm tab **"🏫 Phân chia lớp học"**: KPI số lớp theo độ tuổi, bộ lọc độ tuổi, bảng quản lý lớp kèm giáo viên phụ trách và sĩ số.
      - Modal **Tạo lớp học mới & Phân công giáo viên** (chọn độ tuổi 3-4/4-5/5-6 và giáo viên dạy).
      - Modal **Phân công lại giáo viên dạy** cho từng lớp học.
      - Modal **Phân bổ học sinh vào lớp** với danh sách checkbox trực quan.
### 📌 Phiên làm việc #5 (2026-10-17)
- **Mục tiêu:**
  1. Loại bỏ phần gợi ý/chỉnh tay buổi học thứ mấy ở màn hình bắt đầu buổi dạy (`ClassroomSessionSetup.tsx`); tự động gán cố định buổi học mới là buổi kế tiếp sau buổi trước của lớp.
  2. Sửa pha "Ôn Cũ Học Mới" (`LiveSessionPage.tsx`) thành ôn lại toàn bộ **cả từ vựng lẫn mẫu câu** đã học ở **bài học ngay trước đó**.
- **Kết quả đạt được:**
  - ✅ **Tự động gán buổi học tiếp theo (`ClassroomSessionSetup.tsx`)**:
    - Thuật toán tự động tìm `maxPrev = max(sessionNumber)` của lớp học và gán `sessionNumber = maxPrev + 1` (nếu chưa có buổi nào thì là Buổi 1).
    - Thay thế ô nhập số và dòng gợi ý cũ bằng Card trạng thái cố định: `BUỔI HỌC SỐ {sessionNumber}` kèm badge `Tự động tiếp nối` và chú thích `Hệ thống tự động gán tiếp theo sau Buổi {sessionNumber - 1}`.
    - Sửa nhãn bài học trong chế độ xem thẻ thành `Bài {item.bookOrderIndex || idx + 1} trong sách` để giáo viên phân biệt rõ số thứ tự bài trong sách và số thứ tự buổi dạy thực tế của lớp.
    - Cập nhật dòng tóm tắt thông tin: `Buổi số {sessionNumber} (Tự động gán tiếp theo sau Buổi {sessionNumber - 1})`.
  - ✅ **Ôn tập bài cũ: Ôn từ vựng & mẫu câu bài học ngay trước đó (`LiveSessionPage.tsx`)**:
    - **Xác định chính xác bài học trước đó**: Tự động tra cứu buổi dạy gần nhất trước đó của lớp để lấy bài học đã dạy (`priorSession.lesson`); nếu chưa có buổi dạy trước thì lấy bài liền trước trong sách (`curIdx - 1`).
    - Nạp tự động toàn bộ Từ vựng của bài trước vào `warmupVocabList`.
    - Gọi API `sentenceApi.getPatterns({ lessonId: prevLessonDoc._id })` nạp toàn bộ Mẫu câu của bài trước vào `warmupPatterns`.
    - Thiết kế lại giao diện pha `🔥 Ôn Cũ Học Mới: Bài học ngay trước đó`:
      - Banner tiêu đề: `📖 Đang ôn bài trước: [Tên bài học trước] ([Nghĩa tiếng Việt])`.
      - Thanh chuyển đổi phân hệ: `🔤 Từ vựng ({warmupVocabList.length})` vs `💬 Mẫu câu ({warmupPatterns.length})`.
      - Flashcard Mẫu câu bài trước: Minh họa sinh động `getSentenceIllustration`, phát âm audio mẫu câu, ẩn/hiện nghĩa tiếng Việt, mic luyện nói đọc mẫu câu kèm nhận diện giọng nói và hiệu ứng pháo hoa thưởng sao.
      - Flashcard Từ vựng bài trước: Ảnh flashcard lớn, phát âm audio, ẩn/hiện tiếng Việt, mic kiểm tra phát âm bé.
      - Cột điều khiển tương tác lớp: Nút Thưởng sao cả lớp (+1 ⭐), nút Gọi 1 bé ngẫu nhiên lên ôn bài, thanh danh sách chuyển nhanh từ/câu, nút chuyển tiếp sang Giảng bài mới.
  - ✅ **Kiểm tra biên dịch & Build**: `npm.cmd run build` trên thư mục `client` chạy thành công tuyệt đối (exit code 0).

### 📌 Phiên làm việc #8 (2026-10-17)
- **Mục tiêu:** Thực hiện `/goal`: Triển khai toàn bộ các phần theo kế hoạch nâng cấp [PLAN.md](file:///d:/Dulieu/KLTN/KCEnglishKids/PLAN.md) và tiến hành đánh giá toàn diện module Giáo viên và Admin.
- **Kết quả đạt được:**
  - ✅ **Tái cấu trúc 100% Modular cho Cổng Quản Trị Viên (Admin Portal)**:
    - Chuyển đổi file monolithic `AdminDashboardPage.tsx` (>1575 dòng) thành kiến trúc phân tầng sạch sẽ:
      - 📁 `admin/src/components/admin/tabs/`:
        - [OverviewTab.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/admin/src/components/admin/tabs/OverviewTab.tsx): 4 thẻ KPI lớn, thanh tiến độ 3 đầu sách, kết quả học tập ghi nhận từ MongoDB thời gian thực.
        - [UsersTab.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/admin/src/components/admin/tabs/UsersTab.tsx): Quản lý người dùng toàn diện, lọc theo lớp học, vai trò, tìm kiếm A-Z tiếng Việt, thao tác khóa/mở khóa an toàn.
        - [ClassroomsTab.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/admin/src/components/admin/tabs/ClassroomsTab.tsx): Quản lý lớp học theo độ tuổi (Mầm 3–4T Sách 1, Chồi 4–5T Sách 2, Lá 5–6T Sách 3), phân công giáo viên và phân bổ học sinh.
        - [CurriculumTab.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/admin/src/components/admin/tabs/CurriculumTab.tsx): Khám phá chi tiết 3 Sách, 27 Unit dạng accordion, hiển thị danh mục bài học, số từ vựng, số trò chơi, thời lượng và nút bật/tắt hiển thị bài học (`toggleLessonStatus`).
        - [AnalyticsTab.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/admin/src/components/admin/tabs/AnalyticsTab.tsx): Kinh tế điểm sao toàn trường (sao học ở nhà vs sao trên lớp), Top 5 học sinh xuất sắc toàn trường có cúp/huy chương, bảng hiệu quả và tiến độ từng lớp học.
        - [AuditTab.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/admin/src/components/admin/tabs/AuditTab.tsx): Nhật ký kiểm toán hệ thống ghi vết toàn bộ thao tác, bộ lọc theo loại sự kiện và tìm kiếm chi tiết.
        - [SettingsTab.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/admin/src/components/admin/tabs/SettingsTab.tsx): Cấu hình tham số hệ thống: tên trường mầm non, hotline, email, địa chỉ, niên khóa, mã PIN mặc định cho bé (1234), sao tối đa mỗi game và sao thưởng Unit.
      - 📁 `admin/src/components/admin/modals/`:
        - [CreateTeacherModal.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/admin/src/components/admin/modals/CreateTeacherModal.tsx): Cấp tài khoản giáo viên mới.
        - [CreateChildModal.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/admin/src/components/admin/modals/CreateChildModal.tsx): Thêm hồ sơ học sinh mầm non kèm tính tuổi tự động xếp sách.
        - [EditUserModal.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/admin/src/components/admin/modals/EditUserModal.tsx): Chỉnh sửa thông tin học sinh & giáo viên, đổi lớp học trực tiếp.
        - [ResetPinModal.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/admin/src/components/admin/modals/ResetPinModal.tsx): Đặt lại mã PIN 4 chữ số cho học sinh khi trẻ quên.
        - [CreateClassroomModal.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/admin/src/components/admin/modals/CreateClassroomModal.tsx): Tạo lớp học mới và phân công giáo viên.
        - [ChangeTeacherModal.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/admin/src/components/admin/modals/ChangeTeacherModal.tsx): Phân công lại giáo viên cho lớp.
        - [AssignStudentsModal.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/admin/src/components/admin/modals/AssignStudentsModal.tsx): Phân bổ học sinh vào lớp học với bộ chọn checkbox linh hoạt.
  - ✅ **Nâng cấp Phân Hệ Giáo Viên (Teacher Module)**:
    - Xây dựng component mới [TeacherAnalyticsTab.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/client/src/dashboards/teacher/TeacherAnalyticsTab.tsx) tích hợp trực tiếp vào thanh điều hướng (`/teacher/analytics` - "Báo cáo & Phân tích"):
      - Bộ lọc lớp học linh hoạt: xem toàn trường hoặc lọc theo từng lớp phụ trách.
      - 4 chỉ số KPI: Sĩ số lớp, Điểm TB toàn lớp, Tổng sao tích lũy, Danh sách trẻ cần hỗ trợ (điểm < 70% hoặc chưa hoàn thành bài).
      - Bảng Vinh Danh Tuần Này (Top 5 Leaderboard) với huy chương 🥇🥈🥉, biểu tượng ngọn lửa chuỗi ngày học liên tiếp (Streak 🔥).
      - Bảng chi tiết năng lực từng bé với xếp loại sư phạm (`🌟 Xuất sắc`, `👍 Tiến bộ tốt`, `📖 Cần rèn thêm`).
      - Modal Gửi nhận xét & Thưởng sao nhanh: giáo viên bấm nút "Nhận xét & Sao" là có thể chọn tặng 1–5 ⭐, chọn các mẫu câu dặn dò chuẩn sư phạm và gửi ngay về Sổ liên lạc của phụ huynh.
  - ✅ **Mở rộng API Backend**:
    - Backend Models: Bổ sung [SystemSetting.js](file:///d:/Dulieu/KLTN/KCEnglishKids/KCEnglishKids_BE/src/models/SystemSetting.js) và mở rộng `action` trong [AuditLog.js](file:///d:/Dulieu/KLTN/KCEnglishKids/KCEnglishKids_BE/src/models/AuditLog.js).
    - Backend Controllers & Routes: Thêm `updateUser`, `resetChildPin`, `deleteUser`, `getDeepCurriculum`, `toggleLessonStatus`, `getAdminAnalytics`, `getSystemSettings`, `updateSystemSettings`.
  - ✅ **Kiểm tra Biên dịch & Build**:
    - `client`: `npm.cmd run build` thành công tuyệt đối (1921 modules transformed, exit code 0).
    - `admin`: `npm.cmd run build` thành công tuyệt đối (1874 modules transformed, exit code 0).
    - `backend`: Khởi chạy mượt mà, phản hồi API chính xác (`http://localhost:5000/api/admin/public-stats` trả về `success: true`).

### 📌 Phiên làm việc #7 (2026-10-17)
- **Mục tiêu:** Nghiên cứu các ứng dụng EdTech hàng đầu thế giới (ClassDojo, Seesaw, Duolingo for Schools, Khan Academy Teacher, Bloomz, Google Classroom) và xây dựng kế hoạch nâng cấp chiến lược toàn diện cho phân hệ Giáo viên và Admin.
- **Kết quả đạt được:**
  - ✅ **Phân tích 6 ứng dụng EdTech hàng đầu**: Trích xuất tính năng hay và phù hợp để áp dụng vào KCEnglishKids cho đối tượng trẻ mầm non.
  - ✅ **Đánh giá toàn diện trạng thái hiện tại**: Liệt kê 11 tính năng đã hoàn thành và 5 tồn đọng cần cải thiện.
  - ✅ **Xây dựng [PLAN.md](file:///d:/Dulieu/KLTN/KCEnglishKids/PLAN.md) chiến lược** với 5 pha triển khai:
    - **Phase 1 – Ổn định & Refactor**: Tách TeacherWorkspace.tsx (2680 dòng) và AdminDashboardPage.tsx (1575 dòng) thành các module nhỏ; cải thiện Toast, Skeleton, Empty state.
    - **Phase 2 – Analytics & Báo cáo**: Dashboard phân tích học sinh (biểu đồ tuần, heatmap, radar chart, streak, cảnh báo), Ma trận Mastery giáo trình, Phiếu thành tích tháng (PDF).
    - **Phase 3 – Giao tiếp phụ huynh**: Bảng tin lớp (Class Story Feed), Direct Message 1-1, Calendar sự kiện & nhắc nhở.
    - **Phase 4 – Admin Pro**: CRUD Giáo trình (Books/Units/Lessons/Activities), Báo cáo toàn hệ thống, Bulk Import học sinh từ Excel, Audit Log nâng cao, System Settings.
    - **Phase 5 – Gamification nâng cao**: Live Behavior Board (điểm hành vi real-time), Huy hiệu lớp tập thể, Thử thách tuần.
  - ✅ **Lập bảng phân công 10 phiên tiếp theo** (Phiên #8 đến #16) với task và mức ưu tiên rõ ràng.
- **File tạo mới:** [PLAN.md](file:///d:/Dulieu/KLTN/KCEnglishKids/PLAN.md)

### 📌 Phiên làm việc #6 (2026-10-17)
- **Mục tiêu:**
  1. Hoàn thiện toàn bộ luồng học của học sinh, loại bỏ triệt để lỗi và xây dựng hoàn hảo chức năng tính điểm, cộng dồn sao và tỷ lệ hoàn thành cho học sinh trên toàn hệ thống.
  2. Triển khai lại tab "Lớp học" trên thanh điều hướng giáo viên thành **"Sổ Quản Lý Lớp Học" (Classroom Command Hub)** rõ ràng, thực tiễn và có giá trị sử dụng cao.
  3. Tái thiết kế tab "Học sinh" thành **"Quản Lý Học Sinh Theo Lớp" (Grouped by Class)** giúp giáo viên dễ dàng tra cứu, quản lý thành tích và gửi nhận xét phụ huynh.
  4. Bổ sung bộ lọc lớp học cho học sinh trong cổng Quản trị viên (Admin Portal).
- **Kết quả đạt được:**
  - ✅ **Hoàn hảo hóa chức năng tính điểm & tổng hợp sao học sinh**:
    - **Backend `rewardService.js`**: Nâng cấp `computeRewards` tích hợp đồng bộ 3 nguồn điểm sao:
      `totalStars = earnedStars (học ở nhà) + bonusStars (mở rương Unit) + classroomStars (cô giáo thưởng trên lớp)`.
    - **Backend `teacherController.js`**: Viết lại hàm `statsFor` và `getStudentOverview` tổng hợp đa chiều từ `ActivityResult`, `Progress`, `ClassroomSession.studentScores` và `UnitCompletion`. Đảm bảo 100% học sinh (kể cả chỉ học trên lớp hoặc chỉ tự học ở nhà) đều có số liệu điểm trung bình %, số sao và bài hoàn thành thống nhất.
    - **Luồng học 3 chặng mượt mà**: Chặng 1 (Flashcard) ➔ Chặng 2 (Practice Studio) ➔ Chặng 3 (18 Game Engines) hoạt động trơn tru; sau khi nộp bài có màn hình kết quả rực rỡ, âm thanh vỗ tay chúc mừng, chuyển tiếp bài học sau liền mạch và cập nhật trạng thái hoàn thành bài học.
  - ✅ **Tái thiết kế Tab "Lớp học" ➔ "Sổ Quản Lý Lớp Học" ([TeacherWorkspace.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/client/src/dashboards/teacher/TeacherWorkspace.tsx))**:
    - Xác định rõ vai trò trang: **Trung tâm điều hành và sổ chủ nhiệm các lớp phụ trách**.
    - 4 thẻ KPI toàn diện: Tổng số lớp, Tổng sĩ số học sinh, Tổng số sao toàn khối, Điểm TB toàn khối.
    - Thẻ lớp học (Class Hub Card) trực quan:
      - Tên lớp kèm Badge `ACTIVE` và Niên khóa.
      - Huy hiệu khóa giáo trình theo độ tuổi (`📘 Sách Book 1`, `📗 Sách Book 2`, `📙 Sách Book 3`).
      - Lưới 3 chỉ số lớp: Sĩ số, Điểm trung bình, Tổng sao lớp tích lũy.
      - Bộ 3 nút tác vụ nhanh: 🚀 **Dạy ngay** (nhảy thẳng vào tạo buổi dạy của lớp đó), 📅 **Lịch dạy & Tiến độ**, 👥 **Sổ chi tiết lớp**.
  - ✅ **Tái thiết kế Tab "Học sinh" ➔ "Quản Lý Học Sinh Theo Lớp" ([TeacherWorkspace.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/client/src/dashboards/teacher/TeacherWorkspace.tsx))**:
    - **Nhóm học sinh theo từng lớp học (Grouped by Class)**: Mỗi lớp là một phân khu độc lập có Header thể hiện tên lớp, độ tuổi, giáo trình, sĩ số, điểm TB lớp, tổng sao và các nút hành động nhanh.
    - **Thanh chọn lớp (Class Tabs Bar)**: Cho phép cô bấm chọn xem tất cả hoặc lọc riêng từng lớp (`Lớp Mầm 1`, `Lớp Chồi 2`...).
    - **Thanh tìm kiếm & sắp xếp linh hoạt**: Tìm theo tên/mã học sinh, sắp xếp theo tên A–Z (tiếng Việt), điểm cao nhất, nhiều sao nhất, bài xong nhiều nhất.
    - **Thẻ học sinh thông minh**: Avatar, tên bé, username, 3 chỉ số (Điểm TB %, Sao ⭐, Bài xong) kèm huy hiệu xếp loại sư phạm (`🌟 Xuất sắc`, `👍 Khá giỏi`, `📖 Cần rèn thêm`).
    - Nút gửi nhận xét nhanh đến phụ huynh với bộ mẫu câu chọn nhanh và chấm sao khen thưởng.
  - ✅ **Bổ sung chọn lớp linh hoạt trong Bắt đầu buổi dạy ([ClassroomSessionSetup.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/client/src/dashboards/teacher/ClassroomSessionSetup.tsx)) & [App.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/client/src/App.tsx)**:
    - Hỗ trợ cả route param `classId` lẫn URL query `classroomId`, tự động nạp lớp mặc định và cung cấp dropdown chuyển đổi lớp dạy trực tiếp ngay trên đầu trang.
  - ✅ **Cập nhật Admin Portal ([AdminDashboardPage.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/admin/src/pages/AdminDashboardPage.tsx))**:
    - Bổ sung bộ lọc lớp học cho học sinh trong tab Quản lý người dùng để Quản trị viên dễ dàng tra cứu theo từng lớp.
  - ✅ **Kiểm tra biên dịch & Build**: Cả 2 dự án `client` (Port 5173) và `admin` (Port 5174) đều build thành công 100% với exit code 0.
