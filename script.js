const form = document.getElementById("signup-form");
const panel = document.getElementById("panel");
const submitBtn = document.getElementById("submit");
const submitLabel = submitBtn.querySelector(".submit-label");
const statusEl = document.getElementById("form-status");
const success = document.getElementById("success");
const operatorEl = document.getElementById("operator-id");

const fields = {
  gamertag: document.getElementById("gamertag"),
  email: document.getElementById("email"),
  password: document.getElementById("password"),
  confirm: document.getElementById("confirm"),
  terms: document.getElementById("terms"),
};

const touched = new Set();
let isSubmitting = false;

/* ---------- Validation rules ---------- */
const validators = {
  gamertag(v) {
    v = v.trim();
    if (!v) return "Escribe un gamertag.";
    if (v.length < 3) return "El gamertag debe tener al menos 3 caracteres.";
    if (!/^[A-Za-z0-9_]+$/.test(v)) return "Usa solo letras, números y guiones bajos.";
    return "";
  },
  email(v) {
    v = v.trim();
    if (!v) return "Escribe tu correo electrónico.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "Escribe un correo válido, por ejemplo nombre@ejemplo.com.";
    return "";
  },
  password(v) {
    if (!v) return "Crea una contraseña.";
    if (v.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
    if (!/[A-Z]/.test(v) || !/[a-z]/.test(v) || !/\d/.test(v))
      return "Incluye una mayúscula, una minúscula y un número.";
    return "";
  },
  confirm(v) {
    if (!v) return "Confirma tu contraseña.";
    if (v !== fields.password.value) return "Las contraseñas no coinciden.";
    return "";
  },
  terms(_, el) {
    return el.checked ? "" : "Debes aceptar los términos para continuar.";
  },
};

function validateField(name) {
  const el = fields[name];
  const msg = validators[name](el.value, el);
  const errorEl = document.getElementById(`${name}-error`);
  const wrapper = el.closest(".field");

  errorEl.textContent = msg;
  if (msg) {
    el.setAttribute("aria-invalid", "true");
    wrapper.classList.remove("valid");
  } else {
    el.removeAttribute("aria-invalid");
    wrapper.classList.toggle("valid", name !== "terms");
  }
  return !msg;
}

/* Validate on blur; re-validate live once a field has been touched */
Object.entries(fields).forEach(([name, el]) => {
  const evt = el.type === "checkbox" ? "change" : "blur";
  el.addEventListener(evt, () => {
    if (el.type !== "checkbox" && !el.value && !touched.has(name)) return; // don't nag on empty tab-through
    touched.add(name);
    validateField(name);
  });
  el.addEventListener("input", () => {
    if (touched.has(name)) validateField(name);
    if (name === "password" && touched.has("confirm")) validateField("confirm");
  });
});

/* ---------- Password strength ---------- */
const strengthWrap = document.querySelector(".strength");
const strengthText = document.getElementById("password-strength-text");
const LEVELS = ["—", "Débil", "Regular", "Buena", "Fuerte"];

function scorePassword(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.max(1, Math.min(4, score - (pw.length < 8 ? 1 : 0)));
}

let strengthTimer;
fields.password.addEventListener("input", () => {
  const level = scorePassword(fields.password.value);
  strengthWrap.dataset.level = level;
  // Debounce the text so screen readers don't announce every keystroke
  clearTimeout(strengthTimer);
  strengthTimer = setTimeout(() => {
    strengthText.textContent = `Seguridad: ${LEVELS[level]}`;
  }, 400);
});

/* ---------- Show / hide password ---------- */
document.querySelectorAll(".toggle-pw").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    btn.setAttribute("aria-pressed", String(show));
    const label = btn.dataset.target === "confirm" ? "confirmación de contraseña" : "contraseña";
    btn.setAttribute("aria-label", `${show ? "Ocultar" : "Mostrar"} ${label}`);
  });
});

/* ---------- Caps Lock warning ---------- */
["password", "confirm"].forEach((name) => {
  const input = fields[name];
  const warn = document.getElementById(`${name}-caps`);
  const check = (e) => {
    if (typeof e.getModifierState === "function") warn.hidden = !e.getModifierState("CapsLock");
  };
  input.addEventListener("keydown", check);
  input.addEventListener("keyup", check);
  input.addEventListener("blur", () => (warn.hidden = true));
});

/* ---------- Live Operator ID ---------- */
function hash(str) {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return String(h % 10000).padStart(4, "0");
}
function operatorId() {
  const tag = fields.gamertag.value.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");
  return tag ? { num: hash(tag), tag } : { num: "0000", tag: "SIN ASIGNAR" };
}
fields.gamertag.addEventListener("input", () => {
  const { num, tag } = operatorId();
  operatorEl.innerHTML = "";
  operatorEl.append(`NC-${num}-`);
  const span = document.createElement("span");
  span.textContent = tag;
  operatorEl.append(span);
});

/* ---------- Submit ---------- */
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (isSubmitting) return;

  Object.keys(fields).forEach((n) => touched.add(n));
  const results = Object.keys(fields).map((n) => [n, validateField(n)]);
  const invalid = results.filter(([, ok]) => !ok);

  if (invalid.length) {
    statusEl.textContent = `Corrige ${invalid.length} ${invalid.length === 1 ? "error" : "errores"} en el formulario.`;
    fields[invalid[0][0]].focus();
    if (!reduceMotion.matches) {
      panel.classList.remove("shake");
      void panel.offsetWidth; // restart animation
      panel.classList.add("shake");
    }
    return;
  }

  // Fake request
  isSubmitting = true;
  submitBtn.classList.add("loading");
  submitBtn.setAttribute("aria-disabled", "true");
  form.setAttribute("aria-busy", "true");
  submitLabel.textContent = "Creando cuenta…";
  statusEl.textContent = "Creando tu cuenta, espera un momento.";

  setTimeout(showSuccess, 1800);
});

panel.addEventListener("animationend", () => panel.classList.remove("shake"));

function showSuccess() {
  const { num, tag } = operatorId();
  document.getElementById("success-name").textContent = fields.gamertag.value.trim();
  document.getElementById("success-email").textContent = fields.email.value.trim();
  document.getElementById("success-id").textContent = `NC-${num}-${tag}`;

  form.hidden = true;
  success.hidden = false;
  // Restart draw animation each time
  success.querySelectorAll(".hex, .check").forEach((el) => {
    el.style.animation = "none"; void el.getBoundingClientRect(); el.style.animation = "";
  });
  const title = document.getElementById("success-title");
  title.focus(); // moves screen reader to the success message
}

document.getElementById("reset").addEventListener("click", () => {
  form.reset();
  touched.clear();
  isSubmitting = false;
  submitBtn.classList.remove("loading");
  submitBtn.removeAttribute("aria-disabled");
  form.removeAttribute("aria-busy");
  submitLabel.textContent = "Crear cuenta";
  statusEl.textContent = "";
  strengthWrap.dataset.level = 0;
  strengthText.textContent = "Seguridad: —";
  Object.keys(fields).forEach((n) => {
    fields[n].removeAttribute("aria-invalid");
    fields[n].closest(".field").classList.remove("valid");
    document.getElementById(`${n}-error`).textContent = "";
  });
  document.querySelectorAll(".toggle-pw").forEach((btn) => {
    document.getElementById(btn.dataset.target).type = "password";
    btn.setAttribute("aria-pressed", "false");
  });
  fields.gamertag.dispatchEvent(new Event("input"));
  success.hidden = true;
  form.hidden = false;
  fields.gamertag.focus();
});
