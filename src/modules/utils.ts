import * as fs from 'fs';
import * as https from 'https';
import {Canvas, CanvasRenderingContext2D, Image} from "canvas";

export function getTagValue(message, tag, subTag = null) {
    if (contains(message, 'tags') && contains(message.tags, tag)) {
        if (typeof subTag == 'string') {
            if (contains(message.tags[tag], subTag)) return message.tags[tag][subTag];
        } else return message.tags[tag];
    }
    return null;
}

export function isTagTrue(message, tag, subTag = null) {
    return isTrue(getTagValue(message, tag, subTag));
}

export function getParameterValue(message, parameter, subParameter = null) {
    if (contains(message, 'parameters') && contains(message.parameters, parameter)) {
        if (typeof subParameter == 'string') {
            if (contains(message.parameters[parameter], subParameter)) return message.parameters[parameter][subParameter];
        } else return message.parameters[parameter];
    }
    return null;
}

export function isParameterTrue(message, parameter, subParameter = null) {
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

export function ensureExists(path, mask: any=0o777) {
    return new Promise<void>((resolve, reject) => {
        fs.mkdir(path, mask, function (err) {
            if (err) {
                if (err.code === 'EEXIST') resolve();
                else reject(err);
            } else resolve();
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

export async function loadImage(url, localName, category, fallback) {
    let imgDir = `${process.cwd()+'/logs'}/cache/${category}`;
    let imgPath = `${process.cwd()+'/logs'}/cache/${category}/${localName}`;

    let output = fallback;

    try {
        await ensureExists(imgDir, {recursive: true});
    } catch (err) {
        console.log(`[Error] ${err}`);
    }

    try {
        output = await fs.promises.readFile(imgPath, "base64");
    } catch {
        if (url) {
            try {
                await saveImageToDisk(url, imgPath);
                try {
                    output = await fs.promises.readFile(imgPath, "base64");
                } catch (err) {
                    console.log(`[Error] ${err}`);
                }
            } catch (err) {
                console.log(`[Error] ${err}`);
            }
        }
    }

    return output;
}

export function getEmoticonUrl(id) {
    return `https://static-cdn.jtvnw.net/emoticons/v1/${id}/1.0`;
}

export function drawRoundedImage(ctx: CanvasRenderingContext2D, image: Canvas | Image, dx: number, dy: number, dw: number, dh: number) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(dx, dy, (dw > dh ? dh : dw)/2, 0, 2 * Math.PI);
    ctx.closePath();

    ctx.clip();
    ctx.drawImage(image, dx - dw/2, dy - dh/2, dw, dh);
    ctx.restore();
}
