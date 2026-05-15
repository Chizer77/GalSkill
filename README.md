<div align="center">

<img src="docs/icon.png" width="180" alt="GalSkill logo">

# GalSkill

**Tracing a girl's heartbeat into skills.**

![Moe Counter](https://count.getloli.com/@GalSkill?theme=moebooru)

[![GitHub Stars](https://img.shields.io/github/stars/Chizer77/GalSkill?logo=github&color=e8c482)](https://github.com/Chizer77/GalSkill/stargazers)
[![GitHub Repo Size](https://img.shields.io/github/repo-size/Chizer77/GalSkill?logo=github&color=6b7280)]()

[![Next.js 14](https://img.shields.io/badge/Next.js_14-000000?logo=nextdotjs)](https://nextjs.org/)
[![TypeScript 5.3](https://img.shields.io/badge/TypeScript_5.3-3178C6?logo=typescript&logoColor=fff)](https://www.typescriptlang.org/)
[![Tailwind CSS 3.4](https://img.shields.io/badge/Tailwind_CSS_3.4-06B6D4?logo=tailwindcss&logoColor=fff)](https://tailwindcss.com/)


</div>

---

**GalSkill** converts visual novel character data into LLM-ready **"Character Skills"**. It aggregates character data from Bangumi, VNDB, and Wikipedia, then distills dialogue corpora into structured character profiles that enable LLMs to authentically simulate specific personas.

> [!IMPORTANT]
> Fully static SPA — zero backend. 200K+ character profiles loaded from CDN shards into IndexedDB. No server required.

---

## Features

| 💡 Cross-DB Search | 📝 Dialogue Distillation | 🎯 Skill Export | 🎨 Paper & Ink Design |
|---|---|---|---|
| Bangumi + VNDB + Wiki 200K+ chars, CJK+EN search | Iterative chunked analysis via LLM | 4-file ZIP | Warm parchment theme, Framer Motion |

- **🔍 Cross-Database Search** — 200K+ character index with CJK/English keyword search and keyboard navigation
- **📄 Dialogue Input** — Paste text or upload `.txt`/`.json`, auto-parses `「」` `""` and `""` quote styles
- **🧪 Iterative Distillation** — 3000-char chunks (200 overlap), sent sequentially to any OpenAI-compatible API, accumulating analysis across chunks
- **📦 ZIP Export** — `identity.json` + `knowledge.json` + `relations.md` + `style_guide.md`, editable before download

---

## Quick Start

```bash
git clone https://github.com/Chizer77/GalSkill.git
cd GalSkill

npm install

npm run dev

npm run build
```

> [!TIP]
> On first use, wait for the index to initialize — progress shows in the search box (e.g. `1832/5630`).

```
Search character → Input dialogue → Configure LLM API → Distill → Export Skill
```

---

## Data Sources

| Source | Data | License |
| --- | --- | --- |
| [Bangumi](https://bgm.tv/) | Character info & work affiliations | [Copyright notice](https://bgm.tv/about/copyright) |
| [VNDB](https://vndb.org/) | Character traits & attributes | [License](https://vndb.org/d17#4) |
| [Japanese Wikipedia](https://ja.wikipedia.org/) | Character tags & descriptions | [License](https://dumps.wikimedia.org/legal.html) |

---

## Credits

- [JodieRuth/GalgameCharacterSkills](https://github.com/JodieRuth/GalgameCharacterSkills)
- [chenmozhijin/CharacterDB](https://github.com/chenmozhijin/CharacterDB)

