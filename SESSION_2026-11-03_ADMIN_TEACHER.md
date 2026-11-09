# Phiên làm việc 03/11/2026 — Admin và giáo viên

## Quy ước theo dõi
- Mỗi phiên tạo một file `SESSION_YYYY-MM-DD_ADMIN_TEACHER.md` tại thư mục gốc; thêm hậu tố nếu có nhiều phiên cùng ngày.
- Yêu cầu dành cho partner client ghi tại `CLIENT_HANDOFF.md`, kèm API, tiêu chí nghiệm thu và trạng thái.
- Giữ nguyên các thay đổi có sẵn trước phiên; không ghi đè công việc đang làm.

## Phạm vi
- [ ] Quét giao diện admin/giáo viên, tăng độ dễ đọc, giảm thông tin lặp.
- [ ] Rà responsive, bảng, nút, tiêu đề và modal.
- [ ] Lịch giáo viên: bỏ banner cố định, kiểm tra logic ngày/ca/lớp.
- [ ] Ba trụ cột: mỗi trụ cột một hàng, gửi nhận xét đến tài khoản trẻ.
- [ ] Điểm danh bổ sung khi trẻ đến muộn; không suy đoán trẻ chưa đến là đi muộn.
- [ ] Nhận xét trẻ vắng kèm bài và Unit cần ôn.
- [ ] Giáo trình/mẫu câu: kiểm tra trùng chức năng, thu gọn nội dung theo bài được chọn.
- [ ] In tranh tô màu từ vựng.
- [ ] Kiểm tra build, test và ghi rõ giới hạn kiểm chứng.

## Phát hiện ban đầu
- Đã có CSS chữ lớn nhưng nhiều quy tắc `nowrap` áp dụng cả nội dung dài, có nguy cơ tràn trên điện thoại.
- Lịch giáo viên có nhiều banner và luồng mở lớp dùng lớp đầu tiên khi chọn tất cả.
- Hồ sơ năng lực đang sao chép nhận xét thay vì lưu qua API nhận xét sẵn có.
- Điểm danh có trạng thái LATE ở bước chuẩn bị nhưng màn hình đang dạy lọc bỏ trẻ vắng.
- Giáo trình và thư viện mẫu câu đều có chức năng sửa mẫu câu.

## Kiểm chứng
Đang thực hiện.
