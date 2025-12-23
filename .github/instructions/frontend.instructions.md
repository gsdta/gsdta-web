---
applyTo: "ui/**/*.{ts,tsx,js,jsx}"
---

# Frontend UI Instructions

## Component Structure

All React components follow this structure:

```typescript
'use client'; // Use for client components only

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  // Define props with TypeScript
  title: string;
  onSave?: (data: FormData) => void;
}

export function ComponentName({ title, onSave }: Props) {
  // 1. Hooks
  const router = useRouter();
  
  // 2. State
  const [data, setData] = useState<DataType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 3. Effects
  useEffect(() => {
    fetchData();
  }, []);
  
  // 4. Handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
  };
  
  // 5. Render conditions
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  // 6. Main render
  return (
    <div className="container">
      {/* Component content */}
    </div>
  );
}
```

## Server vs Client Components

**Server Components (default in Next.js 15):**
```typescript
// No 'use client' directive
// Can fetch data directly
// Cannot use useState, useEffect, onClick, etc.

export default async function Page() {
  const data = await fetchData();
  return <div>{data}</div>;
}
```

**Client Components:**
```typescript
// Must have 'use client' at top
'use client';

import { useState } from 'react';

export function InteractiveButton() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

## API Calls

**Fetch data from API:**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function StudentList() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStudents() {
      try {
        // Get ID token for authentication
        const token = await user?.getIdToken();
        
        const response = await fetch('/api/v1/students', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch students');
        }
        
        const data = await response.json();
        setStudents(data.data.students);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchStudents();
    }
  }, [user]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div>
      {students.map(student => (
        <div key={student.id}>{student.name}</div>
      ))}
    </div>
  );
}
```

## Form Handling

**Form with validation:**

```typescript
'use client';

import { useState } from 'react';
import { z } from 'zod';

const formSchema = z.object({
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  email: z.string().email('Invalid email'),
});

type FormData = z.infer<typeof formSchema>;

export function StudentForm() {
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validate
    const result = formSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof FormData, string>> = {};
      result.error.errors.forEach(err => {
        const field = err.path[0] as keyof FormData;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    
    // Submit
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/v1/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) throw new Error('Failed to save');
      
      // Success - redirect or show message
      alert('Student created successfully!');
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="firstName" className="block text-sm font-medium">
          First Name *
        </label>
        <input
          type="text"
          id="firstName"
          name="firstName"
          value={formData.firstName}
          onChange={handleChange}
          className="mt-1 block w-full rounded border px-3 py-2"
          disabled={isSubmitting}
        />
        {errors.firstName && (
          <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
        )}
      </div>
      
      {/* More fields... */}
      
      <button
        type="submit"
        disabled={isSubmitting}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {isSubmitting ? 'Saving...' : 'Save Student'}
      </button>
    </form>
  );
}
```

## Authentication

**Use AuthContext for user state:**

```typescript
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function ProtectedPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) return <div>Loading...</div>;
  if (!user) return null; // Redirecting...

  return (
    <div>
      <h1>Welcome, {user.displayName}</h1>
      {/* Protected content */}
    </div>
  );
}
```

## Styling with Tailwind

**Use Tailwind CSS classes:**

```typescript
export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      {children}
    </div>
  );
}

// Responsive design
export function ResponsiveGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Grid items */}
    </div>
  );
}
```

## Loading & Error States

**Always handle loading and errors:**

```typescript
export function DataView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data...

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">
        <p className="font-medium">Error loading data</p>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center text-gray-500 p-8">
        No data found
      </div>
    );
  }

  return (
    <div>
      {/* Render data */}
    </div>
  );
}
```

## Routing

**Use Next.js App Router:**

```typescript
'use client';

import { useRouter, usePathname } from 'next/navigation';

export function NavigationExample() {
  const router = useRouter();
  const pathname = usePathname();

  // Programmatic navigation
  const goToStudents = () => {
    router.push('/admin/students');
  };

  // Check current route
  const isActive = pathname === '/admin/students';

  return (
    <div>
      <button onClick={goToStudents}>Go to Students</button>
      {isActive && <span>Current page</span>}
    </div>
  );
}
```

