# Kế hoạch test toàn bộ web — 28/10/2026

Đây là **kế hoạch nghiệm thu cần thực hiện**, không phải biên bản khẳng định mọi ca đã đạt. Xem [báo cáo ưu tiên](business-priorities-2026-10-28.md) để biết các lỗi đã xác minh. Đợt rà soát đã chạy 15 probe giả lập và đọc 108 bài ACTIVE; chưa chạy E2E giao diện. Các probe hiện tại mô tả hành vi sai, nên pass của probe không có nghĩa ứng dụng đạt nghiệp vụ.

Cập nhật sau sửa: xem [kết quả triển khai](business-fixes-2026-10-28.md) và [17 ca tích hợp MongoDB thật](business-fixes-validation-2026-10-28.json). Các ca UI trong kế hoạch này chưa được tự đánh PASS.

## 1. Chuẩn bị môi trường và quy tắc

- Dùng database QA riêng, tên như `kcenglishkids_qa_20261028`, cấu hình URI tường minh và xác nhận tên database trước khi chạy. Không chạy seed, xóa, sửa điểm, thử backup/restore hoặc ca phá dữ liệu trên database đang dùng.
- Chụp backup môi trường QA trước mỗi vòng phá dữ liệu. Dùng tài khoản, tên và thông tin liên hệ giả. Xác nhận server/client cùng môi trường; không tự chuyển sang database local khi URI QA lỗi.
- Tạo ADMIN; giáo viên TA và TB; lớp CA thuộc TA và CB thuộc TB; học sinh A/B thuộc CA, C thuộc CB; trẻ N chưa có lịch sử. Có lớp cho đủ ba nhóm tuổi 3–4, 4–5, 5–6 và lớp chưa có giáo viên/học sinh.
- Chuẩn bị hai trình duyệt/thiết bị cho A, một phiên của C, một phiên chưa đăng nhập. Không dùng một localStorage chung để giả lập nhiều người mà không đăng xuất đúng cách.
- Chuẩn bị một Unit đủ 4 bài hợp lệ; bài chưa mở; bài INACTIVE; bài khác tuổi; bài có 3 từ/không đủ game; từ thiếu hình/audio; Activity có 0/1/nhiều câu; bài giao gồm 2 hoạt động; lịch học quá khứ/hiện tại/tương lai.
- Chuẩn bị các mức điểm ngay dưới/đúng/ngay trên mỗi ngưỡng sao đang cấu hình. Không tự giả định ngưỡng cố định. Ghi lại quy tắc và phiên bản dùng trong lần test.
- Chốt trước quy tắc: hoàn thành Lesson dựa trên bằng chứng nào; có bắt buộc 2 game khác nhau; học lại có cải thiện điểm/sao hay không; ngày streak dựa vào học hay đăng nhập; tài khoản gia đình có xác minh người lớn; chính sách nộp muộn/chuyển lớp.

Mỗi kết quả ghi: mã ca, phiên bản commit, môi trường, người test, vai trò/fixture, thao tác, kết quả thực, kết quả mong đợi, PASS/FAIL/BLOCKED và bằng chứng. Có thể ghi Network request/response đã bỏ token/cookie và dữ liệu cá nhân, ảnh UI, ID bản ghi fixture, số lượng trước/sau. Không ghi token vào báo cáo.

## 2. Những luồng phải chạy xuyên suốt

**E2E-01 — Mở lớp và bắt đầu học:** Admin tạo giáo viên → lớp đúng tuổi → thêm A → gán TA → lập lịch → A đăng nhập → thấy đúng lộ trình → TA thấy đúng danh sách và lịch. Đối chiếu quyền bằng TB/C.

**E2E-02 — Hoàn thành một Lesson:** A mở bài được phép → Chặng 1 nghe/xem từ → Chặng 2 trả lời sai rồi sửa/gợi ý → Chặng 3 hoàn thành đủ game hợp lệ → xem kết quả → tải lại → đăng nhập thiết bị thứ hai. Cùng một trạng thái hoàn thành và điểm xuất hiện ở mọi nơi; bài tiếp theo mở đúng quy tắc. Chạy riêng cho ba nhóm tuổi.

