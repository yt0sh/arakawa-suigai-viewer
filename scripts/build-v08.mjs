import {cpSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const src=path.join(root,'public');
const out=path.join(root,'dist');

rmSync(out,{recursive:true,force:true});
mkdirSync(out,{recursive:true});
cpSync(src,out,{recursive:true});

// Keep the broader rainfall view used by v0.8.
const appPath=path.join(out,'app.js');
let app=readFileSync(appPath,'utf8');
app=app.replace("radarZoom:12","radarZoom:8");
writeFileSync(appPath,app);

console.log('Built v0.8 Nippori-Arakawa flood information viewer for production.');
