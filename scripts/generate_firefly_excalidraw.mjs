import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const outputDir = resolve('src/content/posts/firefly-production-grade-scheduling/assets/excalidraw');
mkdirSync(outputDir, { recursive: true });

let sequence = 0;

function base(type, x, y, width, height, options = {}) {
  sequence += 1;
  return {
    id: options.id ?? `firefly-${sequence}`,
    type,
    x,
    y,
    width,
    height,
    angle: 0,
    strokeColor: options.strokeColor ?? '#315f57',
    backgroundColor: options.backgroundColor ?? 'transparent',
    fillStyle: 'solid',
    strokeWidth: options.strokeWidth ?? 2,
    strokeStyle: options.strokeStyle ?? 'solid',
    roughness: options.roughness ?? 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    index: `a${sequence.toString(36)}`,
    roundness: type === 'rectangle' ? { type: 3 } : null,
    seed: 1000 + sequence * 97,
    version: 1,
    versionNonce: 2000 + sequence * 193,
    isDeleted: false,
    boundElements: null,
    updated: 1785340800000,
    link: null,
    locked: false,
  };
}

function rect(x, y, width, height, options = {}) {
  return base('rectangle', x, y, width, height, options);
}

function diamond(x, y, width, height, options = {}) {
  return { ...base('diamond', x, y, width, height, options), roundness: { type: 2 } };
}

function ellipse(x, y, width, height, options = {}) {
  return { ...base('ellipse', x, y, width, height, options), roundness: { type: 2 } };
}

function text(x, y, value, options = {}) {
  const fontSize = options.fontSize ?? 24;
  const lines = value.split('\n');
  const measuredWidth = Math.max(...lines.map((line) =>
    [...line].reduce((total, character) => total + (character.codePointAt(0) > 255 ? 1 : 0.62), 0)
  ));
  const width = options.width ?? Math.max(80, measuredWidth * fontSize * 1.08);
  const height = options.height ?? lines.length * fontSize * 1.25;
  return {
    ...base('text', x, y, width, height, {
      strokeColor: options.strokeColor ?? '#17231f',
      backgroundColor: 'transparent',
      roughness: 0,
    }),
    text: value,
    fontSize,
    fontFamily: options.fontFamily ?? 5,
    textAlign: options.textAlign ?? 'left',
    verticalAlign: 'top',
    containerId: null,
    originalText: value,
    autoResize: true,
    lineHeight: 1.25,
  };
}

function arrow(x, y, dx, dy, options = {}) {
  return {
    ...base('arrow', x, y, Math.abs(dx), Math.abs(dy), {
      strokeColor: options.strokeColor ?? '#315f57',
      backgroundColor: 'transparent',
      strokeStyle: options.strokeStyle ?? 'solid',
      roughness: 1,
    }),
    points: [[0, 0], [dx, dy]],
    lastCommittedPoint: null,
    startBinding: null,
    endBinding: null,
    startArrowhead: options.startArrowhead ?? null,
    endArrowhead: options.endArrowhead ?? 'arrow',
    elbowed: false,
  };
}

function scene(elements) {
  return {
    type: 'excalidraw',
    version: 2,
    source: 'https://excalidraw.com',
    elements,
    appState: {
      gridSize: null,
      viewBackgroundColor: '#fbfaf7',
      currentItemFontFamily: 5,
    },
    files: {},
  };
}

function writeScene(name, elements) {
  writeFileSync(resolve(outputDir, `${name}.excalidraw`), `${JSON.stringify(scene(elements), null, 2)}\n`, 'utf8');
}