**E2E-03 — Hoàn thành Unit:** làm đủ 4 Lesson qua giao diện → xem tiến độ → nhận/mở rương → tải lại và mở lại trên thiết bị khác. Đối chiếu đúng một UnitCompletion, thưởng +5 sao và một sticker theo quy tắc hiện tại; không cộng lại khi retry/học lại/mở rương lại.

**E2E-04 — Bài giao và đánh giá:** TA giao bài cho CA → A thấy đúng bài → A hoàn thành qua luồng học thực tế → TA thấy trạng thái nộp và bằng chứng đúng → nhận xét/điểm thưởng → gia đình đọc phản hồi → TA sửa nhận xét/điểm. Sửa phải thay thế đúng phần cũ, không cộng dồn ngoài ý muốn. Kiểm tra cả bài giao nhiều hoạt động và nhiều bài giao dùng cùng Lesson.

**E2E-05 — Tiết học trực tiếp:** TA mở tiết theo lịch → điểm danh A có mặt/B vắng → bắt đầu một phiên LIVE → ghi điểm với operation ID → gửi lại cùng thao tác → kết thúc tiết → xem báo cáo học sinh/giáo viên/admin. Điểm không nhân đôi; trẻ vắng không tự nhận điểm; phiên đóng không nhận ghi ngoài chính sách.

**E2E-06 — Trao đổi gia đình:** TA gửi nhận xét/thông báo → gia đình A nhận → mở đúng đối tượng → người lớn trả lời theo cơ chế đã chốt → TA đọc phản hồi. C/TB không đọc hoặc trả lời thay A; nhãn người gửi phản ánh đúng mức xác thực.

**E2E-07 — Vòng đời học liệu:** Admin tạo nháp từ/ảnh/audio/câu hỏi → thêm vào Lesson/Unit → xem thử đúng nhóm tuổi → kiểm tra đủ game → xuất bản → A học và TA giao bài → sửa/ẩn nội dung → mở lại bài giao và lịch sử cũ. Nội dung đã giao và kết quả đã phát sinh phải giữ nghĩa ban đầu hoặc được sửa theo một quy trình có thông báo.

**E2E-08 — Chuyển lớp:** A đang có tiến độ/bài giao/đánh giá → chuyển từ CA sang CB → kiểm tra TA/TB/A và kỳ báo cáo. Quyền hiện tại đổi theo lớp; lịch sử được giữ theo chính sách; không lộ trẻ ngoài phạm vi. Nếu khác tuổi cần quyết định rõ giữ lịch sử và chọn lộ trình mới.

**E2E-09 — Mất mạng và khôi phục:** A học → ngắt mạng trước gửi kết quả → tải lại → kết nối → đồng bộ → mở thiết bị thứ hai; lặp lại khi server đã ghi nhưng client chưa nhận response. Không mất kết quả đã được xác nhận, không cộng hai lần; trạng thái chưa đồng bộ phải nhìn thấy được.

**E2E-10 — Khôi phục hệ thống:** export backup từ QA có đủ lịch sử → restore vào database QA trống → kiểm tra BSON/reference/index/số lượng → đăng nhập → mở Lesson, bài giao, kết quả và phần thưởng. Không dùng restore trực tiếp vào dữ liệu đang vận hành để thử nghiệm.

## 3. Bộ ca nghiệm thu chi tiết

Các mong đợi về quy tắc chưa chốt là **đề xuất nghiệm thu**, cần ghi quyết định trước khi chạy. Đặc biệt không dùng ca chưa có quy tắc để kết luận sai nghiệp vụ một cách tuyệt đối.

### A. Đăng nhập, danh tính và phân quyền

