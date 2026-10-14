/**
 * API Integration Layer: Communicates with Google Apps Script Web App
 * Completely FREE-TIER: 0 GCP Billing required.
 */

export const getActiveGasConfig = () => {
  try {
    const raw = localStorage.getItem("lms_gas_config_cache");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.webAppUrl) {
        return {
          webAppUrl: parsed.webAppUrl.trim(),
          apiSecret: (parsed.apiSecret || "TheArchangel").trim(),
        };
      }
    }
  } catch (e) {}
  const envUrl = import.meta.env.VITE_GAS_API_URL;
  const envSecret = import.meta.env.VITE_GAS_API_SECRET;
  const webAppUrl =
    envUrl && !envUrl.includes("YOUR_SCRIPT_ID_HERE")
      ? envUrl.trim()
      : "https://script.google.com/macros/s/AKfycbxxzJsYWS8O6BirSoUEvuPGC53EP2HD-5lRD4UhpM-X6UdKtVADjx3_VXzsi8INGJQ/exec";
  const apiSecret =
    envSecret && !envSecret.includes("your_secret_passphrase")
      ? envSecret.trim()
      : "TheArchangel";

  return { webAppUrl, apiSecret };
};

/**
 * Universal dispatcher for Google Apps Script Web App actions.
 * Sends plain text payload to circumvent browser CORS preflight restrictions on GAS endpoints.
 */
