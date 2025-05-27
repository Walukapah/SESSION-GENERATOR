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

function removeFile(FilePath) {
    if(!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true })
};

router.get('/', async (req, res) => {
    const id = makeid();
    let num = req.query.number;
    
    logger.info(`New pairing request received for number: ${num || 'not provided'}`);
    
    async function GIFTED_MD_PAIR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/'+id);
        
        try {
            let Pair_Code_By_Gifted_Tech = Gifted_Tech({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, logger.child({level: "fatal"}))
                },
                printQRInTerminal: false,
                logger: logger.child({level: "fatal"}),
                browser: ["Chrome (Linux)", "", ""]
            });

            if(!Pair_Code_By_Gifted_Tech.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g,'');
                
                logger.debug(`Requesting pairing code for number: ${num}`);
                
                const code = await Pair_Code_By_Gifted_Tech.requestPairingCode(num);
                
                if(!res.headersSent){
                    logger.info(`Pairing code generated: ${code}`);
                    await res.send({code});
                }
            }

            Pair_Code_By_Gifted_Tech.ev.on('creds.update', saveCreds);
            
            Pair_Code_By_Gifted_Tech.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;
                
                if (connection == "open") {
                    logger.info('Connection established successfully');
                    await delay(5000);
                    
                    try {
                        let data = fs.readFileSync(__dirname + `/temp/${id}/creds.json`);
                        await delay(800);
                        let b64data = Buffer.from(data).toString('base64');
                        let session = await Pair_Code_By_Gifted_Tech.sendMessage(
                            Pair_Code_By_Gifted_Tech.user.id, 
                            { text: '' + b64data }
                        );

                        let GIFTED_MD_TEXT = `...`; // Your existing message text
                        
                        await Pair_Code_By_Gifted_Tech.sendMessage(
                            Pair_Code_By_Gifted_Tech.user.id,
                            {text: GIFTED_MD_TEXT},
                            {quoted:session}
                        );

                        await delay(100);
                        await Pair_Code_By_Gifted_Tech.ws.close();
                        return await removeFile('./temp/'+id);
                    } catch (fileError) {
                        logger.error(`File operation error: ${fileError.message}`);
                        logger.debug(fileError.stack);
                        if(!res.headersSent) {
                            await res.send({code: "Session generation failed"});
                        }
                    }
                } else if (connection === "close") {
                    const error = lastDisconnect?.error;
                    if (error) {
                        logger.error(`Connection closed with error: ${error.message}`);
                        logger.debug(`Error details: ${JSON.stringify(error, null, 2)}`);
                        
                        if (error.output?.statusCode !== 401) {
                            logger.info('Attempting to reconnect...');
                            await delay(10000);
                            GIFTED_MD_PAIR_CODE();
                        }
                    }
                }
            });
        } catch (err) {
            logger.error(`Critical error in pairing process: ${err.message}`);
            logger.debug(err.stack);
            
            console.error('Full error object:', err);
            
            await removeFile('./temp/'+id);
            
            if(!res.headersSent){
                await res.send({code:"Service Unavailable"});
            }
        }
    }
    
    return await GIFTED_MD_PAIR_CODE()
});

module.exports = router;
