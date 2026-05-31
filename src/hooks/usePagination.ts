import { useState } from 'react'

export const usePagination = (initialLimit = 10) => {
  const [page,  setPage]  = useState(1)
  const [limit, setLimit] = useState(initialLimit)
  const reset = () => setPage(1)
  return { page, setPage, limit, setLimit, reset }
}
