import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import Flex from './flex.component';

describe('Flex', () => {
  afterEach(() => cleanup());

  it('renders children in a flex div', () => {
    const { container } = render(
      <Flex>
        <p>content</p>
      </Flex>,
    );
    const box = container.querySelector('div');
    expect(box).toBeTruthy();
    expect(box!.className).toContain('flex');
    expect(screen.getByText('content')).toBeTruthy();
  });

  it('applies layout props as inline styles and merges className', () => {
    const { container } = render(
      <Flex direction="column" gap="10px" grow={1} className="my-flex">
        x
      </Flex>,
    );
    const box = container.querySelector('div')!;
    expect(box.className).toContain('my-flex');
    expect(box.style.flexDirection).toBe('column');
    expect(box.style.gap).toBe('10px');
    expect(box.style.flexGrow).toBe('1');
  });
});
