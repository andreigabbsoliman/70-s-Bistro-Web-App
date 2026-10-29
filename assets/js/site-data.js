(() => {
    const STORE_KEY = "bistro70s.tickets";
    const ASSETS = location.pathname.includes("/pages/") ? "../assets/" : "assets/";

    class SiteError extends Error { }

    // Demo storage: tickets reserved from this browser are remembered here so seat counts stay honest.
    const savedTickets = () => {
        try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch { return []; }
    };
    const saveTicket = (ticket) => {
        try { localStorage.setItem(STORE_KEY, JSON.stringify([ticket, ...savedTickets()])); } catch { }
    };

    // Optional: paste a form-endpoint URL (e.g. from formspree.io) to receive every reservation by email.
    // Leave empty to keep reservations in the visitor's browser only.
    const FORM_ENDPOINT = "";

    const forward = (formName, fields) => {
        if (!FORM_ENDPOINT) return;
        fetch(FORM_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ form: formName, ...fields })
        }).catch(() => { });
    };

    const newCode = () => {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        return "70B-" + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    };

    const content = () => {
        if (!window.SITE_CONTENT) throw new SiteError("Site content failed to load. Please refresh the page.");
        return window.SITE_CONTENT;
    };

    const withLocalSales = (event) => {
        const mine = savedTickets().filter((t) => t.eventId === event.id).reduce((n, t) => n + t.qty, 0);
        return { ...event, remaining: Math.max(0, event.remaining - mine) };
    };

    const createTicket = (body) => {
        const { events, settings } = content();
        const event = events.map(withLocalSales).find((e) => e.id === String(body.eventId));
        const name = String(body.name || "").trim(), email = String(body.email || "").trim(), phone = String(body.phone || "").trim();
        const qty = parseInt(body.qty, 10) || 0;
        const max = settings.tickets.maxPerPurchase;
        if (!event || event.status !== "UPCOMING") throw new SiteError("This show is no longer open for tickets.");
        if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^[0-9+()\-\s]{7,20}$/.test(phone))
            throw new SiteError("Please enter a valid name, email and mobile number.");
        if (qty < 1 || qty > max) throw new SiteError(`You can reserve 1 to ${max} tickets at a time.`);
        if (qty > event.remaining) {
            const left = event.remaining;
            throw new SiteError(left ? `Only ${left} ticket${left !== 1 ? "s" : ""} left for ${event.band}.` : `${event.band} is sold out.`);
        }
        const ticket = { code: newCode(), eventId: event.id, band: event.band, qty, amount: qty * event.price, date: new Date().toISOString() };
        saveTicket(ticket);
        forward("ticket-reservation", { code: ticket.code, band: event.band, date: event.date, name, email, phone, qty, amount: ticket.amount });
        return { code: ticket.code, band: ticket.band, qty, amount: ticket.amount };
    };

    const createReservation = (body) => {
        const name = String(body.name || "").trim(), date = String(body.date || "").trim(), guests = String(body.guests || "").trim();
        if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !guests)
            throw new SiteError("Please fill in your name, the date and the number of guests.");
        forward("table-reservation", { name, date, guests });
        return { ok: true };
    };

    window.Site = {
        async load() {
            const data = structuredClone(content());
            const fix = (item) => typeof item.image === "string" && item.image.startsWith("images/")
                ? { ...item, image: ASSETS + item.image } : item;
            data.events = data.events.map(withLocalSales);
            for (const key of ["products", "events", "gallery"]) data[key] = data[key].map(fix);
            return data;
        },

        async post(path, payload) {
            if (path === "/tickets") return createTicket(payload);
            if (path === "/reservations") return createReservation(payload);
            throw new SiteError("Unknown action.");
        },

        watch() { },

        peso: (n) => "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        escape: (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])),
        slug: (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        categories: ["Appetizers", "Seafoods", "Vegetables", "Meat", "Others", "Meal Treats", "Pizza", "Pasta"]
    };
})();
