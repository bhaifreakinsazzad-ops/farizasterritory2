import re

with open('index.html', 'r', encoding='utf-8') as f:
    index_html = f.read()

body_match = re.search(r'<body[^>]*>([\s\S]*?)<\/body>', index_html)
if not body_match:
    print("Could not find body in index.html")
    exit(1)

body_content = body_match.group(1).strip()
cdn_base = "https://raw.githack.com/notrealenginellc/Fariza-s-Territory/main/"

body_content = body_content.replace('src="assets/', f'src="{cdn_base}assets/')
body_content = body_content.replace('href="assets/', f'href="{cdn_base}assets/')

template = """<!-- ==============================================================================
     FARIZA'S TERRITORY — GHL CUSTOM HTML/CODE ELEMENT BUNDLE (53 SKUs)
     Full-Width Breakout Architecture for GoHighLevel Page & Funnel Builders
     Author: Fariza's Territory (Mirpur, Dhaka, Bangladesh)
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
<link rel="stylesheet" href="__CDN__assets/css/style.css">

<!-- Meta Pixel Code with Deduplication ID -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
var __ftPixelId = '1657670575734647';
try { __ftPixelId = localStorage.getItem('ft_meta_pixel_id') || __ftPixelId; } catch (e) {}
fbq('init', __ftPixelId);
window.__FT_INITIAL_PAGEVIEW_ID = 'pv_init_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
fbq('track', 'PageView', {}, { eventID: window.__FT_INITIAL_PAGEVIEW_ID });
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=1657670575734647&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->

<!-- Core External Libraries -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/motion@11.11.17/dist/motion.js"></script>
<script src="https://cdn.jsdelivr.net/npm/animejs@3.2.2/lib/anime.min.js"></script>

<!-- Boutique Core DOM Elements -->
__BODY__
"""

ghl_bundle = template.replace('__CDN__', cdn_base).replace('__BODY__', body_content)

with open('ghl-bundle.html', 'w', encoding='utf-8') as f:
    f.write(ghl_bundle)

print("Generated full-featured ghl-bundle.html with Meta Pixel successfully!")
