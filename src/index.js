// This example Compute@Edge app modifies HTML returned from https://example.com at the edge
import * as cheerio from 'cheerio';

// Load files into the constants
const DECODER = new TextDecoder('utf-8');
const FONT_LINKS = DECODER.decode(fastly.includeBytes('src/font.html'));
const CSS = DECODER.decode(fastly.includeBytes('src/style.css'));

async function handleRequest(event) {
  let req = event.request;
  // Add the host header so that you don't need to specify it in a request when testing locally
  req.headers.set('host', 'example.com');
  // Request an uncompressed response
  req.headers.delete('accept-encoding');

  let beresp = await fetch(req, {
    backend: 'example_com',
  });

  if (beresp.status == 200) {
    console.log('Returning a modified version of https://example.com');
    return rewriteHtml(beresp);
  }
  // For responses other than 200, just return the origin response as is
  return beresp;
}

async function rewriteHtml(beresp) {
  let body = await beresp.text();
  const $ = cheerio.load(body);

  // Insert Google Fonts link tags
  $('meta[name]').after(FONT_LINKS);

  // Replace CSS in the style tags
  $('style').text(CSS);

  // Modify inner contents of h1 tags - enclose each word with span tags.
  // "<h1>Example Domain</h1>" -> "<h1><span>Example</span><span>Domain</span></h1>"
  const innerText = $('h1').text()
    .split(' ')
    .map(w => `<span>${w}</span>`)
    .join('');
  $('h1').html(innerText);

  return new Response($.html(), {
    status: beresp.status,
    headers: beresp.headers,
  })
}

addEventListener('fetch', event => event.respondWith(handleRequest(event)));