export function GET() {
  const receivedAt = Date.now();
  return Response.json({ receivedAt, sentAt: Date.now() }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
