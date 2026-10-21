// Deterministic crop of the user-supplied 3258 × 2068 screenshot.
// Usage: NODE_PATH=<external sharp modules> node crop-public-rows.cjs /private/input.png
// Never add the original screenshot to the repository.
const sharp = require('sharp');
const path = require('node:path');
const input = process.argv[2];
const output = path.resolve(__dirname, '../images/05-real-public-tasks.png');
if (!input) throw Error('Supply the original screenshot outside the repository');
(async () => {
  const meta = await sharp(input).metadata();
  if (meta.width !== 3258 || meta.height !== 2068) throw Error('Crop is reviewed only for the original 3258 × 2068 input');
  const sx = meta.width / 1966, sy = meta.height / 1248;
  const x = n => Math.round(n * sx), y = n => Math.round(n * sy);
  const width = x(1943) - x(368), pad = 32;
  const crop = async (left, top, right, bottom) => sharp(input).extract({left:x(left),top:y(top),width:x(right)-x(left),height:y(bottom)-y(top)}).png().toBuffer();
  const parts = [];
  // Keep the original title and controls; exclude the personal mascot and counts.
  parts.push({input:await crop(368,0,1268,65),left:pad,top:pad});
  parts.push({input:await crop(1580,0,1943,65),left:pad+x(1580)-x(368),top:pad});
  let top = pad + y(80);
  // Original table header, then ONLY public vendor rows, in original order:
  // Docker × 2, Chrome Keystone × 2, Office, Java, Razer, Chrome Updater.
  for (const [start,end] of [[127,166],[309,505],[554,701],[1044,1093]]) {
    parts.push({input:await crop(368,start,1943,end),left:pad,top});
    top += y(end)-y(start);
  }
  await sharp({create:{width:width+pad*2,height:top+pad,channels:3,background:'#fff'}})
    .composite(parts).png().toFile(output);
  console.log(output);
})();
