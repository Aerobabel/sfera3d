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

    const body = await readFile(sdkPath, 'utf8');

    return new Response(body, {
        headers: {
            'Content-Type': 'text/javascript; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
        },
    });
}
