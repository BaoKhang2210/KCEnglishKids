# Rà soát nghiệp vụ và chức năng cần hoàn thiện — 28/10/2026

> Đây là kết quả trước khi sửa. Xem [bản triển khai và kết quả kiểm tra sau sửa](business-fixes-2026-10-28.md). File readiness game hiện phản ánh phiên bản đã sửa; danh sách 12 bài bên dưới là phát hiện ban đầu.

## Kết luận và phạm vi

Ứng dụng hiện chưa đủ điều kiện để coi luồng học–chấm điểm–tiến độ–bài giao–phần thưởng đã hoàn chỉnh. Sửa liên kết MongoDB và tải thành công các API là cần thiết, nhưng không chứng minh các quy tắc giữa những chức năng này khớp nhau.

Đã đối chiếu mã nguồn với mô tả chức năng trẻ em, quy tắc thưởng và các luồng quản trị/giảng dạy; chạy **15 probe tái hiện hành vi chưa đúng bằng model giả lập**, và kiểm tra chỉ đọc **108 bài ACTIVE trong database thật** bằng chính registry minigame. Không sửa mã ứng dụng hoặc dữ liệu thật trong đợt này. Chưa chạy thao tác UI xuyên suốt trên trình duyệt.

Probe chạy thành công nghĩa là **tái hiện được vấn đề**, không phải đạt yêu cầu nghiệp vụ. Các bài kiểm tra này nằm ngoài bộ regression thông thường.

Mức ưu tiên: **P0** chặn sử dụng dữ liệu thật hoặc chặn hoàn thành lộ trình; **P1** cần hoàn thiện để vận hành đúng; **P2** cải thiện chất lượng sau khi các luồng chính ổn định.

## Những việc phải hoàn thiện ngay

