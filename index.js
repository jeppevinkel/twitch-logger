// Includes
const TwitchJs = require('twitch-js');

const config = require('./config.json');
const discord = require('./modules/discord.js');
const logging = require('./modules/logging.js');
const pipe = require('./modules/pipe.js');

pipe.init(config.open_vr_notification_pipe);
discord.init(config.discord_integration);
logging.init(config.local_files);

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
            onAuthenticationFailure: onAuthenticationFailure,
            log: {level: config.logging_level}
        });
    }
    else {
        chat = new TwitchJs.Chat({log: {level: config.logging_level}});
    }

    // Initialize loops upon connecting
    chat.on(TwitchJs.Chat.Events.CONNECTED, event => {
        console.log("################  CONNECTED TO TWITCH  ################");
        discord.start();
        logging.start();
    });

    // Stop loops when disconnecting
    chat.on(TwitchJs.Chat.Events.DISCONNECTED, event => {
        console.log("################  DISCONNECTED FROM TWITCH  ################");
        discord.stop();
        logging.stop();
    });

    await chat.connect();

    Promise.all(config.twitch_channels.map(channel => chat.join(channel))).then(channelStates => {
        chat.on('PRIVMSG', message => {
            pipe.push(message);
            discord.push(message);
            logging.push(message);
        });
    });
};

run().catch(e => {
    console.log(e);
});