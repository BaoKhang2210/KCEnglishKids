# Rà soát và sửa không gian giáo viên — 28/10/2026

## Phạm vi và cách kiểm tra

Đã đọc các route giáo viên, buổi dạy, học liệu/mẫu câu, giáo án, vinh danh; các controller/model liên quan; luồng bài tập và hộp thư ở phía học sinh/gia đình; những trang đang được gắn trong `App.tsx`. Rà soát gồm quyền truy cập, điều kiện ghi dữ liệu, vòng đời buổi học, tính điểm, báo cáo và giao diện.

Đã sửa các vấn đề dưới đây trong mã nguồn. Kiểm thử tự động dùng model giả lập và HTTP Express cục bộ; chưa kết nối hoặc thay đổi cơ sở dữ liệu thật. Kết quả này không thay thế kiểm thử nghiệm thu với dữ liệu trường học, trình chiếu, âm thanh và micro thực tế.

## Đối chiếu vấn đề và xử lý

| Mã | Mức độ | Vấn đề tìm thấy | Xử lý hiện tại |
| --- | --- | --- | --- |
| GV-01 | Cao | API xem mức độ thuộc từ vựng chưa kiểm tra giáo viên phụ trách | Dùng phạm vi lớp/học sinh thống nhất trước khi đọc dữ liệu. |
| GV-02 | Cao | Gửi thông báo có thể chọn học sinh hoặc buổi dạy của giáo viên khác | Kiểm tra học sinh, lớp, giáo viên, trạng thái buổi học và thành viên buổi học. |
| GV-03 | Cao | Tài khoản giáo viên có thể gọi luồng phản hồi với vai trò phụ huynh | Chỉ tài khoản CHILD tương ứng mới được phản hồi hoặc xác nhận đọc với vai trò gia đình. |
| GV-04 | Cao | API giáo viên vẫn cho đổi nhóm tuổi/trạng thái và tự thêm, bớt học sinh, bỏ qua quy tắc admin | Phân bổ học sinh và thông tin hành chính do admin quản lý. Giáo viên chỉ sửa tên/mô tả lớp ở endpoint giáo viên. |
| GV-05 | Cao | Giáo viên cũ vẫn có thể ghi điểm vào buổi học sau khi lớp được bàn giao | Mọi thao tác ghi buổi học kiểm tra lại phân công lớp hiện tại. Lịch sử do mình dạy vẫn đọc được. |
| GV-06 | Cao | Điểm danh nhận học sinh khác lớp, bản ghi lặp, ngày sai và trạng thái không hợp lệ | Kiểm tra toàn bộ danh sách trước khi upsert; yêu cầu đủ sĩ số và không lặp. |
| GV-07 | Vừa | Ngày điểm danh/lịch có thể lệch khi chuyển qua UTC | Dùng ngày Việt Nam; giữ nguyên ngày người dùng chọn trong lịch. Có kiểm thử ranh giới nửa đêm. |
| GV-08 | Cao | Tạo buổi dạy chấp nhận hoạt động không thuộc bài, khác tuổi, dữ liệu bị ẩn | Kiểm tra bài, nhóm tuổi, giáo trình đã phân và từng hoạt động; giữ thứ tự hoạt động đã chọn. |
| GV-09 | Vừa | Bước soạn giáo án mở lớp trực tiếp, bỏ qua điểm danh | Chuyển sang chuẩn bị và điểm danh; chỉ bắt đầu khi đã có điểm danh hôm nay. |
| GV-10 | Cao | Mở được nhiều buổi LIVE cho một lớp/giáo viên | Kiểm tra xung đột và bổ sung unique partial index cho trạng thái LIVE. |
| GV-11 | Cao | Ghi điểm khi chưa bắt đầu hoặc sau khi đã kết thúc | Chỉ ghi điểm/câu trả lời/vị trí hoạt động khi LIVE. Kế hoạch chưa bắt đầu không được chốt thành buổi đã dạy. |
| GV-12 | Cao | Điểm và sao nhận số không giới hạn, số lẻ, NaN; vẫn thưởng học sinh vắng | Giới hạn giá trị nguyên theo thao tác; chỉ chấm học sinh có mặt/đi muộn; kiểm tra toàn bộ nhóm trước khi ghi. |
| GV-13 | Cao | Gửi lại thao tác có thể cộng sao nhiều lần | Mã thao tác được lưu cùng buổi học để chống ghi lại cùng yêu cầu. |
| GV-14 | Cao | Hai thiết bị cùng ghi điểm làm mất cập nhật của nhau | Bật optimistic concurrency; đọc lại và thử ghi trên phiên bản mới khi xung đột. |
| GV-15 | Cao | Lưu lại cùng câu hỏi tăng số câu đúng/sai lần nữa | Thay kết quả theo khóa câu hỏi và điều chỉnh chênh lệch; kiểm tra hoạt động, chỉ số và học sinh. |
| GV-16 | Vừa | Thưởng nhóm trả lời đúng rồi lưu câu hỏi bị tính câu đúng hai lần | Thưởng nhóm chỉ cộng điểm/sao; số câu đúng được ghi ở bước lưu câu trả lời. |
| GV-17 | Cao | GET nhật ký tự xóa kế hoạch quá 24 giờ và tự chốt buổi quá giờ | GET chỉ đọc; hết giờ chỉ nhắc giáo viên. Có thao tác xóa riêng cho kế hoạch chưa bắt đầu, chưa chứa kết quả. |
| GV-18 | Cao | Giao diện báo thành công dù lưu điểm/kết thúc buổi thất bại; fallback có thể thưởng lặp | Bỏ fallback thưởng lại; chỉ hiển thị thành công sau phản hồi; giữ lỗi và cho thử lại. |
| GV-19 | Vừa | Nhật ký chỉ lấy 100 buổi nên lộ trình có thể mất lịch sử | API phân trang; các trang giáo viên tải đủ các trang được trả về. |
| GV-20 | Cao | Kế hoạch SCHEDULED/LIVE bị tính là bài đã dạy; đề xuất bài kế tiếp bị kẹt ở bài đã hoàn thành | Lộ trình dùng buổi COMPLETED và `ClassRoom.completedLessons`; bỏ đề xuất cũ khi bài đã dạy, vẫn cho chủ động chọn ôn lại. |
| GV-21 | Vừa | Học sinh vắng hoặc chưa trả lời bị gán vào nhóm cần luyện thêm | Tổng kết chỉ nhận xét độ đúng khi có câu trả lời; tách vắng mặt và chưa có dữ liệu. |
| GV-22 | Vừa | Kiểm tra giờ dạy chỉ đọc một lịch, không xét đầy đủ hiệu lực | Xét tất cả lịch còn hiệu lực, theo giờ Việt Nam; chặn lịch chưa/hết hiệu lực. Lớp chưa cấu hình thời khóa biểu hỗ trợ dạy linh hoạt. |
| GV-23 | Cao | Bài làm cũ trước ngày giao vẫn được tính đã nộp; một hoạt động xong được tính xong cả Lesson | Chỉ tính kết quả hoàn thành sau lúc giao/bắt đầu; giao cả Lesson yêu cầu đủ hoạt động đang áp dụng. |
| GV-24 | Cao | Có thể nhận xét học sinh không được giao bài | Kiểm tra người nhận và lớp hiện tại; lưu danh sách người nhận ở thời điểm giao. |
| GV-25 | Cao | Sửa/gửi lại nhận xét tiếp tục cộng `User.stars`, trong khi tổng sao ở phần thưởng không đồng nhất | Lưu một nhận xét và số sao cho mỗi cặp bài giao/học sinh bằng cập nhật nguyên tử. Tổng sao đọc thêm nguồn thưởng này; sửa nhận xét thay thế số thưởng, không cộng lặp. |
| GV-26 | Vừa | Hạn nộp sai/ngược ngày không được kiểm tra; ngày date-only hết hạn từ đầu ngày | Chuẩn hóa ngày bắt đầu/hạn cuối theo giờ Việt Nam; hạn cuối bao gồm hết ngày. |
| GV-27 | Vừa | Xóa bài giao làm mất ngữ cảnh nhận xét | Hủy bài giao để giữ lịch sử, kết quả và sao đã ghi nhận. |
| GV-28 | Cao | Báo cáo dùng điểm game như phần trăm và cộng lượt học ở hai nguồn | Tính độ đúng từ câu trả lời; không cộng trùng `ActivityResult` với `Progress`. Tổng quan đếm toàn bộ bài giao thay vì sáu bài mới nhất. |
| GV-29 | Cao | Khi thiếu dữ liệu vẫn sinh điểm nghe/phát âm 70–88%, phản xạ dưới ba giây và nhận xét tốt | Bỏ số liệu suy đoán. Nghe chỉ dùng dữ liệu hoạt động nghe, phản hồi chỉ dùng thời gian thực ghi nhận; phát âm chưa có phép đo riêng hiển thị chưa đánh giá. |
| GV-30 | Cao | Báo cáo phụ huynh tin vào điểm/sao từ trình duyệt; gửi lại báo cáo buổi học tạo bản sao | Lấy số liệu từ buổi đã kết thúc; khóa nguồn theo buổi/học sinh để cập nhật khi gửi lại. Kiểm tra đủ người nhận trước khi ghi hàng loạt. |
| GV-31 | Vừa | Có nhãn tặng sao ở nhận xét nhanh nhưng không thực sự ghi thưởng; chưa phân biệt kênh gửi | Bỏ bộ chọn sao không có nghiệp vụ ghi thưởng. Sao thật ghi ở buổi dạy hoặc nhận xét bài tập. Hộp thư nêu rõ gửi trong ứng dụng. |
| GV-32 | Vừa | Nhiều lỗi tải bị nuốt hoặc hiện vòng chờ vô hạn | Bổ sung trạng thái lỗi/thử lại ở tổng quan, lớp, học liệu, bài giao, hồ sơ, nhật ký và tổng kết. |
| GV-33 | Vừa | Đổi bộ lọc/tìm kiếm có thể đổi người nhận trong lúc soạn phản hồi | Tách người nhận đang chọn khỏi kết quả tìm kiếm; khóa đổi hội thoại khi đang gửi. |
| GV-34 | Vừa | Phản hồi giáo án chậm ghi đè giáo án mới; thay bài có thể giữ giáo án cũ | Bỏ phản hồi lỗi thời; kiểm tra lại metadata giáo án với bài/tuổi/thời lượng trước khi lưu buổi dạy. |

