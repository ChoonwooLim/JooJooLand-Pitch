import { useTranslation } from 'react-i18next';
import AuroraBackground from '../components/hero/AuroraBackground.jsx';
import SectionTitle from '../components/common/SectionTitle.jsx';
import CTAButton from '../components/common/CTAButton.jsx';
import styles from './Contact.module.css';

export default function Contact() {
  const { t } = useTranslation();

  return (
    <section className={styles.wrap}>
      <AuroraBackground intensity={0.5} />
      <div className={styles.inner}>
        <SectionTitle
          eyebrow="Contact"
          title={t('contact.title')}
          subtitle={t('contact.subtitle')}
          align="center"
          invert
        />

        <div className={styles.card}>
          <div className={styles.cardLabel}>Founder · IP Holder · All Inquiries</div>
          <h3 className={styles.name}>Steven Lim</h3>
          <div className={styles.credentials}>
            All licenses, trademarks, and intellectual property rights of
            <br /> <strong>Pet Twinverse · JooJooLand</strong> are held by Steven Lim.
          </div>
          <div className={styles.contactGrid}>
            <ContactRow
              label={t('contact.investorEmail') + ' / ' + t('contact.partnerEmail')}
              value="choonwoo49@gmail.com"
              href="mailto:choonwoo49@gmail.com"
            />
            <ContactRow label="Phone" value="+82 10-4173-6570" href="tel:+821041736570" />
            <ContactRow label="Location" value="Republic of Korea" />
          </div>

          <div className={styles.ctas}>
            <CTAButton
              href="mailto:choonwoo49@gmail.com?subject=Pet Twinverse Investor Inquiry"
              variant="primary"
              size="lg"
            >
              {t('cta.secondary')} ✉︎
            </CTAButton>
            <CTAButton
              href="mailto:choonwoo49@gmail.com?subject=Pet Twinverse Waitlist"
              variant="secondary"
              size="lg"
            >
              {t('cta.signup')}
            </CTAButton>
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactRow({ label, value, href }) {
  return (
    <div className={styles.row}>
      <div className={styles.rowLabel}>{label}</div>
      <div className={styles.rowValue}>
        {href ? <a href={href}>{value}</a> : value}
      </div>
    </div>
  );
}
