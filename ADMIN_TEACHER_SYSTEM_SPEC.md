# Tài liệu Rà soát Hệ thống & Quy tắc Nghiệp vụ — Phân hệ Admin & Giáo viên (KCEnglishKids)

> **Cập nhật lần cuối:** 19/11/2026 (đồng bộ trên nhánh `main`, commit sau rà soát toàn hệ thống)  
> **Múi giờ chuẩn nghiệp vụ:** `Asia/Ho_Chi_Minh` (`UTC+7`), độc lập với múi giờ server.

---

## 1. Kiến trúc tổng quan & Phân quyền (RBAC)

- **3 vai trò hệ thống:** `ADMIN`, `TEACHER`, `CHILD`.
- **Xác thực & Thu hồi phiên:** JWT ký bằng `JWT_SECRET` kết hợp `authVersion` trên `User` (đổi mật khẩu / reset PIN tự động vô hiệu hóa token cũ).
- **Bảo vệ Route:**
  - Tất cả route Admin (`/api/admin/*`) yêu cầu `protect` + `authorize('ADMIN')`.
  - Tất cả route Giáo viên (`/api/teacher/*`, `/api/teacher/classroom-sessions/*`) yêu cầu `protect` + `authorize('TEACHER', 'ADMIN')` và kiểm tra quyền sở hữu lớp/học sinh thông qua `teacherAccess.js`.
  - Route Vinh danh (`/api/recognitions/*`): Giáo viên chỉ truy cập lớp `ACTIVE` mình phụ trách; endpoint `/school` và `/school/publish` chỉ dành cho `ADMIN`.

---

## 2. Phân hệ Quản trị viên (Admin)

### 2.1. Tổng quan & Điều hướng
- **Giao diện:** [AdminLayout.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/client/src/dashboards/admin/AdminLayout.tsx), [AdminDashboardPage.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/client/src/dashboards/admin/AdminDashboardPage.tsx)
- **Chức năng:** Hiển thị KPI toàn trường (sĩ số học sinh, giáo viên, lớp đang hoạt động, số buổi dạy hoàn thành), cảnh báo ca học hôm nay bị `MISSED` hoặc `CANCELLED`, lối tắt đến Quản lý lớp, Thời khóa biểu và Sao lưu dữ liệu.

