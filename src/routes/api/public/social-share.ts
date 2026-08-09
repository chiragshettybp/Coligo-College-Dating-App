import { createFileRoute } from '@tanstack/react-router'
import socialAsset from '@/assets/social-share-new.png.asset.json'

export const Route = createFileRoute('/api/public/social-share')({
  server: {
    handlers: {
      GET: async () => {
        const response = await fetch(socialAsset.url);
        const headers = new Headers(response.headers);
        headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
        headers.set("Pragma", "no-cache");
        headers.set("Expires", "0");
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }
    }
  }
})