| Mã | Mức | Vấn đề đã xác minh | Hậu quả | Điều kiện nghiệm thu |
|---|---|---|---|---|
| B01 | P0 | 12 bài ACTIVE không đủ 2 game hợp lệ ở Chặng 3 | Trẻ không hoàn thành bài, có thể kẹt toàn bộ lộ trình phía sau | Mọi bài được xuất bản đều có đủ hoạt động hoàn thành hợp lệ; không có bài ACTIVE với lộ trình bất khả thi |
| B02 | P0 | API chặng tin stage/score/stars từ client, không kiểm tra các chặng trước | Có thể bỏ qua học, đánh dấu hoàn thành bài khác tuổi hoặc đã ngừng hoạt động | Backend kiểm tra quyền, tuổi/chính sách giao bài, trạng thái và chuyển tiếp chặng; điểm tính từ kết quả đã xác minh |
| B03 | P0 | Luồng minigame mới không dùng cùng bằng chứng kết quả với bài giao và cấp thưởng Unit | UI báo hoàn thành nhưng bài giao, lịch sử, rương và sao có thể không khớp | Hoàn thành một bài từ UI phải tạo đủ bằng chứng để giáo viên xem, bài giao ghi nhận và Unit được cấp thưởng đúng một lần |
| B04 | P0 | Một số đường đọc phiên/kết quả thiếu xác thực hoặc phạm vi lớp | Người chưa đăng nhập hoặc người khác đọc được thông tin học tập | Anonymous=401, sai chủ thể/phạm vi=403; không có nhánh truy cập khác qua childId để bỏ qua kiểm tra |
| B05 | P0 | Không kiểm soát số lượng/index câu trả lời; retry chưa được chống lặp đầy đủ | Điểm vượt tối đa, gửi rỗng vẫn hoàn thành, cộng trùng điểm phiên | Mỗi câu chỉ có một kết quả hợp lệ; điểm có giới hạn; mỗi submission có khóa chống lặp |
| B06 | P0 trước khi mở công khai | Đăng ký thiếu PIN dùng PIN chung; thiếu lớp bảo vệ đăng nhập phù hợp | Có đường đăng nhập yếu dù người dùng đã đặt mật khẩu mạnh | Không tạo PIN chung; giới hạn thử sai theo tài khoản/IP, tránh lộ danh sách trẻ rộng rãi và thu hồi phiên khi đổi thông tin đăng nhập |
| B07 | P1 | Xóa cứng từ vựng/hoạt động/Unit chưa bảo vệ toàn bộ quan hệ lịch sử | Tái tạo các liên kết đứt vừa được sửa | Nội dung có lịch sử phải lưu trữ/ngừng hoạt động hoặc có migration kiểm soát; audit vẫn sạch sau mọi CRUD được hỗ trợ |
| B08 | P1 | Cần xác định rõ tài khoản gia đình và danh tính phụ huynh | Tin nhắn có nhãn PARENT nhưng chỉ được xác thực bằng token CHILD | Có cổng người lớn/tài khoản liên kết; nếu dùng tài khoản chung phải ghi rõ là FAMILY, không khẳng định đã xác minh người gửi là phụ huynh |
| B09 | P1 | Đồng bộ offline và đa thiết bị dựa nhiều vào localStorage và ghi đè tổng đếm | Mất tiến độ, số liệu cũ ghi đè số mới, tiếp tục học khác nhau giữa thiết bị | Có hàng đợi bền vững, trạng thái pending/synced, khóa sự kiện, quy tắc hợp nhất và retry có chống trùng |
| B10 | P1 | Endpoint thử streak vẫn ghi vào dữ liệu thật; GET streak cũng cập nhật dữ liệu | Chuỗi ngày có thể bị làm giả và thay đổi bởi thao tác đọc | Demo chỉ thay hình xem thử; production không cho sửa streak tùy ý; định nghĩa rõ ngày đăng nhập hay ngày có hoạt động học |
| B11 | P1 | Snapshot bài giao vẫn lọc theo trạng thái ACTIVE hiện tại | Ẩn một hoạt động có thể làm giảm số việc phải nộp của bài đã giao | Bài giao dùng phiên bản/snapshot nội dung cố định, hoặc có quy trình sửa bài và thông báo rõ |
| B12 | P1 | Thiếu quy trình nội dung đủ điều kiện xuất bản và gắn media mới | Admin tạo từ ACTIVE thiếu hình/audio; bộ ảnh tĩnh không tự phủ từ mới | Tạo/sửa → kiểm tra tuổi, nội dung, đáp án, ảnh/audio, game khả dụng → xem thử → xuất bản |
| B13 | P1 trước triển khai | Khi URI cấu hình lỗi, backend tự thử database local và mở HTTP trước khi DB sẵn sàng | Chạy nhầm database, báo sẵn sàng khi chưa có kết nối | Production lỗi kết nối phải dừng/không ready; database đích được chọn tường minh; migration/version có trạng thái rõ |

## Bằng chứng và cách tái hiện

### B01 — Có bài không thể hoàn thành Chặng 3

`client/src/games/hub/GamesTab.tsx:8` yêu cầu hoàn thành **2 game khác nhau**. `getAvailableLessonGames` chỉ chọn trong 4 game xoay vòng rồi lọc theo số từ tối thiểu, loại từ, ảnh và độ trong suốt; chưa bù game thay thế khi không đủ.

Kết quả database thật:

| Nhóm tuổi | Bài | Game hợp lệ |
|---|---|---:|
| 3–4 | B1_U2_L3, B1_U4_L1, B1_U8_L2, B1_U9_L1 | 0 mỗi bài |
| 3–4 | B1_U2_L4, B1_U4_L4 | 1 mỗi bài |
| 4–5 | B2_U2_L3, B2_U6_L3, B2_U7_L2, B2_U7_L3, B2_U7_L4 | 1 mỗi bài |
| 5–6 | B3_U3_L4 | 1 |

Ví dụ B1_U2_L3 có 3 từ, trong khi các game ứng viên yêu cầu tối thiểu 4 từ. Cần chọn hoạt động thay thế phù hợp hoặc điều chỉnh học liệu/quy tắc hoàn thành một cách có chủ đích. Không nên ép đánh dấu hoàn thành trên frontend để che chỗ kẹt.

### B02/B03 — Tiến độ, kết quả và thưởng chưa dùng một luồng thống nhất

