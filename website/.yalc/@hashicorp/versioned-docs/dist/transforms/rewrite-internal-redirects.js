"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformRewriteInternalRedirects = exports.checkAndApplyRedirect = exports.loadRedirects = void 0;
const remark_1 = __importDefault(require("remark"));
const remark_mdx_1 = __importDefault(require("remark-mdx"));
const unist_util_flatmap_1 = __importDefault(require("unist-util-flatmap"));
const unist_util_is_1 = __importDefault(require("unist-util-is"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const url_1 = require("url");
const pathToRegexp = __importStar(require("path-to-regexp"));
const netlify_to_nextjs_redirect_exporter_1 = require("@hashicorp/netlify-to-nextjs-redirect-exporter");
const util_1 = require("../util");
function requireUncached(module) {
    delete require.cache[require.resolve(module)];
    return eval('require')(module);
}
/**
 * Loads redirects from the file-system and "caches" them in memory.
 */
let cachedRedirects = {};
const loadRedirects = (cwd, version) => {
    // Return the cached redirects if they are already present
    if (cachedRedirects[version]?.length > 0) {
        return cachedRedirects[version];
    }
    let redirectsSource = [];
    // Attempt to load from redirects.js or redirects.next.js
    try {
        redirectsSource = requireUncached(path_1.default.join(cwd, 'redirects.js'));
    }
    catch { }
    try {
        if (redirectsSource.length === 0) {
            redirectsSource = requireUncached(path_1.default.join(cwd, 'redirects.next.js'));
        }
    }
    catch { }
    // If neither are found, check for the netlify redirects file and parse that
    try {
        const netlifyRedirectsPath = path_1.default.join(cwd, '_redirects');
        if (redirectsSource.length === 0 && fs_1.default.existsSync(netlifyRedirectsPath)) {
            const netlifyRedirects = fs_1.default.readFileSync(netlifyRedirectsPath, {
                encoding: 'utf-8',
            });
            const { redirects } = netlify_to_nextjs_redirect_exporter_1.parseNetlifyRedirects(netlifyRedirects);
            redirectsSource = redirects;
        }
    }
    catch { }
    if (redirectsSource.length === 0)
        return [];
    cachedRedirects[version] = redirectsSource.map((redirect) => {
        const isExternalDestination = !redirect.destination.startsWith('/');
        const doesDestinationHaveTokens = redirect.destination.includes('/:');
        let destination = redirect.destination;
        // External URLs can't be passed to pathToRegexp directly, so we have to parse the URL
        if (isExternalDestination) {
            if (doesDestinationHaveTokens) {
                destination = (params) => {
                    const destUrl = new url_1.URL(redirect.destination);
                    const destCompile = pathToRegexp.compile(destUrl.pathname);
                    const newPath = destCompile(params);
                    destUrl.pathname = newPath;
                    return destUrl.href;
                };
            }
        }
        else {
            destination = pathToRegexp.compile(redirect.destination);
        }
        return {
            source: pathToRegexp.match(redirect.source),
            destination,
        };
    });
    return cachedRedirects[version];
};
exports.loadRedirects = loadRedirects;
/**
 * Checks for a matching redirect with the given URL and, if found,
 * applies the matching redirect.
 *
 * @param url URL to check for redirects with and apply to
 * @param redirects List of redirects which will be tested against the URL
 * @returns The redirected URL
 */
const checkAndApplyRedirect = (url, redirects) => {
    let matchedResult = false;
    let matchedRedirect;
    redirects.some((redirect) => {
        matchedResult = redirect.source(url);
        if (matchedResult) {
            matchedRedirect = redirect;
            return true;
        }
    });
    if (matchedRedirect && matchedResult) {
        // If the matched destination has no tokens, we can just return it
        if (typeof matchedRedirect.destination === 'string')
            return matchedRedirect.destination;
        // TS is not cooperating, so having to use typecasting here
        return matchedRedirect.destination(typeof matchedResult !== 'boolean'
            ? matchedResult.params
            : {});
    }
    return false;
};
exports.checkAndApplyRedirect = checkAndApplyRedirect;
/**
 * Remark plugin which accepts a list of redirects and applies them to any matching links
 */
const rewriteInternalRedirectsPlugin = ({ product, redirects }) => {
    return function transformer(tree) {
        return unist_util_flatmap_1.default(tree, (node) => {
            if (!unist_util_is_1.default(node, 'link') && !unist_util_is_1.default(node, 'definition'))
                return [node];
            // Only check internal links
            if (node.url &&
                !node.url.startsWith('#') &&
                util_1.isInternalUrl(node.url, product)) {
                const urlToRedirect = node.url.startsWith('/')
                    ? node.url
                    : new url_1.URL(node.url).pathname;
                const redirectUrl = exports.checkAndApplyRedirect(urlToRedirect, redirects);
                if (redirectUrl)
                    node.url = redirectUrl;
            }
            return [node];
        });
    };
};
/**
 * Loads the redirects defined in redirects.js or redirects.next.js and attempts to apply them to any
 * matching links in the document.
 */
exports.transformRewriteInternalRedirects = {
    id: 'rewrite-internal-redirects',
    async transformer(document, ctx) {
        const contents = await remark_1.default()
            .use(remark_mdx_1.default)
            .use(rewriteInternalRedirectsPlugin, {
            product: document.product,
            redirects: exports.loadRedirects(ctx.cwd, document.version),
        })
            .process(document.markdownSource);
        document.markdownSource = String(contents);
        return document;
    },
};
