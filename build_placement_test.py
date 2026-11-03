import os
import sys
import re
import json
import subprocess
import pptx
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE
import docx
from docx.shared import Inches as DocxInches, Pt as DocxPt, RGBColor as DocxRGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
import markdown
from htmldocx import HtmlToDocx

# Color Palette for Placement Test
DARK_NAVY = RGBColor(11, 15, 25)       # #0B0F19 Deep Obsidian
CARD_DARK = RGBColor(23, 32, 54)       # #172036
PRIMARY_INDIGO = RGBColor(79, 70, 229) # #4F46E5 Electric Indigo
ACCENT_CYAN = RGBColor(6, 182, 212)    # #06B6D4
ACCENT_EMERALD = RGBColor(16, 185, 129)# #10B981
ACCENT_AMBER = RGBColor(245, 158, 11)  # #F59E0B
LIGHT_BG = RGBColor(248, 250, 252)     # #F8FAFC
CARD_BG = RGBColor(255, 255, 255)      # #FFFFFF
BORDER_GRAY = RGBColor(226, 232, 240)  # #E2E8F0
TEXT_DARK = RGBColor(15, 23, 42)       # #0F172A
TEXT_MUTED = RGBColor(71, 85, 105)     # #475569
TEXT_LIGHT = RGBColor(241, 245, 249)   # #F1F5F9
ANSWER_BG = RGBColor(240, 253, 244)    # #F0FDF4
ANSWER_BORDER = RGBColor(34, 197, 94)  # #22C55E

def set_slide_background(slide, color):
    bg_shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
    bg_shape.fill.solid()
    bg_shape.fill.fore_color.rgb = color
    bg_shape.line.fill.background()
    return bg_shape

def add_header(slide, tag_text, title_text, dark=False):
    tb_tag = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.7), Inches(0.4))
    tf_tag = tb_tag.text_frame
    tf_tag.word_wrap = True
    tf_tag.margin_left = tf_tag.margin_top = tf_tag.margin_right = tf_tag.margin_bottom = 0
    p_tag = tf_tag.paragraphs[0]
    p_tag.text = tag_text.upper()
    p_tag.font.size = Pt(11)
    p_tag.font.bold = True
    p_tag.font.color.rgb = ACCENT_CYAN if dark else PRIMARY_INDIGO

    tb_title = slide.shapes.add_textbox(Inches(0.8), Inches(0.75), Inches(11.7), Inches(0.8))
    tf_title = tb_title.text_frame
    tf_title.word_wrap = True
    tf_title.margin_left = tf_title.margin_top = tf_title.margin_right = tf_title.margin_bottom = 0
    p_title = tf_title.paragraphs[0]
    p_title.text = title_text
    p_title.font.size = Pt(24)
    p_title.font.bold = True
    p_title.font.color.rgb = TEXT_LIGHT if dark else TEXT_DARK

def create_card(slide, left, top, width, height, bg_color=CARD_BG, border_color=BORDER_GRAY):
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    card.fill.solid()
    card.fill.fore_color.rgb = bg_color
    if border_color:
        card.line.color.rgb = border_color
        card.line.width = Pt(1.5)
    else:
        card.line.fill.background()
    return card

def add_speaker_notes(slide, notes_text):
    notes_slide = slide.notes_slide
    text_frame = notes_slide.notes_text_frame
    text_frame.text = notes_text

