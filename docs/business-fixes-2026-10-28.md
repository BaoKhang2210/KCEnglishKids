# Hoàn thiện nghiệp vụ — 28/10/2026

## Kết quả

Đã sửa các nhóm B01–B13 trong báo cáo rà soát. Bộ kiểm tra hiện gồm **111 test backend, 47 test frontend, 17 kịch bản tích hợp MongoDB + HTTP trên database QA riêng**. Build production thành công. Đây không phải cam kết ứng dụng không còn bất kỳ lỗi nào; thao tác UI, audio, cảm ứng và bố cục trên toàn bộ thiết bị trong kế hoạch 60 ca vẫn cần nghiệm thu thực tế.

- [Kết quả 17 kịch bản tích hợp](business-fixes-validation-2026-10-28.json)
- [Audit database sau cập nhật](database-audit-business-fixes-2026-10-28.json)
- [Readiness game của 108 bài](business-game-coverage-2026-10-28.json)
- [Kế hoạch nghiệm thu giao diện và nghiệp vụ](web-test-plan-2026-10-28.md)

## Các sửa đổi chính

| Nhóm | Thay đổi |
|---|---|
| B01 — Bài bị kẹt | Chọn game thay thế ngoài tập xoay vòng khi thiếu game hợp lệ. Bubble Pop và Koko Says hỗ trợ từ 2 từ khác nhau; vẫn giữ yêu cầu 2 game khác nhau. Cả 108 bài hiện có đủ game; registry frontend/backend khớp nhau. |
| B02 — Chuyển chặng | Backend kiểm tra học sinh ACTIVE, tuổi, Lesson/Unit/Topic, thứ tự lộ trình và các chặng trước. Bài được giáo viên giao hợp lệ có thể mở ngoài thứ tự. Kế hoạch luyện tập có chữ ký gắn học sinh, bài, phiên bản từ vựng và thứ tự mục tiêu game. Không dùng score/stars tự khai để chấm. |
| B03 — Hoàn thành chung | LearningEvent lưu bằng chứng ba chặng; Progress giữ trạng thái hoàn thành và sao Lesson. Bài giao Lesson đọc cùng kết quả; thưởng Unit được kiểm tra sau khi hoàn thành. Dashboard, lịch sử học, tổng sao và giáo viên dùng kết quả mới. Luồng Activity cũ vẫn hỗ trợ bài giao một hoạt động. |
| B04 — Phạm vi dữ liệu | Session GET bắt buộc đăng nhập và kiểm tra quyền; query childId trên Lesson, curriculum và Topic phải kiểm tra chủ thể/phạm vi lớp. Route children dùng chung cũng giới hạn giáo viên theo lớp được phân công. Chỉ học sinh được nộp bằng chứng học của mình. |
| B05 — Điểm và retry | Mỗi câu trả lời có index duy nhất, đúng số câu; không chấp nhận gửi rỗng/thừa/lặp. Memory Card kiểm tra từ đã ghép. Submission ID + unique index chống ghi trùng; điểm phiên được tính lại từ kết quả đã lưu. Một Lesson chỉ có một phiên IN_PROGRESS. |
| B06 — Đăng nhập | Không tạo PIN chung khi đăng ký bằng mật khẩu. Chặn PIN phổ biến, bỏ mật khẩu/tài khoản demo điền sẵn, giới hạn thử đăng nhập. Danh sách trẻ và tra cứu liên hệ cần quyền. Đổi PIN thu hồi JWT cũ, cấp token mới cho phiên hiện tại và giữ mật khẩu gia đình. |
| B07 — Lịch sử học liệu | Lưu trữ thay cho xóa cứng từ/Activity/Unit. Chặn sửa rubric đã có kết quả, hoặc sửa/ẩn nội dung đang giao. Từ vựng cũ và liên kết lịch sử được giữ lại. |
| B08 — Danh tính gia đình | Phản hồi từ tài khoản học sinh dùng nhãn FAMILY và tên tài khoản gia đình; không coi đó là danh tính phụ huynh đã được xác minh riêng. |
| B09 — Đồng bộ | Hàng đợi lưu bền vững giữ bằng chứng trước khi gửi, retry cùng submission ID, chỉ gửi bằng token đúng chủ thể và hiển thị trạng thái chờ/lỗi. Mastery dùng sự kiện có ID thay vì ghi đè tổng đếm; đồng bộ cũ không sửa bộ đếm đã tồn tại. Chặng đã hoàn thành và game đã lưu phục hồi được trên thiết bị khác. |
| B10 — Streak | Tính từ ngày có hoạt động học đã ghi nhận theo giờ Việt Nam. GET không ghi User; endpoint xem thử chỉ trả dữ liệu preview. Không hứa thưởng sao streak chưa được cấp trong hệ thống. |
| B11 — Bài đã giao | Bổ sung snapshot đầy đủ Activity khi giao; không lọc bớt yêu cầu theo ACTIVE hiện tại. Chặn sửa/ẩn nội dung đang được giao; thay nhận xét thay thế đúng điểm thưởng cũ. |
| B12 — Xuất bản/media | Lesson mới ở DRAFT. Có checklist tuổi, Unit/Topic, từ, ảnh/audio URL và game trước khi kích hoạt. Form quản trị có xem ảnh, nghe audio, loại từ, nguồn và giấy phép. Đổi media tạo bản ghi riêng, không sửa ảnh đang được dùng chung. |
| B13 — Khởi động/phục hồi | Chỉ kết nối MONGODB_URI được chọn; HTTP mở sau khi DB sẵn sàng. Có /api/ready. Backup v3.1 chứa các collection mới; vẫn đọc được backup v3 đầy đủ trước khi có collection sự kiện. Đã thử restore BSON/index/credential sang một DB QA trống. |

