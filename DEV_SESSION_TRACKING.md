# DEV SESSION TRACKING - ADMIN & TEACHER SYSTEM

**Dự án:** KCEnglishKids  
**Mục tiêu chính:** Phát triển, tinh gọn, sửa lỗi và đồng bộ hóa toàn diện hệ sinh thái Admin & Giáo viên (Teacher), đảm bảo chuẩn sư phạm mầm non và tính tương thích với Client học sinh.  
**Cập nhật lần cuối:** 2026-11-03  

---

## 📌 1. Nhiệm vụ phiên hiện tại (Current Session)

| Hạng mục | Chi tiết | Trạng thái |
| :--- | :--- | :---: |
| **Track & Guide files** | Tạo `DEV_SESSION_TRACKING.md` (Admin/Teacher) & `CLIENT_PARTNER_GUIDE.md` (Dành cho đối tác Client) | ✅ Đã hoàn thành |
| **Giao diện Giáo viên - Thời khóa biểu** | Bỏ banner thời khóa biểu cố định, chỉ giữ lại lưới lịch tuần 7 ngày, chuẩn hóa hiển thị và điều hướng ngày/tuần | ✅ Đã hoàn thành |
| **3 Trụ Cột & Nhận xét phụ huynh** | Chuẩn hóa 3 trụ cột thành 3 dòng ngang bằng nhau; nút Gửi nhận xét trực tiếp về Sổ liên lạc Client với phản hồi thành công | ✅ Đã hoàn thành |
| **Điểm danh trễ (LATE attendance)** | Giải quyết logic trẻ đến trễ: cho phép điểm danh bổ sung trực tiếp ngay trong lúc đang dạy (`LiveSessionPage`) với 1 click | ✅ Đã hoàn thành |
| **Học sinh vắng mặt** | Khi gửi nhận xét cuối buổi cho trẻ vắng, tự động nêu rõ tên bài học và Unit trẻ bỏ lỡ cần ôn tập tại nhà | ✅ Đã hoàn thành |
| **Admin - Giáo trình & Mẫu câu** | Đổi tên menu (Giáo trình, Mẫu câu); Tinh gọn giao diện Master-Detail: click bài nào hiện từ vựng & mẫu câu bài đó | ✅ Đã hoàn thành |
| **In tranh tô màu từ vựng** | Nâng cấp tính năng in bài thành "In tranh tô màu từ vựng" (khổ A4, hình đen trắng tương phản cao, chữ rỗng bubble) | ✅ Đã hoàn thành |
| **Chữ to rõ & Không nhảy dòng (Responsive)** | Tinh chỉnh thang chữ (`staff.css`), triệt tiêu ngắt từ giữa chừng (`overflow-wrap: break-word`), chống nhảy dòng badge/button | ✅ Đã hoàn thành |
| **Tối giản & Đầy đủ thông tin** | Giữ vững thông tin sư phạm cốt lõi, loại bỏ bớt phần dư thừa, làm sạch các view lịch và quản lý lớp học | ✅ Đã hoàn thành |
| **Xóa bỏ Ôn tập lỗ hổng & Đổi tên Tabbar Giáo viên** | Bỏ toàn bộ chức năng Ôn tập lỗ hổng ở giáo viên, xóa logic liên quan (banner, cấm sao, cấm mẫu câu); đổi tên tabbar thành "Giáo trình" và "Bài tập" | ✅ Đã hoàn thành |
| **Nâng cấp Cỡ chữ Giáo viên & Admin siêu lớn, dễ đọc** | Nâng thang chữ toàn diện: Body ~22px (`1.35rem`), Secondary ~19.2px (`1.2rem`), Badge ~17.3px (`1.08rem`), Headings 25–48px; mở rộng sidebar lên 310px & 296px | ✅ Đã hoàn thành |

---

## 🏗️ 2. Kiến trúc & Logic cốt lõi (Core Architecture)

### 2.1. Logic Điểm danh & Trẻ đến trễ (Late Arrival)
- **Trước giờ học (`ClassroomSessionSetup`):** Nếu trẻ chưa có mặt, cô để trạng thái mặc định là "Vắng" (ABSENT).
- **Trong giờ học (`LiveSessionPage`):** Khi trẻ xuất hiện trễ, cô bấm nút **"Đến trễ (Vào lớp)"** ngay tại thanh danh sách học sinh vắng trong lớp trực tiếp. Hệ thống gọi API `PATCH /api/teacher/classroom-sessions/:id/students/:studentId/attendance` cập nhật trạng thái thành `LATE` (hoặc `PRESENT`), ngay lập tức đưa bé vào danh sách tham gia hoạt động và nhận sao.

