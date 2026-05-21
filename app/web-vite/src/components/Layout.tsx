import { useEffect, useRef, useState } from 'react'
import { Outlet, Link, useLocation, useSearchParams } from 'react-router-dom'
import { AgeGateModal } from './AgeGateModal'
import { AnalyticsBeacon } from './AnalyticsBeacon'
import { AuthNavButton } from './AuthNavButton'
import { FooterStatus } from './FooterStatus'
import { useSiteSettings } from './AdvertisingSpaces'
import { CATEGORY_DEMS } from '../lib/creatorOptions'

// Header nav = the 4 DEMS category filters. Clicking a word navigates to
// the homepage with ?category=<token>; the homepage filter reads that and
// narrows the grid. The currently-active filter (if any) gets a gold ring.
// Single-word labels (SUGARBABIES, not "Sugar Babies") so the header stays
// on one row and the four items read as a compact category strip.
const DEMS_LABELS: Record<'D' | 'E' | 'M' | 'S', string> = {
  D: 'DATING',
  E: 'ESCORT',
  M: 'MASSAGE',
  S: 'SUGARBABIES',
}

// Layout has exactly 4 steps. Cmd+ advances one step, Cmd− retreats one step.
// Browser zoom is fully overridden — each press = one step (no in-between).
//   Step 1 → floating side ads + 5-col grid    (>=1400px)
//   Step 2 → no side ads       + 4-col grid    (1100-1399px)
//   Step 3 → no side ads       + 3-col grid    ( 768-1099px)
//   Step 4 → mobile            + 2-col grid    (<768px)
// The active step is published as a class `step-1`..`step-4` on <html>; the
// rest of the app reads it via Tailwind variant `[.step-N_&]:`.
const STEP_FROM_WIDTH = (w: number): number => {
  if (w >= 1400) return 1
  if (w >= 1100) return 2
  if (w >= 768) return 3
  return 4
}

