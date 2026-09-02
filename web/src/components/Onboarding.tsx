import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from './Button'
import styles from './Onboarding.module.css'

const KEY = 'onemoreswap-onboarding-v1'

type OnboardingProps = {
  show: boolean
}

export function OnboardingBanner({ show }: OnboardingProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!show) return
    try {
      if (localStorage.getItem(KEY) === 'done') return
      setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [show])

  if (!visible) return null

  const dismiss = () => {
    localStorage.setItem(KEY, 'done')
    setVisible(false)
  }

  return (
    <aside className={styles.banner} role="region" aria-label="Getting started">
      <div>
        <h2 className={styles.title}>Get started in 3 steps</h2>
        <ol className={styles.steps}>
          <li>
            <strong>Quick add</strong> stickers you have — or import a World Cup tracker backup under
            Advanced.
          </li>
          <li>
            <strong>Share list</strong> copy needs/spares for WhatsApp.
          </li>
          <li>
            Use the <Link to="/paste">paste tool</Link> to match someone else&apos;s list.
          </li>
        </ol>
      </div>
      <Button variant="secondary" onClick={dismiss}>
        Got it
      </Button>
    </aside>
  )
}
