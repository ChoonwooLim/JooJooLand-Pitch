// JooJoo Land - 토지 상세 정보 모달
// 지목/소유자/면적 집계 + 산지 정보 + 외부 조회 링크

(function () {
  const MODAL_ID = 'landinfo-modal';
  const BODY_ID  = 'landinfo-body';

  // ==================== 숫자 포맷 ====================
  const fmt   = (n) => n.toLocaleString('ko-KR');
  const fmt1  = (n) => n.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  // ==================== 집계 ====================
  function aggregate(parcels) {
    const total = {
      count: parcels.length,
      m2:    parcels.reduce((s, p) => s + (p.area_m2 || 0), 0),
      pyeong: parcels.reduce((s, p) => s + (p.area_pyeong || 0), 0),
    };
    const byCategory = {};  // { '전': { count, m2, pyeong, parcels: [] } ... }
    const byOwner    = {};
    parcels.forEach((p) => {
      const c = p.category || '기타';
      const o = p.owner || '미상';
      byCategory[c] = byCategory[c] || { count: 0, m2: 0, pyeong: 0, parcels: [] };
      byOwner[o]    = byOwner[o]    || { count: 0, m2: 0, pyeong: 0, parcels: [] };
      byCategory[c].count++;   byCategory[c].m2 += p.area_m2 || 0;   byCategory[c].pyeong += p.area_pyeong || 0;   byCategory[c].parcels.push(p);
      byOwner[o].count++;      byOwner[o].m2    += p.area_m2 || 0;   byOwner[o].pyeong    += p.area_pyeong || 0;    byOwner[o].parcels.push(p);
    });
    return { total, byCategory, byOwner };
  }

  // ==================== 산지 분석 ====================
  function classifyForest(parcel) {
    // 산X-Y 형태 지번 → 임야(산지), 그 외 임은 일반 임
    const lot = parcel.lot || '';
    const isSan = /^산/.test(lot);
    const cat  = parcel.category || '';
    if (cat === '임야' || isSan) return 'forest_mountain';    // 임야(산지) — 보전/준보전 판정 대상
    if (cat === '임') return 'forest_flat';                    // 임(평지 임)
    return null;
  }

  function forestParcels(parcels) {
    return parcels.filter(p => classifyForest(p));
  }

  // ==================== 외부 조회 딥링크 ====================
  // 산지정보시스템 — 주소 검색 파라미터 미공개라 홈으로 이동
  // 다드림 — 주소 검색이 내장. 기본 URL 에 주소를 넘겨도 페이지 내부에서 재검색 필요할 수 있음.
  function dadreemLink(parcel) {
    // 다드림 메인 (필지별 서비스) — 사용자가 주소 입력 후 조회
    return 'https://gis.kofpi.or.kr/dad_user/mapService/filjiInfoService/view.do';
  }
  function forestlandLink(parcel) {
    return 'http://www.forestland.go.kr/';
  }
  function fgisLink() {
    return 'https://map.forest.go.kr/';
  }
  // VWorld 부동산 정보 조회 — 주소로 직행 링크
  function vworldSearchLink(parcel) {
    const prefix = window.ADDRESS_PREFIX || '경기도 양평군 양동면';
    const addr = encodeURIComponent(`${prefix} ${parcel.location || ''} ${parcel.lot || ''}`.trim());
    return `https://map.vworld.kr/map.do?query=${addr}`;
  }

  // ==================== 카드/테이블 렌더 ====================
  function sectionCard(title, subtitle, bodyHtml) {
    return `
      <section class="linfo-section">
        <div class="linfo-section-head">
          <h3>${title}</h3>
          ${subtitle ? `<small>${subtitle}</small>` : ''}
        </div>
        <div class="linfo-section-body">${bodyHtml}</div>
      </section>
    `;
  }

  function statRow(label, value, unit = '', accent = false) {
    return `<div class="linfo-stat ${accent ? 'accent' : ''}">
      <span class="linfo-stat-label">${label}</span>
      <span class="linfo-stat-value">${value}<small>${unit}</small></span>
    </div>`;
  }

  function categoryTable(byCategory, totalArea) {
    const order = ['전', '답', '임', '임야', '대'];
    const rows = order
      .filter(c => byCategory[c])
      .concat(Object.keys(byCategory).filter(c => !order.includes(c)))
      .map(cat => {
        const s = byCategory[cat];
        const color = (window.CATEGORY_COLORS || {})[cat] || '#9e9e9e';
        const pct = totalArea > 0 ? (s.m2 / totalArea) * 100 : 0;
        return `<tr>
          <td><span class="linfo-swatch" style="background:${color}"></span>${cat}</td>
          <td class="num">${s.count}</td>
          <td class="num">${fmt(s.m2)}</td>
          <td class="num">${fmt(s.pyeong)}</td>
          <td class="num">${fmt1(pct)}%</td>
          <td><div class="linfo-bar"><div class="linfo-bar-fill" style="width:${pct}%;background:${color}"></div></div></td>
        </tr>`;
      }).join('');
    return `<table class="linfo-table">
      <thead><tr><th>지목</th><th class="num">필지</th><th class="num">㎡</th><th class="num">평</th><th class="num">비율</th><th>분포</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  function ownerTable(byOwner, totalArea) {
    const owners = Object.keys(byOwner).sort((a, b) => byOwner[b].m2 - byOwner[a].m2);
    const rows = owners.map(o => {
      const s = byOwner[o];
      const color = (window.OWNER_COLORS || {})[o] || '#607d8b';
      const pct = totalArea > 0 ? (s.m2 / totalArea) * 100 : 0;
      return `<tr>
        <td><span class="linfo-swatch" style="background:${color}"></span>${o}</td>
        <td class="num">${s.count}</td>
        <td class="num">${fmt(s.m2)}</td>
        <td class="num">${fmt(s.pyeong)}</td>
        <td class="num">${fmt1(pct)}%</td>
        <td><div class="linfo-bar"><div class="linfo-bar-fill" style="width:${pct}%;background:${color}"></div></div></td>
      </tr>`;
    }).join('');
    return `<table class="linfo-table">
      <thead><tr><th>소유자</th><th class="num">필지</th><th class="num">㎡</th><th class="num">평</th><th class="num">비율</th><th>분포</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  // ==================== 산림 API (백엔드 SHP 분석) ====================
  let _forestStatus = null;           // { loaded_layers: {...}, ready: bool }
  let _forestBatchResult = null;      // analyze-batch 응답

  async function fetchForestStatus() {
    try {
      const r = await fetch('/api/forest/status');
      if (!r.ok) return null;
      return await r.json();
    } catch { return null; }
  }

  async function fetchForestBatch() {
    // 로드된 필지만 geometry 전달
    const items = [];
    const polyMap = window.polygonsById || {};
    Object.entries(polyMap).forEach(([no, entry]) => {
      const f = entry?.polygon?.feature;
      if (!f || !f.geometry) return;
      items.push({ parcel_no: parseInt(no, 10), geometry: f.geometry, layers: ['imsang', 'sanji', 'landslide'] });
    });
    if (items.length === 0) return null;
    try {
      const r = await fetch('/api/forest/analyze-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parcels: items }),
      });
      if (!r.ok) return null;
      return await r.json();
    } catch { return null; }
  }

  function renderProjectSummary(ps) {
    if (!ps || Object.keys(ps).length === 0) return '';
    const labelMap = { imsang: '임상 분포', sanji: '산지 구분', landslide: '산사태 위험' };
    const blocks = Object.entries(ps).map(([layer, items]) => {
      if (!items || items.length === 0) return '';
      const rows = items.map(it => `<tr>
        <td>${it.category}</td>
        <td class="num">${fmt(Math.round(it.area_m2))}</td>
        <td class="num">${fmt(Math.round(it.area_pyeong))}</td>
        <td class="num">${fmt(it.parcel_count)}</td>
      </tr>`).join('');
      return `
        <div class="linfo-subsection">
          <h4>${labelMap[layer] || layer}</h4>
          <table class="linfo-table">
            <thead><tr><th>분류</th><th class="num">㎡</th><th class="num">평</th><th class="num">필지수</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    }).join('');
    return `<div class="linfo-forest-project">${blocks}</div>`;
  }

  function forestApiSection() {
    if (!_forestStatus) return `<p class="linfo-hint">산림 데이터셋 상태 조회 중...</p>`;
    if (!_forestStatus.ready) {
      return `
        <div class="linfo-notice">
          <strong>ℹ️ SHP 미적재</strong>: 서버에 산림청 SHP 데이터가 아직 올라가지 않았습니다.
          관리자가 <code>ingest_forest_shp.py</code> 스크립트로 적재해야 계산값이 표시됩니다.
          그 전까지는 아래 외부 링크로 개별 조회하세요.
        </div>`;
    }
    const layers = _forestStatus.loaded_layers || {};
    const chips = Object.entries(layers).map(([k, v]) => `<span class="linfo-chip">${k}: ${fmt(v)}건</span>`).join(' ');
    let body = `<p class="linfo-hint">적재 레이어: ${chips}</p>`;
    if (_forestBatchResult && _forestBatchResult.project_summary) {
      body += renderProjectSummary(_forestBatchResult.project_summary);
    }
    return body;
  }

  function forestSection(parcels) {
    const forests = forestParcels(parcels);
    if (forests.length === 0) {
      return `<p class="linfo-hint">임/임야 필지가 없습니다.</p>`;
    }
    const total = forests.reduce((s, p) => s + (p.area_m2 || 0), 0);
    const totalPyeong = forests.reduce((s, p) => s + (p.area_pyeong || 0), 0);
    const mountain = forests.filter(p => classifyForest(p) === 'forest_mountain');

    const stats = `
      <div class="linfo-stats-grid">
        ${statRow('산지 필지 총수', fmt(forests.length), '건', true)}
        ${statRow('산지 면적 합계', fmt(total), '㎡')}
        ${statRow('평수', fmt(totalPyeong), '평')}
        ${statRow('헥타르', fmt1(total / 10000), 'ha')}
        ${statRow('임야(산지) 필지', fmt(mountain.length), '건')}
      </div>
    `;

    const rows = forests.map(p => {
      const mtn = classifyForest(p) === 'forest_mountain';
      return `<tr>
        <td>${p.no}</td>
        <td>${p.location} <strong>${p.lot}</strong> <span class="linfo-chip">${p.category}</span> ${mtn ? '<span class="linfo-chip linfo-chip-mtn">산지</span>' : ''}</td>
        <td class="num">${fmt(p.area_m2)}㎡<br><small>${fmt(p.area_pyeong)}평</small></td>
        <td>${p.owner || '-'}</td>
        <td class="linfo-links">
          <a href="${dadreemLink(p)}" target="_blank" rel="noopener" title="경사·임상·토양·산사태 통합 조회">다드림</a>
          <a href="${forestlandLink(p)}" target="_blank" rel="noopener" title="보전/준보전 산지 판정">산지정보</a>
          <a href="${vworldSearchLink(p)}" target="_blank" rel="noopener" title="VWorld 지도 상세">VWorld</a>
        </td>
      </tr>`;
    }).join('');

    const table = `<table class="linfo-table linfo-forest-table">
      <thead><tr><th>No</th><th>지번·지목</th><th>면적</th><th>소유</th><th>외부 조회</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

    const note = `
      <div class="linfo-notice">
        <strong>ℹ️ 보전/준보전 산지 구분:</strong> 정확한 <b>보전산지·준보전산지·임업용산지·공익용산지</b> 판정은
        <b>산지정보시스템(forestland.go.kr)</b> 또는 <b>임업정보 다드림</b> 에서 필지별로 조회해야 합니다.
        (VWorld 공개 API 에는 산지구분 속성이 노출되지 않음.)
        아래 <b>외부 조회</b> 버튼을 누르면 해당 서비스로 이동합니다.
      </div>
    `;

    return stats + table + note;
  }

  function adjacentSection() {
    const groups = window.adjacentLayerGroups || {};
    const featureMap = window.adjacentFeaturesByType || {};
    const labels = {
      road: '도로',
      ditch: '구거',
      river: '하천·제방·유지',
      public: '국공유지',
      military: '군유지',
    };
    const rows = Object.keys(labels).map(type => {
      const features = featureMap[type];
      const active = Boolean(groups[type]);
      const count = features ? features.length : 0;
      const area  = features ? features.reduce((s, f) => s + (f.properties?.area ? parseFloat(f.properties.area) : 0), 0) : 0;
      return `<tr>
        <td><span class="linfo-dot ${active ? 'on' : ''}"></span>${labels[type]}</td>
        <td class="num">${active ? fmt(count) + '건' : '<small>-</small>'}</td>
        <td class="num">${active && area > 0 ? fmt(Math.round(area)) + '㎡' : '<small>-</small>'}</td>
        <td><small>${active ? '활성' : '사이드바에서 체크'}</small></td>
      </tr>`;
    }).join('');
    return `<table class="linfo-table">
      <thead><tr><th>레이어</th><th class="num">필지수</th><th class="num">면적 합계</th><th>상태</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="linfo-hint">면적 합계는 VWorld 응답에 area 속성이 포함될 때만 표시됩니다.</p>`;
  }

  function externalLinksSection(parcels) {
    return `
      <div class="linfo-ext-grid">
        <a class="linfo-ext-card" href="https://gis.kofpi.or.kr/" target="_blank" rel="noopener">
          <strong>🌲 임업정보 다드림</strong>
          <small>주소 입력 한 번으로 경사·임상·토양·산사태·지형·기후 통합 조회. 한글/PDF 보고서 저장.</small>
        </a>
        <a class="linfo-ext-card" href="https://map.forest.go.kr/" target="_blank" rel="noopener">
          <strong>🗺️ FGIS 산림공간정보</strong>
          <small>임상도·산림입지토양도·산지구분도·임도망·맞춤형 조림지도 지도 레이어.</small>
        </a>
        <a class="linfo-ext-card" href="http://www.forestland.go.kr/" target="_blank" rel="noopener">
          <strong>⛰️ 산지정보시스템</strong>
          <small>보전/준보전산지·임업용산지·공익용산지 판정. 산지전용 허가 가능성 확인.</small>
        </a>
        <a class="linfo-ext-card" href="https://www.eum.go.kr/" target="_blank" rel="noopener">
          <strong>📋 토지e음</strong>
          <small>토지이용계획확인원·규제정보·공시지가·개발행위 가능여부.</small>
        </a>
        <a class="linfo-ext-card" href="https://www.onnara.go.kr/" target="_blank" rel="noopener">
          <strong>🏞️ 온나라 부동산정보</strong>
          <small>국토교통부 종합 부동산 정보 포털 — 공시가·실거래·규제.</small>
        </a>
        <a class="linfo-ext-card" href="https://map.vworld.kr/" target="_blank" rel="noopener">
          <strong>🌐 VWorld 지도</strong>
          <small>VWorld 공식 지도 — 지적·위성·3D·항공사진 레이어 종합.</small>
        </a>
      </div>
    `;
  }

  function parcelListSection(parcels) {
    const rows = parcels.map(p => {
      const color = (window.CATEGORY_COLORS || {})[p.category] || '#9e9e9e';
      return `<tr>
        <td>${p.no}</td>
        <td><span class="linfo-swatch" style="background:${color}"></span>${p.lot}</td>
        <td><span class="linfo-chip">${p.category}</span></td>
        <td class="num">${fmt(p.area_m2)}</td>
        <td class="num">${fmt(p.area_pyeong)}</td>
        <td>${p.owner || '-'}</td>
        <td><small>${p.memo || ''}</small></td>
      </tr>`;
    }).join('');
    return `<div class="linfo-scroll-table">
      <table class="linfo-table">
        <thead><tr><th>No</th><th>지번</th><th>지목</th><th class="num">㎡</th><th class="num">평</th><th>소유자</th><th>비고</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  // ==================== 메인 렌더 ====================
  function render() {
    const parcels = window.PARCELS || [];
    if (parcels.length === 0) {
      return `<p class="linfo-hint">필지 데이터가 없습니다.</p>`;
    }
    const agg = aggregate(parcels);
    const haTotal = agg.total.m2 / 10000;

    const summary = `
      <div class="linfo-stats-grid">
        ${statRow('총 필지수', fmt(agg.total.count), '건', true)}
        ${statRow('총 면적', fmt(agg.total.m2), '㎡')}
        ${statRow('평수', fmt(agg.total.pyeong), '평')}
        ${statRow('헥타르', fmt1(haTotal), 'ha', true)}
        ${statRow('지목 종류', fmt(Object.keys(agg.byCategory).length), '종')}
        ${statRow('소유자 수', fmt(Object.keys(agg.byOwner).length), '명')}
      </div>
    `;

    return [
      sectionCard('📌 총괄', '프로젝트 전체 수치', summary),
      sectionCard('🏷️ 지목 분포', '카테고리별 필지·면적·비율', categoryTable(agg.byCategory, agg.total.m2)),
      sectionCard('👥 소유자 분포', '소유자별 필지·면적·비율', ownerTable(agg.byOwner, agg.total.m2)),
      sectionCard('📐 산림 분석 (SHP 자체 계산)',
        '서버에 적재된 임상도·산지구분도와 교집합 실측',
        forestApiSection()),
      sectionCard('🌲 산지·산림 정보', '임/임야 필지 + 보전/준보전 판정 외부 링크', forestSection(parcels)),
      sectionCard('🛣️ 인접 레이어 현황', '사이드바에서 켜둔 도로·구거·하천 등 집계', adjacentSection()),
      sectionCard('🔗 외부 공식 조회', '정확한 규제·경사·산지구분·공시지가 등은 아래 서비스에서 확인', externalLinksSection(parcels)),
      sectionCard('📋 필지 전체 리스트', `총 ${parcels.length}건`, parcelListSection(parcels)),
    ].join('');
  }

  // ==================== 모달 제어 ====================
  async function openModal() {
    const body = document.getElementById(BODY_ID);
    const modal = document.getElementById(MODAL_ID);
    if (!body || !modal) return;
    body.innerHTML = render();
    modal.classList.remove('hidden');
    // 백엔드 산림 분석: 비동기로 후속 업데이트
    if (!_forestStatus) _forestStatus = await fetchForestStatus();
    if (_forestStatus && _forestStatus.ready && !_forestBatchResult) {
      _forestBatchResult = await fetchForestBatch();
    }
    // 재렌더 (데이터 도착 후)
    body.innerHTML = render();
  }
  function closeModal() {
    document.getElementById(MODAL_ID)?.classList.add('hidden');
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('open-landinfo')?.addEventListener('click', openModal);
    document.getElementById('landinfo-close')?.addEventListener('click', closeModal);
    document.getElementById(MODAL_ID)?.addEventListener('click', (e) => {
      if (e.target.id === MODAL_ID) closeModal();
    });
  });

  window.LandInfo = { open: openModal, close: closeModal };
})();
