import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ItemList, ItemListItem } from './item-list.component';

describe('ItemList / ItemListItem', () => {
  afterEach(() => cleanup());

  it('renders a ul container with items', () => {
    const { container } = render(
      <MemoryRouter>
        <ItemList>
          <ItemListItem title="Hamlet" details={<span>en · tragedy</span>} />
        </ItemList>
      </MemoryRouter>,
    );
    expect(container.querySelector('ul')).toBeTruthy();
    expect(container.querySelector('li')).toBeTruthy();
    expect(screen.getByText('Hamlet')).toBeTruthy();
    expect(screen.getByText('en · tragedy')).toBeTruthy();
  });

  it('button item fires onClick and shows trailing content; selected state applies', () => {
    const onClick = vi.fn();
    render(
      <MemoryRouter>
        <ItemList>
          <ItemListItem
            title="Tartuffe"
            selected={true}
            onClick={onClick}
            trailing={<span role="img" aria-label="Bookmarked" />}
          />
        </ItemList>
      </MemoryRouter>,
    );
    const item = screen.getByRole('button', { name: /Tartuffe/ });
    expect(item.className).toContain('selected');
    expect(screen.getByRole('img', { name: 'Bookmarked' })).toBeTruthy();
    fireEvent.click(item);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('link item navigates via NavLink', () => {
    render(
      <MemoryRouter>
        <ItemList>
          <ItemListItem title="Othello" to="/plays/edit/123" />
        </ItemList>
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: /Othello/ });
    expect(link.getAttribute('href')).toBe('/plays/edit/123');
  });
});
