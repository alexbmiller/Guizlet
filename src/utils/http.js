// Small shared fetch helper: adds an abort-based timeout and chains an
// optional caller AbortSignal so either the timeout or the caller can cancel.
// On timeout it aborts with a DOMException named 'TimeoutError'; on caller
// cancel the rejection carries the caller's reason (name 'AbortError').

/**
 * @param {string} url
 * @param {{headers?: object, body?: any, method?: string, signal?: AbortSignal, timeoutMs?: number}} [opts]
 * @returns {Promise<Response>}
 */
export async function fetchWithTimeout(url, opts = {}) {
  const { headers, body, method, signal, timeoutMs = 15000 } = opts
  const controller = new AbortController()
  const timer = setTimeout(
    () => controller.abort(new DOMException('Timeout', 'TimeoutError')),
    timeoutMs,
  )

  if (signal) {
    if (signal.aborted) controller.abort(signal.reason)
    else
      signal.addEventListener('abort', () => controller.abort(signal.reason), {
        once: true,
      })
  }

  try {
    return await fetch(url, { headers, body, method, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}