## Giao diện và nghiệp vụ

- Sidebar chia nhóm: không gian giảng dạy; chuẩn bị/tổ chức; đồng hành cùng học sinh. Có mục hồ sơ học sinh và trao đổi phụ huynh riêng.
- Tổng quan mới ưu tiên lịch hôm nay, buổi đang mở, công việc trước/trong/sau giờ dạy, bài giao và dữ liệu cần quan sát.
- Tông trắng/xanh dịu, khoảng cách và chữ nhất quán; menu di động, chỉ báo trang hiện tại, liên kết bỏ qua điều hướng, focus bàn phím và giảm chuyển động.
- Kho học liệu, lớp, danh sách học sinh, giáo án, lịch và bài giao dùng chung khung giao diện. Các danh sách bài học/hoạt động/điểm danh ở bước chuẩn bị được mở dài theo trang, tránh thanh cuộn lồng nhau.
- Bài tập có thể giao cả lớp hoặc riêng một học sinh; bài học được lọc theo nhóm tuổi. Nhận xét giữ bản nháp khi gửi thất bại.
- Trang theo dõi tiến bộ dùng dữ liệu từng bé, có lọc lớp, nhóm cần quan sát và nhóm chưa có dữ liệu. Không xếp loại “khá giỏi/yếu” từ một điểm game.
- Màn tổng kết trình chiếu ghi nhận tất cả học sinh có mặt, thay bục xếp hạng ba bạn. Giáo viên vẫn có bảng số liệu và ghi chú riêng; vinh danh định kỳ giữ luồng hiện có.
- Hộp thư hiển thị hội thoại hai chiều và hồ sơ liên quan. Báo cáo vắng mặt ghi rõ vắng, không kết luận bé học yếu.

