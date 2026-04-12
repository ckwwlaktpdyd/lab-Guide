const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const { 
  FaRegFileAlt, FaExclamationTriangle, FaRegClock, FaTabletAlt, 
  FaHandPointUp, FaBarcode, FaShieldAlt 
} = require("react-icons/fa");

function renderIconSvg(IconComponent, color = "#000000", size = 256) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(IconComponent, { color, size: String(size) })
  );
}

async function iconToBase64Png(IconComponent, color, size = 256) {
  const svg = renderIconSvg(IconComponent, color, size);
  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + pngBuffer.toString("base64");
}

async function createDeck() {
  let pres = new pptxgen();
  pres.layout = 'LAYOUT_16x9';

  const COLOR_PRIMARY = "EC5B13";
  const COLOR_TEAL = "006666";
  const COLOR_TEXT = "1E293B";
  const COLOR_BG = "F8FAFC";
  const COLOR_WHITE = "FFFFFF";

  pres.defineSlideMaster({
    title: 'MASTER_MAIN',
    background: { color: COLOR_BG },
    objects: [
      { rect: { x: 0, y: 0, w: '100%', h: 0.05, fill: { color: COLOR_PRIMARY } } }
    ]
  });

  // Load icons
  const iconFile = await iconToBase64Png(FaRegFileAlt, "#" + COLOR_TEAL);
  const iconAlert = await iconToBase64Png(FaExclamationTriangle, "#" + COLOR_TEAL);
  const iconClock = await iconToBase64Png(FaRegClock, "#" + COLOR_TEAL);
  const iconTablet = await iconToBase64Png(FaTabletAlt, "#" + COLOR_PRIMARY);
  const iconFinger = await iconToBase64Png(FaHandPointUp, "#" + COLOR_PRIMARY);
  const iconBarcode = await iconToBase64Png(FaBarcode, "#" + COLOR_PRIMARY);
  const iconShield = await iconToBase64Png(FaShieldAlt, "#" + COLOR_PRIMARY);

  // Slide 1: Title
  let slide1 = pres.addSlide();
  slide1.background = { color: COLOR_TEAL };
  
  slide1.addImage({ path: "/Users/hojin/.gemini/antigravity/brain/ce22fff4-1b14-42bd-ace7-e7f431b4e0c8/lab_worker_silhouette_1775974085364.png", x: 5, y: 0, w: 5, h: 5.625, sizing: { type: 'cover' } });
  
  slide1.addText("Lab-Guide", {
    x: 0.5, y: 1.4, w: 4.5, h: 1, fontSize: 48, bold: true, color: COLOR_WHITE, fontFace: "Helvetica Neue"
  });
  slide1.addText("바이오 의약품 제조 공정의\n휴먼 에러 제로화 솔루션", {
    x: 0.5, y: 2.3, w: 4.5, h: 1.5, fontSize: 24, color: COLOR_PRIMARY, bold: true, fontFace: "Helvetica Neue", breakLine: true, lineSpacing: 35
  });
  slide1.addText("초보 작업자도 베테랑처럼, 실수 없는 버퍼 제조를 위한 태블릿 UX/UI", {
    x: 0.5, y: 4.0, w: 4.0, h: 1.0, fontSize: 16, color: "E2E8F0", fontFace: "Helvetica Neue", lineSpacing: 24
  });

  // Slide 2: Background
  let slide2 = pres.addSlide({ masterName: 'MASTER_MAIN' });
  slide2.addText("왜 '버퍼 제조 가이드'가 필요한가?", {
    x: 0.5, y: 0.5, w: 9, h: 1, fontSize: 32, bold: true, color: COLOR_TEAL
  });
  
  slide2.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 1.8, w: 9, h: 2.5, fill: { color: COLOR_WHITE },
    shadow: { type: "outer", blur: 10, offset: 3, angle: 90, color: "000000", opacity: 0.05 }
  });
  slide2.addText([
    { text: "바이오 의약품 품질의 80%는 정확한 버퍼(Buffer) 제조에서 시작됩니다.", options: { fontSize: 20, breakLine: true, bold: true, color: COLOR_TEXT } },
    { text: "하지만 실제 QC 현장은 여전히 젖은 종이 문서(SOP)와 수기 기록에 의존하고 있어, 인수인계가 부족한 신입 작업자에게 극심한 인지적 부담과 에러 리스크를 유발합니다.", options: { fontSize: 18, color: "475569" } }
  ], {
    x: 0.8, y: 2.0, w: 8.4, h: 2.0, lineSpacing: 30, valign: "middle"
  });

  // Slide 3: Problems
  let slide3 = pres.addSlide({ masterName: 'MASTER_MAIN' });
  slide3.addText("현장 작업자의 3가지 핵심 Pain Point", {
    x: 0.5, y: 0.5, w: 9, h: 0.8, fontSize: 32, bold: true, color: COLOR_TEAL
  });

  const yBox = 1.6;
  const hBox = 3.5;
  const wBox = 2.8;
  const gap = 0.3;
  
  const createBox = (idx, icon, title, desc) => {
    const startX = 0.5 + (wBox + gap) * idx;
    slide3.addShape(pres.shapes.RECTANGLE, {
      x: startX, y: yBox, w: wBox, h: hBox, fill: { color: COLOR_WHITE }, shadow: { type: "outer", blur: 10, offset: 3, angle: 90, color: "000000", opacity: 0.05 }
    });
    slide3.addImage({ data: icon, x: startX + Math.abs(wBox-0.6)/2, y: yBox + 0.4, w: 0.6, h: 0.6 });
    slide3.addText(title, {
      x: startX + 0.1, y: yBox + 1.2, w: wBox - 0.2, h: 0.5, fontSize: 16, bold: true, align: "center", color: COLOR_PRIMARY
    });
    slide3.addText(desc, {
      x: startX + 0.2, y: yBox + 1.8, w: wBox - 0.4, h: 1.5, fontSize: 13, align: "center", fontFace:"Helvetica Neue", color: "475569", valign: "top", lineSpacing: 20
    });
  };

  createBox(0, iconFile, "불친절한 정보 구조", "방진복과 장갑을 낀 상태에서 젖은 종이 SOP를 넘기며 복잡한 텍스트를 읽어야 하는 물리적 불편함.");
  createBox(1, iconAlert, "휴먼 에러의 공포", "수많은 비슷한 시약병의 시리얼 넘버와 유효기간을 육안으로 일일이 더블 체크해야 하는 시각적 피로도.");
  createBox(2, iconClock, "수기 기록의 비효율", "공정 완료 후 수기 보고서를 작성하고 관리자 리뷰를 대기해야 하는 시간 낭비.");

  // Slide 4: Concept
  let slide4 = pres.addSlide({ masterName: 'MASTER_MAIN' });
  slide4.addText("감시자가 아닌 '디지털 사수(Digital Mentor)'로의 전환", {
    x: 0.5, y: 0.5, w: 9, h: 1.0, fontSize: 30, bold: true, color: COLOR_TEAL
  });

  slide4.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 1.8, w: 9, h: 2.5, fill: { color: COLOR_TEAL }
  });
  slide4.addText([
    { text: "종이 문서를 그대로 화면에 옮기는 것이 아니라, '바텐더의 레시피 플로우'처럼 지금 당장 해야 할 1가지 핵심 액션만 직관적으로 지시하는 내비게이션형 UX를 설계했습니다.", options: { fontSize: 18, breakLine: true, color: COLOR_WHITE } },
    { text: "극한의 환경에서도 오류를 원천 차단하는 시스템적 안전장치(Safety Guard)를 마련했습니다.", options: { fontSize: 18, color: "CBD5E1", bold: true } }
  ], {
    x: 0.8, y: 2.0, w: 8.4, h: 2.0, lineSpacing: 28, valign: "middle"
  });

  // Slide 5: Key Feature 1
  let slide5 = pres.addSlide({ masterName: 'MASTER_MAIN' });
  slide5.addText("핵심 기능", { x: 0.5, y: 0.4, w: 2, h: 0.4, fontSize: 14, color: COLOR_PRIMARY, bold: true });
  slide5.addText("한 손 조작을 위한 Thumb-Zone UI", {
    x: 0.5, y: 0.8, w: 6, h: 0.6, fontSize: 28, bold: true, color: COLOR_TEAL
  });

  slide5.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 1.8, w: 0.1, h: 2.5, fill: { color: COLOR_PRIMARY } });
  slide5.addText("작업복 주머니에 수납 가능하며 한 손으로 쥘 수 있는 iPad Mini를 디바이스로 선정했습니다. 장갑 낀 손으로 한 손에 비커를 든 상태에서도 엄지손가락만으로 '다음(Next)' 단계로 쉽게 넘어갈 수 있도록 하단 중앙 및 우측에 거대한 터치 영역(Big Touch Area)을 배치했습니다.", {
    x: 0.8, y: 1.8, w: 5, h: 2.5, fontSize: 16, color: COLOR_TEXT, valign: "top", lineSpacing: 25
  });

  slide5.addShape(pres.shapes.OVAL, { x: 6.5, y: 1.5, w: 2.5, h: 2.5, fill: { color: COLOR_WHITE }, shadow: { type: "outer", blur: 15, offset: 4, angle: 90, color: "000000", opacity: 0.1 } });
  slide5.addImage({ data: iconFinger, x: 7.25, y: 2.25, w: 1, h: 1 });

  // Slide 6: Key Feature 2
  let slide6 = pres.addSlide({ masterName: 'MASTER_MAIN' });
  slide6.addText("핵심 기능", { x: 0.5, y: 0.4, w: 2, h: 0.4, fontSize: 14, color: COLOR_PRIMARY, bold: true });
  slide6.addText("육안 검증을 대체하는 바코드 스캔 시스템", {
    x: 0.5, y: 0.8, w: 6, h: 0.6, fontSize: 28, bold: true, color: COLOR_TEAL
  });

  slide6.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 1.8, w: 0.1, h: 2.5, fill: { color: COLOR_PRIMARY } });
  slide6.addText("비슷한 시약병을 눈으로 구별하던 방식을 태블릿 카메라 스캔으로 대체했습니다. DB와 일치하고 유효기간이 정상일 때만 초록색 시각 피드백과 함께 다음 단계가 열리며, 오류 시 화면 전체가 붉은색으로 변하며 공정을 락(Lock)시키는 에러 방지 시스템을 구현했습니다.", {
    x: 0.8, y: 1.8, w: 5, h: 2.5, fontSize: 16, color: COLOR_TEXT, valign: "top", lineSpacing: 25
  });

  slide6.addShape(pres.shapes.OVAL, { x: 6.5, y: 1.5, w: 2.5, h: 2.5, fill: { color: COLOR_WHITE }, shadow: { type: "outer", blur: 15, offset: 4, angle: 90, color: "000000", opacity: 0.1 } });
  slide6.addImage({ data: iconBarcode, x: 7.25, y: 2.25, w: 1, h: 1 });

  // Slide 7: Impact
  let slide7 = pres.addSlide();
  slide7.background = { color: COLOR_TEAL };

  slide7.addImage({ data: iconShield, x: 0.5, y: 1.0, w: 0.8, h: 0.8 });
  slide7.addText("사용자 편의를 넘어\n데이터 무결성(DI) 확보까지", {
    x: 0.5, y: 2.0, w: 9, h: 1.2, fontSize: 36, bold: true, color: COLOR_WHITE, breakLine: true, lineSpacing: 45
  });
  slide7.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 3.5, w: 1.5, h: 0.05, fill: { color: COLOR_PRIMARY } });
  slide7.addText("Lab-Guide는 작업자의 인지적 스트레스를 줄여 온보딩 기간을 단축합니다.\n또한, 모든 투입량과 작업 시간이 자동 기록(Auto-Audit Trail)되어 제약사의 핵심 가치인 데이터 무결성 위반 리스크를 획기적으로 낮춥니다.", {
    x: 0.5, y: 3.8, w: 8.5, h: 1.5, fontSize: 18, color: "E2E8F0", breakLine: true, lineSpacing: 28
  });

  pres.writeFile({ fileName: "/Users/hojin/.gemini/antigravity/scratch/stitch-screens/Lab_Guide_Portfolio.pptx" })
    .then(fileName => console.log(`created ${fileName}`))
    .catch(err => console.error(err));
}

createDeck();
