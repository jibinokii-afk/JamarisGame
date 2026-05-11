# 🎨 Jamaris Game

A colorful, kid-friendly web app of mini-games for toddlers. Built for a 3-year-old. Starts with a free-draw coloring game and is structured to easily add more games.

**Tech:** Plain HTML/CSS/JS — no build step, no framework. Perfect for static hosting.

---

## 📁 Project structure

```
jamaris-game/
├── index.html              ← Home (game picker)
├── css/style.css           ← All styles
├── js/home.js              ← Home screen logic
├── games/
│   └── coloring.html       ← Coloring game
├── js/coloring.js          ← Coloring game logic
└── README.md
```

## 🎮 Games

- 🎨 **Coloring** — Free-draw with finger over animal outlines (cat, fish, butterfly, elephant, bird, turtle). 12 colors, 3 brush sizes, eraser. Earns a star each time the child fills a good amount of color.
- 🐾 Animal Sounds *(coming soon)*
- 🔢 Counting *(coming soon)*
- 🧩 Shapes *(coming soon)*

## ✨ Features

- Fully responsive, iPhone-optimized
- Touch + mouse drawing on HTML Canvas
- Built-in sound effects using Web Audio API (no audio files needed)
- Stars saved to `localStorage` (persist between sessions)
- Add-to-home-screen ready (`apple-mobile-web-app-capable`)
- Confetti celebration when a drawing is complete
- Parent-friendly: "go home" confirmation prevents accidental exits

---

## 🚀 Deploy with GitHub + Cloudflare Pages

### 1. Create the GitHub repo

```bash
cd jamaris-game
git init
git add .
git commit -m "Initial commit: home + coloring game"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/jamaris-game.git
git push -u origin main
```

### 2. Deploy on Cloudflare Pages

1. Log in to Cloudflare → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
2. Authorize GitHub and select the `jamaris-game` repo.
3. **Build settings:**
   - Framework preset: **None**
   - Build command: *(leave empty)*
   - Build output directory: `/`
4. Click **Save and Deploy.**
5. You'll get a URL like `https://jamaris-game.pages.dev`.

Every `git push` to `main` triggers an auto-deploy in ~30 seconds.

### 3. (Optional) Add a custom domain

In Cloudflare Pages → your project → **Custom domains** → add your domain (e.g. `jamaris.yourdomain.com`).

---

## 📱 Add to iPhone home screen

In Safari on iPhone:
1. Open the deployed site
2. Tap the **Share** button
3. **Add to Home Screen**
4. Now it launches like a real app (no browser bars), perfect for handing the phone to a kid.

---

## 🛠 Local testing

Just open `index.html` in any browser. No server required.

For phone testing on the same Wi-Fi:
```bash
python3 -m http.server 8000
```
Then visit `http://YOUR_COMPUTER_IP:8000` on your phone.

---

## ➕ Adding a new game

1. Duplicate `games/coloring.html` → e.g. `games/counting.html`
2. Create matching JS in `js/counting.js`
3. In `index.html`, change one of the `.game-card.locked` blocks into a real link:

```html
<a href="games/counting.html" class="game-card counting">
  <div class="emoji">🔢</div>
  <div class="label">Counting</div>
</a>
```

Add a matching `.game-card.counting { background: #...; }` rule in `style.css`.

---

## 💡 Future ideas

- Save finished artwork to the device (canvas → PNG download)
- More animal outlines (load from `assets/animals/*.svg`)
- Background music toggle
- Multiple kid profiles
- Achievement badges (5 stars, 10 stars, etc.)
- PWA manifest + service worker for fully offline use

Made with ❤️ for Jamaris.
