import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import SectionTitle from '../components/common/SectionTitle.jsx';
import AuroraBackground from '../components/hero/AuroraBackground.jsx';
import {
  documents,
  meta,
  conclusion,
  resultLegend,
  RESULT_TONE,
  needsAction,
  criticalIssues,
  categories,
  keyNumbers,
  actionSteps,
  riskSummary,
  keyQuestions,
  finalNote,
  collectTrackables,
} from '../data/permitReview.js';
import styles from './Permits.module.css';

const STORAGE_KEY = 'joojoo_permit_status';

function loadStatus() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function riskTone(level) {
  if (level === 'High') return 'high';
  if (level.includes('High')) return 'midhigh';
  return 'mid';
}

function ResultBadge({ result }) {
  return (
    <span className={`${styles.badge} ${styles[`tone-${RESULT_TONE[result] || 'na'}`]}`}>
      {result}
    </span>
  );
}

export default function Permits() {
  const { t } = useTranslation();
  const [status, setStatus] = useState(loadStatus);
  const [unresolvedOnly, setUnresolvedOnly] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
    } catch {
      /* localStorage 사용 불가 환경 — 무시 */
    }
  }, [status]);

  const toggle = useCallback((id) => {
    setStatus((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const trackables = useMemo(() => collectTrackables(), []);
  const total = trackables.length;
  const done = trackables.filter((tk) => status[tk.id]).length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  const isHidden = (id, actionable) => unresolvedOnly && actionable && status[id];

  const resetAll = () => {
    if (window.confirm('모든 해결 체크를 초기화할까요?')) setStatus({});
  };

  return (
    <>
      <section className={styles.hero}>
        <AuroraBackground intensity={0.6} />
        <div className={styles.heroInner}>
          <SectionTitle
            eyebrow="Licensing & Permits"
            title={t('permits.title')}
            subtitle={t('permits.subtitle')}
            align="center"
            invert
          />
          <div className={styles.metaCard}>
            <dl className={styles.metaGrid}>
              {meta.map((m) => (
                <div key={m.k} className={styles.metaRow}>
                  <dt>{m.k}</dt>
                  <dd>{m.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <div className="container">
        {/* 한 줄 결론 */}
        <div className={`${styles.callout} ${styles.calloutBlock}`}>
          <span className={styles.calloutTag}>{t('permits.conclusion')}</span>
          <p>{conclusion}</p>
        </div>

        {/* 문서 */}
        <section className={styles.block}>
          <h2 className={styles.h2}>{t('permits.docs')}</h2>
          <div className={styles.docRow}>
            {[documents.result, documents.analysis].map((d) => (
              <a key={d.href} className={styles.docCard} href={d.href} target="_blank" rel="noreferrer">
                <span className={styles.docIcon} aria-hidden>PDF</span>
                <span className={styles.docBody}>
                  <strong>{d.label}</strong>
                  <span>{d.note}</span>
                </span>
                <span className={styles.docOpen} aria-hidden>↗</span>
              </a>
            ))}
          </div>
        </section>

        {/* 진행률 */}
        <section className={`${styles.block} ${styles.progressWrap}`}>
          <div className={styles.progressHead}>
            <h2 className={styles.h2}>{t('permits.progress')}</h2>
            <div className={styles.progressControls}>
              <label className={styles.filterToggle}>
                <input
                  type="checkbox"
                  checked={unresolvedOnly}
                  onChange={(e) => setUnresolvedOnly(e.target.checked)}
                />
                {t('permits.filterUnresolved')}
              </label>
              <button className={styles.resetBtn} onClick={resetAll} type="button">
                {t('permits.reset')}
              </button>
            </div>
          </div>
          <div className={styles.progressBar} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <div className={styles.progressFill} style={{ width: `${percent}%` }} />
          </div>
          <p className={styles.progressLabel}>
            <strong>{done}</strong> / {total} {t('permits.itemsResolved')} · <strong>{percent}%</strong>
          </p>
        </section>

        {/* Critical Issues */}
        <section className={styles.block}>
          <h2 className={styles.h2}>{t('permits.blockers')} <span className={styles.h2Sub}>{t('permits.blockersSub')}</span></h2>
          <div className={styles.issueGrid}>
            {criticalIssues.map((c) => {
              if (isHidden(c.id, true)) return null;
              const checked = !!status[c.id];
              return (
                <article key={c.id} className={`${styles.issueCard} ${checked ? styles.itemDone : ''}`}>
                  <header className={styles.issueHead}>
                    <ResultBadge result={c.result} />
                    <span className={`${styles.riskPill} ${styles[`risk-${riskTone(c.risk)}`]}`}>{c.risk}</span>
                    <h3>{c.title}</h3>
                  </header>
                  <p className={styles.issueSummary}>{c.summary}</p>
                  <p className={styles.issuePlain}>{c.plain}</p>
                  <p className={styles.actionLabel}>{t('permits.todo')}</p>
                  <ul className={styles.actionList}>
                    {c.actions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                  <label className={styles.resolveRow}>
                    <input type="checkbox" checked={checked} onChange={() => toggle(c.id)} />
                    <span>{t('permits.markResolved')}</span>
                  </label>
                </article>
              );
            })}
          </div>
        </section>

        {/* 부서별 검토 결과 */}
        <section className={styles.block}>
          <h2 className={styles.h2}>{t('permits.byDept')}</h2>
          {categories.map((cat) => {
            const visible = cat.items.filter((it) => !isHidden(it.id, needsAction(it.result)));
            if (unresolvedOnly && visible.length === 0) return null;
            return (
              <div key={cat.id} className={styles.catBlock}>
                <h3 className={styles.h3}>{cat.title}</h3>
                <p className={styles.catNote}>{cat.note}</p>
                <div className={styles.tableScroll}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.checkCol}>{t('permits.done')}</th>
                        {cat.cols.map((col) => (
                          <th key={col}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((it) => {
                        const actionable = needsAction(it.result);
                        const checked = !!status[it.id];
                        return (
                          <tr key={it.id} className={checked ? styles.rowDone : ''}>
                            <td className={styles.checkCol}>
                              {actionable ? (
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggle(it.id)}
                                  aria-label={`${it.name} 해결 여부`}
                                />
                              ) : (
                                <span className={styles.noAction}>—</span>
                              )}
                            </td>
                            <td className={styles.nameCell}>{it.name}</td>
                            <td><ResultBadge result={it.result} /></td>
                            <td>{it.detail}</td>
                            {it.extra !== undefined && <td className={styles.extraCell}>{it.extra}</td>}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </section>

        {/* 실무 우선 Step */}
        <section className={styles.block}>
          <h2 className={styles.h2}>{t('permits.steps')}</h2>
          <ol className={styles.stepList}>
            {actionSteps.map((s) => {
              if (isHidden(s.id, true)) return null;
              const checked = !!status[s.id];
              return (
                <li key={s.id} className={`${styles.stepCard} ${checked ? styles.itemDone : ''}`}>
                  <label className={styles.stepCheck}>
                    <input type="checkbox" checked={checked} onChange={() => toggle(s.id)} />
                  </label>
                  <div className={styles.stepBody}>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* 핵심 숫자 */}
        <section className={styles.block}>
          <h2 className={styles.h2}>{t('permits.numbers')}</h2>
          <div className={styles.numberGrid}>
            {keyNumbers.map((n) => (
              <div key={n.std} className={styles.numberCard}>
                <strong>{n.std}</strong>
                <span>{n.mean}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 종합 Risk */}
        <section className={styles.block}>
          <h2 className={styles.h2}>{t('permits.risk')}</h2>
          <div className={styles.riskGrid}>
            {riskSummary.map((r) => (
              <div key={r.area} className={styles.riskCard}>
                <div className={styles.riskTop}>
                  <span className={styles.riskArea}>{r.area}</span>
                  <span className={`${styles.riskPill} ${styles[`risk-${riskTone(r.level)}`]}`}>{r.level}</span>
                </div>
                <p>{r.reason}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 용어 정리 */}
        <section className={styles.block}>
          <h2 className={styles.h2}>{t('permits.legend')}</h2>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('permits.legendTerm')}</th>
                  <th>{t('permits.legendMean')}</th>
                  <th>{t('permits.legendDir')}</th>
                </tr>
              </thead>
              <tbody>
                {resultLegend.map((l) => (
                  <tr key={l.code}>
                    <td><ResultBadge result={l.code} /></td>
                    <td>{l.mean}</td>
                    <td>{l.dir}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 최종 의견 */}
        <section className={`${styles.block} ${styles.finalBlock}`}>
          <h2 className={styles.h2}>{t('permits.final')}</h2>
          <p className={styles.finalLead}>{t('permits.finalLead')}</p>
          <ol className={styles.questionList}>
            {keyQuestions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ol>
          <p className={styles.finalNote}>{finalNote}</p>
        </section>
      </div>
    </>
  );
}
