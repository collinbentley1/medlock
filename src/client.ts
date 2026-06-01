const form = document.querySelector<HTMLFormElement>("[data-waitlist-form]");
const emailInput = document.querySelector<HTMLInputElement>("[data-waitlist-email]");
const statusText = document.querySelector<HTMLElement>("[data-waitlist-status]");
const endpointStatus = document.querySelector<HTMLElement>("[data-endpoint-status]");

void refreshEndpointStatus();

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
    setStatus(body.duplicate ? "You are already on the list." : "You are on the list.", "success");
  } catch {
    setStatus("Unable to join right now.", "error");
  }
});

async function refreshEndpointStatus(): Promise<void> {
  if (!endpointStatus) {
    return;
  }

  try {
    const response = await fetch("/healthz");
    const body = (await response.json()) as { ok?: boolean; transport?: string };

    endpointStatus.textContent = body.ok ? `Online: ${body.transport ?? "streamable-http"}` : "Unavailable";
    endpointStatus.dataset.state = body.ok ? "online" : "offline";
  } catch {
    endpointStatus.textContent = "Unavailable";
    endpointStatus.dataset.state = "offline";
  }
}

function setStatus(message: string, state: "error" | "pending" | "success"): void {
  if (!statusText) {
    return;
  }

  statusText.textContent = message;
  statusText.dataset.state = state;
}
