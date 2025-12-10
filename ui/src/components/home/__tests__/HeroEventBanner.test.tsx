import { render, screen } from '@testing-library/react';
import { HeroEventBanner } from '../HeroEventBanner';
import type { HeroContent } from '@/types/heroContent';

// Mock i18n
jest.mock('@/i18n/LanguageProvider', () => ({
  useI18n: () => ({ lang: 'en' }),
}));

// Mock Next.js Image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // Remove non-HTML attributes
    const { priority, fill, ...htmlProps } = props;
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img {...htmlProps} />;
  },
}));

// Mock Next.js Link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

describe('HeroEventBanner', () => {
  const mockContent: HeroContent = {
    id: 'test-1',
    type: 'event',
    title: {
      en: 'Annual Day 2024',
      ta: 'ஆண்டு விழா 2024',
    },
    subtitle: {
      en: 'Join us for celebration',
      ta: 'கொண்டாட்டத்தில் சேருங்கள்',
    },
    description: {
      en: 'A grand event',
      ta: 'ஒரு பெரிய நிகழ்வு',
    },
    imageUrl: 'https://example.com/image.jpg',
    ctaText: {
      en: 'Register Now',
      ta: 'இப்போது பதிவு செய்க',
    },
    ctaLink: 'https://example.com/register',
    isActive: true,
    priority: 10,
    createdAt: '2024-12-07T00:00:00.000Z',
    updatedAt: '2024-12-07T00:00:00.000Z',
    createdBy: 'test-admin',
  };

  it('should render title and subtitle', () => {
    render(<HeroEventBanner content={mockContent} />);
    
    expect(screen.getByText('Annual Day 2024')).toBeInTheDocument();
    expect(screen.getByText('Join us for celebration')).toBeInTheDocument();
  });

  it('should render description if provided', () => {
    render(<HeroEventBanner content={mockContent} />);
    
    expect(screen.getByText('A grand event')).toBeInTheDocument();
  });

  it('should render CTA button if provided', () => {
    render(<HeroEventBanner content={mockContent} />);
    
    const ctaButton = screen.getByText('Register Now');
    expect(ctaButton).toBeInTheDocument();
    expect(ctaButton.closest('a')).toHaveAttribute('href', 'https://example.com/register');
  });

  it('should not render CTA button if not provided', () => {
    const contentWithoutCta = { ...mockContent, ctaText: undefined, ctaLink: undefined };
    render(<HeroEventBanner content={contentWithoutCta} />);
    
    expect(screen.queryByText('Register Now')).not.toBeInTheDocument();
  });

  it('should render event badge', () => {
    render(<HeroEventBanner content={mockContent} />);
    
    expect(screen.getByText('Event')).toBeInTheDocument();
  });

  it('should render image if provided', () => {
    render(<HeroEventBanner content={mockContent} />);
    
    const image = screen.getByAltText('Annual Day 2024');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
  });
});
