import { useEffect, useRef, useState } from 'react'
import { Outlet, Link } from 'react-router-dom'
import { AgeGateModal } from './AgeGateModal'
import { AnalyticsBeacon } from './AnalyticsBeacon'
import { AuthNavButton } from './AuthNavButton'
import { FooterStatus } from './FooterStatus'
import { useSiteSettings } from './AdvertisingSpaces'

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
      <header className="sticky top-0 z-10 border-b border-brand-line bg-brand-bg/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <Link to="/" className="group flex items-center gap-3">
            <img
              src="/baligirls_logo.png?v=4"
              alt="BaliGirls"
              width={56}
              height={56}
              // Bumped from h-8/w-8 (32px) to h-14/w-14 (56px) so the figure +
              // palm-tree silhouette is actually legible in the header. The
              // source PNG is now 256x256, giving us a clean ~2x retina render
              // at this display size.
              className="h-14 w-14 object-contain"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
            <div className="leading-none">
              <div className="font-display text-lg tracking-[0.22em] text-brand-gold">FREE BALI GIRLS</div>
              {subtitle ? <div className="mt-1 text-xs tracking-[0.22em] text-brand-muted">{subtitle}</div> : null}
            </div>
            <span className="ml-1 h-[1px] w-10 bg-brand-gold/70 opacity-70 transition group-hover:opacity-100" />
          </Link>

          {/* overflow-x-clip (instead of overflow-hidden) keeps long button
              chains from spilling horizontally, while letting vertical hover
              effects (focus rings, inset shadows) render fully. The previous
              `overflow-hidden` was clipping the buttons' hover state and
              making borders look truncated. */}
          <nav className="flex w-full min-w-0 flex-nowrap items-center justify-center gap-1 overflow-x-clip whitespace-nowrap md:w-auto md:justify-start">
            <AuthNavButton />
          </nav>
        </div>
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
