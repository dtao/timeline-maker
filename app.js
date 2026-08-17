(function () {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const CHART_WIDTH = 1120;
  const CHART_LEFT = 88;
  const CHART_RIGHT = 92;
  const AXIS_Y = 268;
  const LABEL_AXIS_GAP = 86;
  const LABEL_BADGE_RADIUS = 21;
  const LABEL_BOTTOM_EXTENT = 76;
  const LABEL_GAP = 18;
  const LABEL_MAX_WIDTH = 290;
  const LABEL_MIN_WIDTH = 160;
  const LABEL_ROW_HEIGHT = 104;
  const LABEL_SIDE_PADDING = 32;
  const LABEL_TOP_PADDING = 48;
  const LABEL_TOP_EXTENT = 76;
  const MIN_CHART_HEIGHT = 560;
  const STORAGE_KEY = "timeline-maker-state-v1";
  const AVATAR_RADIUS = 15;
  const AVATAR_SIZE = AVATAR_RADIUS * 2;
  const AVATAR_RENDER_SIZE = 96;

  const elements = {
    addButton: document.querySelector("#addButton"),
    addListButton: document.querySelector("#addListButton"),
    asOfInput: document.querySelector("#asOfInput"),
    completedCount: document.querySelector("#completedCount"),
    dateColumnLabel: document.querySelector("#dateColumnLabel"),
    deleteTimelineButton: document.querySelector("#deleteTimelineButton"),
    downloadButton: document.querySelector("#downloadButton"),
    downloadPngButton: document.querySelector("#downloadPngButton"),
    duplicateTimelineButton: document.querySelector("#duplicateTimelineButton"),
    includeTimesInput: document.querySelector("#includeTimesInput"),
    cancelMilestoneButton: document.querySelector("#cancelMilestoneButton"),
    doneMilestoneButton: document.querySelector("#doneMilestoneButton"),
    milestoneDetailsInput: document.querySelector("#milestoneDetailsInput"),
    milestoneDialog: document.querySelector("#milestoneDialog"),
    milestoneDialogRisks: document.querySelector("#milestoneDialogRisks"),
    milestoneDialogTitle: document.querySelector("#milestoneDialogTitle"),
    milestoneForm: document.querySelector("#milestoneForm"),
    milestoneOwnerSelect: document.querySelector("#milestoneOwnerSelect"),
    milestoneRows: document.querySelector("#milestoneRows"),
    milestoneTitleInput: document.querySelector("#milestoneTitleInput"),
    newTimelineButton: document.querySelector("#newTimelineButton"),
    nowButton: document.querySelector("#nowButton"),
    cancelPersonButton: document.querySelector("#cancelPersonButton"),
    clearPersonPhotoButton: document.querySelector("#clearPersonPhotoButton"),
    ownerMenuLayer: document.querySelector("#ownerMenuLayer"),
    overdueCount: document.querySelector("#overdueCount"),
    personDialog: document.querySelector("#personDialog"),
    personEmailInput: document.querySelector("#personEmailInput"),
    personForm: document.querySelector("#personForm"),
    personNameInput: document.querySelector("#personNameInput"),
    personPhotoInput: document.querySelector("#personPhotoInput"),
    personPhotoPreview: document.querySelector("#personPhotoPreview"),
    resetButton: document.querySelector("#resetButton"),
    showTodayInput: document.querySelector("#showTodayInput"),
    sortButton: document.querySelector("#sortButton"),
    statusMenuLayer: document.querySelector("#statusMenuLayer"),
    titleEditLayer: document.querySelector("#titleEditLayer"),
    timelineCountLabel: document.querySelector("#timelineCountLabel"),
    timelineList: document.querySelector("#timelineList"),
    timelineNameInput: document.querySelector("#timelineNameInput"),
    timelineMount: document.querySelector("#timelineMount"),
    toggleSidebarButton: document.querySelector("#toggleSidebarButton"),
    totalCount: document.querySelector("#totalCount"),
    upcomingCount: document.querySelector("#upcomingCount"),
    workspaceShell: document.querySelector("#workspaceShell"),
  };

  const state = loadSavedState();

  let currentSvgMarkup = "";
  let currentTimelineModel = null;
  let dragState = null;
  let editingTitleMilestoneId = "";
  let expandedRiskHistoryKey = "";
  let milestoneDialogMilestoneId = "";
  let timelineAddHover = { at: "", visible: false, x: CHART_LEFT };
  let ownerMenuMilestoneId = "";
  let ownerMenuPosition = { left: 0, top: 0 };
  let personDialogContext = null;
  let pendingPersonPhotoDataUrl = "";
  let statusMenuMilestoneId = "";
  let statusMenuPosition = { left: 0, top: 0 };

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function toDateTimeInput(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate(),
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function toDateInput(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate(),
    )}`;
  }

  function parseDateValue(value, includeTimes) {
    if (!value) {
      return null;
    }

    const match = String(value)
      .trim()
      .match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);

    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      const day = Number(match[3]);
      const hour = includeTimes && match[4] ? Number(match[4]) : 0;
      const minute = includeTimes && match[5] ? Number(match[5]) : 0;
      const date = new Date(year, month, day, hour, minute);

      return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function toDateInputValue(value) {
    const match = String(value || "").match(/^(\d{4}-\d{2}-\d{2})/);

    if (match) {
      return match[1];
    }

    const date = parseDateValue(value, false);
    return date ? toDateInput(date) : "";
  }

  function toDateTimeInputValue(value) {
    const date = parseDateValue(value, true);
    return date ? toDateTimeInput(date) : "";
  }

  function toDateValueForMode(date, includeTimes) {
    return includeTimes ? toDateTimeInput(date) : toDateInput(date);
  }

  function toInputValue(value, includeTimes) {
    return includeTimes ? toDateTimeInputValue(value) : toDateInputValue(value);
  }

  function dateWithOffset(anchor, days, hours) {
    const date = new Date(anchor);
    date.setDate(date.getDate() + days);
    date.setHours(date.getHours() + (hours || 0));
    return date;
  }

  function createRiskHistoryEntry(message) {
    return {
      id: makeId(),
      at: new Date().toISOString(),
      message: message,
    };
  }

  function createRisk(title, ownerId, status, historyMessages) {
    const normalizedStatus = status === "resolved" ? "resolved" : "open";
    const messages =
      Array.isArray(historyMessages) && historyMessages.length > 0
        ? historyMessages
        : [];

    return {
      id: makeId(),
      title: title || "New risk",
      ownerId: ownerId || "",
      status: normalizedStatus,
      history: messages.map(function (message) {
        return createRiskHistoryEntry(message);
      }),
    };
  }

  function createExamplePeople() {
    return [
      {
        id: "person-ari-chen",
        email: "",
        name: "Ari Chen",
        photoDataUrl: "",
      },
      {
        id: "person-maya-patel",
        email: "",
        name: "Maya Patel",
        photoDataUrl: "",
      },
      {
        id: "person-jon-bell",
        email: "",
        name: "Jon Bell",
        photoDataUrl: "",
      },
      {
        id: "person-sam-rivera",
        email: "",
        name: "Sam Rivera",
        photoDataUrl: "",
      },
      {
        id: "person-nina-park",
        email: "",
        name: "Nina Park",
        photoDataUrl: "",
      },
    ];
  }

  function createExampleMilestones(anchor, includeTimes) {
    return [
      {
        id: "brief-approved",
        title: "Brief approved",
        at: toDateValueForMode(dateWithOffset(anchor, -18, -3), includeTimes),
        details: "Scope, success metrics, and kickoff owners are confirmed.",
        ownerId: "person-ari-chen",
        risks: [],
        status: "completed",
      },
      {
        id: "data-freeze",
        title: "Data freeze",
        at: toDateValueForMode(dateWithOffset(anchor, -9, 2), includeTimes),
        details: "Reporting inputs are locked before final validation starts.",
        ownerId: "person-maya-patel",
        risks: [
          createRisk(
            "Late source changes could reopen the freeze.",
            "person-maya-patel",
            "resolved",
            ["Source owners confirmed the freeze window and escalation path."],
          ),
        ],
        status: "completed",
      },
      {
        id: "design-review",
        title: "Design review",
        at: toDateValueForMode(dateWithOffset(anchor, -2, -1), includeTimes),
        details: "Review flow, edge states, and launch-readiness notes.",
        ownerId: "person-jon-bell",
        risks: [
          createRisk(
            "Accessibility pass may need another review cycle.",
            "person-jon-bell",
            "open",
          ),
        ],
        status: "pending",
      },
      {
        id: "beta-launch",
        title: "Beta launch",
        at: toDateValueForMode(dateWithOffset(anchor, 6, 1), includeTimes),
        details: "Invite pilot users and monitor feedback during the first week.",
        ownerId: "person-sam-rivera",
        risks: [],
        status: "pending",
      },
      {
        id: "public-release",
        title: "Public release",
        at: toDateValueForMode(dateWithOffset(anchor, 20, -2), includeTimes),
        details: "Publish the release package and announce availability.",
        ownerId: "person-nina-park",
        risks: [],
        status: "pending",
      },
    ];
  }

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function getStorage() {
    try {
      return window.localStorage || null;
    } catch (_error) {
      return null;
    }
  }

  function normalizePerson(candidate, index) {
    if (!candidate || typeof candidate !== "object") {
      return null;
    }

    const name =
      typeof candidate.name === "string"
        ? candidate.name
        : typeof candidate.ownerName === "string"
          ? candidate.ownerName
          : "";
    const email =
      typeof candidate.email === "string"
        ? candidate.email
        : typeof candidate.ownerEmail === "string"
          ? candidate.ownerEmail
          : "";
    const photoDataUrl =
      typeof candidate.photoDataUrl === "string"
        ? candidate.photoDataUrl
        : typeof candidate.ownerPhotoDataUrl === "string"
          ? candidate.ownerPhotoDataUrl
          : "";

    if (!name.trim() && !email.trim() && !photoDataUrl) {
      return null;
    }

    return {
      id:
        typeof candidate.id === "string" && candidate.id.trim()
          ? candidate.id
          : `person-${index}-${makeId()}`,
      email: email,
      name: name,
      photoDataUrl: photoDataUrl,
    };
  }

  function personSignature(name, email, photoDataUrl) {
    const normalizedEmail = normalizeOwnerEmail(email);
    const normalizedName = String(name || "").trim().toLowerCase();

    if (normalizedEmail) {
      return `email:${normalizedEmail}`;
    }

    if (normalizedName) {
      return `name:${normalizedName}`;
    }

    return photoDataUrl ? `photo:${hashString(photoDataUrl)}` : "";
  }

  function findOrCreatePerson(people, name, email, photoDataUrl) {
    const signature = personSignature(name, email, photoDataUrl);
    const existing = signature
      ? people.find(function (person) {
          return (
            personSignature(person.name, person.email, person.photoDataUrl) ===
            signature
          );
        })
      : null;

    if (existing) {
      return existing;
    }

    const person = {
      id: makeId(),
      email: email || "",
      name: name || "",
      photoDataUrl: photoDataUrl || "",
    };

    people.push(person);
    return person;
  }

  function normalizePeople(candidates) {
    const people = Array.isArray(candidates)
      ? candidates
          .map(function (person, index) {
            return normalizePerson(person, index);
          })
          .filter(Boolean)
      : [];
    const seen = new Set();

    return people.filter(function (person) {
      const id = person.id.trim();

      if (seen.has(id)) {
        return false;
      }

      seen.add(id);
      person.id = id;
      return true;
    });
  }

  function personExists(people, personId) {
    return people.some(function (person) {
      return person.id === personId;
    });
  }

  function normalizeRiskHistory(candidates) {
    const entries = Array.isArray(candidates)
      ? candidates
          .map(function (entry, index) {
            if (!entry || typeof entry !== "object") {
              return null;
            }

            const message =
              typeof entry.message === "string"
                ? entry.message
                : typeof entry.text === "string"
                  ? entry.text
                  : "";

            if (!message.trim()) {
              return null;
            }

            return {
              id:
                typeof entry.id === "string" && entry.id.trim()
                  ? entry.id
                  : `risk-history-${index}-${makeId()}`,
              at:
                typeof entry.at === "string" && entry.at.trim()
                  ? entry.at
                  : new Date().toISOString(),
              message: message,
            };
          })
          .filter(Boolean)
      : [];

    return entries;
  }

  function normalizeRisk(candidate, index, people) {
    if (!candidate || typeof candidate !== "object") {
      return null;
    }

    let ownerId =
      typeof candidate.ownerId === "string" && candidate.ownerId.trim()
        ? candidate.ownerId.trim()
        : "";

    if (ownerId && !personExists(people, ownerId)) {
      ownerId = "";
    }

    return {
      id:
        typeof candidate.id === "string" && candidate.id.trim()
          ? candidate.id
          : `risk-${index}-${makeId()}`,
      title: typeof candidate.title === "string" ? candidate.title : "",
      ownerId: ownerId,
      status:
        candidate.status === "resolved" || candidate.status === "mitigated"
          ? "resolved"
          : "open",
      history: normalizeRiskHistory(candidate.history),
    };
  }

  function normalizeRisks(candidates, people) {
    return Array.isArray(candidates)
      ? candidates
          .map(function (risk, index) {
            return normalizeRisk(risk, index, people);
          })
          .filter(Boolean)
      : [];
  }

  function normalizeMilestone(candidate, index, people) {
    if (!candidate || typeof candidate !== "object") {
      return null;
    }

    const legacyOwnerName =
      typeof candidate.ownerName === "string" ? candidate.ownerName.trim() : "";
    const legacyOwnerEmail =
      typeof candidate.ownerEmail === "string"
        ? candidate.ownerEmail.trim()
        : "";
    const legacyOwnerPhotoDataUrl =
      typeof candidate.ownerPhotoDataUrl === "string"
        ? candidate.ownerPhotoDataUrl
        : "";
    let ownerId =
      typeof candidate.ownerId === "string" && candidate.ownerId.trim()
        ? candidate.ownerId.trim()
        : "";

    if (ownerId && !personExists(people, ownerId)) {
      ownerId = "";
    }

    if (
      !ownerId &&
      (legacyOwnerName || legacyOwnerEmail || legacyOwnerPhotoDataUrl)
    ) {
      ownerId = findOrCreatePerson(
        people,
        legacyOwnerName,
        legacyOwnerEmail,
        legacyOwnerPhotoDataUrl,
      ).id;
    }

    return {
      id:
        typeof candidate.id === "string" && candidate.id.trim()
          ? candidate.id
          : `saved-${index}-${makeId()}`,
      title: typeof candidate.title === "string" ? candidate.title : "",
      at: typeof candidate.at === "string" ? candidate.at : "",
      details:
        typeof candidate.details === "string" ? candidate.details : "",
      ownerId: ownerId,
      risks: normalizeRisks(candidate.risks, people),
      status: candidate.status === "completed" ? "completed" : "pending",
    };
  }

  function cloneRisks(risks) {
    return Array.isArray(risks)
      ? risks.map(function (risk) {
          return Object.assign({}, risk, {
            history: Array.isArray(risk.history)
              ? risk.history.map(function (entry) {
                  return Object.assign({}, entry);
                })
              : [],
          });
        })
      : [];
  }

  function cloneMilestones(milestones) {
    return milestones.map(function (milestone) {
      return Object.assign({}, milestone, {
        risks: cloneRisks(milestone.risks),
      });
    });
  }

  function clonePeople(people) {
    return people.map(function (person) {
      return Object.assign({}, person);
    });
  }

  function ensureExamplePeople(people) {
    createExamplePeople().forEach(function (samplePerson) {
      if (!personExists(people, samplePerson.id)) {
        people.push(Object.assign({}, samplePerson));
      }
    });
  }

  function createDefaultTimeline(name, withSample) {
    const now = new Date();

    return {
      id: makeId(),
      name: name || "Untitled timeline",
      asOf: toDateInput(now),
      includeTimes: false,
      milestones:
        withSample === false ? [] : createExampleMilestones(now, false),
      showToday: true,
    };
  }

  function normalizeTimeline(candidate, index, people) {
    if (!candidate || typeof candidate !== "object") {
      return null;
    }

    const now = new Date();
    const includeTimes =
      typeof candidate.includeTimes === "boolean"
        ? candidate.includeTimes
        : false;
    const fallbackMilestones = createExampleMilestones(now, includeTimes);
    const milestones = Array.isArray(candidate.milestones)
      ? candidate.milestones
          .map(function (milestone, milestoneIndex) {
            return normalizeMilestone(milestone, milestoneIndex, people);
          })
          .filter(Boolean)
      : (ensureExamplePeople(people), fallbackMilestones);

    return {
      id:
        typeof candidate.id === "string" && candidate.id.trim()
          ? candidate.id
          : `timeline-${index}-${makeId()}`,
      name:
        typeof candidate.name === "string" && candidate.name.trim()
          ? candidate.name.trim()
          : `Timeline ${index + 1}`,
      asOf:
        typeof candidate.asOf === "string"
          ? candidate.asOf
          : toDateValueForMode(now, includeTimes),
      includeTimes: includeTimes,
      milestones: milestones,
      showToday:
        typeof candidate.showToday === "boolean" ? candidate.showToday : true,
    };
  }

  function stateFromTimelines(
    timelines,
    activeTimelineId,
    sidebarCollapsed,
    people,
  ) {
    const activeTimeline =
      timelines.find(function (timeline) {
        return timeline.id === activeTimelineId;
      }) || timelines[0];

    return {
      activeTimelineId: activeTimeline.id,
      asOf: activeTimeline.asOf,
      includeTimes: activeTimeline.includeTimes,
      milestones: cloneMilestones(activeTimeline.milestones),
      name: activeTimeline.name,
      people: clonePeople(people),
      showToday: activeTimeline.showToday,
      sidebarCollapsed: Boolean(sidebarCollapsed),
      timelines: timelines,
    };
  }

  function loadSavedState() {
    const fallbackPeople = createExamplePeople();
    const fallbackTimeline = createDefaultTimeline("Timeline 1");
    const fallback = stateFromTimelines(
      [fallbackTimeline],
      fallbackTimeline.id,
      false,
      fallbackPeople,
    );
    const storage = getStorage();

    if (!storage) {
      return fallback;
    }

    try {
      const saved = JSON.parse(storage.getItem(STORAGE_KEY) || "null");

      if (!saved || typeof saved !== "object") {
        return fallback;
      }

      const people = normalizePeople(saved.people);

      if (Array.isArray(saved.timelines)) {
        const timelines = saved.timelines
          .map(function (timeline, index) {
            return normalizeTimeline(timeline, index, people);
          })
          .filter(Boolean);

        if (timelines.length > 0) {
          return stateFromTimelines(
            timelines,
            saved.activeTimelineId,
            saved.sidebarCollapsed,
            people,
          );
        }
      }

      const legacyTimeline = normalizeTimeline(
        Object.assign({ id: fallbackTimeline.id, name: "Timeline 1" }, saved),
        0,
        people,
      );

      return stateFromTimelines(
        [legacyTimeline || fallbackTimeline],
        legacyTimeline ? legacyTimeline.id : fallbackTimeline.id,
        false,
        people,
      );
    } catch (_error) {
      return fallback;
    }
  }

  function syncActiveTimelineFromState() {
    state.timelines = state.timelines.map(function (timeline) {
      if (timeline.id !== state.activeTimelineId) {
        return timeline;
      }

      return {
        id: timeline.id,
        name: state.name,
        asOf: state.asOf,
        includeTimes: state.includeTimes,
        milestones: cloneMilestones(state.milestones),
        showToday: state.showToday,
      };
    });
  }

  function loadTimelineIntoActiveState(timelineId) {
    const timeline =
      state.timelines.find(function (candidate) {
        return candidate.id === timelineId;
      }) || state.timelines[0];

    state.activeTimelineId = timeline.id;
    state.name = timeline.name;
    state.asOf = timeline.asOf;
    state.includeTimes = timeline.includeTimes;
    state.milestones = cloneMilestones(timeline.milestones);
    state.showToday = timeline.showToday;
  }

  function saveState() {
    const storage = getStorage();

    if (!storage) {
      return;
    }

    syncActiveTimelineFromState();

    try {
      storage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          activeTimelineId: state.activeTimelineId,
          people: state.people,
          sidebarCollapsed: state.sidebarCollapsed,
          timelines: state.timelines,
          version: 5,
        }),
      );
    } catch (_error) {
      // Keep the editor usable if browser storage is unavailable or full.
    }
  }

  function saveAndRender() {
    saveState();
    render();
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[character];
    });
  }

  function closestMatch(target, selector) {
    return target && typeof target.closest === "function"
      ? target.closest(selector)
      : null;
  }

  function shortLabel(value, maxLength) {
    const trimmed = String(value || "").trim();
    const limit = maxLength || 28;

    return trimmed.length > limit
      ? `${trimmed.slice(0, limit - 3)}...`
      : trimmed || "Untitled milestone";
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function estimateTextWidth(value, averageCharacterWidth) {
    return String(value || "").length * averageCharacterWidth;
  }

  function getLabelWidth(title, dateLabel) {
    return clamp(
      Math.max(estimateTextWidth(title, 10.8), estimateTextWidth(dateLabel, 8)) +
        34,
      LABEL_MIN_WIDTH,
      LABEL_MAX_WIDTH,
    );
  }

  function hashString(value) {
    return String(value || "").split("").reduce(function (hash, character) {
      return (hash * 31 + character.charCodeAt(0)) >>> 0;
    }, 2166136261);
  }

  function ownerSource(value) {
    return value && value.owner ? value.owner : value || {};
  }

  function ownerName(value) {
    return String(ownerSource(value).name || "").trim();
  }

  function ownerEmail(value) {
    return String(ownerSource(value).email || "").trim();
  }

  function ownerPhotoDataUrl(value) {
    return String(ownerSource(value).photoDataUrl || "");
  }

  function ownerLabel(value) {
    return ownerName(value) || ownerEmail(value);
  }

  function ownerInitials(value) {
    const label = ownerLabel(value);

    if (!label) {
      return "";
    }

    const words = label
      .replace(/@.*/, "")
      .split(/[\s._-]+/)
      .filter(Boolean);
    const initials =
      words.length > 1
        ? `${words[0][0]}${words[1][0]}`
        : label.slice(0, 2);

    return initials.toUpperCase();
  }

  function ownerAvatarColor(value) {
    const colors = [
      "#0f766e",
      "#1d4ed8",
      "#7c3aed",
      "#be123c",
      "#b45309",
      "#047857",
      "#4338ca",
      "#0369a1",
    ];

    return colors[hashString(ownerLabel(value)) % colors.length];
  }

  function normalizeOwnerEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function md5(input) {
    function addUnsigned(left, right) {
      const leftLow = left & 0xffff;
      const leftHigh = left >>> 16;
      const rightLow = right & 0xffff;
      const rightHigh = right >>> 16;
      const low = leftLow + rightLow;

      return (((leftHigh + rightHigh + (low >>> 16)) << 16) | (low & 0xffff)) >>> 0;
    }

    function rotateLeft(value, bits) {
      return (value << bits) | (value >>> (32 - bits));
    }

    function cmn(q, a, b, x, s, t) {
      return addUnsigned(
        rotateLeft(addUnsigned(addUnsigned(a, q), addUnsigned(x, t)), s),
        b,
      );
    }

    function ff(a, b, c, d, x, s, t) {
      return cmn((b & c) | (~b & d), a, b, x, s, t);
    }

    function gg(a, b, c, d, x, s, t) {
      return cmn((b & d) | (c & ~d), a, b, x, s, t);
    }

    function hh(a, b, c, d, x, s, t) {
      return cmn(b ^ c ^ d, a, b, x, s, t);
    }

    function ii(a, b, c, d, x, s, t) {
      return cmn(c ^ (b | ~d), a, b, x, s, t);
    }

    function utf8BinaryString(value) {
      return unescape(encodeURIComponent(value));
    }

    function toWords(value) {
      const wordArray = [];
      let index;

      for (index = 0; index < value.length * 8; index += 8) {
        wordArray[index >> 5] |=
          (value.charCodeAt(index / 8) & 0xff) << index % 32;
      }

      wordArray[index >> 5] |= 0x80 << index % 32;
      wordArray[(((index + 64) >>> 9) << 4) + 14] = index;

      return wordArray;
    }

    function wordToHex(value) {
      let output = "";

      for (let index = 0; index <= 3; index += 1) {
        output += `0${((value >>> (index * 8)) & 0xff).toString(16)}`.slice(-2);
      }

      return output;
    }

    const x = toWords(utf8BinaryString(input));
    let a = 0x67452301;
    let b = 0xefcdab89;
    let c = 0x98badcfe;
    let d = 0x10325476;

    for (let k = 0; k < x.length; k += 16) {
      const aa = a;
      const bb = b;
      const cc = c;
      const dd = d;

      a = ff(a, b, c, d, x[k + 0], 7, 0xd76aa478);
      d = ff(d, a, b, c, x[k + 1], 12, 0xe8c7b756);
      c = ff(c, d, a, b, x[k + 2], 17, 0x242070db);
      b = ff(b, c, d, a, x[k + 3], 22, 0xc1bdceee);
      a = ff(a, b, c, d, x[k + 4], 7, 0xf57c0faf);
      d = ff(d, a, b, c, x[k + 5], 12, 0x4787c62a);
      c = ff(c, d, a, b, x[k + 6], 17, 0xa8304613);
      b = ff(b, c, d, a, x[k + 7], 22, 0xfd469501);
      a = ff(a, b, c, d, x[k + 8], 7, 0x698098d8);
      d = ff(d, a, b, c, x[k + 9], 12, 0x8b44f7af);
      c = ff(c, d, a, b, x[k + 10], 17, 0xffff5bb1);
      b = ff(b, c, d, a, x[k + 11], 22, 0x895cd7be);
      a = ff(a, b, c, d, x[k + 12], 7, 0x6b901122);
      d = ff(d, a, b, c, x[k + 13], 12, 0xfd987193);
      c = ff(c, d, a, b, x[k + 14], 17, 0xa679438e);
      b = ff(b, c, d, a, x[k + 15], 22, 0x49b40821);

      a = gg(a, b, c, d, x[k + 1], 5, 0xf61e2562);
      d = gg(d, a, b, c, x[k + 6], 9, 0xc040b340);
      c = gg(c, d, a, b, x[k + 11], 14, 0x265e5a51);
      b = gg(b, c, d, a, x[k + 0], 20, 0xe9b6c7aa);
      a = gg(a, b, c, d, x[k + 5], 5, 0xd62f105d);
      d = gg(d, a, b, c, x[k + 10], 9, 0x02441453);
      c = gg(c, d, a, b, x[k + 15], 14, 0xd8a1e681);
      b = gg(b, c, d, a, x[k + 4], 20, 0xe7d3fbc8);
      a = gg(a, b, c, d, x[k + 9], 5, 0x21e1cde6);
      d = gg(d, a, b, c, x[k + 14], 9, 0xc33707d6);
      c = gg(c, d, a, b, x[k + 3], 14, 0xf4d50d87);
      b = gg(b, c, d, a, x[k + 8], 20, 0x455a14ed);
      a = gg(a, b, c, d, x[k + 13], 5, 0xa9e3e905);
      d = gg(d, a, b, c, x[k + 2], 9, 0xfcefa3f8);
      c = gg(c, d, a, b, x[k + 7], 14, 0x676f02d9);
      b = gg(b, c, d, a, x[k + 12], 20, 0x8d2a4c8a);

      a = hh(a, b, c, d, x[k + 5], 4, 0xfffa3942);
      d = hh(d, a, b, c, x[k + 8], 11, 0x8771f681);
      c = hh(c, d, a, b, x[k + 11], 16, 0x6d9d6122);
      b = hh(b, c, d, a, x[k + 14], 23, 0xfde5380c);
      a = hh(a, b, c, d, x[k + 1], 4, 0xa4beea44);
      d = hh(d, a, b, c, x[k + 4], 11, 0x4bdecfa9);
      c = hh(c, d, a, b, x[k + 7], 16, 0xf6bb4b60);
      b = hh(b, c, d, a, x[k + 10], 23, 0xbebfbc70);
      a = hh(a, b, c, d, x[k + 13], 4, 0x289b7ec6);
      d = hh(d, a, b, c, x[k + 0], 11, 0xeaa127fa);
      c = hh(c, d, a, b, x[k + 3], 16, 0xd4ef3085);
      b = hh(b, c, d, a, x[k + 6], 23, 0x04881d05);
      a = hh(a, b, c, d, x[k + 9], 4, 0xd9d4d039);
      d = hh(d, a, b, c, x[k + 12], 11, 0xe6db99e5);
      c = hh(c, d, a, b, x[k + 15], 16, 0x1fa27cf8);
      b = hh(b, c, d, a, x[k + 2], 23, 0xc4ac5665);

      a = ii(a, b, c, d, x[k + 0], 6, 0xf4292244);
      d = ii(d, a, b, c, x[k + 7], 10, 0x432aff97);
      c = ii(c, d, a, b, x[k + 14], 15, 0xab9423a7);
      b = ii(b, c, d, a, x[k + 5], 21, 0xfc93a039);
      a = ii(a, b, c, d, x[k + 12], 6, 0x655b59c3);
      d = ii(d, a, b, c, x[k + 3], 10, 0x8f0ccc92);
      c = ii(c, d, a, b, x[k + 10], 15, 0xffeff47d);
      b = ii(b, c, d, a, x[k + 1], 21, 0x85845dd1);
      a = ii(a, b, c, d, x[k + 8], 6, 0x6fa87e4f);
      d = ii(d, a, b, c, x[k + 15], 10, 0xfe2ce6e0);
      c = ii(c, d, a, b, x[k + 6], 15, 0xa3014314);
      b = ii(b, c, d, a, x[k + 13], 21, 0x4e0811a1);
      a = ii(a, b, c, d, x[k + 4], 6, 0xf7537e82);
      d = ii(d, a, b, c, x[k + 11], 10, 0xbd3af235);
      c = ii(c, d, a, b, x[k + 2], 15, 0x2ad7d2bb);
      b = ii(b, c, d, a, x[k + 9], 21, 0xeb86d391);

      a = addUnsigned(a, aa);
      b = addUnsigned(b, bb);
      c = addUnsigned(c, cc);
      d = addUnsigned(d, dd);
    }

    return `${wordToHex(a)}${wordToHex(b)}${wordToHex(c)}${wordToHex(d)}`;
  }

  function gravatarUrl(email) {
    const normalizedEmail = normalizeOwnerEmail(email);

    return normalizedEmail
      ? `https://www.gravatar.com/avatar/${md5(
          normalizedEmail,
        )}?d=identicon&s=${AVATAR_RENDER_SIZE}`
      : "";
  }

  function ownerAvatarSrc(value) {
    const photoDataUrl = ownerPhotoDataUrl(value);

    if (photoDataUrl) {
      return photoDataUrl;
    }

    return gravatarUrl(ownerEmail(value));
  }

  function shouldRenderOwnerAvatar(value) {
    return Boolean(
      ownerPhotoDataUrl(value) ||
        normalizeOwnerEmail(ownerEmail(value)) ||
        ownerLabel(value),
    );
  }

  function formatDate(date, includeTime) {
    const options = includeTime
      ? {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }
      : { month: "short", day: "numeric" };

    return new Intl.DateTimeFormat(undefined, options).format(date);
  }

  function formatTickDate(date, span, includeTimes) {
    return formatDate(date, includeTimes && span <= 4 * DAY_MS);
  }

  function formatMilestoneDate(date, includeTimes) {
    return formatDate(date, includeTimes);
  }

  function getMilestoneState(status, timestamp, asOfDate) {
    if (status === "completed") {
      return "completed";
    }

    if (asOfDate && timestamp < asOfDate.getTime()) {
      return "overdue";
    }

    return "upcoming";
  }

  function getX(timestamp, minTime, maxTime) {
    const drawableWidth = CHART_WIDTH - CHART_LEFT - CHART_RIGHT;
    return (
      CHART_LEFT +
      ((timestamp - minTime) / Math.max(maxTime - minTime, 1)) * drawableWidth
    );
  }

  function roundTimestampForMode(timestamp, includeTimes) {
    if (includeTimes) {
      return Math.round(timestamp / (15 * 60 * 1000)) * 15 * 60 * 1000;
    }

    const date = new Date(timestamp);
    const dayStart = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );

    if (timestamp - dayStart.getTime() >= DAY_MS / 2) {
      dayStart.setDate(dayStart.getDate() + 1);
    }

    return dayStart.getTime();
  }

  function dateValueFromTimestamp(timestamp, includeTimes) {
    return toDateValueForMode(
      new Date(roundTimestampForMode(timestamp, includeTimes)),
      includeTimes,
    );
  }

  function chartXToTimestamp(x, model) {
    const drawableWidth = CHART_WIDTH - CHART_LEFT - CHART_RIGHT;
    const clampedX = clamp(x, CHART_LEFT, CHART_WIDTH - CHART_RIGHT);

    return (
      model.minTime +
      ((clampedX - CHART_LEFT) / drawableWidth) *
        Math.max(model.maxTime - model.minTime, 1)
    );
  }

  function clientXToChartX(clientX, model) {
    const svg =
      elements.timelineMount.querySelector &&
      elements.timelineMount.querySelector("svg");
    const rect =
      svg && typeof svg.getBoundingClientRect === "function"
        ? svg.getBoundingClientRect()
        : { left: 0, width: model.width };

    return ((clientX - rect.left) / Math.max(rect.width, 1)) * model.width;
  }

  function clientDeltaToChartDelta(clientDelta, model) {
    const svg =
      elements.timelineMount.querySelector &&
      elements.timelineMount.querySelector("svg");
    const rect =
      svg && typeof svg.getBoundingClientRect === "function"
        ? svg.getBoundingClientRect()
        : { width: model.width };

    return (clientDelta / Math.max(rect.width, 1)) * model.width;
  }

  function getWeekendBands(minTime, maxTime) {
    const cursor = new Date(minTime);
    cursor.setHours(0, 0, 0, 0);

    if (cursor.getDay() === 0) {
      cursor.setDate(cursor.getDate() - 1);
    } else if (cursor.getDay() !== 6) {
      cursor.setDate(cursor.getDate() + 6 - cursor.getDay());
    }

    const bands = [];

    while (cursor.getTime() < maxTime) {
      const weekendStart = cursor.getTime();
      const weekendEnd = new Date(cursor);
      weekendEnd.setDate(weekendEnd.getDate() + 2);

      const start = Math.max(weekendStart, minTime);
      const end = Math.min(weekendEnd.getTime(), maxTime);

      if (end > start) {
        bands.push({
          end: end,
          start: start,
        });
      }

      cursor.setDate(cursor.getDate() + 7);
    }

    return bands;
  }

  function buildTicks(minTime, maxTime) {
    return Array.from({ length: 6 }, function (_, index) {
      const timestamp = minTime + ((maxTime - minTime) / 5) * index;
      return {
        date: new Date(timestamp),
        x: getX(timestamp, minTime, maxTime),
      };
    });
  }

  function createLabelTrack(side, row) {
    return {
      lastRight: Number.NEGATIVE_INFINITY,
      row: row,
      side: side,
    };
  }

  function sortCandidateTracks(track, preferredSide) {
    return (track.side === preferredSide ? 0 : 1) * 100 + track.row;
  }

  function chooseNewTrackSide(preferredSide, topRows, bottomRows) {
    const preferredRows = preferredSide === "top" ? topRows : bottomRows;
    const otherRows = preferredSide === "top" ? bottomRows : topRows;

    if (preferredRows <= otherRows) {
      return preferredSide;
    }

    return preferredSide === "top" ? "bottom" : "top";
  }

  function assignLabelTracks(points, span, includeTimes) {
    const tracks = [];
    let topRows = 0;
    let bottomRows = 0;

    const trackedPoints = points.map(function (point, index) {
      const title = shortLabel(point.title, 26);
      const dateLabel = formatMilestoneDate(point.date, includeTimes);
      const labelWidth = getLabelWidth(title, dateLabel);
      const labelX = clamp(
        point.x,
        LABEL_SIDE_PADDING + labelWidth / 2,
        CHART_WIDTH - LABEL_SIDE_PADDING - labelWidth / 2,
      );
      const labelLeft = labelX - labelWidth / 2;
      const labelRight = labelX + labelWidth / 2;
      const preferredSide = index % 2 === 0 ? "top" : "bottom";
      let track = tracks
        .slice()
        .sort(function (a, b) {
          return (
            sortCandidateTracks(a, preferredSide) -
            sortCandidateTracks(b, preferredSide)
          );
        })
        .find(function (candidate) {
          return labelLeft >= candidate.lastRight + LABEL_GAP;
        });

      if (!track) {
        const side = chooseNewTrackSide(preferredSide, topRows, bottomRows);
        const row = side === "top" ? topRows++ : bottomRows++;

        track = createLabelTrack(side, row);
        tracks.push(track);
      }

      track.lastRight = labelRight;

      return Object.assign({}, point, {
        dateLabel: dateLabel,
        labelLeft: labelLeft,
        labelRight: labelRight,
        labelRow: track.row,
        labelSide: track.side,
        labelWidth: labelWidth,
        labelX: labelX,
        titleLabel: title,
      });
    });

    return {
      bottomRows: bottomRows,
      points: trackedPoints,
      topRows: topRows,
    };
  }

  function getAxisY(topRows) {
    const rowCount = Math.max(topRows, 1);

    return Math.max(
      AXIS_Y,
      LABEL_TOP_PADDING +
        LABEL_TOP_EXTENT +
        LABEL_AXIS_GAP +
        (rowCount - 1) * LABEL_ROW_HEIGHT,
    );
  }

  function getChartHeight(axisY, bottomRows) {
    if (bottomRows === 0) {
      return Math.max(MIN_CHART_HEIGHT, axisY + LABEL_BOTTOM_EXTENT + 74);
    }

    return Math.max(
      MIN_CHART_HEIGHT,
      axisY +
        LABEL_AXIS_GAP +
        (bottomRows - 1) * LABEL_ROW_HEIGHT +
        LABEL_BOTTOM_EXTENT +
        74,
    );
  }

  function buildTimelineModel(
    parsedMilestones,
    markerDate,
    showMarker,
    includeTimes,
  ) {
    const markerTime = markerDate ? markerDate.getTime() : null;
    const timestamps = parsedMilestones.map(function (milestone) {
      return milestone.timestamp;
    });

    if (showMarker && markerTime !== null) {
      timestamps.push(markerTime);
    }

    const fallbackTime = markerTime || Date.now();

    if (timestamps.length === 0) {
      timestamps.push(fallbackTime - 7 * DAY_MS, fallbackTime + 7 * DAY_MS);
    }

    let minTime = Math.min.apply(null, timestamps);
    let maxTime = Math.max.apply(null, timestamps);

    if (minTime === maxTime) {
      minTime -= DAY_MS;
      maxTime += DAY_MS;
    } else {
      const padding = Math.max((maxTime - minTime) * 0.1, DAY_MS / 2);
      minTime -= padding;
      maxTime += padding;
    }

    const basicPoints = parsedMilestones
      .slice()
      .sort(function (a, b) {
        return a.timestamp - b.timestamp;
      })
      .map(function (milestone) {
        const x = getX(milestone.timestamp, minTime, maxTime);

        return Object.assign({}, milestone, {
          x: x,
        });
      });
    const span = maxTime - minTime;
    const labelLayout = assignLabelTracks(basicPoints, span, includeTimes);
    const axisY = getAxisY(labelLayout.topRows);
    const height = getChartHeight(axisY, labelLayout.bottomRows);
    const points = labelLayout.points.map(function (point) {
      const rowOffset = point.labelRow * LABEL_ROW_HEIGHT;
      const y =
        point.labelSide === "top"
          ? axisY - LABEL_AXIS_GAP - rowOffset
          : axisY + LABEL_AXIS_GAP + rowOffset;

      return Object.assign({}, point, {
        y: y,
      });
    });

    return {
      axisY: axisY,
      height: height,
      markerX:
        showMarker && markerTime !== null
          ? getX(markerTime, minTime, maxTime)
          : null,
      minTime: minTime,
      maxTime: maxTime,
      includeTimes: includeTimes,
      points: points,
      ticks: buildTicks(minTime, maxTime),
      weekendBands: getWeekendBands(minTime, maxTime),
      width: CHART_WIDTH,
    };
  }

  function getMarkerStyle(timelineState) {
    if (timelineState === "completed") {
      return {
        fill: "#16a34a",
        stroke: "#15803d",
        strokeWidth: 2,
        opacity: 0.48,
      };
    }

    if (timelineState === "overdue") {
      return {
        fill: "#fef3c7",
        stroke: "#d97706",
        strokeWidth: 5,
        opacity: 1,
      };
    }

    return {
      fill: "#ecfeff",
      stroke: "#0f766e",
      strokeWidth: 2,
      opacity: 1,
    };
  }

  function statusIcon(timelineState) {
    if (timelineState === "completed") {
      return [
        '<path d="M -8 0 L -2 6 L 9 -7" fill="none"',
        'stroke="#ffffff" stroke-linecap="round" stroke-linejoin="round"',
        'stroke-width="3" />',
      ].join(" ");
    }

    if (timelineState === "overdue") {
      return [
        '<path d="M 0 -10 L 10 8 L -10 8 Z" fill="#f59e0b" />',
        '<line stroke="#7c2d12" stroke-linecap="round" stroke-width="2"',
        'x1="0" x2="0" y1="-4" y2="2" />',
        '<circle cx="0" cy="5.5" fill="#7c2d12" r="1.4" />',
      ].join(" ");
    }

    return '<circle cx="0" cy="0" fill="#0f766e" r="4" />';
  }

  function renderTimelineRiskIndicator(summary) {
    if (summary.state === "none") {
      return "";
    }

    const label = escapeHtml(riskSummaryHoverLabel(summary));
    const indicator =
      summary.state === "mixed"
        ? [
            '<circle fill="#16a34a" r="7" />',
            '<path d="M 0 -7 A 7 7 0 0 1 0 7 Z" fill="#d97706" />',
          ].join("")
        : `<circle fill="${
            summary.state === "resolved" ? "#16a34a" : "#d97706"
          }" r="7" />`;

    return `
      <g aria-label="${label}" class="timeline-risk-status" role="img">
        <title>${label}</title>
        ${indicator}
        <circle fill="none" r="7" stroke="#ffffff" stroke-width="2" />
        <circle fill="none" r="8.5" stroke="#94a3b8" stroke-width="1" />
      </g>
    `;
  }

  function ownerAvatarPosition(point) {
    return {
      x: point.labelX - LABEL_BADGE_RADIUS - AVATAR_RADIUS - 6,
      y: point.y,
    };
  }

  function renderTimelineOwnerAvatar(layout, index) {
    const point = layout.point;

    if (!shouldRenderOwnerAvatar(point)) {
      return "";
    }

    const avatar = ownerAvatarPosition(point);
    const avatarSrc = ownerAvatarSrc(point);
    const clipId = `timelineOwnerAvatar${index}`;
    const initials = escapeHtml(ownerInitials(point));
    const owner = escapeHtml(ownerLabel(point) || "Owner");
    let avatarMarkup;

    if (avatarSrc) {
      avatarMarkup = `
        <defs>
          <clipPath id="${clipId}" clipPathUnits="userSpaceOnUse">
            <circle cx="${avatar.x}" cy="${avatar.y}" r="${AVATAR_RADIUS}" />
          </clipPath>
        </defs>
        <image href="${escapeHtml(avatarSrc)}"
          x="${avatar.x - AVATAR_RADIUS}" y="${avatar.y - AVATAR_RADIUS}"
          width="${AVATAR_SIZE}" height="${AVATAR_SIZE}"
          preserveAspectRatio="xMidYMid slice"
          clip-path="url(#${clipId})" />
      `;
    } else {
      avatarMarkup = `
        <circle cx="${avatar.x}" cy="${avatar.y}"
          fill="${ownerAvatarColor(point)}" r="${AVATAR_RADIUS}" />
        <text fill="#ffffff" font-size="11" font-weight="900"
          text-anchor="middle" x="${avatar.x}" y="${avatar.y + 4}">${initials}</text>
      `;
    }

    return `
      <g aria-label="${owner}" class="timeline-owner-avatar" role="img">
        <title>${owner}</title>
        ${avatarMarkup}
        <circle cx="${avatar.x}" cy="${avatar.y}" fill="none"
          r="${AVATAR_RADIUS}" stroke="#ffffff" stroke-width="3" />
        <circle cx="${avatar.x}" cy="${avatar.y}" fill="none"
          r="${AVATAR_RADIUS}" stroke="#475569" stroke-width="1" />
      </g>
    `;
  }

  function renderTimelineOwnerAvatarMask(layout) {
    const point = layout.point;

    if (!shouldRenderOwnerAvatar(point)) {
      return "";
    }

    const avatar = ownerAvatarPosition(point);

    return `
      <circle cx="${avatar.x}" cy="${avatar.y}" fill="#ffffff"
        r="${AVATAR_RADIUS + 4}" />
    `;
  }

  function renderChart(model, showMarker) {
    const span = model.maxTime - model.minTime;
    const gridBottom = model.height - 62;
    const tickLabelY = model.height - 28;
    const timelineAddMarkup = timelineAddHover.visible
      ? `
          <g aria-label="Add milestone on ${escapeHtml(timelineAddHover.at)}"
            class="timeline-add-control" data-action="create-milestone-at"
            data-at="${escapeHtml(timelineAddHover.at)}" role="button"
            tabindex="0" transform="translate(${timelineAddHover.x} ${model.axisY})">
            <title>Add milestone on ${escapeHtml(timelineAddHover.at)}</title>
            <circle fill="#ffffff" r="10.5" stroke="#cbd5e1" stroke-width="1.5" />
            <path d="M -4.5 0 H 4.5 M 0 -4.5 V 4.5" fill="none"
              stroke="#0f766e" stroke-linecap="round" stroke-width="1.8" />
          </g>
        `
      : "";
    const weekendBandMarkup = model.weekendBands
      .map(function (band) {
        const x = getX(band.start, model.minTime, model.maxTime);
        const endX = getX(band.end, model.minTime, model.maxTime);

        return `
          <rect fill="#f1f5f9" height="${gridBottom - 52}"
            opacity="0.72" width="${Math.max(endX - x, 0)}"
            x="${x}" y="52" />
        `;
      })
      .join("");
    const ticksMarkup = model.ticks
      .map(function (tick) {
        return `
          <g>
            <line stroke="#e2e8f0" stroke-dasharray="4 8" stroke-width="1"
              x1="${tick.x}" x2="${tick.x}" y1="52" y2="${gridBottom}" />
            <text fill="#64748b" font-size="16" text-anchor="middle"
              x="${tick.x}" y="${tickLabelY}">${escapeHtml(
                formatTickDate(tick.date, span, model.includeTimes),
              )}</text>
          </g>
        `;
      })
      .join("");

    const markerMarkup =
      showMarker && model.markerX !== null
        ? `
          <g>
            <line stroke="#dc2626" stroke-dasharray="8 7" stroke-linecap="round"
              stroke-width="4" x1="${model.markerX}" x2="${model.markerX}"
              y1="44" y2="${gridBottom}" />
            <rect fill="#dc2626" height="30" rx="6" width="78"
              x="${model.markerX - 39}" y="22" />
            <text fill="#ffffff" font-size="15" font-weight="700"
              text-anchor="middle" x="${model.markerX}" y="42">Today</text>
          </g>
        `
        : "";

    const emptyMarkup =
      model.points.length === 0
        ? `
          <text fill="#64748b" font-size="20" font-weight="700"
            text-anchor="middle" x="${CHART_WIDTH / 2}" y="${model.axisY - 34}">
            Add a milestone
          </text>
        `
        : "";

    const pointLayouts = model.points
      .map(function (point) {
        const style = getMarkerStyle(point.timelineState);
        const isTopLabel = point.labelSide === "top";
        const connectorY = isTopLabel
          ? point.y + LABEL_BADGE_RADIUS + 10
          : point.y - LABEL_BADGE_RADIUS - 10;
        const badgeEdgeY = isTopLabel
          ? point.y + LABEL_BADGE_RADIUS + 1
          : point.y - LABEL_BADGE_RADIUS - 1;
        const labelRectY = isTopLabel
          ? point.y - LABEL_TOP_EXTENT
          : point.y + 28;
        const titleY = labelRectY + 20;
        const dateY = labelRectY + 42;
        const labelOpacity = point.timelineState === "completed" ? 0.56 : 1;
        const title = escapeHtml(point.titleLabel);
        const dateLabel = escapeHtml(point.dateLabel);
        const actionIconX = point.labelRight + 13;
        const actionBridgeX = point.labelRight;
        const actionBridgeWidth = 24;
        const editIconX = actionIconX;
        const editIconY = labelRectY + 13;
        const deleteIconX = actionIconX;
        const deleteIconY = labelRectY + 35;
        const riskDotX = point.labelX + 19;
        const riskDotY = point.y - 18;
        const risk = riskSummary(point);
        const connectorColor =
          point.timelineState === "overdue" ? "#d97706" : "#94a3b8";
        const connectorWidth = point.timelineState === "overdue" ? 3 : 2;
        const anchorColor =
          point.timelineState === "overdue" ? "#d97706" : "#475569";
        const anchorWidth = point.timelineState === "overdue" ? 4 : 2;
        const anchorMaskRadius = 13;
        const markerMaskRadius = LABEL_BADGE_RADIUS + 4;

        return {
          anchorColor: anchorColor,
          anchorMaskRadius: anchorMaskRadius,
          anchorWidth: anchorWidth,
          badgeEdgeY: badgeEdgeY,
          connectorColor: connectorColor,
          connectorWidth: connectorWidth,
          connectorY: connectorY,
          actionBridgeWidth: actionBridgeWidth,
          actionBridgeX: actionBridgeX,
          dateLabel: dateLabel,
          dateY: dateY,
          deleteIconX: deleteIconX,
          deleteIconY: deleteIconY,
          editIconX: editIconX,
          editIconY: editIconY,
          labelOpacity: labelOpacity,
          labelRectY: labelRectY,
          markerMaskRadius: markerMaskRadius,
          point: point,
          risk: risk,
          riskDotX: riskDotX,
          riskDotY: riskDotY,
          style: style,
          title: title,
          titleY: titleY,
        };
      });
    const connectorMarkup = pointLayouts
      .map(function (layout) {
        const point = layout.point;

        return `
          <path d="M ${point.x} ${model.axisY} V ${layout.connectorY} H ${point.labelX} V ${layout.badgeEdgeY}"
            fill="none" opacity="${layout.labelOpacity}"
            stroke="${layout.connectorColor}" stroke-linecap="round"
            stroke-linejoin="round" stroke-width="${layout.connectorWidth}" />
        `;
      })
      .join("");
    const pointMaskMarkup = pointLayouts
      .map(function (layout) {
        const point = layout.point;

        return `
          <circle cx="${point.x}" cy="${model.axisY}" fill="#ffffff"
            r="${layout.anchorMaskRadius}" />
          <circle cx="${point.labelX}" cy="${point.y}" fill="#ffffff"
            r="${layout.markerMaskRadius}" />
          ${
            layout.risk.state === "none"
              ? ""
              : `<circle cx="${layout.riskDotX}" cy="${layout.riskDotY}"
                  fill="#ffffff" r="10" />`
          }
          ${renderTimelineOwnerAvatarMask(layout)}
          <rect fill="#ffffff" height="48" rx="7"
            width="${point.labelWidth}" x="${point.labelLeft}"
            y="${layout.labelRectY}" />
        `;
      })
      .join("");
    const pointMarkup = pointLayouts
      .map(function (layout, index) {
        const point = layout.point;

        return `
          <g class="timeline-point">
            <g opacity="${layout.labelOpacity}">
              <circle class="timeline-date-handle" cx="${point.x}" cy="${model.axisY}"
                data-action="drag-date" data-id="${escapeHtml(point.id)}"
                fill="#ffffff" r="9" stroke="${layout.anchorColor}"
                stroke-width="${layout.anchorWidth}" />
              <g aria-label="Change status or drag to reschedule ${layout.title}"
                class="timeline-marker-action" data-action="drag-date"
                data-id="${escapeHtml(point.id)}" role="button" tabindex="0"
                transform="translate(${point.labelX} ${point.y})">
                <circle fill="${layout.style.fill}" opacity="${layout.style.opacity}" r="21"
                  stroke="${layout.style.stroke}" stroke-width="${layout.style.strokeWidth}" />
                ${statusIcon(point.timelineState)}
                <g transform="translate(19 -18)">
                  ${renderTimelineRiskIndicator(layout.risk)}
                </g>
              </g>
              ${renderTimelineOwnerAvatar(layout, index)}
              <g aria-label="Edit title ${layout.title}" class="timeline-title-action"
                data-action="edit-title" data-id="${escapeHtml(point.id)}"
                role="button" tabindex="0">
                <rect fill="#ffffff" height="48" rx="7"
                  stroke="#e2e8f0" stroke-width="1"
                  width="${point.labelWidth}" x="${point.labelLeft}"
                  y="${layout.labelRectY}" />
                <text fill="#0f172a" font-size="18" font-weight="800"
                  text-anchor="middle" x="${point.labelX}" y="${layout.titleY}">${layout.title}</text>
              </g>
              <text fill="#64748b" font-size="15" font-weight="600"
                text-anchor="middle" x="${point.labelX}" y="${layout.dateY}">${layout.dateLabel}</text>
            </g>
            <rect class="timeline-action-hover-bridge" fill="transparent"
              height="48" pointer-events="all" width="${layout.actionBridgeWidth}"
              x="${layout.actionBridgeX}" y="${layout.labelRectY}" />
            <g aria-label="Edit ${layout.title}" class="timeline-edit-action"
              data-action="open-milestone-dialog" data-id="${escapeHtml(point.id)}"
              role="button" tabindex="0"
              transform="translate(${layout.editIconX} ${layout.editIconY})">
              <title>Edit ${layout.title}</title>
              <circle fill="#ffffff" r="9" stroke="#cbd5e1" stroke-width="1.5" />
              <path d="M -4 4 L -2 0 L 4 -6 L 7 -3 L 1 3 Z"
                fill="#64748b" />
              <path d="M -4 4 L 1 3" fill="none" stroke="#334155"
                stroke-linecap="round" stroke-width="1.2" />
            </g>
            <g aria-label="Delete ${layout.title}" class="timeline-delete-action"
              data-action="delete-milestone" data-id="${escapeHtml(point.id)}"
              role="button" tabindex="0"
              transform="translate(${layout.deleteIconX} ${layout.deleteIconY})">
              <title>Delete ${layout.title}</title>
              <circle fill="#ffffff" r="9" stroke="#fecaca" stroke-width="1.5" />
              <path d="M -3 -3 L 3 3 M 3 -3 L -3 3" fill="none"
                stroke="#b91c1c" stroke-linecap="round" stroke-width="1.8" />
            </g>
          </g>
        `;
      })
      .join("");

    return `
      <svg aria-label="Timeline visual" class="timeline-svg" role="img"
        height="${model.height}" width="${model.width}"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 ${model.width} ${model.height}">
        <rect fill="#ffffff" height="${model.height}" rx="8"
          width="${model.width}" />
        ${weekendBandMarkup}
        ${ticksMarkup}
        <line stroke="#000000" stroke-linecap="round"
          stroke-width="3" x1="${CHART_LEFT}" x2="${CHART_WIDTH - CHART_RIGHT}"
          y1="${model.axisY}" y2="${model.axisY}" />
        <rect class="timeline-axis-hit-target" data-action="axis-hover"
          fill="transparent" height="44" pointer-events="all"
          width="${CHART_WIDTH - CHART_LEFT - CHART_RIGHT}"
          x="${CHART_LEFT}" y="${model.axisY - 22}" />
        ${markerMarkup}
        ${timelineAddMarkup}
        ${emptyMarkup}
        ${connectorMarkup}
        ${pointMaskMarkup}
        ${pointMarkup}
      </svg>
    `;
  }

  function getParsedMilestones(asOfDate) {
    return state.milestones.flatMap(function (milestone) {
      const date = parseDateValue(milestone.at, state.includeTimes);

      if (!date) {
        return [];
      }

      const timestamp = date.getTime();

      return [
        Object.assign({}, milestone, {
          date: date,
          owner: getPersonById(milestone.ownerId),
          timestamp: timestamp,
          timelineState: getMilestoneState(
            milestone.status,
            timestamp,
            asOfDate,
          ),
        }),
      ];
    });
  }

  function milestoneRisks(milestone) {
    return Array.isArray(milestone.risks) ? milestone.risks : [];
  }

  function riskSummary(milestone) {
    const risks = milestoneRisks(milestone);
    const unresolved = risks.filter(function (risk) {
      return risk.status !== "resolved";
    }).length;
    const state =
      risks.length === 0
        ? "none"
        : unresolved === 0
          ? "resolved"
          : unresolved === risks.length
            ? "open"
            : "mixed";

    return {
      resolved: risks.length - unresolved,
      state: state,
      total: risks.length,
      unresolved: unresolved,
    };
  }

  function riskSummaryLabel(summary) {
    if (summary.total === 0) {
      return "No risks";
    }

    if (summary.state === "mixed") {
      return `${summary.unresolved} unresolved, ${summary.resolved} mitigated`;
    }

    if (summary.unresolved > 0) {
      return `${summary.unresolved} unresolved`;
    }

    return "All mitigated";
  }

  function riskCountLabel(count, state) {
    return `${count} ${state} risk${count === 1 ? "" : "s"}`;
  }

  function riskSummaryHoverLabel(summary) {
    if (summary.total === 0) {
      return "No risks";
    }

    if (summary.state === "mixed") {
      return `${riskCountLabel(
        summary.unresolved,
        "unresolved",
      )}, ${riskCountLabel(summary.resolved, "mitigated")}`;
    }

    if (summary.unresolved > 0) {
      return riskCountLabel(summary.unresolved, "unresolved");
    }

    return riskCountLabel(summary.resolved, "mitigated");
  }

  function riskHistoryKey(milestoneId, riskId) {
    return `${milestoneId}:${riskId}`;
  }

  function formatHistoryTime(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Unknown time";
    }

    return new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  }

  function stateLabel(timelineState) {
    if (timelineState === "completed") {
      return "Complete";
    }

    if (timelineState === "overdue") {
      return "Overdue";
    }

    return "Upcoming";
  }

  function getPersonById(personId) {
    return (
      state.people.find(function (person) {
        return person.id === personId;
      }) || null
    );
  }

  function renderRiskOwnerOptions(risk) {
    const personOptions = state.people
      .map(function (person) {
        return `
          <option value="${escapeHtml(person.id)}" ${
            person.id === risk.ownerId ? "selected" : ""
          }>
            ${escapeHtml(ownerLabel(person) || "Unnamed person")}
          </option>
        `;
      })
      .join("");

    return `
      <option value="" ${risk.ownerId ? "" : "selected"}>No owner</option>
      ${personOptions}
      <option value="__add_person">Add person...</option>
    `;
  }

  function isLegacyRiskMetadataMessage(message) {
    const value = String(message || "").trim();

    return (
      value === "Created risk" ||
      value === "Imported risk" ||
      value === "Marked mitigated" ||
      value === "Reopened risk" ||
      value === "Cleared owner" ||
      /^Renamed risk from /.test(value) ||
      /^Assigned owner to /.test(value)
    );
  }

  function riskUpdateEntries(risk) {
    return Array.isArray(risk.history)
      ? risk.history.filter(function (entry) {
          return entry && !isLegacyRiskMetadataMessage(entry.message);
        })
      : [];
  }

  function riskStatusLabel(risk) {
    return risk.status === "resolved" ? "Mitigated" : "Open";
  }

  function renderRiskOwnerBadge(risk) {
    const person = getPersonById(risk.ownerId);
    const label = person ? ownerLabel(person) || "Unnamed person" : "Unassigned";

    return `
      <span class="risk-owner-badge" title="${escapeHtml(label)}">
        ${renderPersonAvatar(person, "risk-owner-avatar")}
      </span>
    `;
  }

  function renderRiskHistory(milestoneId, risk) {
    if (expandedRiskHistoryKey !== riskHistoryKey(milestoneId, risk.id)) {
      return "";
    }

    const updates = riskUpdateEntries(risk);
    const isResolved = risk.status === "resolved";

    return `
      <div class="risk-detail-panel">
        <label class="risk-field risk-field-description">
          <span>Description</span>
          <textarea
            data-action="risk-title"
            data-id="${escapeHtml(milestoneId)}"
            data-original="${escapeHtml(risk.title)}"
            data-risk-id="${escapeHtml(risk.id)}"
          >${escapeHtml(risk.title)}</textarea>
        </label>
        <div class="risk-detail-grid">
          <label class="risk-field">
            <span>Owner</span>
            <select
              aria-label="Risk owner"
              data-action="set-risk-owner"
              data-id="${escapeHtml(milestoneId)}"
              data-risk-id="${escapeHtml(risk.id)}"
            >
              ${renderRiskOwnerOptions(risk)}
            </select>
          </label>
          <div class="risk-field">
            <span>Status</span>
            <span class="risk-status-readout risk-status-${risk.status}">
              ${riskStatusLabel(risk)}
            </span>
          </div>
        </div>
        <label class="risk-field risk-field-update">
          <span>Update</span>
          <textarea
            data-action="risk-update-message"
            data-id="${escapeHtml(milestoneId)}"
            data-risk-id="${escapeHtml(risk.id)}"
            placeholder="${
              isResolved
                ? "Add another update"
                : "Add an update, or use it as the mitigation note"
            }"
          ></textarea>
        </label>
        <div class="risk-update-actions">
          <button
            class="risk-update-button"
            data-action="add-risk-update"
            data-id="${escapeHtml(milestoneId)}"
            data-risk-id="${escapeHtml(risk.id)}"
            type="button"
          >
            Add update
          </button>
          ${
            isResolved
              ? `
                <button
                  class="risk-secondary-button"
                  data-action="reopen-risk"
                  data-id="${escapeHtml(milestoneId)}"
                  data-risk-id="${escapeHtml(risk.id)}"
                  type="button"
                >
                  Reopen
                </button>
              `
              : `
                <button
                  class="risk-resolve-button"
                  data-action="mitigate-risk"
                  data-id="${escapeHtml(milestoneId)}"
                  data-risk-id="${escapeHtml(risk.id)}"
                  type="button"
                >
                  Mark mitigated
                </button>
              `
          }
        </div>
        ${
          updates.length === 0
            ? '<p class="risk-history-empty">No updates yet.</p>'
            : `
              <ol class="risk-history-list">
                ${updates
                  .slice()
                  .reverse()
                  .map(function (entry) {
                    return `
                      <li>
                        <time>${escapeHtml(formatHistoryTime(entry.at))}</time>
                        <span>${escapeHtml(entry.message)}</span>
                      </li>
                    `;
                  })
                  .join("")}
              </ol>
            `
        }
      </div>
    `;
  }

  function renderRiskControls(milestone, context) {
    const summary = riskSummary(milestone);
    const risks = milestoneRisks(milestone);
    const emptyMarkup =
      risks.length === 0
        ? '<p class="risk-empty">No risks yet.</p>'
        : "";

    return `
      <div class="risk-controls risk-controls-${context}">
        <div class="risk-controls-header">
          <span class="risk-summary risk-summary-${summary.state}">
            <span class="risk-summary-dot" aria-hidden="true"></span>
            ${escapeHtml(riskSummaryLabel(summary))}
          </span>
          <button
            class="add-risk-button"
            data-action="add-risk"
            data-id="${escapeHtml(milestone.id)}"
            type="button"
          >
            + Add risk
          </button>
        </div>
        ${emptyMarkup}
        <div class="risk-list">
          ${risks
            .map(function (risk) {
              const updates = riskUpdateEntries(risk);
              const isHistoryExpanded =
                expandedRiskHistoryKey === riskHistoryKey(milestone.id, risk.id);
              const description =
                String(risk.title || "").trim() || "Untitled risk";
              const owner = getPersonById(risk.ownerId);
              const ownerText = owner
                ? ownerLabel(owner) || "Unnamed person"
                : "Unassigned";

              return `
                <div class="risk-item risk-item-${risk.status}">
                  <div class="risk-row">
                    ${renderRiskOwnerBadge(risk)}
                    <button
                      aria-expanded="${isHistoryExpanded ? "true" : "false"}"
                      class="risk-summary-button"
                      data-action="toggle-risk-history"
                      data-id="${escapeHtml(milestone.id)}"
                      data-risk-id="${escapeHtml(risk.id)}"
                      type="button"
                    >
                      <span class="risk-description">${escapeHtml(description)}</span>
                      <span class="risk-owner-text">${escapeHtml(ownerText)}</span>
                    </button>
                    <span class="risk-status-pill risk-status-${risk.status}">
                      ${riskStatusLabel(risk)}
                    </span>
                    <button
                      aria-expanded="${isHistoryExpanded ? "true" : "false"}"
                      class="risk-history-toggle"
                      data-action="toggle-risk-history"
                      data-id="${escapeHtml(milestone.id)}"
                      data-risk-id="${escapeHtml(risk.id)}"
                      type="button"
                    >
                      Updates ${updates.length}
                    </button>
                    <button
                      aria-label="Delete risk"
                      class="risk-delete-button icon-button"
                      data-action="delete-risk"
                      data-id="${escapeHtml(milestone.id)}"
                      data-risk-id="${escapeHtml(risk.id)}"
                      title="Delete risk"
                      type="button"
                    >
                      &times;
                    </button>
                  </div>
                  ${renderRiskHistory(milestone.id, risk)}
                </div>
              `;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  function renderMilestoneOwnerOptions(milestone) {
    const personOptions = state.people
      .map(function (person) {
        return `
          <option value="${escapeHtml(person.id)}" ${
            person.id === milestone.ownerId ? "selected" : ""
          }>
            ${escapeHtml(ownerLabel(person) || "Unnamed person")}
          </option>
        `;
      })
      .join("");

    return `
      <option value="" ${milestone.ownerId ? "" : "selected"}>Unassigned</option>
      ${personOptions}
      <option value="__add_person">Add person...</option>
    `;
  }

  function renderMilestoneDialog() {
    if (!milestoneDialogMilestoneId || !elements.milestoneDialog.open) {
      return;
    }

    const milestone = findMilestone(milestoneDialogMilestoneId);

    if (!milestone) {
      closeMilestoneDialog();
      return;
    }

    elements.milestoneDialogTitle.textContent = "Edit milestone";
    elements.milestoneTitleInput.value = milestone.title;
    elements.milestoneOwnerSelect.innerHTML =
      renderMilestoneOwnerOptions(milestone);
    elements.milestoneDetailsInput.value = milestone.details || "";
    elements.milestoneDialogRisks.innerHTML = renderRiskControls(
      milestone,
      "dialog",
    );
  }

  function renderTimelineList() {
    elements.workspaceShell.classList.toggle(
      "sidebar-collapsed",
      state.sidebarCollapsed,
    );
    elements.toggleSidebarButton.textContent = state.sidebarCollapsed ? ">" : "<";
    elements.toggleSidebarButton.setAttribute(
      "aria-label",
      state.sidebarCollapsed ? "Expand timeline list" : "Collapse timeline list",
    );
    elements.timelineCountLabel.textContent = `${state.timelines.length}`;
    elements.deleteTimelineButton.disabled = state.timelines.length <= 1;
    elements.timelineList.innerHTML = state.timelines
      .map(function (timeline) {
        const isActive = timeline.id === state.activeTimelineId;

        return `
          <button
            class="timeline-list-button${isActive ? " active" : ""}"
            data-timeline-id="${escapeHtml(timeline.id)}"
            type="button"
          >
            <span class="timeline-list-name">${escapeHtml(
              timeline.name || "Untitled timeline",
            )}</span>
          </button>
        `;
      })
      .join("");
  }

  function renderPersonAvatar(person, extraClass) {
    if (!person) {
      return `
        <span class="person-avatar person-avatar-empty ${extraClass || ""}">
          +
        </span>
      `;
    }

    const avatarSrc = ownerAvatarSrc(person);
    const initials = ownerInitials(person) || "?";
    const imageMarkup = avatarSrc
      ? `<img alt="" src="${escapeHtml(avatarSrc)}" />`
      : escapeHtml(initials);

    return `
      <span
        class="person-avatar ${extraClass || ""}"
        style="background: ${ownerAvatarColor(person)}"
      >
        ${imageMarkup}
      </span>
    `;
  }

  function renderOwnerPickerButton(milestone) {
    const person = getPersonById(milestone.ownerId);
    const label = person ? ownerLabel(person) : "Assign owner";

    return `
      <button
        aria-expanded="${ownerMenuMilestoneId === milestone.id ? "true" : "false"}"
        aria-label="${escapeHtml(label)}"
        class="owner-picker-button"
        data-action="toggle-owner-menu"
        data-id="${escapeHtml(milestone.id)}"
        title="${escapeHtml(label)}"
        type="button"
      >
        ${renderPersonAvatar(person)}
      </button>
    `;
  }

  function renderOwnerMenuLayer() {
    if (!ownerMenuMilestoneId) {
      elements.ownerMenuLayer.innerHTML = "";
      return;
    }

    const milestone = state.milestones.find(function (candidate) {
      return candidate.id === ownerMenuMilestoneId;
    });

    if (!milestone) {
      ownerMenuMilestoneId = "";
      elements.ownerMenuLayer.innerHTML = "";
      return;
    }

    const peopleMarkup = state.people
      .map(function (person) {
        const isActive = person.id === milestone.ownerId;

        return `
          <button
            class="owner-menu-item${isActive ? " active" : ""}"
            data-action="assign-owner"
            data-id="${escapeHtml(milestone.id)}"
            data-person-id="${escapeHtml(person.id)}"
            type="button"
          >
            ${renderPersonAvatar(person)}
            <span class="owner-menu-label">${escapeHtml(
              ownerLabel(person) || "Unnamed person",
            )}</span>
          </button>
        `;
      })
      .join("");

    elements.ownerMenuLayer.innerHTML = `
      <div
        class="owner-menu-panel"
        style="left: ${ownerMenuPosition.left}px; top: ${ownerMenuPosition.top}px;"
      >
        <button
          class="owner-menu-item${milestone.ownerId ? "" : " active"}"
          data-action="assign-owner"
          data-id="${escapeHtml(milestone.id)}"
          data-person-id=""
          type="button"
        >
          ${renderPersonAvatar(null)}
          <span class="owner-menu-label">Unassigned</span>
        </button>
        ${peopleMarkup}
        <div class="owner-menu-divider"></div>
        <button
          class="owner-menu-item"
          data-action="open-person-dialog"
          data-id="${escapeHtml(milestone.id)}"
          type="button"
        >
          ${renderPersonAvatar(null)}
          <span class="owner-menu-label">Add person</span>
        </button>
      </div>
    `;
  }

  function renderStatusMenuLayer() {
    if (!statusMenuMilestoneId) {
      elements.statusMenuLayer.innerHTML = "";
      return;
    }

    const milestone = state.milestones.find(function (candidate) {
      return candidate.id === statusMenuMilestoneId;
    });

    if (!milestone) {
      statusMenuMilestoneId = "";
      elements.statusMenuLayer.innerHTML = "";
      return;
    }

    elements.statusMenuLayer.innerHTML = `
      <div
        class="status-menu-panel"
        style="left: ${statusMenuPosition.left}px; top: ${statusMenuPosition.top}px;"
      >
        <button
          class="status-menu-item${milestone.status === "pending" ? " active" : ""}"
          data-action="set-status"
          data-id="${escapeHtml(milestone.id)}"
          data-status="pending"
          type="button"
        >
          Pending
        </button>
        <button
          class="status-menu-item${milestone.status === "completed" ? " active" : ""}"
          data-action="set-status"
          data-id="${escapeHtml(milestone.id)}"
          data-status="completed"
          type="button"
        >
          Completed
        </button>
      </div>
    `;
  }

  function renderRows(asOfDate) {
    elements.milestoneRows.innerHTML = state.milestones
      .map(function (milestone) {
        const date = parseDateValue(milestone.at, state.includeTimes);
        const timelineState = date
          ? getMilestoneState(milestone.status, date.getTime(), asOfDate)
          : "upcoming";
        const dateInputLabel = state.includeTimes
          ? "Milestone date and time"
          : "Milestone date";
        const dateInputType = state.includeTimes ? "datetime-local" : "date";
        const dateInputValue = toInputValue(milestone.at, state.includeTimes);

        return `
          <div class="milestone-editor-item editor-row-${timelineState}">
            <div class="editor-grid editor-row">
              <input aria-label="Milestone title" data-field="title"
                data-id="${escapeHtml(milestone.id)}"
                value="${escapeHtml(milestone.title)}" />
              <input aria-label="${dateInputLabel}" data-field="at"
                data-id="${escapeHtml(milestone.id)}" type="${dateInputType}"
                value="${escapeHtml(dateInputValue)}" />
              <div class="owner-cell">
                ${renderOwnerPickerButton(milestone)}
              </div>
              <select aria-label="Milestone status" data-field="status"
                data-id="${escapeHtml(milestone.id)}">
                <option value="pending" ${
                  milestone.status === "pending" ? "selected" : ""
                }>Pending</option>
                <option value="completed" ${
                  milestone.status === "completed" ? "selected" : ""
                }>Completed</option>
              </select>
              <span class="state-pill state-pill-${timelineState}">
                ${stateLabel(timelineState)}
              </span>
              <div class="row-actions">
                <button class="edit-milestone-button icon-button"
                  aria-label="Edit milestone"
                  data-action="open-milestone-dialog"
                  data-id="${escapeHtml(milestone.id)}"
                  title="Edit milestone"
                  type="button"
                >
                  <svg aria-hidden="true" viewBox="0 0 20 20">
                    <path d="M4 14.5 5 11l7.4-7.4 3 3L8 14l-4 1z" />
                    <path d="M11.5 4.5 14.5 7.5" />
                  </svg>
                </button>
                <button class="remove-button" data-action="remove"
                  data-id="${escapeHtml(milestone.id)}" type="button">
                  Remove
                </button>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderTimelineAndCounts() {
    const asOfDate = parseDateValue(state.asOf, state.includeTimes);
    const parsedMilestones = getParsedMilestones(asOfDate);
    const counts = parsedMilestones.reduce(
      function (accumulator, milestone) {
        accumulator.total += 1;
        accumulator[milestone.timelineState] += 1;
        return accumulator;
      },
      { completed: 0, overdue: 0, upcoming: 0, total: 0 },
    );

    elements.asOfInput.type = state.includeTimes ? "datetime-local" : "date";
    elements.asOfInput.value = toInputValue(state.asOf, state.includeTimes);
    elements.timelineNameInput.value = state.name;
    elements.dateColumnLabel.textContent = state.includeTimes
      ? "Date / time"
      : "Date";
    elements.includeTimesInput.checked = state.includeTimes;
    elements.showTodayInput.checked = state.showToday;
    elements.totalCount.textContent = String(counts.total);
    elements.completedCount.textContent = String(counts.completed);
    elements.overdueCount.textContent = String(counts.overdue);
    elements.upcomingCount.textContent = String(counts.upcoming);

    const model = buildTimelineModel(
      parsedMilestones,
      asOfDate,
      state.showToday,
      state.includeTimes,
    );
    currentTimelineModel = model;
    currentSvgMarkup = renderChart(model, state.showToday);
    elements.timelineMount.innerHTML = currentSvgMarkup;

    return asOfDate;
  }

  function render() {
    renderTimelineList();
    const asOfDate = renderTimelineAndCounts();
    renderRows(asOfDate);
    renderOwnerMenuLayer();
    renderStatusMenuLayer();
    renderMilestoneDialog();
  }

  function updateMilestone(id, field, value, redrawRows) {
    state.milestones = state.milestones.map(function (milestone) {
      if (milestone.id !== id) {
        return milestone;
      }

      return Object.assign({}, milestone, {
        [field]: value,
      });
    });
    saveState();

    if (redrawRows) {
      render();
    } else if (field !== "details") {
      renderTimelineAndCounts();
    }
  }

  function removeMilestone(milestoneId) {
    if (milestoneDialogMilestoneId === milestoneId) {
      closeMilestoneDialog();
    }

    if (editingTitleMilestoneId === milestoneId) {
      closeTitleEditor(false);
    }

    state.milestones = state.milestones.filter(function (milestone) {
      return milestone.id !== milestoneId;
    });
    ownerMenuMilestoneId = "";
    statusMenuMilestoneId = "";
    saveAndRender();
  }

  function resizeAvatarDataUrl(dataUrl, callback) {
    if (typeof Image !== "function") {
      callback(dataUrl);
      return;
    }

    const image = new Image();

    image.onload = function () {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext && canvas.getContext("2d");

      if (!context) {
        callback(dataUrl);
        return;
      }

      const sourceSize = Math.min(image.width, image.height);
      const sourceX = Math.max((image.width - sourceSize) / 2, 0);
      const sourceY = Math.max((image.height - sourceSize) / 2, 0);

      canvas.width = AVATAR_RENDER_SIZE;
      canvas.height = AVATAR_RENDER_SIZE;
      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        AVATAR_RENDER_SIZE,
        AVATAR_RENDER_SIZE,
      );

      try {
        callback(canvas.toDataURL("image/jpeg", 0.84));
      } catch (_error) {
        callback(dataUrl);
      }
    };
    image.onerror = function () {
      callback(dataUrl);
    };
    image.src = dataUrl;
  }

  function handlePersonPhotoUpload(file) {
    if (!file) {
      return;
    }

    if (!file.type || !file.type.startsWith("image/")) {
      if (typeof window.alert === "function") {
        window.alert("Choose an image file for the owner avatar.");
      }
      return;
    }

    if (typeof FileReader !== "function") {
      if (typeof window.alert === "function") {
        window.alert("This browser cannot read local image files here.");
      }
      return;
    }

    const reader = new FileReader();

    reader.onload = function () {
      resizeAvatarDataUrl(String(reader.result || ""), function (dataUrl) {
        pendingPersonPhotoDataUrl = dataUrl;
        renderPersonPhotoPreview();
      });
    };
    reader.onerror = function () {
      if (typeof window.alert === "function") {
        window.alert("The image could not be loaded.");
      }
    };
    reader.readAsDataURL(file);
  }

  function renderPersonPhotoPreview() {
    const draftPerson = {
      email: elements.personEmailInput.value,
      name: elements.personNameInput.value,
      photoDataUrl: pendingPersonPhotoDataUrl,
    };

    elements.personPhotoPreview.innerHTML = renderPersonAvatar(draftPerson);
  }

  function openPersonDialog(assignToMilestoneId) {
    personDialogContext =
      assignToMilestoneId && typeof assignToMilestoneId === "object"
        ? assignToMilestoneId
        : {
            assignToMilestoneId: assignToMilestoneId || "",
          };
    pendingPersonPhotoDataUrl = "";
    elements.personNameInput.value = "";
    elements.personEmailInput.value = "";
    elements.personPhotoInput.value = "";
    renderPersonPhotoPreview();

    if (typeof elements.personDialog.showModal === "function") {
      elements.personDialog.showModal();
    } else {
      elements.personDialog.setAttribute("open", "");
    }

    elements.personNameInput.focus();
  }

  function closePersonDialog() {
    if (typeof elements.personDialog.close === "function") {
      elements.personDialog.close();
    } else {
      elements.personDialog.removeAttribute("open");
    }

    personDialogContext = null;
    pendingPersonPhotoDataUrl = "";
  }

  function savePersonFromDialog() {
    const name = elements.personNameInput.value.trim();
    const email = elements.personEmailInput.value.trim();
    const dialogContext = personDialogContext;

    if (!name) {
      elements.personNameInput.focus();
      return;
    }

    const person = findOrCreatePerson(
      state.people,
      name,
      email,
      pendingPersonPhotoDataUrl,
    );

    if (!person.name && name) {
      person.name = name;
    }

    if (!person.email && email) {
      person.email = email;
    }

    if (!person.photoDataUrl && pendingPersonPhotoDataUrl) {
      person.photoDataUrl = pendingPersonPhotoDataUrl;
    }

    if (dialogContext && dialogContext.assignToMilestoneId) {
      state.milestones = state.milestones.map(function (milestone) {
        if (milestone.id !== dialogContext.assignToMilestoneId) {
          return milestone;
        }

        return Object.assign({}, milestone, {
          ownerId: person.id,
        });
      });
    }

    if (
      dialogContext &&
      dialogContext.assignToRiskMilestoneId &&
      dialogContext.assignToRiskId
    ) {
      const risk = findRisk(
        dialogContext.assignToRiskMilestoneId,
        dialogContext.assignToRiskId,
      );

      if (risk && risk.ownerId !== person.id) {
        risk.ownerId = person.id;
      }
    }

    ownerMenuMilestoneId = "";
    closePersonDialog();
    saveAndRender();

    if (dialogContext && dialogContext.reopenMilestoneDialogId) {
      openMilestoneDialog(dialogContext.reopenMilestoneDialogId);
    }
  }

  function addMilestone() {
    const asOfDate = parseDateValue(state.asOf, state.includeTimes);
    const parsedMilestones = getParsedMilestones(asOfDate);
    const sortedDates = parsedMilestones
      .map(function (milestone) {
        return milestone.date.getTime();
      })
      .sort(function (a, b) {
        return a - b;
      });
    const baseline =
      sortedDates[sortedDates.length - 1] ||
      (asOfDate ? asOfDate.getTime() : Date.now());
    const nextDate = new Date(baseline + 7 * DAY_MS);

    state.milestones.push({
      id: makeId(),
      title: "New milestone",
      at: toDateValueForMode(nextDate, state.includeTimes),
      details: "",
      ownerId: "",
      risks: [],
      status: "pending",
    });
    saveAndRender();
  }

  function addMilestoneAt(value) {
    const date =
      parseDateValue(value, state.includeTimes) ||
      parseDateValue(state.asOf, state.includeTimes) ||
      new Date();

    state.milestones.push({
      id: makeId(),
      title: "New milestone",
      at: toDateValueForMode(date, state.includeTimes),
      details: "",
      ownerId: "",
      risks: [],
      status: "pending",
    });
    timelineAddHover = { at: "", visible: false, x: CHART_LEFT };
    saveAndRender();
  }

  function sortMilestones() {
    state.milestones.sort(function (a, b) {
      const aDate = parseDateValue(a.at, state.includeTimes);
      const bDate = parseDateValue(b.at, state.includeTimes);
      const aTime = aDate ? aDate.getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = bDate ? bDate.getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
    saveAndRender();
  }

  function resetSample() {
    const asOfDate = parseDateValue(state.asOf, state.includeTimes) || new Date();
    ensureExamplePeople(state.people);
    state.milestones = createExampleMilestones(asOfDate, state.includeTimes);
    saveAndRender();
  }

  function selectTimeline(timelineId) {
    if (timelineId === state.activeTimelineId) {
      return;
    }

    syncActiveTimelineFromState();
    loadTimelineIntoActiveState(timelineId);
    saveAndRender();
  }

  function createTimeline() {
    syncActiveTimelineFromState();

    const timeline = createDefaultTimeline(
      `Timeline ${state.timelines.length + 1}`,
      false,
    );

    state.timelines.push(timeline);
    loadTimelineIntoActiveState(timeline.id);
    saveAndRender();
  }

  function duplicateTimeline() {
    syncActiveTimelineFromState();

    const activeTimeline =
      state.timelines.find(function (timeline) {
        return timeline.id === state.activeTimelineId;
      }) || state.timelines[0];
    const timeline = {
      id: makeId(),
      name: `${activeTimeline.name} copy`,
      asOf: activeTimeline.asOf,
      includeTimes: activeTimeline.includeTimes,
      milestones: cloneMilestones(activeTimeline.milestones),
      showToday: activeTimeline.showToday,
    };

    state.timelines.push(timeline);
    loadTimelineIntoActiveState(timeline.id);
    saveAndRender();
  }

  function deleteTimeline() {
    if (state.timelines.length <= 1) {
      return;
    }

    const confirmed =
      typeof window.confirm !== "function" ||
      window.confirm(`Delete "${state.name}"?`);

    if (!confirmed) {
      return;
    }

    const activeIndex = state.timelines.findIndex(function (timeline) {
      return timeline.id === state.activeTimelineId;
    });

    state.timelines = state.timelines.filter(function (timeline) {
      return timeline.id !== state.activeTimelineId;
    });

    const nextIndex = Math.min(Math.max(activeIndex, 0), state.timelines.length - 1);
    loadTimelineIntoActiveState(state.timelines[nextIndex].id);
    saveAndRender();
  }

  function downloadSvg() {
    const blob = new Blob([currentSvgMarkup], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "timeline.svg";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function svgMarkupForPng() {
    return currentSvgMarkup.replace(
      /<image\s+href="https?:\/\/[^"]+"[\s\S]*?\/>/g,
      "",
    );
  }

  function saveBlobAsDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function downloadPng() {
    if (!currentTimelineModel || typeof Image !== "function") {
      return;
    }

    const exportModel = currentTimelineModel;
    const image = new Image();
    const svgBlob = new Blob([svgMarkupForPng()], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);
    const scale = 2;

    image.onload = function () {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext && canvas.getContext("2d");

      URL.revokeObjectURL(url);

      if (!context) {
        if (typeof window.alert === "function") {
          window.alert("This browser cannot render a PNG export.");
        }
        return;
      }

      canvas.width = exportModel.width * scale;
      canvas.height = exportModel.height * scale;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.scale(scale, scale);
      context.drawImage(image, 0, 0, exportModel.width, exportModel.height);

      if (typeof canvas.toBlob === "function") {
        canvas.toBlob(function (blob) {
          if (blob) {
            saveBlobAsDownload(blob, "timeline.png");
          }
        }, "image/png");
        return;
      }

      try {
        const dataUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");

        link.href = dataUrl;
        link.download = "timeline.png";
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch (_error) {
        if (typeof window.alert === "function") {
          window.alert("The PNG export could not be created.");
        }
      }
    };

    image.onerror = function () {
      URL.revokeObjectURL(url);

      if (typeof window.alert === "function") {
        window.alert("The PNG export could not be created.");
      }
    };

    image.src = url;
  }

  function positionFloatingMenu(target, width, height) {
    const rect =
      target && typeof target.getBoundingClientRect === "function"
        ? target.getBoundingClientRect()
        : { bottom: 72, left: 72 };
    const viewportWidth =
      typeof window.innerWidth === "number" ? window.innerWidth : CHART_WIDTH;
    const viewportHeight =
      typeof window.innerHeight === "number" ? window.innerHeight : 760;

    return {
      left: clamp(rect.left, 12, Math.max(viewportWidth - width - 12, 12)),
      top: clamp(rect.bottom + 6, 12, Math.max(viewportHeight - height - 12, 12)),
    };
  }

  function positionOwnerMenu(target) {
    const viewportHeight =
      typeof window.innerHeight === "number" ? window.innerHeight : 760;

    ownerMenuPosition = positionFloatingMenu(
      target,
      280,
      Math.min(360, viewportHeight - 24),
    );
  }

  function positionStatusMenu(target) {
    statusMenuPosition = positionFloatingMenu(target, 190, 96);
  }

  function findMilestone(milestoneId) {
    return state.milestones.find(function (milestone) {
      return milestone.id === milestoneId;
    });
  }

  function findRisk(milestoneId, riskId) {
    const milestone = findMilestone(milestoneId);

    if (!milestone) {
      return null;
    }

    return milestoneRisks(milestone).find(function (risk) {
      return risk.id === riskId;
    }) || null;
  }

  function appendRiskUpdate(risk, message) {
    const update = String(message || "").trim();

    if (!update) {
      return false;
    }

    risk.history = Array.isArray(risk.history) ? risk.history : [];
    risk.history.push(createRiskHistoryEntry(update));
    return true;
  }

  function rerenderRisks() {
    saveState();
    renderTimelineAndCounts();
    renderRows(parseDateValue(state.asOf, state.includeTimes));
    renderMilestoneDialog();
  }

  function addRisk(milestoneId) {
    const milestone = findMilestone(milestoneId);

    if (!milestone) {
      return;
    }

    milestone.risks = milestoneRisks(milestone).concat([
      createRisk("New risk", "", "open"),
    ]);
    expandedRiskHistoryKey = riskHistoryKey(
      milestoneId,
      milestone.risks[milestone.risks.length - 1].id,
    );
    rerenderRisks();
  }

  function updateRiskTitleDraft(milestoneId, riskId, title) {
    const risk = findRisk(milestoneId, riskId);

    if (!risk) {
      return;
    }

    risk.title = title;
    saveState();
  }

  function recordRiskTitleChange(milestoneId, riskId, previousTitle, title) {
    const risk = findRisk(milestoneId, riskId);
    const from = String(previousTitle || "");
    const to = String(title || "");

    if (!risk || from === to) {
      return;
    }

    risk.title = title;
    rerenderRisks();
  }

  function setRiskStatus(milestoneId, riskId, status, update) {
    const risk = findRisk(milestoneId, riskId);
    const nextStatus = status === "resolved" ? "resolved" : "open";

    if (!risk || risk.status === nextStatus) {
      return;
    }

    if (nextStatus === "resolved" && !appendRiskUpdate(risk, update)) {
      return false;
    }

    risk.status = nextStatus;
    rerenderRisks();
    return true;
  }

  function setRiskOwner(milestoneId, riskId, personId) {
    const risk = findRisk(milestoneId, riskId);
    const nextPersonId = personId || "";

    if (!risk || risk.ownerId === nextPersonId) {
      return;
    }

    risk.ownerId = nextPersonId;
    rerenderRisks();
  }

  function addRiskUpdate(milestoneId, riskId, message) {
    const risk = findRisk(milestoneId, riskId);

    if (!risk || !appendRiskUpdate(risk, message)) {
      return false;
    }

    rerenderRisks();
    return true;
  }

  function deleteRisk(milestoneId, riskId) {
    const milestone = findMilestone(milestoneId);

    if (!milestone) {
      return;
    }

    milestone.risks = milestoneRisks(milestone).filter(function (risk) {
      return risk.id !== riskId;
    });

    if (expandedRiskHistoryKey === riskHistoryKey(milestoneId, riskId)) {
      expandedRiskHistoryKey = "";
    }

    rerenderRisks();
  }

  function openMilestoneDialog(milestoneId) {
    const milestone = findMilestone(milestoneId);

    if (!milestone) {
      return;
    }

    closeTitleEditor(false);
    closeFloatingMenus();
    milestoneDialogMilestoneId = milestoneId;

    if (typeof elements.milestoneDialog.showModal === "function") {
      elements.milestoneDialog.showModal();
    } else {
      elements.milestoneDialog.setAttribute("open", "");
    }

    renderMilestoneDialog();
  }

  function closeMilestoneDialog() {
    if (typeof elements.milestoneDialog.close === "function") {
      elements.milestoneDialog.close();
    } else {
      elements.milestoneDialog.removeAttribute("open");
    }

    milestoneDialogMilestoneId = "";
  }

  function closeFloatingMenus() {
    ownerMenuMilestoneId = "";
    statusMenuMilestoneId = "";
    renderOwnerMenuLayer();
    renderStatusMenuLayer();
  }

  function assignOwner(milestoneId, personId) {
    ownerMenuMilestoneId = "";
    statusMenuMilestoneId = "";
    updateMilestone(milestoneId, "ownerId", personId, true);
  }

  function assignStatus(milestoneId, status) {
    ownerMenuMilestoneId = "";
    statusMenuMilestoneId = "";
    updateMilestone(
      milestoneId,
      "status",
      status === "completed" ? "completed" : "pending",
      true,
    );
  }

  function toggleOwnerMenu(milestoneId, target) {
    closeTitleEditor(false);
    statusMenuMilestoneId = "";
    ownerMenuMilestoneId =
      ownerMenuMilestoneId === milestoneId ? "" : milestoneId;

    if (ownerMenuMilestoneId) {
      positionOwnerMenu(target);
    }

    renderOwnerMenuLayer();
    renderStatusMenuLayer();
  }

  function openStatusMenu(milestoneId, target) {
    closeTitleEditor(false);
    ownerMenuMilestoneId = "";
    statusMenuMilestoneId =
      statusMenuMilestoneId === milestoneId ? "" : milestoneId;

    if (statusMenuMilestoneId) {
      positionStatusMenu(target);
    }

    renderOwnerMenuLayer();
    renderStatusMenuLayer();
  }

  function toggleRiskHistory(milestoneId, riskId) {
    const key = riskHistoryKey(milestoneId, riskId);

    expandedRiskHistoryKey = expandedRiskHistoryKey === key ? "" : key;
    renderRows(parseDateValue(state.asOf, state.includeTimes));
    renderMilestoneDialog();
  }

  function closeTitleEditor(saveChanges) {
    if (!editingTitleMilestoneId) {
      return;
    }

    const input =
      elements.titleEditLayer.querySelector &&
      elements.titleEditLayer.querySelector("input");
    const milestoneId = editingTitleMilestoneId;
    const value = input ? input.value.trim() : "";

    editingTitleMilestoneId = "";
    elements.titleEditLayer.innerHTML = "";

    if (saveChanges) {
      updateMilestone(
        milestoneId,
        "title",
        value || "Untitled milestone",
        true,
      );
    }
  }

  function openTitleEditor(milestoneId, target) {
    const milestone = state.milestones.find(function (candidate) {
      return candidate.id === milestoneId;
    });

    if (
      !milestone ||
      !target ||
      typeof target.getBoundingClientRect !== "function"
    ) {
      return;
    }

    closeFloatingMenus();
    closeTitleEditor(false);

    const rect = target.getBoundingClientRect();
    const viewportWidth =
      typeof window.innerWidth === "number" ? window.innerWidth : CHART_WIDTH;
    const width = clamp(Math.max(rect.width + 48, 190), 190, viewportWidth - 24);
    const left = clamp(
      rect.left + rect.width / 2 - width / 2,
      12,
      Math.max(viewportWidth - width - 12, 12),
    );
    const top = Math.max(rect.top - 7, 12);

    editingTitleMilestoneId = milestoneId;
    elements.titleEditLayer.innerHTML = `
      <input
        class="timeline-title-editor"
        data-id="${escapeHtml(milestoneId)}"
        style="left: ${left}px; top: ${top}px; width: ${width}px;"
        value="${escapeHtml(milestone.title)}"
      />
    `;

    const input =
      elements.titleEditLayer.querySelector &&
      elements.titleEditLayer.querySelector("input");

    if (input) {
      input.focus();
      input.select();
    }
  }

  function updateMilestoneDateFromChartX(milestoneId, chartX, model) {
    if (!model) {
      return;
    }

    const timestamp = chartXToTimestamp(chartX, model);
    const value = dateValueFromTimestamp(timestamp, state.includeTimes);
    const milestone = state.milestones.find(function (candidate) {
      return candidate.id === milestoneId;
    });

    if (!milestone || milestone.at === value) {
      return;
    }

    updateMilestone(milestoneId, "at", value, true);
  }

  function updateMilestoneDateFromDrag(clientX, drag) {
    updateMilestoneDateFromChartX(
      drag.milestoneId,
      drag.startChartX +
        clientDeltaToChartDelta(clientX - drag.startClientX, drag.model),
      drag.model,
    );
  }

  function clearTimelineAddHover(redraw) {
    if (!timelineAddHover.visible) {
      return;
    }

    timelineAddHover = { at: "", visible: false, x: CHART_LEFT };

    if (redraw) {
      renderTimelineAndCounts();
    }
  }

  function updateTimelineAddHover(clientX) {
    if (!currentTimelineModel || dragState || editingTitleMilestoneId) {
      clearTimelineAddHover(true);
      return;
    }

    const x = clamp(
      clientXToChartX(clientX, currentTimelineModel),
      CHART_LEFT,
      CHART_WIDTH - CHART_RIGHT,
    );
    const at = dateValueFromTimestamp(
      chartXToTimestamp(x, currentTimelineModel),
      state.includeTimes,
    );

    if (
      timelineAddHover.visible &&
      timelineAddHover.at === at &&
      Math.abs(timelineAddHover.x - x) < 3
    ) {
      return;
    }

    timelineAddHover = { at: at, visible: true, x: x };
    renderTimelineAndCounts();
  }

  function riskUpdateInputForAction(actionTarget) {
    const riskItem = closestMatch(actionTarget, ".risk-item");

    return riskItem && riskItem.querySelector
      ? riskItem.querySelector('[data-action="risk-update-message"]')
      : null;
  }

  function riskUpdateValueForAction(actionTarget) {
    const input = riskUpdateInputForAction(actionTarget);

    return input ? input.value.trim() : "";
  }

  function focusRiskUpdateInput(actionTarget) {
    const input = riskUpdateInputForAction(actionTarget);

    if (input && typeof input.focus === "function") {
      input.focus();
    }
  }

  function handleRiskInput(event) {
    if (event.target.dataset.action !== "risk-title") {
      return false;
    }

    updateRiskTitleDraft(
      event.target.dataset.id,
      event.target.dataset.riskId,
      event.target.value,
    );
    return true;
  }

  function handleRiskChange(event) {
    const action = event.target.dataset.action;

    if (action === "risk-title") {
      recordRiskTitleChange(
        event.target.dataset.id,
        event.target.dataset.riskId,
        event.target.dataset.original,
        event.target.value,
      );
      return true;
    }

    if (action === "set-risk-owner") {
      if (event.target.value === "__add_person") {
        const risk = findRisk(
          event.target.dataset.id,
          event.target.dataset.riskId,
        );
        const reopenMilestoneDialogId = elements.milestoneDialog.open
          ? event.target.dataset.id
          : "";

        event.target.value = risk ? risk.ownerId : "";
        if (reopenMilestoneDialogId) {
          closeMilestoneDialog();
        }
        openPersonDialog({
          assignToRiskId: event.target.dataset.riskId,
          assignToRiskMilestoneId: event.target.dataset.id,
          reopenMilestoneDialogId: reopenMilestoneDialogId,
        });
        return true;
      }

      setRiskOwner(
        event.target.dataset.id,
        event.target.dataset.riskId,
        event.target.value,
      );
      return true;
    }

    return false;
  }

  function handleRiskClick(event) {
    const actionTarget = closestMatch(event.target, "[data-action]");

    if (!actionTarget) {
      return false;
    }

    if (actionTarget.dataset.action === "add-risk") {
      addRisk(actionTarget.dataset.id);
      return true;
    }

    if (actionTarget.dataset.action === "toggle-risk-history") {
      toggleRiskHistory(actionTarget.dataset.id, actionTarget.dataset.riskId);
      return true;
    }

    if (actionTarget.dataset.action === "add-risk-update") {
      if (
        !addRiskUpdate(
          actionTarget.dataset.id,
          actionTarget.dataset.riskId,
          riskUpdateValueForAction(actionTarget),
        )
      ) {
        focusRiskUpdateInput(actionTarget);
      }
      return true;
    }

    if (actionTarget.dataset.action === "mitigate-risk") {
      if (
        !setRiskStatus(
          actionTarget.dataset.id,
          actionTarget.dataset.riskId,
          "resolved",
          riskUpdateValueForAction(actionTarget),
        )
      ) {
        focusRiskUpdateInput(actionTarget);
      }
      return true;
    }

    if (actionTarget.dataset.action === "reopen-risk") {
      setRiskStatus(actionTarget.dataset.id, actionTarget.dataset.riskId, "open");
      return true;
    }

    if (actionTarget.dataset.action === "delete-risk") {
      deleteRisk(actionTarget.dataset.id, actionTarget.dataset.riskId);
      return true;
    }

    return false;
  }

  elements.asOfInput.addEventListener("input", function (event) {
    state.asOf = event.target.value;
    saveAndRender();
  });

  elements.showTodayInput.addEventListener("change", function (event) {
    state.showToday = event.target.checked;
    saveAndRender();
  });

  elements.includeTimesInput.addEventListener("change", function (event) {
    state.includeTimes = event.target.checked;
    saveAndRender();
  });

  elements.nowButton.addEventListener("click", function () {
    state.asOf = toDateValueForMode(new Date(), state.includeTimes);
    saveAndRender();
  });

  elements.timelineNameInput.addEventListener("input", function (event) {
    state.name = event.target.value;
    saveState();
    renderTimelineList();
  });

  elements.timelineList.addEventListener("click", function (event) {
    const button = closestMatch(event.target, "[data-timeline-id]");

    if (button) {
      selectTimeline(button.dataset.timelineId);
    }
  });

  elements.toggleSidebarButton.addEventListener("click", function () {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    saveState();
    renderTimelineList();
  });

  elements.newTimelineButton.addEventListener("click", createTimeline);
  elements.duplicateTimelineButton.addEventListener("click", duplicateTimeline);
  elements.deleteTimelineButton.addEventListener("click", deleteTimeline);

  elements.addButton.addEventListener("click", addMilestone);
  elements.addListButton.addEventListener("click", addMilestone);
  elements.sortButton.addEventListener("click", sortMilestones);
  elements.resetButton.addEventListener("click", resetSample);
  elements.downloadButton.addEventListener("click", downloadSvg);
  elements.downloadPngButton.addEventListener("click", downloadPng);

  elements.timelineMount.addEventListener("click", function (event) {
    const addTarget = closestMatch(
      event.target,
      '[data-action="create-milestone-at"]',
    );

    if (addTarget) {
      addMilestoneAt(addTarget.dataset.at);
      return;
    }

    const deleteTarget = closestMatch(
      event.target,
      '[data-action="delete-milestone"]',
    );

    if (deleteTarget) {
      removeMilestone(deleteTarget.dataset.id);
      return;
    }

    const editTarget = closestMatch(
      event.target,
      '[data-action="open-milestone-dialog"]',
    );

    if (editTarget) {
      openMilestoneDialog(editTarget.dataset.id);
      return;
    }

    const titleTarget = closestMatch(event.target, '[data-action="edit-title"]');

    if (titleTarget) {
      openTitleEditor(titleTarget.dataset.id, titleTarget);
      return;
    }

    const ownerTarget = closestMatch(
      event.target,
      '[data-action="toggle-owner-menu"]',
    );

    if (ownerTarget) {
      toggleOwnerMenu(ownerTarget.dataset.id, ownerTarget);
    }
  });

  elements.timelineMount.addEventListener("mousemove", function (event) {
    if (closestMatch(event.target, '[data-action="create-milestone-at"]')) {
      return;
    }

    if (closestMatch(event.target, '[data-action="axis-hover"]')) {
      updateTimelineAddHover(event.clientX);
      return;
    }

    clearTimelineAddHover(true);
  });

  elements.timelineMount.addEventListener("mouseleave", function () {
    clearTimelineAddHover(true);
  });

  elements.timelineMount.addEventListener("pointerdown", function (event) {
    const target = closestMatch(event.target, '[data-action="drag-date"]');

    if (
      !target ||
      !currentTimelineModel ||
      (typeof event.button === "number" && event.button !== 0)
    ) {
      return;
    }

    closeTitleEditor(false);
    closeFloatingMenus();
    const point =
      currentTimelineModel &&
      currentTimelineModel.points.find(function (candidate) {
        return candidate.id === target.dataset.id;
      });
    dragState = {
      milestoneId: target.dataset.id,
      model: currentTimelineModel,
      moved: false,
      startChartX: point
        ? point.x
        : clientXToChartX(event.clientX, currentTimelineModel),
      startClientX: event.clientX,
      target: target,
    };

    if (typeof event.preventDefault === "function") {
      event.preventDefault();
    }
  });

  elements.milestoneRows.addEventListener("input", function (event) {
    if (handleRiskInput(event)) {
      return;
    }

    const field = event.target.dataset.field;
    const id = event.target.dataset.id;

    if (field === "title" || field === "at" || field === "details") {
      updateMilestone(id, field, event.target.value, false);
    }
  });

  elements.milestoneRows.addEventListener("change", function (event) {
    if (handleRiskChange(event)) {
      return;
    }

    const field = event.target.dataset.field;
    const id = event.target.dataset.id;

    if (field === "status" || field === "title" || field === "at") {
      updateMilestone(id, field, event.target.value, true);
    }
  });

  elements.milestoneRows.addEventListener("click", function (event) {
    if (handleRiskClick(event)) {
      return;
    }

    const editButton = closestMatch(
      event.target,
      '[data-action="open-milestone-dialog"]',
    );

    if (editButton) {
      openMilestoneDialog(editButton.dataset.id);
      return;
    }

    const ownerButton = closestMatch(
      event.target,
      '[data-action="toggle-owner-menu"]',
    );

    if (ownerButton) {
      toggleOwnerMenu(ownerButton.dataset.id, ownerButton);
      return;
    }

    if (event.target.dataset.action === "remove") {
      removeMilestone(event.target.dataset.id);
    }
  });

  elements.milestoneForm.addEventListener("submit", function (event) {
    event.preventDefault();
  });

  elements.milestoneForm.addEventListener("input", function (event) {
    if (handleRiskInput(event)) {
      return;
    }

    if (!milestoneDialogMilestoneId) {
      return;
    }

    if (event.target === elements.milestoneTitleInput) {
      updateMilestone(
        milestoneDialogMilestoneId,
        "title",
        event.target.value || "Untitled milestone",
        false,
      );
      return;
    }

    if (event.target === elements.milestoneDetailsInput) {
      updateMilestone(
        milestoneDialogMilestoneId,
        "details",
        event.target.value,
        false,
      );
    }
  });

  elements.milestoneForm.addEventListener("change", function (event) {
    if (handleRiskChange(event)) {
      return;
    }

    if (
      event.target === elements.milestoneOwnerSelect &&
      milestoneDialogMilestoneId
    ) {
      if (event.target.value === "__add_person") {
        const milestoneId = milestoneDialogMilestoneId;
        const milestone = findMilestone(milestoneId);

        event.target.value = milestone ? milestone.ownerId : "";
        closeMilestoneDialog();
        openPersonDialog({
          assignToMilestoneId: milestoneId,
          reopenMilestoneDialogId: milestoneId,
        });
        return;
      }

      updateMilestone(
        milestoneDialogMilestoneId,
        "ownerId",
        event.target.value,
        true,
      );
    }
  });

  elements.milestoneForm.addEventListener("click", function (event) {
    if (handleRiskClick(event)) {
      return;
    }

    if (
      event.target === elements.cancelMilestoneButton ||
      event.target === elements.doneMilestoneButton
    ) {
      closeMilestoneDialog();
    }
  });

  elements.milestoneDialog.addEventListener("close", function () {
    milestoneDialogMilestoneId = "";
  });

  elements.titleEditLayer.addEventListener("keydown", function (event) {
    if (!editingTitleMilestoneId) {
      return;
    }

    if (event.key === "Enter") {
      if (typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      closeTitleEditor(true);
    }

    if (event.key === "Escape") {
      closeTitleEditor(false);
    }
  });

  elements.titleEditLayer.addEventListener("focusout", function () {
    closeTitleEditor(true);
  });

  elements.ownerMenuLayer.addEventListener("click", function (event) {
    const actionTarget = closestMatch(event.target, "[data-action]");

    if (!actionTarget) {
      ownerMenuMilestoneId = "";
      renderOwnerMenuLayer();
      return;
    }

    if (actionTarget.dataset.action === "assign-owner") {
      assignOwner(actionTarget.dataset.id, actionTarget.dataset.personId || "");
      return;
    }

    if (actionTarget.dataset.action === "open-person-dialog") {
      const milestoneId = actionTarget.dataset.id;

      ownerMenuMilestoneId = "";
      renderOwnerMenuLayer();
      openPersonDialog(milestoneId);
    }
  });

  elements.statusMenuLayer.addEventListener("click", function (event) {
    const actionTarget = closestMatch(event.target, "[data-action]");

    if (!actionTarget) {
      statusMenuMilestoneId = "";
      renderStatusMenuLayer();
      return;
    }

    if (actionTarget.dataset.action === "set-status") {
      assignStatus(actionTarget.dataset.id, actionTarget.dataset.status);
    }
  });

  elements.personForm.addEventListener("submit", function (event) {
    event.preventDefault();
    savePersonFromDialog();
  });

  elements.cancelPersonButton.addEventListener("click", closePersonDialog);

  elements.clearPersonPhotoButton.addEventListener("click", function () {
    pendingPersonPhotoDataUrl = "";
    elements.personPhotoInput.value = "";
    renderPersonPhotoPreview();
  });

  elements.personPhotoInput.addEventListener("change", function (event) {
    handlePersonPhotoUpload(event.target.files && event.target.files[0]);
  });

  elements.personNameInput.addEventListener("input", renderPersonPhotoPreview);
  elements.personEmailInput.addEventListener("input", renderPersonPhotoPreview);

  if (typeof document.addEventListener === "function") {
    document.addEventListener("pointermove", function (event) {
      if (!dragState) {
        return;
      }

      if (Math.abs(event.clientX - dragState.startClientX) > 3) {
        dragState.moved = true;
      }

      if (!dragState.moved) {
        return;
      }

      if (typeof event.preventDefault === "function") {
        event.preventDefault();
      }

      updateMilestoneDateFromDrag(event.clientX, dragState);
    });

    document.addEventListener("pointerup", function (event) {
      if (!dragState) {
        return;
      }

      const completedDrag = dragState;
      dragState = null;

      if (completedDrag.moved) {
        updateMilestoneDateFromDrag(event.clientX, completedDrag);
        return;
      }

      openStatusMenu(completedDrag.milestoneId, completedDrag.target);
    });

    document.addEventListener("click", function (event) {
      if (
        (!ownerMenuMilestoneId && !statusMenuMilestoneId) ||
        closestMatch(event.target, ".owner-menu-panel") ||
        closestMatch(event.target, ".status-menu-panel") ||
        closestMatch(event.target, '[data-action="toggle-owner-menu"]') ||
        closestMatch(event.target, '[data-action="drag-date"]')
      ) {
        return;
      }

      closeFloatingMenus();
    });
  }

  render();
})();
