import styles from './Page.module.css'

export function Privacy() {
  return (
    <main className={styles.page}>
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
            <strong>Without an account:</strong> paste tool and collection data stay in your browser
            (localStorage). We do not receive it.
          </li>
          <li>
            <strong>With an account:</strong> email address and a hashed password (we never store
            your password in plain text), plus collection/sync data when cloud sync is enabled.
            Addresses only when a trade is confirmed. Cloudflare Turnstile may process a bot-check
            token on sign-up and sign-in.
          </li>
        </ul>
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
