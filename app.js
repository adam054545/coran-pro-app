/* Coran App PRO — interface web/PWA
   Textes et traductions : AlQuran Cloud API
   Horaires de prière : AlAdhan API
*/
"use strict";

const QURAN_API = "https://api.alquran.cloud/v1";
const ALADHAN_API = "https://api.aladhan.com/v1";
const TRANSLATION_EDITION = "fr.hamidullah";
const ARABIC_EDITION = "quran-uthmani";

const RECITERS = {
  "ar.alafasy": "Mishary Alafasy",
  "ar.abdulbasitmurattal": "Abdul Basit (Murattal)",
  "ar.husary": "Mahmoud Khalil Al-Husary",
  "ar.minshawi": "Mohamed Siddiq Al-Minshawi",
  "ar.sudais": "Abdurrahman As-Sudais"
};

const DHIKR_PHRASES = [
  { arabic: "سُبْحَانَ اللَّهِ", transliteration: "SubhanAllah" },
  { arabic: "الْحَمْدُ لِلَّهِ", transliteration: "Alhamdulillah" },
  { arabic: "اللَّهُ أَكْبَرُ", transliteration: "Allahu Akbar" },
  { arabic: "أَسْتَغْفِرُ اللَّهَ", transliteration: "Astaghfirullah" }
];

const state = {
  surahs: [],
  currentSurah: 1,
  favorites: readStorage("coran_favorites", []),
  readSurahs: readStorage("coran_read_surahs", []),
  lastRead: readStorage("coran_last_read", { surah: 1, ayah: 1 }),
  dhikrCount: readStorage("coran_dhikr_count", 0),
  dhikrPhraseIndex: readStorage("coran_dhikr_phrase", 0),
  settings: readStorage("coran_settings", {
    theme: "dark", city: "Toulouse", country: "France", method: "3"
  }),
  currentVerses: [],
  toastTimer: null,
  installPrompt: null
};

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    showToast("Stockage indisponible sur cet appareil.");
  }
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!response.ok) throw new Error(`Erreur réseau (${response.status})`);
  const json = await response.json();
  if (json.code && json.code !== 200) throw new Error(json.status || "Réponse API invalide");
  return json.data;
}

function showPage(pageName) {
  document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
  const target = document.getElementById(`page-${pageName}`);
  if (target) target.classList.add("active");

  document.querySelectorAll(".nav-item").forEach(button => {
    button.classList.toggle("active", button.dataset.page === pageName);
  });

  if (pageName === "favorites") renderFavorites();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function bindNavigation() {
  document.querySelectorAll("[data-page]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      const page = button.dataset.page;
      if (page === "reader") return;
      showPage(page);
    });
  });

  document.querySelectorAll('[data-action="open-surah"]').forEach(button => {
    button.addEventListener("click", () => openSurah(Number(button.dataset.surah || 1)));
  });

  document.getElementById("continueButton").addEventListener("click", () => {
    const last = state.lastRead || { surah: 1, ayah: 1 };
    openSurah(Number(last.surah || 1));
  });
}

async function loadSurahList() {
  const list = document.getElementById("surahList");
  try {
    state.surahs = await fetchJson(`${QURAN_API}/surah`);
    renderSurahList(state.surahs);
    document.getElementById("surahCount").textContent = `${state.surahs.length} sourates`;
    updateContinueCard();
  } catch (error) {
    list.innerHTML = `<div class="empty-state">Impossible de charger la liste. Vérifie ta connexion puis actualise la page.</div>`;
    document.getElementById("surahCount").textContent = "Chargement impossible";
  }
}

