/**
 * Cau hinh VietQR tu dong sinh tu MASTER_CONFIG.json (co fallback dynamic qua Local Cache / Firestore)
 */
export const DEFAULT_VIETQR_STATIC = {
  bankId: "TCB",
  accountNo: "280931081998",
  accountName: "TOEIC MR.NAM",
  template: "compact2",
};

export const getActiveVietQrConfig = () => {
  try {
    const raw = localStorage.getItem("lms_banking_config_cache");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.bankId && parsed.accountNo) {
        return { ...DEFAULT_VIETQR_STATIC, ...parsed };
      }
    }
  } catch (e) {
    // Ignore error
  }
  return DEFAULT_VIETQR_STATIC;
};

export const VIETQR_CONFIG = new Proxy(DEFAULT_VIETQR_STATIC, {
  get(target, prop) {
    const active = getActiveVietQrConfig();
    return active[prop] !== undefined ? active[prop] : target[prop];
  },
});

export const buildVietQrUrl = ({ amount = 0, transferDescription = "", config = null }) => {
  const active = config || getActiveVietQrConfig();
  const bankId = active.bankId || "TCB";
  const accountNo = (active.accountNo || "280931081998").trim().replace(/\s+/g, "");
  const template = active.template || "compact2";
  const accountName = encodeURIComponent((active.accountName || "TOEIC MR.NAM").trim());
  const encodedDesc = encodeURIComponent((transferDescription || "").trim().slice(0, 50));
  return `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${amount}&addInfo=${encodedDesc}&accountName=${accountName}`;
};

export default VIETQR_CONFIG;
