import { describe, it, expect, vi, beforeEach } from 'vitest';
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
          path="/protected"
          element={
            <AuthGuard requireAuth={true} redirectTo="/signin">
              <div>protected content</div>
            </AuthGuard>
          }
        />
        <Route path="/signin" element={<div>signin page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AuthGuard', () => {
  beforeEach(() => {
    authState.isLoaded = true;
    authState.isSignedIn = true;
  });

  it('shows spinner while auth is loading', () => {
    authState.isLoaded = false;
    renderAt('/protected');
    expect(screen.getByTestId('spinner')).toBeTruthy();
    expect(screen.queryByText('protected content')).toBeNull();
  });

  it('renders children when signed in and requireAuth is true', () => {
    renderAt('/protected');
    expect(screen.getByText('protected content')).toBeTruthy();
  });

  it('redirects when not signed in and requireAuth is true', () => {
    authState.isSignedIn = false;
    const { container } = renderAt('/protected');
    // After redirect, protected content should not be rendered
    expect(container.textContent).not.toContain('protected content');
  });
});
