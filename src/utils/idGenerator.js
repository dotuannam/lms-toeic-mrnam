/**
 * Generates structured, deterministic Student IDs following center conventions.
 * Example: Class "TO55001" with sequence 1 -> "TO55001HV01"
 *
 * @param {string} classCode - Code of the class (e.g. "TO55001", "IE65001", "AP101")
 * @param {string[]} existingStudentIds - Array of existing IDs in the system or class
 * @returns {string} The newly generated Student ID
 */
export const generateStudentId = (classCode = "GEN", existingStudentIds = []) => {
  const cleanPrefix = (classCode || "GEN").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const pattern = new RegExp(`^${cleanPrefix}HV(\\d+)$`, "i");

  let maxSequence = 0;
  for (const id of existingStudentIds) {
    const match = id.match(pattern);
    if (match && match[1]) {
      const seq = parseInt(match[1], 10);
      if (seq > maxSequence) {
        maxSequence = seq;
      }
    }
  }

  const nextSeq = maxSequence + 1;
  const paddedSeq = nextSeq.toString().padStart(2, "0");
  return `${cleanPrefix}HV${paddedSeq}`;
};

/**
 * Format a Vietnamese phone number cleanly
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3");
  }
  return phone;
};
