import Pusher from 'pusher'

let pusherServer

if (
  process.env.PUSHER_APP_ID &&
  process.env.PUSHER_KEY &&
  process.env.PUSHER_SECRET
) {
  pusherServer = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.PUSHER_CLUSTER || 'ap2',
    useTLS: true,
  })
} else {
  // Noop fallback
  pusherServer = {
    trigger: async () => {},
  }
}

export default pusherServer
