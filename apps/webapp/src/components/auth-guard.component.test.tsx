import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

const authState = { isLoaded: true, isSignedIn: true };

vi.mock('@clerk/react', () => ({
  useAuth: () => authState,
}));

vi.mock('./global-spinner.component', () => ({
  default: () => <div data-testid="spinner">loading</div>,
}));

import AuthGuard from './auth-guard.component';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="*"
          element={
            <AuthGuard>
              <div>app content</div>
            </AuthGuard>
          }
        />
        <Route path="/signin" element={<div>signin page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AuthGuard', () => {
  it('shows spinner while auth is loading', () => {
    authState.isLoaded = false;
    authState.isSignedIn = false;
    renderAt('/plays');
    expect(screen.getByTestId('spinner')).toBeTruthy();
    expect(screen.queryByText('app content')).toBeNull();
  });

  it('renders children when signed in', () => {
    authState.isLoaded = true;
    authState.isSignedIn = true;
    renderAt('/plays');
    expect(screen.getByText('app content')).toBeTruthy();
  });

  it('redirects to signin when signed out on protected path', () => {
    authState.isLoaded = true;
    authState.isSignedIn = false;
    const { container } = renderAt('/plays');
    expect(container.textContent).not.toContain('app content');
  });

  it('renders children when signed out on signin page', () => {
    authState.isLoaded = true;
    authState.isSignedIn = false;
    renderAt('/signin');
    expect(screen.getAllByText('signin page').length).toBeGreaterThan(0);
  });
});
