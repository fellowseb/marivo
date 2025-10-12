import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// import {
//   createBrowserRouter,
//   Navigate,
//   Route,
//   RouterProvider,
//   Routes,
// } from 'react-router';
import { ClerkProvider } from '@clerk/clerk-react';
import './index.css';
// import AuthLayout from './layouts/auth-layout.tsx';
// import Login from './features/auth/signin.component.tsx';
// import Signup from './features/auth/signup.component.tsx';
// import MainLayout from './layouts/main-layout.tsx';
// import PlaysPage, {
//   PlaysPageTitle,
// } from './features/play-admin/plays-page.component.tsx';
// import PlayPage, {
//   PlayTitle,
// } from './features/play-admin/play-page.component.tsx';
// import PlayMenu from './features/play-admin/play-menu.component.tsx';
// import ScriptTabMenu from './features/script-edition/script-tab-menu.component.tsx';
// import BlockingTabMenu from './features/blocking/blocking-tab-menu.component.tsx';
// import MemorizeTabMenu from './features/lines-memorization/memorize-tab-menu.component.tsx';
// import { rootAuthLoader } from '@clerk/react-router/server';
import App from './app.tsx';
import { BrowserRouter } from 'react-router';

// Import your Publishable Key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key');
}

// const router = createBrowserRouter([
//   {
//     path: '/',
//     index: true,
//     element: <Navigate to="/plays" replace />,
//   },
//   {
//     element: <AuthLayout />,
//     children: [
//       {
//         path: '/signup',
//         element: <Signup />,
//       },
//       {
//         path: '/signin',
//         element: <Login />,
//       },
//     ],
//   },
//   {
//     element: (
//       <MainLayout
//         title={
//           <Routes>
//             <Route path="/plays" element={<PlaysPageTitle />} />
//             <Route path="/play/:id/*" element={<PlayTitle />} />
//           </Routes>
//         }
//         Menu={
//           <Routes>
//             <Route path="/play/:id/*" element={<PlayMenu />} />
//           </Routes>
//         }
//         PageMenu={
//           <Routes>
//             <Route path="/play/:id/script" element={<ScriptTabMenu />} />
//             <Route path="/play/:id/blocking" element={<BlockingTabMenu />} />
//             <Route path="/play/:id/memorize" element={<MemorizeTabMenu />} />
//           </Routes>
//         }
//       />
//     ),
//     children: [
//       {
//         path: '/plays',
//         element: <PlaysPage />,
//         loader: async () => {
//           rootAuthLoader();
//           const response = await fetch('http://localhost:3000/plays', {
//             headers: {
//               Authorization: `Bearer ${await getAuth()}`,
//             },
//           });
//           const { data } = await response.json();
//           return {
//             plays: data,
//           };
//         },
//       },
//       {
//         path: '/play/:id/*',
//         element: <PlayPage />,
//       },
//     ],
//   },
//   {
//     path: '*',
//     element: <Navigate to="/plays" replace />,
//   },
// ]);

// <RouterProvider router={router} />

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClerkProvider>
  </StrictMode>,
);