| Mã | Thao tác | Kết quả cần đạt |
|---|---|---|
| AUTH-01 | Đăng nhập/đăng xuất từng vai trò; mở lại URL đã lưu | Đúng trang/quyền; sau logout không dùng được phiên ở client; dữ liệu người trước không hiện cho người sau |
| AUTH-02 | Đăng ký có mật khẩu nhưng không nhập PIN; thử đường đăng nhập PIN | Không tạo PIN mặc định chung; phải thiết lập bí mật cá nhân hoặc vô hiệu hóa đường PIN |
| AUTH-03 | Sai mật khẩu/PIN nhiều lần, thử lookup liên tiếp | Có giới hạn thử sai phù hợp và thông báo không giúp dò tài khoản; tài khoản đúng vẫn có đường khôi phục |
| AUTH-04 | Đổi PIN/mật khẩu trên thiết bị 1, dùng JWT cũ ở thiết bị 2 | Token cũ bị thu hồi theo chính sách; không còn tiếp tục gọi API bằng bí mật cũ |
| AUTH-05 | Teacher/admin reset tài khoản rồi đăng nhập lại | Chỉ đúng vai trò được reset; bí mật mới hoạt động; phiên cũ mất hiệu lực; không lộ bí mật qua log |
| AUTH-06 | Token hết hạn/sai chữ ký; bỏ token; sửa role trong payload | API từ chối; UI đưa về đăng nhập và giữ thông báo phù hợp, không gửi lặp vô hạn |
| AUTH-07 | Anonymous mở learning session và lesson với query childId=A | Nội dung công khai chỉ có học liệu; không trả kết quả/điểm/định danh học tập của A |
| AUTH-08 | Token C đọc/ghi tiến độ, session, mastery, thưởng và thông báo A | Bị từ chối toàn bộ; không có thay đổi ở A |
| AUTH-09 | TB dùng route teacher và route /children trực tiếp cho A | Cùng một giới hạn phạm vi, không lách bằng route khác hoặc query childId |
| AUTH-10 | Thử trả lời nhãn PARENT bằng phiên CHILD | Có xác minh người lớn hoặc ghi nhãn tài khoản FAMILY đúng thiết kế; không ngầm xác nhận danh tính người lớn |

Ma trận bắt buộc áp dụng cho **mỗi endpoint có dữ liệu học sinh**, không chỉ trang UI:

| Người gọi | Đọc/ghi của A | Đọc/ghi của C | Học liệu công khai |
|---|---|---|---|
| Anonymous | Từ chối dữ liệu cá nhân | Từ chối dữ liệu cá nhân | Chỉ dữ liệu được xuất bản |
| CHILD A | Chỉ thao tác học được phép của mình | Từ chối | Theo tuổi/quy tắc mở bài |
| CHILD C | Từ chối | Chỉ thao tác học được phép của mình | Theo tuổi/quy tắc mở bài |
| TA quản lý CA | Theo quyền giáo viên, không mạo danh bài nộp của trẻ | Từ chối nếu không có phân công khác | Theo chức năng soạn/giao bài |
| TB quản lý CB | Từ chối nếu không có phân công khác | Theo quyền giáo viên | Theo chức năng soạn/giao bài |
| ADMIN | Theo quyền quản trị được định nghĩa, có truy vết thay đổi | Tương tự | CRUD có kiểm tra phụ thuộc |
| Người lớn đã liên kết, nếu triển khai | Chỉ trẻ đã liên kết và chức năng gia đình | Từ chối khi chưa liên kết | Theo chính sách gia đình |

Thử GET/POST/PUT/PATCH/DELETE được hỗ trợ với ID thật của fixture ngoài phạm vi, ID không tồn tại và ID sai định dạng. Bao phủ session, lesson?childId, curriculum, progress, mastery, reward, assignment, attendance, note, notification, review. 401 khi thiếu xác thực; ngoài phạm vi phải bị từ chối nhất quán (403 hoặc 404 nếu chủ đích che sự tồn tại).

### B. Học, chấm điểm và tiến độ