# ==============================================================================
# 1. BUILD HANDOUT MARKDOWN FOR MINI PLACEMENT TEST
# ==============================================================================
def build_placement_md():
    md = """# BÀI THI XẾP LỚP NHANH TOEIC 10 PHÚT (10-MINUTE TOEIC MINI PLACEMENT TEST)
## KHẢO SÁT TOÀN DIỆN 2 KỸ NĂNG: LISTENING & READING
### PHÂN LOẠI 3 CẤP ĐỘ: FOUNDATION – TOEIC 550+ – TOEIC 650+

---

### THÔNG TIN BÀI THI & QUY CHẾ KHẢO SÁT
* **Thời gian làm bài:** Đúng 10 phút (Không tính thời gian đọc hướng dẫn).
* **Cấu trúc bài thi:** 17 câu hỏi/chỗ trống chuẩn hóa bao quát 2 kỹ năng cốt lõi:
  - **Kỹ năng Nghe (Listening - 10 chỗ trống / ~4 phút):** Đoạn đối thoại Part 3 Short Conversation điền từ vựng công sở (Cloze Dictation).
  - **Kỹ năng Đọc (Reading - 7 câu / ~6 phút):** Part 5 (3 câu), Part 6 (2 câu), Part 7 (2 câu).
* **File âm thanh Listening đính kèm:**
  - File nghe toàn phần: `audio/TOEIC_Placement_Test_Listening_Full.wav` (Bản thu âm chính thức từ Thầy Nam sẽ được cập nhật)
* **Mục tiêu chẩn đoán:** Đánh giá phản xạ ngôn ngữ tức thì, khả năng nhận diện âm thanh, từ vựng công sở và tư duy ngữ pháp logic để xếp lớp học viên chính xác vào 3 cấp độ:
  1. **Foundation (Mất gốc / Cơ bản: Dưới 450)**
  2. **TOEIC 550+ (Trung cấp: 450 – 645)**
  3. **TOEIC 650+ (Nâng cao / Bứt phá: 650 – 800+)**

---

### BẢNG THEO DÕI THÔNG TIN HỌC VIÊN
| Họ và tên thí sinh | Số điện thoại / Email | Ngày làm bài | Điểm số đạt được | Xếp lớp đề xuất |
| :--- | :--- | :--- | :---: | :--- |
| .................................................... | .................................................... | ...../...../2026 | ......... / 17 | [ ] Foundation  [ ] 550+  [ ] 650+ |

---

### PHẦN I: ĐỀ BÀI THI THỰC CHIẾN (TEST QUESTIONS)

#### SECTION 1: LISTENING TEST (QUESTIONS 1 – 10)
**Directions:** Bạn sẽ nghe một đoạn đối thoại nơi công sở giữa một người phụ nữ (W) và một người đàn ông (M). Hãy lắng nghe và điền từ thích hợp vào mỗi chỗ trống từ (1) đến (10).

```text
W: Mark, I just checked the warehouse, and our (1) ________ of the new ergonomic office chairs is extremely low.
M: Really? The latest (2) ________ arrived on Tuesday. Did we already distribute all of them to the sales department?
W: No, but a significant number of them were (3) ________. The height adjustment levers were completely broken.
M: That's unacceptable. Have you contacted the manufacturer's (4) ________ about this issue?
W: I left a voicemail this morning. I expect them to (5) ________ the problem and send replacements immediately.
M: Since the furniture is still under (6) ________, they should cover all the return shipping costs.
W: Exactly. In the meantime, we will have to (7) ________ use the older chairs from the third-floor storage room.
M: Should I send out a memo to the staff to apologize for the (8) ________?
W: Yes, please do. Emphasize that we are trying to (9) ________ everyone's needs as quickly as possible.
M: I'll draft it right away. Hopefully, the supplier will offer some (10) ________ for the delay.
```

**1.** Điền từ vào chỗ trống (1): ................................................................
**2.** Điền từ vào chỗ trống (2): ................................................................
**3.** Điền từ vào chỗ trống (3): ................................................................
**4.** Điền từ vào chỗ trống (4): ................................................................
**5.** Điền từ vào chỗ trống (5): ................................................................
**6.** Điền từ vào chỗ trống (6): ................................................................
**7.** Điền từ vào chỗ trống (7): ................................................................
**8.** Điền từ vào chỗ trống (8): ................................................................
**9.** Điền từ vào chỗ trống (9): ................................................................
**10.** Điền từ vào chỗ trống (10): ................................................................

---

#### SECTION 2: READING TEST (QUESTIONS 11 – 17)

##### PART 5: INCOMPLETE SENTENCES (3 câu)

**11. (Cấp độ Foundation - Word Form):**
Ms. Chen reviewed the quarterly financial report ------- before submitting it to the board of directors.
- (A) careful
- (B) carefully
- (C) care
- (D) carefulness

**12. (Cấp độ 550+ - Conjunction vs. Preposition):**
------- the inclement weather conditions, the outdoor marketing festival will proceed as scheduled.
- (A) Although
- (B) Despite
- (C) Because
- (D) Even

**13. (Cấp độ 650+ - Advanced Conditional Inversion):**
------- you require any additional documentation regarding the corporate merger, please contact the legal department.
- (A) Should
- (B) If
- (C) Were
- (D) Had

---

##### PART 6: TEXT COMPLETION (2 câu)
**Directions:** Đọc đoạn thông báo nội bộ ngắn dưới đây và chọn đáp án thích hợp nhất cho các chỗ trống số 14 và 15.

```text
MEMORANDUM
To: All Department Supervisors
From: Human Resources
Subject: Annual Employee Performance Evaluations

Please be reminded that all annual staff performance reviews must be finalized 
by Friday, November 15. It is essential that each supervisor ------- [14] with team 
members individually to discuss professional milestones and performance objectives. 

------- [15], please submit all completed and signed evaluation forms directly 
to the Human Resources portal by the end of the day.
```

**14. (Cấp độ 550+ - Subjunctive Mood Verb Form):**
- (A) meet
- (B) met
- (C) meeting
- (D) to meet

**15. (Cấp độ 650+ - Contextual Transition Connector):**
- (A) In addition
- (B) However
- (C) In contrast
- (D) Otherwise

---

##### PART 7: READING COMPREHENSION (2 câu)
**Directions:** Đọc văn bản thông báo dưới đây và trả lời các câu hỏi 16 và 17.

```text
================================================================================
CLOVERDALE BUSINESS EXPO - PARKING NOTICE
================================================================================
Due to scheduled maintenance resurfacing in the Main Visitor Garage, reserved 
parking will be temporarily relocated to the South Lot from October 12 through 
October 16. 

Exhibitors displaying valid vendor permits may park in the South Lot free of charge. 
All other general attendees will incur a daily flat parking fee of $10.00. 

A complimentary shuttle bus service will operate continuously between the South Lot 
and the main exhibition hall entrance every fifteen minutes from 8:00 A.M. to 6:00 P.M. 
We appreciate your understanding as we complete these essential facility upgrades.
================================================================================
```

**16. (Cấp độ Foundation / 550 - Scanning Detail):**
Who is entitled to park in the South Lot without paying a fee?
- (A) Construction resurfacing workers
- (B) Exhibitors with valid vendor permits
- (C) All registered expo attendees
- (D) Shuttle bus operators

**17. (Cấp độ 650+ - Inference & Paraphrasing):**
What is indicated about the shuttle service?
- (A) It requires an additional surcharge of $10.00.
- (B) It operates throughout the night.
- (C) It provides free transportation to the exhibition hall.
- (D) It requires attendees to make advance reservations.

---

### PHẦN II: ĐÁP ÁN & LỜI GIẢI THÍCH CHI TIẾT (ANSWER KEY & EXPLANATIONS)

#### BẢNG ĐÁP ÁN NHANH (QUICK ANSWER KEY)
| Câu | Đáp án | Kỹ năng & Thể loại | Cấp độ | Nghĩa tiếng Việt / Trọng tâm ngữ pháp |
| :---: | :---: | :--- | :---: | :--- |
| **1** | **inventory** | LC Part 3 - Cloze Dictation | Foundation/550+ | hàng tồn kho, mức kiểm kê |
| **2** | **shipment** | LC Part 3 - Cloze Dictation | Foundation/550+ | lô hàng, chuyến hàng mới nhất |
| **3** | **defective** | LC Part 3 - Cloze Dictation | 550+ | bị lỗi, có khuyết tật (cần gạt bị gãy) |
| **4** | **representative** | LC Part 3 - Cloze Dictation | 550+/650+ | người đại diện nhà sản xuất |
| **5** | **investigate** | LC Part 3 - Cloze Dictation | 550+ | điều tra, tìm hiểu nguyên nhân |
| **6** | **warranty** | LC Part 3 - Cloze Dictation | Foundation/550+ | under warranty: còn trong thời hạn bảo hành |
| **7** | **temporarily** | LC Part 3 - Cloze Dictation | 550+ | một cách tạm thời (dùng ghế trong kho) |
| **8** | **inconvenience** | LC Part 3 - Cloze Dictation | Foundation/550+ | apologize for the inconvenience: xin lỗi vì sự bất tiện |
| **9** | **accommodate** | LC Part 3 - Cloze Dictation | 650+ | accommodate everyone's needs: đáp ứng nhu cầu |
| **10**| **compensation**| LC Part 3 - Cloze Dictation | 650+ | offer compensation: khoản bồi thường, đền bù |
| **11**| **B** | RC Part 5 - Incomplete Sentences| Foundation | Từ loại: Trạng từ (*carefully*) bổ nghĩa động từ (*reviewed*) |
| **12**| **B** | RC Part 5 - Incomplete Sentences| 550+ | Giới từ chỉ sự nhượng bộ: *Despite* + Cụm danh từ |
| **13**| **A** | RC Part 5 - Incomplete Sentences| 650+ | Đảo ngữ câu điều kiện loại 1: *Should + S + V_0* |
| **14**| **A** | RC Part 6 - Text Completion | 550+ | Thể giả định: *It is essential that S + V_0* (nguyên mẫu) |
| **15**| **A** | RC Part 6 - Text Completion | 650+ | Liên từ liên kết ý bổ sung hành động: *In addition* |
| **16**| **B** | RC Part 7 - Reading Comprehension| Foundation / 550+ | Quét thông tin trực tiếp: *Exhibitors with vendor permits* |
| **17**| **C** | RC Part 7 - Reading Comprehension| 650+ | Suy luận từ đồng nghĩa: *complimentary shuttle = free transport* |

---

### PHẦN III: MA TRẬN XẾP LỚP & TƯ VẤN LỘ TRÌNH (PLACEMENT & ACTION MATRIX)

| Số câu đúng / 17 | Phân loại cấp độ | Dự phóng điểm TOEIC | Phân tích năng lực thực tế | Đề xuất khóa học phù hợp |
| :---: | :---: | :---: | :--- | :--- |
| **0 – 7 câu** | **FOUNDATION** | **Dưới 450**<br>*(Khoảng 250 - 400)* | • Phản xạ nghe chưa nhạy, chưa bắt kịp phát âm từ vựng công sở.<br>• Ngữ pháp hổng từ loại, thì cơ bản và cấu trúc câu.<br>• Tốc độ đọc rất chậm, hay dịch từng từ và dễ nản khi gặp đoạn văn dài. | **Khóa học TOEIC Foundation (24 Buổi):**<br>- Chuẩn hóa phát âm IPA & luyện nghe bắt từ khóa.<br>- Phục hồi 5 thì cơ bản & ngữ pháp câu căn bản.<br>- Xây gốc 1.200 từ vựng cốt lõi của người đi làm. |
| **8 – 12 câu** | **TOEIC 550+** | **450 – 645**<br>*(Mục tiêu 550 - 650)* | • Nắm được các cấu trúc ngữ pháp cơ bản và nghe hiểu được các từ vựng công sở quen thuộc.<br>• Dễ mất điểm ở các bẫy liên từ, từ đồng nghĩa và tốc độ đọc hiểu văn bản dài.<br>• Cần củng cố kỹ năng nối âm và chiến thuật đọc lướt Part 7. | **Khóa học TOEIC 550+ (Bứt phá 550 - 650+):**<br>- Vào thẳng Chặng 1 & Chặng 2.<br>- Luyện phản xạ thính giác và kỹ thuật chép chính tả Dictation.<br>- Làm chủ kỹ thuật đọc quét Scanning & câu chèn Part 7.<br>- Tối ưu hóa tốc độ làm bài Part 5 dưới 15 giây/câu. |
| **13 – 17 câu** | **TOEIC 650+** | **650 – 800+**<br>*(Mục tiêu 700 - 850)* | • Phản xạ nghe cực tốt, nhận diện chính xác từ vựng chuyên ngành trong đối thoại.<br>• Nắm chắc ngữ pháp nâng cao (đảo ngữ, giả định), tư duy đọc hiểu logic.<br>• Cần rèn luyện sức bền và kỹ năng giải quyết các đoạn văn kép và đoạn ba. | **Khóa học TOEIC 650+ Intensive (Hoặc vào thẳng Chặng 3):**<br>- Chuyên sâu Part 7 Đoạn kép & Đoạn ba.<br>- Chiến thuật giải quyết 200 câu trong 120 phút không kiệt sức.<br>- Luyện đề Full Mock Tests chuẩn ETS để bứt phá mốc 750+. |

---
*© TOEIC Placement Testing System - 10-Minute Assessment Protocol.*
"""
    return md

