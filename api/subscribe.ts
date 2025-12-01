function isValidEmail(email: string) {
  // pragmatic validation; your email platform will validate harder
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const contentType = request.headers.get("content-type") || "";
    let email = "";
    let company = "";

    if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => ({}));
      email = String(body.email || "").trim().toLowerCase();
      company = String(body.company || "").trim();
    } else {
      const form = await request.formData();
      email = String(form.get("email") || "").trim().toLowerCase();
      company = String(form.get("company") || "").trim();
    }

    // Honeypot: if filled, pretend success
    if (company) {
      return Response.redirect(new URL("/thanks.html", request.url), 303);
    }

    if (!isValidEmail(email)) {
      return new Response("Invalid email", { status: 400 });
    }

    // ---- Push to Brevo list ----
    const apiKey = process.env.BREVO_API_KEY!;
    const listId = Number(process.env.BREVO_LIST_ID || "0");

    const resp = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        email,
        listIds: [listId],
        updateEnabled: true, // if they already exist, update instead of failing
      }),
    });

    // Brevo returns 201 on success; handle “already exists” etc. gracefully
    if (!resp.ok) {
      // You can log details (but don’t leak them to users)
      return new Response("Signup failed", { status: 500 });
    }

    // Redirect to a nice page for no-JS flow
    return Response.redirect(new URL("/thanks.html", request.url), 303);
  },
};
