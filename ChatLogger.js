// ================== ChatLogger ========================

// ==================== 配置区域 ====================

const CONFIG_PATH = "plugins/ChatLogger/config.json";

// 默认配置
const defaultConfig = {
    "enable": true,
    "logPath": "plugins/ChatLogger/logs/",
    "logFileName": "chat_%Y%M%D.log",
    "logJoinLeave": true,
    "logChat": true,
    "logToConsole": true,
    "timeFormat": "[%H:%m:%S]",
    "chatFormat": "{time} <{player}> {message}",
    "joinFormat": "{time} *** {player} 加入了游戏",
    "leaveFormat": "{time} *** {player} 离开了游戏"
};

// ==================== 全局变量 ====================

let config = {};
let currentLogFile = "";
let currentDate = "";

// ==================== 工具函数 ====================

function padZero(num) {
    return num < 10 ? "0" + num : "" + num;
}

// 获取当前日期字符串
function getDateString() {
    const now = new Date();
    return now.getFullYear().toString() + 
           padZero(now.getMonth() + 1) + 
           padZero(now.getDate());
}

// 获取当前时间字符串
function getTimeString() {
    const now = new Date();
    let timeStr = config.timeFormat;
    timeStr = timeStr.replace("%H", padZero(now.getHours()));
    timeStr = timeStr.replace("%m", padZero(now.getMinutes()));
    timeStr = timeStr.replace("%S", padZero(now.getSeconds()));
    return timeStr;
}

// 生成日志文件名
function generateLogFileName() {
    const date = getDateString();
    const year = date.substring(0, 4);
    const month = date.substring(4, 6);
    const day = date.substring(6, 8);
    
    let fileName = config.logFileName;
    fileName = fileName.replace("%Y", year);
    fileName = fileName.replace("%M", month);
    fileName = fileName.replace("%D", day);
    
    return config.logPath + fileName;
}

// 确保日志目录存在，如果不存在则创建
function ensureLogDir() {
    try {
        // 使用文件对象方式写入，会自动创建目录
        const testFile = config.logPath + ".gitkeep";
        const fi = new File(testFile, file.WriteMode);
        fi.writeSync("");
        fi.close();
    } catch (e) {
        log("[ChatLogger] 创建日志目录失败: " + e);
    }
}

// 更新当前日志文件，如果日期发生变化则切换到新的日志文件
function updateLogFile() {
    const date = getDateString();
    if (date !== currentDate) {
        currentDate = date;
        currentLogFile = generateLogFileName();
        ensureLogDir();
    }
}

// 写入日志
function writeLog(message) {
    updateLogFile();
    
    try {
        // 使用文件对象方式追加写入，会自动创建目录
        const fi = new File(currentLogFile, file.AppendMode);
        fi.writeLineSync(message);
        fi.close();
    } catch (e) {
        log("[ChatLogger] 写入聊天日志失败: " + currentLogFile + " - " + e);
    }
    
    if (config.logToConsole) {
        log(message);
    }
}

// 格式化聊天消息
function formatChatMessage(player, message) {
    let formatted = config.chatFormat;
    formatted = formatted.replace("{time}", getTimeString());
    formatted = formatted.replace("{player}", player.name);
    formatted = formatted.replace("{message}", message);
    
    if (config.logXuid) {
        formatted = formatted.replace("{xuid}", player.xuid);
    }
    if (config.logIp) {
        formatted = formatted.replace("{ip}", player.ip);
    }
    
    return formatted;
}

// 格式化玩家加入/离开消息
function formatJoinLeaveMessage(player, isJoin) {
    let template = isJoin ? config.joinFormat : config.leaveFormat;
    let formatted = template;
    formatted = formatted.replace("{time}", getTimeString());
    formatted = formatted.replace("{player}", player.name);
    
    if (config.logXuid) {
        formatted = formatted.replace("{xuid}", player.xuid);
    }
    if (config.logIp) {
        formatted = formatted.replace("{ip}", player.ip);
    }
    
    return formatted;
}

// ==================== 配置加载 ====================

