import { useEffect, useState } from 'react'
import rawMenuData from './menu-data.json'
import type { MenuSchema } from './types'
import MenuCategory from './MenuCategory'

const menuData = rawMenuData as MenuSchema
const currency = menuData.Currencies.EUR.Symbol

type View = 'home' | 'menu' | 'document'
type Language = 'en' | 'el'

function App() {
  const [currentView, setCurrentView] = useState<View>('home')
  const [lang, setLang] = useState<Language>('el')
  const [selectedParentCatId, setSelectedParentCatId] = useState<string>('all')

  // Support direct QR access via URL hash (e.g. #menu, #document, or direct table visits)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase()
      if (hash.includes('document') || hash.includes('sheet') || hash.includes('pdf')) {
        setCurrentView('document')
      } else if (hash.includes('menu')) {
        setCurrentView('menu')
      } else {
        setCurrentView('home')
      }
    }

    handleHash()
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  const navigateTo = (view: View) => {
    setCurrentView(view)
    window.location.hash = view === 'home' ? '' : view
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Categories hierarchy
  const topCategories = menuData.Categories.filter((c) => c.ParentCategoryId === null)

  // All catalog leaf categories for full document listing
  const allLeafCategories = menuData.Categories.filter((cat) => {
    if (cat.ParentCategoryId !== null) return true
    const hasChildren = menuData.Categories.some((sub) => sub.ParentCategoryId === cat.Id)
    return !hasChildren
  })

  // Determine categories to show based on horizontal filter
  const displayedCategories = menuData.Categories.filter((cat) => {
    // If it's a subcategory
    if (cat.ParentCategoryId !== null) {
      if (selectedParentCatId === 'all') return true
      return cat.ParentCategoryId === selectedParentCatId
    }
    // If it's a top-level category without subcategories (e.g. bakery)
    const hasChildren = menuData.Categories.some((sub) => sub.ParentCategoryId === cat.Id)
    if (!hasChildren) {
      if (selectedParentCatId === 'all') return true
      return cat.Id === selectedParentCatId
    }
    return false
  })

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 text-neutral-900 antialiased">
      {/* 1. Header Navigation Bar (Sticky, Centered Container) */}
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo / Home Button */}
          <button
            onClick={() => navigateTo('home')}
            className="flex items-center gap-2.5 font-bold tracking-tight text-neutral-900 hover:opacity-80 transition cursor-pointer"
            title={lang === 'el' ? 'Επιστροφή στην Αρχική' : 'Return to Home'}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-white font-mono text-sm">
              🎾
            </span>
            <span className="text-base sm:text-lg">Smash & Serve Cafe</span>
          </button>

          {/* Right Header Controls (Context action + Language Switcher) */}
          <div className="flex items-center gap-3">
            {currentView !== 'home' && (
              <button
                onClick={() => navigateTo('home')}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition cursor-pointer"
              >
                ← {lang === 'el' ? 'Αρχική' : 'Home'}
              </button>
            )}

            {/* Language Toggle */}
            <button
              onClick={() => setLang(lang === 'el' ? 'en' : 'el')}
              className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
              title="Switch Language"
            >
              {lang === 'el' ? 'EN' : 'ΕΛ'}
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Content Area */}
      <main className="flex-1">
        {currentView === 'home' ? (
          /* ================== HOME VIEW MOCKUP ================== */
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 space-y-12">
            {/* Hero Section */}
            <section className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-10 lg:p-12 shadow-xs">
              <div className="max-w-3xl space-y-4">
                <span className="inline-block rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                  {lang === 'el' ? 'Tennis Club & Lounge' : 'Tennis Club & Lounge'}
                </span>
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl">
                  {lang === 'el'
                    ? 'Καλώς ήρθατε στο Smash & Serve Cafe'
                    : 'Welcome to Smash & Serve Cafe'}
                </h1>
                <p className="text-base text-neutral-600 sm:text-lg">
                  {lang === 'el'
                    ? 'Απολαύστε εκλεκτό καφέ, δροσερά ροφήματα και σνακ πριν ή μετά τον αγώνα σας στα γήπεδα.'
                    : 'Enjoy specialty coffee, refreshing beverages, and fresh snacks before or after your tennis match.'}
                </p>
                <div className="pt-2 flex flex-wrap gap-3">
                  <button
                    onClick={() => navigateTo('menu')}
                    className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-neutral-800 transition cursor-pointer"
                  >
                    {lang === 'el' ? 'Δείτε τον Κατάλογο' : 'View Cafe Menu'} →
                  </button>
                </div>
              </div>
            </section>

            {/* Cafe Experience Description */}
            <section className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 lg:p-10 shadow-xs">
              <h2 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl mb-4">
                {lang === 'el' ? 'Η Εμπειρία στο Cafe' : 'The Cafe Experience'}
              </h2>
              <p className="text-base sm:text-lg leading-relaxed text-neutral-600">
                {lang === 'el'
                  ? 'Είτε ολοκληρώσατε έναν έντονο αγώνα στα γήπεδα είτε απλώς θέλετε έναν ήσυχο χώρο για χαλάρωση, το cafe μας προσφέρει τον ιδανικό χώρο. Απολαύστε φρεσκοκαβουρδισμένο καφέ, δροσερά ροφήματα και εκλεκτά αρτοποιήματα και παρακολουθήστε τα παιχνίδια από την άνεση της βεράντας.'
                  : 'Whether cooling down after a hard-fought match or looking for a comfortable spot to unwind, our cafe is your open lounge. Enjoy specialty brewed coffees, iced freddos, and freshly baked snacks while catching live court action from the patio.'}
              </p>
            </section>

            {/* Contact & Location Section */}
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Contact Info & Hours */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-xs flex flex-col justify-between space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900 sm:text-xl mb-4">
                    {lang === 'el' ? 'Επικοινωνία & Ώρες' : 'Contact & Hours'}
                  </h3>
                  <div className="space-y-4 text-sm text-neutral-600">
                    <div>
                      <p className="font-semibold text-neutral-900">{lang === 'el' ? 'Διεύθυνση:' : 'Address:'}</p>
                      <p>Smash & Serve Tennis Club, Court Lane 12, Athens</p>
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-900">{lang === 'el' ? 'Τηλέφωνο:' : 'Phone:'}</p>
                      <a href="tel:+302100000000" className="hover:text-neutral-900 hover:underline">
                        +30 210 000 0000
                      </a>
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-900">{lang === 'el' ? 'Email:' : 'Email:'}</p>
                      <a href="mailto:info@smashservetennis.com" className="hover:text-neutral-900 hover:underline">
                        info@smashservetennis.com
                      </a>
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-900">{lang === 'el' ? 'Ωράριο Cafe:' : 'Cafe Hours:'}</p>
                      <p>{lang === 'el' ? 'Δευτέρα — Κυριακή: 07:30 — 23:00' : 'Monday — Sunday: 07:30 — 23:00'}</p>
                    </div>
                  </div>
                </div>

                {/* Social Links */}
                <div>
                  <p className="font-semibold text-neutral-900 text-sm mb-2">
                    {lang === 'el' ? 'Ακολουθήστε μας:' : 'Follow Us:'}
                  </p>
                  <div className="flex gap-3">
                    <a
                      href="https://instagram.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition"
                    >
                      <span>📷</span> Instagram
                    </a>
                    <a
                      href="https://facebook.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition"
                    >
                      <span>👥</span> Facebook
                    </a>
                  </div>
                </div>
              </div>

              {/* Maps Integration */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-2 shadow-xs lg:col-span-2 overflow-hidden flex flex-col">
                <div className="px-4 py-3 flex items-center justify-between border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📍</span>
                    <span className="font-semibold text-sm text-neutral-900">
                      {lang === 'el' ? 'Χάρτης Τοποθεσίας' : 'Location Map'}
                    </span>
                  </div>
                  <a
                    href="https://maps.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-neutral-600 hover:text-neutral-900 underline"
                  >
                    {lang === 'el' ? 'Άνοιγμα στους Χάρτες ↗' : 'Open in Google Maps ↗'}
                  </a>
                </div>
                <div className="flex-1 min-h-[260px] w-full rounded-xl overflow-hidden bg-neutral-100">
                  <iframe
                    title="Location Map"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d100650.0!2d23.7!3d37.98!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzfCsDU4JzQ4LjAiTiAyM8KwNDInMDAuMCJF!5e0!3m2!1sen!2sgr!4v1600000000000!5m2!1sen!2sgr"
                    className="w-full h-full min-h-[260px] border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            </section>
          </div>
        ) : currentView === 'menu' ? (
          /* ================== CAFE MENU INTERACTIVE VIEW ================== */
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 space-y-6">
            {/* Menu Header with Link to Document View */}
            <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
                  {lang === 'el' ? 'Κατάλογος Καφέ & Σνακ' : 'Cafe & Snack Menu'}
                </h2>
                <p className="text-xs text-neutral-500 sm:text-sm mt-0.5">
                  {lang === 'el'
                    ? 'Ροφήματα, καφέδες και σνακ του Tennis Club'
                    : 'Beverages, coffees, and snacks at the Tennis Club'}
                </p>
              </div>

              {/* Document Preview Link */}
              <button
                onClick={() => navigateTo('document')}
                className="inline-flex items-center gap-1.5 self-start rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition cursor-pointer sm:self-auto"
              >
                <span>📄</span>
                <span>{lang === 'el' ? 'Έντυπη Μορφή' : 'Document View'}</span>
              </button>
            </div>

            {/* Sticky Category Pills */}
            <div className="sticky top-16 z-20 -mx-4 border-y border-neutral-200 bg-white/95 px-4 py-2.5 backdrop-blur-xs sm:mx-0 sm:rounded-lg sm:border">
              <nav className="flex gap-2 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setSelectedParentCatId('all')}
                  className={`shrink-0 rounded-full px-3.5 py-1 text-xs font-semibold transition cursor-pointer ${
                    selectedParentCatId === 'all'
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  {lang === 'el' ? 'Όλα' : 'All'}
                </button>
                {topCategories.map((cat) => (
                  <button
                    key={cat.Id}
                    onClick={() => setSelectedParentCatId(cat.Id)}
                    className={`shrink-0 rounded-full px-3.5 py-1 text-xs font-semibold transition cursor-pointer ${
                      selectedParentCatId === cat.Id
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    {cat.Name[lang] || cat.Name.en}
                  </button>
                ))}
              </nav>
            </div>

            {/* Menu Items Categories Overview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 pt-2 items-start">
              {displayedCategories.map((cat) => {
                const itemsForCat = menuData.Items.filter(
                  (item) => item.ParentCategoryId === cat.Id
                )
                return (
                  <MenuCategory
                    key={cat.Id}
                    category={cat}
                    items={itemsForCat}
                    currencySymbol={currency}
                    lang={lang}
                  />
                )
              })}
            </div>
          </div>
        ) : (
          /* ================== MENU DOCUMENT / PRINTED SHEET PREVIEW ================== */
          <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
            {/* Top Bar Switcher Note */}
            <div className="mb-4 flex items-center justify-between text-xs text-neutral-500">
              <span>{lang === 'el' ? 'Προεπισκόπηση Έντυπου Καταλόγου' : 'Printed Menu Document Preview'}</span>
              <button
                onClick={() => navigateTo('menu')}
                className="font-medium text-neutral-800 hover:underline cursor-pointer"
              >
                ← {lang === 'el' ? 'Επιστροφή στον Διαδραστικό Κατάλογο' : 'Back to interactive catalog'}
              </button>
            </div>

            {/* Document Sheet Container */}
            <article className="rounded-xl border border-neutral-300 bg-white p-6 sm:p-12 shadow-sm space-y-8">
              {/* Document Header */}
              <header className="border-b-2 border-neutral-900 pb-6 text-center space-y-1">
                <p className="text-xs font-semibold tracking-widest text-neutral-500 uppercase">
                  Smash & Serve Tennis Club
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 uppercase">
                  {lang === 'el' ? 'Κατάλογος Cafe & Bar' : 'Cafe & Bar Menu'}
                </h1>
                <p className="text-xs text-neutral-500">
                  {lang === 'el' ? 'Όλες οι τιμές συμπεριλαμβάνουν ΦΠΑ και νόμιμους φόρους' : 'All prices include VAT and legal taxes'}
                </p>
              </header>

              {/* All Categories in Continuous Document Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-start">
                {allLeafCategories.map((cat) => {
                  const itemsForCat = menuData.Items.filter(
                    (item) => item.ParentCategoryId === cat.Id
                  )
                  if (itemsForCat.length === 0) return null

                  const categoryTitle = cat.Name[lang] || cat.Name.en || Object.values(cat.Name)[0]

                  return (
                    <section key={cat.Id} className="space-y-2">
                      <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-300 pb-1">
                        {categoryTitle}
                      </h2>
                      <ul className="list-none p-0 m-0 divide-y divide-neutral-100">
                        {itemsForCat.map((item) => (
                          <li
                            key={item.Id}
                            className="flex items-baseline justify-between gap-2 py-1.5"
                          >
                            <span className="text-xs sm:text-sm text-neutral-800">
                              {item.Name[lang] || item.Name.en || Object.values(item.Name)[0]}
                            </span>
                            <span className="flex-1 border-b border-dotted border-neutral-300 mx-2 relative top-[-3px] min-w-3" aria-hidden="true" />
                            <span className="text-xs sm:text-sm font-semibold tabular-nums text-neutral-900 shrink-0">
                              {currency}{item.Price.Value.toFixed(2)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )
                })}
              </div>

              {/* Document Footer Note */}
              <footer className="border-t border-neutral-200 pt-4 text-center text-[11px] text-neutral-400">
                Smash & Serve Tennis Club • Court Lane 12, Athens • Tel: +30 210 000 0000
              </footer>
            </article>
          </div>
        )}
      </main>

      {/* 3. Global Responsive Footer */}
      <footer className="border-t border-neutral-200 bg-white mt-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 text-center text-xs text-neutral-500 sm:flex-row sm:px-6 sm:text-left lg:px-8">
          <div>
            <p className="font-semibold text-neutral-700">Smash & Serve Tennis Club Cafe</p>
            <p>Court-side refreshments & lounge • +30 210 000 0000</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateTo('home')}
              className="hover:text-neutral-900 transition cursor-pointer"
            >
              {lang === 'el' ? 'Αρχική' : 'Home'}
            </button>
            <span>•</span>
            <button
              onClick={() => navigateTo('menu')}
              className="hover:text-neutral-900 transition cursor-pointer"
            >
              {lang === 'el' ? 'Κατάλογος' : 'Menu'}
            </button>
            <span>•</span>
            <button
              onClick={() => navigateTo('document')}
              className="hover:text-neutral-900 transition cursor-pointer"
            >
              {lang === 'el' ? 'Έντυπο' : 'Document'}
            </button>
            <span>•</span>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-neutral-900 transition"
            >
              Instagram
            </a>
            <span>•</span>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-neutral-900 transition"
            >
              Facebook
            </a>
          </div>
          <p>© {new Date().getFullYear()} All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default App
