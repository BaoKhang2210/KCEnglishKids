# Kết quả sửa hệ thống — 01/11/2026

## Quyết định đã xác nhận

- Một giáo viên chỉ có một lớp ACTIVE/UPCOMING; giữ lịch sử lớp cũ.
- Admin đặt các buổi cố định hàng tuần, đề xuất bài chưa dạy tiếp theo, cho phép ôn lại và chỉ tăng tiến độ khi kết thúc buổi.
- Vinh danh trường theo sao/buổi: tối thiểu 2 buổi/tuần, 4 buổi/tháng; bằng tỷ lệ cùng hạng.
- Admin quản lý bật/tắt và thứ tự cả 12 trò chặng 3.
- Đối chiếu từ vựng với tài liệu hiện có trong docs, bổ sung vào bài hiện có đúng Unit.

## Thay đổi theo yêu cầu

| Phần | Kết quả |
| --- | --- |
| Tổng quan | Việc cần xử lý chia nhóm nhận xét/hỗ trợ/quan sát, có số lượng và liên kết; bỏ Theo nhịp giảng dạy. |
| Phân công | Đồng bộ logic, quyền và unique indexes một giáo viên–một lớp hiện tại; giữ lớp lịch sử; không còn vai trò/cờ chủ nhiệm. Bỏ Lớp phụ trách ở menu và tabs nhiều lớp ở hồ sơ. |
| Thẻ học sinh/bài giao | Năng lực–Chi tiết–Nhận xét cùng một hàng; trạng thái Đang giao không tách chữ. Chưa có chứng cứ đánh giá hiện chưa có dữ liệu. |
| Lịch dạy | Ô lịch rộng, đủ tên lớp, giờ, phòng, ghi chú và bài dự kiến; kiểm tra khoảng hiệu lực theo giờ Việt Nam. |
| Ghi nhận & động viên | Bỏ khối hướng dẫn đầu/cuối; giữ chức năng chọn kỳ, xem và công bố. |
| Chuẩn bị bước 1 | STT đầu tiên, bỏ cột thao tác, chọn dòng bằng chuột/bàn phím; số hoạt động không tách dòng; thanh tiếp tục nằm trước bảng và giữ trên màn hình khi cuộn. |
| Chuẩn bị bước 2 | Đổi bài chọn tất cả trò; Bỏ chọn tất cả mới chuyển về không chọn; hiển thị số câu thực. |
| Trò chơi lớp | Trình chiếu đúng hoạt động đã chọn và câu hỏi database; bộ đếm theo hoạt động/câu. Trò chung bổ sung có bộ đếm riêng. Lưu lại cùng câu thay kết quả, không đếm hai lần. |
| Tiếng kêu | File ghi âm cục bộ cho 9 con vật; không dùng đọc từ vựng/âm con khác làm dự phòng; dừng khi đổi trò và báo lỗi nếu không có bản ghi. Nguồn/giấy phép tại client/public/audio/animals/CREDITS.md. |
| Điểm/copilot | Bỏ điều khiển/cột điểm lớp và copilot trong buổi; chỉ thưởng sao và ghi đúng/sai. Giữ trường điểm cũ để đọc lịch sử. |
| Tổng kết buổi | Xếp theo sao, bằng sao cùng hạng, vắng/có phép không xếp hạng; chỉ hai thao tác chính: gửi báo cáo phụ huynh và quay lại lớp. |
| Admin | Bỏ trang/menu Cài đặt, đổi sang Vinh danh của trường, chặn tên lớp trùng sau chuẩn hóa Unicode/hoa thường/khoảng trắng. |

## Quy trình dạy và các chỉ số

**Lịch tuần tự:** admin tạo các slot thứ–giờ–phòng và khoảng hiệu lực; số slot chính là số buổi/tuần. Hệ thống sắp bài theo Unit rồi thứ tự, đề xuất bài chưa hoàn thành và dự kiến vào lịch. Giáo viên có thể ôn bài cũ. Tạo kế hoạch/chọn bài/mở lịch chưa tăng tiến độ; kết thúc buổi mới ghi nhận hoàn thành, học lại không tăng số bài. Bài cố định trên slot sẽ được dùng lặp để ôn; bỏ gắn bài để tiếp tục theo lộ trình.

