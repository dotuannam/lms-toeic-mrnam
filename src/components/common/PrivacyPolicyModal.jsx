import React, { useEffect } from "react";
import { TEACHER_PROFILE } from "../../data/portfolioData";

export const PrivacyPolicyModal = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
      <div
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-neutral-200 relative animate-scaleUp overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-modal-title"
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 text-white flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center text-xl shrink-0">
              🛡️
            </div>
            <div>
              <h3 id="privacy-modal-title" className="font-heading font-black text-base sm:text-lg text-white">
                Chính Sách Bảo Vệ Dữ Liệu Cá Nhân
              </h3>
              <p className="text-[11px] text-neutral-400 font-mono">
                Tuân thủ Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center transition cursor-pointer text-lg font-bold"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-xs sm:text-sm text-neutral-800 leading-relaxed font-sans">
          {/* Executive Summary Callout */}
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-300/80 text-amber-950 space-y-1">
            <span className="font-extrabold uppercase tracking-wide text-xs block text-amber-900">
              📌 Tôn chỉ bảo mật của {TEACHER_PROFILE.name || "Thầy Đỗ Tuấn Nam"}:
            </span>
            <p className="font-medium text-xs">
              Chúng tôi tôn trọng tuyệt đối quyền riêng tư và cam kết bảo vệ dữ liệu cá nhân của học viên theo đúng quy định của pháp luật Việt Nam. Dữ liệu chỉ được thu thập trên cơ sở <strong>sự đồng ý tự nguyện (opt-in)</strong> và chỉ phục vụ việc đánh giá năng lực, gửi kết quả bài thi và tư vấn lộ trình học TOEIC.
            </p>
          </div>

          {/* Section 1 */}
          <div className="space-y-2">
            <h4 className="font-heading font-black text-sm text-neutral-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-neutral-950 text-amber-400 font-mono text-xs flex items-center justify-center shrink-0">1</span>
              <span>Đơn Vị Thu Thập & Xử Lý Dữ Liệu</span>
            </h4>
            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-neutral-700 space-y-1">
              <p><strong>Người phụ trách:</strong> {TEACHER_PROFILE.name || "Thầy Đỗ Tuấn Nam"}</p>
              <p><strong>Hotline / Zalo:</strong> {TEACHER_PROFILE.phone || "077 345 2809"}</p>
              <p><strong>Email chính thức:</strong> {TEACHER_PROFILE.email || "dotuannamwork2809@gmail.com"}</p>
              <p><strong>Địa chỉ hoạt động:</strong> {TEACHER_PROFILE.address || "Thành phố Hồ Chí Minh, Việt Nam"}</p>
            </div>
          </div>

          {/* Section 2 */}
          <div className="space-y-2">
            <h4 className="font-heading font-black text-sm text-neutral-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-neutral-950 text-amber-400 font-mono text-xs flex items-center justify-center shrink-0">2</span>
              <span>Loại Dữ Liệu Thu Thập & Mục Đích Xử Lý</span>
            </h4>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-700">
              <li>
                <strong>Dữ liệu thu thập:</strong> Họ và tên, số điện thoại (Zalo), địa chỉ email, mục tiêu điểm số TOEIC và bài làm kiểm tra xếp lớp (Placement Test).
              </li>
              <li>
                <strong>Mục đích duy nhất:</strong> Gửi báo cáo kết quả thi chi tiết, phân tích điểm mạnh/yếu, và liên hệ tư vấn giải pháp học tập phù hợp nhất qua Zalo/Email.
              </li>
              <li>
                <strong>Cam kết không thương mại hóa:</strong> Tuyệt đối không bán, cho thuê, chia sẻ hay chuyển giao thông tin cá nhân của bạn cho bất kỳ đơn vị quảng cáo hay bên thứ ba nào.
              </li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="space-y-2">
            <h4 className="font-heading font-black text-sm text-neutral-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-neutral-950 text-amber-400 font-mono text-xs flex items-center justify-center shrink-0">3</span>
              <span>Cơ Chế Đồng Ý (Theo Điều 9 Luật 91/2025/QH15)</span>
            </h4>
            <p className="text-neutral-700">
              Theo quy định của Luật Bảo vệ dữ liệu cá nhân Việt Nam, sự đồng ý của học viên chỉ có hiệu lực khi bạn tự nguyện tích chọn vào ô xác nhận tại từng form đăng ký. Hành vi im lặng hoặc tiếp tục duyệt web <strong>không được coi là đồng ý mặc định</strong>. Bạn có toàn quyền từ chối cung cấp thông tin.
            </p>
          </div>

          {/* Section 4 */}
          <div className="space-y-2">
            <h4 className="font-heading font-black text-sm text-neutral-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-neutral-950 text-amber-400 font-mono text-xs flex items-center justify-center shrink-0">4</span>
              <span>Quyền Của Học Viên Đối Với Dữ Liệu Của Mình</span>
            </h4>
            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 space-y-1">
              <p className="font-bold">Bất kỳ lúc nào, học viên đều có các quyền sau:</p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Yêu cầu tra cứu, trích xuất dữ liệu bài làm và thông tin cá nhân của mình.</li>
                <li>Yêu cầu đính chính, chỉnh sửa thông tin chưa chính xác.</li>
                <li>Rút lại sự đồng ý hoặc yêu cầu <strong>xóa bỏ vĩnh viễn</strong> dữ liệu cá nhân khỏi hệ thống.</li>
              </ul>
              <p className="text-[11px] text-emerald-800 pt-1">
                👉 Để thực hiện quyền trên, bạn chỉ cần gửi tin nhắn tới Zalo <strong>{TEACHER_PROFILE.phone || "077 345 2809"}</strong>. Hệ thống sẽ xử lý yêu cầu xóa trong vòng 24 giờ.
              </p>
            </div>
          </div>

          {/* Section 5 */}
          <div className="space-y-2">
            <h4 className="font-heading font-black text-sm text-neutral-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-neutral-950 text-amber-400 font-mono text-xs flex items-center justify-center shrink-0">5</span>
              <span>Biện Pháp An Toàn An Ninh Mạng</span>
            </h4>
            <p className="text-neutral-700">
              Toàn bộ dữ liệu truyền tải đều được bảo vệ bởi giao thức mã hóa chuẩn HTTPS/SSL 256-bit. Dữ liệu lưu trữ trên cơ sở dữ liệu đám mây Cloud Firestore tuân thủ các quy tắc bảo mật phân quyền nghiêm ngặt, ngăn chặn triệt để mọi hành vi xâm nhập và đánh cắp thông tin.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-100 border-t border-neutral-200 flex items-center justify-between gap-3 text-xs">
          <span className="text-neutral-500 hidden sm:inline">
            Cập nhật lần cuối: Tháng 11/2026 • Chuẩn Luật BVDLCN 91/2025/QH15
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white font-heading font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer ml-auto"
          >
            Đã Hiểu & Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyModal;
