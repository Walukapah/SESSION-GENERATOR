const PastebinAPI = require('pastebin-js'),
pastebin = new PastebinAPI('EMWTMkQAVfJa9kM-MRUrxd5Oku1U7pgL')
const {makeid} = require('./id');
const express = require('express');
const fs = require('fs');
let router = express.Router()
const pino = require("pino");
const {
    default: Gifted_Tech,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers
} = require("maher-zubair-baileys");

function removeFile(FilePath){
    if(!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true })
 };
router.get('/', async (req, res) => {
    const id = makeid();
    let num = req.query.number;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 3;

    async function GIFTED_MD_PAIR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState(`./temp/${id}`);
        
        try {
            let Pair_Code_By_Gifted_Tech = Gifted_Tech({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({level: "fatal"}).child({level: "fatal"})),
                },
                printQRInTerminal: false,
                logger: pino({level: "fatal"}).child({level: "fatal"}),
                browser: Browsers.ubuntu('Chrome'), // More stable browser identification
                markOnlineOnConnect: false, // Reduce connection pressure
                syncFullHistory: false // Don't load full chat history
            });

            // Connection handling
            Pair_Code_By_Gifted_Tech.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect } = update;
                
                if (connection === 'open') {
                    reconnectAttempts = 0; // Reset on successful connection
                    console.log('Connected to WhatsApp successfully');
                    
                    try {
                        if (!Pair_Code_By_Gifted_Tech.authState.creds.registered) {
                            num = num.replace(/[^0-9]/g, '');
                            const code = await Pair_Code_By_Gifted_Tech.requestPairingCode(num);
                            
                            if (!res.headersSent) {
                                res.send({ code });
                            }
                        } else {
                            // Send success message
                            const GIFTED_MD_TEXT = `...`; // Your message here
                            await Pair_Code_By_Gifted_Tech.sendMessage(
                                Pair_Code_By_Gifted_Tech.user.id,
                                { text: GIFTED_MD_TEXT }
                            );
                        }
                    } catch (msgError) {
                        console.error('Message sending error:', msgError);
                    }
                }
                
                if (connection === 'close') {
                    if (lastDisconnect?.error?.output?.statusCode !== 401) {
                        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                            reconnectAttempts++;
                            console.log(`Attempting reconnect #${reconnectAttempts}`);
                            await delay(10000 * reconnectAttempts); // Exponential backoff
                            GIFTED_MD_PAIR_CODE();
                        } else {
                            console.log('Max reconnection attempts reached');
                            await removeFile(`./temp/${id}`);
                        }
                    } else {
                        console.log('Authentication error - please restart pairing');
                        await removeFile(`./temp/${id}`);
                    }
                }
            });

            // Creds update handler
            Pair_Code_By_Gifted_Tech.ev.on('creds.update', saveCreds);

        } catch (err) {
            console.error("Initialization error:", err);
            await removeFile(`./temp/${id}`);
            if (!res.headersSent) {
                res.status(500).send({ code: "Service Unavailable" });
            }
        }
    }

    return GIFTED_MD_PAIR_CODE();
});
module.exports = router
