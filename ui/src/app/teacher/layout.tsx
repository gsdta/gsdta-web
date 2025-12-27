import type { Metadata } from 'next';
import TeacherLayoutClient from './TeacherLayoutClient';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Teacher Portal | GSDTA',
};

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return <TeacherLayoutClient>{children}</TeacherLayoutClient>;
}

