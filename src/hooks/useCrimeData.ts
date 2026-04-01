import { useState, useEffect, useCallback, useRef } from 'react'
import type { CrimeRecord, CrimeFilters, CityId } from '../types/crime'
import { fetchCrimeData } from '../utils/api'

export function useCrimeData(city: CityId, filters: CrimeFilters) {
  const [data,        setData]        = useState<CrimeRecord[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Cache: avoid re-fetching the same key twice
  const cacheRef  = useRef<Map<string, CrimeRecord[]>>(new Map())
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef  = useRef<AbortController | null>(null)

  const load = useCallback(async () => {
    const key = `${city}|${filters.offenseGroup}|${filters.dateRange}|${filters.precinct}`

    // Serve from cache immediately while still fresh (10 min)
    const cached = cacheRef.current.get(key)
    if (cached) {
      setData(cached)
      setLoading(false)
      setError(null)
      return
    }

    // Cancel any in-flight request
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setLoading(true)
    setError(null)

    try {
      const records = await fetchCrimeData(city, filters)
      cacheRef.current.set(key, records)
      // Keep cache size bounded
      if (cacheRef.current.size > 10) {
        const firstKey = cacheRef.current.keys().next().value
        if (firstKey) cacheRef.current.delete(firstKey)
      }
      setData(records)
      setLastUpdated(new Date())
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return
      setError('データの取得に失敗しました。しばらくしてから再試行してください。')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [city, filters.offenseGroup, filters.dateRange, filters.precinct])

  useEffect(() => {
    // Debounce: wait 400ms before fetching to avoid rapid consecutive calls
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { load() }, 400)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [load])

  return { data, loading, error, refetch: load, lastUpdated }
}
