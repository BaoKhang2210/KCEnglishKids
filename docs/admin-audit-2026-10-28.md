# Rà soát chức năng Admin — 28/10/2026

> Đã có đợt sửa theo báo cáo này. Xem [đối chiếu 21 mục, thay đổi giao diện và hướng dẫn kiểm thử](admin-fixes-2026-10-28.md). Nội dung bên dưới giữ lại kết quả rà soát trước khi sửa.

## Kết luận và phạm vi

Admin đã có các nhóm chức năng chính, nhưng **chưa thể coi là hoàn thiện để vận hành với dữ liệu thật**. Các vấn đề ưu tiên liên quan đến mất cấu hình trò chơi, tính nhất quán phân lớp/phân công, dữ liệu báo cáo không đúng, lộ thông tin qua API công khai và bản sao lưu chưa đủ để khôi phục hệ thống.

Đây là đánh giá mã nguồn hiện có trong working tree, gồm cả thay đổi chưa commit. Chưa có danh sách yêu cầu nghiệm thu chính thức, nên “đầy đủ” ở đây được đối chiếu với màn hình, API và quy tắc thể hiện trong code. Không đồng nghĩa đã kiểm chứng mọi nghiệp vụ trên database thật.

Lần rà soát này không sửa code chức năng. Chỉ bổ sung báo cáo này; các bản sửa backup và sidebar từ yêu cầu trước vẫn giữ nguyên.

Phương pháp:

- Đọc toàn bộ các handler trong `adminController.js`, router admin, model liên quan, API client và logic các trang admin; đối chiếu thêm auth, learning, reward và recognition.
- Chạy request HTTP trên Express cục bộ với model giả lập để kiểm tra phân quyền. Không kết nối hoặc thay đổi database thật.
- Tái hiện 11 tình huống lỗi bằng controller/model thật và thao tác lưu/đọc giả lập. Các tình huống này kiểm tra nhánh logic, không chứng minh hành vi transaction/index trên MongoDB thật.
- Kiểm tra hook băm PIN bằng User model thật với dữ liệu tổng hợp.
- Chạy các bộ kiểm tra hiện có và production build.

## Danh mục chức năng hiện tại

| Nhóm | Đã có | Đánh giá |
|---|---|---|
| Đăng nhập, phiên, phân quyền | Đăng nhập admin, lấy hồ sơ, đăng xuất phía client, guard màn hình và API | Có nền tảng; cần xem rủi ro cấu hình và API công khai bên dưới |
| Tổng quan | KPI học sinh, giáo viên, giáo trình, hoạt động, phiên học, kết quả gần đây | Có; số liệu phiên tự học khác với buổi học trên lớp |
| Lớp học | Tạo/sửa/xóa lớp, phân công giáo viên, lọc, sĩ số | Có; nhiều luồng không đồng bộ quan hệ |
| Học sinh trong lớp | Thêm có sẵn, chuyển/gỡ, tạo lẻ, nhập Excel, xuất CSV, file mẫu | Có; lỗi PIN, phân trang và ghi dữ liệu dở dang |
| Tiến độ lớp | Xem giáo trình tuần tự, đặt bài hiện tại, đọc buổi đã dạy | Có; kiểm tra bài/độ tuổi chưa chặt |
| Thời khóa biểu | Tạo/sửa/xóa, lịch tuần/danh sách, giáo viên, phòng, bài học, bật/tắt | Có; thiếu kiểm tra thời gian, trùng lịch và đồng bộ khi đổi giáo viên |
| Vinh danh | Xem tuần/tháng, đồng hạng, công bố, thông báo cho bé | Có; 12 bài kiểm tra rules/API hiện có đạt, chưa chạy với DB thật |
| Giáo trình | Xem sách/Unit/bài; thêm/sửa/xóa Unit, bài, từ vựng, mẫu câu | Có; xóa mềm bài học chưa có luồng xử lý trọn vẹn |
| Thư viện mẫu câu | Lọc theo sách/Unit/bài/loại, tìm kiếm, CRUD, TTS | Có; chỉ lấy trang đầu tối đa 100 câu |
| Kho trò chơi | 18 loại trong danh mục, lọc, phân trang, CRUD, bật/tắt, chơi thử | Có; chỉnh sửa có thể phá cấu hình câu hỏi |
| Tài khoản | Tạo giáo viên/học sinh, sửa, khóa/mở, hủy kích hoạt, reset PIN | Có; tạo học sinh bỏ qua username; phân công giáo viên có đường bỏ qua quy tắc |
| Hồ sơ năng lực từ tài khoản | Có nút mở modal | Chưa nối dữ liệu thật, hiển thị fallback mẫu |
| Phân tích | Tổng sao, top học sinh, số liệu lớp | Có; công thức sao không nhất quán với hệ thống thưởng |
| Nhật ký | Lọc, phân trang, xem JSON, copy, xuất Excel | Có; thiếu log nhiều thao tác và xuất bị cắt dữ liệu |
| Sao lưu | Tải JSON từ trang lớp học; lỗi thiếu Attendance đã sửa trước đó | Tải được trong kiểm tra giả lập; chưa phải backup đủ để khôi phục |
| Cài đặt | Có component và GET/PUT API | `/admin/settings` chuyển về dashboard; cấu hình không được dùng trong nghiệp vụ |