| Mã | Thao tác | Kết quả cần đạt |
|---|---|---|
| LEARN-01 | Trẻ mới vào ba nhóm tuổi, mở bài đầu và bài chưa đủ điều kiện | Đúng lộ trình; bài mở/khóa nhất quán giữa UI và API |
| LEARN-02 | Mở bài INACTIVE/khác tuổi qua URL và API | Không học trái chính sách; trường hợp được giáo viên giao ngoại lệ phải có quy tắc rõ |
| LEARN-03 | Chặng 1 nghe từng từ, nghe lại, chuyển màn, tải lại | Trạng thái theo quy tắc thực; không tự hoàn thành vì chỉ mở màn hình |
| LEARN-04 | Chặng 2 sai, dùng gợi ý, sửa đúng, thoát giữa chừng | Ghi nhận đúng sai/hỗ trợ; không đánh đồng được trợ giúp với đúng ngay nếu dùng để đánh giá |
| LEARN-05 | Hoàn thành cùng một game hai lần ở Chặng 3 | Không tính là hai game khác nhau khi quy tắc yêu cầu 2 game khác nhau |
| LEARN-06 | Chạy đủ 108 bài ACTIVE qua kiểm tra readiness; mở các bài bị báo lỗi | Mỗi bài có đường hoàn thành hợp lệ; không còn 0/1 game khi bắt buộc 2 |
| LEARN-07 | Gửi thẳng stage3 khi chưa có stage1/2; giả score/stars | Backend từ chối chuyển trạng thái sai; không ghi Progress trước khi kiểm tra |
| LEARN-08 | Gửi câu trả lời lặp index, vượt index, sai kiểu, thừa câu | Từ chối payload sai; không thể đạt điểm cao hơn tối đa |
| LEARN-09 | Gửi answers rỗng cho bài có câu hỏi; bài cấu hình 0 câu | Không ghi hoàn thành sai; nội dung không có câu bị chặn xuất bản hoặc xử lý theo quy tắc riêng |
| LEARN-10 | Làm bài ở sát các ngưỡng sao; thử đúng/sai toàn bộ | Điểm/sao đúng quy tắc, không hard-code 100 điểm/3 sao bất kể kết quả |
| LEARN-11 | Học lại một bài đã hoàn thành với kết quả thấp/cao hơn | Áp dụng chính sách best/latest đã chốt; lịch sử lần làm không bị mất, không tự nhân thưởng |
| LEARN-12 | Reload/đăng xuất/thiết bị mới sau mỗi chặng | Server và UI khớp; không chỉ dựa localStorage; không nhảy lùi hoặc mở sai bài |

### C. Bài giao, lớp, thưởng và báo cáo

| Mã | Thao tác | Kết quả cần đạt |
|---|---|---|
| SCHOOL-01 | Tạo/sửa lớp, gán giáo viên/học sinh; thử thêm trùng/khác tuổi | Quan hệ hai phía nhất quán; từ chối trùng hoặc sai điều kiện với thông báo rõ |
| SCHOOL-02 | Tạo lịch, trùng lịch, đổi/hủy; xem bằng TA/A | Chính sách xung đột rõ; lịch các vai trò đồng bộ; hủy không xóa lịch sử tiết đã dạy |
| SCHOOL-03 | TA giao bài đúng lớp/tuổi; TB giao vào CA bằng API | A nhận đúng bài; TB bị từ chối ngoài phạm vi |
| SCHOOL-04 | A học Lesson được giao bằng luồng 3 chặng | TA thấy nộp đúng và xem được bằng chứng; không cần gọi thêm luồng Activity cũ để vá kết quả |
| SCHOOL-05 | Hai bài giao cùng Lesson; làm trước/sau lúc giao | Quy tắc tính bài cũ/bài mới rõ; không gán nhầm lần làm sang assignment khác |
| SCHOOL-06 | Nộp sát hạn/quá hạn, sửa hạn, hủy giao | Thời gian và trạng thái đúng chính sách; không âm thầm mất bài đã nộp |
| SCHOOL-07 | Ẩn/sửa một trong hai hoạt động sau khi giao | Không tự giảm yêu cầu nộp; snapshot/phiên bản giữ nghĩa nội dung đã giao |
| SCHOOL-08 | Chấm/nhận xét/điểm thưởng rồi sửa lại và gửi lặp | Điểm mới thay thế đúng phần cũ; không cộng trùng; người học thấy nhận xét hiện hành |
| SCHOOL-09 | Điểm danh, đổi trạng thái có mặt/vắng; TA/TB thử cùng ID | Đúng quyền; báo cáo và điều kiện nhận điểm nhất quán |
| SCHOOL-10 | Mở LIVE hai lần; gửi score cùng operation ID; kết thúc rồi ghi tiếp | Một phiên hợp lệ theo quy tắc; thao tác trùng không tăng điểm; phiên đóng được bảo vệ |
| SCHOOL-11 | Chuyển lớp/giáo viên khi đã có lịch sử | Quyền mới cập nhật; báo cáo quá khứ không bị gán lại sai; không lộ dữ liệu ngoài phạm vi |
| SCHOOL-12 | Xem dashboard từng vai trò và lọc ngày/lớp | Tổng hợp từ cùng dữ liệu; không trộn điểm LIVE, sao Lesson và thưởng ngoài quy tắc |
| REWARD-01 | Hoàn thành 1 Lesson bằng UI, đối chiếu lịch sử/tiến độ/bài giao | Một định nghĩa hoàn thành; các màn cùng ghi nhận |
| REWARD-02 | Hoàn thành đủ Unit; nhận/mở rương nhiều lần, hai tab | Một quyền thưởng Unit, +5 sao/1 sticker đúng cấu hình; không nhân đôi |
| REWARD-03 | Bằng điểm vinh danh tuần/tháng; thay đổi kỳ và múi giờ | Xếp hạng/hòa điểm/kỳ thống nhất với quy tắc hiện tại; không lấy nhầm toàn trường thay vì phạm vi lớp |
| REWARD-04 | Đăng nhập không học, học sát nửa đêm, gọi debug streak | Streak theo định nghĩa đã chốt; endpoint thử không sửa thành tích production |
| FAMILY-01 | Nhận thông báo, đọc, đánh dấu đã đọc; mở link thông báo | Đúng gia đình/đối tượng; link hợp lệ; đọc lặp không tạo thêm thông báo |
| FAMILY-02 | Trả lời nhận xét; TA đọc; C/TB mở cùng ID | Nội dung và danh tính đúng; người ngoài phạm vi không đọc/ghi |

