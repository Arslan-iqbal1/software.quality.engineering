# BookKart — Going Live

BookKart's code is production-ready (SQLite database, order notifications,
tracking, admin page). "Going live" = running `server.js` on a public
machine with your own domain. Two routes:

| | **Route A — VPS (recommended for real orders)** | **Route B — Render (quick demo)** |
|---|---|---|
| Cost | ~Rs 1,500/month (any Ubuntu VPS) | Free tier available |
| Database | Persists forever on the VPS disk | **Free tier resets the DB** on redeploy/spin-down; persistent disk is a paid add-on |
| Always on | Yes | Free tier sleeps when idle (~30s wake-up) |
| Setup time | ~20 minutes | ~5 minutes |

Both routes need **zero code changes** — configuration is environment
variables only (see `.env.example`).

---

## Route A — VPS (Ubuntu)

1. **Get a server and point your domain at it**
   Buy any Ubuntu 22.04+ VPS (Contabo, Hetzner, DigitalOcean…). In your
   domain's DNS, add an `A` record: `yourshop.com` → the VPS IP address.

2. **Install Node.js 22+** (BookKart needs it for the built-in SQLite):
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt-get install -y nodejs git
   ```

3. **Install BookKart**
   ```bash
   sudo useradd -r -m bookkart
   sudo mkdir -p /opt/bookkart /var/lib/bookkart
   sudo git clone https://github.com/Arslan-iqbal1/software.quality.engineering.git /opt/bookkart
   cd /opt/bookkart && sudo npm install --omit=dev
   sudo chown -R bookkart:bookkart /opt/bookkart /var/lib/bookkart
   ```

4. **Configure your secrets** — copy the template and fill it in:
   ```bash
   sudo cp .env.example .env
   sudo nano .env   # set BOOKKART_ADMIN_KEY and your notification channel
   ```

5. **Run it as a service** (starts on boot, restarts on crash):
   ```bash
   sudo cp deploy/bookkart.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now bookkart
   systemctl status bookkart        # should be "active (running)"
   ```

6. **HTTPS with nginx + Let's Encrypt** (free, ~5 minutes):
   ```bash
   sudo apt-get install -y nginx certbot python3-certbot-nginx
   ```
   Create `/etc/nginx/sites-available/bookkart`:
   ```nginx
   server {
       listen 80;
       server_name yourshop.com www.yourshop.com;
       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
   }
   ```
   ```bash
   sudo ln -s /etc/nginx/sites-available/bookkart /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d yourshop.com -d www.yourshop.com
   ```

7. **Go-live check** — open `https://yourshop.com`, place a test order:
   your phone should buzz (notification), the order should appear in
   `https://yourshop.com/admin.html`, and tracking should show it.

**Backups:** your whole business is one file — `/var/lib/bookkart/bookkart.db`.
Copy it somewhere safe regularly (e.g. a weekly cron copying it to cloud storage).

## Route B — Render (demo)

1. Push this repo to GitHub (already done), then in the
   [Render dashboard](https://dashboard.render.com): **New → Blueprint**,
   pick the repo — `render.yaml` configures everything.
2. In the service's **Environment** tab, set `BOOKKART_ADMIN_KEY`
   (required) and any notification variables.
3. Deploy. Your store is at `https://bookkart.onrender.com` (or attach a
   custom domain in Settings).
4. Remember the free-tier limits in the table above — the database does
   **not** persist there. For real orders, add a **persistent disk**
   mounted at `/var/data` and set `BOOKKART_DB=/var/data/bookkart.db`,
   or use Route A.

## Configuration reference

| Variable | Required? | Purpose |
|---|---|---|
| `PORT` | host sets it | Port to listen on (default 3000) |
| `BOOKKART_DB` | no | Database file path (default `data/bookkart.db`) |
| `BOOKKART_ADMIN_KEY` | **yes, in public** | Protects the admin orders page |
| `BOOKKART_NTFY_TOPIC` | one channel | ntfy.sh phone push topic (free, no account) |
| `BOOKKART_TELEGRAM_TOKEN` + `BOOKKART_TELEGRAM_CHAT_ID` | one channel | Telegram bot notifications |
| `BOOKKART_WEBHOOK_URL` | one channel | JSON POST to any URL per order |

## After you're live — the business checklist

- [ ] Replace the demo catalog with your real books and stock (edit via `src/core.js` seed, or ask for an admin catalog page)
- [ ] COD + bank transfer work from day one; for real card/wallet payments, open a merchant account (e.g. PayFast) and integrate its keys
- [ ] Arrange delivery (PostEx / TCS / Leopards) and set statuses in the admin page as orders move
- [ ] Back up `bookkart.db` weekly
