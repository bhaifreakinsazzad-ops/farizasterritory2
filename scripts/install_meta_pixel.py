import re

META_PIXEL_SNIPPET = """<!-- Meta Pixel Code -->
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
<!-- End Meta Pixel Code -->"""

# 1. Update index.html
with open('index.html', 'r', encoding='utf-8') as f:
    idx = f.read()

if '1657670575734647' not in idx:
    idx = idx.replace('</head>', f'  {META_PIXEL_SNIPPET}\n</head>', 1)
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(idx)
    print("Injected Meta Pixel into index.html")
else:
    print("Meta Pixel already in index.html")

# 2. Update admin.html
with open('admin.html', 'r', encoding='utf-8') as f:
    adm = f.read()

if '1657670575734647' not in adm:
    adm = adm.replace('</head>', f'  {META_PIXEL_SNIPPET}\n</head>', 1)
    # Also set default value for input if empty
    adm = adm.replace(
        "const savedPixel = localStorage.getItem('ft_meta_pixel_id') || '';",
        "const savedPixel = localStorage.getItem('ft_meta_pixel_id') || (window.FT_CONFIG && window.FT_CONFIG.marketing ? window.FT_CONFIG.marketing.metaPixelId : '') || '1657670575734647';"
    )
    with open('admin.html', 'w', encoding='utf-8') as f:
        f.write(adm)
    print("Injected Meta Pixel into admin.html")
else:
    print("Meta Pixel already in admin.html")

# 3. Update build_ghl_bundle.py so ghl-bundle.html gets the snippet
with open('scripts/build_ghl_bundle.py', 'r', encoding='utf-8') as f:
    ghl_script = f.read()

if '1657670575734647' not in ghl_script:
    ghl_script = ghl_script.replace(
        '<!-- Core External Libraries -->',
        f'{META_PIXEL_SNIPPET}\n\n<!-- Core External Libraries -->'
    )
    with open('scripts/build_ghl_bundle.py', 'w', encoding='utf-8') as f:
        f.write(ghl_script)
    print("Updated scripts/build_ghl_bundle.py")

# 4. Regenerate ghl-bundle.html
import subprocess
subprocess.run(['py', 'scripts/build_ghl_bundle.py'], check=True)
print("Regenerated ghl-bundle.html with Meta Pixel")
