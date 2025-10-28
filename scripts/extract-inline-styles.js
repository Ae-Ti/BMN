const fs = require('fs');
const path = require('path');

// Simple conservative extractor: finds style={{ ... }} where all values are literals
// and className is absent or a string literal. Skips dynamic expressions.

const SRC = path.resolve(__dirname, '../BMN/src/main/reactfront/src');
const INDEX_CSS = path.resolve(__dirname, '../BMN/src/main/reactfront/src/index.css');

let classCounter = 1;
const report = [];

function kebab(s){
  return s.replace(/([A-Z])/g, '-$1').toLowerCase();
}

function parseStyleObject(str){
  // naive split by commas, but avoid commas inside strings
  const parts = [];
  let cur = '';
  let inSingle=false, inDouble=false;
  for (let i=0;i<str.length;i++){
    const ch = str[i];
    if (ch==='"' && !inSingle) inDouble=!inDouble;
    if (ch==="'" && !inDouble) inSingle=!inSingle;
    if (ch===',' && !inSingle && !inDouble){
      parts.push(cur.trim()); cur='';
    } else cur+=ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  const obj={};
  for (const p of parts){
    const m = p.match(/^([\w$]+)\s*:\s*(.+)$/s);
    if(!m) return null;
    const key = m[1];
    let val = m[2].trim();
    // remove trailing commas
    if (val.endsWith(',')) val=val.slice(0,-1).trim();
    // check if literal string
    if (/^['\"]([^'\"]*)['\"]$/.test(val)){
      val = val.slice(1,-1);
      obj[key]= {type:'string', value: val};
    } else if (/^[0-9]+(\.[0-9]+)?$/.test(val)){
      obj[key]= {type:'number', value: val};
    } else if (/^(true|false)$/.test(val)){
      obj[key]={type:'bool', value: val};
    } else {
      return null; // dynamic
    }
  }
  return obj;
}

function transformFile(file){
  let src = fs.readFileSync(file,'utf8');
  let changed=false;
  // regex for style={{...}}
  const styleRegex = /style=\{\{([\s\S]*?)\}\}\s*/g;
  const classNameRegex = /className\s*=\s*(["'])(.*?)\1/;

  let m;
  const inserts = [];
  while((m = styleRegex.exec(src))!==null){
    const full = m[0];
    const body = m[1].trim();
    const start = m.index;
    // find surrounding area for className check: look back 200 chars
    const lookback = src.slice(Math.max(0,start-200), start+full.length+200);
    const classMatch = lookback.match(classNameRegex);
    // only allow if className absent or string literal in same tag
    // check that className occurs after tag start and before style occurrence
    // naive approach: if classMatch exists and its index in lookback is < start pos in lookback, assume className present before style
    let hasClassBefore=false, existingClass='';
    if (classMatch){
      const idx = lookback.indexOf(classMatch[0]);
      const styleIdx = lookback.indexOf(full);
      if (idx!==-1 && idx < styleIdx){
        hasClassBefore=true;
        existingClass = classMatch[2];
      }
    }
    // don't handle case where className is expression (className={...})
    const classExprRegex = /className\s*=\s*\{/;
    if (classExprRegex.test(lookback)) continue;

    const parsed = parseStyleObject(body);
    if (!parsed) continue; // skip dynamic or unparsable

    // build CSS rule
    const declarations = [];
    for (const [k,v] of Object.entries(parsed)){
      const prop = kebab(k);
      let val = v.value;
      if (v.type==='number'){
        if (val === '0') val = '0'; else val = val + 'px';
      }
      declarations.push(`  ${prop}: ${val};`);
    }
    // try to reuse existing class if identical exists in index.css
    const cssText = declarations.join('\n');
    const indexCss = fs.readFileSync(INDEX_CSS,'utf8');
    let existingClassName=null;
    const classRegex = new RegExp(`\\.(sx-[0-9a-f]+)\\s*\\{([\\s\\S]*?)\\}`, 'g');
    let gm;
    while((gm = classRegex.exec(indexCss))!==null){
      if (gm[2].trim() === cssText.trim()){
        existingClassName = gm[1]; break;
      }
    }
    const className = existingClassName || `sx-${(classCounter++).toString(36)}`;
    if (!existingClassName){
      // append to index.css
      fs.appendFileSync(INDEX_CSS, `\n/* extracted from ${path.relative(process.cwd(), file)} */\n.${className} {\n${cssText}\n}\n`);
    }

    // perform replacement: remove the style attribute and add/merge className
    // we need to find the exact location in src to replace only this occurrence
    const before = src.slice(0, m.index);
    const after = src.slice(m.index + full.length);
    if (hasClassBefore){
      // replace the earlier className value to append
      // find the last occurrence of className in before
      const rev = before.lastIndexOf('className');
      if (rev!==-1){
        // find quote positions
        const sub = before.slice(rev);
        const cm = sub.match(classNameRegex);
        if (cm){
          const quote = cm[1];
          const old = cm[2];
          const newClass = (old + ' ' + className).trim();
          const replacedSub = sub.replace(classNameRegex, `className=${quote}${newClass}${quote}`);
          src = before.slice(0,rev) + replacedSub + after;
          changed=true;
          report.push({file, extracted: declarations, className, note: 'appended to existing className'});
          // adjust regex lastIndex to continue after this point
          styleRegex.lastIndex = rev + replacedSub.length;
          continue;
        }
      }
      // fallback: skip
      continue;
    } else {
      // insert className attribute into the tag start. Find the tag start before m.index
      // find '<' from m.index backwards
      const tagStart = src.lastIndexOf('<', m.index);
      if (tagStart===-1) continue;
      // find the end of tag name
      const tagSnippet = src.slice(tagStart, m.index+full.length);
      // insert className into tag after tag name
      const tagNameMatch = tagSnippet.match(/^<\s*([a-zA-Z0-9]+)/);
      if (!tagNameMatch) continue;
      const tagName = tagNameMatch[1];
      // place insertion after tagName
      const insertPos = tagStart + tagNameMatch[0].length;
      src = src.slice(0, insertPos) + ` className="${className}"` + src.slice(insertPos);
      // now remove the style occurrence: find the style occurrence again
      src = src.replace(full, ' ');
      changed=true;
      report.push({file, extracted: declarations, className, note: 'created new className'});
      // reset regex lastIndex
      styleRegex.lastIndex = insertPos + className.length + 20;
      continue;
    }
  }

  if (changed) fs.writeFileSync(file, src, 'utf8');
}

function walk(dir){
  const items = fs.readdirSync(dir);
  for(const it of items){
    const full = path.join(dir,it);
    const stat = fs.statSync(full);
    if (stat.isDirectory()){ walk(full); }
    else if (/\.(jsx|js|tsx|ts)$/.test(it)) transformFile(full);
  }
}

console.log('Starting extraction...');
walk(SRC);
console.log('Done. Summary:');
for(const r of report){
  console.log('- ', path.relative(process.cwd(), r.file), ' => class:', r.className, ' note:', r.note);
}
console.log('\nWrote', report.length, 'classes to', INDEX_CSS);

if (report.length===0) console.log('No static inline styles found or nothing was transformed.');

