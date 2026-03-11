export function isDevBypassEnabled() {
  return (
    process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true" ||
    process.env.NEXT_PUBLIC_PREVIEW_BYPASS_AUTH === "true"
  );
}

export function getDevRole() {
  if (typeof window !== "undefined") {
    const saved = window.localStorage.getItem("veinspiral_dev_role");
    if (saved) return saved;
  }
  return process.env.NEXT_PUBLIC_DEV_DEFAULT_ROLE || "admin";
}

export function setDevRole(role) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("veinspiral_dev_role", role);
    window.location.reload();
  }
}

const DEV_USERS = {
  admin: {
    id: "00000000-0000-4000-8000-000000000001",
    email: "dev-admin@veinspiral.local",
    name: "개발용 운영자",
    nickname: "개발용 운영자",
    role: "admin",
    employee_type: "internal",
  },
  staff: {
    id: "00000000-0000-4000-8000-000000000002",
    email: "dev-staff@veinspiral.local",
    name: "개발용 직원",
    nickname: "개발용 직원",
    role: "staff",
    employee_type: "internal",
  },
  client: {
    id: "00000000-0000-4000-8000-000000000003",
    email: "dev-client@veinspiral.local",
    name: "개발용 의뢰인",
    nickname: "개발용 의뢰인",
    role: "client",
    employee_type: null,
  },
};

export function buildDevUser(role = "admin") {
  const base = DEV_USERS[role] || DEV_USERS.admin;
  return {
    ...base,
    supabaseId: base.id,
    profile_image: "",
    isDevBypass: true,
  };
}