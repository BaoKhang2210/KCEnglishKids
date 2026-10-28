# Sửa Admin và tổ chức lại giao diện — 28/10/2026

Đối chiếu với [bản audit](admin-audit-2026-10-28.md). Các thay đổi nằm trong working tree; chưa commit, triển khai hay chạy thao tác ghi trên database thật.

## Đối chiếu 21 mục

| Mục | Thay đổi |
|---|---|
| ADM-01 | `/admin/public-stats` yêu cầu đăng nhập và quyền ADMIN như dashboard. Có kiểm tra HTTP cho toàn bộ router admin. |
| ADM-02 | Form game giữ toàn bộ trường của câu hỏi/options. Backend ghép dữ liệu cũ theo `_id`/option ID và bảo toàn metadata, vocabulary, audio khi client không gửi các trường đó. |
| ADM-03 | Bỏ lỗi tham chiếu `mongoose` không khai báo. Xóa dữ liệu học, lịch, ghi chú, thông báo, vinh danh, các liên kết học sinh; chỉ báo thành công sau khi hoàn tất. Lưu danh sách cần xóa và đánh dấu lớp để có thể tiếp tục khi lần trước bị gián đoạn. Chặn thao tác mới vào lớp đang xóa. |
| ADM-04 | Kiểm tra toàn batch trước khi ghi; khóa nhập trùng bằng `importKey` có unique index; trả số dòng bỏ qua. Gỡ tài khoản/liên kết của batch nếu lỗi ghi giữa chừng. Có transaction trên replica set. |
| ADM-05 | Lưu username được nhập hoặc sinh username không trùng. Tên tiếng Việt, gồm Đ/đ, được chuyển thành mã không dấu. |
| ADM-06 | Thêm API hồ sơ năng lực cho admin, lấy dữ liệu học và mastery thật. Không tạo số lượng từ, điểm phát âm hay nhận xét mẫu. Phát âm chưa được đo hiển thị “Chưa đánh giá”. |
| ADM-07 | Dùng chung kiểm tra/synchronisation giáo viên cho các luồng tài khoản và lớp; cập nhật hồ sơ giáo viên mới, gỡ liên kết giáo viên cũ và cập nhật lịch. Thêm unique index cho giáo viên của lớp không INACTIVE. Không cho ngừng tài khoản giáo viên còn phụ trách lớp. |
| ADM-08 | Chỉ phân lớp cho CHILD đang hoạt động; gỡ khỏi lớp cũ, cập nhật đủ hai phía và nhóm tuổi. Partial update không gửi assignedClass giữ nguyên lớp. Gỡ ở tab cũ chỉ xóa assignedClass nếu vẫn đúng lớp đó. |
| ADM-09 | Analytics dùng cùng `computeRewards` với tài khoản bé; không cộng sao theo mọi lượt chơi. Sao lớp chỉ chốt ở buổi COMPLETED, bỏ qua vắng/có phép; teacher stats được điều chỉnh tương ứng. |
| ADM-10 | Backup v3 xuất đủ 25 collection đang được ứng dụng định nghĩa, không giới hạn log và giữ hash mật khẩu/PIN. Dùng MongoDB Extended JSON để bảo toàn ObjectId/Date. Có CLI kiểm tra/khôi phục vào database trống. |
| ADM-11 | Loại PIN hash khỏi API danh sách lớp, bảng hiển thị và file roster. Trả PIN gốc đúng một lần ở phản hồi cấp tài khoản; dialog cho tải Excel giữ số 0 đầu PIN. PIN không được lưu rõ trong DB. |
| ADM-12 | Kiểm tra giờ/ngày hiệu lực, trùng lịch giáo viên/lớp/phòng và bài học phù hợp. Thêm form ngày bắt đầu/kết thúc, bật/tắt lịch; lọc lịch hết/chưa đến hiệu lực. Ngày hiệu lực dùng giờ Việt Nam. Giáo viên trên lịch theo phân công lớp. |
| ADM-13 | Tải đủ các trang cho picker học sinh/giáo viên, thư viện câu và export log; không xin limit vượt trần rồi bỏ trang sau. |
| ADM-14 | Bổ sung log cho các CRUD giáo trình/từ/câu còn thiếu; chuẩn hóa đọc số lượng trong tóm tắt log. Xuất roster qua API có audit. Lỗi ghi audit được ghi vào server log, không biến thao tác đã lưu thành lỗi giả trên giao diện. |
| ADM-15 | API chi tiết kiểm tra ACTIVE của bài/trò, bao gồm bài cha của trò. Danh sách hoạt động không trả nội dung của bài đã ngừng. Bắt đầu/nộp kết quả học kiểm tra học sinh và nội dung hoạt động; mẫu câu không ACTIVE không đưa vào bài của bé. |
| ADM-16 | Bài ngừng hoạt động được nhận diện rõ và có nút khôi phục; có chọn chuyển Unit khi sửa bài. Unit chỉ bị chặn xóa bởi bài chưa INACTIVE; dọn liên kết khi xóa. Form Unit giới hạn 1–9, tìm số còn trống và không đề nghị Unit 10. |
| ADM-17 | Đổi nhóm tuổi lớp cập nhật nhóm tuổi học sinh, sách và đặt lại tiến độ lớp. API đặt bài/đánh dấu hoàn thành kiểm tra tuổi và ACTIVE. Lịch đổi lớp xóa lựa chọn bài cũ trong form. |
| ADM-18 | Admin/teacher chơi thử tính kết quả ngay trong trang, không nộp kết quả và không ghi mastery. Backend từ chối lưu ActivityResult cho tài khoản không CHILD. Admin có thể xem thử trò ngừng bằng API admin riêng. |
| ADM-19 | Nối trang Cài đặt và menu. Thông tin trường và năm học được dùng trong shell/tạo lớp/lịch. Bỏ các ô chỉnh quy tắc sao/PIN vốn không có tác dụng, thay bằng giải thích quy tắc cố định đang áp dụng. Có đổi mật khẩu giáo viên và đổi mật khẩu admin của chính mình với mật khẩu hiện tại. |
| ADM-20 | Chặn vô hiệu hóa ADMIN qua updateUser. Đổi mật khẩu tăng phiên bản xác thực, thu hồi token cũ; reset PIN cũng thu hồi phiên cũ. |
| ADM-21 | Giáo viên chỉ được lấy lịch theo ID của mình; ADMIN vẫn có quyền quản lý lịch toàn trường. |

