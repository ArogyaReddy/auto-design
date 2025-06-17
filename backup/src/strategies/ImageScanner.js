// src/strategies/ImageScanner.js
const Tesseract = require('tesseract.js');

class ImageScanner {
  static async fromScreenshots(imgs) {
    const img = imgs[0];
    console.log(`🔍 Using your custom OCR scanner on ${img}…`);
    let res;
    try { 
      res = await Tesseract.recognize(img); 
    } catch(e) { 
      console.warn(`⚠️ OCR error: ${e.message}`); 
      res={data:{words:[]}}; 
    }
    const words = res.data.words || [];

    const rows=[];
    words.forEach(w=>{
      const y=w.bbox.y0;
      let r=rows.find(r=>Math.abs(r.y-y)<10);
      if(!r){ r={y,words:[]}; rows.push(r); }
      r.words.push(w);
    });
    rows.sort((a,b)=>a.y-b.y);

    const labels = rows.map(r=>
      r.words.sort((a,b)=>a.bbox.x0-b.bbox.x0)
            .map(w=>w.text.trim()).join(' ')
    ).filter(t=>t);

    console.log('  -> OCR detected the following text lines:');
    if (labels.length > 0) {
      labels.forEach((line, index) => console.log(`     ${index + 1}: "${line}"`));
    } else {
      console.log('     (No usable text was detected on the image)');
    }
    console.log('  -> Inferring fields based on keywords...');
    
    const fields = labels.map(lbl=>{
      const label=lbl.trim();
      const name = label.replace(/\W+/g,'_').replace(/^(\d)/,'_$1').toLowerCase();
      // Added more common button keywords to the regex
      const type = /click|submit|save|add|remove|delete|next|continue|finish|sign|search|go|update/i.test(label)
        ? 'button': 'text';
      return { label, name, type, required:false };
    });

    return { fields };
  }
}

module.exports = ImageScanner;