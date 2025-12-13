# Teacher Assignment Page - Implementation Checklist

**Status**: 🟡 Planning Complete - Ready for Implementation  
**Created**: December 13, 2025  
**Est. Time**: 4-6 hours

---

## 📋 Pre-Implementation Checklist

- [x] Problem identified and documented
- [x] Solution designed with mockup
- [x] Requirements documented
- [x] Technical architecture defined
- [x] ROLES.md updated
- [x] GRADES-CLASSES-IMPLEMENTATION.md updated
- [ ] Review plan with team/stakeholders

---

## 🔍 Phase 1: Verify Backend (30 mins)

### Check API Endpoints Exist
- [ ] `GET /api/v1/admin/classes` - Returns all classes
- [ ] `GET /api/v1/admin/teachers?status=active` - Returns active teachers
- [ ] `POST /api/v1/admin/classes/[id]/teachers` - Assign teacher
- [ ] `DELETE /api/v1/admin/classes/[id]/teachers/[teacherId]` - Remove teacher
- [ ] `PATCH /api/v1/admin/classes/[id]/teachers/[teacherId]` - Update role

### Test Endpoints
- [ ] Test assign primary teacher
- [ ] Test assign assistant teacher
- [ ] Test remove teacher
- [ ] Test change teacher role
- [ ] Verify error handling

### Issues Found
```
# Document any missing endpoints or bugs here
```

---

## 🎨 Phase 2: Create Basic UI (2 hours)

### File Creation
- [ ] Create `ui/src/app/admin/teachers/assign/page.tsx`
- [ ] Add to git tracking

### Basic Functionality
- [ ] Fetch all active classes
- [ ] Fetch all active teachers
- [ ] Display classes in cards/list
- [ ] Add primary teacher dropdown per class
- [ ] Implement dropdown selection handler
- [ ] Call API on teacher selection
- [ ] Show loading state during save
- [ ] Display success indicator (checkmark)
- [ ] Display error message on failure

### Testing Phase 2
- [ ] Can see all classes
- [ ] Can select primary teacher
- [ ] Selection saves to backend
- [ ] Success indicator shows
- [ ] Errors are displayed

---

## 👥 Phase 3: Assistant Teachers (1 hour)

### Features
- [ ] Add "+ Add Assistant" button per class
- [ ] Show assistant teacher dropdown on click
- [ ] Allow multiple assistants per class
- [ ] Add remove button for each assistant
- [ ] Display current assistants
- [ ] Implement add assistant API call
- [ ] Implement remove assistant API call

### Testing Phase 3
- [ ] Can add assistant teacher
- [ ] Can add multiple assistants
- [ ] Can remove assistant
- [ ] Cannot add duplicate assistant
- [ ] Cannot add same teacher as primary and assistant

---

## 🔍 Phase 4: Filters & Workload (1 hour)

### Filtering
- [ ] Add grade filter dropdown
- [ ] Implement filter logic
- [ ] Add "Show Unassigned Only" toggle
- [ ] Implement unassigned filter logic
- [ ] Add academic year filter (optional)

### Teacher Workload
- [ ] Calculate workload from classes data
- [ ] Display workload summary section
- [ ] Show primary count per teacher
- [ ] Show assistant count per teacher
- [ ] Show total classes per teacher
- [ ] Sort by workload (optional)

### Visual Indicators
- [ ] Add checkmark icon for assigned classes
- [ ] Add warning icon for unassigned classes
- [ ] Add badge showing teacher count per class
- [ ] Color code by status (optional)

### Testing Phase 4
- [ ] Grade filter works correctly
- [ ] Unassigned filter works correctly
- [ ] Workload calculation is accurate
- [ ] Visual indicators display correctly

---

## ✨ Phase 5: Polish & Testing (1 hour)

### Navigation
- [ ] Update `AdminLayoutClient.tsx`
- [ ] Add "Assign to Classes" menu item under Teachers
- [ ] Set correct icon (📋)
- [ ] Test navigation works

### UI Polish
- [ ] Ensure responsive design (mobile-friendly)
- [ ] Add proper spacing and padding
- [ ] Add hover states
- [ ] Add focus states for accessibility
- [ ] Add keyboard navigation support
- [ ] Add empty state message
- [ ] Add loading skeleton (optional)

### Error Handling
- [ ] Show friendly error messages
- [ ] Add retry button for failed saves
- [ ] Handle network errors
- [ ] Handle validation errors
- [ ] Handle permission errors

### Edge Cases
- [ ] No classes available
- [ ] No teachers available
- [ ] All teachers assigned to all classes
- [ ] Removing primary teacher from class
- [ ] Changing primary teacher (old becomes unassigned)
- [ ] Slow network (loading states)
- [ ] API errors (error states)

### Testing Phase 5
- [ ] Works on mobile devices
- [ ] Works on tablet devices
- [ ] Works on desktop
- [ ] Keyboard navigation works
- [ ] Screen reader compatible (basic)
- [ ] All edge cases handled

---

## 📝 Documentation Updates

- [ ] Add JSDoc comments to component
- [ ] Update README if needed
- [ ] Add feature to FEATURES.md
- [ ] Update PROJECT-STATUS.md
- [ ] Take screenshots for documentation

---

## 🚀 Deployment Checklist

- [ ] Code reviewed
- [ ] All tests passing
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Build succeeds
- [ ] Works in production build
- [ ] Tested with real data
- [ ] Tested with edge cases
- [ ] Navigation updated
- [ ] Documentation complete

---

## ✅ Definition of Done

- [ ] Admin can navigate to /admin/teachers/assign
- [ ] Admin can see all active classes
- [ ] Admin can assign primary teacher using dropdown
- [ ] Admin can add/remove assistant teachers
- [ ] Changes save automatically without submit button
- [ ] Visual feedback shows save status (loading/success/error)
- [ ] Teacher workload summary is displayed
- [ ] Can filter by grade level
- [ ] Can show unassigned classes only
- [ ] Page is responsive (mobile, tablet, desktop)
- [ ] All error cases handled gracefully
- [ ] Navigation menu updated
- [ ] Documentation updated
- [ ] Code deployed to production

---

## 📊 Progress Tracking

**Started**: _________  
**Phase 1 Complete**: _________  
**Phase 2 Complete**: _________  
**Phase 3 Complete**: _________  
**Phase 4 Complete**: _________  
**Phase 5 Complete**: _________  
**Deployed**: _________

**Total Time Spent**: _________ hours

---

## 🐛 Issues & Blockers

```
# Document issues here as they arise

Issue #1:
Description:
Resolution:
Time Lost:

Issue #2:
Description:
Resolution:
Time Lost:
```

---

## 💡 Future Improvements (Out of Scope)

- [ ] Drag-and-drop teacher assignment
- [ ] Teacher availability calendar
- [ ] Conflict detection (time slots)
- [ ] Bulk assignment tools
- [ ] Import/export functionality
- [ ] Email notifications
- [ ] Assignment history/audit log
- [ ] Teacher preference matching
