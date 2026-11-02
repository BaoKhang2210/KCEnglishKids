# Nguồn video của Video Learning

Video Learning dùng đúng danh mục và nguồn phát của tienganhvui.com (catalog version 3), không còn seed video giữ chỗ:

- Series `source: "stored"` phát trực tiếp `videoUrl` trên `media.tienganhvui.com` do seed lưu lại từ nguồn gốc.
- Series `source: "youtube"` nhúng đúng `youtubeVideoId` qua `youtube-nocookie.com`, không kèm video liên quan.
- Ảnh bìa dùng đúng `thumbnailUrl` của nguồn (hotlink), không sao chép vào kho dự án.

Không có tệp media nào của bên thứ ba được tải về repo. `flower-cc0.mp4` trong thư mục này là tệp giữ chỗ của phiên bản seed cũ, hiện không còn được tham chiếu và có thể xoá khi dọn dẹp.

Phụ đề/cue của nguồn chỉ được lưu dưới dạng metadata (`cueUrl`, `captionCueCount`); nội dung phụ đề không được sao chép. Khi có nội dung do nhà trường sản xuất hoặc được cấp phép, quản trị viên có thể bổ sung `subtitles`/`quizzes` cho từng tập.
