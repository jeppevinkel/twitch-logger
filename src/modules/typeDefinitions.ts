export interface IEmote {
    id: string
    start: number
    end: number
}

export interface IEmotePosition {
    start: number
    image: Promise<string>
}

export interface IRect {
    x: number
    y: number
    width: number
    height: number
}

export interface IMessage {
    badges: object[],
    color: string,
    displayName: string,
    "emotes": IEmote[],
    "flags": string,
    "mod": boolean,
    "subscriber": boolean,
    "tmiSentTs": string,
    "userType": string,
    "username": string,
    "event": string,
    "messageContent": string
}
