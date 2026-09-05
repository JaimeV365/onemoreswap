import styles from './Page.module.css'

export function Privacy() {
  return (
    <main className={styles.page} id="main-content">
      <h1 className={styles.title}>Privacy policy</h1>
      <p className={styles.lead}>
        Plain-English summary. Full legal text will be reviewed before public launch. Last updated:
        September 2026.
      </p>
      <div className={styles.prose}>
        <h2>Who we are</h2>
        <p>
          One More Swap is operated by JAND Games in the United Kingdom. Contact: privacy@onemoreswap.com
          (placeholder until launch).
        </p>
        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Without an account:</strong> Swap and collection data stay in your browser
            (localStorage). We do not receive it.
          </li>
          <li>
            <strong>Anonymous share links:</strong> if you create a match link, we store only the
            sticker numbers you chose to share (needs and/or spares) plus an expiry. The public page
            never shows your name, email, or profile. Anyone with the link can see those sticker
            numbers.
          </li>
          <li>
            <strong>With an account:</strong> the login email and hashed password belong to a{' '}
            <strong>parent or guardian (18+)</strong>. We store when they confirmed they are the adult
            account holder and accepted the Terms and Privacy policy. Child collector profiles (display
            name / age band) may be stored under that account later — children do not get a separate
            login. Collection/sync data when cloud sync is enabled; addresses only when a trade is
            confirmed. Cloudflare Turnstile may process a bot-check token on sign-up and sign-in.
          </li>
        </ul>
        <h2>Children</h2>
        <p>
          Under the UK Children’s Code we design for high privacy by default for under-18s. The adult
          owns the account and is the primary contact. We aim to collect only what is needed for
          sticker collecting and swaps — not school details, photos, or unnecessary personal data.
        </p>
        <h2>Why we use data</h2>
        <p>
          To provide the service — matching, introductions, and trade coordination. We do not sell
          your data. Marketing emails only with separate consent.
        </p>
        <h2>Retention</h2>
        <p>
          Addresses are deleted 30 days after a trade completes. Video proof uploads are deleted 30
          days after upload. You can export or delete local data anytime via export/clear in the app.
        </p>
        <h2>Your rights</h2>
        <p>
          Under UK GDPR you may access, correct, or delete personal data we hold. Contact us at the
          email above.
        </p>
        <h2>ICO</h2>
        <p>
          We are registered with the UK Information Commissioner&apos;s Office (registration number
          to be published at launch).
        </p>
      </div>
    </main>
  )
}
