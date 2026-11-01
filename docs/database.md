# KCEnglishKids Database Models & Relationships

> Cập nhật 01/11/2026: phần danh mục 13 model bên dưới là mô tả nền ban đầu. Hệ thống hiện có 30 model/collection. Xem phần bổ sung và ràng buộc hiện hành ngay dưới đây; đây là quy tắc áp dụng cho phiên bản mới.

## Schema hiện hành

| Nhóm | Model và vai trò |
| --- | --- |
| Giáo trình | AgeGroup, CurriculumBook, CurriculumUnit, Topic: tuổi, sách, Unit, chủ đề và thứ tự. |
| Học liệu | Media, Vocabulary, LanguageContent, Lesson, Activity: ảnh/audio/animation, từ vựng, mẫu câu, bài và câu hỏi hoạt động. |
| Trò chơi sinh từ từ vựng | GameCatalogSetting: singleton STAGE3, bật/tắt và thứ tự 12 mẫu trò; `__v` chống ghi đè. Chưa có bản ghi thì dùng cấu hình xoay mặc định. |
| Tổ chức | User, ClassRoom, Schedule, Attendance: tài khoản, phân công, buổi cố định hàng tuần, khoảng hiệu lực và điểm danh. |
| Giảng dạy | ClassroomSession, Assignment, TeacherNote, ParentNotification: buổi dạy, bài giao với danh sách hoạt động tại lúc giao, nhận xét và báo cáo gia đình. |
| Chứng cứ tự học | LearningSession, ActivityResult, LearningEvent: phiên học, kết quả hoạt động và sự kiện chặng 1/2/3 do backend chấm lại. |
| Tiến bộ | Progress, VocabularyMastery, MasteryEvent: kết quả trẻ–bài, đúng/sai/streak trẻ–từ, sự kiện đồng bộ chống gửi lặp. |
| Quan sát sư phạm | LearningObservation: tình huống thực tế theo trẻ–bài–mục tiêu, mức hỗ trợ, bước tiếp theo, Unit và ảnh/audio riêng tùy chọn. Không tự quy đổi thành sao/năng lực. |
| Khen thưởng | UnitCompletion, ClassRecognition, SchoolRecognition: thưởng Unit một lần, bản chốt vinh danh lớp và trường. |
| Vận hành | AuditLog, SystemSetting: nhật ký và cấu hình nội bộ/thông tin trường. SystemSetting còn dùng dù đã bỏ trang Cài đặt. |

### Một giáo viên – một lớp hiện tại

- Mỗi lớp có một giáo viên; mỗi giáo viên chỉ có một lớp ACTIVE/UPCOMING. Unique partial index `one_teacher_per_current_class` bảo vệ cả ghi đồng thời.
- Lớp COMPLETED/INACTIVE giữ giáo viên và lịch sử. `User.assignedClass` chỉ trỏ đến lớp hiện tại; đóng lớp ngừng lịch tương ứng. Không đóng/bàn giao khi có buổi LIVE.
- Tên `normalizedName` unique toàn bộ lớp: Unicode NFC, bỏ khoảng trắng thừa, không phân biệt hoa/thường. Không tạo lại tên lớp đã kết thúc.
- Một lớp và một giáo viên chỉ có một buổi LIVE, được bảo vệ bằng unique partial indexes. Quyền giáo viên dựa trên quan hệ lớp, không có cờ chủ nhiệm.

### Lịch, tiến độ và chứng cứ

Schedule có nhiều weeklySlots thứ–giờ–phòng, khoảng hiệu lực và bài cố định tùy chọn. Số slot là số buổi/tuần. Bỏ trống bài để nhận đề xuất bài chưa dạy theo Unit/thứ tự; gắn bài cố định để ôn. ClassroomSession mới chụp `teachingGoals` khi mở buổi; khi kết thúc phải có `teachingOutcome.coverage` là COMPLETE/CONTINUE/REVIEW cùng goalsCovered và reflection. Chỉ COMPLETE đủ mục tiêu và có học sinh tham dự mới `$addToSet` bài vào ClassRoom.completedLessons; học lại không tăng số bài hoàn thành. Buổi cũ hoàn thành chưa có outcome giữ cách hiểu lịch sử. Tiến độ tự học của trẻ nằm ở Progress, khác tiến độ dạy lớp.

Độ đúng = tổng đúng / tổng đã trả lời từ ActivityResult hoàn thành + LearningEvent chặng 2/3 + buổi lớp hoàn thành khi có mặt/đến trễ. Không có chứng cứ thì `null`, không suy ra từ sao hoặc điểm cao nhất. LearningEvent/MasteryEvent dùng khóa sự kiện ổn định chống gửi lặp. Sao bài tự học, thưởng Unit, sao lớp và sao nhận xét là các nguồn riêng.

ClassroomSession.studentScores.points/summary.totalPoints giữ để đọc lịch sử. API lớp mới từ chối cộng điểm, giao diện chỉ thưởng sao. Điểm trong ActivityResult vẫn phục vụ chấm và đổi sao tự học. TeacherNote không còn cờ chủ nhiệm.

SchoolRecognition có unique `(kind, periodStart)`; ClassRecognition unique `(classroom, kind, periodStart)`. Vinh danh trường dùng sao/buổi, tối thiểu 2 buổi tuần/4 buổi tháng, không cộng sao khi công bố. Trẻ chỉ đọc phần thưởng của mình. Backup hiện tại 3.3.0 chứa cả hai model và LearningObservation kèm binary Extended JSON; restore tương thích 3.0/3.1/3.2 với collection bổ sung để trống khi bản cũ chưa có.

