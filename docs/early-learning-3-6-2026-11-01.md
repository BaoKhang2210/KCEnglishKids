# Hoàn thiện trải nghiệm học cho trẻ 3–6 tuổi

Cập nhật ngày 01/11/2026. Tài liệu này mô tả phần đã triển khai trong mã nguồn, database và kiểm tra cục bộ; bổ sung cho [đợt sửa hệ thống trước](system-revision-2026-11-01.md).

## Hệ thống đã thay đổi như thế nào?

Luồng dạy mới là: **chuẩn bị mục tiêu → khám phá bằng tranh/vật thật → chơi và vận động → quan sát → quyết định dạy tiếp hay chuyển bài → gia đình cùng ôn**.

Ba loại thông tin được lưu riêng:

| Thông tin | Trả lời câu hỏi | Cách ghi nhận |
| --- | --- | --- |
| Tiến độ dạy của lớp | Giáo viên đã tổ chức đủ nội dung bài chưa? | Chốt mục tiêu khi kết thúc buổi dạy. |
| Kết quả luyện tập | Trẻ đã trả lời những câu nào, đúng/sai ra sao? | Chứng cứ trả lời và lịch sử luyện tập thực tế. |
| Quan sát từng trẻ | Trẻ làm được điều gì, cần hỗ trợ thế nào? | Giáo viên ghi tình huống, mức hỗ trợ, bước tiếp theo và minh chứng tùy chọn. |

Sao tiếp tục dùng để động viên. Hệ thống không tự đổi sao thành năng lực hoặc kết luận phát âm. Việc giáo viên dạy đủ bài cũng không đồng nghĩa mọi trẻ đã tự làm được.

## Cách sử dụng, từ chuẩn bị đến sau buổi học

### Bước 1 — Admin chuẩn bị lớp và lịch

1. Vào **Lớp học**, tạo hoặc mở lớp phù hợp độ tuổi, gắn một giáo viên.
2. Vào **Thời khóa biểu**, thêm các khung thứ–giờ cố định trong tuần và khoảng hiệu lực. Số khung là số buổi/tuần.
3. Để trống bài cố định nếu muốn nhận bài chưa dạy tiếp theo theo giáo trình. Gắn bài cụ thể khi cần một buổi ôn đã biết trước.
4. Trong **Kho trò chơi**, chọn bật/tắt và thứ tự các mẫu trò của chặng 3. Trẻ chỉ nhận trò phù hợp dữ liệu từ của bài.

Ràng buộc một giáo viên–một lớp ACTIVE/UPCOMING và tên lớp không trùng vẫn được bảo vệ ở backend/database. Lịch sử lớp cũ được giữ lại.

### Bước 2 — Giáo viên xem trước và chuẩn bị

1. Mở **Xưởng học liệu**, chọn bài đúng lứa tuổi. Trang dùng từ và hình của bài thật.
2. Xem ba mục tiêu quan sát: **nghe–chỉ/chọn**, **diễn đạt bằng lời/cử chỉ**, **tham gia và chờ lượt**. Đây là khung gợi ý hỗ trợ tổ chức dạy; mục tiêu gốc trong giáo trình vẫn được giữ.
3. Bấm **Nghe mẫu**; chọn trò để chơi thử với chính bộ từ đó. Chế độ thử không tạo kết quả, sao hoặc checkpoint của học sinh.
4. Bấm **In thẻ tranh & hướng dẫn gia đình** để mở hộp thoại in/lưu PDF của trình duyệt. Bản in bỏ menu và nút thao tác, giữ thẻ từ cùng trò chơi ngắn ở nhà.
5. Bấm **Chuẩn bị buổi dạy** để chuyển sang quy trình tổ chức lớp. Bước chọn hoạt động có thêm bảng mục tiêu và bốn nhịp: kết nối → khám phá → chơi → quan sát, khép lại.

Admin cũng mở được Xưởng học liệu để kiểm tra nội dung, nghe, thử và in. Nút tổ chức buổi dạy dành cho tài khoản giáo viên.

### Bước 3 — Dạy theo nhóm tuổi, cho trẻ đáp bằng nhiều cách