- `client/src/pages/child/LessonDetailPage.tsx:134` gửi cố định `stage:3, score:100, stars:3` sau khi đủ game, không dùng kết quả thực tế của các game đó.
- `src/controllers/progressController.js:122` ghi `completed=true`. Không kiểm tra stage1/stage2 hoặc danh sách game đã hoàn thành trước lần ghi.
- Probe AUD-05 gửi stage3 với score/stars bằng 0 cho một lesson fixture INACTIVE, khác nhóm tuổi; vẫn được đánh dấu hoàn thành. Dữ liệu fixture bảo đảm không ảnh hưởng trẻ thật.
- Chặng 2/3 mới lưu qua API stage; lịch sử game/chi tiết luyện tập còn ở localStorage. `src/services/teacherAssignments.js:15` tìm **ActivityResult** để xác định đã nộp. Luồng stage không tạo bản ghi đó.
- Hook cấp thưởng Unit chỉ được gọi tại `src/services/learningService.js:267`, trong luồng ActivityResult. `updateStageProgress` không gọi hook này.

Đây là rủi ro thể hiện từ đường đi trong mã nguồn, không phải tuyên bố rằng đã thao tác hoàn thành tất cả bài bằng UI trên trình duyệt. Cần một acceptance test thực: học đủ 4 bài của Unit từ giao diện → thoát/đăng nhập thiết bị khác → giáo viên thấy bài nộp → có đúng 1 UnitCompletion, +5 sao và 1 sticker. Hiện các đường ghi chưa đảm bảo điều đó.

Thiết kế đề xuất: phiên học/attempt có ID và phiên bản nội dung; client gửi sự kiện/đáp án; backend xác minh, chấm, chuyển trạng thái và cấp thưởng. Cùng kết quả đó phải phục vụ học sinh, bài giao, giáo viên và phụ huynh. Game mang tính động viên cần tách rõ sao biểu diễn/tiến độ khỏi sao Lesson có đánh giá 0–3.

### B04 — Phạm vi truy cập chưa khép kín

Đã tái hiện qua HTTP localhost với model giả lập:

- AUD-01: GET `/api/learning/sessions/:id` không token trả 200 và thông tin phiên.
- AUD-02: token CHILD A đọc được phiên CHILD B. Route dùng optionalProtect, controller không kiểm tra chủ sở hữu.
- AUD-03: người chưa đăng nhập truyền childId trong GET chi tiết lesson và nhận điểm/sao/hoàn thành của trẻ đó.
- AUD-04: giáo viên đi qua `/api/children/:childId/progress` và đọc dữ liệu ngoài lớp; `ownChildOr403` chỉ giới hạn CHILD, không giới hạn giáo viên theo lớp.

Nguồn: `src/routes/learningRoutes.js:13`, `src/controllers/learningController.js:33`, `src/controllers/lessonController.js:149`, `src/middlewares/authMiddleware.js:66`. Các đường teacher riêng có kiểm tra lớp không bù được lỗ hổng ở đường children dùng chung. Cần kiểm tra cả đọc và ghi, mọi vai trò, mọi đường truy cập cùng tài nguyên.

### B05 — Điểm và retry

- AUD-07: hoạt động fixture có 1 câu, tối đa 10 điểm; gửi lặp index câu đó 5 lần làm backend chuẩn bị lưu 50 điểm. Probe dừng tại mock create, không ghi dữ liệu thật.
- AUD-08: answers rỗng vẫn đi đến bước tạo ActivityResult với completed=true.
- AUD-06: gửi lại cùng stage2 có score=50 hai lần làm totalScore của phiên giả lập tăng thành 100.
- Hoạt động trả cả correctAnswer/isCorrect ra client (`activityController.js:10`); Memory Card coi mọi answer hợp lệ theo index là đúng. Cần tránh xem dữ liệu do client tự khai là bằng chứng đánh giá đáng tin cậy.

Cần xác thực payload, số câu/index duy nhất, loại đáp án, quan hệ activity–lesson–session–child, duration có giới hạn và attemptId/idempotency key. Phân biệt “trả lời sai nhưng đã làm đủ” với “chưa làm câu nào”.

### B06/B08/B10 — Danh tính và dữ liệu tự khai

