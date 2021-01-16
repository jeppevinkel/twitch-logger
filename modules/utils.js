function getTagValue(message, tag, subTag = null) {
    if (contains(message, 'tags') && contains(message.tags, tag)) {
        if (typeof subTag == 'string') {
            if (contains(message.tags[tag], subTag)) return message.tags[tag][subTag];
        } else return message.tags[tag];
    }
    return null;
}
function isTagTrue(message, tag, subTag = null) {
    return isTrue(getTagValue(message, tag, subTag));
}

function contains(obj, property) {
    return typeof obj === 'object' && typeof property === 'string' && obj.hasOwnProperty(property);
}

function isTrue(value) {
    if(typeof value === 'boolean') return value;
    else if(typeof value === 'string') {
        if(value == 'true') return true;
        if(value != '0') return true;
    } else if(typeof value === 'number') {
        if(value > 0) return true;
    }
    return false;
}

module.exports = { getTagValue, isTagTrue }