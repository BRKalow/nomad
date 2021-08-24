"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const server_1 = require("../server");
// TODO: remove after done with local testing
require('dotenv').config({ path: path_1.default.join(process.cwd(), '.env.local') });
async function main() {
    const [, , product] = process.argv;
    const metadata = await server_1.loadVersionMetadata(product);
    console.log(JSON.stringify(metadata, null, 2));
}
main();
