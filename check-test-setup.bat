@echo off
echo ====================================
echo Test Setup Verification
echo ====================================
echo.

echo Checking Node.js...
node --version
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found!
    exit /b 1
)
echo.

echo Checking npm...
npm --version
if %errorlevel% neq 0 (
    echo ERROR: npm not found!
    exit /b 1
)
echo.

echo ====================================
echo Checking API dependencies...
echo ====================================
cd /d "%~dp0api"
if not exist "node_modules\" (
    echo Installing API dependencies...
    call npm install
) else (
    echo API dependencies already installed
)
echo.

echo ====================================
echo Checking UI dependencies...
echo ====================================
cd /d "%~dp0ui"
if not exist "node_modules\" (
    echo Installing UI dependencies...
    call npm install
) else (
    echo UI dependencies already installed
)
echo.

echo ====================================
echo Verifying test files exist...
echo ====================================
cd /d "%~dp0"

echo Checking API test files...
if exist "api\src\lib\__tests__\roleInvites.test.ts" (
    echo [OK] roleInvites.test.ts
) else (
    echo [MISSING] roleInvites.test.ts
)

if exist "api\src\lib\__tests__\firestoreUsers.test.ts" (
    echo [OK] firestoreUsers.test.ts
) else (
    echo [MISSING] firestoreUsers.test.ts
)

if exist "api\tests\e2e\features\teacher-invites.feature" (
    echo [OK] teacher-invites.feature
) else (
    echo [MISSING] teacher-invites.feature
)

echo.
echo Checking UI test files...
if exist "ui\src\__tests__\TeacherInviteForm.test.tsx" (
    echo [OK] TeacherInviteForm.test.tsx
) else (
    echo [MISSING] TeacherInviteForm.test.tsx
)

if exist "ui\src\__tests__\invite-accept.page.test.tsx" (
    echo [OK] invite-accept.page.test.tsx
) else (
    echo [MISSING] invite-accept.page.test.tsx
)

if exist "ui\tests\e2e\teacher-invites.spec.ts" (
    echo [OK] teacher-invites.spec.ts
) else (
    echo [MISSING] teacher-invites.spec.ts
)

echo.
echo ====================================
echo Test Setup Check Complete!
echo ====================================
echo.
echo You can now run:
echo   - API tests: run-api-tests.bat
echo   - UI tests:  run-ui-tests.bat
echo.
