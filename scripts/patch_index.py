import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update hint
html = re.sub(
    r'18 pieces · type to filter · ↑↓ to browse · Enter to open',
    '53 pieces across 8 collections · type to filter by name or SKU · ↑↓ to browse · Enter to open',
    html
)

# 2. Update footer links
old_footer = """          <li><a href="#/shop">Shop all 18 pieces</a></li>
          <li><a href="#/collections">Five collections</a></li>"""

new_footer = """          <li><a href="#/shop">Shop all 53 pieces</a></li>
          <li><a href="#/fashion">Fashion (18 pieces)</a></li>
          <li><a href="#/accessories">Artisan Accessories (35 pieces)</a></li>
          <li><a href="#/collections">Eight collections</a></li>"""

html = html.replace(old_footer.replace('\r\n', '\n'), new_footer)
html = html.replace(old_footer.replace('\n', '\r\n'), new_footer.replace('\n', '\r\n'))

# 3. Add threeHero and animePolish scripts
if 'assets/js/threeHero.js' not in html:
    html = html.replace(
        '<script src="assets/js/catalogData.js"></script>',
        '<script src="assets/js/catalogData.js"></script>\n<script src="assets/js/threeHero.js"></script>\n<script src="assets/js/animePolish.js"></script>'
    )

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('Patched index.html successfully')