# ==============================================================================
# 2. BUILD POWERPOINT PRESENTATION (10 SLIDES)
# ==============================================================================
def build_placement_pptx():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # SLIDE 1: TITLE SLIDE (Dark Obsidian)
    s1 = prs.slides.add_slide(blank_layout)
    set_slide_background(s1, DARK_NAVY)

    tb = s1.shapes.add_textbox(Inches(1.0), Inches(1.5), Inches(11.3), Inches(0.5))
    tf = tb.text_frame
    p = tf.paragraphs[0]
    p.text = "TOEIC ASSESSMENT & PLACEMENT SYSTEM | KHẢO SÁT ĐẦU VÀO NHANH"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = ACCENT_CYAN

    tb_main = s1.shapes.add_textbox(Inches(1.0), Inches(2.2), Inches(11.3), Inches(2.2))
    tf_main = tb_main.text_frame
    tf_main.word_wrap = True
    p_main = tf_main.paragraphs[0]
    p_main.text = "10-MINUTE MINI PLACEMENT TEST\nKHẢO SÁT TOÀN DIỆN 7 PART (15 CÂU)"
    p_main.font.size = Pt(36)
    p_main.font.bold = True
    p_main.font.color.rgb = TEXT_LIGHT

    tb_sub = s1.shapes.add_textbox(Inches(1.0), Inches(4.7), Inches(11.3), Inches(1.2))
    tf_sub = tb_sub.text_frame
    tf_sub.word_wrap = True
    p_sub = tf_sub.paragraphs[0]
    p_sub.text = "• Thời gian làm bài: 10 phút (8 câu Listening + 7 câu Reading)\n• Đánh giá chuẩn xác năng lực xếp lớp: Foundation (< 450) — TOEIC 550+ — TOEIC 650+\n• Tích hợp đầy đủ File âm thanh Listening & Hình ảnh Part 1 chuẩn hóa"
    p_sub.font.size = Pt(14)
    p_sub.font.color.rgb = RGBColor(148, 163, 184)

    add_speaker_notes(s1, "Chào mừng các bạn đến với Bài kiểm tra xếp lớp nhanh TOEIC 10 phút.\nBài thi gồm 15 câu hỏi bao quát trọn vẹn 7 phần thi TOEIC với đầy đủ file audio nghe và ảnh tranh Part 1.")

    # SLIDE 2: TEST STRUCTURE & TIMING (Light BG)
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_background(s2, LIGHT_BG)
    add_header(s2, "TEST STRUCTURE", "Cấu trúc đề thi & Phân bổ thời gian (10 phút)")

    cards_data = [
        ("SECTION 1: LISTENING (~4 PHÚT)", 
         "• Part 1 (1 câu): Nhìn hình ảnh và chọn câu miêu tả đúng\n• Part 2 (3 câu): 1 câu hỏi WH trực tiếp, 1 lời đề nghị lịch sự, 1 phản hồi gián tiếp\n• Part 3 (2 câu): Hội thoại dịch vụ khách hàng\n• Part 4 (2 câu): Thông báo hoãn chuyến bay\n• Audio: Phát liên tục không ngắt quãng",
         PRIMARY_INDIGO, "ANIM_PLACE_S2_LC"),
        ("SECTION 2: READING (~6 PHÚT)", 
         "• Part 5 (3 câu): Từ loại (-ly), Giới từ nhượng bộ (Despite), Đảo ngữ điều kiện loại 1 (Should)\n• Part 6 (2 câu): Đoạn thông báo nội bộ (Thức giả định & Liên từ liên kết)\n• Part 7 (2 câu): Thông báo bãi đỗ xe Cloverdale Expo",
         ACCENT_CYAN, "ANIM_PLACE_S2_RC"),
        ("TIÊU CHÍ XẾP LỚP 3 CẤP ĐỘ", 
         "• 0 – 6 câu đúng: Xếp lớp Foundation (< 450)\n• 7 – 11 câu đúng: Xếp lớp TOEIC 550+ (450 - 645)\n• 12 – 15 câu đúng: Xếp lớp TOEIC 650+ (650 - 800+)\n• Đánh giá dựa trên phản xạ tức thì!",
         ACCENT_EMERALD, "ANIM_PLACE_S2_CRIT")
    ]

    for i, (title, desc, color, anim_name) in enumerate(cards_data):
        card = create_card(s2, Inches(0.8 + i*4.0), Inches(2.0), Inches(3.7), Inches(4.8), CARD_BG, BORDER_GRAY)
        card.name = anim_name
        tf_c = card.text_frame
        tf_c.word_wrap = True
        tf_c.margin_left = tf_c.margin_right = tf_c.margin_top = Inches(0.4)
        
        p_t = tf_c.paragraphs[0]
        p_t.text = title
        p_t.font.size = Pt(15)
        p_t.font.bold = True
        p_t.font.color.rgb = color
        
        p_d = tf_c.add_paragraph()
        p_d.space_before = Pt(14)
        p_d.text = desc
        p_d.font.size = Pt(13)
        p_d.font.color.rgb = TEXT_MUTED

    add_speaker_notes(s2, "Slide 2 nêu rõ cấu trúc đề thi: 8 câu nghe trong 4 phút, 7 câu đọc trong 6 phút, và thang đo 3 cấp độ phân loại.")

    # SLIDE 3: PART 1 WITH REAL PHOTOGRAPH (Question 1)
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_background(s3, LIGHT_BG)
    add_header(s3, "LISTENING PART 1", "Photographs: Quan sát hình ảnh và chọn câu miêu tả đúng")

    # Add photograph
    img_path = "TOEIC_Placement_Test/images/part1_question_1.png"
    if os.path.exists(img_path):
        s3.shapes.add_picture(img_path, Inches(0.8), Inches(1.8), width=Inches(5.6))

    # Add question card on right side
    card_q1 = create_card(s3, Inches(6.8), Inches(1.8), Inches(5.7), Inches(5.0), CARD_BG, BORDER_GRAY)
    tf_q1 = card_q1.text_frame
    tf_q1.word_wrap = True
    tf_q1.margin_left = Inches(0.4)
    tf_q1.margin_top = Inches(0.3)

    p_q1t = tf_q1.paragraphs[0]
    p_q1t.text = "CÂU 1: PART 1 (PHOTOGRAPHS) - FOUNDATION TIER"
    p_q1t.font.size = Pt(14)
    p_q1t.font.bold = True
    p_q1t.font.color.rgb = PRIMARY_INDIGO

    p_q1c = tf_q1.add_paragraph()
    p_q1c.space_before = Pt(10)
    p_q1c.text = (
        "Directions: Nghe 4 phương án miêu tả bức ảnh.\n"
        "(Các phương án không được in trong đề thi)\n\n"
        "    [ A ]        [ B ]        [ C ]        [ D ]\n\n"
        "Audio file: audio/Part1_Question_1.wav"
    )
    p_q1c.font.size = Pt(13)
    p_q1c.font.color.rgb = TEXT_DARK

    card_a1 = create_card(s3, Inches(6.8), Inches(4.5), Inches(5.7), Inches(2.3), ANSWER_BG, ANSWER_BORDER)
    card_a1.name = "ANIM_PLACE_S3_A1"
    tf_a1 = card_a1.text_frame
    tf_a1.word_wrap = True
    tf_a1.margin_left = Inches(0.3)
    tf_a1.margin_top = Inches(0.2)
    p_a1t = tf_a1.paragraphs[0]
    p_a1t.text = "ĐÁP ÁN: (A) He is holding a tray of drinks"
    p_a1t.font.size = Pt(14)
    p_a1t.font.bold = True
    p_a1t.font.color.rgb = RGBColor(22, 101, 52)
    p_a1d = tf_a1.add_paragraph()
    p_a1d.space_before = Pt(6)
    p_a1d.text = (
        "Audio Transcript:\n"
        "(A) He is holding a tray of drinks.  (B) Setting a table.\n"
        "(C) Wiping down a counter.  (D) Taking an order.\n"
        "Giải thích: Nam phục vụ bưng khay đồ uống. Các phương án B, C, D đều sai lệch hành động."
    )
    p_a1d.font.size = Pt(11)
    p_a1d.font.color.rgb = RGBColor(22, 101, 52)

    add_speaker_notes(s3, "Slide 3 hiển thị trực tiếp hình ảnh Part 1 chuẩn hóa. Giảng viên bấm click để hiển thị đáp án (A) kèm giải thích phân tích bẫy hành động.")

    # SLIDE 4: PART 2 (QUESTIONS 2 - 4)
    s4 = prs.slides.add_slide(blank_layout)
    set_slide_background(s4, LIGHT_BG)
    add_header(s4, "LISTENING PART 2", "Question - Response (3 cấp độ phân tầng)")

    p2_items = [
        ("CÂU 2: CÂU HỎI WH TRỰC TIẾP (FOUNDATION)",
         "Mark your answer on your answer sheet:\n    [ A ]            [ B ]            [ C ]\n(Câu hỏi và câu trả lời không in trong đề thi)",
         "ANIM_PLACE_S4_A2",
         "ĐÁP ÁN: (B) On the conference table\nTranscript: \"Where did you leave the meeting agenda?\"\n(A) At three o'clock.  (B) On the table.  (C) Yes, I enjoyed it.\nGiải thích: Where hỏi vị trí -> trả lời nơi chốn."),
        ("CÂU 3: LỜI ĐỀ NGHỊ GIÚP ĐỠ (550+)",
         "Mark your answer on your answer sheet:\n    [ A ]            [ B ]            [ C ]\n(Câu hỏi và câu trả lời không in trong đề thi)",
         "ANIM_PLACE_S4_A3",
         "ĐÁP ÁN: (A) Thanks, but they're not that heavy\nTranscript: \"Would you like me to help you carry those boxes?\"\n(A) Thanks, but...  (B) In the mailroom.  (C) Fifty copies.\nGiải thích: Lời đề nghị -> Lịch sự từ chối và nêu lý do."),
        ("CÂU 4: PHẢN HỒI GIÁN TIẾP BẰNG NGUYÊN NHÂN (650+)",
         "Mark your answer on your answer sheet:\n    [ A ]            [ B ]            [ C ]\n(Câu hỏi và câu trả lời không in trong đề thi)",
         "ANIM_PLACE_S4_A4",
         "ĐÁP ÁN: (A) His flight from Tokyo was delayed\nTranscript: \"Didn't Mr. Tanaka say he would arrive by noon?\"\n(A) Flight delayed.  (B) Yes, he does.  (C) Room 302.\nGiải thích: Trả lời gián tiếp bằng lý do trễ giờ.")
    ]

    for i, (q_t, q_c, anim_n, ans_txt) in enumerate(p2_items):
        card_q = create_card(s4, Inches(0.8), Inches(1.8 + i*1.75), Inches(7.5), Inches(1.6), CARD_BG, BORDER_GRAY)
        tf_q = card_q.text_frame
        tf_q.word_wrap = True
        tf_q.margin_left = Inches(0.3)
        tf_q.margin_top = Inches(0.12)
        p_qt = tf_q.paragraphs[0]
        p_qt.text = q_t
        p_qt.font.size = Pt(12)
        p_qt.font.bold = True
        p_qt.font.color.rgb = PRIMARY_INDIGO

        p_qc = tf_q.add_paragraph()
        p_qc.space_before = Pt(2)
        p_qc.text = q_c
        p_qc.font.size = Pt(11)
        p_qc.font.color.rgb = TEXT_DARK

        card_a = create_card(s4, Inches(8.5), Inches(1.8 + i*1.75), Inches(4.0), Inches(1.6), ANSWER_BG, ANSWER_BORDER)
        card_a.name = anim_n
        tf_a = card_a.text_frame
        tf_a.word_wrap = True
        tf_a.margin_left = Inches(0.25)
        tf_a.margin_top = Inches(0.12)
        p_at = tf_a.paragraphs[0]
        p_at.text = ans_txt
        p_at.font.size = Pt(10)
        p_at.font.color.rgb = RGBColor(22, 101, 52)

    add_speaker_notes(s4, "Slide 4 kiểm tra 3 cấp độ Part 2: Câu hỏi WH trực tiếp, câu đề nghị giúp đỡ, và câu trả lời gián tiếp.")

    # SLIDE 5: PART 3 & 4 (QUESTIONS 5 - 8)
    s5 = prs.slides.add_slide(blank_layout)
    set_slide_background(s5, LIGHT_BG)
    add_header(s5, "LISTENING PART 3 & 4", "Short Conversations & Short Talks")

    q_items_s5 = [
        ("PART 3: CUSTOMER ORDER CONVERSATION (CÂU 5 & 6)",
         "Context: Man reports cracked lamp shade. Woman offers free replacement via express.\nQ5. Why is the man calling? -> (C) To report a damaged merchandise item.\nQ6. What does the woman offer to do? -> (B) Dispatch a replacement item by express courier.",
         "ANIM_PLACE_S5_P3",
         "ĐÁP ÁN: Q5: (C) | Q6: (B)\nGiải thích: Người đàn ông gọi báo hàng nứt vỡ; nhân viên cam kết gửi hàng thay thế hỏa tốc trong 2 ngày."),
        ("PART 4: AIRPORT FLIGHT DELAY ANNOUNCEMENT (CÂU 7 & 8)",
         "Context: Runway resurfacing maintenance causes 45-minute flight delay.\nQ7. What is the primary purpose? -> (B) To report a flight departure delay.\nQ8. What can passengers collect? -> (D) Complimentary snack and beverage vouchers.",
         "ANIM_PLACE_S5_P4",
         "ĐÁP ÁN: Q7: (B) | Q8: (D)\nGiải thích: Thông báo chính là hoãn chuyến bay; bồi thường phiếu ăn uống tại quầy dịch vụ khách hàng.")
    ]

    for i, (q_t, q_c, anim_n, ans_txt) in enumerate(q_items_s5):
        card_q = create_card(s5, Inches(0.8), Inches(1.8 + i*2.6), Inches(7.5), Inches(2.4), CARD_BG, BORDER_GRAY)
        tf_q = card_q.text_frame
        tf_q.word_wrap = True
        tf_q.margin_left = Inches(0.4)
        tf_q.margin_top = Inches(0.2)
        p_qt = tf_q.paragraphs[0]
        p_qt.text = q_t
        p_qt.font.size = Pt(13)
        p_qt.font.bold = True
        p_qt.font.color.rgb = PRIMARY_INDIGO

        p_qc = tf_q.add_paragraph()
        p_qc.space_before = Pt(6)
        p_qc.text = q_c
        p_qc.font.size = Pt(12)
        p_qc.font.color.rgb = TEXT_DARK

        card_a = create_card(s5, Inches(8.5), Inches(1.8 + i*2.6), Inches(4.0), Inches(2.4), ANSWER_BG, ANSWER_BORDER)
        card_a.name = anim_n
        tf_a = card_a.text_frame
        tf_a.word_wrap = True
        tf_a.margin_left = Inches(0.3)
        tf_a.margin_top = Inches(0.2)
        p_at = tf_a.paragraphs[0]
        p_at.text = ans_txt
        p_at.font.size = Pt(11)
        p_at.font.color.rgb = RGBColor(22, 101, 52)

    add_speaker_notes(s5, "Slide 5 trình bày các câu hỏi Part 3 và Part 4. Bấm click để hiển thị đáp án và lý giải chi tiết.")

    # SLIDE 6: READING PART 5 (QUESTIONS 9 - 11)
    s6 = prs.slides.add_slide(blank_layout)
    set_slide_background(s6, LIGHT_BG)
    add_header(s6, "READING PART 5", "Incomplete Sentences (3 cấp độ phân loại)")

    p5_items = [
        ("CÂU 9: TỪ LOẠI CƠ BẢN (FOUNDATION TIER - 350 ĐẾN 450)",
         "Ms. Chen reviewed the quarterly financial report ------- before submitting it.\n(A) careful    (B) carefully    (C) care    (D) carefulness",
         "ANIM_PLACE_S6_A9",
         "ĐÁP ÁN: (B) carefully\nGiải thích: Trạng từ thể cách 'carefully' bổ nghĩa cho động từ chính 'reviewed'."),
        ("CÂU 10: LIÊN TỪ VS GIỚI TỪ (550+ TIER - 500 ĐẾN 600)",
         "------- the inclement weather conditions, the outdoor marketing festival will proceed.\n(A) Although    (B) Despite    (C) Because    (D) Even",
         "ANIM_PLACE_S6_A10",
         "ĐÁP ÁN: (B) Despite\nGiải thích: 'Despite + Cụm danh từ' chỉ sự nhượng bộ. Although cần một mệnh đề (S + V)."),
        ("CÂU 11: ĐẢO NGỮ ĐIỀU KIỆN LOẠI 1 (650+ TIER - BỨT PHÁ 650+)",
         "------- you require any additional documentation, please contact the legal department.\n(A) Should    (B) If    (C) Were    (D) Had",
         "ANIM_PLACE_S6_A11",
         "ĐÁP ÁN: (A) Should\nGiải thích: Đảo ngữ câu điều kiện loại 1 trang trọng: 'Should + S + V_0' thay cho 'If you require'.")
    ]

    for i, (q_t, q_c, anim_n, ans_txt) in enumerate(p5_items):
        card_q = create_card(s6, Inches(0.8), Inches(1.8 + i*1.75), Inches(7.5), Inches(1.6), CARD_BG, BORDER_GRAY)
        tf_q = card_q.text_frame
        tf_q.word_wrap = True
        tf_q.margin_left = Inches(0.3)
        tf_q.margin_top = Inches(0.12)
        p_qt = tf_q.paragraphs[0]
        p_qt.text = q_t
        p_qt.font.size = Pt(12)
        p_qt.font.bold = True
        p_qt.font.color.rgb = PRIMARY_INDIGO

        p_qc = tf_q.add_paragraph()
        p_qc.space_before = Pt(2)
        p_qc.text = q_c
        p_qc.font.size = Pt(11)
        p_qc.font.color.rgb = TEXT_DARK

        card_a = create_card(s6, Inches(8.5), Inches(1.8 + i*1.75), Inches(4.0), Inches(1.6), ANSWER_BG, ANSWER_BORDER)
        card_a.name = anim_n
        tf_a = card_a.text_frame
        tf_a.word_wrap = True
        tf_a.margin_left = Inches(0.25)
        tf_a.margin_top = Inches(0.12)
        p_at = tf_a.paragraphs[0]
        p_at.text = ans_txt
        p_at.font.size = Pt(10)
        p_at.font.color.rgb = RGBColor(22, 101, 52)

    add_speaker_notes(s6, "Slide 6 kiểm tra 3 cấp độ Part 5: Từ loại cơ bản, Giới từ chỉ sự nhượng bộ, và Đảo ngữ câu điều kiện.")

    # SLIDE 7: READING PART 6 & 7 (QUESTIONS 12 - 15)
    s7 = prs.slides.add_slide(blank_layout)
    set_slide_background(s7, LIGHT_BG)
    add_header(s7, "READING PART 6 & 7", "Text Completion & Reading Comprehension")

    rc_items = [
        ("PART 6: MEMO ĐÁNH GIÁ NHÂN VIÊN (CÂU 12 & 13)",
         "Q12: 'It is essential that each supervisor ------- with team members.' -> (A) meet (Giả định thức V_0)\nQ13: '-------, please submit all signed forms...' -> (A) In addition (Bổ sung nhiệm vụ)",
         "ANIM_PLACE_S7_P6",
         "ĐÁP ÁN: Q12: (A) | Q13: (A)\nGiải thích: Q12 kiểm tra thức giả định (S + V_0 không chia); Q13 kiểm tra liên từ chuyển tiếp bổ sung."),
        ("PART 7: THÔNG BÁO BÃI ĐỖ XE CLOVERDALE EXPO (CÂU 14 & 15)",
         "Q14. Who can park without paying a fee? -> (B) Exhibitors with valid vendor permits.\nQ15. What is indicated about the shuttle service? -> (C) It provides free transportation to the hall.",
         "ANIM_PLACE_S7_P7",
         "ĐÁP ÁN: Q14: (B) | Q15: (C)\nGiải thích: Q14 quét chi tiết miễn phí cho đơn vị triển lãm; Q15 nhận diện từ đồng nghĩa 'complimentary = free'.")
    ]

    for i, (q_t, q_c, anim_n, ans_txt) in enumerate(rc_items):
        card_q = create_card(s7, Inches(0.8), Inches(1.8 + i*2.6), Inches(7.5), Inches(2.4), CARD_BG, BORDER_GRAY)
        tf_q = card_q.text_frame
        tf_q.word_wrap = True
        tf_q.margin_left = Inches(0.4)
        tf_q.margin_top = Inches(0.2)
        p_qt = tf_q.paragraphs[0]
        p_qt.text = q_t
        p_qt.font.size = Pt(13)
        p_qt.font.bold = True
        p_qt.font.color.rgb = PRIMARY_INDIGO

        p_qc = tf_q.add_paragraph()
        p_qc.space_before = Pt(6)
        p_qc.text = q_c
        p_qc.font.size = Pt(12)
        p_qc.font.color.rgb = TEXT_DARK

        card_a = create_card(s7, Inches(8.5), Inches(1.8 + i*2.6), Inches(4.0), Inches(2.4), ANSWER_BG, ANSWER_BORDER)
        card_a.name = anim_n
        tf_a = card_a.text_frame
        tf_a.word_wrap = True
        tf_a.margin_left = Inches(0.3)
        tf_a.margin_top = Inches(0.2)
        p_at = tf_a.paragraphs[0]
        p_at.text = ans_txt
        p_at.font.size = Pt(11)
        p_at.font.color.rgb = RGBColor(22, 101, 52)

    add_speaker_notes(s7, "Slide 7 chữa chi tiết Part 6 và Part 7. Bấm click để hiện thẻ đáp án phân tích bẫy từ đồng nghĩa và thức giả định.")

    # SLIDE 8: SCORE MATRIX & PLACEMENT DECISION
    s8 = prs.slides.add_slide(blank_layout)
    set_slide_background(s8, LIGHT_BG)
    add_header(s8, "PLACEMENT DECISION", "Bảng quy đổi kết quả & Quyết định xếp lớp tức thì")

    levels_data = [
        ("CẤP ĐỘ: FOUNDATION (0 – 6 / 15 CÂU)",
         "• Dự phóng điểm: Dưới 450 TOEIC (250 - 400)\n• Năng lực: Hổng từ loại, thì cơ bản, phản xạ nghe yếu.\n• Lộ trình: Học Khóa TOEIC Foundation (24 Buổi)\n• Mục tiêu: Xây gốc 1.200 từ vựng và lấy lại phản xạ nghe Part 1 & 2.",
         PRIMARY_INDIGO, "ANIM_PLACE_S8_FND"),
        ("CẤP ĐỘ: TOEIC 550+ (7 – 11 / 15 CÂU)",
         "• Dự phóng điểm: 450 – 645 TOEIC\n• Năng lực: Nắm vững câu hỏi cơ bản, dễ dính bẫy ngụ ý và ngữ pháp nâng cao.\n• Lộ trình: Vào thẳng Khóa TOEIC 550+ (Chặng 1 & 2)\n• Mục tiêu: Xóa sổ bẫy Part 2-3-4 và làm chủ Part 7 đơn.",
         ACCENT_CYAN, "ANIM_PLACE_S8_550"),
        ("CẤP ĐỘ: TOEIC 650+ (12 – 15 / 15 CÂU)",
         "• Dự phóng điểm: 650 – 800+ TOEIC\n• Năng lực: Phản xạ nghe xuất sắc, tư duy đọc hiểu logic, vững ngữ pháp khó.\n• Lộ trình: Học Khóa TOEIC 650+ (hoặc vào Chặng 3)\n• Mục tiêu: Chinh phục Đoạn kép & Đoạn ba và luyện đề Full Tests.",
         ACCENT_EMERALD, "ANIM_PLACE_S8_650")
    ]

    for i, (l_t, l_d, l_c, l_anim) in enumerate(levels_data):
        card = create_card(s8, Inches(0.8 + i*4.0), Inches(2.0), Inches(3.7), Inches(4.8), CARD_BG, BORDER_GRAY)
        card.name = l_anim
        tf_l = card.text_frame
        tf_l.word_wrap = True
        tf_l.margin_left = tf_l.margin_right = tf_l.margin_top = Inches(0.4)
        p_lt = tf_l.paragraphs[0]
        p_lt.text = l_t
        p_lt.font.size = Pt(15)
        p_lt.font.bold = True
        p_lt.font.color.rgb = l_c
        
        p_ld = tf_l.add_paragraph()
        p_ld.space_before = Pt(14)
        p_ld.text = l_d
        p_ld.font.size = Pt(12.5)
        p_ld.font.color.rgb = TEXT_DARK

    add_speaker_notes(s8, "Slide 8 là bảng ra quyết định xếp lớp: Giảng viên đối chiếu số câu đúng của học viên để kết luận vào lớp Foundation, 550+, hay 650+.")

    # SLIDE 9: PATHWAY ADVICE
    s9 = prs.slides.add_slide(blank_layout)
    set_slide_background(s9, LIGHT_BG)
    add_header(s9, "PATHWAY ADVICE", "Tư vấn lộ trình bứt phá theo từng khoảng điểm")

    consult_cards = [
        ("NẾU THI ĐẠT 0 - 6 CÂU (VÀO FOUNDATION)",
         "• Nguyên nhân chính: Phát âm chưa chuẩn dẫn đến nghe không kịp; vốn từ vựng dưới 800 từ.\n• Lời khuyên: Tuyệt đối không nhảy cóc vào giải đề ngay. Cần 8 tuần xây lại nền tảng phát âm IPA, cấu trúc câu S-V-O và 5 thì cơ bản trong tiếng Anh.",
         PRIMARY_INDIGO),
        ("NẾU THI ĐẠT 7 - 11 CÂU (VÀO TOEIC 550+)",
         "• Nguyên nhân chính: Làm được câu dễ nhưng hay mất điểm ở câu hỏi suy luận và bẫy đồng âm.\n• Lời khuyên: Học phương pháp Scanning có định hướng, học kỹ thuật nghe phân tán thông tin Part 3 & 4 và các điểm ngữ pháp Part 5 ăn điểm 5 giây.",
         ACCENT_CYAN),
        ("NẾU THI ĐẠT 12 - 15 CÂU (VÀO TOEIC 650+)",
         "• Nền tảng: Đã sẵn sàng cán mốc 700 - 800+ điểm.\n• Lời khuyên: Tập trung cao độ vào kỹ năng liên kết thông tin đa chiều ở Part 7 Đoạn kép & Đoạn ba, quản trị thời gian 120 phút phòng thi và tăng độ nhạy từ vựng kinh tế.",
         ACCENT_EMERALD)
    ]

    for i, (cs_t, cs_d, cs_c) in enumerate(consult_cards):
        card = create_card(s9, Inches(0.8), Inches(1.8 + i*1.75), Inches(11.7), Inches(1.55), CARD_BG, BORDER_GRAY)
        tf_c = card.text_frame
        tf_c.word_wrap = True
        tf_c.margin_left = Inches(0.4)
        tf_c.margin_top = Inches(0.2)
        p_ct = tf_c.paragraphs[0]
        p_ct.text = cs_t
        p_ct.font.size = Pt(13)
        p_ct.font.bold = True
        p_ct.font.color.rgb = cs_c
        
        p_cd = tf_c.add_paragraph()
        p_cd.space_before = Pt(4)
        p_cd.text = cs_d
        p_cd.font.size = Pt(11.5)
        p_cd.font.color.rgb = TEXT_DARK

    card.name = "ANIM_PLACE_S9_ADVICE"
    add_speaker_notes(s9, "Slide 9 cung cấp các chỉ dẫn tâm lý và chiến lược học tập cho từng phân khúc học viên.")

    # SLIDE 10: ENROLLMENT PLAN (Dark Obsidian)
    s10 = prs.slides.add_slide(blank_layout)
    set_slide_background(s10, DARK_NAVY)
    add_header(s10, "ENROLLMENT PLAN", "Kế hoạch nhập học & Nhận tài liệu học tập", dark=True)

    c_hw = create_card(s10, Inches(0.8), Inches(2.0), Inches(5.7), Inches(4.8), CARD_DARK, PRIMARY_INDIGO)
    c_hw.name = "ANIM_PLACE_S10_PLAN"
    tf_hw = c_hw.text_frame
    tf_hw.word_wrap = True
    tf_hw.margin_left = Inches(0.4)
    tf_hw.margin_top = Inches(0.4)
    p_hwt = tf_hw.paragraphs[0]
    p_hwt.text = "QUY TRÌNH TIẾP NHẬN HỌC VIÊN"
    p_hwt.font.size = Pt(18)
    p_hwt.font.bold = True
    p_hwt.font.color.rgb = ACCENT_AMBER

    p_hwc = tf_hw.add_paragraph()
    p_hwc.space_before = Pt(14)
    p_hwc.text = (
        "1. Thí sinh nộp phiếu làm bài 15 câu cho giám thị / giáo viên.\n\n"
        "2. Giảng viên chấm điểm trong 60 giây và đối chiếu Ma trận xếp lớp.\n\n"
        "3. Thông báo kết quả trực tiếp cho học viên và tư vấn lớp học tương ứng.\n\n"
        "4. Bàn giao bộ giáo trình và tài liệu học tập chính thức của khóa học."
    )
    p_hwc.font.size = Pt(13)
    p_hwc.font.color.rgb = TEXT_LIGHT

    c_nxt = create_card(s10, Inches(6.8), Inches(2.0), Inches(5.7), Inches(4.8), CARD_DARK, ACCENT_CYAN)
    c_nxt.name = "ANIM_PLACE_S10_ECOSYS"
    tf_nxt = c_nxt.text_frame
    tf_nxt.word_wrap = True
    tf_nxt.margin_left = Inches(0.4)
    tf_nxt.margin_top = Inches(0.4)
    p_nt = tf_nxt.paragraphs[0]
    p_nt.text = "HỆ SINH THÁI KHÓA HỌC SẴN CÓ"
    p_nt.font.size = Pt(18)
    p_nt.font.bold = True
    p_nt.font.color.rgb = ACCENT_CYAN

    p_nc = tf_nxt.add_paragraph()
    p_nc.space_before = Pt(14)
    p_nc.text = (
        "• KHÓA HỌC FOUNDATION (24 BUỔI):\n  (Toàn bộ 16 Unit bài giảng, slides và handouts đã lưu trữ trong thư mục Foundation/)\n\n"
        "• KHÓA HỌC TOEIC 550+ (18 BUỔI):\n  - Chặng 1 (Units 01 – 06): Đã hoàn tất 18 file\n  - Chặng 2 (Units 07 – 12): Đã hoàn tất 18 file\n  - Chặng 3 (Units 13 – 18): Sẵn sàng triển khai theo yêu cầu."
    )
    p_nc.font.size = Pt(13)
    p_nc.font.color.rgb = TEXT_LIGHT

    add_speaker_notes(s10, "Slide 10 kết thúc buổi khảo sát: Giới thiệu quy trình nhập học và hệ sinh thái học liệu sẵn có của trung tâm.")

    return prs

