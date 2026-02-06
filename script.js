// current selected contact diameter (cm)
let selectedDiameter = null;
let selectedButton = null;

// last computed energy in joules (J)
let lastEnergy = null;

// display mode: 'auto' (kJ/MJ automatically) or 'full' (full joules)
let displayMode = 'auto';

// geometry mode: 'diameter' or 'wh' (width × height)
let geometryMode = 'diameter';

// materials (approximate strength limits, Pa)
const materials = {
  wood: 60e6,
  concrete: 60e6,
  reinforced_concrete: 120e6,
  asphalt: 3e6,
  brick: 15e6,
  steel: 800e6,
  iron: 400e6,
  titanium: 1100e6,
  ceramic: 80e6,
  rock: 200e6,
  soil: 0.3e6
};

// set selected contact (shared by all 8 buttons)
function setContact(value, btn) {
  const v = Number(value);
  if (Number.isNaN(v)) return;

  // remove active state from all chips
  document.querySelectorAll('.chip').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-pressed', 'false');
  });

  // mark current button as active
  btn.classList.add('active');
  btn.setAttribute('aria-pressed', 'true');
  selectedButton = btn;
  selectedDiameter = v;

  // show selection in UI
  const label = btn.dataset.label || '';
  const group = btn.dataset.group === 'impact' ? 'Impact part' : (btn.dataset.group === 'target' ? 'Target part' : '');
  document.getElementById('contactDisplay').innerText = `${group} — ${label} (${v} cm)`;
}

// format energy for display (auto)
function formatEnergyParts(joules) {
  if (joules >= 1e6) {
    return {
      num: (joules / 1e6).toLocaleString(undefined, {maximumFractionDigits:2}),
      unit: "MJ"
    };
  } else if (joules >= 1e3) {
    return {
      num: (joules / 1e3).toLocaleString(undefined, {maximumFractionDigits:2}),
      unit: "kJ"
    };
  } else {
    return {
      num: Math.round(joules).toLocaleString(),
      unit: "J"
    };
  }
}

// render energy according to current display mode
function renderEnergy() {
  const out = document.getElementById('output');
  if (lastEnergy === null || lastEnergy === undefined || isNaN(lastEnergy)) {
    out.querySelector('.value').innerText = '0';
    out.querySelector('.unit').innerText = 'J';
    return;
  }

  if (displayMode === 'full') {
    out.querySelector('.value').innerText = Math.round(lastEnergy).toLocaleString();
    out.querySelector('.unit').innerText = 'J';
  } else {
    const parts = formatEnergyParts(lastEnergy);
    out.querySelector('.value').innerText = parts.num;
    out.querySelector('.unit').innerText = parts.unit;
  }
}

// toggle display format (Auto / Full)
function toggleDisplayFormat() {
  displayMode = (displayMode === 'auto') ? 'full' : 'auto';
  const btn = document.getElementById('formatToggle');
  btn.innerText = displayMode === 'auto' ? 'Format: Auto' : 'Format: Full';
  renderEnergy();
}

// switch geometry mode (diameter or width×height)
function switchGeometry(mode) {
  geometryMode = mode === 'wh' ? 'wh' : 'diameter';
  const btnD = document.getElementById('geometryDiameterBtn');
  const btnWH = document.getElementById('geometryWHBtn');
  const diameterEl = document.getElementById('craterDiameter');
  const widthEl = document.getElementById('craterWidth');
  const heightEl = document.getElementById('craterHeight');

  if (geometryMode === 'diameter') {
    btnD.classList.add('active'); btnD.setAttribute('aria-pressed', 'true');
    btnWH.classList.remove('active'); btnWH.setAttribute('aria-pressed', 'false');
    diameterEl.classList.remove('hidden');
    widthEl.classList.add('hidden');
    heightEl.classList.add('hidden');
  } else {
    btnWH.classList.add('active'); btnWH.setAttribute('aria-pressed', 'true');
    btnD.classList.remove('active'); btnD.setAttribute('aria-pressed', 'false');
    diameterEl.classList.add('hidden');
    widthEl.classList.remove('hidden');
    heightEl.classList.remove('hidden');
  }
}

