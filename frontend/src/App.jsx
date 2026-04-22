import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header.jsx';
import Footer from './components/layout/Footer.jsx';

const Home = lazy(() => import('./pages/Home.jsx'));
const Vision = lazy(() => import('./pages/Vision.jsx'));
const ThemePark = lazy(() => import('./pages/ThemePark.jsx'));
const DigitalClone = lazy(() => import('./pages/DigitalClone.jsx'));
const MapPage = lazy(() => import('./pages/Map.jsx'));
const Demo = lazy(() => import('./pages/Demo.jsx'));
const Investment = lazy(() => import('./pages/Investment.jsx'));
const DataRoom = lazy(() => import('./pages/DataRoom.jsx'));
const Contact = lazy(() => import('./pages/Contact.jsx'));

function PageLoader() {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <div className="page-loader__aurora" aria-hidden />
      <div className="page-loader__text">Loading…</div>
    </div>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <Header />
      <main className="app-main">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/vision" element={<Vision />} />
            <Route path="/themepark" element={<ThemePark />} />
            <Route path="/clone" element={<DigitalClone />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/investment" element={<Investment />} />
            <Route path="/dataroom" element={<DataRoom />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
