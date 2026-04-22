import { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LangToggle from './LangToggle.jsx';
import styles from './Header.module.css';

const NAV_ITEMS = [
  { to: '/', key: 'nav.home' },
  { to: '/vision', key: 'nav.vision' },
  { to: '/themepark', key: 'nav.themepark' },
  { to: '/clone', key: 'nav.clone' },
  { to: '/map', key: 'nav.map' },
  { to: '/demo', key: 'nav.demo' },
  { to: '/investment', key: 'nav.investment' },
  { to: '/dataroom', key: 'nav.dataroom' },
  { to: '/contact', key: 'nav.contact' },
];

export default function Header() {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand} onClick={() => setMenuOpen(false)}>
          <span className={styles.brandMark}>◐</span>
          <span className={styles.brandName}>JooJooLand</span>
        </Link>

        <nav className={`${styles.nav} ${menuOpen ? styles.navOpen : ''}`}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {t(item.key)}
            </NavLink>
          ))}
        </nav>

        <div className={styles.actions}>
          <LangToggle />
          <button
            className={styles.menuToggle}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}
