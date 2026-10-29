import React, { useState, useEffect } from "react";
import { DEFAULT_LANDING_PAGE_CONTENT } from "../../services/settingsService";

export const LandingPageCmsManager = ({
  content,
  onSave,
  saving = false,
  saveSuccess = false,
}) => {
  const [formData, setFormData] = useState(content || DEFAULT_LANDING_PAGE_CONTENT);
  const [activeTab, setActiveTab] = useState("hero");

  useEffect(() => {
    if (content) {
      setFormData(content);
    }
  }, [content]);

  // Deep update helpers
  const handleUpdate = (section, updates) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        ...updates,
      },
    }));
  };

  const handleResetToDefault = () => {
    if (
      window.confirm(
        "Bạn có chắc chắn muốn khôi phục toàn bộ nội dung Landing Page về thiết lập ban đầu không? Mọi nội dung tùy biến chưa lưu sẽ bị xóa."
      )
    ) {
      setFormData(DEFAULT_LANDING_PAGE_CONTENT);
    }
  };

  const handleSave = (e) => {
    if (e) e.preventDefault();
    if (onSave) {
      onSave(formData);
    }
  };

  const openPreview = () => {
    window.open("/", "_blank");
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* 1. TOP HEADER & ACTION BAR */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 p-6 text-white border-b border-stone-700/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-[#c27803]/30 border border-[#c27803]/50 text-amber-300 text-xs font-bold uppercase tracking-wider">
                CMS Visual Editor
              </span>
              <span className="text-xs text-stone-400">
                Toàn quyền tùy biến 100% nội dung trang chủ
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-black tracking-tight text-white">
              Quản Trị Giao Diện & Nội Dung Landing Page
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={openPreview}
              className="px-3.5 py-2 bg-stone-700/80 hover:bg-stone-700 text-stone-200 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Mở xem trang Landing Page thực tế ở tab mới"
            >
              <span>👁️</span>
              <span>Xem Trang Thực Tế</span>
            </button>

            <button
              type="button"
              onClick={handleResetToDefault}
              className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-rose-300 hover:text-rose-200 border border-stone-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="Khôi phục nội dung gốc của thầy Đỗ Tuấn Nam"
            >
              <span>🔄</span>
              <span>Khôi Phục Gốc</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-[#c27803] hover:bg-amber-600 text-slate-950 font-heading font-black text-xs uppercase tracking-wider rounded-xl shadow-md hover:shadow-amber-500/20 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <span>💾</span>
              <span>{saving ? "Đang lưu..." : "Lưu Toàn Bộ Thay Đổi"}</span>
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl text-emerald-200 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <span>✓</span>
            <span>Đã lưu thành công lên máy chủ & đồng bộ tức thì cho tất cả khách truy cập!</span>
          </div>
        )}
      </div>

      {/* 2. NAVIGATION SUB-TABS */}
      <div className="p-4 bg-stone-100/70 border-b border-stone-200 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {[
            { id: "hero", icon: "🎯", label: "1. Hero & Khẩu Hiệu" },
            { id: "profile", icon: "👨‍🏫", label: "2. Hồ Sơ Giảng Viên" },
            { id: "stats", icon: "📊", label: "3. Chỉ Số Ấn Tượng" },
            { id: "education", icon: "🎓", label: "4. Học Vấn & Bằng Cấp" },
            { id: "certifications", icon: "🏆", label: "5. Chứng Chỉ Quốc Tế" },
            { id: "career", icon: "💼", label: "6. Kinh Nghiệm Giảng Dạy" },
            { id: "courses", icon: "📚", label: "7. Khóa Học Tuyển Sinh" },
            { id: "testimonials", icon: "⭐", label: "8. Cảm Nhận Học Viên" },
            { id: "consultation_contact", icon: "⚙️", label: "9. Tư Vấn, Liên Hệ & Bật/Tắt" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-heading font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === tab.id
                  ? "bg-[#c27803] text-white shadow-xs font-black"
                  : "bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-50 border border-stone-200/60"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. SUB-TAB CONTENTS */}
      <div className="p-6 sm:p-8">
        {/* ========================================================================= */}
        {/* TAB 1: HERO & KHẨU HIỆU                                                   */}
        {/* ========================================================================= */}
        {activeTab === "hero" && (
          <div className="space-y-6 max-w-4xl">
            <div className="border-b border-stone-100 pb-3">
              <h3 className="font-serif font-bold text-lg text-stone-900">
                🎯 Khối Hero Đầu Trang (Màn Chào Mừng)
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Đây là ấn tượng đầu tiên khi học viên và phụ huynh truy cập vào website của bạn.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Huy Hiệu Đầu Trang (Hero Badge)
                </label>
                <input
                  type="text"
                  value={formData.hero?.badge || ""}
                  onChange={(e) =>
                    handleUpdate("hero", { badge: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#c27803]"
                  placeholder="Ví dụ: ⭐ Thạc sĩ Ngôn ngữ Anh • TOEIC 980 / 990 IIG Vietnam"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Nút Kêu Gọi Chính (Primary CTA)
                </label>
                <input
                  type="text"
                  value={formData.hero?.primaryCta || ""}
                  onChange={(e) =>
                    handleUpdate("hero", { primaryCta: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#c27803]"
                  placeholder="Ví dụ: Làm Mini Test 3 Phút →"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Tiêu Đề Lớn (Main Headline)
              </label>
              <textarea
                rows={2}
                value={formData.hero?.headline || ""}
                onChange={(e) =>
                  handleUpdate("hero", { headline: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-serif font-bold text-stone-900 focus:outline-none focus:border-[#c27803]"
                placeholder="Ví dụ: Chinh Phục TOEIC Bằng Phương Pháp Khoa Học & Trải Nghiệm Thực Chiến."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Đoạn Giới Thiệu Phụ (Sub-Headline)
              </label>
              <textarea
                rows={3}
                value={formData.hero?.subHeadline || ""}
                onChange={(e) =>
                  handleUpdate("hero", { subHeadline: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700 focus:outline-none focus:border-[#c27803] leading-relaxed"
                placeholder="Đoạn văn ngắn làm rõ giá trị cốt lõi bạn đem lại cho học viên..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Nút Kêu Gọi Phụ (Secondary CTA)
                </label>
                <input
                  type="text"
                  value={formData.hero?.secondaryCta || ""}
                  onChange={(e) =>
                    handleUpdate("hero", { secondaryCta: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#c27803]"
                  placeholder="Ví dụ: Hẹn Lịch Tư Vấn 1-1"
                />
              </div>
            </div>

            {/* 3 Cam kết chuẩn đầu ra dưới CTA */}
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
              <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider">
                ✓ 3 Cam Kết Chất Lượng Dưới Nút Kêu Gọi
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[0, 1, 2].map((idx) => {
                  const commitments = formData.hero?.commitments || [
                    "Cam kết chuẩn đầu ra văn bản",
                    "Mock-test hàng tuần trên LMS",
                    "Video record bài giảng trọn đời",
                  ];
                  return (
                    <div key={idx}>
                      <span className="text-[10px] font-mono text-stone-500 uppercase block mb-1">
                        Cam kết #{idx + 1}
                      </span>
                      <input
                        type="text"
                        value={commitments[idx] || ""}
                        onChange={(e) => {
                          const updated = [...commitments];
                          updated[idx] = e.target.value;
                          handleUpdate("hero", { commitments: updated });
                        }}
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:border-[#c27803]"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: HỒ SƠ GIẢNG VIÊN                                                   */}
        {/* ========================================================================= */}
        {activeTab === "profile" && (
          <div className="space-y-6 max-w-4xl">
            <div className="border-b border-stone-100 pb-3">
              <h3 className="font-serif font-bold text-lg text-stone-900">
                👨‍🏫 Thông Tin & Hồ Sơ Giảng Viên
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Các thông tin hiển thị tại thẻ đại diện, khối giới thiệu và trang in sơ yếu lý lịch (CV).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Họ và Tên Giảng Viên
                </label>
                <input
                  type="text"
                  value={formData.profile?.name || ""}
                  onChange={(e) =>
                    handleUpdate("profile", { name: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-[#c27803]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Danh Xưng / Tên Gọi Thân Mật
                </label>
                <input
                  type="text"
                  value={formData.profile?.shortName || ""}
                  onChange={(e) =>
                    handleUpdate("profile", { shortName: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#c27803]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Tên Thương Hiệu Đào Tạo
                </label>
                <input
                  type="text"
                  value={formData.profile?.brandName || ""}
                  onChange={(e) =>
                    handleUpdate("profile", { brandName: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#c27803]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Số Điện Thoại / Zalo
                </label>
                <input
                  type="text"
                  value={formData.profile?.phone || ""}
                  onChange={(e) =>
                    handleUpdate("profile", { phone: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#c27803] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Địa Chỉ Email Liên Hệ
                </label>
                <input
                  type="email"
                  value={formData.profile?.email || ""}
                  onChange={(e) =>
                    handleUpdate("profile", { email: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#c27803]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Địa Điểm Giảng Dạy
                </label>
                <input
                  type="text"
                  value={formData.profile?.location || ""}
                  onChange={(e) =>
                    handleUpdate("profile", { location: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#c27803]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Phương Thức Giảng Dạy
              </label>
              <input
                type="text"
                value={formData.profile?.teachingMode || ""}
                onChange={(e) =>
                  handleUpdate("profile", { teachingMode: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#c27803]"
                placeholder="Ví dụ: Trực tiếp & Trực tuyến qua Google Meet"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Đoạn Giới Thiệu Ngắn (Bio Short - Xuất hiện ở Hero & Giới thiệu)
              </label>
              <textarea
                rows={3}
                value={formData.profile?.bioShort || ""}
                onChange={(e) =>
                  handleUpdate("profile", { bioShort: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:border-[#c27803] leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Đoạn Giới Thiệu Chi Tiết (Bio Detailed - Xuất hiện trên CV In Ấn)
              </label>
              <textarea
                rows={4}
                value={formData.profile?.bioDetailed || ""}
                onChange={(e) =>
                  handleUpdate("profile", { bioDetailed: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:border-[#c27803] leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Trích Dẫn Học Thuật (Academic Quote)
                </label>
                <textarea
                  rows={3}
                  value={formData.profile?.academicQuote || ""}
                  onChange={(e) =>
                    handleUpdate("profile", { academicQuote: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:border-[#c27803] leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Cam Kết Phản Hồi Tư Vấn (Contact Quote)
                </label>
                <textarea
                  rows={3}
                  value={formData.profile?.contactQuote || ""}
                  onChange={(e) =>
                    handleUpdate("profile", { contactQuote: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:border-[#c27803] leading-relaxed"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: 4 CHỈ SỐ ẤN TƯỢNG (IMPACT STATS)                                   */}
        {/* ========================================================================= */}
        {activeTab === "stats" && (
          <div className="space-y-6 max-w-4xl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-stone-900">
                  📊 4 Chỉ Số Ấn Tượng (Impact Stats)
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Thanh số liệu nổi bật chạy ngang trang, khẳng định uy tín và thành tích vượt trội.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const updated = [
                    ...(formData.stats || []),
                    {
                      value: "100%",
                      label: "Chỉ số mới",
                      subtext: "Mô tả ngắn gọn chỉ số này",
                      badge: "New Badge",
                      highlight: false,
                    },
                  ];
                  setFormData({ ...formData, stats: updated });
                }}
                className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <span>➕</span>
                <span>Thêm Chỉ Số</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(formData.stats || []).map((st, idx) => (
                <div
                  key={idx}
                  className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#c27803] uppercase">
                      Chỉ số #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (formData.stats.length <= 1) {
                          alert("Cần giữ lại ít nhất 1 chỉ số.");
                          return;
                        }
                        const updated = formData.stats.filter((_, i) => i !== idx);
                        setFormData({ ...formData, stats: updated });
                      }}
                      className="text-stone-400 hover:text-rose-600 transition text-xs cursor-pointer p-1"
                      title="Xóa chỉ số này"
                    >
                      🗑️ Xóa
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                        Số liệu / Điểm số
                      </label>
                      <input
                        type="text"
                        value={st.value || ""}
                        onChange={(e) => {
                          const updated = [...(formData.stats || [])];
                          updated[idx] = { ...updated[idx], value: e.target.value };
                          setFormData({ ...formData, stats: updated });
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-sm font-black text-stone-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                        Huy Hiệu Góc
                      </label>
                      <input
                        type="text"
                        value={st.badge || ""}
                        onChange={(e) => {
                          const updated = [...(formData.stats || [])];
                          updated[idx] = { ...updated[idx], badge: e.target.value };
                          setFormData({ ...formData, stats: updated });
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold text-amber-800"
                        placeholder="Verified, Top..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                      Tên Chỉ Số
                    </label>
                    <input
                      type="text"
                      value={st.label || ""}
                      onChange={(e) => {
                        const updated = [...(formData.stats || [])];
                        updated[idx] = { ...updated[idx], label: e.target.value };
                        setFormData({ ...formData, stats: updated });
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                      Mô Tả Chi Tiết
                    </label>
                    <input
                      type="text"
                      value={st.subtext || ""}
                      onChange={(e) => {
                        const updated = [...(formData.stats || [])];
                        updated[idx] = { ...updated[idx], subtext: e.target.value };
                        setFormData({ ...formData, stats: updated });
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-700"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: HỌC VẤN & BẰNG CẤP (EDUCATION)                                     */}
        {/* ========================================================================= */}
        {activeTab === "education" && (
          <div className="space-y-6 max-w-4xl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-stone-900">
                  🎓 Học Vấn Sư Phạm (Education Background)
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Các văn bằng cử nhân, thạc sĩ, chuyên ngành đào tạo chính quy.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const updated = [
                    ...(formData.education || []),
                    {
                      degree: "Tên văn bằng mới",
                      institution: "Trường Đại học / Tổ chức",
                      period: "2024 — 2026",
                      details: "Mô tả chi tiết chuyên ngành nghiên cứu và đào tạo",
                      highlight: "Chính quy xuất sắc",
                    },
                  ];
                  setFormData({ ...formData, education: updated });
                }}
                className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <span>➕</span>
                <span>Thêm Bằng Cấp</span>
              </button>
            </div>

            <div className="space-y-4">
              {(formData.education || []).map((edu, idx) => (
                <div
                  key={idx}
                  className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
                    <span className="text-xs font-bold text-[#c27803] uppercase">
                      Bằng cấp #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = formData.education.filter((_, i) => i !== idx);
                        setFormData({ ...formData, education: updated });
                      }}
                      className="text-stone-400 hover:text-rose-600 transition text-xs cursor-pointer p-1"
                      title="Xóa bằng cấp này"
                    >
                      🗑️ Xóa
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                        Tên Bằng Cấp / Học Vị
                      </label>
                      <input
                        type="text"
                        value={edu.degree || ""}
                        onChange={(e) => {
                          const updated = [...(formData.education || [])];
                          updated[idx] = { ...updated[idx], degree: e.target.value };
                          setFormData({ ...formData, education: updated });
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-900"
                        placeholder="Thạc sĩ Ngôn ngữ Anh..."
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                        Cơ Sở Đào Tạo (Institution)
                      </label>
                      <input
                        type="text"
                        value={edu.institution || ""}
                        onChange={(e) => {
                          const updated = [...(formData.education || [])];
                          updated[idx] = { ...updated[idx], institution: e.target.value };
                          setFormData({ ...formData, education: updated });
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-amber-900"
                        placeholder="Trường Đại học Sài Gòn..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                        Niên Khóa / Thời Gian
                      </label>
                      <input
                        type="text"
                        value={edu.period || ""}
                        onChange={(e) => {
                          const updated = [...(formData.education || [])];
                          updated[idx] = { ...updated[idx], period: e.target.value };
                          setFormData({ ...formData, education: updated });
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-800 font-mono"
                        placeholder="2024 — 2026"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                        Huy Hiệu Điểm Nhấn
                      </label>
                      <input
                        type="text"
                        value={edu.highlight || ""}
                        onChange={(e) => {
                          const updated = [...(formData.education || [])];
                          updated[idx] = { ...updated[idx], highlight: e.target.value };
                          setFormData({ ...formData, education: updated });
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-emerald-700 font-bold"
                        placeholder="Nghiên cứu ứng dụng..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                      Chi Tiết Chuyên Ngành
                    </label>
                    <textarea
                      rows={2}
                      value={edu.details || ""}
                      onChange={(e) => {
                        const updated = [...(formData.education || [])];
                        updated[idx] = { ...updated[idx], details: e.target.value };
                        setFormData({ ...formData, education: updated });
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-700 leading-relaxed"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: CHỨNG CHỈ QUỐC TẾ (CERTIFICATIONS)                                 */}
        {/* ========================================================================= */}
        {activeTab === "certifications" && (
          <div className="space-y-6 max-w-4xl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-stone-900">
                  🏆 Chứng Chỉ Chuyên Môn Quốc Tế
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  TOEIC 980+, chứng chỉ TESOL quốc tế, RELO Đại sứ quán Hoa Kỳ...
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const updated = [
                    ...(formData.certifications || []),
                    {
                      title: "Chứng chỉ quốc tế mới",
                      issuer: "Đơn vị khảo thí quốc tế",
                      year: "2025",
                      highlight: "Điểm số hoặc chuyên ngành",
                      icon: "award",
                    },
                  ];
                  setFormData({ ...formData, certifications: updated });
                }}
                className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <span>➕</span>
                <span>Thêm Chứng Chỉ</span>
              </button>
            </div>

            <div className="space-y-4">
              {(formData.certifications || []).map((cert, idx) => (
                <div
                  key={idx}
                  className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
                    <span className="text-xs font-bold text-[#c27803] uppercase">
                      Chứng chỉ #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = formData.certifications.filter((_, i) => i !== idx);
                        setFormData({ ...formData, certifications: updated });
                      }}
                      className="text-stone-400 hover:text-rose-600 transition text-xs cursor-pointer p-1"
                      title="Xóa chứng chỉ này"
                    >
                      🗑️ Xóa
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                        Tên Chứng Chỉ
                      </label>
                      <input
                        type="text"
                        value={cert.title || ""}
                        onChange={(e) => {
                          const updated = [...(formData.certifications || [])];
                          updated[idx] = { ...updated[idx], title: e.target.value };
                          setFormData({ ...formData, certifications: updated });
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                        Đơn Vị Cấp
                      </label>
                      <input
                        type="text"
                        value={cert.issuer || ""}
                        onChange={(e) => {
                          const updated = [...(formData.certifications || [])];
                          updated[idx] = { ...updated[idx], issuer: e.target.value };
                          setFormData({ ...formData, certifications: updated });
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-medium text-stone-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                        Năm Cấp / Hiệu Lực
                      </label>
                      <input
                        type="text"
                        value={cert.year || ""}
                        onChange={(e) => {
                          const updated = [...(formData.certifications || [])];
                          updated[idx] = { ...updated[idx], year: e.target.value };
                          setFormData({ ...formData, certifications: updated });
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-800 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                        Thành Tích Điểm Nhấn (Badge)
                      </label>
                      <input
                        type="text"
                        value={cert.highlight || ""}
                        onChange={(e) => {
                          const updated = [...(formData.certifications || [])];
                          updated[idx] = { ...updated[idx], highlight: e.target.value };
                          setFormData({ ...formData, certifications: updated });
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold text-emerald-700"
                        placeholder="Score: 980 / 990..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: KINH NGHIỆM GIẢNG DẠY (CAREER EXPERIENCE)                          */}
        {/* ========================================================================= */}
        {activeTab === "career" && (
          <div className="space-y-6 max-w-4xl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-stone-900">
                  💼 Hành Trình Sự Nghiệp & Kinh Nghiệm Giảng Dạy
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Timeline kinh nghiệm thực chiến từ các trường, học viện và tổ chức giáo dục.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const updated = [
                    ...(formData.career || []),
                    {
                      company: "Tổ chức / Trung tâm mới",
                      role: "Vị trí / Chức danh",
                      period: "2023 — Hiện tại",
                      description: [
                        "Trực tiếp giảng dạy và điều phối học thuật",
                        "Xây dựng tài liệu chuyên sâu",
                      ],
                      skills: ["Giảng dạy", "Biên soạn"],
                    },
                  ];
                  setFormData({ ...formData, career: updated });
                }}
                className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <span>➕</span>
                <span>Thêm Mốc Kinh Nghiệm</span>
              </button>
            </div>

            <div className="space-y-5">
              {(formData.career || []).map((exp, idx) => (
                <div
                  key={idx}
                  className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
                    <span className="text-xs font-bold text-[#c27803] uppercase">
                      Mốc #{idx + 1}: {exp.role} @ {exp.company}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = formData.career.filter((_, i) => i !== idx);
                        setFormData({ ...formData, career: updated });
                      }}
                      className="text-stone-400 hover:text-rose-600 transition text-xs cursor-pointer p-1"
                      title="Xóa mốc kinh nghiệm này"
                    >
                      🗑️ Xóa
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                        Vị Trí / Vai Trò
                      </label>
                      <input
                        type="text"
                        value={exp.role || ""}
                        onChange={(e) => {
                          const updated = [...(formData.career || [])];
                          updated[idx] = { ...updated[idx], role: e.target.value };
                          setFormData({ ...formData, career: updated });
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-900"
                        placeholder="Senior TOEIC Trainer..."
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                        Đơn Vị / Công Ty / Trường
                      </label>
                      <input
                        type="text"
                        value={exp.company || ""}
                        onChange={(e) => {
                          const updated = [...(formData.career || [])];
                          updated[idx] = { ...updated[idx], company: e.target.value };
                          setFormData({ ...formData, career: updated });
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-amber-900"
                        placeholder="Easy Edu Center..."
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                        Thời Gian / Giai Đoạn
                      </label>
                      <input
                        type="text"
                        value={exp.period || ""}
                        onChange={(e) => {
                          const updated = [...(formData.career || [])];
                          updated[idx] = { ...updated[idx], period: e.target.value };
                          setFormData({ ...formData, career: updated });
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-800 font-mono"
                        placeholder="2023 — Present"
                      />
                    </div>
                  </div>

                  {/* Bullet points descriptions */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[10px] font-bold text-stone-700 uppercase">
                        Các Gạch Đầu Dòng Thành Tựu & Công Việc
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...(formData.career || [])];
                          const descList = [...(exp.description || []), "Nhiệm vụ mới..."];
                          updated[idx] = { ...updated[idx], description: descList };
                          setFormData({ ...formData, career: updated });
                        }}
                        className="text-[10px] font-bold text-amber-800 hover:underline cursor-pointer"
                      >
                        ➕ Thêm gạch đầu dòng
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {(exp.description || []).map((descItem, dIdx) => (
                        <div key={dIdx} className="flex items-center gap-2">
                          <span className="text-stone-400 font-bold">•</span>
                          <input
                            type="text"
                            value={descItem}
                            onChange={(e) => {
                              const updated = [...(formData.career || [])];
                              const descList = [...(exp.description || [])];
                              descList[dIdx] = e.target.value;
                              updated[idx] = { ...updated[idx], description: descList };
                              setFormData({ ...formData, career: updated });
                            }}
                            className="flex-1 px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-800"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...(formData.career || [])];
                              const descList = exp.description.filter((_, i) => i !== dIdx);
                              updated[idx] = { ...updated[idx], description: descList };
                              setFormData({ ...formData, career: updated });
                            }}
                            className="text-stone-400 hover:text-rose-500 text-xs px-1 cursor-pointer"
                            title="Xóa dòng này"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Skills tags */}
                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                      Kỹ Năng & Từ Khóa (Cách nhau bằng dấu phẩy)
                    </label>
                    <input
                      type="text"
                      value={Array.isArray(exp.skills) ? exp.skills.join(", ") : ""}
                      onChange={(e) => {
                        const skillsArr = e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean);
                        const updated = [...(formData.career || [])];
                        updated[idx] = { ...updated[idx], skills: skillsArr };
                        setFormData({ ...formData, career: updated });
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-800"
                      placeholder="TOEIC 950+ Prep, Syllabus Design, Mock-Test..."
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: KHÓA HỌC TUYỂN SINH (COURSES)                                      */}
        {/* ========================================================================= */}
        {activeTab === "courses" && (
          <div className="space-y-6 max-w-4xl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-stone-900">
                  📚 Danh Sách Khóa Học Tuyển Sinh
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Hiển thị thẻ khóa học trên trang chủ và danh sách lựa chọn trong form đặt lịch tư vấn.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const updated = [
                    ...(formData.courses || []),
                    {
                      id: `course_${Date.now()}`,
                      code: "TOEIC-NEW",
                      title: "Khóa Học TOEIC Mới",
                      programName: "Khóa Học TOEIC Mới Tuyển Sinh",
                      badge: "Tuyển Sinh Mới",
                      target: "Mục tiêu: 650+ TOEIC",
                      duration: "2.5 Tháng • 3 buổi/tuần",
                      description: "Mô tả mục tiêu và phương pháp học khóa này",
                      features: ["Quyền lợi 1", "Quyền lợi 2", "Mock-test hàng tuần"],
                      popular: false,
                    },
                  ];
                  setFormData({ ...formData, courses: updated });
                }}
                className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <span>➕</span>
                <span>Thêm Khóa Học</span>
              </button>
            </div>

            <div className="space-y-6">
              {(formData.courses || []).map((crs, cIdx) => (
                <div
                  key={cIdx}
                  className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-[#c27803] uppercase">
                        Khóa #{cIdx + 1}:
                      </span>
                      <input
                        type="text"
                        value={crs.title || ""}
                        onChange={(e) => {
                          const updated = [...(formData.courses || [])];
                          updated[cIdx] = { ...updated[cIdx], title: e.target.value };
                          setFormData({ ...formData, courses: updated });
                        }}
                        className="px-2.5 py-1 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-900 min-w-[220px]"
                        placeholder="Tên khóa học..."
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-amber-900 font-bold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!crs.popular}
                          onChange={(e) => {
                            const updated = [...(formData.courses || [])];
                            updated[cIdx] = { ...updated[cIdx], popular: e.target.checked };
                            setFormData({ ...formData, courses: updated });
                          }}
                          className="rounded text-amber-600"
                        />
                        <span>Khóa Phổ Biến Nhất</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          if (formData.courses.length <= 1) {
                            alert("Cần giữ lại ít nhất 1 khóa học.");
                            return;
                          }
                          const updated = formData.courses.filter((_, i) => i !== cIdx);
                          setFormData({ ...formData, courses: updated });
                        }}
                        className="text-stone-400 hover:text-rose-600 transition text-xs cursor-pointer p-1"
                        title="Xóa khóa học này"
                      >
                        🗑️ Xóa
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                        Mã Khóa (Code)
                      </label>
                      <input
                        type="text"
                        value={crs.code || crs.id || ""}
                        onChange={(e) => {
                          const updated = [...(formData.courses || [])];
                          updated[cIdx] = { ...updated[cIdx], code: e.target.value };
                          setFormData({ ...formData, courses: updated });
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-mono font-bold text-stone-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                        Huy Hiệu (Badge)
                      </label>
                      <input
                        type="text"
                        value={crs.badge || ""}
                        onChange={(e) => {
                          const updated = [...(formData.courses || [])];
                          updated[cIdx] = { ...updated[cIdx], badge: e.target.value };
                          setFormData({ ...formData, courses: updated });
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold text-amber-800"
                        placeholder="Chuẩn Đầu Ra Đại Học..."
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                        Mục Tiêu Điểm Số
                      </label>
                      <input
                        type="text"
                        value={crs.target || ""}
                        onChange={(e) => {
                          const updated = [...(formData.courses || [])];
                          updated[cIdx] = { ...updated[cIdx], target: e.target.value };
                          setFormData({ ...formData, courses: updated });
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-900"
                        placeholder="Mục tiêu: 500 — 600+ TOEIC"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                        Thời Lượng & Số Buổi
                      </label>
                      <input
                        type="text"
                        value={crs.duration || ""}
                        onChange={(e) => {
                          const updated = [...(formData.courses || [])];
                          updated[cIdx] = { ...updated[cIdx], duration: e.target.value };
                          setFormData({ ...formData, courses: updated });
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-800"
                        placeholder="2.5 Tháng • 3 buổi/tuần"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                        Tên Chương Trình (Hiện ở form Tư Vấn)
                      </label>
                      <input
                        type="text"
                        value={crs.programName || crs.title || ""}
                        onChange={(e) => {
                          const updated = [...(formData.courses || [])];
                          updated[cIdx] = { ...updated[cIdx], programName: e.target.value };
                          setFormData({ ...formData, courses: updated });
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                      Mô Tả Khái Quát
                    </label>
                    <textarea
                      rows={2}
                      value={crs.description || ""}
                      onChange={(e) => {
                        const updated = [...(formData.courses || [])];
                        updated[cIdx] = { ...updated[cIdx], description: e.target.value };
                        setFormData({ ...formData, courses: updated });
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-800 leading-relaxed"
                    />
                  </div>

                  {/* Course Features / Bullet list */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[10px] font-bold text-stone-700 uppercase">
                        ✓ Quyền Lợi & Đặc Điểm Cốt Lõi (Features)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...(formData.courses || [])];
                          const featList = [...(crs.features || []), "Đặc điểm quyền lợi mới..."];
                          updated[cIdx] = { ...updated[cIdx], features: featList };
                          setFormData({ ...formData, courses: updated });
                        }}
                        className="text-[10px] font-bold text-amber-800 hover:underline cursor-pointer"
                      >
                        ➕ Thêm quyền lợi
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {(crs.features || []).map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-center gap-2">
                          <span className="text-emerald-600 font-bold">✓</span>
                          <input
                            type="text"
                            value={feat}
                            onChange={(e) => {
                              const updated = [...(formData.courses || [])];
                              const featList = [...(crs.features || [])];
                              featList[fIdx] = e.target.value;
                              updated[cIdx] = { ...updated[cIdx], features: featList };
                              setFormData({ ...formData, courses: updated });
                            }}
                            className="flex-1 px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-800"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...(formData.courses || [])];
                              const featList = crs.features.filter((_, i) => i !== fIdx);
                              updated[cIdx] = { ...updated[cIdx], features: featList };
                              setFormData({ ...formData, courses: updated });
                            }}
                            className="text-stone-400 hover:text-rose-500 text-xs px-1 cursor-pointer"
                            title="Xóa quyền lợi này"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 8: CẢM NHẬN HỌC VIÊN (TESTIMONIALS)                                  */}
        {/* ========================================================================= */}
        {activeTab === "testimonials" && (
          <div className="space-y-6 max-w-4xl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-stone-900">
                  ⭐ Cảm Nhận Học Viên & Điểm Thi Thật
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Các câu chuyện bứt phá điểm số thành công và đánh giá 5 sao từ học viên thực tế.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const updated = [
                    ...(formData.testimonials || []),
                    {
                      name: "Học viên mới",
                      score: "800 TOEIC",
                      initialScore: "500 TOEIC",
                      school: "Trường Đại học",
                      review: "Lời chia sẻ về trải nghiệm học tập và sự tiến bộ sau khóa học...",
                    },
                  ];
                  setFormData({ ...formData, testimonials: updated });
                }}
                className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <span>➕</span>
                <span>Thêm Đánh Giá</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(formData.testimonials || []).map((tst, tIdx) => (
                <div
                  key={tIdx}
                  className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3 relative flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
                      <span className="text-xs font-bold text-[#c27803] uppercase">
                        Học viên #{tIdx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = formData.testimonials.filter((_, i) => i !== tIdx);
                          setFormData({ ...formData, testimonials: updated });
                        }}
                        className="text-stone-400 hover:text-rose-600 transition text-xs cursor-pointer p-1"
                        title="Xóa đánh giá này"
                      >
                        🗑️ Xóa
                      </button>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                        Họ và Tên Học Viên
                      </label>
                      <input
                        type="text"
                        value={tst.name || ""}
                        onChange={(e) => {
                          const updated = [...(formData.testimonials || [])];
                          updated[tIdx] = { ...updated[tIdx], name: e.target.value };
                          setFormData({ ...formData, testimonials: updated });
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-900"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                          Điểm Đạt Được
                        </label>
                        <input
                          type="text"
                          value={tst.score || ""}
                          onChange={(e) => {
                            const updated = [...(formData.testimonials || [])];
                            updated[tIdx] = { ...updated[tIdx], score: e.target.value };
                            setFormData({ ...formData, testimonials: updated });
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-black text-emerald-700"
                          placeholder="870 TOEIC"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                          Điểm Đầu Vào
                        </label>
                        <input
                          type="text"
                          value={tst.initialScore || ""}
                          onChange={(e) => {
                            const updated = [...(formData.testimonials || [])];
                            updated[tIdx] = { ...updated[tIdx], initialScore: e.target.value };
                            setFormData({ ...formData, testimonials: updated });
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-600"
                          placeholder="550 TOEIC / Mất gốc"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                        Trường / Cơ Quan
                      </label>
                      <input
                        type="text"
                        value={tst.school || ""}
                        onChange={(e) => {
                          const updated = [...(formData.testimonials || [])];
                          updated[tIdx] = { ...updated[tIdx], school: e.target.value };
                          setFormData({ ...formData, testimonials: updated });
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-700"
                        placeholder="Đại học Bách Khoa TP.HCM"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                        Lời Chia Sẻ / Nhận Xét
                      </label>
                      <textarea
                        rows={4}
                        value={tst.review || ""}
                        onChange={(e) => {
                          const updated = [...(formData.testimonials || [])];
                          updated[tIdx] = { ...updated[tIdx], review: e.target.value };
                          setFormData({ ...formData, testimonials: updated });
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-800 leading-relaxed"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 9: TƯ VẤN, LIÊN HỆ & BẬT/TẮT                                         */}
        {/* ========================================================================= */}
        {activeTab === "consultation_contact" && (
          <div className="space-y-6 max-w-4xl">
            <div className="border-b border-stone-100 pb-3">
              <h3 className="font-serif font-bold text-lg text-stone-900">
                ⚙️ Cấu Hình Tư Vấn, Thông Tin Liên Hệ & Bật/Tắt Khối Giao Diện
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Quản lý các khối tính năng tương tác trực tiếp với khách truy cập trang.
              </p>
            </div>

            {/* TOGGLES SWITCHES */}
            <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-4">
              <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                🎛️ Bật / Tắt Các Khối Chức Năng Trên Trang
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-stone-200 cursor-pointer hover:border-amber-400 transition">
                  <div>
                    <span className="text-xs font-bold text-stone-800 block">
                      📝 Khối Mini Placement Test
                    </span>
                    <span className="text-[11px] text-stone-500">
                      Cho phép học viên làm bài trắc nghiệm 5 câu thử sức
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.toggles?.showPlacementTest !== false}
                    onChange={(e) =>
                      handleUpdate("toggles", { showPlacementTest: e.target.checked })
                    }
                    className="w-4 h-4 text-[#c27803] rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-stone-200 cursor-pointer hover:border-amber-400 transition">
                  <div>
                    <span className="text-xs font-bold text-stone-800 block">
                      📅 Form Đặt Lịch Hẹn Tư Vấn 1-1
                    </span>
                    <span className="text-[11px] text-stone-500">
                      Thu thập thông tin số điện thoại & hẹn giờ trao đổi
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.toggles?.showBookingForm !== false}
                    onChange={(e) =>
                      handleUpdate("toggles", { showBookingForm: e.target.checked })
                    }
                    className="w-4 h-4 text-[#c27803] rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-stone-200 cursor-pointer hover:border-amber-400 transition">
                  <div>
                    <span className="text-xs font-bold text-stone-800 block">
                      ✉️ Form Gửi Tin Nhắn Nhanh
                    </span>
                    <span className="text-[11px] text-stone-500">
                      Nhận tin nhắn phản hồi trực tiếp từ khách
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.toggles?.showContactForm !== false}
                    onChange={(e) =>
                      handleUpdate("toggles", { showContactForm: e.target.checked })
                    }
                    className="w-4 h-4 text-[#c27803] rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-stone-200 cursor-pointer hover:border-amber-400 transition">
                  <div>
                    <span className="text-xs font-bold text-stone-800 block">
                      📄 Nút In Sơ Yếu Lý Lịch (CV)
                    </span>
                    <span className="text-[11px] text-stone-500">
                      Hiển thị nút mở modal in CV trên thanh điều hướng & footer
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.toggles?.showCvPrint !== false}
                    onChange={(e) =>
                      handleUpdate("toggles", { showCvPrint: e.target.checked })
                    }
                    className="w-4 h-4 text-[#c27803] rounded"
                  />
                </label>
              </div>
            </div>

            {/* TIME SLOTS CONFIG */}
            <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    ⏰ Khung Giờ Tư Vấn 1-1 Thuận Tiện
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Xuất hiện trong danh sách dropdown khi học viên chọn giờ hẹn tư vấn
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const currentSlots = formData.consultationTimeSlots || [
                      "09:00 - 09:15 AM (Ca Sáng)",
                      "14:00 - 14:15 PM (Ca Chiều)",
                      "19:30 - 19:45 PM (Lớp Đêm)",
                    ];
                    setFormData({
                      ...formData,
                      consultationTimeSlots: [...currentSlots, "18:00 - 18:15 PM (Ca Tối)"],
                    });
                  }}
                  className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <span>➕</span>
                  <span>Thêm Khung Giờ</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(formData.consultationTimeSlots || []).map((slot, sIdx) => (
                  <div key={sIdx} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-stone-200">
                    <span className="text-xs text-stone-400">🕒</span>
                    <input
                      type="text"
                      value={slot}
                      onChange={(e) => {
                        const updated = [...(formData.consultationTimeSlots || [])];
                        updated[sIdx] = e.target.value;
                        setFormData({ ...formData, consultationTimeSlots: updated });
                      }}
                      className="flex-1 bg-transparent text-xs font-medium text-stone-800 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = formData.consultationTimeSlots.filter((_, i) => i !== sIdx);
                        setFormData({ ...formData, consultationTimeSlots: updated });
                      }}
                      className="text-stone-400 hover:text-rose-500 text-xs px-1.5 cursor-pointer"
                      title="Xóa khung giờ này"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* DIRECT CONTACT INFO */}
            <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-4">
              <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                📞 Thông Tin Liên Hệ & Chân Trang (Footer)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                    Hotline / Điện Thoại
                  </label>
                  <input
                    type="text"
                    value={formData.contactInfo?.hotline || ""}
                    onChange={(e) =>
                      handleUpdate("contactInfo", { hotline: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                    Email Tiếp Nhận
                  </label>
                  <input
                    type="email"
                    value={formData.contactInfo?.email || ""}
                    onChange={(e) =>
                      handleUpdate("contactInfo", { email: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                    Địa Chỉ Trung Tâm
                  </label>
                  <input
                    type="text"
                    value={formData.contactInfo?.address || ""}
                    onChange={(e) =>
                      handleUpdate("contactInfo", { address: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-900"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. BOTTOM ACTION FOOTER */}
      <div className="p-4 sm:p-6 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-stone-500 flex items-center gap-2">
          {saveSuccess ? (
            <span className="text-emerald-700 font-bold flex items-center gap-1.5 animate-fadeIn">
              <span>✓</span> Đã lưu và cập nhật trang Landing Page thành công!
            </span>
          ) : (
            <span>Nhấn "Lưu Toàn Bộ Thay Đổi" để cập nhật ngay vào cơ sở dữ liệu.</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openPreview}
            className="px-4 py-2 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            👁️ Mở Trang Chủ Xem Thử
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-[#c27803] hover:bg-amber-600 text-slate-950 font-heading font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            <span>💾</span>
            <span>{saving ? "Đang lưu..." : "Lưu Toàn Bộ Thay Đổi"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPageCmsManager;
