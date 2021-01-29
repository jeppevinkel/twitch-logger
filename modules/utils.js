const fs = require('fs');
const https = require('https');

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

function getParameterValue(message, parameter, subParameter = null) {
    if (contains(message, 'parameters') && contains(message.parameters, parameter)) {
        if (typeof subParameter == 'string') {
            if (contains(message.parameters[parameter], subParameter)) return message.parameters[parameter][subParameter];
        } else return message.parameters[parameter];
    }
    return null;
}

function isParameterTrue(message, parameter, subParameter = null) {
    return isTrue(getParameterValue(message, parameter, subParameter));
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

function ensureExists(path, mask) {
    return new Promise((resolve, reject) => {
        if (mask === undefined) {
            mask = 0o777;
        }
        fs.mkdir(path, mask, function (err) {
            if (err) {
                if (err.code === 'EEXIST') resolve(null);
                else reject(err);
            } else resolve(null);
        });
    });
}

function saveImageToDisk(url, localPath) {
    return new Promise((resolve, reject) => {
        let file = fs.createWriteStream(localPath);
        let request = https.get(url, function (response) {
            response.pipe(file);
            file.on('close', resolve);
            file.on('finish', function() {
                file.close();
            });
        }).on('error', function (err) {
            fs.unlink(localPath, null);
            reject(err);
        });
    })
}

async function loadImage(url, localName, category, fallback) {
    let imgDir = `${process.cwd()+'/logs'}/cache/${category}`;
    let imgPath = `${process.cwd()+'/logs'}/cache/${category}/${localName}`;

    let output = fallback;

    await ensureExists(imgDir, {recursive: true}, function (){});

    try {
        output = await fs.promises.readFile(imgPath, "base64");
    } catch {
        if (url) {
            try {
                await saveImageToDisk(url, imgPath);
                output = await fs.promises.readFile(imgPath, "base64");
            } catch {
                // Using fallback because no can download!
            }
        }
    }

    return output;
}

module.exports = { getTagValue, isTagTrue, getParameterValue, isParameterTrue, loadImage, ensureExists }
