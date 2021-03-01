import Badges from "twitch-js";

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
    badges: Partial<Badges>,
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

export interface IRawMessage {
    "_raw": string,
    "timestamp": string,
    "command": string,
    "event": string,
    "channel": string,
    "username": string,
    "isSelf": boolean,
    "message": string,
    "tags": {
        "badgeInfo": string,
        "badges": object[],
        "clientNonce": string,
        "color": string,
        "displayName": string,
        "emotes": IEmote[],
        "flags": string,
        "id": string,
        "mod": string,
        "roomId": string,
        "subscriber": string,
        "tmiSentTs": string,
        "turbo": string,
        "userId": string,
        "userType": string,
        "emoteSets": object[],
        "username": string,
        "isModerator": boolean
    }
}

export interface ICustomNotification {
    custom: boolean,
    image: string,
    properties: {
        headset: boolean,
        horizontal: boolean,
        channel: number,
        hz: number,
        duration: number,
        width: number,
        distance: number,
        pitch: number,
        yaw: number
    },
    transition: {
        scale: number,
        opacity: number,
        vertical: number,
        horizontal: number,
        spin: number,
        tween: number,
        duration: number
    },
    transition2: {
        scale: number,
        opacity: number,
        vertical: number,
        horizontal: number,
        spin: number,
        tween: number,
        duration: number
    }
}
