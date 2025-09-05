export default {
    async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    
    if (url.pathname === '/api/send' && request.method === 'POST') {
    const { text } = await request.json();
    if (!text) return json({ error: 'text required' }, 400);
    // Send to a fixed user/chat id that you set as a secret
    const sendUrl = `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`;
    const tgRes = await fetch(sendUrl, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: env.CHAT_ID, text })
    });
    if (!tgRes.ok) return json({ error: 'telegram send failed' }, 500);
    return json({ ok: true });
    }
    
    
    if (url.pathname === '/api/webhook' && request.method === 'POST') {
    // Telegram will POST updates here. Broadcast to SSE clients.
    const update = await request.json();
    // Only forward text messages
    const msg = update?.message?.text;
    if (msg) {
    await env.CHANNEL.send(JSON.stringify({ text: msg }));
    }
    return new Response('ok');
    }
    
    
    if (url.pathname === '/api/stream') {
    const stream = new ReadableStream({
    start(controller) {
    const send = (data) => controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
    const sub = env.CHANNEL.subscribe(msg => send(msg));
    // heartbeat
    const hb = setInterval(() => send('{}'), 25000);
    // cleanup
    controller.closed.then(() => { clearInterval(hb); sub.unsubscribe(); });
    }
    });
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });
    }
    
    
    // convenience route to set webhook from the edge (one-time)
    if (url.pathname === '/api/set-webhook') {
    const webhookUrl = `${url.origin}/api/webhook`;
    const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
    const data = await res.json();
    return json(data);
    }
    
    
    return new Response('ok');
    }
    }
    
    
    function json(obj, status = 200) {
    return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
    }