# ==============================================================================
# 3. ANIMATE PRESENTATION
# ==============================================================================
def animate_pptx(source_rel_path, target_rel_path, anim_map):
    json_path = "temp_anim_placement.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(anim_map, f)
        
    cmd = [
        "powershell",
        "-ExecutionPolicy", "Bypass",
        "-File", "animate_deck.ps1",
        "-SourcePath", source_rel_path,
        "-TargetPath", target_rel_path,
        "-AnimJsonPath", json_path
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    print(res.stdout)
    if res.returncode != 0:
        print("ERROR animating:", res.stderr)
        raise RuntimeError("Animation failed")
    if os.path.exists(json_path):
        os.remove(json_path)

# ==============================================================================
# 4. CONVERT MD TO DOCX WITH IMAGE EMBEDDING & PROFESSIONAL STYLING
# ==============================================================================
def convert_md_to_docx(md_path, docx_path):
    with open(md_path, "r", encoding="utf-8") as f:
        md_text = f.read()

    # Pre-process LaTeX equations to clean text callouts for docx
    def replace_block_math(match):
        expr = match.group(1)
        expr = expr.replace(r'\mathbf{', '').replace(r'\text{', '').replace('}', '')
        expr = expr.replace(r'\ ', ' ').replace(r'\rightarrow', ' → ').replace(r'\implies', ' → ')
        return f"\n\n> **CÔNG THỨC:** {expr.strip()}\n\n"

    def replace_inline_math(match):
        expr = match.group(1)
        expr = expr.replace(r'\mathbf{', '').replace(r'\text{', '').replace('}', '')
        expr = expr.replace(r'\ ', ' ').replace(r'\rightarrow', ' → ').replace(r'\implies', ' → ')
        return f"**{expr.strip()}**"

    md_clean = re.sub(r'\$\$(.*?)\$\$', replace_block_math, md_text, flags=re.DOTALL)
    md_clean = re.sub(r'\$(.*?)\$', replace_inline_math, md_clean)

    # Temporary placeholder for image to prevent html parser errors
    img_placeholder = "<!-- PART1_PHOTO_PLACEHOLDER -->"
    md_clean = re.sub(r'!\[Part 1 Question 1 Photograph\]\(images/part1_question_1\.png\)', img_placeholder, md_clean)

    html = markdown.markdown(md_clean, extensions=['tables', 'fenced_code'])
    doc = docx.Document()

    for sec in doc.sections:
        sec.top_margin = DocxInches(1.0)
        sec.bottom_margin = DocxInches(1.0)
        sec.left_margin = DocxInches(1.0)
        sec.right_margin = DocxInches(1.0)

    # Student Metadata Box
    meta_table = doc.add_table(rows=2, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_table.autofit = False

    col_widths = [DocxInches(3.25), DocxInches(3.25)]
    for r in meta_table.rows:
        for idx, width in enumerate(col_widths):
            r.cells[idx].width = width

    def set_cell_border(cell, **kwargs):
        tc = cell._tc
        tcPr = tc.get_or_add_tcPr()
        tcBorders = parse_xml(r'''
            <w:tcBorders {} >
                <w:top w:val="{}" w:sz="{}" w:space="0" w:color="{}"/>
                <w:left w:val="{}" w:sz="{}" w:space="0" w:color="{}"/>
                <w:bottom w:val="{}" w:sz="{}" w:space="0" w:color="{}"/>
                <w:right w:val="{}" w:sz="{}" w:space="0" w:color="{}"/>
            </w:tcBorders>
        '''.format(nsdecls('w'),
                   kwargs.get('top', 'single'), kwargs.get('top_sz', '4'), kwargs.get('top_color', 'CCCCCC'),
                   kwargs.get('left', 'single'), kwargs.get('left_sz', '4'), kwargs.get('left_color', 'CCCCCC'),
                   kwargs.get('bottom', 'single'), kwargs.get('bottom_sz', '4'), kwargs.get('bottom_color', 'CCCCCC'),
                   kwargs.get('right', 'single'), kwargs.get('right_sz', '4'), kwargs.get('right_color', 'CCCCCC')))
        tcPr.append(tcBorders)

    c00 = meta_table.cell(0, 0)
    c00.paragraphs[0].text = "Họ và tên thí sinh: ...................................................."
    c01 = meta_table.cell(0, 1)
    c01.paragraphs[0].text = "Số điện thoại / Email: ...................................................."
    c10 = meta_table.cell(1, 0)
    c10.paragraphs[0].text = "Ngày kiểm tra: ............................................................"
    c11 = meta_table.cell(1, 1)
    c11.paragraphs[0].text = "Kết quả: ........../15   Xếp lớp: [ ] Foundation  [ ] 550+  [ ] 650+"

    for r in meta_table.rows:
        for cell in r.cells:
            set_cell_border(cell, top='single', bottom='single', left='single', right='single',
                            top_sz='6', bottom_sz='6', left_sz='6', right_sz='6',
                            top_color='4F46E5', bottom_color='4F46E5', left_color='4F46E5', right_color='4F46E5')
            shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="F8FAFC"/>')
            cell._tc.get_or_add_tcPr().append(shd)

    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_before = DocxPt(12)

    new_parser = HtmlToDocx()
    new_parser.add_html_to_document(html, doc)

    # Insert Image right after Part 1 directions
    img_path = "TOEIC_Placement_Test/images/part1_question_1.png"
    if os.path.exists(img_path):
        for idx, p in enumerate(doc.paragraphs):
            if "PART 1: PHOTOGRAPHS" in p.text:
                # Insert photo in paragraph after directions
                p_img = doc.paragraphs[idx + 1].insert_paragraph_before()
                p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
                run_img = p_img.add_run()
                run_img.add_picture(img_path, width=DocxInches(4.6))
                p_cap = doc.paragraphs[idx + 2].insert_paragraph_before()
                p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
                r_cap = p_cap.add_run("Hình ảnh câu 1: Tranh mô tả Part 1 (ETS TOEIC)")
                r_cap.font.italic = True
                r_cap.font.size = DocxPt(9.5)
                r_cap.font.color.rgb = DocxRGBColor(100, 116, 139)
                break

    # Style headings and tables
    for p in doc.paragraphs:
        if p.text.startswith("BÀI THI XẾP LỚP"):
            p.runs[0].font.size = DocxPt(18)
            p.runs[0].font.bold = True
            p.runs[0].font.color.rgb = DocxRGBColor(30, 58, 138)
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        elif p.text.startswith("KHẢO SÁT") or p.text.startswith("PHÂN LOẠI"):
            p.runs[0].font.size = DocxPt(13)
            p.runs[0].font.bold = True
            p.runs[0].font.color.rgb = DocxRGBColor(79, 70, 229)
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        elif p.text.startswith("PHẦN"):
            p.runs[0].font.size = DocxPt(13)
            p.runs[0].font.bold = True
            p.runs[0].font.color.rgb = DocxRGBColor(30, 58, 138)

    for tbl in doc.tables:
        if tbl == meta_table:
            continue
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        for idx, row in enumerate(tbl.rows):
            for cell in row.cells:
                tcPr = cell._tc.get_or_add_tcPr()
                if idx == 0:
                    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="1E3A8A"/>')
                    tcPr.append(shd)
                    for p in cell.paragraphs:
                        for run in p.runs:
                            run.font.bold = True
                            run.font.color.rgb = DocxRGBColor(255, 255, 255)
                else:
                    if idx % 2 == 1:
                        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="F8FAFC"/>')
                    else:
                        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="FFFFFF"/>')
                    tcPr.append(shd)

    doc.save(docx_path)
    print(f"Successfully converted MD to DOCX with Image: {docx_path}")

# ==============================================================================
# MAIN EXECUTION PIPELINE
# ==============================================================================
def main():
    print("=== BUILDING TOEIC 10-MINUTE MINI PLACEMENT TEST (WITH AUDIO & PHOTO) ===")
    os.makedirs("TOEIC_Placement_Test/slides", exist_ok=True)
    os.makedirs("TOEIC_Placement_Test/handouts", exist_ok=True)
    os.makedirs("TOEIC_Placement_Test/docx", exist_ok=True)

    md_path = "TOEIC_Placement_Test/TOEIC_Mini_Placement_Test_10Min.md"
    temp_pptx = "TOEIC_Placement_Test/slides/temp_placement_base.pptx"
    anim_pptx = "TOEIC_Placement_Test/slides/TOEIC_Mini_Placement_Test_10Min_Animated.pptx"
    docx_path = "TOEIC_Placement_Test/docx/TOEIC_Mini_Placement_Test_10Min.docx"

    # Step 1: Generate Handout MD
    md_content = build_placement_md()
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_content)
    print(f"Created {md_path}")

    # Step 2: Generate Base Presentation
    prs = build_placement_pptx()
    prs.save(temp_pptx)
    print(f"Saved base presentation to {temp_pptx}")

    # Step 3: Animate Presentation
    anim_map_placement = {
        2: ["ANIM_PLACE_S2_LC", "ANIM_PLACE_S2_RC", "ANIM_PLACE_S2_CRIT"],
        3: ["ANIM_PLACE_S3_A1"],
        4: ["ANIM_PLACE_S4_A2", "ANIM_PLACE_S4_A3", "ANIM_PLACE_S4_A4"],
        5: ["ANIM_PLACE_S5_P3", "ANIM_PLACE_S5_P4"],
        6: ["ANIM_PLACE_S6_A9", "ANIM_PLACE_S6_A10", "ANIM_PLACE_S6_A11"],
        7: ["ANIM_PLACE_S7_P6", "ANIM_PLACE_S7_P7"],
        8: ["ANIM_PLACE_S8_FND", "ANIM_PLACE_S8_550", "ANIM_PLACE_S8_650"],
        9: ["ANIM_PLACE_S9_ADVICE"],
        10: ["ANIM_PLACE_S10_PLAN", "ANIM_PLACE_S10_ECOSYS"]
    }
    animate_pptx(temp_pptx, anim_pptx, anim_map_placement)
    if os.path.exists(temp_pptx):
        os.remove(temp_pptx)

    # Step 4: Convert MD to DOCX with embedded image
    convert_md_to_docx(md_path, docx_path)
    print("=== TOEIC PLACEMENT TEST BUILD COMPLETED SUCCESSFULLY ===")

if __name__ == "__main__":
    main()
