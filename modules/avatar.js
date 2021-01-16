const { createCanvas } = require('canvas');
const _canvas = createCanvas(256, 256);
const _ctx = _canvas.getContext('2d');
const _avatarCache = {};

async function generate(name, color, user) {
    if (_avatarCache.hasOwnProperty(user)) {
        _avatarCache[user].lastUsed = Date.now();
        return _avatarCache[user].data;
    } else {
        // Background
        _ctx.fillStyle = color;
        _ctx.fillRect(0, 0, 256, 256);

        // Text
        let text = name.substr(0, 2);
        _ctx.textBaseline = "middle";
        _ctx.textAlign = "center";
        _ctx.font = '128px Sans-serif';
        _ctx.strokeStyle = 'black';
        _ctx.lineWidth = 8;
        _ctx.strokeText(text, 128, 128);
        _ctx.fillStyle = 'white';
        _ctx.fillText(text, 128, 128);

        // Cache and export
        let data = _canvas.toDataURL().split(',')[1];

        if (Object.keys(_avatarCache).length >= 500) {
            let oldestCache;
            let oldestCacheAge;
            for (let avatar in _avatarCache) {
                if (oldestCache == null || oldestCacheAge == null || _avatarCache[avatar].lastUsed < _avatarCache[avatar]) {
                    oldestCache = avatar;
                    oldestCacheAge = _avatarCache[avatar].lastUsed;
                }
            }
            delete _avatarCache[oldestCache];
        }

        _avatarCache[user] = {data: data, lastUsed: Date.now()};
        return data;
    }
}

function clearCache() {
    for (let avatar in _avatarCache) {
        if ((Date.now() - _avatarCache[avatar].lastUsed) < 60 * 60 * 1000) {
            delete _avatarCache[avatar];
        }
    }
}

module.exports = { generate, clearCache }