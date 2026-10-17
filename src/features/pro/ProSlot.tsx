import type { FeatureId } from '../../access/access'
import { Paywall } from '../../components/Pro/Paywall'
import { ProTeaser } from '../../components/Pro/ProTeaser'
import { useAccess, useAccessStore, visibleProFeatures } from './accessStore'

/**
 * Where a Pro feature goes on a page. Locked: a teaser that opens the paywall. Hidden: nothing.
 * Open: the feature itself, once it exists (Phase 5 of docs/MONETIZATION.md); nothing for now.
 */
export function ProSlot({ feature }: { feature: FeatureId }) {
  const access = useAccess(feature)
  const openPaywall = useAccessStore((s) => s.openPaywall)
  return access === 'locked' ? <ProTeaser feature={feature} onLearnMore={openPaywall} /> : null
}

/** The one paywall, mounted in the layout; lists the Pro features that aren't hidden. */
export function PaywallHost() {
  const state = useAccessStore()
  if (!state.paywallOpen) return null
  return <Paywall features={visibleProFeatures(state)} onClose={state.closePaywall} />
}