### 2.2. Hồ sơ năng lực 3 Trụ Cột (Competency Radar) & Nhận xét phụ huynh
1. **Trụ cột 1:** Độ thành thạo từ vựng (Vocabulary Mastery) - Tỉ lệ %, số từ đã thuộc / đang luyện.
2. **Trụ cột 2:** Phát âm & Bật âm (Pronunciation Coach) - Điểm trung bình AI, mức độ tự tin.
3. **Trụ cột 3:** Nghe hiểu & Phản xạ (Listening & Reaction) - Độ chính xác %, phản xạ nhanh nhạy.
- **Tương tác Sổ liên lạc:** Cả 3 trụ cột được thiết kế 3 dòng ngang cân đối, nhận xét dưới 3 trụ cột được gửi trực tiếp vào Hộp thư / Sổ liên lạc của phụ huynh trên ứng dụng (`POST /api/teacher/parent-notifications`), không còn phụ thuộc nút copy clipboard.
- **Học sinh vắng học:** Nhận xét tự động điền sẵn bài học và Unit bị vắng (VD: "Bé vắng buổi học Bài 2: People at school (Unit 1). Bố mẹ vui lòng cho bé xem tranh và ôn tập 5 phút tại nhà nhé!").

### 2.3. Quản trị Giáo trình & Mẫu câu
- **Giáo trình (`AdminCurriculumPage`):** Cây cấu trúc Sách (Book 1-3) ➔ Unit (1-9) ➔ Thanh chọn bài học Master-Detail. Khi click vào bài nào, bên phải chỉ hiển thị riêng từ vựng và mẫu câu của bài đó, kèm nút kiểm tra xuất bản, bật/tắt và in tranh tô màu.
- **Mẫu câu (`AdminSentencesPage`):** Thư viện tra cứu, tìm kiếm và phân loại câu hỏi/câu trả lời/hội thoại trên toàn hệ thống.
- **In tranh tô màu từ vựng (`PrintLessonCards`):** Hỗ trợ giáo viên và admin in phiếu tô màu khổ A4 cho trẻ mầm non với hình vẽ nét viền đen trắng và chữ tiếng Anh nét rỗng bubble để bé tô màu chữ và hình.

### 2.4. Tối ưu Hiển thị & Triệt tiêu nhảy dòng (Typography & Responsive System)
1. **Thang kích thước chữ nâng cấp siêu lớn, dễ đọc (`staff.css`, `admin.css`, `teacher.css`):**
   - `--staff-body: 1.35rem` (~21.6px ≈ 22px): Chữ to vượt trội, rõ nét, dễ nhìn dù ngồi xa hay dùng máy tính bảng/màn hình tương tác.
   - `--staff-small: 1.2rem` (~19.2px): Chữ phụ, mô tả, nhãn ngày giờ rõ nét như chữ chính trước đây.
   - `--staff-badge: 1.08rem` (~17.3px): Huy hiệu trạng thái, tag, chip to rõ ràng, không bị co dúm.
   - **Thang tiêu đề (Headings):** `h1`: 35–48px (`clamp(2.2rem, 3.2vw, 3rem)`), `h2`: 29.6px (`1.85rem`), `h3`: 24.8px (`1.55rem`), `h4`: 22px (`1.38rem`).
   - **Tailwind class scale up:** Tự động nâng đồng bộ toàn bộ `.text-lg` (24.8px), `.text-xl` (28.8px), `.text-2xl` (34.4px), `.text-3xl` (41.6px), `.text-4xl` (49.6px) để giữ vững phân cấp thị giác khi phóng to chữ nền.
   - **Form controls & Bảng:** `input/select/textarea` cao tối thiểu 56px (`3.5rem`), padding thoáng; nút bấm cao 48–52px; `th` và `td` cỡ 22px với độ tương phản cao.
   - **Sidebar mở rộng:** Sidebar giáo viên mở rộng lên 310px, sidebar admin mở rộng lên 18.5rem (296px) để chứa vừa vặn toàn bộ nhãn điều hướng to rõ trên 1 dòng.
2. **Triệt tiêu hiện tượng chữ nhảy lên xuống dòng:**
   - Thay thế `overflow-wrap: anywhere` bằng `overflow-wrap: break-word; word-break: normal;` để ngăn chặn việc ngắt đôi từ ngữ tiếng Việt/tiếng Anh giữa các chữ cái.
   - Thiết lập `white-space: nowrap` trên toàn bộ nút thao tác (`button`, `a.teacher-button`), huy hiệu trạng thái (`.teacher-status`, `span.rounded-...`), tiêu đề cột bảng (`th`) và danh mục sidebar (`.admin-nav-link`, `.teacher-nav-link`).
   - Khôi phục tính năng `.truncate` và `line-clamp` đơn dòng để tiêu đề dài hiển thị dấu `...` mượt mà, giữ chiều cao các thẻ bài học/lớp học luôn bằng phẳng, không bị đẩy thụt lùi.
   - Tối ưu lưới lịch `AdminSchedulePage`: Chuyển từ cố định 7 cột sang `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7` giúp mỗi cột ngày luôn đạt độ rộng tối thiểu 230px, thẻ ca học hiển thị đầy đủ thông tin không bị chèn ép.

