import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { useAccountStore, type SendResult } from '../../account/accountStore'
import styles from './AccountPage.module.css'

/**
 * Sign in with an emailed link, sign out, delete the account. Accounts are optional; they're for
 * Bassically Pro on every device (docs/MONETIZATION.md). Google Play links here for deletion.
 */
export function AccountPage() {
  const { t } = useTranslation()
  const status = useAccountStore((s) => s.status)
  return (
    <article className={styles.page}>
      <h1 className={styles.title}>{t('account.title')}</h1>
      {status === 'signedIn' ? (
        <SignedIn />
      ) : status === 'signedOut' ? (
        <SignIn />
      ) : (
        <p className={styles.muted}>{t('account.loading')}</p>
      )}
    </article>
  )
}

function SignIn() {
  const { t } = useTranslation()
  const { lang } = useParams()
  const { sendLink, linkError, deleted } = useAccountStore()
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ status: SendResult; email: string } | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const address = email.trim()
    setSending(true)
    const status = await sendLink(address, `${window.location.origin}/${lang}/account`)
    setSending(false)
    setResult({ status, email: address })
  }

  if (result?.status === 'sent')
    return (
      <div role="status" className={styles.box}>
        <h2>{t('account.sentTitle')}</h2>
        <p>{t('account.sent', { email: result.email })}</p>
        <button type="button" className={styles.secondary} onClick={() => setResult(null)}>
          {t('account.useAnother')}
        </button>
      </div>
    )

  return (
    <>
      {deleted && (
        <p role="status" className={styles.box}>
          {t('account.deleted')}
        </p>
      )}
      <p>{t('account.intro')}</p>
      {linkError && (
        <p role="alert" className={styles.error}>
          {t('account.linkError')}
        </p>
      )}
      <form className={styles.form} onSubmit={submit}>
        <label htmlFor="account-email">{t('account.email')}</label>
        <div className={styles.row}>
          <input
            id="account-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" className={styles.primary} disabled={sending}>
            {t('account.send')}
          </button>
        </div>
      </form>
      {result && (
        <p role="alert" className={styles.error}>
          {t(result.status === 'rateLimited' ? 'account.rateLimited' : 'account.sendFailed')}
        </p>
      )}
      <p className={styles.muted}>{t('account.noPassword')}</p>
    </>
  )
}

function SignedIn() {
  const { t } = useTranslation()
  const { email, signOut, deleteAccount } = useAccountStore()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [failed, setFailed] = useState(false)

  const remove = async () => {
    setDeleting(true)
    setFailed(false)
    const ok = await deleteAccount()
    if (ok) return // signed out: this view unmounts
    setDeleting(false)
    setFailed(true)
  }

  return (
    <>
      <p>{t('account.signedInAs', { email })}</p>
      <button type="button" className={styles.secondary} onClick={() => void signOut()}>
        {t('account.signOut')}
      </button>

      <section className={styles.danger} aria-labelledby="account-delete">
        <h2 id="account-delete">{t('account.deleteTitle')}</h2>
        <p>{t('account.deleteText')}</p>
        {confirming ? (
          <div className={styles.row}>
            <button
              type="button"
              className={styles.destructive}
              disabled={deleting}
              onClick={() => void remove()}
            >
              {t('account.deleteConfirm')}
            </button>
            <button type="button" className={styles.secondary} onClick={() => setConfirming(false)}>
              {t('account.cancel')}
            </button>
          </div>
        ) : (
          <button type="button" className={styles.secondary} onClick={() => setConfirming(true)}>
            {t('account.delete')}
          </button>
        )}
        {failed && (
          <p role="alert" className={styles.error}>
            {t('account.deleteFailed')}
          </p>
        )}
      </section>
    </>
  )
}