**Độ đúng:** `100 × tổng câu đúng / (tổng đúng + tổng sai)`. Gộp số câu thực từ ActivityResult hoàn thành, LearningEvent chặng 2/3 và buổi lớp hoàn thành có mặt/đến trễ. Không lấy trung bình các phần trăm hoặc điểm tốt nhất; không có câu trả lời thì chưa có dữ liệu. Sao không dùng để suy ra độ đúng.

**Năng lực:** VocabularyMastery lưu đúng/sai/streak theo từng từ. Từ vững khi ≥3 lần đúng liên tiếp hoặc ≥5 lần với tỷ lệ đúng ≥80%. Nghe hiểu hiện chỉ dựa vào câu trả lời ActivityResult của LISTEN_CHOOSE/LISTEN_REPEAT; chưa suy ra năng lực nghe riêng từ các chặng có nhiều dạng tương tác. Phát âm chưa có bộ đo đáng tin cậy nên không tự cho điểm. Cấp độ theo sao thể hiện mức tham gia, không phải chứng nhận năng lực ngôn ngữ.

**Tiến bộ:** lấy Progress.completed, lịch sử kết quả/sự kiện học, mastery và các nguồn sao. Tiến độ tự học khác tiến độ dạy cả lớp. Giữ kết quả cũ thiếu chứng cứ chi tiết nhưng không tạo câu trả lời để lấp báo cáo; có thể có bài hoàn thành trong lịch sử mà chưa đủ chứng cứ tính độ đúng.

**Vinh danh trường:** sao lớp trong kỳ / số buổi hoàn thành trẻ tham gia; tối thiểu 2 buổi tuần/4 buổi tháng. Loại LIVE/SCHEDULED, ABSENT/EXCUSED, sao tự học và sao Unit. So sánh phân số chính xác, số làm tròn trên màn hình không quyết định hạng. Chỉ công bố kỳ đã kết thúc, lưu bản chốt và không cộng sao mới. Cách này giảm lợi thế do lớp học nhiều buổi; các giáo viên vẫn cần áp dụng tiêu chí thưởng sao nhất quán.

**Giáo án:** công cụ chuẩn bị tùy chọn cho trình tự hoạt động, phân bổ thời gian, khẩu lệnh và cử chỉ TPR theo từ/mẫu câu của bài. Giáo án được chuyển vào buổi và cử chỉ dùng ở phần dạy từ. Không quyết định sao, năng lực hoặc hoàn thành bài. Có thể vào chuẩn bị buổi trực tiếp; copilot trong buổi đã bỏ.

**Thời lượng:** lưu plannedDuration, đối chiếu đồng hồ để nhắc tổng kết; quá thêm 15 phút có nhắc kết thúc/nhắc lại. Thời lượng thực tính từ startedAt/endedAt. Không tự dừng lớp hay ghi hoàn thành khi hết giờ. Màn chuẩn bị đã ghi rõ tác dụng.

## Trò chơi trẻ và quyền admin

Kho trò có Activity/câu hỏi database và 12 mẫu chặng 3 sinh từ từ vựng. Admin quản lý nội dung hoạt động, đồng thời bật/tắt và xếp thứ tự 12 mẫu. Backend kiểm tra mọi bài hoạt động còn ít nhất hai trò tương thích trước khi lưu, có kiểm tra phiên bản cấu hình.

Trẻ đi tuần tự: khám phá đủ từ → luyện tập theo tuổi/hình minh họa → hoàn thành ít nhất hai trò khác nhau. Mỗi bài hiện tối đa bốn trò phù hợp từ loại/ảnh. Sao bài dựa độ đúng chặng 2 tốt nhất; sao hiển thị trong trò là động viên, không cộng lặp. Backend kiểm tra kế hoạch, thứ tự chặng, chấm lại đáp án và chống nộp lặp. Mở bài lấy kế hoạch mới theo cấu hình admin; kế hoạch cũ có thể yêu cầu mở lại khi học liệu đã đổi.