## TypeScript Best Practices

```typescript
// ✅ Define interfaces for props
interface UserCardProps {
  user: {
    id: string;
    name: string;
    email: string;
  };
  onEdit: (userId: string) => void;
}

// ✅ Use proper types for events
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();
  // ...
};

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value;
  // ...
};

// ✅ Type state properly
const [user, setUser] = useState<User | null>(null);
const [count, setCount] = useState<number>(0);

// ❌ Avoid 'any'
// const data: any = ...

// ✅ Use 'unknown' if type is truly unknown, then narrow
const data: unknown = ...;
if (typeof data === 'object' && data !== null) {
  // Now TypeScript knows data is an object
}
```

## Common Mistakes to Avoid

❌ **Don't** forget 'use client' for interactive components  
❌ **Don't** use useState in Server Components  
❌ **Don't** skip loading/error states  
❌ **Don't** forget to disable forms during submission  
❌ **Don't** use `any` types  
❌ **Don't** inline styles (use Tailwind classes)  
❌ **Don't** hardcode text in components (use i18n)  
❌ **Don't** forget bilingual support for static content  
❌ **Don't** build desktop-only layouts (mobile-first required)  
❌ **Don't** skip SEO metadata (title, description, Open Graph)  
❌ **Don't** forget robots.txt and sitemap updates  

✅ **Do** add 'use client' when using hooks  
✅ **Do** use Server Components when possible  
✅ **Do** show loading spinners  
✅ **Do** disable submit buttons while submitting  
✅ **Do** use TypeScript strictly  
✅ **Do** use Tailwind utility classes  
✅ **Do** use i18n for all user-facing text  
✅ **Do** support Tamil + English for all static content  
✅ **Do** design mobile-first, then enhance for desktop  
✅ **Do** use SSR (Server-Side Rendering) wherever possible  
✅ **Do** add proper SEO metadata to all pages  
✅ **Do** keep robots.txt updated with all routes  

---

## Internationalization (i18n)

**CRITICAL**: All static content MUST be bilingual (Tamil + English).

### Static Content from Firestore

Static content loaded from Firestore (hero section, flash news, announcements) must store both languages:

```typescript
// Firestore document structure
interface HeroContent {
  id: string;
  type: 'thirukkural' | 'event';
  
  // Bilingual fields
  title: {
    en: string;
    ta: string;  // Tamil
  };
  subtitle: {
    en: string;
    ta: string;
  };
  description?: {
    en: string;
    ta: string;
  };
  
  // Other fields
  imageUrl?: string;
  ctaText?: {
    en: string;
    ta: string;
  };
  ctaLink?: string;
  
  // Display control
  startDate?: Timestamp;
  endDate?: Timestamp;
  isActive: boolean;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

### Client-Side Caching with TTL

**Static content should be cached client-side with TTL:**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY = 'hero_content';

interface CachedData<T> {
  data: T;
  timestamp: number;
}

export function useHeroContent() {
  const [content, setContent] = useState<HeroContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check cache first
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp }: CachedData<HeroContent> = JSON.parse(cached);
      
      // Use cache if not expired
      if (Date.now() - timestamp < CACHE_TTL) {
        setContent(data);
        setLoading(false);
        
        // Still listen for updates in background
        subscribeToUpdates();
        return;
      }
    }
    
    // Cache expired or doesn't exist, fetch fresh
    fetchAndCache();
    
    function fetchAndCache() {
      const q = query(
        collection(db, 'heroContent'),
        where('isActive', '==', true)
      );
      
      getDocs(q).then(snapshot => {
        const doc = snapshot.docs[0];
        if (doc) {
          const data = doc.data() as HeroContent;
          
          // Cache with timestamp
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            data,
            timestamp: Date.now()
          }));
          
          setContent(data);
        }
        setLoading(false);
        
        // Subscribe to realtime updates
        subscribeToUpdates();
      });
    }
    
    function subscribeToUpdates() {
      // Listen for admin updates
      const q = query(
        collection(db, 'heroContent'),
        where('isActive', '==', true)
      );
      
      const unsubscribe = onSnapshot(q, snapshot => {
        const doc = snapshot.docs[0];
        if (doc) {
          const data = doc.data() as HeroContent;
          
          // Update cache immediately when admin changes content
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            data,
            timestamp: Date.now()
          }));
          
          setContent(data);
        }
      });
      
      return unsubscribe;
    }
  }, []);

  return { content, loading };
}
```

