import { readFile } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

export async function GET() {
    const sdkPath = path.join(
        process.cwd(),
        'node_modules',
        'streampixelsdk',
        'dist',
        'streampixel-sdk.js'
    );

    let body = await readFile(sdkPath, 'utf8');

    // The SDK has a module-level singleton guard (`_sdkInitialized`) that
    // prevents `StreamPixelApplication` from being called more than once.
    // In React (especially Strict Mode), effects re-run after cleanup, so
    // the second call returns `{}` and the stream never connects.
    //
    // We patch the served SDK to expose a reset helper on `globalThis` so
    // our teardown can clear the flag before re-initialising.
    body = body.replace(
        'var _sdkInitialized = false;',
        'var _sdkInitialized = false;\n' +
        'globalThis.__resetStreamPixelSdk = function() { _sdkInitialized = false; };'
    );

    return new Response(body, {
        headers: {
            'Content-Type': 'text/javascript; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
        },
    });
}