## Các vấn đề ưu tiên cao — P1

### ADM-01 — API thống kê công khai trả thông tin học sinh

- **Bằng chứng:** `KCEnglishKids_BE/src/routes/adminRoutes.js:148` nối `/public-stats` trực tiếp tới `getDashboardStats`, không có `protect`. Handler tại `src/controllers/adminController.js:35` trả `recentResults`, populate tên/avatar học sinh và bài học/hoạt động.
- **Tác động:** Người không đăng nhập có thể đọc kết quả học và định danh học sinh có trong phản hồi.
- **Xác minh:** Đã tái hiện bằng HTTP không có token; nhận 200 và tên học sinh tổng hợp trong `recentResults`.
- **Tự thử:** Mở `GET /api/admin/public-stats` trong cửa sổ chưa đăng nhập; kiểm tra phần `data.recentResults`. Kỳ vọng API công khai chỉ có số tổng hợp đã được chủ động cho phép, hoặc phải yêu cầu đăng nhập.

### ADM-02 — Sửa rồi lưu trò chơi làm mất cấu hình đang có

- **Bằng chứng:** `client/src/dashboards/admin/AdminGamesPage.tsx:412` dựng lại câu hỏi khi mở form nhưng bỏ `metadata`, `vocabulary`, và `options.audioUrl`. `KCEnglishKids_BE/src/controllers/adminController.js:3053` thay toàn bộ mảng câu hỏi, đặt các trường thiếu thành `{}`, `null`, chuỗi rỗng.
- **Tác động:** Chỉ sửa tên rồi lưu cũng có thể làm mất số lượng đếm, cấu hình vật thể/âm thanh và liên kết từ vựng; trò chơi hoặc ghi nhận học từ vựng bị sai.
- **Xác minh:** Đã tái hiện controller với payload đúng hình dạng form; cả ba trường bị xóa/reset.
- **Tự thử:** Dùng một trò đếm hoặc trí nhớ có `metadata`; lưu lại JSON trước, chỉ sửa tiêu đề trong admin, lưu rồi so sánh câu hỏi và chơi lại.

### ADM-03 — Xóa lớp báo thành công nhưng bỏ sót thời khóa biểu và dữ liệu liên quan