export default function Layout() {
  const settings = useSiteSettings()
  // The header subtitle reads from its own `subtitle` setting (split from
  // the homepage H2 `tagline`). Falls back to `tagline` so existing deploys
  // that haven't filled the new field yet still show something.
  const subtitle = settings?.subtitle || settings?.tagline || ''
  const [zoomToast, setZoomToast] = useState<string | null>(null)
  const toastTimerRef = useRef<number | null>(null)

  // Burger drawer state for narrow viewports. Auto-closes on route change
  // so navigating from the drawer doesn't leave it hanging open.
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  // Read the active category filter so the matching DEMS nav icon can show
  // a gold ring. `searchParams.get('category')` is `null` when no filter is
  // applied; that's fine — no icon will match.
  const [searchParams] = useSearchParams()
  const currentCategory = searchParams.get('category')
  const [layoutStep, setLayoutStep] = useState<number>(() =>
    typeof window === 'undefined' ? 1 : STEP_FROM_WIDTH(window.innerWidth)
  )
  // Floating Back-to-Top button visibility — toggles once the user has
  // scrolled past 600px. We use opacity + pointer-events so the fade is
  // smooth and the button doesn't intercept clicks while invisible.
  const [showBackToTop, setShowBackToTop] = useState(false)
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 600)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Publish the active step as a class on <html> so Tailwind variants
  // `[.step-N_&]:...` can target it. We still scrub step-5 in case any
  // user has it stuck on <html> from before the 4-step collapse.
  useEffect(() => {
    const root = document.documentElement
    for (let i = 1; i <= 5; i++) root.classList.remove(`step-${i}`)
    root.classList.add(`step-${layoutStep}`)
  }, [layoutStep])

  useEffect(() => {
    const showToast = (msg: string) => {
      setZoomToast(msg)
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
      toastTimerRef.current = window.setTimeout(() => setZoomToast(null), 2200)
    }

    const stepIn = () => {
      setLayoutStep(s => {
        if (s >= 4) {
          showToast('Maximum zoom — Step 4 of 4')
          return s
        }
        return s + 1
      })
    }
    const stepOut = () => {
      setLayoutStep(s => {
        if (s <= 1) {
          showToast('Widest view — Step 1 of 4')
          return s
        }
        return s - 1
      })
    }

    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return
      if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        stepIn()
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault()
        stepOut()
      } else if (e.key === '0') {
        // Cmd+0 → reset to natural step based on current viewport
        e.preventDefault()
        setLayoutStep(STEP_FROM_WIDTH(window.innerWidth))
      }
    }
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      if (e.deltaY < 0) stepIn()
      else if (e.deltaY > 0) stepOut()
    }
    // If the user actually resizes the browser window, snap to the natural step.
    const onResize = () => setLayoutStep(STEP_FROM_WIDTH(window.innerWidth))

    window.addEventListener('keydown', onKey)
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('resize', onResize)
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    }
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <AnalyticsBeacon />
      <header className="sticky top-0 z-20 border-b border-brand-line bg-brand-bg/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4">
          <Link to="/" className="group flex min-w-0 items-center gap-3">
            <img
              src="/baligirls_logo.png?v=4"
              alt="BaliGirls"
              width={56}
              height={56}
              className="h-14 w-14 shrink-0 object-contain"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
            <div className="min-w-0 leading-none">
              <div className="truncate font-display text-lg tracking-[0.22em] text-brand-gold">BALI GIRLS</div>
              {subtitle ? (
                // Two-line, left-aligned subtitle. Admin can force the break
                // with a literal "|" (split → 2 lines); otherwise long text
                // wraps naturally and is clamped to 2 lines.
                <div className="mt-1 max-w-[220px] text-left text-[11px] leading-tight tracking-[0.22em] text-brand-muted [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
                  {subtitle.includes('|')
                    ? subtitle.split('|').slice(0, 2).map((line, i) => (
                        <div key={i}>{line.trim()}</div>
                      ))
                    : subtitle}
                </div>
              ) : null}
            </div>
            {/* Vertical gold divider — sits at the right edge of the brand
                block. 40px tall, 1px wide; opacity lifts on hover so the
                whole brand cluster reads as one interactive group. */}
            <span aria-hidden="true" className="ml-3 h-10 w-[1px] shrink-0 bg-brand-gold/70 opacity-70 transition group-hover:opacity-100" />
          </Link>

          {/* Desktop nav — visible at lg+ (>=1024px). Below that we switch to
              a burger so the header never wraps onto a second row. ALL +
              4 DEMS words filter the homepage by category; ALL clears the
              filter. Hover: bold + gold + underlined, no ring. Active: gold
              text + bold + underlined (kept consistent with hover). */}
          <nav className="hidden items-center gap-0.5 whitespace-nowrap lg:flex">
            {(() => {
              const allActive = !currentCategory
              return (
                <Link
                  to="/"
                  aria-label="Filter: All"
                  title="All"
                  aria-current={allActive ? 'true' : undefined}
                  className={`inline-flex min-h-[44px] items-center justify-center rounded-lg px-2 py-2 text-[11px] tracking-[0.18em] transition ${
                    allActive
                      ? 'font-bold text-brand-gold underline underline-offset-4'
                      : 'font-semibold text-brand-text hover:font-bold hover:text-brand-gold hover:underline hover:underline-offset-4'
                  }`}
                >
                  ALL
                </Link>
              )
            })()}
            {CATEGORY_DEMS.map(({ letter, token }) => {
              const isActive = currentCategory === token
              return (
                <Link
                  key={letter}
                  to={`/?category=${encodeURIComponent(token)}`}
                  aria-label={`Filter: ${DEMS_LABELS[letter]}`}
                  title={DEMS_LABELS[letter]}
                  aria-current={isActive ? 'true' : undefined}
                  className={`inline-flex min-h-[44px] items-center justify-center rounded-lg px-2 py-2 text-[11px] tracking-[0.18em] transition ${
                    isActive
                      ? 'font-bold text-brand-gold underline underline-offset-4'
                      : 'font-semibold text-brand-text hover:font-bold hover:text-brand-gold hover:underline hover:underline-offset-4'
                  }`}
                >
                  {DEMS_LABELS[letter]}
                </Link>
              )
            })}
            <AuthNavButton />
          </nav>

          {/* Burger — shown below lg. aria-expanded reflects state for a11y. */}
          <button
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-drawer"
            onClick={() => setMenuOpen((o) => !o)}
            className="btn btn-outline inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center !p-0 lg:hidden"
          >
            {/* Inline SVG instead of the Unicode bars/x glyphs — those have
                uneven internal padding and sat visibly off-centre in the
                round button (especially U+2630 ☰). The SVG viewBox is
                centred on (12,12) so the icon lines up with the button's
                geometric centre. */}
            {menuOpen ? (
              <svg
                aria-hidden="true"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            ) : (
              <svg
                aria-hidden="true"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile drawer — slides down beneath the bar. Only mounted when
            open so it doesn't intercept taps. Same DEMS filter set as
            desktop, but here each row shows the icon next to its label for
            tap clarity. */}
        {menuOpen ? (
          <div
            id="mobile-nav-drawer"
            className="border-t border-brand-line bg-brand-bg/95 backdrop-blur lg:hidden"
          >
            <nav className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-3">
              {(() => {
                const allActive = !currentCategory
                return (
                  <Link
                    to="/"
                    aria-current={allActive ? 'true' : undefined}
                    className={`btn btn-outline flex min-h-[44px] items-center justify-center py-2.5 text-center text-xs tracking-[0.18em] ${
                      allActive
                        ? 'font-bold text-brand-gold underline underline-offset-4'
                        : 'font-semibold'
                    }`}
                    onClick={() => setMenuOpen(false)}
                  >
                    ALL
                  </Link>
                )
              })()}
              {CATEGORY_DEMS.map(({ letter, token }) => {
                const isActive = currentCategory === token
                return (
                  <Link
                    key={letter}
                    to={`/?category=${encodeURIComponent(token)}`}
                    aria-current={isActive ? 'true' : undefined}
                    className={`btn btn-outline flex min-h-[44px] items-center justify-center py-2.5 text-center text-xs tracking-[0.18em] ${
                      isActive
                        ? 'font-bold text-brand-gold underline underline-offset-4'
                        : 'font-semibold'
                    }`}
                    onClick={() => setMenuOpen(false)}
                  >
                    {DEMS_LABELS[letter]}
                  </Link>
                )
              })}
              <AuthNavButton />
            </nav>
          </div>
        ) : null}
      </header>

      <main id="top" className="mx-auto max-w-5xl w-full px-4 py-10 flex-1">
        <AgeGateModal />
        <Outlet />
        <div className="mt-12 flex justify-center">
          <a
            href="#top"
            // Mirrors `.btn-outline` hover (border + bg tint + text) so this
            // standalone link reads visibly on hover instead of just nudging
            // border opacity. transition-colors + duration-200 smooths the
            // change rather than snapping.
            className="inline-flex min-h-[44px] items-center rounded-full border border-brand-gold/60 px-6 py-2.5 text-xs font-semibold tracking-[0.22em] text-brand-text transition-colors duration-200 hover:border-brand-gold hover:bg-brand-gold/15 hover:text-white"
          >
            BACK TO TOP
          </a>
        </div>
      </main>

      <footer className="border-t border-brand-line">
        <FooterStatus />
      </footer>

      {/* Floating Back-to-Top button — visible after 600px of scroll. Smooth
          scroll to the page's #top anchor (the <main>). Uses .btn-outline
          styling for hover consistency with the rest of the site. */}
      <button
        type="button"
        aria-label="Back to top"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`btn btn-outline fixed bottom-6 right-6 z-40 h-12 w-12 !min-w-[48px] !min-h-[48px] !p-0 rounded-full transition-opacity duration-200 ${
          showBackToTop ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <span aria-hidden="true" className="text-base leading-none">↑</span>
      </button>

      {/* Zoom-limit toast — appears when user hits Cmd+/Cmd− past the 4 steps. */}
      {zoomToast ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-brand-gold/40 bg-brand-bg/95 px-5 py-2.5 text-[11px] tracking-[0.18em] text-brand-text shadow-luxe backdrop-blur"
        >
          {zoomToast}
        </div>
      ) : null}
    </div>
  )
}
