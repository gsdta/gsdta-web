# 🏫 GSDTA School App — Requirements Specification

**Version:** Phase 1 (MVP)  
**Environment:** Google Cloud Platform (GCP)  
**Purpose:** Manage in-person language school operations — registration, attendance, events, and parent communication.

---

## 1️⃣ Overview

The Greater San Diego Tamil Academy (GSDTA) conducts **in-person classes** for children learning Tamil.  
The app digitizes admin and classroom processes, keeping parents and teachers connected.

- ✅ In-person classes only — *no online homework or graded coursework*.
- 📺 Learning content (videos) hosted on **YouTube** — embedded in the UI.
- 💳 Optional payment features (term fees) can be added later.

---

## 2️⃣ User Roles

| Role                   | Access Summary                                                                                                                   |
|------------------------|----------------------------------------------------------------------------------------------------------------------------------|
| **Admin**              | School setup, terms, campuses, classes, enrollment approvals, attendance oversight, announcements, test scores, events, reports. |
| **Teacher**            | View assigned classes, take attendance, manage test scores, register students for events.                                        |
| **Parent/Guardian**    | Register students, view assigned class & calendar, access announcements, test results, and event sign-ups.                       |
| **Volunteer (Future)** | Limited access to assigned events.                                                                                               |

---

## 3️⃣ Phase 1 Features

### 3.1 Parent Registration & Student Profiles

- Parent signup & authentication (email / Google).
- Profile fields: name, phone, email (verified).
- Manage one or more student profiles (name, DOB, prior level, medical notes, photo consent).
- Admin access to full student list & guardian details.

---

### 3.2 Enrollment & Class Placement

- Public enrollment form for parents:
    - Student selection, preferred class time, prior experience.
    - Medical/photo consent.
- Admin dashboard:
    - Accept / waitlist / reject applications.
    - Move or transfer students between classes.
    - Auto-capacity checks and waitlist queue.
- Email notifications via SendGrid:
    - Acceptance / waitlist / rejection.

---

### 3.3 Terms, Campuses & Classes

- Define **Terms** (e.g., Fall 2025, Spring 2026) with start/end dates and holidays.
- Manage **Campuses** (locations) and **Rooms** (capacity).
- Define **Classes** per term:
    - Level, teacher, room, day/time, capacity, optional YouTube playlist ID.
- Support **multi-location** operations.

---

### 3.4 Calendar

- **Public Calendar**:
    - Read-only view of classes and events (no PII).
- **Personal Calendars**:
    - Parents: enrolled classes for each student.
    - Teachers: assigned classes and events.
- Integration with term and event data.

---

### 3.5 Attendance Tracking

- Teachers mark **Present / Late / Absent**.
- Quick “mark all present” toggle.
- Auto-save & audit trail.
- Export attendance to CSV (per class, per date range).
- Admin attendance summaries.

---

### 3.6 Test Scores / Assessments

- Create assessments (admin / teacher): name, date, level, max score.
- Bulk score entry (spreadsheet-style).
- Parent access to student score history.
- CSV export by class or assessment.
- Optional grading scale (A/B/C or numeric).

---

### 3.7 Event Registrations (Annual Day, Exams)

- Define events:
    - Title, date(s), location, capacity, eligible levels/classes.
- Parents register students; capacity & waitlist enforced.
- Admin view of rosters and exports.
- Registration cutoff enforcement.

---

### 3.8 Static Pages & YouTube Integration

- Pages: Home, About, Programs/Levels, Policies, Contact.
- SEO: titles, meta tags, sitemap.xml, robots.txt.
- Embed YouTube playlists per level or class page.

---

## 4️⃣ Data Model (High-Level, Firestore)

| Collection              | Key Fields                                                                            |
|-------------------------|---------------------------------------------------------------------------------------|
| **users**               | uid, role, name, email, phone                                                         |
| **guardians**           | userId, address, emergencyContact                                                     |
| **students**            | name, dob, guardianIds[], medicalNotes, photoConsent                                  |
| **terms**               | name, startDate, endDate, holidays[]                                                  |
| **campuses**            | name, address                                                                         |
| **rooms**               | campusId, name, capacity                                                              |
| **classes**             | termId, level, teacherId, roomId, dayOfWeek, startTime, endTime, capacity, playlistId |
| **enrollments**         | studentId, classId, status (applied / waitlisted / enrolled / dropped)                |
| **attendance**          | classId, date, records[{studentId, status, timestamp}]                                |
| **assessments**         | classId, title, date, maxScore                                                        |
| **scores**              | assessmentId, studentId, score, comment                                               |
| **events**              | title, date, location, capacity, eligibility                                          |
| **event_registrations** | eventId, studentId, status                                                            |
| **announcements**       | scope (school / class), title, body, publishAt                                        |

---

## 5️⃣ Integrations & Infra (GCP)

| Component         | Description                                                        |
|-------------------|--------------------------------------------------------------------|
| **Frontend**      | Next.js + Tailwind CSS, deployed via Cloud Run or Firebase Hosting |
| **Backend**       | Go (Gin / Fiber) service on Cloud Run (private)                    |
| **Database**      | Firestore (Native mode)                                            |
| **Storage**       | Cloud Storage (buckets for consent forms & exports)                |
| **Auth**          | Firebase Auth (email + Google)                                     |
| **Email**         | SendGrid API (free tier)                                           |
| **CI/CD**         | Cloud Build + GitHub triggers                                      |
| **Observability** | Cloud Logging, Error Reporting, Uptime Checks                      |
| **Secrets**       | GCP Secret Manager (Stripe, SendGrid keys)                         |

---

## 6️⃣ Security & Privacy

- Firebase Auth custom claims for roles (admin/teacher/parent).
- Firestore Security Rules enforce access by role.
- PII encrypted at rest; least-privilege service accounts.
- Restricted ACLs for documents (e.g., consent forms).
- Audit logs for admin actions.

---

## 7️⃣ Reports (Phase 1)

- Enrollment by class/level.
- Attendance rate by student/class.
- Test score summary per term.
- Event registration rosters.

---

## 8️⃣ Phase 2 (Next Release)

- Online payments & receipts.
- Volunteer management / check-in.
- Teacher availability & auto-scheduling.
- Multilingual UI (English + Tamil).
- Event photo galleries.
- PWA offline attendance.

---

## 9️⃣ Acceptance Criteria for MVP

✅ Admins can create terms, campuses, classes, and enroll students.  
✅ Teachers can take attendance and record test scores.  
✅ Parents can register students, view class calendar, and see results.  
✅ YouTube videos visible per level.  
✅ Data stored securely in Firestore.  
✅ Deployed on GCP (Cloud Run + Firestore + Auth).

---

### 🏁 Deliverable

This file serves as the baseline for all **GitHub Project Phase 1** issues and epics.  
Future iterations (Phase 2+) will extend functionality but keep the same Firestore schema.

