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
    
    async function GIFTED_MD_PAIR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/'+id);
        
        try {
            let Pair_Code_By_Gifted_Tech = Gifted_Tech({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({level: "fatal"}).child({level: "fatal"})),
                },
                printQRInTerminal: false,
                logger: pino({level: "fatal"}).child({level: "fatal"}),
                browser: ["Chrome (Linux)", "", ""]
            });

            if(!Pair_Code_By_Gifted_Tech.authState.creds.registered) {
                await delay(2000);
                num = num.replace(/[^0-9]/g,'');
                const code = await Pair_Code_By_Gifted_Tech.requestPairingCode(num);
                
                if(!res.headersSent){
                    await res.send({code});
                }
            }

            Pair_Code_By_Gifted_Tech.ev.on('creds.update', saveCreds);
            
            Pair_Code_By_Gifted_Tech.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;
                
                if (connection == "open") {
                    try {
                        console.log("Connection opened, preparing to send message...");
                        await delay(10000); // Increased delay to ensure proper connection
                        
                        // Read session data
                        let data = fs.readFileSync(__dirname + `/temp/${id}/creds.json`);
                        let b64data = Buffer.from(data).toString('base64');
                        
                        // Send session data first
                        let session = await Pair_Code_By_Gifted_Tech.sendMessage(
                            Pair_Code_By_Gifted_Tech.user.id, 
                            { text: b64data }
                        );
                        
                        console.log("Session data sent, preparing info message...");
                        
                        // Prepare and send info message
                        let GIFTED_MD_TEXT = `
*_Pair Code Connected by WASI TECH*
*_Made With 🤍_*
______________________________________
╔════◇
║ *『 WOW YOU'VE CHOSEN WASI MD 』*
║ _You Have Completed the First Step to Deploy a Whatsapp Bot._
╚════════════════════════╝
╔═════◇
║  『••• 𝗩𝗶𝘀𝗶𝘁 𝗙𝗼𝗿 𝗛𝗲𝗹𝗽 •••』
║❒ *Ytube:* _youtube.com/@wasitech1_
║❒ *Owner:* _https://wa.me/923192173398_
║❒ *Repo:* _https://github.com/wasixd/WASI-MD_
║❒ *WaGroup:* _https://whatsapp.com/channel/0029VaDK8ZUDjiOhwFS1cP2j_
║❒ *WaChannel:* _https://whatsapp.com/channel/0029VaDK8ZUDjiOhwFS1cP2j_
║❒ *Plugins:* _https://github.com/wasixd/WASI-MD-PLUGINS_
╚════════════════════════╝
_____________________________________

_Don't Forget To Give Star To My Repo_`;
                        
                        await Pair_Code_By_Gifted_Tech.sendMessage(
                            Pair_Code_By_Gifted_Tech.user.id,
                            {text: GIFTED_MD_TEXT},
                            {quoted: session}
                        );
                        
                        console.log("Info message sent successfully");
                        
                        // Clean up
                        await delay(1000);
                        await Pair_Code_By_Gifted_Tech.ws.close();
                        await removeFile('./temp/'+id);
                        
                    } catch (messageError) {
                        console.error("Error sending messages:", messageError);
                        await removeFile('./temp/'+id);
                    }
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                    console.log("Connection closed, attempting to reconnect...");
                    await delay(15000); // Increased delay before reconnection
                    GIFTED_MD_PAIR_CODE();
                }
            });
        } catch (err) {
            console.error("Error in pairing process:", err);
            await removeFile('./temp/'+id);
            if(!res.headersSent){
                await res.send({code:"Service Unavailable"});
            }
        }
    }
    
    return await GIFTED_MD_PAIR_CODE();
});
module.exports = router
