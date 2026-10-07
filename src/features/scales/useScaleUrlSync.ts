import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import { pickSettings, settingsFromParams, settingsToParams, useScaleStore } from './scaleState'

/** Loads settings from the URL once, then keeps the URL updated so any view can be shared as a link. */
export function useScaleUrlSync() {
  const [params, setParams] = useSearchParams()
  // Hydrate before the first render so the page never flashes default settings.
  useState(() => useScaleStore.setState(settingsFromParams(params)))
  const settings = useScaleStore(useShallow(pickSettings))

  useEffect(() => {
    const next = settingsToParams(settings)
    if (next.toString() !== params.toString()) setParams(next, { replace: true })
  }, [settings, params, setParams])

  return settings
}
