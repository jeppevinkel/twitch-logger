const { readdir, stat, readFile, writeFile } = require("fs").promises
const { join } = require('path')

const logsRoot = join(__dirname, "../logs");

const dirs = async path => {
    let dirs = []
    for (const file of await readdir(path)) {
        if (file === 'cache') continue;
        if ((await stat(join(path, file))).isDirectory()) {
            dirs = [...dirs, file]
        }
    }
    return dirs
}

dirs(logsRoot).then(async dirs => {
    for (const dir of dirs) {
        let logFolder = join(logsRoot, dir);
        console.log(logFolder);
        const files = (await readdir(logFolder)).filter(name => name.includes("#"));
        console.log(files);
        for(const file of files) {
            const fromPath = join(logFolder, file);
            const toPath = join(logFolder, file.replace("#", ""));
            const fileStat = await stat(fromPath);
            if(!fileStat.isFile()) continue;

            readFile(fromPath, {encoding: "utf-8"}).then(async content => {
                let newLog = formatLog(JSON.parse(content));
                await writeFile(toPath, JSON.stringify(newLog));
            })
        }
    }
});

function formatLog(log) {
    let newLog = [];

    for (let i = 0; i < log.length; i++) {
        let newEmotes = [];
        if (log[i].emotes) {
            Object.keys(log[i].emotes).forEach(key => {
                for (const emotePos of log[i].emotes[key]) {
                    let limits = emotePos.split("-");
                    newEmotes.push({
                        id: key,
                        start: limits[0],
                        end: limits[1]
                    })
                }
            });
        }

        newLog.push({
            "badges": log[i].badges,
            "color": log[i].color,
            "displayName": log[i].display_name,
            "emotes": newEmotes,
            "flags": log[i].flags,
            "mod": log[i].mod,
            "subscriber": log[i].subscriber,
            "tmiSentTs": log[i].sent_ts,
            "userType": log[i].user_type,
            "username": log[i].username,
            "event": log[i].message_type,
            "messageContent": log[i].message_content
        });
    }
    return newLog;
}