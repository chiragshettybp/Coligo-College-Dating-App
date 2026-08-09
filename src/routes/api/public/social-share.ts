import { createFileRoute } from '@tanstack/react-router'
import socialAsset from '@/assets/social-share.png.asset.json'

export const Route = createFileRoute('/api/public/social-share')({
  server: {
    handlers: {
      GET: async () => {
        return fetch(socialAsset.url)
      }
    }
  }
})
