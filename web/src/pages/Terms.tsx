import styles from './Page.module.css'

export function Terms() {
  return (
    <main className={styles.page} id="main-content">
      <h1 className={styles.title}>Terms of use</h1>
      <p className={styles.lead}>
        Summary for early access. Full terms will be legally reviewed before launch. Last updated:
        September 2026.
      </p>
      <div className={styles.prose}>
        <h2>The service</h2>
        <p>
          One More Swap is an introduction service for sticker collectors. We help you find people
          with complementary needs and spares. We are not a retailer, marketplace, courier, or
          escrow provider.
        </p>
        <h2>Your responsibility</h2>
        <p>
          Postal delivery, sticker condition, and payment between users are your responsibility. Tier
          3 platform matching is post only — meet in person only with people you already know (Tier
          1 contacts).
        </p>
        <h2>Official stickers</h2>
        <p>
          Everyone should assume swaps are for <strong>official</strong> album stickers (for example
          Panini or Topps, as sold for that album). Unofficial or counterfeit stickers (including
          many lookalikes sold on marketplaces) must be clearly disclosed before anyone agrees to the
          swap. If they are not disclosed, treat the offer as official stock only. We do not verify
          authenticity and we are not responsible for disputes over fakes.
        </p>
        <h2>Fees</h2>
        <p>
          Tier 1 (contacts) and Tier 2 (Match / paste lists) are always free. Tier 3 platform matching is free
          at launch. If fees are introduced later, they cover the introduction — not guaranteed
          delivery.
        </p>
        <h2>Reputation</h2>
        <p>
          Automated reputation affects matching. Strikes apply for confirmed no-shows or false
          reports. We do not manually investigate individual disputes.
        </p>
        <h2>Eligibility</h2>
        <p>
          Account holders must be 18 or over. A parent or legal guardian creates and owns the account
          and accepts these terms. Children may use the service only under that adult account (child
          profiles). UK-first; trades are at your own risk under applicable law.
        </p>
        <h2>Accounts</h2>
        <p>
          Sign-in uses email and password for the adult account holder. Passwords are stored as secure
          hashes only. Keep your login private. Child profiles do not have separate passwords in the
          current design.
        </p>
      </div>
    </main>
  )
}
