import re

with open('index.html', 'r', encoding='utf-8') as f:
    index_html = f.read()

# Extract from <body> to </body>
body_match = re.search(r'<body[^>]*>([\s\S]*?)<\/body>', index_html)
if not body_match:
    print("Could not find body in index.html")
    exit(1)

body_content = body_match.group(1).strip()

# Change local asset links to GitHub raw CDN links so GHL embed works from anywhere
cdn_base = "https://raw.githack.com/notrealenginellc/Fariza-s-Territory/main/"

# Replace relative asset paths for CSS and JS
body_content = body_content.replace('src="assets/js/', f'src="{cdn_base}assets/js/')
body_content = body_content.replace('href="assets/css/', f'href="{cdn_base}assets/css/')

ghl_bundle = f"""<!-- ==============================================================================
     FARIZA'S TERRITORY — GHL CUSTOM HTML/CODE ELEMENT BUNDLE (53 SKUs)
     Full-Width Breakout Architecture for GoHighLevel Page & Funnel Builders
     Author: Fariza's Territory (Mirpur, Dhaka, Bangladesh)
     ============================================================================== -->

<style>
  /* GHL Section & Row Full-Width Breakout */
  .c-custom-code, .custom-code, .inner-container {{
    width: 100vw !important;
    position: relative !important;
    left: 50% !important;
    right: 50% !important;
    margin-left: -50vw !important;
    margin-right: -50vw !important;
    padding: 0 !important;
    box-sizing: border-box !important;
  }}
</style>

<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{cdn_base}assets/css/style.css">

<!-- Core External Libraries -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/motion@11.11.17/dist/motion.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/animejs@3.2.2/lib/anime.min.js"></script>

<!-- Boutique Core DOM Elements -->
{body_content}
"""

with open('ghl-bundle.html', 'w', encoding='utf-8') as f:
    f.write(ghl_bundle)

print("Generated full-featured ghl-bundle.html successfully!")
