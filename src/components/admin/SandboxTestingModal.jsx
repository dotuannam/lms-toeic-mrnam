import React, { useState } from "react";
import {
  seedSandboxEnvironment,
  clearSandboxEnvironment,
  SANDBOX_CLASS_ID,
  SANDBOX_STUDENT_1_ID,
  SANDBOX_STUDENT_2_ID,
} from "../../services/sandboxSeedService";

export const SandboxTestingModal = ({ isOpen, onClose, onRefreshData }) => {
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [statusMessage, setStatusMessage] = useState(null);

  if (!isOpen) return null;

  const handleSeed = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      await seedSandboxEnvironment();
      setStatusMessage({
        type: "success",
        text: "🎉 Khởi tạo Lớp học Thử Nghiệm Sandbox thành công! Đã kích hoạt trọn vẹn 4 giai đoạn nâng cấp.",
      });
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error("Seed sandbox error:", err);
      setStatusMessage({
        type: "error",
        text: "Lỗi khởi tạo Sandbox: " + err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa toàn bộ dữ liệu lớp học và học viên thử nghiệm Sandbox?")) {
      return;
    }
    setLoading(true);
    setStatusMessage(null);
    try {
      await clearSandboxEnvironment();
      setStatusMessage({
        type: "success",
        text: "🧹 Đã xóa sạch dữ liệu thử nghiệm Sandbox khỏi hệ thống!",
      });
      if (onRefreshData) onRefreshData();
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: "Lỗi dọn dẹp: " + err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-amber-900/10 max-h-[92vh] flex flex-col justify-between my-auto animate-fadeIn">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-[#c27803]/15 text-[#c27803] flex items-center justify-center text-xl">
                🧪
              </span>
              <div>
                <span className="text-[10px] font-heading font-extrabold uppercase tracking-widest text-[#c27803] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  End-to-End Sandbox Testing Center
                </span>
                <h2 className="text-lg sm:text-xl font-heading font-bold text-slate-900 mt-1">
                  Kiểm Thử Toàn Diện Luồng Vận Hành LMS (4 Giai Đoạn)
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
            >
              ✕
            </button>
          </div>

          {/* Status Alert Banner */}
          {statusMessage && (
            <div
              className={`mt-4 p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                statusMessage.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}
            >
              <span>{statusMessage.text}</span>
              <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>
          )}

          {/* Quick Action Bar */}
          <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 via-amber-100/40 to-transparent rounded-2xl border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span>⚡ Trạng thái Sandbox:</span>
                <span className="font-mono text-[#c27803] bg-white px-2 py-0.5 rounded border border-amber-300">
                  Lớp: TO650-SANDBOX
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Kích hoạt tự động toàn bộ 7 phân hệ chỉ với 1 click duy nhất.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSeed}
                disabled={loading}
                className="py-2 px-4 bg-[#c27803] hover:bg-[#92400e] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {loading ? "Đang xử lý..." : "🌱 Nạp Dữ Liệu Sandbox (1-Click)"}
              </button>
              <button
                onClick={handleClear}
                disabled={loading}
                className="py-2 px-3 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-semibold transition"
                title="Xóa dữ liệu thử nghiệm"
              >
                🧹 Xóa Sandbox
              </button>
            </div>
          </div>

          {/* Tab Navigation Steps */}
          <div className="flex border-b border-slate-200 mt-5 gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: 1, label: "1. Thông Tin Sandbox", icon: "🏫" },
              { id: 2, label: "2. Tài Khoản Học Viên", icon: "👥" },
              { id: 3, label: "3. Kịch Bản Kiểm Thử E2E", icon: "📋" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveStep(tab.id)}
                className={`py-2.5 px-4 text-xs font-heading font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeStep === tab.id
                    ? "border-[#c27803] text-[#c27803] bg-amber-50/50"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Step 1: Sandbox Class Info */}
          {activeStep === 1 && (
            <div className="py-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Thông Tin Khóa Học:</span>
                  <div className="font-bold text-slate-900 text-sm">TOEIC Target 650+ Master Sandbox</div>
                  <div className="text-slate-600 font-mono text-[11px]">Mã: TO650-SANDBOX • 24 Buổi học</div>
                  <div className="text-[#c27803] font-bold">Học phí chuẩn: 4.500.000 ₫</div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Liên Kết Trực Tuyến & Sao Lưu:</span>
                  <div>
                    🎥 <strong>Google Meet:</strong>{" "}
                    <a href="https://meet.google.com/nam-sandbox-2026" target="_blank" rel="noreferrer" className="text-emerald-600 font-mono underline">
                      meet.google.com/nam-sandbox-2026
                    </a>
                  </div>
                  <div>
                    🌐 <strong>Google Classroom (Backup):</strong>{" "}
                    <a href="https://classroom.google.com/c/sandbox-backup-lms" target="_blank" rel="noreferrer" className="text-blue-600 font-mono underline">
                      classroom.google.com/c/sandbox...
                    </a>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1 sm:col-span-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Tự Động Hóa Drive & Google Sheet Từ Vựng:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      📁 <strong>Google Drive:</strong> Thư mục gốc + 24 thư mục con (Buổi 01 → Buổi 24) chứa slide bài giảng.
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      📊 <strong>Google Sheet:</strong> Sổ từ vựng 3 cột (Từ vựng - IPA - Nghĩa) tích hợp sẵn công thức tự động.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Test Accounts */}
          {activeStep === 2 && (
            <div className="py-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Học viên 1 */}
                <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#c27803] text-white">
                      Học Viên 1 (Người Giới Thiệu)
                    </span>
                    <span className="text-[11px] font-mono font-bold text-slate-500">HV_SANDBOX_01</span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm">Nguyễn Văn Anh</div>
                  <div className="text-slate-600">Email: nguyenvananh.sandbox@gmail.com</div>
                  <div className="text-slate-600">SĐT: 0901234567</div>
                  <div className="p-2.5 bg-white rounded-lg border border-amber-200/80 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Đã đóng:</span>
                      <strong className="text-emerald-600">4.000.000 ₫</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Công nợ còn lại:</span>
                      <strong className="text-rose-600">500.000 ₫</strong>
                    </div>
                    <p className="text-[10px] text-amber-800 italic pt-1">
                      💡 Sẵn sàng để test tính năng: Bấm "Khấu trừ nợ Referral 300k" để công nợ giảm còn 200k!
                    </p>
                  </div>
                </div>

                {/* Học viên 2 */}
                <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-600 text-white">
                      Học Viên 2 (Học Viên Mới Sandbox)
                    </span>
                    <span className="text-[11px] font-mono font-bold text-slate-500">HV_SANDBOX_02</span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm">Trần Thị Mai</div>
                  <div className="text-slate-600">Email: tranthimai.sandbox@gmail.com</div>
                  <div className="text-slate-600">SĐT: 0988776655</div>
                  <div className="p-2.5 bg-white rounded-lg border border-emerald-200/80 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Học phí thực thu:</span>
                      <strong className="text-emerald-700">4.300.000 ₫ (Đã giảm 200k)</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Người giới thiệu:</span>
                      <strong className="text-slate-800">HV_SANDBOX_01 (Hoa hồng: 300k)</strong>
                    </div>
                    <p className="text-[10px] text-emerald-800 italic pt-1">
                      🚨 Có 1 bài tập quá hạn kích hoạt chuông cảnh báo đỏ trên Portal & đã có lịch sử Mini Game!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: E2E Testing Checklist */}
          {activeStep === 3 && (
            <div className="py-4 space-y-3 text-xs">
              <div className="space-y-2.5">
                {[
                  {
                    step: "1. Quản Lý Lớp Học & Tự Động Hóa (Giai đoạn 2)",
                    detail: "Vào Tab 'Lớp Học' → Tìm lớp 'TO650-SANDBOX' → Kiểm tra hiển thị nút Vào Meet, Classroom backup, 24 thư mục Drive và Sổ Sheet từ vựng.",
                  },
                  {
                    step: "2. Banner Thông Báo & Quy Định Lớp Học (Giai đoạn 1)",
                    detail: "Quan sát Banner vàng ở đầu trang xuất hiện trên toàn hệ thống. Mở chi tiết lớp kiểm tra 5 điều khoản quy định.",
                  },
                  {
                    step: "3. Đăng Nhập Student Portal & Chuông Báo Động BTVN (Giai đoạn 2)",
                    detail: "Bấm 'Xem giao diện Học viên' hoặc chọn HV_SANDBOX_02 → Quan sát chuông báo động đỏ '🚨 Nhắc nhở Bài tập về nhà chưa hoàn thành' (1 bài quá hạn) và điểm số 9.0/10.",
                  },
                  {
                    step: "4. Kho Học Liệu 3 Phân Khu (Giai đoạn 3)",
                    detail: "Chuyển sang Tab 'Kho Học Liệu' trên Portal hoặc Admin → Kiểm tra 3 tab: Chính (Ebook Ngữ pháp), Phụ (Flashcards Audio), Livestream (Chữa đề).",
                  },
                  {
                    step: "5. Webapp Mini Game Từ Vựng Có Lưu Lịch Sử (Giai đoạn 3)",
                    detail: "Vào Tab 'Mini Game Từ Vựng' → Trải nghiệm 4 trò chơi (Flashcard 3D, Speedrun, Memory Match, Scramble) & xem bảng Lịch sử chơi game của học viên.",
                  },
                  {
                    step: "6. Quầy Thu Ngân POS & Cơ Chế Referral (Giai đoạn 4)",
                    detail: "Vào Tab 'Tài Chính' → 'Quản Lý Referral' → Thấy lượt giới thiệu của HV_SANDBOX_01 → Bấm 'Khấu trừ nợ' → Sang tab Học phí thấy nợ của HV_SANDBOX_01 giảm từ 500k còn 200k!",
                  },
                ].map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#c27803] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900">{item.step}</div>
                      <p className="text-[11px] text-slate-600 mt-0.5">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 pt-4 mt-4 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Dữ liệu Sandbox độc lập và có thể xóa bất kỳ lúc nào mà không ảnh hưởng lớp học thật.
          </span>
          <button
            onClick={onClose}
            className="py-2 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition"
          >
            Đóng Trình Quản Lý
          </button>
        </div>
      </div>
    </div>
  );
};

export default SandboxTestingModal;