### Force Cache Eviction

**Admin publish action should trigger cache eviction:**

```typescript
// In admin component
async function publishHeroContent(content: HeroContent) {
  // Save to Firestore
  await setDoc(doc(db, 'heroContent', content.id), {
    ...content,
    isActive: true,
    updatedAt: Timestamp.now()
  });
  
  // Firestore real-time listeners will automatically update all clients
  // Cache will be refreshed via onSnapshot callback
  
  alert('Published! All users will see updates within seconds.');
}
```

### Language Selection

**Use Next.js i18n or simple context:**

```typescript
'use client';

import { createContext, useContext, useState } from 'react';

type Language = 'en' | 'ta';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (text: { en: string; ta: string }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (text: { en: string; ta: string }) => {
    return text[language] || text.en;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
```

### Using Bilingual Content

```typescript
'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { useHeroContent } from '@/hooks/useHeroContent';

export function HeroSection() {
  const { t } = useLanguage();
  const { content, loading } = useHeroContent();

  if (loading) return <HeroSkeleton />;
  if (!content) return <DefaultThirukkural />;

  return (
    <section className="hero">
      <h1>{t(content.title)}</h1>
      <p>{t(content.subtitle)}</p>
      
      {content.ctaText && (
        <a href={content.ctaLink}>
          {t(content.ctaText)}
        </a>
      )}
    </section>
  );
}
```

### Flash News Marquee

```typescript
'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { useFlashNews } from '@/hooks/useFlashNews';

const MARQUEE_CACHE_KEY = 'flash_news';
const MARQUEE_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

export function FlashNewsMarquee() {
  const { t } = useLanguage();
  const { newsItems, loading } = useFlashNews(); // Similar caching logic

  if (loading || newsItems.length === 0) return null;

  return (
    <div className="marquee-container">
      <div className="marquee">
        {newsItems.map(item => (
          <span key={item.id} className="marquee-item">
            {item.isUrgent && '⚠️ '}
            {t(item.text)}
          </span>
        ))}
      </div>
    </div>
  );
}
```

### Admin Forms for Bilingual Content

```typescript
'use client';

export function HeroContentForm() {
  const [formData, setFormData] = useState({
    title: { en: '', ta: '' },
    subtitle: { en: '', ta: '' },
    // ...
  });

  return (
    <form>
      <div className="form-section">
        <h3>Title</h3>
        
        <label>English</label>
        <input
          value={formData.title.en}
          onChange={e => setFormData(prev => ({
            ...prev,
            title: { ...prev.title, en: e.target.value }
          }))}
          required
        />
        
        <label>Tamil (தமிழ்)</label>
        <input
          value={formData.title.ta}
          onChange={e => setFormData(prev => ({
            ...prev,
            title: { ...prev.title, ta: e.target.value }
          }))}
          required
          className="font-tamil" // Use Tamil font
        />
      </div>
      
      {/* Similar for subtitle, description, etc. */}
    </form>
  );
}
```

### i18n Best Practices

**DO**:
- ✅ Store both Tamil and English in Firestore
- ✅ Use `{ en: string; ta: string }` structure
- ✅ Provide English fallback if Tamil missing
- ✅ Cache static content with TTL
- ✅ Use Firestore realtime listeners for instant updates
- ✅ Test with both languages
- ✅ Use appropriate Tamil fonts (Noto Sans Tamil, Latha)

