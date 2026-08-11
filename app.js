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

  const elements = {
    addButton: document.querySelector("#addButton"),
    asOfInput: document.querySelector("#asOfInput"),
    completedCount: document.querySelector("#completedCount"),
    downloadButton: document.querySelector("#downloadButton"),
    milestoneRows: document.querySelector("#milestoneRows"),
    nowButton: document.querySelector("#nowButton"),
    overdueCount: document.querySelector("#overdueCount"),
    resetButton: document.querySelector("#resetButton"),
    showTodayInput: document.querySelector("#showTodayInput"),
    sortButton: document.querySelector("#sortButton"),
    timelineMount: document.querySelector("#timelineMount"),
    totalCount: document.querySelector("#totalCount"),
    upcomingCount: document.querySelector("#upcomingCount"),
  };

  const state = loadSavedState();

  let currentSvgMarkup = "";

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function toDateTimeInput(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate(),
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function parseDateTime(value) {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function dateWithOffset(anchor, days, hours) {
    const date = new Date(anchor);
    date.setDate(date.getDate() + days);
    date.setHours(date.getHours() + (hours || 0));
    return date;
  }

  function createExampleMilestones(anchor) {
    return [
      {
        id: "brief-approved",
        title: "Brief approved",
        at: toDateTimeInput(dateWithOffset(anchor, -18, -3)),
        status: "completed",
      },
      {
        id: "data-freeze",
        title: "Data freeze",
        at: toDateTimeInput(dateWithOffset(anchor, -9, 2)),
        status: "completed",
      },
      {
        id: "design-review",
        title: "Design review",
        at: toDateTimeInput(dateWithOffset(anchor, -2, -1)),
        status: "pending",
      },
      {
        id: "beta-launch",
        title: "Beta launch",
        at: toDateTimeInput(dateWithOffset(anchor, 6, 1)),
        status: "pending",
      },
      {
        id: "public-release",
        title: "Public release",
        at: toDateTimeInput(dateWithOffset(anchor, 20, -2)),
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

  function normalizeMilestone(candidate, index) {
    if (!candidate || typeof candidate !== "object") {
      return null;
    }

    return {
      id:
        typeof candidate.id === "string" && candidate.id.trim()
          ? candidate.id
          : `saved-${index}-${makeId()}`,
      title: typeof candidate.title === "string" ? candidate.title : "",
      at: typeof candidate.at === "string" ? candidate.at : "",
      status: candidate.status === "completed" ? "completed" : "pending",
    };
  }

  function loadSavedState() {
    const now = new Date();
    const fallback = {
      asOf: toDateTimeInput(now),
      milestones: createExampleMilestones(now),
      showToday: true,
    };
    const storage = getStorage();

    if (!storage) {
      return fallback;
    }

    try {
      const saved = JSON.parse(storage.getItem(STORAGE_KEY) || "null");

      if (!saved || typeof saved !== "object") {
        return fallback;
      }

      const savedMilestones = Array.isArray(saved.milestones)
        ? saved.milestones
            .map(function (milestone, index) {
              return normalizeMilestone(milestone, index);
            })
            .filter(Boolean)
        : fallback.milestones;

      return {
        asOf: typeof saved.asOf === "string" ? saved.asOf : fallback.asOf,
        milestones: savedMilestones,
        showToday:
          typeof saved.showToday === "boolean"
            ? saved.showToday
            : fallback.showToday,
      };
    } catch (_error) {
      return fallback;
    }
  }

  function saveState() {
    const storage = getStorage();

    if (!storage) {
      return;
    }

    try {
      storage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          asOf: state.asOf,
          milestones: state.milestones,
          showToday: state.showToday,
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

  function formatDate(date, span) {
    const includeTime = span <= 4 * DAY_MS;
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

  function assignLabelTracks(points, span) {
    const tracks = [];
    let topRows = 0;
    let bottomRows = 0;

    const trackedPoints = points.map(function (point, index) {
      const title = shortLabel(point.title, 26);
      const dateLabel = formatDate(point.date, span);
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

  function buildTimelineModel(parsedMilestones, markerDate, showMarker) {
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
    const labelLayout = assignLabelTracks(basicPoints, span);
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
      points: points,
      ticks: buildTicks(minTime, maxTime),
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

  function renderChart(model, showMarker) {
    const span = model.maxTime - model.minTime;
    const gridBottom = model.height - 62;
    const tickLabelY = model.height - 28;
    const ticksMarkup = model.ticks
      .map(function (tick) {
        return `
          <g>
            <line stroke="#e2e8f0" stroke-dasharray="4 8" stroke-width="1"
              x1="${tick.x}" x2="${tick.x}" y1="52" y2="${gridBottom}" />
            <text fill="#64748b" font-size="16" text-anchor="middle"
              x="${tick.x}" y="${tickLabelY}">${escapeHtml(formatDate(tick.date, span))}</text>
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

    const pointMarkup = model.points
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
        const connectorColor =
          point.timelineState === "overdue" ? "#d97706" : "#94a3b8";
        const connectorWidth = point.timelineState === "overdue" ? 3 : 2;
        const anchorColor =
          point.timelineState === "overdue" ? "#d97706" : "#475569";
        const anchorWidth = point.timelineState === "overdue" ? 4 : 2;
        const anchorMaskRadius = 13;

        return `
          <circle cx="${point.x}" cy="${model.axisY}" fill="#ffffff"
            r="${anchorMaskRadius}" />
          <g opacity="${labelOpacity}">
            <path d="M ${point.x} ${model.axisY} V ${connectorY} H ${point.labelX} V ${badgeEdgeY}"
              fill="none" stroke="${connectorColor}" stroke-linecap="round"
              stroke-linejoin="round" stroke-width="${connectorWidth}" />
            <circle cx="${point.x}" cy="${model.axisY}" fill="#ffffff" r="9"
              stroke="${anchorColor}" stroke-width="${anchorWidth}" />
            <g transform="translate(${point.labelX} ${point.y})">
              <circle fill="${style.fill}" opacity="${style.opacity}" r="21"
                stroke="${style.stroke}" stroke-width="${style.strokeWidth}" />
              ${statusIcon(point.timelineState)}
            </g>
            <rect fill="#ffffff" height="48" rx="7"
              stroke="#e2e8f0" stroke-width="1"
              width="${point.labelWidth}" x="${point.labelLeft}"
              y="${labelRectY}" />
            <text fill="#0f172a" font-size="18" font-weight="800"
              text-anchor="middle" x="${point.labelX}" y="${titleY}">${title}</text>
            <text fill="#64748b" font-size="15" font-weight="600"
              text-anchor="middle" x="${point.labelX}" y="${dateY}">${dateLabel}</text>
          </g>
        `;
      })
      .join("");

    return `
      <svg aria-label="Timeline visual" class="timeline-svg" role="img"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 ${model.width} ${model.height}">
        <rect fill="#ffffff" height="${model.height}" rx="8"
          width="${model.width}" />
        ${ticksMarkup}
        <line stroke="#000000" stroke-linecap="round"
          stroke-width="3" x1="${CHART_LEFT}" x2="${CHART_WIDTH - CHART_RIGHT}"
          y1="${model.axisY}" y2="${model.axisY}" />
        ${markerMarkup}
        ${emptyMarkup}
        ${pointMarkup}
      </svg>
    `;
  }

  function getParsedMilestones(asOfDate) {
    return state.milestones.flatMap(function (milestone) {
      const date = parseDateTime(milestone.at);

      if (!date) {
        return [];
      }

      const timestamp = date.getTime();

      return [
        Object.assign({}, milestone, {
          date: date,
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

  function stateLabel(timelineState) {
    if (timelineState === "completed") {
      return "Complete";
    }

    if (timelineState === "overdue") {
      return "Overdue";
    }

    return "Upcoming";
  }

  function renderRows(asOfDate) {
    elements.milestoneRows.innerHTML = state.milestones
      .map(function (milestone) {
        const date = parseDateTime(milestone.at);
        const timelineState = date
          ? getMilestoneState(milestone.status, date.getTime(), asOfDate)
          : "upcoming";

        return `
          <div class="editor-grid editor-row editor-row-${timelineState}">
            <input aria-label="Milestone title" data-field="title"
              data-id="${escapeHtml(milestone.id)}"
              value="${escapeHtml(milestone.title)}" />
            <input aria-label="Milestone date and time" data-field="at"
              data-id="${escapeHtml(milestone.id)}" type="datetime-local"
              value="${escapeHtml(milestone.at)}" />
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
            <button class="remove-button" data-action="remove"
              data-id="${escapeHtml(milestone.id)}" type="button">
              Remove
            </button>
          </div>
        `;
      })
      .join("");
  }

  function renderTimelineAndCounts() {
    const asOfDate = parseDateTime(state.asOf);
    const parsedMilestones = getParsedMilestones(asOfDate);
    const counts = parsedMilestones.reduce(
      function (accumulator, milestone) {
        accumulator.total += 1;
        accumulator[milestone.timelineState] += 1;
        return accumulator;
      },
      { completed: 0, overdue: 0, upcoming: 0, total: 0 },
    );

    elements.asOfInput.value = state.asOf;
    elements.showTodayInput.checked = state.showToday;
    elements.totalCount.textContent = String(counts.total);
    elements.completedCount.textContent = String(counts.completed);
    elements.overdueCount.textContent = String(counts.overdue);
    elements.upcomingCount.textContent = String(counts.upcoming);

    const model = buildTimelineModel(
      parsedMilestones,
      asOfDate,
      state.showToday,
    );
    currentSvgMarkup = renderChart(model, state.showToday);
    elements.timelineMount.innerHTML = currentSvgMarkup;

    return asOfDate;
  }

  function render() {
    const asOfDate = renderTimelineAndCounts();
    renderRows(asOfDate);
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
    } else {
      renderTimelineAndCounts();
    }
  }

  function addMilestone() {
    const asOfDate = parseDateTime(state.asOf);
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
      at: toDateTimeInput(nextDate),
      status: "pending",
    });
    saveAndRender();
  }

  function sortMilestones() {
    state.milestones.sort(function (a, b) {
      const aTime = parseDateTime(a.at)
        ? parseDateTime(a.at).getTime()
        : Number.MAX_SAFE_INTEGER;
      const bTime = parseDateTime(b.at)
        ? parseDateTime(b.at).getTime()
        : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
    saveAndRender();
  }

  function resetSample() {
    const asOfDate = parseDateTime(state.asOf) || new Date();
    state.milestones = createExampleMilestones(asOfDate);
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

  elements.asOfInput.addEventListener("input", function (event) {
    state.asOf = event.target.value;
    saveAndRender();
  });

  elements.showTodayInput.addEventListener("change", function (event) {
    state.showToday = event.target.checked;
    saveAndRender();
  });

  elements.nowButton.addEventListener("click", function () {
    state.asOf = toDateTimeInput(new Date());
    saveAndRender();
  });

  elements.addButton.addEventListener("click", addMilestone);
  elements.sortButton.addEventListener("click", sortMilestones);
  elements.resetButton.addEventListener("click", resetSample);
  elements.downloadButton.addEventListener("click", downloadSvg);

  elements.milestoneRows.addEventListener("input", function (event) {
    const field = event.target.dataset.field;
    const id = event.target.dataset.id;

    if (field === "title" || field === "at") {
      updateMilestone(id, field, event.target.value, false);
    }
  });

  elements.milestoneRows.addEventListener("change", function (event) {
    const field = event.target.dataset.field;
    const id = event.target.dataset.id;

    if (field === "status" || field === "title" || field === "at") {
      updateMilestone(id, field, event.target.value, true);
    }
  });

  elements.milestoneRows.addEventListener("click", function (event) {
    if (event.target.dataset.action === "remove") {
      state.milestones = state.milestones.filter(function (milestone) {
        return milestone.id !== event.target.dataset.id;
      });
      saveAndRender();
    }
  });

  render();
})();
