# Welcome page phone and color update

## Changes
- Replace the current transparent phone cutout with your uploaded PepLog iPhone dashboard image, preserving its phone, screen details, and pale blue artwork.
- Carry the image’s soft ice-blue and near-white colors across the **whole welcome page**, including the header, section backgrounds, and footer, with cyan accents and dark readable text.
- Blend the image into the surrounding background without a visible card frame. Keep the design simple and professional, without added glows or grid decorations.
- Keep Geist, existing wording, buttons, links, pricing, and all site functionality unchanged. Other pages, including PepHub and the client dashboard, keep their current colors.

## Technical details
- Store the uploaded image as a Lovable CDN asset and reference its generated pointer from the home page.
- Add a welcome-page-specific theme override rather than changing the shared `landing-light` theme, which is also used elsewhere.
- Use the image’s square proportions with responsive sizing so the phone stays fully visible and undistorted.

## Review before publishing
- Check the full welcome page at desktop and phone widths for image clarity, readable text, consistent colors, and clean side margins.
- Confirm the existing welcome-page buttons still lead to the same destinations.
- Show the updated preview for review; **do not publish**.