- AUD-10: đăng ký có password nhưng không nhập PIN vẫn được lưu PIN `1234` (`authController.js:336`). Kết hợp danh sách avatar công khai tạo đường đăng nhập yếu. Không kết luận mọi tài khoản hiện có đều dùng PIN đó.
- Các route đăng nhập/tìm tài khoản chưa có cơ chế giới hạn thử sai trong middleware hiện tại; AI có rate limit riêng nhưng không áp dụng cho auth.
- AUD-13: đổi PIN cũng đổi password nhưng không tăng authVersion; JWT cũ tiếp tục được chấp nhận. Reset mật khẩu nhân viên đã có version không có nghĩa luồng đổi PIN trẻ cũng được bảo vệ.
- AUD-11: token CHILD có thể tạo reply với senderRole=PARENT và parentName tự nhập. Nếu đây là tài khoản gia đình theo thiết kế, cần đổi cách biểu đạt quyền/người gửi và có quyết định nghiệp vụ rõ ràng; chưa thể coi đó là phụ huynh đã xác thực.
- AUD-12: endpoint `/children/:childId/streak/test-level` ghi streak và lịch hoạt động giả lập theo số yêu cầu. Nút xem thử cấp lửa cần tách khỏi cập nhật thành tích thật.

### B07/B11/B12 — Vòng đời học liệu

AUD-09 xác nhận deleteVocabulary xóa cứng sau khi chỉ gỡ Lesson.vocabularyItems. Nó chưa bảo vệ Activity.questions.vocabulary, ActivityResult.answers.vocabularyId, VocabularyMastery, LanguageContent.vocabulary hay Progress. deleteActivity cũng xóa cứng; deleteUnit chưa xử lý hết quan hệ Topic.relatedUnits/UnitCompletion. Những thao tác này có thể tái tạo liên kết đứt dù audit tại một thời điểm đang sạch.

AUD-15: bài giao snapshot 2 hoạt động nhưng một hoạt động bị ẩn; hàm submissions lọc ACTIVE và kết luận đã nộp sau khi chỉ làm hoạt động còn lại. Cần snapshot nội dung/đáp án/tiêu chí, không chỉ danh sách ID.

Admin tạo vocabulary ACTIVE chưa có luồng gắn ảnh/audio đầy đủ tại `adminController.js:1159`. Một số populate bài học chưa lọc status của từ. Cần bộ kiểm tra xuất bản: tồn tại quan hệ, đúng tuổi, có media, đáp án hợp lệ, đủ game, thời lượng hợp lý và xem thử trên vai trò học sinh. Kho manifest hiện tại không thay thế quy trình quản lý media khi thêm từ mới.

### B09/B13 — Khôi phục, đồng bộ và vận hành

- `LessonDetailPage` cập nhật localStorage trước khi gọi stage API, lỗi chỉ log. Chưa có hàng đợi bền vững để gửi lại sau mất mạng; tải lại có thể nhận trạng thái server cũ và ghi đè trạng thái cục bộ.
- `vocabMasteryService.syncWithBackend` chỉ thêm từ chưa có trong local, không hợp nhất bản cũ của cùng từ. API sync dùng $set các tổng đếm; thiết bị cũ có thể ghi đè tổng mới, dù các số vẫn vượt qua kiểm tra kiểu dữ liệu.
- Cần phân biệt “đã lưu trên máy” và “đã đồng bộ”, có retry theo event ID và kiểm tra xung đột. Số đo kỹ năng không nên chỉ dựa vào nút tự đánh dấu đã thuộc.
- AUD-14 xác nhận cấu hình DB lỗi sẽ chuyển sang URI local trong môi trường giả lập. `server.js` còn gọi listen trước khi await kết nối. Production cần fail-fast/readiness và database đích tường minh.

## Những ý tưởng có giá trị sau khi xử lý lỗi cốt lõi

