# 🏎️ F1 Tracker Pro

A modern, animated real-time Formula 1 tracking web application built with React and TypeScript. Get live race telemetry, driver & constructor standings, the full race calendar, and AI-powered insights — all in one place.

---

## ✨ Features

- **📊 Dashboard** — At-a-glance view of driver standings, constructor standings, last race results, and countdown to the next race.
- **🏁 Live Race** — Real-time telemetry powered by OpenF1: speed, gear, throttle, brake position, sector times, intervals, and live weather data.
- **🧑‍✈️ Drivers** — Full Formula 1 Driver Championship standings with points, wins, podiums, and driver/team information.
- **🏢 Teams** — Full Constructor Championship standings with team colors, logos, car details, and team principal info.
- **📅 Calendar** — Complete race calendar with circuit information, status indicators (upcoming / live / completed), and countdown timers.
- **🤖 AI Insights** — Chat with a Google Gemini-powered F1 assistant for context-aware race strategy insights, stats, and analysis.
- **🔔 Notifications** — Browser push notifications for race updates and daily F1 news.
- **📱 PWA Support** — Installable Progressive Web App with offline access and automatic updates.
- **🌙 F1 Dark Theme** — Sleek F1-branded dark UI with signature red and purple accents.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS 4, Motion (animations) |
| Icons | Lucide React |
| Charts | Recharts |
| AI | Google Gemini API (`@google/genai`) |
| PWA | vite-plugin-pwa |
| Backend | Express (minimal, for serving) |

---

## 📋 Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher
- A **Google Gemini API key** (required for AI Insights — see [Get an API key](https://aistudio.google.com/app/apikey))

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/chengmatt416/F1Tracker.git
cd F1Tracker
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Open `.env` and set the required variables:

```env
# Required: Your Google Gemini API key for AI Insights
GEMINI_API_KEY="your_gemini_api_key_here"

# Optional: The URL where the app is hosted (used for self-referential links)
APP_URL="http://localhost:3000"
```

> **Getting a Gemini API key:**
> 1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
> 2. Sign in with your Google account
> 3. Click **Create API key**
> 4. Copy the key and paste it into your `.env` file

### 4. Start the Development Server

```bash
npm run dev
```

Open your browser and navigate to **http://localhost:3000**

---

## 📜 Available Scripts

| Script | Command | Description |
|---|---|---|
| `npm run dev` | `vite --port=3000 --host=0.0.0.0` | Start the dev server with hot reload |
| `npm run build` | `vite build` | Create a production build in `dist/` |
| `npm run preview` | `vite preview` | Preview the production build locally |
| `npm run lint` | `tsc --noEmit` | Run TypeScript type checking |
| `npm run clean` | `rm -rf dist` | Remove the build output directory |

---

## 📁 Project Structure

```
F1Tracker/
├── src/
│   ├── components/              # React UI components
│   │   ├── Dashboard.tsx        # Overview: standings, next race, last race
│   │   ├── LiveRace.tsx         # Live telemetry & session data
│   │   ├── Drivers.tsx          # Driver championship standings
│   │   ├── Teams.tsx            # Constructor championship standings
│   │   ├── Calendar.tsx         # Race calendar & schedule
│   │   ├── AIInsights.tsx       # Gemini AI chat interface
│   │   └── Sidebar.tsx          # Navigation sidebar
│   ├── services/
│   │   ├── f1Api.ts             # F1 data fetching (Jolpi/Ergast + OpenF1 APIs)
│   │   └── notificationService.ts  # Browser notification scheduling
│   ├── data/
│   │   └── fallbacks.ts         # Team colors, logos, driver images, circuit data
│   ├── lib/
│   │   └── utils.ts             # Utility helpers (className merging)
│   ├── App.tsx                  # Root component with routing & state
│   ├── main.tsx                 # App entry point & PWA service worker registration
│   ├── types.ts                 # TypeScript interfaces (Driver, Team, Race, etc.)
│   └── index.css                # Tailwind CSS & F1 theme variables
├── public/
│   └── icon.svg                 # PWA app icon
├── .env.example                 # Environment variable template
├── index.html                   # HTML entry point
├── package.json                 # Dependencies & scripts
├── tsconfig.json                # TypeScript configuration
└── vite.config.ts               # Vite & plugin configuration
```

---

## 🔌 API Integrations

The app pulls data from three external sources:

### Jolpi API (Ergast Fork)
> Base URL: `https://api.jolpi.ca/ergast/f1`

Used for season data:
- Driver championship standings
- Constructor championship standings
- Full race schedule
- Historical results

### OpenF1 API
> Base URL: `https://api.openf1.org/v1`

Used for live session data:
- Real-time car telemetry (speed, gear, RPM, throttle, brake)
- Live driver positions & intervals
- Lap times and sector splits
- Weather conditions (wind speed, temperature, humidity)
- Stint and pit-stop information

### Google Gemini API
> Requires `GEMINI_API_KEY` in your `.env` file

Powering the **AI Insights** tab:
- Context-aware F1 chat assistant
- Answers questions about current standings, race strategy, driver stats
- Markdown-formatted responses

> **Note:** The app polls API health every 30 seconds and will display an error banner if the F1 APIs are unreachable. No API key is needed for Jolpi or OpenF1 — they are free and open.

---

## 📱 Progressive Web App (PWA)

F1 Tracker Pro is a fully installable PWA:

- **Install on Desktop or Mobile** — Click the install prompt in your browser or address bar to add the app to your home screen / taskbar.
- **Offline Support** — Core content is cached by the service worker so the app loads even without an internet connection.
- **Auto-Updates** — The service worker automatically fetches and applies updates in the background.

---

## 🎨 Theme & Styling

The app uses a custom F1-branded dark theme defined in `src/index.css`:

| Token | Hex | Usage |
|---|---|---|
| `--color-f1-red` | `#E10600` | Primary accent, active states |
| `--color-f1-purple` | `#B62AD0` | Secondary accent |
| `--color-f1-dark` | `#15151E` | Main background |
| `--color-f1-darker` | `#000000` | Deepest background |
| `--color-f1-gray` | `#38383f` | Borders and dividers |
| `--color-f1-light` | `#f3f3f3` | Primary text |

**Fonts:** Inter (body) · JetBrains Mono (telemetry data) · Teko (display headings)

---

## ☁️ Deployment

The app is optimized for deployment on **Google Cloud AI Studio / Cloud Run**:

1. Build the production bundle:
   ```bash
   npm run build
   ```
2. Deploy the `dist/` folder to your preferred hosting service (Netlify, Vercel, Firebase Hosting, Cloud Run, etc.).
3. Set the `GEMINI_API_KEY` and `APP_URL` environment variables in your hosting platform's secrets/environment settings.

---

## 🤝 Contributing

Contributions are welcome! To get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes and run the type checker: `npm run lint`
4. Build to verify nothing is broken: `npm run build`
5. Commit your changes: `git commit -m "feat: add your feature"`
6. Push your branch: `git push origin feature/your-feature-name`
7. Open a Pull Request

---

## 📄 License

This project is open source. See the repository for license details.
