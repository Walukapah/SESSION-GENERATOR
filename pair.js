const PastebinAPI = require('pastebin-js');
const pastebin = new PastebinAPI('EMWTMkQAVfJa9kM-MRUrxd5Oku1U7pgL');
const { makeid } = require('./id');
const express = require('express');
const fs = require('fs');
const router = express.Router();
const pino = require("pino");
const { makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore, Browsers } = require("@whiskeysockets/baileys");

function removeFile(FilePath) {
    if(!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
};

router.get('/', async (req, res) => {
    const id = makeid();
    let num = req.query.number;

    // දුරකථන අංකය වලංගු කිරීම
    num = num.replace(/[^0-9]/g,'');
    if (!num || num.length < 10) {
        return res.status(400).send({ error: "වලංගු නොවන දුරකථන අංකය" });
    }

    async function generatePairingCode() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/'+id);
        
        try {
            const sock = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: ["Chrome (Linux)", "", ""]
            });

            if(!sock.authState.creds.registered) {
                await delay(1500);
                const code = await sock.requestPairingCode(num);
                
                if(!res.headersSent) {
                    await res.send({ 
                        status: "success",
                        code: code,
                        message: "කේතය සාර්ථකව ජනනය විය" 
                    });
                }

                sock.ev.on('creds.update', saveCreds);
                sock.ev.on("connection.update", async (update) => {
                    const { connection, lastDisconnect } = update;
                    
                    if (connection === "open") {
                        await delay(5000);
                        let data = fs.readFileSync(__dirname + `/temp/${id}/creds.json`);
                        await delay(800);
                        let b64data = Buffer.from(data).toString('base64');
                        
                        let sessionMsg = await sock.sendMessage(sock.user.id, { text: b64data });

                        let successMsg = `
┏━━━━━━━━━━━━━━
┃ MASTER MD සැසිය 
┃ සාර්ථකව සම්බන්ධ විය ✅🔥
┗━━━━━━━━━━━━━━━
▬▬▬▬▬▬▬▬▬▬▬▬▬▬
❶ || නිර්මාතෘ: Sahan / MASTER MIND_👨🏻‍💻
▬▬▬▬▬▬▬▬▬▬▬▬▬▬
❷ || WhatsApp චැනලය: https://whatsapp.com/channel/0029VaWWZa1G3R3c4TPADo0M
▬▬▬▬▬▬▬▬▬▬▬▬▬▬
❸ || අයිතිකරු: https://wa.me/+94720797915
▬▬▬▬▬▬▬▬▬▬▬▬▬▬
❺ || Instagram: https://www.instagram.com/sahanmaduwantha2006
▬▬▬▬▬▬▬▬▬▬▬▬▬▬
❻ || Facebook: https://www.facebook.com/profile.php?id=100089180711131
▬▬▬▬▬▬▬▬▬▬▬▬▬▬
මීster සහන් විසින් නිර්මාණය කරන ලදි`;

                        await sock.sendMessage(sock.user.id, { text: successMsg }, { quoted: sessionMsg });
                        await delay(100);
                        await sock.ws.close();
                        return await removeFile('./temp/'+id);
                    } else if (connection === "close" && lastDisconnect?.error?.output?.statusCode !== 401) {
                        await delay(10000);
                        generatePairingCode();
                    }
                });
            }
        } catch (err) {
            console.error("දෝෂය:", err);
            await removeFile('./temp/'+id);
            if(!res.headersSent) {
                await res.status(500).send({ 
                    status: "error",
                    error: "සේවය නොලැබෙන ස්ථානයේ ඇත",
                    message: err.message 
                });
            }
        }
    }
    
    return await generatePairingCode();
});

module.exports = router;
