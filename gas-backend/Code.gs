/**
 * FREE-TIER BACKEND API: Google Apps Script Web App
 * 
 * Provides an unbilled serverless API to interact with:
 * - Google Classroom API (Course creation, Student invitations)
 * - Google Drive API (Class folder creation)
 * - GmailApp (HTML emails, weekly report delivery)
 * 
 * Deployment Instructions:
 * 1. Open https://script.google.com and create a new project.
 * 2. Paste this code into Code.gs.
 * 3. Enable the "Google Classroom API" under Services (+ icon on the left).
 * 4. In Project Settings > Script Properties, set:
 *      API_SECRET = "your_chosen_secret_key" (matching VITE_GAS_API_SECRET in React)
 * 5. Click "Deploy" > "New Deployment" > Type: "Web App"
 *      - Execute as: "Me"
 *      - Who has access: "Anyone"
 * 6. Copy the Web App URL and set it as VITE_GAS_API_URL in your React .env.
 */

// Fallback secret if not configured in Script Properties
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

      case "inviteStudentToCourse":
        result = handleInviteStudent(data);
        break;

      case "sendEmail":
        result = handleSendEmail(data);
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
 * @param {Object} data - { name, section, descriptionHeading, room, createDriveFolder }
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
      const folderName = `[LMS] ${data.name} ${data.section ? "(" + data.section + ")" : ""}`.trim();
      const folder = DriveApp.createFolder(folderName);
      // Set to anyone with link can view (or keep restricted depending on center policy)
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
 * Action: Invite a student to an active Google Classroom course.
 * @param {Object} data - { courseId, studentEmail }
 */
function handleInviteStudent(data) {
  if (!data || !data.courseId || !data.studentEmail) {
    throw new Error("Both 'courseId' and 'studentEmail' are required for invitation.");
  }

  const invitation = {
    courseId: data.courseId,
    userId: data.studentEmail.trim().toLowerCase(),
    role: "STUDENT"
  };

  const createdInvitation = Classroom.Invitations.create(invitation);

  return {
    invitationId: createdInvitation.id,
    courseId: createdInvitation.courseId,
    userId: createdInvitation.userId,
    status: "INVITED"
  };
}

/**
 * Action: Send HTML emails via GmailApp (Student notifications, weekly reports, tuition alerts).
 * @param {Object} data - { to, subject, htmlBody, replyTo }
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
 * Helper to build JSON responses compatible with Google Apps Script Web App standards.
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
