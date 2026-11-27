// جسر تيك توك -> ساحة الأساطير VIP
// الاستخدام:  node server.js prnk911      (أو node server.js --mock للتجربة بدون بث)
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { WebSocketServer } = require('ws');

const args = process.argv.slice(2);
const MOCK = args.includes('--mock');
const USER = (args.find(a => !a.startsWith('--')) || process.env.TIKTOK_USER || 'prnk911').replace(/^@/, '');
const CONTROL_KEY = process.env.CONTROL_KEY || ''; // اختياري: رمز سري لأوامر لوحة التحكم (مهم عند الاستضافة على الإنترنت)
const PORT = +process.env.PORT || 3000;
const SIGN_KEY = process.env.EULER_API_KEY || undefined; // اختياري: يرفع حدود الاتصال
const log = (...a) => console.log(new Date().toLocaleTimeString(), ...a);

// ---------- HTTP: يقدّم صفحة اللعبة ----------
const page = path.join(__dirname, 'game.html');
const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  if (url === '/' || url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    fs.createReadStream(page).pipe(res);
  } else if (url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, user: USER, tiktokConnected: netOn, msg: netMsg, viewersOnPage: wss.clients.size }));
  } else { res.writeHead(404); res.end('not found'); }
});

// ---------- WebSocket: يوصل الأحداث واللوحة بالصفحات ----------
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 64 * 1024 });
let netOn = false, netMsg = '';
const send = (ws, o) => { if (ws.readyState === 1) ws.send(JSON.stringify(o)); };
const broadcast = (o, except) => wss.clients.forEach(c => { if (c !== except) send(c, o); });
function setNet(on, msg) { netOn = on; netMsg = msg || ''; broadcast({ k: 'net', on, msg: netMsg }); log(on ? '🟢 متصل بالبث' : '🔴 غير متصل —', netMsg); }

wss.on('connection', (ws, req) => {
  let k = ''; try { k = new URL(req.url, 'http://x').searchParams.get('k') || ''; } catch {}
  ws.canControl = !CONTROL_KEY || k === CONTROL_KEY;
  send(ws, { k: 'net', on: netOn, msg: netMsg });
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    // العميل يرسل فقط رسائل لوحة التحكم/الحالة (doc)، والأحداث تأتي من السيرفر فقط
    if (m && m.k === 'doc' && typeof m.p === 'string' && m.p.length < 50 && m.d && typeof m.d === 'object') {
      if (m.p === 'ctl/cmd' && !ws.canControl) return; // الأوامر تحتاج الرمز السري
      broadcast({ k: 'doc', p: m.p, d: m.d }, ws);
    }
  });
});

// ---------- تحويل أحداث تيك توك ----------
function firstImageUrl(v) {
  if (!v) return undefined;
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) {
    for (const x of v) { const a = firstImageUrl(x); if (a) return a; }
    return undefined;
  }
  if (typeof v === 'object') {
    for (const k of ['urlList','urls','mUrls','url','uri']) {
      const a = firstImageUrl(v[k]); if (a) return a;
    }
  }
  return undefined;
}
function who(u) {
  u = u || {};
  const name = String(u.nickname || u.uniqueId || '').trim().slice(0, 24) || 'مجهول';
  const a = firstImageUrl(u.profilePictureUrls)
    || firstImageUrl(u.profilePictureUrl)
    || firstImageUrl(u.profilePicture)
    || firstImageUrl(u.avatarThumb)
    || firstImageUrl(u.avatarLarger)
    || firstImageUrl(u.avatarMedium);
  const avatar = typeof a === 'string' && /^https:\/\/[^\s"'<>]+$/.test(a) ? a : undefined;
  return { user: name, avatar };
}
let lastJoin = 0;
function emit(type, u, count, eventId) {
  if (type === 'join') { const n = Date.now(); if (n - lastJoin < 300) return; lastJoin = n; } // منع الإغراق
  if (!['join','comment','like','share','follow','gift'].includes(type)) return;
  const e = Object.assign({ type }, who(u));
  const n = Number.isFinite(Number(count)) ? Math.max(1, Math.min(Math.floor(Number(count)), 500)) : 1;
  if (n > 1) e.count = n;
  if (eventId !== undefined && eventId !== null && String(eventId).length < 200) e.id = String(eventId);
  broadcast({ k: 'event', e });
}

let conn = null, retryT = null, connecting = false;
function scheduleRetry() {
  if (retryT) return;
  retryT = setTimeout(() => { retryT = null; start(); }, 15000);
}
async function start() {
  if (connecting) return; connecting = true;
  try {
    if (conn) { Promise.resolve(conn.disconnect()).catch(() => {}); conn = null; }
    const { TikTokLiveConnection, WebcastEvent, ControlEvent } = require('tiktok-live-connector');
    conn = new TikTokLiveConnection(USER, SIGN_KEY ? { signApiKey: SIGN_KEY } : {});
    conn.on(ControlEvent.DISCONNECTED, () => { setNet(false, 'انقطع الاتصال، إعادة المحاولة…'); scheduleRetry(); });
    conn.on(WebcastEvent.STREAM_END, () => { setNet(false, 'انتهى البث'); scheduleRetry(); });
    conn.on(ControlEvent.ERROR, e => log('خطأ:', (e && e.message) || e));
    conn.on(WebcastEvent.CHAT, d => emit('comment', d.user, 1, d.eventId || d.msgId));
    conn.on(WebcastEvent.MEMBER, d => emit('join', d.user, 1, d.eventId || d.msgId));
    conn.on(WebcastEvent.LIKE, d => emit('like', d.user, d.likeCount || 1, d.eventId || d.msgId));
    conn.on(WebcastEvent.SHARE, d => emit('share', d.user, 1, d.eventId || d.msgId));
    conn.on(WebcastEvent.FOLLOW, d => emit('follow', d.user, 1, d.eventId || d.msgId));
    conn.on(WebcastEvent.GIFT, d => {
      const gt = d.giftDetails && d.giftDetails.giftType;
      if (gt === 1 && !d.repeatEnd) return;          // سلسلة هدايا لم تنتهِ بعد
      emit('gift', d.user, d.repeatCount || 1, d.eventId || d.msgId || d.giftId);
    });
    const st = await conn.connect();
    log('تم الاتصال بغرفة البث', st && st.roomId);
    setNet(true, 'live');
  } catch (e) {
    setNet(false, 'تعذر الاتصال: ' + ((e && e.message) || e) + ' (تأكد أن البث شغّال)');
    scheduleRetry();
  }
  connecting = false;
}

// ---------- وضع تجريبي بدون بث ----------
function mock() {
  const N = ['سلمى', 'أبو فهد', 'ليلى', 'Zed', 'ملك', 'حمزة', 'نور', 'Rana'], T = ['comment', 'like', 'like', 'gift', 'share', 'follow', 'join'];
  setNet(true, 'mock');
  setInterval(() => emit(T[Math.random() * T.length | 0], { nickname: N[Math.random() * N.length | 0] + (Math.random() * 30 | 0) }, 1 + (Math.random() * 3 | 0)), 700);
}

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n=== ساحة الأساطير VIP — الجسر ===');
  console.log('الحساب:', '@' + USER, MOCK ? '(وضع تجريبي)' : '');
  const ips = Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
  [...ips, 'localhost'].forEach(ip => {
    console.log('  اللعبة :', `http://${ip}:${PORT}/`);
    console.log('  التحكم :', `http://${ip}:${PORT}/#control`);
  });
  console.log('');
  MOCK ? mock() : start();
});
process.on('unhandledRejection', e => log('تحذير:', (e && e.message) || e));
