# Repository Restructuring Guide

## Goal

Reorganize the repository to separate UI and API code while keeping both in a single Docker image.

## Manual Steps (Required First)

### 1. Close Your IDE

### 2. Rename Root Folder

- Navigate to: `C:\projects\gsdta\`
- Rename: `ui` → `gsdta-web`

### 3. Create New Folders

Inside `C:\projects\gsdta\gsdta-web\`, create:

- `ui\`
- `api\`

### 4. Move UI Files to `ui\` folder

Move these files/folders from root to `ui\`:

```
src/
public/
tests/
scripts/
assets/
playwright-report/
test-results/
.next/
.swc/
.husky/
node_modules/
out/
package.json
package-lock.json
next.config.ts
next-env.d.ts
tsconfig.json
tsconfig.tsbuildinfo
jest.config.cjs
jest.setup.ts
playwright.config.ts
eslint.config.mjs
postcss.config.mjs
commitlint.config.cjs
.prettierrc
.prettierignore
.env.example
.env.local
thirukkural.json
public_contents.json
public_data_contents.json
repo_contents.json
search_results.json
```

### 5. Move API Files to `api\` folder

Move from `gsdta\api\api\` to `api\`:

```
main.go
go.mod
go.sum (if exists)
```

Then delete the empty `gsdta\` folder.

### 6. Keep at Root Level (DON'T MOVE)

Keep these at `C:\projects\gsdta\gsdta-web\`:

```
.github/
docs/
Dockerfile
Dockerfile.dev
docker-compose.yml
docker.bat
docker.sh
DOCKER.md
entrypoint.sh
.git/
.gitignore
.gitattributes
.dockerignore
.idea/
README.md
LICENSE
```

## Final Structure

```
C:\projects\gsdta\gsdta-web\
├── .github/
│   └── workflows/
│       └── ci.yml                    # ✏️ UPDATE
├── ui/
│   ├── src/
│   ├── public/
│   ├── tests/
│   ├── scripts/
│   ├── package.json                  # ✏️ UPDATE scripts
│   ├── next.config.ts
│   ├── tsconfig.json
│   └── ... (all Next.js files)
├── api/
│   ├── main.go
│   └── go.mod
├── docs/
│   └── ... (documentation)           # ✏️ UPDATE references
├── Dockerfile                         # ✏️ UPDATE paths
├── Dockerfile.dev                     # ✏️ UPDATE paths
├── docker-compose.yml                 # ✏️ UPDATE paths
├── entrypoint.sh                      # ✏️ UPDATE (minor)
├── README.md                          # ✏️ UPDATE
└── ... (other root config files)
```

## Files That Need Updates (automated after manual steps)

After completing the manual steps and reopening the workspace:

1. **Dockerfile** - Update all COPY and WORKDIR paths
2. **Dockerfile.dev** - Update paths for dev environment
3. **docker-compose.yml** - Update build context and volume paths
4. **entrypoint.sh** - Update paths if needed
5. **.github/workflows/ci.yml** - Update working directories and paths
6. **README.md** - Update documentation
7. **docs/*.md** - Update any hardcoded paths
8. **.dockerignore** - Update patterns if needed
9. **Create new package.json scripts** at root for managing both UI and API

## After Manual Steps Complete

1. Reopen IDE at: `C:\projects\gsdta\gsdta-web\`
2. Notify the AI assistant to update all configuration files
3. Test the Docker build: `docker build -t gsdta-web .`
4. Test docker-compose: `docker-compose up`
5. Verify both services run on ports 3000 (Next.js) and 8080 (Go API)

