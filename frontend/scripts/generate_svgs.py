import cv2
import numpy as np
import base64
import os

# Read cropped images
with open('frontend/public/writnexa-icon.png', 'rb') as f:
    icon_b64 = base64.b64encode(f.read()).decode('utf-8')

with open('frontend/public/writnexa-logo-transparent.png', 'rb') as f:
    full_b64 = base64.b64encode(f.read()).decode('utf-8')

# 1. 1:1 Aspect Ratio Icon (Square 512x512)
icon_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <image href="data:image/png;base64,{icon_b64}" x="26" y="125" width="460" height="262" />
</svg>"""

with open('frontend/public/writnexa-icon.svg', 'w', encoding='utf-8') as f:
    f.write(icon_svg)

with open('frontend/public/favicon.svg', 'w', encoding='utf-8') as f:
    f.write(icon_svg)

os.makedirs('frontend/src/app', exist_ok=True)
with open('frontend/src/app/icon.svg', 'w', encoding='utf-8') as f:
    f.write(icon_svg)

# 2. Horizontal Aspect Ratio Full Logo (~6:1 or 3.6:1, 1565 x 262)
full_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1565 262" width="100%" height="100%">
  <image href="data:image/png;base64,{full_b64}" x="0" y="0" width="1565" height="262" />
</svg>"""

with open('frontend/public/writnexa-logo.svg', 'w', encoding='utf-8') as f:
    f.write(full_svg)

# 3. Square App Icon with Dark Rounded Card Background (for Apple Touch Icon & PWA)
app_icon_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <rect width="512" height="512" rx="112" fill="#090d1a" />
  <rect width="508" height="508" x="2" y="2" rx="110" fill="none" stroke="#1e293b" stroke-width="4" />
  <image href="data:image/png;base64,{icon_b64}" x="36" y="130" width="440" height="251" />
</svg>"""

with open('frontend/public/writnexa-app-icon.svg', 'w', encoding='utf-8') as f:
    f.write(app_icon_svg)

print("Generated SVGs successfully.")

