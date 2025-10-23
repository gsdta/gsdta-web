# Quick Start Guide - Firestore Registration Implementation

## What Has Been Created

### 📋 Documentation
1. **`docs/firestore-registration-implementation-plan.md`** - Complete implementation plan with:
   - Step-by-step GCP Firestore setup instructions (for beginners)
   - Detailed data model based on your refined requirements
   - API implementation guide
   - UI form structure
   - Testing strategy
   - Deployment plan

2. **`docs/registration-data-model-analysis.md`** - Analysis comparing current Google Sheets approach with new Firestore model

3. **`todo.md`** - Updated with refined requirements and phase-by-phase checklist

### 🛠️ Infrastructure Files
1. **`persistence/firestore.rules`** - Security rules for Firestore
2. **`persistence/firestore.indexes.json`** - Database indexes for optimal queries

### 🚀 Go API Code (Backend)
1. **`api/internal/domain/registration.go`** - Domain models and types
2. **`api/internal/storage/firestore/client.go`** - Firestore client setup
3. **`api/internal/storage/firestore/registration.go`** - Repository with duplicate detection
4. **`api/internal/http/handlers/registration.go`** - HTTP handler for POST /api/v1/registrations

### 💻 TypeScript/React Code (Frontend)
1. **`ui/src/types/registration.ts`** - TypeScript types, constants, and dropdown options
2. **`ui/src/lib/validation/registration.ts`** - Zod validation schemas
3. **`ui/src/lib/api/registration.ts`** - API client for submissions

## Next Steps to Get Started

### Step 1: Set Up GCP Firestore (15-30 minutes)

Follow the detailed instructions in `docs/firestore-registration-implementation-plan.md` section "GCP Firestore Setup (Step-by-Step)".

**Quick version:**

```bash
# 1. Set your project ID
set PROJECT_ID=gsdta-web

# 2. Login and set project
gcloud auth login
gcloud config set project %PROJECT_ID%

# 3. Enable APIs
gcloud services enable firestore.googleapis.com
gcloud services enable run.googleapis.com

# 4. Create Firestore database
gcloud firestore databases create --location=us-central1 --type=firestore-native

# 5. Create service account
gcloud iam service-accounts create gsdta-api-runner --display-name="GSDTA API Service Account"

gcloud projects add-iam-policy-binding %PROJECT_ID% --member="serviceAccount:gsdta-api-runner@%PROJECT_ID%.iam.gserviceaccount.com" --role="roles/datastore.user"
```

### Step 2: Set Up Local Development (10 minutes)

```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firestore in your project root
cd C:\projects\gsdta\gsdta-web
firebase init firestore

# When prompted:
# - Select "Use an existing project"
# - Choose your GCP project
# - Accept defaults for persistence/firestore.rules and persistence/firestore.indexes.json

# Start the emulator
firebase emulators:start --only firestore
```

Create `.env.local` in project root:
```
FIRESTORE_EMULATOR_HOST=127.0.0.1:8889
GOOGLE_CLOUD_PROJECT=gsdta-web
```

### Step 3: Install Go Dependencies (5 minutes)

```bash
cd C:\projects\gsdta\gsdta-web\api

# Add Firestore dependencies
go get cloud.google.com/go/firestore
go get google.golang.org/api
go get github.com/go-playground/validator/v10

# Tidy up
go mod tidy
```

### Step 4: Update API Main File (10 minutes)

You need to wire up the new registration handler in your `api/cmd/api/main.go`.

Add this to your route setup:

```go
import (
    "gsdta/internal/http/handlers"
    "gsdta/internal/storage/firestore"
)

// In your main() or setupRoutes() function:
func setupRoutes() {
    // Initialize Firestore client
    ctx := context.Background()
    fsClient, err := firestore.NewClient(ctx)
    if err != nil {
        log.Fatalf("Failed to create Firestore client: %v", err)
    }
    defer fsClient.Close()

    // Create repository and handler
    regRepo := firestore.NewRegistrationRepository(fsClient)
    regHandler := handlers.NewRegistrationHandler(regRepo)

    // Register route
    http.HandleFunc("POST /api/v1/registrations", regHandler.Create)
}
```

### Step 5: Create the New UI Form (Next Phase)

The UI form needs to be created. You have two options:

**Option A: Create new page from scratch**
- Create `ui/src/app/register-v2/page.tsx`
- Use the types and validation from the files I created
- Implement a 3-step form (Student → Guardians → School)

**Option B: Modify existing register page**
- Update `ui/src/app/register/page.tsx`
- Replace Google Forms submission with API call

I can help you build the complete UI form if needed.

### Step 6: Test Locally (15 minutes)

```bash
# Terminal 1: Start Firestore emulator
firebase emulators:start --only firestore

# Terminal 2: Start Go API
cd api
go run cmd/api/main.go

# Terminal 3: Start UI
cd ui
npm run dev
```