- **Bằng chứng:** `KCEnglishKids_BE/src/controllers/adminController.js:899`, đặc biệt dòng 923 dùng `mongoose.models.Schedule` nhưng không import `mongoose`. Lỗi bị catch rồi tiếp tục xóa lớp và báo thành công. Quá trình xóa gồm nhiều lệnh, không có transaction; không xử lý các bản ghi như Progress, ActivityResult, Assignment, TeacherNote, UnitCompletion, VocabularyMastery, ParentNotification, ClassRecognition của dữ liệu đã xóa.
- **Tác động:** Còn lịch tham chiếu lớp đã mất, dữ liệu học mồ côi và báo cáo sai; khi một bước thất bại có thể chỉ xóa một phần dữ liệu. Việc xóa vĩnh viễn học sinh là hành vi đã được UI thông báo, nhưng phần dọn dữ liệu không hoàn chỉnh.
- **Xác minh:** Đã tái hiện: handler báo 200, có cảnh báo `mongoose is not defined`, `Schedule.deleteMany` không chạy.
- **Tự thử:** Chỉ dùng lớp tạm có học sinh/lịch/dữ liệu học giả; xóa rồi kiểm tra lịch và các collection tham chiếu. Không dùng lớp đang vận hành cho thử nghiệm này.

### ADM-04 — Nhập Excel có thể tạo dở tài khoản rồi trả lỗi

- **Bằng chứng:** Helper tại `KCEnglishKids_BE/src/controllers/adminController.js:496` lưu từng User; các hàm nhập chỉ cập nhật `ClassRoom.students` sau khi helper hoàn tất. Không rollback hoặc bắt lỗi lưu riêng cho từng dòng. Tạo lớp kèm Excel cũng đã lưu lớp trước khi nhập.
- **Tác động:** Nếu dòng sau lỗi, các tài khoản trước vẫn tồn tại, có thể có `assignedClass` nhưng chưa nằm trong danh sách lớp. Người dùng thử nhập lại dễ tạo thêm bản sao vì helper luôn sinh username mới, không nhận diện lại học sinh đã nhập.
- **Xác minh:** Giả lập lỗi lưu ở dòng 2: dòng 1 đã lưu, lớp chưa được cập nhật, toàn request trả lỗi.
- **Tự thử:** Trên dữ liệu kiểm thử, mô phỏng lỗi ghi giữa batch; đối chiếu số tài khoản, danh sách lớp và lần nhập lại. Định dạng Excel sai bị frontend loại trước không nhất thiết tái hiện được nhánh này.

### ADM-05 — Tạo học sinh từ trang tài khoản bỏ qua mã đăng nhập

- **Bằng chứng:** UI tại `client/src/dashboards/admin/AdminUsersPage.tsx:805` cho nhập username, ghi “Để trống tự động tạo”. `KCEnglishKids_BE/src/controllers/adminController.js:228` không nhận/lưu username và cũng không sinh tự động.
- **Tác động:** Đăng nhập bằng mã vừa nhập không hoạt động; bỏ trống cũng không nhận được mã tự sinh như lời hứa của form. Đăng nhập qua các định danh khác có thể vẫn hoạt động.
- **Xác minh:** Đã tái hiện tạo học sinh với username; phản hồi User không có username.
- **Tự thử:** Tạo học sinh với một mã mới, kiểm tra cột mã và đăng nhập bằng mã + PIN; thử thêm trường hợp bỏ trống mã.

### ADM-06 — Hồ sơ năng lực hiển thị dữ liệu mẫu như kết quả thật

- **Bằng chứng:** `client/src/dashboards/admin/AdminUsersPage.tsx:1268` chỉ truyền User và `user.stats`, không gọi API báo cáo. `getUsers` không trả stats. `client/src/components/teacher/StudentCompetencyModal.tsx:43` fallback thành 18 từ đã gặp, 12 từ thành thạo, nghe 85%, phát âm 88%, từ vựng và nhận xét mẫu.
- **Tác động:** Admin có thể hiểu nhầm và sao chép báo cáo không có cơ sở gửi phụ huynh.
- **Xác minh:** Xác nhận trực tiếp đường truyền dữ liệu và fallback trong code.
- **Tự thử:** Tạo học sinh chưa học lần nào, mở biểu tượng não ở trang tài khoản. Kỳ vọng không có số thành thạo/điểm phát âm trước khi có dữ liệu đo.

