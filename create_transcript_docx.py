import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def add_heading_styled(doc, text, level=1):
    h = doc.add_heading(text, level=level)
    h.paragraph_format.space_before = Pt(14)
    h.paragraph_format.space_after = Pt(6)
    run = h.runs[0]
    if level == 1:
        run.font.size = Pt(16)
        run.font.bold = True
        run.font.color.rgb = RGBColor(11, 15, 25) # Deep Obsidian
    elif level == 2:
        run.font.size = Pt(13)
        run.font.bold = True
        run.font.color.rgb = RGBColor(79, 70, 229) # Electric Indigo
    elif level == 3:
        run.font.size = Pt(11)
        run.font.bold = True
        run.font.color.rgb = RGBColor(15, 23, 42)
    return h

def build_transcript_docx(out_path):
    doc = Document()
    
    # Page setup
    for s in doc.sections:
        s.top_margin = Inches(0.8)
        s.bottom_margin = Inches(0.8)
        s.left_margin = Inches(0.8)
        s.right_margin = Inches(0.8)

    # Title Block
    p_tag = doc.add_paragraph()
    p_tag.paragraph_format.space_before = Pt(0)
    p_tag.paragraph_format.space_after = Pt(2)
    r_tag = p_tag.add_run("TOEIC 10-MINUTE MINI PLACEMENT TEST • OFFICIAL HANDOUT\n")
    r_tag.font.size = Pt(10)
    r_tag.font.bold = True
    r_tag.font.color.rgb = RGBColor(79, 70, 229)

    r_title = p_tag.add_run("BẢN TRANSCRIPT ĐOẠN ĐỐI THOẠI & ĐÁP ÁN 10 TỪ ĐIỀN\nKÈM DỊCH NGHĨA SONG NGỮ, GIẢI THÍCH & TỪ VỰNG TRỌNG TÂM")
    r_title.font.size = Pt(16)
    r_title.font.bold = True
    r_title.font.color.rgb = RGBColor(11, 15, 25)

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_before = Pt(3)
    p_sub.paragraph_format.space_after = Pt(12)
    r_sub = p_sub.add_run("Tài liệu chính thức biên soạn cho học viên và giảng viên TOEIC MR.NAM phục vụ đối chiếu, kiểm tra và nâng cao năng lực nghe hiểu")
    r_sub.font.size = Pt(10)
    r_sub.font.italic = True
    r_sub.font.color.rgb = RGBColor(71, 85, 105)

    # Info table
    tbl_meta = doc.add_table(rows=2, cols=4)
    tbl_meta.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_headers = ["Kỹ năng kiểm tra", "Dạng bài", "Số chỗ trống / Câu hỏi", "Độ phủ bài thi"]
    meta_vals = ["Listening Comprehension", "Nghe điền từ (Cloze Dictation)", "10 Chỗ trống (1 - 10)", "Part 3 Short Conversations (Chuẩn ETS)"]
    for i in range(4):
        ch = tbl_meta.rows[0].cells[i]
        ch.text = meta_headers[i]
        ch.paragraphs[0].runs[0].font.bold = True
        ch.paragraphs[0].runs[0].font.size = Pt(9.5)
        ch.paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
        set_cell_background(ch, "1E293B")
        set_cell_margins(ch, top=70, bottom=70, left=90, right=90)
        
        cv = tbl_meta.rows[1].cells[i]
        cv.text = meta_vals[i]
        cv.paragraphs[0].runs[0].font.size = Pt(9.5)
        set_cell_background(cv, "F8FAFC")
        set_cell_margins(cv, top=70, bottom=70, left=90, right=90)

    # 1. HỘI THOẠI SONG NGỮ
    add_heading_styled(doc, "1. NỘI DUNG ĐOẠN ĐỐI THOẠI SONG NGỮ (LISTENING DIALOGUE)", level=1)
    
    dialogue_pairs = [
        ("W: Mark, I just checked the warehouse, and our [1. inventory] of the new ergonomic office chairs is extremely low.",
         "Nữ: Mark, tôi vừa kiểm tra nhà kho xong, và lượng [1. hàng tồn kho] của mẫu ghế văn phòng công thái học mới đang cực kỳ thấp."),
        ("M: Really? The latest [2. shipment] arrived on Tuesday. Did we already distribute all of them to the sales department?",
         "Nam: Thật vậy sao? [2. Lô hàng] mới nhất vừa tới vào hôm thứ Ba mà. Có phải chúng ta đã phân phát tất cả số ghế đó cho phòng kinh doanh rồi không?"),
        ("W: No, but a significant number of them were [3. defective]. The height adjustment levers were completely broken.",
         "Nữ: Không phải, mà là một số lượng đáng kể trong số đó [3. bị lỗi]. Cần gạt điều chỉnh độ cao bị gãy hoàn toàn."),
        ("M: That's unacceptable. Have you contacted the manufacturer's [4. representative] about this issue?",
         "Nam: Thật không thể chấp nhận được. Bạn đã liên hệ với [4. người đại diện] của nhà sản xuất về vấn đề này chưa?"),
        ("W: I left a voicemail this morning. I expect them to [5. investigate] the problem and send replacements immediately.",
         "Nữ: Tôi đã để lại hộp thư thoại sáng nay rồi. Tôi yêu cầu họ phải [5. điều tra / tìm hiểu] vấn đề và gửi hàng thay thế ngay lập tức."),
        ("M: Since the furniture is still under [6. warranty], they should cover all the return shipping costs.",
         "Nam: Vì lô nội thất vẫn còn trong thời hạn [6. bảo hành], họ phải chi trả toàn bộ chi phí vận chuyển hoàn trả."),
        ("W: Exactly. In the meantime, we will have to [7. temporarily] use the older chairs from the third-floor storage room.",
         "Nữ: Chính xác. Trong thời gian này, chúng ta sẽ phải [7. tạm thời] sử dụng các ghế cũ hơn từ phòng kho tầng 3."),
        ("M: Should I send out a memo to the staff to apologize for the [8. inconvenience]?",
         "Nam: Tôi có nên gửi một bản thông báo nội bộ tới nhân viên để xin lỗi về [8. sự bất tiện] này không?"),
        ("W: Yes, please do. Emphasize that we are trying to [9. accommodate] everyone's needs as quickly as possible.",
         "Nữ: Vâng, hãy làm vậy đi. Nhấn mạnh rằng chúng ta đang cố gắng [9. đáp ứng] nhu cầu của mọi người nhanh nhất có thể."),
        ("M: I'll draft it right away. Hopefully, the supplier will offer some [10. compensation] for the delay.",
         "Nam: Tôi sẽ soạn thảo ngay đây. Hy vọng nhà cung cấp sẽ đưa ra một khoản [10. bồi thường / đền bù] nào đó cho sự chậm trễ này.")
    ]

    t_diag = doc.add_table(rows=len(dialogue_pairs)+1, cols=2)
    t_diag.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_diag.rows[0].cells[0].text = "Lời thoại tiếng Anh (English Script)"
    t_diag.rows[0].cells[1].text = "Bản dịch nghĩa tiếng Việt (Vietnamese Translation)"
    for j in range(2):
        t_diag.rows[0].cells[j].paragraphs[0].runs[0].font.bold = True
        t_diag.rows[0].cells[j].paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
        set_cell_background(t_diag.rows[0].cells[j], "4F46E5")
        set_cell_margins(t_diag.rows[0].cells[j], 80, 80, 100, 100)

    for idx, (en, vi) in enumerate(dialogue_pairs):
        cell_en = t_diag.rows[idx+1].cells[0]
        cell_vi = t_diag.rows[idx+1].cells[1]
        cell_en.text = en
        cell_vi.text = vi
        bg = "FFFFFF" if idx % 2 == 0 else "F8FAFC"
        set_cell_background(cell_en, bg)
        set_cell_background(cell_vi, bg)
        set_cell_margins(cell_en, 70, 70, 90, 90)
        set_cell_margins(cell_vi, 70, 70, 90, 90)

    # 2. ĐÁP ÁN & PHÂN TÍCH TỪ VỰNG 10 CHỖ TRỐNG
    add_heading_styled(doc, "2. BẢNG ĐÁP ÁN & PHÂN TÍCH 10 CHỖ TRỐNG (ANSWER KEY & EXPLANATIONS)", level=1)
    
    answers_data = [
        ("1", "inventory", "hàng tồn kho, mức kiểm kê", "Danh từ (Noun)", "our inventory of the chairs... -> Lượng hàng tồn kho rất thấp."),
        ("2", "shipment", "lô hàng, chuyến hàng", "Danh từ (Noun)", "The latest shipment arrived -> Lô hàng mới nhất vừa tới vào thứ Ba."),
        ("3", "defective", "bị lỗi, có khuyết tật", "Tính từ (Adjective)", "were defective... levers completely broken -> Ghế bị lỗi hỏng cần gạt."),
        ("4", "representative", "người đại diện", "Danh từ chỉ người", "manufacturer's representative -> Đại diện nhà sản xuất (đuôi -ive)."),
        ("5", "investigate", "điều tra, tìm hiểu", "Động từ nguyên mẫu", "expect them to investigate the problem -> Yêu cầu họ điều tra nguyên nhân."),
        ("6", "warranty", "chế độ bảo hành", "Danh từ (Noun)", "under warranty -> Cụm cố định: còn trong thời hạn bảo hành."),
        ("7", "temporarily", "một cách tạm thời", "Trạng từ (Adverb)", "temporarily use the older chairs -> Tạm thời dùng ghế cũ từ phòng kho."),
        ("8", "inconvenience", "sự bất tiện", "Danh từ (Noun)", "apologize for the inconvenience -> Xin lỗi vì sự bất tiện gây ra."),
        ("9", "accommodate", "đáp ứng, phục vụ", "Động từ (Verb)", "accommodate everyone's needs -> Đáp ứng nhu cầu của mọi người."),
        ("10", "compensation", "sự bồi thường, đền bù", "Danh từ (Noun)", "offer some compensation for the delay -> Đưa ra khoản bồi thường cho sự chậm trễ.")
    ]

    t_ans = doc.add_table(rows=len(answers_data)+1, cols=5)
    t_ans.alignment = WD_TABLE_ALIGNMENT.CENTER
    ans_headers = ["Chỗ trống", "Từ cần điền (Key)", "Ý nghĩa tiếng Việt", "Từ loại", "Phân tích ngữ cảnh"]
    for j, h in enumerate(ans_headers):
        c = t_ans.rows[0].cells[j]
        c.text = h
        c.paragraphs[0].runs[0].font.bold = True
        c.paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
        set_cell_background(c, "1E293B")
        set_cell_margins(c, 70, 70, 80, 80)

    for idx, row in enumerate(answers_data):
        for j in range(5):
            c = t_ans.rows[idx+1].cells[j]
            c.text = row[j]
            if j == 1:
                c.paragraphs[0].runs[0].font.bold = True
                c.paragraphs[0].runs[0].font.color.rgb = RGBColor(79, 70, 229)
            bg = "FFFFFF" if idx % 2 == 0 else "F8FAFC"
            set_cell_background(c, bg)
            set_cell_margins(c, 60, 60, 80, 80)

    # 3. PHẦN ĐỌC HIỂU TIẾP NỐI (READING TEST Q11 - 17)
    add_heading_styled(doc, "3. PHẦN ĐỌC HIỂU & NGỮ PHÁP TIẾP NỐI (READING SECTION Q11 - 17)", level=1)
    
    p_rc = doc.add_paragraph()
    p_rc.add_run("11. Ms. Chen reviewed the quarterly financial report _______ before submitting it.\n").bold = True
    p_rc.add_run("   -> Đáp án: (B) carefully (Trạng từ bổ nghĩa động từ 'reviewed').\n\n")
    p_rc.add_run("12. _______ the inclement weather conditions, the festival will proceed as scheduled.\n").bold = True
    p_rc.add_run("   -> Đáp án: (B) Despite (Giới từ chỉ sự nhượng bộ đi kèm cụm danh từ).\n\n")
    p_rc.add_run("13. _______ you require any additional documentation, please contact legal.\n").bold = True
    p_rc.add_run("   -> Đáp án: (A) Should (Đảo ngữ câu điều kiện loại 1 trang trọng).\n\n")
    p_rc.add_run("14. Memorandum [14]: It is essential that each supervisor _______ with team members.\n").bold = True
    p_rc.add_run("   -> Đáp án: (A) meet (Thể giả định: S + V nguyên thể không chia).\n\n")
    p_rc.add_run("15. Memorandum [15]: _______, please submit all completed evaluation forms.\n").bold = True
    p_rc.add_run("   -> Đáp án: (A) In addition (Liên từ bổ sung hành động tiếp theo).\n\n")
    p_rc.add_run("16. Parking Notice: Who is entitled to park in the South Lot without paying a fee?\n").bold = True
    p_rc.add_run("   -> Đáp án: (B) Exhibitors with valid vendor permits (Đơn vị triển lãm có thẻ).\n\n")
    p_rc.add_run("17. Parking Notice: What is indicated about the shuttle service?\n").bold = True
    p_rc.add_run("   -> Đáp án: (C) It provides free transportation to the exhibition hall (Dịch vụ đưa đón miễn phí).")

    # 4. MA TRẬN XẾP LỚP
    add_heading_styled(doc, "4. MA TRẬN XẾP LỚP & ĐỀ XUẤT KHÓA HỌC (17 CÂU)", level=1)
    tbl_scale = doc.add_table(rows=4, cols=4)
    tbl_scale.alignment = WD_TABLE_ALIGNMENT.CENTER
    s_headers = ["Số câu đúng / 17", "Cấp độ", "Dự phóng điểm TOEIC", "Khóa học đề xuất"]
    s_rows = [
        ("13 – 17 câu", "TOEIC 650+", "650 – 800+ TOEIC", "TOEIC 650+ Intensive (Chinh phục 750 - 850+)"),
        ("8 – 12 câu", "TOEIC 550+", "450 – 645 TOEIC", "TOEIC 550+ (Bứt phá 550 - 650+)"),
        ("0 – 7 câu", "Foundation", "Dưới 450 TOEIC", "Khóa học TOEIC Foundation (24 Buổi)")
    ]
    for j, h in enumerate(s_headers):
        c = tbl_scale.rows[0].cells[j]
        c.text = h
        c.paragraphs[0].runs[0].font.bold = True
        c.paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
        set_cell_background(c, "1E293B")
        set_cell_margins(c, 70, 70, 80, 80)
    for idx, row in enumerate(s_rows):
        for j in range(4):
            c = tbl_scale.rows[idx+1].cells[j]
            c.text = row[j]
            if j == 0 or j == 1:
                c.paragraphs[0].runs[0].font.bold = True
            bg = "FFFFFF" if idx % 2 == 0 else "F8FAFC"
            set_cell_background(c, bg)
            set_cell_margins(c, 60, 60, 80, 80)

    doc.save(out_path)
    print(f"Successfully saved transcript docx: {out_path} ({os.path.getsize(out_path)} bytes)")

if __name__ == "__main__":
    out_dir = "TOEIC_Placement_Test/docx"
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "TOEIC_Placement_Test_Listening_Transcript.docx")
    build_transcript_docx(out_path)

    # Also save to public/ and TOEIC_Teacher_Materials/
    public_path = "public/TOEIC_Placement_Test_Listening_Transcript.docx"
    build_transcript_docx(public_path)

    mat_dir = "TOEIC_Teacher_Materials/transcript_va_dap_an"
    os.makedirs(mat_dir, exist_ok=True)
    mat_path = os.path.join(mat_dir, "TOEIC_Placement_Test_Listening_Transcript.docx")
    build_transcript_docx(mat_path)