function renderSurahList(surahs) {
  const list = document.getElementById("surahList");
  if (!surahs.length) {
    list.innerHTML = `<div class="empty-state">Aucune sourate ne correspond à ta recherche.</div>`;
    return;
  }

  list.innerHTML = surahs.map(surah => `
    <article class="surah-item" role="button" tabindex="0" data-open-surah="${surah.number}">
      <div class="surah-number"><span>${surah.number}</span></div>
      <div class="surah-info">
        <strong>${escapeHtml(surah.englishName)}</strong>
        <small>${surah.numberOfAyahs} versets · ${surah.revelationType === "Meccan" ? "Mecquoise" : "Médinoise"}</small>
      </div>
      <div class="surah-arabic" lang="ar" dir="rtl">${escapeHtml(surah.name)}</div>
    </article>
  `).join("");

  list.querySelectorAll("[data-open-surah]").forEach(item => {
    const open = () => openSurah(Number(item.dataset.openSurah));
    item.addEventListener("click", open);
    item.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });
}

function bindSearch() {
  const input = document.getElementById("surahSearch");
  input.addEventListener("input", () => {
    const query = normalizeText(input.value.trim());
    const filtered = state.surahs.filter(surah =>
      normalizeText(surah.englishName).includes(query) ||
      normalizeText(surah.englishNameTranslation).includes(query) ||
      String(surah.number) === query ||
      surah.name.includes(input.value.trim())
    );
    renderSurahList(filtered);
    document.getElementById("surahCount").textContent =
      `${filtered.length} résultat${filtered.length > 1 ? "s" : ""}`;
  });

  document.getElementById("clearSearch").addEventListener("click", () => {
    input.value = "";
    renderSurahList(state.surahs);
    document.getElementById("surahCount").textContent = `${state.surahs.length} sourates`;
    input.focus();
  });

  document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      showPage("quran");
      input.focus();
    }
  });
}

