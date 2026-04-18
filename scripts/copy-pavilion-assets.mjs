/**
 * Copy ONE hero image per pavilion product into public/pavilions/.
 *
 * - Double Lin: F:\3dsfera Pavillon Data\Double Lin\Zhejiang Double Lin\<cn>\LL*\
 *   One image per LL* product folder. Prefer "<CODE>.jpg" if present, else
 *   the first jpg alphabetically.
 * - Youbo:      F:\3dsfera Pavillon Data\Santexnika\ZHEJIANG YOUBO REID Series\高清图\Reid\
 *   Flat folder; images are grouped by base code (REID-1000-M002, etc.).
 *   One hero per group is copied.
 *
 * Writes a manifest.json per pavilion enumerating products with their hero
 * image URL (public path).
 *
 * Run: node scripts/copy-pavilion-assets.mjs
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const SRC_DOUBLE_LIN_PARENT = 'F:/3dsfera Pavillon Data/Double Lin/Zhejiang Double Lin';
const SRC_YOUBO = 'F:/3dsfera Pavillon Data/Santexnika/ZHEJIANG YOUBO REID Series/高清图/Reid';
const DEST_ROOT = path.resolve(process.cwd(), 'public', 'pavilions');

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const asciiify = (name) => {
    const ext = path.extname(name).toLowerCase();
    const base = name.slice(0, name.length - ext.length);
    const ascii = base
        .normalize('NFKD')
        .replace(/[^\x20-\x7E]/g, '')
        .replace(/[()[\]]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[-_.]+|[-_.]+$/g, '')
        .toLowerCase();
    return (ascii || 'img') + ext;
};

const ensureDir = (dir) => fs.mkdir(dir, { recursive: true });

const copyFile = async (from, to) => {
    await ensureDir(path.dirname(to));
    await fs.copyFile(from, to);
};

const findDoubleLinParent = async () => {
    const entries = await fs.readdir(SRC_DOUBLE_LIN_PARENT, { withFileTypes: true });
    const subdir = entries.find((e) => e.isDirectory());
    if (!subdir) throw new Error('Double Lin inner directory not found');
    return path.join(SRC_DOUBLE_LIN_PARENT, subdir.name);
};

const copyDoubleLin = async () => {
    const innerDir = await findDoubleLinParent();
    const productDirs = (await fs.readdir(innerDir, { withFileTypes: true }))
        .filter((e) => e.isDirectory());

    const manifest = [];
    for (const productDir of productDirs) {
        // Some product folders store images directly; others nest them one level
        // deeper in a same-named subfolder (e.g. LL2062/LL2062/LL2062-1.jpg).
        let srcFolder = path.join(innerDir, productDir.name);
        let files = (await fs.readdir(srcFolder, { withFileTypes: true }))
            .filter((e) => e.isFile() && IMAGE_EXT.has(path.extname(e.name).toLowerCase()));

        if (files.length === 0) {
            const nestedEntries = await fs.readdir(srcFolder, { withFileTypes: true });
            const nestedDir = nestedEntries.find((e) => e.isDirectory());
            if (nestedDir) {
                srcFolder = path.join(srcFolder, nestedDir.name);
                files = (await fs.readdir(srcFolder, { withFileTypes: true }))
                    .filter((e) => e.isFile() && IMAGE_EXT.has(path.extname(e.name).toLowerCase()));
            }
        }
        if (files.length === 0) continue;

        const code = productDir.name.toUpperCase().trim();

        // Prefer the bare "<CODE>.jpg" cover. Otherwise fall back to first alphabetical.
        const preferred =
            files.find((f) => new RegExp(`^${code}\\.[a-z]+$`, 'i').test(f.name)) ??
            [...files].sort((a, b) => a.name.localeCompare(b.name))[0];

        const destName = `${code.toLowerCase()}.jpg`;
        const destPath = path.join(DEST_ROOT, 'doublelin', destName);
        await copyFile(path.join(srcFolder, preferred.name), destPath);

        manifest.push({
            id: code.toLowerCase(),
            code,
            hero: `/pavilions/doublelin/${destName}`,
        });
        console.log(`[doublelin] ${code} <- ${preferred.name}`);
    }

    manifest.sort((a, b) => a.code.localeCompare(b.code));
    await fs.writeFile(
        path.join(DEST_ROOT, 'doublelin', 'manifest.json'),
        JSON.stringify({ products: manifest }, null, 2)
    );
};

const copyYoubo = async () => {
    const files = (await fs.readdir(SRC_YOUBO, { withFileTypes: true }))
        .filter((e) => e.isFile() && IMAGE_EXT.has(path.extname(e.name).toLowerCase()));

    // Group by base product code; strip trailing variant suffixes.
    const groupKey = (rawName) => {
        const ext = path.extname(rawName);
        const base = rawName.slice(0, rawName.length - ext.length);
        return base
            .replace(/\s*\(\d+\)\s*$/, '')
            .replace(/\s+\d+\s*$/, '')
            .replace(/-\d+\s*$/, '')
            .trim();
    };

    const byGroup = new Map();
    for (const entry of files) {
        const key = groupKey(entry.name);
        if (!byGroup.has(key)) byGroup.set(key, []);
        byGroup.get(key).push(entry.name);
    }

    const manifest = [];
    for (const [groupName, rawFiles] of byGroup) {
        const hero = [...rawFiles].sort((a, b) => a.localeCompare(b))[0];
        const destBase = asciiify(groupName + '.jpg').replace(/\.jpg$/, '') + '.jpg';
        const destPath = path.join(DEST_ROOT, 'youbo', destBase);
        await copyFile(path.join(SRC_YOUBO, hero), destPath);

        const code = groupName.toUpperCase();
        manifest.push({
            id: destBase.replace(/\.jpg$/, ''),
            code,
            hero: `/pavilions/youbo/${destBase}`,
        });
        console.log(`[youbo] ${code} <- ${hero}`);
    }

    manifest.sort((a, b) => a.code.localeCompare(b.code));
    await fs.writeFile(
        path.join(DEST_ROOT, 'youbo', 'manifest.json'),
        JSON.stringify({ products: manifest }, null, 2)
    );
};

const main = async () => {
    await ensureDir(path.join(DEST_ROOT, 'doublelin'));
    await ensureDir(path.join(DEST_ROOT, 'youbo'));
    console.log('Copying Double Lin hero images...');
    await copyDoubleLin();
    console.log('Copying Youbo hero images...');
    await copyYoubo();
    console.log('Done.');
};

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
