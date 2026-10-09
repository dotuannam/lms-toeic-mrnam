/**
 * Thong tin trung tam tu dong sinh tu MASTER_CONFIG.json (co fallback dynamic qua Local Cache / Firestore)
 */
export const DEFAULT_CENTER_STATIC = {
  centerName: "TOEIC MR.NAM",
  adminEmail: "dotuannamwork2809@gmail.com",
  managementReportEmail: "dotuannamwork2809@gmail.com",
  hotline: "0912 345 678",
  address: "Hà Nội, Việt Nam",
  websiteUrl: "https://auto-lms-43b1d.web.app",
  fanpageUrl: "https://facebook.com",
  slogan: "Trung tâm đào tạo Ngoại ngữ & Luyện thi chứng chỉ TOEIC chất lượng cao",
  logoText: "MR.NAM",
};

export const getActiveCenterConfig = () => {
  try {
    const raw = localStorage.getItem("lms_center_config_cache");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.centerName) {
        return { ...DEFAULT_CENTER_STATIC, ...parsed };
      }
    }
  } catch (e) {
    // Ignore error
  }
  return DEFAULT_CENTER_STATIC;
};

export const CENTER_CONFIG = new Proxy(DEFAULT_CENTER_STATIC, {
  get(target, prop) {
    const active = getActiveCenterConfig();
    return active[prop] !== undefined ? active[prop] : target[prop];
  },
});

export default CENTER_CONFIG;
