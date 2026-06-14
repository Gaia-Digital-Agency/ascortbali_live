import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import { AdsProvider } from './components/AdvertisingSpaces'

// Lazy-load everything except the homepage for faster initial load
const CreatorLoginPage = lazy(() => import('./pages/CreatorLoginPage'))
const CreatorLoggedPage = lazy(() => import('./pages/CreatorLoggedPage'))
const CreatorRegisterPage = lazy(() => import('./pages/CreatorRegisterPage'))
const CreatorPreviewPage = lazy(() => import('./pages/CreatorPreviewPage'))
const UserLoginPage = lazy(() => import('./pages/UserLoginPage'))
const UserLoggedPage = lazy(() => import('./pages/UserLoggedPage'))
const UserRegisterPage = lazy(() => import('./pages/UserRegisterPage'))
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage'))
const AdminLoggedPage = lazy(() => import('./pages/AdminLoggedPage'))
const InfoPage = lazy(() => import('./pages/InfoPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const TermsPage = lazy(() => import('./pages/TermsPage'))
const BlogIndexPage = lazy(() => import('./pages/BlogIndexPage'))
const BlogDetailPage = lazy(() => import('./pages/BlogDetailPage'))
const AdminBlogsPage = lazy(() => import('./pages/AdminBlogsPage'))

const PageLoader = () => (
  <div className="space-y-4 py-10">
    <div className="skeleton h-8 w-48" />
    <div className="skeleton h-4 w-full" />
    <div className="skeleton h-4 w-3/4" />
    <div className="skeleton h-32 w-full" />
  </div>
)

export default function App() {
  return (
    <AdsProvider>
      <Routes>
        <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/creator" element={<Suspense fallback={<PageLoader />}><CreatorLoginPage /></Suspense>} />
        <Route path="/creator/logged" element={<Suspense fallback={<PageLoader />}><CreatorLoggedPage /></Suspense>} />
        <Route path="/creator/register" element={<Suspense fallback={<PageLoader />}><CreatorRegisterPage /></Suspense>} />
        {/* :slug accepts either a slug or a UUID — the API resolves both
            (Phase D). Old /creator/preview/<uuid> bookmarks keep working. */}
        <Route path="/creator/preview/:slug" element={<Suspense fallback={<PageLoader />}><CreatorPreviewPage /></Suspense>} />
        <Route path="/user" element={<Suspense fallback={<PageLoader />}><UserLoginPage /></Suspense>} />
        <Route path="/user/logged" element={<Suspense fallback={<PageLoader />}><UserLoggedPage /></Suspense>} />
        <Route path="/user/register" element={<Suspense fallback={<PageLoader />}><UserRegisterPage /></Suspense>} />
        <Route path="/admin" element={<Suspense fallback={<PageLoader />}><AdminLoginPage /></Suspense>} />
        <Route path="/admin/logged" element={<Suspense fallback={<PageLoader />}><AdminLoggedPage /></Suspense>} />
        <Route path="/admin/logged/stats" element={<Suspense fallback={<PageLoader />}><AdminLoggedPage /></Suspense>} />
        <Route path="/admin/logged/ads" element={<Suspense fallback={<PageLoader />}><AdminLoggedPage /></Suspense>} />
        <Route path="/admin/logged/creators" element={<Suspense fallback={<PageLoader />}><AdminLoggedPage /></Suspense>} />
        <Route path="/admin/logged/users" element={<Suspense fallback={<PageLoader />}><AdminLoggedPage /></Suspense>} />
        <Route path="/admin/logged/blogs" element={<Suspense fallback={<PageLoader />}><AdminBlogsPage /></Suspense>} />
        <Route path="/info" element={<Suspense fallback={<PageLoader />}><InfoPage /></Suspense>} />
        <Route path="/privacy" element={<Suspense fallback={<PageLoader />}><PrivacyPage /></Suspense>} />
        <Route path="/terms" element={<Suspense fallback={<PageLoader />}><TermsPage /></Suspense>} />
        <Route path="/blog" element={<Suspense fallback={<PageLoader />}><BlogIndexPage /></Suspense>} />
        <Route path="/blog/:slug" element={<Suspense fallback={<PageLoader />}><BlogDetailPage /></Suspense>} />
        </Route>
      </Routes>
    </AdsProvider>
  )
}
