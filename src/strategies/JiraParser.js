const fetch = require('node-fetch');

class JiraParser {
  static async fromStory({url, key, auth}) {
    const api = `${url}/rest/api/2/issue/${key}?fields=description`;
    console.log(`🔍 Fetching JIRA Story: ${key} from ${url}`);

    // This block correctly prepares the headers for the API call
    const headers = {
      'Accept':'application/json'
    };

    // Only add the Authorization header if auth details were actually provided
    if (auth && auth.user && auth.token) {
      console.log('  -> Using provided credentials for authentication.');
      headers['Authorization'] = 'Basic '+Buffer.from(`${auth.user}:${auth.token}`).toString('base64');
    } else {
      console.log('  -> Making anonymous request to public JIRA project.');
    }

    const res = await fetch(api, { headers });

    if (!res.ok) {
      throw new Error(`JIRA API request failed: ${res.status} ${res.statusText}`);
    }

    const json = await res.json();
    const desc = typeof json.fields.description === 'string'
      ? json.fields.description
      : (json.fields.description?.content||[]).map(c=>
          (c.content || []).map(cc=>cc.text || '').join('')).join('\n');

    console.log('  -> Parsing JIRA description...');
    const sents = desc.match(/[^.!?]+[.!?]+/g) || [desc];
    const fields = sents.map(s=>{
      const label=s.trim().replace(/[.!?]+$/,'');
      const name = label.replace(/\W+/g,'_').replace(/^(\d)/,'_$1');
      const type = /click|save|submit|add|remove|delete|next|continue|finish|sign|search|go|update/i.test(label)
        ? 'button':'text';
      return {label,name,type,required:false};
    }).filter(f => f.label); // Ensure we don't have empty fields

    return { fields, flowName: key };
  }
}

module.exports = JiraParser;