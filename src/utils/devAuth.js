export function isDevBypassEnabled() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true"
  );
}

export function getDevRole() {
  if (typeof window !== "undefined") {
    const saved = window.localStorage.getItem("sunlaw_dev_role");
    if (saved) return saved;
  }
  return process.env.NEXT_PUBLIC_DEV_DEFAULT_ROLE || "admin";
}

export function setDevRole(role) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("sunlaw_dev_role", role);
    window.location.reload();
  }
}

export function buildDevUser(role = "admin") {
  return {
    id: `dev-${role}`,
    supabaseId: `dev-${role}`,
    email:
      role === "client"
        ? "dev-client@sunlaw.local"
        : role === "staff"
        ? "dev-staff@sunlaw.local"
        : "dev-admin@sunlaw.local",
    name:
      role === "client"
        ? "개발용 고객"
        : role === "staff"
        ? "개발용 직원"
        : "개발용 운영자",
    nickname:
      role === "client"
        ? "개발용 고객"
        : role === "staff"
        ? "개발용 직원"
        : "개발용 운영자",
    profile_image: "",
    role,
    employee_type: role === "staff" ? "internal" : null,
    isDevBypass: true,
  };
}