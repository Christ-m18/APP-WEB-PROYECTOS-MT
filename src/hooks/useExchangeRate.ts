import { useQuery } from '@tanstack/react-query'

const FALLBACK_RATE = 60.50

interface ExchangeRateResponse {
  result: string
  rates: Record<string, number>
}

async function fetchUsdToDop(): Promise<number> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD')
    if (!res.ok) return FALLBACK_RATE
    const data: ExchangeRateResponse = await res.json()
    return data.rates?.DOP ?? FALLBACK_RATE
  } catch {
    return FALLBACK_RATE
  }
}

export function useExchangeRate() {
  const query = useQuery({
    queryKey: ['exchange-rate-usd-dop'],
    queryFn: fetchUsdToDop,
    staleTime: 7 * 24 * 60 * 60 * 1000, // 1 semana
    gcTime: 7 * 24 * 60 * 60 * 1000,
    retry: 2,
  })

  return {
    rate: query.data ?? FALLBACK_RATE,
    isLoading: query.isLoading,
  }
}
