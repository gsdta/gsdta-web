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

// Dark mode support
export function DarkModeCard() {
  return (
    <div className="bg-white dark:bg-gray-800 text-black dark:text-white">
      {/* Content adapts to theme */}
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

✅ **Do** add 'use client' when using hooks  
✅ **Do** use Server Components when possible  
✅ **Do** show loading spinners  
✅ **Do** disable submit buttons while submitting  
✅ **Do** use TypeScript strictly  
✅ **Do** use Tailwind utility classes  

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

## Running Locally

```bash
# Start UI
cd ui
npm run dev

# UI runs on http://localhost:3000
```