### ADM-07 — Quy tắc giáo viên–lớp và lịch dạy không được đồng bộ giữa các luồng

- **Bằng chứng:** `createClassroom`/`updateClassroom`/`assignTeacherToClassroom` có kiểm tra một giáo viên một lớp. Nhưng `createTeacher` tại `adminController.js:200` và nhánh giáo viên của `updateUser` tại dòng 1050 ghi thẳng `ClassRoom.teacher`, không kiểm tra xung đột. Tạo/sửa lớp không đồng bộ đầy đủ `User.assignedClass`; đổi giáo viên không cập nhật `Schedule.teacher`; luồng assign riêng cũng không gỡ `assignedClass` của giáo viên cũ.
- **Tác động:** Có thể một giáo viên phụ trách nhiều lớp, lớp bị thay giáo viên ngoài ý muốn, trang tài khoản báo chưa xếp lớp dù đã có lớp. Lịch vẫn thuộc giáo viên cũ sau khi lớp đổi người phụ trách.
- **Xác minh:** Đã tái hiện nhánh `updateUser` ghi giáo viên vào lớp mới mà không chạy kiểm tra xung đột; các nhánh còn lại xác nhận qua mã.
- **Tự thử:** Tạo lớp A cho GV1, B cho GV2; sửa GV1 ở trang tài khoản để chọn B. Đối chiếu hai lớp, hồ sơ cả hai giáo viên và thời khóa biểu sau thay đổi. Thử thêm tạo lớp từ trang lớp rồi xem cột phân lớp ở tài khoản giáo viên.

### ADM-08 — Một số API phân lớp có thể làm hai phía quan hệ không khớp

- **Bằng chứng:** `adminController.js:960` thay toàn bộ `classroom.students` nhưng không xóa học sinh khỏi lớp cũ, không giải phóng học sinh bị bỏ khỏi danh sách và không kiểm tra role CHILD. `updateUser:1025` coi việc không gửi `assignedClass` là yêu cầu gỡ lớp. `removeStudentFromClassroom:2282` xóa `assignedClass` theo ID học sinh mà không kiểm tra học sinh đang thuộc lớp nào.
- **Tác động:** Một học sinh xuất hiện ở nhiều lớp; danh sách lớp và hồ sơ học sinh lệch nhau. Request gỡ từ màn hình cũ có thể xóa liên kết với lớp mới. Luồng thêm học sinh có sẵn hiện tại dùng API khác, đã có dọn lớp cũ, nên không phải mọi thao tác trên UI đều gặp lỗi này.
- **Xác minh:** Đã tái hiện cả ba nhánh bằng model/controller giả lập.
- **Tự thử:** Qua API, gửi `PUT /api/admin/users/:id` chỉ có `{ "name": "Tên mới" }` cho học sinh đang có lớp. Sau đó kiểm tra lớp. Với gỡ lớp: mở lớp A, chuyển bé sang B ở tab khác, quay lại tab A và gỡ. Với bulk assign: đối chiếu cả hai lớp sau chuyển danh sách.

### ADM-09 — Tổng sao và xếp hạng admin không cùng công thức với tài khoản học sinh

- **Bằng chứng:** `adminController.js:1309` cộng tất cả `ActivityResult.stars`, gồm các lần chơi lại, và cộng thưởng Unit. Trong khi `services/rewardService.js:133` tính sao từ kết quả tốt nhất theo bài đã hoàn thành + thưởng Unit + sao lớp. Analytics cũng lấy ClassroomSession không lọc hoàn thành.
- **Tác động:** Chơi lại làm tăng tổng sao admin dù số sao thực của bé không tăng tương ứng; bảng top và tổng lớp có thể sai. Số “phiên đã dạy” cũng đang đếm mọi trạng thái.
- **Xác minh:** Đã tái hiện 2 kết quả 3 sao của cùng học sinh được cộng thành 6 sao trong analytics.
- **Tự thử:** Dùng bé chỉ có một bài/trò; ghi số sao ở tài khoản bé và admin, chơi lại cùng trò rồi đối chiếu. Kiểm tra thêm phiên lớp đang chạy so với phiên đã kết thúc.

