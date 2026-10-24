import type { ResumeData } from "../types/resume";

/**
 * Generates the client-side interactive script and initial state JSON
 * for the Resume Customizer Workbench (customize.html).
 */
export function renderCustomizerClientScript(data: ResumeData): string {
  const serializedData = JSON.stringify(data).replace(/</g, "\\u003c");

  return `<script id="resume-initial-data" type="application/json">${serializedData}</script>
<script>
(() => {
  const initialData = JSON.parse(document.getElementById("resume-initial-data").textContent);
  const STORAGE_KEY = "resume_customizer_state_v1";
  const PRESETS_KEY = "resume_customizer_presets_v1";

  // Client-side Markdown renderer matching src/utils/markdown.ts
  function escapeHtml(text) {
    return String(text || "")
      .replace(/&(?!(?:amp|lt|gt|quot|apos|#\\d+|#x[a-fA-F\\d]+);)/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderInlineMarkdown(text) {
    if (!text) return "";
    let html = escapeHtml(text);
    const codeSpans = [];
    html = html.replace(/\`([^\`]+)\`/g, (_, code) => {
      const ph = "\\x00CODE_" + codeSpans.length + "\\x00";
      codeSpans.push('<code class="px-1 py-0.5 bg-gray-100 rounded text-[0.9em] font-mono print:bg-transparent print:px-0">' + code + '</code>');
      return ph;
    });
    html = html.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, (_, label, url) => {
      const isMailOrTel = url.startsWith("mailto:") || url.startsWith("tel:");
      const target = isMailOrTel ? "" : ' target="_blank" rel="noopener noreferrer"';
      return '<a href="' + url + '"' + target + ' class="text-blue-600 underline">' + label + '</a>';
    });
    html = html.replace(/\\*\\*\\*(.+?)\\*\\*\\*/g, "<strong><em>$1</em></strong>");
    html = html.replace(/\\*\\*(.+?)\\*\\*/g, "<strong>$1</strong>");
    html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");
    html = html.replace(/\\*(?!\\s)(.+?)(?<!\\s)\\*/g, "<em>$1</em>");
    html = html.replace(/(^|\\s)_(?!\\s)(.+?)(?<!\\s)_(?=$|\\s|[.,!?;:])/g, "$1<em>$2</em>");
    html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");
    html = html.replace(/\\x00CODE_(\\d+)\\x00/g, (_, idx) => codeSpans[Number(idx)] || "");
    return html;
  }

  function renderBlockMarkdown(text) {
    if (!text) return "";
    const lines = String(text).trim().split(/\\r?\\n/);
    const blocks = [];
    let currentList = [];
    let currentParagraph = [];

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        blocks.push('<p class="print:text-sm">' + currentParagraph.map(renderInlineMarkdown).join(" ") + '</p>');
        currentParagraph = [];
      }
    };
    const flushList = () => {
      if (currentList.length > 0) {
        blocks.push('<ul class="list-disc pl-5 space-y-1 print:space-y-0 print:text-sm">' +
          currentList.map(i => '<li>' + renderInlineMarkdown(i) + '</li>').join("") + '</ul>');
        currentList = [];
      }
    };

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) {
        flushParagraph();
        flushList();
        continue;
      }
      const m = line.match(/^[-*]\\s+(.*)$/);
      if (m) {
        flushParagraph();
        currentList.push(m[1]);
      } else {
        flushList();
        currentParagraph.push(line);
      }
    }
    flushParagraph();
    flushList();
    return blocks.join("\\n");
  }

  function createDefaultState() {
    const raw = JSON.parse(JSON.stringify(initialData));
    return {
      profile: {
        name: raw.profile.name,
        title: raw.profile.title,
        location: raw.profile.location,
        contacts: raw.profile.contacts.map(c => ({
          ...c,
          enabled: c.enabled !== false
        }))
      },
      sections: raw.config.sections.map(s => ({
        id: s.id,
        title: s.title,
        enabled: s.enabled !== false,
        placement: s.placement || "main"
      })),
      summary: {
        content: raw.summary.content.trim()
      },
      skills: raw.skills.skills.map((s, idx) => ({
        originalIndex: idx,
        category: s.category,
        items: s.items,
        enabled: s.enabled !== false
      })),
      experience: raw.experience.experience.map((e, idx) => ({
        originalIndex: idx,
        role: e.role,
        company: e.company,
        period: e.period,
        location: e.location || "",
        enabled: e.enabled !== false,
        highlights: e.highlights.map((h, hIdx) => ({
          originalIndex: hIdx,
          text: h,
          enabled: true
        }))
      })),
      projects: raw.projects.projects.map((p, idx) => ({
        originalIndex: idx,
        name: p.name,
        period: p.period,
        repository: p.repository || "",
        enabled: p.enabled !== false,
        highlights: p.highlights.map((h, hIdx) => ({
          originalIndex: hIdx,
          text: h,
          enabled: true
        }))
      })),
      education: raw.education.education.map((ed, idx) => ({
        originalIndex: idx,
        degree: ed.degree,
        institution: ed.institution,
        period: ed.period,
        enabled: ed.enabled !== false,
        details: ed.details.map((d, dIdx) => ({
          originalIndex: dIdx,
          text: d,
          enabled: true
        }))
      }))
    };
  }

  let state = createDefaultState();
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      state = JSON.parse(saved);
    }
  } catch (e) {
    console.warn("Could not load saved customizer state:", e);
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  // Apply state to the live resume DOM preview
  function applyStateToPreview() {
    // 1. Profile Header
    const nameEl = document.querySelector('[data-profile-field="name"]');
    const titleEl = document.querySelector('[data-profile-field="title"]');
    const locEl = document.querySelector('[data-profile-field="location"]');
    if (nameEl) nameEl.innerHTML = renderInlineMarkdown(state.profile.name);
    if (titleEl) titleEl.innerHTML = renderInlineMarkdown(state.profile.title);
    if (locEl) locEl.innerHTML = renderInlineMarkdown(state.profile.location);

    state.profile.contacts.forEach((c, idx) => {
      const contactEl = document.querySelector('[data-contact-index="' + idx + '"]');
      const textEl = document.querySelector('[data-contact-text="' + idx + '"]');
      if (contactEl) {
        contactEl.classList.toggle("hidden", !c.enabled);
      }
      if (textEl) {
        textEl.innerHTML = renderInlineMarkdown(c.text);
      }
    });

    // 2. Sections visibility, titles & ordering
    const mainSectionContainer = document.querySelector('[data-container="main-sections"]');
    const asideSectionContainer = document.querySelector('[data-container="aside-sections"]');

    state.sections.forEach((sec) => {
      const secEl = document.querySelector('[data-section-id="' + sec.id + '"]');
      const titleEl = document.querySelector('[data-section-title="' + sec.id + '"]');
      if (titleEl) titleEl.innerHTML = renderInlineMarkdown(sec.title);
      if (secEl) {
        secEl.classList.toggle("hidden", !sec.enabled);
        const targetContainer = sec.placement === "aside" ? asideSectionContainer : mainSectionContainer;
        if (targetContainer) {
          targetContainer.appendChild(secEl);
        }
      }
    });

    // 3. Summary
    const summaryEl = document.querySelector('[data-summary-content="true"]');
    if (summaryEl) {
      summaryEl.innerHTML = renderBlockMarkdown(state.summary.content);
    }

    // 4. Skills
    const skillsListEl = document.querySelector('[data-skills-list="true"]');
    state.skills.forEach((sk) => {
      const idx = sk.originalIndex;
      const li = document.querySelector('[data-skill-index="' + idx + '"]');
      const cat = document.querySelector('[data-skill-category="' + idx + '"]');
      const val = document.querySelector('[data-skill-items="' + idx + '"]');
      if (li) {
        li.classList.toggle("hidden", !sk.enabled);
        if (skillsListEl) skillsListEl.appendChild(li);
      }
      if (cat) cat.innerHTML = renderInlineMarkdown(sk.category) + ": ";
      if (val) val.innerHTML = renderInlineMarkdown(sk.items);
    });

    // 5. Experience
    const expListEl = document.querySelector('[data-experience-list="true"]');
    state.experience.forEach((exp) => {
      const idx = exp.originalIndex;
      const li = document.querySelector('[data-exp-index="' + idx + '"]');
      const roleEl = document.querySelector('[data-exp-role="' + idx + '"]');
      const compEl = document.querySelector('[data-exp-company="' + idx + '"]');
      const perEl = document.querySelector('[data-exp-period="' + idx + '"]');
      const locEl = document.querySelector('[data-exp-location="' + idx + '"]');

      if (li) {
        li.classList.toggle("hidden", !exp.enabled);
        if (expListEl) expListEl.appendChild(li);
      }
      if (roleEl) roleEl.innerHTML = renderInlineMarkdown(exp.role);
      if (compEl) compEl.innerHTML = renderInlineMarkdown(exp.company);
      if (perEl) perEl.innerHTML = renderInlineMarkdown(exp.period);
      if (locEl) locEl.innerHTML = renderInlineMarkdown(exp.location);

      exp.highlights.forEach((h) => {
        const hEl = document.querySelector('[data-exp-highlight="' + idx + '-' + h.originalIndex + '"]');
        if (hEl) {
          hEl.classList.toggle("hidden", !h.enabled);
          hEl.innerHTML = renderInlineMarkdown(h.text);
        }
      });
    });

    // 6. Projects
    const projListEl = document.querySelector('[data-projects-list="true"]');
    state.projects.forEach((proj) => {
      const idx = proj.originalIndex;
      const li = document.querySelector('[data-proj-index="' + idx + '"]');
      const nameEl = document.querySelector('[data-proj-name="' + idx + '"]');
      const perEl = document.querySelector('[data-proj-period="' + idx + '"]');
      const repoEl = document.querySelector('[data-proj-repo="' + idx + '"]');

      if (li) {
        li.classList.toggle("hidden", !proj.enabled);
        if (projListEl) projListEl.appendChild(li);
      }
      if (nameEl) nameEl.innerHTML = renderInlineMarkdown(proj.name);
      if (perEl) perEl.innerHTML = renderInlineMarkdown(proj.period);
      if (repoEl) {
        if (!proj.repository.trim()) {
          repoEl.classList.add("hidden");
        } else {
          repoEl.classList.remove("hidden");
          const repoMd = proj.repository.includes("](")
            ? renderInlineMarkdown(proj.repository)
            : renderInlineMarkdown("[" + proj.repository + "](" + proj.repository + ")");
          repoEl.innerHTML = "<strong>Repository:</strong> " + repoMd;
        }
      }

      proj.highlights.forEach((h) => {
        const hEl = document.querySelector('[data-proj-highlight="' + idx + '-' + h.originalIndex + '"]');
        if (hEl) {
          hEl.classList.toggle("hidden", !h.enabled);
          hEl.innerHTML = renderInlineMarkdown(h.text);
        }
      });
    });

    // 7. Education
    state.education.forEach((ed) => {
      const idx = ed.originalIndex;
      const blockEl = document.querySelector('[data-edu-index="' + idx + '"]');
      const degEl = document.querySelector('[data-edu-degree="' + idx + '"]');
      const instEl = document.querySelector('[data-edu-institution="' + idx + '"]');
      const perEl = document.querySelector('[data-edu-period="' + idx + '"]');

      if (blockEl) blockEl.classList.toggle("hidden", !ed.enabled);
      if (degEl) degEl.innerHTML = renderInlineMarkdown(ed.degree);
      if (instEl) instEl.innerHTML = renderInlineMarkdown(ed.institution);
      if (perEl) perEl.innerHTML = renderInlineMarkdown(ed.period);

      ed.details.forEach((d) => {
        const dEl = document.querySelector('[data-edu-detail="' + idx + '-' + d.originalIndex + '"]');
        if (dEl) {
          dEl.classList.toggle("hidden", !d.enabled);
          dEl.innerHTML = renderInlineMarkdown(d.text);
        }
      });
    });

    updatePageMeter();
    saveState();
  }

  // Accurate A4 Print Height Usage Calculation
  function updatePageMeter() {
    const contentWrapper = document.getElementById("resume-content-wrapper");
    const ruler = document.getElementById("a4-printable-ruler");
    const breakLine = document.getElementById("a4-page-break-line");
    const meterText = document.getElementById("a4-meter-text");
    const meterBar = document.getElementById("a4-meter-bar");
    if (!contentWrapper || !meterText || !meterBar) return;

    // Printable height inside an A4 page (297mm total - 20mm print margins = 277mm)
    const maxPrintablePx = (ruler && ruler.offsetHeight > 0) ? ruler.offsetHeight : 1047;
    const currentContentPx = contentWrapper.offsetHeight;
    const pct = Math.round((currentContentPx / maxPrintablePx) * 100);

    meterBar.style.width = Math.min(pct, 100) + "%";
    if (breakLine) {
      breakLine.style.opacity = pct > 95 ? "1" : "0";
    }

    if (pct <= 96) {
      meterText.textContent = pct + "% of 1 A4 Page (Fits cleanly)";
      meterText.className = "text-xs font-semibold text-emerald-700";
      meterBar.className = "h-2 rounded-full transition-all bg-emerald-500";
    } else if (pct <= 100) {
      meterText.textContent = pct + "% of 1 A4 Page (Nearly full — fits 1 page)";
      meterText.className = "text-xs font-semibold text-amber-700";
      meterBar.className = "h-2 rounded-full transition-all bg-amber-500";
    } else {
      meterText.textContent = pct + "% (Spills onto Page 2)";
      meterText.className = "text-xs font-semibold text-red-600";
      meterBar.className = "h-2 rounded-full transition-all bg-red-500";
    }
  }

  function moveArrayItem(arr, fromIdx, toIdx) {
    if (toIdx < 0 || toIdx >= arr.length) return;
    const [item] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, item);
  }

  // Render the sidebar controls
  function renderControls() {
    const container = document.getElementById("customizer-controls");
    if (!container) return;

    container.innerHTML = "";

    // --- 1. Profile & Target Role Card ---
    const profileCard = document.createElement("div");
    profileCard.className = "bg-white border border-gray-200 rounded-lg p-3.5 shadow-sm space-y-2.5";
    profileCard.innerHTML = \`
      <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500">Header & Target Role</h3>
      <div>
        <label class="block text-xs font-medium text-gray-700 mb-1">Headline / Target Role (Markdown supported)</label>
        <input id="ctrl-profile-title" type="text" class="w-full text-xs border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-700 mb-1">Location</label>
        <input id="ctrl-profile-location" type="text" class="w-full text-xs border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div class="pt-1">
        <span class="block text-xs font-medium text-gray-700 mb-1">Contact Links</span>
        <div id="ctrl-contacts-list" class="space-y-1"></div>
      </div>
    \`;
    container.appendChild(profileCard);

    const titleInput = profileCard.querySelector("#ctrl-profile-title");
    titleInput.value = state.profile.title;
    titleInput.addEventListener("input", (e) => {
      state.profile.title = e.target.value;
      applyStateToPreview();
    });

    const locInput = profileCard.querySelector("#ctrl-profile-location");
    locInput.value = state.profile.location;
    locInput.addEventListener("input", (e) => {
      state.profile.location = e.target.value;
      applyStateToPreview();
    });

    const contactsListEl = profileCard.querySelector("#ctrl-contacts-list");
    state.profile.contacts.forEach((c, idx) => {
      const row = document.createElement("div");
      row.className = "flex items-center gap-2 text-xs";
      row.innerHTML = \`
        <input type="checkbox" class="rounded text-blue-600" \${c.enabled ? "checked" : ""} />
        <span class="text-gray-600 w-16 truncate font-medium">\${escapeHtml(c.alt)}</span>
        <input type="text" class="flex-1 border border-gray-200 rounded px-2 py-1 text-xs" />
      \`;
      const cb = row.querySelector('input[type="checkbox"]');
      const txt = row.querySelector('input[type="text"]');
      txt.value = c.text;
      cb.addEventListener("change", (e) => {
        c.enabled = e.target.checked;
        applyStateToPreview();
      });
      txt.addEventListener("input", (e) => {
        c.text = e.target.value;
        applyStateToPreview();
      });
      contactsListEl.appendChild(row);
    });

    // --- 2. Section Ordering & Visibility Card ---
    const secCard = document.createElement("div");
    secCard.className = "bg-white border border-gray-200 rounded-lg p-3.5 shadow-sm space-y-2";
    secCard.innerHTML = \`
      <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500">Section Order & Visibility</h3>
      <div id="ctrl-sections-list" class="space-y-1.5"></div>
    \`;
    container.appendChild(secCard);

    const secList = secCard.querySelector("#ctrl-sections-list");
    state.sections.forEach((sec, idx) => {
      const row = document.createElement("div");
      row.className = "flex items-center justify-between bg-gray-50 px-2.5 py-1.5 rounded border border-gray-200 text-xs";
      row.innerHTML = \`
        <label class="flex items-center gap-2 font-medium text-gray-800 cursor-pointer flex-1">
          <input type="checkbox" class="rounded text-blue-600" \${sec.enabled ? "checked" : ""} />
          <span>\${escapeHtml(sec.title)}</span>
        </label>
        <div class="flex items-center gap-1">
          <button type="button" data-dir="up" class="px-1.5 py-0.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded disabled:opacity-30" \${idx === 0 ? "disabled" : ""} title="Move Up">↑</button>
          <button type="button" data-dir="down" class="px-1.5 py-0.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded disabled:opacity-30" \${idx === state.sections.length - 1 ? "disabled" : ""} title="Move Down">↓</button>
        </div>
      \`;
      row.querySelector('input[type="checkbox"]').addEventListener("change", (e) => {
        sec.enabled = e.target.checked;
        applyStateToPreview();
      });
      row.querySelector('[data-dir="up"]').addEventListener("click", () => {
        moveArrayItem(state.sections, idx, idx - 1);
        renderControls();
        applyStateToPreview();
      });
      row.querySelector('[data-dir="down"]').addEventListener("click", () => {
        moveArrayItem(state.sections, idx, idx + 1);
        renderControls();
        applyStateToPreview();
      });
      secList.appendChild(row);
    });

    // --- 3. Summary Editor Card ---
    const sumCard = document.createElement("div");
    sumCard.className = "bg-white border border-gray-200 rounded-lg p-3.5 shadow-sm space-y-2";
    sumCard.innerHTML = \`
      <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500">Summary (Markdown)</h3>
      <textarea id="ctrl-summary-text" rows="4" class="w-full text-xs border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"></textarea>
    \`;
    container.appendChild(sumCard);
    const sumTextarea = sumCard.querySelector("#ctrl-summary-text");
    sumTextarea.value = state.summary.content;
    sumTextarea.addEventListener("input", (e) => {
      state.summary.content = e.target.value;
      applyStateToPreview();
    });

    // --- 4. Skills Card ---
    const skillsCard = document.createElement("div");
    skillsCard.className = "bg-white border border-gray-200 rounded-lg p-3.5 shadow-sm space-y-2.5";
    skillsCard.innerHTML = \`
      <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500">Skills & Tools</h3>
      <div id="ctrl-skills-items" class="space-y-2.5"></div>
    \`;
    container.appendChild(skillsCard);
    const skillsContainer = skillsCard.querySelector("#ctrl-skills-items");
    state.skills.forEach((sk, idx) => {
      const box = document.createElement("div");
      box.className = "p-2 bg-gray-50 rounded border border-gray-200 space-y-1.5";
      box.innerHTML = \`
        <div class="flex items-center justify-between">
          <label class="flex items-center gap-2 text-xs font-semibold text-gray-800 cursor-pointer">
            <input type="checkbox" class="rounded text-blue-600" \${sk.enabled ? "checked" : ""} />
            <span>\${escapeHtml(sk.category)}</span>
          </label>
          <div class="flex gap-1">
            <button type="button" data-dir="up" class="px-1 text-xs text-gray-500 hover:bg-gray-200 rounded" \${idx === 0 ? "disabled" : ""}>↑</button>
            <button type="button" data-dir="down" class="px-1 text-xs text-gray-500 hover:bg-gray-200 rounded" \${idx === state.skills.length - 1 ? "disabled" : ""}>↓</button>
          </div>
        </div>
        <input type="text" class="w-full text-xs border border-gray-300 rounded px-2 py-1 bg-white" />
      \`;
      box.querySelector('input[type="checkbox"]').addEventListener("change", (e) => {
        sk.enabled = e.target.checked;
        applyStateToPreview();
      });
      const input = box.querySelector('input[type="text"]');
      input.value = sk.items;
      input.addEventListener("input", (e) => {
        sk.items = e.target.value;
        applyStateToPreview();
      });
      box.querySelector('[data-dir="up"]').addEventListener("click", () => {
        moveArrayItem(state.skills, idx, idx - 1);
        renderControls();
        applyStateToPreview();
      });
      box.querySelector('[data-dir="down"]').addEventListener("click", () => {
        moveArrayItem(state.skills, idx, idx + 1);
        renderControls();
        applyStateToPreview();
      });
      skillsContainer.appendChild(box);
    });

    // --- 5. Experience Card ---
    const expCard = document.createElement("div");
    expCard.className = "bg-white border border-gray-200 rounded-lg p-3.5 shadow-sm space-y-2.5";
    expCard.innerHTML = \`
      <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500">Experience Items & Bullets</h3>
      <div id="ctrl-exp-items" class="space-y-3"></div>
    \`;
    container.appendChild(expCard);
    const expContainer = expCard.querySelector("#ctrl-exp-items");
    state.experience.forEach((exp, idx) => {
      const box = document.createElement("div");
      box.className = "p-2.5 bg-gray-50 rounded border border-gray-200 space-y-2";
      box.innerHTML = \`
        <div class="flex items-center justify-between">
          <label class="flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer">
            <input type="checkbox" class="rounded text-blue-600" \${exp.enabled ? "checked" : ""} />
            <span>\${escapeHtml(exp.role)} — \${escapeHtml(exp.company)}</span>
          </label>
          <div class="flex gap-1">
            <button type="button" data-dir="up" class="px-1 text-xs text-gray-500 hover:bg-gray-200 rounded" \${idx === 0 ? "disabled" : ""}>↑</button>
            <button type="button" data-dir="down" class="px-1 text-xs text-gray-500 hover:bg-gray-200 rounded" \${idx === state.experience.length - 1 ? "disabled" : ""}>↓</button>
          </div>
        </div>
        <div class="space-y-1.5 pl-4 border-l-2 border-gray-200" data-bullets></div>
      \`;
      box.querySelector('input[type="checkbox"]').addEventListener("change", (e) => {
        exp.enabled = e.target.checked;
        applyStateToPreview();
      });
      box.querySelector('[data-dir="up"]').addEventListener("click", () => {
        moveArrayItem(state.experience, idx, idx - 1);
        renderControls();
        applyStateToPreview();
      });
      box.querySelector('[data-dir="down"]').addEventListener("click", () => {
        moveArrayItem(state.experience, idx, idx + 1);
        renderControls();
        applyStateToPreview();
      });

      const bulletsDiv = box.querySelector("[data-bullets]");
      exp.highlights.forEach((h) => {
        const bRow = document.createElement("div");
        bRow.className = "flex items-start gap-1.5";
        bRow.innerHTML = \`
          <input type="checkbox" class="mt-1 rounded text-blue-600" \${h.enabled ? "checked" : ""} />
          <textarea rows="2" class="flex-1 text-[11px] border border-gray-300 rounded p-1.5 bg-white font-mono"></textarea>
        \`;
        bRow.querySelector('input[type="checkbox"]').addEventListener("change", (e) => {
          h.enabled = e.target.checked;
          applyStateToPreview();
        });
        const ta = bRow.querySelector("textarea");
        ta.value = h.text;
        ta.addEventListener("input", (e) => {
          h.text = e.target.value;
          applyStateToPreview();
        });
        bulletsDiv.appendChild(bRow);
      });

      expContainer.appendChild(box);
    });

    // --- 6. Projects Card ---
    const projCard = document.createElement("div");
    projCard.className = "bg-white border border-gray-200 rounded-lg p-3.5 shadow-sm space-y-2.5";
    projCard.innerHTML = \`
      <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500">Projects & Bullets</h3>
      <div id="ctrl-proj-items" class="space-y-3"></div>
    \`;
    container.appendChild(projCard);
    const projContainer = projCard.querySelector("#ctrl-proj-items");
    state.projects.forEach((proj, idx) => {
      const box = document.createElement("div");
      box.className = "p-2.5 bg-gray-50 rounded border border-gray-200 space-y-2";
      box.innerHTML = \`
        <div class="flex items-center justify-between">
          <label class="flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer">
            <input type="checkbox" class="rounded text-blue-600" \${proj.enabled ? "checked" : ""} />
            <span>\${escapeHtml(proj.name)}</span>
          </label>
          <div class="flex gap-1">
            <button type="button" data-dir="up" class="px-1 text-xs text-gray-500 hover:bg-gray-200 rounded" \${idx === 0 ? "disabled" : ""}>↑</button>
            <button type="button" data-dir="down" class="px-1 text-xs text-gray-500 hover:bg-gray-200 rounded" \${idx === state.projects.length - 1 ? "disabled" : ""}>↓</button>
          </div>
        </div>
        <div class="space-y-1.5 pl-4 border-l-2 border-gray-200" data-bullets></div>
      \`;
      box.querySelector('input[type="checkbox"]').addEventListener("change", (e) => {
        proj.enabled = e.target.checked;
        applyStateToPreview();
      });
      box.querySelector('[data-dir="up"]').addEventListener("click", () => {
        moveArrayItem(state.projects, idx, idx - 1);
        renderControls();
        applyStateToPreview();
      });
      box.querySelector('[data-dir="down"]').addEventListener("click", () => {
        moveArrayItem(state.projects, idx, idx + 1);
        renderControls();
        applyStateToPreview();
      });

      const bulletsDiv = box.querySelector("[data-bullets]");
      proj.highlights.forEach((h) => {
        const bRow = document.createElement("div");
        bRow.className = "flex items-start gap-1.5";
        bRow.innerHTML = \`
          <input type="checkbox" class="mt-1 rounded text-blue-600" \${h.enabled ? "checked" : ""} />
          <textarea rows="2" class="flex-1 text-[11px] border border-gray-300 rounded p-1.5 bg-white font-mono"></textarea>
        \`;
        bRow.querySelector('input[type="checkbox"]').addEventListener("change", (e) => {
          h.enabled = e.target.checked;
          applyStateToPreview();
        });
        const ta = bRow.querySelector("textarea");
        ta.value = h.text;
        ta.addEventListener("input", (e) => {
          h.text = e.target.value;
          applyStateToPreview();
        });
        bulletsDiv.appendChild(bRow);
      });

      projContainer.appendChild(box);
    });

    // --- 7. Education Card ---
    const eduCard = document.createElement("div");
    eduCard.className = "bg-white border border-gray-200 rounded-lg p-3.5 shadow-sm space-y-2.5";
    eduCard.innerHTML = \`
      <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500">Education Details</h3>
      <div id="ctrl-edu-items" class="space-y-2.5"></div>
    \`;
    container.appendChild(eduCard);
    const eduContainer = eduCard.querySelector("#ctrl-edu-items");
    state.education.forEach((ed) => {
      const box = document.createElement("div");
      box.className = "p-2.5 bg-gray-50 rounded border border-gray-200 space-y-2";
      box.innerHTML = \`
        <label class="flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer">
          <input type="checkbox" class="rounded text-blue-600" \${ed.enabled ? "checked" : ""} />
          <span>\${escapeHtml(ed.degree)} — \${escapeHtml(ed.institution)}</span>
        </label>
        <div class="space-y-1.5 pl-4 border-l-2 border-gray-200" data-details></div>
      \`;
      box.querySelector('input[type="checkbox"]').addEventListener("change", (e) => {
        ed.enabled = e.target.checked;
        applyStateToPreview();
      });

      const detailsDiv = box.querySelector("[data-details]");
      ed.details.forEach((d) => {
        const dRow = document.createElement("div");
        dRow.className = "flex items-start gap-1.5";
        dRow.innerHTML = \`
          <input type="checkbox" class="mt-1 rounded text-blue-600" \${d.enabled ? "checked" : ""} />
          <textarea rows="2" class="flex-1 text-[11px] border border-gray-300 rounded p-1.5 bg-white font-mono"></textarea>
        \`;
        dRow.querySelector('input[type="checkbox"]').addEventListener("change", (e) => {
          d.enabled = e.target.checked;
          applyStateToPreview();
        });
        const ta = dRow.querySelector("textarea");
        ta.value = d.text;
        ta.addEventListener("input", (e) => {
          d.text = e.target.value;
          applyStateToPreview();
        });
        detailsDiv.appendChild(dRow);
      });
      eduContainer.appendChild(box);
    });
  }

  // Presets Management
  function getPresets() {
    try {
      return JSON.parse(localStorage.getItem(PRESETS_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function savePreset(name) {
    if (!name) return;
    const presets = getPresets();
    presets[name] = state;
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
    renderPresetOptions();
  }

  function renderPresetOptions() {
    const select = document.getElementById("preset-select");
    if (!select) return;
    const presets = getPresets();
    const names = Object.keys(presets);
    select.innerHTML = '<option value="">-- Load Saved JD Preset --</option>' +
      names.map(n => '<option value="' + escapeHtml(n) + '">' + escapeHtml(n) + '</option>').join("");
  }

  // Top action buttons
  document.getElementById("btn-print")?.addEventListener("click", () => {
    window.print();
  });

  document.getElementById("btn-reset")?.addEventListener("click", () => {
    if (confirm("Reset all customizations back to default TOML content?")) {
      state = createDefaultState();
      localStorage.removeItem(STORAGE_KEY);
      renderControls();
      applyStateToPreview();
    }
  });

  document.getElementById("btn-save-preset")?.addEventListener("click", () => {
    const name = prompt("Enter a name for this tailored preset (e.g. 'Backend Go Role', 'DevOps Role'):");
    if (name && name.trim()) {
      savePreset(name.trim());
    }
  });

  document.getElementById("preset-select")?.addEventListener("change", (e) => {
    const name = e.target.value;
    if (!name) return;
    const presets = getPresets();
    if (presets[name]) {
      state = JSON.parse(JSON.stringify(presets[name]));
      renderControls();
      applyStateToPreview();
    }
  });

  // Initialize
  renderPresetOptions();
  renderControls();
  applyStateToPreview();
  window.addEventListener("resize", updatePageMeter);
})();
</script>`;
}
