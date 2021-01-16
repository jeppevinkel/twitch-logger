const fetch = require('node-fetch');
const moment = require('moment/moment.js');

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
    let dt = moment(parseInt(message.tags['tmiSentTs']));
    let str = `[${message.channel}][${dt.format('HH:mm')}] ${_config.subscriber_badge.enabled ? (message.tags['subscriber'] ? `[${_config.subscriber_badge.emoji}]`:'') : ''}${message.tags['mod'] ? '[🛡️]':''}${message.tags['badges'] != null ? message.tags['badges']['broadcaster'] ? '**[📣]':'' : ''} ${message.tags['displayName']}${message.tags['badges'] != null ? message.tags['badges']['broadcaster'] ? '**':'' : ''}: ${message.message}`;
    _messages.push(str);
}

module.exports = { init, start, stop, push };