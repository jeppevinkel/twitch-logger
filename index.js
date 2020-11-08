const tmi = require('tmi.js');
const moment = require('moment/moment.js');
const config = require('./config.json');
const discord = require('discord.js');

let webhook;

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
        webhook = new discord.WebhookClient(url[url.length-2], url[url.length-1]);
        setInterval(logLoop, config.discord_integration.log_interval);
    }
});

if (config.discord_integration.enabled) {

    let messages = [];

    client.on('message', (channel, tags, message, self) => {
        let dt = moment(parseInt(tags['tmi-sent-ts']));
        let str = `[${dt.format('HH:mm')}] ${tags['display-name']}: ${message}`;
        messages.push(str)
        console.log(str);
    });

    function logLoop() {
        sendLog();
    }

    function sendLog() {
        if (!messages.length) return;
        let content = messages.join('\n');
        let webhook = new discord.WebhookClient("774817906130944020", "WiN2UesxYFb4T1htrbR_fE6-8323Rre1WR8Wn1fSJLTL526TZXAyksb0z0JH07fqItoI");

        webhook.send(content).catch(console.error);

        messages = [];
    }
}