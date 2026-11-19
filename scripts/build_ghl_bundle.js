/**
 * Generates ghl-bundle.html from index.html cleanly for GoHighLevel Custom HTML embed:
 * - Pinned @supabase/supabase-js@2.119.0
 * - Strict consent-gated analytics (delegates Meta Pixel initialization to config.js FT_ANALYTICS)
 * - No hardcoded placeholder 8801700000000 WhatsApp link (uses Messenger fallback unless configured)
 * - Includes shared commerce.js & threeCollectionParallax.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CDN_BASE = 'https://raw.githack.com/notrealenginellc/Fariza-s-Territory/main/';

function buildGhlBundle() {
  const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const bodyMatch = indexHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) {
    throw new Error('Could not extract <body> from index.html');
  }

  let bodyContent = bodyMatch[1].trim();
  // Strip local-relative trailing script tags from index.html so we emit clean CDN-qualified scripts once
  bodyContent = bodyContent
    .replace(/<!--\s*Application Core Scripts\s*-->[\s\S]*$/i, '')
    .replace(/<script\s+src="\/?assets\/js\/[\s\S]*$/i, '')
    .trim();

  bodyContent = bodyContent
    .replace(/(src|href)="\/?assets\/aistudio\//g, `$1="${CDN_BASE}public/assets/aistudio/`)
    .replace(/(src|href)="\/?assets\//g, `$1="${CDN_BASE}assets/`)
    .replace(/href="\/api\/catalog-feed\.csv"/g, 'href="https://farizasterritory.com/api/catalog-feed.csv"')
    .replace(/href="\/admin"/g, 'href="https://farizasterritory.com/admin"');

  // Ensure any fallback Messenger / WhatsApp floating button never embeds placeholder 8801700000000
  bodyContent = bodyContent.replace(
    /https:\/\/wa\.me\/8801700000000[^"]*/g,
    'https://m.me/farizasterritory143'
  );

  const bundle = `<!-- ==============================================================================
     FARIZA'S TERRITORY — GHL CUSTOM HTML/CODE ELEMENT BUNDLE
     Full-Width Breakout Architecture for GoHighLevel Page & Funnel Builders
     Consent-Gated Analytics · Pinned SDKs · Synced from index.html
     ============================================================================== -->

<style>
  /* GHL Section & Row Full-Width Breakout */
  .c-custom-code, .custom-code, .inner-container {
    width: 100vw !important;
    position: relative !important;
    left: 50% !important;
    right: 50% !important;
    margin-left: -50vw !important;
    margin-right: -50vw !important;
    padding: 0 !important;
    box-sizing: border-box !important;
  }
</style>

<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${CDN_BASE}assets/css/style.css">

<!-- Core External Libraries (Pinned Versions — Analytics remain strictly gated behind FT_ANALYTICS consent) -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/dist/umd/supabase.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/motion@11.11.17/dist/motion.js"></script>
<script src="https://cdn.jsdelivr.net/npm/animejs@3.2.2/lib/anime.min.js"></script>

<!-- Boutique Core DOM Elements -->
${bodyContent}

<!-- Application Core Scripts (Synced with Express index.html) -->
<script src="${CDN_BASE}assets/js/commerce.js"></script>
<script src="${CDN_BASE}assets/js/config.js"></script>
<script src="${CDN_BASE}assets/js/supabaseClient.js"></script>
<script src="${CDN_BASE}assets/js/catalogData.js"></script>
<script src="${CDN_BASE}assets/js/threeHero.js"></script>
<script src="${CDN_BASE}assets/js/threeCollectionParallax.js"></script>
<script src="${CDN_BASE}assets/js/animePolish.js"></script>
<script src="${CDN_BASE}assets/js/app.js"></script>
`;

  const outPath = path.join(ROOT, 'ghl-bundle.html');
  fs.writeFileSync(outPath, bundle, 'utf8');
  console.log('Generated consent-gated ghl-bundle.html cleanly.');
}

buildGhlBundle();
