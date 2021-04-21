import * as fetch from 'node-fetch';
import * as moment from 'moment';
import * as utils from './utils';

let _config;
let _messages = [];
let _interval;

export function init(config) {
    _config = config;
}

function sendLog() {
    if (!_messages.length) return;
    let content = _messages.join('\n');

    fetch(_config.webhook, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({"content": content})
    }).catch(r => console.log(r));

    _messages = [];
}

export function start() {
    if (_config.enabled) {
        _interval = setInterval(sendLog, _config.log_interval);
    }
}

export function stop() {
    if (_config.enabled) clearInterval(_interval);
}

export function push(message) {
    if (!_config.enabled) return;
    let str;

    switch (message.event) {
        case 'PRIVMSG':
            str = formatMessage(message);
            break;
        case 'FOLLOW':
            str = formatFollow(message);
            break;
        case 'SUBSCRIPTION_GIFT':
            str = formatGiftSub(message);
            break;
        case 'RESUBSCRIPTION':
            str = formatReSub(message);
            break;
        case 'CHEER':
            str = formatCheer(message);
            break;
        case 'RAID':
            str = formatRaid(message);
            break;
        default:
            break;
    }

    _messages.push(str);
}

function formatMessage(message) {
    let dt = moment(parseInt(message.tags['tmiSentTs']));
    let meta = `[${message.channel}][${dt.format('HH:mm')}]`;

    // Checks
    let isBroadcaster = utils.isTagTrue(message, 'badges', 'broadcaster');
    let isFounder = utils.getTagValue(message, 'badges', 'founder');
    let isSub = _config.subscriber_badge.enabled && (isFounder || isBroadcaster || utils.isTagTrue(message, 'subscriber'));

    // Badges
    let subBadge = isSub ? `[${_config.subscriber_badge.emoji}]`:'';
    let modBadge = utils.isTagTrue(message, 'mod') ? '[🛡️]':'';
    let broadcasterBadge = isBroadcaster ? '[📣]':'';

    // Name
    let displayName = utils.getTagValue(message, 'displayName');
    if(isBroadcaster) displayName = `**${displayName}**`; // Bold broadcaster

    return `${meta} ${subBadge}${modBadge}${broadcasterBadge} ${displayName}: ${message.message}`;
}

function formatFollow(follow) {
    let dt = moment(parseInt(follow['timestamp']));
    let meta = `[${follow.channel}][${dt.format('HH:mm')}]`;

    return `${meta} ***${follow.displayName} is now following!***`;
}

function formatGiftSub(giftSub) {
    let dt = moment(parseInt(giftSub.tags['tmiSentTs']));
    let meta = `[${giftSub.channel}][${dt.format('HH:mm')}]`;

    // Message
    let systemMessage = utils.getTagValue(giftSub, 'systemMsg');

    return `${meta} ***${systemMessage}***`;
}

function formatReSub(reSub) {
    let dt = moment(parseInt(reSub.tags['tmiSentTs']));
    let meta = `[${reSub.channel}][${dt.format('HH:mm')}]`;

    // Message
    let systemMessage = utils.getTagValue(reSub, 'systemMsg');

    return `${meta} ***${systemMessage}***`;
}

function formatCheer(cheer) {
    let dt = moment(parseInt(cheer.tags['tmiSentTs']));
    let meta = `[${cheer.channel}][${dt.format('HH:mm')}]`;

    // Checks
    let isBroadcaster = utils.isTagTrue(cheer, 'badges', 'broadcaster');
    let isFounder = utils.getTagValue(cheer, 'badges', 'founder');
    let isSub = _config.subscriber_badge.enabled && (isFounder || isBroadcaster || utils.isTagTrue(cheer, 'subscriber'));

    // Badges
    let subBadge = isSub ? `[${_config.subscriber_badge.emoji}]`:'';
    let modBadge = utils.isTagTrue(cheer, 'mod') ? '[🛡️]':'';
    let broadcasterBadge = isBroadcaster ? '[📣]':'';

    // Name
    let displayName = utils.getTagValue(cheer, 'displayName');
    if(isBroadcaster) displayName = `**${displayName}**`; // Bold broadcaster

    // Cheering announement
    let cheerAnnouncement = `${meta} ***${displayName} cheered with ${cheer.bits} bits!***`;

    // Message
    let message = `${meta} ${subBadge}${modBadge}${broadcasterBadge} ${displayName}: ${cheer.message}`;

    return `${cheerAnnouncement}\n${message}`;
}

function formatRaid(raid) {
    let dt = moment(parseInt(raid.tags['tmiSentTs']));
    let meta = `[${raid.channel}][${dt.format('HH:mm')}]`;

    // Message
    let systemMessage = utils.getTagValue(raid, 'systemMsg');

    return `${meta} ***${systemMessage}***`;
}
