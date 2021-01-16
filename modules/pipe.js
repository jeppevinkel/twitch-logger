const WebSocket = require('ws');
const avatar = require('./avatar.js');

let _websocket;
let _clearCacheInterval;
let _config;

function init(config) {
    _config = config;
    
    let active = false;
    if(_config.enabled) connectLoop();
      
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
        console.log("Started clearCacheInterval");
        _clearCacheInterval = setInterval(avatar.clearCache, 60 * 60 * 1000);
    }
    
    function onClose(evt)
    {
        active = false;
        console.log("Stopped clearCacheInterval");
        clearInterval(_clearCacheInterval);
        avatar.clearCache();
    }
    
    function onError(evt) {
        console.log("ERROR: "+JSON.stringify(evt, null, 2));
    }
}

function push(message) {
    var skip = !_config.enabled; // Always skip pushing if this is not enabled in the first place.
    if (_config.muteBroadcaster && message.tags.badges.hasOwnProperty('broadcaster')) skip = true;
    _config.ignoreUsers.forEach(function (user) { if (message.tags.username.toLowerCase() == user.toLowerCase()) skip = true; });
    _config.ignorePrefixes.forEach(function (prefix) { if (message.message.indexOf(prefix) == 0) skip = true; });
    if (skip) {
        console.log(`Skipped message from: ${message.tags.displayName}`);
    } else {
        avatar.generate(message.tags.displayName, message.tags.color, message.username).then((data) => {
            _websocket.send(JSON.stringify({ title: "Twitch-Logger", message: `${message.tags.displayName}: ${message.message}`, image: data }));
        }).catch(() => {
            _websocket.send(JSON.stringify({ title: "Twitch-Logger", message: `${message.tags.displayName}: ${message.message}` }));
        });
    }
}

module.exports = { init, push };