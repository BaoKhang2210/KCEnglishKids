# Kiểm tra database KCEnglishKids — 28/10/2026

## Kết luận

Database chưa hoàn chỉnh về tính toàn vẹn dữ liệu. Phần chương trình và bài học có độ phủ tốt: đủ 3 sách, 27 unit, 108 bài học; mỗi unit có 4 bài học, từ vựng, mẫu câu và hoạt động. Tuy nhiên, dữ liệu vận hành còn liên kết đứt, sai vai trò người dùng, một liên kết giáo viên–lớp chưa đồng bộ và một câu hỏi không có đáp án đúng.

Đã đọc trực tiếp database `kcenglishkids` qua `MONGODB_URI` hiện tại, xác nhận kết nối local, lúc khoảng **09:29 ngày 28/10/2026, giờ Việt Nam**. Đây là kết quả cho database đang cấu hình trên máy; không phải chứng nhận cho một bản Atlas khác.

Đã kiểm tra **25 collection, 2.850 bản ghi, 97 đường dẫn tham chiếu và 9.703 lượt tham chiếu có giá trị**. Có **378 lượt tham chiếu đứt trong 106 bản ghi phân biệt**. Một bản ghi có thể chứa nhiều tham chiếu đứt.

Toàn bộ thao tác với database trong đợt kiểm tra là đọc. Chưa sửa/xóa bản ghi, chạy seed hoặc tạo index. Các file mới là công cụ audit, kiểm thử và báo cáo.

## Danh mục collection

| Collection | Bản ghi | Bản ghi có tham chiếu đứt | Ghi chú |
|---|---:|---:|---|
| agegroups | 3 | 0 | Đủ 3 nhóm tuổi |
| curriculumbooks | 3 | 0 | Đủ 3 sách |
| curriculumunits | 27 | 0 | Đủ 9 unit/sách |
| topics | 19 | 0 | Cả 19 thiếu imageUrl riêng |
| vocabularies | 409 | 0 | 24 từ chưa được gắn vào vocabularyItems của bài học |
| languagecontents | 246 | 0 | Tất cả được tham chiếu bởi bài học |
| lessons | 108 | 0 | 4 bài/unit, có từ vựng, mẫu câu và hoạt động |
| activities | 306 | 0 | Một câu IMAGE_WORD_MATCH không có lựa chọn đúng |
| media | 1.227 | 0 | 409 IMAGE, 409 AUDIO, 409 ANIMATION placeholder |
| users | 100 | 0 | Thiếu unique sparse index importKey |
| classrooms | 2 | 0 | Một giáo viên thiếu assignedClass tương ứng; thiếu unique index |
| learningsessions | 13 | 0 | Không phát hiện sai liên kết hoạt động–bài học |
| activityresults | 30 | 0 | Liên kết học sinh–phiên–bài–hoạt động khớp |
| progresses | 13 | 0 | Một completed chưa đủ kết quả hoạt động hiện tại |
| unitcompletions | 2 | 0 | Khớp tiến độ các bài hiện tại trong unit |
| auditlogs | 32 | 0 | user tồn tại; targetId lịch sử không phải foreign key bắt buộc |
| assignments | 2 | 0 | Thiếu 2 index truy vấn |
| teachernotes | 7 | 1 | Một ghi chú mất cả teacher và student |
| classroomsessions | 26 | 6 | Tham chiếu lịch sử đứt; thêm một phiên khác chứa hoạt động sai bài |
| vocabularymasteries | 99 | 40 | Thêm 11 bản ghi student trỏ đến tài khoản không phải CHILD |
| parentnotifications | 169 | 59 | Mất teacher/child; thiếu unique index sourceKey |
| systemsettings | 1 | 0 | updatedBy hợp lệ |
| attendances | 3 | 0 | Tham chiếu lớp, giáo viên, học sinh hợp lệ |
| schedules | 3 | 0 | Tham chiếu hợp lệ; không phát hiện lệch giáo viên ở lịch đang hoạt động |
| classrecognitions | 0 | 0 | Collection đã có, chưa có dữ liệu; không coi rỗng là lỗi |

Không có collection nào nằm ngoài các model đã đăng ký trong công cụ audit, bao gồm ClassRecognition được nạp riêng. Không phát hiện vi phạm schema khi hydrate và validate bằng model hiện tại, tham chiếu lưu sai kiểu BSON, hoặc nhóm khóa trùng theo các unique index khai báo. Việc validate có áp dụng default của Mongoose; không tương đương với kiểm tra mọi trường bắt buộc ở mức MongoDB server.

## Các lỗi cần xử lý

### 1. Dữ liệu lịch sử có liên kết đứt

