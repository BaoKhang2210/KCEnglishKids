# Luồng demo giáo viên từ đầu đến cuối

## Mở dữ liệu demo riêng

Tại thư mục dự án chạy `npm.cmd run demo:teacher --prefix KCEnglishKids_BE`. Script cần kết nối MongoDB trong cấu hình backend. Mỗi lần chạy tạo một cơ sở dữ liệu thử mới; không ghi vào dữ liệu chính. Dừng bằng Ctrl+C để đóng máy chủ và xóa đúng cơ sở dữ liệu thử của lần chạy đó.

Mở `http://127.0.0.1:5183/teacher/dashboard?qaRole=teacher`. Nếu bản demo đã được bật từ phiên kiểm tra, có thể mở ngay đường dẫn này. Có một lớp **DEMO Mầm A**, ba học sinh **Bé An, Bé Bình, Bé Chi**, Unit 1 và hai bài về động vật. Lớp của giáo viên khác không được xuất hiện. Để chạy lại sạch từ đầu, dừng và chạy lại lệnh.

Trong bản demo riêng, đường dẫn có `qaRole=teacher` hoặc `qaRole=child` thiết lập phiên của tài khoản mẫu; đây không phải chức năng trên ứng dụng chính. Dùng một tab và chuyển vai bằng các đường dẫn bên dưới để tránh nhầm phiên. Nếu muốn kiểm tra đăng nhập giáo viên: tài khoản mẫu là `demo.teacher@example.test`, mật khẩu `DemoTeacher@2026`.

## Trình tự trình bày và kết quả cần thấy

1. **Tổng quan và lịch dạy.** Xem Tổng quan, sau đó Lịch dạy & lộ trình. Chỉ có DEMO Mầm A. Bản demo có lịch hợp lệ mỗi ngày để có thể mở lớp khi trình bày; dữ liệu thật vẫn phải có lịch do quản trị viên xếp. Mục đích: chứng minh phạm vi giáo viên và mối liên hệ giữa lịch với mở lớp.

2. **Xem bài và in giấy.** Vào Giáo trình & Mẫu câu, mở Unit 1, bài **My Pet Friends — Những người bạn thú cưng**. Kiểm tra tranh cat, dog, bird, rabbit. Chọn In tranh bài này và xem trước bản A4; có thể chọn lưu PDF để kiểm tra mà không cần máy in. Bản in cần có tranh và từ song ngữ, không chứa sidebar. Đóng hộp thoại in; chọn Dạy mẫu câu bài này, kiểm tra có câu **What is this?** dù bài lấy mẫu câu thông qua Unit.

3. **Soạn giáo án.** Chọn DEMO Mầm A, My Pet Friends, thời lượng 25 phút và phong cách vận động. Chờ kịch bản hiện đủ nội dung rồi chọn Vào lớp & Điểm danh. Bản demo dùng mẫu sư phạm cục bộ để không phụ thuộc dịch vụ AI ngoài; không trình bày nội dung này là kết quả AI sinh trực tiếp. Có thể đổi nhanh 15 → 35 → 25 phút để kiểm tra kịch bản cũ không bị mất trong khi cập nhật.

4. **Chuẩn bị và điểm danh.** Bước 1 cần giữ đúng Lesson 1. Bước 2 cần giữ 25 phút; chọn hoạt động nghe và chọn nếu muốn minh họa quiz trên lớp. Bước 3 cho An và Bình có mặt, Chi vắng. Bắt đầu buổi dạy. Phải vào một buổi trực tiếp với đúng giáo án, thời lượng và danh sách điểm danh.

5. **Tương tác trên lớp.** Mở từ vựng, chuyển tranh, nghe mẫu và mở mẫu câu. Dùng bảng học sinh hoặc nút ghi nhận của từng bé: cho An một câu đúng, Bình một câu chưa đúng, thưởng An một sao. Xác nhận Chi vẫn vắng và không được thưởng sao/ghi nhận lượt tham gia. Mục đích: tách kết quả trả lời khỏi sao động viên. Nếu chỉ ghi đúng một lượt cho An và sai một lượt cho Bình, chưa có dữ liệu luyện khác, độ đúng gộp của hai lượt là 50%.

6. **Kết thúc và lưu tổng kết.** Mở thao tác kết thúc buổi dạy. Chọn Đã tổ chức đủ mục tiêu bài, đánh dấu đủ ba mục tiêu và lưu để xem tổng kết. Nếu chưa chọn đủ mục tiêu, hệ thống cần yêu cầu bổ sung thay vì tự đánh dấu hoàn thành. Kiểm tra hai bé tham dự, một bé vắng, sao và các lượt trả lời đúng như đã nhập. Hoàn thành mục tiêu của lớp không có nghĩa mọi bé đã thành thạo.

