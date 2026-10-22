/* =========================================================
   Barber app prototype — plain HTML/CSS/JS, no build step.
   Everything the admin edits lives in one "DB" object saved in
   localStorage, so changes in the dashboard show up in the app.
   In the real app this DB becomes a server + database.
   ========================================================= */
(function () {
  'use strict';

  const app = document.getElementById('app');

  /* ---------- admin account (prototype only) ---------- */
  // NOTE: in the real app the admin account lives on the server, never in the app code.
  const ADMIN = { phone: '07701234567', pw: '123456' };

  /* ---------- helpers ---------- */
  const fmt = (n) => Number(n || 0).toLocaleString('ar-EG');
  const money = (n) => fmt(n) + ' د.ع';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const parseIso = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

  const DAY_NAMES = ['شەممە', 'یەکشەممە', 'دووشەممە', 'سێشەممە', 'چوارشەممە', 'پێنجشەممە', 'هەینی'];
  const DAY_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ه'];
  const MONTHS = ['کانوونی دووەم', 'شوبات', 'ئازار', 'نیسان', 'ئایار', 'حوزەیران', 'تەممووز', 'ئاب', 'ئەیلوول', 'تشرینی یەکەم', 'تشرینی دووەم', 'کانوونی یەکەم'];
  const col = (d) => (d.getDay() + 1) % 7;           // Saturday = 0 … Friday = 6
  const isClosed = (d) => col(d) === 6;               // shop closed on Fridays
  const dayLong = (d) => DAY_NAMES[col(d)] + '، ' + fmt(d.getDate()) + 'ی ' + MONTHS[d.getMonth()];
  const dayShort = (d) => fmt(d.getDate()) + 'ی ' + MONTHS[d.getMonth()];

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const firstOpenDay = () => { let d = new Date(today); while (isClosed(d)) d = addDays(d, 1); return d; };
  const nextOpenDay = () => { let d = addDays(today, 1); while (isClosed(d)) d = addDays(d, 1); return d; };

  /* ---------- time slots (shared by every kind of booking) ---------- */
  const SESSIONS = [[600, 780], [900, 1200]];        // 10:00–13:00 and 15:00–20:00, in minutes
  const STEP = 30;
  const tLabel = (m) => { const h = Math.floor(m / 60); const mm = m % 60; return (h > 12 ? h - 12 : h) + ':' + String(mm).padStart(2, '0'); };
  const tPeriod = (m) => (m < 720 ? 'بەیانی' : m < 900 ? 'نیوەڕۆ' : 'ئێوارە');
  const nowMins = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };

  /* ---------- icons ---------- */
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
    calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    cap: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>',
    bag: '<path d="M6 7h12l1 14H5z"/><path d="M9 7a3 3 0 0 1 6 0"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    back: '<path d="M9 6l6 6-6 6"/>',
    chevL: '<path d="M15 6l-6 6 6 6"/>',
    chevDown: '<path d="M6 9l6 6 6-6"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    award: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14 7 22l5-3 5 3-1.5-8"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    insta: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/>',
    logout: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><path d="M10 8l-4 4 4 4M6 12h10"/>',
    jar: '<rect x="5" y="9" width="14" height="12" rx="2"/><path d="M6 5h12v4H6z"/>',
    bottle: '<path d="M10 2h4v4l2 3v12a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V9l2-3z"/><path d="M8 13h8"/>',
    tube: '<path d="M8 4h8v3H8z"/><path d="M7 7h10l1 3v10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V10z"/>',
    spray: '<path d="M9 7h6v14H9z"/><path d="M10 7V4h4l3 1M17 3v4"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 9"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    gift: '<rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v8h14v-8M12 8v13"/><path d="M12 8C10 4 6.5 4 7 6.5S12 8 12 8zM12 8c2-4 5.5-4 5-1.5S12 8 12 8z"/>',
    crown: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>',
    box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    arrow: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    store: '<path d="M4 9l1.5-5h13L20 9"/><path d="M4 9h16v2a3 3 0 0 1-5.3 2 3 3 0 0 1-5.4 0A3 3 0 0 1 4 11z"/><path d="M5 13v8h14v-8"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    ticket: '<path d="M3 8a2 2 0 0 0 0 4v4a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-4a2 2 0 0 1 0-4V5a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z" transform="translate(0 1.5)"/><path d="M14 5v14" stroke-dasharray="2 2.5"/>'
  };
  const icon = (n, s = 22, w = 1.8) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;
  const silhouette = (w, h, color, style) => `<svg class="silhouette" width="${w}" height="${h}" viewBox="0 0 24 28" fill="${color || 'currentColor'}" aria-hidden="true" ${style ? `style="${style}"` : ''}><circle cx="12" cy="8" r="5"/><path d="M2 28c0-7 4.5-11 10-11s10 4 10 11z"/></svg>`;
  const pic = (src, alt) => src ? `<img src="${esc(src)}" alt="${esc(alt || '')}" loading="lazy">` : '';

  let pid = 0;
  const pattern = (h = 240, op = 0.24) => {
    const id = 'pt' + (++pid);
    return `<svg class="hdr-pattern" aria-hidden="true" viewBox="0 0 390 ${h}" preserveAspectRatio="xMidYMid slice"><defs>
      <pattern id="${id}s" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M16 5 L27 16 L16 27 L5 16 Z" fill="none" stroke="#E3B04B" stroke-width=".7"/><rect x="8.2" y="8.2" width="15.6" height="15.6" fill="none" stroke="#E3B04B" stroke-width=".7"/><circle cx="16" cy="16" r="1.8" fill="#E3B04B"/></pattern>
      <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff"/><stop offset=".7" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <mask id="${id}m"><rect width="390" height="${h}" fill="url(#${id}g)"/></mask></defs>
      <rect width="390" height="${h}" fill="url(#${id}s)" opacity="${op}" mask="url(#${id}m)"/>
      <circle cx="30" cy="10" r="120" fill="none" stroke="#E3B04B" stroke-opacity=".16"/><circle cx="30" cy="10" r="88" fill="none" stroke="#E3B04B" stroke-opacity=".1"/></svg>`;
  };

  /* =========================================================
     DATA — seed values. The admin dashboard edits all of this.
     ========================================================= */
  const DB_KEY = 'barber_db_v3';
  function seed() {
    const d1 = iso(nextOpenDay());
    const plus = (n) => iso(addDays(today, n));
    return {
      shop: { name: 'ناوی دوکان', tagline: 'ستایلی خۆت، بە دەستی شارەزا', address: '[شار · گەڕەک · شەقام]', hours: 'شەممە – پێنجشەممە · ١٠ی بەیانی – ٨ی ئێوارە', phone: '+964 7XX XXX XXXX', insta: '@[username]' },
      news: [
        { id: 'n1', tag: 'ئۆفەر · ئەمڕۆ', title: '٪٢٠ داشکاندن لەسەر قژ و ڕیش تا کۆتایی مانگ', text: 'تەنها بۆ ئەو نۆرانەی لە ڕێگەی ئەپەوە دەگیرێن.', img: '' },
        { id: 'n2', tag: 'هەواڵ · دوێنێ', title: 'کاتی کاری نوێی پێنجشەممە تا ١٠ی شەو', text: 'لە ئەم هەفتەیەوە پێنجشەممان درەنگتر دادەخەین.', img: '' },
        { id: 'n3', tag: 'کڵاس ماستەر', title: 'ناونووسینی خولی بنەڕەتی دەلاکی دەستی پێکرد', text: 'کورسییەکان سنووردارن، زوو ناوت بنووسە.', img: '' }
      ],
      featured: { barberId: 'k', title: 'وەستای مانگ', text: 'زیاتر لە ١٢ ساڵ ئەزموون لە فەید و دیزاینی ڕیش. ئەم مانگە نۆرە لای کاروان بگرە.', img: '' },
      why: {
        title: 'بۆچی ئێمە هەڵدەبژێریت؟',
        intro: 'لێرە قژبڕین تەنها خزمەتگوزارییەک نییە. هەموو وردەکارییەک، لە پێشوازییەوە تا دوا دەستلێدان، بە ئاگاییەوە ئامادە کراوە.',
        points: ['وەستای شارەزا | هەر وەستایەک ساڵانێک ئەزموونی هەیە و بەردەوام خولی نوێ دەبینێت.', 'بێ چاوەڕوانی | نۆرەکەت بە خولەک دیاری دەکرێت، لە کاتی خۆیدا ئامادەین.', 'پاکوخاوێنی تەواو | ئامێرەکان دوای هەر موشتەرییەک پاک و بێمیکرۆب دەکرێنەوە.', 'بەرهەمی ئۆرجیناڵ | تەنها بەرهەمی باوەڕپێکراو و پرۆفیشناڵ بەکار دێنین.'],
        stats: ['١٢+ | ساڵ ئەزموون', '٥٠٠٠+ | موشتەری ڕازی', '٤ | وەستای شارەزا']
      },
      barbers: [
        { id: 'k', name: 'کاروان', role: 'وەستای سەرەکی', avail: true, years: 12, students: '٤٠+', about: 'لە ساڵی ٢٠١٢ەوە کار دەکات. پسپۆڕی فەید و دیزاینی ڕیشە و مامۆستای کڵاس ماستەرە.', skills: ['فەید', 'دیزاینی ڕیش', 'کێراتین', 'قژی کلاسیک'], certs: ['دەلاکی پرۆفیشناڵ | 2014', 'تەکنیکی فەیدی پێشکەوتوو | 2018', 'چاودێری پێست و قژ | 2021'], phone: '+964 7XX XXX XXXX', insta: '@karwan', img: '' },
        { id: 's', name: 'شوان', role: 'قژبڕین و فەید', avail: true, years: 7, students: '١٢', about: 'شارەزای قژی کورت و فەیدی مۆدێرنە.', skills: ['فەید', 'قژی کورت'], certs: ['دەلاکی پرۆفیشناڵ | 2017', 'تەکنیکی فەید | 2020'], phone: '', insta: '', img: '' },
        { id: 'h', name: 'هێمن', role: 'پێست و مەساج', avail: false, years: 5, students: '—', about: 'پسپۆڕی پاککردنەوەی پێست و مەساجە.', skills: ['پاککردنەوەی پێست', 'مەساج'], certs: ['چاودێری پێست | 2019'], phone: '', insta: '', img: '' },
        { id: 'd', name: 'دلێر', role: 'ڕیش و تاشین', avail: true, years: 4, students: '—', about: 'تاشین بە تیغ و ڕێکخستنی ڕیش.', skills: ['ڕیش', 'تاشین بە تیغ'], certs: ['دەلاکی پرۆفیشناڵ | 2021'], phone: '', insta: '', img: '' }
      ],
      // Main booking tab (normal, everyday services)
      basic: [
        { id: 'b1', name: 'قژبڕینی کلاسیک', dur: 30, price: 10000 },
        { id: 'b2', name: 'قژبڕین + ڕیش', dur: 45, price: 15000 },
        { id: 'b3', name: 'ڕێکخستنی ڕیش', dur: 20, price: 7000 },
        { id: 'b4', name: 'شوشتن و ستایل', dur: 15, price: 5000 }
      ],
      // Services section — each tab has its own booking flow
      vip: [
        { id: 'v1', name: 'خاوکردنەوەی قژ (کێراتین)', desc: 'قژێکی نەرم و ڕاست بۆ چەند مانگێک، بە بەرهەمی پرۆفیشناڵ و بێ زیان بۆ قژ.', dur: 90, price: 40000, badge: 'باوترین' },
        { id: 'v2', name: 'لوولکردنی قژ (Curl)', desc: 'لوولی سروشتی و جێگیر، بەپێی درێژی و جۆری قژەکەت.', dur: 75, price: 35000, badge: '' },
        { id: 'v3', name: 'مەساجی سەر و شان', desc: 'مەساجێکی ئارامکەرەوە بە ڕۆنی گەرم بۆ لابردنی ماندووبوون و فشار.', dur: 30, price: 12000, badge: '' },
        { id: 'v4', name: 'پاککردنەوەی پێستی دەموچاو', desc: 'پاککردنەوەی قووڵ، ماسک و هەڵمی گەرم بۆ پێستێکی تازە.', dur: 45, price: 20000, badge: 'نوێ' }
      ],
      packages: [
        { id: 'p1', name: 'پاکێجی زاوا', desc: 'هەموو ئەوەی بۆ ڕۆژی زەماوەند پێویستتە، لە یەک دانیشتندا.', items: ['قژبڕین و ستایل', 'ڕیش بە تیغ', 'پاککردنەوەی پێستی دەموچاو', 'مەساجی سەر و شان'], dur: 120, price: 75000, old: 90000 },
        { id: 'p2', name: 'پاکێجی مانگانە', desc: '٤ قژبڕین لە ماوەی یەک مانگدا. ئەمە نۆرەی یەکەمە، ئەوانی تر دواتر دەگیرێن.', items: ['٤ قژبڕین', 'شوشتن و ستایل', '٪١٠ داشکاندن لەسەر بەرهەمەکان'], dur: 30, price: 35000, old: 40000 }
      ],
      offers: [
        { id: 'o1', name: 'قژ و ڕیش پێکەوە بە نرخی تایبەت', desc: 'تەنها بۆ ئەو نۆرانەی لە ڕێگەی ئەپەوە دەگیرێن.', badge: '٪٢٠ داشکاندن', dur: 45, price: 12000, old: 15000, ends: plus(9) },
        { id: 'o2', name: 'مەساجی بێبەرامبەر لەگەڵ کێراتین', desc: 'هەر کەسێک کێراتین بکات، مەساجی سەر و شانی بێبەرامبەر وەردەگرێت.', badge: 'دیاری', dur: 120, price: 40000, old: 52000, ends: plus(20) }
      ],
      brands: [
        { id: 'barbero', name: 'Barbero', short: 'Bb', bg: '#E4EEE7', fg: '#1F3D2B', desc: 'چاودێری قژ و ڕیشی پیاوان' },
        { id: 'velvet', name: 'Velvet Hair', short: 'Vh', bg: '#ECE7F4', fg: '#3B2A5A', desc: 'ستایل و جێگیرکردنی قژ' },
        { id: 'oud', name: 'Oud & Co', short: 'O&C', bg: '#F4ECDD', fg: '#5A4019', desc: 'بۆن و ڕۆنی ڕیش' },
        { id: 'nordic', name: 'Nordic Groom', short: 'NG', bg: '#E3ECF6', fg: '#1E3A5F', desc: 'بەرهەمی سروشتی' }
      ],
      products: [
        ['barbero', 'مۆمی قژی ماتی', '١٠٠ مل', 12000, 'jar', 'ok', 'hair'], ['barbero', 'ڕۆنی ڕیش', '٣٠ مل', 15000, 'bottle', 'ok', 'beard'], ['barbero', 'شامپۆی ڕۆژانە', '٢٥٠ مل', 10000, 'tube', 'low', 'wash'],
        ['velvet', 'سپرەی جێگیرکەر', '٢٠٠ مل', 9000, 'spray', 'ok', 'hair'], ['velvet', 'کرێمی ستایل', '١٠٠ مل', 11000, 'jar', 'ok', 'hair'],
        ['oud', 'ڕۆنی ڕیشی عود', '٣٠ مل', 18000, 'bottle', 'ok', 'beard'], ['oud', 'ئافتەرشەیڤ', '١٠٠ مل', 11000, 'bottle', 'out', 'beard'],
        ['nordic', 'شامپۆی سروشتی', '٢٥٠ مل', 13000, 'tube', 'ok', 'wash'], ['nordic', 'کرێمی تاشین', '١٥٠ مل', 8000, 'jar', 'ok', 'beard']
      ].map((p, i) => ({ id: 'pr' + i, brandId: p[0], name: p[1], size: p[2], price: p[3], icon: p[4], stock: p[5], cat: p[6], img: '' })),
      courses: [
        { id: 'c1', title: 'خولی بنەڕەتی دەلاکی', level: 'سەرەتایی', price: 350000, durN: 2, durU: 'مانگ', sessions: '٣ ڕۆژ لە هەفتەدا · ٤ – ٧ی ئێوارە', start: plus(12), seats: 12, instructor: 'k',
          desc: 'خولێکی تەواو بۆ ئەوانەی دەیانەوێت ببنە دەلاکی پرۆفیشناڵ. لە ناساندنی ئامێرەکانەوە دەست پێدەکات تا قژبڕینی تەواو لەسەر موشتەری ڕاستەقینە.',
          learn: ['ناسینی ئامێرەکان و پاککردنەوەیان', 'شێوەکانی قژبڕین بە مەقەست و مەکینە', 'فەیدی بنەڕەتی', 'ڕێکخستنی ڕیش', 'مامەڵەکردن لەگەڵ موشتەری'], includes: ['بڕوانامەی تەواوکردن', 'کیتی ئامێری سەرەتایی', 'ڕاهێنان لەسەر موشتەری ڕاستەقینە'], img: '' },
        { id: 'c2', title: 'تەکنیکی فەید (Fade)', level: 'ناوەند', price: 200000, durN: 4, durU: 'هەفتە', sessions: '٢ ڕۆژ لە هەفتەدا · ٥ – ٧ی ئێوارە', start: plus(20), seats: 8, instructor: 's',
          desc: 'بۆ ئەو دەلاکانەی بنەڕەتیان هەیە و دەیانەوێت فەیدێکی پاک و بێ هێڵ فێر ببن.', learn: ['Skin fade', 'Low / Mid / High fade', 'تێکەڵکردنی مەقەست و مەکینە'], includes: ['بڕوانامە', 'ڤیدیۆی دووبارەکردنەوە'], img: '' },
        { id: 'c3', title: 'دیزاینی ڕیش', level: 'ناوەند', price: 120000, durN: 10, durU: 'ڕۆژ', sessions: 'ڕۆژانە · ٦ – ٨ی ئێوارە', start: plus(30), seats: 10, instructor: 'd',
          desc: 'شێوەدانی ڕیش بەپێی شێوەی دەموچاو و تاشین بە تیغ.', learn: ['شێوەکانی ڕیش', 'تاشین بە تیغ', 'هەڵمی گەرم و چاودێری پێست'], includes: ['بڕوانامە'], img: '' }
      ],
      gallery: [
        { id: 'g1', title: 'فەیدی کورت', barberId: 'k', img: '' }, { id: 'g2', title: 'ڕیشی ڕێکخراو', barberId: 's', img: '' },
        { id: 'g3', title: 'پاککردنەوەی پێست', barberId: 'h', img: '' }, { id: 'g4', title: 'قژی کلاسیک', barberId: 'k', img: '' }, { id: 'g5', title: 'تاشین بە تیغ', barberId: 'd', img: '' }
      ],
      // A few sample bookings so you can see that a time taken in one place is blocked everywhere.
      bookings: [
        { id: 'sb1', kind: 'basic', items: ['قژبڕینی کلاسیک'], barberId: 'k', date: d1, start: 600, dur: 30, total: 10000, name: 'نموونە', phone: '07500000000', status: 'active', created: Date.now() },
        { id: 'sb2', kind: 'vip', items: ['خاوکردنەوەی قژ (کێراتین)'], barberId: 'k', date: d1, start: 900, dur: 90, total: 40000, name: 'نموونە', phone: '07500000000', status: 'active', created: Date.now() },
        { id: 'sb3', kind: 'packages', items: ['پاکێجی زاوا'], barberId: 's', date: d1, start: 660, dur: 120, total: 75000, name: 'نموونە', phone: '07500000001', status: 'active', created: Date.now() }
      ],
      enrol: [
        ...['ئارام', 'ڕێبین', 'هاوکار', 'سەروەر', 'دیار'].map((n, i) => ({ id: 'se' + i, courseId: 'c1', name: n, phone: '0750000001' + i, created: Date.now() })),
        ...['کامەران', 'ئاسۆ', 'بەختیار', 'زانا', 'ڕێکار', 'هەڵۆ'].map((n, i) => ({ id: 'sf' + i, courseId: 'c2', name: n, phone: '0750000002' + i, created: Date.now() }))
      ]
    };
  }
  let DB = store.get(DB_KEY, null) || seed();
  const save = () => { if (!store.set(DB_KEY, DB)) toast('شوێنی هەڵگرتن پڕ بووە — وێنەی بچووکتر بەکاربهێنە'); };

  const KIND = { basic: 'نۆرەی ئاسایی', vip: 'خزمەتگوزاری تایبەت', packages: 'پاکێج', offers: 'ئۆفەر' };
  const barberById = (id) => DB.barbers.find((b) => b.id === id);
  const split2 = (s) => { const i = String(s).indexOf('|'); return i < 0 ? [String(s).trim(), ''] : [s.slice(0, i).trim(), s.slice(i + 1).trim()]; };
  const daysLeft = (isoStr) => Math.round((parseIso(isoStr) - today) / 864e5);
  const liveOffers = () => DB.offers.filter((o) => !o.ends || daysLeft(o.ends) >= 0);
  const seatsTaken = (cid) => DB.enrol.filter((e) => e.courseId === cid).length;
  const courseDur = (c) => fmt(c.durN) + ' ' + c.durU;

  /* ---------- booking engine: one shared calendar for all kinds ---------- */
  const roundDur = (d) => Math.max(STEP, Math.ceil((Number(d) || STEP) / STEP) * STEP);
  function busySet(barberId, date) {
    const s = new Set();
    DB.bookings.forEach((b) => {
      if (b.status === 'cancelled' || b.barberId !== barberId || b.date !== date) return;
      for (let m = b.start; m < b.start + roundDur(b.dur); m += STEP) s.add(m);
    });
    return s;
  }
  function slotOk(barberId, date, start, dur) {
    const len = roundDur(dur);
    const ses = SESSIONS.find(([a, z]) => start >= a && start + len <= z);
    if (!ses) return false;
    if (date === iso(today) && start <= nowMins()) return false;
    const busy = busySet(barberId, date);
    for (let m = start; m < start + len; m += STEP) if (busy.has(m)) return false;
    return true;
  }
  const freeBarber = (date, start, dur) => DB.barbers.find((b) => b.avail && slotOk(b.id, date, start, dur));
  const slotOkFor = (barber, date, start, dur) => barber === 'any' ? !!freeBarber(date, start, dur) : slotOk(barber, date, start, dur);
  const allStarts = () => { const out = []; SESSIONS.forEach(([a, z]) => { for (let m = a; m < z; m += STEP) out.push(m); }); return out; };

  /* ---------- state ---------- */
  const state = {
    user: store.get('user', null),
    guest: store.get('guest', false),
    admin: store.get('admin', false),
    authTab: 'login',
    svcTab: 'vip',
    bk: null,
    brandFilter: 'all',
    cart: store.get('cart', []),
    modal: null,
    newsIdx: 0,
    admBk: 'upcoming',
    admBrand: 'all'
  };
  const newBk = (kind, itemId, barber) => ({ kind, itemId: itemId || '', barber: barber || 'any', svc: {}, date: iso(firstOpenDay()), time: null, calOpen: false, barberOpen: false, calMonth: new Date(firstOpenDay().getFullYear(), firstOpenDay().getMonth(), 1) });
  const ensureBk = (kind, itemId) => { if (!state.bk || state.bk.kind !== kind || state.bk.itemId !== (itemId || '')) state.bk = newBk(kind, itemId); return state.bk; };

  /* ---------- shared pieces ---------- */
  const header = ({ kicker = '', title = '', sub = '', back = '', right = '', extra = '' }) => `
    <header class="hdr">${pattern()}
      <div class="hdr-row">
        ${back ? `<a class="icon-btn" href="${back}" aria-label="گەڕانەوە">${icon('back', 20, 2)}</a>` : ''}
        <div class="hdr-titles">${kicker ? `<span class="kicker">${kicker}</span>` : ''}<h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>
        ${right}
      </div>${extra}
    </header>`;

  const cartBtn = () => `<a class="icon-btn" href="#/products" aria-label="سەبەتە، ${fmt(state.cart.length)} بەرهەم">${icon('bag', 20)}${state.cart.length ? `<span class="badge-dot">${fmt(state.cart.length)}</span>` : ''}</a>`;

  const NAV = [
    ['/home', 'home', 'ماڵەوە'], ['/services', 'scissors', 'خزمەتگوزاری'], ['/barbers', 'users', 'وەستاکان'],
    ['/booking', 'calendar', 'نۆرە'], ['/masterclass', 'cap', 'کڵاس'], ['/products', 'bag', 'بەرهەم'], ['/profile', 'user', 'پڕۆفایل']
  ];
  const nav = (active) => `<nav class="nav" aria-label="ناوبری سەرەکی">${NAV.map(([r, ic, label]) => {
    const on = r === active; const center = r === '/booking';
    return `<a href="#${r}" class="${center ? 'center' : ''} ${on ? 'on' : ''}" ${on ? 'aria-current="page"' : ''}><span class="ic">${icon(ic, 22, on || center ? 2 : 1.7)}</span><span>${label}</span></a>`;
  }).join('')}</nav>`;

  const barberPhoto = (b, w, h, col) => b && b.img ? pic(b.img, b.name) : silhouette(w, h, col || '#C3CAD6');

  /* =========================================================
     CUSTOMER SCREENS
     ========================================================= */
  function authScreen() {
    const t = state.authTab;
    const pw = (id, label, ph, auto) => `<div class="field"><label for="${id}">${label}</label><div class="input-wrap"><input class="input has-btn" id="${id}" name="${id}" type="password" placeholder="${ph}" autocomplete="${auto}" required><button type="button" class="eye" data-action="togglePw" data-arg="${id}" aria-label="پیشاندانی وشەی نهێنی">${icon('eye', 19)}</button></div></div>`;
    const fields = t === 'login'
      ? `<div class="field"><label for="phone">ژمارەی مۆبایل</label><input class="input" id="phone" name="phone" type="tel" inputmode="tel" placeholder="07XX XXX XXXX" autocomplete="tel" required></div>
         ${pw('pw', 'وشەی نهێنی', '••••••••', 'current-password')}
         <button type="button" class="link" data-action="forgot">وشەی نهێنیت بیرچووە؟</button>`
      : `<div class="field"><label for="name">ناوی تەواو</label><input class="input" id="name" name="name" placeholder="ناوت بنووسە" autocomplete="name" required></div>
         <div class="field"><label for="phone">ژمارەی مۆبایل</label><input class="input" id="phone" name="phone" type="tel" inputmode="tel" placeholder="07XX XXX XXXX" autocomplete="tel" required></div>
         <div class="field"><label for="dob">ڕۆژی لەدایکبوون</label><input class="input" id="dob" name="dob" type="date" max="${iso(today)}" required></div>
         ${pw('pw', 'وشەی نهێنی', 'لانیکەم ٦ پیت یان ژمارە', 'new-password')}
         ${pw('pw2', 'دووبارەکردنەوەی وشەی نهێنی', 'هەمان وشەی نهێنی', 'new-password')}`;
    return `<div class="screen auth">
      <header class="hdr">${pattern(280)}
        <div class="brand-lockup"><span class="logo">${icon('scissors', 26, 2)}</span><div><b>${esc(DB.shop.name)}</b><small>BARBER STUDIO</small></div></div>
        <div class="hdr-titles"><h1>${t === 'login' ? 'بەخێربێیتەوە' : 'هەژمارێکی نوێ'}</h1><p>${t === 'login' ? 'بە ژمارەی مۆبایل و وشەی نهێنی بچۆ ژوورەوە' : 'تەنها چەند زانیارییەکی کورت'}</p></div>
      </header>
      <div class="pad">
        <div class="seg" role="tablist">
          <button type="button" role="tab" aria-selected="${t === 'login'}" class="${t === 'login' ? 'on' : ''}" data-action="authTab" data-arg="login">چوونەژوورەوە</button>
          <button type="button" role="tab" aria-selected="${t === 'signup'}" class="${t === 'signup' ? 'on' : ''}" data-action="authTab" data-arg="signup">خۆتۆمارکردن</button>
        </div>
        <form id="authForm" class="card form" novalidate>
          ${fields}
          <p class="form-error" id="formError" role="alert"></p>
          <button class="btn btn-primary btn-block" type="submit">${t === 'login' ? 'چوونەژوورەوە' : 'دروستکردنی هەژمار'}</button>
        </form>
        <button type="button" class="btn btn-ghost btn-block" data-action="guest">وەک میوان بەردەوام بە</button>
      </div>
    </div>`;
  }

  function greeting() {
    const h = new Date().getHours();
    const g = h < 12 ? 'بەیانیت باش' : h < 17 ? 'ڕۆژت باش' : 'ئێوارەت باش';
    return state.user ? g + '، ' + esc(state.user.name.split(' ')[0]) : g;
  }

  function homeScreen() {
    const S = DB.shop; const W = DB.why; const F = DB.featured; const fb = barberById(F.barberId) || DB.barbers[0];
    const news = DB.news.length ? DB.news : [{ id: 'x', tag: '', title: 'هێشتا هیچ هەواڵێک نییە', text: '', img: '' }];
    if (state.newsIdx >= news.length) state.newsIdx = 0;
    const slides = news.map((n, i) => `<article class="slide v${i % 3} ${i === state.newsIdx ? 'on' : ''}" aria-label="${fmt(i + 1)} لە ${fmt(news.length)}">
        ${n.img ? pic(n.img, n.title) : pattern(220, 0.3)}
        <div class="slide-shade"></div>
        <div class="slide-body">${n.tag ? `<span class="slide-tag">${esc(n.tag)}</span>` : ''}<h3>${esc(n.title)}</h3>${n.text ? `<p>${esc(n.text)}</p>` : ''}</div>
      </article>`).join('');
    const dots = news.map((n, i) => `<button type="button" class="dot ${i === state.newsIdx ? 'on' : ''}" data-action="newsGo" data-arg="${i}" aria-label="هەواڵی ${fmt(i + 1)}"><i></i></button>`).join('');
    const pts = (W.points || []).map(split2);
    const stats = (W.stats || []).map(split2);
    const gal = DB.gallery;

    return `<div class="screen home">
      <header class="hdr home-hdr" id="homeHdr">${pattern(300)}
        <div class="hh-row">
          <span class="logo">${icon('scissors', 28, 2)}</span>
          <div class="hh-titles"><b>${esc(S.name)}</b><small>BARBER STUDIO</small></div>
          <button type="button" class="icon-btn" aria-label="ئاگادارکردنەوەکان" data-action="toast" data-arg="هیچ ئاگادارکردنەوەیەکی نوێ نییە">${icon('bell', 20)}<span class="ping"></span></button>
        </div>
        <div class="hh-hero">
          <span class="hh-greet">${greeting()}</span>
          <h1>${esc(S.tagline)}</h1>
          <div class="hh-actions"><a class="btn btn-gold" href="#/booking">${icon('calendar', 18, 2)}نۆرە بگرە</a><a class="btn btn-glass" href="#/services">خزمەتگوزارییەکان</a></div>
        </div>
      </header>
      <div class="home-spacer" aria-hidden="true"></div>

      <div class="pad" style="gap:30px">
        <section class="news" aria-roledescription="carousel" aria-label="هەواڵەکان">
          <div class="news-view" id="newsView"><div class="news-track" id="newsTrack" style="transform:translateX(${state.newsIdx * 100}%)">${slides}</div></div>
          ${news.length > 1 ? `<div class="news-dots">${dots}</div>` : ''}
        </section>

        ${fb ? `<section class="spot reveal">
          <div class="spot-head"><span class="eyebrow">${icon('star', 14, 2)}${esc(F.title)}</span></div>
          <a class="spot-link" href="#/barber/${fb.id}" aria-label="پڕۆفایلی ${esc(fb.name)}">
            <div class="spot-frame">
              <span class="orn o1"></span><span class="orn o2"></span><span class="orn o3"></span>
              <div class="spot-img">${F.img ? pic(F.img, fb.name) : fb.img ? pic(fb.img, fb.name) : pattern(400, 0.18) + silhouette(220, 260, '#2C3D61', 'bottom:0')}<span class="sheen"></span></div>
            </div>
            <div class="spot-plaque">
              <div class="txt"><b>${esc(fb.name)}</b><small>${esc(fb.role)} · ${fmt(fb.years)} ساڵ ئەزموون</small></div>
              <span class="go">${icon('arrow', 18, 2)}</span>
            </div>
          </a>
          ${F.text ? `<p class="spot-text">${esc(F.text)}</p>` : ''}
        </section>` : ''}

        <section class="why-panel reveal">${pattern(520, 0.18)}
          <span class="eyebrow gold">${icon('crown', 14, 2)}جیاوازیمان</span>
          <h2>${esc(W.title)}</h2>
          ${W.intro ? `<p class="intro">${esc(W.intro)}</p>` : ''}
          ${stats.length ? `<div class="why-stats">${stats.map(([v, l]) => `<div><b>${esc(v)}</b><small>${esc(l)}</small></div>`).join('')}</div>` : ''}
          <ol class="why-list">${pts.map(([t, s], i) => `<li><span class="n"><span>${fmt(i + 1)}</span></span><div><b>${esc(t)}</b>${s ? `<span>${esc(s)}</span>` : ''}</div></li>`).join('')}</ol>
        </section>

        <section class="section reveal">
          <div class="section-head"><h2>وەستاکانمان</h2><a href="#/barbers">هەمووی</a></div>
          <div class="rail">${DB.barbers.map((b) => `<a class="tile ${b.avail ? '' : 'dim'}" href="#/barber/${b.id}"><div class="ph">${barberPhoto(b, 110, 130)}<span class="pill ${b.avail ? 'ok' : 'off'}"><span class="dot"></span>${b.avail ? 'بەردەستە' : 'بەردەست نییە'}</span></div><b>${esc(b.name)}</b><small>${esc(b.role)}</small></a>`).join('')}</div>
        </section>

        ${gal.length ? `<section class="section reveal">
          <div class="section-head"><div><h2>گەلەری</h2><span>دواین کارەکانی وەستاکانمان</span></div></div>
          <div class="rail">${gal.map((g, i) => { const b = barberById(g.barberId); return `<div class="tile"><div class="ph" style="background:${i % 2 ? '#E4E7EC' : '#DCE1EA'}">${g.img ? pic(g.img, g.title) : '<span class="ph-label">[وێنەی کار]</span>'}${b ? `<span class="tag">${esc(b.name)}</span>` : ''}</div><b>${esc(g.title)}</b></div>`; }).join('')}</div>
        </section>` : ''}

        <section class="section reveal">
          <div class="section-head"><h2>سەردانمان بکە</h2></div>
          <div class="card info-list" style="padding-top:6px">
            <div class="info-row"><span class="ic">${icon('pin', 19)}</span><div class="txt"><small>ناونیشان</small><b>${esc(S.address)}</b></div></div>
            <div class="info-row"><span class="ic">${icon('clock', 19)}</span><div class="txt"><small>کاتی کارکردن</small><b>${esc(S.hours)}</b><small>هەینی: داخراوە</small></div></div>
            <div class="info-row"><span class="ic">${icon('phone', 19)}</span><div class="txt"><small>پەیوەندی</small><b class="ltr" style="text-align:right">${esc(S.phone)}</b></div></div>
            <div class="row-actions"><a class="btn btn-primary" href="tel:${esc(S.phone.replace(/[^\d+]/g, ''))}">پەیوەندی بکە</a><a class="btn btn-ghost" href="https://maps.google.com" target="_blank" rel="noopener">نەخشە</a></div>
          </div>
        </section>
      </div>
    </div>`;
  }

  /* ----- Services: three separate sections, each with its own booking ----- */
  function servicesScreen() {
    const t = state.svcTab;
    const tab = (id, ic, label, n) => `<button type="button" role="tab" aria-selected="${t === id}" class="${t === id ? 'on' : ''}" data-action="svcTab" data-arg="${id}">${icon(ic, 16, 2)}${label}<span class="cnt">${fmt(n)}</span></button>`;
    const offers = liveOffers();
    const intro = {
      vip: ['crown', 'خزمەتگوزارییە تایبەتەکان', 'کاتی زیاتریان پێدەدرێت و نۆرەکانیان لێرەوە، جیا لە نۆرەی ئاسایی، دەگیرێن.'],
      packages: ['box', 'پاکێجەکان', 'چەند خزمەتگوزارییەک لە یەک دانیشتندا، بە نرخێکی کەمتر.'],
      offers: ['gift', 'ئۆفەرەکان', 'بۆ ماوەیەکی دیاریکراون. پێش کۆتاییهاتن نۆرە بگرە.']
    }[t];
    let list = '';
    if (t === 'vip') {
      list = DB.vip.map((s) => `<article class="svc-card reveal">
        <div class="svc-top"><span class="svc-ic">${icon('sparkle', 24, 1.8)}</span>
          <div class="svc-head"><span class="svc-kicker">خزمەتگوزاری تایبەت</span><h3>${esc(s.name)}</h3></div>
          ${s.badge ? `<span class="pill gold">${esc(s.badge)}</span>` : ''}</div>
        <p class="svc-desc">${esc(s.desc)}</p>
        <div class="svc-meta"><span>${icon('clock', 15, 2)}${fmt(s.dur)} خولەک</span><span>${icon('user', 15, 2)}وەستای دڵخواز</span><span>${icon('shield', 15, 2)}بەرهەمی ئۆرجیناڵ</span></div>
        <div class="svc-foot"><div class="svc-price"><small>نرخ</small><b>${fmt(s.price)}</b><span>د.ع</span></div>
          <a class="btn btn-primary" href="#/book/vip/${s.id}">نۆرە بگرە${icon('arrow', 17, 2)}</a></div>
      </article>`).join('');
    } else if (t === 'packages') {
      list = DB.packages.map((p) => `<article class="pkg-card reveal">
        <div class="pkg-top">${pattern(160, 0.22)}<span class="svc-kicker gold">پاکێج · ${fmt(p.dur)} خولەک</span><h3>${esc(p.name)}</h3><p>${esc(p.desc)}</p></div>
        <div class="pkg-body">
          ${(p.items || []).length ? `<span class="pkg-label">ئەم پاکێجە پێکدێت لە:</span><ul class="pkg-items">${p.items.map((i) => `<li><span class="tick">${icon('check', 13, 2.6)}</span>${esc(i)}</li>`).join('')}</ul>` : ''}
          <div class="svc-foot"><div class="svc-price"><small>نرخی پاکێج</small><b>${fmt(p.price)}</b><span>د.ع</span>${p.old ? `<s>${fmt(p.old)}</s>` : ''}</div>
            <a class="btn btn-primary" href="#/book/packages/${p.id}">نۆرە بگرە${icon('arrow', 17, 2)}</a></div>
        </div>
      </article>`).join('');
    } else {
      list = offers.map((o) => { const dl = o.ends ? daysLeft(o.ends) : null; const pct = o.old ? Math.round((1 - o.price / o.old) * 100) : 0; return `<article class="svc-card offer reveal">
        <span class="ribbon">${esc(o.badge || ('٪' + fmt(pct)))}</span>
        <div class="svc-top"><span class="svc-ic gold">${icon('gift', 24, 1.8)}</span>
          <div class="svc-head"><span class="svc-kicker">ئۆفەر</span><h3>${esc(o.name)}</h3></div></div>
        <p class="svc-desc">${esc(o.desc)}</p>
        <div class="svc-meta"><span>${icon('clock', 15, 2)}${fmt(o.dur)} خولەک</span>${dl != null ? `<span class="warn">${icon('calendar', 15, 2)}${dl === 0 ? 'دوا ڕۆژە' : fmt(dl) + ' ڕۆژی ماوە'}</span>` : ''}</div>
        <div class="svc-foot"><div class="svc-price"><small>نرخی ئۆفەر</small><b>${fmt(o.price)}</b><span>د.ع</span>${o.old ? `<s>${fmt(o.old)}</s>` : ''}</div>
          <a class="btn btn-gold" href="#/book/offers/${o.id}">نۆرە بگرە${icon('arrow', 17, 2)}</a></div>
      </article>`; }).join('') || '<div class="card empty"><span class="ic">' + icon('gift', 30, 1.6) + '</span><h2>ئێستا هیچ ئۆفەرێک نییە</h2><p>ئۆفەرە نوێیەکان لێرە دەردەکەون.</p></div>';
    }
    return `<div class="screen">${header({ kicker: 'لیستی نرخەکان', title: 'خزمەتگوزارییەکان', sub: 'هەر بەشێک نۆرە گرتنی تایبەتی خۆی هەیە' })}
      <div class="pad"><div class="seg seg-ic" role="tablist">${tab('vip', 'crown', 'خزمەتگوزاری', DB.vip.length)}${tab('packages', 'box', 'پاکێج', DB.packages.length)}${tab('offers', 'gift', 'ئۆفەر', offers.length)}</div>
        <div class="tab-intro"><span class="ic">${icon(intro[0], 20, 1.8)}</span><div><b>${intro[1]}</b><span>${intro[2]}</span></div></div>
        ${list}</div></div>`;
  }

  /* ----- Booking (main tab = normal services; /book/<kind>/<id> = services section) ----- */
  function bookingScreen(kind, itemId) {
    kind = kind || 'basic';
    if (!state.user) return gateScreen('بۆ نۆرە گرتن پێویستە خۆت تۆمار بکەیت', 'تەنها بە ناو و ژمارەی مۆبایل، کەمتر لە خولەکێک.', kind === 'basic' ? '#/home' : '#/services');
    const bk = ensureBk(kind, itemId);
    let item = null; let chosen = []; let total = 0; let dur = 0;
    if (kind === 'basic') {
      chosen = DB.basic.filter((s) => bk.svc[s.id]);
      total = chosen.reduce((a, s) => a + Number(s.price), 0); dur = chosen.reduce((a, s) => a + Number(s.dur), 0);
    } else {
      item = (DB[kind] || []).find((x) => x.id === itemId);
      if (!item) { location.replace('#/services'); return ''; }
      total = Number(item.price); dur = Number(item.dur); chosen = [item];
    }
    const need = dur || STEP;
    const avail = DB.barbers.filter((b) => b.avail);
    const cur = bk.barber === 'any' ? { id: 'any', name: 'هەر وەستایەک', role: 'یەکەم وەستای بەردەست' } : barberById(bk.barber) || { id: 'any', name: 'هەر وەستایەک', role: '' };
    const avInit = (b) => b.id === 'any' ? '★' : esc(b.name.charAt(0));
    const options = [{ id: 'any', name: 'هەر وەستایەک', role: 'یەکەم وەستای بەردەست', avail: true }].concat(DB.barbers);
    const date = parseIso(bk.date);
    if (bk.time != null && !slotOkFor(bk.barber, bk.date, bk.time, need)) bk.time = null;

    // calendar
    const m = bk.calMonth;
    const first = new Date(m.getFullYear(), m.getMonth(), 1);
    const daysIn = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    const minMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const maxMonth = new Date(today.getFullYear(), today.getMonth() + 2, 1);
    let cells = DAY_SHORT.map((d) => `<span class="wd">${d}</span>`).join('');
    for (let i = 0; i < col(first); i++) cells += '<span></span>';
    for (let d = 1; d <= daysIn; d++) {
      const dd = new Date(m.getFullYear(), m.getMonth(), d);
      const off = dd < today || isClosed(dd) || dd > addDays(today, 62);
      cells += `<button type="button" class="day ${iso(dd) === bk.date ? 'sel' : ''} ${iso(dd) === iso(today) ? 'today' : ''}" ${off ? 'disabled' : ''} data-action="pickDay" data-arg="${iso(dd)}" aria-label="${DAY_NAMES[col(dd)]} ${d}">${fmt(d)}</button>`;
    }

    const starts = allStarts();
    const slot = (s) => { const ok = slotOkFor(bk.barber, bk.date, s, need); return `<button type="button" class="time ${bk.time === s ? 'sel' : ''}" ${ok ? '' : 'disabled'} data-action="pickTime" data-arg="${s}" ${ok ? '' : 'aria-label="' + tLabel(s) + ' گیراوە"'}>${tLabel(s)}</button>`; };
    const freeCount = starts.filter((s) => slotOkFor(bk.barber, bk.date, s, need)).length;

    const n = kind === 'basic' ? ['١', '٢', '٣', '٤'] : ['١', '', '٢', '٣'];
    const steps = [['وەستا', true], [kind === 'basic' ? 'خزمەتگوزاری' : KIND[kind], chosen.length > 0], ['بەروار و کات', bk.time != null], ['پشتڕاستکردنەوە', false]];
    const summary = [DAY_NAMES[col(date)] + ' ' + fmt(date.getDate()), bk.time != null ? tLabel(bk.time) + ' ' + tPeriod(bk.time) : 'کات هەڵنەبژێردراوە', cur.name].join(' · ');

    return `<div class="screen has-bar">
      ${header({ kicker: kind === 'basic' ? '' : KIND[kind], title: kind === 'basic' ? 'نۆرە گرتن' : 'نۆرەی ' + KIND[kind], sub: kind === 'basic' ? 'خزمەتگوزارییە ڕۆژانەکان · چوار هەنگاوی کورت' : 'ئەم نۆرەیە جیایە، بەڵام کاتی وەستاکان هاوبەشە', back: kind === 'basic' ? '#/home' : '#/services',
        extra: `<div class="steps">${steps.map(([l, d]) => `<div class="step ${d ? 'done' : ''}"><i></i>${l}</div>`).join('')}</div>` })}
      <div class="pad" style="gap:14px">
        ${item ? `<section class="chosen-item"><span class="svc-ic">${icon(kind === 'vip' ? 'sparkle' : kind === 'packages' ? 'box' : 'gift', 22)}</span>
          <div class="txt"><small>${KIND[kind]}</small><b>${esc(item.name)}</b><span>${fmt(item.dur)} خولەک · ${money(item.price)}</span></div>
          <a class="link" href="#/services">گۆڕین</a></section>` : ''}

        <section class="card section">
          <div class="card-title"><span class="num">${n[0]}</span><h2>وەستا هەڵبژێرە</h2></div>
          <button type="button" class="select-btn" aria-expanded="${bk.barberOpen}" data-action="barberOpen">
            <span class="av">${avInit(cur)}</span><span class="txt"><b>${esc(cur.name)}</b><small>${esc(cur.role)}</small></span><span class="chev">${icon('chevDown', 18, 2)}</span>
          </button>
          ${bk.barberOpen ? `<div class="dropdown" role="listbox">${options.map((b) => `<button type="button" role="option" aria-selected="${b.id === bk.barber}" class="opt ${b.id === bk.barber ? 'sel' : ''}" ${b.avail ? '' : 'disabled'} data-action="pickBarber" data-arg="${b.id}">
              <span class="av">${avInit(b)}</span><span class="txt"><b>${esc(b.name)}</b><small>${esc(b.role)}</small></span>
              ${b.id === bk.barber ? `<span style="color:#B7860B">${icon('check', 18, 2.6)}</span>` : `<span class="status">${b.id === 'any' ? '' : b.avail ? 'بەردەستە' : 'ئەمڕۆ پشووە'}</span>`}
            </button>`).join('')}</div>` : ''}
          ${!avail.length ? '<p class="empty-note">ئێستا هیچ وەستایەک بەردەست نییە.</p>' : ''}
        </section>

        ${kind === 'basic' ? `<section class="card section">
          <div class="card-title"><span class="num">${n[1]}</span><h2>چی دەکەیت؟</h2><span class="aside">دەتوانیت چەندانێک هەڵبژێریت</span></div>
          <div class="stack">${DB.basic.map((s) => { const on = !!bk.svc[s.id]; return `<button type="button" class="check-row ${on ? 'on' : ''}" role="checkbox" aria-checked="${on}" data-action="toggleSvc" data-arg="${s.id}">
            <span class="box">${on ? icon('check', 14, 3) : ''}</span><span class="txt"><b>${esc(s.name)}</b><small>${fmt(s.dur)} خولەک</small></span><span class="amt">${money(s.price)}</span></button>`; }).join('')}</div>
          <a class="more-link" href="#/services">${icon('crown', 16, 2)}کێراتین، لوولکردن، پاکێج و ئۆفەرەکان لە بەشی خزمەتگوزارین</a>
        </section>` : ''}

        <section class="card section">
          <div class="card-title"><span class="num">${n[2]}</span><h2>ڕۆژ هەڵبژێرە</h2></div>
          <button type="button" class="select-btn" aria-expanded="${bk.calOpen}" data-action="calOpen">
            <span class="av" style="border-radius:12px;width:40px;height:40px">${icon('calendar', 20, 1.9)}</span>
            <span class="txt"><b>${dayLong(date)}</b><small>${bk.calOpen ? 'ڕۆژێک هەڵبژێرە' : 'پەنجە بنێ بۆ گۆڕینی ڕۆژ'}</small></span><span class="chev">${icon('chevDown', 18, 2)}</span>
          </button>
          ${bk.calOpen ? `<div class="cal">
            <div class="cal-nav">
              <button type="button" aria-label="مانگی پێشوو" ${m <= minMonth ? 'disabled' : ''} data-action="calMonth" data-arg="-1">${icon('back', 18, 2.2)}</button>
              <b>${MONTHS[m.getMonth()]} ${fmt(m.getFullYear()).replace(/٬/g, '')}</b>
              <button type="button" aria-label="مانگی داهاتوو" ${m >= maxMonth ? 'disabled' : ''} data-action="calMonth" data-arg="1">${icon('chevL', 18, 2.2)}</button>
            </div>
            <div class="cal-grid">${cells}</div>
            <div class="legend"><span><i style="width:6px;height:6px;border-radius:50%;background:#B7860B"></i>ئەمڕۆ</span><span><i style="background:var(--navy)"></i>هەڵبژێردراو</span><span><i style="background:var(--line)"></i>داخراوە / ڕابردوو</span></div>
          </div>` : ''}
        </section>

        <section class="card section">
          <div class="card-title"><span class="num">${n[3]}</span><h2>کات هەڵبژێرە</h2><span class="aside">${fmt(freeCount)} کاتی بەتاڵ</span></div>
          ${need > STEP ? `<p class="slot-note">${icon('info', 15, 2)}ئەم نۆرەیە ${fmt(need)} خولەک دەخایەنێت، بۆیە تەنها ئەو کاتانە دیارن کە ئەوەندە بەتاڵن.</p>` : ''}
          <span class="time-label">بەیانی</span><div class="times">${starts.filter((s) => s < 900).map(slot).join('')}</div>
          <span class="time-label">ئێوارە</span><div class="times">${starts.filter((s) => s >= 900).map(slot).join('')}</div>
          <div class="legend"><span><i style="background:var(--navy)"></i>هەڵبژێردراو</span><span><i style="background:#F3F4F6;border:1px solid var(--line)"></i>گیراوە یان تێپەڕیوە</span></div>
        </section>
      </div>
      <div class="bar"><div class="txt"><small>${summary}</small><b>${chosen.length ? money(total) + ' · ' + fmt(dur) + ' خولەک' : 'خزمەتگوزارییەک هەڵبژێرە'}</b></div>
        <button type="button" class="btn btn-gold" data-action="confirmBooking">پشتڕاستکردنەوە</button></div>
    </div>`;
  }

  function productsScreen() {
    return `<div class="screen">${header({ kicker: 'کۆگای ئێمە', title: 'بەرهەمەکان', right: cartBtn(),
      extra: `<label class="search">${icon('search', 18)}<input type="search" placeholder="گەڕان بۆ براند…" aria-label="گەڕان" data-input="brandSearch"></label>` })}
      <div class="pad">
        <div class="section-head"><h2 style="font-size:17px">براندەکان</h2><span>${fmt(DB.brands.length)} براند · ${fmt(DB.products.length)} بەرهەم</span></div>
        <div class="brand-grid" id="brandGrid">${DB.brands.map(brandCard).join('')}</div>
      </div></div>`;
  }
  const brandProducts = (id) => DB.products.filter((p) => p.brandId === id);
  const brandCard = (b) => `<a class="brand-card" data-name="${esc(b.name.toLowerCase())}" href="#/brand/${b.id}" style="background:${esc(b.bg)};color:${esc(b.fg)}">
    <span class="wm" aria-hidden="true">${esc(b.name.charAt(0))}</span><span class="brand-logo">${esc(b.short)}</span>
    <div class="foot"><div><b>${esc(b.name)}</b><small>${fmt(brandProducts(b.id).length)} بەرهەم</small></div><span class="go">${icon('chevL', 15, 2.2)}</span></div></a>`;

  function brandScreen(id) {
    const b = DB.brands.find((x) => x.id === id);
    if (!b) return productsScreen();
    const f = state.brandFilter;
    const all = brandProducts(b.id);
    const items = all.filter((p) => f === 'all' || p.cat === f);
    const chip = (k, l) => `<button type="button" class="chip ${f === k ? 'on' : ''}" data-action="brandFilter" data-arg="${k}">${l}</button>`;
    const cartTotal = state.cart.reduce((a, pid) => { const p = DB.products.find((q) => q.id === pid); return a + (p ? Number(p.price) : 0); }, 0);
    return `<div class="screen ${state.cart.length ? 'has-bar' : ''}">
      <header class="hdr">${pattern()}
        <div class="hdr-row" style="justify-content:space-between"><a class="icon-btn" href="#/products" aria-label="گەڕانەوە">${icon('back', 20, 2)}</a>${cartBtn()}</div>
        <div class="brand-hero"><span class="brand-logo" style="background:${esc(b.bg)};color:${esc(b.fg)}">${esc(b.short)}</span>
          <div class="hdr-titles"><h1 class="ltr" style="text-align:right">${esc(b.name)}</h1><p>${esc(b.desc)} · ${fmt(all.length)} بەرهەم</p></div></div>
      </header>
      <div class="pad">
        <div class="chips">${chip('all', 'هەموو')}${chip('hair', 'قژ')}${chip('beard', 'ڕیش')}${chip('wash', 'شوشتن')}</div>
        ${items.length ? `<div class="prod-grid">${items.map((p) => `<div class="prod">
          <div class="img" style="background:${esc(b.bg)};color:${esc(b.fg)}">${p.img ? pic(p.img, p.name) : icon(p.icon || 'jar', 40, 1.3)}${p.stock === 'ok' ? '<span class="pill ok" style="background:#fff">بەردەستە</span>' : p.stock === 'low' ? '<span class="pill" style="background:#fff;color:var(--warn)">کەم ماوە</span>' : '<span class="pill" style="background:#fff;color:var(--danger)">نەماوە</span>'}</div>
          <div class="meta"><b>${esc(p.name)}</b><small>${esc(p.size)}</small></div>
          <div class="buy"><span>${money(p.price)}</span><button type="button" class="round-btn" aria-label="زیادکردنی ${esc(p.name)} بۆ سەبەتە" data-action="addCart" data-arg="${p.id}" ${p.stock === 'out' ? 'disabled' : ''}>${icon('plus', 15, 2.4)}</button></div>
        </div>`).join('')}</div>` : '<p class="empty-note">هیچ بەرهەمێک لەم بەشەدا نییە.</p>'}
      </div>
      ${state.cart.length ? `<div class="bar"><div class="txt"><small>${fmt(state.cart.length)} بەرهەم لە سەبەتەدا</small><b>${money(cartTotal)}</b></div><button type="button" class="btn btn-gold" data-action="toast" data-arg="پەڕەی سەبەتە لە هەنگاوی داهاتوودا دیزاین دەکرێت">بینینی سەبەتە</button></div>` : ''}
    </div>`;
  }

  function barbersScreen() {
    return `<div class="screen">${header({ kicker: 'تیمەکەمان', title: 'وەستاکانمان', sub: 'وەستاکەت هەڵبژێرە و پڕۆفایلەکەی ببینە' })}
      <div class="pad"><div class="barber-grid">${DB.barbers.map((b) => `<a class="barber-card ph reveal" href="#/barber/${b.id}" style="background:${b.avail ? '#DCE1EA' : '#E4E7EC'}">
        ${b.img ? pic(b.img, b.name) : silhouette(120, 150, b.avail ? '#C3CAD6' : '#CDD2DB', 'bottom:auto;top:34px')}
        <span class="pill ${b.avail ? 'ok' : 'off'}"><span class="dot"></span>${b.avail ? 'بەردەستە' : 'بەردەست نییە'}</span>
        <div class="name-band"><b>${esc(b.name)}</b><small>${esc(b.role)}</small></div></a>`).join('')}</div></div></div>`;
  }

  function barberScreen(id) {
    const b = barberById(id);
    if (!b) return barbersScreen();
    const works = DB.gallery.filter((g) => g.barberId === b.id);
    return `<div class="screen has-bar">
      <div class="profile-cover">${b.img ? pic(b.img, b.name) : pattern(380) + silhouette(220, 260, '#2C3D61') + '<span class="ph-label" style="color:#C7CEDB;bottom:120px">[وێنەی وەستا]</span>'}
        <div class="top"><a class="icon-btn" href="#/barbers" aria-label="گەڕانەوە">${icon('back', 20, 2)}</a><button type="button" class="icon-btn" aria-label="هاوبەشکردن" data-action="toast" data-arg="لینکی پڕۆفایل کۆپی کرا">${icon('share', 19)}</button></div>
      </div>
      <div class="profile-sheet">
        <div class="profile-name"><div><h1>${esc(b.name)}</h1><span class="role">${esc(b.role)}</span></div>
          <span class="pill ${b.avail ? 'ok' : 'off'}" style="margin-top:8px;background:${b.avail ? 'var(--ok-bg)' : '#F3F4F6'}"><span class="dot"></span>${b.avail ? 'بەردەستە' : 'بەردەست نییە'}</span></div>
        <div class="stats"><div class="stat"><b>${fmt(b.years)}</b><small>ساڵ ئەزموون</small></div><div class="stat"><b>${fmt((b.certs || []).length)}</b><small>بڕوانامە</small></div><div class="stat"><b>${esc(b.students || '—')}</b><small>قوتابی</small></div></div>
        <section class="card section" style="gap:10px"><h2 style="font-size:16px;font-weight:700">دەربارە</h2>
          <p class="muted" style="font-size:14px;line-height:1.9">${esc(b.about || '—')}</p>
          <div class="tags">${(b.skills || []).map((s) => `<span class="pill soft" style="font-size:12px;padding:5px 12px">${esc(s)}</span>`).join('')}</div></section>
        ${(b.certs || []).length ? `<section class="card section" style="gap:4px"><h2 style="font-size:16px;font-weight:700;margin-bottom:6px">بڕوانامەکان</h2>
          ${b.certs.map((c) => { const [n, y] = split2(c); return `<div class="cert"><span class="ic">${icon('award', 20)}</span><div><b>${esc(n)}</b>${y ? `<small>${esc(y)}</small>` : ''}</div></div>`; }).join('')}</section>` : ''}
        <section class="section"><div class="section-head"><h2 style="font-size:16px">کارەکانی</h2></div>
          <div class="thumbs">${works.length ? works.slice(0, 6).map((g) => `<div class="ph">${pic(g.img, g.title)}</div>`).join('') : '<div class="ph"></div><div class="ph" style="background:#E4E7EC"></div><div class="ph"></div>'}</div></section>
        <section class="card info-list">
          <div class="info-row"><span class="ic">${icon('phone', 18)}</span><div class="txt"><small>ژمارەی مۆبایل</small><b class="ltr" style="text-align:right">${esc(b.phone || DB.shop.phone)}</b></div><a class="btn btn-primary btn-sm" href="tel:${esc((b.phone || DB.shop.phone).replace(/[^\d+]/g, ''))}">پەیوەندی</a></div>
          <div class="info-row"><span class="ic">${icon('insta', 18)}</span><div class="txt"><small>ئینستاگرام</small><b class="ltr" style="text-align:right">${esc(b.insta || DB.shop.insta)}</b></div></div>
        </section>
      </div>
      <div class="floating-cta"><button type="button" class="btn btn-gold" data-action="bookWith" data-arg="${b.id}" ${b.avail ? '' : 'disabled style="opacity:.6"'}>${icon('calendar', 20, 2)}نۆرە لای ${esc(b.name)}</button></div>
    </div>`;
  }

  /* ----- Masterclass ----- */
  function courseCard(c) {
    const taken = seatsTaken(c.id); const left = Math.max(0, c.seats - taken); const full = left === 0;
    const ins = barberById(c.instructor);
    return `<a class="course-card reveal ${full ? 'full' : ''}" href="#/course/${c.id}">
      <div class="course-img">${c.img ? pic(c.img, c.title) : pattern(170, 0.28) + `<span class="course-ic">${icon('cap', 34, 1.5)}</span>`}
        <span class="pill gold-solid">دەستپێک: ${dayShort(parseIso(c.start))}</span><span class="pill lvl">${esc(c.level)}</span></div>
      <div class="course-body">
        <h3>${esc(c.title)}</h3>
        <div class="course-meta"><span>${icon('clock', 14, 2)}${courseDur(c)}</span><span>${icon('calendar', 14, 2)}${esc(c.sessions)}</span>${ins ? `<span>${icon('user', 14, 2)}${esc(ins.name)}</span>` : ''}</div>
        <div class="seats"><div class="seats-row"><span>کورسی بەتاڵ</span><b>${full ? 'پڕ بووە' : fmt(left) + ' لە ' + fmt(c.seats)}</b></div><div class="seats-bar"><i style="width:${Math.min(100, (taken / Math.max(1, c.seats)) * 100)}%"></i></div></div>
        <div class="course-foot"><div class="svc-price"><b>${fmt(c.price)}</b><span>د.ع</span></div><span class="btn btn-primary btn-sm">زانیاری و بەشداری${icon('arrow', 15, 2)}</span></div>
      </div></a>`;
  }
  function masterclassScreen() {
    return `<div class="screen">${header({ kicker: 'ئەکادیمیا', title: 'کڵاس ماستەر', sub: 'خولەکانی فێربوونی دەلاکی، لەلایەن وەستاکانمانەوە' })}
      <div class="pad">${DB.courses.length ? DB.courses.map(courseCard).join('') : `<div class="card empty"><span class="ic">${icon('cap', 32, 1.6)}</span><h2>ئێستا هیچ خولێک نییە</h2><p>خولە نوێیەکان لێرە دەردەکەون.</p></div>`}</div></div>`;
  }
  function courseScreen(id) {
    const c = DB.courses.find((x) => x.id === id);
    if (!c) return masterclassScreen();
    const taken = seatsTaken(c.id); const left = Math.max(0, c.seats - taken);
    const ins = barberById(c.instructor);
    const mine = state.user && DB.enrol.some((e) => e.courseId === c.id && e.phone === state.user.phone);
    const fact = (ic, l, v) => `<div class="fact"><span class="ic">${icon(ic, 18, 1.9)}</span><small>${l}</small><b>${v}</b></div>`;
    return `<div class="screen has-bar">
      <div class="profile-cover course-cover">${c.img ? pic(c.img, c.title) : pattern(380) + `<span class="course-ic big">${icon('cap', 64, 1.2)}</span>`}
        <div class="top"><a class="icon-btn" href="#/masterclass" aria-label="گەڕانەوە">${icon('back', 20, 2)}</a><button type="button" class="icon-btn" aria-label="هاوبەشکردن" data-action="toast" data-arg="لینکی خولەکە کۆپی کرا">${icon('share', 19)}</button></div>
      </div>
      <div class="profile-sheet">
        <div class="course-title"><span class="pill soft">${esc(c.level)}</span><h1>${esc(c.title)}</h1>
          <div class="svc-price"><small>نرخی خول</small><b>${fmt(c.price)}</b><span>د.ع</span></div></div>
        <div class="facts">${fact('clock', 'ماوە', courseDur(c))}${fact('calendar', 'دەستپێک', dayShort(parseIso(c.start)))}${fact('list', 'کاتی وانەکان', esc(c.sessions))}${fact('users', 'کورسی بەتاڵ', left ? fmt(left) + ' لە ' + fmt(c.seats) : 'پڕ بووە')}</div>
        <section class="card section" style="gap:10px"><h2 class="h16">دەربارەی خول</h2><p class="muted" style="font-size:14px;line-height:1.95">${esc(c.desc)}</p></section>
        ${(c.learn || []).length ? `<section class="card section" style="gap:10px"><h2 class="h16">چی فێردەبیت؟</h2><ul class="checks">${c.learn.map((x) => `<li><span class="tick">${icon('check', 13, 2.6)}</span>${esc(x)}</li>`).join('')}</ul></section>` : ''}
        ${(c.includes || []).length ? `<section class="card section" style="gap:10px"><h2 class="h16">ئەوەی وەریدەگریت</h2><ul class="checks gold">${c.includes.map((x) => `<li><span class="tick">${icon('award', 13, 2.2)}</span>${esc(x)}</li>`).join('')}</ul></section>` : ''}
        ${ins ? `<a class="card instructor" href="#/barber/${ins.id}"><span class="av">${ins.img ? pic(ins.img, ins.name) : esc(ins.name.charAt(0))}</span><div class="txt"><small>مامۆستای خول</small><b>${esc(ins.name)}</b><span>${esc(ins.role)} · ${fmt(ins.years)} ساڵ ئەزموون</span></div>${icon('chevL', 18, 2)}</a>` : ''}
      </div>
      <div class="bar"><div class="txt"><small>${courseDur(c)} · دەستپێک ${dayShort(parseIso(c.start))}</small><b>${money(c.price)}</b></div>
        ${mine ? `<button type="button" class="btn btn-ghost" disabled>${icon('check', 18, 2.4)}ناونووست کردووە</button>`
        : left ? `<button type="button" class="btn btn-gold" data-action="enrolAsk" data-arg="${c.id}">بەشداری بکە</button>`
        : `<button type="button" class="btn btn-ghost" disabled>پڕ بووە</button>`}</div>
    </div>`;
  }

  function profileScreen() {
    if (!state.user) return gateScreen('هێشتا هەژمارت نییە', 'خۆت تۆمار بکە بۆ ئەوەی نۆرە بگریت و نۆرەکانت لێرە ببینیت.', '#/home');
    const u = state.user;
    const mine = DB.bookings.filter((x) => x.phone === u.phone && x.status !== 'cancelled').sort((a, b) => (a.date + String(a.start).padStart(4, '0')).localeCompare(b.date + String(b.start).padStart(4, '0')));
    const courses = DB.enrol.filter((e) => e.phone === u.phone).map((e) => DB.courses.find((c) => c.id === e.courseId)).filter(Boolean);
    return `<div class="screen">${header({ title: esc(u.name), sub: `<span class="ltr">${esc(u.phone)}</span>`, right: `<span class="logo" style="width:56px;height:56px;font-size:22px;font-weight:800">${esc(u.name.charAt(0))}</span>` })}
      <div class="pad">
        <section class="card section"><div class="card-title"><h2>نۆرەکانم</h2><span class="aside">${fmt(mine.length)}</span></div>
          ${mine.length ? mine.map((x) => { const d = parseIso(x.date); const b = barberById(x.barberId); const past = x.date < iso(today) || x.status === 'done'; return `<div class="booking-item ${past ? 'past' : ''}"><div class="date"><small>${DAY_NAMES[col(d)]}</small><b>${fmt(d.getDate())}</b></div>
            <div style="flex:1;min-width:0"><span class="kind-pill k-${x.kind}">${KIND[x.kind]}</span><b style="font-size:14px;display:block">${esc(x.items.join(' + '))}</b><div class="muted" style="font-size:12px">${tLabel(x.start)} ${tPeriod(x.start)} · ${esc(b ? b.name : '—')} · ${money(x.total)}</div></div>
            ${past ? '' : `<button type="button" class="mini-btn" data-action="cancelAsk" data-arg="${x.id}">هەڵوەشاندنەوە</button>`}</div>`; }).join('') : '<p class="empty-note">هێشتا هیچ نۆرەیەکت نەگرتووە.</p>'}
          <a class="btn btn-primary btn-block" href="#/booking">نۆرەیەکی نوێ</a></section>
        <section class="card section"><div class="card-title"><h2>خولەکانم</h2><span class="aside">${fmt(courses.length)}</span></div>
          ${courses.length ? courses.map((c) => `<a class="booking-item" href="#/course/${c.id}"><div class="date"><span style="color:var(--navy)">${icon('cap', 22, 1.8)}</span></div><div style="flex:1"><b style="font-size:14px">${esc(c.title)}</b><div class="muted" style="font-size:12px">دەستپێک ${dayShort(parseIso(c.start))} · ${courseDur(c)}</div></div>${icon('chevL', 16, 2)}</a>`).join('') : '<p class="empty-note">هێشتا ناوت لە هیچ خولێک نەنووسیوە.</p>'}
        </section>
        <section class="card menu">
          <button type="button" class="menu-row" data-action="toast" data-arg="ڕۆژی لەدایکبوون: ${esc(u.dob)}"><span>زانیارییە کەسییەکان</span>${icon('chevL', 16, 2)}</button>
          <button type="button" class="menu-row danger" data-action="logout"><span>چوونەدەرەوە</span>${icon('logout', 18)}</button>
        </section>
      </div></div>`;
  }

  function gateScreen(title, text, back) {
    return `<div class="screen">${header({ title: 'پێویستە بچیتە ژوورەوە', back: back || '#/home' })}
      <div class="pad"><div class="card empty"><span class="ic">${icon('lock', 30, 1.6)}</span><h2>${title}</h2><p>${text}</p>
        <button type="button" class="btn btn-primary btn-block" data-action="goAuth" data-arg="signup">خۆت تۆمار بکە</button>
        <button type="button" class="link" style="align-self:center" data-action="goAuth" data-arg="login">هەژمارت هەیە؟ چوونەژوورەوە</button></div></div></div>`;
  }

  /* =========================================================
     ADMIN
     ========================================================= */
  const barberOpts = () => DB.barbers.map((b) => [b.id, b.name]);
  const F = (k, l, t, o) => Object.assign({ k: k, l: l, t: t || 'text' }, o || {});
  const SCHEMA = {
    news: { label: 'هەواڵ و پۆستەکان', one: 'هەواڵ', icon: 'bell', group: 'ماڵەوە', title: (x) => x.title, sub: (x) => x.tag,
      fields: [F('img', 'وێنە (ئارەزوومەندانە)', 'image'), F('tag', 'نیشانە', 'text', { ph: 'بۆ نموونە: ئۆفەر · ئەمڕۆ' }), F('title', 'سەردێڕ', 'text', { req: 1 }), F('text', 'دەقی کورت', 'textarea')] },
    gallery: { label: 'گەلەری', one: 'وێنە', icon: 'image', group: 'ماڵەوە', title: (x) => x.title, sub: (x) => (barberById(x.barberId) || {}).name || '',
      fields: [F('img', 'وێنەی کار', 'image'), F('title', 'ناوی کار', 'text', { req: 1 }), F('barberId', 'وەستا', 'select', { opts: barberOpts })] },
    basic: { label: 'خزمەتگوزاری نۆرەی ئاسایی', one: 'خزمەتگوزاری', icon: 'calendar', group: 'نۆرە و نرخ', title: (x) => x.name, sub: (x) => money(x.price) + ' · ' + fmt(x.dur) + ' خولەک',
      fields: [F('name', 'ناو', 'text', { req: 1 }), F('dur', 'ماوە (خولەک)', 'number', { req: 1 }), F('price', 'نرخ (د.ع)', 'number', { req: 1 })] },
    vip: { label: 'خزمەتگوزاری تایبەت', one: 'خزمەتگوزاری', icon: 'crown', group: 'نۆرە و نرخ', title: (x) => x.name, sub: (x) => money(x.price) + ' · ' + fmt(x.dur) + ' خولەک',
      fields: [F('name', 'ناو', 'text', { req: 1 }), F('desc', 'وەسف', 'textarea'), F('dur', 'ماوە (خولەک)', 'number', { req: 1 }), F('price', 'نرخ (د.ع)', 'number', { req: 1 }), F('badge', 'نیشانە (ئارەزوومەندانە)', 'text', { ph: 'بۆ نموونە: باوترین' })] },
    packages: { label: 'پاکێجەکان', one: 'پاکێج', icon: 'box', group: 'نۆرە و نرخ', title: (x) => x.name, sub: (x) => money(x.price) + ' · ' + fmt(x.dur) + ' خولەک',
      fields: [F('name', 'ناوی پاکێج', 'text', { req: 1 }), F('desc', 'وەسف', 'textarea'), F('items', 'ناوەڕۆکی پاکێج', 'lines', { hint: 'هەر دێڕێک یەک خزمەتگوزاری' }), F('dur', 'ماوەی دانیشتن (خولەک)', 'number', { req: 1 }), F('price', 'نرخ (د.ع)', 'number', { req: 1 }), F('old', 'نرخی پێشوو (ئارەزوومەندانە)', 'number')] },
    offers: { label: 'ئۆفەر و داشکاندن', one: 'ئۆفەر', icon: 'gift', group: 'نۆرە و نرخ', title: (x) => x.name, sub: (x) => money(x.price) + (x.ends ? (daysLeft(x.ends) < 0 ? ' · بەسەرچووە' : ' · تا ' + dayShort(parseIso(x.ends))) : ''),
      fields: [F('name', 'ناوی ئۆفەر', 'text', { req: 1 }), F('desc', 'وەسف', 'textarea'), F('badge', 'نیشانە', 'text', { ph: 'بۆ نموونە: ٪٢٠ داشکاندن' }), F('dur', 'ماوە (خولەک)', 'number', { req: 1 }), F('price', 'نرخی نوێ (د.ع)', 'number', { req: 1 }), F('old', 'نرخی پێشوو (د.ع)', 'number'), F('ends', 'کۆتایی ئۆفەر', 'date')] },
    barbers: { label: 'وەستاکان', one: 'وەستا', icon: 'users', group: 'تیم', title: (x) => x.name, sub: (x) => x.role + (x.avail ? ' · بەردەستە' : ' · بەردەست نییە'),
      fields: [F('img', 'وێنەی وەستا', 'image'), F('name', 'ناو', 'text', { req: 1 }), F('role', 'پسپۆڕی', 'text', { req: 1 }), F('avail', 'بەردەستە بۆ نۆرە', 'toggle'), F('years', 'ساڵانی ئەزموون', 'number'), F('students', 'ژمارەی قوتابی', 'text'),
        F('about', 'دەربارە', 'textarea'), F('skills', 'شارەزاییەکان', 'tags', { hint: 'بە فاریزە (،) جیایان بکەرەوە' }), F('certs', 'بڕوانامەکان', 'lines', { hint: 'هەر دێڕێک: ناوی بڕوانامە | ساڵ' }), F('phone', 'ژمارەی مۆبایل', 'text'), F('insta', 'ئینستاگرام', 'text')] },
    brands: { label: 'براندەکان', one: 'براند', icon: 'tag', group: 'کۆگا', title: (x) => x.name, sub: (x) => fmt(brandProducts(x.id).length) + ' بەرهەم',
      fields: [F('name', 'ناوی براند', 'text', { req: 1 }), F('short', 'کورتکراوە (بۆ لۆگۆ)', 'text', { req: 1, ph: 'بۆ نموونە: Bb' }), F('desc', 'وەسفی کورت', 'text'), F('bg', 'ڕەنگی کارت', 'color'), F('fg', 'ڕەنگی نووسین', 'color')] },
    products: { label: 'بەرهەمەکان', one: 'بەرهەم', icon: 'bag', group: 'کۆگا', title: (x) => x.name, sub: (x) => ((DB.brands.find((b) => b.id === x.brandId) || {}).name || '—') + ' · ' + money(x.price),
      fields: [F('img', 'وێنە (ئارەزوومەندانە)', 'image'), F('brandId', 'براند', 'select', { opts: () => DB.brands.map((b) => [b.id, b.name]), req: 1 }), F('name', 'ناوی بەرهەم', 'text', { req: 1 }), F('size', 'قەبارە', 'text', { ph: '١٠٠ مل' }), F('price', 'نرخ (د.ع)', 'number', { req: 1 }),
        F('cat', 'جۆر', 'select', { opts: [['hair', 'قژ'], ['beard', 'ڕیش'], ['wash', 'شوشتن']] }), F('stock', 'کۆگا', 'select', { opts: [['ok', 'بەردەستە'], ['low', 'کەم ماوە'], ['out', 'نەماوە']] }), F('icon', 'ئایکۆن (کاتێک وێنە نییە)', 'select', { opts: [['jar', 'قوتوو'], ['bottle', 'شووشە'], ['tube', 'تیوب'], ['spray', 'سپرەی']] })] },
    courses: { label: 'خولەکانی کڵاس ماستەر', one: 'خول', icon: 'cap', group: 'ئەکادیمیا', title: (x) => x.title, sub: (x) => money(x.price) + ' · ' + courseDur(x) + ' · ' + fmt(seatsTaken(x.id)) + '/' + fmt(x.seats) + ' بەشداربوو',
      fields: [F('img', 'وێنەی خول', 'image'), F('title', 'ناوی خول', 'text', { req: 1 }), F('level', 'ئاست', 'select', { opts: [['سەرەتایی', 'سەرەتایی'], ['ناوەند', 'ناوەند'], ['پێشکەوتوو', 'پێشکەوتوو']] }), F('price', 'نرخ (د.ع)', 'number', { req: 1 }),
        F('durN', 'ماوەی خول', 'number', { req: 1 }), F('durU', 'یەکەی ماوە', 'select', { opts: [['ڕۆژ', 'ڕۆژ'], ['هەفتە', 'هەفتە'], ['مانگ', 'مانگ']] }), F('sessions', 'کاتی وانەکان', 'text', { ph: '٣ ڕۆژ لە هەفتەدا · ٤ – ٧ی ئێوارە' }), F('start', 'ڕۆژی دەستپێک', 'date', { req: 1 }),
        F('seats', 'ژمارەی کورسی', 'number', { req: 1 }), F('instructor', 'مامۆستا', 'select', { opts: barberOpts }), F('desc', 'دەربارەی خول', 'textarea'), F('learn', 'چی فێردەبن', 'lines', { hint: 'هەر دێڕێک یەک خاڵ' }), F('includes', 'ئەوەی وەریدەگرن', 'lines', { hint: 'بۆ نموونە: بڕوانامە' })] }
  };
  const SETTINGS = {
    shop: { label: 'زانیاری دوکان', icon: 'store', fields: [F('name', 'ناوی دوکان', 'text', { req: 1 }), F('tagline', 'دروشمی سەرەوەی ماڵەوە', 'text'), F('address', 'ناونیشان', 'text'), F('hours', 'کاتی کارکردن', 'text'), F('phone', 'ژمارەی پەیوەندی', 'text'), F('insta', 'ئینستاگرام', 'text')] },
    featured: { label: 'وەستای دیار لە ماڵەوە', icon: 'star', fields: [F('barberId', 'وەستا', 'select', { opts: barberOpts }), F('title', 'سەردێڕ', 'text', { ph: 'وەستای مانگ' }), F('text', 'دەق', 'textarea'), F('img', 'وێنەی گەورە (ئەگەر بەتاڵ بێت وێنەی وەستاکە دادەنرێت)', 'image')] },
    why: { label: 'بۆچی ئێمە هەڵدەبژێریت؟', icon: 'shield', fields: [F('title', 'سەردێڕ', 'text'), F('intro', 'دەقی سەرەتا', 'textarea'), F('stats', 'ژمارەکان', 'lines', { hint: 'هەر دێڕێک: ژمارە | ناونیشان — بۆ نموونە: ١٢+ | ساڵ ئەزموون' }), F('points', 'خاڵەکان', 'lines', { hint: 'هەر دێڕێک: سەردێڕ | وەسف' })] }
  };

  const ANAV = [['/admin', 'chart', 'داشبۆرد'], ['/admin/bookings', 'calendar', 'نۆرەکان'], ['/admin/enrol', 'cap', 'ناونووسین'], ['/admin/content', 'layers', 'ناوەڕۆک']];
  const adminNav = (active) => `<nav class="nav admin-nav" aria-label="ناوبری ئەدمین">${ANAV.map(([r, ic, l]) => `<a href="#${r}" class="${r === active ? 'on' : ''}" ${r === active ? 'aria-current="page"' : ''}><span class="ic">${icon(ic, 22, r === active ? 2 : 1.7)}</span><span>${l}</span></a>`).join('')}<a href="#/home"><span class="ic">${icon('eye', 22, 1.7)}</span><span>بینینی ئەپ</span></a></nav>`;

  function admHeader(title, sub, back, right) {
    return `<header class="hdr adm-hdr">${pattern()}
      <div class="hdr-row">${back ? `<a class="icon-btn" href="${back}" aria-label="گەڕانەوە">${icon('back', 20, 2)}</a>` : ''}
        <div class="hdr-titles"><span class="kicker">داشبۆردی ئەدمین</span><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${right || ''}</div></header>`;
  }

  function bookingRow(x, actions) {
    const b = barberById(x.barberId); const d = parseIso(x.date);
    return `<div class="adm-bk ${x.status}"><div class="t"><b>${tLabel(x.start)}</b><small>${tPeriod(x.start)}</small></div>
      <div class="body"><div class="line1"><b>${esc(x.name)}</b><span class="kind-pill k-${x.kind}">${KIND[x.kind]}</span></div>
        <span class="muted">${esc(x.items.join(' + '))}</span>
        <small><span class="ltr">${esc(x.phone)}</span> · ${esc(b ? b.name : '—')} · ${fmt(x.dur)} خولەک · ${money(x.total)}${actions === 'date' ? ' · ' + DAY_NAMES[col(d)] + ' ' + dayShort(d) : ''}</small>
        ${x.status === 'active' && actions ? `<div class="acts"><button type="button" class="mini-btn ok" data-action="bkStatus" data-arg="${x.id}|done">${icon('check', 14, 2.4)}تەواو بوو</button><button type="button" class="mini-btn" data-action="bkStatus" data-arg="${x.id}|cancelled">هەڵوەشاندنەوە</button></div>`
        : x.status !== 'active' ? `<span class="st">${x.status === 'done' ? 'تەواو بوو' : 'هەڵوەشێنرایەوە'}</span>` : ''}</div></div>`;
  }

  function adminHome() {
    const td = iso(today);
    const act = DB.bookings.filter((b) => b.status === 'active');
    const todays = act.filter((b) => b.date === td).sort((a, b) => a.start - b.start);
    const upcoming = act.filter((b) => b.date >= td);
    const revenue = DB.bookings.filter((b) => b.status !== 'cancelled').reduce((a, b) => a + Number(b.total), 0);
    const users = store.get('users', []);
    const stat = (ic, v, l, href) => `<a class="stat-tile" href="${href}"><span class="ic">${icon(ic, 20, 1.9)}</span><b>${v}</b><small>${l}</small></a>`;
    return `<div class="screen">${admHeader('بەخێربێیت', dayLong(today), '', `<button type="button" class="icon-btn" aria-label="چوونەدەرەوە" data-action="logout">${icon('logout', 20)}</button>`)}
      <div class="pad">
        <div class="stat-grid">${stat('calendar', fmt(todays.length), 'نۆرەی ئەمڕۆ', '#/admin/bookings')}${stat('clock', fmt(upcoming.length), 'نۆرەی داهاتوو', '#/admin/bookings')}${stat('chart', fmt(revenue), 'کۆی داهات (د.ع)', '#/admin/bookings')}${stat('cap', fmt(DB.enrol.length), 'ناونووسینی خول', '#/admin/enrol')}</div>
        <section class="card section"><div class="card-title"><h2>نۆرەکانی ئەمڕۆ</h2><a class="aside" href="#/admin/bookings">هەمووی</a></div>
          ${todays.length ? todays.slice(0, 6).map((x) => bookingRow(x, true)).join('') : '<p class="empty-note">ئەمڕۆ هیچ نۆرەیەک نییە.</p>'}</section>
        <a class="card adm-link" href="#/admin/content"><span class="ic">${icon('layers', 22)}</span><div><b>بەڕێوەبردنی ناوەڕۆک</b><small>هەواڵ، خزمەتگوزاری، نرخ، وەستا، براند، خول …</small></div>${icon('chevL', 18, 2)}</a>
        <a class="card adm-link" href="#/admin/users"><span class="ic">${icon('user', 22)}</span><div><b>بەکارهێنەران</b><small>${fmt(users.length)} هەژماری تۆمارکراو</small></div>${icon('chevL', 18, 2)}</a>
        <button type="button" class="btn btn-ghost btn-block" data-action="resetAsk">${icon('refresh', 18, 2)}گەڕاندنەوەی داتای نموونە</button>
      </div></div>`;
  }

  function adminContent() {
    const groups = {};
    Object.keys(SCHEMA).forEach((k) => { const g = SCHEMA[k].group; (groups[g] = groups[g] || []).push(k); });
    const tile = (href, ic, label, cnt) => `<a class="adm-tile" href="${href}"><span class="ic">${icon(ic, 22, 1.8)}</span><b>${label}</b>${cnt != null ? `<small>${fmt(cnt)}</small>` : '<small>دەستکاری</small>'}</a>`;
    return `<div class="screen">${admHeader('ناوەڕۆکی ئەپ', 'هەر شتێک لێرە بگۆڕیت، ڕاستەوخۆ لە ئەپەکەدا دەردەکەوێت')}
      <div class="pad">
        <section class="section"><h2 class="grp">ڕێکخستنی گشتی</h2><div class="adm-tiles">${Object.keys(SETTINGS).map((k) => tile('#/admin/s/' + k, SETTINGS[k].icon, SETTINGS[k].label)).join('')}</div></section>
        ${Object.keys(groups).map((g) => `<section class="section"><h2 class="grp">${g}</h2><div class="adm-tiles">${groups[g].map((k) => tile('#/admin/c/' + k, SCHEMA[k].icon, SCHEMA[k].label, DB[k].length)).join('')}</div></section>`).join('')}
      </div></div>`;
  }

  function adminList(colName) {
    const S = SCHEMA[colName]; if (!S) return adminContent();
    let rows = DB[colName];
    let chips = '';
    if (colName === 'products') {
      const f = state.admBrand;
      chips = `<div class="chips"><button type="button" class="chip ${f === 'all' ? 'on' : ''}" data-action="admBrand" data-arg="all">هەموو</button>${DB.brands.map((b) => `<button type="button" class="chip ${f === b.id ? 'on' : ''}" data-action="admBrand" data-arg="${b.id}">${esc(b.name)}</button>`).join('')}</div>`;
      if (f !== 'all') rows = rows.filter((p) => p.brandId === f);
    }
    return `<div class="screen">${admHeader(S.label, fmt(rows.length) + ' دانە', '#/admin/content', `<a class="icon-btn gold" href="#/admin/c/${colName}/new" aria-label="زیادکردنی ${S.one}">${icon('plus', 22, 2.2)}</a>`)}
      <div class="pad">${chips}
        <a class="btn btn-primary btn-block" href="#/admin/c/${colName}/new">${icon('plus', 18, 2.2)}زیادکردنی ${S.one}ی نوێ</a>
        ${rows.length ? `<div class="card adm-list">${rows.map((x) => `<div class="adm-item">
          <span class="thumb">${x.img ? pic(x.img, '') : icon(S.icon, 20, 1.7)}</span>
          <a class="txt" href="#/admin/c/${colName}/${x.id}"><b>${esc(S.title(x))}</b><small>${esc(S.sub(x))}</small></a>
          ${colName === 'barbers' ? `<button type="button" class="switch-mini ${x.avail ? 'on' : ''}" role="switch" aria-checked="${!!x.avail}" aria-label="بەردەستە" data-action="toggleAvail" data-arg="${x.id}"><i></i></button>` : ''}
          <a class="sq-btn" href="#/admin/c/${colName}/${x.id}" aria-label="دەستکاری">${icon('edit', 17, 1.9)}</a>
          <button type="button" class="sq-btn danger" aria-label="سڕینەوە" data-action="delAsk" data-arg="${colName}|${x.id}">${icon('trash', 17, 1.9)}</button>
        </div>`).join('')}</div>` : `<div class="card empty"><span class="ic">${icon(S.icon, 30, 1.6)}</span><h2>هیچ شتێک نییە</h2><p>یەکەم ${S.one} زیاد بکە.</p></div>`}
      </div></div>`;
  }

  function fieldHtml(fd, val) {
    const id = 'f_' + fd.k;
    const lab = `<label for="${id}">${fd.l}${fd.req ? ' <i class="req">*</i>' : ''}</label>`;
    const hint = fd.hint ? `<small class="hint">${fd.hint}</small>` : '';
    const ph = fd.ph ? ` placeholder="${esc(fd.ph)}"` : '';
    switch (fd.t) {
      case 'textarea': return `<div class="field">${lab}<textarea class="input ta" id="${id}" name="${fd.k}" rows="4"${ph}>${esc(val || '')}</textarea>${hint}</div>`;
      case 'lines': return `<div class="field">${lab}<textarea class="input ta" id="${id}" name="${fd.k}" rows="5"${ph}>${esc((val || []).join('\n'))}</textarea>${hint}</div>`;
      case 'tags': return `<div class="field">${lab}<input class="input" id="${id}" name="${fd.k}" value="${esc((val || []).join('، '))}"${ph}>${hint}</div>`;
      case 'number': return `<div class="field">${lab}<input class="input num" id="${id}" name="${fd.k}" type="number" inputmode="numeric" min="0" value="${val == null || val === '' ? '' : esc(val)}"${ph}>${hint}</div>`;
      case 'date': return `<div class="field">${lab}<input class="input" id="${id}" name="${fd.k}" type="date" value="${esc(val || '')}">${hint}</div>`;
      case 'color': return `<div class="field">${lab}<div class="color-row"><input id="${id}" name="${fd.k}" type="color" value="${esc(val || '#EEEEEE')}"><span>${esc(val || '')}</span></div></div>`;
      case 'select': { const opts = typeof fd.opts === 'function' ? fd.opts() : fd.opts; return `<div class="field">${lab}<div class="select-wrap"><select class="input" id="${id}" name="${fd.k}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>${icon('chevDown', 18, 2)}</div>${hint}</div>`; }
      case 'toggle': return `<label class="switch-row"><span>${fd.l}</span><input type="checkbox" name="${fd.k}" class="switch" ${val ? 'checked' : ''}></label>`;
      case 'image': return `<div class="field"><span class="lbl">${fd.l}</span><div class="img-field"><div class="img-prev" id="${id}_prev">${val ? `<img src="${esc(val)}" alt="">` : icon('image', 28, 1.5)}</div>
        <div class="img-actions"><label class="btn btn-ghost btn-sm">${icon('upload', 16, 2)}هەڵبژاردنی وێنە<input type="file" accept="image/*" hidden data-imgfor="${id}"></label>
        <button type="button" class="link danger" data-action="imgClear" data-arg="${id}" ${val ? '' : 'hidden'}>لابردنی وێنە</button></div></div><input type="hidden" id="${id}" name="${fd.k}" value="${esc(val || '')}"></div>`;
      default: return `<div class="field">${lab}<input class="input" id="${id}" name="${fd.k}" value="${esc(val || '')}"${ph}>${hint}</div>`;
    }
  }

  function adminForm(colName, id) {
    const S = SCHEMA[colName]; if (!S) return adminContent();
    const isNew = id === 'new';
    const rec = isNew ? (colName === 'products' && state.admBrand !== 'all' ? { brandId: state.admBrand, stock: 'ok' } : colName === 'barbers' ? { avail: true } : colName === 'brands' ? { bg: '#EEF1F6', fg: '#14213D' } : {}) : DB[colName].find((x) => x.id === id);
    if (!rec) return adminList(colName);
    return `<div class="screen has-bar">${admHeader(isNew ? S.one + 'ی نوێ' : 'دەستکاری ' + S.one, isNew ? '' : esc(S.title(rec)), '#/admin/c/' + colName)}
      <div class="pad"><form id="adminForm" class="card form" data-col="${colName}" data-id="${isNew ? '' : rec.id}" novalidate>
        ${S.fields.map((fd) => fieldHtml(fd, rec[fd.k])).join('')}
        <p class="form-error" id="formError" role="alert"></p>
      </form>
      ${isNew ? '' : `<button type="button" class="btn btn-ghost btn-block danger-text" data-action="delAsk" data-arg="${colName}|${rec.id}">${icon('trash', 18, 2)}سڕینەوەی ئەم ${S.one}ە</button>`}</div>
      <div class="bar"><div class="txt"><small>${isNew ? 'زیادکردن' : 'گۆڕانکاری'}</small><b>${S.one}</b></div><button type="submit" form="adminForm" class="btn btn-gold">${icon('check', 18, 2.4)}پاشەکەوتکردن</button></div>
    </div>`;
  }

  function adminSettings(key) {
    const S = SETTINGS[key]; if (!S) return adminContent();
    return `<div class="screen has-bar">${admHeader(S.label, '', '#/admin/content')}
      <div class="pad"><form id="adminForm" class="card form" data-set="${key}" novalidate>
        ${S.fields.map((fd) => fieldHtml(fd, DB[key][fd.k])).join('')}
        <p class="form-error" id="formError" role="alert"></p></form></div>
      <div class="bar"><div class="txt"><small>ڕێکخستن</small><b>${S.label}</b></div><button type="submit" form="adminForm" class="btn btn-gold">${icon('check', 18, 2.4)}پاشەکەوتکردن</button></div>
    </div>`;
  }

  function adminBookings() {
    const td = iso(today); const f = state.admBk;
    let rows = DB.bookings.slice();
    if (f === 'today') rows = rows.filter((b) => b.date === td && b.status === 'active');
    else if (f === 'upcoming') rows = rows.filter((b) => b.date >= td && b.status === 'active');
    else if (f === 'done') rows = rows.filter((b) => b.status !== 'active');
    rows.sort((a, b) => (a.date + String(a.start).padStart(4, '0')).localeCompare(b.date + String(b.start).padStart(4, '0')));
    const byDate = {}; rows.forEach((r) => { (byDate[r.date] = byDate[r.date] || []).push(r); });
    const chip = (k, l) => `<button type="button" class="chip ${f === k ? 'on' : ''}" data-action="admBk" data-arg="${k}">${l}</button>`;
    return `<div class="screen">${admHeader('نۆرەکان', 'هەموو جۆرەکان لە یەک خشتەدا — کاتی وەستاکان هاوبەشە')}
      <div class="pad"><div class="chips">${chip('today', 'ئەمڕۆ')}${chip('upcoming', 'داهاتوو')}${chip('all', 'هەموو')}${chip('done', 'تەواو / هەڵوەشاوە')}</div>
        ${Object.keys(byDate).length ? Object.keys(byDate).map((d) => `<section class="card section"><div class="card-title"><h2>${dayLong(parseIso(d))}</h2><span class="aside">${fmt(byDate[d].length)} نۆرە</span></div>${byDate[d].map((x) => bookingRow(x, true)).join('')}</section>`).join('')
        : `<div class="card empty"><span class="ic">${icon('calendar', 30, 1.6)}</span><h2>هیچ نۆرەیەک نییە</h2></div>`}
      </div></div>`;
  }

  function adminEnrol() {
    return `<div class="screen">${admHeader('ناونووسینی خولەکان', fmt(DB.enrol.length) + ' بەشداربوو')}
      <div class="pad">${DB.courses.map((c) => { const list = DB.enrol.filter((e) => e.courseId === c.id); return `<section class="card section">
        <div class="card-title"><h2>${esc(c.title)}</h2><span class="aside">${fmt(list.length)} / ${fmt(c.seats)}</span></div>
        <div class="seats-bar"><i style="width:${Math.min(100, list.length / Math.max(1, c.seats) * 100)}%"></i></div>
        ${list.length ? list.map((e) => `<div class="adm-item"><span class="thumb">${esc(e.name.charAt(0))}</span><div class="txt"><b>${esc(e.name)}</b><small class="ltr" style="text-align:right">${esc(e.phone)}</small></div><a class="sq-btn" href="tel:${esc(e.phone)}" aria-label="پەیوەندی">${icon('phone', 16, 1.9)}</a><button type="button" class="sq-btn danger" aria-label="لابردن" data-action="delAsk" data-arg="enrol|${e.id}">${icon('trash', 16, 1.9)}</button></div>`).join('') : '<p class="empty-note">هێشتا کەس ناوی نەنووسیوە.</p>'}
        <a class="link" href="#/admin/c/courses/${c.id}">دەستکاری خول</a></section>`; }).join('') || '<p class="empty-note">هیچ خولێک نییە.</p>'}</div></div>`;
  }

  function adminUsers() {
    const users = store.get('users', []);
    return `<div class="screen">${admHeader('بەکارهێنەران', fmt(users.length) + ' هەژمار', '#/admin')}
      <div class="pad">${users.length ? `<div class="card adm-list">${users.map((u) => { const n = DB.bookings.filter((b) => b.phone === u.phone).length; return `<div class="adm-item"><span class="thumb">${esc(u.name.charAt(0))}</span><div class="txt"><b>${esc(u.name)}</b><small><span class="ltr">${esc(u.phone)}</span> · لەدایکبوون ${esc(u.dob)} · ${fmt(n)} نۆرە</small></div><a class="sq-btn" href="tel:${esc(u.phone)}" aria-label="پەیوەندی">${icon('phone', 16, 1.9)}</a></div>`; }).join('')}</div>` : '<div class="card empty"><span class="ic">' + icon('user', 30, 1.6) + '</span><h2>هێشتا کەس خۆی تۆمار نەکردووە</h2></div>'}</div></div>`;
  }

  /* ---------- modal ---------- */
  function modal() {
    const md = state.modal;
    if (!md) return '';
    const danger = md.kind === 'danger';
    return `<div class="overlay" data-action="closeModal" data-self="1"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="mdTitle">
      <span class="ic ${md.kind || ''}">${icon(md.icon || (md.yes ? 'info' : 'check'), 34, 2.2)}</span><h2 id="mdTitle">${md.title}</h2>${md.text ? `<p>${md.text}</p>` : ''}
      ${md.rows ? `<div class="summary">${md.rows.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>` : ''}
      ${md.yes ? `<div class="sheet-acts"><button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-action="${md.yes}" data-arg="${esc(md.arg || '')}">${md.yesLabel || 'بەڵێ'}</button><button type="button" class="btn btn-ghost" data-action="closeModal">پاشگەزبوونەوە</button></div>`
      : '<button type="button" class="btn btn-primary btn-block" data-action="closeModal">باشە</button>'}</div></div>`;
  }

  /* =========================================================
     ROUTER
     ========================================================= */
  const ROUTES = { '/home': homeScreen, '/services': servicesScreen, '/booking': () => bookingScreen('basic'), '/products': productsScreen, '/barbers': barbersScreen, '/masterclass': masterclassScreen, '/profile': profileScreen };

  function render() {
    pid = 0;
    const path = location.hash.replace(/^#/, '') || '/';
    const parts = path.split('/');
    if (path === '/' || path === '/login') {
      if (path === '/' && state.admin) { location.replace('#/admin'); return; }
      if (path === '/' && (state.user || state.guest)) { location.replace('#/home'); return; }
      app.innerHTML = authScreen() + modal();
      return;
    }
    if (parts[1] === 'admin') {
      if (!state.admin) { state.authTab = 'login'; location.replace('#/login'); return; }
      let html; let active = '/admin/content';
      if (!parts[2]) { html = adminHome(); active = '/admin'; }
      else if (parts[2] === 'bookings') { html = adminBookings(); active = '/admin/bookings'; }
      else if (parts[2] === 'enrol') { html = adminEnrol(); active = '/admin/enrol'; }
      else if (parts[2] === 'users') { html = adminUsers(); active = '/admin'; }
      else if (parts[2] === 'content') html = adminContent();
      else if (parts[2] === 'c' && parts[4]) html = adminForm(parts[3], parts[4]);
      else if (parts[2] === 'c') html = adminList(parts[3]);
      else if (parts[2] === 's') html = adminSettings(parts[3]);
      else { location.replace('#/admin'); return; }
      app.innerHTML = html + adminNav(active) + modal();
      afterRender();
      return;
    }
    let html; let active;
    if (parts[1] === 'brand') { html = brandScreen(parts[2]); active = '/products'; }
    else if (parts[1] === 'barber') { html = barberScreen(parts[2]); active = '/barbers'; }
    else if (parts[1] === 'course') { html = courseScreen(parts[2]); active = '/masterclass'; }
    else if (parts[1] === 'book') { html = bookingScreen(parts[2], parts[3]); active = '/services'; }
    else if (ROUTES[path]) { html = ROUTES[path](); active = path; }
    else { location.replace('#/home'); return; }
    if (html === '') return;
    app.innerHTML = html + nav(active) + (state.admin ? `<a class="admin-pill" href="#/admin">${icon('chart', 16, 2)}داشبۆرد</a>` : '') + modal();
    afterRender();
  }

  /* ---------- after-render effects (header, carousel, reveal) ---------- */
  let newsTimer = null;
  const NEWS_MS = 4500;
  function newsShow(i) {
    const tr = document.getElementById('newsTrack');
    clearTimeout(newsTimer);
    if (!tr) return;
    const n = tr.children.length; if (!n) return;
    state.newsIdx = ((i % n) + n) % n;
    tr.style.transform = `translateX(${state.newsIdx * 100}%)`;
    tr.querySelectorAll('.slide').forEach((s, k) => s.classList.toggle('on', k === state.newsIdx));
    const dots = document.querySelectorAll('.news-dots .dot');
    dots.forEach((d) => d.classList.remove('on'));
    void document.body.offsetWidth; // restart the progress animation
    if (dots[state.newsIdx]) dots[state.newsIdx].classList.add('on');
    if (n > 1) newsTimer = setTimeout(() => newsShow(state.newsIdx + 1), NEWS_MS);
  }
  function onScroll() {
    const h = document.getElementById('homeHdr'); if (!h) return;
    const y = window.scrollY;
    if (y > 70) h.classList.add('shrink'); else if (y < 24) h.classList.remove('shrink');
  }
  let io = null;
  function afterRender() {
    onScroll();
    newsShow(state.newsIdx);
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    if (io) io.disconnect();
    io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
    els.forEach((e) => io.observe(e));
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // swipe on the news carousel
  let sx = null;
  document.addEventListener('touchstart', (e) => { sx = e.target.closest('#newsView') ? e.touches[0].clientX : null; }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; sx = null;
    if (Math.abs(dx) > 40) newsShow(state.newsIdx + (dx < 0 ? 1 : -1));
  }, { passive: true });

  const go = (hash) => { if (location.hash === hash) render(); else location.hash = hash; };
  window.addEventListener('hashchange', () => { window.scrollTo(0, 0); render(); });

  function toast(msg) {
    const old = document.querySelector('.toast'); if (old) old.remove();
    const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2400);
  }

  /* ---------- actions ---------- */
  const actions = {
    authTab(t) { state.authTab = t; render(); },
    goAuth(t) { state.authTab = t; go('#/login'); },
    guest() { state.guest = true; store.set('guest', true); go('#/home'); },
    togglePw(id) { const i = document.getElementById(id); if (i) i.type = i.type === 'password' ? 'text' : 'password'; },
    forgot() { toast('بۆ گۆڕینی وشەی نهێنی پەیوەندی بە دوکانەوە بکە'); },
    logout() { state.user = null; state.guest = false; state.admin = false; store.del('user'); store.del('guest'); store.del('admin'); state.authTab = 'login'; go('#/login'); },
    toast(msg) { toast(msg); },
    newsGo(i) { newsShow(Number(i)); },
    svcTab(t) { state.svcTab = t; render(); },
    barberOpen() { state.bk.barberOpen = !state.bk.barberOpen; render(); },
    pickBarber(id) { state.bk.barber = id; state.bk.barberOpen = false; render(); },
    toggleSvc(id) { state.bk.svc[id] = !state.bk.svc[id]; render(); },
    calOpen() { const bk = state.bk; bk.calOpen = !bk.calOpen; const d = parseIso(bk.date); bk.calMonth = new Date(d.getFullYear(), d.getMonth(), 1); render(); },
    calMonth(dir) { const m = state.bk.calMonth; state.bk.calMonth = new Date(m.getFullYear(), m.getMonth() + Number(dir), 1); render(); },
    pickDay(d) { state.bk.date = d; state.bk.calOpen = false; state.bk.time = null; render(); },
    pickTime(t) { state.bk.time = Number(t); render(); },
    bookWith(id) { state.bk = newBk('basic', '', id); go('#/booking'); },
    brandFilter(k) { state.brandFilter = k; render(); },
    addCart(id) { state.cart.push(id); store.set('cart', state.cart); render(); toast('زیاد کرا بۆ سەبەتە'); },
    closeModal() { state.modal = null; render(); },

    confirmBooking() {
      const bk = state.bk; const kind = bk.kind;
      let items; let total; let dur;
      if (kind === 'basic') {
        const chosen = DB.basic.filter((s) => bk.svc[s.id]);
        if (!chosen.length) { toast('تکایە لانیکەم خزمەتگوزارییەک هەڵبژێرە'); return; }
        items = chosen.map((s) => s.name); total = chosen.reduce((a, s) => a + Number(s.price), 0); dur = chosen.reduce((a, s) => a + Number(s.dur), 0);
      } else {
        const it = DB[kind].find((x) => x.id === bk.itemId); if (!it) return;
        items = [it.name]; total = Number(it.price); dur = Number(it.dur);
      }
      if (bk.time == null) { toast('تکایە کاتێک هەڵبژێرە'); return; }
      const barber = bk.barber === 'any' ? freeBarber(bk.date, bk.time, dur) : (slotOk(bk.barber, bk.date, bk.time, dur) ? barberById(bk.barber) : null);
      if (!barber) { toast('ئەم کاتە ئێستا گیرا، کاتێکی تر هەڵبژێرە'); bk.time = null; render(); return; }
      const rec = { id: uid(), kind: kind, items: items, barberId: barber.id, date: bk.date, start: bk.time, dur: dur, total: total, name: state.user.name, phone: state.user.phone, status: 'active', created: Date.now() };
      DB.bookings.push(rec); save();
      state.modal = { title: 'نۆرەکەت تۆمار کرا', text: 'ئاگادارکردنەوەیەکت بۆ دێت پێش کاتی نۆرەکەت.',
        rows: [['جۆر', KIND[kind]], ['خزمەتگوزاری', esc(items.join(' + '))], ['ڕۆژ', dayLong(parseIso(bk.date))], ['کات', tLabel(bk.time) + ' ' + tPeriod(bk.time)], ['وەستا', esc(barber.name)], ['کۆی گشتی', money(total)]] };
      bk.svc = {}; bk.time = null; render();
    },
    cancelAsk(id) { state.modal = { kind: 'danger', icon: 'calendar', title: 'نۆرەکە هەڵبوەشێنرێتەوە؟', text: 'کاتەکە بۆ کەسانی تر بەتاڵ دەبێتەوە.', yes: 'cancelYes', arg: id, yesLabel: 'هەڵوەشاندنەوە' }; render(); },
    cancelYes(id) { const b = DB.bookings.find((x) => x.id === id); if (b) { b.status = 'cancelled'; save(); } state.modal = null; render(); toast('نۆرەکە هەڵوەشێنرایەوە'); },

    enrolAsk(cid) {
      if (!state.user) { toast('بۆ بەشداریکردن سەرەتا خۆت تۆمار بکە'); state.authTab = 'signup'; go('#/login'); return; }
      const c = DB.courses.find((x) => x.id === cid); if (!c) return;
      state.modal = { icon: 'cap', title: 'بەشداری لە ' + esc(c.title), text: 'دوای ناردن، دوکان پەیوەندیت پێوە دەکات بۆ پشتڕاستکردنەوە و پارەدان.',
        rows: [['ناو', esc(state.user.name)], ['مۆبایل', `<span class="ltr">${esc(state.user.phone)}</span>`], ['ماوە', courseDur(c)], ['دەستپێک', dayShort(parseIso(c.start))], ['نرخ', money(c.price)]], yes: 'enrolYes', arg: cid, yesLabel: 'ناردنی داواکاری' };
      render();
    },
    enrolYes(cid) {
      const c = DB.courses.find((x) => x.id === cid);
      if (!c || seatsTaken(cid) >= c.seats) { state.modal = null; render(); toast('ببورە، کورسییەکان پڕ بوون'); return; }
      DB.enrol.push({ id: uid(), courseId: cid, name: state.user.name, phone: state.user.phone, created: Date.now() }); save();
      state.modal = { title: 'ناوت نووسرا', text: 'داواکارییەکەت گەیشت. بەم زووانە پەیوەندیت پێوە دەکرێت.' }; render();
    },

    // admin
    admBk(k) { state.admBk = k; render(); },
    admBrand(k) { state.admBrand = k; render(); },
    bkStatus(arg) { const [id, st] = arg.split('|'); const b = DB.bookings.find((x) => x.id === id); if (b) { b.status = st; save(); render(); toast(st === 'done' ? 'نۆرەکە تەواو بوو' : 'نۆرەکە هەڵوەشێنرایەوە'); } },
    toggleAvail(id) { const b = barberById(id); if (b) { b.avail = !b.avail; save(); render(); } },
    delAsk(arg) { state.modal = { kind: 'danger', icon: 'trash', title: 'دڵنیایت لە سڕینەوە؟', text: 'ئەم کارە ناگەڕێتەوە.', yes: 'delYes', arg: arg, yesLabel: 'سڕینەوە' }; render(); },
    delYes(arg) {
      const [c, id] = arg.split('|');
      DB[c] = DB[c].filter((x) => x.id !== id);
      if (c === 'brands') DB.products = DB.products.filter((p) => p.brandId !== id);
      if (c === 'courses') DB.enrol = DB.enrol.filter((e) => e.courseId !== id);
      save(); state.modal = null; toast('سڕایەوە');
      if (/\/admin\/c\/[^/]+\/[^/]+$/.test(location.hash)) go('#/admin/c/' + c); else render();
    },
    resetAsk() { state.modal = { kind: 'danger', icon: 'refresh', title: 'داتای نموونە بگەڕێتەوە؟', text: 'هەموو گۆڕانکارییەکانی داشبۆرد و نۆرەکان دەسڕێنەوە. هەژماری بەکارهێنەران دەمێنێتەوە.', yes: 'resetYes', yesLabel: 'گەڕاندنەوە' }; render(); },
    resetYes() { DB = seed(); save(); state.modal = null; render(); toast('داتای نموونە گەڕایەوە'); },
    imgClear(id) { const h = document.getElementById(id); if (h) h.value = ''; const p = document.getElementById(id + '_prev'); if (p) p.innerHTML = icon('image', 28, 1.5); const b = document.querySelector(`[data-action="imgClear"][data-arg="${id}"]`); if (b) b.hidden = true; }
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    if (el.dataset.self && e.target !== el) return; // overlay: only when tapping the backdrop
    const fn = actions[el.dataset.action];
    if (fn) { e.preventDefault(); fn(el.dataset.arg, el); }
  });

  // live brand search (no re-render, keeps focus)
  document.addEventListener('input', (e) => {
    if (e.target.type === 'color' && e.target.nextElementSibling) e.target.nextElementSibling.textContent = e.target.value;
    if (e.target.dataset.input !== 'brandSearch') return;
    const q = e.target.value.trim().toLowerCase();
    document.querySelectorAll('#brandGrid .brand-card').forEach((c) => { c.style.display = !q || c.dataset.name.indexOf(q) > -1 ? '' : 'none'; });
  });

  // image picker → resized JPEG data URL (keeps localStorage small)
  document.addEventListener('change', (e) => {
    const inp = e.target; const target = inp.dataset && inp.dataset.imgfor;
    if (!target || !inp.files || !inp.files[0]) return;
    const r = new FileReader();
    r.onload = () => {
      const im = new Image();
      im.onload = () => {
        const max = 900; const s = Math.min(1, max / Math.max(im.width, im.height));
        const c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        const url = c.toDataURL('image/jpeg', 0.78);
        document.getElementById(target).value = url;
        document.getElementById(target + '_prev').innerHTML = `<img src="${url}" alt="">`;
        const b = document.querySelector(`[data-action="imgClear"][data-arg="${target}"]`); if (b) b.hidden = false;
      };
      im.src = r.result;
    };
    r.readAsDataURL(inp.files[0]);
  });

  /* ---------- forms ---------- */
  function readForm(f, fields) {
    const o = {};
    fields.forEach((fd) => {
      const el = f.elements[fd.k]; if (!el) return;
      let v;
      if (fd.t === 'number') v = el.value === '' ? '' : Number(el.value);
      else if (fd.t === 'toggle') v = el.checked;
      else if (fd.t === 'lines') v = el.value.split('\n').map((s) => s.trim()).filter(Boolean);
      else if (fd.t === 'tags') v = el.value.split(/[,،]/).map((s) => s.trim()).filter(Boolean);
      else v = el.value.trim();
      o[fd.k] = v;
    });
    return o;
  }

  document.addEventListener('submit', (e) => {
    const f = e.target;
    if (f.id === 'adminForm') {
      e.preventDefault();
      const err = f.querySelector('#formError');
      const fields = f.dataset.set ? SETTINGS[f.dataset.set].fields : SCHEMA[f.dataset.col].fields;
      const data = readForm(f, fields);
      const miss = fields.find((fd) => fd.req && (data[fd.k] === '' || data[fd.k] == null));
      if (miss) { err.textContent = 'تکایە خانەی «' + miss.l + '» پڕ بکەرەوە'; const el = f.elements[miss.k]; if (el && el.focus) el.focus(); return; }
      fields.forEach((fd) => { if (fd.t === 'number' && data[fd.k] === '') data[fd.k] = 0; });
      if (f.dataset.set) { Object.assign(DB[f.dataset.set], data); save(); toast('پاشەکەوت کرا'); go('#/admin/content'); return; }
      const c = f.dataset.col; const id = f.dataset.id;
      if (id) Object.assign(DB[c].find((x) => x.id === id), data);
      else DB[c].push(Object.assign({ id: uid() }, data));
      save(); toast(id ? 'گۆڕانکارییەکان پاشەکەوت کران' : 'زیاد کرا'); go('#/admin/c/' + c);
      return;
    }
    if (f.id !== 'authForm') return;
    e.preventDefault();
    const err = f.querySelector('#formError');
    const val = (n) => (f.elements[n] ? f.elements[n].value.trim() : '');
    const fail = (msg, field) => { err.textContent = msg; f.querySelectorAll('.invalid').forEach((x) => x.classList.remove('invalid')); if (field && f.elements[field]) { f.elements[field].classList.add('invalid'); f.elements[field].focus(); } };
    const phone = val('phone').replace(/[\s-]/g, '').replace(/^\+964/, '0');
    if (!/^07\d{9}$/.test(phone)) return fail('ژمارەی مۆبایل دەبێت ١١ ژمارە بێت و بە 07 دەست پێبکات', 'phone');

    // admin account: same login page, opens the dashboard
    if (phone === ADMIN.phone) {
      if (state.authTab === 'signup') return fail('ئەم ژمارەیە تایبەتە بە ئەدمین، تکایە لە «چوونەژوورەوە» بەکاری بهێنە', 'phone');
      if (f.elements.pw.value !== ADMIN.pw) return fail('ژمارە یان وشەی نهێنی هەڵەیە');
      state.admin = true; store.set('admin', true); state.user = null; store.del('user'); store.del('guest');
      toast('بەخێربێیت، ئەدمین'); go('#/admin'); return;
    }

    const users = store.get('users', []);
    if (state.authTab === 'signup') {
      const name = val('name'); const dob = val('dob'); const pw = f.elements.pw.value; const pw2 = f.elements.pw2.value;
      if (name.length < 2) return fail('تکایە ناوی تەواوت بنووسە', 'name');
      if (!dob) return fail('تکایە ڕۆژی لەدایکبوونت هەڵبژێرە', 'dob');
      if (pw.length < 6) return fail('وشەی نهێنی دەبێت لانیکەم ٦ پیت یان ژمارە بێت', 'pw');
      if (pw !== pw2) return fail('هەردوو وشەی نهێنی وەک یەک نین', 'pw2');
      if (users.some((u) => u.phone === phone)) return fail('ئەم ژمارەیە پێشتر تۆمار کراوە، تکایە بچۆ ژوورەوە', 'phone');
      // NOTE: prototype only — a real app stores accounts on a server and never keeps plain passwords.
      users.push({ name: name, phone: phone, dob: dob, pw: pw }); store.set('users', users);
      state.user = { name: name, phone: phone, dob: dob };
    } else {
      const u = users.find((x) => x.phone === phone && x.pw === f.elements.pw.value);
      if (!u) return fail('ژمارە یان وشەی نهێنی هەڵەیە');
      state.user = { name: u.name, phone: u.phone, dob: u.dob };
    }
    state.admin = false; store.del('admin');
    store.set('user', state.user); state.guest = false; store.del('guest');
    toast('بەخێربێیت ' + state.user.name);
    go('#/home');
  });

  render();
})();