### ADM-10 — “Full System Backup” thiếu dữ liệu để khôi phục đầy đủ

- **Bằng chứng:** `adminController.js:3334` chỉ xuất 14 nhóm, bỏ qua AgeGroup, Media, LearningSession, ActivityResult, Progress, Assignment, TeacherNote, VocabularyMastery, ParentNotification, UnitCompletion, ClassRecognition. User loại `password`; AuditLog giới hạn 1.000. Không thấy luồng restore tương ứng trong routes/client.
- **Tác động:** File tải về chưa đủ để phục hồi tài khoản giáo viên/admin, lịch sử học, tiến độ, thưởng và các quan hệ liên quan. Sửa lỗi tải file ở lượt trước chưa giải quyết tính đầy đủ này.
- **Xác minh:** Đối chiếu danh sách export với model và routes; không thực hiện khôi phục database.
- **Tự thử:** Mở JSON tải xuống và đối chiếu với những nhóm dữ liệu trên. Chỉ đánh giá tính phục hồi trên database kiểm thử riêng sau khi có công cụ restore.

### ADM-11 — PIN hiển thị/xuất là hash; PIN tự sinh có luồng không thể nhận lại

- **Bằng chứng:** `src/models/User.js:100` băm PIN trước khi lưu. Các populate của `adminController.js:470`, `:2128`, export tại `:2374` trả trực tiếp `pin`. UI lớp tại `AdminClassroomsPage.tsx:580`, `:1691` dùng trường đó làm PIN; tạo lẻ tại `adminController.js:2258` cũng đưa `newKid.pin` vào thông báo sau save. Luồng nhập Excel ở trang tài khoản sinh PIN trên backend nhưng UI không lưu/hiển thị bảng thông tin đăng nhập được tạo.
- **Tác động:** Giá trị hiển thị hoặc xuất không phải mã 4 số dùng đăng nhập. Đặc biệt tạo lẻ với PIN ngẫu nhiên có thể buộc admin phải reset PIN ngay.
- **Xác minh:** Đã chạy hook User với PIN tổng hợp: trường sau save là bcrypt hash; đưa hash làm PIN không đăng nhập được, PIN gốc vẫn hợp lệ.
- **Tự thử:** Thêm học sinh lẻ không nhập PIN, xem toast và danh sách lớp; xuất danh sách. Kiểm tra đây là 4 chữ số hay chuỗi hash. Không nên giải quyết bằng cách lưu PIN rõ lâu dài trong database.

## Vấn đề mức P2 và khoảng trống chức năng

