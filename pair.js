const { makeid } = require('./id');
const express = require('express');
const fs = require('fs');
const pino = require("pino");
const {
    useMultiFileAuthState,
    makeCacheableSignalKeyStore,
    delay
} = require("maher-zubair-baileys");

const router = express.Router();
const logger = pino({ level: "fatal" }).child({ level: "fatal" });

// Cache for active sessions
const activeSessions = new Map();

// Cleanup function
function removeSessionFiles(id) {
    const dirPath = `./temp/${id}`;
    if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
    }
    activeSessions.delete(id);
}

// Session timeout (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

router.get('/', async (req, res) => {
    const id = makeid();
    const num = req.query.number;
    
    if (!num || num.replace(/[^0-9]/g, "").length < 11) {
        return res.status(400).json({ error: "Invalid number format" });
    }

    const cleanNum = num.replace(/[^0-9]/g, '');
    
    try {
        const { state, saveCreds } = await useMultiFileAuthState(`./temp/${id}`);
        
        const session = {
            id,
            createdAt: Date.now(),
            cleanNum,
            state,
            saveCreds
        };
        
        activeSessions.set(id, session);
        
        // Set timeout for session cleanup
        setTimeout(() => {
            if (activeSessions.has(id)) {
                removeSessionFiles(id);
            }
        }, SESSION_TIMEOUT);

        const Pair_Code_By_Gifted_Tech = Gifted_Tech({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
            printQRInTerminal: false,
            logger,
            browser: ["Chrome (Linux)", "", ""],
            connectTimeoutMs: 30_000,
            keepAliveIntervalMs: 25_000
        });

        if (!Pair_Code_By_Gifted_Tech.authState.creds.registered) {
            await delay(1500);
            const code = await Pair_Code_By_Gifted_Tech.requestPairingCode(cleanNum);
            
            if (!res.headersSent) {
                res.json({ 
                    code,
                    sessionId: id,
                    expiresIn: SESSION_TIMEOUT
                });
            }
        }

        Pair_Code_By_Gifted_Tech.ev.on('creds.update', saveCreds);
        
        Pair_Code_By_Gifted_Tech.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === "open") {
                await delay(2000);
                const data = fs.readFileSync(`./temp/${id}/creds.json`);
                const b64data = Buffer.from(data).toString('base64');
                
                const sessionMsg = await Pair_Code_By_Gifted_Tech.sendMessage(
                    Pair_Code_By_Gifted_Tech.user.id, 
                    { text: b64data }
                );

                const successMsg = `*Pairing Successful!*\n\n` +
                    `Your WhatsApp session has been successfully connected.\n` +
                    `Session ID: ${id}\n\n` +
                    `_This session will automatically close now._`;
                
                await Pair_Code_By_Gifted_Tech.sendMessage(
                    Pair_Code_By_Gifted_Tech.user.id,
                    { text: successMsg },
                    { quoted: sessionMsg }
                );

                await Pair_Code_By_Gifted_Tech.ws.close();
                removeSessionFiles(id);
            } 
            else if (connection === "close" && lastDisconnect?.error) {
                if (lastDisconnect.error.output.statusCode !== 401) {
                    await delay(10_000);
                    activeSessions.delete(id);
                    removeSessionFiles(id);
                }
            }
        });

    } catch (err) {
        console.error("Pairing error:", err);
        removeSessionFiles(id);
        
        if (!res.headersSent) {
            res.status(500).json({ 
                error: "Pairing service unavailable",
                details: err.message
            });
        }
    }
});

// Add cleanup endpoint
router.delete('/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    if (activeSessions.has(sessionId)) {
        removeSessionFiles(sessionId);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Session not found" });
    }
});

module.exports = router;
