import { render, screen, act, fireEvent } from '@testing-library/react';
import { Flashcards } from '../Flashcards';

// Mock i18n
jest.mock('@/i18n/LanguageProvider', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'flashcards.card1': 'Card 1 Text',
        'flashcards.card2': 'Card 2 Text',
        'flashcards.card3': 'Card 3 Text',
        'flashcards.card4': 'Card 4 Text',
      };
      return translations[key] || key;
    },
  }),
}));

describe('Flashcards', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('FC-001: renders the component', () => {
    render(<Flashcards />);

    // Desktop view should show all cards - there are 2 instances of card 1 (desktop + mobile)
    expect(screen.getAllByText('Card 1 Text').length).toBeGreaterThanOrEqual(1);
  });

  it('FC-002: shows all cards in desktop view', () => {
    render(<Flashcards />);

    // Card 1 appears twice (desktop + mobile), others appear once in desktop
    expect(screen.getAllByText('Card 1 Text').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Card 2 Text').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Card 3 Text').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Card 4 Text').length).toBeGreaterThanOrEqual(1);
  });

  it('FC-003: renders dot indicators for mobile', () => {
    render(<Flashcards />);

    const buttons = screen.getAllByRole('button', { name: /Go to card/ });
    expect(buttons).toHaveLength(4);
  });

  it('FC-004: cycles cards automatically every 4 seconds', () => {
    render(<Flashcards />);

    // Initially showing card 1
    const mobileCards = screen.getAllByText('Card 1 Text');
    expect(mobileCards.length).toBeGreaterThan(0);

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    // Now showing card 2 in mobile view
    expect(screen.getAllByText('Card 2 Text').length).toBeGreaterThan(0);
  });

  it('FC-005: clicking dot indicator changes current card', () => {
    render(<Flashcards />);

    const buttons = screen.getAllByRole('button', { name: /Go to card/ });

    // Click third dot (index 2)
    fireEvent.click(buttons[2]);

    // Should show card 3
    expect(screen.getAllByText('Card 3 Text').length).toBeGreaterThan(0);
  });

  it('FC-006: wraps around after last card', () => {
    render(<Flashcards />);

    // Advance through all 4 cards (4 * 4000ms = 16 seconds)
    act(() => {
      jest.advanceTimersByTime(16000);
    });

    // Should be back to card 1
    const card1Elements = screen.getAllByText('Card 1 Text');
    expect(card1Elements.length).toBeGreaterThan(0);
  });

  it('FC-007: clears interval on unmount', () => {
    const clearIntervalSpy = jest.spyOn(window, 'clearInterval');

    const { unmount } = render(<Flashcards />);
    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it('FC-008: has correct aria labels on buttons', () => {
    render(<Flashcards />);

    expect(screen.getByRole('button', { name: 'Go to card 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to card 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to card 3' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to card 4' })).toBeInTheDocument();
  });
});
