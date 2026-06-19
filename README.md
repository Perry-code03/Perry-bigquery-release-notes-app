# BigQuery Release Notes Radar 📡

A premium, cyber-dark style web application built with **Python Flask** and vanilla **HTML5 / CSS3 / JavaScript** that fetches, parses, filters, and shares Google Cloud's BigQuery release notes. It features a custom social composer to customize and tweet updates to X (Twitter).

---

## ✨ Features

- **Daily Slicing Parser**: Google's feed combines multiple updates under single-day entries. This app parses and segments daily notes by headings (`H3`) into discrete, clean update cards.
- **Dynamic Category Filter Chips**: Filter updates instantly by type: *Features*, *Changes*, *Deprecations*, or *Resolved Issues*.
- **Real-Time Fuzzy Search**: Find specific updates by content, header tags, or dates instantly.
- **Social Composer with Live Meter**: Highlight a release note to auto-populate a tweet. Includes:
  - Custom summaries with link integration.
  - Interactive editing workspace.
  - SVG progress ring indicating remaining character limit (out of 280) that turns orange near the limit and red when exceeding it.
- **Rich Dark Theme & Micro-animations**: Glassmorphism containers (`backdrop-filter`), glowing indicators, and fluid hover states.
- **Toast Notifications**: Built-in notifications for clipboard actions, server states, and sync status.

---

## 🛠️ Tech Stack

- **Backend**: Python, Flask, `xml.etree.ElementTree` (Standard library XML parser)
- **Frontend**: HTML5 (Semantic markup), CSS3 (Custom properties, grid, glassmorphism), Vanilla JavaScript
- **Icons**: Lucide Icons CDN

---

## 📂 Project Structure

```text
bigquery-release-notes/
├── app.py                  # Main Flask application & XML feed parsing API
├── templates/
│   └── index.html          # Web application structure & semantic layout
├── static/
│   ├── css/
│   │   └── style.css       # Visual themes, animations & responsive styling
│   └── js/
│       └── main.js         # DOMParser engine, event handlers & social logic
├── .gitignore              # Ignores venv, caches, and scratch files
└── README.md               # Project documentation
```

---

## 🚀 Installation & Local Development

### 1. Clone the Repository
```bash
git clone https://github.com/Perry-code03/Perry-bigquery-release-notes-app.git
cd Perry-bigquery-release-notes-app
```

### 2. Set Up a Virtual Environment & Run the Server
Create a virtual environment and install Flask:

**On Windows:**
```powershell
python -m venv venv
.\venv\Scripts\pip install flask
.\venv\Scripts\python.exe app.py
```

**On macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
pip install flask
python app.py
```

### 3. Open the App
Navigate to **[http://127.0.0.1:5000](http://127.0.0.1:5000)** in your web browser.
