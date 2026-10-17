# 🚀 KCEnglishKids — KẾ HOẠCH NÂNG CẤP TOÀN DIỆN
## Phân hệ Giáo viên (Teacher) & Quản trị viên (Admin)

> **Ngày tạo:** 2026-10-17  
> **Phiên cập nhật gần nhất:** Phiên #7  
> **Tham chiếu từ:** ClassDojo · Seesaw · Google Classroom · Duolingo for Schools · ABCmouse Teacher Dashboard · Bloomz · Khan Academy Teacher

---

## 🌟 NGUỒN CẢM HỨNG TỪ CÁC ỨNG DỤNG EDTECH HÀNG ĐẦU

| Ứng dụng | Tính năng nổi bật áp dụng |
|:---|:---|
| **ClassDojo** | Hệ thống điểm hành vi thời gian thực, tường lớp (Class Story), nhắn tin phụ huynh có dịch đa ngôn ngữ, badge cảm xúc |
| **Seesaw** | Portfolio học sinh, nhận xét bằng giọng nói/video, hoạt động tương tác giáo viên tạo sẵn, phụ huynh like/comment |
| **Google Classroom** | Stream thông báo, phân loại bài tập theo trạng thái, điểm danh, rubric chấm điểm, tái sử dụng bài cũ |
| **Duolingo for Schools** | Bảng xếp hạng lớp theo tuần, streak (chuỗi ngày học), báo cáo tiến độ chi tiết theo học sinh |
| **Bloomz** | Calendar sự kiện lớp, phân nhóm phụ huynh, nhắc nhở tự động, chia sẻ ảnh/video hoạt động lớp |
| **Khan Academy Teacher** | Báo cáo mastery (thành thạo) từng kỹ năng, phân công bài theo trình độ, xem lại từng bài làm của học sinh |

---

## 📊 ĐÁNH GIÁ TRẠNG THÁI HIỆN TẠI (Phiên #7)