**DON'T**:
- ❌ Hardcode English-only text in components
- ❌ Skip Tamil translations for public content
- ❌ Forget to cache frequently accessed content
- ❌ Use long cache TTLs (max 5 minutes for static content)
- ❌ Forget to invalidate cache on admin updates

---

## Testing

```typescript
// ui/src/components/__tests__/StudentCard.test.tsx
import { render, screen } from '@testing-library/react';
import { StudentCard } from '../StudentCard';

describe('StudentCard', () => {
  it('renders student name', () => {
    render(<StudentCard student={{ id: '1', name: 'John Doe' }} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
```

---

## Mobile-First Development

**CRITICAL**: All UI must be mobile-compatible and responsive.

### Mobile-First Approach

```typescript
// ✅ Design for mobile first, then add desktop enhancements
export function ResponsiveCard() {
  return (
    <div className="
      p-4              // Mobile padding
      sm:p-6           // Tablet padding
      lg:p-8           // Desktop padding
      
      w-full           // Mobile full width
      sm:w-auto        // Tablet auto width
      lg:max-w-2xl     // Desktop constrained
      
      text-sm          // Mobile text
      sm:text-base     // Tablet text
      lg:text-lg       // Desktop text
    ">
      <h2 className="text-lg sm:text-xl lg:text-2xl">
        Responsive Heading
      </h2>
    </div>
  );
}
```

### Touch-Friendly UI

```typescript
// ✅ Larger touch targets for mobile
export function MobileButton() {
  return (
    <button className="
      min-h-[44px]     // iOS minimum touch target
      px-4 py-3        // Comfortable padding
      text-base        // Readable text size
      active:scale-95  // Touch feedback
      transition-transform
    ">
      Tap Me
    </button>
  );
}
```

### Responsive Navigation

```typescript
'use client';

import { useState } from 'react';

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger menu */}
      <div className="lg:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6">...</svg>
        </button>
        
        {isOpen && (
          <div className="absolute top-16 left-0 right-0 bg-white shadow-lg">
            {/* Mobile menu items */}
          </div>
        )}
      </div>

      {/* Desktop navigation */}
      <nav className="hidden lg:flex gap-6">
        {/* Desktop menu items */}
      </nav>
    </>
  );
}
```

### Responsive Tables

```typescript
// ✅ Stack table on mobile, grid on desktop
export function ResponsiveTable({ students }: { students: Student[] }) {
  return (
    <>
      {/* Mobile: Card layout */}
      <div className="lg:hidden space-y-4">
        {students.map(student => (
          <div key={student.id} className="border rounded-lg p-4">
            <div className="font-bold">{student.name}</div>
            <div className="text-sm text-gray-600">Grade: {student.grade}</div>
          </div>
        ))}
      </div>

      {/* Desktop: Table layout */}
      <table className="hidden lg:table w-full">
        <thead>
          <tr>
            <th>Name</th>
            <th>Grade</th>
          </tr>
        </thead>
        <tbody>
          {students.map(student => (
            <tr key={student.id}>
              <td>{student.name}</td>
              <td>{student.grade}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
```

### Testing Mobile UI

```bash
# Use Chrome DevTools device emulation
# Test on actual devices when possible
# Common breakpoints:
# - Mobile: 320px - 639px
# - Tablet: 640px - 1023px
# - Desktop: 1024px+
```

---

## SEO Optimization

**CRITICAL**: All pages must be SEO-optimized with proper metadata.

### Page Metadata (Server Components)

```typescript
// app/students/page.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Students | GSDTA Tamil School',
  description: 'Manage student enrollment, attendance, and academic records at GSDTA Tamil School.',
  keywords: ['tamil school', 'student management', 'GSDTA'],
  
  // Open Graph (Facebook, LinkedIn)
  openGraph: {
    title: 'Students | GSDTA Tamil School',
    description: 'Manage student enrollment and records',
    url: 'https://gsdta.org/students',
    siteName: 'GSDTA Tamil School',
    images: [
      {
        url: 'https://gsdta.org/og-image.jpg',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  
  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'Students | GSDTA Tamil School',
    description: 'Manage student enrollment and records',
    images: ['https://gsdta.org/og-image.jpg'],
  },
  
  // Additional metadata
  alternates: {
    canonical: 'https://gsdta.org/students',
  },
};

export default function StudentsPage() {
  return <div>...</div>;
}
```

