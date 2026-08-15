/**
 * Runs at most one operation at a time, dropping anything offered while busy.
 *
 * The scanner only ever wants the most recent capture: queueing frames would mean decoding older
 * and older images while the loop moves on, so a dropped frame costs nothing and a queue costs
 * everything.
 */
export function singleFlight<T, R>(run: (input: T) => Promise<R>): (input: T) => Promise<R | null> {
  let busy = false
  return async (input: T) => {
    if (busy) return null
    busy = true
    try {
      return await run(input)
    } finally {
      // Also on rejection: leaving the flag set would stop the scanner dead after one failure.
      busy = false
    }
  }
}