## Kiểm tra tự động và bản xem thử

Lệnh kiểm tra từ thư mục tương ứng:

```powershell
# KCEnglishKids_BE
npm.cmd test
# client
npm.cmd run build
npm.cmd test
```

Kết quả lần chốt: backend **84/84**, frontend **37/37**, TypeScript và production build đạt. Kiểm tra tĩnh các service/controller giáo viên bằng oxlint không có lỗi/cảnh báo. Build còn cảnh báo gói JavaScript chung lớn; không ảnh hưởng kết quả build và chưa tách gói trong đợt này.

Các bài test mới nằm ở `tests/teacherApi.test.js`, `tests/teacherRules.test.js`, `src/utils/vietnamTime.test.ts`. Test admin hiện có được cập nhật mock nguồn thưởng bài tập, vẫn giữ kiểm tra hồi quy.

Bản xem thử dùng dữ liệu giả lập, tách origin và chặn mọi request ghi:

```powershell
# client
npm.cmd run dev:teacher-preview
# http://127.0.0.1:5181/teacher/dashboard
```

Đã kiểm tra HTTP của trang và API dữ liệu mẫu, cùng điều kiện POST bị chặn 405. Chưa xác nhận kiểm thử trực quan bằng trình duyệt. Cần kiểm tra bố cục và các thao tác trên thiết bị thực tế theo danh sách nghiệm thu bên dưới.

