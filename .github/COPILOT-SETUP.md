# GitHub Copilot CLI Instructions Setup

**Date**: December 7, 2025  
**Status**: Complete ✅

---

## What Was Done

We migrated custom AI instructions to GitHub Copilot CLI's standard format.

### Files Created

#### 1. Global Repository Instructions
```
.github/copilot-instructions.md
```
- **Purpose**: Applies to ALL Copilot features (chat, agents, CLI)
- **Content**: Tech stack, core principles, project structure, patterns, testing
- **Size**: ~10KB

#### 2. Agent Instructions
```
AGENTS.md (at repo root)
```
- **Purpose**: Loaded by Copilot agents for general behavior
- **Content**: Model-specific guidelines (Claude, Gemini, OpenAI), patterns, checklists
- **Size**: ~10KB

#### 3. Path-Specific Instructions
```
.github/instructions/backend.instructions.md
.github/instructions/frontend.instructions.md
```
- **Purpose**: Apply to specific file paths
- **Content**: 
  - `backend.instructions.md`: API patterns, auth, validation, Firestore (applies to `api/**/*.{ts,js}`)
  - `frontend.instructions.md`: React patterns, forms, routing, styling (applies to `ui/**/*.{ts,tsx,js,jsx}`)
- **Size**: ~7KB (backend), ~10KB (frontend)

### Previous Custom Files

```
.ai-instructions/
  ├── CHATGPT-INSTRUCTIONS.md
  ├── CLAUDE-INSTRUCTIONS.md
  ├── GEMINI-INSTRUCTIONS.md
  └── README.md
```

**Status**: ✅ **REMOVED** (December 7, 2025)
**Reason**: All content migrated to GitHub Copilot format. Legacy folder was:
- Not read by GitHub Copilot CLI
- Creating maintenance duplication
- Preserved in git history if ever needed

---

## How GitHub Copilot Reads Instructions

### Automatic Loading Order

1. **Global** → `.github/copilot-instructions.md`
2. **Agent-specific** → `AGENTS.md`
3. **Path-specific** → `.github/instructions/*.instructions.md` (based on file being edited)

### Frontmatter in Path-Specific Files

```markdown
---
applyTo: "api/**/*.{ts,js}"
excludeAgent: "code-review" # optional
---

# Instructions for API files
...
```

- `applyTo`: Glob pattern for which files these instructions apply to
- `excludeAgent`: Optional, exclude specific agents

---

## Verification

### Check What Copilot Loaded

From the repo root, ask GitHub Copilot CLI:

> "Summarize the instruction files you've loaded for this repo."

**Expected Response** should mention:
- `.github/copilot-instructions.md`
- `AGENTS.md`
- `.github/instructions/backend.instructions.md` (when in `api/` files)
- `.github/instructions/frontend.instructions.md` (when in `ui/` files)

### Test Instructions

1. **Open a file in `api/`**:
   - Ask: "What patterns should I follow for API endpoints?"
   - Should mention: requireRole, Zod validation, error handling

2. **Open a file in `ui/`**:
   - Ask: "How should I structure React components?"
   - Should mention: 'use client', useState, loading/error states

3. **Ask general questions**:
   - "What's the tech stack?"
   - "How do I run tests?"
   - Should reference global instructions

---

## Content Overview

### Global Instructions (.github/copilot-instructions.md)

✓ Project overview (tech stack, architecture)  
✓ Core principles (incremental, security, quality, data integrity)  
✓ Project structure  
✓ Development workflow  
✓ Common code patterns (API, React)  
✓ Testing with Firebase Emulators  
✓ Important rules (Always/Never dos)  
✓ Common commands  
✓ Environment variables  
✓ Success criteria  

### Agent Instructions (AGENTS.md)

✓ General agent behavior  
✓ Model-specific guidelines:
  - Claude: Deep reasoning, incremental changes
  - Gemini: Firebase expertise, concise solutions
  - OpenAI: Balanced approach, structured answers  
✓ Common patterns for all agents  
✓ Testing guidelines  
✓ Firestore best practices  
✓ Security checklist  
✓ Documentation checklist  
✓ Code review standards  
✓ Questions to ask before coding  