function boundariesMap() {
  const elements = [
    text(70, 45, 'Firefly 的四类生产边界 / Four Production Boundaries', { fontSize: 34 }),
    text(72, 92, '可靠性不是无限重试，而是让每类故障都有明确出口。', { fontSize: 19, width: 760, strokeColor: '#60706b' }),
    rect(545, 305, 330, 190, { backgroundColor: '#eaf5f1', strokeColor: '#2d7767', strokeWidth: 3 }),
    text(615, 337, 'Firefly', { fontSize: 36 }),
    text(585, 392, '可配置 · 可观测 · 可验证\nConfigurable · Observable · Verifiable', { fontSize: 17 }),

    rect(85, 165, 350, 175, { backgroundColor: '#eef7ec', strokeColor: '#69a858' }),
    text(120, 195, '01 资源边界 / Resource', { fontSize: 25 }),
    text(120, 243, 'acceptedSlots = running + queued\n容量耗尽 → executor_overloaded', { fontSize: 18 }),
    arrow(435, 255, 110, 95),

    rect(85, 545, 350, 175, { backgroundColor: '#fff8e8', strokeColor: '#d5a53f' }),
    text(120, 575, '02 时间边界 / Time', { fontSize: 25 }),
    text(120, 623, 'ACK deadline 控制单次投递\nexecution timeout 控制完整 attempt', { fontSize: 17 }),
    arrow(435, 610, 110, -145),

    rect(985, 165, 350, 175, { backgroundColor: '#eef5f8', strokeColor: '#4b9dbc' }),
    text(1020, 195, '03 状态边界 / State', { fontSize: 25 }),
    text(1020, 243, 'Execution + Outbox 持久化\nDISPATCHING 最终收敛到终态', { fontSize: 18 }),
    arrow(985, 255, -110, 95),

    rect(985, 545, 350, 175, { backgroundColor: '#fff1ee', strokeColor: '#cf6e60' }),
    text(1020, 575, '04 运维事实 / Operations', { fontSize: 25 }),
    text(1020, 623, 'Migration · Secure startup\nHealth · Metrics · Readiness', { fontSize: 18 }),
    arrow(985, 610, -110, -145),

    ellipse(560, 580, 300, 90, { backgroundColor: '#17231f', strokeColor: '#17231f' }),
    text(588, 606, '明确失败 > 模糊等待\nExplicit failure > silent waiting', { fontSize: 15, width: 250, strokeColor: '#ffffff' }),
    arrow(710, 580, 0, -85, { strokeStyle: 'dashed' }),
  ];
  writeScene('03-firefly-production-boundaries', elements);
}

function twoClocks() {
  const elements = [
    text(70, 45, '一次 execution，两个时钟 / One Execution, Two Clocks', { fontSize: 34 }),
    text(72, 92, '投递可以重试，但重试窗口和任务生命周期不能混为一谈。', { fontSize: 19, strokeColor: '#60706b' }),

    rect(85, 155, 1270, 465, { backgroundColor: '#fff9eb', strokeColor: '#d8af54', strokeWidth: 3 }),
    text(115, 178, 'Execution window · timeout_at（默认 5 min，可配置）', { fontSize: 25 }),
    arrow(145, 250, 1090, 0, { strokeColor: '#b3872f' }),
    text(145, 270, 'DISPATCHING', { fontSize: 18 }),
    text(1160, 270, 'TERMINAL', { fontSize: 18 }),

    rect(145, 330, 290, 175, { backgroundColor: '#eef5f8', strokeColor: '#4b9dbc' }),
    text(178, 355, 'Attempt 1', { fontSize: 24 }),
    text(178, 398, 'send → wait ACK 10s\nreject/timeout → retry', { fontSize: 19 }),

    rect(565, 330, 290, 175, { backgroundColor: '#eef5f8', strokeColor: '#4b9dbc' }),
    text(598, 355, 'Attempt 2 … N', { fontSize: 24 }),
    text(598, 398, 'backoff ≤ 30s\nmax-attempts = 5', { fontSize: 19 }),
    arrow(435, 418, 130, 0),

    diamond(985, 342, 210, 150, { backgroundColor: '#ffffff', strokeColor: '#2d7767' }),
    text(1027, 383, 'ACK accepted?', { fontSize: 21 }),
    arrow(855, 418, 130, 0),

    rect(1220, 325, 160, 95, { backgroundColor: '#eef7ec', strokeColor: '#69a858' }),
    text(1248, 350, 'RUNNING', { fontSize: 22 }),
    arrow(1195, 382, 25, -10),
    text(1198, 347, 'yes', { fontSize: 16 }),

    rect(1220, 465, 160, 95, { backgroundColor: '#fff1ee', strokeColor: '#cf6e60' }),
    text(1242, 490, 'FAILED / DEAD', { fontSize: 18 }),
    arrow(1090, 492, 130, 20, { strokeColor: '#cf6e60' }),
    text(1105, 475, 'no slots / attempts', { fontSize: 15 }),

    rect(145, 660, 540, 86, { backgroundColor: '#eef5f8', strokeColor: '#4b9dbc' }),
    text(172, 683, '短时钟 / Delivery clock：每次 ACK 等待与重试退避', { fontSize: 20 }),
    rect(745, 660, 610, 86, { backgroundColor: '#fff8e8', strokeColor: '#d5a53f' }),
    text(772, 683, '长时钟 / Execution clock：维护任务扫描并收敛 TIMED_OUT', { fontSize: 20 }),
    arrow(1025, 660, -205, -155, { strokeColor: '#cf6e60', strokeStyle: 'dashed' }),
  ];
  writeScene('04-firefly-two-clocks', elements);
}

