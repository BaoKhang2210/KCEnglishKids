# Nền minh họa phủ toàn bộ component

Đã chuyển các tranh truyện 2D từ khối ảnh riêng sang lớp nền `cover` phủ toàn vùng chứa: banner, lời chào giáo viên/admin, thẻ hoạt động của trẻ, hộp nghỉ, tổng kết trò chơi và trang đăng nhập học sinh.

Lớp phủ gradient tập trung dưới vùng chữ; phần tranh không có chữ giữ sáng hơn. Chữ trên tranh dùng trắng/kem, nhãn vàng nhạt; nút dùng nền kem/vàng với chữ xanh đậm. Ô nhập liệu và thẻ từ giữ nền đặc để dễ thao tác, không thay hình đáp án bằng tranh trang trí.

Ảnh chụp dùng dữ liệu mẫu chỉ đọc:

- [Tổng quan giáo viên — desktop](teacher-home.png).
- [Góc học và thẻ hoạt động — điện thoại](child-learning-mobile.png).
- [Đăng nhập — điện thoại](child-login-mobile.png).
- [Tổng kết sau khi chơi thử — điện thoại](game-complete-mobile.png).

Đã kiểm tra 11 màn hình/tình huống trên Chrome ở chiều rộng 1440px và 390px: nền tải được và phủ kín component, không tràn ngang hoặc lỗi JavaScript được ghi nhận. Bản in xưởng học liệu của giáo viên/admin vẫn ẩn tranh trang trí và giữ thẻ từ. Chơi thử đến cuối không ghi dữ liệu học sinh. Build TypeScript/Vite thành công.

[Báo cáo kiểm tra](../story-background-validation-2026-11-01.json). Các tỷ lệ tương phản trong báo cáo là phép tính của bảng màu và lớp phủ thiết kế, không phải phép đo từng điểm ảnh của mọi chữ trên ứng dụng.
