
import { useEffect } from "react";
import TabsNav from "./TabsNav";
import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useParams,
} from "react-router-dom";
import { Html5QrcodeScanner } from "html5-qrcode";
import { QRCodeCanvas } from "qrcode.react";

/**
 * ==========================
 * CONFIG
 * ==========================
 */
const STORAGE_USERS = "VR_USERS";
const STORAGE_SESSION = "VR_SESSION";
const STORAGE_EVENTS = "VR_EVENTS";
const STORAGE_TICKETS = "VR_TICKETS";
const STORAGE_ADMIN = "VR_ADMIN";
const ADMIN_PASSWORD = "viento123";

/**
 * ==========================
 * DEFAULT EVENTS
 * ==========================
 * stock: null = ilimitado
 */
const defaultEvents = [
  {
    id: "1",
    title: "Viento Ritual – Edición I",
    date: "12 Abril 2026",
    dateISO: "2026-04-12",
    location: "Buenos Aires",
    description: "Una noche ritual de música y energía.",
    saleType: "tandas",
    tickets: [
      { id: "t1", name: "Preventa 1", price: 3000, stock: 5 },
      { id: "t2", name: "Preventa 2", price: 4000, stock: 3 },
      { id: "t3", name: "General", price: 5000, stock: null },
    ],
    image:
      "https://images.unsplash.com/photo-1507874457470-272b3c8d8ee2?auto=format&fit=crop&w=1200&q=60",
  },
  {
    id: "2",
    title: "Viento Ritual – Edición II",
    date: "20 Marzo 2025",
    dateISO: "2025-03-20",
    location: "Córdoba",
    description: "Evento finalizado.",
    saleType: "general",
    tickets: [{ id: "g1", name: "General", price: 4500, stock: 0 }],
    image:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=60",
  },
];

/**
 * ==========================
 * LOCAL STORAGE HELPERS
 * ==========================
 */
function loadEvents() {
  const raw = localStorage.getItem(STORAGE_EVENTS);

  if (!raw) {
    saveEvents(defaultEvents);
    return defaultEvents;
  }

  try {
    return JSON.parse(raw);
  } catch {
    saveEvents(defaultEvents);
    return defaultEvents;
  }
}


function saveEvents(events) {
  localStorage.setItem(STORAGE_EVENTS, JSON.stringify(events));
}


