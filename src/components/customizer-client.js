(() => {
  const initialData = JSON.parse(document.getElementById("resume-initial-data").textContent);
  const STORAGE_KEY = "resume_customizer_state_v1";
  const PRESETS_KEY = "resume_customizer_presets_v1";

  let activeTab = "all";

  // Six-dot drag handle SVG icon
  const DRAG_HANDLE_SVG = [
    '<svg class="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors flex-shrink-0 cursor-grab active:cursor-grabbing" viewBox="0 0 20 20" fill="currentColor">',
    '<path d="M7 4a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM7 10a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM7 16a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM16 4a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM16 10a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM16 16a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />',
    '</svg>'
  ].join("");

  // Modern toggle switch helper
  function renderToggleHtml(checked) {
    return [
      '<label class="relative inline-flex items-center cursor-pointer flex-shrink-0">',
      '<input type="checkbox" class="sr-only peer" ' + (checked ? "checked" : "") + ' />',
      '<div class="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[\'\'] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>',
      '</label>'
    ].join("");
  }

  // Client-side Markdown renderer matching src/utils/markdown.ts
  function escapeHtml(text) {
    return String(text || "")
      .replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[a-fA-F\d]+);)/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderInlineMarkdown(text) {
    if (!text) return "";
    let html = escapeHtml(text);
    const codeSpans = [];
    html = html.replace(/`([^`]+)`/g, (_, code) => {
      const ph = "\x00CODE_" + codeSpans.length + "\x00";
      codeSpans.push('<code class="px-1 py-0.5 bg-gray-100 rounded text-[0.9em] font-mono print:bg-transparent print:px-0">' + code + '</code>');
      return ph;
    });
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
      const isMailOrTel = url.startsWith("mailto:") || url.startsWith("tel:");
      const target = isMailOrTel ? "" : ' target="_blank" rel="noopener noreferrer"';
      return '<a href="' + url + '"' + target + ' class="text-blue-600 underline">' + label + '</a>';
    });
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");
    html = html.replace(/\*(?!\s)(.+?)(?<!\s)\*/g, "<em>$1</em>");
    html = html.replace(/(^|\s)_(?!\s)(.+?)(?<!\s)_(?=$|\s|[.,!?;:])/g, "$1<em>$2</em>");
    html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");
    html = html.replace(/\x00CODE_(\d+)\x00/g, (_, idx) => codeSpans[Number(idx)] || "");
    return html;
  }

  function renderBlockMarkdown(text) {
    if (!text) return "";
    const lines = String(text).trim().split(/\r?\n/);
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
      const m = line.match(/^[-*]\s+(.*)$/);
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
    return blocks.join("\n");
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
      const parsed = JSON.parse(saved);
      if (parsed && parsed.sections && parsed.profile) {
        state = parsed;
      }
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
      const ulEl = document.querySelector('[data-exp-highlights-list="' + idx + '"]');

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
          if (ulEl) ulEl.appendChild(hEl);
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
      const ulEl = document.querySelector('[data-proj-highlights-list="' + idx + '"]');

      if (li) {
        li.classList.toggle("hidden", !proj.enabled);
        if (projListEl) projListEl.appendChild(li);
      }
      if (nameEl) nameEl.innerHTML = renderInlineMarkdown(proj.name);
      if (perEl) perEl.innerHTML = renderInlineMarkdown(proj.period);

      proj.highlights.forEach((h) => {
        const hEl = document.querySelector('[data-proj-highlight="' + idx + '-' + h.originalIndex + '"]');
        if (hEl) {
          hEl.classList.toggle("hidden", !h.enabled);
          hEl.innerHTML = renderInlineMarkdown(h.text);
          if (ulEl) ulEl.appendChild(hEl);
        }
      });

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
        if (ulEl) ulEl.appendChild(repoEl);
      }
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

    saveState();
  }

  // Reusable HTML5 Drag & Drop Sortable List Binding
  function makeSortableList(containerEl, arrayRef, onReorder) {
    let draggedIndex = null;

    const children = Array.from(containerEl.children);
    children.forEach((child, idx) => {
      child.classList.add("draggable-item");
      const handle = child.querySelector("[data-drag-handle]");

      // Only allow dragging when grabbing the handle (prevents interference with text inputs!)
      if (handle) {
        handle.addEventListener("mousedown", () => {
          child.setAttribute("draggable", "true");
        });
        handle.addEventListener("mouseup", () => {
          child.setAttribute("draggable", "false");
        });
      } else {
        child.setAttribute("draggable", "true");
      }

      child.addEventListener("dragstart", (e) => {
        e.stopPropagation();
        draggedIndex = idx;
        child.classList.add("dragging");
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", String(idx));
        }
      });

      child.addEventListener("dragend", (e) => {
        e.stopPropagation();
        child.classList.remove("dragging");
        if (handle) child.setAttribute("draggable", "false");
        children.forEach((c) => c.classList.remove("drag-over-top", "drag-over-bottom"));
        draggedIndex = null;
      });

      child.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (draggedIndex === null || draggedIndex === idx) return;

        const rect = child.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        children.forEach((c) => c.classList.remove("drag-over-top", "drag-over-bottom"));
        if (e.clientY < midY) {
          child.classList.add("drag-over-top");
        } else {
          child.classList.add("drag-over-bottom");
        }
      });

      child.addEventListener("dragleave", (e) => {
        e.stopPropagation();
        child.classList.remove("drag-over-top", "drag-over-bottom");
      });

      child.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        children.forEach((c) => c.classList.remove("drag-over-top", "drag-over-bottom"));
        if (draggedIndex === null || draggedIndex === idx) return;

        const rect = child.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        let targetIndex = e.clientY < midY ? idx : idx + 1;
        if (draggedIndex < targetIndex) {
          targetIndex -= 1;
        }

        if (draggedIndex !== targetIndex) {
          const [moved] = arrayRef.splice(draggedIndex, 1);
          arrayRef.splice(targetIndex, 0, moved);
          onReorder();
        }
      });
    });
  }

  // Render Filter Tabs at top of sidebar
  function renderTabs() {
    const tabBar = document.getElementById("customizer-tabs");
    if (!tabBar) return;

    const tabs = [
      { id: "all", label: "All" },
      { id: "sections", label: "Layout" },
      { id: "profile", label: "Profile" },
      { id: "summary", label: "Summary" },
      { id: "skills", label: "Skills" },
      { id: "experience", label: "Experience" },
      { id: "projects", label: "Projects" },
      { id: "education", label: "Education" }
    ];

    tabBar.innerHTML = tabs
      .map((t) => {
        const isActive = activeTab === t.id;
        const cls = isActive
          ? "bg-indigo-600 text-white shadow-xs font-semibold"
          : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-medium";
        return '<button type="button" data-tab="' + t.id + '" class="px-2.5 py-1 rounded-md text-xs transition-all whitespace-nowrap ' + cls + '">' + t.label + '</button>';
      })
      .join("");

    tabBar.querySelectorAll("button[data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeTab = btn.getAttribute("data-tab") || "all";
        renderTabs();
        renderControls();
      });
    });
  }

  // Render the sidebar controls
  function renderControls() {
    const container = document.getElementById("customizer-controls");
    if (!container) return;

    container.innerHTML = "";
    const show = (id) => activeTab === "all" || activeTab === id;

    // --- 1. Section Ordering & Visibility Card (Drag & Drop) ---
    if (show("sections")) {
      const secCard = document.createElement("div");
      secCard.className = "bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs space-y-3";
      secCard.innerHTML =
        '<div class="flex items-center justify-between">' +
          '<h3 class="text-xs font-bold uppercase tracking-wider text-slate-500">Section Order & Visibility</h3>' +
          '<span class="text-[11px] text-slate-400">Drag handle to reorder</span>' +
        '</div>' +
        '<div id="ctrl-sections-list" class="space-y-1.5"></div>';
      container.appendChild(secCard);

      const secList = secCard.querySelector("#ctrl-sections-list");
      state.sections.forEach((sec) => {
        const row = document.createElement("div");
        row.className = "group flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 px-3 py-2 rounded-lg border border-slate-200/80 text-xs select-none";
        row.innerHTML =
          '<div class="flex items-center gap-2.5 flex-1">' +
            '<span data-drag-handle title="Drag to reorder">' + DRAG_HANDLE_SVG + '</span>' +
            '<span class="font-semibold text-slate-800">' + escapeHtml(sec.title) + '</span>' +
          '</div>' +
          renderToggleHtml(sec.enabled);
        row.querySelector('input[type="checkbox"]').addEventListener("change", (e) => {
          sec.enabled = e.target.checked;
          applyStateToPreview();
        });
        secList.appendChild(row);
      });

      makeSortableList(secList, state.sections, () => {
        renderControls();
        applyStateToPreview();
      });
    }

    // --- 2. Profile & Target Role Card ---
    if (show("profile")) {
      const profileCard = document.createElement("div");
      profileCard.className = "bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs space-y-3";
      profileCard.innerHTML =
        '<h3 class="text-xs font-bold uppercase tracking-wider text-slate-500">Header & Target Role</h3>' +
        '<div class="space-y-2.5">' +
          '<div>' +
            '<label class="block text-[11px] font-semibold text-slate-600 mb-1">Target Role / Headline (Markdown)</label>' +
            '<input id="ctrl-profile-title" type="text" class="w-full text-xs text-slate-900 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all" />' +
          '</div>' +
          '<div>' +
            '<label class="block text-[11px] font-semibold text-slate-600 mb-1">Location</label>' +
            '<input id="ctrl-profile-location" type="text" class="w-full text-xs text-slate-900 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all" />' +
          '</div>' +
          '<div class="pt-1">' +
            '<span class="block text-[11px] font-semibold text-slate-600 mb-1.5">Contact Channels</span>' +
            '<div id="ctrl-contacts-list" class="space-y-1.5"></div>' +
          '</div>' +
        '</div>';
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
      state.profile.contacts.forEach((c) => {
        const row = document.createElement("div");
        row.className = "flex items-center gap-2.5 text-xs bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/70";
        row.innerHTML =
          renderToggleHtml(c.enabled) +
          '<span class="text-slate-600 w-16 truncate font-medium">' + escapeHtml(c.alt) + '</span>' +
          '<input type="text" class="flex-1 text-slate-900 bg-white border border-slate-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-indigo-500" />';
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
    }

    // --- 3. Summary Editor Card ---
    if (show("summary")) {
      const sumCard = document.createElement("div");
      sumCard.className = "bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs space-y-2.5";
      sumCard.innerHTML =
        '<div class="flex items-center justify-between">' +
          '<h3 class="text-xs font-bold uppercase tracking-wider text-slate-500">Professional Summary</h3>' +
          '<span class="text-[11px] text-slate-400">Supports **bold**, *italic*, [links](url)</span>' +
        '</div>' +
        '<textarea id="ctrl-summary-text" rows="4" class="w-full text-xs text-slate-900 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 font-mono leading-relaxed transition-all"></textarea>';
      container.appendChild(sumCard);
      const sumTextarea = sumCard.querySelector("#ctrl-summary-text");
      sumTextarea.value = state.summary.content;
      sumTextarea.addEventListener("input", (e) => {
        state.summary.content = e.target.value;
        applyStateToPreview();
      });
    }

    // --- 4. Skills Card (Drag & Drop) ---
    if (show("skills")) {
      const skillsCard = document.createElement("div");
      skillsCard.className = "bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs space-y-3";
      skillsCard.innerHTML =
        '<div class="flex items-center justify-between">' +
          '<h3 class="text-xs font-bold uppercase tracking-wider text-slate-500">Skills & Tools</h3>' +
          '<span class="text-[11px] text-slate-400">Drag to reorder</span>' +
        '</div>' +
        '<div id="ctrl-skills-items" class="space-y-2"></div>';
      container.appendChild(skillsCard);
      const skillsContainer = skillsCard.querySelector("#ctrl-skills-items");
      state.skills.forEach((sk) => {
        const box = document.createElement("div");
        box.className = "group p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 space-y-2";
        box.innerHTML =
          '<div class="flex items-center justify-between gap-2">' +
            '<div class="flex items-center gap-2">' +
              '<span data-drag-handle title="Drag to reorder">' + DRAG_HANDLE_SVG + '</span>' +
              '<span class="text-xs font-semibold text-slate-800">' + escapeHtml(sk.category) + '</span>' +
            '</div>' +
            renderToggleHtml(sk.enabled) +
          '</div>' +
          '<input type="text" class="w-full text-xs text-slate-900 border border-slate-200 rounded-md px-2.5 py-1.5 bg-white focus:outline-none focus:border-indigo-500" />';
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
        skillsContainer.appendChild(box);
      });

      makeSortableList(skillsContainer, state.skills, () => {
        renderControls();
        applyStateToPreview();
      });
    }

    // --- 5. Experience Card (Drag & Drop Items & Bullets) ---
    if (show("experience")) {
      const expCard = document.createElement("div");
      expCard.className = "bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs space-y-3";
      expCard.innerHTML =
        '<div class="flex items-center justify-between">' +
          '<h3 class="text-xs font-bold uppercase tracking-wider text-slate-500">Experience</h3>' +
          '<span class="text-[11px] text-slate-400">Drag roles or bullets</span>' +
        '</div>' +
        '<div id="ctrl-exp-items" class="space-y-3"></div>';
      container.appendChild(expCard);
      const expContainer = expCard.querySelector("#ctrl-exp-items");
      state.experience.forEach((exp) => {
        const box = document.createElement("div");
        box.className = "group p-3 bg-slate-50 rounded-xl border border-slate-200/90 space-y-2.5";
        box.innerHTML =
          '<div class="flex items-center justify-between gap-2">' +
            '<div class="flex items-center gap-2 min-w-0">' +
              '<span data-drag-handle title="Drag role to reorder">' + DRAG_HANDLE_SVG + '</span>' +
              '<div class="truncate">' +
                '<span class="text-xs font-bold text-slate-800">' + escapeHtml(exp.role) + '</span>' +
                '<span class="text-[11px] text-slate-500"> · ' + escapeHtml(exp.company) + '</span>' +
              '</div>' +
            '</div>' +
            renderToggleHtml(exp.enabled) +
          '</div>' +
          '<div class="space-y-1.5 pl-3 border-l-2 border-indigo-200/70" data-bullets></div>';
        box.querySelector('input[type="checkbox"]').addEventListener("change", (e) => {
          exp.enabled = e.target.checked;
          applyStateToPreview();
        });

        const bulletsDiv = box.querySelector("[data-bullets]");
        exp.highlights.forEach((h) => {
          const bRow = document.createElement("div");
          bRow.className = "group/bullet flex items-start gap-2 bg-white p-2 rounded-lg border border-slate-200/80";
          bRow.innerHTML =
            '<span data-drag-handle class="mt-1" title="Drag bullet to reorder">' + DRAG_HANDLE_SVG + '</span>' +
            '<textarea rows="2" class="flex-1 text-[11px] text-slate-900 border border-transparent focus:border-slate-200 rounded p-1 bg-transparent focus:bg-slate-50 font-mono leading-relaxed focus:outline-none"></textarea>' +
            '<div class="mt-1">' + renderToggleHtml(h.enabled) + '</div>';
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

        makeSortableList(bulletsDiv, exp.highlights, () => {
          renderControls();
          applyStateToPreview();
        });

        expContainer.appendChild(box);
      });

      makeSortableList(expContainer, state.experience, () => {
        renderControls();
        applyStateToPreview();
      });
    }

    // --- 6. Projects Card (Drag & Drop Items & Bullets) ---
    if (show("projects")) {
      const projCard = document.createElement("div");
      projCard.className = "bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs space-y-3";
      projCard.innerHTML =
        '<div class="flex items-center justify-between">' +
          '<h3 class="text-xs font-bold uppercase tracking-wider text-slate-500">Projects</h3>' +
          '<span class="text-[11px] text-slate-400">Drag projects or bullets</span>' +
        '</div>' +
        '<div id="ctrl-proj-items" class="space-y-3"></div>';
      container.appendChild(projCard);
      const projContainer = projCard.querySelector("#ctrl-proj-items");
      state.projects.forEach((proj) => {
        const box = document.createElement("div");
        box.className = "group p-3 bg-slate-50 rounded-xl border border-slate-200/90 space-y-2.5";
        box.innerHTML =
          '<div class="flex items-center justify-between gap-2">' +
            '<div class="flex items-center gap-2 min-w-0">' +
              '<span data-drag-handle title="Drag project to reorder">' + DRAG_HANDLE_SVG + '</span>' +
              '<span class="text-xs font-bold text-slate-800 truncate">' + escapeHtml(proj.name) + '</span>' +
            '</div>' +
            renderToggleHtml(proj.enabled) +
          '</div>' +
          '<div class="space-y-1.5 pl-3 border-l-2 border-indigo-200/70" data-bullets></div>';
        box.querySelector('input[type="checkbox"]').addEventListener("change", (e) => {
          proj.enabled = e.target.checked;
          applyStateToPreview();
        });

        const bulletsDiv = box.querySelector("[data-bullets]");
        proj.highlights.forEach((h) => {
          const bRow = document.createElement("div");
          bRow.className = "group/bullet flex items-start gap-2 bg-white p-2 rounded-lg border border-slate-200/80";
          bRow.innerHTML =
            '<span data-drag-handle class="mt-1" title="Drag bullet to reorder">' + DRAG_HANDLE_SVG + '</span>' +
            '<textarea rows="2" class="flex-1 text-[11px] text-slate-900 border border-transparent focus:border-slate-200 rounded p-1 bg-transparent focus:bg-slate-50 font-mono leading-relaxed focus:outline-none"></textarea>' +
            '<div class="mt-1">' + renderToggleHtml(h.enabled) + '</div>';
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

        makeSortableList(bulletsDiv, proj.highlights, () => {
          renderControls();
          applyStateToPreview();
        });

        projContainer.appendChild(box);
      });

      makeSortableList(projContainer, state.projects, () => {
        renderControls();
        applyStateToPreview();
      });
    }

    // --- 7. Education Card ---
    if (show("education")) {
      const eduCard = document.createElement("div");
      eduCard.className = "bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs space-y-3";
      eduCard.innerHTML =
        '<h3 class="text-xs font-bold uppercase tracking-wider text-slate-500">Education Details</h3>' +
        '<div id="ctrl-edu-items" class="space-y-2.5"></div>';
      container.appendChild(eduCard);
      const eduContainer = eduCard.querySelector("#ctrl-edu-items");
      state.education.forEach((ed) => {
        const box = document.createElement("div");
        box.className = "p-3 bg-slate-50 rounded-xl border border-slate-200/90 space-y-2.5";
        box.innerHTML =
          '<div class="flex items-center justify-between gap-2">' +
            '<span class="text-xs font-bold text-slate-800">' + escapeHtml(ed.degree) + ' — ' + escapeHtml(ed.institution) + '</span>' +
            renderToggleHtml(ed.enabled) +
          '</div>' +
          '<div class="space-y-1.5 pl-3 border-l-2 border-indigo-200/70" data-details></div>';
        box.querySelector('input[type="checkbox"]').addEventListener("change", (e) => {
          ed.enabled = e.target.checked;
          applyStateToPreview();
        });

        const detailsDiv = box.querySelector("[data-details]");
        ed.details.forEach((d) => {
          const dRow = document.createElement("div");
          dRow.className = "flex items-start gap-2 bg-white p-2 rounded-lg border border-slate-200/80";
          dRow.innerHTML =
            '<textarea rows="2" class="flex-1 text-[11px] text-slate-900 border border-transparent focus:border-slate-200 rounded p-1 bg-transparent focus:bg-slate-50 font-mono leading-relaxed focus:outline-none"></textarea>' +
            '<div class="mt-1">' + renderToggleHtml(d.enabled) + '</div>';
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
    select.innerHTML = '<option value="">Load JD Preset...</option>' +
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
  renderTabs();
  renderControls();
  applyStateToPreview();
})();