function normalizeText(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

async function openSurah(number) {
  if (!Number.isInteger(number) || number < 1 || number > 114) return;
  state.currentSurah = number;
  showPage("reader");

  const surah = state.surahs.find(item => item.number === number);
  document.getElementById("readerTitle").textContent = surah ? surah.englishName : `Sourate ${number}`;
  document.getElementById("readerSubtitle").textContent = surah
    ? `${surah.name} · ${surah.englishNameTranslation}` : "Chargement de la sourate";
  document.getElementById("readerMeta").textContent = `SOURATE ${number} · LECTURE`;
  document.getElementById("versesList").innerHTML = `<div class="empty-state">Chargement du texte arabe et de la traduction…</div>`;
  document.getElementById("audioStatus").textContent = "Préparation de la récitation…";
  updateFavoriteButton();

  const audio = document.getElementById("audioPlayer");
  audio.pause();
  audio.removeAttribute("src");
  audio.load();

  try {
    const editions = `${ARABIC_EDITION},${TRANSLATION_EDITION}`;
    const data = await fetchJson(`${QURAN_API}/surah/${number}/editions/${editions}`);
    const arabic = data[0];
    const french = data[1];

    if (!arabic || !french || arabic.ayahs.length !== french.ayahs.length) {
      throw new Error("Les éditions reçues ne correspondent pas.");
    }

    state.currentVerses = arabic.ayahs.map((ayah, index) => ({
      number: ayah.numberInSurah,
      globalNumber: ayah.number,
      arabic: ayah.text,
      translation: french.ayahs[index].text
    }));

    document.getElementById("readerTitle").textContent = arabic.englishName;
    document.getElementById("readerSubtitle").textContent =
      `${arabic.name} · ${arabic.numberOfAyahs} versets · ${arabic.revelationType === "Meccan" ? "Mecquoise" : "Médinoise"}`;

    const showBismillah = number !== 1 && number !== 9;
    document.getElementById("bismillah").hidden = !showBismillah;
    renderVerses(state.currentVerses);
    updateAudioSource();
    saveLastRead(number, 1);
    state.readSurahs = [...new Set([...state.readSurahs, number])];
    writeStorage("coran_read_surahs", state.readSurahs);
    updateContinueCard();
  } catch (error) {
    document.getElementById("versesList").innerHTML =
      `<div class="empty-state">Le texte n'a pas pu être chargé. Vérifie ta connexion puis réessaie.</div>`;
    document.getElementById("audioStatus").textContent = error.message;
  }
}

function renderVerses(verses) {
  const container = document.getElementById("versesList");
  container.innerHTML = verses.map(verse => `
    <article class="verse-item" id="ayah-${verse.number}">
      <div class="verse-item-top">
        <span class="verse-index">Verset ${verse.number}</span>
        <div class="verse-actions">
          <button class="verse-action" data-copy-ayah="${verse.number}" title="Copier le verset">Copier</button>
          <button class="verse-action" data-bookmark-ayah="${verse.number}" title="Reprendre à ce verset">Marque-page</button>
        </div>
      </div>
      <div class="verse-arabic" lang="ar" dir="rtl">${escapeHtml(verse.arabic)}</div>
      <p class="verse-translation">${escapeHtml(verse.translation)}</p>
    </article>
  `).join("");

  container.querySelectorAll("[data-copy-ayah]").forEach(button => {
    button.addEventListener("click", async () => {
      const verse = verses.find(item => item.number === Number(button.dataset.copyAyah));
      const text = `${verse.arabic}\n\n${verse.translation}\n\nCoran App — Sourate ${state.currentSurah}, verset ${verse.number}`;
      try {
        await navigator.clipboard.writeText(text);
        showToast("Verset copié.");
      } catch (error) {
        showToast("Copie non disponible dans ce navigateur.");
      }
    });
  });

  container.querySelectorAll("[data-bookmark-ayah]").forEach(button => {
    button.addEventListener("click", () => {
      const ayah = Number(button.dataset.bookmarkAyah);
      saveLastRead(state.currentSurah, ayah);
      updateContinueCard();
      showToast(`Marque-page enregistré : verset ${ayah}.`);
    });
  });
}

function saveLastRead(surah, ayah) {
  state.lastRead = { surah, ayah };
  writeStorage("coran_last_read", state.lastRead);
}

function updateContinueCard() {
  const last = state.lastRead || { surah: 1, ayah: 1 };
  const surah = state.surahs.find(item => item.number === Number(last.surah));
  document.getElementById("lastReadName").textContent = surah ? surah.englishName : "Al-Fatiha";
  document.getElementById("lastReadDetail").textContent = `Reprendre au verset ${last.ayah || 1}`;
  const progress = Math.round((state.readSurahs.length / 114) * 100);
  document.getElementById("readingProgress").style.width = `${progress}%`;
}

function updateAudioSource() {
  const select = document.getElementById("reciterSelect");
  const edition = select.value;
  const audio = document.getElementById("audioPlayer");
  const url = `https://cdn.islamic.network/quran/audio-surah/128/${encodeURIComponent(edition)}/${state.currentSurah}.mp3`;
  audio.src = url;
  audio.load();
  document.getElementById("audioStatus").textContent =
    `Récitation : ${RECITERS[edition] || edition}. La lecture audio nécessite Internet.`;
}

function bindAudio() {
  document.getElementById("reciterSelect").addEventListener("change", updateAudioSource);
  const audio = document.getElementById("audioPlayer");
  audio.addEventListener("error", () => {
    document.getElementById("audioStatus").textContent =
      "Cette récitation n'est peut-être pas disponible pour cette sourate. Essaie un autre réciteur.";
  });
  audio.addEventListener("playing", () => {
    document.getElementById("audioStatus").textContent = "Récitation en cours…";
  });
  audio.addEventListener("ended", () => {
    document.getElementById("audioStatus").textContent = "Récitation terminée.";
  });
}

function bindSurahNavigation() {
  document.getElementById("previousSurah").addEventListener("click", () => {
    if (state.currentSurah > 1) openSurah(state.currentSurah - 1);
    else showToast("Tu es déjà sur la première sourate.");
  });
  document.getElementById("nextSurah").addEventListener("click", () => {
    if (state.currentSurah < 114) openSurah(state.currentSurah + 1);
    else showToast("Tu es déjà sur la dernière sourate.");
  });
}

function updateFavoriteButton() {
  const button = document.getElementById("readerFavorite");
  const isFavorite = state.favorites.includes(state.currentSurah);
  button.textContent = isFavorite ? "♥" : "♡";
  button.setAttribute("aria-label", isFavorite ? "Retirer des favoris" : "Ajouter aux favoris");
}

function bindFavorites() {
  document.getElementById("readerFavorite").addEventListener("click", () => {
    const id = state.currentSurah;
    if (state.favorites.includes(id)) {
      state.favorites = state.favorites.filter(item => item !== id);
      showToast("Retiré des favoris.");
    } else {
      state.favorites.push(id);
      showToast("Ajouté aux favoris.");
    }
    writeStorage("coran_favorites", state.favorites);
    updateFavoriteButton();
  });
}

function renderFavorites() {
  const container = document.getElementById("favoritesList");
  const favorites = state.favorites
    .map(id => state.surahs.find(surah => surah.number === id))
    .filter(Boolean);

  if (!favorites.length) {
    container.innerHTML = `<div class="empty-state">Aucun favori pour le moment.<br>Ouvre une sourate et appuie sur ♡ pour l'ajouter.</div>`;
    return;
  }
  renderSurahListInto(container, favorites);
}

function renderSurahListInto(container, surahs) {
  container.innerHTML = surahs.map(surah => `
    <article class="surah-item" role="button" tabindex="0" data-open-surah="${surah.number}">
      <div class="surah-number"><span>${surah.number}</span></div>
      <div class="surah-info"><strong>${escapeHtml(surah.englishName)}</strong><small>${surah.numberOfAyahs} versets</small></div>
      <div class="surah-arabic" lang="ar" dir="rtl">${escapeHtml(surah.name)}</div>
    </article>
  `).join("");
  container.querySelectorAll("[data-open-surah]").forEach(item => {
    const open = () => openSurah(Number(item.dataset.openSurah));
    item.addEventListener("click", open);
    item.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") open();
    });
  });
}