### ✅ Đã hoàn thành tốt
- [x] Bảng khóa biểu phân phối buổi học (GV-01, GV-02)
- [x] Pha "Ôn Cũ Học Mới" với Flashcard từ vựng + mẫu câu bài trước (GV-03)
- [x] Avatar sổ liên lạc + phiếu thông báo học tập cho phụ huynh (GV-04, GV-07)
- [x] Mẫu nhận xét chọn nhanh (GV-05)
- [x] Ghi chú riêng GVCN (GV-06)
- [x] Tự động gán buổi học tiếp theo (Phiên #5)
- [x] Tính điểm đa nguồn: earnedStars + bonusStars + classroomStars (Phiên #6)
- [x] Sổ Quản Lý Lớp Học (Classroom Command Hub) (Phiên #6)
- [x] Học sinh nhóm theo lớp + xếp loại sư phạm (Phiên #6)
- [x] Admin: Tạo lớp, phân công giáo viên, phân bổ học sinh (Phiên #4)
- [x] Lịch giảng dạy tuần & Bản đồ sách giáo trình (Phiên #4)
- [x] Tách module Admin Dashboard & Cấu trúc 7 Tabs + 7 Modals (Phiên #8)
- [x] Quản lý & Khám phá Giáo trình chuyên sâu trong Admin (Books, Units, Lessons, toggle status) (Phiên #8)
- [x] Quản lý người dùng nâng cao: Chỉnh sửa hồ sơ, Đặt lại mã PIN 4 số của bé (Phiên #8)
- [x] Báo cáo Analytics toàn trường cho Admin (Kinh tế điểm sao, hiệu quả từng lớp) (Phiên #8)
- [x] Cấu hình hệ thống System Settings (Thông tin trường, niên khóa, quy tắc sao) (Phiên #8)
- [x] Dashboard Phân tích Học sinh & Bảng Vinh Danh Tuần cho Giáo viên (TeacherAnalyticsTab) (Phiên #8)

### ⚠️ Hạng mục tiếp tục mở rộng theo lộ trình
- [ ] Bảng tin lớp học (Class Story Feed - Phase 3)
- [ ] Nhắn tin trực tiếp 1-1 với phụ huynh (Direct Message - Phase 3)
- [ ] Xuất báo cáo kết quả học tập ra file PDF/Excel per học sinh (Phase 2)

---

## 🗺️ LỘ TRÌNH TRIỂN KHAI (ROADMAP)

PHASE 1 ---- PHASE 2 ---- PHASE 3 ---- PHASE 4
[Ổn định]   [Analytics]  [Giao tiếp]  [Admin Pro]
 1-2 tuần    2-3 tuần     2-3 tuần     3-4 tuần

---

## 📋 PHASE 1 — ỔN ĐỊNH & HOÀN THIỆN CƠ BẢN
> Mục tiêu: Refactor code, đảm bảo không còn lỗi, tối ưu UX.

### P1-T1 · Tách module Teacher Workspace
**Ưu tiên: 🔴 Cao**  
**File hiện tại:** TeacherWorkspace.tsx (~2680 dòng) -> quá lớn, khó bảo trì

```
client/src/dashboards/teacher/
├── TeacherWorkspace.tsx        (Layout + Navigation chỉ)
├── tabs/
│   ├── DashboardTab.tsx        (Bảng điều khiển tổng quan)
│   ├── ClassroomHubTab.tsx     (Sổ Quản Lý Lớp Học)
│   ├── StudentsTab.tsx         (Học sinh theo lớp)
│   ├── AssignmentsTab.tsx      (Bài tập được giao)
│   ├── NotesTab.tsx            (Ghi chú GVCN)
│   └── ContentTab.tsx          (Nội dung học)
└── components/
    ├── StudentCard.tsx
    ├── ClassroomCard.tsx
    ├── QuickReviewModal.tsx
    └── AssignmentCard.tsx
```

**Việc cần làm:**
- [ ] Tách TeacherWorkspace.tsx -> 6 tab component riêng biệt
- [ ] Tạo folder tabs/ và components/ trong teacher dashboard
- [ ] Tối ưu re-render với React.memo và useMemo

---

### P1-T2 · Tách module Admin Dashboard
**Ưu tiên: 🔴 Cao**  
**File hiện tại:** AdminDashboardPage.tsx (~1575 dòng) -> quá lớn

```
admin/src/
├── pages/
│   └── AdminDashboardPage.tsx  (Layout + tab routing chỉ)
└── components/admin/
    ├── OverviewTab.tsx          (Tổng quan hệ thống)
    ├── UsersTab.tsx             (Quản lý người dùng)
    ├── ClassroomsTab.tsx        (Quản lý lớp học)
    ├── CurriculumTab.tsx        (Quản lý giáo trình)
    ├── AuditTab.tsx             (Nhật ký hệ thống)
    └── modals/
        ├── CreateTeacherModal.tsx
        ├── CreateChildModal.tsx
        ├── CreateClassroomModal.tsx
        └── AssignStudentsModal.tsx
```

**Việc cần làm:**
- [x] Tách AdminDashboardPage.tsx -> 7 tab component riêng biệt (Overview, Users, Classrooms, Curriculum, Analytics, Audit, Settings)
- [x] Tạo folder components/admin/ với 7 modals tách riêng
- [x] Thêm toast thông báo thao tác và loading skeleton cho từng tab

---

### P1-T3 · Cải thiện UX Tổng thể
**Ưu tiên: 🟡 Trung bình**

**Việc cần làm:**
- [ ] Thêm Toast notification (thành công/thất bại) nhất quán toàn hệ thống
- [ ] Thêm Loading skeleton (shimmer) khi tải dữ liệu các tab
- [ ] Thêm Empty state illustration đẹp khi chưa có dữ liệu
- [ ] Thêm Confirmation dialog trước khi xóa, khóa tài khoản
- [ ] Responsive mobile cho Teacher Dashboard (hiện chỉ tốt trên desktop)

---

## 📊 PHASE 2 — ANALYTICS & BÁO CÁO THÔNG MINH
> Lấy cảm hứng: Khan Academy Teacher (Mastery reports) + Duolingo for Schools (Streak, Weekly leaderboard)

### P2-T1 · Dashboard Phân tích Học sinh (Student Analytics Dashboard)
**Ưu tiên: 🔴 Cao | Tệp mới:** StudentAnalyticsDashboard.tsx

**Tính năng:**
- [x] Bảng xếp hạng lớp tuần này (Top 5 Leaderboard có huy chương 🥇🥈🥉 và avatar linh vật)
- [x] Streak tracking: Chuỗi ngày học liên tiếp của từng bé (ngọn lửa streak 🔥)
- [x] Nhận diện học sinh cần chú ý: Điểm < 70% hoặc chưa hoàn thành bài để cô động viên
- [x] So sánh điểm trung bình % của từng bé và điểm TB toàn lớp
- [x] Modal gửi nhận xét nhanh kèm thưởng 1–5 ⭐ tới Sổ liên lạc phụ huynh
- [ ] Biểu đồ tiến độ chi tiết theo tuần dạng Line chart
- [ ] Radar chart 5 kỹ năng chuyên sâu

**Backend mới cần:**
```
GET /api/teacher/students/:id/weekly-progress?weeks=8
GET /api/teacher/classrooms/:id/leaderboard
GET /api/teacher/students/:id/skill-breakdown
GET /api/teacher/students/:id/streak
```

---

### P2-T2 · Báo cáo Tiến độ Giáo trình (Curriculum Mastery Report)
**Ưu tiên: 🟠 Khá cao | Inspired by: Khan Academy Mastery**

**Tính năng:**
- [ ] Ma trận Mastery (Bảng học sinh x Bài học): mỗi ô hiển thị màu:
  - Xanh: Thành thạo (>=80%)
  - Vàng: Đang học (50-79%)
  - Đỏ: Chưa đạt (<50%)
  - Xám: Chưa học
- [ ] Xuất báo cáo ma trận này ra Excel/PDF (1 file cho cả lớp)
- [ ] Gợi ý bài ôn tập tự động: bài nào lớp đang yếu nhất -> đề xuất dạy lại

---

### P2-T3 · Báo cáo Định kỳ (Automated Report Cards)
**Ưu tiên: 🟡 Trung bình | Inspired by: Seesaw Portfolio**

**Tính năng:**
- [ ] Phiếu thành tích tháng tự động: tổng hợp điểm, sao, bài hoàn thành, nhận xét giáo viên
- [ ] Xuất phiếu thành tích PDF per học sinh (có logo trường, ảnh avatar bé)
- [ ] Gửi phiếu thành tích qua thông báo phụ huynh trong app
- [ ] So sánh tháng trước / tháng này (% tăng trưởng)

---

## 💬 PHASE 3 — GIAO TIẾP & TƯƠNG TÁC PHỤ HUYNH
> Lấy cảm hứng: ClassDojo (Class Story, Direct Messages) + Bloomz (Events, Photo sharing)

### P3-T1 · Bảng tin Lớp (Class Story / Activity Feed)
**Ưu tiên: 🟠 Khá cao | Inspired by: ClassDojo Class Story**

**Tính năng:**
- [ ] Feed hoạt động lớp (Class Story): Giáo viên đăng ảnh/video buổi học, thông báo, khen thưởng
- [ ] Phụ huynh xem feed của lớp con, có thể Like và Bình luận
- [ ] Tự động tạo post khi: Bé đạt huy hiệu mới · Bé hoàn thành Unit · Tổ chức trò chơi trên lớp
- [ ] Upload ảnh hoạt động lớp học (drag & drop, xem trước trước khi đăng)

---

### P3-T2 · Nhắn tin Trực tiếp (Direct Message Phụ huynh)
**Ưu tiên: 🟡 Trung bình | Inspired by: ClassDojo Messaging**

**Tính năng:**
- [ ] Giáo viên nhắn tin riêng với từng phụ huynh (1-1 messaging)
- [ ] Gửi thông báo nhóm đến toàn bộ phụ huynh của lớp
- [ ] Mẫu tin nhắn nhanh sẵn có
- [ ] Badge thông báo chưa đọc trên sidebar giáo viên

---

### P3-T3 · Sự kiện & Nhắc nhở (Events & Reminders)
**Ưu tiên: 🟢 Thấp | Inspired by: Bloomz**

**Tính năng:**
- [ ] Giáo viên tạo sự kiện lớp: Kiểm tra cuối kỳ, Ngày hội tiếng Anh, Phụ huynh họp...
- [ ] Phụ huynh nhận nhắc nhở trước sự kiện (1 ngày, 3 giờ)
- [ ] Hiển thị mini calendar sự kiện trên sidebar giáo viên
- [ ] Phụ huynh xác nhận tham dự

---

## 🛡️ PHASE 4 — ADMIN PRO: QUẢN TRỊ TOÀN DIỆN
> Lấy cảm hứng: Google Classroom Admin + Canvas LMS Admin

### P4-A1 · Quản lý Giáo trình (Curriculum Management)
**Ưu tiên: 🔴 Cao**

**Tính năng:**
- [x] Khám phá & Quản lý 3 Sách, 27 Unit dạng accordion tương tác
- [x] Xem danh mục bài học theo từng Unit/độ tuổi kèm số từ vựng, số trò chơi, thời lượng
- [x] Bật/tắt hiển thị bài học (Toggle Lesson Status ACTIVE / INACTIVE)
- [ ] Upload ảnh/audio trực tiếp cho từ vựng

---

### P4-A2 · Báo cáo Toàn hệ thống (System-wide Analytics)
**Ưu tiên: 🔴 Cao**

**Tính năng:**
- [x] KPI Board thời gian thực: Tổng học sinh, tổng sao trường, phân bổ sao lớp & sao tự học
- [x] Top performers: Top 5 học sinh nhiều sao nhất toàn trường (avatar, lớp, tổng sao)
- [x] Bảng hiệu quả từng lớp học: Sĩ số, số buổi đã dạy, tổng sao lớp, điểm TB mỗi bé
- [ ] Xuất báo cáo tổng hợp Excel cuối tháng/cuối kỳ

---

### P4-A3 · Quản lý Người dùng Nâng cao
**Ưu tiên: 🟠 Khá cao**

**Tính năng:**
- [x] Reset PIN học sinh 4 chữ số trực tiếp từ Admin Panel
- [x] Chỉnh sửa toàn diện hồ sơ học sinh / giáo viên (Tên, ngày sinh, đổi lớp trực tiếp, số điện thoại)
- [x] Khóa / Mở khóa tài khoản an toàn
- [x] Lọc theo lớp học, vai trò và tìm kiếm tiếng Việt A-Z
- [ ] Nhập hàng loạt (Bulk import) tài khoản học sinh từ Excel

---

### P4-A4 · Nhật ký Hệ thống Nâng cao (Audit Log Pro)
**Ưu tiên: 🟡 Trung bình**

**Tính năng:**
- [x] Ghi vết toàn bộ hành vi: CREATE_USER, UPDATE_USER, RESET_PIN, CREATE_CLASSROOM, UPDATE_CLASSROOM, TOGGLE_LESSON, UPDATE_SETTINGS
- [x] Bộ lọc theo loại sự kiện thao tác
- [x] Tìm kiếm theo người thực hiện, đối tượng hoặc nội dung
- [ ] Export log ra CSV

---

### P4-A5 · Cấu hình Hệ thống (System Settings)
**Ưu tiên: 🟢 Thấp**

**Tính năng:**
- [x] Thông tin trường học: Tên trường, hotline, email liên hệ, địa chỉ
- [x] Năm học hiện tại: Cấu hình niên khóa mặc định (VD: 2026-2027)
- [x] Cấu hình điểm sao: Sao tối đa mỗi game mini (3⭐), sao thưởng mở rương Unit (10⭐)
- [x] Cấu hình mã PIN mặc định cho bé mới (1234)

---

## 🎮 PHASE 5 — GAMIFICATION NÂNG CAO CHO GIÁO VIÊN
> Lấy cảm hứng: Duolingo (Streak, League) + ClassDojo (Behavior points)

### P5-G1 · Hệ thống Điểm Hành vi Thời gian thực (Live Behavior Board)
**Ưu tiên: 🟠 Khá cao | Inspired by: ClassDojo**

**Tính năng:**
- [ ] Trong buổi dạy (LiveSessionPage): Màn hình bảng điểm hành vi chiếu lên TV
- [ ] Giáo viên chạm 1 cái -> cộng điểm hành vi cho bé: Giơ tay phát biểu, Giúp bạn, Trả lời đúng lần đầu
- [ ] Điểm hành vi tự động cộng vào classroomStars của bé
- [ ] Cuối buổi: Tổng kết "Học sinh xuất sắc nhất hôm nay" với hiệu ứng confetti

---

### P5-G2 · Thưởng Huy hiệu Lớp (Class Achievements)
**Ưu tiên: 🟡 Trung bình**

**Tính năng:**
- [ ] Lớp học có thể kiếm huy hiệu tập thể: "Lớp chăm học nhất tuần", "Lớp hoàn thành Unit sớm nhất"
- [ ] Hiển thị tủ huy chương lớp trên ClassStory Feed và trong ClassroomHubTab
- [ ] Khi lớp đạt huy hiệu -> tự động đăng story lên Class Feed

---

### P5-G3 · Cuộc thi Lớp học (Class Challenges)
**Ưu tiên: 🟢 Thấp | Inspired by: Kahoot! Teacher**

**Tính năng:**
- [ ] Giáo viên tạo Thử thách tuần: Bé nào học nhiều bài nhất tuần này sẽ được tặng sticker
- [ ] Tự động reset mỗi tuần (Monday 00:00)
- [ ] Top 3 cuối thử thách nhận sticker/badge độc quyền

---

## 📅 BẢNG PHÂN CÔNG THEO PHIÊN LÀM VIỆC

| Phiên | Mục tiêu chính | Tasks | Ưu tiên |
|:---:|:---|:---|:---:|
| **#7** | Tách module & Refactor | P1-T1, P1-T2, P1-T3 | 🔴 |
| **#8** | Student Analytics Dashboard | P2-T1, P2-T2 | 🔴 |
| **#9** | Curriculum Mastery + Report Cards | P2-T2, P2-T3 | 🟠 |
| **#10** | Admin Curriculum Management | P4-A1 | 🔴 |
| **#11** | Class Story Feed | P3-T1 | 🟠 |
| **#12** | Admin Analytics Board + Bulk Import | P4-A2, P4-A3 | 🟠 |
| **#13** | Live Behavior Board | P5-G1 | 🟠 |
| **#14** | Direct Messaging | P3-T2 | 🟡 |
| **#15** | Class Challenges + Achievements | P5-G2, P5-G3 | 🟡 |
| **#16** | Audit Log Pro + System Settings | P4-A4, P4-A5 | 🟡 |

---

## 🎯 ĐỀ XUẤT BẮT ĐẦU NGAY (Phiên #7)

Dựa trên phân tích, 3 việc quan trọng nhất cần làm NGAY:

### 1️⃣ Tách TeacherWorkspace.tsx -> tabs/
> Tệp 2680 dòng cực kỳ khó bảo trì và sẽ gây lỗi build nếu tiếp tục phình to.

### 2️⃣ Tách AdminDashboardPage.tsx -> components/admin/
> Tương tự, 1575 dòng cần được module hóa trước khi thêm tính năng mới.

### 3️⃣ Student Analytics — Weekly Progress + Leaderboard
> Đây là tính năng giáo viên cần nhất để biết học sinh nào đang tiến bộ, ai đang tụt lại.
> Inspired by Duolingo for Schools.

---

## 📝 GHI CHÚ KỸ THUẬT QUAN TRỌNG

**Bảo mật:**  
API /api/admin/users KHÔNG được trả về passwordHash hoặc pin trong response.

**Thứ tự sort tiếng Việt:**  
Luôn dùng sortByNameVi() từ utils/sortStudents.ts khi sắp xếp danh sách học sinh.

**Single Source of Truth điểm sao:**  
totalStars = earnedStars + bonusStars + classroomStars  
Không tính trùng. Chỉ rewardService.js được phép compute tổng điểm sao.

**Tránh dùng sai property API:**  
parentNotificationApi.sendNotification() dùng stars (không phải starsAwarded).

---

*Tài liệu này được cập nhật sau mỗi phiên làm việc. Xem PROGRESS.md để theo dõi chi tiết tiến độ từng phiên.*
