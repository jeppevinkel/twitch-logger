const TwitchJs = require('twitch-js');
const moment = require('moment/moment.js');
const config = require('./config.json');
const fs = require('fs');
const https = require('https');
const fetch = require('node-fetch');
const WebSocket = require('ws');
const { createCanvas } = require('canvas');

let websocket;
let discordMessages = [];
let logs = {};


// Loop variables
let discordLogInterval;
let localLogInterval
let clearCacheInterval;

if (config.open_vr_notification_pipe.enabled) {
    let active = false;

    connectLoop();

    function connectLoop()
    {
        if(!active) {
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
        console.log("Started clearCacheInterval");
        clearCacheInterval = setInterval(clearAvatarCache, 60 * 60 * 1000);
    }

    function onClose(evt)
    {
        active = false;
        console.log("Stopped clearCacheInterval");
        clearInterval(clearCacheInterval);
        clearAvatarCache();
    }

    function onError(evt) {
        console.log("ERROR: "+JSON.stringify(evt, null, 2));
    }
}

const onAuthenticationFailure = () =>
    fetch('https://id.twitch.tv/oauth2/token', {
        method: 'post',
        body: JSON.stringify({
            grant_type: 'refresh_token',
            refresh_token: config.twitch_authentication.refresh_token,
            client_id: config.twitch_authentication.client_id,
            client_secret: config.twitch_authentication.client_secret,
        }),
        headers: {'Content-Type': 'application/json'}
    }).then((response) => response.json()).then(json => json.access_token);

const run = async () => {
    var chat;
    if (config.twitch_authentication.enabled) {
        chat = new TwitchJs.Chat({
            token: config.twitch_authentication.access_token,
            username: config.twitch_authentication.username,
            onAuthenticationFailure: onAuthenticationFailure
        });
    }
    else {
        chat = new TwitchJs.Chat({});
    }

    // Initialize loops upon connecting
    chat.on(TwitchJs.Chat.Events.CONNECTED, event => {
        console.log("################  CONNECTED TO TWITCH  ################");
        if (config.discord_integration.enabled) {
            discordLogInterval = setInterval(logLoopDiscord, config.discord_integration.log_interval);
        }
        if (config.local_files.enabled) {
            localLogInterval = setInterval(logLoopLocal, config.local_files.log_interval);
        }
    });

    // Stop loops when disconnecting
    chat.on(TwitchJs.Chat.Events.DISCONNECTED, event => {
        console.log("################  DISCONNECTED FROM TWITCH  ################");
        if (config.discord_integration.enabled) {
            clearInterval(discordLogInterval);
        }
        if (config.local_files.enabled) {
            clearInterval(localLogInterval);
        }
    });

    await chat.connect();

    Promise.all(config.twitch_channels.map(channel => chat.join(channel))).then(channelStates => {
        chat.on('PRIVMSG', message => {
            if (config.open_vr_notification_pipe.enabled) pushToVR(message);
            if (config.discord_integration.enabled) pushToDiscord(message);
            if (config.local_files.enabled) pushToLocal(message);
        });
    });
};

run().catch(e => {
    console.log(e);
});

function pushToVR(message) {
    var skip = false;
    if (config.open_vr_notification_pipe.muteBroadcaster && message.tags.badges.hasOwnProperty('broadcaster')) skip = true;
    config.open_vr_notification_pipe.ignoreUsers.forEach(function (user) { if (message.tags.username.toLowerCase() == user.toLowerCase()) skip = true; });
    config.open_vr_notification_pipe.ignorePrefixes.forEach(function (prefix) { if (message.message.indexOf(prefix) == 0) skip = true; });
    if (skip) {
        console.log(`Skipped message from: ${message.tags.displayName}`);
    } else {
        generateAvatarImage(message.tags.displayName, message.tags.color, message.username).then((data) => {
            websocket.send(JSON.stringify({ title: "Twitch-Logger", message: `${message.tags.displayName}: ${message.message}`, image: data }));
        }).catch(() => {
            websocket.send(JSON.stringify({ title: "Twitch-Logger", message: `${message.tags.displayName}: ${message.message}` }));
        });
    }
}

function logLoopDiscord() {
    sendLogDiscord();
}

function pushToDiscord(message) {
    let dt = moment(parseInt(message.tags['tmiSentTs']));
    let str = `[${message.channel}][${dt.format('HH:mm')}] ${config.discord_integration.subscriber_badge.enabled ? (message.tags['subscriber'] ? `[${config.discord_integration.subscriber_badge.emoji}]`:'') : ''}${message.tags['mod'] ? '[🛡️]':''}${message.tags['badges'] != null ? message.tags['badges']['broadcaster'] ? '**[📣]':'' : ''} ${message.tags['displayName']}${message.tags['badges'] != null ? message.tags['badges']['broadcaster'] ? '**':'' : ''}: ${message.message}`;
    discordMessages.push(str);
}

function sendLogDiscord() {
    if (!discordMessages.length) return;
    let content = discordMessages.join('\n');

    fetch(config.discord_integration.webhook, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({"content": content})
    }).catch(r => console.log(r));

    discordMessages = [];
}


