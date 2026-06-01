const form = document.querySelector<HTMLFormElement>("[data-waitlist-form]");
const emailInput = document.querySelector<HTMLInputElement>("[data-waitlist-email]");
const statusText = document.querySelector<HTMLElement>("[data-waitlist-status]");

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = emailInput?.value.trim() ?? "";
  if (!emailInput || !statusText) {
    return;
  }

  if (!email.includes("@")) {
    setStatus("Enter a valid email address.", "error");
    return;
  }

  setStatus("Joining...", "pending");

  try {
    const response = await fetch("/api/waitlist", {
      body: JSON.stringify({ email, source: "site" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const body = (await response.json()) as { duplicate?: boolean; error?: string; ok?: boolean };

    if (!response.ok) {
      setStatus(body.error ?? "Unable to join right now.", "error");
      return;
    }

    emailInput.value = "";
    setStatus(body.duplicate ? "You're already on the waitlist." : "You're on the list. We'll email you when beta opens.", "success");
  } catch {
    setStatus("Unable to join right now.", "error");
  }
});

function setStatus(message: string, state: "error" | "pending" | "success"): void {
  if (!statusText) {
    return;
  }

  statusText.textContent = message;
  statusText.dataset.state = state;
}