### 2.2. Quản lý Người dùng (`AdminUsersPage.tsx`)
- **File chính:** [AdminUsersPage.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/client/src/dashboards/admin/AdminUsersPage.tsx), [adminController.js](file:///d:/Dulieu/KLTN/KCEnglishKids/KCEnglishKids_BE/src/controllers/adminController.js), [adminIntegrity.js](file:///d:/Dulieu/KLTN/KCEnglishKids/KCEnglishKids_BE/src/services/adminIntegrity.js)
- **Quy tắc nghiệp vụ:**
  1. **Tài khoản Học sinh (`CHILD`):**
     - `username` chỉ gồm chữ thường không dấu, số, `.`, `-`, `_` và là duy nhất toàn hệ thống.
     - Mã PIN gồm đúng **4 chữ số**, cấm các PIN yếu (`1234`, `0000`, `1111`, ..., `9999`). PIN chỉ hiển thị **1 lần duy nhất** khi cấp mới hoặc reset, không trả hash về client.
  2. **Import danh sách học sinh từ Excel:**
     - Validate toàn bộ các dòng **trước khi ghi bản ghi đầu tiên**; nếu có lỗi dòng nào thì từ chối cả batch.
     - Hỗ trợ `importKey` để chạy lại an toàn (idempotent) và tự động bù trừ (rollback/cleanup) nếu ghi giữa chừng gặp lỗi.
  3. **Tài khoản Giáo viên & Admin:**
     - Không cho phép tự vô hiệu hóa (`INACTIVE`) tài khoản `ADMIN` qua màn hình sửa người dùng.
     - Gán giáo viên cho lớp phải kiểm tra không xung đột với lớp `ACTIVE`/`UPCOMING` khác đang phụ trách.

### 2.3. Quản lý Lớp học & Vòng đời lớp (`AdminClassroomsPage.tsx`)
- **File chính:** [AdminClassroomsPage.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/client/src/dashboards/admin/AdminClassroomsPage.tsx), [classroomRules.js](file:///d:/Dulieu/KLTN/KCEnglishKids/KCEnglishKids_BE/src/services/classroomRules.js), [adminIntegrity.js](file:///d:/Dulieu/KLTN/KCEnglishKids/KCEnglishKids_BE/src/services/adminIntegrity.js)
- **Quy tắc nghiệp vụ:**
  1. **Chuẩn hóa tên lớp:** Chuẩn hóa Unicode NFC, loại bỏ khoảng trắng thừa để tránh trùng tên lớp (`normalizedName` unique index).
  2. **Máy trạng thái lớp học (State Machine):**
     - Hợp lệ: `UPCOMING → ACTIVE → COMPLETED` (hoặc `INACTIVE`).
     - **Chặn** nhảy cóc `UPCOMING → COMPLETED` trực tiếp.
     - **Chặn** mở lại lớp đã `COMPLETED → ACTIVE`.
     - **Chặn** đóng lớp (`COMPLETED`) hoặc đổi giáo viên khi lớp đang có buổi dạy `LIVE` (yêu cầu kết thúc buổi dạy trước, HTTP `409`).
     - Khi chuyển sang `COMPLETED`: tự động giải phóng giáo viên khỏi lớp hiện tại (`assignedClass`), giữ nguyên `teacher` lịch sử trên lớp và gắn `effectiveTo` cho thời khóa biểu để lưu trữ lịch sử.
  3. **Ràng buộc Giáo viên – Lớp (1–1 cho lớp hiện tại):**
     - Index `one_teacher_per_current_class` (partial filter `status: ['ACTIVE', 'UPCOMING']`) đảm bảo mỗi giáo viên chỉ đứng 1 lớp hiện tại cùng lúc.
  4. **Kiểm tra độ tuổi & Sĩ số:**
     - Chỉ nhận học sinh đúng độ tuổi của lớp (`3-4`, `4-5`, `5-6`); chặn thêm học sinh lớn tuổi hơn hoặc nhảy cóc khối tuổi; chặn thêm/xóa học sinh nếu lớp đã `COMPLETED`.
  5. **Lên lớp (`Rollover` / `Promote`):**
     - Chỉ thực hiện được khi lớp nguồn ở trạng thái `COMPLETED` và `isRolledOver !== true`.
     - Chỉ lên đúng 1 bậc tuổi (`3-4 → 4-5`, `4-5 → 5-6`); lớp `5-6` đã tốt nghiệp không thể rollover tiếp.
  6. **Xóa lớp học an toàn:**
     - **Chặn xóa** nếu lớp đã có buổi dạy thực tế (`ClassroomSession`).
     - Với lớp chưa dạy có thể xóa: chỉ **gỡ liên kết học sinh** (`$unset: { assignedClass: 1 }`), **tuyệt đối không xóa tài khoản học sinh**.
  7. **Giao diện chi tiết lớp:**
     - Lớp `COMPLETED`: ẩn phần trạng thái ca dạy hôm nay & thời khóa biểu cố định, chỉ hiển thị **Nhật Ký Các Buổi Dạy Gần Đây**.
     - Lớp `ACTIVE` có ca báo nghỉ hôm nay: hiển thị rõ trạng thái **`🚫 Bài Học Được Bảo Lưu Do Lớp Báo Nghỉ`**.

### 2.4. Quản lý Thời khóa biểu (`AdminSchedulePage.tsx`)
- **File chính:** [AdminSchedulePage.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/client/src/dashboards/admin/AdminSchedulePage.tsx), [scheduleRules.js](file:///d:/Dulieu/KLTN/KCEnglishKids/KCEnglishKids_BE/src/services/scheduleRules.js), [teachingSchedule.ts](file:///d:/Dulieu/KLTN/KCEnglishKids/client/src/utils/teachingSchedule.ts)
- **Quy tắc nghiệp vụ:**
  1. **Kiểm tra hợp lệ khung giờ & thời hạn:**
     - Lịch phải có ít nhất 1 buổi/tuần, giờ định dạng `HH:mm`, `endTime > startTime`, `effectiveTo >= effectiveFrom`.
     - Chặn xếp lịch cho lớp đã `COMPLETED` hoặc `INACTIVE`.
     - Giáo viên trên lịch phải khớp giáo viên đang phụ trách lớp.
  2. **Kiểm tra trùng lịch (Conflict Detection):**
     - Tự động kiểm tra trùng giờ trong cùng lịch và giữa các lịch đang `isActive: true` (có giao khoảng thời gian hiệu lực) theo **3 tiêu chí**: trùng **Giáo viên**, trùng **Lớp học**, hoặc trùng **Phòng học** (không phân biệt hoa thường).
  3. **Giao diện 2 chế độ xem:**
     - **Lịch Tuần:** Lưới 7 ngày (Thứ 2 → CN) theo tuần đang chọn, đánh dấu hôm nay, cảnh báo lớp `MISSED` / `CANCELLED`.
     - **Lịch Theo Lớp:** Thẻ theo từng lớp, hiển thị rõ **`Thứ ... · dd/MM`** (ví dụ `Thứ 5 · 19/11`, badge `Hôm nay`), kèm trạng thái từng ca (`✅ Đã dạy`, `🎯 Dự kiến`, `🚫 Buổi học báo nghỉ` kèm lý do đầy đủ, nút `↩ Hủy báo nghỉ`).
  4. **Nhãn bài học chuẩn:** Cả 2 chế độ hiển thị đầy đủ **`Unit X · Lesson Y: Tên bài`**.

### 2.5. Quản lý Giáo trình, Câu mẫu & Trò chơi
- **Giáo trình (`AdminCurriculumPage.tsx`, `AdminSentencesPage.tsx`):**
  - 3 Quyển Sách (`Book 1: 3-4`, `Book 2: 4-5`, `Book 3: 5-6`), mỗi sách 9+ Unit (`Unit 1..9`, hỗ trợ thêm Unit `10+`), mỗi Unit gồm 4 Lesson chuẩn (`Vocabulary & Phonics`, `Sentence Patterns & Speaking`, `Story/Song & Values`, `Mini Games & Review`).
  - Hỗ trợ soạn Unit/Lesson mới bằng **AI Gemini** (tự động tạo từ vựng, phiên âm IPA và cặp câu giao tiếp không trùng lặp).
  - Không cho phép gắn bài học `INACTIVE` hoặc sai độ tuổi làm `currentLesson` của lớp.
- **Quản lý Trò chơi (`AdminGamesPage.tsx`, `AdminStage3Games.tsx`, `gameCatalog.js`):**
  - Cho phép bật/tắt và sắp xếp thứ tự 12 trò chơi Stage 3.
  - **Bảo vệ độ phủ bài học:** Chặn lưu cấu hình nếu làm bất kỳ bài học `ACTIVE` nào còn **dưới 2 trò chơi khả dụng**.

### 2.6. Báo cáo Phân tích, Vinh danh, Nhật ký & Sao lưu – Phục hồi
- **Báo cáo Phân tích (`AdminAnalyticsPage.tsx`):**
  - Thống kê số buổi dạy hoàn thành trên lớp **độc lập** với số lượt tự học ở nhà của học sinh; tính điểm sao chuẩn theo từng học sinh không cộng dồn khi học sinh làm lại bài.
- **Vinh danh Toàn trường & Lớp (`ClassRecognitionsPage.tsx`, `recognitionController.js`, `recognitionRules.js`):**
  - Ranh giới tuần/tháng luôn tính theo giờ Việt Nam (`UTC+7`).
  - Không công bố vinh danh cho kỳ chưa kết thúc (`period.end > now`) hoặc kỳ chưa có học sinh đạt sao.
  - Công bố là thao tác nguyên tử (1 bản ghi/lớp/kỳ, unique index chống trùng).
- **Nhật ký Hoạt động (`AdminLogsPage.tsx`):** Ghi nhận tự động mọi thao tác tạo/sửa/xóa/lên lớp/backup-restore của Admin qua `AuditLog`.
- **Sao lưu & Phục hồi Dữ liệu (`AdminBackupRestorePage.tsx`, `adminMaintenanceController.js`):**
  - Xuất toàn bộ **38 collections** trên MongoDB ra file JSON Snapshot v2.0 có checksum & metadata phân nhóm.
  - Hỗ trợ **Dry-Run (Kiểm tra trước)** trước khi ghi đè; bảo vệ tài khoản `ADMIN` hiện hành khi khôi phục và tự động ghi `AuditLog`.

---

## 3. Phân hệ Giáo viên (Teacher)

### 3.1. Phạm vi truy cập (Strict Teacher Ownership)
- Giáo viên **chỉ được xem và thao tác** trên lớp `ACTIVE` mình trực tiếp phụ trách (`teacher: req.user._id`):
  - **Thời khóa biểu (`TeacherTeachingSchedule.tsx`):** Chỉ tải lịch lớp mình dạy, tự động khóa vào lớp hiện tại (không có tùy chọn xem tất cả các lớp khác).
  - **Vinh danh (`ClassRecognitionsPage.tsx`):** Chỉ xem bảng xếp hạng và công bố vinh danh cho lớp `ACTIVE` mình đang dạy; không thấy lớp `COMPLETED` cũ hay lớp của giáo viên khác.
  - **Học sinh & Điểm số:** Mọi API từ vựng, ghi chú, báo cáo phụ huynh đều kiểm tra học sinh thuộc lớp giáo viên phụ trách (`403` nếu truy cập chéo lớp).

### 3.2. Thời khóa biểu, Băng chuyền Bài học & Quy tắc Giờ dạy
- **File chính:** [TeacherTeachingSchedule.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/client/src/dashboards/teacher/TeacherTeachingSchedule.tsx), [teachingSchedule.ts](file:///d:/Dulieu/KLTN/KCEnglishKids/client/src/utils/teachingSchedule.ts), [classroomSessionController.js](file:///d:/Dulieu/KLTN/KCEnglishKids/KCEnglishKids_BE/src/controllers/classroomSessionController.js)
- **Quy tắc khung giờ dạy & báo nghỉ:**
  1. **Mở lớp vào dạy (`Vào dạy ca này ngay ➔`):**
     - Chỉ mở từ **15 phút trước giờ bắt đầu** ca học cho đến hết ca (`startTime - 15m <= now <= endTime`, backend `checkTiming` cho phép tối đa `max(start + 20m, end)`).
     - Trước mốc 15 phút này: hiển thị trạng thái `⏳ Ca hôm nay lúc [Giờ] (Mở lớp trước 15 phút)`, chặn `startSession` (`409`).
     - Không hiển thị nút "Xem trước bài học" cho các ca tương lai hay nút "Chuẩn bị buổi dạy" trên thanh đầu trang.
  2. **Báo nghỉ ca học (`Báo nghỉ ca này`):**
     - Chỉ được báo nghỉ cho ngày tương lai, hoặc trong ngày hôm nay nhưng phải **trước giờ bắt đầu ít nhất 30 phút** (`now < startTime - 30m`).
     - Định danh ca học theo cặp **`Ngày | Giờ bắt đầu`** (`YYYY-MM-DD|HH:mm`) để hỗ trợ chính xác trường hợp 1 ngày có nhiều ca học khác khung giờ.
     - Tự động gửi thông báo nghỉ học vào Sổ liên lạc phụ huynh (`ParentNotification`) và **bảo lưu bài học** sang ca hợp lệ kế tiếp.
  3. **Hủy báo nghỉ (`↩ Hủy báo nghỉ`):** Chỉ thực hiện được trước giờ bắt đầu ca học (`now < startTime`).
  4. **Băng chuyền bài học động (`resolveDynamicSlotLesson`):**
     - Quá khứ có buổi `COMPLETED`/`LIVE`: hiển thị đúng bài đã dạy (`✓ Đã dạy`).
     - Quá khứ không có buổi dạy & không báo nghỉ: hiển thị `Chưa tổ chức`, **không tiêu tốn bài** trong lộ trình.
     - Ca `CANCELLED`: giữ nguyên vị trí hàng đợi bài học (`queue[0]`) để tự động chuyển sang ca kế tiếp.
     - Hiện tại & tương lai: gán tuần tự từ bài chưa hoàn thành đầu tiên theo đúng thứ tự `Unit 1..9 → Lesson 1..4` (`Unit X · Lesson Y`).

### 3.3. Lớp học, Điểm danh, Giảng dạy Trực tiếp & Nhật ký Buổi dạy
- **Quản lý lớp & Điểm danh (`TeacherWorkspace.tsx`):**
  - Hiển thị danh sách học sinh sắp xếp theo bảng chữ cái tiếng Việt (`vi`), bảng điểm danh đầy đủ 4 trạng thái (`PRESENT`, `LATE`, `ABSENT`, `EXCUSED`) bắt buộc đủ 100% sĩ số lớp, mở nhanh **Hồ sơ năng lực học sinh** (`StudentCompetencyModal.tsx`).
- **Mở buổi dạy (`ClassroomSessionSetup.tsx`):**
  - Tự động chọn sẵn đúng bài học đề xuất từ băng chuyền Thời khóa biểu (`?lessonId=...`), hoặc tự đề xuất bài chưa hoàn thành kế tiếp theo tiến độ lớp.
- **Giảng dạy trực tiếp (`LiveSessionPage.tsx`) & Kết thúc buổi dạy:**
  - Mỗi lớp / mỗi giáo viên chỉ có tối đa **1 buổi `LIVE`** tại một thời điểm (unique partial index). Buổi `LIVE` treo quá 90 phút tự động đóng khi mở buổi mới.
  - Cộng/trừ sao tối đa `±10` sao/thao tác với `operationId` duy nhất (chống cộng lặp khi mạng lag), không sử dụng `points`, chỉ chấm cho học sinh `PRESENT`/`LATE`.
  - Hỗ trợ `optimisticConcurrency` (`__v` retry) khi nhiều thao tác ghi đồng thời.
  - Khi kết thúc (`endSession`): chọn mức độ hoàn thành (`COMPLETE`, `CONTINUE`, `REVIEW`), tự động tính tổng kết lớp (`summarize`) và cập nhật `completedLessons` + `currentLesson` khi `coverage === 'COMPLETE'`.
- **Nhật ký & Tổng kết buổi dạy (`ClassroomSessionsList.tsx`, `SessionSummaryPage.tsx`):**
  - Hiển thị đầy đủ **`Unit X · Lesson Y`** kèm tên bài học trên cả danh sách (Lưới / Dòng) và trang tổng kết chi tiết.
  - Gửi báo cáo kết quả buổi học đến Sổ liên lạc phụ huynh (`FamilyReportModal.tsx`, hỗ trợ gửi hàng loạt có kiểm tra quyền toàn bộ học sinh trước khi ghi).
- **Thống kê & Dạy mẫu câu (`TeacherInsights.tsx`, `SentenceTeachingPage.tsx`, `UnitObservationPanel.tsx`):**
  - Độ chính xác tính theo `tổng câu đúng / tổng câu đã trả lời` (không lấy trung bình cộng phần trăm).
  - Ghi nhận quan sát năng lực theo Unit (`LearningObservation`) và xuất kế hoạch đồng hành 5 phút cùng phụ huynh (`HomePracticePlan`).

---

## 4. Bản đồ File trọng yếu & Kiểm thử

### 4.1. Thư mục chính
- **Backend Controllers:**
  - `KCEnglishKids_BE/src/controllers/adminController.js`
  - `KCEnglishKids_BE/src/controllers/adminMaintenanceController.js`
  - `KCEnglishKids_BE/src/controllers/teacherController.js`
  - `KCEnglishKids_BE/src/controllers/classroomSessionController.js`
  - `KCEnglishKids_BE/src/controllers/recognitionController.js`
- **Backend Business Rules & Services:**
  - `KCEnglishKids_BE/src/services/adminIntegrity.js`
  - `KCEnglishKids_BE/src/services/classroomRules.js`
  - `KCEnglishKids_BE/src/services/scheduleRules.js`
  - `KCEnglishKids_BE/src/services/teacherAccess.js`
  - `KCEnglishKids_BE/src/services/teacherRules.js`
  - `KCEnglishKids_BE/src/services/recognitionRules.js`
  - `KCEnglishKids_BE/src/services/gameCatalog.js`
- **Frontend Dashboards & Shared Utils:**
  - `client/src/dashboards/admin/*` (14 file)
  - `client/src/dashboards/teacher/*` (16 file)
  - `client/src/dashboards/shared/ClassRecognitionsPage.tsx`
  - `client/src/utils/teachingSchedule.ts`

### 4.2. Lệnh kiểm thử & Build
- **Backend full test suite:** `npm --prefix KCEnglishKids_BE test` (hiện tại **233/233 tests PASS**)
- **Admin integrity & lifecycle tests:** `npm --prefix KCEnglishKids_BE run test:admin`
- **Frontend timetable unit tests:** `npx --prefix client vitest run src/utils/teachingSchedule.test.ts` (**10/10 PASS**)
- **Frontend typecheck & production build:** `npm --prefix client run build` (**0 lỗi TypeScript / Vite**)
- **Khởi tạo lại dữ liệu Demo chuẩn trên MongoDB Atlas:** `node KCEnglishKids_BE/scripts/prepare_demo_atlas.js`