function bindDhikr() {
  renderDhikr();
  document.getElementById("dhikrAdd").addEventListener("click", () => {
    state.dhikrCount += 1;
    writeStorage("coran_dhikr_count", state.dhikrCount);
    renderDhikr();
  });
  document.getElementById("dhikrReset").addEventListener("click", () => {
    state.dhikrCount = 0;
    writeStorage("coran_dhikr_count", 0);
    renderDhikr();
    showToast("Compteur remis à zéro.");
  });
  document.getElementById("dhikrChange").addEventListener("click", () => {
    state.dhikrPhraseIndex = (state.dhikrPhraseIndex + 1) % DHIKR_PHRASES.length;
    writeStorage("coran_dhikr_phrase", state.dhikrPhraseIndex);
    renderDhikr();
  });
}

function renderDhikr() {
  const phrase = DHIKR_PHRASES[state.dhikrPhraseIndex] || DHIKR_PHRASES[0];
  document.getElementById("dhikrCount").textContent = state.dhikrCount;
  document.getElementById("dhikrPhrase").textContent = phrase.arabic;
  document.querySelector("#page-dhikr .muted").textContent = phrase.transliteration;
}

function formatGregorianDate() {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  }).format(new Date());
}

function setupDate() {
  document.getElementById("gregorianDate").textContent = formatGregorianDate();
}

