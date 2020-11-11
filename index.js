const tmi = require('tmi.js');
const moment = require('moment/moment.js');
const config = require('./config.json');
const discord = require('discord.js');
const fs = require('fs');
const https = require('https');

const template = require('./tags_template.json');

let discordWebhook;

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
        let url = config.discord_integration.webhook.split('/');
        discordWebhook = new discord.WebhookClient(url[url.length-2], url[url.length-1]);
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
        let str = `[${dt.format('HH:mm')}] ${config.discord_integration.subscriber_badge.enabled ? (tags['subscriber'] ? `[${config.discord_integration.subscriber_badge.emoji}]`:'') : ''}${tags['mod'] ? '[🛡️]':''}${tags['badges']['broadcaster'] ? '**[📣]':''} ${tags['display-name']}${tags['badges']['broadcaster'] ? '**':''}: ${message}`;
        messages.push(str)
        console.log(str);
    });

    function sendLogDiscord() {
        if (!messages.length) return;
        let content = messages.join('\n');

        discordWebhook.send(content).catch(console.error);

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