// main calculation
function calculate() {
  if (selectedDiameter === null) {
    alert("Please select one of the 8 contact options.");
    return;
  }

  const material = document.getElementById("material").value;
  const type = document.getElementById("impactType").value;
  const depth = Number(document.getElementById("depth").value);

  if (!depth || depth <= 0 || isNaN(depth)) {
    alert("Please enter a valid depth/thickness (greater than 0).");
    return;
  }

  let craterD = null; // in cm if applicable
  let width = null;
  let height = null;

  if (geometryMode === 'diameter') {
    craterD = Number(document.getElementById("craterDiameter").value);
    if (!craterD || craterD <= 0 || isNaN(craterD)) {
      alert("Please enter a valid crater diameter (greater than 0).");
      return;
    }
  } else {
    width = Number(document.getElementById("craterWidth").value);
    height = Number(document.getElementById("craterHeight").value);
    if (!width || width <= 0 || isNaN(width) || !height || height <= 0 || isNaN(height)) {
      alert("Please enter valid crater width and height (greater than 0).");
      return;
    }
  }

  // convert to meters
  const rContact = (selectedDiameter / 100) / 2;
  let rCrater = 0;
  let h = depth / 100;
  if (geometryMode === 'diameter') {
    rCrater = (craterD / 100) / 2;
  } else {
    // width and height are diameters on two axes (cm)
    // a = semi-axis width, b = semi-axis height
    const a = (width / 100) / 2;
    const b = (height / 100) / 2;
    // equivalent circular radius by ellipse area: r_eq = sqrt(a*b)
    rCrater = Math.sqrt(Math.max(0, a * b));
  }

  // check: crater should be >= contact (in equivalent radius)
  if (rCrater < rContact) {
    alert("Crater size is smaller than contact diameter — please enter correct crater dimensions.");
    return;
  }

  let volume = 0;

  if (type === "normal") {
    const vCylinder = Math.PI * rContact * rContact * h;
    const vCone = (Math.PI * h / 3) *
      (rCrater * rCrater + rCrater * rContact + rContact * rContact);
    volume = vCylinder + vCone;
  } else if (type === "clean") {
    // for clean (through) crater use base area (ellipse or circle) * thickness
    if (geometryMode === 'diameter') {
      volume = Math.PI * rCrater * rCrater * h;
    } else {
      // elliptical area = π * a * b
      const a = (width / 100) / 2;
      const b = (height / 100) / 2;
      const area = Math.PI * a * b;
      volume = area * h;
    }
  }

  const strength = materials[material];
  if (strength === undefined) {
    alert("Unknown material selected.");
    return;
  }

  // energy (approx.): Pa * m^3 = J
  lastEnergy = strength * volume;

  renderEnergy();
}

// reset: clears inputs, selected contact and result,
// but DOES NOT change selected material and displayMode
function resetSelection() {
  // remove active buttons and selection
  document.querySelectorAll('.chip').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-pressed', 'false');
  });
  selectedDiameter = null;
  selectedButton = null;
  document.getElementById('contactDisplay').innerText = '—';

  // clear inputs
  const craterEl = document.getElementById('craterDiameter');
  const widthEl = document.getElementById('craterWidth');
  const heightEl = document.getElementById('craterHeight');
  const depthEl = document.getElementById('depth');
  if (craterEl) craterEl.value = '';
  if (widthEl) widthEl.value = '';
  if (heightEl) heightEl.value = '';
  if (depthEl) depthEl.value = '';

  // reset last result (keep material and displayMode)
  lastEnergy = null;
  renderEnergy();
}

// on load: set initial labels and wire up geometry buttons
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('formatToggle');
  if (btn) btn.innerText = displayMode === 'auto' ? 'Format: Auto' : 'Format: Full';
  renderEnergy();

  document.getElementById('geometryDiameterBtn').addEventListener('click', () => switchGeometry('diameter'));
  document.getElementById('geometryWHBtn').addEventListener('click', () => switchGeometry('wh'));
});