## Giao diện

- Shell mới: menu chia thành Điều hành, Nội dung học tập, Quản trị hệ thống; breadcrumb, thông tin trường và hồ sơ ở vị trí ổn định.
- Nền trắng/xám nhẹ, một màu nhấn indigo, cỡ chữ và khoảng cách thống nhất. Trạng thái lỗi/thành công vẫn có màu riêng để nhận biết.
- Book trong Giáo trình và Thư viện mẫu câu dùng chung component nền trắng, chữ tối; trạng thái chọn dùng viền và dấu chọn. Bỏ nền cam/xanh làm chìm chữ.
- Danh sách Unit không còn max-height hoặc thanh cuộn riêng; chữ được xuống dòng đầy đủ. Màn hình nhỏ chuyển sang bố cục một cột, menu có nền phủ và đóng bằng Escape.
- Giữ Unit đang chọn sau chỉnh sửa. Thêm hiển thị lỗi tải dữ liệu ở báo cáo/log và chặn phản hồi tìm kiếm cũ ghi đè kết quả mới.
- Tham khảo cách phân nhóm điều hướng và phân cấp nội dung từ [shadcn/ui dashboard](https://ui.shadcn.com/examples/dashboard), [Tabler](https://tabler.io/admin-template). Không thêm framework UI hay dependency mới.

## Kiểm tra

- Backend: `npm.cmd test` — 57 bài, gồm phân quyền toàn router, cấp tài khoản, phân lớp, nhập dở/nhập lại, giữ metadata game, lịch, sao, dữ liệu năng lực, xóa tiếp tục sau lỗi, backup và restore.
- Frontend: `npm.cmd test` — 35 bài; có kiểm tra tải đủ các trang và không xuất file thiếu dữ liệu khi một trang lỗi.
- Frontend: `npm.cmd run build` — TypeScript + production bundle.
- Kiểm tra tĩnh các controller/service mới không có lỗi undefined variable; kiểm tra whitespace/diff.
- Các bài kiểm tra dữ liệu/API sử dụng dữ liệu tổng hợp và model giả lập, không ghi DB thật.
- Đã chuẩn bị bản visual QA chỉ đọc với dữ liệu giả: trong `client`, chạy `npm.cmd run dev:admin-preview`, mở `http://127.0.0.1:5180/admin/curriculum`. Server này chặn mọi request ghi và không dùng database/API thật. Không đưa vào production.
- **Chưa xác minh trực quan trên trình duyệt:** công cụ Computer Use dừng vì không xác định được URL Edge đủ chắc chắn. Chưa xác nhận bằng ảnh ở desktop/mobile; không coi build/unit test là thay thế kiểm tra giao diện thật.

## Sao lưu và khôi phục

File v3 là Extended JSON, vẫn đọc được bằng trình đọc JSON. Có hash đăng nhập để phục hồi tài khoản; chỉ ADMIN được tải và response có `Cache-Control: no-store`.

Kiểm tra file, không kết nối database:

```powershell
cd KCEnglishKids_BE
npm.cmd run backup:restore -- 'D:\backup\KCEnglishKids_Backup.json' --dry-run
```

Khôi phục cần đặt `RESTORE_MONGODB_URI` trỏ tới một database **mới và trống**, rồi chạy cùng lệnh không có `--dry-run`. CLI từ chối database có dữ liệu; không lấy `MONGODB_URI` của app làm đích ngầm định. Bản v2 thiếu collection/hash không được nhận là bản đủ để restore. Quy trình đã kiểm tra bằng DB giả lập, chưa chạy khôi phục trên MongoDB thật.

## Lưu ý khi tự kiểm thử

1. Khởi động lại backend để nạp handler/schema mới; khởi động frontend theo cách thường dùng.
2. Database cũ chưa được tự động chỉnh sửa. Nếu đã có trùng giáo viên giữa các lớp, cần giải quyết dữ liệu đó để unique index `one_teacher_per_active_class` tạo thành công. Thông tin đã bị mất trước bản sửa không được tự suy đoán để phục hồi.
3. Tài khoản mẫu đã tồn tại không bị tự đổi mật khẩu. Nút điền thông tin mẫu đã bị gỡ; seed mới yêu cầu `SEED_ADMIN_PASSWORD` ít nhất 12 ký tự. Production yêu cầu `JWT_SECRET`; development không cấu hình dùng secret ngẫu nhiên theo tiến trình.
4. Replica set dùng transaction ở các luồng đã bọc. MongoDB standalone dùng rollback cho batch nhập và quy trình xóa tiếp tục được; không có bảo đảm transaction đa collection khi toàn bộ tiến trình/database cùng ngừng đột ngột. Lỗi cleanup được trả về, lớp còn đánh dấu để thực hiện lại.
5. Bắt đầu bằng một giáo viên/lớp/học sinh thử, sau đó kiểm tra lại theo danh sách trong audit. Riêng xóa lớp vẫn là thao tác xóa vĩnh viễn và chỉ thử trên dữ liệu được chuẩn bị cho kiểm thử.
