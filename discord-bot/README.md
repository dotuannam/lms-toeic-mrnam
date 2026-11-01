# 🤖 LMS Discord Bot - TOEIC MR.NAM

Hệ thống Discord Bot quản trị điều hành, cảnh báo tự động và giám sát lịch sử hoạt động (Audit Trail) kết nối trực tiếp với hệ cơ sở dữ liệu Firebase Firestore của **LMS TOEIC MR.NAM**.

---

## 🌟 Các Tính Năng Đã Triển Khai

### 1. Giám sát & Báo cáo Lịch sử Hoạt động (Audit Trail)
* **Real-time Log Dispatch:** Tự động lắng nghe thời gian thực và bắn thông báo vào kênh `#lms-audit-log` ngay khi có người dùng:
  * Đăng nhập / Đăng xuất hệ thống LMS
  * Thêm, sửa hoặc xóa hồ sơ học viên
  * Điểm danh lớp học
  * Nhập hoặc chỉnh sửa điểm bài thi TOEIC
  * Thu học phí, phát sinh giao dịch thu chi
* **Lệnh tra cứu `/logs`:**
  * `/logs user <identifier>`: Xem lịch sử hoạt động chi tiết của một người dùng cụ thể theo Email, Họ tên hoặc Mã học viên.
  * `/logs today [filter]`: Xem toàn bộ hoạt động diễn ra trong ngày, có thể lọc theo loại thao tác (Đăng nhập, Điểm danh, Nhập điểm, Thu tiền...).
* **Lệnh xuất file `/export-logs [days]`:** Xuất file Excel/CSV (chuẩn UTF-8 BOM hiển thị tiếng Việt không lỗi font trên Microsoft Excel) toàn bộ lịch sử hoạt động trong 7 đến 90 ngày và gửi trực tiếp qua file đính kèm Discord.

### 2. Báo cáo Quản trị & Cảnh báo Điều hành Tự động (Admin Briefing & Alerts)
* **Báo cáo đầu ngày (07:30 sáng - kênh `#lms-daily-reports`):** Tự động tổng hợp lịch học hôm nay, danh sách các lớp đang mở, phòng học, ca học và giáo viên phụ trách.
* **Báo cáo tổng kết ngày (22:00 tối - kênh `#lms-daily-reports`):** Thống kê sĩ số chuyên cần toàn trung tâm (tổng lượt đi học, vắng có phép/không phép), số tiền học phí mới thu trong ngày và số học viên mới.
* **Cảnh báo tức thì (Real-time Alerts - kênh `#lms-alerts`):**
  * Tự động thông báo giao dịch khi có học viên nộp học phí mới thành công.
  * Tự động quét và cảnh báo học viên vắng học từ 2 buổi trở lên không phép.
  * Lệnh `/check-alerts`: Quản trị viên có thể chủ động kích hoạt quét cảnh báo chuyên cần & công nợ quá hạn bất kỳ lúc nào.

### 3. Tra cứu Nhanh qua Slash Commands
* `/student <query>`: Tra cứu nhanh hồ sơ học viên theo mã học viên, SĐT, email hoặc tên (xem lớp đang học, tình trạng công nợ, điểm thi gần nhất).
* `/class <query>`: Tra cứu lớp học (lịch học, phòng học, giảng viên, sĩ số hiện tại, học phí khóa).
* `/attendance today [class]`: Xem nhanh tình hình điểm danh hôm nay của một lớp hoặc tất cả các lớp.
* `/score <student>`: Xem bảng điểm chi tiết các bài thi TOEIC của học viên (Listening, Reading, Tổng điểm, Nhận xét của GV).
* `/finance [period]`: Xem báo cáo tài chính nhanh (doanh thu, chi phí, lợi nhuận ròng hôm nay, 7 ngày qua hoặc trong tháng này).

---

## 🛠️ Hướng Dẫn Cài Đặt Từng Bước (A-Z)