### Quan sát và minh chứng

LearningObservation có các ref bắt buộc child/classroom/teacher/lesson, session tùy chọn; skill LISTEN_POINT/EXPRESS/PARTICIPATE; level INDEPENDENT/SUPPORTED/EMERGING; evidence và nextStep. unitKey/unitLabel là snapshot nhận diện Unit, chỉ được ghi sau khi kiểm tra bài thuộc Unit. Bảng cuối Unit dùng quan sát mới nhất của từng trẻ theo skill; không lấy sao để suy ra mức hỗ trợ.

Unique `(teacher, operationId)` chống lưu lặp; payloadHash chống dùng lại mã cho nội dung khác. Index child/voidedAt/observedAt phục vụ hồ sơ, classroom/lesson và classroom/unitKey/voidedAt/observedAt phục vụ tổng hợp. Gỡ dùng voidedAt, không xóa cứng hoặc khôi phục qua retry.

Media tối đa 2 MB, chỉ PNG/JPEG/WebP hoặc WebM/OGG/WAV; kiểm tra chữ ký định dạng, yêu cầu consentConfirmed, mặc định không select binary/payloadHash. API tệp có kiểm tra phạm vi trẻ/lớp và `private, no-store`; service worker chỉ giữ học liệu công khai ở /images và /audio. Xóa hẳn lớp/học sinh theo luồng admin xử lý cả quan sát để không để lại ref mồ côi.

### Migration và audit

Chạy từ backend; các lệnh migration và cài học liệu mặc định xem trước, `--apply` mới backup và ghi:

```text
node scripts/migrate_teaching_system.js
node scripts/migrate_lesson_vocabulary.js
node scripts/migrate_early_learning.js
node scripts/install_learning_assets.js
node scripts/audit_database.js --out ../docs/database-audit-request-final-2026-11-01.json
node scripts/audit_vocabulary_images.js
node scripts/verify_teaching_revision.js
node scripts/verify_early_learning.js
```

Đã áp dụng index/tên lớp/phân công, thêm 64 liên kết từ–bài vào 26 bài và ảnh mới, giữ 108 ID bài và lịch sử. [Audit đợt sửa logic giảng dạy](database-audit-request-final-2026-11-01.json): 10.056 tham chiếu/105 đường dẫn, không lỗi tham chiếu, thiếu index hay trùng unique. Một Progress cũ thiếu kết quả chi tiết được giữ trạng thái hoàn thành và ghi INFO; không tạo chứng cứ trả lời giả.

Đợt bổ sung sư phạm đã áp dụng migration LearningObservation. [Audit sau bổ sung](database-audit-early-learning-2026-11-01.json) kiểm tra 30 model và 110 đường dẫn tham chiếu, không có lỗi mới. `verify_early_learning.js` chỉ tạo dữ liệu trong database thử có tên ngẫu nhiên được xác minh trước khi ghi/xóa, không sửa dữ liệu vận hành. Xem [nghiệp vụ và cách sử dụng](early-learning-3-6-2026-11-01.md).

## Mongoose Models Overview

1. **AgeGroup**: `code` ('3-4', '4-5', '5-6'), `name`, `targetAgeMin`, `targetAgeMax`, `maxChoicesPerQuestion`, `defaultQuestionCount`.
2. **CurriculumBook**: `bookNumber` (1, 2, 3), `title`, `ageGroup` (ref `AgeGroup`), `totalUnits` (9).
3. **CurriculumUnit**: `book` (ref `CurriculumBook`), `ageGroupCode`, `unitNumber` (1-9), `bigQuestion`, `values`, `concept`, `sourceType`.
4. **Media**: `type` ('IMAGE', 'AUDIO', 'ANIMATION', 'LOTTIE'), `url`, `mimeType`, `altText`, `transcript`.
5. **Topic**: `englishName`, `vietnameseName`, `slug`, `icon`, `colorCode`, `ageGroupCodes`, `relatedUnits`.
6. **Vocabulary**: `english`, `vietnamese`, `pronunciation`, `imageUrl`, `audioUrl`, `exampleSentence`, `topics`, `sourceUnits`.
7. **Lesson**: `topic` (ref `Topic`), `ageGroupCode`, `title`, `vietnameseTitle`, `learningObjectives`, `vocabularyItems`.
8. **Activity**: `lesson` (ref `Lesson`), `activityType` ('LISTEN_CHOOSE'), `pointsPerQuestion`, `starConfig`, `questions` (embedded schema).
9. **User**: `role` ('ADMIN', 'TEACHER', 'CHILD'), `email`, `password` (bcrypt hashed), `pin` (bcrypt hashed), `avatar`, `avatarUrl`, `ageGroupCode`.
10. **ClassRoom**: `name`, `teacher` (ref `User`), `students` ([ref `User`]), `ageGroupCode`.
11. **LearningSession**: `child` (ref `User`), `lesson` (ref `Lesson`), `status` ('IN_PROGRESS', 'COMPLETED'), `totalScore`, `stars`.
12. **ActivityResult**: `child`, `activity`, `lesson`, `session`, `score`, `stars`, `correctCount`, `incorrectCount`, `answers` ([embedded]).
13. **Progress**: `child`, `topic`, `lesson`, `completed`, `stars`, `highestScore`, `attempts`, `weakVocabulary`.