| Mã | Vấn đề, tác động và cách tự kiểm thử | Vị trí chính |
|---|---|---|
| ADM-12 | **Lịch không kiểm tra giờ kết thúc > bắt đầu, trùng giờ GV/phòng/lớp.** Có thể lưu lịch 10:00–08:00 hoặc hai buổi cùng thời gian. Ngày hiệu lực cũng không được dùng để lọc lịch đang hiển thị. Thử các trường hợp này từ form, đối chiếu màn giáo viên. Giờ đảo đã được xác nhận qua schema thật; trùng lịch và hiệu lực xác nhận qua logic truy vấn. | `adminController.js:2568`, `:2640`, `:2732`; `models/Schedule.js:24`; `AdminSchedulePage.tsx:360` |
| ADM-13 | **Danh sách lựa chọn và export bị cắt ở 100 bản ghi.** Picker học sinh gọi limit 300 nhưng backend chặn 100 và client không tải trang sau; mẫu câu chỉ lấy trang đầu 100; dropdown giáo viên cũng dừng 100. Export nhật ký xin 500 nhưng API giới hạn 100. Thử với >100 bản ghi và đối chiếu tổng. Tìm kiếm mẫu câu vẫn có thể tìm ngoài trang đầu vì tìm kiếm ở server; picker học sinh lọc cục bộ nên không tìm được bé chưa tải. | `AdminClassroomsPage.tsx:281`; `AdminSentencesPage.tsx:76`; `AdminLogsPage.tsx:212`; `adminController.js:121`, `:361`, `:1864` |
| ADM-14 | **Nhật ký chưa bao phủ các thao tác quản trị.** Update/delete Unit, update/delete bài, CRUD từ vựng, sửa/xóa mẫu câu, bulk assign chưa ghi log. Một số mã/field không khớp UI: `CREATE_CURRICULUM_UNIT` với `CREATE_UNIT`, `importedCount` với `successCount`, `deletedStudentsCount` với `releasedStudentsCount`. Thử từng thao tác rồi lọc log, so sánh tóm tắt với chi tiết. Export roster hiện làm ngay trên client, không gọi API export có ghi log. | Các handler tương ứng trong `adminController.js`; `AdminLogsPage.tsx:149`, `:185`; `AdminClassroomsPage.tsx:570` |
| ADM-15 | **Ẩn/ngừng bài hoặc trò chơi chưa chặn truy cập trực tiếp.** Danh sách có lọc ACTIVE, nhưng API chi tiết bài/trò chơi dùng findById không lọc status, và xử lý nộp kết quả không kiểm tra trạng thái hoạt động. Thử lưu URL trước, tắt trò/bài từ admin rồi dùng tài khoản bé truy cập URL cũ. Cần xác nhận quy tắc mong muốn: chỉ ẩn khỏi danh sách hay ngăn học tiếp. | `controllers/activityController.js:6`; `controllers/lessonController.js:146`; `services/learningService.js:114` |
| ADM-16 | **Xóa hết bài vẫn không xóa được Unit; thiếu khôi phục/chuyển bài trên UI.** Delete bài chỉ đổi INACTIVE; đếm bài khi xóa Unit vẫn tính cả INACTIVE. Cây admin vẫn lấy mọi trạng thái và không có nút bật lại/chuyển Unit cho bài. Tạo Unit tạm + bài tạm, xóa bài rồi xóa Unit để kiểm tra. Form Unit cũng cho số đến 50 nhưng schema chỉ cho 1–9. | `adminController.js:1615`, `:1740`, `:1168`; `AdminCurriculumPage.tsx:265`, `:1197`; `models/CurriculumUnit.js:34` |
| ADM-17 | **Đổi nhóm tuổi lớp chưa đồng bộ dữ liệu học.** Update lớp đổi sách/ageGroup của lớp nhưng giữ currentLesson, completedLessons và nhóm tuổi học sinh; API đặt bài hiện tại chỉ kiểm tra bài có tồn tại, không kiểm tra thuộc sách/nhóm tuổi hoặc ACTIVE. Thử đổi lớp 3–4 thành 5–6 rồi xem học sinh, sách, bài hiện tại và tiến độ. | `adminController.js:827`, `:3281` |
| ADM-18 | **Chơi thử dùng luồng lưu kết quả thật.** Nút mở `/activities/:id`; trang chơi lấy ID user hiện tại làm childId và nộp ActivityResult như một lượt học. Backend cho admin nộp nhưng không kiểm tra childId có role CHILD. Thử hoàn thành một lượt với admin trên dữ liệu kiểm thử, tìm ActivityResult/LearningSession có child bằng ID admin. Đây là kết luận từ luồng code, chưa chạy ghi thật. | `AdminGamesPage.tsx:965`; `ActivityPlayPage.tsx:181`; `controllers/learningController.js:65`; `services/learningService.js:145` |
| ADM-19 | **Cài đặt chưa hoạt động trong sản phẩm.** Route `/admin/settings` redirect dashboard, không có menu; backend chỉ lưu cấu hình. `defaultStudentPin`, `starsPerActivity`, `maxBonusStarsPerUnit`, niên khóa không được các nghiệp vụ liên quan đọc để áp dụng. Thiếu luồng reset/đổi mật khẩu giáo viên/admin; hiện chỉ có reset PIN học sinh. Đây là khoảng trống, cần đối chiếu yêu cầu nghiệm thu để quyết định bổ sung. | `client/src/App.tsx:186`; `AdminSettingsPage.tsx`; `models/SystemSetting.js`; `adminController.js:1468`; `routes/authRoutes.js` |
| ADM-20 | **API sửa tài khoản có thể khóa admin qua đường khác.** Toggle/delete chặn ADMIN nhưng updateUser cho sửa status trực tiếp, không bảo vệ admin cuối cùng/tự khóa. UI hiện không có select status trong modal sửa nên tình huống này cần thử qua API trên tài khoản thử có admin dự phòng. | `adminController.js:317`, `:1022`, `:1127` |
| ADM-21 | **Endpoint lịch dành cho giáo viên chưa kiểm tra chủ sở hữu.** `/admin/schedules/by-teacher/:teacherId` cho TEACHER và dùng teacherId bất kỳ; giáo viên có thể đổi ID để xem lịch người khác. Nếu lịch được phép xem toàn trường thì cần ghi rõ đây là chủ đích; nếu chỉ là lịch cá nhân thì thiếu giới hạn. | `routes/adminRoutes.js:118`; `adminController.js:2729` |

