import fs from "node:fs";
import path from "node:path";
import { program } from "commander";
import { reconize } from "./reconize.js";

const package_json = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"),
);

program.version(`${package_json.name} ${package_json.version}`);

program
    .argument("<wav...>", "Path to the wav file")
    .option("-e, --expect <expected result>", "The expected result")
    .option("-o, --output <path>", "The output path")
    .option("-f, --force", "Force to overwrite the output file if it exists")
    .option("-p, --pretty", "Pretty print the result with indentation")
    .option("-s, --silent", "Silent mode")
    .action(async (wav, { expect, output, force, pretty, silent }: Options) => {
        if (output) {
            output = path.resolve(output);
            if (fs.existsSync(output) && !force) {
                silent || console.error(`${output} already exists.`);
                process.exit(1);
            }
        }

        const results: Record<string, unknown> = {};
        for (const w of wav) {
            results[w] = await reconize(path.resolve(w), expect, silent);
        }

        console.log(JSON.stringify(results, null, pretty ? 4 : 0));

        if (output) {
            fs.writeFileSync(output, JSON.stringify(results, null, pretty ? 4 : 0));
            silent || console.log(`Results is written to ${output}`);
        } else {
            console.log(JSON.stringify(results, null, pretty ? 4 : 0));
        }
    });

program.parse();

interface Options {
    expect?: string;
    output?: string;
    force?: boolean;
    pretty?: boolean;
    silent?: boolean;
}
