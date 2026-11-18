const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const config = require('./config');

// ---------- tiny JSON database ----------
const DB_FILE = path.join(__dirname, 'data', 'db.json');
let db = { mode: 'public', antilink: {}, welcome: {} };
try { db = { ...db, ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) }; } catch {}
const saveDb = () => {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
};

// ---------- helpers ----------
const registry = new Map();
const all = [];
const started = Date.now();

function cmd(name, cat, desc, fn, o = {}) {
  const c = { name, cat, desc, fn, aliases: [], ...o };
  all.push(c);
  registry.set(name, c);
  c.aliases.forEach((a) => registry.set(a, c));
}

const num = (j) => (j || '').split('@')[0].split(':')[0];
const J = async (url, opt = {}) => {
  const r = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'ShahwaizMDBot/1.0' }, ...opt });
  if (!r.ok) throw new Error('API error ' + r.status);
  return r.json();
};
const TX = async (url) => {
  const r = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'ShahwaizMDBot/1.0' } });
  if (!r.ok) throw new Error('API error ' + r.status);
  return r.text();
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rnd = (a, b) => crypto.randomInt(a, b + 1);
const dur = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h ${Math.floor((s % 3600) / 60)}m ${s % 60}s`;
};
const trim = (s, n = 900) => (s.length > n ? s.slice(0, n) + '…' : s);

// =====================================================
// GENERAL
// =====================================================
cmd('menu', 'General', 'Saari commands ki list', (c) => {
  if (c.text) {
    const x = registry.get(c.text.toLowerCase().replace(c.prefix, ''));
    if (!x) return c.reply('❌ Ye command nahi mili.');
    return c.reply(`*${c.prefix}${x.name}* ${x.usage || ''}\n${x.desc}\nAliases: ${x.aliases.join(', ') || '-'}`);
  }
  const cats = {};
  all.forEach((x) => (cats[x.cat] ||= []).push(x));
  let t = `╭━━〔 *${config.botName}* 〕━━╮\n│ 👤 Owner: ${config.ownerName}\n│ 🔰 Prefix: ${c.prefix}\n│ 📦 Commands: ${all.length}\n│ ⏱ Uptime: ${dur(Date.now() - started)}\n╰━━━━━━━━━━━━━━━━━━╯\n`;
  for (const [k, v] of Object.entries(cats)) {
    t += `\n*━━ ${k.toUpperCase()} (${v.length}) ━━*\n` + v.map((x) => `• ${c.prefix}${x.name}`).join('\n') + '\n';
  }
  t += `\n💡 Details ke liye: ${c.prefix}menu <command>`;
  return c.reply(t);
}, { aliases: ['help', 'list', 'commands'], usage: '[command]', optional: true });

cmd('ping', 'General', 'Bot ki speed check', async (c) => {
  const t = Date.now();
  await c.reply('🏓 Pong!');
  await c.reply(`⚡ Speed: ${Date.now() - t} ms`);
});
cmd('alive', 'General', 'Bot online hai ya nahi', (c) => c.reply(`✅ *${config.botName}* zinda hai!\n📦 ${all.length} commands\n⏱ ${dur(Date.now() - started)}`));
cmd('uptime', 'General', 'Bot kitni der se chal raha hai', (c) => c.reply(`⏱ Uptime: ${dur(Date.now() - started)}`), { aliases: ['runtime'] });
cmd('owner', 'General', 'Owner ka contact', (c) => c.reply(`👑 Owner: ${config.ownerName}\n📞 wa.me/${config.ownerNumber}`));
cmd('botinfo', 'General', 'Bot ki info', (c) => c.reply(`🤖 *${config.botName}*\nCommands: ${all.length}\nMode: ${db.mode}\nNode: ${process.version}\nRAM: ${(process.memoryUsage().rss / 1048576).toFixed(0)} MB`));
cmd('time', 'General', 'Abhi ka time', (c) => c.reply('🕒 ' + new Date().toLocaleTimeString('en-GB', { timeZone: c.text || 'Asia/Karachi' })), { usage: '[timezone]', optional: true });
cmd('date', 'General', 'Aaj ki date', (c) => c.reply('📅 ' + new Date().toLocaleDateString('en-GB', { timeZone: c.text || 'Asia/Karachi', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })), { usage: '[timezone]', optional: true });

// =====================================================
// FUN
// =====================================================
cmd('joke', 'Fun', 'Random joke', async (c) => {
  const d = await J('https://official-joke-api.appspot.com/random_joke');
  return c.reply(`😂 ${d.setup}\n\n👉 ${d.punchline}`);
});
cmd('fact', 'Fun', 'Random fact', async (c) => {
  const d = await J('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en');
  return c.reply('🧠 ' + d.text);
});
cmd('quote', 'Fun', 'Motivational quote', async (c) => {
  const d = await J('https://zenquotes.io/api/random');
  return c.reply(`💬 _${d[0].q}_\n— *${d[0].a}*`);
});
cmd('advice', 'Fun', 'Random advice', async (c) => {
  const d = await J('https://api.adviceslip.com/advice');
  return c.reply('💡 ' + d.slip.advice);
});
cmd('flip', 'Fun', 'Sikka uchalo', (c) => c.reply(pick(['🪙 *Heads*', '🪙 *Tails*'])), { aliases: ['coin'] });
cmd('dice', 'Fun', 'Dice roll', (c) => c.reply(`🎲 ${rnd(1, parseInt(c.args[0]) || 6)}`), { usage: '[sides]', optional: true });
cmd('8ball', 'Fun', 'Magic 8 ball', (c) => c.reply('🎱 ' + pick(['Haan, bilkul!', 'Nahi.', 'Shayad.', 'Poora yaqeen hai.', 'Dobara pucho.', 'Mujhe shak hai.', 'Zaroor!', 'Umeed kam hai.'])), { usage: '<sawal>' });
cmd('rps', 'Fun', 'Rock Paper Scissors', (c) => {
  const o = ['rock', 'paper', 'scissors'];
  const u = c.args[0]?.toLowerCase();
  if (!o.includes(u)) return c.reply('Use: rock, paper ya scissors');
  const b = pick(o);
  const r = u === b ? '🤝 Draw!' : (u === 'rock' && b === 'scissors') || (u === 'paper' && b === 'rock') || (u === 'scissors' && b === 'paper') ? '🎉 Tum jeet gaye!' : '😎 Main jeet gaya!';
  return c.reply(`Tum: ${u}\nBot: ${b}\n\n${r}`);
}, { usage: '<rock|paper|scissors>' });
cmd('choose', 'Fun', 'Options mein se choose karo', (c) => {
  const o = c.text.split(/[|,]/).map((s) => s.trim()).filter(Boolean);
  if (o.length < 2) return c.reply('Kam az kam 2 options do: a | b | c');
  return c.reply('🎯 Meri choice: *' + pick(o) + '*');
}, { usage: 'a | b | c' });
cmd('ship', 'Fun', 'Love compatibility', (c) => {
  const n = c.text.split(/&|\+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (n.length < 2) return c.reply('Use: ship naam1 & naam2');
  const p = [...n.sort().join('')].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 101;
  return c.reply(`💘 ${n[0]} ❤️ ${n[1]}\n\n*${p}%* ${'█'.repeat(Math.round(p / 10))}${'░'.repeat(10 - Math.round(p / 10))}`);
}, { usage: 'naam1 & naam2' });
cmd('rate', 'Fun', 'Kisi cheez ko rate karo', (c) => c.reply(`⭐ *${c.text}* ko main deta hoon *${rnd(0, 10)}/10*`), { usage: '<cheez>' });
cmd('iq', 'Fun', 'IQ test (mazaak)', (c) => c.reply(`🧠 ${c.text || 'Tumhara'} IQ: *${rnd(60, 180)}*`), { usage: '[naam]', optional: true });
cmd('roast', 'Fun', 'Halka phulka roast', (c) => c.reply('🔥 ' + pick([
  'Tumhari speed WiFi se bhi slow hai 🐌', 'Tum calculator mein bhi 2+2 dobara check karte ho 😂',
  'Tumhari soch abhi tak loading mein hai ⏳', 'Tum itne lazy ho ke alarm bhi haar maan gaya 😴',
  'Tumhara WiFi password tumhare decisions se zyada strong hai 😆',
])));
cmd('compliment', 'Fun', 'Tareef', (c) => c.reply('🌟 ' + pick([
  'Tum kamaal ke insaan ho!', 'Tumhari smile din bana deti hai 😊', 'Tum bohot intelligent ho 🧠',
  'Tumhari mehnat kabhi zaya nahi jayegi 💪', 'Tumhare hone se group behtar hai ✨',
])));
cmd('truth', 'Fun', 'Truth question', (c) => c.reply('🤔 ' + pick([
  'Aakhri jhoot kab bola tha?', 'Tumhara sab se bara dar kya hai?', 'Sab se embarrassing moment konsa tha?',
  'Phone mein sab se purani photo konsi hai?', 'Kaunsi aadat chhodna chahte ho?',
])));
cmd('dare', 'Fun', 'Dare challenge', (c) => c.reply('😈 ' + pick([
  'Group mein 1 minute sirf emoji mein baat karo', 'Apni sab se funny selfie bhejo',
  'Voice note mein koi gaana gao', 'Agle 10 minute sirf shayari mein jawab do', 'Group ko 3 baar "meow" likh kar bhejo',
])));
cmd('wyr', 'Fun', 'Would you rather', (c) => c.reply('🤷 ' + pick([
  'Hamesha garmi ya hamesha sardi?', 'Phone ya internet — ek hi mil sakta hai?', 'Past mein jao ya future mein?',
  'Sab ki baat suno ya koi tumhari na sune?', 'Udna seekh lo ya ghayab hona?',
])));
cmd('pickup', 'Fun', 'Pickup line', (c) => c.reply('😏 ' + pick([
  'Tum WiFi ho kya? Kyunki mujhe connection feel ho raha hai 📶', 'Tum Google ho? Mujhe sab kuch tumhi mein mil gaya 🔍',
  'Kya tumhare paas map hai? Main tumhari aankhon mein kho gaya 🗺️',
])));
cmd('slot', 'Fun', 'Slot machine', (c) => {
  const s = ['🍒', '🍋', '🍇', '💎', '7️⃣'];
  const r = [pick(s), pick(s), pick(s)];
  return c.reply(`🎰 | ${r.join(' | ')} |\n\n${r[0] === r[1] && r[1] === r[2] ? '🎉 JACKPOT!' : r[0] === r[1] || r[1] === r[2] || r[0] === r[2] ? '👍 Almost!' : '😢 Haar gaye'}`);
});
cmd('mock', 'Fun', 'mOcKiNg TeXt', (c) => c.reply([...c.text].map((ch, i) => (i % 2 ? ch.toUpperCase() : ch.toLowerCase())).join('')), { usage: '<text>' });

// =====================================================
// TOOLS
// =====================================================
cmd('calc', 'Tools', 'Calculator', (c) => {
  const e = c.text.replace(/\^/g, '**').replace(/x/gi, '*');
  if (!/^[0-9+\-*/().%\s]+$/.test(e)) return c.reply('❌ Sirf numbers aur + - * / ( ) % ^ allowed hain');
  const r = Function(`"use strict"; return (${e})`)();
  return c.reply(`🧮 ${c.text} = *${r}*`);
}, { usage: '<expression>' });
cmd('qr', 'Tools', 'QR code banao', (c) => c.image('https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=' + encodeURIComponent(c.text), '✅ QR ready'), { usage: '<text/link>' });
cmd('short', 'Tools', 'Link chhota karo', async (c) => c.reply('🔗 ' + (await TX('https://is.gd/create.php?format=simple&url=' + encodeURIComponent(c.text)))), { usage: '<url>', aliases: ['shorten'] });
cmd('translate', 'Tools', 'Translate (e.g. ur hello)', async (c) => {
  const [lang, ...w] = c.args;
  if (!w.length) return c.reply('Use: translate <lang code> <text>\nExample: translate ur how are you');
  const d = await J(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(w.join(' '))}&langpair=Autodetect|${lang}`);
  return c.reply('🌐 ' + d.responseData.translatedText);
}, { usage: '<lang> <text>', aliases: ['tr'] });
cmd('define', 'Tools', 'English word ka matlab', async (c) => {
  const d = await J('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(c.text));
  return c.reply(`📖 *${d[0].word}*\n\n` + d[0].meanings.slice(0, 3).map((x) => `_${x.partOfSpeech}_: ${x.definitions[0].definition}`).join('\n'));
}, { usage: '<word>', aliases: ['dict'] });
cmd('weather', 'Tools', 'Mausam', async (c) => c.reply('🌦 ' + (await TX(`https://wttr.in/${encodeURIComponent(c.text)}?format=%l:+%c+%t+(feels+%f)+💧%h+💨%w`))), { usage: '<city>' });
cmd('wiki', 'Tools', 'Wikipedia summary', async (c) => {
  const d = await J('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(c.text.replace(/ /g, '_')));
  return c.reply(`📚 *${d.title}*\n\n${trim(d.extract)}\n\n${d.content_urls?.desktop?.page || ''}`);
}, { usage: '<topic>' });
cmd('currency', 'Tools', 'Currency convert', async (c) => {
  const [a, f, t] = c.args;
  if (!t || isNaN(a)) return c.reply('Use: currency 100 usd pkr');
  const d = await J('https://open.er-api.com/v6/latest/' + f.toUpperCase());
  const r = d.rates?.[t.toUpperCase()];
  if (!r) return c.reply('❌ Invalid currency');
  return c.reply(`💱 ${a} ${f.toUpperCase()} = *${(a * r).toFixed(2)} ${t.toUpperCase()}*`);
}, { usage: '<amount> <from> <to>' });
cmd('crypto', 'Tools', 'Crypto price', async (c) => {
  const id = c.text.toLowerCase();
  const d = await J(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd,pkr&include_24hr_change=true`);
  if (!d[id]) return c.reply('❌ Coin nahi mila (e.g. bitcoin, ethereum)');
  return c.reply(`🪙 *${id}*\n💵 $${d[id].usd}\n🇵🇰 Rs ${d[id].pkr}\n📈 24h: ${d[id].usd_24h_change?.toFixed(2)}%`);
}, { usage: '<coin id>' });
cmd('ip', 'Tools', 'IP lookup', async (c) => {
  const d = await J('http://ip-api.com/json/' + encodeURIComponent(c.text));
  if (d.status !== 'success') return c.reply('❌ Invalid IP');
  return c.reply(`🌍 ${d.query}\nCountry: ${d.country}\nCity: ${d.city}\nISP: ${d.isp}\nTZ: ${d.timezone}`);
}, { usage: '<ip>' });
cmd('github', 'Tools', 'GitHub user info', async (c) => {
  const d = await J('https://api.github.com/users/' + encodeURIComponent(c.text));
  return c.reply(`🐙 *${d.login}* (${d.name || '-'})\nBio: ${d.bio || '-'}\nRepos: ${d.public_repos}\nFollowers: ${d.followers}\n${d.html_url}`);
}, { usage: '<username>' });
cmd('country', 'Tools', 'Country info', async (c) => {
  const d = (await J(`https://restcountries.com/v3.1/name/${encodeURIComponent(c.text)}?fields=name,capital,population,region,languages`))[0];
  return c.reply(`🌎 *${d.name.common}*\nCapital: ${d.capital?.[0]}\nRegion: ${d.region}\nPopulation: ${d.population.toLocaleString()}\nLanguages: ${Object.values(d.languages || {}).join(', ')}`);
}, { usage: '<country>' });
cmd('pokemon', 'Tools', 'Pokemon info', async (c) => {
  const d = await J('https://pokeapi.co/api/v2/pokemon/' + encodeURIComponent(c.text.toLowerCase()));
  return c.image(d.sprites.front_default, `⚡ *${d.name}*\nType: ${d.types.map((t) => t.type.name).join(', ')}\nHeight: ${d.height} | Weight: ${d.weight}`);
}, { usage: '<name>' });
cmd('numfact', 'Tools', 'Number ke bare mein fact', async (c) => c.reply('🔢 ' + (await TX(`http://numbersapi.com/${parseInt(c.text) || 'random'}`))), { usage: '[number]', optional: true });
cmd('trivia', 'Tools', 'Trivia question', async (c) => {
  const d = await J('https://opentdb.com/api.php?amount=1&type=multiple&encode=url3986');
  const q = d.results[0];
  const dec = decodeURIComponent;
  const o = [...q.incorrect_answers, q.correct_answer].map(dec).sort(() => Math.random() - 0.5);
  await c.reply(`🧠 *Trivia* (${dec(q.category)})\n\n${dec(q.question)}\n\n${o.map((x, i) => `${'ABCD'[i]}) ${x}`).join('\n')}\n\n⏳ Answer 20 second mein...`);
  setTimeout(() => c.reply(`✅ Answer: *${dec(q.correct_answer)}*`).catch(() => {}), 20000);
});

// =====================================================
// ISLAMIC
// =====================================================
cmd('prayer', 'Islamic', 'Namaz ke auqat', async (c) => {
  const city = c.args[0];
  const country = c.args.slice(1).join(' ') || 'Pakistan';
  const d = await J(`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=1`);
  const t = d.data.timings;
  return c.reply(`🕌 *${city}, ${country}*\n\nFajr: ${t.Fajr}\nSunrise: ${t.Sunrise}\nDhuhr: ${t.Dhuhr}\nAsr: ${t.Asr}\nMaghrib: ${t.Maghrib}\nIsha: ${t.Isha}`);
}, { usage: '<city> [country]', aliases: ['namaz'] });
async function ayah(c, ref) {
  const d = await J(`https://api.alquran.cloud/v1/ayah/${ref}/editions/quran-uthmani,en.asad`);
  return c.reply(`📖 *${d.data[0].surah.englishName}* (${ref})\n\n${d.data[0].text}\n\n_${d.data[1].text}_`);
}
cmd('ayah', 'Islamic', 'Quran ki ayat (surah:ayah)', (c) => ayah(c, c.text), { usage: '<surah:ayah> e.g. 2:255', aliases: ['quran'] });
cmd('ayatkursi', 'Islamic', 'Ayat-ul-Kursi', (c) => ayah(c, '2:255'));
cmd('surah', 'Islamic', 'Surah ki info', async (c) => {
  const d = (await J('https://api.alquran.cloud/v1/surah/' + parseInt(c.text))).data;
  return c.reply(`📕 *${d.englishName}* — ${d.name}\nMatlab: ${d.englishNameTranslation}\nAyaat: ${d.numberOfAyahs}\nNazil: ${d.revelationType}`);
}, { usage: '<1-114>' });

// =====================================================
// TEXT
// =====================================================
const MORSE = { a: '.-', b: '-...', c: '-.-.', d: '-..', e: '.', f: '..-.', g: '--.', h: '....', i: '..', j: '.---', k: '-.-', l: '.-..', m: '--', n: '-.', o: '---', p: '.--.', q: '--.-', r: '.-.', s: '...', t: '-', u: '..-', v: '...-', w: '.--', x: '-..-', y: '-.--', z: '--..', 0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.' };
const UNMORSE = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));
cmd('reverse', 'Text', 'Text ulta karo', (c) => c.reply([...c.text].reverse().join('')), { usage: '<text>' });
cmd('upper', 'Text', 'BADE LETTERS', (c) => c.reply(c.text.toUpperCase()), { usage: '<text>' });
cmd('lower', 'Text', 'chhote letters', (c) => c.reply(c.text.toLowerCase()), { usage: '<text>' });
cmd('length', 'Text', 'Characters ginti', (c) => c.reply(`📏 ${[...c.text].length} characters`), { usage: '<text>', aliases: ['len'] });
cmd('wordcount', 'Text', 'Words ginti', (c) => c.reply(`📝 ${c.args.length} words`), { usage: '<text>', aliases: ['wc'] });
cmd('repeat', 'Text', 'Text repeat (max 20)', (c) => {
  const n = Math.min(parseInt(c.args[0]) || 1, 20);
  return c.reply(Array(n).fill(c.args.slice(1).join(' ')).join('\n'));
}, { usage: '<times> <text>' });
cmd('clap', 'Text', '👏 text 👏', (c) => c.reply(c.args.join(' 👏 ') + ' 👏'), { usage: '<text>' });
cmd('vapor', 'Text', 'Ｖａｐｏｒ ｔｅｘｔ', (c) => c.reply([...c.text].map((ch) => { const k = ch.charCodeAt(0); return k === 32 ? '　' : k > 32 && k < 127 ? String.fromCharCode(k + 0xfee0) : ch; }).join('')), { usage: '<text>' });
cmd('bold', 'Text', '𝐁𝐨𝐥𝐝 𝐟𝐨𝐧𝐭', (c) => c.reply([...c.text].map((ch) => { const k = ch.charCodeAt(0); if (k >= 65 && k <= 90) return String.fromCodePoint(0x1d400 + k - 65); if (k >= 97 && k <= 122) return String.fromCodePoint(0x1d41a + k - 97); if (k >= 48 && k <= 57) return String.fromCodePoint(0x1d7ce + k - 48); return ch; }).join('')), { usage: '<text>' });
cmd('morse', 'Text', 'Text se Morse', (c) => c.reply(c.text.toLowerCase().split(' ').map((w) => [...w].map((ch) => MORSE[ch] || '').filter(Boolean).join(' ')).join(' / ')), { usage: '<text>' });
cmd('unmorse', 'Text', 'Morse se text', (c) => c.reply(c.text.split(/\s*\/\s*/).map((w) => w.split(' ').map((x) => UNMORSE[x] || '').join('')).join(' ')), { usage: '<morse>' });
cmd('rot13', 'Text', 'ROT13 cipher', (c) => c.reply(c.text.replace(/[a-z]/gi, (ch) => String.fromCharCode((ch <= 'Z' ? 90 : 122) >= (ch = ch.charCodeAt(0) + 13) ? ch : ch - 26))), { usage: '<text>' });
cmd('binary', 'Text', 'Text se binary', (c) => c.reply([...Buffer.from(c.text)].map((b) => b.toString(2).padStart(8, '0')).join(' ')), { usage: '<text>' });
cmd('unbinary', 'Text', 'Binary se text', (c) => c.reply(Buffer.from(c.args.map((b) => parseInt(b, 2))).toString()), { usage: '<binary>' });
cmd('hex', 'Text', 'Text se hex', (c) => c.reply(Buffer.from(c.text).toString('hex')), { usage: '<text>' });
cmd('unhex', 'Text', 'Hex se text', (c) => c.reply(Buffer.from(c.text.replace(/\s/g, ''), 'hex').toString()), { usage: '<hex>' });
cmd('base64', 'Text', 'Base64 encode', (c) => c.reply(Buffer.from(c.text).toString('base64')), { usage: '<text>', aliases: ['b64'] });
cmd('unbase64', 'Text', 'Base64 decode', (c) => c.reply(Buffer.from(c.text, 'base64').toString()), { usage: '<base64>', aliases: ['ub64'] });
cmd('md5', 'Text', 'MD5 hash', (c) => c.reply(crypto.createHash('md5').update(c.text).digest('hex')), { usage: '<text>' });
cmd('sha256', 'Text', 'SHA-256 hash', (c) => c.reply(crypto.createHash('sha256').update(c.text).digest('hex')), { usage: '<text>' });
cmd('palindrome', 'Text', 'Palindrome check', (c) => {
  const s = c.text.toLowerCase().replace(/[^a-z0-9]/g, '');
  return c.reply(s === [...s].reverse().join('') ? '✅ Haan, palindrome hai!' : '❌ Palindrome nahi hai');
}, { usage: '<text>' });
cmd('vowels', 'Text', 'Vowels ginti', (c) => c.reply(`🔤 Vowels: ${(c.text.match(/[aeiou]/gi) || []).length}`), { usage: '<text>' });

// =====================================================
// RANDOM
// =====================================================
cmd('random', 'Random', 'Random number', (c) => {
  const a = parseInt(c.args[0]) || 1, b = parseInt(c.args[1]) || 100;
  return c.reply(`🎲 ${rnd(Math.min(a, b), Math.max(a, b))}`);
}, { usage: '[min] [max]', optional: true });
cmd('password', 'Random', 'Strong password', (c) => {
  const n = Math.min(Math.max(parseInt(c.args[0]) || 12, 6), 64);
  const cs = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  return c.reply('🔐 ' + Array.from({ length: n }, () => cs[crypto.randomInt(cs.length)]).join(''));
}, { usage: '[length]', optional: true, aliases: ['pass'] });
cmd('uuid', 'Random', 'Random UUID', (c) => c.reply(crypto.randomUUID()));
cmd('color', 'Random', 'Random color', (c) => {
  const [r, g, b] = [rnd(0, 255), rnd(0, 255), rnd(0, 255)];
  return c.reply(`🎨 #${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}\nRGB(${r}, ${g}, ${b})`);
});

// =====================================================
// CONVERT / CALC
// =====================================================
const conv = (name, desc, f, unit) =>
  cmd(name, 'Convert', desc, (c) => {
    const n = parseFloat(c.args[0]);
    if (isNaN(n)) return c.reply('Number do');
    return c.reply(`${n} ➜ *${f(n).toFixed(2)}* ${unit}`);
  }, { usage: '<number>' });
conv('c2f', '°C se °F', (x) => (x * 9) / 5 + 32, '°F');
conv('f2c', '°F se °C', (x) => ((x - 32) * 5) / 9, '°C');
conv('km2mi', 'KM se miles', (x) => x * 0.621371, 'mi');
conv('mi2km', 'Miles se KM', (x) => x * 1.609344, 'km');
conv('kg2lb', 'KG se pounds', (x) => x * 2.20462, 'lb');
conv('lb2kg', 'Pounds se KG', (x) => x / 2.20462, 'kg');
cmd('bmi', 'Convert', 'BMI calculator', (c) => {
  const [kg, cm] = c.args.map(Number);
  if (!kg || !cm) return c.reply('Use: bmi <kg> <cm>');
  const b = kg / (cm / 100) ** 2;
  return c.reply(`⚖️ BMI: *${b.toFixed(1)}* — ${b < 18.5 ? 'Underweight' : b < 25 ? 'Normal' : b < 30 ? 'Overweight' : 'Obese'}`);
}, { usage: '<kg> <cm>' });
cmd('age', 'Convert', 'Umar calculator', (c) => {
  const b = new Date(c.text);
  if (isNaN(b)) return c.reply('Use: age 2000-05-21');
  const n = new Date();
  let y = n.getFullYear() - b.getFullYear(), m = n.getMonth() - b.getMonth(), d = n.getDate() - b.getDate();
  if (d < 0) { m--; d += 30; }
  if (m < 0) { y--; m += 12; }
  return c.reply(`🎂 Umar: *${y}* saal, ${m} mahine, ${d} din`);
}, { usage: '<YYYY-MM-DD>' });
cmd('percent', 'Convert', 'Percentage nikalo', (c) => {
  const [a, b] = c.args.map(Number);
  if (!a || !b) return c.reply('Use: percent <part> <total>');
  return c.reply(`📊 ${a} is *${((a / b) * 100).toFixed(2)}%* of ${b}`);
}, { usage: '<part> <total>' });
cmd('tip', 'Convert', 'Tip calculator', (c) => {
  const [bill, p] = c.args.map(Number);
  if (!bill) return c.reply('Use: tip <bill> [percent]');
  const t = (bill * (p || 10)) / 100;
  return c.reply(`💵 Tip: *${t.toFixed(2)}*\nTotal: *${(bill + t).toFixed(2)}*`);
}, { usage: '<bill> [percent]' });

// =====================================================
// IMAGES
// =====================================================
cmd('dog', 'Images', 'Random dog', async (c) => c.image((await J('https://dog.ceo/api/breeds/image/random')).message, '🐶'));
cmd('cat', 'Images', 'Random cat', async (c) => c.image((await J('https://api.thecatapi.com/v1/images/search'))[0].url, '🐱'));
cmd('fox', 'Images', 'Random fox', async (c) => c.image((await J('https://randomfox.ca/floof/')).image, '🦊'));
cmd('duck', 'Images', 'Random duck', async (c) => c.image((await J('https://random-d.uk/api/v2/random')).url, '🦆'));
cmd('meme', 'Images', 'Random meme', async (c) => {
  const d = await J('https://meme-api.com/gimme');
  if (d.nsfw) return c.reply('Dobara try karo');
  return c.image(d.url, '😂 ' + d.title);
});

// =====================================================
// GROUP
// =====================================================
const G = { group: true, admin: true, botAdmin: true };
const target = (c) => c.mentioned[0] || c.quotedSender;
cmd('tagall', 'Group', 'Sab ko tag karo', (c) => {
  const ids = c.meta.participants.map((p) => p.id);
  return c.send({ text: `📢 *${c.text || 'Attention everyone!'}*\n\n` + ids.map((i) => `@${num(i)}`).join(' '), mentions: ids });
}, { group: true, admin: true, usage: '[message]', optional: true, aliases: ['everyone'] });
cmd('hidetag', 'Group', 'Chupa kar tag karo', (c) => c.send({ text: c.text || '📢', mentions: c.meta.participants.map((p) => p.id) }), { group: true, admin: true, usage: '[message]', optional: true });
cmd('kick', 'Group', 'Member ko nikalo (reply/mention)', async (c) => {
  const t = target(c);
  if (!t) return c.reply('Kisi ko mention ya reply karo');
  await c.sock.groupParticipantsUpdate(c.from, [t], 'remove');
  return c.reply('👢 Removed');
}, { ...G, aliases: ['remove'] });
cmd('add', 'Group', 'Number add karo', async (c) => {
  await c.sock.groupParticipantsUpdate(c.from, [c.text.replace(/\D/g, '') + '@s.whatsapp.net'], 'add');
  return c.reply('➕ Add request bhej di');
}, { ...G, usage: '<number>' });
cmd('promote', 'Group', 'Admin banao', async (c) => {
  const t = target(c);
  if (!t) return c.reply('Kisi ko mention ya reply karo');
  await c.sock.groupParticipantsUpdate(c.from, [t], 'promote');
  return c.reply('⬆️ Promoted');
}, G);
cmd('demote', 'Group', 'Admin hatao', async (c) => {
  const t = target(c);
  if (!t) return c.reply('Kisi ko mention ya reply karo');
  await c.sock.groupParticipantsUpdate(c.from, [t], 'demote');
  return c.reply('⬇️ Demoted');
}, G);
cmd('link', 'Group', 'Group invite link', async (c) => c.reply('🔗 https://chat.whatsapp.com/' + (await c.sock.groupInviteCode(c.from))), { ...G, aliases: ['gclink'] });
cmd('revoke', 'Group', 'Invite link reset', async (c) => { await c.sock.groupRevokeInvite(c.from); return c.reply('♻️ Link reset ho gaya'); }, G);
cmd('groupinfo', 'Group', 'Group ki info', (c) => c.reply(`👥 *${c.meta.subject}*\nMembers: ${c.meta.participants.length}\nAdmins: ${c.meta.participants.filter((p) => p.admin).length}\nBanaya: ${new Date(c.meta.creation * 1000).toLocaleDateString('en-GB')}\n\n${c.meta.desc || ''}`), { group: true, aliases: ['ginfo'] });
cmd('admins', 'Group', 'Admins ki list', (c) => {
  const a = c.meta.participants.filter((p) => p.admin).map((p) => p.id);
  return c.send({ text: '👮 *Admins*\n\n' + a.map((i) => `• @${num(i)}`).join('\n'), mentions: a });
}, { group: true });
cmd('mute', 'Group', 'Sirf admins message kar sakein', async (c) => { await c.sock.groupSettingUpdate(c.from, 'announcement'); return c.reply('🔇 Group muted'); }, G);
cmd('unmute', 'Group', 'Sab message kar sakein', async (c) => { await c.sock.groupSettingUpdate(c.from, 'not_announcement'); return c.reply('🔊 Group unmuted'); }, G);
cmd('setname', 'Group', 'Group ka naam badlo', async (c) => { await c.sock.groupUpdateSubject(c.from, c.text); return c.reply('✅ Naam badal diya'); }, { ...G, usage: '<name>' });
cmd('setdesc', 'Group', 'Group description badlo', async (c) => { await c.sock.groupUpdateDescription(c.from, c.text); return c.reply('✅ Description badal di'); }, { ...G, usage: '<text>' });
cmd('antilink', 'Group', 'Group links block on/off', (c) => {
  const on = c.args[0]?.toLowerCase() === 'on';
  db.antilink[c.from] = on;
  saveDb();
  return c.reply(`🚫 Anti-link: *${on ? 'ON' : 'OFF'}*`);
}, { group: true, admin: true, usage: 'on|off' });
cmd('welcome', 'Group', 'Welcome message on/off', (c) => {
  const on = c.args[0]?.toLowerCase() === 'on';
  db.welcome[c.from] = on;
  saveDb();
  return c.reply(`👋 Welcome: *${on ? 'ON' : 'OFF'}*`);
}, { group: true, admin: true, usage: 'on|off' });
cmd('delete', 'Group', 'Reply kiya hua message delete', async (c) => {
  if (!c.quotedId) return c.reply('Jis message ko delete karna hai us par reply karo');
  await c.sock.sendMessage(c.from, { delete: { remoteJid: c.from, fromMe: false, id: c.quotedId, participant: c.quotedSender } });
}, { ...G, aliases: ['del'] });

// =====================================================
// OWNER
// =====================================================
cmd('mode', 'Owner', 'Bot public ya self mode', (c) => {
  const m = c.args[0]?.toLowerCase();
  if (!['public', 'self'].includes(m)) return c.reply(`Abhi mode: *${db.mode}*\nUse: mode public|self`);
  db.mode = m;
  saveDb();
  return c.reply(`⚙️ Mode: *${m}*`);
}, { owner: true, usage: 'public|self', optional: true });

module.exports = { registry, all, db, saveDb, num };
