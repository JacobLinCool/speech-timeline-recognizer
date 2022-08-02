const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const https = require("node:https");
const yauzl = require("yauzl");

const VERBOSE = true;
const URL = "https://alphacephei.com/vosk/models/vosk-model-cn-0.22.zip";
const MODEL_DIR = path.resolve(__dirname, "..", "model");

(async () => {
    if (fs.existsSync(path.resolve(MODEL_DIR, "DONE"))) {
        VERBOSE && console.log("Model already downloaded");
        return;
    }

    const zip = path.resolve(os.tmpdir(), "vosk-model-cn-0.22.zip");
    await download(URL, zip);
    VERBOSE && console.log("Downloaded model to", zip);

    await unzip(zip, MODEL_DIR);

    if (process.platform === "linux" && process.arch === "arm64") {
        VERBOSE && console.log("Detected arm64 linux, running fix");
        const fix_zip = path.resolve(os.tmpdir(), "vosk-linux-aarch64-0.3.43.zip");
        await download(
            "https://github.com/alphacep/vosk-api/releases/download/v0.3.43/vosk-linux-aarch64-0.3.43.zip",
            fix_zip,
        );
        VERBOSE && console.log("Downloaded fix to", fix_zip);
        await unzip(
            fix_zip,
            path.resolve(
                __dirname,
                "..",
                "node_modules/.pnpm/vosk@0.3.39/node_modules/vosk/lib/linux-x86_64",
            ),
        );
        fs.rmSync(fix_zip);
    }
})();

/**
 * Download the model and extract it to the correct location.
 * @param {string} url The url of the model to download
 * @param {string} to The path to save the model to
 * @param {number} redirect The number of redirects to follow
 * @returns {Promise<string>} The path to the model
 */
function download(url, to, redirect = 0) {
    if (redirect === 0) {
        VERBOSE && console.log(`Downloading ${url} to ${to}`);
    } else {
        VERBOSE && console.log(`Redirecting to ${url}`);
    }

    return new Promise((resolve, reject) => {
        if (!fs.existsSync(path.dirname(to))) {
            fs.mkdirSync(path.dirname(to), { recursive: true });
        }

        let total = 0,
            downloaded = 0,
            progress = "0";
        let done = true;
        const file = fs.createWriteStream(to);
        const request = https.get(url, (res) => {
            if (res.statusCode === 302 && res.headers.location !== undefined) {
                done = false;
                file.close();
                resolve(download(res.headers.location, to, redirect + 1));
                return;
            }
            total = parseFloat(res.headers["content-length"]);
            res.pipe(file);
            res.on("data", (chunk) => {
                downloaded += chunk.length;
                const new_progress = ((downloaded / total) * 100).toFixed(1);
                if (new_progress !== progress) {
                    progress = new_progress;
                    VERBOSE && console.log(`Downloading Model... ${progress}%`);
                }
            });
        });

        file.on("finish", () => {
            if (done) {
                resolve(to);
            }
        });

        request.on("error", (err) => {
            fs.unlink(to, () => reject(err));
        });

        file.on("error", (err) => {
            fs.unlink(to, () => reject(err));
        });

        request.end();
    });
}

function unzip(zip, dest) {
    const dir = path.basename(zip, ".zip");
    return new Promise((resolve, reject) => {
        yauzl.open(zip, { lazyEntries: true }, (err, zipfile) => {
            if (err) {
                reject(err);
            }
            zipfile.readEntry();
            zipfile
                .on("entry", (entry) => {
                    if (/\/$/.test(entry.fileName)) {
                        zipfile.readEntry();
                    } else {
                        zipfile.openReadStream(entry, (err, stream) => {
                            if (err) {
                                reject(err);
                            }
                            const f = path.resolve(dest, entry.fileName.replace(`${dir}/`, ""));
                            if (!fs.existsSync(path.dirname(f))) {
                                fs.mkdirSync(path.dirname(f), { recursive: true });
                                VERBOSE && console.log("Created directory", path.dirname(f));
                            }
                            stream.pipe(fs.createWriteStream(f));
                            stream
                                .on("end", () => {
                                    VERBOSE && console.log("Extracted", f);
                                    zipfile.readEntry();
                                })
                                .on("error", (err) => {
                                    reject(err);
                                });
                        });
                    }
                })
                .on("error", (err) => {
                    reject(err);
                })
                .on("end", () => {
                    VERBOSE && console.log("Extracted all files");
                    fs.writeFileSync(path.resolve(dest, "DONE"), "");
                })
                .on("close", () => {
                    resolve();
                });
        });
    });
}
