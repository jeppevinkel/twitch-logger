// Includes
import {Chat, Api} from 'twitch-js';
import {Message, Messages, PrivateMessage, RoomStateTags, UserStateTags} from "twitch-js/lib";

import * as moment from "moment";
import * as fs from "fs";
import * as fetch from "node-fetch";

const config = require('../config.json');
import * as discord from './modules/discord';
import * as logging from './modules/logging';
import * as pipe from './modules/pipe';
import * as customPipe from './modules/customPipe';
import * as testing from './modules/testing';

let oauthInfo = {access_token: '', refresh_token: ''};

const followers = {};
let botStartTime = moment.now();



pipe.init(config.open_vr_notification_pipe);
customPipe.init(config.open_vr_notification_pipe);
discord.init(config.discord_integration);
logging.init(config.local_files);

const onAuthenticationFailure = () =>
    fetch('https://id.twitch.tv/oauth2/token', {
        method: 'post',
        body: new URLSearchParams({
            'grant_type': 'refresh_token',
            'refresh_token': oauthInfo.refresh_token,
            'client_id': config.twitch_authentication.client_id,
            'client_secret': config.twitch_authentication.client_secret
        })
    }).then((response) => response.json()).then(json => {
        if (!json.error && json.status !== 400 && json.status !== 401) {
            oauthInfo.access_token = json.access_token;
            oauthInfo.refresh_token = json.refresh_token;

            fs.writeFile('./tokens.json', JSON.stringify(oauthInfo), err => {
                if (err) console.log(err);
            });
        }

        console.log('Refreshed access token.');

        return json.access_token;
    });

const run = async () => {
    // return;

    // let dt = moment("2021-04-16T19:34:44Z");
    // let dtU = dt.valueOf();
    // console.log(dt.format('HH:mm'));
    // console.log(moment.unix(dtU).format('HH:mm'));
    // console.log(moment(dtU).format('HH:mm'));

    let chat: Chat;
    let api: Api;
    if (config.twitch_authentication.enabled) {
        try {
            oauthInfo = JSON.parse(fs.readFileSync('./tokens.json', 'utf-8'));
        } catch {
            fs.writeFile('./tokens.json', JSON.stringify(oauthInfo), err => {
                if (err) console.log(err);
            });
        }

        if (oauthInfo.access_token === undefined || oauthInfo.refresh_token === undefined || oauthInfo.access_token === '' || oauthInfo.refresh_token === '') {
            console.log('Please fill in token data in tokens.json to use authentication.');
            return;
        }

        chat = new Chat({
            token: oauthInfo.access_token,
            username: config.twitch_authentication.username,
            onAuthenticationFailure: onAuthenticationFailure,
            log: {level: config.logging_level}
        });
    }
    else {
        chat = new Chat({log: {level: config.logging_level}});
    }

    // Initialize loops upon connecting
    chat.on(Chat.Events.CONNECTED, event => {
        console.log("################  CONNECTED TO TWITCH  ################");
        discord.start();
        logging.start();

        if (config.twitch_authentication.enabled) {
            api = new Api({
                token: oauthInfo.access_token,
                clientId: config.twitch_authentication.client_id,
                log: {level: config.logging_level}
            });
        }
    });

    // Stop loops when disconnecting
    chat.on(Chat.Events.DISCONNECTED, () => {
        console.log("################  DISCONNECTED FROM TWITCH  ################");
        discord.stop();
        logging.stop();
    });

    await chat.connect();

    Promise.all<{roomState: RoomStateTags, userState: UserStateTags}>(config.twitch_channels.map(channel => chat.join(channel))).then(channelStates => {
        for (let i = 0; i < channelStates.length; i++) {
            followers[channelStates[i].roomState.roomId] = [];
            setInterval(checkFollowers, 1000 * 10, channelStates[i].roomState.roomId);
        }

        chat.on(Chat.Events.ALL, async (message: PrivateMessage) => {
            let profileImageUrl: string = undefined;
            if (api) {
                profileImageUrl = (await api.get('users', {search: {'login': message.username}})).data[0]['profileImageUrl'];
            }

            pipe.push(message);
            customPipe.push(message, profileImageUrl);
            discord.push(message);
            logging.push(message, profileImageUrl);
            if(config.log_raw) logging.pushRaw(message);
        });
    });

    function checkFollowers(channelId) {
        if (api) {
            api.get('users/follows', {search: {'to_id': channelId}}).then(response => {
                let relevantFollowers = response.data.filter(data => moment(data.followedAt).isAfter(botStartTime));

                let followersToPush = [];
                for (const relevantFollower of relevantFollowers) {
                    if (followers[channelId].includes(relevantFollower.fromName)) break;
                    followers[channelId].push(relevantFollower.fromName);
                    while (followers[channelId].length > 100) {
                        followers[channelId].shift();
                    }

                    let followData = {
                        event: 'FOLLOW',
                        timestamp: moment(relevantFollower.followedAt).valueOf(),
                        displayName: relevantFollower.fromName,
                        userId: relevantFollower.fromId,
                        channel: `#${relevantFollower.toName}`
                    };
                    followersToPush.unshift(followData);
                }
                for (const followerToPush of followersToPush) {
                    pipe.push(followerToPush);
                    customPipe.push(followerToPush);
                    discord.push(followerToPush);
                    logging.push(followerToPush);
                }
            });
        }
    }
};

run().catch(e => {
    console.log(e);
});
