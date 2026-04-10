/**
 * 채권자 원금(capital) 동기화 스크립트
 *
 * 이 스크립트는 브라우저 콘솔에서 실행합니다.
 * 전제조건:
 *  1. colaw.co.kr 에 로그인되어 있어야 합니다
 *  2. VS(veinspiral.com)에 로그인되어 있어야 합니다
 *  3. colaw 개인회생 목록 페이지에서 실행합니다
 *
 * 사용법:
 *  1. colaw 개인회생 목록 (https://colaw.co.kr/documentManage/rescurMainList) 에서
 *     브라우저 콘솔을 열고 이 스크립트를 붙여넣기합니다.
 *  2. 스크립트가 자동으로:
 *     a) colaw 전체 90건의 채권자 데이터를 추출
 *     b) VS Supabase에서 현재 채권자 데이터를 조회
 *     c) bond_number + creditor_name 기준으로 매칭
 *     d) capital=0인 VS 레코드를 colaw 값으로 업데이트
 *  3. 결과 로그가 콘솔에 출력됩니다
 *
 * 주의: VS의 Supabase 인증 토큰을 별도로 입력해야 합니다.
 */

(async function syncCreditorCapital() {
  const SB_URL = 'https://hyfdebinoirtluwpfmqx.supabase.co';
  const SB_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5ZmRlYmlub2lydGx1d3BmbXF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODkwODYsImV4cCI6MjA4OTA2NTA4Nn0.84mdcyLiv8d9TZVE_V0ybH2KbkAIPtF8KIUZ8S8a528';
  const ORG_ID = '6b83d234-897e-43ef-8cf8-c7c7cf0a9f39'; // 법무법인 서해 [4층]

  // === STEP 0: VS 인증 토큰 입력 ===
  // VS에 로그인한 상태에서 쿠키에서 추출하거나 직접 입력
  const SB_ACCESS_TOKEN = prompt('VS Supabase access_token을 입력하세요 (VS 쿠키에서 추출):');
  if (!SB_ACCESS_TOKEN) {
    console.error('토큰이 필요합니다. 취소합니다.');
    return;
  }

  const sbHeaders = {
    'apikey': SB_ANON_KEY,
    'Authorization': 'Bearer ' + SB_ACCESS_TOKEN,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  };

  // === STEP 1: colaw에서 전체 신청인 목록 추출 ===
  console.log('=== STEP 1: colaw 신청인 목록 추출 ===');

  const rows = document.querySelectorAll('tr');
  const colawCases = [];
  for (const row of rows) {
    const links = row.querySelectorAll('a[data-params]');
    for (const link of links) {
      if (link.id === 'open-rescure-window') {
        try {
          const params = JSON.parse(link.getAttribute('data-params'));
          colawCases.push({
            name: link.textContent.trim(),
            seq: params.casebasicsseq,
            year: params.diaryyear,
            personseq: params.resurapplicationpersonseq
          });
        } catch(e) {}
      }
    }
  }
  console.log(`colaw 신청인 ${colawCases.length}건 추출`);

  // === STEP 2: colaw 채권자 데이터 일괄 추출 ===
  console.log('=== STEP 2: colaw 채권자 데이터 추출 (3건씩 배치) ===');

  const colawData = {}; // name -> [{bn, nm, cap, int}]

  for (let i = 0; i < colawCases.length; i++) {
    const c = colawCases[i];
    const url = `/rescureManage/popupRescureCreditorList?casebasicsseq=${c.seq}&diaryyear=${c.year}&resurapplicationpersonseq=${c.personseq}`;

    try {
      const resp = await fetch(url);
      const html = await resp.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const inputs = doc.querySelectorAll('input[name]');
      const creditors = [];
      let cur = {};
      for (const inp of inputs) {
        const name = inp.getAttribute('name');
        const val = (inp.getAttribute('value') || '').replace(/,/g, '');
        if (name === 'bondnumber') {
          if (cur.bn) creditors.push(cur);
          cur = { bn: val };
        } else if (name === 'bondname') cur.nm = val;
        else if (name === 'capital') cur.cap = parseInt(val) || 0;
        else if (name === 'interest') cur.int = parseInt(val) || 0;
      }
      if (cur.bn) creditors.push(cur);

      colawData[c.name] = creditors;
      console.log(`  [${i+1}/${colawCases.length}] ${c.name}: ${creditors.length}건`);
    } catch(e) {
      console.error(`  [${i+1}] ${c.name} 오류:`, e.message);
    }

    if (i % 3 === 2) await new Promise(r => setTimeout(r, 500));
  }

  // === STEP 3: VS Supabase에서 채권자 데이터 조회 ===
  console.log('=== STEP 3: VS 채권자 데이터 조회 ===');

  // 모든 rehabilitation_applications 조회
  const appsResp = await fetch(
    `${SB_URL}/rest/v1/rehabilitation_applications?organization_id=eq.${ORG_ID}&select=id,case_id,applicant_name`,
    { headers: { 'apikey': SB_ANON_KEY, 'Authorization': 'Bearer ' + SB_ACCESS_TOKEN } }
  );
  const apps = await appsResp.json();
  console.log(`  VS 신청인: ${apps.length}건`);

  // name -> case_id 매핑
  const nameToCaseId = {};
  for (const app of apps) {
    nameToCaseId[app.applicant_name] = app.case_id;
  }

  // 모든 rehabilitation_creditors 조회
  const credsResp = await fetch(
    `${SB_URL}/rest/v1/rehabilitation_creditors?organization_id=eq.${ORG_ID}&select=id,case_id,bond_number,creditor_name,capital,interest`,
    { headers: { 'apikey': SB_ANON_KEY, 'Authorization': 'Bearer ' + SB_ACCESS_TOKEN } }
  );
  const vsCreds = await credsResp.json();
  console.log(`  VS 채권자: ${vsCreds.length}건`);

  // === STEP 4: 매칭 및 업데이트 목록 생성 ===
  console.log('=== STEP 4: 매칭 및 업데이트 목록 생성 ===');

  const updates = []; // [{id, newCapital, newInterest, name, creditorName}]
  let matchCount = 0;
  let skipCount = 0;
  let mismatchCount = 0;

  for (const [appName, colawCreds] of Object.entries(colawData)) {
    const caseId = nameToCaseId[appName];
    if (!caseId) {
      console.warn(`  ${appName}: VS에 매칭되는 case_id 없음`);
      continue;
    }

    const vsCredsForCase = vsCreds.filter(c => c.case_id === caseId);

    for (const colawCred of colawCreds) {
      // bond_number로 매칭
      const vsCred = vsCredsForCase.find(
        v => String(v.bond_number) === String(colawCred.bn)
      );

      if (!vsCred) {
        console.warn(`  ${appName} 채권${colawCred.bn} (${colawCred.nm}): VS에 매칭 없음`);
        mismatchCount++;
        continue;
      }

      const vsCapital = vsCred.capital || 0;
      const vsInterest = vsCred.interest || 0;
      const needsUpdate = (vsCapital !== colawCred.cap) || (vsInterest !== colawCred.int);

      if (needsUpdate) {
        updates.push({
          id: vsCred.id,
          oldCapital: vsCapital,
          newCapital: colawCred.cap,
          oldInterest: vsInterest,
          newInterest: colawCred.int,
          appName: appName,
          creditorName: colawCred.nm,
          bondNumber: colawCred.bn
        });
      } else {
        matchCount++;
      }
    }
  }

  console.log(`\n=== 매칭 결과 ===`);
  console.log(`  일치: ${matchCount}건`);
  console.log(`  업데이트 필요: ${updates.length}건`);
  console.log(`  매칭 실패: ${mismatchCount}건`);

  // 업데이트 내용 미리보기
  console.log(`\n=== 업데이트 미리보기 (처음 20건) ===`);
  for (let i = 0; i < Math.min(20, updates.length); i++) {
    const u = updates[i];
    console.log(`  ${u.appName} | 채권${u.bondNumber} ${u.creditorName}`);
    console.log(`    원금: ${u.oldCapital.toLocaleString()} → ${u.newCapital.toLocaleString()}`);
    console.log(`    이자: ${u.oldInterest.toLocaleString()} → ${u.newInterest.toLocaleString()}`);
  }

  // === STEP 5: 사용자 확인 후 업데이트 실행 ===
  const confirmMsg = `${updates.length}건의 채권자 원금/이자를 업데이트하시겠습니까?\n(일치: ${matchCount}건, 매칭실패: ${mismatchCount}건)`;
  if (!confirm(confirmMsg)) {
    console.log('업데이트 취소됨');
    window.__syncUpdates = updates;
    console.log('window.__syncUpdates에 업데이트 목록이 저장되어 있습니다.');
    return;
  }

  console.log('=== STEP 5: Supabase 업데이트 실행 ===');
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < updates.length; i++) {
    const u = updates[i];
    try {
      const resp = await fetch(
        `${SB_URL}/rest/v1/rehabilitation_creditors?id=eq.${u.id}`,
        {
          method: 'PATCH',
          headers: sbHeaders,
          body: JSON.stringify({
            capital: u.newCapital,
            interest: u.newInterest
          })
        }
      );
      if (resp.ok) {
        successCount++;
      } else {
        const err = await resp.text();
        console.error(`  실패 [${u.appName}/${u.creditorName}]: ${err}`);
        errorCount++;
      }
    } catch(e) {
      console.error(`  에러 [${u.appName}/${u.creditorName}]: ${e.message}`);
      errorCount++;
    }

    if (i % 10 === 0) {
      console.log(`  진행: ${i+1}/${updates.length} (성공: ${successCount}, 실패: ${errorCount})`);
    }

    // Rate limit
    if (i % 5 === 4) await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n=== 완료 ===`);
  console.log(`  성공: ${successCount}건`);
  console.log(`  실패: ${errorCount}건`);
  console.log(`  기존 일치: ${matchCount}건`);
  console.log(`  총 처리: ${successCount + matchCount}건 / ${vsCreds.length}건`);
})();
