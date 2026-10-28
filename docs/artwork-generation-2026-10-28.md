# Nguồn hình và prompt — 28/10/2026

## Tranh nền riêng

Đã dùng **imagegen tích hợp**, không dùng CLI/API key. Bản chọn cuối đã được chép vào:

`client/public/images/scenes/learning-garden-v1.png`

Prompt chính xác:

> Use case: illustration-story. Asset type: wide landscape background banner for KCEnglishKids, an English learning app for children aged 3–6. Create a warm, beautifully polished children's book illustration of a friendly outdoor learning garden: an inviting little schoolhouse, rounded green trees, a small reading nook with a colorful open book and crayons, a curving path, flowers and gentle clouds. Medium: clean hand-crafted 2D digital illustration, soft dimensional shading, rounded shapes, lively teal, sunny yellow, coral and sky blue, cream highlights. Wide 16:9 composition with calm sky and uncluttered middle area where UI can place text; detailed charming accents toward the sides and bottom. Bright daytime, welcoming and playful, clear shapes and sophisticated restrained texture. No text, no letters, no numbers, no watermarks, no logos, no UI, no emoji. This must be final production artwork, not a mockup.

## Bộ vector

Nguồn: [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji), phiên bản ghim `1ffb34c752ecf5d402f04cfb4b392c77f57c54bc`. Điều khoản gốc: [MIT LICENSE](https://github.com/microsoft/fluentui-emoji/blob/1ffb34c752ecf5d402f04cfb4b392c77f57c54bc/LICENSE). Bản giấy phép được đóng gói tại `client/public/images/licenses/fluent-emoji-MIT.txt`.

Các hình này là file vector thực tế, không phải ký tự emoji phụ thuộc font hệ điều hành. Đã đóng gói 277 biểu tượng nguồn; tái sử dụng chúng cho 409 minh họa từ vựng, 19 bìa chủ đề, avatar và sticker. Các sơ đồ màu/số/cơ thể/đồ vật và bố cục được dựng bằng SVG của dự án. Animation là chuyển động CSS nhẹ trên SVG, có tắt khi người dùng chọn giảm chuyển động.

Các asset cuối nằm trong `client/public/images/{vocabulary,animations,topics,symbols}`. Bảng ánh xạ: `client/public/images/manifest.json`. Danh mục nguồn ghim: `KCEnglishKids_BE/scripts/learning_art_sources.json`. Script tái tạo: `KCEnglishKids_BE/scripts/build_learning_assets.js`. Các file SVG được đóng gói sẵn nên chạy ứng dụng không cần truy cập GitHub hay Unicode.

Koko và các hình huy hiệu có sẵn được giữ bằng mã vector của dự án. Không tuyên bố tất cả minh họa được tạo mới bằng AI. Một số từ trừu tượng/cụm từ dùng tranh ghép gợi ngữ cảnh và cần duyệt sư phạm khi phát hành rộng rãi.
