# Quy tắc sao và phần thưởng

Đây là quy tắc thống nhất cho phần thưởng học sinh. Backend là nguồn dữ liệu chuẩn; giao diện chỉ hiển thị số liệu backend và tính trạng thái mở huy hiệu từ các mốc dưới đây.

## Sao vàng

- Mỗi Lesson có tối đa 3 sao, chỉ chốt khi hoàn thành tất cả hoạt động đang hoạt động trong Lesson.
- Điểm Lesson = tổng điểm tốt nhất của từng hoạt động / tổng điểm tối đa của tất cả hoạt động. Mỗi hoạt động dùng kết quả tốt nhất của bé; chơi lại có thể cải thiện điểm nhưng không làm giảm điểm cũ.
- Tỷ lệ dưới 50% được 0 sao; từ 50% được 1 sao; từ 70% được 2 sao; từ 90% được 3 sao. Cùng một thang điểm được dùng cho mọi hoạt động và Lesson.
- Sao hoạt động trên màn hình kết quả là sao của lượt chơi đó; chỉ sao Lesson mới được cộng vào tổng sao tích lũy.
- Hoàn thành tất cả Lesson đang hoạt động trong một Unit sẽ cộng thêm 5 sao đúng một lần.
- Giáo viên có thể cộng sao trong buổi học; các sao đó được tính riêng từ thưởng lớp.
- Sao lớp được chốt vào số dư và báo cáo khi buổi học đã hoàn thành; bỏ qua học sinh vắng hoặc có phép. Điểm/sao đang hiển thị trong buổi trực tiếp là số liệu tạm thời.
- Tổng sao = sao Lesson + sao thưởng Unit + sao thưởng trên lớp.

## Huy hiệu

- Huy hiệu Lesson dùng số Lesson đã hoàn thành.
- Huy hiệu Unit dùng số Unit đã hoàn thành đủ mọi Lesson.
- Huy hiệu sao dùng tổng sao từ cả ba nguồn.
- Huy hiệu 3 sao dùng số Lesson hoàn thành với mức điểm tổng từ 90% trở lên.
- Huy hiệu rương dùng số rương đã mở.

## Vinh danh tuần và tháng

- Admin/giáo viên có thể công bố vinh danh học sinh cao sao nhất lớp theo tuần hoặc tháng đã kết thúc, theo giờ Việt Nam.
- Chỉ tính sao từ buổi học trên lớp đã hoàn thành trong kỳ; tất cả đồng hạng cùng nhận huy hiệu/huy chương và thông báo trong tài khoản.
- Vinh danh là phần thưởng biểu tượng, không cộng thêm sao hoặc điểm, không ảnh hưởng tổng sao hiện tại.
- Xem quy trình, điều kiện và API trong [Vinh danh lớp](class-recognitions.md).

## Rương và Sticker

- Khi hoàn thành Unit, backend cấp rương, cộng 5 sao và ghi nhận sticker ngay; việc cấp chỉ xảy ra một lần cho mỗi học sinh và Unit.
- Mở rương chỉ ghi nhận thời điểm mở và trình diễn sticker đã được cấp. Mở lại không cấp thêm sao hay sticker.
- Bộ sưu tập hiển thị mỗi mẫu sticker một lần, kể cả khi nhiều rương cùng cấp một mẫu.
# Sao động viên khi nhận xét bài tập (28/10/2026)

Nhận xét mới lưu số sao 0–5 cho từng cặp `Assignment`/học sinh. Tổng sao cộng nguồn này ngoài sao Lesson tốt nhất, thưởng Unit và buổi dạy đã kết thúc. Sửa nhận xét thay thế số sao của nhận xét; gửi lại không phát sinh thêm phần thưởng. Hủy bài giao giữ kết quả và phần thưởng đã có. Biểu tượng sao trong lời nhắn thông thường không phải một giao dịch ghi thưởng.
