// src/strategies/ImageScanner.js (Upgraded with Debug Logging)
const Tesseract = require('tesseract.js');

class ImageScanner {
  static async fromScreenshots(imgs) {
    const img = imgs[0];
    console.log(`🔍 OCR’ing ${img}…`);
    let res;
    try { 
      res = await Tesseract.recognize(img); 
    } catch(e) { 
      console.warn(`⚠️ OCR error: ${e.message}`); 
      res = { data: { words: [] } }; 
    }
    const words = res.data.words || [];

    // This part groups words into lines of text
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

    // ===================================================================
    // NEW: Add logging to show exactly what the OCR detected
    // ===================================================================
    console.log('  -> OCR detected the following text lines:');
    if (labels.length > 0) {
      labels.forEach((line, index) => console.log(`     ${index + 1}: "${line}"`));
    } else {
      console.log('     (No usable text was detected on the image)');
    }
    console.log('  -> Inferring fields based on keywords...');
    // ===================================================================

    const fields = labels.map(lbl=>{
      const label=lbl.trim();
      const name = label.replace(/\W+/g,'_').replace(/^(\d)/,'_$1').toLowerCase();
      // This is the keyword matching logic
      const type = /click|submit|save|add|remove|delete|next|continue|finish|sign|search/i.test(label)
        ? 'button': 'text';
      return { label, name, type, required:false };
    });

    return { fields };
  }
}

module.exports = ImageScanner;