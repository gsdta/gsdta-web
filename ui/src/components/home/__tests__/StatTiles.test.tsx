import { render, screen } from '@testing-library/react';
import { StatTiles } from '../StatTiles';

// Mock the stats data
jest.mock('@/data/home', () => ({
  stats: [
    { id: 'stat1', title: '100 Students', subtitle: 'Enrolled' },
    { id: 'stat2', title: '20 Teachers' },
    { id: 'stat3', title: '5 Years', subtitle: 'Of excellence' },
  ],
}));

describe('StatTiles', () => {
  it('ST-001: renders all stat tiles', () => {
    render(<StatTiles />);

    expect(screen.getByText('100 Students')).toBeInTheDocument();
    expect(screen.getByText('20 Teachers')).toBeInTheDocument();
    expect(screen.getByText('5 Years')).toBeInTheDocument();
  });

  it('ST-002: renders subtitles when provided', () => {
    render(<StatTiles />);

    expect(screen.getByText('Enrolled')).toBeInTheDocument();
    expect(screen.getByText('Of excellence')).toBeInTheDocument();
  });

  it('ST-003: has accessible heading', () => {
    render(<StatTiles />);

    expect(screen.getByText('Key statistics')).toBeInTheDocument();
  });

  it('ST-004: has correct aria attributes', () => {
    const { container } = render(<StatTiles />);

    const region = container.querySelector('[role="region"]');
    expect(region).toHaveAttribute('aria-roledescription', 'carousel');
    expect(region).toHaveAttribute('aria-label', 'Key statistics');
  });

  it('ST-005: renders as a section with list', () => {
    const { container } = render(<StatTiles />);

    expect(container.querySelector('section')).toBeInTheDocument();
    expect(container.querySelector('ul')).toBeInTheDocument();
    expect(container.querySelectorAll('li')).toHaveLength(3);
  });
});
