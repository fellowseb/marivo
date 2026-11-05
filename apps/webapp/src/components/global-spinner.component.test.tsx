import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import GlobalSpinner from './global-spinner.component';

describe('GlobalSpinner', () => {
  afterEach(() => cleanup());

  it('renders the loader section with the Marivo logo', () => {
    const { container } = render(<GlobalSpinner />);
    const section = container.querySelector('section.loader');
    expect(section).toBeTruthy();
    const img = screen.getByAltText('Marivo');
    expect(img.getAttribute('src')).toBe('/marivo-logo-full-with-background.webp');
    expect(img.getAttribute('width')).toBe('247');
  });
});
