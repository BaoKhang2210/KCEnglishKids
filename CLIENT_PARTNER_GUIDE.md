# TÀI LIỆU HƯỚNG DẪN ĐỒNG BỘ CLIENT (DÀNH CHO PARTNER)

**Dự án:** KCEnglishKids  
**Mục đích:** Tài liệu này tổng hợp toàn bộ các yêu cầu, quy ước API, cấu trúc dữ liệu và logic nghiệp vụ từ phía **Admin & Giáo viên** mà phía **Client (Trẻ em & Phụ huynh)** cần phối hợp thực hiện để hệ thống vận hành trơn tru và thống nhất.

---

## 🌟 1. Module 5 Phút Ôn Tập Tại Nhà (Daily 5-Min Home Review)

### Mục tiêu nghiệp vụ:
- Ôn luyện lại các từ vựng và mẫu câu của **buổi học gần nhất mà trẻ vừa hoàn thành trên lớp**.
- Tập trung vào 2 phần chính:
  1. Trẻ chơi trò chơi ôn từ vựng (Flashcard / tương tác mini-game).
  2. Phần hướng dẫn dành cho cha mẹ để cùng con ôn mẫu câu & tương tác đàm thoại 5 phút.
- Giao diện tràn viền màn hình (full width), nổi bật ở màn hình chính (Child Home Page).

### Thưởng Sao & Đồng Bộ (Stars Integration):
- **Phần thưởng:** Hoàn thành được thưởng **3 sao** (`homeStars`).
- **Endpoint hoàn thành:**
  - `POST /api/children/home-practice/complete`
  - Body: `{ lessonId: string, durationSeconds: number }`
  - Response: `{ success: true, starsAwarded: 3, totalStars: number, homeStars: number }`
- **Hiển thị trên Client:**
  - Số sao tổng = `classroomStars` (sao trên lớp) + `homeStars` (sao ở nhà).
  - Client cần hiển thị đúng số sao này tại widget hồ sơ bé trên bản đồ đảo / màn hình chính.

---

## 📬 2. Sổ Liên Lạc & Nhận Xét Của Giáo Viên (Parent Notifications)

### Mục tiêu nghiệp vụ:
- Giáo viên gửi nhận xét từ 2 nguồn:
  1. **Báo cáo cuối mỗi buổi dạy (`SESSION_REPORT`):** Đánh giá tình hình buổi học, chuyên cần (có mặt, vắng, muộn).
  2. **Đánh giá năng lực 3 trụ cột (`PROGRESS_UPDATE`):** Nhận xét định kỳ về từ vựng, phát âm, phản xạ nghe.

### Học sinh Vắng Học (Absent Students):
- Khi trẻ vắng mặt, nhận xét sẽ chỉ rõ:
  > *"Dạ kính gửi Phụ huynh bé [Tên], hôm nay bé vắng mặt ở buổi học trên lớp: Bài '[Tên bài]' (thuộc Unit: [Tên Unit]). Ba mẹ cho bé mở phần luyện tập 5 phút hoặc mở ứng dụng ở nhà để ôn bài này giúp bé nắm vững kiến thức và theo kịp cùng các bạn nhé! ❤️"*
- **Yêu cầu Client:** Trong màn hình Sổ liên lạc (`/child/notifications`), hiển thị tin nhắn này kèm theo 1 nút bấm nhanh: **"Vào ôn bài này ngay"** dẫn trực tiếp tới bài học hoặc phần luyện tập tương ứng.

### API lấy tin nhắn Sổ liên lạc:
- `GET /api/children/:childId/parent-notifications`
- Trạng thái đã đọc: `PATCH /api/children/:childId/parent-notifications/:id/read`

---

## 🧭 3. Hồ Sơ Năng Lực 3 Trụ Cột (Passport 3 Pillars)

### 3 Trụ Cột Chuẩn Sư Phạm Mầm Non:
1. **Trụ cột 1 - Độ thành thạo từ vựng (Vocabulary Mastery):**
   - Đã thuộc lòng (Level 3 - Mastered)
   - Đang luyện tập (Level 2 - Practicing)
   - Đang làm quen (Level 1 - Learning)
2. **Trụ cột 2 - Phát âm & Bật âm (Pronunciation & Speaking):**
   - Điểm đánh giá phát âm AI (%) từ tính năng luyện nói cùng Koko AI Coach.
3. **Trụ cột 3 - Nghe hiểu & Phản xạ (Listening & Reaction):**
   - Độ chính xác qua các câu hỏi nghe hiểu (`accuracyRate`).
   - Tốc độ phản xạ (`reactionSpeed`).

---

## 🎨 4. Tranh Tô Màu Từ Vựng (Coloring Worksheets)

### Nghiệp vụ:
- Giáo viên có tính năng **"In tranh tô màu từ vựng"** cho từng bài học.
- Tranh được xuất ra dạng A4 với nét vẽ viền đen trắng (line-art outline) và chữ rỗng to để trẻ mầm non có thể vừa tập tô màu tranh, vừa tập tô chữ tiếng Anh và tập phát âm tại lớp hoặc ở nhà.
- Client trẻ em có thể xem các bức tranh tương ứng trong kho tư liệu của bé để tô màu số hoặc xem minh họa.

---

## 🚀 5. Checklist Phối Hợp Kỹ Thuật (Client Checklist)

- [ ] Kiểm tra màn hình Home của trẻ: Banner / Nút "5 Phút Ôn Tập Tại Nhà" nổi bật, tràn viền màn hình.
- [ ] Kiểm tra Sổ liên lạc: Hiển thị đầy đủ nhận xét của cô giáo, có phân biệt nhận xét buổi học và nhận xét 3 trụ cột.
- [ ] Kiểm tra điều hướng: Khi nhận xét báo bé vắng bài học X, bấm vào mở ngay bài học X.
- [ ] Kiểm tra đồng bộ sao: Sao nhận từ ôn tập ở nhà cộng vào `homeStars` và hiển thị đồng bộ ở mọi vị trí hiển thị sao.