## Kiểm thử nghiệm thu đề nghị

1. Đăng nhập giáo viên A/B: đối chiếu lớp, học sinh, mastery, thông báo; thử URL của lớp còn lại. Kiểm tra token CHILD không mở API giáo viên.
2. Mở lớp đang hoạt động, kiểm tra ngày điểm danh, đánh dấu có mặt/đi muộn/vắng/có phép, mở buổi dạy và đối chiếu sĩ số.
3. Soạn giáo án, đổi bài/tuổi/thời lượng nhanh; chuyển sang chuẩn bị và xác nhận đúng bài trước khi mở lớp.
4. Mở cùng buổi trên hai tab; cộng sao, lưu lại cùng câu hỏi, sửa đúng thành sai; chốt buổi rồi thử chấm tiếp. Thử mở một buổi khác khi đã có LIVE.
5. Kiểm tra nhật ký có kế hoạch cũ, xóa một kế hoạch trống, kiểm tra lịch sử COMPLETED và bài kế tiếp. Kế hoạch chưa dạy không tăng tiến độ.
6. Giao một game/cả Lesson/cá nhân; đối chiếu bài làm trước ngày giao không được tính. Hoàn thành từng hoạt động rồi nhận xét, sửa nhận xét và kiểm tra tổng sao ở phía bé.
7. Gửi báo cáo buổi học hai lần; kiểm tra hộp thư gia đình không nhân bản, số liệu khớp tổng kết, học sinh vắng có nội dung phù hợp. Phản hồi và đổi bộ lọc khi đang soạn để kiểm tra người nhận.
8. Dùng hồ sơ mới chưa học để kiểm tra không có điểm phát âm, phản xạ hoặc phần trăm thành tích tự sinh. Kiểm tra điện thoại, laptop, máy chiếu; nghe âm thanh, quyền micro và chức năng nhận dạng giọng nói trên trình duyệt thực tế.

## Dữ liệu cũ và giới hạn cần biết

- Chưa chạy migration hoặc kiểm thử trên MongoDB thật. Khi triển khai cần bảo đảm các index mới được tạo: một LIVE/lớp, một LIVE/giáo viên và khóa nguồn thông báo. Nếu dữ liệu cũ có nhiều LIVE, cần đối chiếu và chốt đúng buổi trước khi tạo unique index; không tự chốt lịch sử bằng giờ giả định.
- Kết quả bị cộng lặp, kế hoạch đã bị xóa hoặc các khoản thưởng kiểu cũ trước đợt sửa không thể khôi phục chính xác chỉ bằng sửa code. Nhận xét cũ còn nằm ở `ActivityResult` được hiển thị khi khớp giáo viên; không tự chuyển toàn bộ `User.stars` thành thưởng bài tập để tránh cộng sai.
- Bài giao mới có ảnh chụp danh sách người nhận. Bài giao cũ chưa có danh sách này dùng phạm vi lớp hiện tại làm tương thích; không thể suy ra chính xác sĩ số vào thời điểm cũ nếu chưa lưu.
- Hộp thư hiện dùng tài khoản học sinh/gia đình của hệ thống; chưa có tài khoản PARENT độc lập, email/SMS hoặc thông báo đẩy ngoài ứng dụng.
- Phép đánh giá phát âm bằng micro/nhận dạng giọng nói không được suy ra từ số sao/điểm game. Báo cáo chỉ dùng số liệu có lưu; đánh giá sư phạm vẫn cần quan sát thực tế.
- Nếu admin bàn giao lớp khi một buổi cũ vẫn LIVE, giáo viên cũ bị chặn thao tác và giáo viên mới không được mở buổi trùng. Cần kết thúc buổi đang mở trước khi bàn giao; API admin có thể chốt buổi khi cần xử lý vận hành.

Các trang cũ không còn gắn route, như `TeacherDashboardPage.tsx` và `TeacherAnalyticsTab.tsx`, không phải giao diện đang chạy. Được giữ lại để không xóa các thay đổi sẵn có của dự án.