### Bước 1: Tạo Bot trên Discord Developer Portal
1. Truy cập [Discord Developer Portal](https://discord.com/developers/applications).
2. Bấm **New Application**, đặt tên ứng dụng (ví dụ: `TOEIC MR.NAM LMS`).
3. Vào tab **Bot** bên thanh menu trái:
   * Bấm **Reset Token** và copy chuỗi **Token** lưu lại.
   * Tại mục **Privileged Gateway Intents**, bật:
     * ✅ **Message Content Intent**
     * ✅ **Server Members Intent**
4. Vào tab **OAuth2** -> **General**:
   * Copy chuỗi **Client ID** (Application ID).
5. Vào tab **OAuth2** -> **URL Generator**:
   * Chọn Scopes: `bot`, `applications.commands`.
   * Chọn Bot Permissions: `Send Messages`, `Embed Links`, `Attach Files`, `View Channels`, `Read Message History`.
   * Copy đường link sinh ra ở dưới cùng và dán vào trình duyệt để **Mời Bot vào Server Discord của bạn**.

### Bước 2: Tạo Kênh và Lấy Channel IDs trên Server Discord
1. Bật Developer Mode trên Discord (vào *User Settings* ⚙️ -> *Advanced* -> Bật *Developer Mode*).
2. Tạo 3 kênh trong server của bạn:
   * `#lms-audit-log` (Kênh nhận log thao tác)
   * `#lms-daily-reports` (Kênh nhận báo cáo sáng & tối)
   * `#lms-alerts` (Kênh nhận cảnh báo nghỉ học & học phí)
3. Chuột phải vào từng kênh -> Bấm **Copy Channel ID**.
4. Chuột phải vào tên Server (Icon server) -> Bấm **Copy Server ID** (dùng cho `DISCORD_GUILD_ID`).

### Bước 3: Lấy Service Account Key Firebase (Tùy chọn nhưng Khuyên Dùng)
1. Truy cập [Firebase Console](https://console.firebase.google.com/) của dự án `auto-lms-43b1d`.
2. Bấm vào biểu tượng Cài đặt ⚙️ -> **Project settings** -> Tab **Service accounts**.
3. Bấm nút **Generate new private key**.
4. Đổi tên file tải về thành `serviceAccountKey.json` và đặt trực tiếp vào thư mục `discord-bot/`.
*(Lưu ý: Nếu chưa kịp lấy file này, Bot vẫn có cơ chế tự động Fallback sang Client SDK để đọc dữ liệu).*

### Bước 4: Cấu hình File `.env`
Sao chép file `.env.example` thành `.env`:
```bash
cp .env.example .env
```
Điền đầy đủ thông tin bạn vừa lấy ở các bước trên vào `.env`:
```env
DISCORD_BOT_TOKEN=MTE5OD...
DISCORD_CLIENT_ID=1198...
DISCORD_GUILD_ID=1198...

DISCORD_CHANNEL_AUDIT_LOG=123456789012345678
DISCORD_CHANNEL_DAILY_REPORTS=123456789012345679
DISCORD_CHANNEL_ALERTS=123456789012345680

FIREBASE_PROJECT_ID=auto-lms-43b1d
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
```

---

## 🚀 Khởi Chạy Bot

Di chuyển vào thư mục `discord-bot/`:
```powershell
cd c:\Users\Adin\.gemini\antigravity\scratch\lms-web-app\discord-bot
```

### 1. Cài đặt các thư viện cần thiết:
```powershell
npm install
```

### 2. Kiểm tra kết nối hệ thống:
```powershell
npm run test-conn
```
*(Script sẽ kiểm tra token bot, kết nối Firestore và cấu hình kênh).*

### 3. Đăng ký Slash Commands với Discord:
```powershell
npm run deploy-commands
```
*(Lệnh sẽ xuất hiện ngay lập tức trên máy chủ Discord).*

### 4. Khởi động Bot:
```powershell
npm start
```
*(Hoặc dùng `npm run dev` để tự động restart khi chỉnh sửa code).*

---

## 📂 Cấu Trúc Thư Mục Source Code

```
discord-bot/
├── .env.example                     # File mẫu biến môi trường
├── package.json                     # Quản lý dependencies & scripts
├── README.md                        # Hướng dẫn chi tiết
├── scripts/
│   ├── deploy-commands.js           # Đồng bộ Slash Commands lên Discord REST API
│   └── test-connection.js           # Kiểm tra Discord Token & Firebase
└── src/
    ├── index.js                     # Entry point chính của Bot
    ├── config/
    │   ├── env.js                   # Load & validate biến môi trường
    │   └── firebase.js              # Kết nối Firebase Admin / Client SDK fallback
    ├── commands/                    # Định nghĩa các Slash Commands
    │   ├── logs.js                  # /logs user & /logs today
    │   ├── exportLogs.js            # /export-logs (Xuất file CSV)
    │   ├── student.js               # /student (Tra cứu hồ sơ)
    │   ├── class.js                 # /class (Tra cứu lớp học)
    │   ├── attendance.js            # /attendance today
    │   ├── score.js                 # /score (Bảng điểm bài thi)
    │   ├── finance.js               # /finance (Báo cáo thu/chi)
    │   ├── alerts.js                # /check-alerts (Quét cảnh báo tức thì)
    │   └── index.js                 # Bộ định tuyến command
    ├── listeners/                   # Lắng nghe Firestore Realtime
    │   ├── auditLogListener.js      # Bắn log hoạt động vào #lms-audit-log
    │   └── paymentListener.js       # Bắn thông báo học phí vào #lms-alerts
    ├── schedulers/
    │   └── dailyBriefing.js         # Cron job: 07:30 sáng & 22:00 tối
    ├── services/
    │   ├── auditService.js          # Truy vấn & tạo báo cáo log CSV
    │   └── lmsQueryService.js       # Truy vấn dữ liệu học viên, lớp, điểm, tài chính
    └── utils/
        ├── embedBuilder.js          # Tạo các Rich Embeds màu sắc chuẩn
        └── formatters.js            # Định dạng VND, ngày giờ VN
```
