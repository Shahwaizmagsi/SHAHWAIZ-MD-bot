# SHAHWAIZ MD BOT 🤖

Free WhatsApp bot — 100+ commands (Baileys, Node.js 18+).

## Setup
1. `config.js` mein `ownerNumber` apna number likho (country code ke sath, bina `+`).
2. Install: `npm install`
3. Run: `npm start`
4. Apna WhatsApp number dalo → terminal mein *pairing code* aayega.
5. WhatsApp → Linked Devices → *Link with phone number* → code dalo.
6. Kisi chat mein `.menu` bhejo.

## Free chalane ke tareeqe
- **Android phone par Termux** (F-Droid se install karo): `pkg install nodejs git` phir upar wale steps.
- **PC/Laptop** jab tak on hai.
- Koi free VPS/hosting (free tiers badalte rehte hain).

## Ahem baatein
- Ye unofficial library hai — **ban ka risk** hota hai. Pehle secondary number par test karo.
- Group commands (kick, tagall, antilink...) ke liye bot ko group admin banao.
- Naya command: `commands.js` mein `cmd('naam', 'Category', 'desc', (c) => c.reply('hi'))` add karo.
- `session/` folder kisi ko share mat karo (wo tumhara login hai).