// 加载配置文件，如果不存在则创建默认配置
function loadConfig() {
    try {
        const content = File.readFrom(CONFIG_PATH);
        
        if (content === null || content === "") {
            log("[ChatLogger] 配置文件不存在，正在创建默认配置...");
            saveDefaultConfig();
            config = JSON.parse(JSON.stringify(defaultConfig));
        } else {
            config = JSON.parse(content);
            
            // 补全缺失的配置项
            for (let key in defaultConfig) {
                if (config[key] === undefined) {
                    config[key] = defaultConfig[key];
                }
            }
        }
    } catch (e) {
        log("[ChatLogger] 加载配置文件失败: " + e);
        log("[ChatLogger] 使用默认配置");
        config = JSON.parse(JSON.stringify(defaultConfig));
    }
}

// 保存默认配置文件
function saveDefaultConfig() {
    try {
        // 使用文件对象方式写入，会自动创建目录
        const fi = new File(CONFIG_PATH, file.WriteMode);
        fi.writeSync(JSON.stringify(defaultConfig, null, 4));
        fi.close();
    } catch (e) {
        log("[ChatLogger] 创建配置文件失败: " + e);
    }
}

// ==================== 事件监听 ====================

// 处理玩家聊天事件
function onPlayerChat(player, msg) {
    if (!config.enable || !config.logChat) {
        return;
    }
    
    try {
        const logMessage = formatChatMessage(player, msg);
        writeLog(logMessage);
    } catch (e) {
        log("[ChatLogger] 处理聊天消息失败: " + e);
    }
}

// 处理玩家加入事件
function onPlayerJoin(player) {
    if (!config.enable || !config.logJoinLeave) {
        return;
    }
    
    try {
        const logMessage = formatJoinLeaveMessage(player, true);
        writeLog(logMessage);
    } catch (e) {
        log("[ChatLogger] 处理玩家加入事件失败: " + e);
    }
}

// 处理玩家离开事件
function onPlayerLeft(player) {
    if (!config.enable || !config.logJoinLeave) {
        return;
    }
    
    try {
        const logMessage = formatJoinLeaveMessage(player, false);
        writeLog(logMessage);
    } catch (e) {
        log("[ChatLogger] 处理玩家离开事件失败: " + e);
    }
}

// ==================== 命令注册 ====================

// 注册 /chatlog 命令，查看最近的聊天记录
function registerCommands() {
    mc.regPlayerCmd("chatlog", "查看最近的聊天记录", function(player, args) {
        if (!config.enable) {
            player.tell("§c聊天记录插件未启用");
            return;
        }
        
        try {
            updateLogFile();
            
            const content = File.readFrom(currentLogFile);
            if (content === null || content === "") {
                player.tell("§e今日暂无聊天记录");
                return;
            }
            
            const lines = content.split("\n");
            const validLines = lines.filter(function(line) {
                return line.trim() !== "";
            });
            
            // 获取最近的 20 条聊天记录
            const count = Math.min(20, validLines.length);
            const recentLines = validLines.slice(-count);
            
            // 输出聊天记录给玩家
            player.tell("§a===== 最近 " + count + " 条聊天记录 =====");
            for (let i = 0; i < recentLines.length; i++) {
                player.tell("§f" + recentLines[i]);
            }
            player.tell("§a==================================");
            
        } catch (e) {
            player.tell("§c读取聊天记录失败: " + e);
            log("[ChatLogger] 读取聊天记录失败: " + e);
        }
    }, 1);
}

// ==================== 插件入口 ====================

function init() {
    loadConfig();
    
    // 检查插件是否启用
    if (!config.enable) {
        log("[ChatLogger] 聊天记录插件已在配置中禁用");
        return;
    }
    
    // 初始化日志文件
    updateLogFile();
    ensureLogDir();
    
    // 注册事件监听
    mc.listen("onChat", onPlayerChat);
    mc.listen("onJoin", onPlayerJoin);
    mc.listen("onLeft", onPlayerLeft);
    
    registerCommands();
    log("ChatLogger for BDS of MCBE v0.1.0 by @Shisizhou0706")
}

init();