---

## 🧪 3. Kết quả Kiểm thử & Build (Verification)

- **Client TypeScript & Vite Build:** ✅ `tsc -b` thành công 0 lỗi; 2456 modules transformed.
- **Client Unit Tests:** ✅ `73/73 tests passed` (17 test files, 0 failed).
- **Backend Test Suite:** ✅ `193/193 tests passed` (0 failed).

---

## 📝 4. Nhật ký các file đã chỉnh sửa (File Changes)

1. `DEV_SESSION_TRACKING.md`: File tracking tiến độ và kiến trúc admin/teacher.
2. `CLIENT_PARTNER_GUIDE.md`: Hướng dẫn đồng bộ giao diện và dữ liệu cho đối tác Client.
3. `client/src/styles/staff.css`: Thang chữ to rõ, triệt tiêu ngắt từ giữa dòng, cố định badge/button trên 1 dòng.
4. `client/src/styles/admin.css`: Sidebar link và topbar không wrap, tiêu đề thẻ book và phân trang đồng bộ.
5. `client/src/styles/teacher.css`: Sidebar link và profile cô giáo không wrap, nút bấm cố định nhãn.
6. `client/src/dashboards/admin/AdminSchedulePage.tsx`: Lưới lịch tuần responsive 1 - 4 - 7 cột mượt mà, không bị chèn ép thẻ ca học.
7. `client/src/dashboards/teacher/TeacherTeachingSchedule.tsx`: Bỏ banner cố định, giữ lưới thời khóa biểu tuần chuẩn xác.
8. `client/src/components/teacher/StudentCompetencyModal.tsx`: Sửa 3 trụ cột thành 3 dòng ngang đều nhau, nút gửi nhận xét về Sổ liên lạc phụ huynh.
9. `client/src/components/teacher/FamilyReportModal.tsx`: Tự động điền chi tiết bài học và Unit cần ôn cho trẻ vắng buổi học.
10. `KCEnglishKids_BE/src/controllers/classroomSessionController.js`: Bổ sung endpoint `updateStudentAttendance` cập nhật trạng thái điểm danh trong live session.
11. `KCEnglishKids_BE/src/routes/classroomSessionRoutes.js`: Định tuyến `PATCH /api/teacher/classroom-sessions/:id/students/:studentId/attendance`.
12. `client/src/services/api.ts`: Bổ sung phương thức `updateStudentAttendance`.
13. `client/src/dashboards/teacher/LiveSessionPage.tsx`: Thanh công cụ điểm danh tức thì cho học sinh đến trễ trong buổi dạy trực tiếp; loại bỏ toàn bộ hạn chế của `isGapReview` (bỏ chặn cộng sao, khôi phục tương tác dạy mẫu câu và trò chơi tương tác).
14. `client/src/dashboards/admin/AdminLayout.tsx`: Đổi tên navigation thành "Giáo trình" và "Mẫu câu".
15. `client/src/dashboards/admin/AdminCurriculumPage.tsx`: Tinh gọn Master-Detail (click bài nào hiện bài đó), tích hợp nút In tranh tô màu.
16. `client/src/components/teacher/PrintLessonCards.tsx` & `printLessonCards.css`: Nâng cấp in tranh tô màu từ vựng A4 với hiệu ứng outline và chữ rỗng cho trẻ tập tô.
17. `KCEnglishKids_BE/src/services/recognitionRules.js`: Chuẩn hóa xếp hạng vinh danh với `minimumSessions` và tỷ lệ sao.
18. `client/src/dashboards/teacher/TeacherLayout.tsx`: Bỏ mục "Ôn tập lỗ hổng" khỏi điều hướng; đổi tên menu "Giáo trình & Mẫu câu" -> "Giáo trình", "Bài tập & nhận xét" -> "Bài tập".
19. `client/src/dashboards/teacher/TeacherHome.tsx`: Loại bỏ widget ClassGapsPanel và chuyển hướng liên kết giáo án sang trang Giáo trình.
20. `client/src/dashboards/teacher/ClassroomSessionSetup.tsx`: Loại bỏ hoàn toàn logic `isGapReview` và `gapWords` khi thiết lập buổi học.
21. `client/src/dashboards/teacher/TeacherLessonPlanner.tsx` & `client/src/App.tsx`: Tinh gọn route chuyển tiếp an toàn `/teacher/lesson-planner` sang `/teacher/content`.
