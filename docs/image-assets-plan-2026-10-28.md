# Phương án hình ảnh cho toàn bộ KCEnglishKids — 28/10/2026

## Đề xuất

Dùng một bộ minh họa 2D đồng nhất, màu tươi, hình lớn và dễ nhận biết cho trẻ 3–6 tuổi. Từ vựng và vật thể chơi game cần ảnh vật thể riêng, nền trong suốt; chủ đề/unit cần tranh bối cảnh. Koko, avatar và phần thưởng dùng cùng bảng màu, hình khối và cách vẽ. Giao diện giáo viên/quản trị tiếp tục dùng icon chức năng rõ ràng, thêm minh họa ở màn chào và trạng thái trống khi có ích.

Có thể lấy asset từ bộ có sẵn hoặc tạo riêng bằng AI/họa sĩ. Phương án phù hợp nhất với ứng dụng này là **kết hợp**: bộ asset đồng nhất cho các vật thể phổ biến; tạo riêng tranh hành động, mẫu câu và bối cảnh còn thiếu. Chưa tải hàng loạt hoặc thay ảnh ứng dụng trong đợt kiểm tra này.

## Thực trạng đã xác minh

| Nhóm | Hiện tại | Cần cải thiện |
|---|---|---|
| Từ vựng | 409/409 imageUrl là SVG chứa emoji và nhãn chữ | Minh họa đúng nghĩa, đồng nhất, tách ảnh vật thể khỏi khung thẻ |
| Ảnh chủ đề | 19/19 chưa có imageUrl | 19 tranh bìa/biểu tượng chủ đề có chủ đích |
| Bài học | 108 thumbnail dùng SVG từ bộ từ vựng | Ảnh bìa phù hợp nội dung, có thể tái sử dụng tranh unit |
| Mẫu câu | 0/246 có imageMedia | Tranh tình huống/hành động, tránh chỉ chọn emoji theo từ khóa |
| Animation | 409/409 URL bắt đầu bằng placeholder:// | Animation thật cho một số điểm tương tác có ích |
| Avatar | Seed tạo bằng cùng hàm thẻ emoji | Một bộ nhân vật đồng nhất, hiển thị tốt ở kích thước nhỏ |
| Koko | Đã có component SVG riêng | Giữ nhận diện, bổ sung trạng thái vui/khích lệ/đang nghe |
| Sticker/huy hiệu/rương | Nhiều hình dựng bằng code/emoji | Chọn lọc phần cần thay, giữ rõ ý nghĩa phần thưởng |

**28 từ đang dùng biểu tượng lấp lánh chung** thay vì minh họa nghĩa, gồm nhiều màu và số đếm. Ví dụ blue/yellow/green và one/two/three không nên dùng cùng hình ✨. Màu sắc cần mảng màu thật; số đếm cần lượng vật thể đúng, không chỉ chữ số hay tên tiếng Anh.

Hai vấn đề kỹ thuật đáng chú ý:

- SVG hiện có nền hình chữ nhật bo góc. Game Shadow Puzzle dùng filter làm tối toàn ảnh trong `client/src/games/shared/VocabImage.tsx`; nền đặc sẽ tạo bóng của cả thẻ, làm mất hình dáng đặc trưng của con vật/đồ vật. Cần asset nền trong suốt thật cho trò chơi ghép bóng.
- `isTransparentImage` trong `client/src/games/core/targetSelector.ts` đoán theo đuôi png/svg/webp. Đuôi file không bảo đảm có alpha. Nên lưu thuộc tính isTransparent đã được kiểm tra và truyền qua API.

## Nguồn ảnh có thể dùng

