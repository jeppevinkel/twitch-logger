import {IEmotePosition, IMessage, IRect} from "./typeDefinitions";
import * as utils from "./utils";
import {Image, CanvasRenderingContext2D} from 'canvas';

export async function drawTwitchMessage(ctx: CanvasRenderingContext2D, pos: IRect, emoteSize: number, message: IMessage) {
    message.messageContent = message.messageContent.split('\n').join(' ');

    const words = message.messageContent.split(' ');
    const wordSpacing = ctx.measureText(" ").width;

    let emotes: IEmotePosition[] = await Promise.all(message.emotes.sort(((a, b) => a.start - b.start)).map(e => {
        return {
            start: e.start as number,
            image: utils.loadImage(utils.getEmoticonUrl(e.id), `${e.id}.png`, 'emotes', null) as Promise<string>
        } as IEmotePosition;
    }));

    let nextEmote = emotes.shift();

    let index = 0;
    let line = 0;
    let xPos = pos.x;
    for (let i = 0; i < words.length; i++) {
        const wordsWidth = nextEmote.start == index ? emoteSize : ctx.measureText(words[i]).width;
        if (xPos + wordsWidth > pos.x + pos.width) {
            line++;
            xPos = pos.x;
        }

        const lineY = pos.y + emoteSize + (emoteSize * 1.1) * line;

        if (nextEmote.start == index) {
            let image = await new Promise(async (resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = new Buffer(await nextEmote.image, 'base64');
            });

            ctx.drawImage(image, xPos, lineY - emoteSize, emoteSize, emoteSize);

            if (emotes.length) nextEmote = emotes.shift();

            xPos += wordsWidth + wordSpacing;
            index += words[i].length + 1;

            continue;
        }

        ctx.fillText(words[i], xPos, lineY);

        xPos += wordsWidth + wordSpacing;
        index += words[i].length + 1;
    }
}
