'use client'

import { useEffect, useRef } from 'react'
import PusherClient from 'pusher-js'

let pusherInstance = null

function getPusher() {
  if (!pusherInstance && process.env.NEXT_PUBLIC_PUSHER_KEY) {
    pusherInstance = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap2',
    })
  }
  return pusherInstance
}

/**
 * Subscribe to a Pusher channel event.
 * @param {string} channelName
 * @param {string} eventName
 * @param {function} handler
 */
export function usePusher(channelName, eventName, handler) {
  const handlerRef = useRef(handler)
  // safe update of handler ref
  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    if (!channelName || !eventName) return
    const pusher = getPusher()
    if (!pusher) return

    const channel = pusher.subscribe(channelName)
    const cb = (data) => handlerRef.current(data)
    channel.bind(eventName, cb)

    return () => {
      channel.unbind(eventName, cb)
      pusher.unsubscribe(channelName)
    }
  }, [channelName, eventName])
}
