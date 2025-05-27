const express = require('express');
const fs = require('fs');
const path = require('path');
const { makeid } = require('./id');
const pino = require("pino");
const {
    default: Wasi_Tech,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers
} = require("@whiskeysockets/baileys");

// Enhanced logger configuration
const logger = pino({
    level: 'debug',
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:dd-mm-yyyy HH:MM:ss',
            ignore: 'pid,hostname'
        }
    }
});

const router = express.Router();

function removeFile(FilePath) {
    if (fs.existsSync(FilePath)) {
        try {
            fs.rmSync(FilePath, { recursive: true, force: true });
            logger.info(`Successfully removed: ${FilePath}`);
        } catch (err) {
            logger.error(`Error removing file ${FilePath}: ${err.message}`);
        }
    }
}

router.get('/', async (req, res) => {
    const id = makeid();
    const num = req.query.number;

    if (!num || num.replace(/[^0-9]/g, "").length < 11) {
        return res.status(400).json({ 
            error: "Invalid number",
            message: "Please provide a valid WhatsApp number with country code"
        });
    }

    async function WASI_MD_PAIR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState(`./temp/${id}`);
        
        try {
            const Pair_Code_By_Wasi_Tech = Wasi_Tech({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, logger.child({ level: "fatal" }))
                },
                printQRInTerminal: false,
                logger: logger.child({ level: "fatal" }),
                browser: Browsers.macOS("Desktop"),
                connectTimeoutMs: 30000,
                keepAliveIntervalMs: 25000
            });

            if (!Pair_Code_By_Wasi_Tech.authState.creds.registered) {
                await delay(1500);
                const cleanNumber = num.replace(/[^0-9]/g, '');
                
                try {
                    const code = await Pair_Code_By_Wasi_Tech.requestPairingCode(cleanNumber);
                    logger.info(`Generated pairing code for ${cleanNumber}`);
                    
                    if (!res.headersSent) {
                        return res.json({ code });
                    }
                } catch (pairingError) {
                    logger.error(`Pairing failed: ${pairingError.message}`);
                    if (!res.headersSent) {
                        return res.status(500).json({ 
                            error: "Pairing failed",
                            message: "Could not generate pairing code"
                        });
                    }
                }
            }

            Pair_Code_By_Wasi_Tech.ev.on('creds.update', saveCreds);
            
            Pair_Code_By_Wasi_Tech.ev.on("connection.update", async (update) => {
                const { connection, lastDisconnect, isNewLogin } = update;
                
                if (connection === "open") {
                    logger.info("Connection established successfully");
                    await delay(3000);
                    
                    try {
                        const credsPath = path.join(__dirname, `temp/${id}/creds.json`);
                        const data = fs.readFileSync(credsPath);
                        const b64data = Buffer.from(data).toString('base64');
                        
                        const session = await Pair_Code_By_Wasi_Tech.sendMessage(
                            Pair_Code_By_Wasi_Tech.user.id, 
                            { text: b64data }
                        );

                        const WASI_MD_TEXT = `
*_Pair Code Connected By Wasi Tech_*
*_Made With 🤍_*
______________________________________
╔════◇
║ *『AMAZING YOU'VE CHOSEN WASI MD』*
║ _You Have Completed the First Step to Deploy a Whatsapp Bot._
╚════════════════════════╝
╔═════◇
║  『••• 𝗩𝗶𝘀𝗶𝘁 𝗙𝗼𝗿 𝗛𝗲𝗹𝗽 •••』
║❒ *Ytube:* _youtube.com/@wasitech1
║❒ *Owner:* _https://wa.me/message/THZ3I25BYZM2E1_
║❒ *Repo:* _https://github.com/wasixd/WASI-MD_
║❒ *WaGroup:* _https://chat.whatsapp.com/FF6YuOZTAVB6Lu65cnY5BN_
║❒ *WaChannel:* _https://whatsapp.com/channel/0029VaDK8ZUDjiOhwFS1cP2j_
║❒ *Plugins:* _https://github.com/Itxxwasi 
╚════════════════════════╝
_____________________________________
_Don't Forget To Give Star To My Repo_`;

                        await Pair_Code_By_Wasi_Tech.sendMessage(
                            Pair_Code_By_Wasi_Tech.user.id,
                            { text: WASI_MD_TEXT },
                            { quoted: session }
                        );

                        await delay(500);
                        await Pair_Code_By_Wasi_Tech.ws.close();
                        removeFile(`./temp/${id}`);
                    } catch (error) {
                        logger.error(`Session save failed: ${error.message}`);
                        removeFile(`./temp/${id}`);
                    }
                } else if (connection === "close") {
                    const error = lastDisconnect?.error;
                    if (error?.output?.statusCode !== 401) {
                        logger.error(`Connection closed: ${error?.message || 'Unknown error'}`);
                        await delay(10000);
                        removeFile(`./temp/${id}`);
                        WASI_MD_PAIR_CODE().catch(err => logger.error(err));
                    }
                }
            });
        } catch (err) {
            logger.error(`Critical error: ${err.message}`);
            if (!res.headersSent) {
                res.status(500).json({ 
                    error: "Service unavailable",
                    message: "Please try again later"
                });
            }
            removeFile(`./temp/${id}`);
        }
    }

    try {
        await WASI_MD_PAIR_CODE();
    } catch (err) {
        logger.error(`Initialization failed: ${err.message}`);
        if (!res.headersSent) {
            res.status(500).json({ 
                error: "Initialization failed",
                message: "Could not start pairing process"
            });
        }
    }
});

module.exports = router;
