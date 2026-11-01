# Đề xuất phát triển tiếp sau khi đối chiếu mã hiện tại

Ngày 01/11/2026. Trạng thái: **đề xuất nghiệp vụ để cùng chốt phạm vi**, các tính năng nâng cấp trong tài liệu này chưa được coi là đã triển khai. Những phần đã chạy được được mô tả riêng trong bảng hiện trạng.

## Những ý tưởng trước đã tới đâu?

| Ý tưởng đã bàn | Hiện có | Phần phát triển tiếp có giá trị |
| --- | --- | --- |
| Mục tiêu và quan sát theo bài/Unit | Hướng dẫn theo tuổi, ba nhóm mục tiêu, ba mức hỗ trợ, bảng cuối Unit. | Cho admin biên soạn mục tiêu quan sát và hoạt động cụ thể từng bài; hiện hướng dẫn vẫn sinh từ một khung chung. |
| Ôn tập phù hợp từng trẻ | Lấy từ đã luyện, mức ghi nhớ, lỗi và lịch nhắc gợi ý; giới hạn nhóm từ theo tuổi. | Nối với bài thực sự đã dạy, điểm danh và quan sát của giáo viên; tạo bản đề xuất có lý do để cô duyệt. |
| Hồ sơ minh chứng | Ghi tình huống, bước hỗ trợ, ảnh/ghi âm riêng, xem trong hồ sơ và gỡ ghi nhận nhầm. | Gắn rõ từ/hoạt động đã quan sát; dùng minh chứng được chọn để chuẩn bị buổi sau và báo cáo gia đình. |
| Xưởng học liệu | Nghe, thử các mẫu trò phù hợp bộ từ, in thẻ và hướng dẫn gia đình. | Kho hoạt động ngoài màn hình, truyện theo Unit; quy trình biên soạn–xem thử–duyệt nội dung. |
| Công việc của giáo viên | Bài nộp cần nhận xét, hỗ trợ theo độ đúng, trẻ chưa có dữ liệu trả lời. | Phân biệt thiếu dữ liệu luyện tập và thiếu quan sát; gom việc theo buổi hôm nay và gợi ý trẻ cần quan sát tiếp. |
| Hỗ trợ mạng yếu | Hàng đợi kết quả, tải trước ảnh/audio công khai và thẻ in. | Gói bài đã được giao có phiên bản và trạng thái tải rõ ràng; mở lại phần đã tải nếu sau này chọn làm chế độ offline đầy đủ. |
| Đồng hành gia đình | Sổ liên lạc trong ứng dụng, phản hồi gia đình và hồ sơ minh chứng chỉ đọc. | Báo cáo kết nối mục tiêu–quan sát–hoạt động ở nhà; tài khoản phụ huynh riêng là một gói nghiệp vụ khác. |

Đối chiếu từ `earlyLearning.js`, `learningInsights.js`, `LearningObservation`, `TeacherTasks`, `LearningStudioPage`, `parentNotificationController` và các trang gia đình. Các phát hiện trong tài liệu audit cũ không tự động được coi là lỗi còn tồn tại.

## Gói A — Nối liền dạy, quan sát, ôn và báo cáo (đề xuất ưu tiên)

### 1. Mục tiêu và hoạt động riêng cho từng bài

Admin vào bài học để nhập mục tiêu quan sát cụ thể, nhóm từ trọng tâm, vật liệu cần chuẩn bị, hoạt động mẫu và một trò ngắn tại nhà. Khung ba nhóm nghe–chỉ, diễn đạt, tham gia vẫn làm nền để so sánh lịch sử; mục tiêu gốc trong docs và `learningObjectives` được giữ.

Ví dụ bài động vật: nghe và chọn cat/dog; đáp bằng chỉ tranh, tiếng kêu hoặc lời nói phù hợp; tham gia một lượt đóng vai. Gợi ý phải diễn đạt thành hành vi nhìn thấy được, không thành tỷ lệ năng lực tự suy ra.

Giáo viên xem trong bước chuẩn bị, chọn hoạt động phù hợp lớp. Buổi đã mở giữ bản mục tiêu tại lúc mở; sửa mục tiêu bài sau đó không thay lịch sử buổi cũ.

**Hoàn thành khi:** admin sửa được, giáo viên xem đúng nội dung, bài chưa biên soạn vẫn có hướng dẫn mặc định; lịch sử được giữ và thay đổi đồng thời không ghi đè lẫn nhau.

