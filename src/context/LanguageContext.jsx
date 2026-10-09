import React, { createContext, useContext, useState, useEffect } from "react";

const LanguageContext = createContext(null);

export const translations = {
  vi: {
    // Navigation & Common
    adminPortal: "Trang Quản Trị",
    studentPortal: "Cổng Học Viên",
    learnerView: "Góc nhìn học viên",
    signOut: "Đăng xuất",
    checkingPermissions: "Đang kiểm tra quyền hạn...",
    adminPreviewNotice: "Bạn đang xem thử giao diện với quyền Quản Trị Viên (Admin Preview)",
    backToAdmin: "Quay lại Admin Dashboard",
    switchToStudentView: "Xem giao diện Học viên",
    systemAdmin: "Quản trị viên",
    mgmtSystem: "Hệ thống Quản lý Đào tạo",
    liveStatus: "Firebase Trực tuyến",
    footerCopyright: "Hệ thống quản lý học tập &bull; Theo dõi tiến độ học viên",
    adminDesc: "Vận hành đào tạo, quản lý lớp học, điểm danh & học phí",

    // Admin Sidebar Tabs
    studentsTab: "Học viên",
    classesTab: "Lớp học",
    attendanceTab: "Điểm danh",
    scoresTab: "Điểm thi",
    financeTab: "Tài chính & Sổ quỹ",
    reportsTab: "Báo cáo tuần",
    emailTemplatesTab: "Mẫu Email",
    websiteAdminTab: "Quản trị Website",

    // Common Buttons & Actions
    search: "Tìm kiếm",
    filter: "Lọc",
    all: "Tất cả",
    save: "Lưu",
    saving: "Đang lưu...",
    cancel: "Hủy",
    edit: "Chỉnh sửa",
    delete: "Xóa",
    close: "Đóng",
    done: "Hoàn tất",
    confirm: "Xác nhận",
    actions: "Hành động",
    status: "Trạng thái",
    loading: "Đang tải...",
    refresh: "Làm mới",
    exportData: "Xuất dữ liệu",
    copy: "Sao chép",
    copied: "Đã sao chép!",
    download: "Tải xuống",
    preview: "Xem trước",
    open: "Mở",

    // Student Dashboard Tabs & Header
    tabOverview: "Tổng quan học tập",
    tabMaterials: "Tài liệu học tập & Drive",
    tabClassroomGrades: "Điểm Google Classroom",
    welcomeBack: "Chào mừng trở lại!",
    assignedInstructor: "Giảng viên",
    weeklySchedule: "Lịch học",
    openClassroom: "Google Classroom",
    openDrive: "Thư mục Drive lớp",
    loadingDashboard: "Đang tải bảng thông tin học tập...",
    noStudentProfile: "Chưa liên kết hồ sơ học viên",
    noStudentProfileDesc: "Tài khoản của bạn chưa được liên kết với hồ sơ học viên đang hoạt động. Vui lòng liên hệ ban quản trị để được hỗ trợ.",

    // Student Metrics Cards
    attendanceRate: "Tỷ lệ chuyên cần",
    sessionsAttended: "buổi đã tham gia",
    latestTestResult: "Điểm thi gần nhất",
    noTestsCompleted: "Chưa có bài thi nào",
    tuitionBalance: "Học phí còn lại",
    fullySettled: "Đã hoàn thành",
    receiptsCleared: "Đã tất toán học phí",
    payViaVietQr: "Thanh toán VietQR →",

    // Student Skill Radar & Tuition Panels
    skillRadar: "Biểu đồ Năng lực Kỹ năng",
    skillMapping: "Đánh giá chi tiết các kỹ năng",
    scoreBadge: "Điểm",
    instructorFeedback: "Nhận xét của giảng viên:",
    tuitionOverview: "Tổng quan Học phí & Thanh toán",
    vietQrDesc: "Chuyển khoản tức thì qua mã quét ngân hàng VietQR",
    totalCourseFee: "Tổng học phí khóa học:",
    amountPaid: "Đã thanh toán:",
    remainingDebt: "Học phí còn nợ:",
    scanToPayPrompt: "Quét mã VietQR để thanh toán khoản nợ học phí",
    openQrPayment: "Mở mã VietQR chuyển khoản",
    tuitionClearedNotice: "🎉 Bạn đã hoàn thành 100% học phí cho khóa học này!",

    // Score & Attendance History Tables
    scoreHistory: "Lịch sử Điểm thi & Đánh giá",
    scoreHistoryDesc: "Bảng điểm chính thức do giảng viên cập nhật",
    noScoresYet: "Chưa có dữ liệu điểm thi.",
    colDate: "Ngày",
    colTitle: "Bài kiểm tra",
    colType: "Loại bài",
    colScore: "Điểm số",

    attendanceLog: "Nhật ký Điểm danh",
    attendanceLogDesc: "Ghi nhận chuyên cần và điểm danh từng buổi học",
    noAttendanceYet: "Chưa có dữ liệu điểm danh.",
    colSessionDate: "Ngày học",
    colStatus: "Trạng thái",
    colNote: "Ghi chú",
    statusPresent: "Có mặt",
    statusLate: "Đi muộn",
    statusExcused: "Nghỉ có phép",
    statusUnexcused: "Vắng không phép",

    // VietQR Modal
    vietQrModalTitle: "Chuyển khoản học phí qua VietQR",
    vietQrModalDesc: "Mở app ngân hàng bất kỳ để quét mã và chuyển tiền tự động",
    qrAmount: "Số tiền:",
    qrBank: "Ngân hàng:",
    qrAccount: "Số tài khoản:",
    qrBeneficiary: "Chủ tài khoản:",
    qrNote: "Nội dung CK:",

    // Learning Materials & Google Drive Tab
    materialsTitle: "Tài liệu học tập & Google Drive",
    materialsSubtitle: "Toàn bộ thư mục, tài liệu, slide bài giảng & đề thi được chia sẻ cho bạn",
    accountLinked: "Tài khoản Google liên kết:",
    openSharedWithMe: "Mở mục 'Được chia sẻ với tôi' trên Drive",
    openClassFolder: "Mở thư mục Drive của lớp",
    syncMaterials: "Đồng bộ lại tài liệu",
    syncingMaterials: "Đang đồng bộ...",
    searchMaterialsPlaceholder: "Tìm kiếm tài liệu, giáo trình, bài tập, slide...",
    filterAll: "Tất cả",
    filterFolders: "Thư mục Drive",
    filterPdf: "Giáo trình (PDF)",
    filterSlides: "Slide bài giảng",
    filterAudio: "Audio & Nghe",
    filterDocs: "Bài tập & Tài liệu",
    filesFound: "tài liệu & thư mục",
    sharedWithYou: "Đã chia sẻ cho bạn",
    copyLinkBtn: "Sao chép link",
    openInDriveBtn: "Mở trong Drive",
    downloadBtn: "Tải xuống",
    previewBtn: "Xem trước",
    embedDriveView: "Xem trực tiếp giao diện Drive",
    hideEmbedDriveView: "Thu gọn giao diện Drive",
    noMaterialsMatched: "Không tìm thấy tài liệu phù hợp",
    noMaterialsMatchedDesc: "Vui lòng thử tìm từ khóa khác hoặc bấm 'Đồng bộ lại tài liệu'.",
    driveSharingNote: "Mẹo: Hãy đảm bảo bạn đang đăng nhập vào Google Drive bằng đúng tài khoản email đã đăng ký với trung tâm để có toàn quyền xem và tải các tài liệu được chia sẻ.",
    switchClass: "Lớp học:",

    // Drive Management & Upload Modal (Admin)
    manageClassMaterials: "Quản lý Tài liệu & Upload Drive",
    driveUploadTitle: "Quản lý Tài liệu Lớp học & Tải lên Drive",
    driveFolderConnected: "Đã kết nối thư mục Drive",
    noDriveFolder: "Chưa có thư mục Drive cho lớp này",
    ownerNotice: "Tài liệu được lưu trữ trên Google Drive sở hữu bởi: dotuannamwork2809@gmail.com",
    grantAllDriveAccess: "Cấp quyền xem Drive cho tất cả học viên",
    grantingDriveAccess: "Đang cấp quyền xem Drive...",
    grantDriveSuccess: "Đã cấp quyền xem Drive thành công!",
    uploadToDriveBtn: "Tải lên Google Drive",
    uploadingToDrive: "Đang tải lên Drive...",
    uploadSuccess: "Tải lên Google Drive thành công!",
    selectFileToUpload: "Kéo thả hoặc chọn tệp tải lên (PDF, Slide, Audio, Docs...)",
    fileDescription: "Ghi chú / Mô tả tài liệu",
    classMaterialsList: "Danh sách tài liệu trong thư mục lớp",
    refreshMaterials: "Làm mới danh sách",
    noFilesYet: "Chưa có tài liệu nào trong thư mục lớp này.",
    maxFileSizeNote: "Hỗ trợ file tối đa ~25MB (PDF, PowerPoint, Word, MP3, ZIP...)",

    // Classes View & Management
    viewDefault: "Mặc định (Lưới)",
    viewWeekly: "Theo tuần (Lịch học)",
    viewMonthly: "Theo tháng (Lịch biểu)",
    viewHourly: "Theo giờ trong ngày",
    allCourses: "Tất cả khóa học",
    searchClasses: "Tìm kiếm lớp học, giáo viên...",
    newClass: "Tạo Lớp Mới",
    editClass: "Sửa Lớp",
    deleteClass: "Xóa Lớp",
    schedule: "Lịch học",
    duration: "Thời gian",
    enrolled: "Sĩ số",
    tuitionFee: "Học phí",
    teacher: "Giảng viên",
    morningSlot: "Ca Sáng (07:00 - 12:00)",
    afternoonSlot: "Ca Chiều (12:00 - 17:30)",
    eveningSlot: "Ca Tối (17:30 - 22:00)",
    dayMon: "Thứ 2",
    dayTue: "Thứ 3",
    dayWed: "Thứ 4",
    dayThu: "Thứ 5",
    dayFri: "Thứ 6",
    daySat: "Thứ 7",
    daySun: "Chủ Nhật",

    // Shift Settings
    manageShifts: "⚙️ Thiết lập Ca Dạy",
    shiftsTitle: "Cấu hình Ca Dạy Trung Tâm",
    shiftsDesc: "Thiết lập các khung giờ ca học để tự động áp dụng khi tạo lớp mới.",
    shiftName: "Tên Ca",
    startTime: "Giờ bắt đầu",
    endTime: "Giờ kết thúc",
    addShift: "+ Thêm Ca Mới",
    saveShifts: "Lưu Cấu Hình Ca",
    selectShift: "Khung giờ / Ca dạy",
    daysOfWeek: "Lịch học trong tuần",
    customSchedule: "Tự nhập lịch khác",

    // General Status
    statusInProgress: "Đang học",
    statusCompleted: "Đã kết thúc",
    statusPlanned: "Sắp khai giảng",
    statusActive: "Đang học",
    statusPaid: "Đã hoàn thành",
    statusPartial: "Còn nợ",
    statusUnpaid: "Chưa đóng",

    // Students Page
    enrollStudent: "Ghi danh Học viên",
    searchStudents: "Tìm theo mã HV, tên, email, SĐT...",
    allClasses: "Tất cả các lớp",
    loadingStudents: "Đang tải danh sách học viên...",
    noStudents: "Không tìm thấy học viên nào.",
    studentIdLabel: "Mã Học viên",
    fullNameLabel: "Họ và tên",
    emailLabel: "Email Google",
    phoneLabel: "Số điện thoại",
    dobLabel: "Ngày sinh",
    classLabel: "Lớp học",
    studentStatus: "Trạng thái",

    // Attendance Page
    attendanceManagement: "Quản lý Điểm danh",
    selectClass: "Chọn lớp học",
    sessionDate: "Ngày học",
    markAllPresent: "Đánh dấu tất cả Có mặt",
    saveAttendance: "Lưu Điểm Danh",
    attendanceSavedSuccess: "Lưu điểm danh thành công!",

    // Scores Page
    scoreEntry: "Nhập điểm thi & Đánh giá",
    testTypeLabel: "Loại bài thi",
    testTitleLabel: "Tên bài kiểm tra",
    targetScoreLabel: "Mục tiêu điểm",
    saveScores: "Lưu Điểm Thi",
    scoresSavedSuccess: "Đã lưu điểm thi thành công!",

    // Finance Page
    financeLedger: "Sổ quỹ & Quản lý Học phí",
    totalRevenue: "Tổng thu học phí",
    totalDebt: "Tổng công nợ",
    paymentHistory: "Lịch sử thanh toán",
    recordPayment: "Ghi nhận đóng học phí",

    // Reports Page
    weeklyReportTitle: "Báo cáo Vận hành Tuần",
    reportRange: "Khoảng thời gian báo cáo",
    compileReport: "Tổng hợp dữ liệu",
    sendReportEmail: "Gửi Email Báo cáo",

    // Classroom Grades Sync
    syncClassroomGradesBtn: "Kéo điểm từ Google Classroom",
    syncClassroomGradesTitle: "Đồng bộ điểm từ Google Classroom",
    syncClassroomGradesDesc: "Tải danh sách bài tập, câu hỏi và điểm số học viên từ khóa học Classroom",
    selectCoursework: "Chọn bài tập / bài kiểm tra:",
    fetchCourseworkBtn: "Tải danh sách bài tập",
    applyScoresBtn: "Áp dụng vào bảng điểm lớp",
    appliedCountMsg: "Đã điền điểm cho {count} học viên từ bài tập",
    targetSkillLabel: "Gán vào kỹ năng / cột điểm:",
    noSubmissionsFound: "Chưa có bài nộp nào cho bài tập này",
    classroomCourseNotFound: "Lớp học chưa có mã Google Classroom. Vui lòng nhập Course ID hoặc Link Classroom:",

    // Theme Mode
    themeMode: "Giao diện",
    darkMode: "Chế độ tối",
    lightMode: "Chế độ sáng",
    switchToDark: "Chuyển sang Chế độ tối",
    switchToLight: "Chuyển sang Chế độ sáng",
  },
  en: {
    // Navigation & Common
    adminPortal: "Admin Portal",
    studentPortal: "Student Portal",
    learnerView: "Learner View",
    signOut: "Sign Out",
    checkingPermissions: "Checking permissions...",
    adminPreviewNotice: "You are previewing with Administrator privileges",
    backToAdmin: "Return to Admin Dashboard",
    switchToStudentView: "Preview Student View",
    systemAdmin: "System Administrator",
    mgmtSystem: "Management System",
    liveStatus: "Firebase Live",
    footerCopyright: "LMS Education Platform &bull; Student Academic Tracking",
    adminDesc: "Education operations, classroom management, attendance & finance",

    // Admin Sidebar Tabs
    studentsTab: "Students",
    classesTab: "Classes",
    attendanceTab: "Attendance",
    scoresTab: "Scores",
    financeTab: "Finance & Ledger",
    reportsTab: "Weekly Reports",
    emailTemplatesTab: "Email Templates",
    websiteAdminTab: "Website Administration",

    // Common Buttons & Actions
    search: "Search",
    filter: "Filter",
    all: "All",
    save: "Save",
    saving: "Saving...",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    close: "Close",
    done: "Done",
    confirm: "Confirm",
    actions: "Actions",
    status: "Status",
    loading: "Loading...",
    refresh: "Refresh",
    exportData: "Export Data",
    copy: "Copy",
    copied: "Copied!",
    download: "Download",
    preview: "Preview",
    open: "Open",

    // Student Dashboard Tabs & Header
    tabOverview: "Academic Overview",
    tabMaterials: "Learning Materials & Drive",
    tabClassroomGrades: "Classroom Grades & Tests",
    welcomeBack: "Welcome Back!",
    assignedInstructor: "Instructor",
    weeklySchedule: "Schedule",
    openClassroom: "Google Classroom",
    openDrive: "Class Drive Folder",
    loadingDashboard: "Loading your learner dashboard...",
    noStudentProfile: "No Student Profile Linked",
    noStudentProfileDesc: "Your account has not been linked to an active student registration. Please contact center administration to enroll.",

    // Student Metrics Cards
    attendanceRate: "Attendance Rate",
    sessionsAttended: "sessions attended",
    latestTestResult: "Latest Test Result",
    noTestsCompleted: "No tests completed yet",
    tuitionBalance: "Tuition Balance",
    fullySettled: "Fully Settled",
    receiptsCleared: "Receipts cleared",
    payViaVietQr: "Pay via VietQR →",

    // Student Skill Radar & Tuition Panels
    skillRadar: "Skill Proficiency Radar",
    skillMapping: "Detailed skill assessment",
    scoreBadge: "Score",
    instructorFeedback: "Instructor Feedback:",
    tuitionOverview: "Tuition & Billing Overview",
    vietQrDesc: "Instant banking payment with dynamic VietQR",
    totalCourseFee: "Total Course Fee:",
    amountPaid: "Amount Paid:",
    remainingDebt: "Remaining Debt:",
    scanToPayPrompt: "Scan VietQR to clear outstanding balance",
    openQrPayment: "Open VietQR Payment Code",
    tuitionClearedNotice: "🎉 Tuition is fully paid for this course!",

    // Score & Attendance History Tables
    scoreHistory: "Score & Assessment History",
    scoreHistoryDesc: "Official scores submitted by teachers",
    noScoresYet: "No test records yet.",
    colDate: "Date",
    colTitle: "Title",
    colType: "Type",
    colScore: "Score",

    attendanceLog: "Attendance Log",
    attendanceLogDesc: "Record of daily classroom presence",
    noAttendanceYet: "No attendance logs yet.",
    colSessionDate: "Session Date",
    colStatus: "Status",
    colNote: "Note",
    statusPresent: "Present",
    statusLate: "Late",
    statusExcused: "Excused",
    statusUnexcused: "Unexcused",

    // VietQR Modal
    vietQrModalTitle: "VietQR Tuition Payment",
    vietQrModalDesc: "Open your banking app and scan to transfer instantly",
    qrAmount: "Amount:",
    qrBank: "Bank:",
    qrAccount: "Account:",
    qrBeneficiary: "Beneficiary:",
    qrNote: "Transfer Note:",

    // Learning Materials & Google Drive Tab
    materialsTitle: "Learning Materials & Google Drive",
    materialsSubtitle: "All folders, documents, presentation slides & practice tests shared with you",
    accountLinked: "Linked Google Account:",
    openSharedWithMe: "Open 'Shared with me' in Drive",
    openClassFolder: "Open Class Drive Folder",
    syncMaterials: "Sync from Drive",
    syncingMaterials: "Syncing...",
    searchMaterialsPlaceholder: "Search documents, textbooks, exercises, slides...",
    filterAll: "All",
    filterFolders: "Drive Folders",
    filterPdf: "Textbooks (PDF)",
    filterSlides: "Slide Presentations",
    filterAudio: "Audio & Listening",
    filterDocs: "Exercises & Docs",
    filesFound: "files & folders",
    sharedWithYou: "Shared with you",
    copyLinkBtn: "Copy Link",
    openInDriveBtn: "Open in Drive",
    downloadBtn: "Download",
    previewBtn: "Preview",
    embedDriveView: "Embedded Drive View",
    hideEmbedDriveView: "Hide Embedded View",
    noMaterialsMatched: "No matching materials found",
    noMaterialsMatchedDesc: "Try changing your search keywords or click 'Sync from Drive'.",
    driveSharingNote: "Tip: Make sure you are logged into Google Drive with the email address registered with the center to access all shared folders and materials.",
    switchClass: "Class:",

    // Drive Management & Upload Modal (Admin)
    manageClassMaterials: "Class Materials & Drive Upload",
    driveUploadTitle: "Class Materials & Google Drive Upload",
    driveFolderConnected: "Drive Folder Connected",
    noDriveFolder: "No Drive Folder Configured",
    ownerNotice: "Materials stored on Google Drive owned by: dotuannamwork2809@gmail.com",
    grantAllDriveAccess: "Grant Drive Viewer Access to All Students",
    grantingDriveAccess: "Granting Drive Access...",
    grantDriveSuccess: "Granted Drive view access to all students successfully!",
    uploadToDriveBtn: "Upload to Google Drive",
    uploadingToDrive: "Uploading to Drive...",
    uploadSuccess: "Successfully uploaded to Google Drive!",
    selectFileToUpload: "Drag & drop or select file to upload (PDF, Slide, Audio, Docs...)",
    fileDescription: "Material Note / Description",
    classMaterialsList: "Materials in Class Folder",
    refreshMaterials: "Refresh List",
    noFilesYet: "No materials uploaded in this class folder yet.",
    maxFileSizeNote: "Supports files up to ~25MB (PDF, PowerPoint, Word, MP3, ZIP...)",

    // Classes View & Management
    viewDefault: "Default (Grid)",
    viewWeekly: "Weekly Schedule",
    viewMonthly: "Monthly Calendar",
    viewHourly: "Daily Time Slots",
    allCourses: "All Courses",
    searchClasses: "Search classes, teachers...",
    newClass: "New Class",
    editClass: "Edit Class",
    deleteClass: "Delete Class",
    schedule: "Schedule",
    duration: "Duration",
    enrolled: "Enrolled",
    tuitionFee: "Tuition Fee",
    teacher: "Instructor",
    morningSlot: "Morning Slot (07:00 - 12:00)",
    afternoonSlot: "Afternoon Slot (12:00 - 17:30)",
    eveningSlot: "Evening Slot (17:30 - 22:00)",
    dayMon: "Mon",
    dayTue: "Tue",
    dayWed: "Wed",
    dayThu: "Thu",
    dayFri: "Fri",
    daySat: "Sat",
    daySun: "Sun",

    // Shift Settings
    manageShifts: "⚙️ Shift Settings",
    shiftsTitle: "Center Teaching Shifts Setup",
    shiftsDesc: "Configure teaching shifts to automatically apply when creating classes.",
    shiftName: "Shift Name",
    startTime: "Start Time",
    endTime: "End Time",
    addShift: "+ Add Shift",
    saveShifts: "Save Shifts Config",
    selectShift: "Time Slot / Shift",
    daysOfWeek: "Weekly Schedule",
    customSchedule: "Custom schedule",

    // General Status
    statusInProgress: "In Progress",
    statusCompleted: "Completed",
    statusPlanned: "Planned",
    statusActive: "Active",
    statusPaid: "Settled",
    statusPartial: "Partial",
    statusUnpaid: "Unpaid",

    // Students Page
    enrollStudent: "Enroll Student",
    searchStudents: "Search by ID, name, email, phone...",
    allClasses: "All Classes",
    loadingStudents: "Loading student directory...",
    noStudents: "No students found.",
    studentIdLabel: "Student ID",
    fullNameLabel: "Full Name",
    emailLabel: "Google Email",
    phoneLabel: "Phone Number",
    dobLabel: "Date of Birth",
    classLabel: "Class",
    studentStatus: "Status",

    // Attendance Page
    attendanceManagement: "Attendance Management",
    selectClass: "Select Class",
    sessionDate: "Session Date",
    markAllPresent: "Mark All Present",
    saveAttendance: "Save Attendance",
    attendanceSavedSuccess: "Attendance saved successfully!",

    // Scores Page
    scoreEntry: "Score Entry & Evaluation",
    testTypeLabel: "Test Type",
    testTitleLabel: "Test Title",
    targetScoreLabel: "Target Score",
    saveScores: "Save Scores",
    scoresSavedSuccess: "Scores saved successfully!",

    // Finance Page
    financeLedger: "Ledger & Tuition Management",
    totalRevenue: "Total Revenue",
    totalDebt: "Total Debt",
    paymentHistory: "Payment History",
    recordPayment: "Record Tuition Payment",

    // Reports Page
    weeklyReportTitle: "Weekly Operations Report",
    reportRange: "Reporting Period",
    compileReport: "Compile Data",
    sendReportEmail: "Send Email Report",

    // Classroom Grades Sync
    syncClassroomGradesBtn: "Pull Classroom Grades",
    syncClassroomGradesTitle: "Sync Scores from Google Classroom",
    syncClassroomGradesDesc: "Fetch coursework assignments and student grades from your Google Classroom course",
    selectCoursework: "Select Assignment / Quiz:",
    fetchCourseworkBtn: "Fetch Coursework",
    applyScoresBtn: "Apply to Gradebook",
    appliedCountMsg: "Successfully applied scores for {count} students from",
    targetSkillLabel: "Map to skill column:",
    noSubmissionsFound: "No submissions found for this coursework yet",
    classroomCourseNotFound: "Class is not linked to Google Classroom. Please enter Classroom Course ID or Link:",

    // Theme Mode
    themeMode: "Theme",
    darkMode: "Dark Mode",
    lightMode: "Light Mode",
    switchToDark: "Switch to Dark Mode",
    switchToLight: "Switch to Light Mode",
  },
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem("lms_lang") || "vi";
  });

  const setLang = (newLang) => {
    setLangState(newLang);
    localStorage.setItem("lms_lang", newLang);
  };

  const t = (key, fallback) => {
    return translations[lang]?.[key] ?? (translations["vi"]?.[key] || fallback || key);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;