function logLoopLocal() {
    sendLogLocal();
}

function pushToLocal(message) {
    let msg = {
        "badges": message.tags.badges,
        "color": message.tags.color,
        "displayName": message.tags.displayName,
        "emotes": message.tags.emotes,
        "flags": message.tags.flags,
        "mod": (message.tags.mod === "1"),
        "subscriber": message.tags.subscriber === "1",
        "tmiSentTs": message.tags.tmiSentTs,
        "userType": message.tags.userType,
        "username": message.username,
        "event": message.event,
        "messageContent": message.message
    };

    if (config.local_files.cache_emotes && msg.emotes != null) {
        let imgPath = `${__dirname}/logs/cache/emotes`;
        for (const emotesKey in msg.emotes) {
            let imgName = `/${msg.emotes[emotesKey].id}.png`;

            ensureExists(imgPath, {recursive: true}, function (err) {
                saveImageToDisk(getEmoticonUrl(msg.emotes[emotesKey].id), imgPath + imgName);
            });
        }
    }

    if (!logs[message.channel]) logs[message.channel] = [];
    logs[message.channel].push(msg);
}

function sendLogLocal() {
    if (!Object.keys(logs).length) return;

    let path = `${__dirname}/logs/${moment().format("YYYY")}`;

    for (let channel in logs) {
        if (!logs[channel].length) continue;
        let fileName = `/${moment().format("YYYY-MM-DD")}_${channel.substring(1)}.json`;

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


const canvas = createCanvas(256, 256);
const ctx = canvas.getContext('2d');
const avatarCache = {};

async function generateAvatarImage(name, color, user) {
    if (avatarCache.hasOwnProperty(user)) {
        avatarCache[user].lastUsed = Date.now();
        return avatarCache[user].data;
    } else {
        // Background
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 256, 256);

        // Text
        let text = name.substr(0, 2);
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.font = '128px Sans-serif';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 8;
        ctx.strokeText(text, 128, 128);
        ctx.fillStyle = 'white';
        ctx.fillText(text, 128, 128);

        // Cache and export
        let data = canvas.toDataURL().split(',')[1];

        if (Object.keys(avatarCache).length >= 500) {
            let oldestCache;
            let oldestCacheAge;
            for (let avatar in avatarCache) {
                if (oldestCache == null || oldestCacheAge == null || avatarCache[avatar].lastUsed < avatarCache[avatar]) {
                    oldestCache = avatar;
                    oldestCacheAge = avatarCache[avatar].lastUsed;
                }
            }
            delete avatarCache[oldestCache];
        }

        avatarCache[user] = {data: data, lastUsed: Date.now()};
        return data;
    }
}

function clearAvatarCache() {
    for (let avatar in avatarCache) {
        if ((Date.now() - avatarCache[avatar].lastUsed) < 60 * 60 * 1000) {
            delete avatarCache[avatar];
        }
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

function saveImageToDisk(url, localPath) {
    let fullUrl = url;
    let file = fs.createWriteStream(localPath);
    let request = https.get(url, function(response) {
        response.pipe(file);
    });
}

function getEmoticonUrl(id) {
    return `https://static-cdn.jtvnw.net/emoticons/v1/${id}/1.0`;
}