# Không gian giáo viên: luồng sau khi tinh gọn

- **Lịch dạy & lộ trình:** chỉ lấy lớp được phân công; lịch của lớp đã đổi giáo viên hoặc ngừng hoạt động không xuất hiện.
- **Giáo trình & Mẫu câu:** xem bài, mẫu câu và chọn **In tranh bài này**. Bản in A4 có tranh, từ tiếng Anh và nghĩa tiếng Việt, hai thẻ mỗi hàng; giáo viên dùng hộp thoại trình duyệt để in giấy hoặc lưu PDF. Không còn màn Xưởng học liệu riêng.
- **Bài tập & nhận xét:** một nơi giao cho lớp hoặc từng bé, xem kết quả, nhận xét và gửi nhận xét vào sổ gia đình. Đề xuất chỉ lấy bài có căn cứ đã học; giao trực tiếp qua API cũng phải qua kiểm tra này. Với từng bé, căn cứ gồm có mặt trong buổi đã kết thúc, tiến độ hoàn thành hoặc quan sát còn hiệu lực. Gợi ý từ ưu tiên nhu cầu hỗ trợ, từ còn nhầm và đến lượt ôn; giáo viên quyết định nội dung giao. Nhóm từ gợi ý không tự thay đổi nội dung trò chơi.
- **Báo cáo gia đình:** xem trước rồi gửi nội dung buổi học, quan sát được chọn và bài về nhà đã giao. Thay đổi căn cứ làm bản xem trước hết hiệu lực. Gia đình đọc báo cáo/nhận xét và đánh dấu đã đọc; không còn chat hai chiều.
- **Theo dõi tiến bộ:** có hai chế độ Kết quả luyện tập và Quan sát theo Unit. Độ đúng tổng hợp bằng tổng câu đúng / tổng câu trả lời; không lấy trung bình các phần trăm và không dùng sao để suy ra năng lực. Dưới 60% là gợi ý theo dõi, chưa có dữ liệu được hiển thị riêng. Quan sát dùng minh chứng mới nhất cho từng kỹ năng, không chuyển mức hỗ trợ thành điểm số.
- **Màn hình trẻ:** bài về nhà lấy từ cùng bản ghi Assignment của giáo viên và mở bài/hoạt động thật để kết quả đi vào luồng chấm nhận xét hiện có. Bài đã hoàn thành được bỏ qua khi chọn bài đang chờ.

Đường dẫn cũ của Xưởng học liệu, Giao ôn ở nhà, Trao đổi phụ huynh và Quan sát cuối Unit chuyển về chức năng tương ứng. Các dữ liệu/báo cáo lịch sử vẫn được giữ; bài ôn cũ còn được đọc tương thích khi chưa có bài giao hiện hành. API tạo mới luồng duyệt ôn cũ và API trả lời chat đã được gỡ.

Kiểm tra tự động: frontend typecheck, build, Vitest và lint; backend toàn bộ Node test, gồm kiểm tra không vượt phạm vi lớp, không giao ôn bài chưa học, chuyển giáo viên, quyền người nhận và báo cáo dùng cùng bài giao. Việc in ra máy in vật lý và kiểm thử toàn bộ thao tác trên dữ liệu triển khai cần kiểm tra thực tế ở môi trường chạy.