| Chức năng | Giá trị cho người dùng | Quy tắc quan trọng |
|---|---|---|
| “Ôn 5 phút hôm nay” | Trẻ mở app là có việc vừa sức để học | Chọn từ từ lịch sử lỗi/first try, tránh coi từ tự đánh dấu là đã vững |
| Hộp việc cần xử lý của giáo viên | Gom bài chờ nhận xét, trẻ chưa có dữ liệu, trẻ cần hỗ trợ | Mỗi gợi ý có dữ liệu dẫn chứng, không gán năng lực khi chưa đủ quan sát |
| Bảng kiểm xuất bản học liệu | Admin phát hiện bài không chơi được trước khi trẻ gặp | Chặn publish nếu thiếu hình/audio/đáp án hoặc không đủ game |
| Kế hoạch học cá nhân | Trẻ có nhịp học phù hợp, giáo viên điều chỉnh được | Ghi rõ mục tiêu, phiên bản và quyền override lộ trình |
| Báo cáo tuần cho gia đình | Biết bé đã học gì, nên ôn gì | Dựa trên kết quả đã lưu; gắn nhãn thiếu dữ liệu, không tự bịa điểm phát âm |
| Thư viện media có nguồn/license | Thêm nội dung mới không cần sửa manifest bằng tay | Preview, alt text, transparency đã kiểm tra, phiên bản, tình trạng URL/audio |
| Nhật ký sao và sửa sai có lý do | Giải thích vì sao tổng sao tăng/giảm | Nguồn thưởng duy nhất, chống lặp, audit người sửa; không cộng điểm qua gửi thông báo |
| Tiếp tục học trên thiết bị khác | Phụ huynh dùng điện thoại, trẻ dùng máy tính vẫn cùng tiến độ | Checkpoint server có version và đồng bộ an toàn |

Chưa đề xuất mua hàng, thanh toán hoặc thêm vai trò ngoài phạm vi trường học làm ưu tiên. Các bổ sung phù hợp giai đoạn sau gồm quản lý năm học/lịch sử chuyển lớp, cấu hình thời lượng phiên học và báo cáo hiệu quả học liệu.

## Các quyết định nghiệp vụ cần chốt

1. Lesson hoàn thành theo tất cả Activity DB hay theo ba chặng và một tập minigame? Cần một định nghĩa duy nhất và cơ chế liên kết sang bài giao.
2. Bao nhiêu game là bắt buộc, cách chọn thay thế khi nội dung ít từ, và sao động viên có được cộng vào tổng sao hay không?
3. Phụ huynh có tài khoản riêng hay dùng chung tài khoản gia đình? Phản hồi “PARENT đã đọc” mang mức xác thực nào?
4. Vinh danh tính sao lớp hay mọi loại sao? Mã hiện tại chỉ tính sao lớp đã chốt; cần duy trì nhất quán với tên báo cáo và mô tả.
5. Ngày “học liên tục” dựa vào đăng nhập hay một hoạt động học hợp lệ? Có thể cho trẻ xem thử cấp lửa mà không thay đổi dữ liệu thật.
6. Khi thay bài đã giao/xuất bản hoặc chuyển lớp, lịch sử thuộc phiên bản và nhóm học sinh nào? Chính sách chỉnh sửa phải rõ trước khi triển khai tự động.

## Thứ tự triển khai đề xuất

**Đợt 1:** chặn đường đọc/ghi sai quyền, bỏ PIN chung/debug streak khỏi production; khắc phục 12 bài bị kẹt; chốt hợp đồng kết quả ba chặng.

**Đợt 2:** hợp nhất chấm điểm–bài giao–thưởng, validation/index câu trả lời và chống lặp; nghiệm thu trọn một Unit và một bài giao trên hai thiết bị.

**Đợt 3:** bảo vệ CRUD học liệu, snapshot phiên bản bài giao, hàng đợi đồng bộ, xác thực người lớn và readiness/backup phục hồi.

**Đợt 4:** ôn tập cá nhân, hộp việc giáo viên, báo cáo gia đình và thư viện media.

Không cần thêm nhiều trò chơi trước khi biết một bài đã xuất bản chắc chắn hoàn thành được và kết quả được dùng thống nhất.

## Tài liệu kiểm tra

- [Luồng test và điều kiện phát hành](web-test-plan-2026-10-28.md)
- [15 bằng chứng giả lập](business-audit-evidence-2026-10-28.json)
- [Độ phủ minigame trên database thật](business-game-coverage-2026-10-28.json)

15 probe là bằng chứng của bản trước sửa, lưu ở JSON nêu trên. Kiểm tra hồi quy bản đã sửa từ KCEnglishKids_BE bằng `npm.cmd run test:business`; script tạo database QA riêng cho kiểm thử ghi. Chạy readiness chỉ đọc bằng `npm.cmd run audit:games` (exit 2 nghĩa có bài bị chặn/registry không khớp, exit 1 là audit không chạy xong).
