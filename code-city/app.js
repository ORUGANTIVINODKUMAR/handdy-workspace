(() => {
  const canvas = document.querySelector('#city');
  const ctx = canvas.getContext('2d');
  const data = window.CODE_CITY_DATA?.files ?? [];
  const $ = (selector) => document.querySelector(selector);

  const palette = {
    js: '#55d6ff',
    jsx: '#9a78ff',
    css: '#ff5cb8',
    cjs: '#5ff0a5',
    mjs: '#ffd166',
    html: '#ff8c5a',
  };

  const districtColors = {
    backend: '#49ccff',
    dashboard: '#9c75ff',
    'desktop-app': '#ff5eac',
    root: '#6ff0b0',
  };

  const state = {
    yaw: -0.64,
    pitch: 0.79,
    zoom: 1,
    targetYaw: -0.64,
    targetPitch: 0.79,
    targetZoom: 1,
    focusX: 0,
    focusZ: 0,
    targetFocusX: 0,
    targetFocusZ: 0,
    dragging: false,
    downX: 0,
    downY: 0,
    lastX: 0,
    lastY: 0,
    hovered: null,
    selected: null,
    query: '',
    labels: true,
    autoTour: true,
    codeOpen: false,
    intro: 0,
    hitRegions: [],
  };

  const districtNames = [...new Set(data.map((file) => file.district))];
  const districts = buildDistricts(data, districtNames);
  const cityBuildings = districts.flatMap((district) => district.buildings);
  const buildingsByPath = new Map(cityBuildings.map((building) => [building.path.toLowerCase(), building]));
  const totalLines = data.reduce((sum, file) => sum + file.lines, 0);
  const format = new Intl.NumberFormat('en-US');

  $('#line-count').textContent = format.format(totalLines);
  $('#file-count').textContent = format.format(data.length);
  $('#district-count').textContent = districtNames.length;

  buildLegend();
  bindEvents();
  resize();
  openLinkedFile();
  requestAnimationFrame(render);

  function buildDistricts(files, names) {
    const positions = [
      { x: -72, z: -8 },
      { x: 3, z: -3 },
      { x: 75, z: 2 },
      { x: 0, z: 62 },
    ];

    return names.map((name, districtIndex) => {
      const districtFiles = files.filter((file) => file.district === name);
      const cols = Math.ceil(Math.sqrt(districtFiles.length * 1.2));
      const rows = Math.ceil(districtFiles.length / cols);
      const spacing = 5.8;
      const origin = positions[districtIndex] ?? { x: districtIndex * 58, z: 55 };
      const buildings = districtFiles.map((file, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const seed = hash(file.path);
        const width = 3.2 + (seed % 14) / 10;
        const depth = 3.1 + ((seed >> 4) % 13) / 10;
        return {
          ...file,
          id: `${name}-${index}`,
          x: origin.x + (col - (cols - 1) / 2) * spacing,
          z: origin.z + (row - (rows - 1) / 2) * spacing,
          width,
          depth,
          height: 1.6 + Math.pow(Math.max(1, file.lines), 0.56) * 0.75,
          color: palette[file.extension] ?? '#93a4bc',
        };
      });

      return {
        name,
        color: districtColors[name] ?? '#8da1bd',
        x: origin.x,
        z: origin.z,
        width: cols * spacing + 5,
        depth: rows * spacing + 5,
        buildings,
        lines: districtFiles.reduce((sum, file) => sum + file.lines, 0),
      };
    });
  }

  function hash(value) {
    let result = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      result ^= value.charCodeAt(i);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  }

  function buildLegend() {
    const counts = data.reduce((acc, file) => {
      acc[file.extension] = (acc[file.extension] ?? 0) + 1;
      return acc;
    }, {});
    $('#legend').innerHTML = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([extension, count]) => `<span><i style="background:${palette[extension]};color:${palette[extension]}"></i>${extension} · ${count}</span>`)
      .join('');
  }

  function openLinkedFile() {
    const requestedPath = new URLSearchParams(window.location.search).get('file');
    if (!requestedPath) return;
    const file = data.find((entry) => entry.path.toLowerCase() === requestedPath.toLowerCase());
    if (file) selectFile(file);
  }

  function bindEvents() {
    window.addEventListener('resize', resize);
    canvas.addEventListener('pointerdown', (event) => {
      state.dragging = true;
      setAutoTour(false);
      state.downX = event.clientX;
      state.downY = event.clientY;
      state.lastX = event.clientX;
      state.lastY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', (event) => {
      if (state.dragging) {
        state.targetYaw += (event.clientX - state.lastX) * 0.007;
        state.targetPitch = clamp(state.targetPitch + (event.clientY - state.lastY) * 0.005, 0.28, 1.22);
        state.lastX = event.clientX;
        state.lastY = event.clientY;
      } else {
        updateHover(event.offsetX, event.offsetY, event.clientX, event.clientY);
      }
    });
    canvas.addEventListener('pointerup', (event) => {
      const moved = Math.abs(event.clientX - state.downX) + Math.abs(event.clientY - state.downY);
      state.dragging = false;
      if (moved < 5 && state.hovered) selectFile(state.hovered);
    });
    canvas.addEventListener('pointerleave', () => {
      state.dragging = false;
      state.hovered = null;
      $('#tooltip').hidden = true;
    });
    canvas.addEventListener('wheel', (event) => {
      event.preventDefault();
      state.targetZoom = clamp(state.targetZoom * Math.exp(-event.deltaY * 0.001), 0.55, 2.4);
      if (event.deltaY < 0 && state.targetZoom > 2.05 && state.hovered && !state.codeOpen) {
        selectFile(state.hovered);
      }
    }, { passive: false });

    $('#reset-view').addEventListener('click', () => {
      state.targetYaw = -0.64;
      state.targetPitch = 0.79;
      state.targetZoom = 1;
      state.targetFocusX = 0;
      state.targetFocusZ = 0;
      state.selected = null;
      setAutoTour(true);
      closeCode();
      showSelection(null);
    });
    $('#toggle-labels').addEventListener('click', (event) => {
      state.labels = !state.labels;
      event.currentTarget.setAttribute('aria-pressed', String(state.labels));
    });
    $('#toggle-tour').addEventListener('click', (event) => {
      setAutoTour(!state.autoTour);
    });
    $('#search').addEventListener('input', (event) => {
      state.query = event.target.value.trim().toLowerCase();
      const match = cityBuildings.find((file) => file.path.toLowerCase().includes(state.query));
      if (state.query && match) {
        state.selected = match;
        showSelection(match);
      }
    });
    $('#search').addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && state.selected) openCode(state.selected);
    });
    $('#close-code').addEventListener('click', closeCode);
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.codeOpen) closeCode();
    });
  }

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function project(point) {
    const cosY = Math.cos(state.yaw);
    const sinY = Math.sin(state.yaw);
    const localX = point.x - state.focusX;
    const localZ = point.z - state.focusZ;
    const rx = localX * cosY - localZ * sinY;
    const rz = localX * sinY + localZ * cosY;
    const cosP = Math.cos(state.pitch);
    const sinP = Math.sin(state.pitch);
    const ry = point.y * cosP - rz * sinP;
    const depth = point.y * sinP + rz * cosP;
    const scale = Math.min(canvas.clientWidth / 235, canvas.clientHeight / 155) * state.zoom;
    return {
      x: canvas.clientWidth * 0.51 + rx * scale,
      y: canvas.clientHeight * 0.56 - ry * scale,
      depth,
    };
  }

  function render(time) {
    const elapsed = Math.min(40, time - (state.lastFrame || time));
    state.lastFrame = time;
    if (state.autoTour && !state.dragging && !state.codeOpen) state.targetYaw += elapsed * 0.000035;
    state.yaw += (state.targetYaw - state.yaw) * 0.09;
    state.pitch += (state.targetPitch - state.pitch) * 0.09;
    state.zoom += (state.targetZoom - state.zoom) * 0.09;
    state.focusX += (state.targetFocusX - state.focusX) * 0.075;
    state.focusZ += (state.targetFocusZ - state.focusZ) * 0.075;
    state.intro = Math.min(1, state.intro + 0.018);

    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    drawStars(time);
    drawGrid();
    drawDistricts();
    requestAnimationFrame(render);
  }

  function drawStars(time) {
    ctx.save();
    for (let i = 0; i < 85; i += 1) {
      const x = (hash(`x${i}`) % 1000) / 1000 * canvas.clientWidth;
      const y = (hash(`y${i}`) % 620) / 1000 * canvas.clientHeight;
      const pulse = .3 + .25 * Math.sin(time * .001 + i);
      ctx.fillStyle = `rgba(150,190,255,${pulse})`;
      ctx.fillRect(x, y, i % 9 === 0 ? 1.5 : 1, i % 9 === 0 ? 1.5 : 1);
    }
    ctx.restore();
  }

  function drawGrid() {
    ctx.save();
    ctx.lineWidth = 1;
    for (let value = -130; value <= 130; value += 10) {
      const fade = .055 * (1 - Math.abs(value) / 180);
      ctx.strokeStyle = `rgba(93,141,210,${fade})`;
      line(project({ x: -130, y: 0, z: value }), project({ x: 130, y: 0, z: value }));
      line(project({ x: value, y: 0, z: -90 }), project({ x: value, y: 0, z: 90 }));
    }
    ctx.restore();
  }

  function drawDistricts() {
    state.hitRegions = [];
    const query = state.query;
    const sorted = [...cityBuildings].sort((a, b) => project({ x: a.x, y: 0, z: a.z }).depth - project({ x: b.x, y: 0, z: b.z }).depth);

    districts.forEach(drawDistrictBase);
    sorted.forEach((building) => {
      const match = !query || building.path.toLowerCase().includes(query);
      drawBuilding(building, match ? 1 : .09);
    });
    if (state.labels) districts.forEach(drawDistrictLabel);
  }

  function drawDistrictBase(district) {
    const corners = rectangle(district.x, district.z, district.width, district.depth, .05).map(project);
    ctx.save();
    ctx.beginPath();
    polygon(corners);
    ctx.fillStyle = hexToRgba(district.color, .035);
    ctx.fill();
    ctx.strokeStyle = hexToRgba(district.color, .2);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  function drawBuilding(building, opacity) {
    const selected = state.selected?.path === building.path;
    const hovered = state.hovered?.path === building.path;
    const growth = easeOutCubic(clamp((state.intro * 1.25) - ((hash(building.path) % 100) / 500), 0, 1));
    const height = building.height * growth;
    const base = rectangle(building.x, building.z, building.width, building.depth, 0).map(project);
    const top = rectangle(building.x, building.z, building.width, building.depth, height).map(project);
    const faces = [
      { points: [base[0], base[1], top[1], top[0]], shade: .44 },
      { points: [base[1], base[2], top[2], top[1]], shade: .27 },
      { points: top, shade: .78 },
    ];

    ctx.save();
    ctx.globalAlpha = opacity;
    if (selected || hovered) {
      ctx.shadowColor = building.color;
      ctx.shadowBlur = selected ? 20 : 11;
    }
    faces.forEach((face, index) => {
      ctx.beginPath();
      polygon(face.points);
      ctx.fillStyle = shade(building.color, face.shade + (selected ? .14 : 0));
      ctx.fill();
      ctx.strokeStyle = hexToRgba(building.color, selected || hovered ? .9 : .28);
      ctx.lineWidth = selected ? 1.5 : .55;
      ctx.stroke();
      if (index < 2 && height > 8) drawCodeTexture(face.points, building, opacity, selected || hovered);
    });
    ctx.restore();

    state.hitRegions.push({ file: building, polygon: convexHull([...base, ...top]) });
  }

  function drawCodeTexture(points, building, opacity, emphasized) {
    const levels = Math.min(18, Math.floor(building.height / 2.6));
    if (levels < 2) return;
    const sourceLines = building.source.split(/\r?\n/).filter((line) => line.trim());
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.lineWidth = emphasized ? .9 : .5;
    for (let i = 1; i < levels; i += 1) {
      const t = i / levels;
      const fullLeft = lerpPoint(points[0], points[3], t);
      const fullRight = lerpPoint(points[1], points[2], t);
      const sourceLine = sourceLines[(i * 7 + hash(building.path)) % Math.max(1, sourceLines.length)] ?? '';
      const start = Math.min(.16, (sourceLine.search(/\S/) / 30) || 0);
      const length = .22 + Math.min(.72, sourceLine.trim().length / 105);
      const left = lerpPoint(fullLeft, fullRight, start);
      const right = lerpPoint(fullLeft, fullRight, Math.min(.96, start + length));
      ctx.strokeStyle = hexToRgba(emphasized && i % 3 === 0 ? '#ffffff' : building.color, (emphasized ? .58 : .2) * opacity);
      line(left, right);
    }
    ctx.restore();
  }

  function drawDistrictLabel(district) {
    const point = project({ x: district.x, y: 0, z: district.z - district.depth / 2 - 4 });
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '700 10px Inter, system-ui, sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillStyle = hexToRgba(district.color, .9);
    ctx.fillText(district.name.toUpperCase(), point.x, point.y);
    ctx.font = '500 9px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(170,185,210,.55)';
    ctx.fillText(`${format.format(district.lines)} LINES`, point.x, point.y + 13);
    ctx.restore();
  }

  function updateHover(x, y, clientX, clientY) {
    state.hovered = [...state.hitRegions].reverse().find((region) => pointInPolygon({ x, y }, region.polygon))?.file ?? null;
    canvas.style.cursor = state.hovered ? 'pointer' : 'grab';
    const tooltip = $('#tooltip');
    if (!state.hovered) {
      tooltip.hidden = true;
      return;
    }
    tooltip.hidden = false;
    tooltip.textContent = `${state.hovered.path} · ${format.format(state.hovered.lines)} lines`;
    tooltip.style.left = `${Math.min(clientX + 14, window.innerWidth - 330)}px`;
    tooltip.style.top = `${Math.min(clientY + 14, window.innerHeight - 60)}px`;
  }

  function selectFile(file) {
    const building = buildingsByPath.get(file.path.toLowerCase()) ?? file;
    state.selected = building;
    state.targetFocusX = building.x ?? 0;
    state.targetFocusZ = building.z ?? 0;
    state.targetZoom = 1.72;
    state.targetPitch = 0.64;
    showSelection(building);
    openCode(building);
  }

  function openCode(file) {
    const reader = $('#code-reader');
    const source = $('#source-code');
    $('#code-file-name').textContent = file.name;
    $('#code-file-path').textContent = file.path;
    $('#code-language').textContent = file.extension.toUpperCase();
    $('#code-lines').textContent = `${format.format(file.lines)} lines`;

    const fragment = document.createDocumentFragment();
    const lines = (file.source ?? 'Source unavailable. Regenerate code-data.js.').replace(/\r\n/g, '\n').split('\n');
    lines.forEach((line, index) => {
      const row = document.createElement('span');
      row.className = 'code-line';
      row.dataset.line = String(index + 1);
      appendHighlightedLine(row, line || ' ', file.extension);
      fragment.append(row);
    });
    source.replaceChildren(fragment);
    source.scrollTop = 0;
    reader.hidden = false;
    state.codeOpen = true;
    $('.app-shell').classList.add('code-open');
  }

  function closeCode() {
    $('#code-reader').hidden = true;
    state.codeOpen = false;
    $('.app-shell').classList.remove('code-open');
  }

  function setAutoTour(enabled) {
    state.autoTour = enabled;
    $('#toggle-tour').setAttribute('aria-pressed', String(enabled));
  }

  function appendHighlightedLine(row, line, extension) {
    const pattern = extension === 'html'
      ? /(<!--.*?-->|<\/?[\w-]+|[\w-]+(?==)|"[^"]*"|'[^']*')/g
      : /(\/\/.*$|\/\*.*?\*\/|#[\w-]+|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`|\b(?:const|let|var|function|return|if|else|for|while|async|await|class|new|throw|try|catch|import|export|from|require|true|false|null|undefined)\b|\b\d+(?:\.\d+)?\b)/g;
    let cursor = 0;
    for (const match of line.matchAll(pattern)) {
      if (match.index > cursor) row.append(document.createTextNode(line.slice(cursor, match.index)));
      const token = document.createElement('span');
      token.textContent = match[0];
      token.className = tokenClass(match[0], extension);
      row.append(token);
      cursor = match.index + match[0].length;
    }
    if (cursor < line.length) row.append(document.createTextNode(line.slice(cursor)));
  }

  function tokenClass(value, extension) {
    if (value.startsWith('//') || value.startsWith('/*') || value.startsWith('<!--')) return 'token-comment';
    if (/^['"`]/.test(value)) return 'token-string';
    if (/^\d/.test(value)) return 'token-number';
    if (extension === 'html' && value.startsWith('<')) return 'token-tag';
    if (value.startsWith('#')) return 'token-tag';
    return 'token-keyword';
  }

  function showSelection(file) {
    $('#selected-name').textContent = file?.name ?? 'Explore the city';
    $('#selected-path').textContent = file?.path ?? 'Hover or click a building to inspect a source file.';
    $('#selected-lines').textContent = file ? format.format(file.lines) : '—';
    $('#selected-nonblank').textContent = file ? format.format(file.nonblank) : '—';
    $('#selected-language').textContent = file?.extension?.toUpperCase() ?? '—';
  }

  function rectangle(x, z, width, depth, y) {
    return [
      { x: x - width / 2, y, z: z - depth / 2 },
      { x: x + width / 2, y, z: z - depth / 2 },
      { x: x + width / 2, y, z: z + depth / 2 },
      { x: x - width / 2, y, z: z + depth / 2 },
    ];
  }

  function polygon(points) {
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
  }

  function line(a, b) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  function convexHull(points) {
    const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
    const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lower = [];
    const upper = [];
    for (const point of sorted) {
      while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), point) <= 0) lower.pop();
      lower.push(point);
    }
    for (const point of sorted.reverse()) {
      while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), point) <= 0) upper.pop();
      upper.push(point);
    }
    return lower.slice(0, -1).concat(upper.slice(0, -1));
  }

  function pointInPolygon(point, polygonPoints) {
    let inside = false;
    for (let i = 0, j = polygonPoints.length - 1; i < polygonPoints.length; j = i++) {
      const a = polygonPoints[i];
      const b = polygonPoints[j];
      if (((a.y > point.y) !== (b.y > point.y)) && (point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x)) inside = !inside;
    }
    return inside;
  }

  function shade(hex, lightness) {
    const [r, g, b] = hex.match(/[a-f\d]{2}/gi).map((value) => parseInt(value, 16));
    return `rgb(${Math.round(r * lightness)},${Math.round(g * lightness)},${Math.round(b * lightness)})`;
  }

  function hexToRgba(hex, alpha) {
    const [r, g, b] = hex.match(/[a-f\d]{2}/gi).map((value) => parseInt(value, 16));
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function lerpPoint(a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }
  function easeOutCubic(value) { return 1 - Math.pow(1 - value, 3); }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
})();
