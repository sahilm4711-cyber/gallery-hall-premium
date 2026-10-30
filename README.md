# Gallery Hall — Premium, For Two

A private 3D gallery hall for two people, built from the structure of the
public GALLERY-HALL- museum idea — with the demo branding, storefront and
demo photos removed.

Open `index.html` in a browser (serve the folder, do not just double-click
if your browser blocks local files):

```bash
python -m http.server 8080
# open http://localhost:8080/
```

## What is premium here

- **Private passcode lock** — set on first open, on this device only.
  This is a device lock, not a server account. Keep the link private.
- **Your names, everywhere** — entrance, centerpiece plaque, cinema screen.
  Edit them in the left panel any time; no names are baked in.
- **Your photos** — upload up to 12. The first photo is the centerpiece.
  Click any uploaded thumbnail in the panel to make it the centerpiece.
  Click a frame in the 3D hall to view it big.
- **Anniversary tracker** — days together + days to the next anniversary,
  from the date you enter.
- **Walk together** — WASD / arrows, drag to look, click-to-walk, mobile
  joystick, first/third-person views, benches to sit on (E near a bench),
  chat drawer and emote reactions. Live presence syncs across tabs on
  the same device via `BroadcastChannel`.
- **Themes** — Gold & Marble, Rose, Emerald, Midnight.
- **Export / import** — save your hall as JSON and move it to another
  device. Photos are stored in the browser only; re-upload them on a
  new device if they are missing after import.

## Files (all text, no binary assets)

- `index.html` — lock screen, lobby panel, 3D stage, chat, modals
- `style.css` — premium gold/marble styling, mobile layout
- `app.js` — settings, lock, 3D museum (Three.js via CDN), chat, music
- `README.md` — this file

## Notes

- 3D needs an internet connection the first time, to load Three.js
  from CDN. If it cannot load, the settings and photo panel still work.
- This is a personal gift build, not a store product and not for resale.
