const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
  jidNormalizedUser,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const readline = require('readline');
const config = require('./config');
const { registry, all, db, saveDb, num } = require('./commands');

const ask = (q) =>
  new Promise((res) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(q, (a) => { rl.close(); res(a.trim()); });
  });

async function handle(sock, msg) {
  if (!msg.message || msg.key.remoteJid === 'status@broadcast') return;
  const m = msg.message.ephemeralMessage?.message || msg.message;
  const text =
    m.conversation || m.extendedTextMessage?.text || m.imageMessage?.caption || m.videoMessage?.caption || '';
  if (!text) return;

  const from = msg.key.remoteJid;
  const isGroup = from.endsWith('@g.us');
  const sender = msg.key.fromMe ? jidNormalizedUser(sock.user.id) : isGroup ? msg.key.participant || '' : from;
  const isOwner = msg.key.fromMe || num(sender) === config.ownerNumber;

  let meta = null, isAdmin = false, isBotAdmin = false;
  if (isGroup) {
    meta = await sock.groupMetadata(from);
    const admins = meta.participants.filter((p) => p.admin).map((p) => num(p.id));
    isAdmin = admins.includes(num(sender)) || isOwner;
    isBotAdmin = admins.includes(num(sock.user.id));
  }

  // Anti-link
  if (isGroup && db.antilink[from] && /chat\.whatsapp\.com\//i.test(text) && !isAdmin && isBotAdmin) {
    await sock.sendMessage(from, { delete: msg.key });
    await sock.sendMessage(from, { text: `🚫 @${num(sender)} group links allowed nahi hain!`, mentions: [sender] });
    return;
  }

  const prefix = config.prefix;
  if (!text.startsWith(prefix)) return;
  if (db.mode === 'self' && !isOwner) return;

  const body = text.slice(prefix.length).trim();
  const name = body.split(/\s+/)[0].toLowerCase();
  const rest = body.slice(name.length).trim();
  const command = registry.get(name);
  if (!command) return;

  const info = m.extendedTextMessage?.contextInfo || m.imageMessage?.contextInfo || m.videoMessage?.contextInfo || {};
  const c = {
    sock, msg, from, sender, isGroup, isOwner, isAdmin, isBotAdmin, meta, prefix, db, saveDb,
    text: rest,
    args: rest ? rest.split(/\s+/) : [],
    mentioned: info.mentionedJid || [],
    quotedSender: info.participant,
    quotedId: info.stanzaId,
    reply: (t) => sock.sendMessage(from, { text: t }, { quoted: msg }),
    image: (url, caption = '') => sock.sendMessage(from, { image: { url }, caption }, { quoted: msg }),
    send: (content) => sock.sendMessage(from, content),
  };

  if (command.owner && !isOwner) return c.reply('⛔ Ye command sirf owner ke liye hai.');
  if (command.group && !isGroup) return c.reply('👥 Ye command sirf group mein chalti hai.');
  if (command.admin && !isAdmin) return c.reply('⛔ Sirf group admins ye use kar sakte hain.');
  if (command.botAdmin && !isBotAdmin) return c.reply('🤖 Pehle mujhe group admin banao.');
  if (command.usage && !c.text && !command.optional) {
    return c.reply(`ℹ️ Use: *${prefix}${command.name} ${command.usage}*`);
  }

  try {
    await sock.sendPresenceUpdate('composing', from);
    await command.fn(c);
  } catch (e) {
    console.error(`[${name}]`, e);
    await c.reply(`❌ Error: ${e.message}`);
  }
}

async function start() {
  const { state, saveCreds } = await 
  useMultiFileAuthState('session/' + number)
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: state,
    printQRInTerminal: false,
    browser: Browsers.ubuntu('Chrome'),
    markOnlineOnConnect: false,
  });

  if (!sock.authState.creds.registered) {
    const number = (process.env.BOT_NUMBER || (await ask('WhatsApp number (country code ke sath, e.g. 923001234567): '))).replace(/\D/g, '');
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(number);
        console.log('\n🔑 Pairing code:', code.match(/.{1,4}/g).join('-'));
        console.log('WhatsApp > Linked Devices > Link with phone number > ye code dalo\n');
      } catch (e) {
        console.error('Pairing error:', e.message);
      }
    }, 3000);
  }

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'open') console.log(`✅ ${config.botName} online | ${all.length} commands`);
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        console.log('Logged out. "session" folder delete karke dobara chalao.');
        process.exit(1);
      } else {
        start();
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      try { await handle(sock, msg); } catch (e) { console.error(e); }
    }
  });

  sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
    if (action !== 'add' || !db.welcome[id]) return;
    try {
      const meta = await sock.groupMetadata(id);
      for (const p of participants) {
        const jid = typeof p === 'string' ? p : p.id;
        await sock.sendMessage(id, { text: `👋 Welcome @${num(jid)} to *${meta.subject}*!`, mentions: [jid] });
      }
    } catch (e) { console.error(e); }
  });
}

start();
