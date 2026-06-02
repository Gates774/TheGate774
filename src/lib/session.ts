const KEY = "gate_citizen_session";

export interface CitizenSession {
  fullName: string;
  phone: string;
  originState: string;
  originLga: string;
  residenceState: string;
  residenceLga: string;
}

export function getSession(): CitizenSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CitizenSession) : null;
  } catch {
    return null;
  }
}

export function setSession(s: CitizenSession) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}