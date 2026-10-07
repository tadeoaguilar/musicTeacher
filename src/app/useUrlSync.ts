import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { StoreApi, UseBoundStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

export type UrlCodec<T, S> = {
  /** Selects the URL-backed settings from the store state. */
  pick: (state: T) => S
  fromParams: (params: URLSearchParams) => S
  toParams: (settings: S) => URLSearchParams
}

/**
 * Loads a section's settings from the URL once, then keeps the URL updated so
 * any view can be shared as a link.
 */
export function useUrlSync<T extends object, S extends Partial<T>>(
  store: UseBoundStore<StoreApi<T>>,
  { pick, fromParams, toParams }: UrlCodec<T, S>,
): S {
  const [params, setParams] = useSearchParams()
  // Hydrate before the first render so the page never flashes default settings.
  useState(() => store.setState(fromParams(params)))
  const settings = store(useShallow(pick))

  useEffect(() => {
    const next = toParams(settings)
    if (next.toString() !== params.toString()) setParams(next, { replace: true })
  }, [settings, params, setParams, toParams])

  return settings
}
