// 케이스 상태 정보
export const CASE_STATUS = {
  PENDING: {
    id: "1",
    name: "접수",
    color: "#FFA500", // 주황색
  },
  IN_PROGRESS: {
    id: "2",
    name: "진행중",
    color: "#00CC00", // 파란색
  },
  CLOSED: {
    id: "3",
    name: "종결",
    color: "#FF0000", // 회색
  },
};

// 상태 ID로 상태 정보 조회
export const getStatusById = (statusId) => {
  return (
    Object.values(CASE_STATUS).find((status) => status.id === statusId) || {
      name: "알 수 없음",
      color: "#999999",
    }
  );
};

// 상태명으로 상태 정보 조회
export const getStatusByName = (statusName) => {
  return (
    Object.values(CASE_STATUS).find((status) => status.name === statusName) || {
      id: "0",
      name: statusName,
      color: "#999999",
    }
  );
};

// 사건 타입 정보 (영문 키값으로 구성)
export const CASE_TYPES = {
  civil: {
    id: "civil",
    name: "민사",
    color: "blue",
    className:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50",
  },
  payment_order: {
    id: "payment_order",
    name: "지급명령",
    color: "purple",
    className:
      "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/50",
  },
  bankruptcy: {
    id: "bankruptcy",
    name: "회생파산",
    color: "amber",
    className:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50",
  },
  execution: {
    id: "execution",
    name: "민사집행",
    color: "emerald",
    className:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50",
  },
  debt: {
    id: "debt",
    name: "채권",
    color: "emerald",
    className:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50",
  },
};

// 상태 정보 (영문 키값으로 구성)
export const STATUS_TYPES = {
  pending: {
    name: "대기중",
    color: "#6B7280", // 회색으로 변경
    className:
      "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700",
    icon: "Hourglass", // 아이콘 이름
  },
  in_progress: {
    name: "진행중",
    color: "#3B82F6", // 파란색
    className:
      "bg-green-50 text-green-600 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
    icon: "Timer", // 아이콘 이름
  },
  completed: {
    name: "완료",
    color: "#10B981", // 초록색
    className:
      "bg-green-50 text-green-600 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
    icon: "CheckCircle2", // 아이콘 이름
  },
  closed: {
    name: "종결",
    color: "#6B7280", // 회색
    className:
      "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
    icon: "CheckCircle2", // 아이콘 이름
  },
  rejected: {
    name: "거절됨",
    color: "#EF4444", // 빨간색
    className:
      "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
    icon: "AlertCircle", // 아이콘 이름
  },
};

// 상태값으로 상태 정보 가져오기
export const getStatusByValue = (value) => {
  if (!value)
    return {
      name: "알 수 없음",
      color: "#999999",
      className:
        "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
      icon: "AlertCircle",
    };

  // 소문자로 변환
  const normalizedValue = String(value).toLowerCase();

  // 정의된 상태가 있으면 반환, 없으면 기본값 반환
  return (
    STATUS_TYPES[normalizedValue] || {
      name: value,
      color: "#999999",
      className:
        "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
      icon: "AlertCircle",
    }
  );
};

// 사건 유형 정보 가져오기
export const getCaseTypeByValue = (value) => {
  if (!value)
    return {
      name: "기타",
      color: "gray",
      className:
        "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
    };

  // 소문자로 변환
  const normalizedValue = String(value).toLowerCase();

  // 정의된 유형이 있으면 반환, 없으면 기본값 반환
  return (
    CASE_TYPES[normalizedValue] || {
      name: value,
      color: "gray",
      className:
        "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
    }
  );
};

export const DEBT_CATEGORIES = {
  normal: {
    id: "normal",
    name: "정상채권",
    className:
      "bg-green-100 text-green-700 border-green-200 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50",
  },
  bad: {
    id: "bad",
    name: "악성채권",
    className:
      "bg-red-100 text-red-700 border-red-200 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50",
  },
  interest: {
    id: "interest",
    name: "관심채권",
    className:
      "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50",
  },
  special: {
    id: "special",
    name: "특수채권",
    className:
      "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/50",
  },
};

// 채권 카테고리 정보 가져오기
export const getDebtCategoryByValue = (value) => {
  if (!value)
    return {
      name: "정상채권",
      className:
        "bg-green-100 text-green-700 border-green-200 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50",
    };

  // 소문자로 변환
  const normalizedValue = String(value).toLowerCase();

  // 정의된 카테고리가 있으면 반환, 없으면 기본값(정상채권) 반환
  return DEBT_CATEGORIES[normalizedValue] || DEBT_CATEGORIES.normal;
};
