const tmi = require('tmi.js');
const moment = require('moment/moment.js');
const config = require('./config.json');
const fs = require('fs');
const https = require('https');
const fetch = require('node-fetch');
const WebSocket = require('ws');

const client = new tmi.Client({
    options: {
        debug: true
    },
    connection: {
        secure: true,
        reconnect: true
    },
    channels: config.twitch_channels
});

client.connect();


client.on("connected", (address, port) => {
    console.log(`Connected to: ${address}:${port} on the channels: [${config.twitch_channels.join(', ')}]`);
    if (config.discord_integration.enabled) {
        setInterval(logLoopDiscord, config.discord_integration.log_interval);
    }
    if (config.local_files.enabled) setInterval(logLoopLocal, config.local_files.log_interval);
});

function logLoopDiscord() {
    sendLogDiscord();
}

function logLoopLocal() {
    sendLogLocal();
}

if (config.open_vr_notification_pipe.enabled) {
    let websocket;
    let active = false;

    connectLoop();

    function connectLoop()
    {
        if(!active) {
            active = true;
            if(typeof websocket !== 'undefined') websocket.close();
            websocket = new WebSocket(`${config.open_vr_notification_pipe.host}:${config.open_vr_notification_pipe.port}`);
            websocket.onopen = function(evt) { onOpen(evt) };
            websocket.onclose = function(evt) { onClose(evt) };
            websocket.onerror = function(evt) { onError(evt) };
        }
        setTimeout(connectLoop, 5000);
    }

    function onOpen(evt)
    {
        active = true;
    }

    function onClose(evt)
    {
        active = false;
    }

    function onError(evt) {
        console.log("ERROR: "+JSON.stringify(evt, null, 2));
    }

    client.on('message', (channel, tags, message, self) => {
        getBinary('twitch_logo.png').then((data) => {
            websocket.send(JSON.stringify({title: "Twitch-Logger", message: `${tags['display-name']}: ${message}`, image: data}));
        }).catch(() => {
            websocket.send(JSON.stringify({title: "Twitch-Logger", message: `${tags['display-name']}: ${message}`}));
        });
    });
}

if (config.local_files.enabled) {
    let logs = {};

    client.on('message', (channel, tags, message, self) => {
        let msg = {
            "badges": tags.badges,
            "color": tags.color,
            "display_name": tags['display-name'],
            "emotes": tags.emotes,
            "flags": tags.flags,
            "mod": tags.mod,
            "subscriber": tags.subscriber,
            "sent_ts": tags['tmi-sent-ts'],
            "user_type": tags['user-type'],
            "username": tags.username,
            "message_type": tags['message-type'],
            "message_content": message
        };

        if (config.local_files.cache_emotes && msg.emotes != null) {
            let imgPath = `${__dirname}/logs/cache/emotes`;
            Object.keys(msg.emotes).forEach(function (key) {
                let imgName = `/${key}.png`;

                ensureExists(imgPath, {recursive: true}, function (err) {
                    saveImageToDisk(getEmoticonUrl(key), imgPath + imgName);
                });
            })
        }

        if (!logs[channel]) logs[channel] = [];
        logs[channel].push(msg);
    });

    function sendLogLocal() {
        if (!Object.keys(logs).length) return;

        let path = `${__dirname}/logs/${moment().format("YYYY")}`;

        for (let channel in logs) {
            if (!logs[channel].length) continue;
            let fileName = `/${moment().format("YYYY-MM-DD")}_${channel}.json`;

            ensureExists(path, {recursive: true}, function (err) {
                if (err) {
                    console.log(err);
                } else {
                    fs.readFile(path + fileName, (err, data) => {
                        if (err) {
                            fs.writeFile(path + fileName, JSON.stringify(logs[channel]), (err) => {
                                if (err) {
                                    console.error(err)
                                }

                                logs[channel] = [];
                            })
                        } else {
                            let json = JSON.parse(data);
                            json = json.concat(logs[channel]);
                            fs.writeFile(path + fileName, JSON.stringify(json), (err) => {
                                if (err) {
                                    console.error(err)
                                }

                                logs[channel] = [];
                            });
                        }
                    });
                }
            });
        }
    }
}

