const legacyServiceWorkerRetirementScript = `
self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil((async function () {
    await self.registration.unregister();

    const windowClients = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    });

    await Promise.all(windowClients.map(function (client) {
      return client.navigate(client.url);
    }));
  })());
});
`;

function GET() {
  return new Response(legacyServiceWorkerRetirementScript, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Content-Type": "application/javascript; charset=utf-8",
      "Service-Worker-Allowed": "/",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export { GET };