| Model / đường dẫn | Lượt tham chiếu đứt | Bản ghi bị ảnh hưởng |
|---|---:|---:|
| TeacherNote.teacher | 1 | 1 |
| TeacherNote.student | 1 | 1 |
| ClassroomSession.classroom | 6 | 6 |
| ClassroomSession.teacher | 5 | 5 |
| ClassroomSession.lesson | 5 | 5 |
| ClassroomSession.activities | 11 | 5 |
| ClassroomSession.studentScores.student | 62 | 5 |
| ClassroomSession.questionResults.activityId | 5 | 3 |
| ClassroomSession.questionResults.studentAnswers.student | 44 | 3 |
| ClassroomSession.summary.topPerformers | 11 | 4 |
| ClassroomSession.summary.studentsNeedingPractice | 31 | 2 |
| VocabularyMastery.student | 38 | 38 |
| VocabularyMastery.vocabulary | 40 | 40 |
| ParentNotification.teacher | 59 | 59 |
| ParentNotification.child | 59 | 59 |

Ảnh hưởng: populate có thể trả null hoặc bỏ phần tử đã mất; lịch sử, báo cáo tiến bộ, sổ liên lạc và thống kê có thể thiếu thông tin. Một số trang vẫn trả HTTP 200 dù dữ liệu liên kết đã hỏng.

**Nguyên nhân có thể tái tạo từ mã nguồn:** `src/seeds/index.js:134` xóa và tạo lại User, ClassRoom, Vocabulary, Lesson, Activity… nhưng không dọn đồng bộ các collection vận hành mới. Chính script này lại tạo thêm VocabularyMastery, ClassroomSession và ParentNotification ở cuối. Khi chạy lại, các ObjectId cũ trong dữ liệu được giữ lại sẽ mất đích tham chiếu. Đây là cơ chế có thể gây ra tình trạng hiện tại; không có bằng chứng để khẳng định nguồn gốc của từng bản ghi lịch sử.

Xử lý đề xuất: backup BSON đầy đủ, phân loại dữ liệu demo/dữ liệu cần giữ, khôi phục liên kết từ backup hoặc khóa định danh đáng tin cậy. Những dòng không thể phục hồi cần được lưu trữ riêng hoặc xử lý sau khi xác định chính sách giữ lịch sử. Không ghép lại dựa vào tên học sinh/giáo viên một cách suy đoán.

### 2. Có 11 VocabularyMastery gắn vào người dùng không phải học sinh

Tham chiếu tồn tại nhưng sai vai trò đối với trường `student`. Đây là lỗi khác với 40 bản ghi mastery bị mất đích tham chiếu.

`src/controllers/vocabMasteryController.js:48` và `:119` kiểm tra định dạng ObjectId, nhưng chưa xác nhận đầy đủ rằng childId là tài khoản CHILD đang hoạt động và vocabularyId thực sự tồn tại trước khi upsert. `ownChildOr403` giới hạn học sinh vào ID của chính mình nhưng cho phép tài khoản nhân viên đi tiếp; điều đó không thay thế kiểm tra vai trò của bản ghi đích.

Cần kiểm tra thực thể đích và quyền quản lý trước mọi lần ghi, bao gồm bulk sync từ localStorage. UUID/ObjectId có hình thức hợp lệ không chứng minh bản ghi tồn tại.

### 3. Một câu hỏi không thể trả lời đúng

Activity `6abf80d54ab71c28dd99acea`, loại IMAGE_WORD_MATCH, bài Pet Animals. Câu thứ tư hỏi **fish**, nhưng options chỉ có **dog, cat, rabbit**; cả ba có `isCorrect: false`.

Lỗi cũng tồn tại trong seed: `src/seeds/activityData.js:128` lấy 4 từ làm câu hỏi nhưng `:154` luôn lấy 3 từ đầu làm options. Cần xây options từ chính từ đích cộng từ gây nhiễu, rồi sửa riêng câu hỏi đã lưu. Chạy seed lại sẽ tái tạo lỗi và có thể làm đứt thêm dữ liệu lịch sử.

### 4. Một lớp chưa đồng bộ giáo viên ở hai chiều

ClassRoom `6ad5c47042e6c6ca87124fad` đang ACTIVE, có teacher `6ad5c85742e6c6ca871250de`, nhưng tài khoản giáo viên này chưa có assignedClass tương ứng. Hướng ClassRoom.teacher hợp lệ; hướng User.assignedClass còn thiếu.

Cần đồng bộ bằng quy tắc phân công hiện tại sau khi xác nhận không có lớp xung đột; giữ một nguồn phân công chính và cập nhật chiều còn lại trong cùng quy trình.

### 5. Một phiên lớp học chứa hoạt động của bài khác

ClassroomSession `6ad3164994e6677d67c4811b` đã COMPLETED. Ba hoạt động trong danh sách thuộc lesson `6abf80d54ab71c28dd99aa84`, trong khi lesson của phiên là `6abf80d54ab71c28dd99aa85`.

Controller hiện đã kiểm tra hoạt động thuộc lesson khi chuẩn bị/bắt đầu buổi dạy. Bản ghi cũ cần được xem xét riêng; có thể là một buổi ghép nội dung trước khi quy tắc này được áp dụng. Không đổi bài của lịch sử một cách tự động.

### 6. Một Progress completed chưa có đủ ActivityResult hiện tại

Đây là cảnh báo cần đối chiếu lịch sử, không kết luận gian lận hay tự đặt completed=false. Có thể nội dung bài đã thay đổi sau thời điểm hoàn thành. Nên bổ sung phiên bản nội dung hoặc snapshot tập hoạt động cần hoàn thành để việc tính tiến độ/sao về sau có căn cứ ổn định.