### 2. Từ quan sát thành đề xuất ôn có lý do

Trong ghi quan sát, cô có thể chọn những từ hoặc hoạt động liên quan trong chính bài đó. Không tự đọc câu nhận xét rồi đoán trẻ yếu từ nào. Quan sát chung chưa gắn từ chỉ được dùng làm gợi ý hỗ trợ ở cấp bài/mục tiêu.

Hệ thống tổng hợp lịch trả lời, bài lớp đã dạy, điểm danh và quan sát gần nhất để đề xuất một nhóm nhỏ. Trẻ vắng mặt phải được phân biệt với trẻ đã tham gia học. Khi thiếu dữ liệu, hiển thị thiếu dữ liệu, không tự kết luận chưa biết.

Mỗi đề xuất ghi rõ lý do: còn nhầm khi luyện, cô ghi nhận cần gợi ý, cần nhắc lại từ đã học, hoặc làm quen nội dung của buổi đã bỏ lỡ. Sao không được dùng thay kết luận sư phạm.

**Điểm cần chốt:** cô duyệt trước khi trẻ nhận bài, hay hệ thống hiển thị ngay và cô có quyền điều chỉnh. Khuyến nghị cô duyệt trước.

**Hoàn thành khi:** mọi từ đều có nguồn hợp lệ và đúng lứa tuổi; không trộn dữ liệu trẻ khác; gỡ minh chứng làm mất căn cứ của bản đề xuất chưa duyệt; dữ liệu đã duyệt giữ bản chốt và thể hiện rõ nguồn tại thời điểm duyệt.

### 3. Giáo viên duyệt, trẻ và gia đình nhận một việc rõ ràng

Màn hình giáo viên hiển thị bản nháp: trẻ nhận bài, các tranh/từ, lý do chọn, một hoạt động nghe–chạm và một hoạt động dùng vật thật. Cô bỏ/thay từ hoặc sửa lời hướng dẫn rồi duyệt.

Trẻ thấy một thẻ lớn “Cùng Koko chơi hôm nay” với tranh và nút nghe/chơi. Gia đình có hướng dẫn từng bước. Chơi lại để luyện không tự tăng tiến độ bài trong giáo trình hoặc tạo thưởng hoàn thành bài lặp.

Nếu thêm lựa chọn “gia đình đã cùng bé chơi”, đây là **gia đình tự báo**, được ghi riêng với quan sát của giáo viên và câu trả lời được hệ thống chấm. Không biến việc bấm xác nhận thành chứng cứ trẻ đã vững.

**Hoàn thành khi:** bản nháp chưa duyệt không xuất hiện như bài được cô giao; trẻ chỉ nhận bản cho mình; bản được thay/thu hồi có trạng thái rõ; xử lý gửi lặp và mạng yếu không tạo kết quả trùng.

### 4. Báo cáo gia đình có nội dung để hành động

Khi kết thúc buổi, cô xem bản nháp gồm: nội dung lớp đã tổ chức; một việc cụ thể trẻ làm được; hỗ trợ còn cần; nhóm tranh và trò ở nhà đã được duyệt. Cô chọn minh chứng phù hợp và sửa lời nhận xét trước khi gửi qua sổ liên lạc hiện có.

Ví dụ: “Hôm nay lớp chơi nghe và chọn tranh động vật. Bé chọn đúng cat/dog khi cô nhắc chậm hơn. Ở nhà, bố mẹ dùng hai tranh này, đổi vị trí và cho bé chỉ hoặc làm tiếng kêu nếu bé muốn.”

Đây là nội dung được soạn từ dữ liệu có nguồn và được cô duyệt, không hứa hẹn AI tự hiểu trẻ hoặc tự đưa kết luận phát triển. Kết thúc buổi không tự gửi tin; chức năng gửi bên ngoài ứng dụng chưa thuộc gói này.

**Hoàn thành khi:** báo cáo xem trước đúng nội dung sẽ nhận, đúng trẻ, không lộ ảnh/ghi âm trẻ khác; báo cáo đã gửi giữ nội dung tại lúc gửi; không gửi lại thành bản mới chỉ vì yêu cầu bị retry.

### 5. Một màn hình để chuẩn bị buổi hôm nay

