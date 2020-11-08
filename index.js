const tmi = require('tmi.js');
const moment = require('moment/moment.js');
const config = require('./config.json');
const discord = require('discord.js');
const fs = require('fs')

const template = require('./tags_template.json');

let discordWebhook;

const client = new tmi.Client({
    connection: {
        secure: true,
        reconnect: true
    },
    channels: config.twitch_channels
});

client.connect();

client.on("connected", (address, port) => {
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
    let messages = [];

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

        messages.push(msg)
    });

    function sendLogLocal() {
        if (!messages.length) return;

        let path = `${__dirname}/logs/${moment().format("YYYY")}`;
        let fileName = `/${moment().format("MM-DD")}_twitch.json`;

        ensureExists(path, {recursive: true}, function (err) {
            if (err) {
                console.log(err);
            }
            else {
                fs.readFile(path + fileName, (err, data) => {
                    if (err) {
                        console.error(err)
                        return
                    }
                    let json = JSON.parse(data);
                    json = json.concat(messages);
                    fs.writeFile(path + fileName, JSON.stringify(json), (err) => {
                        if (err) {
                            console.error(err)
                        }

                        messages = [];
                    })
                })
            }
        })
    }

    function getEmoticonUrl(id) {
        return `https://static-cdn.jtvnw.net/emoticons/v1/${id}/1.0`;
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