### 7. 24 từ chưa nằm trong danh sách từ vựng của bài học

Bao gồm blue, yellow, green, pink, purple, brown, black, white, gray, rainbow; các số one đến twelve, twenty; và count. Các từ này vẫn có trong kho từ và có thể được trò chơi dùng qua cơ chế riêng. Tuy nhiên, chúng chưa xuất hiện trong `Lesson.vocabularyItems`, nên không bảo đảm trẻ được khám phá chúng qua luồng flashcard của bài.

Cần quyết định gắn vào bài màu sắc/số đếm phù hợp hoặc đánh dấu rõ là nội dung bổ trợ. Không coi mọi từ dự phòng là lỗi liên kết.

## 7 index thiếu so với schema

| Collection | Index | Ràng buộc / mục đích |
|---|---|---|
| users | importKey: 1 | unique + sparse, chống import trùng |
| classrooms | teacher: 1 | unique với status ACTIVE/UPCOMING/COMPLETED; tên one_teacher_per_active_class |
| assignments | teacher: 1, classRoom: 1, createdAt: -1 | Truy vấn bài giao |
| assignments | reviews.child: 1 | Truy vấn nhận xét học sinh |
| classroomsessions | classroom: 1 | unique khi status=LIVE |
| classroomsessions | teacher: 1 | unique khi status=LIVE |
| parentnotifications | sourceKey: 1 | unique khi sourceKey có kiểu string |

Trong đó **5 unique index** bảo vệ quy tắc nghiệp vụ. Chưa phát hiện dữ liệu vi phạm các khóa unique này ở lần đọc hiện tại. Cần migration tạo đúng index sau khi kiểm tra lại dữ liệu và các index đang có; không gọi syncIndexes tùy tiện vì có thể xóa index khác. Code khai báo unique không chứng minh database đang có index đó.

## Kiểm tra luồng đọc và bộ test

- **419/419 GET thành công** qua Express hiện tại và database thật: danh sách topic, vocabulary; curriculum-path cho 3 nhóm tuổi; toàn bộ 108 chi tiết bài học và 306 chi tiết hoạt động.
- Mỗi nhóm tuổi trả 9 unit và 36 bài học.
- **95/95 test backend** đạt, gồm 6 test mới cho công cụ audit.
- **37/37 test frontend** đạt; TypeScript typecheck đạt.
- Kiểm tra các file seed riêng lẻ: đủ 3 tuổi, 3 sách, 27 unit, 19 topic, 409 từ, 108 bài; không có unit/topic/từ được bài seed tham chiếu mà không tồn tại trong seed tương ứng. Seed hiện có 243 LanguageContent; database có 246, chênh lệch này tự thân không phải lỗi.

GET thành công xác nhận đường đọc hoạt động, không xác nhận nội dung câu hỏi đúng hoặc dữ liệu lịch sử toàn vẹn. Không kiểm thử thao tác ghi trên dữ liệu thật và không kiểm chứng khả năng khôi phục backup thực tế trong đợt audit này.

## Thứ tự xử lý đề xuất

1. Backup đầy đủ; sửa câu hỏi fish và quy tắc sinh options.
2. Thêm kiểm tra thực thể/role trước khi ghi VocabularyMastery; chặn việc seed reset không đồng bộ trên database có lịch sử cần giữ.
3. Đối chiếu 106 bản ghi có liên kết đứt và 11 mastery sai role; lập migration có dry-run và log các ObjectId bị tác động.
4. Đồng bộ một phân công giáo viên; kiểm tra hai bản ghi lịch sử bất nhất về bài/tiến độ.
5. Tạo 7 index thiếu, kiểm tra lại toàn bộ audit.
6. Hoàn thiện phân bổ màu sắc/số đếm và triển khai thư viện hình theo [kế hoạch hình ảnh](image-assets-plan-2026-10-28.md).

## Chạy lại

Từ thư mục `KCEnglishKids_BE`:

```powershell
node scripts/audit_database.js --out ../docs/database-audit-data-2026-10-28.json
node --test tests/databaseAudit.test.js
```

Script tắt autoCreate/autoIndex, chỉ dùng MONGODB_URI, không tự chuyển sang database dự phòng. Mã thoát 0: không có lỗi nghiêm trọng theo các kiểm tra hiện tại; 2: phát hiện lỗi dữ liệu hoặc thiếu unique index; 1: audit không hoàn tất. Công cụ đọc tuần tự toàn bộ dữ liệu vào bộ nhớ, phù hợp quy mô hiện tại; khi dữ liệu tăng lớn cần chuyển sang cursor/batch và chạy trong khoảng ít ghi dữ liệu.

Chi tiết số liệu và ObjectId mẫu nằm trong [database-audit-data-2026-10-28.json](database-audit-data-2026-10-28.json). Kết quả GET nằm trong [database-api-smoke-2026-10-28.json](database-api-smoke-2026-10-28.json). Báo cáo không xuất mật khẩu, PIN, chuỗi kết nối, tên hay liên hệ của học sinh.