## Từ vựng và hình ảnh

- Đối chiếu đủ **409 từ**, nghĩa, IPA, từ loại và Unit với tài liệu docs; không tuyên bố đã kiểm chứng sách gốc vì không có sách gốc trong phạm vi này.
- Kiểm tra 409 ảnh và 409 animation: tồn tại, ánh xạ từ, nhãn, SVG và Media. Xem thủ công 9 trang tổng hợp toàn bộ từ và kiểm tra riêng 50 hình đã sửa.
- Sửa **50 hình** sai/khó phân biệt: crawl, jump, park, blocks, orange juice, cereal, skirt, sweater, shovel, jump rope, các bộ phận cơ thể, người thân và hành động.
- Thêm **64 liên kết từ–bài vào 26 bài**, trong đó **24 từ** màu sắc/số đếm trước đây chưa có trong bài hoạt động. Giữ nguyên 108 ID bài và lịch sử học.
- Dad/father, Mom/mother được nhận diện đồng nghĩa trong mục tiêu/đáp án nhiễu và chấm backend. Không đưa từ cùng nghĩa làm đáp án đối lập; tránh ảnh giống mục tiêu khi tạo đáp án nhiễu.
- [Audit từ vựng–ảnh](vocabulary-image-audit-2026-11-01.json) không còn lỗi cấu trúc, thiếu từ hoặc thiếu liên kết Unit. Ảnh dùng chung cho khái niệm liên quan được liệt kê để bảo trì, không tự coi mọi ảnh trùng là từ đồng nghĩa.

## Kiểm tra và phạm vi áp dụng

Kết quả tổng hợp có thể đối chiếu tại [biên bản kiểm tra](system-revision-validation-2026-11-01.json).

- Backend **122/122**, frontend **50/50** tests đạt; production build thành công. Lint exit code 0 nhưng còn cảnh báo React/dependency/unused trong dự án, không coi là không có cảnh báo.
- [Audit database](database-audit-request-final-2026-11-01.json): 29 model/collection, 10.056 tham chiếu, không khóa ngoại hỏng/unique trùng/index thiếu. Một INFO về hoàn thành cũ thiếu chứng cứ chi tiết được bảo toàn.
- [Smoke API chỉ đọc](teaching-revision-smoke-2026-10-31.json): backend nguồn hiện tại với database thật, API admin/giáo viên đều 200; 108 bài còn ít nhất hai trò chặng 3 tương thích. Database hiện không có Activity ANIMAL_SOUND đang ACTIVE; bộ trò chung lớp có bản ghi tiếng kêu.
- Chrome QA dùng hồ sơ riêng và fixture chỉ đọc cho tổng quan, học sinh, lịch, chuẩn bị, chọn/bỏ chọn trò, tổng kết, admin trò chơi và vinh danh. Có kiểm tra viewport thật 390/1440 px. Ảnh QA nội bộ tại `.tmp`; fixture UI không thay thế kiểm tra nghiệp vụ với database thật.
- Chrome giải mã thành công cả 9 file âm thanh, có tín hiệu trong phần được phát. Không gửi báo cáo hoặc công bố vinh danh thật khi kiểm tra. Chưa nghe xác nhận trên loa lớp học thực tế; bản ghi có nguồn/giấy phép và xử lý lỗi phát.
- Đã backup trước migration tại `.local-backups/teaching-*`, `vocabulary-*` và `database-repair-2026-10-28/before-images-*` (tên thư mục ảnh kế thừa công cụ cũ, timestamp file là thời điểm thật). [Database.md](database.md) đã bổ sung các model/ràng buộc còn thiếu.

Thay đổi đã nằm trong mã nguồn và database đang cấu hình cục bộ. Cần khởi động lại tiến trình ứng dụng cũ để dùng mã mới; chưa triển khai lên máy chủ ngoài.
