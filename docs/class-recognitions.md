# Giao diện nhân viên và vinh danh lớp

## Dễ đọc và phù hợp quy trình dạy học

Các màn quản lý dùng nền sáng, màu chữ đậm và cùng một bảng màu. Các trang admin, giáo viên (kể cả đăng nhập, chuẩn bị buổi dạy, Liveclass và tổng kết) có vùng định dạng chữ riêng. Nội dung chính 18px, nhãn phụ tối thiểu 16px, khoảng dòng 1,6. Nút “Chữ lớn / Chữ rất lớn” tăng lên 20px/18px và ghi nhớ trên thiết bị. Menu có tên nghiệp vụ, vùng bấm tối thiểu 44px, focus bàn phím rõ, liên kết bỏ qua menu và bảng cuộn ngang. Giao diện trẻ em không chịu các thay đổi kiểu chữ này.

## Quy tắc vinh danh

- Trong menu admin và giáo viên, chọn **Vinh danh của lớp**.
- Tuần bắt đầu 00:00 thứ Hai, kết thúc 00:00 thứ Hai kế tiếp. Tháng là tháng dương lịch. Ranh giới luôn dùng giờ Việt Nam, không phụ thuộc múi giờ máy chủ.
- Mỗi lớp tính riêng, theo tổng sao của các buổi có trạng thái COMPLETED và endedAt thuộc kỳ [bắt đầu, kết thúc). Buổi LIVE, sao tự học, điểm số, sao thưởng Unit không tham gia.
- Chỉ học sinh CHILD đang ACTIVE, có trong danh sách lớp lúc xét. Bỏ qua điểm danh ABSENT/EXCUSED. Học sinh đến trễ vẫn được ghi nhận.
- Tổng cao nhất phải lớn hơn 0; tất cả đồng hạng được thưởng như nhau.
- Tuần: huy hiệu **Ngôi sao tuần**; gợi ý mời bé dẫn khởi động cùng cô.
- Tháng: huy chương **Ngôi sao tháng**; gợi ý mời bé trợ giúp lớp và chọn bài hát.
- Đây là phần thưởng biểu tượng, không cộng sao, điểm hay tác động tổng sao. Các vai trò trong lớp do giáo viên tổ chức, không phải quyền tự động của hệ thống.
- Có thể xem kỳ đang diễn ra nhưng chỉ công bố kỳ đã kết thúc. Không tự công bố theo lịch: giáo viên/admin xem trước rồi bấm **Công bố & gửi vinh danh**.
- Kết quả công bố là bản chốt, không thay đổi theo việc chuyển lớp hoặc sửa thông tin sau này. Không công bố lại cùng lớp/loại kỳ/ngày bắt đầu. Tuần và tháng là hai hình thức ghi nhận riêng.
- Bé được khen nhận thẻ vinh danh chưa đọc trên trang chủ, giữ huy hiệu để xem lại sau khi nhận lời khen. Tải lại khi mở trang, focus cửa sổ và mỗi 60 giây; không gửi email/push ngoài hệ thống.
- Bảng đối chiếu chỉ dành cho nhân viên có quyền với lớp; trẻ chỉ xem vinh danh của chính mình. Khuyến khích giáo viên khen thêm nỗ lực, hợp tác và tiến bộ của mọi bé.

## Lưu trữ và API

Collection ClassRecognition có chỉ mục unique (classroom, kind, periodStart). Kết quả và thông báo của mọi bé cùng nằm trong một document để công bố nguyên tử; retry hoặc hai người công bố đồng thời không sinh thưởng/thông báo trùng. Không cần migration dữ liệu sao cũ. Cần cho MongoDB tạo index khi khởi động (mặc định Mongoose); nếu tắt autoIndex trong triển khai, tạo index này trước khi bật tính năng.

- GET /api/recognitions/classes: các lớp giáo viên phụ trách, hoặc tất cả cho admin.
- GET /api/recognitions/classes/:classId?kind=WEEK|MONTH&date=YYYY-MM-DD: kết quả xem trước hoặc bản đã chốt.
- POST /api/recognitions/classes/:classId/publish với kind, date: chốt kỳ đã đóng.
- GET /api/recognitions/mine: 100 vinh danh gần nhất của trẻ đang đăng nhập.
- PATCH /api/recognitions/mine/:id/read: đánh dấu lời khen của chính trẻ là đã đọc.

Kiểm thử: node --test tests/recognition*.test.js trong backend; npm run build trong client.