async function loadPrayerTimes() {
  const city = state.settings.city || "Toulouse";
  const country = state.settings.country || "France";
  const method = state.settings.method || "3";
  const now = new Date();
  const date = [
    String(now.getDate()).padStart(2, "0"),
    String(now.getMonth() + 1).padStart(2, "0"),
    now.getFullYear()
  ].join("-");

  document.getElementById("prayerCity").textContent = `${city}, ${country}`;
  document.getElementById("prayerTimes").innerHTML = `<div class="loading-line">Chargement des horaires…</div>`;

  try {
    const url = `${ALADHAN_API}/timingsByCity/${date}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${encodeURIComponent(method)}`;
    const data = await fetchJson(url);
    const timings = data.timings;
    const names = [
      ["Fajr", "Fajr"], ["Dhuhr", "Dhuhr"], ["Asr", "Asr"],
      ["Maghrib", "Maghrib"], ["Isha", "Isha"]
    ];
    document.getElementById("prayerTimes").innerHTML = names.map(([key, label]) => `
      <div class="prayer-time"><span>${label}</span><strong>${escapeHtml(String(timings[key] || "—").split(" ")[0])}</strong></div>
    `).join("");
    const hijri = data.date && data.date.hijri;
    document.getElementById("hijriDate").textContent = hijri
      ? `${hijri.day} ${hijri.month.en} ${hijri.year}` : "Indisponible";
    document.getElementById("prayerDate").textContent =
      data.date && data.date.readable ? data.date.readable : "Horaires du jour";
  } catch (error) {
    document.getElementById("prayerTimes").innerHTML =
      `<div class="loading-line">Horaires indisponibles. Vérifie la ville et la connexion.</div>`;
    document.getElementById("hijriDate").textContent = "Indisponible";
  }
}

function applyTheme(theme) {
  document.body.classList.toggle("light", theme === "light");
  state.settings.theme = theme;
  document.getElementById("themeSelect").value = theme;
  document.getElementById("themeToggle").textContent = theme === "light" ? "☀" : "☾";
  writeStorage("coran_settings", state.settings);
}

function bindSettings() {
  document.getElementById("themeToggle").addEventListener("click", () => {
    applyTheme(state.settings.theme === "light" ? "dark" : "light");
  });

  document.getElementById("themeSelect").value = state.settings.theme;
  document.getElementById("cityInput").value = state.settings.city;
  document.getElementById("countryInput").value = state.settings.country;
  document.getElementById("methodSelect").value = state.settings.method;

  document.getElementById("themeSelect").addEventListener("change", event => {
    applyTheme(event.target.value);
  });

  document.getElementById("saveSettings").addEventListener("click", () => {
    const city = document.getElementById("cityInput").value.trim();
    const country = document.getElementById("countryInput").value.trim();
    if (!city || !country) {
      showToast("Renseigne une ville et un pays.");
      return;
    }
    state.settings.city = city;
    state.settings.country = country;
    state.settings.method = document.getElementById("methodSelect").value;
    writeStorage("coran_settings", state.settings);
    loadPrayerTimes();
    showToast("Paramètres enregistrés.");
  });

  document.getElementById("refreshPrayer").addEventListener("click", loadPrayerTimes);

  document.getElementById("clearData").addEventListener("click", () => {
    const confirmed = window.confirm("Effacer les favoris, marque-pages, compteur et paramètres enregistrés sur cet appareil ?");
    if (!confirmed) return;
    [
      "coran_favorites", "coran_read_surahs", "coran_last_read",
      "coran_dhikr_count", "coran_dhikr_phrase", "coran_settings"
    ].forEach(key => localStorage.removeItem(key));
    window.location.reload();
  });
}

function bindInstallPrompt() {
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    state.installPrompt = event;
    document.getElementById("installButton").hidden = false;
  });

  document.getElementById("installButton").addEventListener("click", async () => {
    if (!state.installPrompt) {
      showToast("Dans Chrome, ouvre le menu ⋮ puis « Installer l'application ».");
      return;
    }
    state.installPrompt.prompt();
    await state.installPrompt.userChoice;
    state.installPrompt = null;
    document.getElementById("installButton").hidden = true;
  });

  window.addEventListener("appinstalled", () => {
    showToast("Coran App est installée.");
    document.getElementById("installButton").hidden = true;
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("./service-worker.js");
  } catch (error) {
    console.warn("Service worker non enregistré :", error);
  }
}

function initializeApp() {
  setupDate();
  applyTheme(state.settings.theme);
  bindNavigation();
  bindSearch();
  bindAudio();
  bindSurahNavigation();
  bindFavorites();
  bindDhikr();
  bindSettings();
  bindInstallPrompt();
  loadSurahList();
  loadPrayerTimes();
  registerServiceWorker();
}

document.addEventListener("DOMContentLoaded", initializeApp);
