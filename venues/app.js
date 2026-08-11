(function () {
  "use strict";

  const API_URL = String(window.WEDDING_API_URL || "").replace(/\/$/, "");
  const FACTORS = [
    {
      key: "it",
      name: "IT Factor",
      shortName: "IT",
      icon: "✦",
      className: "factor-it",
      description: "Will guests understand why they flew 7,500 miles to be here?",
    },
    {
      key: "vip",
      name: "VIP Factor",
      shortName: "VIP",
      icon: "😎",
      className: "factor-vip",
      description: "Will the service, hospitality, and comfort make everyone feel like a VIP?",
    },
    {
      key: "food",
      name: "Food Factor",
      shortName: "Food",
      icon: "🥟",
      className: "factor-food",
      description: "Will people still be talking about the food after the last samosa?",
    },
    {
      key: "heavy",
      name: "Heavy Metal Factor",
      shortName: "Heavy Metal",
      icon: "🎸",
      className: "factor-heavy",
      description: "Can it handle a real party—dance floor, acoustics, AV, power, curfew, and late-night indoors?",
    },
    {
      key: "easy",
      name: "Easy Factor",
      shortName: "Easy",
      icon: "✈️",
      className: "factor-easy",
      description: "How easy is the full guest journey—arrival, buses, accessibility, rooms, and getting around?",
    },
  ];
  const NOTE_PROMPTS = [
    "Room amenities you liked?",
    "Service that went above and beyond?",
    "Cool touches?",
    "Unique things that are possible here?",
  ];
  const RETIRED_VENUE_IDS = new Set(["jaipur-shiv-vilas"]);
  const ADMIN_PROFILE_KEYS = new Set(["anand", "sara"]);
  const KNOWN_PEOPLE = [
    { name: "Anand", aliases: ["Anand", "Anand Shah"] },
    { name: "Sara", aliases: ["Sara"] },
    { name: "Vipul", aliases: ["Vipul", "Vipul Shah"] },
    { name: "Reshma", aliases: ["Reshma", "Reshma Shah"] },
    { name: "Amit", aliases: ["Amit", "Amit Shah", "Amit Salecha"] },
    { name: "Ujjawal", aliases: ["Ujjawal", "Ujjawal Shah", "Ujjawal Salecha"] },
    { name: "Raja", aliases: ["Raja", "Raja Shah", "Hardik", "Hardik Shah"] },
    { name: "Rahul", aliases: ["Rahul", "Rahul Jain"] },
    { name: "Savita", aliases: ["Savita", "Savita Jain"] },
    { name: "Namrata", aliases: ["Namrata", "Namrata Rajgarhia"] },
  ];
  const SEED_VENUES = [
    { id: "jaipur-anantara-jewel-bagh", name: "Anantara Jewel Bagh", city: "Jaipur", sortOrder: 10 },
    { id: "jaipur-taj-devi-ratn", name: "Taj Devi Ratn", city: "Jaipur", sortOrder: 20 },
    { id: "jaipur-itc-rajputana", name: "ITC Rajputana", city: "Jaipur", sortOrder: 30 },
    { id: "jaipur-leela-palace", name: "The Leela Palace Jaipur", city: "Jaipur", sortOrder: 32 },
    { id: "kumbhalgarh-raajsa-resort", name: "Raajsa Resort Kumbhalgarh", city: "Kumbhalgarh", sortOrder: 35 },
    { id: "udaipur-trident", name: "Trident, Udaipur", city: "Udaipur", sortOrder: 40 },
    { id: "udaipur-taj-lalit-bagh", name: "Taj Lalit Bagh", city: "Udaipur", sortOrder: 50 },
    { id: "udaipur-fateh-collection", name: "Fateh Collection", city: "Udaipur", sortOrder: 60 },
    { id: "udaipur-aurika", name: "Aurika, Udaipur", city: "Udaipur", sortOrder: 70 },
    { id: "udaipur-wyndham-grand-fateh-sagar", name: "Wyndham Grand Udaipur Fateh Sagar Lake", city: "Udaipur", sortOrder: 80 },
  ];
  const STORAGE = {
    profile: "venue-scout:v1:profile",
    venues: "venue-scout:v1:venues",
    drafts: "venue-scout:v1:drafts",
    noteDrafts: "venue-scout:v1:note-drafts",
    outbox: "venue-scout:v1:outbox",
    state: "venue-scout:v1:remote-state",
  };
  const DEFAULT_METHOD = "Each factor is weighted equally. N/A scores are excluded; available factor averages are averaged for the overall score.";
  const ADMIN_PIN_STORAGE = "venue-scout:admin-pin";

  const elements = {
    loginView: document.getElementById("login-view"),
    appView: document.getElementById("app-view"),
    loginForm: document.getElementById("login-form"),
    nameInput: document.getElementById("name-input"),
    loginError: document.getElementById("login-error"),
    suggestion: document.getElementById("name-suggestion"),
    suggestedName: document.getElementById("suggested-name"),
    acceptSuggestion: document.getElementById("accept-suggestion"),
    keepName: document.getElementById("keep-name"),
    main: document.getElementById("main-content"),
    bottomNav: document.getElementById("bottom-nav"),
    adminNotesNav: document.getElementById("admin-notes-nav"),
    profileButton: document.getElementById("profile-button"),
    profileInitial: document.getElementById("profile-initial"),
    brandButton: document.getElementById("brand-button"),
    syncStatus: document.getElementById("sync-status"),
    offlineBanner: document.getElementById("offline-banner"),
    offlineCopy: document.getElementById("offline-copy"),
    dialog: document.getElementById("add-venue-dialog"),
    addVenueForm: document.getElementById("add-venue-form"),
    venueName: document.getElementById("venue-name"),
    venueCity: document.getElementById("venue-city"),
    venueError: document.getElementById("venue-error"),
    venueSuggestion: document.getElementById("venue-suggestion"),
    toast: document.getElementById("toast"),
  };

  const cachedRemote = readJSON(STORAGE.state, {});
  const state = {
    profile: readJSON(STORAGE.profile, null),
    venues: mergeSeedVenues(readJSON(STORAGE.venues, [])),
    submissions: indexBy(cachedRemote.ownSubmissions || [], "venueId"),
    notes: indexBy(cachedRemote.ownNotes || [], "venueId"),
    results: indexBy(cachedRemote.results || [], "venueId"),
    adminNotes: Array.isArray(cachedRemote.adminNotes) ? cachedRemote.adminNotes : [],
    adminPin: readAdminPin(),
    adminParticipation: null,
    adminExport: null,
    adminMutating: false,
    method: cachedRemote.method || DEFAULT_METHOD,
    screen: "venues",
    selectedVenueId: null,
    loading: false,
    syncing: false,
    submitting: false,
    pendingName: "",
    toastTimer: null,
    noteSyncTimer: null,
    storageError: false,
  };

  function readAdminPin() {
    try { return sessionStorage.getItem(ADMIN_PIN_STORAGE) || ""; } catch { return ""; }
  }

  function isAdminProfile(profile = state.profile) {
    return Boolean(profile?.key && ADMIN_PROFILE_KEYS.has(profile.key));
  }

  function saveAdminPin(value) {
    try {
      if (value) sessionStorage.setItem(ADMIN_PIN_STORAGE, value);
      else sessionStorage.removeItem(ADMIN_PIN_STORAGE);
    } catch { /* Session storage may be unavailable. */ }
  }

  function readJSON(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function indexBy(items, key) {
    return items.reduce((result, item) => {
      if (item && item[key]) result[item[key]] = item;
      return result;
    }, {});
  }

  function mergeSeedVenues(items) {
    const merged = new Map((Array.isArray(items) ? items : [])
      .filter((venue) => !RETIRED_VENUE_IDS.has(venue.id))
      .map((venue) => [venue.id, venue]));
    SEED_VENUES.forEach((venue) => {
      merged.set(venue.id, { ...(merged.get(venue.id) || {}), ...venue });
    });
    return [...merged.values()];
  }

  function cleanName(value) {
    return String(value || "").normalize("NFKC").trim().replace(/\s+/g, " ").slice(0, 50);
  }

  function normalizeKey(value) {
    return cleanName(value)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }

  function titleCase(value) {
    return cleanName(value).toLowerCase().replace(/(^|[\s-])\p{L}/gu, (letter) => letter.toUpperCase());
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    })[character]);
  }

  function levenshtein(first, second) {
    if (first === second) return 0;
    if (!first.length) return second.length;
    if (!second.length) return first.length;
    let previous = Array.from({ length: second.length + 1 }, (_, index) => index);
    for (let row = 1; row <= first.length; row += 1) {
      const current = [row];
      for (let column = 1; column <= second.length; column += 1) {
        current[column] = Math.min(
          current[column - 1] + 1,
          previous[column] + 1,
          previous[column - 1] + (first[row - 1] === second[column - 1] ? 0 : 1),
        );
      }
      previous = current;
    }
    return previous[second.length];
  }

  function nameMatch(value) {
    const normalizedKey = normalizeKey(value);
    const exact = KNOWN_PEOPLE.find((person) => person.aliases.some((alias) => normalizeKey(alias) === normalizedKey));
    if (exact) return { exact: exact.name };
    const ranked = KNOWN_PEOPLE
      .map((person) => ({
        name: person.name,
        distance: Math.min(...person.aliases.map((alias) => levenshtein(normalizedKey, normalizeKey(alias)))),
      }))
      .sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name));
    const best = ranked[0];
    const threshold = normalizedKey.length >= 6 ? 2 : 1;
    if (best && best.distance <= threshold && (!ranked[1] || ranked[1].distance > best.distance)) return { suggestion: best.name };
    return {};
  }

  function venueMatch(name, city) {
    const target = normalizeKey(name);
    const cityKey = normalizeKey(city);
    const candidates = state.venues.filter((venue) => normalizeKey(venue.city) === cityKey);
    const exact = candidates.find((venue) => normalizeKey(venue.name) === target);
    if (exact) return exact;
    const ranked = candidates
      .map((venue) => ({ venue, distance: levenshtein(target, normalizeKey(venue.name)) }))
      .sort((a, b) => a.distance - b.distance);
    return ranked[0] && ranked[0].distance <= (target.length >= 8 ? 2 : 1) ? ranked[0].venue : null;
  }

  function draftId(venueId) {
    return `${state.profile.key}:${venueId}`;
  }

  function getDraft(venueId) {
    return readJSON(STORAGE.drafts, {})[draftId(venueId)] || null;
  }

  function setDraft(venueId, value) {
    const drafts = readJSON(STORAGE.drafts, {});
    drafts[draftId(venueId)] = value;
    return writeJSON(STORAGE.drafts, drafts);
  }

  function removeDraft(venueId) {
    const drafts = readJSON(STORAGE.drafts, {});
    delete drafts[draftId(venueId)];
    writeJSON(STORAGE.drafts, drafts);
  }

  function noteDraftId(venueId, profileKey = state.profile?.key) {
    return `${profileKey}:${venueId}`;
  }

  function getNoteDraft(venueId) {
    return readJSON(STORAGE.noteDrafts, {})[noteDraftId(venueId)] || null;
  }

  function setNoteDraft(venueId, value) {
    const drafts = readJSON(STORAGE.noteDrafts, {});
    drafts[noteDraftId(venueId)] = value;
    return writeJSON(STORAGE.noteDrafts, drafts);
  }

  function removeNoteDraft(venueId, mutationId = null, profileKey = state.profile?.key) {
    const drafts = readJSON(STORAGE.noteDrafts, {});
    const id = noteDraftId(venueId, profileKey);
    if (mutationId && drafts[id]?.mutationId !== mutationId) return;
    delete drafts[id];
    writeJSON(STORAGE.noteDrafts, drafts);
  }

  function outbox() {
    return readJSON(STORAGE.outbox, []);
  }

  function queueOperation(operation) {
    const operations = outbox().filter((item) => item.id !== operation.id);
    const queued = {
      ...operation,
      version: operation.version || makeMutationId(),
      queuedAt: new Date().toISOString(),
    };
    operations.push(queued);
    const saved = writeJSON(STORAGE.outbox, operations);
    if (!saved) state.storageError = true;
    updateConnectionUI();
    return saved ? queued : null;
  }

  function operationVersion(operation) {
    return operation?.version || operation?.payload?.mutationId || operation?.queuedAt || null;
  }

  function removeOutboxOperation(id, version = null) {
    writeJSON(STORAGE.outbox, outbox().filter((item) => {
      if (item.id !== id) return true;
      return version ? operationVersion(item) !== version : false;
    }));
    updateConnectionUI();
  }

  function makeMutationId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }

  function queuedSubmission(venueId) {
    return outbox().find((item) => item.type === "submission" && item.profileKey === state.profile?.key && item.payload.venueId === venueId);
  }

  function queuedNote(venueId) {
    return outbox().find((item) => item.type === "note" && item.profileKey === state.profile?.key && item.payload.venueId === venueId);
  }

  function queuedVenueIds() {
    return new Set(outbox().filter((item) => item.type === "venue").map((item) => item.payload.id));
  }

  function getVenueNoteData(venueId) {
    const local = getNoteDraft(venueId);
    if (local) return { ...local, source: "local" };
    const queued = queuedNote(venueId)?.payload;
    if (queued) return { body: queued.body || "", updatedAt: queued.updatedAt, mutationId: queued.mutationId, source: "local" };
    if (state.notes[venueId]) return { ...state.notes[venueId], source: "remote" };
    const legacyDraft = getDraft(venueId);
    if (typeof legacyDraft?.notes === "string" && legacyDraft.notes) {
      return { body: legacyDraft.notes, updatedAt: legacyDraft.updatedAt, source: "legacy" };
    }
    const legacySubmission = state.submissions[venueId];
    if (typeof legacySubmission?.notes === "string" && legacySubmission.notes) {
      return { body: legacySubmission.notes, updatedAt: legacySubmission.updatedAt, source: "legacy" };
    }
    return { body: "", source: "empty" };
  }

  function writeRemoteCache() {
    writeJSON(STORAGE.state, {
      personKey: state.profile?.key || "",
      ownSubmissions: Object.values(state.submissions),
      ownNotes: Object.values(state.notes),
      results: Object.values(state.results),
      adminNotes: isAdminProfile() ? state.adminNotes : [],
      method: state.method,
    });
  }

  function migrateLocalIdentity(previousKey, nextKey, nextName) {
    if (!previousKey || previousKey === nextKey) return;
    [STORAGE.drafts, STORAGE.noteDrafts].forEach((storageKey) => {
      const records = readJSON(storageKey, {});
      Object.keys(records).forEach((id) => {
        if (!id.startsWith(`${previousKey}:`)) return;
        const nextId = `${nextKey}:${id.slice(previousKey.length + 1)}`;
        const current = records[nextId];
        if (!current || String(records[id].updatedAt || "") >= String(current.updatedAt || "")) records[nextId] = records[id];
        delete records[id];
      });
      writeJSON(storageKey, records);
    });

    const migrated = new Map();
    outbox().forEach((operation) => {
      let next = operation;
      if (operation.profileKey === previousKey) {
        const payload = { ...operation.payload, personName: nextName };
        const id = operation.type === "submission" || operation.type === "note"
          ? `${operation.type}:${nextKey}:${payload.venueId}`
          : operation.id;
        next = { ...operation, id, profileKey: nextKey, payload };
      }
      const current = migrated.get(next.id);
      if (!current || String(next.queuedAt || "") >= String(current.queuedAt || "")) migrated.set(next.id, next);
    });
    writeJSON(STORAGE.outbox, [...migrated.values()]);
  }

  function ensureNoteDraftsQueued() {
    if (!state.profile) return;
    const drafts = readJSON(STORAGE.noteDrafts, {});
    Object.entries(drafts).forEach(([id, draft]) => {
      if (!id.startsWith(`${state.profile.key}:`) || !draft || typeof draft.body !== "string") return;
      const venueId = id.slice(state.profile.key.length + 1);
      if (queuedNote(venueId)) return;
      const mutationId = draft.mutationId || makeMutationId();
      setNoteDraft(venueId, { ...draft, mutationId });
      queueOperation({
        id: `note:${state.profile.key}:${venueId}`,
        type: "note",
        profileKey: state.profile.key,
        payload: { personName: state.profile.name, venueId, body: draft.body, mutationId },
      });
    });
  }

  function showToast(message) {
    clearTimeout(state.toastTimer);
    elements.toast.textContent = message;
    elements.toast.hidden = false;
    state.toastTimer = setTimeout(() => { elements.toast.hidden = true; }, 3200);
  }

  function updateConnectionUI() {
    const queued = outbox().length;
    if (!navigator.onLine) {
      elements.offlineCopy.textContent = queued
        ? `Offline — ${queued} change${queued === 1 ? " is" : "s are"} safe on this phone.`
        : "Offline — your answers will stay safe on this phone.";
      elements.offlineBanner.hidden = false;
      elements.syncStatus.textContent = queued ? `${queued} to sync` : "Offline";
    } else if (queued) {
      elements.offlineCopy.textContent = `${queued} saved change${queued === 1 ? " is" : "s are"} waiting to sync.`;
      elements.offlineBanner.hidden = false;
      elements.syncStatus.textContent = state.syncing ? "Syncing…" : `${queued} to sync`;
    } else {
      elements.offlineBanner.hidden = true;
      elements.syncStatus.textContent = state.loading ? "Refreshing…" : "Saved";
    }
  }

  async function apiFetch(path, options = {}) {
    if (!API_URL || API_URL.includes("__WEDDING")) throw new Error("The shared score service is not configured yet.");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...(options.headers || {}),
        },
        signal: controller.signal,
      });
      let data = {};
      try { data = await response.json(); } catch { /* Preserve the HTTP status below. */ }
      if (!response.ok) {
        const error = new Error(data.error || `Request failed (${response.status}).`);
        error.status = response.status;
        throw error;
      }
      return data;
    } finally {
      clearTimeout(timeout);
    }
  }

  function applyRemoteState(data) {
    const queuedIds = queuedVenueIds();
    const localOnlyVenues = state.venues.filter((venue) => queuedIds.has(venue.id));
    if (Array.isArray(data.venues)) {
      const visibleVenues = data.venues.filter((venue) => !RETIRED_VENUE_IDS.has(venue.id));
      const remoteIds = new Set(visibleVenues.map((venue) => venue.id));
      state.venues = [...visibleVenues, ...localOnlyVenues.filter((venue) => !remoteIds.has(venue.id))];
      writeJSON(STORAGE.venues, state.venues);
    }
    if (Array.isArray(data.ownSubmissions)) state.submissions = indexBy(data.ownSubmissions, "venueId");
    if (Array.isArray(data.ownNotes)) state.notes = indexBy(data.ownNotes, "venueId");
    if (Array.isArray(data.results)) state.results = indexBy(data.results, "venueId");
    if (Array.isArray(data.adminNotes)) state.adminNotes = data.adminNotes;
    if (data.method) state.method = data.method;
    writeRemoteCache();
  }

  async function refreshRemoteState(options = {}) {
    if (!state.profile || !navigator.onLine) return;
    state.loading = true;
    updateConnectionUI();
    if (!options.silent && state.screen === "venues" && !state.venues.length) renderLoading();
    try {
      const data = await apiFetch(`/api/state?name=${encodeURIComponent(state.profile.name)}`);
      applyRemoteState(data);
    } catch {
      if (!options.silent) showToast("Couldn’t refresh — showing the scores saved on this phone.");
    } finally {
      state.loading = false;
      updateConnectionUI();
      if (!options.preserveEditor) renderCurrentScreen();
      else updateNoteSaveUI(state.selectedVenueId);
    }
  }

  function noteEditorIsMounted() {
    return Boolean(document.getElementById("venue-notes-input"));
  }

  async function syncOutbox() {
    if (state.syncing || !navigator.onLine || !state.profile) return;
    const operations = outbox();
    if (!operations.length) return;
    state.syncing = true;
    updateConnectionUI();
    const priority = { venue: 0, note: 1, submission: 2 };
    const ordered = [...operations].sort((a, b) => (priority[a.type] ?? 9) - (priority[b.type] ?? 9));
    let synced = 0;
    let syncedCurrentNonNotes = 0;
    try {
      for (const operation of ordered) {
        try {
          const endpoint = operation.type === "venue"
            ? "/api/venues"
            : operation.type === "note" ? "/api/notes" : "/api/submissions";
          const data = await apiFetch(endpoint, {
            method: "POST",
            body: JSON.stringify(operation.payload),
            keepalive: operation.type === "note",
          });
          const isCurrentPerson = operation.profileKey === state.profile?.key;
          if (operation.type === "venue" && Array.isArray(data.venues)) {
            state.venues = data.venues;
            writeJSON(STORAGE.venues, state.venues);
          } else if (operation.type === "note") {
            if (isCurrentPerson) applyRemoteState(data);
            removeNoteDraft(operation.payload.venueId, operation.payload.mutationId, operation.profileKey);
          } else if (isCurrentPerson) {
            applyRemoteState(data);
            removeDraft(operation.payload.venueId);
          }
          removeOutboxOperation(operation.id, operationVersion(operation));
          synced += 1;
          if (operation.type !== "note" && isCurrentPerson) syncedCurrentNonNotes += 1;
        } catch (error) {
          if (error.status && error.status < 500) showToast(error.message);
          break;
        }
      }
      if (syncedCurrentNonNotes) {
        await refreshRemoteState({ silent: true, preserveEditor: noteEditorIsMounted() });
        showToast(`${syncedCurrentNonNotes} saved change${syncedCurrentNonNotes === 1 ? "" : "s"} synced.`);
      }
    } finally {
      state.syncing = false;
      updateConnectionUI();
      if (noteEditorIsMounted()) updateNoteSaveUI(state.selectedVenueId);
      else renderCurrentScreen();
      if (synced && outbox().length && navigator.onLine) setTimeout(() => syncOutbox(), 0);
    }
  }

  function enterApp(profile, greet = false) {
    const previousKey = profile.key || normalizeKey(profile.name);
    const matchedName = nameMatch(profile.name).exact || cleanName(profile.name);
    const nextProfile = { name: matchedName, key: normalizeKey(matchedName) };
    migrateLocalIdentity(previousKey, nextProfile.key, nextProfile.name);
    state.profile = nextProfile;
    const personCache = readJSON(STORAGE.state, {});
    const cachedPersonKey = personCache.personKey || previousKey;
    if (cachedPersonKey === state.profile.key) {
      state.submissions = indexBy(personCache.ownSubmissions || [], "venueId");
      state.notes = indexBy(personCache.ownNotes || [], "venueId");
      state.results = indexBy(personCache.results || [], "venueId");
      state.adminNotes = isAdminProfile() && Array.isArray(personCache.adminNotes) ? personCache.adminNotes : [];
      state.method = personCache.method || DEFAULT_METHOD;
    } else {
      state.submissions = {};
      state.notes = {};
      state.results = {};
      state.adminNotes = [];
      state.method = DEFAULT_METHOD;
    }
    writeJSON(STORAGE.profile, state.profile);
    writeJSON(STORAGE.venues, state.venues);
    ensureNoteDraftsQueued();
    elements.profileInitial.textContent = state.profile.name.charAt(0).toUpperCase();
    elements.profileButton.setAttribute("aria-label", `Switch person. Current person: ${state.profile.name}`);
    elements.adminNotesNav.hidden = !isAdminProfile();
    elements.bottomNav.classList.toggle("has-admin", isAdminProfile());
    if (!isAdminProfile()) {
      state.adminPin = "";
      state.adminParticipation = null;
      state.adminExport = null;
    }
    elements.loginView.hidden = true;
    elements.appView.hidden = false;
    state.screen = "venues";
    renderCurrentScreen();
    updateConnectionUI();
    if (greet) showToast(`Welcome, ${state.profile.name}!`);
    syncOutbox().then(() => refreshRemoteState({ silent: true }));
  }

  function switchPerson() {
    clearTimeout(state.noteSyncTimer);
    syncOutbox();
    state.profile = null;
    state.adminNotes = [];
    state.adminPin = "";
    state.adminParticipation = null;
    state.adminExport = null;
    saveAdminPin("");
    elements.adminNotesNav.hidden = true;
    elements.bottomNav.classList.remove("has-admin");
    state.selectedVenueId = null;
    try { localStorage.removeItem(STORAGE.profile); } catch { /* Ignore. */ }
    elements.appView.hidden = true;
    elements.loginView.hidden = false;
    elements.nameInput.value = "";
    elements.suggestion.hidden = true;
    elements.nameInput.focus();
  }

  function renderLoading() {
    elements.main.innerHTML = '<div class="loading-card">Loading the route<span class="loading-dots"></span></div>';
  }

  function setScreen(screen) {
    if (noteEditorIsMounted() && screen !== "score") {
      clearTimeout(state.noteSyncTimer);
      syncOutbox();
    }
    state.screen = screen;
    if (screen !== "score") state.selectedVenueId = null;
    renderCurrentScreen();
    elements.main.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateNavigation() {
    const navigationScreen = state.screen === "score" ? "venues" : state.screen === "admin" ? "admin-notes" : state.screen;
    elements.bottomNav.querySelectorAll("[data-screen]").forEach((button) => {
      const active = button.dataset.screen === navigationScreen;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
  }

  function renderCurrentScreen() {
    if (!state.profile || elements.appView.hidden) return;
    updateNavigation();
    if (state.screen === "score" && state.selectedVenueId) renderScorecard(state.selectedVenueId);
    else if (state.screen === "results") renderResults();
    else if (state.screen === "admin-notes" && isAdminProfile()) renderAdminNotes();
    else if (state.screen === "admin" && isAdminProfile()) renderAdmin();
    else renderVenues();
  }

  function renderAdminNotes() {
    state.screen = "admin-notes";
    const notes = [...state.adminNotes].filter((note) => String(note.body || "").trim()).sort((a, b) => {
      const venueA = state.venues.find((venue) => venue.id === a.venueId);
      const venueB = state.venues.find((venue) => venue.id === b.venueId);
      return (venueA?.sortOrder ?? 999) - (venueB?.sortOrder ?? 999)
        || String(a.personName || "").localeCompare(String(b.personName || ""));
    });
    const byVenue = new Map();
    notes.forEach((note) => {
      if (!byVenue.has(note.venueId)) byVenue.set(note.venueId, []);
      byVenue.get(note.venueId).push(note);
    });
    const groups = [...byVenue.entries()].map(([venueId, venueNotes]) => {
      const venue = state.venues.find((item) => item.id === venueId);
      return `
        <section class="admin-notes-group">
          <h2>${escapeHTML(venue?.name || venueId)}</h2>
          ${venueNotes.map((note) => `
            <article class="admin-note-card">
              <h3>${escapeHTML(note.personName || note.personKey || "Guest")}</h3>
              <p>${escapeHTML(note.body).replace(/\n/g, "<br>")}</p>
            </article>`).join("")}
        </section>`;
    }).join("");
    elements.main.innerHTML = `
      <section class="results-heading"><h1>All notes</h1><div class="heading-actions"><button type="button" class="button button-secondary button-small" data-refresh-admin-notes>↻ Refresh</button><button type="button" class="button button-secondary button-small" data-open-admin>Admin</button></div></section>
      ${groups || '<section class="result-lock"><h2>No notes yet</h2></section>'}`;
    elements.main.querySelector("[data-refresh-admin-notes]")?.addEventListener("click", async (event) => {
      event.currentTarget.disabled = true;
      await refreshRemoteState({ silent: false });
    });
    elements.main.querySelector("[data-open-admin]")?.addEventListener("click", () => setScreen("admin"));
  }

  function adminFetch(path, options = {}) {
    return apiFetch(path, {
      ...options,
      headers: {
        ...(options.headers || {}),
        "X-Admin-Name": state.profile?.name || "",
        "X-Admin-Pin": state.adminPin,
      },
    });
  }

  function clearAdminSession() {
    state.adminPin = "";
    state.adminParticipation = null;
    state.adminExport = null;
    saveAdminPin("");
  }

  async function loadAdminData() {
    const [participation, fullExport] = await Promise.all([
      adminFetch("/api/admin/participation"),
      adminFetch("/api/admin/export"),
    ]);
    state.adminParticipation = participation;
    state.adminExport = fullExport;
  }

  function adminVenueName(venueId) {
    return state.adminExport?.data?.venues?.find((venue) => venue.id === venueId)?.name
      || state.venues.find((venue) => venue.id === venueId)?.name
      || venueId;
  }

  function adminField(row, camel, snake) {
    return row?.[camel] ?? row?.[snake] ?? "";
  }

  function adminLoginMarkup(error = "") {
    elements.main.innerHTML = `
      <section class="admin-login">
        <button type="button" class="plain-back" data-admin-back>← Back</button>
        <h1>Admin</h1>
        <form data-admin-login>
          <label for="admin-pin">Admin PIN</label>
          <input id="admin-pin" name="pin" type="password" inputmode="numeric" autocomplete="off" required>
          <p class="field-error" role="alert">${escapeHTML(error)}</p>
          <button type="submit" class="button button-primary button-block">Unlock</button>
        </form>
      </section>`;
    elements.main.querySelector("[data-admin-back]").addEventListener("click", () => setScreen("admin-notes"));
    elements.main.querySelector("[data-admin-login]").addEventListener("submit", async (event) => {
      event.preventDefault();
      state.adminPin = String(new FormData(event.currentTarget).get("pin") || "").trim();
      saveAdminPin(state.adminPin);
      elements.main.querySelector("button[type=submit]").disabled = true;
      try {
        await loadAdminData();
        renderAdmin();
      } catch (error) {
        clearAdminSession();
        adminLoginMarkup(error.status === 401 || error.status === 403 ? "Wrong PIN." : "Could not load admin tools.");
      }
    });
  }

  function participationMarkup(data) {
    return (data?.venues || []).map((venue) => `
      <div class="admin-row">
        <div><strong>${escapeHTML(venue.venueName)}</strong><small>${escapeHTML(venue.city || "")}</small></div>
        <span>${venue.raterCount} rated · ${venue.noteCount} notes</span>
      </div>`).join("");
  }

  function venueControlsMarkup() {
    const retiredIds = new Set((state.adminExport?.data?.retiredVenues || []).map((row) => adminField(row, "venueId", "venue_id")));
    return [...state.venues].sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)).map((venue, index, list) => `
      <div class="admin-row admin-venue-row">
        <div><strong>${escapeHTML(venue.name)}</strong><small>${escapeHTML(venue.city)}</small></div>
        <div class="admin-row-actions">
          <button type="button" data-admin-move="${escapeHTML(venue.id)}" data-direction="-1" aria-label="Move ${escapeHTML(venue.name)} up" ${index === 0 ? "disabled" : ""}>↑</button>
          <button type="button" data-admin-move="${escapeHTML(venue.id)}" data-direction="1" aria-label="Move ${escapeHTML(venue.name)} down" ${index === list.length - 1 ? "disabled" : ""}>↓</button>
          <button type="button" data-admin-retire="${escapeHTML(venue.id)}" ${retiredIds.has(venue.id) ? "disabled" : ""}>Retire</button>
        </div>
      </div>`).join("");
  }

  function ratingsMarkup() {
    const submissions = state.adminExport?.data?.submissions || [];
    return submissions.map((row) => {
      const personName = adminField(row, "personName", "person_name");
      const personKey = adminField(row, "personKey", "person_key");
      const venueId = adminField(row, "venueId", "venue_id");
      return `
      <div class="admin-row">
        <div><strong>${escapeHTML(personName)}</strong><small>${escapeHTML(adminVenueName(venueId))}</small></div>
        <button type="button" class="admin-danger" data-admin-remove-rating data-person-key="${escapeHTML(personKey)}" data-venue-id="${escapeHTML(venueId)}">Remove</button>
      </div>`;
    }).join("") || '<p class="admin-empty">No ratings yet.</p>';
  }

  function deletedRatingsMarkup() {
    const rows = (state.adminExport?.data?.deletedRatings || []).filter((row) => !adminField(row, "restoredAt", "restored_at"));
    return rows.map((row) => {
      const id = row.id;
      const personKey = adminField(row, "personKey", "person_key");
      const venueId = adminField(row, "venueId", "venue_id");
      return `
      <div class="admin-row">
        <div><strong>${escapeHTML(personKey)}</strong><small>${escapeHTML(adminVenueName(venueId))}</small></div>
        <button type="button" data-admin-restore-rating="${escapeHTML(id)}">Restore</button>
      </div>`;
    }).join("") || '<p class="admin-empty">Nothing to restore.</p>';
  }

  function auditMarkup() {
    return [...(state.adminExport?.data?.adminAuditLog || [])].reverse().slice(0, 20).map((row) => `
      <div class="admin-row">
        <div><strong>${escapeHTML(row.action)}</strong><small>${escapeHTML(adminField(row, "targetKey", "target_key"))}</small></div>
        <span>${escapeHTML(String(adminField(row, "createdAt", "created_at")).slice(0, 16))}</span>
      </div>`).join("") || '<p class="admin-empty">No admin changes yet.</p>';
  }

  function adminDashboardMarkup() {
    const totals = state.adminParticipation?.totals || {};
    return `
      <section class="admin-heading">
        <button type="button" class="plain-back" data-admin-back>← Back</button>
        <div><p class="kicker">Admin only</p><h1>Admin</h1></div>
        <button type="button" class="button button-secondary button-small" data-admin-lock>Lock</button>
      </section>
      <div class="admin-summary">
        <div><strong>${totals.people || 0}</strong><span>People</span></div>
        <div><strong>${totals.ratings || 0}</strong><span>Ratings</span></div>
        <div><strong>${totals.notes || 0}</strong><span>Notes</span></div>
      </div>
      <button type="button" class="button button-primary button-block" data-admin-download>Download full backup</button>
      <details class="admin-section" open><summary>Participation</summary><div class="admin-section-body">${participationMarkup(state.adminParticipation)}</div></details>
      <details class="admin-section"><summary>Venues</summary><div class="admin-section-body">
        <form class="admin-form" data-admin-add-venue>
          <label for="admin-venue-name">Venue name</label>
          <input id="admin-venue-name" name="name" placeholder="Venue name" required>
          <label for="admin-venue-city">City</label>
          <input id="admin-venue-city" name="city" placeholder="City" required>
          <button type="submit" class="button button-secondary">Add venue</button>
        </form>
        ${venueControlsMarkup()}
      </div></details>
      <details class="admin-section"><summary>Merge a name</summary><div class="admin-section-body">
        <form class="admin-form" data-admin-alias>
          <label for="admin-alias-name">Name to merge</label>
          <input id="admin-alias-name" name="alias" placeholder="Name to merge" required>
          <label for="admin-canonical-name">Keep as</label>
          <input id="admin-canonical-name" name="canonical" placeholder="Keep as (e.g. Vipul)" required>
          <button type="submit" class="button button-secondary">Merge</button>
        </form>
      </div></details>
      <details class="admin-section"><summary>Ratings</summary><div class="admin-section-body">${ratingsMarkup()}<h3 class="admin-subheading">Removed ratings</h3>${deletedRatingsMarkup()}</div></details>
      <details class="admin-section"><summary>Audit log</summary><div class="admin-section-body">${auditMarkup()}</div></details>`;
  }

  async function runAdminMutation(path, payload, successMessage) {
    if (state.adminMutating) return;
    state.adminMutating = true;
    elements.main.querySelectorAll("button, input").forEach((control) => { control.disabled = true; });
    try {
      await adminFetch(path, { method: "POST", body: JSON.stringify({ ...payload, mutationId: makeMutationId() }) });
      await Promise.all([loadAdminData(), refreshRemoteState({ silent: true })]);
      showToast(successMessage);
      state.adminMutating = false;
      renderAdmin();
    } catch (error) {
      state.adminMutating = false;
      if (error.status === 401 || error.status === 403) {
        clearAdminSession();
        adminLoginMarkup("Admin session expired.");
      } else {
        showToast(error.message || "Could not save that admin change.");
        renderAdmin();
      }
    }
  }

  function bindAdminDashboard() {
    elements.main.querySelector("[data-admin-back]").addEventListener("click", () => setScreen("admin-notes"));
    elements.main.querySelector("[data-admin-lock]").addEventListener("click", () => {
      clearAdminSession();
      renderAdmin();
    });
    elements.main.querySelector("[data-admin-download]").addEventListener("click", async (event) => {
      event.currentTarget.disabled = true;
      try {
        const data = await adminFetch("/api/admin/export");
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `venue-admin-backup-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        event.currentTarget.disabled = false;
      } catch (error) {
        if (error.status === 401 || error.status === 403) {
          clearAdminSession();
          adminLoginMarkup("Admin session expired.");
        } else {
          showToast("Could not download the backup.");
          event.currentTarget.disabled = false;
        }
      }
    });
    elements.main.querySelector("[data-admin-add-venue]").addEventListener("submit", (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const name = cleanName(form.get("name"));
      const city = cleanName(form.get("city"));
      const slug = `${normalizeKey(city) || "city"}-${normalizeKey(name) || "venue"}`.slice(0, 94).replace(/-+$/, "");
      const id = `venue-${slug}`;
      runAdminMutation("/api/admin/venues", {
        action: "add",
        venue: { id, name, city },
        confirmation: `ADD VENUE ${id}`,
      }, "Venue added.");
    });
    elements.main.querySelectorAll("[data-admin-move]").forEach((button) => {
      button.addEventListener("click", () => {
        const ordered = [...state.venues].sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
        const index = ordered.findIndex((venue) => venue.id === button.dataset.adminMove);
        const next = index + Number(button.dataset.direction);
        if (index < 0 || next < 0 || next >= ordered.length) return;
        [ordered[index], ordered[next]] = [ordered[next], ordered[index]];
        runAdminMutation("/api/admin/venues", {
          action: "reorder",
          venueIds: ordered.map((venue) => venue.id),
          confirmation: "REORDER VENUES",
        }, "Venue order saved.");
      });
    });
    elements.main.querySelectorAll("[data-admin-retire]").forEach((button) => {
      button.addEventListener("click", () => {
        const venueId = button.dataset.adminRetire;
        if (!window.confirm(`Retire ${adminVenueName(venueId)}? Existing ratings and notes will be preserved.`)) return;
        runAdminMutation("/api/admin/venues", {
          action: "retire",
          venueId,
          reason: "Retired from admin panel",
          confirmation: `RETIRE ${venueId}`,
        }, "Venue retired.");
      });
    });
    elements.main.querySelector("[data-admin-alias]").addEventListener("submit", (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const aliasKey = normalizeKey(form.get("alias"));
      const canonicalKey = normalizeKey(form.get("canonical"));
      if (!window.confirm(`Merge ${aliasKey} into ${canonicalKey}? The newest entry for each venue will be kept.`)) return;
      runAdminMutation("/api/admin/aliases", {
        aliasKey,
        canonicalKey,
        confirmation: `MERGE ${aliasKey} INTO ${canonicalKey}`,
      }, "Name merged.");
    });
    elements.main.querySelectorAll("[data-admin-remove-rating]").forEach((button) => {
      button.addEventListener("click", () => {
        const personKey = button.dataset.personKey;
        const venueId = button.dataset.venueId;
        if (!window.confirm(`Remove ${personKey}'s rating for ${adminVenueName(venueId)}? You can restore it later.`)) return;
        runAdminMutation("/api/admin/ratings", {
          action: "remove",
          personKey,
          venueId,
          reason: "Removed from admin panel",
          confirmation: `REMOVE RATING ${personKey} ${venueId}`,
        }, "Rating removed.");
      });
    });
    elements.main.querySelectorAll("[data-admin-restore-rating]").forEach((button) => {
      button.addEventListener("click", () => {
        const tombstoneId = button.dataset.adminRestoreRating;
        runAdminMutation("/api/admin/ratings", {
          action: "restore",
          tombstoneId,
          confirmation: `RESTORE RATING ${tombstoneId}`,
        }, "Rating restored.");
      });
    });
  }

  function renderAdmin() {
    state.screen = "admin";
    if (!state.adminPin) {
      adminLoginMarkup();
      return;
    }
    if (!state.adminParticipation || !state.adminExport) {
      elements.main.innerHTML = '<div class="loading-card">Loading admin tools<span class="loading-dots"></span></div>';
      loadAdminData().then(renderAdmin).catch((error) => {
        if (error.status === 401 || error.status === 403) {
          clearAdminSession();
          adminLoginMarkup("Wrong PIN.");
        } else {
          elements.main.innerHTML = '<section class="result-lock"><h2>Could not load admin tools</h2><button type="button" class="button button-secondary" data-admin-retry>Retry</button></section>';
          elements.main.querySelector("[data-admin-retry]").addEventListener("click", renderAdmin);
        }
      });
      return;
    }
    elements.main.innerHTML = adminDashboardMarkup();
    bindAdminDashboard();
  }

  function venueStatus(venueId) {
    if (queuedSubmission(venueId)) return { label: "Saved here · needs sync", className: "queued", action: "Edit" };
    if (state.submissions[venueId]) return { label: "Submitted", className: "synced", action: "Edit" };
    if (getDraft(venueId)) return { label: "Draft on this phone", className: "draft", action: "Continue" };
    return { label: "Not started", className: "", action: "Rate" };
  }

  function joinNames(names) {
    if (names.length < 2) return names[0] || "";
    if (names.length === 2) return `${names[0]} & ${names[1]}`;
    return `${names.slice(0, -1).join(", ")} & ${names.at(-1)}`;
  }

  function waitingText(result) {
    if (!result || typeof result.waitingCount !== "number") return "";
    if (result.waitingCount === 0) return "Everyone has rated";
    if (Array.isArray(result.waitingNames) && result.waitingNames.length <= 3) {
      return `Waiting on ${joinNames(result.waitingNames.map((name) => `${name}ji`))}`;
    }
    return `Waiting on ${result.waitingCount} people`;
  }

  function renderVenues() {
    state.screen = "venues";
    const sorted = [...state.venues].sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999) || a.name.localeCompare(b.name));
    const cities = [...new Set(sorted.map((venue) => venue.city))];
    const submittedCount = Object.keys(state.submissions).length;
    const progress = sorted.length ? Math.min(100, (submittedCount / sorted.length) * 100) : 0;
    const groups = cities.map((city) => {
      const cards = sorted.filter((venue) => venue.city === city).map((venue, index) => {
        const status = venueStatus(venue.id);
        const waiting = waitingText(state.results[venue.id]);
        return `
          <article class="venue-card">
            <span class="venue-number" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
            <div class="venue-info">
              <h3>${escapeHTML(venue.name)}</h3>
              <p class="venue-meta"><span class="status-dot ${status.className}"></span>${escapeHTML(status.label)}</p>
              ${waiting ? `<p class="venue-waiting">${escapeHTML(waiting)}</p>` : ""}
            </div>
            <div class="venue-actions">
              <button class="venue-action notes-action ${getVenueNoteData(venue.id).body ? "has-notes" : ""}" type="button" data-notes-venue="${escapeHTML(venue.id)}">Notes</button>
              <button class="venue-action ${status.action === "Edit" ? "edit" : ""}" type="button" data-rate-venue="${escapeHTML(venue.id)}">${status.action}</button>
            </div>
          </article>`;
      }).join("");
      return `<section class="city-group"><h2 class="city-heading">${escapeHTML(city)}</h2><div class="venue-list">${cards}</div></section>`;
    }).join("");

    elements.main.innerHTML = `
      <section class="page-intro">
        <p class="kicker">Welcome, ${escapeHTML(state.profile.name)}</p>
        <h1>Venue Rating</h1>
        <div class="progress-summary" aria-label="${submittedCount} of ${sorted.length} venues submitted">
          <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
          <span>${submittedCount} / ${sorted.length} synced</span>
        </div>
      </section>
      <div class="list-toolbar">
        <h2>The route</h2>
        <button type="button" class="button button-secondary button-small" data-add-venue>＋ Add venue</button>
      </div>
      ${groups || '<div class="loading-card">No venues yet.</div>'}`;

    elements.main.querySelectorAll("[data-rate-venue]").forEach((button) => {
      button.addEventListener("click", () => openScorecard(button.dataset.rateVenue));
    });
    elements.main.querySelectorAll("[data-notes-venue]").forEach((button) => {
      button.addEventListener("click", () => openNotes(button.dataset.notesVenue));
    });
    elements.main.querySelector("[data-add-venue]")?.addEventListener("click", openVenueDialog);
  }

  function openNotes(venueId) {
    openScorecard(venueId, { jumpTo: "notes" });
  }

  function insertNotePrompt(editor, prompt, venueId) {
    const spacer = editor.value && !editor.value.endsWith("\n") ? "\n\n" : "";
    editor.value = `${editor.value}${spacer}${prompt}\n`;
    editor.focus();
    editor.setSelectionRange(editor.value.length, editor.value.length);
    saveVenueNote(venueId, editor.value);
  }

  function saveVenueNote(venueId, body) {
    const mutationId = makeMutationId();
    const updatedAt = new Date().toISOString();
    const value = String(body || "").slice(0, 20000);
    const localSaved = setNoteDraft(venueId, { body: value, mutationId, updatedAt });
    const queued = queueOperation({
      id: `note:${state.profile.key}:${venueId}`,
      type: "note",
      profileKey: state.profile.key,
      payload: { personName: state.profile.name, venueId, body: value, mutationId },
    });
    if (!localSaved || !queued) {
      state.storageError = true;
      showToast("This browser could not save the note. Please copy it before leaving.");
    }
    updateNoteSaveUI(venueId);
    clearTimeout(state.noteSyncTimer);
    state.noteSyncTimer = setTimeout(() => syncOutbox(), 650);
  }

  function updateNoteSaveUI(venueId) {
    const status = document.getElementById("note-save-status");
    if (!status || !venueId) return;
    const queued = queuedNote(venueId);
    const note = getVenueNoteData(venueId);
    status.className = "note-save-status";
    status.hidden = false;
    if (state.storageError) {
      status.classList.add("save-error");
      status.textContent = "Couldn’t save on this phone — copy your note before leaving";
    } else if (queued && !navigator.onLine) {
      status.classList.add("saved-local");
      status.textContent = "Offline · saved on this phone · will sync later";
    } else if (queued) {
      status.classList.add("saving");
      status.textContent = state.syncing ? "Saving everywhere…" : "Saved on this phone · syncing soon";
    } else if (note.source === "remote") {
      status.classList.add("saved-remote");
      status.textContent = "Saved everywhere";
    } else if (note.source === "legacy") {
      status.classList.add("saved-remote");
      status.textContent = "Saved with your rating";
    } else {
      status.textContent = "";
      status.hidden = true;
    }
  }

  function openScorecard(venueId, options = {}) {
    state.selectedVenueId = venueId;
    state.screen = "score";
    renderScorecard(venueId);
    updateNavigation();
    elements.main.focus({ preventScroll: true });
    if (options.jumpTo === "notes") {
      requestAnimationFrame(() => document.getElementById("inline-notes")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function scorecardData(venueId) {
    const draft = getDraft(venueId);
    const queued = queuedSubmission(venueId)?.payload;
    const submitted = state.submissions[venueId];
    if (draft?.dirty) return draft;
    if (queued) return { ratings: queued.ratings, notes: queued.notes, dirty: true, baseSubmitted: Boolean(submitted) };
    if (submitted) return { ratings: submitted.ratings, notes: submitted.notes, dirty: false, baseSubmitted: true };
    return { ratings: {}, notes: "", dirty: false, baseSubmitted: false };
  }

  function factorMarkup(factor, ratings) {
    const hasValue = Object.prototype.hasOwnProperty.call(ratings, factor.key);
    const choices = Array.from({ length: 10 }, (_, index) => {
      const value = index + 1;
      const checked = hasValue && ratings[factor.key] === value ? " checked" : "";
      return `<label class="score-choice"><input type="radio" name="${factor.key}" value="${value}"${checked}><span>${value}</span></label>`;
    }).join("");
    const naChecked = hasValue && ratings[factor.key] === null ? " checked" : "";
    return `
      <fieldset class="factor-card ${factor.className}" data-factor-card="${factor.key}">
        <legend class="sr-only">${factor.name}</legend>
        <div class="factor-head">
          <span class="factor-icon" aria-hidden="true">${factor.icon}</span>
          <div>
            <div class="factor-title"><h2>${factor.name}</h2><span>1–10</span></div>
            <p class="factor-description">${factor.description}</p>
          </div>
        </div>
        <div class="score-scale-hints" aria-hidden="true"><span>😬 1 · Not good</span><span>10 · Excellent 🤩</span></div>
        <div class="score-grid" role="radiogroup" aria-label="${factor.name}, 1 to 10 or not applicable">
          ${choices}
          <label class="score-choice na-choice"><input type="radio" name="${factor.key}" value="na"${naChecked}><span>N/A</span></label>
        </div>
      </fieldset>`;
  }

  function renderScorecard(venueId) {
    const venue = state.venues.find((item) => item.id === venueId);
    if (!venue) return setScreen("venues");
    const data = scorecardData(venueId);
    const venueNote = getVenueNoteData(venueId);
    const answered = FACTORS.filter((factor) => Object.prototype.hasOwnProperty.call(data.ratings || {}, factor.key)).length;
    const alreadySubmitted = Boolean(state.submissions[venueId]);
    elements.main.innerHTML = `
      <button type="button" class="back-button" data-back-venues>← Back</button>
      <section class="score-heading">
        <p class="kicker">${escapeHTML(venue.city)}</p>
        <h1>${escapeHTML(venue.name)}</h1>
        <div class="score-progress"><div class="progress-track"><div id="score-progress-fill" class="progress-fill" style="width:${answered * 20}%"></div></div><span id="score-progress-copy">${answered} of 5 answered</span></div>
      </section>
      <nav class="score-jump-nav" aria-label="Scorecard sections">
        <button type="button" data-jump-rankings>Rankings</button>
        <button type="button" data-jump-notes>Notes</button>
      </nav>
      <form id="score-form" novalidate>
        <div id="ranking-factors" class="factor-stack">${FACTORS.map((factor) => factorMarkup(factor, data.ratings || {})).join("")}</div>
        <section id="inline-notes" class="inline-notes" aria-labelledby="inline-notes-title">
          <div class="inline-notes-heading">
            <h2 id="inline-notes-title">Notes</h2>
            <div id="note-save-status" class="note-save-status" role="status" aria-live="polite" hidden></div>
          </div>
          <section class="note-prompts" aria-labelledby="note-prompts-title">
            <h3 id="note-prompts-title">Ideas to capture</h3>
            <div class="note-prompt-grid">
              ${NOTE_PROMPTS.map((prompt, index) => `<button type="button" data-note-prompt="${index}">${escapeHTML(prompt)}</button>`).join("")}
            </div>
          </section>
          <label class="sr-only" for="venue-notes-input">Notes for ${escapeHTML(venue.name)}</label>
          <textarea id="venue-notes-input" class="note-editor" maxlength="20000" spellcheck="true" autocapitalize="sentences" placeholder="What stood out?"></textarea>
        </section>
        <p id="score-error" class="field-error" role="alert"></p>
        <div class="score-submit-bar">
          <button id="submit-score" type="submit" class="button button-primary button-block">Save my rankings</button>
        </div>
      </form>`;
    const form = document.getElementById("score-form");
    const editor = document.getElementById("venue-notes-input");
    editor.value = venueNote.body || "";
    elements.main.querySelector("[data-back-venues]").addEventListener("click", () => setScreen("venues"));
    elements.main.querySelector("[data-jump-rankings]").addEventListener("click", () => document.getElementById("ranking-factors").scrollIntoView({ behavior: "smooth", block: "start" }));
    elements.main.querySelector("[data-jump-notes]").addEventListener("click", () => document.getElementById("inline-notes").scrollIntoView({ behavior: "smooth", block: "start" }));
    elements.main.querySelectorAll("[data-note-prompt]").forEach((button) => {
      button.addEventListener("click", () => insertNotePrompt(editor, NOTE_PROMPTS[Number(button.dataset.notePrompt)], venueId));
    });
    editor.addEventListener("input", () => saveVenueNote(venueId, editor.value));
    updateNoteSaveUI(venueId);
    form.addEventListener("change", () => saveCurrentDraft(venueId, form));
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submitScore(venue, form);
    });
  }

  function collectForm(form) {
    const ratings = {};
    FACTORS.forEach((factor) => {
      const selected = form.querySelector(`input[name="${factor.key}"]:checked`);
      if (selected) ratings[factor.key] = selected.value === "na" ? null : Number(selected.value);
    });
    return { ratings };
  }

  function saveCurrentDraft(venueId, form) {
    const data = collectForm(form);
    setDraft(venueId, {
      ...data,
      notes: getVenueNoteData(venueId).body,
      dirty: true,
      baseSubmitted: Boolean(state.submissions[venueId]),
      updatedAt: new Date().toISOString(),
    });
    const answered = Object.keys(data.ratings).length;
    document.getElementById("score-progress-fill").style.width = `${answered * 20}%`;
    document.getElementById("score-progress-copy").textContent = `${answered} of 5 answered`;
    elements.syncStatus.textContent = "Draft saved";
  }

  async function submitScore(venue, form) {
    if (state.submitting) return;
    const data = collectForm(form);
    const unanswered = FACTORS.filter((factor) => !Object.prototype.hasOwnProperty.call(data.ratings, factor.key));
    form.querySelectorAll("[data-factor-card]").forEach((card) => card.classList.remove("has-error"));
    if (unanswered.length) {
      unanswered.forEach((factor) => form.querySelector(`[data-factor-card="${factor.key}"]`).classList.add("has-error"));
      document.getElementById("score-error").textContent = `Answer ${unanswered.length === 1 ? unanswered[0].name : `all ${unanswered.length} highlighted factors`} with 1–10 or N/A.`;
      form.querySelector(`[data-factor-card="${unanswered[0].key}"]`).scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const payload = {
      personName: state.profile.name,
      venueId: venue.id,
      ratings: data.ratings,
      notes: getVenueNoteData(venue.id).body,
    };
    const operationId = `submission:${state.profile.key}:${venue.id}`;
    const submitButton = document.getElementById("submit-score");
    state.submitting = true;
    submitButton.disabled = true;
    submitButton.textContent = navigator.onLine ? "Sending…" : "Saving…";
    setDraft(venue.id, {
      ...data,
      notes: payload.notes,
      dirty: true,
      baseSubmitted: Boolean(state.submissions[venue.id]),
      updatedAt: new Date().toISOString(),
    });

    if (navigator.onLine) {
      try {
        const response = await apiFetch("/api/submissions", { method: "POST", body: JSON.stringify(payload) });
        applyRemoteState(response);
        removeDraft(venue.id);
        removeOutboxOperation(operationId);
        state.submitting = false;
        renderSavedPanel(venue, true);
        return;
      } catch (error) {
        if (error.status && error.status < 500) {
          document.getElementById("score-error").textContent = error.message;
          state.submitting = false;
          submitButton.disabled = false;
          submitButton.textContent = "Save my rankings";
          return;
        }
      }
    }

    queueOperation({ id: operationId, type: "submission", profileKey: state.profile.key, payload });
    state.submitting = false;
    renderSavedPanel(venue, false);
  }

  function renderSavedPanel(venue, synced) {
    elements.main.innerHTML = `
      <section class="saved-panel">
        <div class="saved-burst" aria-hidden="true">${synced ? "✓" : "↻"}</div>
        <h1>${synced ? "Saved" : "Saved offline"}</h1>
        <div class="saved-actions">
          <button type="button" class="button button-secondary" data-saved-venues>Back</button>
          ${synced ? '<button type="button" class="button button-primary" data-saved-results>Results</button>' : `<button type="button" class="button button-primary" data-saved-edit>Edit</button>`}
        </div>
      </section>`;
    elements.main.querySelector("[data-saved-venues]").addEventListener("click", () => setScreen("venues"));
    elements.main.querySelector("[data-saved-results]")?.addEventListener("click", () => setScreen("results"));
    elements.main.querySelector("[data-saved-edit]")?.addEventListener("click", () => openScorecard(venue.id));
  }

  function agreementClass(label) {
    if (label === "People mostly agree") return "";
    if (label === "Some disagreement") return "some";
    if (label === "People mostly disagree") return "disagree";
    return "early";
  }

  function rankResults(results) {
    const sorted = results.filter((result) => typeof result.average === "number").sort((a, b) => b.average - a.average);
    let prior = null;
    let rank = 0;
    return sorted.map((result, index) => {
      if (prior === null || Math.abs(result.average - prior) > 1e-9) rank = index + 1;
      prior = result.average;
      return { ...result, rank };
    });
  }

  function factorResultsMarkup(result) {
    return FACTORS.map((factor) => {
      const item = result.factors?.[factor.key] || { average: null, count: 0 };
      const width = item.average === null ? 0 : item.average * 10;
      return `
        <div class="factor-result">
          <div><div class="factor-result-name">${factor.icon} ${factor.name}</div><div class="mini-bar"><span style="width:${width}%"></span></div></div>
          <div class="factor-result-value">${item.average === null ? "—" : item.average.toFixed(1)}<small>${item.count} response${item.count === 1 ? "" : "s"}</small></div>
        </div>`;
    }).join("");
  }

  function renderResults() {
    state.screen = "results";
    const allResults = Object.values(state.results);
    const ranked = rankResults(allResults);
    if (!allResults.length) {
      elements.main.innerHTML = `
        <section class="results-heading"><h1>Results</h1></section>
        <section class="result-lock"><h2>No ratings yet</h2><button type="button" class="button button-primary" style="margin-top:1rem" data-go-rate>Venues</button></section>`;
      elements.main.querySelector("[data-go-rate]").addEventListener("click", () => setScreen("venues"));
      return;
    }

    const podium = ranked.filter((result) => result.rank <= 3).map((result) => {
      const venue = state.venues.find((item) => item.id === result.venueId);
      return `
        <article class="podium-card">
          <span class="rank-medal" aria-label="Rank ${result.rank}">${result.rank === 1 ? "♛" : result.rank}</span>
          <div class="podium-info"><h2>${escapeHTML(venue?.name || "Venue")}</h2><p>${result.respondentCount} scout${result.respondentCount === 1 ? "" : "s"} · ${escapeHTML(result.agreement)}</p></div>
          <div class="big-score">${result.average.toFixed(1)}<small>/10</small></div>
        </article>`;
    }).join("");

    const cards = allResults.sort((a, b) => {
      const venueA = state.venues.find((venue) => venue.id === a.venueId);
      const venueB = state.venues.find((venue) => venue.id === b.venueId);
      return (venueA?.sortOrder ?? 999) - (venueB?.sortOrder ?? 999);
    }).map((result) => {
      const venue = state.venues.find((item) => item.id === result.venueId);
      if (typeof result.average !== "number") {
        return `
          <article class="result-card result-card-waiting">
            <div class="result-main">
              <h3>${escapeHTML(venue?.name || "Venue")}</h3>
              <div class="result-meta"><span>${escapeHTML(waitingText(result))}</span><span>${result.respondentCount || 0} rated</span></div>
            </div>
          </article>`;
      }
      return `
        <details class="result-card">
          <summary>
            <div class="result-main">
              <h3>${escapeHTML(venue?.name || "Venue")}</h3>
              <div class="result-meta"><span class="agreement-pill ${agreementClass(result.agreement)}">${escapeHTML(result.agreement)}</span>${result.provisional ? '<span class="provisional-pill">Provisional</span>' : ""}<span>${result.respondentCount} scout${result.respondentCount === 1 ? "" : "s"}</span></div>
            </div>
            <div class="result-score"><strong>${result.average.toFixed(1)}</strong><small>out of 10</small></div>
          </summary>
          <div class="factor-results">${factorResultsMarkup(result)}</div>
        </details>`;
    }).join("");

    elements.main.innerHTML = `
      <section class="results-heading"><h1>Results</h1><button type="button" class="button button-secondary button-small" style="margin-top:0.85rem" data-refresh-results>↻ Refresh</button></section>
      ${podium ? `<section class="podium" aria-label="Current top three">${podium}</section>` : '<section class="result-lock"><h2>Scores appear after 4 ratings</h2></section>'}
      <h2 class="results-list-title">All venues</h2>
      ${cards}
      <details class="method-note"><summary>How scores work</summary><p>${escapeHTML(state.method)} Agreement is based on score dispersion.</p></details>`;
    elements.main.querySelector("[data-refresh-results]").addEventListener("click", async (event) => {
      event.currentTarget.disabled = true;
      await syncOutbox();
      await refreshRemoteState({ silent: false });
    });
  }

  function openVenueDialog() {
    elements.addVenueForm.reset();
    delete elements.addVenueForm.dataset.allowDuplicate;
    elements.venueError.textContent = "";
    elements.venueSuggestion.hidden = true;
    if (typeof elements.dialog.showModal === "function") elements.dialog.showModal();
    else elements.dialog.setAttribute("open", "");
    setTimeout(() => elements.venueName.focus(), 50);
  }

  function closeVenueDialog() {
    if (typeof elements.dialog.close === "function") elements.dialog.close();
    else elements.dialog.removeAttribute("open");
  }

  async function addVenueFromForm() {
    const name = cleanName(elements.venueName.value);
    const city = titleCase(elements.venueCity.value);
    elements.venueError.textContent = "";
    if (!name || !city) {
      elements.venueError.textContent = "Add both the venue and its city.";
      return;
    }
    const match = venueMatch(name, city);
    if (match && elements.addVenueForm.dataset.allowDuplicate !== "true") {
      elements.venueSuggestion.innerHTML = `<p>Did you mean <strong>${escapeHTML(match.name)}</strong> in ${escapeHTML(match.city)}?</p><div class="suggestion-actions"><button type="button" class="button button-primary button-small" data-use-venue>Use that venue</button><button type="button" class="button button-quiet button-small" data-add-anyway>Add mine anyway</button></div>`;
      elements.venueSuggestion.hidden = false;
      elements.venueSuggestion.querySelector("[data-use-venue]").addEventListener("click", () => {
        closeVenueDialog();
        openScorecard(match.id);
      });
      elements.venueSuggestion.querySelector("[data-add-anyway]").addEventListener("click", () => {
        elements.addVenueForm.dataset.allowDuplicate = "true";
        elements.venueSuggestion.hidden = true;
        elements.addVenueForm.requestSubmit();
      });
      return;
    }

    const random = window.crypto?.randomUUID ? window.crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
    const id = `venue-${Date.now()}-${random}`;
    const payload = { id, name, city, personName: state.profile.name };
    const localVenue = { id, name, city, sortOrder: Math.max(0, ...state.venues.map((venue) => venue.sortOrder || 0)) + 10 };
    state.venues.push(localVenue);
    writeJSON(STORAGE.venues, state.venues);
    closeVenueDialog();
    renderVenues();

    if (navigator.onLine) {
      try {
        const response = await apiFetch("/api/venues", { method: "POST", body: JSON.stringify(payload) });
        if (Array.isArray(response.venues)) {
          state.venues = response.venues;
          writeJSON(STORAGE.venues, state.venues);
        }
        showToast(response.duplicate ? "That venue was already on the route." : `${name} added.`);
        renderVenues();
        return;
      } catch (error) {
        if (error.status && error.status < 500) {
          state.venues = state.venues.filter((venue) => venue.id !== id);
          writeJSON(STORAGE.venues, state.venues);
          showToast(error.message);
          renderVenues();
          return;
        }
      }
    }
    queueOperation({ id: `venue:${id}`, type: "venue", profileKey: state.profile.key, payload });
    showToast(`${name} is saved here and will sync.`);
  }

  function exportBackup() {
    if (!state.profile) return;
    const drafts = readJSON(STORAGE.drafts, {});
    const rows = [];
    state.venues.forEach((venue) => {
      const id = draftId(venue.id);
      const queued = queuedSubmission(venue.id)?.payload;
      const draft = drafts[id];
      const submitted = state.submissions[venue.id];
      const record = queued || (draft?.dirty ? draft : null) || submitted;
      const note = getVenueNoteData(venue.id);
      if (!record && !note.body) return;
      const noteQueued = Boolean(queuedNote(venue.id));
      const status = record
        ? queued ? "Rating queued" : draft?.dirty ? "Rating draft" : "Rating synced"
        : noteQueued ? "Notes queued" : "Notes synced";
      const ratingValue = (factor) => {
        if (!Object.prototype.hasOwnProperty.call(record?.ratings || {}, factor)) return "";
        return record.ratings[factor] === null ? "N/A" : record.ratings[factor];
      };
      rows.push([
        state.profile.name,
        venue.city,
        venue.name,
        status,
        ...FACTORS.map((factor) => ratingValue(factor.key)),
        note.body || record?.notes || "",
        note.updatedAt || record?.updatedAt || new Date().toISOString(),
      ]);
    });
    if (!rows.length) {
      showToast("Nothing to back up yet.");
      return;
    }
    const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const header = ["Person", "City", "Venue", "Status", ...FACTORS.map((factor) => factor.name), "Venue notes", "Updated"];
    const csv = `\uFEFF${[header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `venue-scores-${normalizeKey(state.profile.name)}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    showToast("Backup downloaded.");
  }

  function handleLoginSubmit(event) {
    event.preventDefault();
    elements.loginError.textContent = "";
    elements.suggestion.hidden = true;
    const entered = cleanName(elements.nameInput.value);
    if (!entered || !normalizeKey(entered)) {
      elements.loginError.textContent = "Tell us who you are first.";
      elements.nameInput.focus();
      return;
    }
    const match = nameMatch(entered);
    if (match.exact) {
      enterApp({ name: match.exact }, true);
      return;
    }
    if (match.suggestion) {
      state.pendingName = entered;
      elements.suggestedName.textContent = match.suggestion;
      elements.suggestion.dataset.name = match.suggestion;
      elements.suggestion.hidden = false;
      return;
    }
    enterApp({ name: entered }, true);
  }

  function bindEvents() {
    elements.loginForm.addEventListener("submit", handleLoginSubmit);
    elements.acceptSuggestion.addEventListener("click", () => enterApp({ name: elements.suggestion.dataset.name }, true));
    elements.keepName.addEventListener("click", () => enterApp({ name: state.pendingName }, true));
    elements.profileButton.addEventListener("click", switchPerson);
    elements.brandButton.addEventListener("click", () => setScreen("venues"));
    elements.bottomNav.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      if (button.dataset.screen) setScreen(button.dataset.screen);
      if (button.dataset.action === "export") exportBackup();
    });
    elements.addVenueForm.addEventListener("submit", (event) => {
      event.preventDefault();
      addVenueFromForm();
    });
    document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", closeVenueDialog));
    elements.dialog.addEventListener("click", (event) => {
      if (event.target === elements.dialog) closeVenueDialog();
    });
    window.addEventListener("online", () => {
      updateConnectionUI();
      syncOutbox().then(() => refreshRemoteState({ silent: true, preserveEditor: noteEditorIsMounted() }));
    });
    window.addEventListener("offline", updateConnectionUI);
    document.addEventListener("visibilitychange", () => {
      if (!navigator.onLine) return;
      clearTimeout(state.noteSyncTimer);
      syncOutbox();
    });
    window.addEventListener("pagehide", () => {
      clearTimeout(state.noteSyncTimer);
      syncOutbox();
    });
    window.addEventListener("pageshow", () => {
      if (navigator.onLine) syncOutbox();
    });
  }

  function boot() {
    bindEvents();
    updateConnectionUI();
    if (state.profile?.name) enterApp(state.profile, false);
    else {
      elements.loginView.hidden = false;
      elements.appView.hidden = true;
      if (state.profile?.name) elements.nameInput.value = state.profile.name;
    }
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
    }
  }

  boot();
})();
