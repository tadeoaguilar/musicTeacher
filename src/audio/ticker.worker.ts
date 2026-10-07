// A steady timer for the metronome scheduler. Timers on the main thread are
// throttled in background tabs; timers in a worker keep running.
let timer: ReturnType<typeof setInterval> | undefined

self.onmessage = (e: MessageEvent<'start' | 'stop'>) => {
  clearInterval(timer)
  timer = undefined
  if (e.data === 'start') timer = setInterval(() => self.postMessage('tick'), 25)
}
