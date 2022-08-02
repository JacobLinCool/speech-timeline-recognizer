import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import vosk from "vosk";
import wav from "wav";
import Fuse from "fuse.js";
import { OpenCC } from "opencc";
import { MODEL_DIR } from "./constants.js";
import { convert } from "./convert.js";

let loaded = false;
let model: any;
const converter = new OpenCC("s2t.json");

export function reconize(
    file: string,
    expect?: string,
    silent?: boolean,
): Promise<{
    text: string;
    words: { start: number; end: number; value: string }[];
}> {
    if (loaded === false) {
        silent || console.log("Loading model ...");
        vosk.setLogLevel(-1);
        model = new vosk.Model(MODEL_DIR);
        loaded = true;
        silent || console.log("Model loaded.");
    }

    file = convert(path.resolve(file));

    return new Promise((resolve) => {
        silent || console.log(`Reconizing ${file} ...`);
        const stream = fs.createReadStream(file, { highWaterMark: 4096 });

        const reader = new wav.Reader();
        const readable = new Readable().wrap(reader);
        reader.on("format", async ({ audioFormat, sampleRate, channels }) => {
            if (audioFormat != 1 || channels != 1) {
                throw new Error("Audio file must be WAV with mono PCM.");
            }

            const rec = new vosk.Recognizer({ model, sampleRate });
            rec.setMaxAlternatives(3);
            rec.setWords(true);
            rec.setPartialWords(true);

            const results: {
                text: string;
                result: { start: number; end: number; word: string }[];
            }[] = [];
            for await (const data of readable) {
                const end_of_speech = rec.acceptWaveform(data);
                if (end_of_speech) {
                    const result = await extract(rec.result(), expect);
                    results.push(result);
                    if (expect) {
                        expect = expect.slice(result.text.length);
                    }
                }
            }

            results.push(await extract(rec.finalResult(rec), expect));

            const final = {
                text: results.map((r) => r.text).join(""),
                words: results
                    .map((r) =>
                        r.result.map((w) => ({ start: w.start, end: w.end, value: w.word })),
                    )
                    .flat(),
            };

            silent || console.log(`Reconized ${file}`);
            stream.close(() => {
                resolve(final);
                fs.rmSync(file);
            });

            rec.free();
        });

        stream.pipe(reader);
    });
}

async function extract(result: any, expect?: string) {
    const { alternatives } = result;

    for (let i = 0; i < alternatives.length; i++) {
        alternatives[i].text = await converter.convertPromise(
            alternatives[i].text.replace(/\s+/g, ""),
        );
        for (let j = 0; j < alternatives[i].result.length; j++) {
            alternatives[i].result[j].word = await converter.convertPromise(
                alternatives[i].result[j].word,
            );
        }
        delete alternatives[i].confidence;
    }

    if (expect) {
        const fuse = new Fuse(alternatives, { keys: ["text"], threshold: 1 });
        const result = fuse.search(expect);
        if (result.length > 0) {
            return result.map((r) => r.item)[0];
        } else {
            return { result: [], text: "" };
        }
    } else {
        return alternatives[0];
    }
}
