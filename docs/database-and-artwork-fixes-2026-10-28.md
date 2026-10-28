# Database và hình ảnh đã triển khai — 28/10/2026

## Database thật đã được sửa

Đã áp dụng migration trên MongoDB local `kcenglishkids` đang cấu hình. Giữ nguyên ObjectId của tài khoản, bài học, từ vựng, tiến độ và kết quả chơi.

- Khôi phục **79 bản ghi** bằng cách đối chiếu khóa định danh duy nhất từ `data_backup`: 1 ghi chú, 4 phiên lớp học, 16 mastery và 58 thông báo. Tài khoản đối chiếu bằng username/email và role; không suy đoán theo tên.
- Lưu trữ nguyên bản **37 bản ghi** ra hồ sơ migration, rồi đưa ra khỏi collection đang hoạt động: 2 phiên cũ, 34 mastery và 1 thông báo. Nhóm này chứa liên kết không khôi phục được, student sai role hoặc mastery cũ trùng cặp student/vocabulary hiện tại. Không cộng chồng số lượt học cũ vào số lượt mới.
- Đồng bộ assignedClass cho giáo viên của một lớp ACTIVE.
- Sửa câu hỏi fish và sửa cả bộ sinh câu hỏi để luôn có đáp án đúng.
- Chuyển một buổi dạy cũ có nhiều bài sang ngữ cảnh MIXED_LESSONS, giữ ID bài ban đầu và danh sách bài trong contentSnapshot.
- Ghi completionSnapshot cho một tiến độ hoàn thành cũ không còn đủ kết quả hiện tại. Giữ nguyên trạng thái trước đây, không tạo điểm hay ActivityResult giả. Audit hiển thị một mục INFO cho trường hợp này.
- Tạo đủ **7 index thiếu**, bao gồm 5 unique index. Không xóa index đang có.
- Bổ sung kiểm tra tài khoản CHILD đang hoạt động, quyền giáo viên, sự tồn tại của từ vựng và tính hợp lệ của các bộ đếm trước khi ghi mastery.
- Seed từ chối database không rỗng để tránh tái tạo lỗi mất liên kết. `npm run seed` trên database mới sẽ cài bộ ảnh sau khi tạo nội dung.

Kết quả cuối: **0 lỗi tham chiếu, 0 tham chiếu sai role, 0 nhóm khóa trùng, 0 index thiếu** theo công cụ audit. Kho hiện có 25 collection và 2.835 bản ghi, gồm 22 Media mới cho chủ đề và hình hội thoại. Các từ màu sắc/số đếm bổ trợ vẫn được giữ trong kho; không tự thay đổi khung chương trình để gắn thêm nội dung vào bài.

## Hình ảnh đang được dùng

- **409 ảnh từ vựng:** vector cục bộ, nền trong suốt cho vật thể đơn; sơ đồ riêng cho màu sắc, lượng số đếm, bộ phận cơ thể và một số đồ vật; tranh ghép cho hoạt động/cụm từ.
- **409 SVG chuyển động:** chuyển động nhẹ, có hỗ trợ prefers-reduced-motion. Flashcard khám phá dùng bản động; trò chơi dùng ảnh tĩnh.
- **19 ảnh chủ đề**, được gắn vào thumbnail của 108 bài học.
- **246 LanguageContent** có imageMedia: ưu tiên từ/cụm từ trong cùng unit, sau đó tranh chủ đề hoặc biểu tượng hội thoại. Đây là hình gợi ngữ cảnh; không phải 246 tranh tình huống độc lập.
- Avatar tài khoản và 15 sticker dùng bộ vector thống nhất. Giữ Koko SVG hiện có để duy trì nhận diện và các trạng thái tương tác.
- Một tranh khu vườn học tập được tạo riêng bằng công cụ imagegen tích hợp, dùng cho màn đăng nhập và banner trang chủ/quản trị.
- Tất cả ảnh được đóng gói trong `client/public/images`, kèm giấy phép Microsoft Fluent Emoji MIT. Ảnh và game không tải hình ngẫu nhiên từ dịch vụ ngoài khi học.

