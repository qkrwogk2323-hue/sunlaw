// app/api/upload-cases/route.js
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { supabase } from "@/utils/supabase";

export const dynamic = "force-dynamic";

// 숫자 변환 헬퍼
function toNumeric(value) {
  if (value == null) return null;
  if (value === "null") return null;
  if (value === "") return null;
  const n = parseFloat(value);
  return isNaN(n) ? null : n;
}

// 날짜 변환 헬퍼 (필요시 사용)
function toDate(value) {
  if (value == null) return null;
  if (value === "null") return null;
  if (value === "") return null;
  if (value === "dynamic") {
    return new Date();
  }
  const dateObj = new Date(value);
  if (isNaN(dateObj.getTime())) {
    return null;
  }
  return dateObj;
}

export async function POST(request) {
  try {
    console.log("[DEBUG] Upload API 시작");

    // 1) multipart/form-data 파싱
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) {
      console.log("[DEBUG] 파일이 존재하지 않습니다.");
      return NextResponse.json({ message: "파일이 존재하지 않습니다." }, { status: 400 });
    }

    // 2) XLSX 파싱
    console.log("[DEBUG] XLSX 파싱 시작");
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    console.log("[DEBUG] 사용 시트:", sheetName);

    const worksheet = workbook.Sheets[sheetName];
    // defval: null -> 값이 없을 때 null로 처리
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    console.log("[DEBUG] 파싱된 엑셀 행 개수:", rows.length);

    // 3) 각 행을 순회하며 Insert
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      console.log(`[DEBUG] ${i + 1}번째 행 처리:`, row);

      /**
       * 엑셀에서 들어오는 컬럼 (예시)
       * group_id, name, assignment_status, principal,
       * interest_1_start_date, interest_1_end_date, interest_1_rate,
       * interest_2_start_date, interest_2_end_date, interest_2_rate,
       * expenses, enforcement_type, enforcement_status, amount,
       * creditor_name, creditor_phone_number, creditor_address, creditor_registration_number,
       * debtor_name, debtor_phone_number, debtor_address,
       * timeline_description
       */
      const {
        group_id,
        name, // (현재 별도 매핑 없음. 필요 시 사용 가능)
        assignment_status,
        principal,
        interest_1_start_date,
        interest_1_end_date,
        interest_1_rate,
        interest_2_start_date,
        interest_2_end_date,
        interest_2_rate,
        expenses,
        enforcement_type,
        enforcement_status,
        amount,
        creditor_name,
        creditor_phone_number,
        creditor_address,
        creditor_registration_number,
        debtor_name,
        debtor_phone_number,
        debtor_address,
        timeline_description,
      } = row;

      // 숫자 변환
      const numericPrincipal = toNumeric(principal);
      const numericInterest1Rate = toNumeric(interest_1_rate);
      const numericInterest2Rate = toNumeric(interest_2_rate);
      const numericAmount = toNumeric(amount);

      // 날짜 변환
      const i1Start = toDate(interest_1_start_date);
      const i1End = toDate(interest_1_end_date);
      const i2Start = toDate(interest_2_start_date);
      const i2End = toDate(interest_2_end_date);

      // -----------------------
      // (1) 사건 테이블 (test_cases)
      // -----------------------
      console.log("[DEBUG] test_cases Insert 시도");
      const { data: caseData, error: caseError } = await supabase
        .from("test_cases")
        .insert([
          {
            status: assignment_status,
            principal_amount: numericPrincipal,
          },
        ])
        .select("*")
        .single();

      if (caseError) {
        console.log("[ERROR] test_cases Insert Error:", caseError);
        continue; // 현재 행은 스킵
      }
      console.log("[DEBUG] test_cases Insert Success:", caseData);
      const newCaseId = caseData.id;

      // -----------------------
      // (2) 사건 의뢰인 (test_case_clients)
      //     - group_id가 있으면 organization
      //     - 없으면 individual
      // -----------------------
      console.log("[DEBUG] test_case_clients Insert 시도");
      let clientInsertObj;
      if (group_id) {
        // 조직 의뢰인
        clientInsertObj = {
          case_id: newCaseId,
          client_type: "organization",
          organization_id: group_id,
        };
      } else {
        // 개인 의뢰인
        // 혹시 이전에 client_id가 있었다면, client_id 항목 사용하면 됨
        // 여기서는 group_id가 없으니 개인이라 가정
        clientInsertObj = {
          case_id: newCaseId,
          client_type: "individual",
          // 개인 ID는 별도로 존재한다면 여기에 넣기 (예: individual_id: client_id)
          // 질문 예시에는 client_id 대신 group_id가 있는 것으로 보이므로, 필요 시 수정
        };
      }

      const { data: clientData, error: clientError } = await supabase
        .from("test_case_clients")
        .insert([clientInsertObj])
        .select("*");

      if (clientError) {
        console.log("[ERROR] test_case_clients Insert Error:", clientError);
      } else {
        console.log("[DEBUG] test_case_clients Insert Success:", clientData);
      }

      // -----------------------
      // (3) 사건 비용 (test_case_expenses)
      // -----------------------
      console.log("[DEBUG] expenses 내용:", expenses);
      let parsedExpenses = [];
      if (expenses) {
        try {
          if (typeof expenses === "string") {
            parsedExpenses = JSON.parse(expenses);
          } else {
            parsedExpenses = expenses; // 이미 배열이면
          }
        } catch (expErr) {
          console.log("[ERROR] expenses JSON 파싱 실패:", expErr);
        }
      }
      console.log("[DEBUG] parsedExpenses:", parsedExpenses);

      if (Array.isArray(parsedExpenses) && parsedExpenses.length > 0) {
        const expenseRows = parsedExpenses.map((exp) => ({
          case_id: newCaseId,
          expense_type: exp.item,
          amount: toNumeric(exp.amount),
        }));
        console.log("[DEBUG] test_case_expenses Insert Rows:", expenseRows);

        const { data: expenseData, error: expenseError } = await supabase
          .from("test_case_expenses")
          .insert(expenseRows)
          .select("*");

        if (expenseError) {
          console.log("[ERROR] test_case_expenses Insert Error:", expenseError);
        } else {
          console.log("[DEBUG] test_case_expenses Insert Success:", expenseData);
        }
      } else {
        console.log("[DEBUG] expenses가 없거나 빈 배열입니다. Insert 생략");
      }

      // -----------------------
      // (4) 사건 이자 정보 (test_case_interests)
      // -----------------------
      console.log("[DEBUG] 이자 정보 준비");
      const interestRows = [];
      // 1차 이자
      if (i1Start || i1End || numericInterest1Rate) {
        interestRows.push({
          case_id: newCaseId,
          start_date: i1Start || new Date(),
          end_date: i1End || new Date(),
          rate: numericInterest1Rate || 0,
        });
      }
      // 2차 이자
      if (i2Start || i2End || numericInterest2Rate) {
        interestRows.push({
          case_id: newCaseId,
          start_date: i2Start || new Date(),
          end_date: i2End || new Date(),
          rate: numericInterest2Rate || 0,
        });
      }

      if (interestRows.length > 0) {
        console.log("[DEBUG] test_case_interests Insert Rows:", interestRows);
        const { data: interestData, error: interestError } = await supabase
          .from("test_case_interests")
          .insert(interestRows)
          .select("*");

        if (interestError) {
          console.log("[ERROR] test_case_interests Insert Error:", interestError);
        } else {
          console.log("[DEBUG] test_case_interests Insert Success:", interestData);
        }
      } else {
        console.log("[DEBUG] 이자 정보가 없어 Insert 생략");
      }

      // -----------------------
      // (5) 사건 당사자 (test_case_parties) - 채권자, 채무자
      // -----------------------
      // 채권자
      if (creditor_name) {
        console.log("[DEBUG] test_case_parties(creditor) Insert 시도");
        const { data: creditorData, error: creditorError } = await supabase
          .from("test_case_parties")
          .insert([
            {
              case_id: newCaseId,
              party_type: "creditor",
              entity_type: "individual",
              name: creditor_name,
              phone: creditor_phone_number,
              address: creditor_address,
              resident_number: creditor_registration_number,
            },
          ])
          .select("*");
        if (creditorError) {
          console.log("[ERROR] test_case_parties(creditor) Insert Error:", creditorError);
        } else {
          console.log("[DEBUG] test_case_parties(creditor) Insert Success:", creditorData);
        }
      } else {
        console.log("[DEBUG] creditor_name이 없어 채권자 Insert 생략");
      }

      // 채무자
      if (debtor_name) {
        console.log("[DEBUG] test_case_parties(debtor) Insert 시도");
        const { data: debtorData, error: debtorError } = await supabase
          .from("test_case_parties")
          .insert([
            {
              case_id: newCaseId,
              party_type: "debtor",
              entity_type: "individual",
              name: debtor_name,
              phone: debtor_phone_number,
              address: debtor_address,
            },
          ])
          .select("*");
        if (debtorError) {
          console.log("[ERROR] test_case_parties(debtor) Insert Error:", debtorError);
        } else {
          console.log("[DEBUG] test_case_parties(debtor) Insert Success:", debtorData);
        }
      } else {
        console.log("[DEBUG] debtor_name이 없어 채무자 Insert 생략");
      }

      // -----------------------
      // (6) 회수 활동 로그 (test_recovery_activities)
      // -----------------------
      // a) timeline_description
      if (timeline_description) {
        console.log("[DEBUG] timeline_description Insert 시도");
        const { data: timelineData, error: timelineError } = await supabase
          .from("test_recovery_activities")
          .insert([
            {
              case_id: newCaseId,
              activity_type: "timeline",
              date: new Date(),
              description: timeline_description,
              status: "predicted",
            },
          ])
          .select("*");
        if (timelineError) {
          console.log("[ERROR] test_recovery_activities(timeline) Insert Error:", timelineError);
        } else {
          console.log("[DEBUG] test_recovery_activities(timeline) Insert Success:", timelineData);
        }
      } else {
        console.log("[DEBUG] timeline_description이 없어 timeline Insert 생략");
      }

      // b) enforcement_status
      if (enforcement_status) {
        console.log("[DEBUG] enforcement_status:", enforcement_status);
        let activityType = "";
        let activityStatus = "";
        if (enforcement_status === "ongoing") {
          activityType = "legal";
          activityStatus = "predicted";
        } else if (enforcement_status === "closed") {
          activityType = "payment";
          activityStatus = "completed";
        }
        const { data: enfData, error: enfError } = await supabase
          .from("test_recovery_activities")
          .insert([
            {
              case_id: newCaseId,
              activity_type: activityType,
              date: new Date(),
              description: enforcement_type
                ? `집행유형: ${enforcement_type}`
                : `집행상태: ${enforcement_status}`,
              amount: numericAmount || 0,
              status: activityStatus,
            },
          ])
          .select("*");
        if (enfError) {
          console.log("[ERROR] test_recovery_activities(enforcement) Insert Error:", enfError);
        } else {
          console.log("[DEBUG] test_recovery_activities(enforcement) Insert Success:", enfData);
        }
      } else {
        console.log("[DEBUG] enforcement_status가 없어 enforcement Insert 생략");
      }

      console.log(`[DEBUG] ${i + 1}번째 행 처리 완료\n`);
    } // end of for...of

    console.log("[DEBUG] 모든 행 처리 완료");
    return NextResponse.json({ message: "업로드 및 DB 저장이 완료되었습니다." });
  } catch (error) {
    console.log("[ERROR] 처리 중 예외:", error);
    return NextResponse.json({ message: "처리 중 문제가 발생했습니다.", error }, { status: 500 });
  }
}
