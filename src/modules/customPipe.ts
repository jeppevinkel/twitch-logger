import * as WebSocket from 'ws';
import * as avatar from './avatar';
import * as utils from './utils';
import {ICustomNotification, IMessage, IRect} from "./typeDefinitions";
import {createCanvas, Image, loadImage, PNGStream} from "canvas";
import {drawTwitchMessage} from "./emoteCanvas";
import {formatMessage} from "./logging";
import {drawRoundedImage} from "./utils";
const privateMessageConfig = require('../../notifications/privateMessage.json');

let _websocket;
let _clearCacheInterval;
let _config;
let _enabled = false;

export function init(config) {
    _config = config;
    _enabled = _config.enabled && _config.custom;

    let active = false;
    if(_enabled) connectLoop();

    function connectLoop()
    {
        if(!active) {
            if(typeof _websocket !== 'undefined') _websocket.close();
            _websocket = new WebSocket(`${_config.host}:${_config.port}`);
            _websocket.onopen = function(evt) { onOpen(evt) };
            _websocket.onclose = function(evt) { onClose(evt) };
            _websocket.onerror = function(evt) { onError(evt) };
        }
        setTimeout(connectLoop, 5000);
    }

    function onOpen(evt)
    {
        active = true;
        console.log("[PIPE] Started clearCacheInterval");
        _clearCacheInterval = setInterval(avatar.clearCache, 60 * 60 * 1000);
    }

    function onClose(evt)
    {
        active = false;
        console.log("[PIPE] Stopped clearCacheInterval");
        clearInterval(_clearCacheInterval);
        avatar.clearCache();
    }

    function onError(evt) {
        console.log("[PIPE] ERROR: "+JSON.stringify(evt, null, 2));
    }
}

export function push(message) {
    if(!_enabled) return;

    switch (message.event) {
        case 'PRIVMSG':
            pushMessage(message);
            break;
        case 'FOLLOW':
            // pushFollow(message);
            break;
        case 'SUBSCRIPTION_GIFT':
            // pushGiftSub(message);
            break;
        case 'RESUBSCRIPTION':
            // pushReSub(message);
            break;
        default:
            break;
    }
}

async function pushMessage(message) {
    var skip = false;
    if (_config.muteBroadcaster && message.tags.badges.hasOwnProperty('broadcaster')) skip = true;
    _config.ignoreUsers.forEach(function (user) { if (message.tags.username.toLowerCase() == user.toLowerCase()) skip = true; });
    _config.ignorePrefixes.forEach(function (prefix) { if (message.message.indexOf(prefix) == 0) skip = true; });
    if (skip) {
        console.log(`[PIPE] Skipped message from: ${message.tags.displayName}`);
    } else {
        let msgValues: ICustomNotification = privateMessageConfig.style;
        msgValues.custom = true;

        const bg = await loadImage(privateMessageConfig.message.background);
        const canvas = createCanvas(bg.width, bg.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bg, 0, 0);
        ctx.fillStyle = privateMessageConfig.message.fill_style;
        ctx.font = privateMessageConfig.message.font;

        avatar.generate(message.tags.displayName, message.tags.color, message.username).then(data => {
            utils.loadImage(message.profileImageUrl, `${message.tags.userId}.png`, "avatar", data).then(img => {
                let formattedMessage = formatMessage(message, null) as IMessage;
                drawTwitchMessage(ctx, privateMessageConfig.message.message_box as IRect, privateMessageConfig.message.emote_size, formattedMessage).then( () => {

                    new Promise<Image>(async (resolve, reject) => {
                        const _img = new Image();
                        _img.onload = () => resolve(_img);
                        _img.onerror = reject;
                        _img.src = new Buffer(img, 'base64');
                    }).then(im => {
                        if (privateMessageConfig.message.avatar.rounded) {
                            drawRoundedImage(ctx,
                                im,
                                privateMessageConfig.message.avatar.x,
                                privateMessageConfig.message.avatar.y,
                                privateMessageConfig.message.avatar.width,
                                privateMessageConfig.message.avatar.height);
                        }
                        else {
                            ctx.drawImage(im,
                                privateMessageConfig.message.avatar.x - (privateMessageConfig.message.avatar.width/2),
                                privateMessageConfig.message.avatar.y - (privateMessageConfig.message.avatar.height/2),
                                privateMessageConfig.message.avatar.width,
                                privateMessageConfig.message.avatar.height);
                        }

                        ctx.save();
                        ctx.fillStyle = privateMessageConfig.message.name_display.fill_style;
                        ctx.font = privateMessageConfig.message.name_display.font;
                        ctx.fillText(formattedMessage.displayName, privateMessageConfig.message.name_display.x, privateMessageConfig.message.name_display.y);
                        ctx.restore();

                        msgValues.image = canvas.toDataURL().split(',')[1];

                        _websocket.send(JSON.stringify(msgValues));
                    });


                });
            });
        }).catch(() => {
            drawTwitchMessage(ctx, privateMessageConfig.message.message_box as IRect, privateMessageConfig.message.emote_size, message).then( () => {

                msgValues.image = canvas.toDataURL().split(',')[1];

                _websocket.send(JSON.stringify(msgValues));
            });
        });

        //_websocket.send(JSON.stringify({ title: "Twitch-Logger", message: `${message.tags.displayName}: ${message.message}`, image: avatar}));
        // avatar.generate(message.tags.displayName, message.tags.color, message.username).then((data) => {
        //     _websocket.send(JSON.stringify({ title: "Twitch-Logger", message: `${message.tags.displayName}: ${message.message}`, image: data }));
        // }).catch(() => {
        //     _websocket.send(JSON.stringify({ title: "Twitch-Logger", message: `${message.tags.displayName}: ${message.message}` }));
        // });
    }
}
