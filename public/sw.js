// Service worker for background web-push notifications (Coligo).
// Receives push events and shows notifications even when the app is closed,
// and focuses/opens the relevant chat when a notification is clicked.

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: "Coligo", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Coligo";
  const data = payload.data || {};
  const options = {
    body: payload.body || "",
    icon: "/coligo-512.png",
    badge: "/coligo-512.png",
    tag: data.matchId ? `chat-${data.matchId}` : payload.type || "coligo",
    renotify: true,
    data,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = data.matchId ? `/chat/${data.matchId}` : "/chat";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(url).catch(() => {});
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