Đã sửa thêm lỗi cập nhật nhận xét bằng pipeline không tương thích Mongoose 9. Các query đó khai báo `updatePipeline: true`, phù hợp [hướng dẫn migration chính thức](https://mongoosejs.com/docs/migrating_to_9.html). Bộ test MongoDB thật xác nhận việc sửa nhận xét và thay điểm thưởng hoạt động.

## Chức năng thêm và cải thiện

- **Góc học của bé** ở `/my-learning`: gợi ý ôn 5 phút từ lịch sử từ vựng, báo cáo tuần cho gia đình và nguồn tổng sao. Có nút mở ngay từ trang chủ.
- **Việc cần xử lý** trên dashboard giáo viên: bài đã nộp chưa nhận xét, học sinh chưa có dữ liệu và học sinh có kết quả luyện tập cần hỗ trợ.
- **Kiểm tra xuất bản** ngay trong cây giáo trình; bổ sung preview ảnh/audio và thông tin nguồn media khi thêm/sửa từ.
- Lịch sử ba chặng hiển thị cho giáo viên; điểm Activity thô được đổi sang phần trăm trước khi hiển thị ký hiệu `%`.
- Chỉ nhìn thấy từ mới không tự đánh dấu đã thuộc. Đồng bộ dùng câu trả lời quan sát được thay vì nhãn notebook được suy ra.
- Tải mã theo trang: gói JavaScript chính giảm từ khoảng **2.02 MB xuống 254 KB** chưa nén. Đây là số đo build, chưa phải phép đo tốc độ trên điện thoại thực.

## Quy tắc được chọn

1. Khám phá không cấp điểm; luyện tập chấm theo tỷ lệ đúng lần đầu ở các vòng khả dụng; sao Lesson dùng ngưỡng 50/70/90%. Sao minigame là động viên, không cộng riêng vào tổng sao.
2. Ba chặng phải đi đúng thứ tự; Chặng 3 cần 2 game khác nhau. Server kiểm tra bằng chứng và kế hoạch có chữ ký. Điều này không phải cơ chế giám sát trẻ có thật sự ngồi học hay không.
3. Học lại giữ kết quả tốt nhất của Lesson. Bài giao một Activity yêu cầu hoàn thành Activity đó; bài giao cả Lesson ghi nhận hoàn thành từ ba chặng hoặc đủ Activity đã chụp snapshot. Kết quả hoàn thành trước lúc giao không tự tính là nộp mới; cần phát sinh lần làm hợp lệ sau mốc giao/mở bài. Các chặng đã đạt có thể được dùng lại khi luyện lại game.
4. Thưởng Unit cấp đúng một lần: +5 sao và một sticker. Mở rương chỉ hiển thị thưởng đã cấp.
5. Gia đình dùng chung tài khoản học sinh và được ghi là FAMILY. Chưa bổ sung tài khoản phụ huynh riêng hoặc xác minh danh tính người lớn.
6. Âm thanh hỗ trợ URL audio hoặc giọng đọc thiết bị. Cần nghe thử trên thiết bị nghiệm thu; không coi transcript matching là đánh giá phát âm âm học.

## Database đang dùng

Đã chạy `migrate_business_integrity.js --apply`: **2 bài giao được bổ sung snapshot/chế độ phù hợp**, tạo index sự kiện và index chống trùng phiên đang học. Chạy preview lần nữa cho kết quả **0 cập nhật còn lại**. Không xóa hoặc chấm lại kết quả học cũ.

Bản sao trước thay đổi và nhật ký từng bản ghi ở thư mục được gitignore:

`.local-backups/business-integrity-2026-10-28T06-13-05-031Z/`

Audit sau migration kiểm tra **9.885 tham chiếu**, không có lỗi tham chiếu, khóa trùng hay index thiếu. Còn một INFO lưu nguyên lần hoàn thành cũ vì không có đủ bằng chứng để dựng lại câu trả lời; không tạo lịch sử giả để xóa thông báo đó.

## Chạy lại kiểm tra

Từ `KCEnglishKids_BE`:

```powershell
npm.cmd test
npm.cmd run test:business
npm.cmd run audit:games
node scripts/audit_database.js --out ../docs/database-audit-business-fixes-2026-10-28.json
```

`test:business` tạo database QA có tên duy nhất và chỉ xóa đúng database QA do lần chạy đó tạo. Nó không dùng database đang vận hành để làm fixture. Cần tài khoản MongoDB có quyền tạo DB QA. Các kịch bản bao gồm phân quyền, chấm điểm/chuyển chặng, retry/race, bài giao/chấm bài, gia đình, mastery, streak, xuất bản, LIVE/điểm danh, vinh danh và backup/restore thật.

Từ `client`: chạy `npm.cmd test`, `npm.cmd run build`, `npm.cmd run lint`.

Khi triển khai, đưa cả thư mục `shared/` cùng backend/client và cập nhật hai phía cùng phiên bản. Client cũ gửi score/stars không có bằng chứng hoặc submission ID sẽ bị từ chối.

## Phần cần nghiệm thu tiếp

- Các ca thao tác UI ở kích thước màn hình, audio/autoplay, touch/drag và Safari/iOS trong kế hoạch vẫn chưa được thực hiện đầy đủ. Build và HTTP 200 không thay thế kiểm tra này.
- Tiếp tục trên thiết bị khác hiện phục hồi chặng/game đã gửi server; lượt câu hỏi đang làm dở còn dùng checkpoint trên thiết bị đó. Hàng đợi không thể phục hồi sau khi người dùng chủ động xóa dữ liệu trình duyệt trước khi đồng bộ.
- Rate limit hiện dùng bộ nhớ của một tiến trình Node. Triển khai nhiều replica cần dùng kho giới hạn chung.
- UI hiển thị nguồn tổng sao hiện tại; chưa có trang nhật ký mọi biến động sao theo ngày hoặc giao diện điều chỉnh lộ trình riêng của từng học sinh. Kế hoạch ôn hiện được gợi ý tự động từ dữ liệu đã lưu.
- Không triển khai gửi email/SMS, xác minh phụ huynh riêng hoặc hệ thống lưu trữ upload media mới. Media quản trị hiện nhận URL và lưu thông tin nguồn/quyền sử dụng.

Những mục cuối là giới hạn tính năng/phạm vi nghiệm thu được công khai, không được tính là đã hoàn thành chỉ vì các test tự động đều đạt.
