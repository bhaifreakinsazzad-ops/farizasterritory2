import re

with open('index.html', 'r', encoding='utf-8') as f:
    index_html = f.read()

body_match = re.search(r'<body[^>]*>([\s\S]*?)<\/body>', index_html)
if not body_match:
    print("Could not find body in index.html")
    exit(1)

body_content = body_match.group(1).strip()
cdn_base = "https://raw.githack.com/notrealenginellc/Fariza-s-Territory/main/"

body_content = body_content.replace('src="assets/js/', f'src="{cdn_base}assets/js/')
body_content = body_content.replace('href="assets/css/', f'href="{cdn_base}assets/css/')

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

<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '1657670575734647');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=1657670575734647&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->

<!-- Core External Libraries -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/motion@11.11.17/dist/motion.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/animejs@3.2.2/lib/anime.min.js"></script>

<!-- Boutique Core DOM Elements -->
__BODY__
"""

ghl_bundle = template.replace('__CDN__', cdn_base).replace('__BODY__', body_content)

with open('ghl-bundle.html', 'w', encoding='utf-8') as f:
    f.write(ghl_bundle)

print("Generated full-featured ghl-bundle.html with Meta Pixel successfully!")
