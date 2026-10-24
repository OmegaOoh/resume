# Resume Static Site & JD Tailoring Workbench

A modular, clean, and easily maintainable static resume site and interactive JD tailoring workbench built with **Bun**, **TypeScript**, and **TOML**.

## Project Architecture

```text
resume/
├── content/                      # Edit your resume content here (No HTML needed!)
│   ├── config.toml               # Section order & visibility defaults
│   ├── profile.toml              # Name, title, location, and dynamic [[contacts]]
│   ├── summary.toml              # Summary paragraph (or summary.md)
│   ├── skills.toml               # Technical skills and categories
│   ├── experience.toml           # Work experience and achievements
│   ├── projects.toml             # Projects, repo links, and highlights
│   └── education.toml            # Degrees, institutions, and coursework
├── src/                          # Modular TypeScript compilation engine
│   ├── index.ts                  # CLI entrypoint (--build, --dev)
│   ├── builder.ts                # Builds index.html and customize.html
│   ├── server.ts                 # Dev server with SSE live-reload
│   ├── types/
│   │   └── resume.ts             # TypeScript interfaces for all TOML files
│   ├── utils/
│   │   ├── markdown.ts           # Universal inline & block Markdown parser
│   │   ├── loader.ts             # TOML/Markdown loader & schema validator
│   │   └── html.ts               # Safe HTML escaping helpers
│   └── components/               # Isolated UI component renderers
│       ├── section.ts            # Shared section header & divider wrapper
│       ├── header.ts             # Profile & contacts renderer
│       ├── summary.ts            # Summary renderer
│       ├── skills.ts             # Skills renderer
│       ├── experience.ts         # Experience renderer
│       ├── projects.ts           # Projects renderer
│       ├── education.ts          # Education renderer
│       └── customizer-ui.ts      # Client-side JD tailoring workbench controller
├── templates/
│   ├── index.html                # Public landing page template
│   └── customize.html            # Interactive JD Tailoring Workbench template
├── assets/                       # Icons & SVGs
├── style.css                     # Custom styling & A4 print CSS
├── index.html                    # Generated static public resume
└── customize.html                # Generated interactive JD tailoring page (works on GH Pages!)
```

## Universal Markdown Support

Every text field across all `.toml` files supports Markdown syntax:
- **Bold**: `**bold text**` or `__bold text__`
- **Italic**: `*italic text*` or `_italic text_`
- **Inline Code**: `` `code` ``
- **Links**: `[label](https://example.com)`
- **Strikethrough**: `~~text~~`

You can also add `enabled = false` to any item in `skills.toml`, `experience.toml`, `projects.toml`, or `education.toml` to hide it on the public `index.html` while keeping it available to toggle on in `customize.html`!

## JD Tailoring Workbench (`customize.html`)

Accessible locally at `http://localhost:3000/customize.html` or on GitHub Pages at `<your-site>/customize.html`:
- **Live Headline & Summary Editing**: Tailor your target job title and summary with live Markdown rendering.
- **Section Reordering & Toggling**: Move sections up/down (e.g., put *Projects* above *Experience*) or hide sections.
- **Item & Bullet Toggling + Editing**: Toggle individual jobs, projects, skills, or individual bullet points, and tweak their Markdown text on the fly.
- **Real-time 1-Page A4 Height Meter**: Visual progress bar showing whether your tailored resume fits cleanly on 1 A4 page before printing.
- **Named Presets**: Save and load multiple tailored variations in browser storage.
- **Clean PDF Print**: Click **Print / Export PDF** (`Ctrl+P`)—the workbench UI automatically hides and outputs a crisp A4 PDF.

## Quick Commands

### Build Static Files (`index.html` & `customize.html`)
```bash
bun run build
```

### Start Live-Reload Development Server
```bash
bun run dev
```
- Public Resume: `http://localhost:3000/`
- Tailoring Workbench: `http://localhost:3000/customize.html`