if (config.discord_integration.enabled) {

    let messages = [];

    client.on('message', (channel, tags, message, self) => {
        let dt = moment(parseInt(tags['tmi-sent-ts']));
        let str = `[${dt.format('HH:mm')}] ${config.discord_integration.subscriber_badge.enabled ? (tags['subscriber'] ? `[${config.discord_integration.subscriber_badge.emoji}]`:'') : ''}${tags['mod'] ? '[🛡️]':''}${tags['badges'] != null ? tags['badges']['broadcaster'] ? '**[📣]':'' : ''} ${tags['display-name']}${tags['badges'] != null ? tags['badges']['broadcaster'] ? '**':'' : ''}: ${message}`;
        messages.push(str);
    });

    function sendLogDiscord() {
        if (!messages.length) return;
        let content = messages.join('\n');

        fetch(config.discord_integration.webhook, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({"content": content})
        }).catch(r => console.log(r));

        messages = [];
    }
}

function ensureExists(path, mask, cb) {
    if (typeof mask == 'function') {
        cb = mask;
        mask = 0o777;
    }
    fs.mkdir(path, mask, function(err) {
        if (err) {
            if (err.code === 'EEXIST') cb(null);
            else cb(err);
        } else cb(null);
    });
}

function getEmoticonUrl(id) {
    return `https://static-cdn.jtvnw.net/emoticons/v1/${id}/1.0`;
}

function fetchImage(url, localPath, index) {
    var extensions = ['jpg', 'png', 'jpeg', 'bmp'];

    if (index === extensions.length) {
        console.log('Fetching ' + url + ' failed.');
        return;
    }

    var fullUrl = url + extensions[index];

    request.get(fullUrl, function(response) {
        if (response.statusCode === 200) {
            fs.write(localPath, response.body, function() {
                console.log('Successfully downloaded file ' + url);
            });
        }

        else {
            fetchImage(url, localPath, index + 1);
        }
    });
}

function saveImageToDisk(url, localPath) {
    var fullUrl = url;
    var file = fs.createWriteStream(localPath);
    var request = https.get(url, function(response) {
        response.pipe(file);
    });
}

const getBinary = async (params = undefined) => {
    /**
     * @auther: Shankha
     * @date: 26 Apr, 2020
     */

        // params format:
        // getBinary({
        //   path : '<file_relative_path>',
        //   padlength: '<prepending_padding_length>', (Default: 4)
        //   debug: false,                             (Default: true)
        //   limit: 10                                 (Default: Full_File_Length)
        //   putSpacing: Boolean                       (Default: false)
        // })

        // Params Description:
        //   1. path: Specifies the relative file path, to be read.
        //   2. padlength: After reading the file, it reads object as number
        //                 (ex: hex(f): 1111, hex(0): 0), so if you need a
        //                 unform lenght binary string then you will need to
        //                 fill the strings. as hex(0): 0000 when padlength is 4.
        //   3. limit: limits the read buffer to render.
        //   4. putSpacing: if true it puts a space after each padlength.

        //
        // or
        // getBinary('<file_relative_path>');

    let fs = require("fs");
    let result = '';
    try {

        if ((typeof params) == 'string') {
            params = {
                path: params
            };
        }
        if (params) {
            let mendatoryKeys = ['path'];
            for (let i = 0; i < mendatoryKeys.length; i++) {
                if (!params.hasOwnProperty(mendatoryKeys[i])) {
                    throw "JSON key " + mendatoryKeys[i] + " is expected in prarameter object";
                }
            }
            let hexBuffer = Buffer.from(fs.readFileSync(params.path)).toString('hex');
            let padding = params.hasOwnProperty('padlength') ? params.padlength : 4;
            let limit = params.hasOwnProperty('limit') ? parseInt(params.limit) : hexBuffer.length;
            let putSpacing = params.hasOwnProperty('putSpacing') ? params.putSpacing : false;
            if (typeof putSpacing == 'boolean') {
                putSpacing = putSpacing ? ' ' : '';
            } else {
                throw "JSON key 'putSpacing' is expected as boolean";
            }
            for (let i = 0; i < limit; i++) {
                result += String(parseInt(hexBuffer[i], 16).toString(2).substr(-8)).padStart(padding, '0') + putSpacing;
            }
        } else {
            throw "JSON object is expected as prarameter, but got undefined"
        }
    } catch (e) {
        if (params.hasOwnProperty('debug') ? params.debug : true) {
            console.log(e);
        }
    } finally {
        return (result.trim() === '') ? undefined : result.trim();
    }
}