import * as moment from "moment";


export function generateMessage(moderator = false) {
    return {
        command: "PRIVMSG",
        event: "PRIVMSG",
        channel: "#randomchannel21",
        username: "somedude43",
        isSelf: false,
        message: "This is just a random test message!",
        tags: {
            "badgeInfo": "founder/2",
            "badges": {
                "founder": "0",
                "subGiftLeader": "1"
            },
            "clientNonce": "42cf864ae1665433411cea418e31c714",
            "color": "#1E90FF",
            "displayName": "SomeDude43",
            "emotes": [],
            "flags": "",
            "id": "3691c09a-7dad-41c6-b30c-b500d7870b41",
            "mod": (moderator ? "1" : "0"),
            "roomId": "21318266",
            "subscriber": "0",
            "tmiSentTs": "1610810247141",
            "turbo": "0",
            "userId": "47214462",
            "userType": "",
            "emoteSets": [],
            "username": "somedude43",
            "isModerator": false
        }
    }
}

export function generateFollow() {
    return {
        "event": 'FOLLOW',
        "timestamp": moment().unix(),
        "displayName": "somedude43",
        "userId": "47214462",
        "channel": "#randomchannel21"
    }
}

export function generateReSub() {
    return {
        "timestamp": "2021-01-29T20:01:33.638Z",
        "command": "USERNOTICE",
        "event": "RESUBSCRIPTION",
        "channel": "#randomchannel21",
        "username": "somedude43",
        "isSelf": false,
        "tags": {
            "badgeInfo": "founder/3",
            "badges": {
                "vip": true,
                "founder": "0",
                "subGiftLeader": "1"
            },
            "color": "#1E90FF",
            "displayName": "SomeDude43",
            "emotes": [],
            "flags": "",
            "id": "3830abbd-20a3-4041-a863-e0f2c6239439",
            "login": "somedude43",
            "mod": "0",
            "msgId": "resub",
            "msgParamCumulativeMonths": "3",
            "msgParamMonths": "0",
            "msgParamMultimonthDuration": "0",
            "msgParamMultimonthTenure": "0",
            "msgParamShouldShareStreak": "1",
            "msgParamStreakMonths": "2",
            "msgParamSubPlanName": "Use any free sub here if you want to, appreciated!",
            "msgParamSubPlan": "Prime",
            "msgParamWasGifted": "false",
            "roomId": "21318266",
            "subscriber": "1",
            "systemMsg": "SomeDude43 subscribed with Prime. They've subscribed for 3 months, currently on a 2 month streak!",
            "tmiSentTs": "1611950493638",
            "userId": "47214462",
            "userType": "",
            "emoteSets": [],
            "username": "somedude43",
            "isModerator": false
        },
        "parameters": {
            "cumulativeMonths": "3",
            "months": 0,
            "multimonthDuration": "0",
            "multimonthTenure": "0",
            "shouldShareStreak": "1",
            "streakMonths": "2",
            "subPlanName": "Use any free sub here if you want to, appreciated!",
            "subPlan": "Prime",
            "wasGifted": "false"
        }
    }
}

export function generateGiftSub() {
    return {
        "timestamp": "2021-01-20T19:21:49.970Z",
        "command": "USERNOTICE",
        "event": "SUBSCRIPTION_GIFT",
        "channel": "#randomchannel21",
        "username": "someguy54",
        "isSelf": false,
        "tags": {
            "badgeInfo": "founder/1",
            "badges": {
                "vip": true,
                "founder": "0"
            },
            "color": "#DAA520",
            "displayName": "SomeGuy54",
            "emotes": [

            ],
            "flags": "",
            "id": "43aea9e1-09eb-4bde-b836-d314cb072083",
            "login": "someguy54",
            "mod": "0",
            "msgId": "subgift",
            "msgParamGiftMonths": "1",
            "msgParamMonths": "1",
            "msgParamOriginId": "da 39 a3 ee 5e 6b 4b 0d 32 55 bf ef 95 60 18 90 af d8 07 09",
            "msgParamRecipientDisplayName": "SomeDude43",
            "msgParamRecipientId": "30682268",
            "msgParamRecipientUserName": "somedude43",
            "msgParamSenderCount": "1",
            "msgParamSubPlanName": "Channel Subscription (randomchannel21)",
            "msgParamSubPlan": "1000",
            "roomId": "47649242",
            "subscriber": "1",
            "systemMsg": "SomeGuy54 gifted a Tier 1 sub to SomeDude43! This is their first Gift Sub in the channel!",
            "tmiSentTs": "1611170509970",
            "userId": "21618340",
            "userType": "",
            "emoteSets": [

            ],
            "username": "someguy54",
            "isModerator": false
        },
        "parameters": {
            "giftMonths": "1",
            "months": 1,
            "originId": "da 39 e3 aa 5e 6b 4b 0d 32 55 bf ef 95 60 18 90 af d8 07 09",
            "recipientDisplayName": "SomeDude43",
            "recipientId": "39364028",
            "recipientUserName": "somedude43",
            "senderCount": 1,
            "subPlanName": "Channel Subscription (randomchannel21)",
            "subPlan": "1000"
        },
        "systemMessage": "SomeGuy54 gifted a Tier 1 sub to SomeDude43! This is their first Gift Sub in the channel!",
    }
}