## Rủi ro cấu hình cần xác nhận riêng

- Trang login admin có nút điền tài khoản mẫu; seed tạo tài khoản cùng thông tin. Nếu môi trường chạy vẫn dùng mật khẩu mẫu thì bất kỳ người biết thông tin đó đều đăng nhập được. Chưa thử đăng nhập hay kiểm tra mật khẩu tài khoản thật. Vị trí: `AdminLoginPage.tsx:124`, `src/seeds/index.js:461`.
- JWT có secret dự phòng cố định trong source. Nếu thiếu `JWT_SECRET`, token được ký/xác minh bằng giá trị đã biết. Chưa kết luận cấu hình đang triển khai có mắc lỗi này; không in secret hoặc thử giả mạo token trên hệ thống thật. Vị trí: `controllers/authController.js:4`, `middlewares/authMiddleware.js:11`.
- Các handler ghi nhiều collection thường không dùng transaction và nhiều nơi ghi log sau khi lưu nghiệp vụ: lỗi ở bước cuối có thể trả 500 dù dữ liệu chính đã đổi. Cần kiểm thử thêm tình huống mất kết nối/lỗi ghi log trên môi trường thử.
- Không có debounce/cancel hoặc chống phản hồi cũ ở nhiều trang tìm kiếm; mạng chậm có thể làm kết quả cũ ghi đè bộ lọc mới. Trang analytics/logs có nhánh chỉ ghi console khi lỗi, dễ bị hiểu nhầm thành số 0 hoặc danh sách trống. Đây là các kiểm thử phụ, chưa tái hiện trên trình duyệt.
- Nút “Cổng Giáo viên → Vào xem” trong sidebar mở portal nhưng frontend chỉ nhận role TEACHER; admin hiện sẽ gặp trang login thay vì xem trực tiếp. Cần quyết định có hỗ trợ xem với quyền admin hay chỉ liên kết tới cổng đăng nhập.

## Kết quả kiểm tra đã chạy

