const fetch = require('node-fetch');
const moment = require('moment/moment.js');
const utils = require('./utils.js');

let _config;
let _messages = [];
let _interval;

function init(config) {
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

function start() {
    if (_config.enabled) {
        _interval = setInterval(sendLog, _config.log_interval);
    }
}

function stop() {
    if (_config.enabled) clearInterval(_interval);
}

function push(message) {
    if (!_config.enabled) return;

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
    
    let str = `${meta} ${subBadge}${modBadge}${broadcasterBadge} ${displayName}: ${message.message}`;
    _messages.push(str);
}

module.exports = { init, start, stop, push };