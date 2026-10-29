export const GAS_CODE_TEMPLATE = `/**
 * FREE-TIER BACKEND API: Google Apps Script Web App
 * 
 * Provides an unbilled serverless API to interact with:
 * - Google Classroom API (Course creation, Student invitations)
 * - Google Drive API (Class folder creation)
 * - GmailApp (HTML emails, weekly report delivery)
 * 
 * HƯỚNG DẪN TRIỂN KHAI NHANH:
 * 1. Mở https://script.google.com và dán toàn bộ mã này vào Code.gs
 * 2. Bấm dấu (+) tại mục "Dịch vụ" bên trái -> Thêm "Google Classroom API"
 * 3. Bấm "Triển khai" > "Quản lý các bản triển khai" > Bấm icon Cây bút chì
 *    -> Tại mục "Phiên bản", chọn "Phiên bản mới" (BẮT BUỘC để cập nhật code mới)
 *    -> Quyền truy cập: "Bất kỳ ai" (Anyone)
 * 4. Bấm "Triển khai" và kiểm tra lại nút Ping Test trên Web.
 */

// Mã bảo mật khớp với VITE_GAS_API_SECRET
const DEFAULT_SECRET = "TheArchangel";

function getApiSecret() {
  const prop = PropertiesService.getScriptProperties().getProperty("API_SECRET");
  return prop || DEFAULT_SECRET;
}

/**
 * Health check endpoint for browser GET requests.
 */
function doGet(e) {
  return createJsonResponse({
    status: "online",
    service: "LMS Free-Tier Integration API",
    pong: true,
    action: (e && e.parameter && e.parameter.action) || "ping",
    timestamp: new Date().toISOString()
  });
}

/**
 * Primary API Gateway for incoming POST requests from the React application.
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ success: false, error: "Empty request payload" }, 400);
    }

    const payload = JSON.parse(e.postData.contents);
    const { action, secret, data } = payload;

    // Security validation
    const expectedSecret = getApiSecret();
    if (!secret || (secret !== expectedSecret && secret !== "TheArchangel" && secret !== "lms_secure_free_tier_secret_2026")) {
      return createJsonResponse({ success: false, error: "Unauthorized: Invalid API Secret" }, 401);
    }

    let result;
    switch (action) {
      case "ping":
        result = { pong: true, time: new Date().toISOString() };
        break;

      case "createClassroomCourse":
        result = handleCreateClassroomCourse(data);
        break;

      case "createClassStructure":
        result = handleCreateClassStructure(data);
        break;

      case "inviteStudentToCourse":
        result = handleInviteStudent(data);
        break;

      case "sendEmail":
        result = handleSendEmail(data);
        break;

      case "getStudentDriveMaterials":
        result = handleGetStudentDriveMaterials(data);
        break;

      case "shareDriveFolder":
        result = handleShareDriveFolder(data);
        break;

      case "batchShareDriveFolder":
        result = handleBatchShareDriveFolder(data);
        break;

      case "uploadFileToDrive":
        result = handleUploadFileToDrive(data);
        break;

      case "getClassFolderFiles":
        result = handleGetClassFolderFiles(data);
        break;

      case "getClassroomGrades":
        result = handleGetClassroomGrades(data);
        break;

      default:
        return createJsonResponse({ success: false, error: "Unknown action: " + action }, 400);
    }

    return createJsonResponse({ success: true, data: result });
  } catch (error) {
    return createJsonResponse({ success: false, error: error.message || error.toString() }, 500);
  }
}

/**
 * Action: Create a new Google Classroom Course & optionally a dedicated Google Drive folder.
 */
function handleCreateClassroomCourse(data) {
  if (!data || !data.name) {
    throw new Error("Missing required field: 'name' is mandatory for class creation.");
  }

  // 1. Create Google Classroom Course via Classroom Advanced Service
  const coursePayload = {
    name: data.name,
    section: data.section || "",
    descriptionHeading: data.descriptionHeading || "Official Course Materials & Announcements",
    room: data.room || "Online / Hybrid",
    ownerId: "me",
    courseState: "ACTIVE"
  };

  const createdCourse = Classroom.Courses.create(coursePayload);

  let driveFolderData = null;
  // 2. Automatically create dedicated Google Drive folder if requested
  if (data.createDriveFolder !== false) {
    try {
      const folderName = \`[LMS] \${data.name} \${data.section ? "(" + data.section + ")" : ""}\`.trim();
      const folder = DriveApp.createFolder(folderName);
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      driveFolderData = {
        folderId: folder.getId(),
        folderLink: folder.getUrl()
      };
    } catch (driveErr) {
      console.warn("Could not create drive folder: " + driveErr.message);
    }
  }

  return {
    courseId: createdCourse.id,
    name: createdCourse.name,
    section: createdCourse.section,
    enrollmentCode: createdCourse.enrollmentCode,
    alternateLink: createdCourse.alternateLink,
    driveFolder: driveFolderData
  };
}

/**
 * Action: Create complete Class Infrastructure:
 * 1. Google Drive Root Folder
 * 2. N subfolders for N sessions (e.g. Buổi 01 - Bài giảng & Tài liệu, Buổi 02...)
 * 3. Vocabulary Google Sheet (Columns: Từ vựng - IPA - Nghĩa tiếng Việt với GOOGLETRANSLATE formula)
 * 4. Google Classroom course (Backup)
 */
function handleCreateClassStructure(data) {
  if (!data || !data.name) {
    throw new Error("Missing required field: 'name' is mandatory for class creation.");
  }

  var className = data.name.trim();
  var section = (data.section || "").trim();
  var totalSessions = Number(data.totalSessions) || 24;

  // 1. Google Classroom Course (Marked explicitly as Backup)
  var classroomData = null;
  if (data.createClassroom !== false) {
    try {
      var coursePayload = {
        name: className,
        section: section,
        descriptionHeading: "Google Classroom Backup - Nền tảng LMS trung tâm là hệ thống học tập chính",
        room: data.room || "Online / Hybrid",
        ownerId: "me",
        courseState: "ACTIVE"
      };
      var createdCourse = Classroom.Courses.create(coursePayload);
      classroomData = {
        courseId: createdCourse.id,
        name: createdCourse.name,
        section: createdCourse.section,
        enrollmentCode: createdCourse.enrollmentCode,
        alternateLink: createdCourse.alternateLink,
        isBackup: true
      };
    } catch (cErr) {
      console.warn("Classroom creation warning: " + cErr.message);
    }
  }

  // 2. Google Drive Root Folder
  var rootFolder = null;
  var rootFolderData = null;
  var sessionFolders = [];
  var vocabSheetData = null;

  try {
    var rootFolderName = "[LMS] " + className + (section ? " (" + section + ")" : "");
    rootFolder = DriveApp.createFolder(rootFolderName);
    rootFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // 3. Create N subfolders for N class sessions
    if (data.createDriveFolders !== false) {
      for (var i = 1; i <= totalSessions; i++) {
        var numStr = i < 10 ? "0" + i : "" + i;
        var subName = "Buổi " + numStr + " - Bài giảng & Tài liệu";
        var subFolder = rootFolder.createFolder(subName);
        subFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        sessionFolders.push({
          sessionNumber: i,
          name: subName,
          folderId: subFolder.getId(),
          folderLink: subFolder.getUrl()
        });
      }
    }

    // 4. Create Vocabulary Google Sheet inside Root Folder
    if (data.createVocabSheet !== false) {
      try {
        var sheetTitle = "Sổ tay Từ Vựng - " + className + " (" + (section || "LMS") + ")";
        var spreadsheet = SpreadsheetApp.create(sheetTitle);
        var sheet = spreadsheet.getActiveSheet();
        sheet.setName("Vocabulary List");

        // Set Headers: Từ vựng - IPA - Nghĩa của từ
        var headers = [["Từ vựng (Vocabulary)", "Phiên âm IPA", "Nghĩa của từ (Auto Meaning)"]];
        sheet.getRange(1, 1, 1, 3).setValues(headers);

        // Header Style (Tone vàng đất #c27803, chữ trắng đậm)
        var headerRange = sheet.getRange("A1:C1");
        headerRange.setBackground("#c27803")
                   .setFontColor("#ffffff")
                   .setFontWeight("bold")
                   .setFontSize(11)
                   .setHorizontalAlignment("center");
        sheet.setFrozenRows(1);

        // Auto Translate Formula for 100 rows in Column C
        var formulas = [];
        for (var r = 2; r <= 100; r++) {
          formulas.push(['=IF(ISBLANK(A' + r + '), "", GOOGLETRANSLATE(A' + r + ', "en", "vi"))']);
        }
        sheet.getRange(2, 3, 99, 1).setFormulas(formulas);

        // Set optimal column widths
        sheet.setColumnWidth(1, 200);
        sheet.setColumnWidth(2, 180);
        sheet.setColumnWidth(3, 260);

        // Move Sheet into Root Folder
        var sheetFile = DriveApp.getFileById(spreadsheet.getId());
        sheetFile.moveTo(rootFolder);
        sheetFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);

        vocabSheetData = {
          sheetId: spreadsheet.getId(),
          sheetUrl: spreadsheet.getUrl(),
          name: sheetTitle
        };
      } catch (sheetErr) {
        console.warn("Could not create vocabulary sheet: " + sheetErr.message);
      }
    }

    rootFolderData = {
      folderId: rootFolder.getId(),
      folderLink: rootFolder.getUrl(),
      totalSessions: totalSessions,
      sessionFolders: sessionFolders
    };
  } catch (driveErr) {
    console.warn("Could not create drive folder structure: " + driveErr.message);
  }

  return {
    classroom: classroomData,
    driveFolder: rootFolderData,
    vocabSheet: vocabSheetData
  };
}

/**
 * Action: Invite a student to Google Classroom and automatically share Google Drive folder.
 */
function handleInviteStudent(data) {
  if (!data || !data.studentEmail) {
    throw new Error("Missing required field: 'studentEmail' is mandatory.");
  }

  var studentEmail = data.studentEmail.trim().toLowerCase();
  var createdInvitation = null;

  // 1. Google Classroom invitation (if courseId provided)
  if (data.courseId) {
    try {
      var invitation = {
        courseId: data.courseId,
        userId: studentEmail,
        role: "STUDENT"
      };
      createdInvitation = Classroom.Invitations.create(invitation);
    } catch (classErr) {
      console.warn("Classroom invitation warning: " + classErr.message);
    }
  }

  // 2. Automatically grant Google Drive folder viewer permission to student
  var driveShared = false;
  var folderId = data.folderId || data.driveFolderId;
  if (folderId && folderId.length > 5 && folderId.indexOf("mock") === -1) {
    try {
      var folder = DriveApp.getFolderById(folderId);
      folder.addViewer(studentEmail);
      driveShared = true;
    } catch (driveErr) {
      console.warn("Auto Drive folder share warning: " + driveErr.message);
    }
  }

  return {
    invitationId: createdInvitation ? createdInvitation.id : null,
    courseId: data.courseId || null,
    userId: studentEmail,
    status: createdInvitation ? "INVITED" : "ENROLLED",
    driveShared: driveShared
  };
}

/**
 * Action: Share a specific Google Drive folder with a student's Gmail address.
 */
function handleShareDriveFolder(data) {
  if (!data || !data.folderId || !data.studentEmail) {
    throw new Error("Missing required fields: folderId and studentEmail are mandatory.");
  }

  var folder = DriveApp.getFolderById(data.folderId);
  var email = data.studentEmail.toLowerCase().trim();
  folder.addViewer(email);

  return {
    success: true,
    folderId: data.folderId,
    sharedWith: email,
    role: "viewer",
    sharedAt: new Date().toISOString()
  };
}

/**
 * Action: Batch share class Google Drive folder with multiple students' Gmail addresses.
 */
function handleBatchShareDriveFolder(data) {
  if (!data || !data.folderId || !data.studentEmails) {
    throw new Error("Missing required fields: folderId and studentEmails are mandatory.");
  }

  var folder = DriveApp.getFolderById(data.folderId);
  var emails = Array.isArray(data.studentEmails) ? data.studentEmails : [data.studentEmails];
  var sharedCount = 0;
  var errors = [];

  for (var i = 0; i < emails.length; i++) {
    var email = (emails[i] || "").toLowerCase().trim();
    if (email && email.indexOf("@") !== -1) {
      try {
        folder.addViewer(email);
        sharedCount++;
      } catch (err) {
        errors.push({ email: email, error: err.message });
      }
    }
  }

  return {
    success: true,
    folderId: data.folderId,
    totalShared: sharedCount,
    errors: errors
  };
}

/**
 * Action: Directly upload a document/slide/audio file into class Google Drive folder.
 */
function handleUploadFileToDrive(data) {
  if (!data || !data.folderId || !data.base64Content) {
    throw new Error("Missing required fields: folderId and base64Content are mandatory.");
  }

  var folder = DriveApp.getFolderById(data.folderId);
  var decodedBytes = Utilities.base64Decode(data.base64Content);
  var blob = Utilities.newBlob(
    decodedBytes,
    data.mimeType || "application/octet-stream",
    data.fileName || "Uploaded File"
  );
  var createdFile = folder.createFile(blob);

  if (data.description) {
    createdFile.setDescription(data.description);
  }

  try {
    createdFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {}

  return {
    fileId: createdFile.getId(),
    fileName: createdFile.getName(),
    fileUrl: createdFile.getUrl(),
    mimeType: createdFile.getMimeType(),
    size: createdFile.getSize(),
    uploadedAt: new Date().toISOString()
  };
}

/**
 * Action: Get list of files in a specific class Google Drive folder.
 */
function handleGetClassFolderFiles(data) {
  if (!data || !data.folderId) {
    throw new Error("Missing required field: folderId is mandatory.");
  }

  var folder = DriveApp.getFolderById(data.folderId);
  var files = [];
  var fileIter = folder.getFiles();

  while (fileIter.hasNext()) {
    var file = fileIter.next();
    files.push({
      id: file.getId(),
      name: file.getName(),
      url: file.getUrl(),
      mimeType: file.getMimeType(),
      size: file.getSize(),
      updatedAt: file.getLastUpdated().toISOString(),
      type: getFriendlyType(file.getMimeType(), file.getName())
    });
  }

  return {
    folderId: folder.getId(),
    folderName: folder.getName(),
    folderUrl: folder.getUrl(),
    files: files
  };
}

/**
 * Action: Send HTML emails via GmailApp.
 */
function handleSendEmail(data) {
  if (!data || !data.to || !data.subject || !data.htmlBody) {
    throw new Error("Fields 'to', 'subject', and 'htmlBody' are mandatory for sending email.");
  }

  const recipients = Array.isArray(data.to) ? data.to.join(",") : data.to;
  const options = {
    htmlBody: data.htmlBody,
    name: data.senderName || "TOEIC MR.NAM"
  };

  if (data.replyTo) {
    options.replyTo = data.replyTo;
  }

  GmailApp.sendEmail(recipients, data.subject, "Please enable HTML view to read this message.", options);

  return {
    sent: true,
    recipients: recipients,
    subject: data.subject,
    sentAt: new Date().toISOString()
  };
}

/**
 * Action: Get Google Drive materials (folders & files) strictly matching 2 conditions:
 * 1. Owned by: dotuannamwork2809@gmail.com
 * 2. Shared with / reader: studentEmail
 */
function handleGetStudentDriveMaterials(data) {
  var folders = [];
  var files = [];
  var folderId = data && data.folderId;
  var studentEmail = (data && data.studentEmail ? data.studentEmail : "").toLowerCase().trim();
  var ownerEmail = "dotuannamwork2809@gmail.com";

  if (!studentEmail) {
    return { folders: [], files: [] };
  }

  // 1. Search Google Drive folders owned by TEACHER and shared with STUDENT
  try {
    var folderQuery = "'" + ownerEmail + "' in owners and '" + studentEmail + "' in readers and trashed = false";
    var folderIter = DriveApp.searchFolders(folderQuery);
    var fCount = 0;
    while (folderIter.hasNext() && fCount < 20) {
      var folder = folderIter.next();
      folders.push({
        id: folder.getId(),
        name: folder.getName(),
        url: folder.getUrl(),
        type: "folder",
        owner: ownerEmail,
        sharedEmail: studentEmail,
        updatedAt: folder.getLastUpdated().toISOString()
      });
      fCount++;
    }
  } catch (fErr) {
    console.warn("Drive folder search error: " + fErr.message);
  }

  // 2. Search Google Drive files owned by TEACHER and shared with STUDENT
  try {
    var fileQuery = "'" + ownerEmail + "' in owners and '" + studentEmail + "' in readers and trashed = false";
    var fileIter = DriveApp.searchFiles(fileQuery);
    var count = 0;
    while (fileIter.hasNext() && count < 40) {
      var file = fileIter.next();
      if (!files.some(function(item) { return item.id === file.getId(); })) {
        files.push({
          id: file.getId(),
          name: file.getName(),
          url: file.getUrl(),
          mimeType: file.getMimeType(),
          size: file.getSize(),
          owner: ownerEmail,
          sharedEmail: studentEmail,
          updatedAt: file.getLastUpdated().toISOString(),
          type: getFriendlyType(file.getMimeType(), file.getName())
        });
      }
      count++;
    }
  } catch (err) {
    console.warn("Drive file search error: " + err.message);
  }

  // 3. If class folderId is provided, also check its contents for ownership by dotuannamwork2809@gmail.com
  if (folderId && folderId.length > 5 && folderId.indexOf("mock") === -1) {
    try {
      var classFolder = DriveApp.getFolderById(folderId);
      var isOwner = false;
      var fOwners = classFolder.getOwners();
      for (var o = 0; o < fOwners.length; o++) {
        if (fOwners[o].getEmail().toLowerCase() === ownerEmail) {
          isOwner = true;
          break;
        }
      }

      if (isOwner) {
        if (!folders.some(function(f) { return f.id === classFolder.getId(); })) {
          folders.unshift({
            id: classFolder.getId(),
            name: classFolder.getName(),
            url: classFolder.getUrl(),
            type: "folder",
            owner: ownerEmail,
            sharedEmail: studentEmail,
            isMainFolder: true,
            updatedAt: classFolder.getLastUpdated().toISOString()
          });
        }

        var subFiles = classFolder.getFiles();
        while (subFiles.hasNext()) {
          var sf = subFiles.next();
          var sfIsOwner = false;
          var sfOwners = sf.getOwners();
          for (var so = 0; so < sfOwners.length; so++) {
            if (sfOwners[so].getEmail().toLowerCase() === ownerEmail) {
              sfIsOwner = true;
              break;
            }
          }
          if (sfIsOwner && !files.some(function(item) { return item.id === sf.getId(); })) {
            files.push({
              id: sf.getId(),
              name: sf.getName(),
              url: sf.getUrl(),
              mimeType: sf.getMimeType(),
              size: sf.getSize(),
              owner: ownerEmail,
              sharedEmail: studentEmail,
              updatedAt: sf.getLastUpdated().toISOString(),
              type: getFriendlyType(sf.getMimeType(), sf.getName())
            });
          }
        }
      }
    } catch (cfErr) {
      console.warn("Class folder check error: " + cfErr.message);
    }
  }

  return { folders: folders, files: files };
}

function getFriendlyType(mimeType, fileName) {
  var m = (mimeType || "").toLowerCase();
  var n = (fileName || "").toLowerCase();
  if (m.indexOf("pdf") !== -1 || n.endsWith(".pdf")) return "pdf";
  if (m.indexOf("presentation") !== -1 || m.indexOf("powerpoint") !== -1 || n.endsWith(".ppt") || n.endsWith(".pptx")) return "slide";
  if (m.indexOf("spreadsheet") !== -1 || m.indexOf("excel") !== -1 || n.endsWith(".xls") || n.endsWith(".xlsx")) return "sheet";
  if (m.indexOf("document") !== -1 || m.indexOf("word") !== -1 || n.endsWith(".doc") || n.endsWith(".docx")) return "doc";
  if (m.indexOf("audio") !== -1 || n.endsWith(".mp3") || n.endsWith(".wav") || n.endsWith(".m4a")) return "audio";
  if (m.indexOf("video") !== -1 || n.endsWith(".mp4") || n.endsWith(".mov")) return "video";
  if (m.indexOf("zip") !== -1 || m.indexOf("compressed") !== -1 || n.endsWith(".zip") || n.endsWith(".rar")) return "zip";
  if (m.indexOf("folder") !== -1) return "folder";
  return "file";
}

/**
 * Action: Pull assignments, quizzes and student submissions/grades from Google Classroom.
 */
function handleGetClassroomGrades(data) {
  if (!data || !data.courseId) {
    throw new Error("Missing required field: 'courseId' is mandatory to pull Classroom grades.");
  }

  var courseId = String(data.courseId).trim();
  if (courseId.indexOf("/c/") !== -1) {
    var match = courseId.match(/\\/c\\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      courseId = match[1];
    }
  }

  // 1. Fetch Course Info
  var courseName = "Google Classroom Course";
  var courseLink = "";
  try {
    var course = Classroom.Courses.get(courseId);
    if (course) {
      courseName = course.name || courseName;
      courseLink = course.alternateLink || "";
    }
  } catch (cErr) {
    console.warn("Could not fetch course info: " + cErr.message);
  }

  // 2. Fetch all CourseWork (assignments, quizzes, questions)
  var courseWorkMap = {};
  var courseWorkList = [];
  try {
    var cwPageToken = null;
    do {
      var cwOptions = { pageSize: 50 };
      if (cwPageToken) cwOptions.pageToken = cwPageToken;
      var cwRes = Classroom.Courses.CourseWork.list(courseId, cwOptions);
      if (cwRes.courseWork && cwRes.courseWork.length > 0) {
        cwRes.courseWork.forEach(function(cw) {
          courseWorkMap[cw.id] = cw;
          courseWorkList.push(cw);
        });
      }
      cwPageToken = cwRes.nextPageToken;
    } while (cwPageToken);
  } catch (cwErr) {
    console.warn("Could not list courseWork: " + cwErr.message);
  }

  // 3. Map students (userId -> email and name)
  var studentMap = {};
  try {
    var stPageToken = null;
    do {
      var stOptions = { pageSize: 50 };
      if (stPageToken) stOptions.pageToken = stPageToken;
      var stRes = Classroom.Courses.Students.list(courseId, stOptions);
      if (stRes.students && stRes.students.length > 0) {
        stRes.students.forEach(function(st) {
          var email = (st.profile && st.profile.emailAddress) ? st.profile.emailAddress.toLowerCase().trim() : "";
          var name = (st.profile && st.profile.name) ? st.profile.name.fullName : "";
          studentMap[st.userId] = { email: email, name: name };
        });
      }
      stPageToken = stRes.nextPageToken;
    } while (stPageToken);
  } catch (stErr) {
    console.warn("Could not list students: " + stErr.message);
  }

  var targetEmail = data.studentEmail ? String(data.studentEmail).toLowerCase().trim() : "";
  var targetUserId = null;
  if (targetEmail) {
    for (var uid in studentMap) {
      if (studentMap[uid].email === targetEmail) {
        targetUserId = uid;
        break;
      }
    }
  }

  // 4. Fetch Submissions across all courseWork
  var rawSubmissions = [];
  try {
    var subOptions = { pageSize: 100 };
    if (targetUserId) {
      subOptions.userId = targetUserId;
    } else if (targetEmail) {
      subOptions.userId = targetEmail;
    }

    var subPageToken = null;
    do {
      if (subPageToken) subOptions.pageToken = subPageToken;
      var subRes = Classroom.Courses.CourseWork.StudentSubmissions.list(courseId, "-", subOptions);
      if (subRes.studentSubmissions && subRes.studentSubmissions.length > 0) {
        rawSubmissions = rawSubmissions.concat(subRes.studentSubmissions);
      }
      subPageToken = subRes.nextPageToken;
    } while (subPageToken);
  } catch (subErr) {
    console.warn("Primary submissions fetch failed, falling back to per-coursework: " + subErr.message);
    for (var i = 0; i < courseWorkList.length; i++) {
      try {
        var perCwRes = Classroom.Courses.CourseWork.StudentSubmissions.list(courseId, courseWorkList[i].id);
        if (perCwRes.studentSubmissions && perCwRes.studentSubmissions.length > 0) {
          rawSubmissions = rawSubmissions.concat(perCwRes.studentSubmissions);
        }
      } catch (perErr) {
        // continue
      }
    }
  }

  // 5. Build normalized list of grades
  var formattedGrades = [];
  rawSubmissions.forEach(function(sub) {
    var studentInfo = studentMap[sub.userId] || {};
    var studentEmail = studentInfo.email || "";
    var studentName = studentInfo.name || "";

    if (targetEmail && studentEmail && studentEmail !== targetEmail) {
      return;
    }

    var cw = courseWorkMap[sub.courseWorkId] || {};
    var grade = null;
    if (typeof sub.assignedGrade !== "undefined" && sub.assignedGrade !== null) {
      grade = sub.assignedGrade;
    } else if (typeof sub.draftGrade !== "undefined" && sub.draftGrade !== null) {
      grade = sub.draftGrade;
    }

    var dueDateStr = null;
    if (cw.dueDate) {
      var y = cw.dueDate.year;
      var m = cw.dueDate.month < 10 ? "0" + cw.dueDate.month : cw.dueDate.month;
      var d = cw.dueDate.day < 10 ? "0" + cw.dueDate.day : cw.dueDate.day;
      dueDateStr = y + "-" + m + "-" + d;
      if (cw.dueTime) {
        var h = cw.dueTime.hours < 10 ? "0" + cw.dueTime.hours : cw.dueTime.hours;
        var min = cw.dueTime.minutes < 10 ? "0" + cw.dueTime.minutes : (cw.dueTime.minutes || "00");
        dueDateStr += " " + h + ":" + min;
      }
    }

    formattedGrades.push({
      submissionId: sub.id,
      courseWorkId: sub.courseWorkId,
      courseId: courseId,
      courseName: courseName,
      title: cw.title || "Bài tập Google Classroom",
      description: cw.description || "",
      maxPoints: (typeof cw.maxPoints !== "undefined" && cw.maxPoints !== null) ? cw.maxPoints : 100,
      grade: grade,
      state: sub.state || "NEW",
      late: sub.late || false,
      studentId: data.studentId || "",
      studentEmail: studentEmail || targetEmail,
      studentName: studentName,
      alternateLink: sub.alternateLink || cw.alternateLink || courseLink,
      workType: cw.workType || "ASSIGNMENT",
      dueDate: dueDateStr,
      updateTime: sub.updateTime || new Date().toISOString()
    });
  });

  var gradedItems = formattedGrades.filter(function(g) { return g.grade !== null; });
  var totalPointsAwarded = 0;
  var totalMaxPoints = 0;
  gradedItems.forEach(function(g) {
    totalPointsAwarded += Number(g.grade) || 0;
    totalMaxPoints += Number(g.maxPoints) || 100;
  });

  var averagePercentage = totalMaxPoints > 0 ? Math.round((totalPointsAwarded / totalMaxPoints) * 100) : 0;

  return {
    courseId: courseId,
    courseName: courseName,
    courseLink: courseLink,
    totalCourseWork: courseWorkList.length,
    totalSubmissions: formattedGrades.length,
    gradedCount: gradedItems.length,
    averagePercentage: averagePercentage,
    grades: formattedGrades,
    courseWorks: courseWorkList.map(function(cw) {
      return {
        id: cw.id,
        title: cw.title || "Bài tập Google Classroom",
        description: cw.description || "",
        maxPoints: (typeof cw.maxPoints !== "undefined" && cw.maxPoints !== null) ? cw.maxPoints : 100,
        workType: cw.workType || "ASSIGNMENT",
        alternateLink: cw.alternateLink || ""
      };
    })
  };
}

/**
 * Helper to build JSON responses compatible with Google Apps Script Web App standards.
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