| Kiểm tra | Kết quả | Giới hạn |
|---|---|---|
| Backend: `node --test tests/ai.test.js tests/recognitionRules.test.js tests/recognitionApi.test.js tests/systemBackup.test.js` | 27/27 đạt | Chủ yếu rules và API dùng model giả lập; chưa bao phủ toàn bộ CRUD admin |
| Frontend: `node_modules/.bin/vitest.cmd run` | 4 file, 33/33 đạt | Các kiểm tra hiện tại không bao phủ trang admin |
| Frontend: `npm.cmd run build` | Đạt TypeScript + Vite | Có cảnh báo bundle lớn; không chứng minh logic nghiệp vụ đúng |
| Quét phân quyền bằng HTTP với model giả lập | 57 endpoint có bảo vệ trả 401 khi không có token; 56 endpoint chỉ dành cho admin trả 403 với giáo viên | Loại trừ `/public-stats` và endpoint lịch dùng chung khỏi kỳ vọng chặn giáo viên; chưa đánh giá mọi tình huống ownership |
| Probe logic riêng, không lưu file test mới | 11/11 tình huống lỗi tái hiện | Mô tả bên dưới; chỉ dùng dữ liệu tổng hợp |
| Hook băm PIN | Xác nhận PIN lưu là hash, không thể dùng hash thay PIN gốc | Không kết nối DB |

11 tình huống đã tái hiện: bỏ username khi tạo bé; sửa tên qua API làm gỡ lớp; updateUser giáo viên bỏ qua xung đột; bulk assign không kiểm tra role; gỡ khỏi lớp không liên quan vẫn xóa assignedClass; xóa lớp bỏ qua xóa lịch vì thiếu mongoose; lưu game xóa metadata/vocabulary/audio; schema nhận giờ đảo; nhập dở batch; đọc thống kê có tên bé không cần token; analytics cộng lặp sao.

## Thứ tự tự kiểm thử đề xuất

1. Tạo tài khoản giáo viên, tạo lớp từ trang lớp, xem lại phân công ở trang tài khoản.
2. Tạo học sinh bằng username + PIN; đăng nhập bằng thông tin đó; thử học sinh mới chưa học và mở hồ sơ năng lực.
3. Thêm lẻ học sinh với PIN tự sinh; xuất danh sách và kiểm tra mã đăng nhập/PIN.
4. Phân công giáo viên qua cả trang lớp và trang tài khoản; kiểm tra lớp cũ/lớp mới và lịch hai giáo viên.
5. Thêm/chuyển/gỡ học sinh; đối chiếu danh sách lớp với `assignedClass`, đặc biệt khi thao tác ở hai tab.
6. Nhập Excel hợp lệ, nhập lại cùng file, thử lỗi giữa chừng ở môi trường kiểm thử; đối chiếu số lượng và dữ liệu bị tạo dở.
7. Tạo/sửa lịch, thử giờ đảo, trùng giờ, lịch tương lai/hết hạn và đổi giáo viên sau khi đã có lịch.
8. Tạo Unit/bài/từ/câu; sửa, xóa bài rồi xóa Unit; kiểm tra nội dung đang ẩn qua URL cũ.
9. Trên trò chơi bản sao: chụp JSON, sửa tên rồi lưu, so sánh cấu hình và chơi lại; hoàn thành lượt chơi thử bằng admin.
10. Cho một bé chơi lại cùng trò; đối chiếu số sao giữa bé, giáo viên và admin; đối chiếu số phiên đã hoàn thành.
11. Kiểm tra vinh danh tuần/tháng, đồng hạng, kỳ chưa kết thúc, công bố lại và bé chỉ thấy vinh danh của mình.
12. Kiểm tra log từng thao tác, lọc ngày/tìm kiếm/xuất; thử dữ liệu hơn 100 bản ghi cho các danh sách.
13. Tải backup, đối chiếu collection và dữ liệu; kiểm tra API công khai khi không đăng nhập.
14. Cuối cùng, chỉ trên lớp tạm: xóa lớp và xác nhận dữ liệu liên quan được dọn tới đâu.

Khi phản hồi có thể dùng mã ADM-xx, kèm thao tác, kết quả thực tế và kết quả mong muốn. Chưa có đề xuất thay đổi nghiệp vụ nào trong báo cáo được tự động áp dụng.