Test the flow:
1. Open http://localhost:3000/register-v2
2. Fill out the form
3. Submit
4. Check Firestore emulator UI at http://localhost:4445

### Step 7: Deploy to Production

See the deployment section in `docs/firestore-registration-implementation-plan.md`.

## Key Features Implemented

### ✅ Data Model
- **Student**: First/last name, DOB, gender, full US address
- **Guardians**: Primary (required) + Secondary (optional) with relationship types
- **Public School**: Name (dropdown with "Other"), district, dynamic academic year, grade
- **Tamil School**: Last year grade, which school, enrolling grade, assessment needed
- **Metadata**: Submission ID, timestamps, status tracking, deduplication

### ✅ Duplicate Detection
- 24-hour window based on: primary email + student name + DOB
- Returns 409 Conflict if duplicate found
- Prevents accidental double submissions

### ✅ Data Validation
- Server-side: Go validator with comprehensive rules
- Client-side: Zod schemas with real-time feedback
- Phone normalization to E.164 format (+1XXXXXXXXXX)
- Email normalization to lowercase

### ✅ Security
- Firestore rules allow public create, admin-only read
- No authentication required for registration (as requested)
- IP address tracking for abuse prevention
- CORS-ready handler

## Data Model Summary

Based on your refined requirements, here's what gets stored:

```text
{
  student: {
    firstName: "John",
    lastName: "Doe",
    dateOfBirth: "2015-05-15",
    gender: "Male",
    address: {
      line1: "123 Main St",
      line2: "Apt 4B",
      city: "San Diego",
      state: "CA",
      zip: "92101"
    }
  },
  guardians: {
    primary: {
      firstName: "Jane",
      lastName: "Doe",
      relationship: "Mother",
      email: "jane.doe@example.com",
      phone: "+16195551234",
      employer: "Acme Corp"
    },
    secondary: {
      firstName: "John",
      lastName: "Doe",
      relationship: "Father",
      email: "john.doe@example.com",
      phone: "+16195551235"
    }
  },
  school: {
    public: {
      name: "Design 39",
      district: "Poway Unified School District",
      academicYear: "2025-2026",
      grade: "Grade-5"
    },
    tamil: {
      lastYearGrade: "4",
      lastYearSchool: "GSDTA",
      enrollingGrade: "5",
      needsAssessment: false
    }
  },
  metadata: {
    submissionId: "REG-2025-123456",
    createdAt: "2025-10-22T10:30:00Z",
    updatedAt: "2025-10-22T10:30:00Z",
    status: "submitted",
    source: "web",
    dedupKey: "abc123...",
    ipAddress: "203.0.113.42",
    userAgent: "Mozilla/5.0..."
  }
}
```

## File Structure Created

```
C:\projects\gsdta\gsdta-web\
├── persistence/
│   ├── firestore.rules
│   └── firestore.indexes.json
├── docs/
│   ├── firestore-registration-implementation-plan.md
│   └── registration-data-model-analysis.md
├── api/
│   └── internal/
│       ├── domain/
│       │   └── registration.go
│       ├── storage/
│       │   └── firestore/
│       │       ├── client.go
│       │       └── registration.go
│       └── http/
│           └── handlers/
│               └── registration.go
└── ui/
    └── src/
        ├── types/
        │   └── registration.ts
        └── lib/
            ├── validation/
            │   └── registration.ts
            └── api/
                └── registration.ts
```

## Common Issues & Solutions

### Issue: Firestore emulator won't start
**Solution:** Make sure port 8080 is not in use. Change port in firebase.json if needed.

### Issue: Go can't find Firestore package
**Solution:** Run `go mod tidy` and ensure you have internet connection for downloads.

### Issue: CORS errors in browser
**Solution:** Add CORS middleware to your API (instructions in implementation plan).

### Issue: Duplicate detection not working
**Solution:** Ensure emulator is running and FIRESTORE_EMULATOR_HOST env var is set.

## What to Do Next

1. **Review the implementation plan**: `docs/firestore-registration-implementation-plan.md`
2. **Set up GCP Firestore** following Step 1 above
3. **Install local emulator** following Step 2 above
4. **Update API dependencies** following Step 3 above
5. **Wire up the handler** following Step 4 above
6. **Ask me to build the UI form** - I can create the complete registration form component

## Need Help?

The implementation plan has detailed step-by-step instructions for:
- Complete GCP setup (assumes no prior GCP knowledge)
- API implementation details
- UI form structure
- Testing strategies
- Deployment procedures

Would you like me to:
1. Create the complete UI registration form now?
2. Help with any specific setup step?
3. Create unit tests for the Go code?
4. Set up the Firebase emulator configuration?

Just let me know what you'd like to tackle next!