Migration đã cập nhật cả Media.url, Vocabulary.imageUrl, animationUrl, metadata độ trong suốt, Topic.imageUrl, Lesson.thumbnailUrl và các URL sao chép trong questions/options/metadata của trò chơi. Backend phục vụ `/images` và API bài học trả đủ metadata ảnh. Snapshot lớp học có URL trùng với bộ cũ cũng được cập nhật.

Đã sửa hai vị trí ở phần warm-up của giáo viên vốn đưa URL minh họa vào thẻ chữ; chúng hiện dùng img. Các màn mẫu câu dùng chung bộ resolver ảnh cục bộ. Cache notebook cũ có thẻ emoji được chuyển sang asset mới khi đọc.

## Kiểm chứng

- 106/106 test backend đạt.
- 39/39 test frontend đạt.
- Production build/TypeScript đạt.
- Lint chạy thành công nhưng còn các cảnh báo React hooks và mã hiện hữu; build có cảnh báo chunk lớn. Chưa thực hiện tối ưu bundle trong phạm vi thay ảnh này.
- 419/419 GET nội dung học đạt.
- 1.114/1.114 URL ảnh, animation và giấy phép trả HTTP 200.
- Dashboard giáo viên, danh sách mẫu câu và tổng quan unit trả HTTP 200 với quyền giáo viên.
- Chạy lại dry-run sửa database và cài ảnh đều cho **0 thay đổi**, không tạo bản ghi Media lặp.

Kiểm tra trực quan toàn bộ giao diện chưa thực hiện được: trình duyệt tích hợp không kết nối; công cụ Windows sau đó tự dừng vì không xác định chắc chắn URL trình duyệt. Không tiếp tục thao tác UI sau thông báo đó. Tranh tạo bằng imagegen đã được xem; asset SVG đã qua kiểm tra cấu trúc, số lượng, đường dẫn, nội dung script và tải HTTP, nhưng chưa được duyệt thị giác từng hình hay từng bố cục trên điện thoại/máy chiếu.

Ứng dụng và gallery có thể mở trên máy:

- Ứng dụng: http://127.0.0.1:5173/login
- Gallery không cần đăng nhập: http://127.0.0.1:5173/art-preview.html

Gallery cho phép tìm theo từ, xem chủ đề và xem chuyển động. Một số cụm từ/trừu tượng dùng tranh ghép biểu tượng; có thể tiếp tục tinh chỉnh bằng tranh riêng sau khi duyệt thực tế.

## Sao lưu và hoàn tác

Các file chứa dữ liệu thật nằm trong thư mục `.local-backups/database-repair-2026-10-28`, đã được loại khỏi Git:

- `before.ejson`: backup đầy đủ trước mọi sửa đổi, Extended JSON giữ nguyên ObjectId, Date và hash mật khẩu/PIN.
- `indexes.json`: danh sách index ban đầu.
- `repair-plan-1793158011842.ejson`: journal đã áp dụng, gồm từng before/after và lý do lưu trữ. Các plan khác là bản dry-run.
- `before-images-*.ejson`: backup đầy đủ sau sửa liên kết, trước cài ảnh.
- `image-plan-*.ejson`: journal cập nhật ảnh và danh sách Media tạo mới.

Để khôi phục toàn bộ về trước sửa đổi, dùng `scripts/restore_system_backup.js` với `before.ejson` vào **một database đích rỗng**, kiểm tra số liệu rồi đổi cấu hình sang database đã khôi phục. Không chạy restore chồng lên database đang có dữ liệu. Các bản ghi lưu trữ cũng có thể được truy xuất riêng từ journal mà không cần phục hồi cả hệ thống.

## Công cụ bàn giao

Từ `KCEnglishKids_BE`:

```powershell
npm.cmd run audit:db -- --out ../docs/database-audit-final-2026-10-28.json
npm.cmd run repair:db                 # dry-run; -- --apply mới ghi
npm.cmd run assets:install            # dry-run; -- --apply mới ghi
npm.cmd run assets:build              # tái tạo SVG từ nguồn đã ghim; tải nguồn nếu cache thiếu
```

Kết quả audit đầy đủ: [database-audit-final-2026-10-28.json](database-audit-final-2026-10-28.json). Kiểm tra API/asset: [verification-after-repair-2026-10-28.json](verification-after-repair-2026-10-28.json). Nguồn hình và prompt: [artwork-generation-2026-10-28.md](artwork-generation-2026-10-28.md).
