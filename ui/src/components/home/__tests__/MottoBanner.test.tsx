import { render, screen, act } from '@testing-library/react';
import { MottoBanner } from '../MottoBanner';

// Mock i18n
jest.mock('@/i18n/LanguageProvider', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'flashcards.card1': 'Learning is a journey',
        'flashcards.card2': 'Knowledge is power',
        'flashcards.card3': 'Wisdom is eternal',
        'flashcards.card4': 'Education matters',
        'motto.title': 'Our School Motto',
      };
      return translations[key] || key;
    },
  }),
}));

describe('MottoBanner', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('MB-001: renders the component', () => {
    render(<MottoBanner />);

    expect(screen.getByText('Our School Motto')).toBeInTheDocument();
  });

  it('MB-002: renders the initial flashcard text', () => {
    render(<MottoBanner />);

    expect(screen.getByText('Learning is a journey')).toBeInTheDocument();
  });

  it('MB-003: cycles to next flashcard after 5 seconds', () => {
    render(<MottoBanner />);

    expect(screen.getByText('Learning is a journey')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(screen.getByText('Knowledge is power')).toBeInTheDocument();
  });

  it('MB-004: cycles through all flashcards', () => {
    render(<MottoBanner />);

    // Start with first
    expect(screen.getByText('Learning is a journey')).toBeInTheDocument();

    // Advance to second
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.getByText('Knowledge is power')).toBeInTheDocument();

    // Advance to third
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.getByText('Wisdom is eternal')).toBeInTheDocument();

    // Advance to fourth
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.getByText('Education matters')).toBeInTheDocument();
  });

  it('MB-005: wraps around to first flashcard after last', () => {
    render(<MottoBanner />);

    // Advance through all 4 flashcards (4 * 5000ms)
    act(() => {
      jest.advanceTimersByTime(20000);
    });

    // Should be back to first
    expect(screen.getByText('Learning is a journey')).toBeInTheDocument();
  });

  it('MB-006: clears interval on unmount', () => {
    const clearIntervalSpy = jest.spyOn(window, 'clearInterval');

    const { unmount } = render(<MottoBanner />);
    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it('MB-007: has correct structure', () => {
    const { container } = render(<MottoBanner />);

    expect(container.querySelector('section')).toBeInTheDocument();
    expect(container.querySelector('h2')).toBeInTheDocument();
    expect(container.querySelector('p')).toBeInTheDocument();
  });
});
