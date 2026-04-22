import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SectionTitle from '../components/common/SectionTitle.jsx';
import CTAButton from '../components/common/CTAButton.jsx';
import styles from './DataRoom.module.css';

const SAMPLE_DOCS = [
  { id: 1, title: 'Pet Twinverse — Seed Deck (KR)', size: '8.2 MB', type: 'PDF', locked: true },
  { id: 2, title: 'Pet Twinverse — Seed Deck (EN)', size: '8.4 MB', type: 'PDF', locked: true },
  { id: 3, title: 'Financial Projection 2026–2030', size: '1.1 MB', type: 'XLSX', locked: true },
  { id: 4, title: 'Land Ownership Diligence', size: '3.6 MB', type: 'ZIP', locked: true },
  { id: 5, title: 'Technology Whitepaper', size: '2.4 MB', type: 'PDF', locked: true },
  { id: 6, title: 'Clinical Partnership MOU Drafts', size: '540 KB', type: 'ZIP', locked: true },
];

export default function DataRoom() {
  const { t } = useTranslation();
  const [loggedIn] = useState(false);

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <SectionTitle
            eyebrow="Data Room"
            title={t('dataroom.title')}
            subtitle={t('dataroom.subtitle')}
            align="center"
            invert
          />
        </div>
      </section>

      <section className={`section ${styles.content}`}>
        <div className="container">
          {!loggedIn && (
            <div className={styles.gate}>
              <div className={styles.gateLock}>🔒</div>
              <h3>{t('dataroom.loginRequired')}</h3>
              <p className={styles.gateHint}>
                투자 검토 중이시라면 <strong>Steven Lim</strong> 에게 접근을 요청해주세요.<br />
                <a href="mailto:choonwoo49@gmail.com">choonwoo49@gmail.com</a> · <a href="tel:+821041736570">+82 10-4173-6570</a>
              </p>
              <div className={styles.gateCtas}>
                <CTAButton href="mailto:choonwoo49@gmail.com?subject=Data Room Access Request" variant="primary">
                  {t('dataroom.accessRequest')}
                </CTAButton>
              </div>
            </div>
          )}

          <div className={styles.docList}>
            <div className={styles.docListHeader}>
              <span>문서</span>
              <span>형식</span>
              <span>크기</span>
              <span></span>
            </div>
            {SAMPLE_DOCS.map((doc) => (
              <div key={doc.id} className={`${styles.docRow} ${doc.locked && !loggedIn ? styles.docLocked : ''}`}>
                <div className={styles.docTitle}>{doc.title}</div>
                <div className={styles.docMeta}>{doc.type}</div>
                <div className={styles.docMeta}>{doc.size}</div>
                <div className={styles.docAction}>
                  {loggedIn ? (
                    <button className={styles.docBtn}>다운로드 →</button>
                  ) : (
                    <span className={styles.docLockIcon}>🔒</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
