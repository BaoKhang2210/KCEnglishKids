# Bàn giao client trẻ em

## Quy ước
Theo dõi các thay đổi cần phối hợp với admin/giáo viên tại đây. Chỉ đánh dấu hoàn thành sau khi kiểm chứng luồng nhận dữ liệu thực tế.

## 03/11/2026 — Nhận xét và ôn bài khi vắng
- [ ] Kiểm tra client hiển thị nhận xét giáo viên tạo qua `POST /teacher/notes` trong tài khoản đúng trẻ; giữ xuống dòng nội dung và hiển thị ngày gửi.
- [ ] Nhận xét cuối buổi cho trẻ vắng cần hiển thị đầy đủ bài, Unit và hướng dẫn ôn; không biểu diễn việc vắng thành điểm năng lực thấp.
- [ ] Khi có liên kết ôn tập, mở đúng bài theo ID từ dữ liệu; không suy đoán ID từ tên bài/Unit.

Chi tiết contract và kết quả triển khai sẽ được cập nhật trong phiên.
