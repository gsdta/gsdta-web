# Firestore Migration Plan

**Document Version:** 1.0  
**Date:** October 16, 2025  
**Status:** Planning Phase  

## Executive Summary

This document outlines a comprehensive plan to migrate the GSDTA API from PostgreSQL to Google Cloud Firestore, a fully-managed NoSQL document database. This migration will eliminate the operational overhead of managing PostgreSQL infrastructure while leveraging Firestore's scalability, real-time capabilities, and seamless integration with Google Cloud Platform.

**Key Benefits:**
- Serverless, fully-managed database with automatic scaling
- Built-in real-time synchronization capabilities
- Strong consistency with ACID transactions
- Reduced infrastructure management overhead
- Native integration with Firebase ecosystem
- Cost-effective for read-heavy workloads

**Estimated Timeline:** 8-12 weeks  
**Risk Level:** Medium  
**Rollback Strategy:** Parallel running with feature flags

---

## Table of Contents

1. [Current Architecture Analysis](#1-current-architecture-analysis)
2. [Firestore Design](#2-firestore-design)
3. [Implementation Strategy](#3-implementation-strategy)
4. [Data Migration](#4-data-migration)
5. [Code Changes](#5-code-changes)
6. [Testing Strategy](#6-testing-strategy)
7. [Deployment Plan](#7-deployment-plan)
8. [Rollback Plan](#8-rollback-plan)
9. [Post-Migration](#9-post-migration)
10. [Timeline & Resources](#10-timeline--resources)
11. [Risk Assessment](#11-risk-assessment)

---

## 1. Current Architecture Analysis

### 1.1 Existing Data Model

The current PostgreSQL schema includes the following entities:

**Core Entities:**
- `users` - System users with roles (admin, teacher, parent)
- `guardians` - Parent accounts linked to users
- `students` - Student profiles with guardian relationships
- `terms` - Academic semesters/sessions
- `campuses` - Physical locations
- `rooms` - Classrooms within campuses
- `classes` - Course sections with scheduling
- `enrollments` - Student-class associations with status workflow

**Academic Tracking:**
- `attendances` - Daily attendance records (JSONB array of records)
- `assessments` - Test/quiz definitions
- `scores` - Individual student scores on assessments

**Events & Communication:**
- `events` - School events with registration
- `event_registrations` - Student event signups
- `announcements` - School-wide or class-specific announcements

### 1.2 Current Implementation Details

**Store Pattern:**
- Repository pattern with `store.Accessor` interface
- Separate repositories for each entity (13 total)
- Two implementations: `memory.Store` and `postgres.Store`
- Location: `internal/store/`

**Key PostgreSQL Features Used:**
1. **Foreign Key Constraints:** CASCADE deletes, referential integrity
2. **Unique Constraints:** Multi-column uniqueness (campus+room name)
3. **Check Constraints:** Enum-like status values, capacity > 0
4. **Triggers:** Auto-update `updated_at` timestamps
5. **Indexes:** Foreign key indexes, user_id lookups
6. **JSONB:** Attendance records stored as JSON array
7. **UUID Generation:** `gen_random_uuid()` for primary keys

**Dependencies:**
- `github.com/lib/pq` - PostgreSQL driver
- `database/sql` - Standard Go SQL interface

### 1.3 Query Patterns Analysis

**Common Operations:**
1. CRUD operations on all entities
2. List with pagination (LIMIT/OFFSET)
3. Sorting by created_at or updated_at
4. Foreign key lookups (e.g., students by guardian_id)
5. Nested data access (attendance records array)

**Complex Queries Identified:**
- Classes filtered by term, campus, teacher
- Enrollments by student or class with status filtering
- Attendance by class and date
- Scores by assessment or student
- Event registrations by event or student
- Announcements by scope and class

---

## 2. Firestore Design

### 2.1 Collection Structure

Firestore uses collections (tables) containing documents (rows). Each document is identified by a unique ID and contains fields (JSON-like data).

**Top-Level Collections:**

```
/users/{userId}
/guardians/{guardianId}
/students/{studentId}
/terms/{termId}
/campuses/{campusId}
/rooms/{roomId}
/classes/{classId}
/enrollments/{enrollmentId}
/attendances/{attendanceId}
/assessments/{assessmentId}
/scores/{scoreId}
/events/{eventId}
/eventRegistrations/{registrationId}
/announcements/{announcementId}
```

### 2.2 Document Schema Design

#### Users Document
```json
{
  "id": "auto-generated-by-firestore",
  "email": "user@example.com",
  "name": "John Doe",
  "roles": ["admin", "teacher"],
  "createdAt": "2025-10-16T10:00:00Z",
  "updatedAt": "2025-10-16T10:00:00Z"
}
```

#### Guardians Document
```json
{
  "id": "guardian-id",
  "userId": "user-id",
  "phone": "+1234567890",
  "createdAt": "2025-10-16T10:00:00Z",
  "updatedAt": "2025-10-16T10:00:00Z"
}
```

#### Students Document
```json
{
  "id": "student-id",
  "guardianId": "guardian-id",
  "firstName": "Jane",
  "lastName": "Doe",
  "dob": "2010-05-15T00:00:00Z",
  "priorLevel": "beginner",
  "medicalNotes": "None",
  "photoConsent": true,
  "createdAt": "2025-10-16T10:00:00Z",
  "updatedAt": "2025-10-16T10:00:00Z"
}
```

#### Classes Document
```json
{
  "id": "class-id",
  "termId": "term-id",
  "campusId": "campus-id",
  "roomId": "room-id",
  "teacherId": "teacher-user-id",
  "level": "intermediate",
  "weekday": 1,
  "startHHMM": "15:30",
  "endHHMM": "17:00",
  "capacity": 20,
  "playlistId": "spotify-playlist-id",
  "createdAt": "2025-10-16T10:00:00Z",
  "updatedAt": "2025-10-16T10:00:00Z"
}
```

#### Enrollments Document
```json
{
  "id": "enrollment-id",
  "studentId": "student-id",
  "classId": "class-id",
  "status": "enrolled",
  "createdAt": "2025-10-16T10:00:00Z",
  "updatedAt": "2025-10-16T10:00:00Z"
}
```

#### Attendances Document
```json
{
  "id": "attendance-id",
  "classId": "class-id",
  "date": "2025-10-16",
  "records": [
    {
      "studentId": "student-id-1",
      "status": "present",
      "at": "2025-10-16T15:30:00Z"
    },
    {
      "studentId": "student-id-2",
      "status": "absent",
      "at": "2025-10-16T15:30:00Z"
    }
  ],
  "createdAt": "2025-10-16T10:00:00Z",
  "updatedAt": "2025-10-16T10:00:00Z"
}
```

#### Assessments Document
```json
{
  "id": "assessment-id",
  "classId": "class-id",
  "title": "Midterm Exam",
  "date": "2025-10-20T00:00:00Z",
  "level": "intermediate",
  "maxScore": 100,
  "createdAt": "2025-10-16T10:00:00Z",
  "updatedAt": "2025-10-16T10:00:00Z"
}
```

#### Scores Document
```json
{
  "id": "score-id",
  "assessmentId": "assessment-id",
  "studentId": "student-id",
  "value": 85.5,
  "createdAt": "2025-10-16T10:00:00Z",
  "updatedAt": "2025-10-16T10:00:00Z"
}
```

### 2.3 Indexes Strategy

Firestore automatically indexes single fields. Composite indexes are needed for complex queries.

**Required Composite Indexes:**

1. **Guardians by userId:**
   - Collection: `guardians`
   - Fields: `userId` (Ascending)

2. **Students by guardianId:**
   - Collection: `students`
   - Fields: `guardianId` (Ascending), `createdAt` (Descending)

3. **Rooms by campusId:**
   - Collection: `rooms`
   - Fields: `campusId` (Ascending), `name` (Ascending)

4. **Classes by term:**
   - Collection: `classes`
   - Fields: `termId` (Ascending), `createdAt` (Descending)

5. **Classes by campus:**
   - Collection: `classes`
   - Fields: `campusId` (Ascending), `weekday` (Ascending)

6. **Classes by teacher:**
   - Collection: `classes`
   - Fields: `teacherId` (Ascending), `termId` (Ascending)

7. **Enrollments by student:**
   - Collection: `enrollments`
   - Fields: `studentId` (Ascending), `status` (Ascending)

8. **Enrollments by class:**
   - Collection: `enrollments`
   - Fields: `classId` (Ascending), `status` (Ascending)

9. **Attendances by class and date:**
   - Collection: `attendances`
   - Fields: `classId` (Ascending), `date` (Descending)

10. **Assessments by class:**
    - Collection: `assessments`
    - Fields: `classId` (Ascending), `date` (Descending)

11. **Scores by assessment:**
    - Collection: `scores`
    - Fields: `assessmentId` (Ascending), `studentId` (Ascending)

12. **Scores by student:**
    - Collection: `scores`
    - Fields: `studentId` (Ascending), `assessmentId` (Ascending)

13. **Event Registrations by event:**
    - Collection: `eventRegistrations`
    - Fields: `eventId` (Ascending), `status` (Ascending)

14. **Event Registrations by student:**
    - Collection: `eventRegistrations`
    - Fields: `studentId` (Ascending), `status` (Ascending)

15. **Announcements by scope and class:**
    - Collection: `announcements`
    - Fields: `scope` (Ascending), `classId` (Ascending), `publishAt` (Descending)

### 2.4 Handling PostgreSQL Features in Firestore

| PostgreSQL Feature | Firestore Alternative | Implementation Notes |
|-------------------|----------------------|---------------------|
| Foreign Key Constraints | Application-level validation | Validate IDs exist before creating documents |
| CASCADE DELETE | Application-level cleanup | Use batch writes or Cloud Functions triggers |
| Unique Constraints | Firestore transactions | Check uniqueness in transaction before write |
| Check Constraints | Application-level validation | Validate in Go code before write |
| Auto-update triggers | Application logic | Set updatedAt in repository methods |
| UUID generation | Firestore auto-IDs or UUID library | Use Firestore auto-IDs or `google/uuid` |
| JSONB arrays | Native map/array support | Store attendance records as native arrays |
| SQL joins | Multiple queries or denormalization | Fetch related documents separately |

### 2.5 Denormalization Opportunities

For read-heavy patterns, consider denormalizing:

1. **Student names in enrollments** - Avoid lookup for roster displays
2. **Class details in attendances** - Quick access to class info
3. **Assessment titles in scores** - Display scores with context

**Trade-offs:**
- Faster reads, slower writes
- Data consistency requires update multiple documents
- Increased storage costs

**Recommendation:** Start normalized, denormalize based on actual performance metrics.

---

## 3. Implementation Strategy

### 3.1 Phased Approach

**Phase 1: Foundation (Weeks 1-2)**
- Set up Google Cloud project and Firestore instance
- Configure authentication and service accounts
- Create Firestore client initialization code
- Define repository interfaces (already exists)

**Phase 2: Repository Implementation (Weeks 3-5)**
- Implement Firestore repository for each entity
- Add application-level validation (foreign keys, constraints)
- Implement pagination and sorting
- Add transaction support for complex operations

**Phase 3: Data Migration (Weeks 6-7)**
- Export data from PostgreSQL
- Transform data format (timestamps, JSON structures)
- Import to Firestore with validation
- Verify data integrity

**Phase 4: Testing (Weeks 8-9)**
- Unit tests with Firestore emulator
- Integration tests against real Firestore
- E2E tests with full API stack
- Performance testing and optimization

**Phase 5: Deployment (Weeks 10-11)**
- Deploy to staging with Firestore
- Parallel running (shadow mode)
- Gradual rollout to production
- Monitor and optimize

**Phase 6: Cleanup (Week 12)**
- Remove PostgreSQL code
- Update documentation
- Archive old migration scripts
- Final performance tuning

### 3.2 Feature Flag Strategy

Implement a store selector to switch between PostgreSQL and Firestore:

```go
// internal/config/config.go
type Config struct {
    // ...existing fields...
    DatabaseURL   string // Postgres (deprecated)
    FirestoreProjectID string
    UseFirestore  bool   // Feature flag
}
```

This allows:
- A/B testing between stores
- Gradual rollout
- Quick rollback if issues arise
- Parallel running for validation

### 3.3 Code Organization

New directory structure:

```
internal/store/
├── repo.go              # Repository interfaces (no changes)
├── errors.go            # Error types (no changes)
├── memory/              # In-memory implementation (keep for testing)
├── postgres/            # PostgreSQL (deprecated, eventually remove)
└── firestore/           # New Firestore implementation
    ├── firestore.go     # Store initialization
    ├── guardians.go     # Guardian repository
    ├── students.go      # Student repository
    ├── terms.go         # Term repository
    ├── campuses.go      # Campus repository
    ├── rooms.go         # Room repository
    ├── classes.go       # Class repository
    ├── enrollments.go   # Enrollment repository
    ├── attendances.go   # Attendance repository
    ├── assessments.go   # Assessment repository
    ├── scores.go        # Score repository
    ├── events.go        # Event repository
    ├── event_regs.go    # Event registration repository
    ├── announcements.go # Announcement repository
    └── helpers.go       # Common utilities
```

---

## 4. Data Migration

### 4.1 Export from PostgreSQL

Create a migration tool: `cmd/migrate/main.go`

**Features:**
- Export each table to JSON files
- Preserve UUIDs (convert to strings)
- Convert timestamps to RFC3339 format
- Validate data completeness
- Generate migration report

**Example command:**
```bash
go run cmd/migrate/main.go export --output=./migration-data/
```

**Output structure:**
```
migration-data/
├── users.json
├── guardians.json
├── students.json
├── terms.json
├── campuses.json
├── rooms.json
├── classes.json
├── enrollments.json
├── attendances.json
├── assessments.json
├── scores.json
├── events.json
├── event_registrations.json
├── announcements.json
└── manifest.json        # Counts, checksums, metadata
```

### 4.2 Data Transformation

Transform PostgreSQL data to Firestore format:

**Timestamp Conversion:**
```go
// PostgreSQL: time.Time
// Firestore: time.Time (native support)
// No conversion needed, ensure UTC
```

**UUID Handling:**
```go
// PostgreSQL: UUID type
// Firestore: string
// Convert: uuid.String()
```

**JSONB Arrays:**
```go
// PostgreSQL: JSONB column
// Firestore: native array/map
// Parse JSON and store as Go struct
```

**NULL Values:**
```go
// PostgreSQL: NULL
// Firestore: omit field or use pointer
// Use pointers for optional fields
```

### 4.3 Import to Firestore

**Strategy:**
- Use batch writes (up to 500 operations per batch)
- Import in dependency order (parents before children)
- Validate foreign key references during import
- Log errors and continue (don't fail entire import)
- Generate reconciliation report

**Import Order:**
1. users
2. guardians
3. students
4. terms
5. campuses
6. rooms
7. classes
8. enrollments
9. attendances
10. assessments
11. scores
12. events
13. event_registrations
14. announcements

**Example command:**
```bash
go run cmd/migrate/main.go import --input=./migration-data/ --project=gsdta-prod
```

### 4.4 Data Validation

**Post-Import Checks:**
1. Compare record counts (Postgres vs Firestore)
2. Sample random records and compare fields
3. Verify all foreign key references are valid
4. Check uniqueness constraints (email, campus+room name)
5. Validate data types and formats

**Validation Tool:**
```bash
go run cmd/migrate/main.go validate --source=postgres --target=firestore
```

### 4.5 Handling Large Datasets

For large datasets (>100K documents):

1. **Streaming Import:** Process records in chunks
2. **Parallel Processing:** Use goroutines for concurrent imports
3. **Progress Tracking:** Log progress every N records
4. **Resume on Failure:** Track last processed ID
5. **Rate Limiting:** Respect Firestore quotas (10K writes/sec)

---

## 5. Code Changes

### 5.1 Dependencies

**Add Firestore SDK:**
```go
// go.mod
require (
    cloud.google.com/go/firestore v1.14.0
    google.golang.org/api v0.149.0
    firebase.google.com/go/v4 v4.13.0 // Optional for Firebase Auth
)
```

**Remove PostgreSQL (eventually):**
```go
// Remove from go.mod after migration complete
// github.com/lib/pq v1.10.9
```

**Install:**
```bash
go get cloud.google.com/go/firestore
go mod tidy
```

### 5.2 Configuration Changes

**Update `internal/config/config.go`:**

```go
type Config struct {
    // ...existing fields...
    
    // Deprecated: Use Firestore instead
    DatabaseURL    string
    MigrateOnStart bool
    
    // Firestore configuration
    FirestoreProjectID   string
    FirestoreCredentials string // Path to service account JSON
    UseFirestore         bool   // Feature flag for gradual rollout
}

func Load() Config {
    cfg := Config{
        // ...existing fields...
        
        // Postgres (deprecated)
        DatabaseURL:    getEnv("DATABASE_URL", ""),
        MigrateOnStart: getBool("MIGRATE_ON_START", false),
        
        // Firestore
        FirestoreProjectID:   getEnv("FIRESTORE_PROJECT_ID", ""),
        FirestoreCredentials: getEnv("GOOGLE_APPLICATION_CREDENTIALS", ""),
        UseFirestore:         getBool("USE_FIRESTORE", false),
    }
    
    return cfg
}
```

**Update `.env.example`:**
```bash
# Database Configuration
# USE_FIRESTORE=true
# FIRESTORE_PROJECT_ID=your-project-id
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Deprecated - PostgreSQL (will be removed)
# DATABASE_URL=postgres://user:pass@localhost:5432/gsdta?sslmode=disable
# MIGRATE_ON_START=false
```

### 5.3 Firestore Store Implementation

**Create `internal/store/firestore/firestore.go`:**

```go
package firestore

import (
    "context"
    "cloud.google.com/go/firestore"
    "google.golang.org/api/option"
    "github.com/gsdta/api/internal/store"
)

type Store struct {
    client *firestore.Client
}

func New(ctx context.Context, projectID string, opts ...option.ClientOption) (*Store, error) {
    client, err := firestore.NewClient(ctx, projectID, opts...)
    if err != nil {
        return nil, err
    }
    return &Store{client: client}, nil
}

func (s *Store) Close() error {
    return s.client.Close()
}

// Accessor implementation
func (s *Store) Students() store.StudentRepo                     { return &studentRepo{s} }
func (s *Store) Guardians() store.GuardianRepo                   { return &guardianRepo{s} }
func (s *Store) Terms() store.TermRepo                           { return &termRepo{s} }
func (s *Store) Campuses() store.CampusRepo                      { return &campusRepo{s} }
func (s *Store) Rooms() store.RoomRepo                           { return &roomRepo{s} }
func (s *Store) Classes() store.ClassRepo                        { return &classRepo{s} }
func (s *Store) Enrollments() store.EnrollmentRepo               { return &enrollmentRepo{s} }
func (s *Store) Events() store.EventRepo                         { return &eventRepo{s} }
func (s *Store) Attendances() store.AttendanceRepo               { return &attendanceRepo{s} }
func (s *Store) Assessments() store.AssessmentRepo               { return &assessmentRepo{s} }
func (s *Store) Scores() store.ScoreRepo                         { return &scoreRepo{s} }
func (s *Store) EventRegistrations() store.EventRegistrationRepo { return &eventRegRepo{s} }
func (s *Store) Announcements() store.AnnouncementRepo           { return &announcementRepo{s} }
```

**Create `internal/store/firestore/helpers.go`:**

```go
package firestore

import (
    "context"
    "time"
    "cloud.google.com/go/firestore"
    "github.com/google/uuid"
    "github.com/gsdta/api/internal/domain"
    "github.com/gsdta/api/internal/store"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

// generateID creates a new UUID string
func generateID() string {
    return uuid.New().String()
}

// metaNow returns a Meta with current timestamps
func metaNow(id string) domain.Meta {
    now := time.Now().UTC()
    return domain.Meta{
        ID:        id,
        CreatedAt: now,
        UpdatedAt: now,
    }
}

// updateMeta updates the UpdatedAt timestamp
func updateMeta(m *domain.Meta) {
    m.UpdatedAt = time.Now().UTC()
}

// notFoundError converts Firestore not found to store error
func notFoundError(err error, resource, id string) error {
    if status.Code(err) == codes.NotFound {
        return store.NotFoundError{Resource: resource, ID: id}
    }
    return err
}

// applyListOptions applies pagination and sorting to query
func applyListOptions(query firestore.Query, opts store.ListOptions) firestore.Query {
    // Sort
    sortBy := "createdAt"
    direction := firestore.Asc
    
    if opts.SortBy == "updatedAt" {
        sortBy = "updatedAt"
    }
    if opts.Desc {
        direction = firestore.Desc
    }
    
    query = query.OrderBy(sortBy, direction)
    
    // Pagination
    if opts.Offset > 0 {
        query = query.Offset(opts.Offset)
    }
    if opts.Limit > 0 {
        query = query.Limit(opts.Limit)
    }
    
    return query
}

// validateForeignKey checks if a document exists
func (s *Store) validateForeignKey(ctx context.Context, collection, id string) error {
    if id == "" {
        return nil // Empty ID is allowed for optional references
    }
    
    doc, err := s.client.Collection(collection).Doc(id).Get(ctx)
    if err != nil {
        if status.Code(err) == codes.NotFound {
            return store.ValidationError{Field: collection + "Id", Message: "referenced document does not exist"}
        }
        return err
    }
    if !doc.Exists() {
        return store.ValidationError{Field: collection + "Id", Message: "referenced document does not exist"}
    }
    
    return nil
}
```

### 5.4 Example Repository Implementation

**Create `internal/store/firestore/students.go`:**

```go
package firestore

import (
    "context"
    "cloud.google.com/go/firestore"
    "github.com/gsdta/api/internal/domain"
    "github.com/gsdta/api/internal/store"
    "google.golang.org/api/iterator"
)

type studentRepo struct {
    *Store
}

const studentsCollection = "students"

func (r *studentRepo) Create(ctx context.Context, s domain.Student) (domain.Student, error) {
    // Validate foreign keys
    if err := r.validateForeignKey(ctx, "guardians", s.GuardianID); err != nil {
        return domain.Student{}, err
    }
    
    // Generate ID and timestamps
    id := generateID()
    s.Meta = metaNow(id)
    
    // Write to Firestore
    _, err := r.client.Collection(studentsCollection).Doc(id).Set(ctx, s)
    if err != nil {
        return domain.Student{}, err
    }
    
    return s, nil
}

func (r *studentRepo) Get(ctx context.Context, id string) (domain.Student, error) {
    doc, err := r.client.Collection(studentsCollection).Doc(id).Get(ctx)
    if err != nil {
        return domain.Student{}, notFoundError(err, "student", id)
    }
    
    var s domain.Student
    if err := doc.DataTo(&s); err != nil {
        return domain.Student{}, err
    }
    
    return s, nil
}

func (r *studentRepo) Update(ctx context.Context, s domain.Student) (domain.Student, error) {
    // Validate foreign keys
    if err := r.validateForeignKey(ctx, "guardians", s.GuardianID); err != nil {
        return domain.Student{}, err
    }
    
    // Update timestamp
    updateMeta(&s.Meta)
    
    // Write to Firestore
    _, err := r.client.Collection(studentsCollection).Doc(s.ID).Set(ctx, s)
    if err != nil {
        return domain.Student{}, err
    }
    
    return s, nil
}

func (r *studentRepo) Delete(ctx context.Context, id string) error {
    // Check if student exists
    if _, err := r.Get(ctx, id); err != nil {
        return err
    }
    
    // Handle cascade deletes (enrollments, scores, etc.)
    // This requires querying and deleting related documents
    batch := r.client.Batch()
    
    // Delete enrollments
    iter := r.client.Collection("enrollments").Where("studentId", "==", id).Documents(ctx)
    for {
        doc, err := iter.Next()
        if err == iterator.Done {
            break
        }
        if err != nil {
            return err
        }
        batch.Delete(doc.Ref)
    }
    
    // Delete scores
    iter = r.client.Collection("scores").Where("studentId", "==", id).Documents(ctx)
    for {
        doc, err := iter.Next()
        if err == iterator.Done {
            break
        }
        if err != nil {
            return err
        }
        batch.Delete(doc.Ref)
    }
    
    // Delete event registrations
    iter = r.client.Collection("eventRegistrations").Where("studentId", "==", id).Documents(ctx)
    for {
        doc, err := iter.Next()
        if err == iterator.Done {
            break
        }
        if err != nil {
            return err
        }
        batch.Delete(doc.Ref)
    }
    
    // Delete the student
    batch.Delete(r.client.Collection(studentsCollection).Doc(id))
    
    // Commit batch
    _, err := batch.Commit(ctx)
    return err
}

func (r *studentRepo) List(ctx context.Context, opts store.ListOptions) ([]domain.Student, int, error) {
    query := r.client.Collection(studentsCollection).Query
    query = applyListOptions(query, opts)
    
    iter := query.Documents(ctx)
    defer iter.Stop()
    
    var students []domain.Student
    for {
        doc, err := iter.Next()
        if err == iterator.Done {
            break
        }
        if err != nil {
            return nil, 0, err
        }
        
        var s domain.Student
        if err := doc.DataTo(&s); err != nil {
            return nil, 0, err
        }
        students = append(students, s)
    }
    
    // Get total count
    countQuery := r.client.Collection(studentsCollection).Query
    docs, err := countQuery.Documents(ctx).GetAll()
    if err != nil {
        return students, len(students), nil // Return partial results
    }
    
    return students, len(docs), nil
}
```

### 5.5 Main Application Changes

**Update `cmd/api/main.go`:**

```go
import (
    // ...existing imports...
    "cloud.google.com/go/firestore"
    "google.golang.org/api/option"
    firestorestore "github.com/gsdta/api/internal/store/firestore"
)

func main() {
    // ...existing setup...
    
    var st store.Accessor
    var cleanup func()
    
    if cfg.UseFirestore {
        // Use Firestore
        var opts []option.ClientOption
        if cfg.FirestoreCredentials != "" {
            opts = append(opts, option.WithCredentialsFile(cfg.FirestoreCredentials))
        }
        
        fs, err := firestorestore.New(context.Background(), cfg.FirestoreProjectID, opts...)
        if err != nil {
            log.Fatal().Err(err).Msg("init firestore")
        }
        
        st = fs
        cleanup = func() { fs.Close() }
        log.Info().Str("project", cfg.FirestoreProjectID).Msg("using firestore store")
        
    } else if cfg.DatabaseURL != "" {
        // Use PostgreSQL (deprecated)
        db, err := sql.Open("postgres", cfg.DatabaseURL)
        // ...existing postgres setup...
        st = pgstore.New(db)
        cleanup = func() { db.Close() }
        log.Info().Msg("using postgres store (deprecated)")
        
    } else {
        // Use in-memory store
        mem := memory.New()
        // ...existing memory setup...
        st = mem
        cleanup = func() {}
        log.Info().Msg("using in-memory store")
    }
    
    defer cleanup()
    
    // ...rest of main...
}
```

### 5.6 Error Handling

Add validation error type to `internal/store/errors.go`:

```go
type ValidationError struct {
    Field   string
    Message string
}

func (e ValidationError) Error() string {
    return fmt.Sprintf("validation error: %s - %s", e.Field, e.Message)
}
```

---

## 6. Testing Strategy

### 6.1 Unit Testing with Firestore Emulator

**Install Emulator:**
```bash
npm install -g firebase-tools
firebase setup:emulators:firestore
```

**Start Emulator:**
```bash
firebase emulators:start --only firestore
```

**Configure Tests:**
```go
// internal/store/firestore/firestore_test.go
func setupTestStore(t *testing.T) *Store {
    os.Setenv("FIRESTORE_EMULATOR_HOST", "localhost:8080")
    
    ctx := context.Background()
    store, err := New(ctx, "test-project")
    require.NoError(t, err)
    
    t.Cleanup(func() {
        store.Close()
    })
    
    return store
}
```

**Test Coverage Goals:**
- 80%+ code coverage for all repositories
- Test all CRUD operations
- Test validation logic (foreign keys, constraints)
- Test pagination and sorting
- Test error cases (not found, validation errors)

### 6.2 Integration Testing

**Test Strategy:**
1. Deploy API with Firestore to test environment
2. Run existing E2E tests (`e2e/*.feature`)
3. Compare results with PostgreSQL implementation
4. Verify data consistency across operations

**Key Test Scenarios:**
- Complete enrollment workflow (apply → enroll → attend → assess)
- Guardian creates student, enrolls in class
- Teacher marks attendance, creates assessments, enters scores
- Admin manages terms, campuses, rooms, classes
- Event registration and cancellation
- Announcement creation and retrieval

### 6.3 Performance Testing

**Metrics to Track:**
- Response time for CRUD operations
- List query performance with pagination
- Complex query performance (filters, sorting)
- Concurrent request handling
- Read/write throughput

**Tools:**
- Apache Bench (ab)
- k6 load testing
- Firestore monitoring dashboard

**Targets:**
- P50 < 100ms for single document reads
- P95 < 500ms for list queries
- P99 < 1s for all operations

### 6.4 Data Integrity Testing

**Validation Checks:**
1. **Foreign Key Integrity:** Verify references exist
2. **Cascade Deletes:** Confirm related documents are deleted
3. **Unique Constraints:** Prevent duplicate emails, campus+room names
4. **Data Consistency:** Enrollment status workflow transitions
5. **Timestamp Accuracy:** createdAt/updatedAt properly maintained

### 6.5 Test Checklist

- [ ] All unit tests passing with Firestore emulator
- [ ] All E2E tests passing with Firestore backend
- [ ] Performance benchmarks meet targets
- [ ] Data validation logic verified
- [ ] Cascade delete behavior confirmed
- [ ] Pagination and sorting working correctly
- [ ] Error handling tested (not found, validation)
- [ ] Concurrent access tested (race conditions)
- [ ] Large dataset handling tested (10K+ documents)
- [ ] Rollback procedure tested

---

## 7. Deployment Plan

### 7.1 Pre-Deployment Checklist

- [ ] Firestore project created and configured
- [ ] Service account created with appropriate permissions
- [ ] Composite indexes deployed to Firestore
- [ ] Security rules configured
- [ ] Backup of PostgreSQL data completed
- [ ] Migration tool tested on staging data
- [ ] All tests passing on staging environment
- [ ] Rollback plan documented and rehearsed
- [ ] Monitoring and alerts configured
- [ ] Team trained on Firestore operations

### 7.2 Staging Deployment

**Week 10:**

1. **Day 1-2: Deploy to Staging**
   - Deploy API with `USE_FIRESTORE=true`
   - Migrate staging database to Firestore
   - Verify all data migrated correctly
   - Run full E2E test suite

2. **Day 3-4: Validation**
   - Manual testing of all features
   - Performance testing
   - Monitor Firestore metrics
   - Compare behavior with PostgreSQL version

3. **Day 5: Stakeholder Review**
   - Demo to stakeholders
   - Collect feedback
   - Address any issues found

### 7.3 Production Deployment

**Week 11:**

**Option A: Big Bang Cutover (Higher Risk)**

Schedule maintenance window:
1. Take API offline
2. Export final PostgreSQL data
3. Import to Firestore
4. Deploy new API version
5. Verify functionality
6. Bring API online

**Option B: Gradual Rollout (Recommended)**

1. **Deploy with Feature Flag**
   - Deploy API with `USE_FIRESTORE=false` (default)
   - Verify deployment successful
   - PostgreSQL still active

2. **Migrate Data**
   - Run migration tool to copy data to Firestore
   - Validate data integrity
   - Set up continuous sync (optional)

3. **Shadow Mode (Optional)**
   - Route read traffic to Firestore, writes to both
   - Compare results
   - Identify discrepancies

4. **Gradual Rollout**
   - Enable Firestore for 10% of traffic
   - Monitor for 24 hours
   - Increase to 50% if stable
   - Monitor for 24 hours
   - Increase to 100%

5. **Full Cutover**
   - Set `USE_FIRESTORE=true` for all requests
   - Keep PostgreSQL running (read-only) for 1 week
   - Monitor closely

### 7.4 Monitoring During Rollout

**Key Metrics:**
- Request success rate
- Response time (P50, P95, P99)
- Error rate by endpoint
- Firestore read/write operations
- Firestore quota usage
- API server resource usage

**Alerts:**
- Error rate > 1%
- P95 response time > 1s
- Firestore quota approaching limit
- Failed validation checks

**Dashboards:**
- Real-time traffic visualization
- Error logs with filtering
- Firestore operation breakdown
- Cost tracking

### 7.5 Post-Deployment Validation

**Immediate (24 hours):**
- Monitor error rates and response times
- Verify all critical features working
- Check data consistency
- Review Firestore costs

**Short-term (1 week):**
- Analyze performance trends
- Optimize slow queries
- Adjust Firestore indexes
- Fine-tune batch operations

**Long-term (1 month):**
- Full cost analysis
- Performance optimization
- Consider denormalization opportunities
- Plan PostgreSQL decommissioning

---

## 8. Rollback Plan

### 8.1 Rollback Triggers

Initiate rollback if:
- Error rate > 5% for 5 minutes
- P95 response time > 5s
- Data integrity issues detected
- Critical feature not working
- Firestore quota exhausted

### 8.2 Rollback Procedure

**Immediate Rollback (< 5 minutes):**

1. **Revert Feature Flag**
   ```bash
   # Set environment variable
   export USE_FIRESTORE=false
   # Or update config and restart
   ```

2. **Restart Services**
   - API automatically switches to PostgreSQL
   - No code deployment needed

3. **Verify Recovery**
   - Check error rates return to normal
   - Test critical endpoints
   - Monitor PostgreSQL performance

**Full Rollback (if needed):**

1. **Deploy Previous Version**
   ```bash
   # Rollback to previous deployment
   git revert <firestore-merge-commit>
   # Deploy old version
   ```

2. **Restore PostgreSQL Data**
   - If data was modified in Firestore only
   - Use backup to restore PostgreSQL
   - Verify data completeness

3. **Update Configuration**
   - Remove Firestore environment variables
   - Restore PostgreSQL connection string

### 8.3 Data Reconciliation

If rollback occurs after writes to Firestore:

1. **Identify New Data**
   - Query Firestore for documents created after cutover
   - Export to JSON

2. **Import to PostgreSQL**
   - Transform Firestore format back to SQL
   - Insert missing records
   - Verify foreign key integrity

3. **Validate Consistency**
   - Compare record counts
   - Check for duplicates
   - Verify relationships

---

## 9. Post-Migration

### 9.1 PostgreSQL Decommissioning

**Timeline: 2-4 weeks after stable production**

1. **Week 1-2: Monitoring Period**
   - Keep PostgreSQL running in read-only mode
   - Monitor Firestore stability
   - Ensure no rollback needed

2. **Week 3: Prepare for Removal**
   - Final backup of PostgreSQL data
   - Archive migration scripts
   - Update runbooks

3. **Week 4: Remove PostgreSQL**
   - Stop PostgreSQL service
   - Remove DATABASE_URL from config
   - Remove postgres store code
   - Remove lib/pq dependency
   - Update documentation
   - Delete PostgreSQL infrastructure

### 9.2 Code Cleanup

**Remove PostgreSQL Code:**
```bash
# Delete postgres store
rm -rf internal/store/postgres/

# Update go.mod
go mod edit -droprequire github.com/lib/pq
go mod tidy

# Remove SQL files
git mv gsdta.sql archive/gsdta-postgres.sql
git mv seeds.sql archive/seeds-postgres.sql
```

**Update Configuration:**
```go
// Remove from config.go
// DatabaseURL    string
// MigrateOnStart bool
```

**Update Documentation:**
- README.md - Remove PostgreSQL references
- docs/deploy.md - Update deployment instructions
- docs/infra.md - Document Firestore setup
- .env.example - Remove DATABASE_URL

### 9.3 Cost Optimization

**Firestore Cost Structure:**
- Document reads: $0.06 per 100K
- Document writes: $0.18 per 100K
- Document deletes: $0.02 per 100K
- Storage: $0.18 per GB/month

**Optimization Strategies:**

1. **Reduce Reads:**
   - Implement client-side caching
   - Use ETags for conditional requests
   - Cache frequently accessed data

2. **Optimize Queries:**
   - Limit result sets appropriately
   - Use cursors for large paginations
   - Avoid unnecessary ordering

3. **Batch Operations:**
   - Group writes into batches (up to 500)
   - Use transactions for related operations

4. **Monitor Usage:**
   - Set up budget alerts
   - Review Firestore console regularly
   - Identify high-cost queries

### 9.4 Performance Tuning

**Index Optimization:**
- Review query performance in Firestore console
- Add missing composite indexes
- Remove unused indexes

**Denormalization:**
- Identify read-heavy patterns
- Consider duplicating data for faster reads
- Balance write complexity vs. read speed

**Caching Strategy:**
- Implement Redis for hot data
- Cache computed values (reports, aggregations)
- Set appropriate TTLs

### 9.5 Security Hardening

**Firestore Security Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only server (via service account) can access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**Service Account Permissions:**
- Use least privilege principle
- Create separate accounts for dev/staging/prod
- Rotate credentials regularly
- Audit access logs

**Network Security:**
- Use VPC Service Controls (if applicable)
- Enable Cloud Armor for DDoS protection
- Implement rate limiting

### 9.6 Backup Strategy

**Firestore Backup Options:**

1. **Automated Exports:**
   - Schedule daily exports to Cloud Storage
   - Set up using Cloud Scheduler
   - Retain for 30 days

2. **Manual Exports:**
   ```bash
   gcloud firestore export gs://[BUCKET_NAME]/[EXPORT_PREFIX]
   ```

3. **Point-in-Time Recovery:**
   - Firestore doesn't support PITR natively
   - Use exports for disaster recovery

**Disaster Recovery Plan:**
- Document restore procedure
- Test restore process quarterly
- Define RTO (Recovery Time Objective): 4 hours
- Define RPO (Recovery Point Objective): 24 hours

---

## 10. Timeline & Resources

### 10.1 Detailed Timeline

| Week | Phase | Tasks | Owner | Status |
|------|-------|-------|-------|--------|
| 1 | Foundation | GCP project setup, Firestore config | DevOps | Not Started |
| 1 | Foundation | Service account creation | DevOps | Not Started |
| 2 | Foundation | Client initialization code | Backend | Not Started |
| 2 | Foundation | Repository interface review | Backend | Not Started |
| 3 | Implementation | Guardians, Students repos | Backend | Not Started |
| 3 | Implementation | Terms, Campuses, Rooms repos | Backend | Not Started |
| 4 | Implementation | Classes, Enrollments repos | Backend | Not Started |
| 4 | Implementation | Attendances, Assessments repos | Backend | Not Started |
| 5 | Implementation | Scores, Events repos | Backend | Not Started |
| 5 | Implementation | Event Regs, Announcements repos | Backend | Not Started |
| 6 | Migration Tool | Export tool development | Backend | Not Started |
| 6 | Migration Tool | Import tool development | Backend | Not Started |
| 7 | Migration Tool | Validation tool development | Backend | Not Started |
| 7 | Migration | Migrate staging database | Backend | Not Started |
| 8 | Testing | Unit tests with emulator | Backend | Not Started |
| 8 | Testing | Integration tests | QA | Not Started |
| 9 | Testing | E2E tests | QA | Not Started |
| 9 | Testing | Performance testing | QA | Not Started |
| 10 | Deployment | Deploy to staging | DevOps | Not Started |
| 10 | Deployment | Staging validation | QA | Not Started |
| 11 | Deployment | Production migration | DevOps | Not Started |
| 11 | Deployment | Gradual rollout | DevOps | Not Started |
| 12 | Cleanup | Monitor and optimize | All | Not Started |
| 12 | Cleanup | Decommission PostgreSQL | DevOps | Not Started |

### 10.2 Resource Requirements

**Team:**
- 1 Backend Developer (full-time, 12 weeks)
- 1 DevOps Engineer (50%, 8 weeks)
- 1 QA Engineer (50%, 4 weeks)
- 1 Tech Lead (oversight, 25%, 12 weeks)

**Infrastructure:**
- Google Cloud Platform account
- Firestore instance (dev, staging, prod)
- PostgreSQL database (maintain during transition)
- CI/CD pipeline updates

**Tools:**
- Firestore emulator for local development
- Monitoring and alerting (Cloud Monitoring)
- Load testing tools (k6, Apache Bench)

### 10.3 Budget Estimate

**Development Costs:**
- Backend Developer: 12 weeks × $X
- DevOps Engineer: 6 weeks × $Y
- QA Engineer: 2 weeks × $Z
- Total: $XX,XXX

**Infrastructure Costs (monthly):**
- Firestore (estimated):
  - 1M reads: $6
  - 500K writes: $9
  - 10GB storage: $2
  - Total: ~$20-50/month
- PostgreSQL during transition: $XX/month
- Monitoring and logging: $XX/month

**One-Time Costs:**
- Migration tools development: Included in dev costs
- Training and documentation: 1 week
- Contingency (10%): $X,XXX

---

## 11. Risk Assessment

### 11.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss during migration | Low | Critical | Multiple backups, validation tools, dry runs |
| Performance degradation | Medium | High | Performance testing, optimization, indexes |
| Firestore quota limits | Medium | Medium | Monitor usage, request quota increase |
| Complex query incompatibility | Medium | Medium | Analyze queries early, design workarounds |
| Foreign key validation bugs | Medium | High | Comprehensive testing, gradual rollout |
| Cascade delete failures | Medium | High | Thorough testing, transaction handling |

### 11.2 Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Extended downtime | Low | Critical | Gradual rollout, feature flags |
| Team knowledge gap | Medium | Medium | Training, documentation, pair programming |
| Cost overruns | Low | Low | Budget alerts, usage monitoring |
| Rollback complexity | Medium | High | Clear rollback plan, testing |
| Timeline delays | Medium | Medium | Buffer time, clear milestones |

### 11.3 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| User-facing errors | Low | High | Gradual rollout, extensive testing |
| Feature unavailability | Low | Critical | Maintain PostgreSQL as backup |
| Data inconsistency | Low | Critical | Validation tools, reconciliation |
| Vendor lock-in | High | Medium | Maintain abstraction layer (repo pattern) |

### 11.4 Risk Response Plan

**For Each High-Impact Risk:**

1. **Data Loss Prevention:**
   - Daily automated backups
   - Manual backup before migration
   - Validation checksums
   - Keep PostgreSQL active for 2 weeks post-migration

2. **Performance Issues:**
   - Benchmark before migration
   - Monitor continuously
   - Have optimization scripts ready
   - Quick rollback to PostgreSQL

3. **Feature Availability:**
   - Feature flag system
   - Parallel running capability
   - Health checks for all endpoints
   - Auto-rollback on critical errors

---

## 12. Success Criteria

### 12.1 Migration Complete When:

- [ ] All data migrated to Firestore with 100% accuracy
- [ ] All E2E tests passing against Firestore
- [ ] Performance meets or exceeds PostgreSQL baseline
- [ ] Zero data loss or corruption
- [ ] Production running on Firestore for 2 weeks without issues
- [ ] PostgreSQL decommissioned
- [ ] Documentation updated
- [ ] Team trained on Firestore operations

### 12.2 Key Performance Indicators (KPIs)

**Technical KPIs:**
- API error rate < 0.1%
- P95 response time < 500ms
- 100% test coverage for Firestore repos
- Zero data integrity issues

**Operational KPIs:**
- Deployment frequency maintained
- Mean time to recovery < 15 minutes
- Infrastructure cost reduced by X%
- Developer productivity maintained

**Business KPIs:**
- Zero user-reported data issues
- No unplanned downtime
- Feature velocity maintained
- System reliability > 99.9%

---

## Appendix A: Firestore vs PostgreSQL Feature Matrix

| Feature | PostgreSQL | Firestore | Migration Strategy |
|---------|-----------|-----------|-------------------|
| Primary Keys | UUID | Auto-ID or custom | Use UUID for consistency |
| Foreign Keys | Native constraints | App-level validation | Implement in repository layer |
| Transactions | Full ACID | Limited (500 docs) | Redesign large transactions |
| Joins | Native SQL | Multiple queries | Fetch related docs separately |
| Indexes | B-tree, GIN, etc. | Single + composite | Plan composite indexes |
| Full-text search | Native | External service | Use Algolia or similar |
| Aggregations | Native SQL | Client-side or Functions | Compute in application |
| Triggers | Database triggers | Cloud Functions | Move to app or use CF |
| Constraints | CHECK, UNIQUE | App-level | Validate in code |
| Backups | pg_dump, PITR | Export to GCS | Set up scheduled exports |

---

## Appendix B: Reference Documentation

**Firestore Documentation:**
- [Firestore Official Docs](https://cloud.google.com/firestore/docs)
- [Go Client Library](https://pkg.go.dev/cloud.google.com/go/firestore)
- [Best Practices](https://cloud.google.com/firestore/docs/best-practices)
- [Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

**Migration Guides:**
- [SQL to NoSQL Migration](https://cloud.google.com/firestore/docs/firestore-or-datastore)
- [Data Modeling](https://firebase.google.com/docs/firestore/manage-data/structure-data)
- [Performance Optimization](https://cloud.google.com/firestore/docs/best-practices)

**Go Resources:**
- [Firestore Go Samples](https://github.com/GoogleCloudPlatform/golang-samples/tree/main/firestore)
- [Testing with Emulator](https://firebase.google.com/docs/emulator-suite/connect_firestore)

---

## Appendix C: Contact & Escalation

**Project Stakeholders:**
- Project Sponsor: [Name]
- Technical Lead: [Name]
- Backend Developer: [Name]
- DevOps Engineer: [Name]
- QA Lead: [Name]

**Escalation Path:**
1. Development issues → Technical Lead
2. Infrastructure issues → DevOps Engineer
3. Timeline concerns → Project Sponsor
4. Critical production issues → All hands

**Communication Channels:**
- Daily standups: 9:00 AM
- Weekly status: Fridays
- Incident channel: #gsdta-firestore-migration
- Documentation: Confluence/Wiki

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-16 | GitHub Copilot | Initial migration plan |

---

**End of Document**