function readinessFlow() {
  const elements = [
    text(70, 45, '安全启动与 Readiness 决策 / Startup and Readiness', { fontSize: 34 }),
    text(72, 92, '进程存活不等于调度能力可用：启动防线和健康信号必须分层。', { fontSize: 19, strokeColor: '#60706b' }),

    ellipse(85, 170, 190, 85, { backgroundColor: '#eaf5f1', strokeColor: '#2d7767' }),
    text(137, 196, 'Server boot', { fontSize: 23 }),
    arrow(275, 212, 85, 0),

    diamond(360, 145, 270, 135, { backgroundColor: '#fff9eb', strokeColor: '#d5a53f' }),
    text(400, 180, 'cluster 或非本地\nAdmin HTTP?', { fontSize: 20 }),
    arrow(630, 212, 100, -75),
    text(655, 175, 'yes', { fontSize: 16 }),

    diamond(730, 70, 255, 135, { backgroundColor: '#fff1ee', strokeColor: '#cf6e60' }),
    text(772, 105, '仍使用开发凭据?\nDev credentials?', { fontSize: 20 }),
    arrow(985, 137, 95, 0, { strokeColor: '#cf6e60' }),
    rect(1080, 90, 270, 95, { backgroundColor: '#fff1ee', strokeColor: '#cf6e60', strokeWidth: 3 }),
    text(1110, 116, '拒绝启动 / REFUSE START', { fontSize: 21 }),

    arrow(495, 280, 0, 95),
    text(510, 315, 'no / 本地模式', { fontSize: 16 }),
    arrow(855, 205, -230, 170),
    text(850, 245, 'no', { fontSize: 16 }),

    rect(420, 375, 410, 95, { backgroundColor: '#eef7ec', strokeColor: '#69a858' }),
    text(460, 402, '启动完成，进入运行态\nStartup succeeds', { fontSize: 22 }),
    arrow(625, 470, 0, 70),

    diamond(485, 540, 280, 135, { backgroundColor: '#eef5f8', strokeColor: '#4b9dbc' }),
    text(528, 575, 'autoStart=true 且\nGateway 数量为 0?', { fontSize: 20 }),
    arrow(765, 607, 110, 0, { strokeColor: '#cf6e60' }),
    rect(875, 560, 200, 95, { backgroundColor: '#fff1ee', strokeColor: '#cf6e60' }),
    text(935, 587, 'DOWN', { fontSize: 27 }),

    arrow(625, 675, 0, 70),
    text(641, 705, 'no', { fontSize: 16 }),
    diamond(485, 745, 280, 135, { backgroundColor: '#eef5f8', strokeColor: '#4b9dbc' }),
    text(528, 780, '任务注册 / 同步\n状态为 FAILED?', { fontSize: 20 }),
    arrow(765, 812, 110, -205, { strokeColor: '#cf6e60' }),
    arrow(625, 880, 0, 55),

    rect(520, 935, 210, 95, { backgroundColor: '#eef7ec', strokeColor: '#69a858', strokeWidth: 3 }),
    text(585, 963, 'UP', { fontSize: 27 }),
    rect(1085, 745, 280, 175, { backgroundColor: '#17231f', strokeColor: '#17231f' }),
    text(1115, 775, '探针必须拆分', { fontSize: 23, strokeColor: '#ffffff' }),
    text(1115, 820, 'liveness = JVM 存活\nreadiness = 调度依赖可用', { fontSize: 19, strokeColor: '#ffffff' }),
    arrow(1085, 832, -320, 0, { strokeStyle: 'dashed' }),
  ];
  writeScene('05-firefly-startup-readiness', elements);
}

boundariesMap();
twoClocks();
readinessFlow();

console.log(`Generated Excalidraw sources in ${outputDir}`);