function loadTickets() {
  const raw = localStorage.getItem(STORAGE_TICKETS);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveTickets(tickets) {
  localStorage.setItem(STORAGE_TICKETS, JSON.stringify(tickets));
}
function loadUsers() {
  return JSON.parse(localStorage.getItem(STORAGE_USERS) || "[]");
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
}

function getSession() {
  return JSON.parse(localStorage.getItem(STORAGE_SESSION) || "null");
}

function setSession(user) {
  localStorage.setItem(STORAGE_SESSION, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(STORAGE_SESSION);
}
function enterAsGuest() {
  setSession({ role: "guest" });
}

/**
 * ==========================
 * ✅ EXPORT HELPERS (CSV)
 * ==========================
 */
function escapeCSV(value) {
  const str = String(value ?? "");
  // si tiene coma, salto de línea o comillas, se envuelve con comillas y se duplican las comillas internas
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCSV(filename, rows) {
  const csvContent = rows.map((row) => row.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * ==========================
 * STATUS HELPERS
 * ==========================
 */
function isEventFinished(event) {
  if (!event?.dateISO) return false;
  const today = new Date();
  const eventDate = new Date(event.dateISO + "T23:59:59");
  return today > eventDate;
}

function hasTicketsAvailable(event) {
  if (!event?.tickets?.length) return false;

  return event.tickets.some((t) => {
    if (t.stock === null) return true;
    return t.stock > 0;
  });
}

function getEventStatus(event) {
  if (isEventFinished(event)) {
    return { label: "FINALIZADO", color: "#dc2626" };
  }

  if (!hasTicketsAvailable(event)) {
    return { label: "ENTRADAS AGOTADAS", color: "#f59e0b" };
  }

  return { label: "ACTIVO", color: "#16a34a" };
}

/**
 * ==========================
 * TICKET HELPERS
 * ==========================
 */
function generateQR(eventId) {
  return `VR-${eventId}-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
}

function getAvailableTicket(event) {
  if (!event?.tickets?.length) return null;

  if (event.saleType === "general") return event.tickets[0];

  // tandas: primer ticket con stock > 0 o ilimitado
  for (const t of event.tickets) {
    if (t.stock === null) return t;
    if (t.stock > 0) return t;
  }

  return null;
}

function getTicketStock(t) {
  if (!t) return 0;
  if (t.stock === null) return 9999;
  return t.stock || 0;
}

/**
 * ✅ calcula el máximo que se puede comprar AHORA
 * - máximo 3 por persona
 * - máximo stock del ticket que se va a vender
 */
function getMaxQtyForCurrentSale(event) {
  const ticket = getAvailableTicket(event);
  if (!ticket) return 0;

  const stock = getTicketStock(ticket);
  return Math.min(3, stock);
}

/**
 * ==========================
 * HOME
 * ==========================
 */
function Home() {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
      <div
        style={{
          width: "100%",
         
        }}
      >
        <h1 style={{ fontSize: 42, textAlign: "center" }}>
          Viento Ritual
        </h1>

        {loadEvents().map((event) => {
          const st = getEventStatus(event);

          return (
            <div
              key={event.id}
              onClick={() => navigate(`/evento/${event.id}`)}
              style={styles.card}
            >
              <img
                src={event.image}
                alt={event.title}
                style={styles.cardImg}
              />

              <div style={{ padding: 16 }}>
                <h2 style={{ margin: 0 }}>{event.title}</h2>
                <p style={{ margin: "8px 0", opacity: 0.8 }}>
                  {event.date} · {event.location}
                </p>

                <span
                  style={{ ...styles.badge, background: st.color }}
                >
                  {st.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


/**
 * ==========================
 * EVENT DETAIL + COMPRA
 * ==========================
 */
function EventDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [events, setEvents] = React.useState(loadEvents());
  const event = events.find((e) => e.id === id);

  const [step, setStep] = React.useState(0);
  const [quantity, setQuantity] = React.useState(1);
  const [buyer, setBuyer] = React.useState({
    name: "",
    lastName: "",
    email: "",
  });

  const [generatedQrs, setGeneratedQrs] = React.useState([]);

 React.useEffect(() => {
  const interval = setInterval(() => {
    setEvents(loadEvents());
  }, 500);

  return () => clearInterval(interval);
}, []);


  if (!event) {
    return (
      <div style={{ ...styles.page, paddingTop: 10 }}>
        <h2>Evento no encontrado</h2>
<button
  onClick={() => navigate("/")}
  style={{
    position: "absolute",
    top: 20,
    left: 20,
    zIndex: 2,
    ...styles.grayBtn,
    width: "auto",
    padding: "8px 16px",
  }}
>
  ⬅ Volver
</button>


      </div>
    );
  }

  const status = getEventStatus(event);

  // ✅ dejamos terminar el checkout aunque justo se agote después
  const canBuy = status.label === "ACTIVO" || step > 0;

  // ✅ ticket que se vendería ahora (tanda actual o general)
  const ticket = getAvailableTicket(event);

  const unitPrice = ticket?.price ?? 0;
  const total = unitPrice * quantity;

  // ✅ max real: 3 o stock del ticket actual
  const maxQty = getMaxQtyForCurrentSale(event);

  // ✅ ajusta quantity si quedó fuera del rango
  React.useEffect(() => {
    setQuantity((q) => {
      if (maxQty === 0) return 1;
      return Math.min(q, maxQty);
    });
  }, [maxQty]);

  const canContinueBuyer =
    buyer.name.trim() &&
    buyer.lastName.trim() &&
    buyer.email.trim().includes("@");

  /**
   * ✅ CONFIRMAR COMPRA DEMO
   * - valida stock en el momento de pagar
   * - descuenta stock real
   * - genera 1 QR por cada entrada
   */
  function confirmPurchaseDemo() {
    const freshEvents = loadEvents();
    const freshEvent = freshEvents.find((e) => e.id === event.id);

    if (!freshEvent) {
      alert("Evento no encontrado");
      return;
    }

    const freshTicket = getAvailableTicket(freshEvent);
    if (!freshTicket) {
      alert("⚠️ Entradas agotadas.");
      return;
    }

    const freshMax = getMaxQtyForCurrentSale(freshEvent);

    if (quantity > freshMax) {
      alert("⚠️ No hay stock suficiente para esa cantidad.");
      setQuantity(freshMax);
      setStep(1);
      return;
    }

    // ✅ descontar stock SOLO del ticket que se vendió
    const updatedEvents = freshEvents.map((ev) => {
      if (ev.id !== freshEvent.id) return ev;

      const updatedTickets = ev.tickets.map((t) => {
        if (t.id !== freshTicket.id) return t;

        // ilimitado
        if (t.stock === null) return t;

        return { ...t, stock: Math.max(0, (t.stock || 0) - quantity) };
      });

      return { ...ev, tickets: updatedTickets };
    });

    saveEvents(updatedEvents);
    setEvents(updatedEvents);

    // ✅ generar 1 QR por entrada
    const newTickets = [];
    for (let i = 0; i < quantity; i++) {
      newTickets.push({
        qr: generateQR(freshEvent.id),
        eventId: freshEvent.id,
        eventTitle: freshEvent.title,
        buyerName: `${buyer.name} ${buyer.lastName}`.trim(),
        buyerEmail: buyer.email,
        used: false,
        createdAt: new Date().toISOString(),
      });
    }

    const stored = loadTickets();
    saveTickets([...newTickets, ...stored]);

    setGeneratedQrs(newTickets.map((t) => t.qr));
    setStep(4);
  }

return (
  <div style={styles.page}>

<button
  onClick={() => navigate("/")}
  style={{ ...styles.grayBtn, marginTop: 0, marginBottom: 50 }}
>
  ⬅ Volver
</button>


      <img src={event.image} alt={event.title} style={styles.detailImg} />

      <h2 style={{ fontSize: 28, margin: "10px 0" }}>{event.title}</h2>
      <p style={{ opacity: 0.8 }}>
        {event.date} · {event.location}
      </p>
      <p style={{ lineHeight: 1.4 }}>{event.description}</p>

      <span style={{ ...styles.badge, background: status.color }}>
        {status.label}
      </span>

      {status.label === "ENTRADAS AGOTADAS" && step === 0 && (
        <p style={{ marginTop: 14, color: "#f59e0b", fontWeight: "bold" }}>
          Entradas agotadas
        </p>
      )}

      {status.label === "FINALIZADO" && step === 0 && (
        <p style={{ marginTop: 14, color: "#dc2626", fontWeight: "bold" }}>
          Este evento ya finalizó
        </p>
      )}

      {/* ✅ Botón comprar */}
      {status.label === "ACTIVO" && step === 0 && (
        <button onClick={() => setStep(1)} style={styles.purpleBtn}>
          COMPRAR ENTRADA
        </button>
      )}

      {/* ✅ Paso 1 */}
      {canBuy && step >= 1 && (
        <div style={styles.section}>
          <h3>🎟️ Seleccionar entradas</h3>

          {!ticket ? (
            <p style={{ color: "#f59e0b" }}>Entradas agotadas</p>
          ) : (
            <>
              <div style={styles.box}>
                <p style={{ margin: 0, fontWeight: "bold" }}>
                  Tipo: {ticket.name}
                </p>
                <p style={{ margin: "6px 0", opacity: 0.8 }}>
                  Precio: ${unitPrice}
                </p>

                <div style={styles.qtyRow}>
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    style={styles.qtyBtn}
                  >
                    -
                  </button>

                  <div
                    style={{
                      fontSize: 18,
                      minWidth: 40,
                      textAlign: "center",
                    }}
                  >
                    {quantity}
                  </div>

                  <button
                    onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                    disabled={quantity >= maxQty}
                    style={{
                      ...styles.qtyBtn,
                      opacity: quantity >= maxQty ? 0.4 : 1,
                      cursor: quantity >= maxQty ? "not-allowed" : "pointer",
                    }}
                  >
                    +
                  </button>
                </div>

                <p style={{ marginTop: 12, fontWeight: "bold" }}>
                  Total: ${total}
                </p>

                <p style={{ fontSize: 12, opacity: 0.6 }}>
                  Máximo 3 entradas por compra
                </p>
              </div>

              {step === 1 && (
                <button onClick={() => setStep(2)} style={styles.purpleBtn}>
                  Continuar
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ✅ Paso 2 */}
      {canBuy && step >= 2 && (
        <div style={styles.section}>
          <h3>👤 Datos del comprador</h3>

          <input
            placeholder="Nombre"
            value={buyer.name}
            onChange={(e) => setBuyer({ ...buyer, name: e.target.value })}
            style={styles.input}
          />

          <input
            placeholder="Apellido"
            value={buyer.lastName}
            onChange={(e) => setBuyer({ ...buyer, lastName: e.target.value })}
            style={styles.input}
          />

          <input
            placeholder="Email"
            type="email"
            value={buyer.email}
            onChange={(e) => setBuyer({ ...buyer, email: e.target.value })}
            style={styles.input}
          />

          {step === 2 && (
            <button
              onClick={() => setStep(3)}
              disabled={!canContinueBuyer}
              style={{
                ...styles.purpleBtn,
                background: canContinueBuyer ? "#7c3aed" : "#333",
                cursor: canContinueBuyer ? "pointer" : "not-allowed",
              }}
            >
              Continuar
            </button>
          )}
        </div>
      )}

      {/* ✅ Paso 3 */}
      {canBuy && step >= 3 && (
        <div style={styles.section}>
          <h3>💳 Método de pago</h3>

          {step === 3 && (
            <>
              <button onClick={confirmPurchaseDemo} style={styles.purpleBtn}>
                Confirmar compra (demo)
              </button>

              <p style={{ marginTop: 10, opacity: 0.7, textAlign: "center" }}>
                Mercado Pago se integra más adelante ✅
              </p>
            </>
          )}
        </div>
      )}

      {/* ✅ Confirmación */}
      {canBuy && step === 4 && (
        <div style={{ ...styles.section, textAlign: "center" }}>
          <h3 style={{ color: "#22c55e" }}>✅ ¡Compra confirmada!</h3>

          <p style={{ opacity: 0.9 }}>
            Gracias <b>{buyer.name}</b> por tu compra.
          </p>

          <p style={{ opacity: 0.8 }}>
            Se generaron <b>{generatedQrs.length}</b> entradas (QR únicos)
          </p>

          <div style={{ marginTop: 14 }}>
            {generatedQrs.map((qr) => (
              <div
                key={qr}
                style={{
                  ...styles.qrRow,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontWeight: "bold" }}>QR</div>
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                    {qr}
                  </div>
                </div>

                <div
                  style={{
                    background: "white",
                    padding: 8,
                    borderRadius: 12,
                    width: 120,
                    height: 120,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <QRCodeCanvas value={qr} size={100} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ==========================
 * SCANNER (validar QR) - manual
 * ==========================
 */
function Scanner() {
  const navigate = useNavigate();
  const [value, setValue] = React.useState("");
  const [result, setResult] = React.useState(null);

  function validateQr() {
    const tickets = loadTickets();
    const t = tickets.find((x) => x.qr === value.trim());

    if (!t) {
      setResult({ ok: false, msg: "❌ QR inválido" });
      return;
    }

    if (t.used) {
      setResult({ ok: false, msg: "⚠️ QR ya usado" });
      return;
    }

    const updated = tickets.map((x) =>
      x.qr === t.qr ? { ...x, used: true, usedAt: new Date().toISOString() } : x
    );
    saveTickets(updated);

    setResult({
      ok: true,
      msg: "✅ Entrada válida (marcada como usada)",
      info: t,
    });
  }

  return (
    <div style={styles.page}>
      <button onClick={() => navigate("/")} style={styles.grayBtn}>
        ⬅ Volver
      </button>

      <h1 style={{ fontSize: 30 }}>📷 Scanner QR</h1>
      <p style={{ opacity: 0.8 }}>
        Pegá un QR generado por una compra demo para validarlo.
      </p>

      <input
        placeholder="Pegar QR acá..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={styles.input}
      />

      <button onClick={validateQr} style={styles.purpleBtn}>
        Validar QR
      </button>

      {result && (
        <div style={{ ...styles.box, marginTop: 16 }}>
          <p style={{ fontWeight: "bold", marginTop: 0 }}>{result.msg}</p>

          {result.ok && result.info && (
            <div style={{ fontSize: 13, opacity: 0.85 }}>
              <p style={{ margin: "6px 0" }}>
                Evento: <b>{result.info.eventTitle}</b>
              </p>
              <p style={{ margin: "6px 0" }}>
                Comprador: <b>{result.info.buyerName}</b>
              </p>
              <p style={{ margin: "6px 0" }}>
                Email: <b>{result.info.buyerEmail}</b>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * ==========================
 * ✅ ADMIN SCANNER (CAMARA REAL)
 * ==========================
 */
function AdminScanner() {
  const navigate = useNavigate();

  const [lastText, setLastText] = React.useState("");
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: 250 },
      false
    );

    scanner.render(
      (decodedText) => {
        setLastText(decodedText);

        const tickets = loadTickets();
        const found = tickets.find((t) => t.qr === decodedText);

        if (!found) {
          setMessage("❌ QR inválido");
          return;
        }

        if (found.used) {
          setMessage("⚠️ QR ya usado");
          return;
        }

        const updated = tickets.map((t) =>
          t.qr === decodedText
            ? { ...t, used: true, usedAt: new Date().toISOString() }
            : t
        );

        saveTickets(updated);
        setMessage("✅ Entrada válida (marcada como USADA)");
      },
      () => {}
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, []);

  return (
    <div style={styles.page}>
      <button onClick={() => navigate("/admin")} style={styles.grayBtn}>
        ⬅ Volver al Admin
      </button>

      <h1 style={{ fontSize: 30 }}>📷 Escanear QR (Cámara)</h1>

      <div
        id="qr-reader"
        style={{
          width: "100%",
          borderRadius: 14,
          overflow: "hidden",
          background: "white",
          marginTop: 10,
        }}
      />

      {lastText && (
        <div style={{ ...styles.box, marginTop: 16 }}>
          <p style={{ margin: 0, fontWeight: "bold" }}>Último QR:</p>
          <p style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
            {lastText}
          </p>
        </div>
      )}

      {message && (
        <div style={{ ...styles.box, marginTop: 16 }}>
          <p style={{ margin: 0, fontWeight: "bold" }}>{message}</p>
        </div>
      )}
    </div>
  );
}

/**
 * ==========================
 * ADMIN
 * ==========================
 */
function AdminPanel() {
  const navigate = useNavigate();

  const [logged, setLogged] = React.useState(
    localStorage.getItem(STORAGE_ADMIN) === "true"
  );
  const [password, setPassword] = React.useState("");

  const [events, setEvents] = React.useState(loadEvents());

  const [newEvent, setNewEvent] = React.useState({
    title: "",
    date: "",
    dateISO: "",
    location: "",
    description: "",
    image: "",
    saleType: "general",
  });
  async function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "viento_unsigned");

  try {
    const res = await fetch(
      "https://api.cloudinary.com/v1_1/dxjarxcle/image/upload",
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await res.json();

    setNewEvent((prev) => ({
      ...prev,
      image: data.secure_url,
    }));

    alert("✅ Imagen subida correctamente");
  } catch (err) {
    console.error(err);
    alert("Error subiendo imagen");
  }
}



  const [tickets, setTickets] = React.useState([
    { name: "General", price: 0, stock: 100 },
  ]);

  // ✅ tickets vendidos + buscador
  const [soldTickets, setSoldTickets] = React.useState([]);
  const [searchTicket, setSearchTicket] = React.useState("");

  React.useEffect(() => {
    setSoldTickets(loadTickets());
  }, []);

  const filteredTickets = soldTickets.filter((t) => {
    const text = searchTicket.toLowerCase();
    return (
      (t.qr || "").toLowerCase().includes(text) ||
      (t.buyerEmail || "").toLowerCase().includes(text) ||
      (t.buyerName || "").toLowerCase().includes(text) ||
      (t.eventTitle || "").toLowerCase().includes(text)
    );
  });

  // ✅ PASO B: resumen por evento
  const statsByEvent = React.useMemo(() => {
    const map = {};

    for (const t of soldTickets) {
      const eventId = t.eventId || "unknown";

      if (!map[eventId]) {
        map[eventId] = {
          eventId,
          eventTitle: t.eventTitle || "Evento sin título",
          total: 0,
          used: 0,
          available: 0,
        };
      }

      map[eventId].total += 1;
      if (t.used) map[eventId].used += 1;
      else map[eventId].available += 1;
    }

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [soldTickets]);

  function login() {
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem(STORAGE_ADMIN, "true");
      setLogged(true);
    } else {
      alert("Contraseña incorrecta");
    }
  }

  function logout() {
    localStorage.removeItem(STORAGE_ADMIN);
    setLogged(false);
    setPassword("");
  }

  function addTicketRow() {
    setTickets([...tickets, { name: "", price: 0, stock: 0 }]);
  }

  function createEvent() {
    if (!newEvent.title.trim()) return alert("Falta nombre");
    if (!newEvent.date.trim()) return alert("Falta fecha texto");
    if (!newEvent.dateISO.trim()) return alert("Falta dateISO (YYYY-MM-DD)");
    if (!newEvent.location.trim()) return alert("Falta ubicación");

    const eventId = Date.now().toString();

    const finalEvent = {
      id: eventId,
      title: newEvent.title,
      date: newEvent.date,
      dateISO: newEvent.dateISO,
      location: newEvent.location,
      description: newEvent.description || "",
      saleType: newEvent.saleType,
      image:
        newEvent.image?.trim() ||
        "https://images.unsplash.com/photo-1507874457470-272b3c8d8ee2?auto=format&fit=crop&w=1200&q=60",
      tickets: tickets.map((t, idx) => ({
        id: `${eventId}_t${idx}`,
        name: t.name || `Entrada ${idx + 1}`,
        price: Number(t.price) || 0,
        stock: t.stock === "" ? null : Number(t.stock),
      })),
    };

    const updated = [finalEvent, ...events];
    setEvents(updated);
    saveEvents(updated);

    alert("✅ Evento creado");

    setNewEvent({
      title: "",
      date: "",
      dateISO: "",
      location: "",
      description: "",
      image: "",
      saleType: "general",
    });

    setTickets([{ name: "General", price: 0, stock: 100 }]);
  }

  function deleteEvent(eventId) {
    const confirmDelete = window.confirm(
      "¿Seguro que querés borrar este evento?"
    );
    if (!confirmDelete) return;

    const updated = events.filter((e) => e.id !== eventId);

    setEvents(updated);
    saveEvents(updated);

    alert("✅ Evento eliminado");
  }

  // ✅ PASO C: EXPORTAR CSV (Excel)
  function exportTicketsCSV() {
    const tickets = loadTickets();

    if (!tickets.length) {
      alert("⚠️ No hay entradas vendidas para exportar.");
      return;
    }

    const rows = [];

    // encabezados
    rows.push([
      "Evento",
      "EventId",
      "QR",
      "Comprador",
      "Email",
      "Estado",
      "FechaCompra",
      "FechaUso",
    ]);

    for (const t of tickets) {
      rows.push([
        escapeCSV(t.eventTitle),
        escapeCSV(t.eventId),
        escapeCSV(t.qr),
        escapeCSV(t.buyerName),
        escapeCSV(t.buyerEmail),
        escapeCSV(t.used ? "USADO" : "DISPONIBLE"),
        escapeCSV(t.createdAt || ""),
        escapeCSV(t.usedAt || ""),
      ]);
    }

    const fileName = `viento_ritual_tickets_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    downloadCSV(fileName, rows);
  }

  if (!logged) {
    return (
      <div style={styles.page}>
        <button onClick={() => navigate("/")} style={styles.grayBtn}>
          ⬅ Volver
        </button>

        <h1 style={{ fontSize: 30 }}>🔐 Admin</h1>

        <input
          placeholder="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />

        <button onClick={login} style={styles.purpleBtn}>
          Entrar
        </button>

        <p style={{ fontSize: 12, opacity: 0.5, marginTop: 12 }}>
          <b></b>
        </p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <button onClick={() => navigate("/")} style={styles.grayBtn}>
          ⬅ Volver
        </button>

        <button onClick={logout} style={styles.redBtn}>
          Salir
        </button>
      </div>

      <h1 style={{ fontSize: 30 }}>⚙️ Panel Admin</h1>

      {/* ✅ BOTÓN: ESCANEAR QR CON CAMARA */}
      

      {/* ✅ PASO B: RESUMEN POR EVENTO */}
      <div style={{ marginTop: 25 }}>
        <h3>📊 Resumen por evento</h3>

        {statsByEvent.length === 0 ? (
          <div style={styles.box}>
            <p style={{ margin: 0, opacity: 0.8 }}>
              Todavía no hay entradas vendidas.
            </p>
          </div>
        ) : (
          statsByEvent.map((s) => (
            <div key={s.eventId} style={{ ...styles.box, marginTop: 10 }}>
              <p style={{ margin: 0, fontWeight: "bold" }}>{s.eventTitle}</p>

              <p style={{ margin: "8px 0", opacity: 0.85 }}>
                Total vendidas: <b>{s.total}</b>
              </p>

              <p style={{ margin: "6px 0", opacity: 0.85 }}>
                ✅ Disponibles: <b>{s.available}</b>
              </p>

              <p style={{ margin: "6px 0", opacity: 0.85 }}>
                ⚠️ Usadas: <b>{s.used}</b>
              </p>
            </div>
          ))
        )}
      </div>

      {/* ✅ ENTRADAS VENDIDAS */}
      <div style={{ marginTop: 25 }}>
        <h3>🎟️ Entradas vendidas</h3>

        <input
          placeholder="Buscar por email / nombre / QR / evento..."
          value={searchTicket}
          onChange={(e) => setSearchTicket(e.target.value)}
          style={styles.input}
        />

        <p style={{ opacity: 0.75, marginTop: 0 }}>
          Total tickets: <b>{soldTickets.length}</b> — Mostrando:{" "}
          <b>{filteredTickets.length}</b>
        </p>

        {filteredTickets.length === 0 ? (
          <div style={styles.box}>
            <p style={{ margin: 0, opacity: 0.8 }}>
              No hay entradas para mostrar.
            </p>
          </div>
        ) : (
          filteredTickets.map((t) => (
            <div key={t.qr} style={{ ...styles.box, marginTop: 10 }}>
              <p style={{ margin: 0, fontWeight: "bold" }}>{t.eventTitle}</p>

              <p style={{ margin: "6px 0", opacity: 0.8 }}>
                {t.buyerName} — {t.buyerEmail}
              </p>

              <p style={{ margin: "6px 0", fontSize: 12, opacity: 0.8 }}>
                QR: <b>{t.qr}</b>
              </p>

              <span
                style={{
                  ...styles.badge,
                  background: t.used ? "#f59e0b" : "#16a34a",
                }}
              >
                {t.used ? "USADO" : "DISPONIBLE"}
              </span>
            </div>
          ))
        )}
      </div>

      <div style={styles.box}>
        <h3 style={{ marginTop: 0 }}>➕ Crear evento</h3>

        <input
          placeholder="Nombre"
          value={newEvent.title}
          onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
          style={styles.input}
        />

        <input
          placeholder="Fecha texto (ej: 12 Abril 2026)"
          value={newEvent.date}
          onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
          style={styles.input}
        />

        <input
          placeholder="dateISO (YYYY-MM-DD)"
          value={newEvent.dateISO}
          onChange={(e) =>
            setNewEvent({ ...newEvent, dateISO: e.target.value })
          }
          style={styles.input}
        />

        <input
          placeholder="Ubicación"
          value={newEvent.location}
          onChange={(e) =>
            setNewEvent({ ...newEvent, location: e.target.value })
          }
          style={styles.input}
        />

        <input
          placeholder="Descripción"
          value={newEvent.description}
          onChange={(e) =>
            setNewEvent({ ...newEvent, description: e.target.value })
          }
          style={styles.input}
        />

        <input
  type="file"
  accept="image/*"
  onChange={handleImageUpload}
  style={styles.input}
/>


        <select
          value={newEvent.saleType}
          onChange={(e) =>
            setNewEvent({ ...newEvent, saleType: e.target.value })
          }
          style={styles.input}
        >
          <option value="general">General</option>
          <option value="tandas">Tandas</option>
        </select>

        <h4>🎟️ Entradas</h4>

        {tickets.map((t, idx) => (
          <div
            key={idx}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <input
              placeholder="Nombre"
              value={t.name}
              onChange={(e) => {
                const copy = [...tickets];
                copy[idx].name = e.target.value;
                setTickets(copy);
              }}
              style={styles.input}
            />

            <input
              placeholder="Precio"
              type="number"
              value={t.price}
              onChange={(e) => {
                const copy = [...tickets];
                copy[idx].price = e.target.value;
                setTickets(copy);
              }}
              style={styles.input}
            />

            <input
              placeholder="Stock (vacío=ilimitado)"
              value={t.stock ?? ""}
              onChange={(e) => {
                const copy = [...tickets];
                copy[idx].stock = e.target.value;
                setTickets(copy);
              }}
              style={styles.input}
            />
          </div>
        ))}

        <button onClick={addTicketRow} style={styles.grayBtn}>
          + Agregar otra entrada
        </button>

        <button onClick={createEvent} style={styles.greenBtn}>
          ✅ Crear evento
        </button>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>📌 Eventos guardados</h3>

        {events.map((e) => {
          const st = getEventStatus(e);
          return (
            <div key={e.id} style={{ ...styles.box, marginTop: 10 }}>
              <b>{e.title}</b>
              <p style={{ opacity: 0.8 }}>
                {e.date} · {e.location}
              </p>
              <span style={{ ...styles.badge, background: st.color }}>
                {st.label}
              </span>

              <button
                onClick={() => deleteEvent(e.id)}
                style={{ ...styles.redBtn, width: "100%", marginTop: 10 }}
              >
                🗑️ Borrar evento
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * ==========================
 * STYLES
 * ==========================
 */
const styles = {
page: {
  background: "transparent",
  color: "white",
  minHeight: "100vh",
  padding: "80px 20px 60px 20px",
  fontFamily: "Arial, sans-serif",

  display: "flex",
  flexDirection: "column",
  alignItems: "center",

  width: "100%",
  maxWidth: 420,       // 👈 ESTE es el secreto
  margin: "0 auto",    // 👈 centra horizontalmente
  textAlign: "center",
},




card: {
  marginTop: 30,
  borderRadius: 24,
  overflow: "hidden",
  cursor: "pointer",
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(255,255,255,0.1)",
  transition: "all 0.3s ease",
  position: "relative",
},
cardImg: {
  width: "100%",
  aspectRatio: "4 / 5",     // 👈 mejor para flyers
  objectFit: "cover",
},



 detailImg: {
  width: "100%",
  maxHeight: 500,
  objectFit: "contain",   // 👈 clave
  borderRadius: 18,
  marginBottom: 18,
},

  badge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 10,
  },
  section: {
    marginTop: 25,
    paddingTop: 20,
    borderTop: "1px solid rgba(255,255,255,0.1)",
  },
  box: {
background: "rgba(255,255,255,0.05)",
backdropFilter: "blur(10px)",
border: "1px solid rgba(255,255,255,0.1)",

  },
  input: {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    background: "#0b0b0b",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "white",
    marginBottom: 10,
  },
purpleBtn: {
  marginTop: 14,
  width: "100%",
  padding: 14,
  borderRadius: 999,
  background:
    "linear-gradient(135deg, #f59e0b, #ec4899, #7c3aed)",
  border: "none",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
  letterSpacing: 1,
  boxShadow: "0 10px 25px rgba(236,72,153,0.4)",
},

  grayBtn: {
    marginTop: 10,
    width: "100%",
    padding: 12,
    borderRadius: 14,
    background: "#222",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
  },
  greenBtn: {
    marginTop: 10,
    width: "100%",
    padding: 12,
    borderRadius: 14,
    background: "#16a34a",
    border: "none",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
  },
  redBtn: {
    padding: 10,
    borderRadius: 10,
    background: "#dc2626",
    color: "white",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
  },
  qtyRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  qtyBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    background: "#222",
    color: "white",
    border: "1px solid rgba(255,255,255,0.15)",
    cursor: "pointer",
    fontSize: 18,
  },
    qrRow: {
    background: "#111",
    border: "1px solid rgba(255,255,255,0.1)",
    padding: 10,
    borderRadius: 14,
    textAlign: "left",
    marginBottom: 10,
  },

merchCard: {
  borderRadius: 28,
  overflow: "hidden",
  width: "100%",
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(255,255,255,0.1)",
},

merchImg: {
  width: "100%",
  height: 380,
  objectFit: "cover",
},

merchBottom: {
  padding: "40px 20px",
  textAlign: "center",
  background: "linear-gradient(to top, #0f0f0f, #1a1a1a)",
},

merchBtn: {
  padding: "16px 40px",
  borderRadius: 999,
  background:
    "linear-gradient(135deg, #f59e0b, #ec4899, #7c3aed)",
  border: "none",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
  letterSpacing: 1,
  boxShadow: "0 15px 35px rgba(236,72,153,0.45)",
},
};

/**
 * ==========================
 * ROUTES
 * ==========================
 */
function Playlist() {
  return (
    <div style={styles.page}>
      <h1 style={{ fontSize: 36, marginBottom: 30 }}>
         Playlist Oficial
      </h1>

      <div
        style={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 24,
          overflow: "hidden",
        
          width: "100%",
        }}
      >
        <img
  src="https://res.cloudinary.com/dxjarxcle/image/upload/v1771544162/fpwlyhyyqdp6jdg9seze.png"
  alt="Playlist Progressive House"
  style={{
    width: "100%",
    height: 320,
    objectFit: "cover",
    objectPosition: "center",
  }}
/>


        <div style={{ padding: 20 }}>
          <h3 style={{ marginTop: 0 }}>
            Progressive House ~ Playlist
          </h3>

          <p style={{ opacity: 0.8 }}>
          
          </p>

<a
  href="https://open.spotify.com/playlist/3UZaXtyp8CyjtwDBstqHmu?si=8256267e1ad7456a"
  target="_blank"
  rel="noopener noreferrer"
  style={{
    display: "inline-block",
    marginTop: 16,
    padding: "14px 28px",
    borderRadius: 999,
    background:
      "linear-gradient(135deg, #f59e0b, #ec4899, #7c3aed)",
    color: "white",
    fontWeight: "bold",
    textDecoration: "none",
    boxShadow: "0 10px 30px rgba(236,72,153,0.5)",
    transition: "0.3s ease",
  }}
>
  🎧 Escuchar en Spotify
</a>

        </div>
      </div>
    </div>
  );
}


function Merch() {
  return (
    <div style={styles.page}>
      <h1 style={{ fontSize: 36, marginBottom: 30 }}>
           Venta de Merch
      </h1>

      {/* ABANICO */}
      <div style={styles.merchCard}>
        <img
          src="https://res.cloudinary.com/dxjarxcle/image/upload/v1771548966/rzkfididfwjbaalppizf.png"
          alt="Abanico Viento Ritual"
          style={styles.merchImg}
        />

          <div style={styles.merchBottom}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
  <h3 style={{ marginBottom: 8 }}>
    Abanico Viento Ritual
  </h3>

  <div style={{ fontSize: 22, fontWeight: "bold" }}>
    $ 8.000
  </div>
</div>

<a
  href="https://www.instagram.com/viento.ritual/"
  target="_blank"
  rel="noopener noreferrer"
  style={{ textDecoration: "none" }}
>
  <button style={styles.merchBtn}>
    🛒 Comprar
  </button>
</a>

        </div>
      </div>

      {/* REMERA */}
      <div style={{ ...styles.merchCard, marginTop: 40 }}>
        <img
          src="https://res.cloudinary.com/dxjarxcle/image/upload/v1771549055/dtet3kuwevwbyp4nso1f.png"
          alt="Remera Oficial viento ritual"
          style={styles.merchImg}
        />

        <div style={{ textAlign: "center", marginBottom: 20 }}>
  <h3 style={{ marginBottom: 8 }}>
    Remera Viento Ritual
  </h3>

  <div style={{ fontSize: 22, fontWeight: "bold" }}>
    $ 18.000
  </div>

<a
  href="https://www.instagram.com/viento.ritual/"
  target="_blank"
  rel="noopener noreferrer"
  style={{ textDecoration: "none" }}
>
  <button style={styles.merchBtn}>
    🛒 Comprar
  </button>
</a>
        </div>
      </div>
    </div>
  );
}

function Inicio() {
  const user = getSession();
  const navigate = useNavigate();
  const [clicks, setClicks] = React.useState(0);

  function handleSecret() {
    setClicks((c) => {
      const next = c + 1;

      if (next === 5) {
        navigate("/admin");
        return 0; // reset
      }
{!user && (
  <>
    <button onClick={() => navigate("/login")} style={styles.grayBtn}>
      Iniciar sesión
    </button>

    <button onClick={() => navigate("/register")} style={styles.purpleBtn}>
      Crear cuenta
    </button>

    <button
      onClick={() => {
        enterAsGuest();
        navigate("/");
      }}
      style={styles.grayBtn}
    >
      Entrar como invitado
    </button>
  </>
)}
{user && (
  <button
    onClick={() => {
      clearSession();
      navigate("/inicio");
    }}
  >
    Cerrar sesión
  </button>
)}

      return next;
    });
  }
function Register() {
  const navigate = useNavigate();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  function handleRegister() {
    if (!name || !email || !password) {
      alert("Completá todos los campos");
      return;
    }

    const users = loadUsers();
    if (users.find((u) => u.email === email)) {
      alert("Ese email ya existe");
      return;
    }

    const newUser = {
      id: Date.now(),
      name,
      email,
      password,
    };

    saveUsers([...users, newUser]);
    setSession(newUser);
    navigate("/inicio");
  }
  function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  function handleLogin() {
    const users = loadUsers();
    const user = users.find(
      (u) => u.email === email && u.password === password
    );

    if (!user) {
      alert("Email o contraseña incorrectos");
      return;
    }

    setSession(user);
    navigate("/inicio");
  }

  return (
    <div style={styles.page}>
      <div
  style={{
    position: "absolute",
    top: -200,
    right: -200,
    width: 500,
    height: 500,
    borderRadius: "50%",
    background:
      "linear-gradient(135deg, #f59e0b, #ec4899, #7c3aed)",
    filter: "blur(120px)",
    opacity: 0.6,
    zIndex: 0,
  }}
/>

      <h1>Iniciar sesión</h1>
      {/* inputs */}
    </div>
  );
}


  return (
    <div style={styles.page}>
      <h1>Crear cuenta</h1>
      {/* inputs */}
    </div>
  );
}

return (
  <div style={styles.page}>

      <img
  src="/logo.png"
  alt="Viento Ritual Logo"
  style={{
    width: 120,
    marginBottom: 20,
    filter: "drop-shadow(0 0 20px rgba(236,72,153,0.6))",
  }}
/>

      <h1
        onClick={handleSecret}
        style={{
          fontSize: 40,
          marginBottom: 16,
          cursor: "pointer",
          userSelect: "none",
        }}
        title="Viento Ritual"
      >
         Viento Ritual
      </h1>

      <p
        style={{
          fontSize: 16,
          opacity: 0.85,
          lineHeight: 1.6,
          maxWidth: 500,
        }}
        
      >
       
        <br />
        Viento Ritual es una empresa de carácter socio-cultural, basada en la difusión artística, principalmente, de djs/productores y vjs locales de la Provincia de Neuquén.
Asi mismo, la producción de eventos musicales en la localidad de Plaza Huincul o Cutral Có donde forjaremos nuestras raíces.
      </p>

      <div
     style={{
      marginTop: 30,
      display: "flex",
      flexDirection: "column",   // 👈 vertical
      gap: 16,
     width: "100%",             // 👈 ocupa todo el ancho del page
                 // 👈 mismo ancho visual que Eventos
    }}
>

<button onClick={() => navigate("/")} style={styles.purpleBtn}>
   Ver Eventos
</button>

<button onClick={() => navigate("/playlist")} style={styles.purpleBtn}>
   Playlist
</button>

<button onClick={() => navigate("/merch")} style={styles.purpleBtn}>
   Merch
</button>

        {/* 🔗 Redes sociales */}
<a
  href="https://www.instagram.com/viento.ritual/"
  target="_blank"
  rel="noopener noreferrer"
  style={{
    position: "fixed",
    bottom: 16,
    left: 16,
    background: "#111",
    color: "white",
    padding: "10px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.15)",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: "bold",
    opacity: 0.85,
  }}
>
   Instagram
</a>

<a
  href="https://www.youtube.com/@vientoritual5364"
  target="_blank"
  rel="noopener noreferrer"
  style={{
    position: "fixed",
    bottom: 16,
    right: 16,
    background: "#111",
    color: "white",
    padding: "10px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.15)",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: "bold",
    opacity: 0.85,
  }}
>
   YouTube
</a>

      </div>
    </div>
  );
}
function Register() {
  const navigate = useNavigate();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  function handleRegister() {
    if (!name || !email || !password) {
      alert("Completá todos los campos");
      return;
    }

    const users = loadUsers();
    if (users.find((u) => u.email === email)) {
      alert("Ese email ya existe");
      return;
    }

    const newUser = {
      id: Date.now(),
      name,
      email,
      password,
    };

    saveUsers([...users, newUser]);
    setSession(newUser);
    navigate("/inicio");
  }

  return (
    <div style={styles.page}>
      <h1>Crear cuenta</h1>

      <input
        placeholder="Nombre"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={styles.input}
      />

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={styles.input}
      />

      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={styles.input}
      />

      <button onClick={handleRegister} style={styles.purpleBtn}>
        Crear cuenta
      </button>
    </div>
  );
}
function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  function handleLogin() {
    const users = loadUsers();
    const user = users.find(
      (u) => u.email === email && u.password === password
    );

    if (!user) {
      alert("Email o contraseña incorrectos");
      return;
    }

    setSession(user);
    navigate("/inicio");
  }

  return (
    <div style={styles.page}>
      <h1>Iniciar sesión</h1>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={styles.input}
      />

      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={styles.input}
      />

      <button onClick={handleLogin} style={styles.purpleBtn}>
        Entrar
      </button>
    </div>
  );
}

function SobreNosotros() {
  return (
    <div style={styles.page}>
      <h1 style={{ fontSize: 36, marginBottom: 20 }}>
        Sobre Nosotros
      </h1>

      <div style={styles.box}>
        <p style={{ lineHeight: 1.6, opacity: 0.85 }}>
          Viento Ritual es una empresa de carácter socio-cultural, basada en la difusión artística, principalmente, de djs/productores y vjs locales de la Provincia de Neuquén.
Asi mismo, la producción de eventos musicales en la localidad de Plaza Huincul o Cutral Có donde forjaremos nuestras raíces.
        </p>

        <p style={{ lineHeight: 1.6, opacity: 0.85, marginTop: 10 }}>
          Creamos eventos, conectamos personas y construimos cultura.
        </p>
      </div>
    </div>
  );
}


export default function App() {
  
  
  
  return (
    
    <>
      {/* FONDO GLOBAL */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundImage: "url('/fondo.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          zIndex: -1,
        }}
      />

      <BrowserRouter>
        <TabsNav />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/inicio" element={<Inicio />} />
          <Route path="/sobre" element={<SobreNosotros />} />
          <Route path="/" element={<Home />} />
          <Route path="/evento/:id" element={<EventDetail />} />
          <Route path="/scanner" element={<Scanner />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/admin/scanner" element={<AdminScanner />} />
          <Route path="/playlist" element={<Playlist />} />
<Route path="/merch" element={<Merch />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}