### Dynamic Metadata

```typescript
// app/students/[id]/page.tsx
import { Metadata } from 'next';

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Fetch student data
  const student = await getStudent(params.id);
  
  return {
    title: `${student.name} | GSDTA Tamil School`,
    description: `View academic records for ${student.name}, Grade ${student.grade}`,
  };
}

export default function StudentDetailPage({ params }: Props) {
  return <div>...</div>;
}
```

### Server-Side Rendering (SSR)

```typescript
// ✅ Use Server Components for SEO-critical content
// app/about/page.tsx (Server Component by default)
export default async function AboutPage() {
  // This renders on the server
  const content = await fetchAboutContent();
  
  return (
    <div>
      <h1>{content.title}</h1>
      <p>{content.description}</p>
    </div>
  );
}

// ❌ Avoid Client Components for SEO content
// If you need interactivity, use Server Components + Client Components together
export default async function AboutPage() {
  const content = await fetchAboutContent();
  
  return (
    <div>
      {/* Server-rendered content (SEO-friendly) */}
      <h1>{content.title}</h1>
      <p>{content.description}</p>
      
      {/* Client component for interactivity */}
      <InteractiveForm />
    </div>
  );
}
```

### Robots.txt

```text
# public/robots.txt

# Allow all crawlers
User-agent: *
Allow: /

# Public pages
Allow: /about
Allow: /contact
Allow: /programs
Allow: /calendar

# Disallow admin and auth pages
Disallow: /admin
Disallow: /teacher
Disallow: /parent
Disallow: /login
Disallow: /signup
Disallow: /api

# Sitemap
Sitemap: https://gsdta.org/sitemap.xml
```

### Sitemap

```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://gsdta.org',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://gsdta.org/about',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://gsdta.org/programs',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://gsdta.org/calendar',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: 'https://gsdta.org/contact',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
  ];
}
```

### Structured Data (JSON-LD)

```typescript
// app/layout.tsx or specific pages
export default function HomePage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": "GSDTA Tamil School",
    "url": "https://gsdta.org",
    "logo": "https://gsdta.org/logo.png",
    "description": "Non-profit Tamil educational organization",
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "US"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Administration",
      "email": "info@gsdta.org"
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {/* Rest of page */}
    </>
  );
}
```

### SEO Checklist

When creating a new page:

- [ ] Add page metadata (title, description, keywords)
- [ ] Add Open Graph metadata (Facebook/LinkedIn sharing)
- [ ] Add Twitter Card metadata
- [ ] Use Server Components for SEO-critical content
- [ ] Add canonical URL
- [ ] Update robots.txt if needed (allow/disallow)
- [ ] Update sitemap.ts with new route
- [ ] Add structured data (JSON-LD) if applicable
- [ ] Test with Google Search Console
- [ ] Test social media sharing preview

### SSR vs CSR Decision

**Use Server Components (SSR) for**:
- Public pages (home, about, contact)
- Content that should be indexed by search engines
- Initial page load performance
- Static content that doesn't change frequently

**Use Client Components for**:
- Interactive forms
- Real-time updates
- User-specific dashboards
- Components that need useState, useEffect, event handlers

---

## Dependency Management

**CRITICAL: Always keep package.json and package-lock.json in sync**

After adding/removing/updating any dependency:
```bash
# From ui/ directory
npm install

# Then commit BOTH files
git add package.json package-lock.json
```

❌ **Never** manually edit package-lock.json
❌ **Never** commit package.json without the corresponding lock file update
✅ **Always** run `npm install` after modifying package.json
✅ **Always** commit both files together

**Why:** Docker builds use `npm ci` which fails if lock file doesn't match package.json.

## Running Locally

```bash
# Start UI
cd ui
npm run dev

# UI runs on http://localhost:3000
```
