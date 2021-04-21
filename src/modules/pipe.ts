import * as WebSocket from 'ws';
import * as avatar from './avatar';
import * as utils from './utils';
import * as customPipe from "./customPipe";
import * as testing from "./testing";

let _websocket;
let _clearCacheInterval;
let _config;
let _enabled = false;

export function init(config) {
    _config = config;
    _enabled = _config.enabled && !_config.custom;

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
            pushFollow(message);
            break;
        case 'SUBSCRIPTION_GIFT':
            pushGiftSub(message);
            break;
        case 'RESUBSCRIPTION':
            pushReSub(message);
            break;
        case 'CHEER':
            pushCheer(message);
            break;
        case 'RAID':
            pushRaid(message);
            break;
        default:
            break;
    }
}

function pushMessage(message) {
    var skip = false;
    if (_config.muteBroadcaster && message.tags.badges.hasOwnProperty('broadcaster')) skip = true;
    _config.ignoreUsers.forEach(function (user) { if (message.tags.username.toLowerCase() == user.toLowerCase()) skip = true; });
    _config.ignorePrefixes.forEach(function (prefix) { if (message.message.indexOf(prefix) == 0) skip = true; });
    if (skip) {
        console.log(`[PIPE] Skipped message from: ${message.tags.displayName}`);
    } else {
        avatar.generate(message.tags.displayName, message.tags.color, message.username).then(data => {
            utils.loadImage(message.profileImageUrl, `${message.tags.userId}.png`, "avatar", data).then(img => {
                _websocket.send(JSON.stringify({ title: "Twitch-Logger", message: `${utils.getTagValue(message, 'displayName')}: ${message.message}`, image: img}));
            });
        }).catch(() => {
            _websocket.send(JSON.stringify({ title: "Twitch-Logger", message: `${utils.getTagValue(message, 'displayName')}: ${message.message}` }));
        });

        //_websocket.send(JSON.stringify({ title: "Twitch-Logger", message: `${message.tags.displayName}: ${message.message}`, image: avatar}));
        // avatar.generate(message.tags.displayName, message.tags.color, message.username).then((data) => {
        //     _websocket.send(JSON.stringify({ title: "Twitch-Logger", message: `${message.tags.displayName}: ${message.message}`, image: data }));
        // }).catch(() => {
        //     _websocket.send(JSON.stringify({ title: "Twitch-Logger", message: `${message.tags.displayName}: ${message.message}` }));
        // });
    }
}

function pushFollow(follow) {
    _websocket.send(JSON.stringify({ title: "Twitch-Logger", message: `${follow.displayName} followed!` }));
}

function pushGiftSub(giftSub) {
    var skip = false;
    if (_config.muteBroadcaster && giftSub.tags.badges.hasOwnProperty('broadcaster')) skip = true;
    if (skip) {
        console.log(`Skipped message from: ${giftSub.tags.displayName}`);
    } else {
        avatar.generate(giftSub.tags.displayName, giftSub.tags.color, giftSub.username).then(data => {
            utils.loadImage(giftSub.profileImageUrl, `${giftSub.tags.userId}.png`, "avatar", data).then(img => {
                _websocket.send(JSON.stringify({ title: "Twitch-Logger", message: `${utils.getTagValue(giftSub, 'systemMsg')}`, image: img}));
            });
        }).catch(() => {
            _websocket.send(JSON.stringify({ title: "Twitch-Logger", message: `${utils.getTagValue(giftSub, 'systemMsg')}` }));
        });
    }
}

function pushReSub(reSub) {
    var skip = false;
    if (_config.muteBroadcaster && reSub.tags.badges.hasOwnProperty('broadcaster')) skip = true;
    if (skip) {
        console.log(`Skipped message from: ${utils.getTagValue(reSub, 'displayName')}`);
    } else {
        avatar.generate(utils.getTagValue(reSub, 'displayName'), utils.getTagValue(reSub, 'color'), reSub.username).then(data => {
            utils.loadImage(reSub.profileImageUrl, `${utils.getTagValue(reSub, 'userId')}.png`, "avatar", data).then(img => {
                _websocket.send(JSON.stringify({ title: "Twitch-Logger", message: `${utils.getTagValue(reSub, 'systemMsg')}`, image: img}));
            });
        }).catch(() => {
            _websocket.send(JSON.stringify({ title: "Twitch-Logger", message: `${utils.getTagValue(reSub, 'systemMsg')}` }));
        });
    }
}

function pushCheer(cheer) {
    var skip = false;
    if (_config.muteBroadcaster && cheer.tags.badges.hasOwnProperty('broadcaster')) skip = true;
    if (skip) {
        console.log(`Skipped message from: ${utils.getTagValue(cheer, 'displayName')}`);
    } else {
        avatar.generate(utils.getTagValue(cheer, 'displayName'), utils.getTagValue(cheer, 'color'), cheer.username).then(data => {
            utils.loadImage(cheer.profileImageUrl, `${utils.getTagValue(cheer, 'userId')}.png`, "avatar", data).then(img => {
                _websocket.send(JSON.stringify({ title: "Twitch-Logger", message: `${cheer.message}`, image: img}));
            });
        }).catch(() => {
            _websocket.send(JSON.stringify({ title: "Twitch-Logger", message: `${cheer.message}` }));
        });
    }
}

function pushRaid(raid) {
    var skip = false;
    if (_config.muteBroadcaster && raid.tags.badges.hasOwnProperty('broadcaster')) skip = true;
    if (skip) {
        console.log(`Skipped message from: ${utils.getTagValue(raid, 'displayName')}`);
    } else {
        avatar.generate(utils.getTagValue(raid, 'displayName'), utils.getTagValue(raid, 'color'), raid.username).then(data => {
            utils.loadImage(raid.profileImageUrl, `${utils.getTagValue(raid, 'userId')}.png`, "avatar", data).then(img => {
                _websocket.send(JSON.stringify({ title: "Twitch-Logger", message: `${raid.systemMessage}`, image: img}));
            });
        }).catch(() => {
            _websocket.send(JSON.stringify({ title: "Twitch-Logger", message: `${raid.systemMessage}` }));
        });
    }
}