### D. Học liệu, database và vận hành

| Mã | Thao tác | Kết quả cần đạt |
|---|---|---|
| DATA-01 | Tạo từ mới ngoài manifest ảnh hiện tại | Có bước chọn/tải/gắn media; không xuất bản ACTIVE thiếu tài nguyên bắt buộc |
| DATA-02 | Tạo Lesson thiếu từ/đáp án/tuổi/game hoặc trùng thứ tự | Checklist xuất bản phát hiện và nêu cách sửa; xem thử trước khi ACTIVE |
| DATA-03 | Sửa/xóa từ đã có trong Activity, kết quả, mastery và lịch sử | Lưu trữ/guard phụ thuộc; không tạo tham chiếu đứt hoặc đổi nghĩa kết quả cũ |
| DATA-04 | Xóa/ẩn Activity và Unit đang có bài giao/phần thưởng | Bảo toàn snapshot/lịch sử, Topic.relatedUnits và UnitCompletion nhất quán |
| DATA-05 | Import dữ liệu trùng/sai cột/ID lỗi/thiếu media | Có báo lỗi từng dòng, preview hoặc kết quả rõ; không tạo nửa dữ liệu âm thầm |
| DATA-06 | Export rồi restore sang QA trống, audit sau restore | BSON, ID, quan hệ, index, số lượng và chức năng đăng nhập/học/thưởng phục hồi đúng |
| DATA-07 | Cấu hình DB sai/tạm mất DB khi khởi động | Không tự dùng DB khác; readiness không báo sẵn sàng; lỗi không lộ URI/bí mật |
| DATA-08 | Sau vòng CRUD/chuyển lớp/restore, chạy audit DB | Không có tham chiếu đứt mới; bản ghi lưu trữ có lý do và truy vết |

### E. Mất mạng, ghi lặp và đa thiết bị

| Mã | Thao tác | Kết quả cần đạt |
|---|---|---|
| SYNC-01 | Tắt mạng trước gửi hoàn thành, reload rồi nối mạng | Kết quả chờ được lưu bền vững hoặc UI chỉ rõ chưa lưu; retry không mất/trùng |
| SYNC-02 | Server đã ghi nhưng response timeout; client gửi lại | Cùng submission/operation ID trả cùng kết quả; không thêm điểm/kết quả/thưởng lần hai |
| SYNC-03 | Hai tab/thiết bị hoàn thành đồng thời cùng bài/Unit | Race không cấp thưởng hai lần; dữ liệu tổng hợp có quy tắc hợp nhất |
| SYNC-04 | Thiết bị cũ sync mastery sau thiết bị mới | Không ghi đè bộ đếm mới bằng dữ liệu cũ; hợp nhất có version/event rõ |
| SYNC-05 | Đổi tài khoản khi request cũ đang chờ; response trả muộn | Không gắn kết quả/toast/tiến độ của A vào tài khoản C |
| SYNC-06 | localStorage đầy/bị chặn hoặc bị xóa giữa chừng | UI không treo; không báo đã lưu khi chưa lưu; kết quả server vẫn phục hồi được |

### F. Giao diện, media và khả năng sử dụng

