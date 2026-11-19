# Superseded by scripts/build_ghl_bundle.js (kept as thin shim so Node stays sole generator)
import subprocess, sys
sys.exit(subprocess.call(['node', 'scripts/build_ghl_bundle.js']))

