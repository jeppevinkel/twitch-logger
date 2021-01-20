const fs = require('fs');
const https = require('https');
const moment = require('moment/moment.js');

const _rootFolder = process.cwd()+'/logs';
let _config;
let _logs = {};
let _interval;

function init(config) {
    _config = config;
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
    let msg;

    if (message.logRaw) {

        if (!_logs[`${message.channel}_raw`]) _logs[`${message.channel}_raw`] = [];
        _logs[`${message.channel}_raw`].push(message);
        return;
    }

    switch (message.event) {
        case 'PRIVMSG':
            msg = formatMessage(message);
            break;
        case 'FOLLOW':
            msg = formatFollow(message);
            break;
        default:
            break;
    }

    if (_config.cache_emotes && msg.emotes != null) {
        let imgPath = `${_rootFolder}/cache/emotes`;
        for (const emotesKey in msg.emotes) {
            let imgName = `/${msg.emotes[emotesKey].id}.png`;
            ensureExists(imgPath, {recursive: true}, function (err) {
                saveImageToDisk(getEmoticonUrl(msg.emotes[emotesKey].id), imgPath + imgName);
            });
        }
    }

    if (!_logs[message.channel]) _logs[message.channel] = [];
    _logs[message.channel].push(msg);
}

function formatMessage(message) {
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
        "event": message.event,
        "messageContent": message.message,
        "profileImageUrl": message.profileImageUrl
    };
}

function formatFollow(follow) {
    return {
        "displayName": follow.displayName,
        "tmiSentTs": follow.timestamp,
        "event": follow.event,
    };
}

function sendLog() {
    if (!Object.keys(_logs).length) return;

    let path = `${_rootFolder}/${moment().format("YYYY")}`;

    for (let channel in _logs) {
        if (!_logs[channel].length) continue;
        let fileName = `/${moment().format("YYYY-MM-DD")}_${channel.substring(1)}.json`;

        ensureExists(path, {recursive: true}, function (err) {
            if (err) {
                console.log(err);
            } else {
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
        });
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

function saveImageToDisk(url, localPath) {
    let fullUrl = url;
    let file = fs.createWriteStream(localPath);
    let request = https.get(url, function(response) {
        response.pipe(file);
    });
}

function getEmoticonUrl(id) {
    return `https://static-cdn.jtvnw.net/emoticons/v1/${id}/1.0`;
}

module.exports = { init, start, stop, push };