| Nhóm tuổi | Số lựa chọn tối đa trong câu nghe–chọn | Nhóm từ ôn gợi ý | Mời nghỉ/vận động trong chặng luyện tập |
| --- | ---: | ---: | --- |
| 3–4 | 2 | 4 từ | Theo nhóm 4 lượt ở các câu luyện đơn |
| 4–5 | 3 | 6 từ | Theo nhóm 6 lượt ở các câu luyện đơn |
| 5–6 | 4 | 6 từ | Theo nhóm 8 lượt ở các câu luyện đơn |

Các số này là mặc định thiết kế để giáo viên thử và điều chỉnh, không phải chuẩn đánh giá phát triển hoặc quy định thời lượng màn hình. Số lựa chọn thực tế có thể ít hơn khi bộ từ không đủ phương án phân biệt rõ. Các trò ghép/mảnh tranh có cấu trúc riêng; vòng ghép có bước chuyển bảng, còn cuối vòng có màn hình chuyển tiếp thay cho hộp nghỉ giữa câu.

- Ưu tiên nghe mẫu, nhìn tranh, chỉ/chạm, cử chỉ, đồ vật, vận động và đóng vai.
- Không bắt buộc đọc chữ để qua chặng luyện tập, kể cả nhóm 5–6. Checkpoint cũ tiếp tục bằng nghe–tranh, giữ chứng cứ trả lời đã lưu.
- Xen trò trên màn hình với hoạt động thật. Hộp nghỉ có tranh minh họa, gợi ý vận động và lựa chọn tiếp tục hoặc lưu để nghỉ; không ép trẻ chơi tiếp để giữ sao.
- Giáo viên lựa chọn hỗ trợ theo từng trẻ. Trẻ chưa muốn nói có thể chỉ tranh hoặc làm động tác; ghi đúng cách trẻ đã đáp.

### Bước 4 — Ghi quan sát và nhìn lại cuối Unit

1. Vào **Hồ sơ học sinh** → mở một trẻ → **Ghi quan sát mới**.
2. Chọn bài và một mục tiêu. Chọn một trong ba mức: **Tự làm được**, **Làm được khi có gợi ý**, **Cần thêm cơ hội luyện**.
3. Ghi hành vi cụ thể, ví dụ: “Bé chỉ đúng cat và dog sau khi cô nhắc từ chậm hơn.” Ghi thêm hoạt động hỗ trợ tiếp theo nếu có.
4. Có thể thêm một ảnh PNG/JPEG/WebP hoặc audio WebM/OGG/WAV, tối đa 2 MB. Ghi âm trực tiếp tối đa 20 giây, chỉ bật micro khi giáo viên bấm; cần trình duyệt hỗ trợ và HTTPS/localhost. Có thể chọn tệp sẵn khi thiết bị không ghi âm được.
5. Khi đính kèm, xác nhận quyền chia sẻ minh chứng với gia đình của trẻ. Tệp được đọc qua API có xác thực; danh sách không trả kèm dữ liệu nhị phân và tệp riêng không được đưa vào bộ tải trước học liệu công khai.
6. Bấm **Lưu quan sát**. Gửi lại cùng nội dung sau lỗi mạng không tạo bản trùng. Quan sát mới không tự cộng sao.
7. Nếu ghi nhầm, người ghi hoặc admin dùng **Gỡ ghi nhận nhầm** → xem xác nhận → **Xác nhận gỡ**. Ghi nhận được đánh dấu gỡ, ẩn khỏi hồ sơ gia đình và bảng Unit, không tự sống lại khi gửi lại yêu cầu cũ.

Để tổng hợp theo Unit, vào **Quan sát cuối Unit**, chọn Unit và tổ chức các tình huống quen thuộc được gợi ý trên màn hình. Bảng hiển thị quan sát mới nhất của từng trẻ theo ba mục tiêu; thiếu dữ liệu hiển thị **Chưa quan sát**. Bấm **Ghi nhận** trên dòng trẻ để mở sẵn bài/Unit. Nút quay lại giữ đúng Unit đang chọn.

Quan sát trong hồ sơ gắn bài nhưng không chọn Unit vẫn có trong hồ sơ trẻ. Chỉ ghi nhận được gắn Unit rõ ràng mới tham gia bảng tổng hợp Unit; không suy diễn hoặc gán lại lịch sử.

