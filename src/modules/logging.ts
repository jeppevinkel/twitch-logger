import {
    Message,
    Messages,
    PrivateMessage,
    ResubscriptionParameters,
    UserNoticeResubscriptionMessage, UserNoticeSubscriptionGiftMessage
} from "twitch-js/lib";

const fs = require('fs');
const https = require('https');
import * as moment from "moment";
const utils = require('./utils.js');

const _rootFolder = process.cwd()+'/logs';
let _config;
let _logs = {};
let _interval;

export function init(config) {
    _config = config;
}

export function start() {
    if (_config.enabled) {
        _interval = setInterval(sendLog, _config.log_interval);
    }
}

export function stop() {
    if (_config.enabled) clearInterval(_interval);
}

export function pushRaw(message) {
    if (!_config.enabled) return;
    if (!_logs[`${message.channel}_raw`]) _logs[`${message.channel}_raw`] = [];
    _logs[`${message.channel}_raw`].push(message);
}

export function push(message: any, profileImageUrl: string = undefined): void {
    if (!_config.enabled) return;
    let msg;

    switch (message.event) {
        case 'PRIVMSG':
            msg = formatMessage(message, profileImageUrl);
            break;
        case 'FOLLOW':
            msg = formatFollow(message);
            break;
        case 'SUBSCRIPTION_GIFT':
            msg = formatGiftSub(message);
            break;
        case 'RESUBSCRIPTION':
            msg = formatReSub(message);
            break;
        default:
            return;
    }

    if (_config.cache_emotes && msg.emotes != null) {
        let imgPath = `${_rootFolder}/cache/emotes`;
        for (const emotesKey in msg.emotes) {
            let imgName = `/${msg.emotes[emotesKey].id}.png`;
            utils.loadImage(getEmoticonUrl(msg.emotes[emotesKey].id), `${msg.emotes[emotesKey].id}.png`, 'emotes', null)
            // ensureExists(imgPath, {recursive: true}, function (err) {
            //     saveImageToDisk(getEmoticonUrl(msg.emotes[emotesKey].id), imgPath + imgName);
            // });
        }
    }

    if (!_logs[message.channel]) _logs[message.channel] = [];
    _logs[message.channel].push(msg);
}

function formatMessage(message: PrivateMessage, profileImageUrl: string = undefined) {
    return {
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
        "userId": message.tags.userId,
        "event": message.event,
        "messageContent": message.message,
        "profileImageUrl": profileImageUrl,
        "msgId": message.tags.msgId
    };
}

function formatFollow(follow) {
    return {
        "displayName": follow.displayName,
        "tmiSentTs": follow.timestamp,
        "event": follow.event,
    };
}

function formatGiftSub(giftSub: UserNoticeSubscriptionGiftMessage) {
    return {
        "color": giftSub.tags.color,
        "senderInfo": {
            "username": giftSub.username,
            "displayName": giftSub.tags.displayName,
            "userId": giftSub.tags.userId,
            "badges": giftSub.tags.badges
        },
        "recipientInfo": {
            "username": giftSub.parameters.recipientName,
            "displayName": giftSub.parameters.recipientDisplayName,
            "userId": giftSub.parameters.recipientId
        },
        "subscriptionInfo": {
            "giftMonths": giftSub.parameters.months,
            "months": giftSub.parameters.months,
            "subPlanName": giftSub.parameters.subPlanName,
            "subPlan": giftSub.parameters.subPlan
        },
        "messageContent": giftSub.systemMessage,
        "tmiSentTs": giftSub.tags.tmiSentTs,
        "event": giftSub.event,
        "msgId": giftSub.tags.msgId
    };
}

function formatReSub(reSub: UserNoticeResubscriptionMessage) {
    return {
        "color": utils.getTagValue(reSub, 'color'),
        "userInfo": {
            "username": reSub.username,
            "displayName": utils.getTagValue(reSub, 'displayName'),
            "userId": utils.getTagValue(reSub, 'userId'),
            "badges": utils.getTagValue(reSub, 'badges')
        },
        "subscriptionInfo": {
            "cumulativeMonths": utils.getParameterValue(reSub, 'cumulativeMonths'),
            "months": utils.getParameterValue(reSub, 'months'),
            "multiMonthDuration": utils.getParameterValue(reSub, 'multimonthDuration'),
            "multiMonthTenure": utils.getParameterValue(reSub, 'multimonthTenure'),
            "streakMonths": utils.getParameterValue(reSub, 'streakMonths'),
            "shouldShareStreak": utils.getParameterValue(reSub, 'shouldShareStreak'),
            "subPlanName": utils.getParameterValue(reSub, 'subPlanName'),
            "subPlan": utils.getParameterValue(reSub, 'subPlan'),
            "wasGifted": utils.getParameterValue(reSub, 'wasGifted')
        },
        "tmiSentTs": utils.getTagValue(reSub, 'tmiSentTs'),
        "event": reSub.event,
        "msgId": utils.getTagValue(reSub, 'msgId')
    };
}

function sendLog() {
    if (!Object.keys(_logs).length) return;

    let path = `${_rootFolder}/${moment().format("YYYY")}`;

    for (let channel in _logs) {
        if (!_logs[channel].length) continue;
        let fileName = `/${moment().format("YYYY-MM-DD")}_${channel.substring(1)}.json`;
        utils.ensureExists(path, {recursive: true})
        .then(() => saveLogToDisk(path, fileName, channel))
        .catch(err => console.log(`Error saving log: ${err.message}`));
    }
}

function saveLogToDisk(path, fileName, channel) {
    fs.readFile(path + fileName, (err, data) => {
        if (err) {
            fs.writeFile(path + fileName, JSON.stringify(_logs[channel]), (err) => {
                if (err) {
                    console.error(err)
                }
                _logs[channel] = [];
            });
        } else {
            let json = JSON.parse(data);
            json = json.concat(_logs[channel]);
            fs.writeFile(path + fileName, JSON.stringify(json), (err) => {
                if (err) {
                    console.error(err)
                }
                _logs[channel] = [];
            });
        }
    });
}

function getEmoticonUrl(id) {
    return `https://static-cdn.jtvnw.net/emoticons/v1/${id}/1.0`;
}

//module.exports = { init, start, stop, push, pushRaw };