7. **Lưu quan sát thực tế.** Trở về Hồ sơ học sinh, mở Bé An, ghi quan sát cho My Pet Friends: kỹ năng Nghe và chọn, mức Có gợi ý, minh chứng “Bé chỉ đúng tranh mèo sau khi cô đọc chậm.”, bước tiếp theo “Đổi vị trí hai tranh và chờ bé chọn.” Không cần tệp đính kèm cho demo. Lưu rồi mở Theo dõi tiến bộ → Quan sát theo Unit → Unit 1; cần thấy minh chứng này. Ghi chú nội bộ và quan sát không tự cộng sao.

8. **Giao bài về nhà.** Vào Bài tập & nhận xét, tạo bài cho riêng Bé An. Chọn My Pet Friends và hoạt động **Listen and choose: cat**, nhập lời dặn “Cùng nghe và chọn tranh mèo trong 5 phút.” rồi giao. Chỉ dùng hoạt động này để phần trẻ làm bài ngắn, dễ đối chiếu. Bài chưa được học không được đề xuất như bài ôn; gợi ý từ hỗ trợ giáo viên viết lời dặn, không tự thay bộ câu hỏi của hoạt động.

9. **Đóng vai trẻ làm bài.** Chuyển cùng tab sang `http://127.0.0.1:5183/my-learning?qaRole=child`. Tại Bài cô giao về nhà phải thấy đúng bài và lời dặn. Chọn Mở bài cô giao, nghe từ cat và chọn tranh mèo. Chờ màn hình kết quả và hoàn tất thao tác. Kết quả phải được gửi lên máy chủ; không chỉ hiện hiệu ứng thắng trên thiết bị.

10. **Nhận xét bài nộp.** Trở lại `http://127.0.0.1:5183/teacher/dashboard?qaRole=teacher`, mở Bài tập & nhận xét và bài vừa giao. Bé An phải hiện đã nộp. Xem kết quả, thử nút gợi ý nhận xét nếu cần rồi nhập “Bé chọn đúng tranh mèo. Gia đình đổi vị trí tranh để cùng bé chơi tiếp.”, chọn một sao động viên và lưu/gửi. Gợi ý chỉ điền bản nháp; việc gửi và thưởng phải qua thao tác của giáo viên.

11. **Gửi báo cáo và kiểm tra phía gia đình.** Vào Nhật ký buổi dạy, mở tổng kết buổi vừa kết thúc và chọn Gửi báo cáo cho phụ huynh. Để demo ngắn, chỉ chọn An, kèm quan sát và bài về nhà đã giao; xem trước rồi gửi. Chuyển về vai trẻ bằng đường dẫn ở bước 9, mở sổ liên lạc của gia đình để kiểm tra nhận xét bài tập và báo cáo buổi học. Nếu có bước xác nhận dành cho người lớn thì hoàn thành theo giao diện. Không có ô chat trả lời. Trở lại vai giáo viên, kiểm tra báo cáo đã gửi và kết quả ở Theo dõi tiến bộ.

## Các tình huống kiểm tra bổ sung

- Ghi nhận & động viên: chọn lớp và kỳ tuần/tháng. Lần demo mới chưa có kỳ đã kết thúc với sao hợp lệ, nên chưa công bố được là trạng thái đúng. Không đổi đồng hồ hoặc sửa dữ liệu thật để tạo thành tích; quy trình công bố kỳ hợp lệ đã được kiểm tra trong bộ kiểm thử nghiệp vụ.
- Nhật ký lọc bài chưa từng dạy phải hiển thị rỗng, không tự trả lại buổi của bài khác.
- Nếu đã tạo kế hoạch nhưng mở lớp thất bại, mở kế hoạch đã lưu để thử lại; không tạo thêm bản nháp.
- Có thể thử ghi chú nội bộ rồi sửa/xóa; kiểm tra thao tác này không tạo thông báo gia đình.
- Khi cần kiểm tra hủy bài, dùng bản demo riêng; kết quả lịch sử cần còn, bài không được xuất hiện như bài đang chờ làm.

## Mức kiểm chứng

Đã chạy toàn bộ test frontend/backend, build, kiểm thử HTTP + MongoDB với dữ liệu riêng, bao gồm đăng nhập, quyền lớp, kế hoạch, điểm danh, buổi trực tiếp, quan sát, giao bài, trẻ nộp, nhận xét, báo cáo, ghi chú và hủy bài. Kiểm thử nghiệp vụ còn bao phủ hoàn thành bài theo ba chặng, khen thưởng theo kỳ và khôi phục bản sao dữ liệu.

Công cụ điều khiển giao diện Windows dừng vì không xác định chắc chắn URL. Vì vậy các bước trên là kịch bản để đối chiếu trên trình duyệt; chưa khẳng định đã click thử toàn bộ giao diện, kiểm tra mọi kích thước màn hình hoặc thử máy in vật lý. Các kiểm tra API không thay thế việc kiểm tra bố cục và thao tác thực tế.