### Bước 5 — Kết thúc buổi dạy và chọn hướng tiếp theo

1. Mở **Ghi nhận & Kết thúc buổi dạy**. Mặc định là **Cần dạy tiếp ở buổi sau**.
2. Chọn một trong ba hướng:
   - **Cần dạy tiếp**: buổi dạy vẫn có tổng kết, giữ vị trí bài trong lộ trình.
   - **Đã tổ chức đủ mục tiêu bài**: đánh dấu đủ ba mục tiêu đã tổ chức và phải có học sinh tham dự; mới thêm bài vào tiến độ đã dạy.
   - **Buổi ôn tập**: lưu kết quả và giữ tiến độ hiện tại.
3. Ghi lưu ý cho buổi sau, bấm **Kết thúc buổi dạy & Xem tổng kết**.
4. Xem lại tổng kết, rồi chủ động chọn **Gửi báo cáo cho phụ huynh**. Kết thúc buổi không tự gửi thay giáo viên.

Thời lượng dự kiến phục vụ đồng hồ và nhắc giờ, bao gồm cả hoạt động ngoài màn hình trong buổi. Thông báo quá giờ cho phép nhắc lại sau 15 phút hoặc mở biểu mẫu ghi nhận mục tiêu; không tự chốt buổi và không bỏ qua quyết định nội dung đã dạy.

Lịch đề xuất, lịch sử bài đã dạy và báo cáo tiến độ admin cùng dùng quyết định này. Buổi cũ hoàn thành trước khi có trường quyết định được giữ cách hiểu cũ để không mất lịch sử. Gửi lại yêu cầu kết thúc không tăng tiến độ hoặc cộng thưởng lặp.

### Bước 6 — Gia đình cùng ôn, chuẩn bị khi mạng yếu

1. Trẻ mở góc học cùng Koko, chạm tranh để nghe và bấm **Chơi cùng Koko**.
2. Gia đình mở mục **Dành cho gia đình: cùng bé học và chơi**. Thực hiện trò nghe–chỉ với 2–3 tranh hoặc vật thật; đổi vai nếu trẻ thích, khen một cố gắng cụ thể.
3. “Khoảng 5 phút” là gợi ý linh hoạt; cho trẻ nghỉ theo hứng thú và trạng thái thực tế.
4. Xem tổng hợp tuần cùng quan sát của cô. Độ đúng được mô tả là kết quả luyện tập, không phải điểm năng lực tổng thể hoặc phát âm. Gia đình chỉ đọc minh chứng, không sửa/gỡ quan sát của giáo viên.
5. Bấm **Tải trước tranh & âm thanh** khi có mạng. Chức năng chỉ lưu các ảnh/audio công khai thuộc ứng dụng; không lưu token, API hoặc ảnh/ghi âm minh chứng riêng. Đăng nhập và tải trang/bài mới vẫn cần kết nối. Thẻ in hỗ trợ chơi không dùng màn hình.
6. Nếu có kết quả đang giữ trên thiết bị, kết nối lại và dùng **Thử đồng bộ kết quả** trước khi đổi thiết bị. Không tuyên bố đã đồng bộ khi vẫn còn hàng đợi.

Đề xuất ôn dùng lịch sử từ thực tế, ưu tiên từ còn nhầm và thời điểm cần nhắc lại; giới hạn 4/6 từ theo tuổi. Nhịp nhắc 1/3/7 ngày là quy tắc gợi ý trong mã nguồn, chưa phải thuật toán được kiểm định sư phạm. Chơi ôn không tự đánh dấu hoàn thành một bài trong giáo trình.

## Hình ảnh đã tích hợp

Đã bổ sung sáu cảnh truyện tranh 2D mềm mại: **lớp học, gia đình, khu vườn khám phá, vận động/nghỉ, ghi nhận cố gắng, xưởng học liệu**. Koko và các bạn nhỏ xuất hiện ở trang trẻ, đăng nhập, luyện tập/nghỉ, tổng kết trò chơi, tổng quan giáo viên, hồ sơ quan sát và các không gian quản trị.