export const callGasApi = async (action, data = {}) => {
  const { webAppUrl, apiSecret } = getActiveGasConfig();

  // Graceful Mock Fallback if user hasn't deployed GAS endpoint yet
  if (!webAppUrl || webAppUrl.includes("YOUR_SCRIPT_ID_HERE")) {
    console.warn(
      `[GAS API Mock Mode] VITE_GAS_API_URL chưa được thiết lập. Đang mô phỏng action: "${action}"`,
      data
    );
    return simulateGasResponse(action, data);
  }

  const payload = {
    action,
    secret: apiSecret,
    data,
  };

  try {
    const response = await fetch(webAppUrl, {
      method: "POST",
      // Using text/plain prevents the browser from sending an OPTIONS preflight request
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    const rawText = await response.text();
    let result;
    try {
      result = JSON.parse(rawText);
    } catch (parseErr) {
      if (rawText.includes("Không tìm thấy hàm tập lệnh: doPost") || rawText.includes("doPost")) {
        throw new Error(
          "Bản triển khai Google Apps Script hiện tại chưa chứa hàm 'doPost'. Hãy vào script.google.com -> Triển khai -> Quản lý các bản triển khai -> Chọn 'Phiên bản mới' (New version) và Deploy lại."
        );
      }
      console.warn(
        `[GAS API Warning] Endpoint returned non-JSON output. Chuyển sang mô phỏng action: "${action}"`
      );
      return simulateGasResponse(action, data);
    }

    if (!result.success) {
      throw new Error(result.error || `Failed to execute action: ${action}`);
    }

    return result.data;
  } catch (error) {
    if (
      error.message === "Failed to fetch" ||
      error.name === "TypeError" ||
      error.message?.includes("Failed to fetch")
    ) {
      const enhancedError = new Error(
        "Không thể kết nối đến Web App (CORS / Chưa triển khai doPost). Nguyên nhân: Bản triển khai Google Apps Script hiện tại chưa nhận hàm 'doPost' hoặc chưa bật quyền 'Anyone' (Bất kỳ ai). Vui lòng cập nhật Phiên bản mới (New Version) trên script.google.com."
      );
      console.error(`[GAS API Error] Action "${action}" failed:`, enhancedError);
      throw enhancedError;
    }
    console.error(`[GAS API Error] Action "${action}" failed:`, error);
    throw error;
  }
};

/**
 * 1. Test backend endpoint connectivity
 */
export const testGasConnection = async () => {
  return await callGasApi("ping");
};

/**
 * 2. Create a new Google Classroom Course & Google Drive Folder
 * @param {Object} params
 * @param {string} params.name - Class Name (e.g., "TOEIC Target 550 - K01")
 * @param {string} [params.section] - Class Code (e.g., "TO55001")
 * @param {string} [params.descriptionHeading] - Description
 * @param {string} [params.room] - Room / Schedule info
 * @param {boolean} [params.createDriveFolder=true] - Whether to generate Drive folder
 */
export const createGoogleClassroomCourse = async ({
  name,
  section = "",
  descriptionHeading = "",
  room = "Hybrid",
  createDriveFolder = true,
}) => {
  return await callGasApi("createClassroomCourse", {
    name,
    section,
    descriptionHeading,
    room,
    createDriveFolder,
  });
};

/**
 * 3. Invite student to an active Google Classroom Course and grant Drive folder view access
 * @param {Object} params
 * @param {string} [params.courseId] - Google Classroom Course ID
 * @param {string} params.studentEmail - Student's Google Email
 * @param {string} [params.folderId] - Class Google Drive Folder ID
 */
export const inviteStudentToClassroom = async ({ courseId, studentEmail, folderId }) => {
  return await callGasApi("inviteStudentToCourse", {
    courseId,
    studentEmail,
    folderId,
  });
};

/**
 * 4. Send HTML Email via center's Gmail
 * @param {Object} params
 * @param {string|string[]} params.to - Recipient email(s)
 * @param {string} params.subject - Email subject
 * @param {string} params.htmlBody - Formatted HTML email body
 * @param {string} [params.replyTo] - Optional reply-to address
 */
export const sendEmailNotification = async ({ to, subject, htmlBody, replyTo, senderName }) => {
  return await callGasApi("sendEmail", {
    to,
    subject,
    htmlBody,
    replyTo,
    senderName,
  });
};

/**
 * 5. Compile and send Weekly Performance & Finance Report
 * @param {Object} params
 * @param {string[]} params.recipients - Admin / Manager emails
 * @param {Object} params.reportData - Weekly metrics data
 */
export const sendWeeklyReportEmail = async ({ recipients, reportData }) => {
  const { period, metrics } = reportData;

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; max-width: 600px; margin: 0 auto; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 24px; text-align: center; }
        .content { padding: 24px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0; }
        .stat-box { background-color: #f1f5f9; border-radius: 8px; padding: 16px; text-align: center; }
        .stat-value { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 4px; }
        .stat-label { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em; }
        .footer { padding: 16px 24px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h2 style="margin: 0; font-size: 22px;">Weekly Progress & Finance Summary</h2>
          <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 13px;">Period: ${period.from} to ${period.to}</p>
        </div>
        <div class="content">
          <p style="font-size: 14px; color: #475569;">Hello Management Team, here is the automated weekly activity report for the language center:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">New Students Enrolled</td>
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #4f46e5; text-align: right;">${metrics.newStudents}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">Tuition Collected</td>
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #16a34a; text-align: right;">${Number(metrics.tuitionCollected).toLocaleString("vi-VN")} ₫</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">Remaining Outstanding Debt</td>
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #e11d48; text-align: right;">${Number(metrics.outstandingDebt).toLocaleString("vi-VN")} ₫</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">Total Student Absences</td>
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #d97706; text-align: right;">${metrics.totalAbsences} (${metrics.unexcusedAbsences} unexcused)</td>
            </tr>
          </table>
        </div>
        <div class="footer">
          Generated automatically by LMS System &bull; Confidential
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmailNotification({
    to: recipients,
    subject: `[LMS Weekly Report] ${period.from} - ${period.to}`,
    htmlBody,
  });
};

/**
 * 6. Fetch Google Drive materials owned by instructor and shared with student email
 * @param {Object} params
 * @param {string} [params.folderId] - Google Drive Folder ID of the class
 * @param {string} [params.studentEmail] - Student's Google Email
 * @param {string} [params.classCode] - Course code
 * @param {string} [params.ownerEmail="dotuannamwork2809@gmail.com"] - Instructor Google email
 */
export const getStudentDriveMaterials = async ({
  folderId,
  studentEmail,
  classCode,
  ownerEmail = "dotuannamwork2809@gmail.com",
}) => {
  return await callGasApi("getStudentDriveMaterials", {
    folderId,
    studentEmail,
    classCode,
    ownerEmail,
  });
};

/**
 * 7. Share a Google Drive folder with a student's Gmail (Viewer role)
 * @param {Object} params
 * @param {string} params.folderId - Google Drive Folder ID
 * @param {string} params.studentEmail - Student's Google Email
 */
export const shareDriveFolderWithStudent = async ({ folderId, studentEmail }) => {
  return await callGasApi("shareDriveFolder", {
    folderId,
    studentEmail,
  });
};

/**
 * 8. Batch share a Google Drive folder with multiple students
 * @param {Object} params
 * @param {string} params.folderId - Google Drive Folder ID
 * @param {string[]} params.studentEmails - List of student Google emails
 */
export const batchShareDriveFolder = async ({ folderId, studentEmails }) => {
  return await callGasApi("batchShareDriveFolder", {
    folderId,
    studentEmails,
  });
};

/**
 * 9. Upload file directly to class Google Drive folder from Admin Portal
 * @param {Object} params
 * @param {string} params.folderId - Destination folder ID
 * @param {string} params.fileName - Name of the file with extension
 * @param {string} params.mimeType - MIME type of the file
 * @param {string} params.base64Content - Base64 encoded file content
 * @param {string} [params.description] - Optional description / note
 */
export const uploadFileToDrive = async ({
  folderId,
  fileName,
  mimeType,
  base64Content,
  description = "",
}) => {
  return await callGasApi("uploadFileToDrive", {
    folderId,
    fileName,
    mimeType,
    base64Content,
    description,
  });
};

/**
 * 10. Get list of files in a class Drive folder
 * @param {Object} params
 * @param {string} params.folderId - Google Drive Folder ID
 */
export const getClassFolderFiles = async ({ folderId }) => {
  return await callGasApi("getClassFolderFiles", { folderId });
};

/**
 * 11. Pull assignments, quizzes and student scores from Google Classroom
 * @param {Object} params
 * @param {string} params.courseId - Google Classroom Course ID or alternate link
 * @param {string} [params.studentEmail] - Student's Gmail to filter specific grades
 * @param {string} [params.studentId] - LMS Student ID
 */
export const getClassroomGrades = async ({ courseId, studentEmail = "", studentId = "" }) => {
  return await callGasApi("getClassroomGrades", {
    courseId,
    studentEmail,
    studentId,
  });
};

/**
 * Mock simulator for local dev if GAS is not yet deployed
 */
function simulateGasResponse(action, data) {
  return new Promise((resolve) => {
    setTimeout(() => {
      switch (action) {
        case "ping":
          resolve({ pong: true, simulated: true });
          break;
        case "createClassroomCourse":
          resolve({
            courseId: "mock_course_" + Date.now(),
            name: data.name,
            section: data.section,
            enrollmentCode: "sim789",
            alternateLink: "https://classroom.google.com/c/mock-course-id",
            driveFolder: {
              folderId: "mock_drive_folder_" + Date.now(),
              folderLink: "https://drive.google.com/drive/folders/mock-folder-id",
            },
          });
          break;
        case "inviteStudentToCourse":
          resolve({
            invitationId: "mock_inv_" + Date.now(),
            courseId: data.courseId,
            userId: data.studentEmail,
            status: "INVITED_SIMULATED",
          });
          break;
        case "sendEmail":
          resolve({
            sent: true,
            recipients: data.to,
            subject: data.subject,
            sentAt: new Date().toISOString(),
            simulated: true,
          });
          break;
        case "getStudentDriveMaterials":
          resolve({
            folders: [],
            files: [],
          });
          break;
        case "shareDriveFolder":
          resolve({
            success: true,
            folderId: data.folderId,
            sharedWith: data.studentEmail,
            role: "viewer",
            simulated: true,
          });
          break;
        case "batchShareDriveFolder":
          resolve({
            success: true,
            folderId: data.folderId,
            totalShared: Array.isArray(data.studentEmails) ? data.studentEmails.length : 1,
            errors: [],
            simulated: true,
          });
          break;
        case "uploadFileToDrive":
          resolve({
            fileId: "sim_file_" + Date.now(),
            fileName: data.fileName,
            fileUrl: "https://drive.google.com/file/d/sim_file_" + Date.now() + "/view",
            mimeType: data.mimeType,
            size: 102400,
            uploadedAt: new Date().toISOString(),
            simulated: true,
          });
          break;
        case "getClassFolderFiles":
          resolve({
            folderId: data.folderId,
            folderName: "Lớp học Drive Folder",
            folderUrl: "https://drive.google.com/drive/folders/" + data.folderId,
            files: [],
            simulated: true,
          });
          break;
        case "getClassroomGrades": {
          const mockGrades = [
            {
              submissionId: "sub_sim_01",
              courseWorkId: "cw_sim_01",
              courseId: data.courseId || "sim_course",
              courseName: "TOEIC / IELTS Master Course",
              title: "Mini Test 01 - Listening Comprehension (Part 1 & 2)",
              description: "Bài kiểm tra nghe định kỳ 30 câu hỏi theo định dạng chuẩn đề thi.",
              maxPoints: 100,
              grade: 88,
              state: "RETURNED",
              late: false,
              studentEmail: data.studentEmail || "student@example.com",
              studentId: data.studentId || "HV_01",
              alternateLink: "https://classroom.google.com",
              workType: "ASSIGNMENT",
              dueDate: "2026-10-10 23:59",
              updateTime: new Date(Date.now() - 86400000 * 2).toISOString(),
            },
            {
              submissionId: "sub_sim_02",
              courseWorkId: "cw_sim_02",
              courseId: data.courseId || "sim_course",
              courseName: "TOEIC / IELTS Master Course",
              title: "Quiz 02 - Từ vựng & Ngữ pháp trọng tâm Unit 1-4",
              description: "Quiz 20 câu hỏi trắc nghiệm kiểm tra từ vựng chuyên đề Công sở & Giao tiếp.",
              maxPoints: 10,
              grade: 9.5,
              state: "RETURNED",
              late: false,
              studentEmail: data.studentEmail || "student@example.com",
              studentId: data.studentId || "HV_01",
              alternateLink: "https://classroom.google.com",
              workType: "MULTIPLE_CHOICE_QUESTION",
              dueDate: "2026-10-15 21:00",
              updateTime: new Date(Date.now() - 86400000).toISOString(),
            },
            {
              submissionId: "sub_sim_03",
              courseWorkId: "cw_sim_03",
              courseId: data.courseId || "sim_course",
              courseName: "TOEIC / IELTS Master Course",
              title: "Progress Test 02 - Reading Practice (Part 5 & 6)",
              description: "Bài kiểm tra đọc hiểu rà soát bẫy ngữ pháp và kiểm soát thời gian làm bài.",
              maxPoints: 100,
              grade: 82,
              state: "RETURNED",
              late: false,
              studentEmail: data.studentEmail || "student@example.com",
              studentId: data.studentId || "HV_01",
              alternateLink: "https://classroom.google.com",
              workType: "ASSIGNMENT",
              dueDate: "2026-10-20 23:59",
              updateTime: new Date().toISOString(),
            },
            {
              submissionId: "sub_sim_04",
              courseWorkId: "cw_sim_04",
              courseId: data.courseId || "sim_course",
              courseName: "TOEIC / IELTS Master Course",
              title: "Bài tập về nhà 04 - Luyện phát âm & Nghe chép chính tả Unit 5",
              description: "Nộp file ghi âm và bài chép chính tả Unit 5.",
              maxPoints: 100,
              grade: null,
              state: "TURNED_IN",
              late: false,
              studentEmail: data.studentEmail || "student@example.com",
              studentId: data.studentId || "HV_01",
              alternateLink: "https://classroom.google.com",
              workType: "ASSIGNMENT",
              dueDate: "2026-10-25 23:59",
              updateTime: new Date().toISOString(),
            },
          ];

          resolve({
            courseId: data.courseId || "sim_course",
            courseName: "TOEIC / IELTS Master Course",
            courseLink: "https://classroom.google.com",
            totalCourseWork: 4,
            totalSubmissions: 4,
            gradedCount: 3,
            averagePercentage: 86,
            syncedAt: new Date().toISOString(),
            simulated: true,
            grades: mockGrades,
            courseWorks: [
              {
                id: "cw_sim_01",
                title: "Mini-Test 01 - Listening Comprehension (Part 1 & 2)",
                description: "Kiểm tra kỹ năng nghe mô tả tranh và đối thoại ngắn.",
                maxPoints: 100,
                workType: "ASSIGNMENT",
                alternateLink: "https://classroom.google.com",
              },
              {
                id: "cw_sim_02",
                title: "Quiz 02 - Từ vựng & Ngữ pháp trọng tâm Unit 1-4",
                description: "Quiz 20 câu hỏi trắc nghiệm kiểm tra từ vựng chuyên đề Công sở & Giao tiếp.",
                maxPoints: 10,
                workType: "MULTIPLE_CHOICE_QUESTION",
                alternateLink: "https://classroom.google.com",
              },
              {
                id: "cw_sim_03",
                title: "Progress Test 02 - Reading Practice (Part 5 & 6)",
                description: "Bài kiểm tra đọc hiểu rà soát bẫy ngữ pháp và kiểm soát thời gian làm bài.",
                maxPoints: 100,
                workType: "ASSIGNMENT",
                alternateLink: "https://classroom.google.com",
              },
              {
                id: "cw_sim_04",
                title: "Bài tập về nhà 04 - Luyện phát âm & Nghe chép chính tả Unit 5",
                description: "Nộp file ghi âm và bài chép chính tả Unit 5.",
                maxPoints: 100,
                workType: "ASSIGNMENT",
                alternateLink: "https://classroom.google.com",
              },
            ],
          });
          break;
        }
        default:
          resolve({ success: true, simulated: true });
      }
    }, 600);
  });
}
