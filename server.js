const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", true);
app.use(cors({ origin: true }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

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

function getValidKeys() {
    const rawKeys = process.env.LICENSE_KEYS || process.env.LICENSE_KEY || "ORDYCOPY";
    return rawKeys
        .split(/[\n,;]+/)
        .map((key) => key.trim())
        .filter(Boolean);
}

function looksLikeSessionSecret(value) {
    return /ROBLOSECURITY|WARNING:-DO-NOT-SHARE|Sharing-this-will-allow-someone-to-log-in/i.test(value);
}

function isValidLicenseKey(value) {
    if (!value || typeof value !== "string") return false;
    const key = value.trim();
    if (key.length < 3 || key.length > 160) return false;
    if (looksLikeSessionSecret(key)) return false;
    return getValidKeys().includes(key);
}

function extractGameId(body) {
    const candidates = [body.projectName, body.gameId, body.gameUrl, body.url]
        .filter((value) => typeof value === "string")
        .map((value) => value.trim());

    for (const value of candidates) {
        if (/^\d+$/.test(value)) return value;

        const match = value.match(/roblox\.com\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?games\/(\d+)/i);
        if (match) return match[1];
    }

    return "000";
}

function buildDownloadLink(gameId) {
    const fileId = fileMap[gameId] || fileMap["000"];
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

function handleVerify(req, res) {
    const licenseKey = req.body.licenseKey;

    if (!isValidLicenseKey(licenseKey)) {
        return res.json({
            success: false,
            error: "INVALID_LICENSE"
        });
    }

    const gameId = extractGameId(req.body);

    return res.json({
        success: true,
        gameId,
        download: buildDownloadLink(gameId)
    });
}

app.get("/health", (req, res) => {
    res.json({
        ok: true,
        service: "ordycopy-verify-server",
        time: new Date().toISOString()
    });
});

app.get("/api/health", (req, res) => {
    res.json({ ok: true });
});

app.post("/", handleVerify);
app.post("/verify", handleVerify);
app.post("/api/verify", handleVerify);

app.use(express.static(__dirname));

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
    console.log(`OrdyCopy verify server running on port ${PORT}`);
});