Ảnh WebP 1536×1024, tổng khoảng 2,1 MB cho sáu cảnh, tải theo nhu cầu; chuyển động nhẹ và tôn trọng tùy chọn giảm chuyển động. Các cảnh trang trí giữ riêng với hình đáp án từ vựng để tránh gây mơ hồ. Bộ 409 từ và hình đã rà soát ở đợt trước tiếp tục được sử dụng; không thay hình đúng nghĩa bằng tranh cảnh trang trí.

[Nguồn và ghi chú minh họa](../client/public/images/storybook/CREDITS.md). [Ảnh giao diện đã kiểm tra](ui-review-2026-11-01/README.md).

## Dữ liệu, kiểm tra và giới hạn thực tế

- Thêm model `LearningObservation`; database hiện có 30 model/collection. Migration tạo collection/index và backup trước khi áp dụng; không viết lại kết quả học cũ.
- `ClassroomSession` lưu ảnh chụp mục tiêu tại lúc mở buổi và quyết định nội dung khi kết thúc. Dạy lại bài không tạo thêm một bài hoàn thành.
- Backup **3.3.0** chứa cả quan sát và tệp nhị phân theo BSON Extended JSON; restore vẫn nhận bản 3.0–3.2 với collection quan sát trống khi chưa có.
- Đạt **130 kiểm thử backend**, **54 kiểm thử frontend**, build TypeScript/Vite thành công. Lint không có lỗi chặn nhưng còn cảnh báo hooks/biến chưa dùng, gồm các cảnh báo ở một số thành phần mới.
- Đạt **9 tình huống API với MongoDB thật trong database thử riêng**, gồm chống lưu lặp, quyền đọc/gỡ minh chứng, giữ tiến độ buổi dạy một phần, hoàn thành có điều kiện và kiểm tra trước khi restore backup. Database thử được xóa đúng tên sau khi chạy; không thêm quan sát giả vào dữ liệu vận hành.
- Chrome kiểm tra **14 màn hình/kích thước và tình huống** bằng dữ liệu mẫu: desktop 1440px và điện thoại 390px, không tràn ngang, không lỗi JavaScript được ghi nhận. Kiểm tra bản in hai vai trò, chơi thử, nhắc quá giờ, chế độ chỉ đọc của gia đình và truy xuất tranh đã tải khi ngắt mạng.
- [Audit database](database-audit-early-learning-2026-11-01.json) không phát hiện thiếu index, trùng unique hoặc đứt tham chiếu. Một bản ghi Progress cũ thiếu chứng cứ chi tiết vẫn được giữ và đánh dấu INFO; không tạo kết quả trả lời giả để lấp thiếu.

Kiểm tra Chrome dùng dữ liệu mẫu để quan sát UI; kiểm tra API dùng dữ liệu thử riêng để xác minh lưu thật. Chưa thực hiện quan sát một lớp trẻ thực tế, thử micro trên mọi thiết bị hoặc kiểm định kết quả phát triển/ngôn ngữ. Giáo viên chuyên môn cần thử một chu kỳ dạy–quan sát–ôn với lớp để điều chỉnh số từ, hỗ trợ và nhịp nghỉ theo trẻ. Các chức năng đã được triển khai cục bộ, chưa có thao tác triển khai lên máy chủ bên ngoài.

## Cơ sở tham khảo

Hướng thiết kế dựa trên quan sát có mục đích trong hoạt động chơi, ghi hành vi cụ thể và điều chỉnh theo từng trẻ; phù hợp nguyên tắc đánh giá trong [NAEYC: Observing, Documenting, and Assessing Children’s Development and Learning](https://www.naeyc.org/resources/position-statements/dap/assessing-development/). Công nghệ được dùng cùng tương tác với người lớn và hoạt động thật, tham khảo [NAEYC: Preschoolers and Kindergartners](https://www.naeyc.org/resources/topics/technology-and-media/preschoolers-and-kindergartners).

Các tham khảo là cơ sở định hướng. Ba mục tiêu, giới hạn số từ, nhịp nghỉ và lịch nhắc trong ứng dụng là lựa chọn thiết kế riêng, không phải bộ chuẩn được NAEYC chứng nhận.