### Backend Instructions (.github/instructions/backend.instructions.md)

✓ API structure (v1, routing)  
✓ Authentication middleware (`requireRole`)  
✓ Input validation (Zod)  
✓ Response format (standardized)  
✓ Error handling patterns  
✓ Firestore operations  
✓ Testing guidelines  
✓ API documentation (OpenAPI)  
✓ Common mistakes to avoid  

### Frontend Instructions (.github/instructions/frontend.instructions.md)

✓ Component structure  
✓ Server vs Client Components  
✓ API calls with authentication  
✓ Form handling with validation  
✓ Authentication (useAuth)  
✓ Styling with Tailwind  
✓ Loading & error states  
✓ Routing (Next.js App Router)  
✓ TypeScript best practices  
✓ Testing  

---

## Benefits

### ✅ Standardized
- Uses GitHub's official instruction format
- Works seamlessly with Copilot CLI
- Automatic loading based on context

### ✅ Organized
- Global vs path-specific separation
- Clear hierarchy
- Easy to maintain

### ✅ Comprehensive
- ~37KB of guidance total
- Covers all aspects of development
- Model-specific optimizations

### ✅ Contextual
- Backend instructions apply in `api/`
- Frontend instructions apply in `ui/`
- Global instructions always available

---

## Maintenance

### When to Update

**Update `.github/copilot-instructions.md`** when:
- Tech stack changes
- Core principles change
- Project structure changes
- Common patterns change

**Update `AGENTS.md`** when:
- Agent behavior needs adjustment
- Model-specific patterns change
- Security/testing checklists change

**Update path-specific instructions** when:
- API patterns change (backend)
- Component patterns change (frontend)
- New best practices emerge

### How to Update

1. Edit the relevant `.md` file
2. Commit and push
3. GitHub Copilot will load the new version automatically
4. Verify with: "Summarize your instructions"

---

## Migration Notes

### What Was Migrated

All content from `.ai-instructions/` was migrated to GitHub Copilot format:

- **Common content** → `.github/copilot-instructions.md`
- **Model-specific** → `AGENTS.md` (with sections per model)
- **Backend-specific** → `.github/instructions/backend.instructions.md`
- **Frontend-specific** → `.github/instructions/frontend.instructions.md`

### What Was Removed

**`.ai-instructions/` folder** ✅ **DELETED** (December 7, 2025)

**Why removed:**
- GitHub Copilot CLI doesn't read this folder format
- All content successfully migrated to official format
- Eliminated maintenance duplication
- Still available in git history if ever needed:
  ```bash
  git log -- .ai-instructions/
  git show HEAD~1:.ai-instructions/CLAUDE-INSTRUCTIONS.md
  ```

### Single Source of Truth

Now we have **one canonical location** for AI instructions:
- **`.github/copilot-instructions.md`** - Global guidance
- **`AGENTS.md`** - Agent-specific behavior
- **`.github/instructions/*.instructions.md`** - Path-specific patterns

---

## Quick Reference

### File Locations

```
gsdta-web/
├── .github/
│   ├── copilot-instructions.md          # Global (all features)
│   ├── COPILOT-SETUP.md                 # This documentation
│   └── instructions/
│       ├── backend.instructions.md       # API files (api/**)
│       └── frontend.instructions.md      # UI files (ui/**)
└── AGENTS.md                             # Agent behavior
```

### When Instructions Apply

| Working on... | Copilot Loads... |
|---------------|------------------|
| Any file | `.github/copilot-instructions.md` + `AGENTS.md` |
| `api/src/routes/students.ts` | + `backend.instructions.md` |
| `ui/src/components/StudentForm.tsx` | + `frontend.instructions.md` |

---

## Testing Your Setup

```bash
# 1. Navigate to repo
cd /path/to/gsdta-web

# 2. Open Copilot CLI
gh copilot

# 3. Ask diagnostic questions
? "What instruction files have you loaded?"
? "What's the tech stack for this project?"
? "How should I structure an API endpoint?"
? "How should I structure a React component?"

# If answers reference the correct patterns, setup is working! ✅
```

---

**Setup Complete! GitHub Copilot CLI is now fully configured.** 🎉

