export type Lang = "en" | "ta";

export const messages: Record<Lang, Record<string, string>> = {
    en: {
        // Nav
        "nav.home": "Home",
        "nav.dashboard": "Dashboard",
        "nav.students": "Students",
        "nav.classes": "Classes",
        "nav.enrollment": "Enrollment",
        "nav.logout": "Logout",
        "nav.login": "Login",
        "nav.role": "Switch role",
        // New public nav
        "nav.about": "About us",
        "nav.register": "Register",
        "nav.team": "Team",
        "nav.documents": "Documents",
        "nav.calendar": "Calendar",
        "nav.textbooks": "Text books",
        "nav.donate": "Donate",
        "nav.contact": "Contact Us",

        // Brand
        "brand.full": "Greater San Diego Tamil Academy",
        "brand.short": "GSDTA",
        "brand.tagline": "Non-profit 501(c)(3) Tax Exempt Organization",

        // Footer / Sections
        "footer.quick": "Quick links",
        "footer.contact": "Contact",

        "sections.about": "About GSDTA",
        "sections.programs": "Programs",
        "sections.programs.seeAll": "See all classes →",
        "sections.why": "Why choose us",
        "sections.testimonials": "What families say",
        "sections.events": "Events",
        "sections.events.viewAll": "View all events →",
        "sections.faculty": "Faculty",

        // CTA
        "cta.enroll": "Enroll Now",
        "cta.viewClasses": "View Classes",
        "cta.ready.title": "Ready to get started?",
        "cta.ready.body": "Browse classes and submit your enrollment in minutes.",

        // Hero
        "hero.title": "Tamil education for the next generation",
        "hero.body": "Language, culture, arts, literature — welcoming, high-quality Tamil education for your child in a nurturing environment.",

        // Language Switcher
        "lang.label": "Language",
        "lang.en": "English",
        "lang.ta": "தமிழ்",

        // About Us Page
        "about.title": "About Us",
        "about.mission.title": "Our Mission",
        "about.mission.organization": "The Greater San Diego Tamil Academy (GSDTA)",
        "about.mission.description": "The Greater San Diego Tamil Academy (GSDTA) is dedicated to fostering a vibrant community through the promotion of Tamil language and culture. As a nonprofit, non-political, non-sectarian, and non-religious organization, we strive to provide educational and cultural programs that benefit both our members and the broader society.",
        "about.coreValues.title": "Core Values",
        "about.coreValues.value1": "Providing continuous and structured programs and courses in Tamil language and culture to enhance language learning and promote cultural awareness and appreciation.",
        "about.coreValues.value2": "Encouraging cultural diversity to foster mutual understanding and appreciation between Tamil culture and other cultures.",
        "about.coreValues.value3": "Offering college guidance and career mentoring to high school students.",
        "about.coreValues.value4": "Engaging in cultural exchanges and civic activities with various entities, including governments, public schools, corporations, and community organizations, to strengthen the participation of local Tamil communities in mainstream society.",

        // Home Carousel
        "home.carousel.title": "Highlights",
        "home.carousel.hero.title": "Empowering Tamil Heritage Through Education",
        "home.carousel.hero.description": "Join our vibrant community of Tamil learners",
        "home.carousel.impact.title": "Making a Real Impact",
        "home.carousel.impact.description": "Transforming lives through Tamil education and cultural preservation",
        "home.carousel.impact.students": "200+ Students",
        "home.carousel.impact.teachers": "45 Teachers",
        "home.carousel.impact.experience": "200+ Years Experience",
        "home.carousel.impact.volunteers": "25+ Volunteers",
        "home.carousel.programs.title": "Comprehensive Tamil Programs",
        "home.carousel.programs.description": "From beginner to advanced levels, plus cultural activities",
        "home.carousel.programs.link": "View Classes",
        "home.carousel.culture.title": "Celebrating Tamil Culture",
        "home.carousel.culture.description": "Festivals, arts, music, and traditional celebrations",
        "home.carousel.community.title": "Strong Community Support",
        "home.carousel.community.description": "Parents, volunteers, and families working together",
        "home.carousel.success.title": "Student Success Stories",
        "home.carousel.success.description": "Our students thrive in language and cultural knowledge",
        "home.carousel.stem.title": "STEM Workshops",
        "home.carousel.stem.description": "Hands-on learning that inspires curiosity and innovation",
        "home.carousel.cta.title": "Ready to Join Us?",
        "home.carousel.cta.description": "Enroll today and become part of our Tamil learning community",
        "home.carousel.cta.button": "Enroll Now",

        // Motto
        "motto.title": "Let's Learn, Let's Teach!",

        // Flashcards
        "flashcards.card1": "Join our Language Classes to learn Tamil with ease.",
        "flashcards.card2": "Support our community and grow with Tamil heritage.",
        "flashcards.card3": "Welcome to Tamil Academy - Promoting Tamil Culture and Language.",
        "flashcards.card4": "Celebrate Tamil Culture through vibrant events and workshops.",

        // Announcement
        "announcement.construction": "⚠️ This site is under construction. For the latest information, please visit www.gsdta.org ⚠️",

        // Footer (extended)
        "footer.orgTitle": "Organization",
        "footer.teamTitle": "Team",
        "footer.documentsTitle": "Documents",
        "footer.contactTitle": "Contact",
        "footer.aboutUs": "About Us",
        "footer.registerNow": "Registration Open Now",
        "footer.board": "Board Members",
        "footer.executives": "Executive Committee",
        "footer.teachers": "Teachers",
        "footer.taxExempt": "501(c)(3) Tax Exempt",
        "footer.bylaws": "Bylaws",
        "footer.rights": "All rights reserved.",

        // Common
        "common.comingSoon": "Coming soon.",
        "common.loading": "Loading...",
        "common.loading.classes": "Loading classes...",
        "common.loading.enrollments": "Loading enrollments...",

        // Textbooks page
        "textbooks.pageTitle": "Academic Year 2025-26 – Text Books",
        "textbooks.instructions": "Choose a grade to explore textbooks and homework for the 2025-26 school year.",
        "textbooks.gradeSelectorLabel": "Textbook grades",
        "textbooks.resourcesTitle": "Resources for {grade}",
        "textbooks.resourcesSubtitle": "Select a textbook or homework to open it in the viewer.",
        "textbooks.selectResourcePrompt": "Select a textbook or homework to view it.",
        "textbooks.noGradeSelected": "Select a grade to view textbooks.",
        "textbooks.viewerTitle": "{grade} – {resource}",
        "common.notAvailableYet": "are not available yet.",
        "common.publishSoon": "We'll publish them here soon.",
        "common.openInNewTab": "Open in new tab",
        "common.downloadPdf": "Download PDF",
        "common.legend": "Legend",

        // Documents page
        "documents.title": "Documents",
        "documents.bylaws": "By Laws",
        "documents.taxExempt": "501(c)(3) Tax Exempt",
        "documents.financials": "Financial Reports",

        // Team page
        "team.title": "Team",
        "team.board": "Board",
        "team.executives": "Executives",
        "team.teachers": "Teachers",
        "team.volunteers": "Volunteers",
        "team.faq": "FAQ",
        "team.more": "More...",
        "team.close": "Close",
        "team.ourTeachers": "Our Teachers",
        "team.assistantTeachers": "Assistant Teachers",

        // Calendar page
        "calendar.download": "Download Calendar",
        "calendar.file.ics": "Calendar File (.ics)",
        "calendar.file.xlsx": "Excel File (.xlsx)",
        "calendar.file.ics.desc": "Import into Google Calendar, Apple Calendar, Outlook",
        "calendar.file.xlsx.desc": "Original spreadsheet format",
        "calendar.controls.today": "Today",
        "calendar.controls.previous": "Previous",
        "calendar.controls.next": "Next",
        "calendar.view.month": "Month",
        "calendar.view.week": "Week",
        "calendar.view.agenda": "Agenda",
        "calendar.event.gsdta": "⭐ GSDTA Event",
        "calendar.event.indiaHoliday": "🇮🇳 Holiday",
        "calendar.event.longWeekend": "📅 Long Weekend",
        "calendar.event.kg1Test": "KG/1 Test Week",
        "calendar.event.gradesTest": "Grades 2-8 Test Week",
        "calendar.label.kg1": "KG & Grade 1:",
        "calendar.label.grades": "Grade 2-8:",
        "calendar.legend.events": "GSDTA Events",
        "calendar.legend.tests": "Tests/Revision",
        "calendar.legend.india": "India Holidays",
        "calendar.legend.weekends": "Long Weekends",
        "calendar.stats.tests": "Test Weeks",

        // Classes page
        "classes.title": "Classes",
        "classes.subtitle": "View class schedules and rosters.",
        "classes.level": "Level:",
        "classes.schedule": "Schedule:",
        "classes.teacher": "Teacher:",
        "classes.enrollment": "Enrollment:",
        "classes.students": "students",

        // Dashboard/Login
        "dashboard.title": "Dashboard",
        "dashboard.welcome": "Welcome to your dashboard.",
        "login.title": "Login",
        "login.selectRole": "Select a role to sign in (mocked):",
        "login.role": "Role",
        "login.parent": "Parent",
        "login.teacher": "Teacher",
        "login.admin": "Admin",
        "login.signingIn": "Signing in…",
        "login.signIn": "Sign in",

        // Students list
        "students.title": "Students",
        "students.add": "Add student",
        "students.loading": "Loading students…",
        "students.name": "Name",
        "students.dob": "DOB",
        "students.priorLevel": "Prior level",
        "students.actions": "Actions",
        "students.edit": "Edit",

        // Enrollment page (basic)
        "enrollment.title": "Class Enrollment",
        "enrollment.subtitle": "Apply for classes and track your enrollment applications.",
        "enrollment.apply": "Apply for a Class",
    },
    ta: {
        // Nav
        "nav.home": "முகப்பு",
        "nav.dashboard": "கட்டுப்பலகை",
        "nav.students": "மாணவர்கள்",
        "nav.classes": "வகுப்புகள்",
        "nav.enrollment": "சேர்க்கை",
        "nav.logout": "வெளியேறு",
        "nav.login": "உள்நுழைவு",
        "nav.role": "பங்கை மாற்றவும்",
        // New public nav
        "nav.about": "எங்களைப் பற்றி",
        "nav.register": "பதிவுசெய்க",
        "nav.team": "குழு",
        "nav.documents": "ஆவணங்கள்",
        "nav.calendar": "நாட்காட்டி",
        "nav.textbooks": "பாடப்புத்தகங்கள்",
        "nav.donate": "நன்கொடை",
        "nav.contact": "தொடர்பு",

        // Brand
        "brand.full": "GSDTA",
        "brand.short": "GSDTA",
        "brand.tagline": "Non-profit 501(c)(3) Tax Exempt Organization",

        // Footer / Sections
        "footer.quick": "விரைவு இணைப்புகள்",
        "footer.contact": "தொடர்பு",

        "sections.about": "எங்களைப் பற்றி",
        "sections.programs": "நிகழ்வுகள்",
        "sections.programs.seeAll": "அனைத்து வகுப்புகளும் →",
        "sections.why": "ஏன் எங்களைத் தேர்ந்தெடுக்க வேண்டும்?",
        "sections.testimonials": "பெற்றோர் கருத்துக்கள்",
        "sections.events": "நிகழ்வுகள்",
        "sections.events.viewAll": "அனைத்து நிகழ்வுகளும் →",
        "sections.faculty": "ஆசிரியர்கள்",

        // CTA
        "cta.enroll": "உடனே சேருங்கள்",
        "cta.viewClasses": "வகுப்புகளைப் பாருங்கள்",
        "cta.ready.title": "தொடங்கத் தயாரா?",
        "cta.ready.body": "வகுப்புகளைப் பார்வையிட்டு, சேர்க்கையைச் சில நிமிடங்களில் முடித்துவிடுங்கள்.",

        // Hero
        "hero.title": "குழந்தைகளுக்கான தமிழ்ப்பயிற்சி",
        "hero.body": "எழுத்து, வாசிப்பு, பேச்சு, எழுதுதல்—நவீனக் கற்றல்முறைகளுடன் தமிழ் கற்போம்.",

        // Language Switcher
        "lang.label": "மொழி",
        "lang.en": "English",
        "lang.ta": "தமிழ்",

        // About Us Page
        "about.title": "எங்களைப் பற்றி",
        "about.mission.title": "எங்கள் நோக்கம்",
        "about.mission.organization": "கிரேட்டர் சான் டியாகோ தமிழ் அகாடமி (GSDTA)",
        "about.mission.description": "கிரேட்டர் சான் டியாகோ தமிழ் அகாடமி (GSDTA), தமிழ் மொழி மற்றும் கலாச்சாரத்தை ஊக்குவிப்பதன் மூலம் துடிப்பான சமூகத்தை வளர்ப்பதில் அர்ப்பணிப்புடன் உள்ளது. இலாப நோக்கமற்ற, அரசியல் சாராத, மதச்சார்பற்ற அமைப்பாக, எங்கள் உறுப்பினர்களுக்கும் பரந்த சமூகத்திற்கும் பயனளிக்கும் கல்வி மற்றும் கலாச்சார திட்டங்களை வழங்க நாங்கள் முயற்சிக்கிறோம்.",
        "about.coreValues.title": "முக்கிய மதிப்புகள்",
        "about.coreValues.value1": "மொழி கற்றலை மேம்படுத்துவதற்கும், கலாச்சார விழிப்புணர்வு மற்றும் பாராட்டுதலை ஊக்குவிப்பதற்கும், தமிழ் மொழி மற்றும் கலாச்சாரத்தில் தொடர்ச்சியான மற்றும் கட்டமைக்கப்பட்ட திட்டங்கள் மற்றும் பாடநெறிகளை வழங்குதல்.",
        "about.coreValues.value2": "தமிழ் கலாச்சாரத்திற்கும் பிற கலாச்சாரங்களுக்கும் இடையே இருதலை(பரஸ்பர) புரிதல் மற்றும் பாராட்டுதலை வளர்ப்பதற்கு கலாச்சார பன்முகத்தன்மையை ஊக்குவித்தல்.",
        "about.coreValues.value3": "உயர்நிலைப் பள்ளி மாணவர்களுக்கு கல்லூரி வழிகாட்டுதல் மற்றும் தொழில் வழிகாட்டுதல் வழங்குதல்.",
        "about.coreValues.value4": "உள்ளூர் தமிழ்ச் சமூகங்களின் பங்களிப்பை பொது நீரோட்டத்தில் வலுப்படுத்தும் நோக்கில், அரசாங்கங்கள், பொதுப் பள்ளிகள், பெருநிறுவனங்கள் மற்றும் சமூக அமைப்புகள் உள்ளிட்ட பல்வேறு தரப்பினருடன் கலாச்சாரப் பரிமாற்றங்கள் மற்றும் குடிமைச் செயல்பாடுகளில் ஈடுபடுதல்.",

        // Home Carousel
        "home.carousel.title": "சிறப்பம்சங்கள்",
        "home.carousel.hero.title": "கல்வியின் மூலம் தமிழ்ப் பாரம்பரியத்தை வலுப்படுத்துவோம்",
        "home.carousel.hero.description": "வாருங்கள், எங்கள் துடிப்பான தமிழ் கற்கும் சமூகத்தில் சேருங்கள்",
        "home.carousel.impact.title": "உண்மையான தாக்கத்தை உருவாக்குதல்",
        "home.carousel.impact.description": "தமிழ் கல்வி மற்றும் கலாச்சார பாதுகாப்பு மூலம் வாழ்க்கையை மாற்றுதல்",
        "home.carousel.impact.students": "200+ மாணவர்கள்",
        "home.carousel.impact.teachers": "45 ஆசிரியர்கள்",
        "home.carousel.impact.experience": "200+ ஆண்டுகள் அனுபவம்",
        "home.carousel.impact.volunteers": "25+ தன்னார்வலர்கள்",
        "home.carousel.programs.title": "விரிவான தமிழ்ப் பாடத் திட்டங்கள்",
        "home.carousel.programs.description": "தொடக்கம் முதல் மேம்பட்ட நிலைகள் வரை, கலாச்சார நடவடிக்கைகளுடன்",
        "home.carousel.programs.link": "வகுப்புகளைப் பார்க்க",
        "home.carousel.culture.title": "தமிழ் கலாச்சாரத்தைக் கொண்டாடுதல்",
        "home.carousel.culture.description": "திருவிழாக்கள், கலைகள், இசை மற்றும் பாரம்பரிய கொண்டாட்டங்கள்",
        "home.carousel.community.title": "வலுவான சமூக ஆதரவு",
        "home.carousel.community.description": "பெற்றோர்கள், தன்னார்வலர்கள் மற்றும் குடும்பங்கள் ஒன்றிணைந்து செயல்படுகின்றனர்",
        "home.carousel.success.title": "மாணவர் வெற்றிக் கதைகள்",
        "home.carousel.success.description": "எங்கள் மாணவர்கள் மொழி மற்றும் கலாச்சார அறிவில் சிறந்து விளங்குகின்றனர்",
        "home.carousel.stem.title": "STEM பட்டறைகள்",
        "home.carousel.stem.description": "ஆர்வத்தையும் புதுமையையும் தூண்டும் நேரடி கற்றல்",
        "home.carousel.cta.title": "இன்னும் சேரலையா ?",
        "home.carousel.cta.description": "இன்றே சேருங்கள், எங்கள் தமிழ் கற்கும் சமூகத்தின் பகுதியாகுங்கள்",
        "home.carousel.cta.button": "உடனே சேருங்கள்",

        // Motto
        "motto.title": "கற்போம் கற்பிப்போம்!",

        // Flashcards
        "flashcards.card1": "எளிதாக தமிழ் கற்க எங்கள் மொழி வகுப்புகளில் சேருங்கள்.",
        "flashcards.card2": "எங்கள் சமூகத்தை ஆதரித்து தமிழ் பாரம்பரியத்துடன் வளருங்கள்.",
        "flashcards.card3": "தமிழ் அகாடமிக்கு வரவேற்கிறோம் - தமிழ் கலாச்சாரத்தையும் மொழியையும் ஊக்குவிக்கிறது.",
        "flashcards.card4": "துடிப்பான நிகழ்வுகள் மற்றும் பட்டறைகள் மூலம் தமிழ் கலாச்சாரத்தைக் கொண்டாடுங்கள்.",

        // Announcement
        "announcement.construction": "⚠️ இந்த தளம் கட்டுமானத்தில் உள்ளது. சமீபத்திய தகவலுக்கு, தயவுசெய்து www.gsdta.org ஐப் பார்வையிடவும் ⚠️",

        // Footer (extended)
        "footer.orgTitle": "அமைப்பு",
        "footer.teamTitle": "குழு",
        "footer.documentsTitle": "ஆவணங்கள்",
        "footer.contactTitle": "தொடர்பு",
        "footer.aboutUs": "எங்களைப் பற்றி",
        "footer.registerNow": "பதிவுகள் திறக்கப்பட்டுள்ளன",
        "footer.board": "குழு உறுப்பினர்கள்",
        "footer.executives": "நிர்வாகக் குழு",
        "footer.teachers": "ஆசிரியர்கள்",
        "footer.taxExempt": "501(c)(3) வரிவிலக்கு",
        "footer.bylaws": "நியம விதிகள்",
        "footer.rights": "அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.",

        // Common
        "common.comingSoon": "விரைவில் வருகிறது.",
        "common.loading": "ஏற்றுகிறது...",
        "common.loading.classes": "வகுப்புகளை ஏற்றுகிறது...",
        "common.loading.enrollments": "சேர்க்கைகளை ஏற்றுகிறது...",

        // Textbooks page
        "textbooks.pageTitle": "2025-26 கல்வியாண்டு – பாடப்புத்தகங்கள்",
        "textbooks.instructions": "2025-26 கல்வியாண்டிற்கான பாடப்புத்தகங்களையும் வீட்டுப்பாடங்களையும் பார்க்க தரத்தைத் தேர்ந்தெடுக்கவும்.",
        "textbooks.gradeSelectorLabel": "பாடப்புத்தக தரங்கள்",
        "textbooks.resourcesTitle": "{grade} க்கான வளங்கள்",
        "textbooks.resourcesSubtitle": "காண்பியில் திறக்க ஒரு பாடப்புத்தகம் அல்லது வீட்டுப்பாடத்தைத் தேர்ந்தெடுக்கவும்.",
        "textbooks.selectResourcePrompt": "ஒரு பாடப்புத்தகம் அல்லது வீட்டுப்பாடத்தைப் பார்க்கத் தேர்ந்தெடுக்கவும்.",
        "textbooks.noGradeSelected": "பாடப்புத்தகங்களை பார்க்க தரத்தைத் தேர்ந்தெடுக்கவும்.",
        "textbooks.viewerTitle": "{grade} – {resource}",
        "common.notAvailableYet": "இன்னும் கிடைக்கவில்லை.",
        "common.publishSoon": "விரைவில் வெளியிடப்படும்.",
        "common.openInNewTab": "புதிய தாவலில் திறக்க",
        "common.downloadPdf": "PDF ஐ பதிவிறக்கவும்",
        "common.legend": "விளக்கம்",

        // Documents page
        "documents.title": "ஆவணங்கள்",
        "documents.bylaws": "நியம விதிகள்",
        "documents.taxExempt": "501(c)(3) வரிவிலக்கு",
        "documents.financials": "நிதி அறிக்கைகள்",

        // Team page
        "team.title": "குழு",
        "team.board": "மன்றம்",
        "team.executives": "நிர்வாகம்",
        "team.teachers": "ஆசிரியர்கள்",
        "team.volunteers": "தன்னார்வலர்கள்",
        "team.faq": "அடிக்கடி கேட்கப்படும் கேள்விகள்",
        "team.more": "மேலும்...",
        "team.close": "மூடு",
        "team.ourTeachers": "எங்கள் ஆசிரியர்கள்",
        "team.assistantTeachers": "உதவி ஆசிரியர்கள்",

        // Calendar page
        "calendar.download": "நாட்காட்டியை பதிவிறக்கவும்",
        "calendar.file.ics": "நாட்காட்டி கோப்பு (.ics)",
        "calendar.file.xlsx": "எக்செல் கோப்பு (.xlsx)",
        "calendar.file.ics.desc": "Google Calendar, Apple Calendar, Outlook இற்கு இறக்குமதி செய்ய",
        "calendar.file.xlsx.desc": "மூல அட்டவணை வடிவம்",
        "calendar.controls.today": "இன்று",
        "calendar.controls.previous": "முன்",
        "calendar.controls.next": "அடுத்து",
        "calendar.view.month": "மாதம்",
        "calendar.view.week": "வாரம்",
        "calendar.view.agenda": "அஜெண்டா",
        "calendar.event.gsdta": "⭐ GSDTA நிகழ்வு",
        "calendar.event.indiaHoliday": "🇮🇳 விடுமுறை",
        "calendar.event.longWeekend": "📅 நீண்ட வாரநாள்",
        "calendar.event.kg1Test": "KG/1 தேர்வு வாரம்",
        "calendar.event.gradesTest": "2-8 வகுப்புகள் தேர்வு வாரம்",
        "calendar.label.kg1": "KG & Grade 1:",
        "calendar.label.grades": "Grade 2-8:",
        "calendar.legend.events": "GSDTA நிகழ்வுகள்",
        "calendar.legend.tests": "தேர்வுகள்/மீளாய்வு",
        "calendar.legend.india": "இந்தியா விடுமுறை",
        "calendar.legend.weekends": "நீண்ட வார நாட்கள்",
        "calendar.stats.tests": "தேர்வு வாரங்கள்",

        // Classes page
        "classes.title": "வகுப்புகள்",
        "classes.subtitle": "வகுப்பு அட்டவணைகள் மற்றும் பட்டியல்களைப் பார்க்கலாம்.",
        "classes.level": "நிலை:",
        "classes.schedule": "அட்டவணை:",
        "classes.teacher": "ஆசிரியர்:",
        "classes.enrollment": "சேர்க்கை:",
        "classes.students": "மாணவர்கள்",

        // Dashboard/Login
        "dashboard.title": "கட்டுப்பலகை",
        "dashboard.welcome": "உங்கள் கட்டுப்பலகைக்கு வரவேற்கிறோம்.",
        "login.title": "உள்நுழைவு",
        "login.selectRole": "உள்நுழைய பங்கைக் கிளிக் செய்யவும் (mock)",
        "login.role": "பங்கு",
        "login.parent": "பெற்றோர்",
        "login.teacher": "ஆசிரியர்",
        "login.admin": "நிர்வாகி",
        "login.signingIn": "உள்நுழைகிறது…",
        "login.signIn": "உள்நுழைக",

        // Students list
        "students.title": "மாணவர்கள்",
        "students.add": "மாணவரைச் சேர்க்க",
        "students.loading": "மாணவர்களை ஏற்றுகிறது…",
        "students.name": "பெயர்",
        "students.dob": "பிறந்த தேதி",
        "students.priorLevel": "முன்னைய நிலை",
        "students.actions": "நடவடிக்கைகள்",
        "students.edit": "திருத்து",

        // Enrollment page (basic)
        "enrollment.title": "வகுப்பு சேர்க்கை",
        "enrollment.subtitle": "வகுப்புகளுக்கு விண்ணப்பித்து உங்கள் சேர்க்கை நிலையைப் பாருங்கள்.",
        "enrollment.apply": "ஒரு வகுப்பிற்கு விண்ணப்பிக்க",
    },
};