| Mã | Thao tác | Kết quả cần đạt |
|---|---|---|
| UI-01 | Chạy luồng chính ở 360×640, 390×844, 768×1024, 1366×768 | Không che nút/đáp án/điểm; cuộn/modal/menu hoạt động; chạm phù hợp trẻ |
| UI-02 | Chrome/Edge desktop, Chrome Android, Safari iPhone/iPad | Học và lưu kết quả nhất quán; tính năng không hỗ trợ có hướng dẫn/đường thay thế |
| UI-03 | Chặn autoplay/từ chối mic/mất file audio hoặc hình | Có thao tác bật âm rõ, fallback phù hợp và retry; không kẹt luồng bắt buộc |
| UI-04 | Từ dài, nhiều từ cùng loại, màu/số/động từ, ảnh nền trong suốt | Nhận diện đúng nghĩa; không crop mất vật thể; shadow/puzzle không mất đặc điểm cần thiết |
| UI-05 | Chạm/kéo thả, xoay màn hình, bàn phím ở màn quản trị | Không kéo nhầm/nhân thao tác; focus/modal/nút submit dùng được |
| UI-06 | Reduced motion, tắt tiếng, mạng chậm và asset chưa tải | Hướng dẫn vẫn hiểu; hiệu ứng không cản học; có loading/error dễ hiểu |

Tổng cộng **60 ca chi tiết**, ngoài 10 luồng E2E và ma trận endpoint. Nếu một ca không áp dụng phải ghi lý do; không tự đánh PASS cho tính năng chưa có.

## 4. Tự động hóa và thứ tự chạy

1. Chạy regression backend/frontend, build và lint. Kết quả vòng trước là 106 test backend, 39 test frontend; đây là mốc tham khảo, không thay cho chạy lại sau khi sửa.
2. Chạy `npm.cmd run test:business` ở backend để kiểm tra hành vi đúng trên database QA riêng. 15 bằng chứng ban đầu được giữ làm tài liệu lịch sử, không còn là bài kiểm tra nghiệm thu bản đã sửa.
3. Chạy `node audits/game-coverage.audit.js` ở backend. Script chỉ đọc database cấu hình, ghi báo cáo local; exit 2 có nghĩa còn bài không đủ game, exit 1 nghĩa kiểm tra không hoàn tất. Luôn xác nhận môi trường trước khi chạy.
4. Bổ sung integration test dùng DB QA cho quyền truy cập qua mọi route thay thế, giới hạn điểm, chuyển chặng, retry/race, bài giao theo snapshot và thưởng Unit. Model mock không chứng minh transaction/index/race thật.
5. Tự động hóa E2E tối thiểu 01–05, 07, 09–10; chạy UI thủ công cho ba nhóm tuổi, audio/mic, touch, hình và bố cục. Không xem HTTP 200 của asset/API là bằng chứng nội dung đúng hay trải nghiệm dùng được.
6. Chạy smoke trên bản triển khai với tài khoản test được phép; chỉ thao tác không phá dữ liệu. Backup/restore, lỗi DB và thử tải chạy ở QA.

## 5. Điều kiện phát hành

- Không còn P0: quyền truy cập không rò qua route khác, không chấm vượt điểm, không hoàn thành rỗng/bỏ chặng, không PIN chung, không bài đã xuất bản bị kẹt.
- Tất cả 108 bài ACTIVE hiện có và mọi bài mới đều qua readiness; E2E học thật xác nhận ít nhất từng kiểu game/nhóm tuổi, đặc biệt 12 bài từng bị chặn.
- E2E Lesson → bài giao → đánh giá → Unit → thưởng và tiếp tục trên thiết bị khác đạt; retry và hai tab không cấp đôi kết quả/thưởng.
- CRUD/hide nội dung không làm thay đổi ngầm yêu cầu bài đã giao; audit liên kết sạch sau vòng kiểm tra; backup được phục hồi thử thành công.
- Có kết quả UI thật trên thiết bị/trình duyệt đã chọn; không còn lỗi chặn nút, audio bắt buộc hoặc thao tác kéo/chạm.
- Mỗi lỗi còn lại có mức độ, ảnh hưởng, người xử lý và quyết định phát hành rõ ràng. Không đánh dấu hoàn thiện toàn web chỉ vì test tự động hiện có đều xanh.