Gom lịch buổi tới, bài đề xuất, mục tiêu, nhóm từ cần ôn của lớp, trẻ nên quan sát thêm và bản ôn đang chờ duyệt tại trang tổng quan/lịch dạy, trước khi mở buổi. Không bắt cô ghi đủ ba mức cho mọi trẻ trong mọi buổi; gợi ý cơ hội quan sát luân phiên trong hoạt động thật.

Sửa cách diễn đạt của việc cần xử lý: “chưa có dữ liệu trả lời” khác với “chưa có ghi nhận quan sát”. Có quan sát nhưng chưa luyện trong app vẫn phải được phản ánh đúng.

**Hoàn thành khi:** công việc đều dẫn đến thao tác xử lý cụ thể, phạm vi đúng lớp hiện tại, không sinh thêm việc chỉ vì trẻ chưa học trên thiết bị.

## Gói B — Kho hoạt động và truyện tương tác

Thực hiện theo Unit, bắt đầu bằng một Unit mẫu để duyệt chất lượng trước khi mở rộng. Mỗi hoạt động có tranh, audio, hướng dẫn cô, vật liệu, cách đáp chấp nhận và biến thể theo tuổi. Truyện có các cảnh ngắn để nghe, chỉ tranh và đóng vai; chữ phục vụ người lớn, không bắt trẻ 3–6 đọc để hoàn thành.

Quy trình đề xuất: admin biên soạn → xem thử bằng vai trò giáo viên/trẻ → duyệt → sử dụng. Ảnh/audio phải khớp nghĩa và có nguồn sử dụng rõ. Trò tự động kiểm tra điều kiện bộ từ trước khi được gắn vào bài. Giữ phong cách 2D và nền phủ component đã chọn.

Gói này bổ sung học liệu thật. Chỉ tăng số màn hình hoặc số trò mà chưa có mục tiêu và tình huống sử dụng không được coi là hoàn thành.

## Gói C — Tài khoản phụ huynh riêng

Schema User đã có giá trị role PARENT, nhưng kiểm tra hiện tại chưa thấy luồng đăng nhập, liên kết phụ huynh–trẻ và cổng giao diện phụ huynh riêng hoàn chỉnh. Các phản hồi gia đình hiện đi qua tài khoản học sinh/gia đình.

Nếu chọn gói này, cần chốt cách nhà trường xác minh và cấp quyền, một phụ huynh quản lý nhiều con, một trẻ có một/nhiều người giám hộ, và xử lý thu hồi quyền. Sau đó mới xây đăng nhập riêng, chuyển hồ sơ con, báo cáo/trao đổi và quản lý người được phép xem minh chứng. Không chỉ thêm một trang rồi coi như đã có mô hình phụ huynh.

## Thứ tự đề xuất và cách kiểm chứng

Ưu tiên A1–A2 → A3–A4 → A5; sau đó chọn một Unit mẫu cho B. Có thể đưa C lên trước nếu nhà trường cần tách tài khoản ngay. Đây là thứ tự đề xuất, chưa phải lựa chọn thay người dùng.

Mỗi chặng có dữ liệu thật từ hệ thống để đọc, dữ liệu thử riêng để kiểm tra ghi, kiểm tra quyền theo trẻ/lớp, gửi lặp, lịch sử phiên bản và giao diện Chrome ở desktop/điện thoại. Thay đổi schema phải được kiểm tra backup/restore và audit quan hệ. Không tạo quan sát giả vào database vận hành.

Hai lựa chọn đã gửi để cùng chốt: **ưu tiên A/B/C** và **ai duyệt trước khi bài ôn tới trẻ**. Khi có lựa chọn, cập nhật phạm vi và tiêu chí hoàn thành trước khi sửa các luồng phụ thuộc.

## Cơ sở định hướng

Đề xuất A dùng quan sát để điều chỉnh hoạt động tiếp theo và trao đổi với gia đình, theo định hướng [NAEYC về quan sát, ghi nhận và đánh giá](https://www.naeyc.org/resources/position-statements/dap/assessing-development/). Đề xuất B kết hợp chơi thật, sáng tạo, tranh và ghi âm, tham khảo [NAEYC về công nghệ ở tuổi mầm non](https://www.naeyc.org/resources/topics/technology-and-media/preschoolers-and-kindergartners).

Đây là thiết kế sản phẩm riêng, không phải chương trình được NAEYC chứng nhận hay công cụ chẩn đoán phát triển.