| Nguồn | Phù hợp với ứng dụng | Cách sử dụng và giới hạn |
|---|---|---|
| [Kenney Animal Pack](https://kenney.nl/assets/animal-pack), [thư viện Kenney](https://kenney.nl/assets) | Động vật, vật thể, nền game và chi tiết giao diện | Asset trên trang asset dùng CC0, được dùng trong dự án thương mại, không bắt buộc ghi công theo [trang hỗ trợ](https://kenney.nl/support). Từng pack có phong cách và độ phủ khác nhau; Animal Pack không thay thế được toàn bộ 409 từ. |
| [Storyset Education](https://storyset.com/education) | Tranh trường học, học tập, màn chào và trạng thái trống | Có thể sửa màu/layer và tạo chuyển động theo [FAQ](https://storyset.com/faqs). Bản miễn phí yêu cầu ghi công và có các điều kiện sử dụng/phân phối; cần đối chiếu [điều khoản](https://storyset.com/terms) cho asset và hình thức tích hợp cụ thể. Không phù hợp để gom thành một bộ stock rồi phân phối lại. |
| [OpenMoji](https://openmoji.org/) | Icon và biểu tượng nhỏ đồng nhất trên nhiều thiết bị | SVG/PNG là hình vẽ thật, tránh phụ thuộc font emoji hệ điều hành. Theo [FAQ chính thức](https://github.com/hfg-gmuend/openmoji/blob/master/FAQ.md), dùng CC BY-SA 4.0: cần ghi công và tuân thủ ShareAlike khi sửa hình. Vẫn là hệ biểu tượng; không thay được tranh minh họa mẫu câu. |
| [SVG Repo](https://www.svgrepo.com/) | Bổ sung vật thể thiếu trong bộ chính | Kiểm tra license trên từng trang asset; trang có nhiều loại giấy phép theo [hướng dẫn licensing](https://www.svgrepo.com/page/licensing/). Chọn cùng một collection để tránh lẫn phong cách. |
| Tạo minh họa riêng bằng AI/họa sĩ | Koko, avatar, tranh hành động, hội thoại, bối cảnh 27 unit | Chủ động phong cách và nội dung. Cần duyệt nghĩa, số lượng, màu sắc, biểu cảm và tính nhất quán trước khi dùng; không đưa dữ liệu cá nhân trẻ vào prompt. |

Các nguồn trên được kiểm tra ngày 28/10/2026. Chưa xác nhận một bộ có sẵn nào phủ đúng toàn bộ từ vựng của dự án. Cần lập bảng đối chiếu và duyệt từng từ trước khi thay.

## Bộ hình cần chuẩn bị

1. **409 ảnh từ vựng:** vật thể đơn giản, một trọng tâm, không có tên từ in trong ảnh. Với động từ/cụm từ, dùng tư thế hoặc tình huống rõ nghĩa. Các từ gần nhau cần dễ phân biệt: sheep/lamb, horse/foal, hen/chick…
2. **19 ảnh chủ đề và 27 tranh bối cảnh unit:** school, family, pets, farm, food… Dùng bố cục ngang cho bìa; không phóng ảnh vuông nhỏ để lấp đầy banner.
3. **108 thumbnail bài học:** tái sử dụng tranh unit có crop/bố cục phù hợp hoặc gắn một tập vật thể liên quan. Không cần vẽ 108 bối cảnh hoàn toàn độc lập.
4. **Tranh tình huống mẫu câu:** ưu tiên nội dung có nhiều hành động, quan hệ hoặc cảm xúc. Một ảnh cat không đủ diễn đạt “The cat is under the table.” Có thể tái dùng cùng nhân vật/vật thể trong các cảnh khác nhau.
5. **Koko, avatar, phần thưởng:** một bộ trạng thái nhỏ nhưng nhất quán. Animation xuất hiện khi hướng dẫn, chờ tương tác và phản hồi kết quả; tránh quá nhiều chuyển động cạnh đáp án.
6. **Giáo viên/quản trị:** minh họa màn chào, chưa có lớp/bài giao/kết quả, hoàn tất công việc; icon nút và dữ liệu biểu đồ vẫn ưu tiên khả năng đọc.

Chuẩn kỹ thuật đề xuất: SVG cho vector, WebP/PNG có alpha cho ảnh vật thể; khoảng 512×512 cho flashcard và bản thumbnail nhỏ hơn khi cần. Tranh nền khoảng 1600×900. Đây là kích thước khởi điểm để tối ưu theo màn hình thực tế, không phải giới hạn bắt buộc. Không dùng SVG còn chứa text emoji làm bản thay thế cuối cùng.

## Cách gắn ảnh vào hệ thống

Hệ thống đã có Media, Vocabulary.primaryMedia, Topic.imageMedia, Lesson.thumbnail và LanguageContent.imageMedia. Có thể dùng các liên kết này làm nền tảng, bổ sung metadata nguồn và phiên bản thay vì dựng lại database.

Quy trình đề xuất:

1. Tạo manifest ánh xạ theo **ObjectId + mediaKey/normalizedText**, kiểm tra trùng khóa. Mỗi asset ghi sourceUrl, author, license, attribution, width, height, isTransparent, style và version. `Media.metadata` hiện hỗ trợ dữ liệu mở; cần thống nhất cách API và frontend đọc các thuộc tính này.
2. Lưu file trên domain/CDN do dự án quản lý hoặc đóng gói vào client/public khi phù hợp; URL có phiên bản và cache. Tải qua cơ chế được nguồn cho phép, giữ bản giấy phép trong dự án. Không phụ thuộc URL tìm kiếm ảnh ngẫu nhiên lúc trẻ đang học.
3. Dry-run migration liệt kê mọi trường sẽ thay. Giữ nguyên ObjectId của bài, từ, hoạt động và các liên kết tiến độ.
4. Cập nhật **Media.url và các URL đã sao chép**: Vocabulary.imageUrl, Lesson.thumbnailUrl, Topic.imageUrl, Activity.questions.promptImageUrl/options.imageUrl, cùng các trường ảnh trong questions.metadata như image, targetImage, matchingPair.image. Chỉ đổi Media.url sẽ để lại ảnh cũ ở nhiều màn hình.
5. Bổ sung chọn/populate imageMedia ở các API đang bỏ trường này, đặc biệt phần languageContents trong chi tiết bài học. Một số màn chủ đề hiện dùng icon thay vì imageUrl, cần chỉnh component mới nhìn thấy ảnh bìa mới.
6. Dùng chung một resolver/component ảnh cho flashcard, notebook, practice, game và màn giáo viên; có fallback khi ảnh lỗi. Giảm dần các bản emoji-map/regex tạo ảnh trùng nhau ở backend và frontend.
7. Tách ảnh vật thể nền trong suốt khỏi nền/khung và chữ. Chữ nằm trong giao diện để đổi ngôn ngữ, ẩn nhãn lúc luyện nghe và đảm bảo accessibility.
8. Với snapshot lịch sử như ClassroomSession.questionResults.promptImageUrl, xác định rõ giữ ảnh phiên bản cũ hay nâng cấp; dùng URL version để lịch sử vẫn có thể truy nguyên.

## Thứ tự triển khai

**Đợt mẫu:** một unit Pet Animals có 8 từ, một tranh bối cảnh, Koko và thumbnail. Kiểm tra flashcard, nghe chọn hình, ghép từ–hình, ghép bóng, notebook và màn dạy học. Duyệt phong cách trước khi nhân rộng.

**Đợt ưu tiên:** sửa hình màu sắc và số đếm đang dùng sparkle; bộ 19 chủ đề; các vật thể hay xuất hiện và các hình gần nghĩa dễ nhầm.

**Đợt phủ toàn bộ:** hoàn thiện manifest 409 từ, 27 unit, 108 thumbnail và tranh mẫu câu theo nhóm; cập nhật API/component và migration đồng bộ URL.

**Đợt chuyển động:** thay placeholder bằng asset thực tế ở các vị trí được sử dụng. Schema có ANIMATION/LOTTIE không đồng nghĩa giao diện đã có player. Nếu dùng Lottie hoặc sprite cần bổ sung bộ hiển thị, ảnh tĩnh dự phòng và hỗ trợ prefers-reduced-motion.

Tiêu chí nghiệm thu: đúng nghĩa, đúng số lượng/màu sắc, không lộ chữ đáp án trong ảnh; nền trong suốt thật ở game cần silhouette; tất cả URL tải được, có fallback; kích thước và cách crop đúng trên điện thoại/máy chiếu; có nguồn/license cho từng asset; đủ các trường URL được cập nhật và database audit không phát sinh lỗi mới.
