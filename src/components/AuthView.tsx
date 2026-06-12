import { FormEvent, useState } from "react";

interface AuthViewProps {
  loading: boolean;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (name: string, email: string, password: string) => Promise<void>;
}

export function AuthView({ loading, onSignIn, onSignUp }: AuthViewProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (mode === "signin") {
      await onSignIn(email, password);
      return;
    }

    await onSignUp(name, email, password);
  }

  return (
    <div className="auth-shell">
      <div className="hero-copy">
        <span className="eyebrow">Planner</span>
        <h1>Alles für eure Familie an einem Ort</h1>
        <p>
          Login, Familien-Verknüpfung, Termine, Einkaufsliste und Wunschlisten –
          gemeinsam verwaltet und farblich nach Personen sortiert.
        </p>
        <ul className="feature-list">
          <li>Kalender mit Teilnehmer-Auswahl</li>
          <li>Terminübersicht für alle verknüpften Personen</li>
          <li>Einkaufs- und Wunschlisten in der Cloud</li>
          <li>Farbige Personenkennzeichnung für schnelle Übersicht</li>
        </ul>
      </div>

      <form className="card auth-card" onSubmit={handleSubmit}>
        <div className="tab-row compact">
          <button
            type="button"
            className={mode === "signin" ? "tab active" : "tab"}
            onClick={() => setMode("signin")}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === "signup" ? "tab active" : "tab"}
            onClick={() => setMode("signup")}
          >
            Registrieren
          </button>
        </div>

        <div className="form-stack">
          {mode === "signup" && (
            <label>
              Anzeigename
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="z. B. Mika"
                required
              />
            </label>
          )}

          <label>
            E-Mail
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="name@email.de"
              required
            />
          </label>

          <label>
            Passwort
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="Mindestens 6 Zeichen"
              minLength={6}
              required
            />
          </label>
        </div>

        <button className="primary-button" type="submit" disabled={loading}>
          {loading
            ? "Lädt ..."
            : mode === "signin"
              ? "Einloggen"
              : "Konto erstellen"}
        </button>
      </form>
    </div>
  );
}
