// ====================================================================
// ProjectK - Castle defense / hero gacha / stage climbing idle game
// ====================================================================

const GAME_W = 540;
const GAME_H = 960;
const CENTER = { x: GAME_W / 2, y: GAME_H / 2 };

const COLOR = {
  stone: 0x9B8E7C, stoneLight: 0xB0A38F, stoneDark: 0x6B5A47,
  sand: 0xD4B888, sandPath: 0xA8927A,
  tileRoof: 0x9B3A2A, tileRoofDark: 0x5A1A0F, doorWood: 0x3A2510,
  bannerRed: 0xC0392B, bannerWhite: 0xF5E8C0,
  steel: 0xCDCDCD, steelDark: 0x5E5E5E, leather: 0x6B4423, skin: 0xE3B98F,
  slimeBody: 0x6BCED5, slimeStroke: 0x2A8A91, slimeHighlight: 0xC8F0F3,
  bossBody: 0x9B5BC7, bossStroke: 0x5A2A8B, bossCrown: 0xFFD700, bossGem: 0xC0392B,
  hpGood: 0x4ADE80, hpMid: 0xFACC15, hpLow: 0xEF4444,
  hudBg: 0x1A1410, hudBorder: 0x3A2818, hudSlotBg: 0x2A1F15, hudSlotStroke: 0x4A3A28,
  gold: 0xFACC15,
  shadow: 0x000000, white: 0xFFFFFF,
};


// === Save ===
const SAVE_KEY = 'projectk_save_v12';
const SAVE_SCHEMA = 12;
const SAVE_KEY_LEGACY_V9 = 'projectk_save_v9';
const SAVE_KEY_LEGACY_V10 = 'projectk_save_v10';
const SAVE_KEY_LEGACY_V11 = 'projectk_save_v11';

// URL 파라미터 ?reset=1 또는 ?fresh=1 이면 모든 세이브 초기화 (데모용)
try {
  const params = new URLSearchParams(location.search);
  if (params.has('reset') || params.has('fresh')) {
    [SAVE_KEY, SAVE_KEY_LEGACY_V11, 'projectk_save_v10', 'projectk_save_v9'].forEach((k) => {
      try { localStorage.removeItem(k); } catch (e) {}
    });
    console.log('[ProjectK] save reset via URL param');
  }
} catch (e) {}

// === Castle ===
const CASTLE_MAX_HP = 500;
const CASTLE_RADIUS = 60;
// 성 이미지 displaySize ≈ 130×130. 풀밭 base 포함한 시각 footprint와 비슷하게 콜리전 잡음.
const CASTLE_COL_HALF_W = 55;
const CASTLE_COL_HALF_H = 55;
const MAX_ENEMIES_ON_SCREEN = 75;

// === Hero deployment ===
const HERO_SLOT_COUNT = 8;
const HERO_RING_RADIUS = 95;

// === HUD ===
const HUD_HEIGHT = 72; // 1줄 (정사각형 슬롯, 8칸 더 큰 사이즈)
const HUD_CARD_W = 50;
const HUD_CARD_H = 50; // 정사각형
const HUD_GAP = 8;
// 탭 바 (영웅/성장/던전/상점) 가 HUD 아래에 위치
const TAB_BAR_HEIGHT = 72;
const BOTTOM_UI_HEIGHT = HUD_HEIGHT + TAB_BAR_HEIGHT;

// === Rarity ===
// label: 풀네임 (큰 카드/상세창). abbrev: 1글자 (HUD 슬롯 같은 좁은 자리).
const RARITY = {
  COMMON:    { label: 'COMMON',    abbrev: 'C', color: 0x5B5675, hex: '#5B5675', respawnSec: 8 },
  UNCOMMON:  { label: 'UNCOMMON',  abbrev: 'U', color: 0x24891E, hex: '#24891E', respawnSec: 11 },
  RARE:      { label: 'RARE',      abbrev: 'R', color: 0x2E5CDA, hex: '#2E5CDA', respawnSec: 14 },
  EPIC:      { label: 'EPIC',      abbrev: 'E', color: 0x791AFC, hex: '#791AFC', respawnSec: 18 },
  LEGENDARY: { label: 'LEGENDARY', abbrev: 'L', color: 0xF9D43F, hex: '#F9D43F', respawnSec: 22 },
  MYTHIC:    { label: 'MYTHIC',    abbrev: 'M', color: 0xD03150, hex: '#D03150', respawnSec: 27 },
  EXOTIC:    { label: 'EXOTIC',    abbrev: 'X', color: 0xE0A4FD, hex: '#E0A4FD', respawnSec: 32 },
};
const RARITY_MULT = {
  COMMON: 1.0, UNCOMMON: 1.2, RARE: 1.4, EPIC: 1.8,
  LEGENDARY: 2.4, MYTHIC: 3.2, EXOTIC: 4.5,
};
const GACHA_WEIGHTS = {
  COMMON: 40, UNCOMMON: 25, RARE: 18, EPIC: 10,
  LEGENDARY: 5, MYTHIC: 1.5, EXOTIC: 0.5,
};

// === Economy ===
const STARTING_GOLD = 200;
const GOLD_PER_KILL = 10;
const GACHA_COST = 100;
// 무료 소환 시스템 — 하루 최대 5회 + 각 사용 사이 5분 쿨다운. 자정에 5/5로 reset
const TAVERN_FREE_MAX = 5;
const TAVERN_REFILL_MS = 5 * 60 * 1000;
let tavernFreeStock = TAVERN_FREE_MAX;
let tavernNextRefillAt = 0; // 다음 무료 사용 가능 시점 (쿨다운 끝 시점)
let tavernResetDay = '';
const STAGE_CLEAR_BONUS_BASE = 50;

// === 스테이지 돌파 보상 (Stage Level Reward — Layer Lab Reward_Roadmap 스타일) ===
// 5~100 5단위 마일스톤 20개. 각각 보석 300 고정. stage > N 도달 시 수령 가능.
const STAGE_REWARDS = Array.from({ length: 20 }, (_, i) => ({ stage: (i + 1) * 5, gems: 300 }));
let claimedStageRewards; // 수령한 stage 번호 Set (create에서 초기화, save/load에 통합)

function getStageRewardState(reward) {
  if (!claimedStageRewards) return 'locked';
  if (claimedStageRewards.has(reward.stage)) return 'claimed';
  if (stage > reward.stage) return 'canClaim';
  return 'locked';
}

function hasStageRewardReady() {
  if (!claimedStageRewards) return false;
  return STAGE_REWARDS.some((r) => stage > r.stage && !claimedStageRewards.has(r.stage));
}

function claimStageReward(scene, rewardStage) {
  if (!claimedStageRewards || claimedStageRewards.has(rewardStage)) return false;
  const r = STAGE_REWARDS.find((x) => x.stage === rewardStage);
  if (!r || stage <= rewardStage) return false;
  gems += r.gems;
  claimedStageRewards.add(rewardStage);
  updateGemsUI(scene);
  updateTavernButton(scene);
  saveGame(scene);
  refreshStageRewardButton(scene);
  return true;
}

// === 가이드 미션 (신규 온보딩 + 장기 성장, 약 150개 — 세나키 스타일 촘촘 진행) ===
// 6개 카테고리(stage/summon/heroLevel/kills/castle/train) target 배열을
// 진행도(인덱스/길이)로 정렬 → 카테고리 라운드로빈으로 자연스러운 흐름.
// stage 미션 target = '클리어한 스테이지 수' (= 현재 stage-1). "스테이지 N 클리어" → target N.
function buildGuideMissions() {
  const groups = [
    { type: 'stage',
      T: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,22,24,26,28,30,33,36,40,45,50,55,60,65,70,75,80,85,90,95,100],
      desc: (t) => '스테이지 ' + t + ' 클리어',
      rew:  (t) => ({ gems: Math.min(2000, 30 + t * 4) }) },
    { type: 'summon',
      T: [1,2,3,4,5,7,10,13,17,22,28,35,45,55,70,90,115,145,180,220,270,330,400,480,580],
      desc: (t) => '영웅 소환 ' + t + '회',
      rew:  (t) => ({ gems: Math.min(2000, 40 + t * 2) }) },
    { type: 'heroLevel',
      T: [1,2,3,4,5,6,7,8,10,12,15,18,21,24,28,32,37,42,48,54,60],
      desc: (t) => '영웅 레벨 ' + t + ' 달성',
      rew:  (t) => ({ gems: Math.min(2000, 50 + t * 8) }) },
    { type: 'kills',
      T: [5,15,30,60,120,250,500,1000,1800,3000,4500,6500,9000,12000,16000,20000,25000,30000],
      desc: (t) => '누적 ' + t + '마리 처치',
      rew:  (t) => ({ gems: Math.min(2000, 30 + Math.floor(t / 20)) }) },
    { type: 'castle',
      T: [2,3,4,5,6,7,8,9,10,12,14,16,18,20,22,25,28,32,36,40,45,50,55,60,70,80],
      desc: (t) => '성 레벨 ' + t + ' 달성',
      rew:  (t) => ({ gems: Math.min(2000, 50 + t * 5) }) },
    { type: 'train',
      T: [1,2,3,4,5,6,8,10,12,14,17,20,25,30,40,55,75,100,135,180],
      desc: (t) => '클래스 훈련 ' + t + '레벨 달성',
      rew:  (t) => ({ gems: Math.min(2000, 40 + t * 3) }) },
  ];
  const all = [];
  groups.forEach((g) => {
    const denom = Math.max(1, g.T.length - 1);
    g.T.forEach((t, idx) => {
      all.push({ id: g.type + t, type: g.type, target: t, desc: g.desc(t), reward: g.rew(t), _p: idx / denom });
    });
  });
  // 초반 가이드 미션 — 닉네임 변경(step ~6), 영웅 배치(step ~9)
  all.push({ id: 'nickname1', type: 'nickname', target: 1, desc: '닉네임 변경하기',          reward: { gems: 150 }, _p: 0.05 });
  all.push({ id: 'deploy1',   type: 'deploy',   target: 1, desc: '영웅 슬롯에 영웅 배치하기', reward: { gems: 150 }, _p: 0.08 });
  // 진행도 균등 정렬
  const catOrder = { kills: 0, stage: 1, summon: 2, heroLevel: 3, castle: 4, train: 5, nickname: 6, deploy: 7 };
  all.sort((a, b) => a._p - b._p || catOrder[a.type] - catOrder[b.type]);
  return all.map((m) => { delete m._p; return m; });
}
const GUIDE_MISSIONS = buildGuideMissions();

// === Enhance (강화) ===
// 같은 영웅 중복 획득 시 +1강화. 등급별로 강화 1당 스탯 증가율이 다름.
// 캡 +999에서 COMMON ~6x → EXOTIC ~19x 가량.
const ENHANCE_CAP = 999;
const ENHANCE_RATE = {
  COMMON: 0.005, UNCOMMON: 0.006, RARE: 0.007, EPIC: 0.009,
  LEGENDARY: 0.012, MYTHIC: 0.015, EXOTIC: 0.018,
};
// 강화는 flat 가산 — 강화 1회당 (base × 등급)의 이 비율만큼 정수 증가(최소 +1). floor 소실 없이 매 강화 체감.
const ENHANCE_FLAT_PER = 0.1;

// === Class training (영웅 클래스 성장) ===
// 골드로 클래스 단위 훈련. 같은 클래스 영웅 전원에게 atk/maxHp 보너스.
// Lv 1당 +0.5% (atk/hp 동시), 캡 999 → 최대 +500% = 6x.
const CLASS_TRAIN_CAP = 999;
const CLASS_TRAIN_PER = 0.005;
// 비용 곡선: 100 + level * 25 (선형, 후반에 점점 부담)
function classTrainCost(level) { return 100 + level * 40; }

// === Castle leveling ===
const CASTLE_LEVEL_CAP = 999;
const CASTLE_EXP_PER_MOB = 1;
const CASTLE_EXP_PER_BOSS = 10;
const CASTLE_HP_PER_LEVEL = 20;
const CASTLE_DEFAULT_NAME = '닉넥임은열두글자';
function castleExpToNextLevel(level) { return 30 + level * 15; }

// === 내정 (Administration) — 성 레벨업 시 인구 +1, 인구를 영역에 배치 ===
// 인구 1당 증가량 (밸런스 — 항목별 파워 비중에 맞춰 다른 소수점 값)
const CASTLE_STAT_CAP = 999;
const STAT_ATK_PCT_PER_POINT = 0.01;       // 훈련소: 영웅 데미지 +1%/인구
const STAT_DEF_REDUCTION_PER_POINT = 0.15; // 성 내구도: 적이 성에 주는 데미지 -0.15/인구
const STAT_HP_PER_POINT = 5;               // 성벽 증축: 성 최대 HP +5/인구
const STAT_HERO_DEF_PER_POINT = 0.3;       // 수련관: 영웅 방어력 +0.3/인구
const STAT_RESPAWN_PCT_PER_POINT = 0.003;  // 신전: 영웅 부활시간 -0.3%/인구 (capped at -60%)
const STAT_RESPAWN_MAX_REDUCTION = 0.6;
const STAT_GOLD_PCT_PER_POINT = 0.005;     // 시장: 골드 획득량 +0.5%/인구

// === Stage / wave ===
const STAGE_DIFFICULTY_PER = 0.1;
const STAGE_TRANSITION_MS = 2500;
const ENEMY_SPAWN_DELAY = 1400;
// === 스테이지 1~100 밸런스 ===
// 수량(스폰 간격): stage 1~SPAWN_MAX_STAGE에서 ENEMY_SPAWN_DELAY → SPAWN_DELAY_MIN으로 선형 감소.
// 이후엔 SPAWN_DELAY_MIN 고정 (수량 max). 스탯/보상은 stageScale(1+(s-1)*0.1)에 비례해 계속 증가.
const SPAWN_MAX_STAGE = 50;
const SPAWN_DELAY_MIN = 400;
function getStageSpawnDelay(s) {
  const t = Math.min(1, Math.max(0, (s - 1) / Math.max(1, SPAWN_MAX_STAGE - 1)));
  return Math.round(ENEMY_SPAWN_DELAY - (ENEMY_SPAWN_DELAY - SPAWN_DELAY_MIN) * t);
}
function getStageRewardScale(s) {
  return 1 + (s - 1) * STAGE_DIFFICULTY_PER; // 스탯 스케일과 동일 — 난이도 비례 보상
}

// === Boss ===
const BOSS_HP_PER_STAGE = 80;
const BOSS_DAMAGE_BASE = 4;
const BOSS_DAMAGE_PER_STAGE = 0.5;
const BOSS_UNLOCK_KILLS = 10;

// === Skills ===
// false면 영웅 자동 스킬 발동 비활성화 (시각 이펙트/강화 효과 둘 다 차단).
const SKILLS_ENABLED = false;

// === Biomes (cycle every 10 stages) ===
const BIOMES = [
  { name: '초원', bossName: '대왕 슬라임', bg: '#7DAB4F', bgImage: 'grass_bg',
    grass: 0x8FBE5F, grassDark: 0x6FA340, grassDarker: 0x4F7A2D, pebble: 0x9A9A8E,
    deco: 'trees', trunkColor: 0x6B4423, leafDark: 0x4F7A2D, leafMid: 0x6FA340, leafLight: 0x8FBE5F },
  { name: '사막', bossName: '모래 군주 슬라임', bg: '#D4A85D',
    grass: 0xE8C988, grassDark: 0xC09060, grassDarker: 0x8B6F47, pebble: 0xC0A080,
    deco: 'cactus' },
  { name: '설원', bossName: '얼음 군주 슬라임', bg: '#B8D8E5',
    grass: 0xE8F0F5, grassDark: 0xB8C8D5, grassDarker: 0x808F99, pebble: 0xCCDCDC,
    deco: 'pine', trunkColor: 0x4A2510, leafDark: 0x2A4F2A, leafMid: 0x3A6F3A, leafLight: 0xFFFFFF },
  { name: '화산', bossName: '용암 군주 슬라임', bg: '#5A2818',
    grass: 0x6A3010, grassDark: 0x4A1F08, grassDarker: 0x2A0F04, pebble: 0x3A2510,
    deco: 'rocks' },
];

function getCurrentBossName() {
  const idx = currentBiomeIndex != null && currentBiomeIndex >= 0 ? currentBiomeIndex : 0;
  return (BIOMES[idx] && BIOMES[idx].bossName) || '대왕 슬라임';
}

// === Classes ===
const CLASSES = {
  warrior: {
    name: '전사', drawBody: drawWarriorBody, attackType: 'melee',
    baseStats: { maxHp: 40, damage: 7, defense: 2, detectRange: 170, attackRange: 30, attackInterval: 700, speed: 70 },
    skill: { name: '강타', cooldownMs: 8000, fire: skill_strongStrike,
      desc: '다음 공격에 2배 피해를 입힙니다.' },
  },
  archer: {
    name: '궁수', drawBody: drawArcherBody, attackType: 'ranged',
    baseStats: { maxHp: 28, damage: 6, defense: 1, detectRange: 240, attackRange: 200, attackInterval: 600, speed: 70 },
    skill: { name: '다중사', cooldownMs: 10000, fire: skill_multiShot,
      desc: '가장 가까운 적 3명에게 동시에 화살을 날립니다.' },
  },
  mage: {
    name: '마법사', drawBody: drawMageBody, attackType: 'aoe',
    baseStats: { maxHp: 32, damage: 10, defense: 1, detectRange: 220, attackRange: 180, attackInterval: 1100, speed: 60, aoeRadius: 50 },
    skill: { name: '폭발', cooldownMs: 12000, fire: skill_explosion,
      desc: '타겟 주변에 1.5배 광역 피해를 가합니다.' },
  },
  tank: {
    name: '탱커', drawBody: drawTankBody, attackType: 'melee',
    baseStats: { maxHp: 80, damage: 4, defense: 5, detectRange: 140, attackRange: 30, attackInterval: 900, speed: 55 },
    skill: { name: '분노', cooldownMs: 10000, fire: skill_rage,
      desc: '최대 체력의 25%를 회복하고 주변 적의 어그로를 끕니다.' },
  },
  assassin: {
    name: '암살자', drawBody: drawAssassinBody, attackType: 'melee',
    baseStats: { maxHp: 26, damage: 8, defense: 0, detectRange: 200, attackRange: 30, attackInterval: 420, speed: 82 },
    skill: { name: '그림자 베기', cooldownMs: 7000, fire: skill_shadowStrike,
      desc: '타겟에 기본 피해의 100%로 3연타를 가합니다.' },
  },
};

// 클래스 ID → 표시 아이콘
const CLASS_ICON = {
  warrior: '⚔', archer: '🏹', mage: '🔮', tank: '🛡', assassin: '🗡',
};
// Layer Lab PictoIcon sprite key (카드 좌상단 칩 등에서 graphics/emoji 대신 사용)
const CLASS_ICON_SPRITE = {
  warrior: 'ui_class_warrior',
  archer:  'ui_class_archer',
  mage:    'ui_class_mage',
  tank:    'ui_class_tank',
  assassin:'ui_class_assassin',
};

// === Hero pool ===
const HEROES = {
  warrior_handsome: { id: 'warrior_handsome', name: '미남 전사', class: 'warrior', rarity: 'COMMON',
    bodyColor: 0x3D4458, bodyStroke: 0x1F2330, crestColor: 0x8B5A3C,
    shieldColor: 0xB5B5B5, shieldStroke: 0x4A4A4A, accentColor: 0x6B4423,
    drawBody: makeHeroSpriteAnimDrawer('hero_warrior_handsome_idle', 'warrior_handsome_idle', 228, 48, 1),
    noRotate: true,
    portraitSheet: 'hero_warrior_handsome_idle', portraitSheetFrame: 0,
    portraitSheetSize: { w: 178, h: 228 }, portraitScale: 1,
    // 인벤토리 큰 portrait 전용 자산 (lobby_xxx PNG) — 큰 portrait 그리는 곳에서만 사용
    portraitBig: 'lobby_warrior', portraitBigSize: { w: 287, h: 360 }, portraitBigScale: 0.63,
    quotes: ['거울에서 빛이 나는군!', '내 미모가 곧 무기다!', '오늘도 잘생겼군.',
             '적도 내게 반할 거야.', '이 얼굴이 검이다!', '머리가 흐트러졌군...'],
    animKeys: {
      idle:   'warrior_handsome_idle',
      walk:   'warrior_handsome_walk',
      attack: 'warrior_handsome_attack',
      skill:  'warrior_handsome_skill',
      die:    'hero_shared_die',
    } },
  archer_robin: { id: 'archer_robin', name: '로빈훗', class: 'archer', rarity: 'UNCOMMON',
    bodyColor: 0x4A7C3A, bodyStroke: 0x2A5020, crestColor: 0xF5D24A, accentColor: 0x6B4423,
    drawBody: makeHeroSpriteAnimDrawer('hero_archer_robin_idle', 'archer_robin_idle', 252, 50, 1),
    noRotate: true,
    portraitSheet: 'hero_archer_robin_idle', portraitSheetFrame: 0,
    portraitSheetSize: { w: 228, h: 252 }, portraitScale: 1,
    portraitBig: 'lobby_archer', portraitBigSize: { w: 346, h: 403 }, portraitBigScale: 0.65,
    quotes: ['한 발이면 충분해.', '바람을 읽는다.', '명중!',
             '활시위가 떨린다.', '숲의 가호와 함께.', '저녁감이다.'],
    animKeys: {
      idle:   'archer_robin_idle',
      walk:   'archer_robin_walk',
      attack: 'archer_robin_attack',
      skill:  'archer_robin_skill',
      die:    'hero_shared_die',
    } },
  mage_ice: { id: 'mage_ice', name: '꽁꽁술사', class: 'mage', rarity: 'RARE',
    bodyColor: 0x2A3858, bodyStroke: 0x10182A, crestColor: 0x9EE7F0, accentColor: 0xADD8E6,
    drawBody: makeHeroSpriteAnimDrawer('hero_mage_ice_idle', 'mage_ice_idle', 276, 50, 1),
    noRotate: true,
    attackType: 'icefall',
    portraitSheet: 'hero_mage_ice_idle', portraitSheetFrame: 0,
    portraitSheetSize: { w: 194, h: 276 }, portraitScale: 1,
    portraitBig: 'lobby_mage', portraitBigSize: { w: 309, h: 410 }, portraitBigScale: 0.65,
    quotes: ['꽁꽁 얼려줄게~', '냉기 주의!', '얼음땡!',
             '추워질 거야!', '얼어붙어라!', '으슬으슬?'],
    animKeys: {
      idle:   'mage_ice_idle',
      walk:   'mage_ice_walk',
      attack: 'mage_ice_attack',
      skill:  'mage_ice_skill',
      die:    'hero_shared_die',
    } },
  mage_dark: { id: 'mage_dark', name: '흑마법사', class: 'mage', rarity: 'RARE',
    bodyColor: 0x2A3458, bodyStroke: 0x10162A, crestColor: 0xB23AE8, accentColor: 0x8A2EC0,
    drawBody: makeHeroSpriteAnimDrawer('hero_mage_dark_idle', 'mage_dark_idle', 209, 50, 1),
    noRotate: true,
    // 검은 일직선 빔 — 거의 전체 필드 사거리, 약한 단발. attackTarget에서 'beam' dispatch
    attackType: 'beam',
    baseStatOverride: {
      maxHp: 26,
      damage: 6,           // 낮음 (RARE 1.4× = 8)
      defense: 1,
      detectRange: 500,    // 거의 전체 필드 (GAME_W 540)
      attackRange: 500,    // detect와 동일 — 발견 즉시 그 자리에서 발사
      attackInterval: 750, // 적당히 빠른 빔 — 누적 데미지 확보
      speed: 50,           // 느림 (제자리 캐스팅 컨셉)
    },
    portraitSheet: 'hero_mage_dark_idle', portraitSheetFrame: 0,
    portraitSheetSize: { w: 141, h: 209 }, portraitScale: 1,
    portraitBig: 'lobby_mage_dark', portraitBigSize: { w: 916, h: 1055 }, portraitBigScale: 0.65,
    quotes: ['심연이 부른다.', '검은 줄기여...', '그림자가 깊다.',
             '소멸하라.', '어둠은 모든 곳에 있다.', '빛은 거짓이다.'],
    animKeys: {
      idle:   'mage_dark_idle',
      walk:   'mage_dark_walk',
      attack: 'mage_dark_attack',
      skill:  'mage_dark_skill',
      die:    'hero_shared_die',
    } },
  mage_bomber: { id: 'mage_bomber', name: '폭탄중독병', class: 'mage', rarity: 'UNCOMMON',
    bodyColor: 0xA88860, bodyStroke: 0x2A1810, crestColor: 0x1A1A1A, accentColor: 0xE85C2C,
    drawBody: makeHeroSpriteAnimDrawer('hero_mage_bomber_idle', 'mage_bomber_idle', 165, 48, 1),
    noRotate: true,
    // 광역 폭탄 던지기 — class mage 기본 attackType='aoe' 사용
    // aoeStrike가 heroDef.crestColor(=검정 폭탄)로 orb 그리고 drawExplosion 폭발
    baseStatOverride: {
      maxHp: 26,
      damage: 18,           // 10 → 18 (광역 한 방 쌤; 중심 18 / 가장자리 ~10)
      defense: 1,
      detectRange: 250,
      attackRange: 200,
      attackInterval: 1800, // 1100 → 1800 (느린 공속)
      speed: 55,
      aoeRadius: 70,        // 50 → 70 (조금 더 넓은 폭발)
    },
    portraitSheet: 'hero_mage_bomber_idle', portraitSheetFrame: 0,
    portraitSheetSize: { w: 145, h: 165 }, portraitScale: 1,
    portraitBig: 'lobby_mage_bomber', portraitBigSize: { w: 792, h: 951 }, portraitBigScale: 0.63,
    quotes: ['폭탄이다! 폭탄!', '빵! 빵빵빵!', '심지에 불 붙였어!',
             '아 이 냄새~', '한 번만 더... 안 돼 두 번 더!', '폭탄 좀 더 없나?'],
    animKeys: {
      idle:   'mage_bomber_idle',
      walk:   'mage_bomber_walk',
      attack: 'mage_bomber_attack',
      skill:  'mage_bomber_skill',
      die:    'hero_shared_die',
    } },
  archer_oneshot: { id: 'archer_oneshot', name: '원샷원킬', class: 'archer', rarity: 'UNCOMMON',
    bodyColor: 0x2E4A8B, bodyStroke: 0x121A38, crestColor: 0x4DB8FF, accentColor: 0x6A5A38,
    drawBody: makeHeroSpriteAnimDrawer('hero_archer_oneshot_idle', 'archer_oneshot_idle', 201, 48, 1),
    noRotate: true,
    // ranged 한방 빌더 — 인식 살짝 ↑, 사거리 살짝 ↑, 공속 매우 ↓, damage 매우 ↑
    baseStatOverride: {
      maxHp: 22,            // 28 → 22 (조금 더 약함)
      damage: 30,           // 6 → 30 (한방 매우 쌤)
      defense: 1,
      detectRange: 280,     // 240 → 280 (조금 더 넓음)
      attackRange: 220,     // 200 → 220
      attackInterval: 2200, // 600 → 2200 (매우 느림 ~3.7배)
      speed: 65,
    },
    portraitSheet: 'hero_archer_oneshot_idle', portraitSheetFrame: 0,
    portraitSheetSize: { w: 133, h: 201 }, portraitScale: 1,
    portraitBig: 'lobby_archer_oneshot', portraitBigSize: { w: 857, h: 910 }, portraitBigScale: 0.63,
    quotes: ['...조준 완료.', '한 발, 한 명.', '숨 멈추고...',
             '관통한다.', '명중률 100%.', '놓치지 않아.'],
    animKeys: {
      idle:   'archer_oneshot_idle',
      walk:   'archer_oneshot_walk',
      attack: 'archer_oneshot_attack',
      skill:  'archer_oneshot_skill',
      die:    'hero_shared_die',
    } },
  warrior_bandit: { id: 'warrior_bandit', name: '산적', class: 'warrior', rarity: 'COMMON',
    bodyColor: 0x8B6B4F, bodyStroke: 0x3A2A1A, crestColor: 0xD8954A, accentColor: 0x5A3F28,
    drawBody: makeHeroSpriteAnimDrawer('hero_warrior_bandit_idle', 'warrior_bandit_idle', 176, 42, 1),
    noRotate: true,
    // 진짜 제일 약한 영웅 — 미남전사(40/7/2)보다 더 낮게
    baseStatOverride: {
      maxHp: 20,
      damage: 3,
      defense: 1,
      detectRange: 160,
      attackRange: 28,
      attackInterval: 600,
      speed: 75,
    },
    // 적 타격마다 골드 +(1 + 영웅 레벨) × 시장 배율. 메모리: meleeStrike에서 처리
    goldPerHit: 1,
    portraitSheet: 'hero_warrior_bandit_idle', portraitSheetFrame: 0,
    portraitSheetSize: { w: 143, h: 176 }, portraitScale: 1,
    portraitBig: 'lobby_warrior_bandit', portraitBigSize: { w: 863, h: 975 }, portraitBigScale: 0.62,
    quotes: ['한 푼만 줍쇼!', '오늘 수입 어떨까~', '돈 되겠는데?',
             '치킨이 사라지면 안 돼!', '여기도 동전, 저기도 동전!', '한탕 하자!'],
    animKeys: {
      idle:   'warrior_bandit_idle',
      walk:   'warrior_bandit_walk',
      attack: 'warrior_bandit_attack',
      skill:  'warrior_bandit_skill',
      die:    'hero_shared_die',
    } },
  warrior_dark: { id: 'warrior_dark', name: '악흑의 기사', class: 'warrior', rarity: 'EXOTIC',
    bodyColor: 0x3A3540, bodyStroke: 0x14111A, crestColor: 0xC0C0C8, accentColor: 0x6A6470,
    drawBody: makeHeroSpriteAnimDrawer('hero_warrior_dark_idle', 'warrior_dark_idle', 217, 68, 1),
    noRotate: true,
    // 특수 메커닉 없는 정통 전사 — class warrior base에 전반 약간씩 buff
    baseStatOverride: {
      maxHp: 50,            // 40 → 50 (×EXOTIC 4.5 = 225)
      damage: 8,            // 7 → 8 (×EXOTIC 4.5 = 36)
      defense: 4,           // 2 → 4 (×EXOTIC 4.5 = 18)
      detectRange: 200,     // 170 → 200
      attackRange: 35,      // 30 → 35
      attackInterval: 650,  // 700 → 650 (살짝 빠른 평타)
      speed: 72,            // 70 → 72
    },
    portraitSheet: 'hero_warrior_dark_idle', portraitSheetFrame: 0,
    portraitSheetSize: { w: 145, h: 217 }, portraitScale: 1,
    portraitBig: 'lobby_warrior_dark', portraitBigSize: { w: 911, h: 1091 }, portraitBigScale: 0.65,
    quotes: ['어둠이 너를 삼킨다.', '...침묵하라.', '비키지 않으면 베어내겠다.',
             '두려워하라.', '쓸어버린다.', '내 길에 서지 마라.'],
    animKeys: {
      idle:   'warrior_dark_idle',
      walk:   'warrior_dark_walk',
      attack: 'warrior_dark_attack',
      skill:  'warrior_dark_skill',
      die:    'hero_shared_die',
    } },
  healer_grandpa: { id: 'healer_grandpa', name: '응급할배', class: 'mage', rarity: 'MYTHIC',
    bodyColor: 0xF4ECDC, bodyStroke: 0x4A3818, crestColor: 0xF5D24A, accentColor: 0xCB3838,
    drawBody: makeHeroSpriteAnimDrawer('hero_healer_grandpa_idle', 'healer_grandpa_idle', 184, 50, 1),
    noRotate: true,
    // 완전 힐러 — '공격'이 회복. attackTarget에서 healStrike로 dispatch
    attackType: 'heal',
    baseStatOverride: {
      maxHp: 38,           // 약함 (×MYTHIC 3.2 = 121)
      damage: 10,          // heal 양 (×MYTHIC 3.2 = 32 per cast)
      defense: 1,
      detectRange: 200,    // 부상자 탐지 범위
      attackRange: 170,    // 힐 사거리 (mage와 비슷)
      attackInterval: 800, // 빠른 힐 주기
      speed: 60,
    },
    portraitSheet: 'hero_healer_grandpa_idle', portraitSheetFrame: 0,
    portraitSheetSize: { w: 142, h: 184 }, portraitScale: 1,
    portraitBig: 'lobby_healer_grandpa', portraitBigSize: { w: 839, h: 989 }, portraitBigScale: 0.62,
    quotes: ['아이고, 잠깐 가만있어봐.', '할애비가 고쳐주마.', '약 드시고 가셔!',
             '에구구... 다친 사람 어딨노.', '이거 한 방이면 끄떡없어!', '뼈에 좋은 거여.'],
    animKeys: {
      idle:   'healer_grandpa_idle',
      walk:   'healer_grandpa_walk',
      attack: 'healer_grandpa_attack',
      skill:  'healer_grandpa_skill',
      die:    'hero_shared_die',
    } },
  tank_dandan: { id: 'tank_dandan', name: '딴딴기사', class: 'tank', rarity: 'LEGENDARY',
    bodyColor: 0xB8C0C8, bodyStroke: 0x404048, crestColor: 0xE8B040, accentColor: 0x6A5230,
    drawBody: makeHeroSpriteAnimDrawer('hero_tank_dandan_idle', 'tank_dandan_idle', 203, 66, 1),
    noRotate: true,
    // 매우 단단 + 낮은 공격력 (탱킹형). class tank base에 추가 override
    baseStatOverride: {
      maxHp: 110,       // base 80 → 110 (×LEGENDARY 2.4 = 264 실효)
      damage: 3,        // base 4 → 3 (낮은 공격력)
      defense: 14,      // base 5 → 14 (매우 단단)
      attackInterval: 1100,
    },
    // 패시브 도발: tauntRange 안의 모든 적이 매 틱 forcedTarget=self로 강제 (작은 범위)
    tauntRange: 78,
    portraitSheet: 'hero_tank_dandan_idle', portraitSheetFrame: 0,
    portraitSheetSize: { w: 150, h: 203 }, portraitScale: 1,
    portraitBig: 'lobby_tank_dandan', portraitBigSize: { w: 867, h: 1008 }, portraitBigScale: 0.65,
    quotes: ['딴딴해!', '나에게 와라!', '꿈쩍도 안 한다!',
             '여기 있다, 이놈들아!', '내가 막는다.', '뚫어보시지!'],
    animKeys: {
      idle:   'tank_dandan_idle',
      walk:   'tank_dandan_walk',
      attack: 'tank_dandan_attack',
      skill:  'tank_dandan_skill',
      die:    'hero_shared_die',
    } },
  assassin_bakso: { id: 'assassin_bakso', name: '백스오', class: 'assassin', rarity: 'EPIC',
    bodyColor: 0xC8B89A, bodyStroke: 0x3A2E22, crestColor: 0xE8C474, accentColor: 0x5A4A38,
    drawBody: makeHeroSpriteAnimDrawer('hero_assassin_bakso_idle', 'assassin_bakso_idle', 230, 48, 1),
    noRotate: true,
    // 짧은 사거리 + 발견 시 빠른 바람돌진 (engageOrChase에서 dashSpeedMult 적용)
    statOverride: {
      detectRange: 300,
      attackRange: 32,
      attackInterval: 380,
      speed: 90,
    },
    dashSpeedMult: 3.4,   // chase 시 평소 speed × 이 배수 (바람돌진)
    dashTrail: true,      // chase 중 잔상 ghost spawn
    portraitSheet: 'hero_assassin_bakso_idle', portraitSheetFrame: 0,
    portraitSheetSize: { w: 219, h: 230 }, portraitScale: 1,
    portraitBig: 'lobby_assassin_bakso', portraitBigSize: { w: 867, h: 970 }, portraitBigScale: 0.62,
    quotes: ['바람보다 빠르게!', '눈깜빡할 새에...', '슈웅!',
             '잡았다.', '여긴가, 저긴가!', '내 칼이 보였나?'],
    animKeys: {
      idle:   'assassin_bakso_idle',
      walk:   'assassin_bakso_walk',
      attack: 'assassin_bakso_attack',
      skill:  'assassin_bakso_skill',
      die:    'hero_shared_die',
    } },
};

const STARTING_ROSTER = ['warrior_handsome'];

// === Globals ===
let castleHP, castleMaxHp, castleLevel, castleExp, castleNickname;
let castleStatAtk, castleStatDef, castleStatHp, castleStatPoints;
let castleStatHeroDef, castleStatRespawn, castleStatGold;
let kills, gold, gems, stage, isGameOver, scenePaused;
// 누적 통계 (프로필 STATS) — 사용한 골드/보석 총량
let totalGoldSpent = 0, totalGemsSpent = 0;
// 튜토리얼 — 첫 진입 시에만 발동
let tutorialDone = false;

// 임시 닉네임 생성 — '기사_XXXXXX' 6자리 랜덤 숫자
function generateGuestNickname() {
  return '기사_' + Math.floor(100000 + Math.random() * 900000);
}
let autoBossSummon;
let totalSummons; // 누적 소환 횟수 (가이드 미션 'summon' 판정 + 통계용)
let guideStep;    // 현재 진행 중인 가이드 미션 인덱스 (>= GUIDE_MISSIONS.length면 전부 완료)
// 클래스 훈련 레벨 (모든 클래스 0으로 초기화, 키는 CLASSES와 동일)
let classTrainLevels;
function makeEmptyClassTrain() {
  return { warrior: 0, archer: 0, mage: 0, tank: 0, assassin: 0 };
}

const GEMS_PER_BOSS = 100;     // 보스 승리 보상 (사용자 명시: 100 고정)
const GOLD_PER_BOSS_FAIL = 100; // 보스 패배 보상 (사용자 명시: 100 고정)
const BOSS_TIME_LIMIT_SEC = 30;
let mobsKilledThisStage;
let bossPhase;       // 'mobs' | 'boss-fight' | 'transition'
let bossTimerRemaining;
let currentBoss;
let currentBiomeIndex;
let currentTime = 0;

// === Phaser config ===
// canvas native는 GAME_W*2 × GAME_H*2 (1080×1920) — HiDPI 표준 처리.
// 게임 좌표는 logical GAME_W(540) 기준. 카메라 setZoom(2)로 ×2 표시.
// scale.zoom 옵션이 사용자 환경에서 안 먹어서 카메라 zoom 우회 사용.
const config = {
  type: Phaser.AUTO,
  parent: 'game',
  transparent: true, // IntroScene 카메라가 LobbyScene 위에 alpha 0으로 합성될 수 있도록
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_W * 2, height: GAME_H * 2,
  },
  render: { antialias: true },
  // 씬 흐름: 로비(IntroScene overlay) → 로딩 → 인게임. IntroScene은 LobbyScene 위 launch.
  scene: [
    { key: 'LobbyScene',   preload: lobbyPreload,  create: lobbyCreate },
    { key: 'IntroScene',   preload: introPreload,  create: introCreate },
    { key: 'LoadingScene', preload: preload,       create: loadingCreate },
    { key: 'GameScene',    create: create,         update: update },
  ],
};

// === 로비 씬 (시작 화면) ============================================
// === IntroScene — 프로토타입 안내 + 시작 버튼 (BGM unlock 트리거 역할) =========
function introPreload() {
  this.load.image('lobby_warrior', 'assets/lobby_warrior.png');
  this.load.image('intro_char_frame', 'assets/ui/intro_char_frame.png'); // K-289 파란 원형 프레임
  this.load.image('intro_btn_start', 'assets/ui/intro_btn_start.png');   // K-229 녹색 버튼
  this.load.image('intro_icecat_logo', 'assets/ui/intro_icecat_logo.png'); // Icecat Games 로고
  this.load.image('intro_bubble', 'assets/ui/intro_bubble.png');         // K-264 말풍선 (좌측 화살표)
}

function introCreate() {
  const scene = this;
  scene.cameras.main.setZoom(2).centerOn(GAME_W / 2, GAME_H / 2);
  // 투명 카메라 — LobbyScene 위에 overlay로 합성 (game config.transparent=true 필수)
  scene.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

  // 어두운 dim — 알파 0.95 (거의 검정, 뒤 아주 살짝만 비침). 풀스크린 어디든 클릭 시 진행.
  const dimBg = scene.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.95)
    .setDepth(0).setInteractive();

  // === 캐릭터 영역 — K-289 파란 원형 프레임 + 캐릭터(아래 마스킹, 위로 살짝 삐져나옴) ===
  // 말풍선 K-264의 좌측 화살표 끝이 캐릭터 머리 우측 옆에 닿게 좌측 배치
  const frameX = 125, frameY = 515, frameSize = 144; // 이전 160에서 10% 감소 + 위로
  const frameR = frameSize / 2;

  // 1) 원형 프레임 먼저 그림 (캐릭터 아래)
  scene.add.image(frameX, frameY, 'intro_char_frame').setDepth(5).setDisplaySize(frameSize, frameSize);

  // 2) 마스크 — 메인 원(프레임 내부) + 위쪽 작은 원(머리 둥글게 삐져나오게)
  const maskG = scene.add.graphics();
  maskG.fillStyle(0xffffff, 1);
  maskG.fillCircle(frameX, frameY, frameR - 12); // 메인 원 내부 (테두리 두께 보정)
  // 위쪽 머리 영역 — 메인 원 상단에서 약간 위로 튀어나온 더 작은 원 (자연스러운 둥근 모양)
  maskG.fillCircle(frameX, frameY - frameR + 18, frameR - 42);
  maskG.setVisible(false);
  const charMask = maskG.createGeometryMask();

  // 3) 캐릭터 — 프레임 위(depth 6). 비율 유지하고 약간 위로(머리 노출)
  const char = scene.add.image(frameX, frameY - 10, 'lobby_warrior').setDepth(6);
  const cW = 144; // 프레임 사이즈와 동일
  char.setDisplaySize(cW, cW * (char.height / char.width));
  char.setMask(charMask);

  // 4) 프레임 외곽 테두리 한 번 더(depth 7) — 캐릭터 가장자리를 깔끔하게 덮음. 단 머리 노출 부위는 안 가려야 하므로 같은 마스크의 inverse 영역을 안 가리도록, 프레임 본체 그대로 한 번 더 그리되 alpha만 살짝(외곽선 보강).
  // → 단순화: 위쪽 머리 영역만 프레임 자산이 가리지 않도록 그대로 두고, 캐릭터의 좌우 가장자리는 마스크 원형이 잘라줌(원형보다 작은 반지름).

  // 호흡 (미세)
  const csx = char.scaleX, csy = char.scaleY;
  scene.tweens.add({
    targets: char, scaleX: csx * 1.04, scaleY: csy * 1.04,
    duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });

  // 말풍선 — K-264 자산 (좌측 화살표). 자산 화살표 끝이 캐릭터 머리 우측 옆 가리키게 좌-우 배치
  // (한 열 정렬은 이 자산의 좌측 화살표와 맞지 않아 좌-우로 다시 배치)
  const bubbleW = 340, bubbleH = 126;
  const bubbleX = 332, bubbleY = 470;
  scene.add.image(bubbleX, bubbleY, 'intro_bubble').setDepth(6).setDisplaySize(bubbleW, bubbleH);

  // 말풍선 텍스트 — 본문 중앙(화살표 영역 제외 우측으로 살짝)
  scene.add.text(bubbleX + 6, bubbleY - 4, '해당 게임은 프로토타입\n버전입니다!', {
    fontFamily: 'BMJUA', fontSize: '17px', color: '#2A1A0E',
    align: 'center', lineSpacing: 4,
  }).setOrigin(0.5).setDepth(7);

  // === "확인 ▶" 텍스트 (시작 버튼 대신) — 말풍선 우측 하단 끝 ===
  // 말풍선 (bubbleX, bubbleY, bubbleW, bubbleH) 우측 하단 외곽 영역
  const confirmX = bubbleX + bubbleW / 2 - 12;  // 말풍선 우측 끝에서 살짝 안쪽
  const confirmY = bubbleY + bubbleH / 2 + 18;  // 말풍선 바로 아래
  const confirmTxt = scene.add.text(confirmX, confirmY, '확인 ▶', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '18px',
    color: '#FFFFFF', stroke: '#000000', strokeThickness: 3,
  }).setOrigin(1, 0.5).setDepth(8);

  // 시선 유도 — 살짝 깜빡임
  scene.tweens.add({
    targets: confirmTxt, alpha: 0.55,
    duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });

  // 진행 함수 — BGM unlock + LobbyScene에 종료 알림 + IntroScene stop
  let advanced = false;
  const advance = () => {
    if (advanced) return;
    advanced = true;
    confirmTxt.setScale(1);
    try {
      if (scene.sound && scene.sound.context && scene.sound.context.state === 'suspended') {
        scene.sound.context.resume();
      }
    } catch (e) {}
    try {
      const lobby = scene.scene.get('LobbyScene');
      if (lobby) lobby.events.emit('intro-closed');
    } catch (e) {}
    scene.scene.stop();
  };

  // 확인 버튼 hit zone — 누르는 반응(축소) 강조
  const hit = scene.add.rectangle(confirmX - 35, confirmY, 100, 38, 0x000000, 0)
    .setOrigin(0.5).setDepth(9).setInteractive({ useHandCursor: true });
  hit.on('pointerdown', () => { confirmTxt.setScale(0.92); });
  hit.on('pointerout',  () => { confirmTxt.setScale(1); });
  hit.on('pointerup', advance);

  // dim 풀스크린(어디든) 클릭으로도 진행
  dimBg.on('pointerup', advance);

}

function lobbyPreload() {
  this.load.image('lobby_bg', 'assets/lobby_bg.png');
  this.load.image('lobby_heroes_group', 'assets/lobby_heroes_group.png');
  // 로딩 화면(LoadingScene)이 쓸 리소스 — 미리 로드해 전역 캐시에 올림
  this.load.image('ui_rb_bg', 'assets/ui/rb_bg.png');
  this.load.image('ui_icon_castle', 'assets/ui/icon_castle.png');
}

function lobbyCreate() {
  const scene = this;
  scene.cameras.main.setZoom(2).centerOn(GAME_W / 2, GAME_H / 2); // 게임과 동일 540 좌표계
  // 배경 — 정적 (줌 제거: 멀미 유발)
  scene.add.image(GAME_W / 2, GAME_H / 2, 'lobby_bg').setDisplaySize(GAME_W, GAME_H).setDepth(0);

  // ③ 햇살 광선 — 성 위 하늘에서 밝기 천천히 변동 (ADD 블렌드)
  const sunGlow = scene.add.circle(GAME_W / 2, 210, 320, 0xFFFFEE, 0)
    .setDepth(1).setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({ targets: sunGlow, alpha: 0.18, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

  // ② 반짝이 파티클 — 하늘/성 영역에 별빛이 랜덤하게 반짝
  scene.time.addEvent({ delay: 450, loop: true, callback: () => {
    const sx = Phaser.Math.Between(40, GAME_W - 40);
    const sy = Phaser.Math.Between(60, 440);
    const st = scene.add.star(sx, sy, 4, 1.5, 5, 0xFFFFFF)
      .setDepth(2).setAlpha(0).setScale(0.4).setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({ targets: st, alpha: 0.95, scale: 1.1, duration: 550, yoyo: true, ease: 'Quad.easeOut', onComplete: () => st.destroy() });
  } });

  // ④ 떠다니는 빛 입자 — 아래에서 위로 천천히 떠오름 (ADD 블렌드)
  scene.time.addEvent({ delay: 650, loop: true, callback: () => {
    const px = Phaser.Math.Between(20, GAME_W - 20);
    const p = scene.add.circle(px, GAME_H - 90, Phaser.Math.Between(2, 4), 0xFFF6C0, 0.7)
      .setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({ targets: p, y: p.y - Phaser.Math.Between(220, 420), alpha: 0, duration: Phaser.Math.Between(3200, 5200), ease: 'Sine.easeIn', onComplete: () => p.destroy() });
  } });

  // 3인방 통짜 — 크게, 호흡(scale)만 (따로 둥실 X)
  const heroes = scene.add.image(GAME_W / 2, 650, 'lobby_heroes_group').setDepth(5);
  const W = 516; // 기존 430 +20%
  heroes.setDisplaySize(W, W * (heroes.height / heroes.width));
  const bsx = heroes.scaleX, bsy = heroes.scaleY;
  scene.tweens.add({
    targets: heroes, scaleX: bsx * 1.04, scaleY: bsy * 1.04,
    duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });
  // "화면을 터치하세요" 깜빡임
  const tapText = scene.add.text(GAME_W / 2, 880, '화면을 터치하세요', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '26px',
    color: '#FFFFFF', stroke: '#1F0410', strokeThickness: 5,
  }).setOrigin(0.5).setDepth(10);
  scene.tweens.add({ targets: tapText, alpha: 0.25, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

  // 로비 BGM — 비동기 로드(로비 진입 막지 않음) 후 자동 재생, 루프. 볼륨 0.7.
  // 화면 터치(→ LoadingScene)할 때는 stop하지 않고 그대로 둠 — GameScene 진입 시점에 페이드 아웃.
  const LOBBY_BGM_VOL = 0.7;
  const startLobbyBgm = () => {
    try {
      let bgm = scene.sound.get('bgm_lobby');
      if (!bgm) bgm = scene.sound.add('bgm_lobby', { loop: true, volume: LOBBY_BGM_VOL });
      else { try { bgm.setVolume(LOBBY_BGM_VOL); } catch (e) {} }
      if (!bgm.isPlaying) {
        const play = () => { if (!bgm.isPlaying) bgm.play(); };
        if (scene.sound.locked) scene.sound.once('unlocked', play); else play();
      }
    } catch (e) { console.warn('[BGM lobby] failed', e); }
  };
  if (scene.cache.audio.exists('bgm_lobby')) {
    startLobbyBgm();
  } else {
    scene.load.audio('bgm_lobby', 'assets/audio/bgm_lobby.mp3');
    scene.load.once('filecomplete-audio-bgm_lobby', startLobbyBgm);
    scene.load.start();
  }

  // 인트로 오버레이가 닫히기 전엔 화면 클릭으로 진행 안 됨 (인트로 hit zone이 input 가로챔)
  let canAdvance = false;
  scene.events.once('intro-closed', () => { canAdvance = true; });
  // 화면 클릭 → 로딩 씬. lobby BGM은 stop하지 않고 GameScene 진입 시 페이드 아웃됨.
  scene.input.on('pointerdown', () => {
    if (!canAdvance) return;
    scene.scene.start('LoadingScene');
  });

  // 인트로 오버레이 launch (LobbyScene 위에 dim + 캐릭터/말풍선/시작버튼)
  scene.scene.launch('IntroScene');
}

// === 로딩 씬 — 인게임 리소스 로드(preload) 끝나면 인게임 진입 ===
function loadingCreate() {
  this.scene.start('GameScene');
}

function preload() {
  // === 로딩 화면 (LoadingScene 전용) — 검은 배경 + 우리 바 + 성 아이콘 + 문구 로테이션 ===
  const cam = this.cameras.main;
  const W = cam.width, H = cam.height; // native (1080×1920)
  const cx = W / 2, cy = H * 0.56;
  this.add.rectangle(cx, H / 2, W, H, 0x080810).setDepth(0); // 검은 배경

  // 감성 아이콘(성) — 통통 + 살짝 흔들 (뚜딱뚜딱)
  const licon = this.add.image(cx, cy - 130, 'ui_icon_castle').setDepth(2);
  licon.setDisplaySize(150, 150 * (101 / 123));
  this.tweens.add({ targets: licon, y: cy - 158, duration: 480, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  this.tweens.add({ targets: licon, angle: { from: -7, to: 7 }, duration: 760, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

  // 프로그래스바 — 우리 리소스(rb_bg 캡슐 nineslice) 배경 + 둥근 fill
  const barW = W * 0.6, barH = 42;
  this.add.nineslice(cx, cy, 'ui_rb_bg', null, barW, barH, 7, 7, 7, 7).setDepth(1).setTint(0x16233F);
  const fillMaxW = barW - 18, fillH = barH - 18, fillX = cx - fillMaxW / 2;
  const fillG = this.add.graphics().setDepth(2);
  this.load.on('progress', (v) => {
    fillG.clear();
    const w = Math.max(4, fillMaxW * v);
    fillG.fillStyle(0xFFD24A, 1).fillRoundedRect(fillX, cy - fillH / 2, w, fillH, fillH / 2);
  });

  // 문구 로테이션 (바 밑)
  const tips = ['왕국을 찾는 중...', '영웅 소환을 준비하는 중...', '기사단을 소집하는 중...', '성벽을 점검하는 중...', '전장으로 향하는 중...'];
  const tip = this.add.text(cx, cy + 80, tips[0], {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '36px', color: '#F5E8C0', stroke: '#000000', strokeThickness: 5,
  }).setOrigin(0.5).setDepth(2);
  let ti = 0;
  this.time.addEvent({ delay: 1300, loop: true, callback: () => { ti = (ti + 1) % tips.length; tip.setText(tips[ti]); } });

  this.load.image('castle', 'assets/castle.png');
  for (let ci = 0; ci < 12; ci++) this.load.image('cloud_sil_' + ci, 'assets/cloud_sil_' + ci + '.png'); // 구름 그림자 실루엣
  // 영웅 포트레이트 — 카드(인벤/주점/획득연출/상세창) 공용
  this.load.image('lobby_warrior', 'assets/lobby_warrior.png');
  this.load.image('lobby_archer', 'assets/lobby_archer.png');
  this.load.image('lobby_mage', 'assets/lobby_mage.png');
  // 신규 8명 lobby portrait — high-pass BG 제거 (bg_remove_portrait v2)
  this.load.image('lobby_healer_grandpa', 'assets/lobby_healer_grandpa.png');
  this.load.image('lobby_assassin_bakso', 'assets/lobby_assassin_bakso.png');
  this.load.image('lobby_archer_oneshot', 'assets/lobby_archer_oneshot.png');
  this.load.image('lobby_warrior_bandit', 'assets/lobby_warrior_bandit.png');
  this.load.image('lobby_warrior_dark',   'assets/lobby_warrior_dark.png');
  this.load.image('lobby_tank_dandan',    'assets/lobby_tank_dandan.png');
  this.load.image('lobby_mage_dark',      'assets/lobby_mage_dark.png');
  this.load.image('lobby_mage_bomber',    'assets/lobby_mage_bomber.png');
  // 스테이지 돌파 보상 (StageReward) UI 자산
  this.load.image('sr_chest',         'assets/ui/sr_chest.png');         // HUD 진입 버튼
  // Stage Reward 패널 자산 — Layer Lab Reward_Roadmap prefab 실제 sprite들
  this.load.image('sr_panel',         'assets/ui/sr_panel.png');         // (legacy) 별 패턴 nineslice
  this.load.image('sr_panel_bg',      'assets/ui/sr_panel_bg_v2.png');   // 패널 풀스크린 BG (v2 사용자 제공)
  this.load.image('profile_modal_bg', 'assets/ui/profile_modal_bg.png'); // 프로필 모달 BG (K-335)
  this.load.image('icon_pencil',      'assets/ui/icon_pencil_v2.png');   // 닉네임 변경 연필 아이콘 (Layer Lab PictoIcon_Pencil 64)
  this.load.image('profile_frame',    'assets/ui/profile_frame_v2.png'); // 프로필 사진 프레임 (K-288 어두운 사각, v2)
  this.load.image('btn_close_x',      'assets/ui/btn_close_x.png');      // 닫기 X 버튼 (K-240 빨간 원 + 흰 X)
  this.load.image('nickname_modal_bg', 'assets/ui/nickname_modal_bg.png'); // 닉네임 변경 모달 BG (K-354)
  this.load.image('input_box_bg',      'assets/ui/input_box_bg.png');     // 입력 박스 BG (K-364)
  this.load.image('btn_blue',          'assets/ui/btn_blue.png');         // 파란 버튼 (K-231 #09)
  this.load.image('btn_red',           'assets/ui/btn_red.png');          // 빨간 버튼 (K-231 #08)
  this.load.image('stat_cell_bg',      'assets/ui/stat_cell_bg.png');     // 프로필 STATS 셀 BG (K-244)
  this.load.image('profile_stat_stage',   'assets/ui/profile_stat_stage.png');
  this.load.image('profile_stat_ranking', 'assets/ui/profile_stat_ranking.png');
  this.load.image('profile_stat_gem',     'assets/ui/profile_stat_gem.png');
  this.load.image('profile_stat_gold',    'assets/ui/profile_stat_gold.png');
  this.load.image('profile_stat_kill',    'assets/ui/profile_stat_kill.png');
  this.load.image('profile_stat_hero',    'assets/ui/profile_stat_hero.png');
  this.load.image('tutorial_hand',        'assets/ui/tutorial_hand.png');     // 튜토리얼 손가락 가이드
  this.load.image('tutorial_princess',    'assets/ui/tutorial_princess.png'); // 튜토리얼 공주 캐릭터
  this.load.image('sr_track',         'assets/ui/sr_track.png');         // 세로 트랙
  this.load.image('sr_node_on',       'assets/ui/sr_node_on.png');       // 활성 노드
  this.load.image('sr_node_off',      'assets/ui/sr_node_off.png');      // 비활성 노드
  this.load.image('sr_bubble_bg',     'assets/ui/sr_bubble_bg.png');     // (legacy) 말풍선
  this.load.image('sr_bubble_arrow',  'assets/ui/sr_bubble_arrow.png');  // (legacy)
  this.load.image('sr_bubble_shadow', 'assets/ui/sr_bubble_shadow.png'); // (legacy)
  // 마일스톤 카드 — Layer Lab K-263 (캡슐 + 헥사곤 통합)
  this.load.image('sr_card_claimed',  'assets/ui/sr_card_claimed.png');  // 보상 받은 단계
  this.load.image('sr_card_can',      'assets/ui/sr_card_can.png');      // 수령 가능 (강조)
  this.load.image('sr_card_locked',   'assets/ui/sr_card_locked.png');   // 예정
  this.load.image('sr_hex_blue',      'assets/ui/sr_hex_blue.png');      // 헥사곤 블루(미달성)
  this.load.image('sr_hex_yellow',    'assets/ui/sr_hex_yellow.png');    // 헥사곤 노랑(canClaim 강조)
  this.load.image('sr_hex_border',    'assets/ui/sr_hex_border.png');    // 헥사곤 황금 강조 테두리
  this.load.image('sr_hex_glow',      'assets/ui/sr_hex_glow.png');      // 헥사곤 황금 빛
  this.load.image('sr_gems',          'assets/ui/sr_gems.png');          // 보석 아이콘(헥사곤 안)
  this.load.image('sr_check',         'assets/ui/sr_check.png');         // claimed 체크
  this.load.image('sr_back',          'assets/ui/sr_back.png');          // (legacy) 흰 화살표만
  this.load.image('sr_back_btn',      'assets/ui/sr_back_btn.png');      // 뒤로가기 버튼 (어두운 BG + 화살표)
  this.load.image('sr_info',          'assets/ui/sr_info.png');          // info 'i'
  this.load.image('sr_ribbon',        'assets/ui/sr_ribbon.png');        // (legacy) Next 리본
  this.load.image('sr_next_flag',     'assets/ui/sr_next_flag.png');     // Next 깃발 (K-305 빨간 깃발, nineslice로 가로 stretch)
  // 미남 전사 anim sprite sheets — 각 anim별 frame size 다름
  this.load.spritesheet('hero_warrior_handsome_idle',   'assets/hero_warrior_handsome_idle.png',
    { frameWidth: 178, frameHeight: 228 });
  this.load.spritesheet('hero_warrior_handsome_walk',   'assets/hero_warrior_handsome_walk.png',
    { frameWidth: 185, frameHeight: 212 });
  this.load.spritesheet('hero_warrior_handsome_attack', 'assets/hero_warrior_handsome_attack.png',
    { frameWidth: 287, frameHeight: 231 });
  this.load.spritesheet('hero_warrior_handsome_skill',  'assets/hero_warrior_handsome_skill.png',
    { frameWidth: 244, frameHeight: 346 });
  // 로빈훗 (archer_robin, UNCOMMON 원거리)
  this.load.spritesheet('hero_archer_robin_idle',   'assets/hero_archer_robin_idle.png',
    { frameWidth: 228, frameHeight: 252 });
  this.load.spritesheet('hero_archer_robin_walk',   'assets/hero_archer_robin_walk.png',
    { frameWidth: 236, frameHeight: 234 });
  this.load.spritesheet('hero_archer_robin_attack', 'assets/hero_archer_robin_attack.png',
    { frameWidth: 295, frameHeight: 247 });
  this.load.spritesheet('hero_archer_robin_skill',  'assets/hero_archer_robin_skill.png',
    { frameWidth: 292, frameHeight: 261 });
  // 꽁꽁술사 (mage_ice, RARE icefall)
  this.load.spritesheet('hero_mage_ice_idle',   'assets/hero_mage_ice_idle.png',
    { frameWidth: 194, frameHeight: 276 });
  this.load.spritesheet('hero_mage_ice_walk',   'assets/hero_mage_ice_walk.png',
    { frameWidth: 200, frameHeight: 282 });
  this.load.spritesheet('hero_mage_ice_attack', 'assets/hero_mage_ice_attack.png',
    { frameWidth: 298, frameHeight: 291 });
  this.load.spritesheet('hero_mage_ice_skill',  'assets/hero_mage_ice_skill.png',
    { frameWidth: 290, frameHeight: 322 });
  // 백스오 (assassin_bakso, EPIC 바람돌진 melee)
  this.load.spritesheet('hero_assassin_bakso_idle',   'assets/hero_assassin_bakso_idle.png',
    { frameWidth: 219, frameHeight: 230 });
  this.load.spritesheet('hero_assassin_bakso_walk',   'assets/hero_assassin_bakso_walk.png',
    { frameWidth: 223, frameHeight: 217 });
  this.load.spritesheet('hero_assassin_bakso_attack', 'assets/hero_assassin_bakso_attack.png',
    { frameWidth: 332, frameHeight: 281 });
  this.load.spritesheet('hero_assassin_bakso_skill',  'assets/hero_assassin_bakso_skill.png',
    { frameWidth: 283, frameHeight: 352 });
  // 딴딴기사 (tank_dandan, LEGENDARY 도발 패시브 tank)
  this.load.spritesheet('hero_tank_dandan_idle',   'assets/hero_tank_dandan_idle.png',
    { frameWidth: 150, frameHeight: 203 });
  this.load.spritesheet('hero_tank_dandan_walk',   'assets/hero_tank_dandan_walk.png',
    { frameWidth: 155, frameHeight: 190 });
  this.load.spritesheet('hero_tank_dandan_attack', 'assets/hero_tank_dandan_attack.png',
    { frameWidth: 229, frameHeight: 196 });
  this.load.spritesheet('hero_tank_dandan_skill',  'assets/hero_tank_dandan_skill.png',
    { frameWidth: 210, frameHeight: 327 });
  // 응급할배 (healer_grandpa, MYTHIC 완전 힐러 — '공격'이 회복)
  this.load.spritesheet('hero_healer_grandpa_idle',   'assets/hero_healer_grandpa_idle.png',
    { frameWidth: 142, frameHeight: 184 });
  this.load.spritesheet('hero_healer_grandpa_walk',   'assets/hero_healer_grandpa_walk.png',
    { frameWidth: 146, frameHeight: 175 });
  this.load.spritesheet('hero_healer_grandpa_attack', 'assets/hero_healer_grandpa_attack.png',
    { frameWidth: 159, frameHeight: 178 });
  this.load.spritesheet('hero_healer_grandpa_skill',  'assets/hero_healer_grandpa_skill.png',
    { frameWidth: 173, frameHeight: 183 });
  // 악흑의 기사 (warrior_dark, EXOTIC 정통 탄탄 기사 — 특수 메커닉 없음)
  this.load.spritesheet('hero_warrior_dark_idle',   'assets/hero_warrior_dark_idle.png',
    { frameWidth: 145, frameHeight: 217 });
  this.load.spritesheet('hero_warrior_dark_walk',   'assets/hero_warrior_dark_walk.png',
    { frameWidth: 149, frameHeight: 204 });
  this.load.spritesheet('hero_warrior_dark_attack', 'assets/hero_warrior_dark_attack.png',
    { frameWidth: 263, frameHeight: 210 });
  this.load.spritesheet('hero_warrior_dark_skill',  'assets/hero_warrior_dark_skill.png',
    { frameWidth: 281, frameHeight: 269 });
  // 산적 (warrior_bandit, COMMON 최약체 + 타격당 골드 획득)
  this.load.spritesheet('hero_warrior_bandit_idle',   'assets/hero_warrior_bandit_idle.png',
    { frameWidth: 143, frameHeight: 176 });
  this.load.spritesheet('hero_warrior_bandit_walk',   'assets/hero_warrior_bandit_walk.png',
    { frameWidth: 148, frameHeight: 166 });
  this.load.spritesheet('hero_warrior_bandit_attack', 'assets/hero_warrior_bandit_attack.png',
    { frameWidth: 162, frameHeight: 167 });
  this.load.spritesheet('hero_warrior_bandit_skill',  'assets/hero_warrior_bandit_skill.png',
    { frameWidth: 175, frameHeight: 177 });
  // 원샷원킬 (archer_oneshot, UNCOMMON 매우 느린 강타 ranged)
  this.load.spritesheet('hero_archer_oneshot_idle',   'assets/hero_archer_oneshot_idle.png',
    { frameWidth: 133, frameHeight: 201 });
  this.load.spritesheet('hero_archer_oneshot_walk',   'assets/hero_archer_oneshot_walk.png',
    { frameWidth: 136, frameHeight: 188 });
  this.load.spritesheet('hero_archer_oneshot_attack', 'assets/hero_archer_oneshot_attack.png',
    { frameWidth: 209, frameHeight: 190 });
  this.load.spritesheet('hero_archer_oneshot_skill',  'assets/hero_archer_oneshot_skill.png',
    { frameWidth: 238, frameHeight: 196 });
  // 폭탄중독병 (mage_bomber, UNCOMMON 느린 광역 폭탄 던지기)
  this.load.spritesheet('hero_mage_bomber_idle',   'assets/hero_mage_bomber_idle.png',
    { frameWidth: 145, frameHeight: 165 });
  this.load.spritesheet('hero_mage_bomber_walk',   'assets/hero_mage_bomber_walk.png',
    { frameWidth: 150, frameHeight: 156 });
  this.load.spritesheet('hero_mage_bomber_attack', 'assets/hero_mage_bomber_attack.png',
    { frameWidth: 167, frameHeight: 158 });
  this.load.spritesheet('hero_mage_bomber_skill',  'assets/hero_mage_bomber_skill.png',
    { frameWidth: 176, frameHeight: 164 });
  // 흑마법사 (mage_dark, RARE 전체 필드 검은 빔 — 약한 단발 single-target)
  this.load.spritesheet('hero_mage_dark_idle',   'assets/hero_mage_dark_idle.png',
    { frameWidth: 141, frameHeight: 209 });
  this.load.spritesheet('hero_mage_dark_walk',   'assets/hero_mage_dark_walk.png',
    { frameWidth: 147, frameHeight: 216 });
  this.load.spritesheet('hero_mage_dark_attack', 'assets/hero_mage_dark_attack.png',
    { frameWidth: 235, frameHeight: 225 });
  this.load.spritesheet('hero_mage_dark_skill',  'assets/hero_mage_dark_skill.png',
    { frameWidth: 233, frameHeight: 246 });
  // 영웅 공용 die anim (묘비 변환) — 모든 영웅이 같은 sprite sheet 공유
  this.load.spritesheet('hero_shared_die', 'assets/hero_shared_die.png',
    { frameWidth: 111, frameHeight: 167 });
  this.load.image('grass_bg', 'assets/grass_bg.png');
  // Layer Lab GUI sprites
  this.load.image('ui_panel_pill', 'assets/ui/panel_pill.png');
  this.load.image('ui_btn_purple', 'assets/ui/btn_purple.png');                              // 주점 영입 버튼 (Layer Lab K-230 보라)
  this.load.image('ui_btn_yellow', 'assets/ui/btn_yellow.png');                              // 카드 "선택" 노란 버튼 (Layer Lab K-229 __09)
  this.load.image('ui_btn_ad_green', 'assets/ui/btn_ad_green.png');                          // (legacy) K-231 광고 버튼
  this.load.image('ui_icon_ad_video', 'assets/ui/icon_ad_video.png');                        // 광고 영상 클래퍼 아이콘 (Layer Lab ItemIcon_Video)
  this.load.image('ui_popup_purple', 'assets/ui/popup_purple.png');                          // 주점 팝업 BG (Layer Lab K-346, X 버튼 베이크)
  this.load.image('ui_card_back', 'assets/ui/card_back.png');                                // 영웅 카드 뒷면 (Layer Lab K-268)
  this.load.image('ui_slider_bg', 'assets/ui/slider_bg.png');
  this.load.image('ui_slider_fill_blue', 'assets/ui/slider_fill_blue.png');
  this.load.image('ui_btn_circle', 'assets/ui/btn_circle.png');
  this.load.image('ui_btn_round', 'assets/ui/btn_round.png');
  this.load.image('ui_stage_bar_bg', 'assets/ui/stage_bar_bg.png');
  this.load.image('ui_stage_diamond_blue', 'assets/ui/stage_diamond_blue.png');
  this.load.image('ui_stage_diamond_yellow', 'assets/ui/stage_diamond_yellow.png');
  this.load.image('ui_stage_diamond_gray', 'assets/ui/stage_diamond_gray.png');
  this.load.image('ui_icon_boss_skull', 'assets/ui/icon_boss_skull.png');
  this.load.image('ui_title_divider_left', 'assets/ui/title_divider_left.png');
  this.load.image('ui_title_divider_right', 'assets/ui/title_divider_right.png');
  this.load.image('ui_rb_bg', 'assets/ui/rb_bg.png');
  this.load.image('ui_rb_btn_pink', 'assets/ui/rb_btn_pink.png');
  this.load.image('ui_rb_btn_yellow', 'assets/ui/rb_btn_yellow.png');
  this.load.image('ui_rb_btn_plus_yellow', 'assets/ui/rb_btn_plus_yellow.png');
  this.load.image('ui_rb_btn_plus_purple', 'assets/ui/rb_btn_plus_purple.png');
  this.load.image('ui_rb_icon_coin', 'assets/ui/rb_icon_coin.png');
  this.load.image('ui_rb_icon_gem', 'assets/ui/rb_icon_gem.png');
  this.load.image('ui_icon_trophy', 'assets/ui/icon_trophy.png');
  this.load.image('ui_icon_castle', 'assets/ui/icon_castle.png');
  this.load.image('ui_tab_icon_hero', 'assets/ui/tab_icon_hero.png?v=' + Date.now());
  this.load.image('ui_tab_icon_training', 'assets/ui/tab_icon_training.png');
  this.load.image('ui_tab_icon_dungeon', 'assets/ui/tab_icon_dungeon.png');
  this.load.image('ui_tab_icon_shop', 'assets/ui/tab_icon_shop.png');
  // 활성 탭이고 패널 열린 동안 X 아이콘으로 swap
  this.load.image('ui_icon_close', 'assets/ui/icon_close.png');
  // 영웅 디테일 팝업 — Layer Lab Button sprite (tint로 색 변경)
  this.load.image('ui_btn_capsule_white', 'assets/ui/btn_capsule_white.png'); // Button_Round06_White
  this.load.image('ui_btn_chip_dark', 'assets/ui/btn_chip_dark.png');         // Button_Round03_Dark
  this.load.image('ui_btn_chip_white', 'assets/ui/btn_chip_white.png');       // Button_Round03_WhiteBg
  // 영웅 디테일 모달 — Layer Lab UI 리소스/우선 사용
  // openHeroDetailPanel()에서 def.rarity에 따라 RARITY_MODAL_BG_SPRITE로 선택
  // 백판 sprite는 우상단 X 버튼 포함, 상단 그라데이션 + 하단 흰 영역
  this.load.image('ui_hero_modal_bg_common',    'assets/ui/hero_modal_bg_common.png');    // K-327 다크그레이
  this.load.image('ui_hero_modal_bg_uncommon',  'assets/ui/hero_modal_bg_uncommon.png');  // K-328 초록
  this.load.image('ui_hero_modal_bg_rare',      'assets/ui/hero_modal_bg_rare.png');      // K-326 파랑
  this.load.image('ui_hero_modal_bg_epic',      'assets/ui/hero_modal_bg_epic.png');      // K-329 보라
  this.load.image('ui_hero_modal_bg_legendary', 'assets/ui/hero_modal_bg_legendary.png'); // K-331 노랑
  this.load.image('ui_hero_modal_bg_mythic',    'assets/ui/hero_modal_bg_mythic.png');    // K-330 빨강
  this.load.image('ui_hero_modal_bg_exotic',    'assets/ui/hero_modal_bg_exotic.png');    // K-332 실버
  this.load.image('ui_hero_btn_register',   'assets/ui/hero_btn_register.png');           // 초록 (영웅 등록) — K-229 시리즈
  this.load.image('ui_hero_btn_unregister', 'assets/ui/hero_btn_unregister.png');         // 빨강 (영웅 해제)
  this.load.image('ui_stat_chip',           'assets/ui/stat_chip.png');                   // 능력치 칸 (회청색 둥근 사각형) — 우선 사용
  this.load.image('ui_stat_icon_hp',        'assets/ui/stat_icon_hp.png');                // 체력 아이콘 (Layer Lab ItemIcon_Heart_Red)
  this.load.image('ui_stat_icon_atk',       'assets/ui/stat_icon_atk.png');               // 공격력 아이콘 (Layer Lab ItemIcon_Gear_Sword)
  this.load.image('ui_stat_icon_def',       'assets/ui/stat_icon_def.png');               // 방어력 아이콘 (Layer Lab IconMisc Icon_Shield)
  this.load.image('ui_stat_icon_respawn',   'assets/ui/stat_icon_respawn.png');           // 부활 쿨타임 아이콘 (Layer Lab IconMisc Icon_Timer)
  this.load.image('ui_stat_icon_movspd',    'assets/ui/stat_icon_movspd.png');            // 이동속도 아이콘 (Layer Lab ItemIcon_Gear_Boots)
  this.load.image('ui_stat_icon_atkspd',    'assets/ui/stat_icon_atkspd.png');            // 공격속도 아이콘 (Layer Lab IconMisc Icon_Sword02)
  this.load.image('ui_stat_icon_range',     'assets/ui/stat_icon_range.png');             // 사거리 아이콘 (AI bow + arrow)
  this.load.image('ui_stat_icon_detect',    'assets/ui/stat_icon_detect.png');            // 감지범위 아이콘 (AI telescope)
  this.load.image('ui_inv_card_bg_common',    'assets/ui/inv_card_bg_common.png');         // 인벤토리 카드 BG — 등급별
  this.load.image('ui_inv_card_bg_uncommon',  'assets/ui/inv_card_bg_uncommon.png');
  this.load.image('ui_inv_card_bg_rare',      'assets/ui/inv_card_bg_rare.png');
  this.load.image('ui_inv_card_bg_epic',      'assets/ui/inv_card_bg_epic.png');
  this.load.image('ui_inv_card_bg_legendary', 'assets/ui/inv_card_bg_legendary.png');
  this.load.image('ui_inv_card_bg_mythic',    'assets/ui/inv_card_bg_mythic.png');
  this.load.image('ui_inv_card_bg_exotic',    'assets/ui/inv_card_bg_exotic.png');
  this.load.image('ui_hero_slot_main',      'assets/ui/hero_slot_main.png');              // (legacy 단일 sprite, 미사용)
  // 영웅 상세창 portrait BG — 등급별 K-276 시리즈
  this.load.image('ui_hero_slot_main_common',    'assets/ui/hero_slot_main_common.png');
  this.load.image('ui_hero_slot_main_uncommon',  'assets/ui/hero_slot_main_uncommon.png');
  this.load.image('ui_hero_slot_main_rare',      'assets/ui/hero_slot_main_rare.png');
  this.load.image('ui_hero_slot_main_epic',      'assets/ui/hero_slot_main_epic.png');
  this.load.image('ui_hero_slot_main_legendary', 'assets/ui/hero_slot_main_legendary.png');
  this.load.image('ui_hero_slot_main_mythic',    'assets/ui/hero_slot_main_mythic.png');
  this.load.image('ui_hero_slot_main_exotic',    'assets/ui/hero_slot_main_exotic.png');
  // 영웅 등급 라벨 sprite (RARITY_LABEL_SPRITE 매핑) — 사용자 직접 분리본
  this.load.image('ui_rarity_common',    'assets/ui/rarity_label_common.png');
  this.load.image('ui_rarity_uncommon',  'assets/ui/rarity_label_uncommon.png');
  this.load.image('ui_rarity_rare',      'assets/ui/rarity_label_rare.png');
  this.load.image('ui_rarity_epic',      'assets/ui/rarity_label_epic.png');
  this.load.image('ui_rarity_legendary', 'assets/ui/rarity_label_legendary.png');
  this.load.image('ui_rarity_mythic',    'assets/ui/rarity_label_mythic.png');
  this.load.image('ui_rarity_exotic',    'assets/ui/rarity_label_exotic.png');
  // Layer Lab Menu_BottomBtn — 하단 탭바 BG + active 하이라이트
  this.load.image('ui_menu_bottom_bg', 'assets/ui/menu_bottom_bg.png');
  this.load.image('ui_menu_bottom_focus', 'assets/ui/menu_bottom_focus.png');
  this.load.image('ui_menu_bottom_focus_light', 'assets/ui/menu_bottom_focus_light.png');
  // Layer Lab ActionText_Go — 스테이지 시작 GO! 스프라이트
  this.load.image('ui_action_go', 'assets/ui/action_go.png');
  // Layer Lab PictoIcon_Meal — 주점(tavern) 아이콘
  this.load.image('ui_icon_tavern', 'assets/ui/icon_tavern.png');
  // Layer Lab BubbleFrame04_White — 주점 위 말풍선
  this.load.image('ui_bubble_bg', 'assets/ui/bubble_bg.png');
  this.load.image('ui_bubble_arrow', 'assets/ui/bubble_arrow.png');
  this.load.image('ui_hero_slot_bg', 'assets/ui/hero_slot_bg.png');
  this.load.image('ui_hero_slot_bg_active', 'assets/ui/hero_slot_bg_active.png');
  this.load.image('ui_hud_slot_active_bg', 'assets/ui/hud_slot_active_bg.png');           // HUD 배치 슬롯 BG (Layer Lab K-277, deprecated)
  this.load.image('ui_hud_slot_bg_common',    'assets/ui/hud_slot_bg_common.png');         // HUD 배치 슬롯 BG — 등급별 (Layer Lab K-276)
  this.load.image('ui_hud_slot_bg_uncommon',  'assets/ui/hud_slot_bg_uncommon.png');
  this.load.image('ui_hud_slot_bg_rare',      'assets/ui/hud_slot_bg_rare.png');
  this.load.image('ui_hud_slot_bg_epic',      'assets/ui/hud_slot_bg_epic.png');
  this.load.image('ui_hud_slot_bg_legendary', 'assets/ui/hud_slot_bg_legendary.png');
  this.load.image('ui_hud_slot_bg_mythic',    'assets/ui/hud_slot_bg_mythic.png');
  this.load.image('ui_hud_slot_bg_exotic',    'assets/ui/hud_slot_bg_exotic.png');
  this.load.image('ui_red_dot',               'assets/ui/red_dot.png');                   // 알림 레드닷 (Layer Lab K-359) — 두 가지 사이즈: 숫자 있는 큰 버전 / 숫자 없는 작은 버전
  this.load.image('ui_icon_population',       'assets/ui/icon_population.png?v=' + Date.now()); // 인구 아이콘 (귀여운 소년 얼굴, 캐시버스터)
  this.load.image('ui_stat_card_bg',          'assets/ui/stat_card_bg.png');              // 내정 영역별 카드 BG (Layer Lab K-273) — 3x2 그리드
  this.load.image('ui_pill_dark',             'assets/ui/pill_dark.png');                 // 어두운 알약 배경 (Layer Lab K-241) — 인구 카운터 등
  this.load.image('ui_btn_plus',              'assets/ui/btn_plus.png');                  // 초록 +1 버튼 (K-267 hue shift)
  this.load.image('ui_btn_minus',             'assets/ui/btn_minus.png');                 // 빨강 -1 버튼 (K-267 hue shift)
  this.load.image('ui_icon_bldg_training',    'assets/ui/icon_bldg_training.png?v=' + Date.now()); // 훈련소 (보라 지붕 아처리)
  this.load.image('ui_icon_bldg_heroDef',     'assets/ui/icon_bldg_heroDef.png?v=' + Date.now());  // 수련관
  this.load.image('ui_icon_bldg_def',         'assets/ui/icon_bldg_def.png?v=' + Date.now());      // 성 내구도 (대장간/요새)
  this.load.image('ui_icon_bldg_hp',          'assets/ui/icon_bldg_hp.png?v=' + Date.now());       // 성벽 증축 (성문 + 두 첨탑)
  this.load.image('ui_icon_bldg_respawn',     'assets/ui/icon_bldg_respawn.png?v=' + Date.now());  // 신전
  this.load.image('ui_icon_bldg_gold',        'assets/ui/icon_bldg_gold.png?v=' + Date.now());     // 시장 (초록 텐트)
  this.load.image('ui_train_row_bg',          'assets/ui/train_row_bg.png');               // 훈련 영역 행 BG (Layer Lab K-279, 블루 pill)
  this.load.image('ui_btn_train_upgrade',     'assets/ui/btn_train_upgrade.png');          // 강화 버튼 (Layer Lab K-229 노란 pill)
  this.load.image('ui_toast_bg',              'assets/ui/toast_bg.png');                   // 토스트 메세지 BG (Layer Lab K-369 다크 네이비 바)
  this.load.image('ui_timer_pill_bg',         'assets/ui/timer_pill_bg.png');              // 보스 타이머 BG (Layer Lab K-241)
  this.load.image('ui_icon_timer',            'assets/ui/icon_timer.png');                 // 보스 타이머 시계 아이콘 (Layer Lab Icon_Timer)
  this.load.image('ui_ribbon_blue',           'assets/ui/ribbon_blue.png');                // (legacy) 좁은 리본
  this.load.image('ui_ribbon_red',            'assets/ui/ribbon_red.png');                 // (legacy)
  this.load.image('ui_ribbon_wide_blue',      'assets/ui/ribbon_wide_blue.png');           // 보스 승리 와이드 리본 (Layer Lab K-311 __00)
  this.load.image('ui_ribbon_wide_red',       'assets/ui/ribbon_wide_red.png');            // 보스 패배 와이드 리본 (Layer Lab K-311 __03)
  this.load.image('ui_badge_victory',         'assets/ui/badge_victory.png');              // 승리 타이틀 배지 (왕관+날개)
  this.load.image('ui_badge_victory_swords',  'assets/ui/badge_victory_swords.png');       // 승리 배지 위 검 X 크레스트 (Wing2)
  this.load.image('ui_effect_light_badge',    'assets/ui/effect_light_badge.png');         // 승리 배지 뒤 빛 이펙트 (Layer Lab Effect_Light03)
  this.load.image('ui_effect_papers',         'assets/ui/effect_papers.png');              // 영웅 획득 컨페티 (Layer Lab Image_Papers)
  this.load.image('ui_badge_defeat',          'assets/ui/badge_defeat.png');               // 패배 타이틀 배지 (해골+묘비)
  // 보상 슬롯 BG — 전체 규칙: 골드는 흰색, 보석은 보라색 (Layer Lab K-275)
  this.load.image('ui_reward_slot_gold',      'assets/ui/reward_slot_gold.png');
  this.load.image('ui_reward_slot_gem',       'assets/ui/reward_slot_gem.png');
  // Layer Lab ResourceBar_White_Btn1 — 4_Play_UI_Idle 데모의 하단 슬롯 sprite (검은 외곽 내장)
  this.load.image('ui_rb_slot_white', 'assets/ui/rb_btn_white1.png');
  // Layer Lab SkillFrame_l~m_Empty — Unity prefab SkillFrame_l_Empty 그대로 (사용자 레퍼런스)
  this.load.image('ui_skill_frame_empty', 'assets/ui/skill_frame_empty.png');
  this.load.image('ui_icon_lock', 'assets/ui/icon_lock.png');
  this.load.image('ui_exp_fill_orange', 'assets/ui/exp_fill_orange.png');
  this.load.image('ui_profile_frame', 'assets/ui/profile_frame.png');
  this.load.image('ui_profile_frame_inner', 'assets/ui/profile_frame_inner.png');
  this.load.image('ui_profile_face', 'assets/ui/profile_face.png');
  // Layer Lab GradeIcon_Star — 카드 등급 별 (s_Yellow 일반, s_Premium은 EXOTIC)
  this.load.image('ui_star_yellow', 'assets/ui/star_yellow.png');
  this.load.image('ui_star_premium', 'assets/ui/star_premium.png');
  // Layer Lab PictoIcon — 클래스 마크 (128px)
  this.load.image('ui_class_warrior', 'assets/ui/class_warrior.png?v=' + Date.now());
  this.load.image('ui_class_archer', 'assets/ui/class_archer.png?v=' + Date.now());
  this.load.image('ui_class_mage', 'assets/ui/class_mage.png?v=' + Date.now());
  this.load.image('ui_class_tank', 'assets/ui/class_tank.png?v=' + Date.now());
  this.load.image('ui_class_assassin', 'assets/ui/class_assassin.png?v=' + Date.now());
  // 카드 좌하단 강화 레벨 배경 — Layer Lab Slider_Level02_Icon_Badge_Blue (정확히 사용자가 원한 방패 chip)
  this.load.image('ui_level_badge', 'assets/ui/level_badge.png');
  // 카드 우상단 배치 표시 체크 (Alert_Circle_l_Bg/Border + Icon_Check02 조합)
  this.load.image('ui_check_chip_bg', 'assets/ui/check_chip_bg.png');
  this.load.image('ui_check_chip_border', 'assets/ui/check_chip_border.png');
  this.load.image('ui_icon_check', 'assets/ui/icon_check.png');
  // 헤더 좌상단 아이콘 (Layer Lab sprite)
  this.load.image('ui_header_icon_hero', 'assets/ui/header_icon_hero.png');         // Icon_Helmet (영웅 인벤)
  this.load.image('ui_header_icon_castle', 'assets/ui/header_icon_castle.png');     // Icon_Castle (내정)
  this.load.image('ui_header_icon_training', 'assets/ui/header_icon_training.png'); // PictoIcon_Sword_2 (훈련)
  // Layer Lab ItemFrame01_Single — 등급별 HUD 슬롯 BG (볼록 + outline + highlight)
  this.load.image('ui_slot_common',    'assets/ui/slot_common.png');
  this.load.image('ui_slot_uncommon',  'assets/ui/slot_uncommon.png');
  this.load.image('ui_slot_rare',      'assets/ui/slot_rare.png');
  this.load.image('ui_slot_epic',      'assets/ui/slot_epic.png');
  this.load.image('ui_slot_legendary', 'assets/ui/slot_legendary.png');
  this.load.image('ui_slot_mythic',    'assets/ui/slot_mythic.png');
  this.load.image('ui_slot_exotic',    'assets/ui/slot_exotic.png');
  // 유저 프로필 초상 (43종) — 모든 유저 디폴트는 portrait_01
  for (let i = 1; i <= 43; i++) {
    const id = String(i).padStart(2, '0');
    this.load.image(`portrait_${id}`, `assets/portraits/LordPortrait_${id}.png`);
  }
  // BGM — 필드 화면 공용 (사막 등 다른 환경도 추후 분기)
  this.load.audio('bgm_field', 'assets/audio/bgm_field.mp3');
}

// 고해상도 2D 일러스트(SD 캐주얼 스타일)용 mipmap.
// POT 텍스처(512, 256 등)에 mipmap 생성 → 작은 displaySize로 줄여 그릴 때
// 자글거림 거의 없이 LINEAR 다운샘플 가능. 우르르 용병단 같은 부드러운 SD 룩의 핵심.
function enableMipmap(scene, keys) {
  const renderer = scene.game.renderer;
  keys.forEach((key) => {
    // 안전망 1: Phaser API로 LINEAR 명시 (mipmap 실패해도 부드럽게)
    try {
      const tex = scene.textures.get(key);
      if (tex && tex.setFilter) {
        tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
      }
    } catch (e) {}
    // 안전망 2: WebGL mipmap 생성 (정상 동작 시 더 부드러운 다운샘플)
    if (!renderer || !renderer.gl) return;
    const gl = renderer.gl;
    try {
      const tex = scene.textures.get(key);
      if (!tex || !tex.source || !tex.source[0]) return;
      let glTex = tex.source[0].glTexture;
      if (!glTex) return;
      if (glTex.webGLTexture) glTex = glTex.webGLTexture;
      gl.bindTexture(gl.TEXTURE_2D, glTex);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.bindTexture(gl.TEXTURE_2D, null);
    } catch (e) {
      console.warn(`[mipmap] failed for ${key}:`, e);
    }
  });
}

new Phaser.Game(config);

// === Save / load ===========================================================

function saveGame(scene) {
  const inv = scene.heroInventory || {};
  const inventory = Object.values(inv).map((e) => ({
    heroId: e.heroId,
    enhance: clampEnhance(e.enhance),
    deployedSlot: (typeof e.deployedSlot === 'number') ? e.deployedSlot : null,
  }));
  const data = {
    schemaVersion: SAVE_SCHEMA,
    inventory, gold, gems, stage, kills,
    castleLevel, castleExp, castleNickname,
    castleStatAtk, castleStatDef, castleStatHp, castleStatPoints,
    castleStatHeroDef, castleStatRespawn, castleStatGold,
    autoBossSummon,
    classTrainLevels: classTrainLevels || makeEmptyClassTrain(),
    tavernFreeStock, tavernNextRefillAt, tavernResetDay,
    totalSummons, guideStep,
    claimedStageRewards: Array.from(claimedStageRewards || []),
    userProfileKey: scene.userProfileKey || null,
    playerId: scene.playerId || null,
    totalGoldSpent, totalGemsSpent,
    tutorialDone,
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); }
  catch (e) { console.warn('save failed', e); }
}

function clampEnhance(n) {
  const v = Math.floor(n);
  if (!Number.isFinite(v) || v < 0) return 0;
  return Math.min(ENHANCE_CAP, v);
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw);
    // v11 마이그레이션: classTrainLevels 추가만
    const v11 = localStorage.getItem(SAVE_KEY_LEGACY_V11);
    if (v11) {
      const old = JSON.parse(v11);
      if (old && Array.isArray(old.inventory)) {
        old.classTrainLevels = makeEmptyClassTrain();
        old.schemaVersion = SAVE_SCHEMA;
        return old;
      }
    }
    // v10 마이그레이션: inventory[].level → enhance, classTrainLevels 추가
    const v10 = localStorage.getItem(SAVE_KEY_LEGACY_V10);
    if (v10) {
      const old = JSON.parse(v10);
      if (old && Array.isArray(old.inventory)) {
        old.inventory = old.inventory.map((e) => ({
          heroId: e.heroId,
          enhance: clampEnhance((e.level || 1) - 1),
          deployedSlot: (typeof e.deployedSlot === 'number') ? e.deployedSlot : null,
        }));
        old.classTrainLevels = makeEmptyClassTrain();
        old.schemaVersion = SAVE_SCHEMA;
        return old;
      }
    }
    // v9 마이그레이션: roster[] → inventory[], level → enhance
    const v9 = localStorage.getItem(SAVE_KEY_LEGACY_V9);
    if (v9) {
      const old = JSON.parse(v9);
      if (old && Array.isArray(old.roster)) {
        old.inventory = old.roster.map((r) => ({
          heroId: r.heroId,
          enhance: clampEnhance((r.level || 1) - 1),
          deployedSlot: (typeof r.slotIndex === 'number') ? r.slotIndex : null,
        }));
        old.classTrainLevels = makeEmptyClassTrain();
        old.schemaVersion = SAVE_SCHEMA;
        return old;
      }
    }
    return null;
  } catch (e) { return null; }
}

// === SFX synthesizer (Web Audio API) =======================================
// 외부 파일 없이 런타임 합성 — 공격/타격/피격 기본 효과음. BGM과는 별도 컨텍스트.
let _sfxCtx = null, _sfxMaster = null;
const _sfxLastAt = {};
function _ensureSfxCtx() {
  if (!_sfxCtx) {
    try {
      _sfxCtx = new (window.AudioContext || window.webkitAudioContext)();
      _sfxMaster = _sfxCtx.createGain();
      _sfxMaster.gain.value = 0.5;
      _sfxMaster.connect(_sfxCtx.destination);
    } catch (e) { return null; }
  }
  if (_sfxCtx.state === 'suspended') { try { _sfxCtx.resume(); } catch (e) {} }
  return _sfxCtx;
}
function _sfxThrottle(key, minGapMs) {
  const now = performance.now();
  if (_sfxLastAt[key] && now - _sfxLastAt[key] < minGapMs) return false;
  _sfxLastAt[key] = now;
  return true;
}
function _sfxNoiseBuffer(ctx, durSec, decayPow) {
  const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * durSec)), ctx.sampleRate);
  const data = buf.getChannelData(0);
  const n = data.length;
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decayPow);
  return buf;
}
// 근접 휘두름 — 짧고 하강하는 톤 (whoosh)
function playSfxSwing() {
  const ctx = _ensureSfxCtx(); if (!ctx) return;
  if (!_sfxThrottle('swing', 35)) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(620, t);
  osc.frequency.exponentialRampToValueAtTime(140, t + 0.12);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.18, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
  osc.connect(lp).connect(g).connect(_sfxMaster);
  osc.start(t); osc.stop(t + 0.14);
}
// 화살 — 짧고 높은 휙
function playSfxArrow() {
  const ctx = _ensureSfxCtx(); if (!ctx) return;
  if (!_sfxThrottle('arrow', 30)) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(1500, t);
  osc.frequency.exponentialRampToValueAtTime(420, t + 0.08);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.14, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
  osc.connect(g).connect(_sfxMaster);
  osc.start(t); osc.stop(t + 0.1);
}
// 마법 — shimmery (오버레이된 사인파 3개, freq 상승)
function playSfxMagic() {
  const ctx = _ensureSfxCtx(); if (!ctx) return;
  if (!_sfxThrottle('magic', 40)) return;
  const t = ctx.currentTime;
  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    const f0 = 520 + i * 180;
    osc.frequency.setValueAtTime(f0, t + i * 0.018);
    osc.frequency.exponentialRampToValueAtTime(f0 * 2.6, t + 0.18 + i * 0.018);
    g.gain.setValueAtTime(0, t + i * 0.018);
    g.gain.linearRampToValueAtTime(0.07, t + 0.03 + i * 0.018);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22 + i * 0.018);
    osc.connect(g).connect(_sfxMaster);
    osc.start(t + i * 0.018); osc.stop(t + 0.24 + i * 0.018);
  }
}
// 타격 — 노이즈 burst + low thump (퍽)
function playSfxHit() {
  const ctx = _ensureSfxCtx(); if (!ctx) return;
  if (!_sfxThrottle('hit', 25)) return;
  const t = ctx.currentTime;
  const noise = ctx.createBufferSource();
  noise.buffer = _sfxNoiseBuffer(ctx, 0.08, 2);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100;
  const nG = ctx.createGain(); nG.gain.value = 0.32;
  noise.connect(lp).connect(nG).connect(_sfxMaster);
  noise.start(t); noise.stop(t + 0.08);
  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(140, t);
  sub.frequency.exponentialRampToValueAtTime(55, t + 0.09);
  const sG = ctx.createGain();
  sG.gain.setValueAtTime(0.38, t);
  sG.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  sub.connect(sG).connect(_sfxMaster);
  sub.start(t); sub.stop(t + 0.11);
}
// 영웅 피격 — 더 강한 thump (어둡고 거칠음)
function playSfxHurt() {
  const ctx = _ensureSfxCtx(); if (!ctx) return;
  if (!_sfxThrottle('hurt', 35)) return;
  const t = ctx.currentTime;
  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(200, t);
  sub.frequency.exponentialRampToValueAtTime(45, t + 0.18);
  const sG = ctx.createGain();
  sG.gain.setValueAtTime(0.45, t);
  sG.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  sub.connect(sG).connect(_sfxMaster);
  sub.start(t); sub.stop(t + 0.2);
  const noise = ctx.createBufferSource();
  noise.buffer = _sfxNoiseBuffer(ctx, 0.06, 1.6);
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 380; bp.Q.value = 1.4;
  const nG = ctx.createGain(); nG.gain.value = 0.28;
  noise.connect(bp).connect(nG).connect(_sfxMaster);
  noise.start(t); noise.stop(t + 0.06);
}
// 성 피격 — 묵직하고 긴 둔탁음
function playSfxCastleHit() {
  const ctx = _ensureSfxCtx(); if (!ctx) return;
  if (!_sfxThrottle('castleHit', 60)) return;
  const t = ctx.currentTime;
  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(95, t);
  sub.frequency.exponentialRampToValueAtTime(30, t + 0.32);
  const sG = ctx.createGain();
  sG.gain.setValueAtTime(0.55, t);
  sG.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  sub.connect(sG).connect(_sfxMaster);
  sub.start(t); sub.stop(t + 0.35);
  const noise = ctx.createBufferSource();
  noise.buffer = _sfxNoiseBuffer(ctx, 0.18, 2.5);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 550;
  const nG = ctx.createGain(); nG.gain.value = 0.32;
  noise.connect(lp).connect(nG).connect(_sfxMaster);
  noise.start(t); noise.stop(t + 0.18);
}

// === Scene lifecycle =======================================================

function create() {
  // 카메라 zoom 2x로 인한 텍스트 업스케일 흐림 방지 — 모든 text의 기본 resolution을 2로 설정.
  // Phaser는 텍스트를 텍스처로 한 번 그린 뒤 GPU로 확대 표시하므로, resolution=2면
  // 텍스처가 2배 밀도로 생성되어 카메라 zoom 후에도 1:1 매핑이 되어 sharp.
  const _origAddText = this.add.text.bind(this.add);
  this.add.text = function (x, y, content, style) {
    style = style || {};
    if (style.resolution === undefined) style.resolution = 2;
    return _origAddText(x, y, content, style);
  };

  // 필드 BGM — 루프, restart 시 재중복 없이 한 번만. 추후 사막/지역별 분기 시 키 교체.
  // 브라우저 autoplay 정책: 첫 user gesture(클릭/터치) 후에야 sound.unlock + play 동작.
  // 로비 BGM이 살아있으면 페이드 아웃으로 부드럽게 끄고 필드 BGM 페이드 인.
  try {
    const lobbyBgm = this.sound.get('bgm_lobby');
    if (lobbyBgm && lobbyBgm.isPlaying) {
      const startV = lobbyBgm.volume;
      this.tweens.addCounter({
        from: startV, to: 0, duration: 700,
        onUpdate: (tween) => { try { lobbyBgm.setVolume(tween.getValue()); } catch (e) {} },
        onComplete: () => { try { lobbyBgm.stop(); } catch (e) {} },
      });
    }

    const FIELD_BGM_VOL = 0.55;
    let bgm = this.sound.get('bgm_field');
    if (!bgm) bgm = this.sound.add('bgm_field', { loop: true, volume: 0 });
    if (!bgm.isPlaying) {
      const start = () => {
        try { bgm.setVolume(0); } catch (e) {}
        if (!bgm.isPlaying) bgm.play();
        this.tweens.addCounter({
          from: 0, to: FIELD_BGM_VOL, duration: 900,
          onUpdate: (tween) => { try { bgm.setVolume(tween.getValue()); } catch (e) {} },
        });
      };
      if (this.sound.locked) this.sound.once('unlocked', start); else start();
    } else {
      // restart 케이스 — 볼륨 정상화만
      try { bgm.setVolume(FIELD_BGM_VOL); } catch (e) {}
    }
  } catch (e) { console.warn('[BGM] failed', e); }

  // sprite sheet(NPOT)는 mipmap 시 WebGL1에서 incomplete → 검정 렌더링. setFilter LINEAR만 적용.
  ['hero_warrior_handsome_idle', 'hero_warrior_handsome_walk',
   'hero_warrior_handsome_attack', 'hero_warrior_handsome_skill',
   'hero_archer_robin_idle', 'hero_archer_robin_walk',
   'hero_archer_robin_attack', 'hero_archer_robin_skill',
   'hero_mage_ice_idle', 'hero_mage_ice_walk',
   'hero_mage_ice_attack', 'hero_mage_ice_skill',
   'hero_assassin_bakso_idle', 'hero_assassin_bakso_walk',
   'hero_assassin_bakso_attack', 'hero_assassin_bakso_skill',
   'hero_tank_dandan_idle', 'hero_tank_dandan_walk',
   'hero_tank_dandan_attack', 'hero_tank_dandan_skill',
   'hero_healer_grandpa_idle', 'hero_healer_grandpa_walk',
   'hero_healer_grandpa_attack', 'hero_healer_grandpa_skill',
   'hero_warrior_dark_idle', 'hero_warrior_dark_walk',
   'hero_warrior_dark_attack', 'hero_warrior_dark_skill',
   'hero_warrior_bandit_idle', 'hero_warrior_bandit_walk',
   'hero_warrior_bandit_attack', 'hero_warrior_bandit_skill',
   'hero_archer_oneshot_idle', 'hero_archer_oneshot_walk',
   'hero_archer_oneshot_attack', 'hero_archer_oneshot_skill',
   'hero_mage_bomber_idle', 'hero_mage_bomber_walk',
   'hero_mage_bomber_attack', 'hero_mage_bomber_skill',
   'hero_mage_dark_idle', 'hero_mage_dark_walk',
   'hero_mage_dark_attack', 'hero_mage_dark_skill',
   'hero_shared_die'].forEach((k) => {
    try {
      const t = this.textures.get(k);
      if (t && t.setFilter) t.setFilter(Phaser.Textures.FilterMode.LINEAR);
    } catch (e) {}
  });

  // 영웅 anim 등록 — 영웅별 idle/walk/attack/skill + 공용 die
  // 새 영웅 추가 시 HERO_ANIMS에 entry만 추가하면 됨
  const HERO_ANIMS = [
    // 미남 전사
    { key: 'warrior_handsome_idle',   sheet: 'hero_warrior_handsome_idle',   end: 5,  fps: 10, repeat: -1 },
    { key: 'warrior_handsome_walk',   sheet: 'hero_warrior_handsome_walk',   end: 6,  fps: 12, repeat: -1 },
    { key: 'warrior_handsome_attack', sheet: 'hero_warrior_handsome_attack', end: 7,  fps: 14, repeat: 0  },
    { key: 'warrior_handsome_skill',  sheet: 'hero_warrior_handsome_skill',  end: 9,  fps: 12, repeat: 0  },
    // 로빈훗
    { key: 'archer_robin_idle',       sheet: 'hero_archer_robin_idle',       end: 5,  fps: 10, repeat: -1 },
    { key: 'archer_robin_walk',       sheet: 'hero_archer_robin_walk',       end: 6,  fps: 12, repeat: -1 },
    { key: 'archer_robin_attack',     sheet: 'hero_archer_robin_attack',     end: 7,  fps: 14, repeat: 0  },
    { key: 'archer_robin_skill',      sheet: 'hero_archer_robin_skill',      end: 10, fps: 12, repeat: 0  },
    // 꽁꽁술사
    { key: 'mage_ice_idle',           sheet: 'hero_mage_ice_idle',           end: 5,  fps: 10, repeat: -1 },
    { key: 'mage_ice_walk',           sheet: 'hero_mage_ice_walk',           end: 6,  fps: 12, repeat: -1 },
    { key: 'mage_ice_attack',         sheet: 'hero_mage_ice_attack',         end: 7,  fps: 14, repeat: 0  },
    { key: 'mage_ice_skill',          sheet: 'hero_mage_ice_skill',          end: 10, fps: 12, repeat: 0  },

    { key: 'assassin_bakso_idle',     sheet: 'hero_assassin_bakso_idle',     end: 5,  fps: 10, repeat: -1 },
    { key: 'assassin_bakso_walk',     sheet: 'hero_assassin_bakso_walk',     end: 6,  fps: 18, repeat: -1 },
    { key: 'assassin_bakso_attack',   sheet: 'hero_assassin_bakso_attack',   end: 7,  fps: 18, repeat: 0  },
    { key: 'assassin_bakso_skill',    sheet: 'hero_assassin_bakso_skill',    end: 9,  fps: 14, repeat: 0  },

    // 딴딴기사 — 묵직하게 느린 호흡, 공격은 큰 swing 한 사이클
    { key: 'tank_dandan_idle',        sheet: 'hero_tank_dandan_idle',        end: 5,  fps: 8,  repeat: -1 },
    { key: 'tank_dandan_walk',        sheet: 'hero_tank_dandan_walk',        end: 6,  fps: 10, repeat: -1 },
    { key: 'tank_dandan_attack',      sheet: 'hero_tank_dandan_attack',      end: 7,  fps: 11, repeat: 0  },
    { key: 'tank_dandan_skill',       sheet: 'hero_tank_dandan_skill',       end: 9,  fps: 12, repeat: 0  },

    // 응급할배 — 차분한 idle, 가운데 빠른 캐스팅 모션
    { key: 'healer_grandpa_idle',     sheet: 'hero_healer_grandpa_idle',     end: 5,  fps: 9,  repeat: -1 },
    { key: 'healer_grandpa_walk',     sheet: 'hero_healer_grandpa_walk',     end: 6,  fps: 12, repeat: -1 },
    { key: 'healer_grandpa_attack',   sheet: 'hero_healer_grandpa_attack',   end: 7,  fps: 14, repeat: 0  },
    { key: 'healer_grandpa_skill',    sheet: 'hero_healer_grandpa_skill',    end: 9,  fps: 12, repeat: 0  },

    // 악흑의 기사 — 묵직한 전사 톤, 큰 망치 swing
    { key: 'warrior_dark_idle',       sheet: 'hero_warrior_dark_idle',       end: 5,  fps: 10, repeat: -1 },
    { key: 'warrior_dark_walk',       sheet: 'hero_warrior_dark_walk',       end: 6,  fps: 12, repeat: -1 },
    { key: 'warrior_dark_attack',     sheet: 'hero_warrior_dark_attack',     end: 7,  fps: 13, repeat: 0  },
    { key: 'warrior_dark_skill',      sheet: 'hero_warrior_dark_skill',      end: 9,  fps: 12, repeat: 0  },

    // 산적 — 잰걸음, 빠른 잽 같은 attack
    { key: 'warrior_bandit_idle',     sheet: 'hero_warrior_bandit_idle',     end: 5,  fps: 10, repeat: -1 },
    { key: 'warrior_bandit_walk',     sheet: 'hero_warrior_bandit_walk',     end: 6,  fps: 14, repeat: -1 },
    { key: 'warrior_bandit_attack',   sheet: 'hero_warrior_bandit_attack',   end: 7,  fps: 16, repeat: 0  },
    { key: 'warrior_bandit_skill',    sheet: 'hero_warrior_bandit_skill',    end: 9,  fps: 13, repeat: 0  },

    // 원샷원킬 — 느린 호흡, 천천히 당겼다 쏘는 attack
    { key: 'archer_oneshot_idle',     sheet: 'hero_archer_oneshot_idle',     end: 5,  fps: 9,  repeat: -1 },
    { key: 'archer_oneshot_walk',     sheet: 'hero_archer_oneshot_walk',     end: 6,  fps: 11, repeat: -1 },
    { key: 'archer_oneshot_attack',   sheet: 'hero_archer_oneshot_attack',   end: 7,  fps: 10, repeat: 0  },
    { key: 'archer_oneshot_skill',    sheet: 'hero_archer_oneshot_skill',    end: 9,  fps: 12, repeat: 0  },

    // 폭탄중독병 — 느린 호흡, 폭탄 던지는 throw 모션
    { key: 'mage_bomber_idle',        sheet: 'hero_mage_bomber_idle',        end: 5,  fps: 10, repeat: -1 },
    { key: 'mage_bomber_walk',        sheet: 'hero_mage_bomber_walk',        end: 6,  fps: 12, repeat: -1 },
    { key: 'mage_bomber_attack',      sheet: 'hero_mage_bomber_attack',      end: 7,  fps: 11, repeat: 0  },
    { key: 'mage_bomber_skill',       sheet: 'hero_mage_bomber_skill',       end: 9,  fps: 12, repeat: 0  },

    // 흑마법사 — 어두운 캐스팅 호흡, 지팡이 끝에서 빔 발사
    { key: 'mage_dark_idle',          sheet: 'hero_mage_dark_idle',          end: 5,  fps: 9,  repeat: -1 },
    { key: 'mage_dark_walk',          sheet: 'hero_mage_dark_walk',          end: 6,  fps: 11, repeat: -1 },
    { key: 'mage_dark_attack',        sheet: 'hero_mage_dark_attack',        end: 7,  fps: 13, repeat: 0  },
    { key: 'mage_dark_skill',         sheet: 'hero_mage_dark_skill',         end: 9,  fps: 12, repeat: 0  },
    // 공용 die (모든 영웅 공유) — animKeys.die에서 이 키 사용
    { key: 'hero_shared_die',         sheet: 'hero_shared_die',              end: 6,  fps: 8,  repeat: 0  },
  ];
  HERO_ANIMS.forEach(({ key, sheet, end, fps, repeat }) => {
    if (this.anims.exists(key)) return;
    this.anims.create({
      key,
      frames: this.anims.generateFrameNumbers(sheet, { start: 0, end }),
      frameRate: fps,
      repeat,
    });
  });
  isGameOver = false;
  scenePaused = false;
  bossPhase = 'mobs';
  currentBoss = null;
  currentBiomeIndex = -1;

  castleLevel = 1;
  castleExp = 0;
  castleNickname = CASTLE_DEFAULT_NAME;
  castleStatAtk = 0;
  castleStatDef = 0;
  castleStatHp = 0;
  castleStatHeroDef = 0;
  castleStatRespawn = 0;
  castleStatGold = 0;
  castleStatPoints = 0;
  autoBossSummon = false;
  classTrainLevels = makeEmptyClassTrain();
  totalSummons = 0;
  guideStep = 0;
  claimedStageRewards = new Set();
  castleMaxHp = computeCastleMaxHp();
  castleHP = castleMaxHp;

  this.terrainObjects = [];
  this.castle = drawCastle(this);
  this.castleHpBar = makeHpBar(this, CENTER.x, CENTER.y - 80, 64, 8);
  buildCastleStatusUI(this);

  this.allies = this.add.group();
  this.enemies = this.add.group();
  initHomeAnchors(this);

  drawTopUI(this);
  buildStagePanel(this);
  drawTavernButton(this);
  drawStageRewardButton(this);
  // 무료 소환 가능 여부 주기 체크 (3초마다 — wobble/말풍선 on/off)
  this.time.addEvent({
    delay: 3000, loop: true, callback: () => updateTavernButton(this),
  });
  updateTavernButton(this);
  buildHeroHUD(this);
  buildBottomTabBar(this);

  this.heroInventory = {};
  let restored = 0;
  const saved = loadGame();
  if (saved && saved.schemaVersion === SAVE_SCHEMA && Array.isArray(saved.inventory)) {
    gold = saved.gold || 0;
    gems = saved.gems || 0;
    stage = saved.stage || 1;
    kills = saved.kills || 0;
    if (typeof saved.castleLevel === 'number') {
      castleLevel = Math.max(1, Math.min(saved.castleLevel, CASTLE_LEVEL_CAP));
    }
    if (typeof saved.castleExp === 'number' && saved.castleExp >= 0) {
      castleExp = saved.castleExp;
    }
    if (typeof saved.castleNickname === 'string' && saved.castleNickname.length > 0) {
      castleNickname = saved.castleNickname;
    }
    if (typeof saved.userProfileKey === 'string' && saved.userProfileKey.length > 0) {
      this.userProfileKey = saved.userProfileKey;
      // HUD가 이미 디폴트로 그려졌으니 saved 키로 갱신
      if (this.uiAvatarSprite && this.uiAvatarSprite.setTexture) {
        this.uiAvatarSprite.setTexture(this.userProfileKey);
        const _avSize = 77 * 0.83;
        this.uiAvatarSprite.setDisplaySize(_avSize, _avSize);
      }
    }
    if (typeof saved.playerId === 'string' && saved.playerId.length > 0) {
      this.playerId = saved.playerId;
    }
    if (typeof saved.totalGoldSpent === 'number') totalGoldSpent = saved.totalGoldSpent;
    if (typeof saved.totalGemsSpent === 'number') totalGemsSpent = saved.totalGemsSpent;
    if (saved.tutorialDone === true) tutorialDone = true;
    if (typeof saved.castleStatAtk === 'number') castleStatAtk = clampStat(saved.castleStatAtk);
    if (typeof saved.castleStatDef === 'number') castleStatDef = clampStat(saved.castleStatDef);
    if (typeof saved.castleStatHp === 'number') castleStatHp = clampStat(saved.castleStatHp);
    if (typeof saved.castleStatHeroDef === 'number') castleStatHeroDef = clampStat(saved.castleStatHeroDef);
    if (typeof saved.castleStatRespawn === 'number') castleStatRespawn = clampStat(saved.castleStatRespawn);
    if (typeof saved.castleStatGold === 'number') castleStatGold = clampStat(saved.castleStatGold);
    if (typeof saved.castleStatPoints === 'number' && saved.castleStatPoints >= 0) {
      castleStatPoints = saved.castleStatPoints;
    }
    if (typeof saved.autoBossSummon === 'boolean') autoBossSummon = saved.autoBossSummon;
    // 무료 소환 상태 복원 (stock/쿨다운 종료시점/리셋일). 자정 리셋만 refillTavernStock에서 처리 — 시간 경과 자동충전 없음(하루 5회 + 사용당 5분 대기 방식)
    if (typeof saved.tavernFreeStock === 'number') {
      tavernFreeStock = Math.max(0, Math.min(TAVERN_FREE_MAX, Math.floor(saved.tavernFreeStock)));
    }
    if (typeof saved.tavernNextRefillAt === 'number') {
      tavernNextRefillAt = saved.tavernNextRefillAt;
    }
    if (typeof saved.tavernResetDay === 'string') {
      tavernResetDay = saved.tavernResetDay;
    }
    // 가이드 미션 진행 복원 (구버전 세이브엔 없음 → 기본값 0 유지)
    if (typeof saved.totalSummons === 'number' && saved.totalSummons >= 0) {
      totalSummons = Math.floor(saved.totalSummons);
    }
    if (typeof saved.guideStep === 'number' && saved.guideStep >= 0) {
      guideStep = Math.min(Math.floor(saved.guideStep), GUIDE_MISSIONS.length);
    }
    if (Array.isArray(saved.claimedStageRewards)) {
      claimedStageRewards = new Set(saved.claimedStageRewards.filter((n) => typeof n === 'number'));
    }
    refillTavernStock();
    if (saved.classTrainLevels && typeof saved.classTrainLevels === 'object') {
      Object.keys(classTrainLevels).forEach((k) => {
        const v = saved.classTrainLevels[k];
        if (typeof v === 'number' && v >= 0) {
          classTrainLevels[k] = Math.min(CLASS_TRAIN_CAP, Math.floor(v));
        }
      });
    }
    castleMaxHp = computeCastleMaxHp();
    castleHP = castleMaxHp;
    // 1) 인벤토리 복원 — 일단 deployedSlot은 모두 null로 두고 (deployHeroFromInventory가 'null이면 배치 가능' 으로 판단),
    //    실제 배치 의도만 따로 모은 뒤 배치 호출 시 deployedSlot이 자연스럽게 set 되게 한다.
    const deployIntents = [];
    saved.inventory.forEach((entry) => {
      let { heroId, enhance, deployedSlot } = entry;
      // 기본 영웅을 청기사 → 미남 전사로 교체 (사용자 요청, 진행도 보존)
      if (heroId === 'warrior_blue') heroId = 'warrior_handsome';
      const def = HEROES[heroId];
      if (!def) return;
      this.heroInventory[heroId] = {
        heroId, enhance: clampEnhance(enhance),
        deployedSlot: null,
      };
      if (typeof deployedSlot === 'number' && deployedSlot >= 0 && deployedSlot < HERO_SLOT_COUNT) {
        deployIntents.push({ heroId, slotIndex: deployedSlot });
      }
      restored += 1;
    });
    // 2) 의도된 슬롯에 실제 배치
    deployIntents.forEach(({ heroId, slotIndex }) => {
      deployHeroFromInventory(this, heroId, slotIndex);
    });
    // 3) STARTING_ROSTER에 있는데 인벤에 없는 영웅은 자동 시드 (새 영웅 추가 마이그레이션)
    STARTING_ROSTER.forEach((heroId) => {
      if (!HEROES[heroId] || this.heroInventory[heroId]) return;
      this.heroInventory[heroId] = { heroId, enhance: 0, deployedSlot: null };
      // 빈 슬롯 자동 배치
      for (let i = 0; i < HERO_SLOT_COUNT; i++) {
        if (this.heroSlots[i] && !this.heroSlots[i].occupied) {
          deployHeroFromInventory(this, heroId, i);
          break;
        }
      }
    });
  }
  if (restored === 0) {
    gold = STARTING_GOLD;
    gems = 0;
    stage = 1;
    kills = 0;
    deployStartingRoster(this);
  }

  updateGoldUI(this);
  updateGemsUI(this);
  updateKillsUI(this);
  updateTavernButton(this);
  updateCastleStatusUI(this);
  refreshTabBar(this);

  // 가이드 미션 위젯 — 세이브 복원/영웅 배치 완료 후 생성. 진행도는 1초마다 갱신.
  buildGuideWidget(this);
  this.time.addEvent({ delay: 1000, loop: true, callback: () => { refreshGuideWidget(this); refreshStageRewardButton(this); } });

  setupCameras(this);

  addFieldAmbience(this); // 공간감 연출 (구름 그림자 + 비네팅)

  startStage(this);

  // === 첫 진입 — 임시 닉네임 자동 생성 + 튜토리얼 시작 ===
  if (!castleNickname || castleNickname === CASTLE_DEFAULT_NAME) {
    castleNickname = generateGuestNickname();
    if (this.uiCastleNameTop) this.uiCastleNameTop.setText(castleNickname);
    saveGame(this);
  }
  // 튜토리얼 작업 비활성화 — 사용자 요청 (추후 재활성화 시 아래 주석 해제)
  // if (!tutorialDone) {
  //   this.time.delayedCall(1200, () => startTutorial(this));
  // }

  // === 개발자 치트 패널 (` 키로 토글) ===
  this.input.keyboard.on('keydown-BACKTICK', () => toggleCheatPanel(this));
}

// 부드러운 원형 텍스처 생성 (동심원 누적 → radial falloff). createCanvas보다 환경 안정적.
function makeSoftBlob(scene, key, size, color) {
  if (scene.textures.exists(key)) return;
  const gfx = scene.make.graphics({ add: false });
  const steps = 28, c = size / 2;
  for (let i = steps; i >= 1; i--) {
    gfx.fillStyle(color, 1 / steps);
    gfx.fillCircle(c, c, (size / 2) * (i / steps));
  }
  gfx.generateTexture(key, size, size);
  gfx.destroy();
}

// 전장 공간감/분위기 연출 — 구름 그림자(레이어감) + 안개(깊이) + 빛 입자(공기감). 전부 은은하게.
function addFieldAmbience(scene) {
  // 구름 그림자 — 실제 구름 실루엣(cloud_sil 12종 랜덤)이 좌→우 흘러감. 등장/퇴장 페이드.
  const CLOUD_OPACITIES = [0.12, 0.16, 0.2]; // 농도 3 베리에이션 (흐리게 — 제일 흐린 0.2가 디폴트/최대)
  const spawnCloud = () => {
    const key = 'cloud_sil_' + Phaser.Math.Between(0, 11);
    const sy0 = Phaser.Math.Between(-40, GAME_H - BOTTOM_UI_HEIGHT - 20); // 위~아래 끝까지 다양
    const peak = CLOUD_OPACITIES[Phaser.Math.Between(0, 2)];
    const sh = scene.add.image(-280, sy0, key)
      .setScale(Phaser.Math.FloatBetween(2.2, 5.0)) // 랜덤 2~3배 더 크게 (다양)
      .setDepth(6).setAlpha(0).setBlendMode(Phaser.BlendModes.MULTIPLY);
    const dur = Phaser.Math.Between(18000, 32000);
    scene.tweens.add({
      targets: sh, x: GAME_W + 360, y: sy0 + Phaser.Math.Between(-60, 220), // 상승/하강 랜덤
      duration: dur, ease: 'Linear', onComplete: () => sh.destroy(),
    });
    scene.tweens.add({ targets: sh, alpha: peak, duration: 3000, ease: 'Sine.easeOut' });               // 페이드 인
    scene.tweens.add({ targets: sh, alpha: 0, duration: 3000, delay: dur - 3000, ease: 'Sine.easeIn' }); // 페이드 아웃
  };
  spawnCloud();
  scene.time.addEvent({ delay: 16000, loop: true, callback: spawnCloud }); // 빈도 절반

  // 작은 빛(나비) — 필드를 자유롭게 떠돌아다님 + 날개짓 (꼭 나비로 안 보여도 OK)
  const spawnButterfly = () => {
    const bx = Phaser.Math.Between(60, GAME_W - 60);
    const by = Phaser.Math.Between(TOP_UI_HEIGHT + 60, GAME_H - BOTTOM_UI_HEIGHT - 60);
    const b = scene.add.circle(bx, by, 2.5, 0xFFF4C0, 0.85).setDepth(8).setBlendMode(Phaser.BlendModes.ADD);
    // 랜덤 waypoint로 부드럽게 이동 반복 (팔랑팔랑 떠돌이)
    const wander = () => {
      if (!b.active) return;
      const nx = Phaser.Math.Clamp(b.x + Phaser.Math.Between(-90, 90), 40, GAME_W - 40);
      const ny = Phaser.Math.Clamp(b.y + Phaser.Math.Between(-75, 75), TOP_UI_HEIGHT + 50, GAME_H - BOTTOM_UI_HEIGHT - 50);
      scene.tweens.add({ targets: b, x: nx, y: ny, duration: Phaser.Math.Between(1800, 2800), ease: 'Sine.easeInOut', onComplete: wander });
    };
    wander();
    // 날개짓 — 좌우로 납작해졌다 펴짐
    scene.tweens.add({ targets: b, scaleX: 0.5, duration: 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  };
  for (let i = 0; i < 3; i++) spawnButterfly(); // 3마리
}

// 치트 패널 — 우측 상단에 떠 있는 작은 모달, 버튼 클릭으로 치트 실행
const CHEAT_ACTIONS = [
  { label: '보스 강제 소환', run: (scene) => {
    if (bossPhase === 'mobs') {
      challengeBoss(scene, true);
      showToast(scene, '[치트] 보스 강제 소환');
    } else {
      showToast(scene, '이미 보스전 중');
    }
  } },
  { label: '승리 banner 미리보기', run: (scene) => {
    showBossResultBanner(scene, true);
  } },
  { label: '패배 banner 미리보기', run: (scene) => {
    showBossResultBanner(scene, false);
  } },
  { label: '골드 +1000', run: (scene) => {
    gold += 1000; updateGoldUI(scene); updateTavernButton(scene);
    showToast(scene, '[치트] 골드 +1000');
  } },
  { label: '보석 +100', run: (scene) => {
    gems += 100; updateGemsUI(scene); updateTavernButton(scene);
    showToast(scene, '[치트] 보석 +100');
  } },
  { label: '모든 영웅 획득', run: (scene) => {
    let added = 0;
    Object.keys(HEROES).forEach((heroId) => {
      if (scene.heroInventory[heroId]) return;
      scene.heroInventory[heroId] = { heroId, enhance: 0, deployedSlot: null };
      added += 1;
    });
    if (scene.inventoryPanelElements) refreshInventoryPanel(scene);
    try { saveGame(scene); } catch (e) {}
    showToast(scene, added > 0 ? `[치트] 영웅 ${added}명 획득` : '[치트] 이미 모두 보유');
  } },
  { label: '모든 슬롯 개방', run: (scene) => {
    cheatAllSlotsUnlocked = true;
    refreshHeroSlotUnlock(scene);
    showToast(scene, '[치트] 8개 슬롯 전부 개방');
  } },
  { label: '세이브 초기화 (처음부터)', run: (scene) => {
    // 모든 세이브(현재+레거시) 삭제 후 새로고침 → 신규 시작
    [SAVE_KEY, SAVE_KEY_LEGACY_V11, SAVE_KEY_LEGACY_V10, SAVE_KEY_LEGACY_V9].forEach((k) => {
      try { localStorage.removeItem(k); } catch (e) {}
    });
    showToast(scene, '[치트] 세이브 초기화 — 새로고침합니다');
    location.reload();
  } },
];

function toggleCheatPanel(scene) {
  if (scene._cheatPanel) closeCheatPanel(scene);
  else openCheatPanel(scene);
}

function openCheatPanel(scene) {
  if (scene._cheatPanel) return;
  const els = [];
  const panelW = 200;
  const padding = 12;
  const headerH = 28;
  const btnH = 32;
  const btnGap = 6;
  const footerH = 36;
  const panelH = padding + headerH + CHEAT_ACTIONS.length * (btnH + btnGap) - btnGap + 8 + footerH;
  const panelX = GAME_W - panelW / 2 - 8;
  const panelY = 100 + panelH / 2;

  // BG (반투명 검정)
  const bg = scene.add.graphics().setDepth(200);
  bg.fillStyle(0x000000, 0.85);
  bg.fillRoundedRect(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, 10);
  bg.lineStyle(2, 0xFFD577, 1);
  bg.strokeRoundedRect(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, 10);
  els.push(bg);

  // 제목
  const titleY = panelY - panelH / 2 + headerH / 2 + 4;
  const title = scene.add.text(panelX, titleY, '🔧 치트 패널', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '15px',
    color: '#FFD577', stroke: '#000', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(201);
  els.push(title);

  // 버튼 행
  let curY = panelY - panelH / 2 + padding + headerH;
  CHEAT_ACTIONS.forEach((act) => {
    const btnCY = curY + btnH / 2;
    const btnBg = scene.add.graphics().setDepth(201);
    btnBg.fillStyle(0x2A3858, 1);
    btnBg.fillRoundedRect(panelX - panelW / 2 + padding, btnCY - btnH / 2, panelW - padding * 2, btnH, 6);
    btnBg.lineStyle(1.5, 0x6E7383, 1);
    btnBg.strokeRoundedRect(panelX - panelW / 2 + padding, btnCY - btnH / 2, panelW - padding * 2, btnH, 6);
    const btnText = scene.add.text(panelX, btnCY, act.label, {
      fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '13px',
      color: '#FFFFFF', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(202);
    const hit = scene.add.zone(panelX, btnCY, panelW - padding * 2, btnH)
      .setOrigin(0.5).setDepth(203).setInteractive({ useHandCursor: true });
    hit.on('pointerup', () => act.run(scene));
    els.push(btnBg, btnText, hit);
    curY += btnH + btnGap;
  });

  // 닫기 버튼
  const closeCY = panelY + panelH / 2 - footerH / 2 - 4;
  const closeBg = scene.add.graphics().setDepth(201);
  closeBg.fillStyle(0x6E1F1A, 1);
  closeBg.fillRoundedRect(panelX - 50, closeCY - 12, 100, 24, 5);
  const closeText = scene.add.text(panelX, closeCY, '닫기 ( ` )', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '12px',
    color: '#FFFFFF', stroke: '#000', strokeThickness: 2,
  }).setOrigin(0.5).setDepth(202);
  const closeHit = scene.add.zone(panelX, closeCY, 100, 24)
    .setOrigin(0.5).setDepth(203).setInteractive({ useHandCursor: true });
  closeHit.on('pointerup', () => closeCheatPanel(scene));
  els.push(closeBg, closeText, closeHit);

  scene._cheatPanel = els;
}

function closeCheatPanel(scene) {
  if (!scene._cheatPanel) return;
  scene._cheatPanel.forEach((el) => el.destroy());
  scene._cheatPanel = null;
}

// === Camera split: UI는 카메라 shake 영향 안 받게 분리 =======================
// depth ≥ UI_DEPTH_THRESHOLD인 객체는 uiCamera 전용으로 렌더, 메인 카메라가 ignore.
// 그 미만은 메인 카메라 전용(uiCamera가 ignore). 메인 카메라 shake 시 UI는 고정.
const UI_DEPTH_THRESHOLD = 35;

function setupCameras(scene) {
  // canvas native는 GAME_W*2 × GAME_H*2 (1080×1920). 게임 좌표는 GAME_W(540) 기준.
  // 카메라 setZoom(2)로 좌표 540 기준 객체들을 화면에 ×2 표시 → 화면 가득 + sharp.
  const canvasW = GAME_W * 2;
  const canvasH = GAME_H * 2;
  scene.cameras.main.setZoom(2);
  scene.cameras.main.centerOn(GAME_W / 2, GAME_H / 2);
  scene.uiCamera = scene.cameras.add(0, 0, canvasW, canvasH);
  scene.uiCamera.setZoom(2);
  scene.uiCamera.centerOn(GAME_W / 2, GAME_H / 2);
  assignCamerasIfNeeded(scene);
}

function assignCamerasIfNeeded(scene) {
  if (!scene.uiCamera) return;
  const list = scene.children.list;
  for (let i = 0; i < list.length; i++) {
    const child = list[i];
    if (child._camAssigned) continue;
    child._camAssigned = true;
    if ((child.depth || 0) >= UI_DEPTH_THRESHOLD) {
      scene.cameras.main.ignore(child);
    } else {
      scene.uiCamera.ignore(child);
    }
  }
}

// === 첫 진입 튜토리얼 매니저 (4단계) =========================================
// 1: 영웅 드래그 / 2: 주점 영웅 소환 / 3: 인벤토리에서 배치 / 4: 닉네임 변경
function startTutorial(scene) {
  scene.tutorialStep = 1;
  showTutorialStep(scene);
}

function showTutorialStep(scene) {
  closeTutorialOverlay(scene);
  const step = scene.tutorialStep;
  if (step === 1)      showTutorialStep1(scene);
  else if (step === 2) showTutorialStep2(scene);
  else if (step === 3) showTutorialStep3(scene);
  else if (step === 4) showTutorialStep4(scene);
  else finishTutorial(scene);
}

function advanceTutorial(scene) {
  scene.tutorialStep = (scene.tutorialStep || 0) + 1;
  scene.time.delayedCall(450, () => showTutorialStep(scene));
}

function finishTutorial(scene) {
  closeTutorialOverlay(scene);
  tutorialDone = true;
  try { saveGame(scene); } catch (e) {}
}

function closeTutorialOverlay(scene) {
  if (!scene.tutorialOverlay) return;
  // 등록한 이벤트 핸들러 해제
  if (scene.tutorialOverlay.cleanup) {
    try { scene.tutorialOverlay.cleanup(); } catch (e) {}
  }
  scene.tutorialOverlay.els.forEach((e) => e && e.destroy && e.destroy());
  scene.tutorialOverlay = null;
}

// 튜토리얼 메시지 영역 — 모든 step에서 같은 위치 사용
const TUTORIAL_MSG_X = GAME_W / 2;
const TUTORIAL_MSG_Y = 290;

// 튜토리얼 공용 — 텍스트만 + 단계 라벨 좌우 장식(결과창 REWARDS 스타일 라인+다이아).
function tutorialBubble(scene, msg, stepLabel) {
  const x = TUTORIAL_MSG_X, y = TUTORIAL_MSG_Y;
  const els = [];
  // 단계 라벨 (위)
  if (stepLabel) {
    const stepY = y - 32;
    const stepTxt = scene.add.text(x, stepY, stepLabel, {
      fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '13px',
      color: '#FFFFFF', stroke: '#000000', strokeThickness: 3,
      align: 'center',
    }).setOrigin(0.5).setDepth(991).setResolution(3);
    stepTxt.setShadow(0, 2, '#000000', 2, true, true);
    els.push(stepTxt);

    // 좌우 장식 — 결과창 REWARDS 라벨 ornament (가로 라인 + 다이아)
    const halfW = stepTxt.width / 2;
    const gap = 8;
    const lineLen = 24;
    const diaSize = 3;
    const lineDiaGap = 4;
    const leftDiaCX = x - halfW - gap - lineLen - lineDiaGap - diaSize;
    const rightDiaCX = x + halfW + gap + lineLen + lineDiaGap + diaSize;
    const leftLineX = x - halfW - gap - lineLen;
    const rightLineX = x + halfW + gap;
    // 외곽선용 (검정 fillRect — 좌우 끝까지 외곽선)
    const ornBg = scene.add.graphics().setDepth(990);
    ornBg.fillStyle(0x000000, 1);
    // 좌우 라인 검정 (두께 5)
    ornBg.fillRect(leftLineX - 1, stepY - 2.5, lineLen + 2, 5);
    ornBg.fillRect(rightLineX - 1, stepY - 2.5, lineLen + 2, 5);
    const dB = diaSize + 1.5;
    ornBg.fillTriangle(leftDiaCX, stepY - dB, leftDiaCX + dB, stepY, leftDiaCX - dB, stepY);
    ornBg.fillTriangle(leftDiaCX, stepY + dB, leftDiaCX + dB, stepY, leftDiaCX - dB, stepY);
    ornBg.fillTriangle(rightDiaCX, stepY - dB, rightDiaCX + dB, stepY, rightDiaCX - dB, stepY);
    ornBg.fillTriangle(rightDiaCX, stepY + dB, rightDiaCX + dB, stepY, rightDiaCX - dB, stepY);
    // 내부 흰색 (좌우 1px 안쪽 → 좌/우 끝 검정 노출)
    const orn = scene.add.graphics().setDepth(991);
    orn.fillStyle(0xFFFFFF, 1);
    orn.fillRect(leftLineX, stepY - 1, lineLen, 2);
    orn.fillRect(rightLineX, stepY - 1, lineLen, 2);
    orn.fillTriangle(leftDiaCX, stepY - diaSize, leftDiaCX + diaSize, stepY, leftDiaCX - diaSize, stepY);
    orn.fillTriangle(leftDiaCX, stepY + diaSize, leftDiaCX + diaSize, stepY, leftDiaCX - diaSize, stepY);
    orn.fillTriangle(rightDiaCX, stepY - diaSize, rightDiaCX + diaSize, stepY, rightDiaCX - diaSize, stepY);
    orn.fillTriangle(rightDiaCX, stepY + diaSize, rightDiaCX + diaSize, stepY, rightDiaCX - diaSize, stepY);
    els.push(ornBg, orn);
  }
  // 본문 (아래). 인구 톤 옅은 골드/노랑
  const txt = scene.add.text(x, y + 12, msg, {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '19px',
    color: '#FFE08A', stroke: '#000000', strokeThickness: 5,
    align: 'center', lineSpacing: 5,
  }).setOrigin(0.5).setDepth(991).setResolution(3);
  txt.setShadow(0, 3, '#000000', 3, true, true);
  els.push(txt);
  return els;
}

// 단계 수행 완료 시 큰 텍스트 연출 (페이드 in/out) → 다음 step
// 위치는 메시지 영역과 동일 — 항상 같은 자리에서 모든 튜토리얼 텍스트가 나옴
function showStepComplete(scene, msg, onDone) {
  const txt = scene.add.text(TUTORIAL_MSG_X, TUTORIAL_MSG_Y, msg, {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '30px',
    color: '#FFE96B', stroke: '#000000', strokeThickness: 6,
    align: 'center',
  }).setOrigin(0.5).setDepth(995).setResolution(3).setScale(0.4).setAlpha(0);
  txt.setShadow(0, 3, '#000000', 4, true, true);
  scene.tweens.add({
    targets: txt, scale: 1, alpha: 1,
    duration: 320, ease: 'Back.easeOut',
    onComplete: () => {
      scene.tweens.add({
        targets: txt, alpha: 0, scale: 1.1,
        duration: 550, delay: 700, ease: 'Quad.easeIn',
        onComplete: () => {
          try { txt.destroy(); } catch (e) {}
          if (onDone) onDone();
        },
      });
    },
  });
}

function tutorialArrow(scene, x, y) {
  // 자산은 손가락이 위쪽을 향함. 180도 회전 → 아래쪽 가리킴.
  const arrow = scene.add.image(x, y, 'tutorial_hand')
    .setDisplaySize(48, 48).setAngle(180).setDepth(991);
  // scale pulse — 위치는 호출처에서 영웅 따라 갱신할 수 있도록 비워둠
  const bsx = arrow.scaleX, bsy = arrow.scaleY;
  scene.tweens.add({
    targets: arrow, scaleX: bsx * 1.15, scaleY: bsy * 1.15,
    duration: 550, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });
  return arrow;
}

// 튜토리얼 강조 박스 — 밝은 하늘색 외곽선만 (펄스)
function tutorialHighlightBox(scene, x, y, w, h, depth) {
  const d = depth || 50;
  const box = scene.add.rectangle(x, y, w + 6, h + 6)
    .setStrokeStyle(4, 0x6BD9FF, 1).setDepth(d);
  scene.tweens.add({
    targets: box, scaleX: 1.08, scaleY: 1.08,
    duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });
  return [box];
}

// 시작 영웅 찾기 (배치된 첫 영웅)
function findStartingHero(scene) {
  if (!scene.heroSlots) return null;
  for (const slot of scene.heroSlots) {
    if (slot && slot.occupied && slot.hero && slot.hero.active) return slot.hero;
  }
  return null;
}

// === Step 1: 영웅 드래그 ====================================================
function showTutorialStep1(scene) {
  const hero = findStartingHero(scene);
  if (!hero) {
    // 영웅 없으면 step 1 skip → step 2로 진행
    advanceTutorial(scene);
    return;
  }
  const els = [];
  // 화살표 (영웅 머리 위)
  const arrow = tutorialArrow(scene, hero.x, hero.y - 50);
  els.push(arrow);
  // 메시지 — 고정 위치 (TUTORIAL_MSG_X/Y)
  els.push(...tutorialBubble(scene,
    '슬라임이 다가오고 있어요!\n캐릭터를 드래그해서 이동시켜 보세요!',
    '튜토리얼 1'));

  // 영웅 dragstart → 손 숨김
  const onDragStart = () => { if (arrow && arrow.setVisible) arrow.setVisible(false); };
  hero.on('dragstart', onDragStart);
  // 영웅 dragend → 완료 연출 후 다음 step
  const onDragEnd = () => {
    if (!scene.tutorialOverlay) return;
    closeTutorialOverlay(scene);
    showStepComplete(scene, '잘 했어요!', () => advanceTutorial(scene));
  };
  hero.once('dragend', onDragEnd);

  // 손 아이콘이 영웅 위치 따라가게 — 매 프레임 갱신 (드래그 중에는 invisible)
  const followTimer = scene.time.addEvent({
    delay: 30, loop: true, callback: () => {
      if (!arrow || !arrow.scene || !hero || !hero.active) return;
      if (!arrow.visible) return;
      arrow.x = hero.x;
      arrow.y = hero.y - 50;
    },
  });

  scene.tutorialOverlay = {
    els,
    cleanup: () => {
      try { hero.off('dragstart', onDragStart); } catch (e) {}
      try { hero.off('dragend', onDragEnd); } catch (e) {}
      try { followTimer.remove(); } catch (e) {}
    },
  };
}

// === Step 2: 주점 영웅 소환 (3 sub-step 강제 가이드) =========================
// 2a: HUD 영웅 소환 버튼 강조 → 클릭
// 2b: 모달 열림 → 가운데 카드 강조 → 클릭 (선택)
// 2c: 소환 버튼 강조 → 클릭 → 영웅 획득 → step2 완료
function showTutorialStep2(scene) {
  if (!scene.uiTavernBg) { advanceTutorial(scene); return; }
  step2_subA(scene);
}

// 2a: HUD 주점 버튼
function step2_subA(scene) {
  const tavern = scene.uiTavernBg;
  const els = [];
  els.push(...tutorialHighlightBox(scene, tavern.x, tavern.y,
    tavern.displayWidth, tavern.displayHeight, 50));
  els.push(...tutorialBubble(scene,
    '주점 버튼을 눌러주세요!',
    '튜토리얼 2'));
  const onClick = () => {
    closeTutorialOverlay(scene);
    scene.time.delayedCall(500, () => step2_subB(scene));
  };
  tavern.once('pointerdown', onClick);
  scene.tutorialOverlay = {
    els,
    cleanup: () => { try { tavern.off('pointerdown', onClick); } catch (e) {} },
  };
}

// 2b: 모달 안 가운데 카드 강조
function step2_subB(scene) {
  const slots = scene.tavernCardSlots;
  if (!slots || slots.length < 1) {
    // 모달 카드 없음 → 영웅 획득 hook으로 polling
    step2_finalHook(scene);
    return;
  }
  const mid = Math.floor(slots.length / 2);
  const slot = slots[mid];
  const els = [];
  els.push(...tutorialHighlightBox(scene, slot.x, slot.y, slot.w, slot.h, 110));
  els.push(...tutorialBubble(scene,
    '가운데 카드를 눌러 영웅을 선택해주세요!',
    '튜토리얼 2'));
  // 카드 클릭 감지 — tavernRevealed가 true가 되면 카드가 뒤집힘 (선택됨)
  const checkTimer = scene.time.addEvent({
    delay: 100, loop: true, callback: () => {
      if (scene.tavernRevealed) {
        checkTimer.remove();
        if (!scene.tutorialOverlay) return;
        closeTutorialOverlay(scene);
        scene.time.delayedCall(400, () => step2_subC(scene));
      }
    },
  });
  scene.tutorialOverlay = {
    els,
    cleanup: () => { try { checkTimer.remove(); } catch (e) {} },
  };
}

// 2c: 소환 버튼 강조
function step2_subC(scene) {
  const sb = scene.tavernSummonBtn;
  const els = [];
  if (sb && sb.bg) {
    els.push(...tutorialHighlightBox(scene, sb.bg.x, sb.bg.y,
      sb.bg.displayWidth || sb.bg.width, sb.bg.displayHeight || sb.bg.height, 110));
  }
  els.push(...tutorialBubble(scene,
    '소환 버튼을 눌러주세요!',
    '튜토리얼 2'));
  step2_finalHook(scene, els);
}

// 영웅 획득 hook — step2 종료
function step2_finalHook(scene, existingEls) {
  scene._onHeroAcquiredTutorial = () => {
    if (!scene.tutorialOverlay) return;
    closeTutorialOverlay(scene);
    showStepComplete(scene, '잘 했어요!', () => advanceTutorial(scene));
  };
  if (existingEls) {
    scene.tutorialOverlay = {
      els: existingEls,
      cleanup: () => { scene._onHeroAcquiredTutorial = null; },
    };
  } else if (!scene.tutorialOverlay) {
    scene.tutorialOverlay = {
      els: [],
      cleanup: () => { scene._onHeroAcquiredTutorial = null; },
    };
  }
}

// === Step 3: 인벤토리에서 영웅 배치 =========================================
function showTutorialStep3(scene) {
  const els = [];
  // 영웅 탭 ('heroes') 영역 강조 박스
  const heroTab = (scene.tabButtons || []).find((b) => b.id === 'heroes');
  if (heroTab && heroTab.zone) {
    els.push(...tutorialHighlightBox(scene, heroTab.zone.x, heroTab.zone.y,
      heroTab.zone.width, heroTab.zone.height, 50));
  }
  els.push(...tutorialBubble(scene,
    '영웅 탭을 열어 인벤토리의 영웅을\n슬롯에 배치해 보세요!',
    '튜토리얼 3'));
  // 배치 완료 hook (deployHeroFromInventory에서 호출됨)
  scene._onHeroDeployedTutorial = () => {
    if (!scene.tutorialOverlay) return;
    closeTutorialOverlay(scene);
    showStepComplete(scene, '잘 했어요!', () => advanceTutorial(scene));
  };
  scene.tutorialOverlay = {
    els,
    cleanup: () => { scene._onHeroDeployedTutorial = null; },
  };
}

// === Step 4: 프로필에서 닉네임 변경 =========================================
function showTutorialStep4(scene) {
  const els = [];
  // HUD 아바타 영역 강조 박스
  if (scene.uiAvatarSprite) {
    const av = scene.uiAvatarSprite;
    els.push(...tutorialHighlightBox(scene, av.x, av.y,
      av.displayWidth, av.displayHeight, 50));
  }
  els.push(...tutorialBubble(scene,
    '프로필에서 닉네임을 변경해 보세요!\n좌측 상단 프로필 아이콘을 눌러주세요!',
    '튜토리얼 4'));
  // 닉네임 변경 완료 hook
  scene._onNicknameChangedTutorial = () => {
    if (!scene.tutorialOverlay) return;
    closeTutorialOverlay(scene);
    showStepComplete(scene, '튜토리얼 완료!', () => advanceTutorial(scene));
  };
  scene.tutorialOverlay = {
    els,
    cleanup: () => { scene._onNicknameChangedTutorial = null; },
  };
}

function update(time, delta) {
  assignCamerasIfNeeded(this);
  if (isGameOver) return;
  if (scenePaused) return;
  try {
    currentTime = time;
    const dt = delta / 1000;

    this.allies.getChildren().forEach((hero) => {
      if (!hero.alive && time >= hero.respawnAt) respawnHero(this, hero);
    });

    this.allies.getChildren().forEach((hero) => {
      if (hero.alive) tickAlly(this, hero, dt, delta, time);
    });
    this.enemies.getChildren().forEach((u) => tickEnemy(this, u, dt, delta, time));

    if (bossPhase === 'boss-fight' && currentBoss && currentBoss.active) {
      bossTimerRemaining -= dt;
      if (bossTimerRemaining <= 0) {
        bossTimerRemaining = 0;
        onBossTimeout(this);
      }
    }

    updateHpBar(this.castleHpBar, castleHP, castleMaxHp);
    updateHeroHUD(this);
    updateBossUI(this);
    updateHeroChatter(this, time);

    if (castleHP <= 0) triggerGameOver(this);
  } catch (e) {
    console.error('[ProjectK] update loop error:', e);
  }
}

// === Biome / terrain =======================================================

function getBiomeForStage(s) {
  const ch = Math.floor((s - 1) / 10);
  return BIOMES[ch % BIOMES.length];
}

function getBiomeIndexForStage(s) {
  return Math.floor((s - 1) / 10) % BIOMES.length;
}

function applyBiome(scene, biomeIndex) {
  if (currentBiomeIndex === biomeIndex) return;
  currentBiomeIndex = biomeIndex;
  const biome = BIOMES[biomeIndex];
  scene.cameras.main.setBackgroundColor(biome.bg);
  drawTerrain(scene, biome);
}

function drawTerrain(scene, biome) {
  if (scene.terrainObjects) {
    scene.terrainObjects.forEach((o) => { if (o && o.destroy) o.destroy(); });
  }
  scene.terrainObjects = [];

  const playH = GAME_H - BOTTOM_UI_HEIGHT;
  if (biome.bgImage && scene.textures.exists(biome.bgImage)) {
    // 전체 캔버스에 깔아서 HUD 영역에서 캔버스 bg color가 노출되지 않게
    const bgImg = scene.add.image(GAME_W / 2, GAME_H / 2, biome.bgImage)
      .setDisplaySize(GAME_W, GAME_H)
      .setDepth(-11);
    scene.terrainObjects.push(bgImg);
  } else {
    const g = scene.add.graphics();
    g.fillStyle(biome.grassDark, 0.45);
    for (let i = 0; i < 22; i++) {
      g.fillCircle(Phaser.Math.Between(0, GAME_W), Phaser.Math.Between(0, playH), Phaser.Math.Between(18, 42));
    }
    g.fillStyle(biome.grassDarker, 0.35);
    for (let i = 0; i < 14; i++) {
      g.fillCircle(Phaser.Math.Between(0, GAME_W), Phaser.Math.Between(0, playH), Phaser.Math.Between(8, 16));
    }
    g.fillStyle(biome.pebble, 0.7);
    for (let i = 0; i < 35; i++) {
      g.fillCircle(Phaser.Math.Between(0, GAME_W), Phaser.Math.Between(0, playH), Phaser.Math.Between(1, 3));
    }
    g.setDepth(-10);
    scene.terrainObjects.push(g);

    const tufts = scene.add.graphics();
    tufts.lineStyle(1.5, biome.grassDarker, 0.7);
    for (let i = 0; i < 60; i++) {
      const x = Phaser.Math.Between(0, GAME_W);
      const y = Phaser.Math.Between(0, playH);
      tufts.lineBetween(x, y, x - 1, y - 4);
      tufts.lineBetween(x + 2, y, x + 3, y - 5);
    }
    tufts.setDepth(-9);
    scene.terrainObjects.push(tufts);
  }

  // Decorations per biome
  const decoPositions = [
    { x: 60, y: 110 }, { x: GAME_W - 70, y: 90 },
    { x: 80, y: GAME_H - BOTTOM_UI_HEIGHT - 50 }, { x: GAME_W - 60, y: GAME_H - BOTTOM_UI_HEIGHT - 30 },
  ];

  if (biome.deco === 'trees') {
    // 동그란 나무 deco 비활성 — 추후 사용자가 sprite 자산 제공 예정
  } else if (biome.deco === 'pine') {
    decoPositions.forEach((p) => scene.terrainObjects.push(drawPineDeco(scene, p.x, p.y, biome)));
  } else if (biome.deco === 'cactus') {
    decoPositions.slice(0, 3).forEach((p) => scene.terrainObjects.push(drawCactusDeco(scene, p.x, p.y)));
  } else if (biome.deco === 'rocks') {
    decoPositions.forEach((p) => scene.terrainObjects.push(drawRockDeco(scene, p.x, p.y)));
    // extra rocks
    for (let i = 0; i < 4; i++) {
      const x = Phaser.Math.Between(40, GAME_W - 40);
      const y = Phaser.Math.Between(40, GAME_H - BOTTOM_UI_HEIGHT - 40);
      if (Math.abs(x - CENTER.x) < 90 && Math.abs(y - CENTER.y) < 90) continue;
      scene.terrainObjects.push(drawRockDeco(scene, x, y));
    }
  }
}

function drawTreeDeco(scene, x, y, biome) {
  const c = scene.add.container(x, y).setDepth(0);
  const shadow = scene.add.ellipse(6, 12, 56, 22, COLOR.shadow, 0.32);
  const trunk = scene.add.circle(0, 6, 7, biome.trunkColor || 0x6B4423);
  const leaves1 = scene.add.circle(0, -2, 24, biome.leafDark || 0x4F7A2D);
  const leaves2 = scene.add.circle(-3, -5, 20, biome.leafMid || 0x6FA340);
  const highlight = scene.add.circle(-8, -11, 9, biome.leafLight || 0x8FBE5F);
  c.add([shadow, trunk, leaves1, leaves2, highlight]);
  return c;
}

function drawPineDeco(scene, x, y, biome) {
  const c = scene.add.container(x, y).setDepth(0);
  const shadow = scene.add.ellipse(4, 14, 44, 20, COLOR.shadow, 0.32);
  const trunk = scene.add.rectangle(0, 10, 6, 14, biome.trunkColor || 0x4A2510);
  const layer3 = scene.add.triangle(0, -2, -18, 10, 18, 10, 0, -10, biome.leafDark || 0x2A4F2A);
  const layer2 = scene.add.triangle(0, -10, -14, 6, 14, 6, 0, -10, biome.leafMid || 0x3A6F3A);
  const layer1 = scene.add.triangle(0, -18, -10, 4, 10, 4, 0, -8, biome.leafLight || 0xFFFFFF);
  c.add([shadow, trunk, layer3, layer2, layer1]);
  return c;
}

function drawCactusDeco(scene, x, y) {
  const c = scene.add.container(x, y).setDepth(0);
  const shadow = scene.add.ellipse(2, 16, 22, 8, COLOR.shadow, 0.32);
  const main = scene.add.rectangle(0, 0, 12, 30, 0x4A8B4A).setStrokeStyle(1.5, 0x2A6B2A);
  const top = scene.add.circle(0, -16, 6, 0x4A8B4A).setStrokeStyle(1.5, 0x2A6B2A);
  const arm1 = scene.add.rectangle(-9, -3, 6, 14, 0x4A8B4A).setStrokeStyle(1.5, 0x2A6B2A);
  const arm1Top = scene.add.circle(-9, -10, 3, 0x4A8B4A).setStrokeStyle(1.5, 0x2A6B2A);
  const arm2 = scene.add.rectangle(9, 3, 6, 12, 0x4A8B4A).setStrokeStyle(1.5, 0x2A6B2A);
  const arm2Top = scene.add.circle(9, -3, 3, 0x4A8B4A).setStrokeStyle(1.5, 0x2A6B2A);
  c.add([shadow, main, top, arm1, arm1Top, arm2, arm2Top]);
  return c;
}

function drawRockDeco(scene, x, y) {
  const c = scene.add.container(x, y).setDepth(0);
  const shadow = scene.add.ellipse(3, 6, 24, 9, COLOR.shadow, 0.35);
  const base = scene.add.circle(0, 0, 9, 0x3A2810).setStrokeStyle(1.5, 0x1A0F04);
  const highlight = scene.add.circle(-3, -3, 4, 0x5A3F1F);
  c.add([shadow, base, highlight]);
  return c;
}

// === Castle ================================================================

function drawCastle(scene) {
  // 성을 위/아래 두 조각으로 나눠 영웅(depth 4)을 사이에 끼움.
  // 위쪽 절반은 영웅 위(가림), 아래쪽 절반은 영웅 아래(영웅이 앞).
  const src = scene.textures.get('castle').getSourceImage();
  const sw = src.width, sh = src.height;
  const halfH = Math.floor(sh / 2);

  const topHalf = scene.add.image(CENTER.x, CENTER.y, 'castle');
  topHalf.setDisplaySize(130, 130);
  topHalf.setCrop(0, 0, sw, halfH);
  topHalf.setDepth(6);

  const botHalf = scene.add.image(CENTER.x, CENTER.y, 'castle');
  botHalf.setDisplaySize(130, 130);
  botHalf.setCrop(0, halfH, sw, sh - halfH);
  botHalf.setDepth(2);

  return { topHalf, botHalf };
}

// === Hero class drawing ====================================================

// 영웅 ID별 이미지 sprite를 사용할 때 쓰는 generic drawer 팩토리.
// 도형 합성 대신 spriteKey로 등록된 텍스처를 같은 container에 add.
// naturalDir: 원본 이미지가 자연 상태에서 바라보는 방향 (-1 = 왼쪽, 1 = 오른쪽).
function makeHeroImageDrawer(spriteKey, displaySize = 30, naturalDir = -1) {
  return function (scene, def, container) {
    const sprite = scene.add.image(0, 0, spriteKey);
    sprite.setDisplaySize(displaySize, displaySize);
    container.add([sprite]);
    container.heroSprite = sprite;
    container.spriteNaturalDir = naturalDir;
    container.spriteScaleMag = Math.abs(sprite.scaleX);
  };
}

// sprite sheet 영웅용 — frame 비율을 유지하면서 displayH 기준으로 scale.
// frameH 인자가 필요한 이유: setDisplaySize는 비율을 깨므로 sprite sheet(가로세로 다른 frame)에는 부적합.
function makeHeroSpriteAnimDrawer(spriteKey, animKey, frameH, displayH = 30, naturalDir = -1) {
  return function (scene, def, container) {
    const sprite = scene.add.sprite(0, 0, spriteKey);
    const s = displayH / frameH;
    sprite.setScale(s);
    if (scene.anims && scene.anims.exists(animKey)) sprite.play(animKey);
    container.add([sprite]);
    container.heroSprite = sprite;
    container.spriteNaturalDir = naturalDir;
    container.spriteScaleMag = Math.abs(sprite.scaleX);
  };
}

// 미남 전사처럼 anim 여러 종 가진 영웅의 상태별 anim 전환.
// def.animKeys 메타가 있으면 그걸 보고 sprite.play 호출.
// _animLockUntil이 설정된 경우 그 시점까진 다른 anim으로 전환 안 함 (attack/skill 끝까지 재생 보장).
function playHeroAnim(scene, ally, name, opts = {}) {
  const def = ally.heroDef;
  if (!def || !def.animKeys) return;
  const key = def.animKeys[name];
  if (!key) return;
  if (!ally.heroSprite || !ally.heroSprite.anims) return;
  if (ally._currentAnim === name && ally.heroSprite.anims.isPlaying) return;
  ally._currentAnim = name;
  ally.heroSprite.play(key);
  if (opts.lockMs) ally._animLockUntil = scene.time.now + opts.lockMs;
  // one-shot anim(attack/skill 등)은 끝나는 즉시 lock 해제 — 마지막 frame이 유지되어
  // 적 사라진 뒤에도 휘두른 자세로 멈춰있는 문제 방지.
  const animObj = scene.anims.get(key);
  if (animObj && animObj.repeat === 0) {
    ally.heroSprite.once('animationcomplete-' + key, () => {
      ally._animLockUntil = 0;
      ally._currentAnim = null; // 다음 tick에서 idle/walk 강제 재선택
    });
  }
}

function updateHeroAnim(scene, ally) {
  const def = ally.heroDef;
  if (!def || !def.animKeys) return;
  // 사망 → die anim 한 번 재생, 이후 그대로 정지 (마지막 frame = 묘비)
  if (!ally.alive) {
    if (ally._currentAnim !== 'die') {
      playHeroAnim(scene, ally, 'die');
    }
    return;
  }
  // attack anim 중 target 사라지면 즉시 중단 — 적 없는데 한 번 더 칼질 방지
  // (skill은 target과 무관하게 시전될 수 있어 cut 안 함)
  if (ally._currentAnim === 'attack') {
    const t = ally.target;
    const validTarget = t && t.active && t.alive !== false && t.hp > 0;
    if (!validTarget) {
      ally._animLockUntil = 0;
      ally._currentAnim = null;
      if (ally.heroSprite && ally.heroSprite.anims) ally.heroSprite.anims.stop();
      // fall through → 아래 idle/walk 로직
    }
  }
  // attack/skill anim lock — 끝까지 재생 보장
  if (ally._animLockUntil && scene.time.now < ally._animLockUntil) return;
  ally._animLockUntil = 0;
  // 드래그 중엔 idle
  if (ally.isBeingDragged) {
    playHeroAnim(scene, ally, 'idle');
    return;
  }
  // 이동 여부 판단: target이 attackRange 밖이거나 home으로 복귀 중이면 walk, 아니면 idle
  let moving = false;
  if (ally.target && ally.target.active && ally.target.alive !== false) {
    const d = Math.hypot(ally.target.x - ally.x, ally.target.y - ally.y);
    if (d > ally.attackRange) moving = true;
  } else if (ally.homeX != null) {
    const homeD = Math.hypot(ally.homeX - ally.x, ally.homeY - ally.y);
    if (homeD > 2) moving = true;
  }
  playHeroAnim(scene, ally, moving ? 'walk' : 'idle');
}

// 이동/전투 방향에 따라 sprite를 좌우 반전.
// dx: 향하고 싶은 방향의 x 성분. 절댓값이 너무 작으면 변경 안 함(깜빡임 방지).
function updateSpriteFacing(unit, dx) {
  if (!unit.heroSprite) return;
  if (Math.abs(dx) < 0.5) return;
  const wantDir = dx > 0 ? 1 : -1;
  const flip = wantDir * unit.spriteNaturalDir;
  unit.heroSprite.scaleX = unit.spriteScaleMag * flip;
}

// 영웅 그릴 때 우선순위: HEROES[id].drawBody > CLASSES[class].drawBody
function getHeroDrawBody(def) {
  return def.drawBody || CLASSES[def.class].drawBody;
}

// 인벤/HUD/카드/ghost/상세창 등 portrait 정적 표시용.
// sprite sheet 영웅은 frame 0 정지 image, 나머지는 기존 drawBody 그대로.
// (필드 makeHero는 이 헬퍼 안 쓰고 getHeroDrawBody 직접 호출 → anim 재생 유지)
// opts.useBig: true이면 def.portraitBig (큰 인벤토리용 lobby_xxx PNG) 사용.
function drawHeroPortraitStatic(scene, def, container, opts) {
  opts = opts || {};
  if (opts.useBig && def.portraitBig) {
    const sprite = scene.add.image(0, 0, def.portraitBig);
    const sz = def.portraitBigSize || { w: 287, h: 360 };
    const baseScale = 96 / sz.h;
    const extra = def.portraitBigScale || 1;
    sprite.setScale(baseScale * extra);
    container.add(sprite);
    return;
  }
  if (def.portraitSheet) {
    const sprite = scene.add.image(0, 0, def.portraitSheet, def.portraitSheetFrame || 0);
    const baseScale = 96 / def.portraitSheetSize.h;
    const extra = def.portraitScale || 1; // 영웅별 portrait 시각 미세조정 (frame tight 정도가 다름)
    sprite.setScale(baseScale * extra);
    container.add(sprite);
  } else {
    getHeroDrawBody(def)(scene, def, container);
  }
}

function drawWarriorBody(scene, def, container) {
  const body = scene.add.circle(0, 0, 10, def.bodyColor).setStrokeStyle(1.5, def.bodyStroke);
  const stripe = scene.add.rectangle(0, 0, 4, 14, COLOR.bannerWhite, 0.7);
  const shield = scene.add.circle(-9, 0, 5.5, def.shieldColor).setStrokeStyle(1, def.shieldStroke);
  const shieldV = scene.add.rectangle(-9, 0, 1.3, 6.5, COLOR.bannerWhite);
  const shieldH = scene.add.rectangle(-9, 0, 6.5, 1.3, COLOR.bannerWhite);
  const handle = scene.add.rectangle(11, 0, 4, 3, COLOR.leather);
  const guard = scene.add.rectangle(13.5, 0, 1.5, 7, COLOR.steelDark);
  const blade = scene.add.rectangle(21, 0, 14, 2.4, COLOR.steel).setStrokeStyle(0.8, COLOR.steelDark);
  const tip = scene.add.triangle(29, 0, 0, -1.4, 0, 1.4, 4, 0, COLOR.steel);
  const helmet = scene.add.circle(0, 0, 7, COLOR.steel).setStrokeStyle(1.2, COLOR.steelDark);
  const visor = scene.add.rectangle(2.5, 0, 4, 1.4, COLOR.steelDark);
  const crest = scene.add.rectangle(-1, 0, 3, 8, def.crestColor);
  container.add([body, stripe, shield, shieldV, shieldH, handle, guard, blade, tip, helmet, crest, visor]);
}

function drawArcherBody(scene, def, container) {
  const cape = scene.add.ellipse(-3, 0, 16, 16, def.bodyStroke);
  const body = scene.add.circle(0, 0, 9, def.bodyColor).setStrokeStyle(1.5, def.bodyStroke);
  const hoodRing = scene.add.circle(-1, 0, 7.5, def.bodyStroke);
  const head = scene.add.circle(-1, 0, 5, COLOR.skin);
  const grip = scene.add.rectangle(11, 0, 1.5, 14, def.accentColor || COLOR.leather);
  const limb1 = scene.add.triangle(11, -7, 0, 0, 4, -1, 0, -3, def.accentColor || COLOR.leather);
  const limb2 = scene.add.triangle(11, 7, 0, 0, 4, 1, 0, 3, def.accentColor || COLOR.leather);
  const arrowShaft = scene.add.rectangle(18, 0, 12, 1.2, COLOR.leather);
  const arrowTip = scene.add.triangle(25, 0, 0, -2, 4, 0, 0, 2, def.crestColor || 0x999999);
  container.add([cape, body, hoodRing, head, grip, limb1, limb2, arrowShaft, arrowTip]);
}

function drawMageBody(scene, def, container) {
  const robe = scene.add.circle(0, 2, 10, def.bodyColor).setStrokeStyle(1.5, def.bodyStroke);
  const head = scene.add.circle(-1, -3, 5, COLOR.skin);
  const hatBrim = scene.add.ellipse(-2, -4, 14, 4, def.bodyStroke);
  const hatCone = scene.add.triangle(-3, -4, 0, 0, 12, 0, 6, -14, def.bodyColor);
  const hatTip = scene.add.circle(3, -16, 1.6, def.crestColor);
  const staff = scene.add.rectangle(13, 0, 1.5, 22, 0x8B6914);
  const orbGlow = scene.add.circle(13, -10, 6, def.crestColor, 0.35);
  const orb = scene.add.circle(13, -10, 4, def.crestColor).setStrokeStyle(1, COLOR.white);
  container.add([staff, robe, head, hatBrim, hatCone, hatTip, orbGlow, orb]);
}

function drawTankBody(scene, def, container) {
  const body = scene.add.circle(0, 0, 13, def.bodyColor).setStrokeStyle(2, def.bodyStroke);
  const stripe = scene.add.rectangle(0, 0, 5, 18, COLOR.bannerWhite, 0.7);
  const shield = scene.add.circle(-12, 0, 10, def.shieldColor).setStrokeStyle(1.5, def.shieldStroke);
  const shieldV = scene.add.rectangle(-12, 0, 2, 12, COLOR.bannerWhite);
  const shieldH = scene.add.rectangle(-12, 0, 12, 2, COLOR.bannerWhite);
  const helmet = scene.add.circle(0, 0, 8, COLOR.steel).setStrokeStyle(1.5, COLOR.steelDark);
  const visor = scene.add.rectangle(2, 0, 4, 1.6, COLOR.steelDark);
  const maceHandle = scene.add.rectangle(11, 0, 5, 2, COLOR.leather);
  const maceHead = scene.add.circle(15, 0, 3.5, COLOR.steelDark).setStrokeStyle(1, 0x333333);
  container.add([body, stripe, shield, shieldV, shieldH, maceHandle, maceHead, helmet, visor]);
}

function drawAssassinBody(scene, def, container) {
  // 후드 망토 실루엣
  const cape = scene.add.ellipse(-3, 1, 17, 18, def.bodyStroke);
  const body = scene.add.circle(0, 0, 8.5, def.bodyColor).setStrokeStyle(1.5, def.bodyStroke);
  // 후드 (어두운 두건 + 작은 얼굴)
  const hood = scene.add.circle(-1, -1, 7.5, def.bodyStroke);
  const hoodInner = scene.add.ellipse(-1, -1, 9, 5, 0x080608);
  const head = scene.add.circle(-1, -1, 4, COLOR.skin);
  // 가슴 X벨트 (crestColor = 액센트 컬러)
  const beltA = scene.add.rectangle(0, 1, 14, 1.4, def.crestColor || 0x666666);
  beltA.rotation = 0.5;
  const beltB = scene.add.rectangle(0, 1, 14, 1.4, def.crestColor || 0x666666);
  beltB.rotation = -0.5;
  // 좌측 단검 (자루+칼날)
  const dagger1Handle = scene.add.rectangle(-7, 8, 3.5, 1.3, COLOR.leather);
  const dagger1Blade = scene.add.triangle(-12, 8, 0, -0.8, 0, 0.8, -5, 0, COLOR.steel)
    .setStrokeStyle(0.5, COLOR.steelDark);
  // 우측 단검 (전방으로 뻗은 메인 무기)
  const dagger2Handle = scene.add.rectangle(11, 0, 4, 1.6, COLOR.leather);
  const dagger2Blade = scene.add.triangle(17, 0, 0, -1, 0, 1, 6, 0, COLOR.steel)
    .setStrokeStyle(0.5, COLOR.steelDark);
  container.add([cape, body, hood, hoodInner, head, beltA, beltB,
    dagger1Handle, dagger1Blade, dagger2Handle, dagger2Blade]);
}

// === Hero deployment =======================================================

function getHeroHomePosition(slotIndex) {
  const angle = (slotIndex / HERO_SLOT_COUNT) * Math.PI * 2 - Math.PI / 2;
  return { x: CENTER.x + Math.cos(angle) * HERO_RING_RADIUS, y: CENTER.y + Math.sin(angle) * HERO_RING_RADIUS };
}

function initHomeAnchors(scene) {
  scene.homeAnchors = [];
  for (let i = 0; i < HERO_SLOT_COUNT; i++) {
    const p = getHeroHomePosition(i);
    scene.homeAnchors.push({ x: p.x, y: p.y, claimedBy: null });
  }
}

function releaseHomeAnchor(ally) {
  if (ally && ally.homeAnchor) {
    if (ally.homeAnchor.claimedBy === ally) ally.homeAnchor.claimedBy = null;
    ally.homeAnchor = null;
  }
}

function claimNearestHomeAnchor(scene, ally, fromX, fromY) {
  if (!scene.homeAnchors) return null;
  const px = (fromX != null) ? fromX : ally.x;
  const py = (fromY != null) ? fromY : ally.y;
  releaseHomeAnchor(ally);
  let best = null, bestD = Infinity;
  for (const a of scene.homeAnchors) {
    if (a.claimedBy && a.claimedBy !== ally) continue;
    const d = Math.hypot(a.x - px, a.y - py);
    if (d < bestD) { bestD = d; best = a; }
  }
  if (best) {
    best.claimedBy = ally;
    ally.homeAnchor = best;
    ally.homeX = best.x;
    ally.homeY = best.y;
  }
  return best;
}

function deployStartingRoster(scene) {
  STARTING_ROSTER.forEach((heroId, slotIndex) => {
    if (!HEROES[heroId]) return;
    scene.heroInventory[heroId] = { heroId, enhance: 0, deployedSlot: null };
    deployHeroFromInventory(scene, heroId, slotIndex);
  });
}

// 인벤토리 → 슬롯 배치. 영웅 스프라이트 생성 + HUD 카드 바인딩 + 인벤토리 상태 갱신.
function deployHeroFromInventory(scene, heroId, slotIndex) {
  const entry = scene.heroInventory[heroId];
  if (!entry || entry.deployedSlot !== null) return false;
  const slot = scene.heroSlots[slotIndex];
  if (!slot) return false;
  // 기존 영웅 있으면 인벤토리로 회수 후 교체 (드래그-교체 UX)
  if (slot.occupied) recallHeroFromSlot(scene, slotIndex);
  const def = HEROES[heroId];
  if (!def) return false;
  const pos = getHeroHomePosition(slotIndex);
  const hero = makeHero(scene, def, slotIndex, pos.x, pos.y);
  hero.enhance = clampEnhance(entry.enhance);
  applyHeroStats(hero);
  hero.hp = hero.maxHp;
  scene.allies.add(hero);
  bindHeroToHUDSlot(scene, hero, slotIndex);
  entry.deployedSlot = slotIndex;
  // 튜토리얼 step3 hook — 영웅 배치 시 자동 진행
  if (scene._onHeroDeployedTutorial) {
    const cb = scene._onHeroDeployedTutorial;
    scene._onHeroDeployedTutorial = null;
    try { cb(); } catch (e) {}
  }
  return true;
}

// 슬롯 → 인벤토리 회수. 영웅 스프라이트/HUD 카드 정리, 인벤토리 보관은 유지.
function recallHeroFromSlot(scene, slotIndex) {
  const slot = scene.heroSlots[slotIndex];
  if (!slot || !slot.occupied || !slot.hero) return false;
  const hero = slot.hero;
  const entry = scene.heroInventory[hero.heroDef.id];
  if (entry) entry.deployedSlot = null;

  releaseHomeAnchor(hero);
  if (hero.hpBar) {
    if (hero.hpBar.bg) hero.hpBar.bg.destroy();
    if (hero.hpBar.fill) hero.hpBar.fill.destroy();
  }
  if (hero.shadow) hero.shadow.destroy();
  scene.allies.remove(hero, false, false);
  hero.destroy();

  const parts = slot.parts;
  if (parts) {
    if (parts.portrait) parts.portrait.destroy();
    if (parts.maskShape) parts.maskShape.destroy();
    if (parts.rarityFill) parts.rarityFill.destroy();
    if (parts.overlay) parts.overlay.destroy();
    if (parts.respawnText) parts.respawnText.destroy();
  }
  // 빈 슬롯 상태로 복원 — 절차적 외곽/inset 다시 그리기
  slot.occupied = false;
  if (slot.bg) drawAngularSlot(slot.bg, false);
  // 슬롯이 잠긴 상태라면 다시 자물쇠 표시
  const unlocked = getUnlockedSlotCount(castleLevel || 1);
  if (slot.lockIcon && slot.index >= unlocked) slot.lockIcon.setVisible(true);
  slot.hero = null;
  slot.parts = null;
  return true;
}

function makeHero(scene, def, slotIndex, x, y) {
  const cls = CLASSES[def.class];
  const shadowSize = def.class === 'tank' ? 28 : 24;
  const shadow = scene.add.ellipse(x + 2, y + 13, shadowSize, 9, COLOR.shadow, 0.35).setDepth(2);

  const c = scene.add.container(x, y);
  getHeroDrawBody(def)(scene, def, c);
  c.setDepth(4);
  if (!def.noRotate) {
    c.rotation = Math.atan2(y - CENTER.y, x - CENTER.x);
  }

  c.heroDef = def;
  c.classDef = cls;
  c.slotIndex = slotIndex;
  c.alive = true;
  c.respawnAt = 0;
  c.enhance = 0;
  c.target = null;
  c.boostedNextAttack = false;
  c.skillCooldown = 0;
  c.attackCooldown = Phaser.Math.Between(0, cls.baseStats.attackInterval);

  c.homeX = x;
  c.homeY = y;

  const bodyShape = c.list.find((el) => el.type === 'Arc' || (el.geom && typeof el.geom.radius === 'number'));
  c.body = bodyShape || c.list[0];
  c.bodyColor = def.bodyColor;
  c.isEnemy = false;
  c.rotates = !def.noRotate;

  c.hpBar = makeHpBar(scene, x, y - 28, 26, 7, COLOR.hpGood); // 영웅: 초록 고정
  c.shadow = shadow;
  c.isBeingDragged = false;
  enableHeroDrag(scene, c);
  return c;
}

// 드래그 시 일시 컨트롤 — homeX/homeY는 절대 변경 X.
// 놓으면 AI가 즉시 거기서 이어가고, 전투 끝나면 원래 슬롯 위치로 복귀.
function enableHeroDrag(scene, hero) {
  // 스프라이트 영웅은 시각 크기에 맞춰 더 큰 히트박스 사용, 도형 영웅은 기본값.
  let hitSize;
  if (hero.heroSprite) hitSize = Math.max(40, Math.round(hero.spriteScaleMag ? hero.heroSprite.displayWidth * 0.55 : 50));
  else if (hero.classDef && hero.classDef.name === '탱커') hitSize = 40;
  else hitSize = 34;
  // Container 드래그는 setSize → setInteractive() (geom 생략) 패턴이 가장 안정적.
  // setInteractive()는 setSize로 정의된 사각형을 자동 hitArea로 사용.
  hero.setSize(hitSize, hitSize);
  hero.setInteractive({ useHandCursor: true, draggable: true });

  hero.on('dragstart', () => {
    if (!hero.alive) return;
    hero.isBeingDragged = true;
    hero.target = null;
    releaseHomeAnchor(hero);
    hero.attackCooldown = Math.max(hero.attackCooldown, 200);
    hero._dragSavedDepth = hero.depth;
    hero.setDepth(20);
    if (hero.shadow) hero.shadow.setDepth(19);
    scene.tweens.killTweensOf(hero);
    scene.tweens.add({ targets: hero, scaleX: 1.2, scaleY: 1.2, duration: 120, ease: 'Quad.easeOut' });
    // 드래그 중에만 몬스터 인식 범위 표시 — 은은한 흰색 아웃라인 원 (채움 없음, 바닥에 깔림)
    if (hero._rangeRing) hero._rangeRing.destroy();
    const ring = scene.add.graphics();
    ring.lineStyle(2, 0xffffff, 0.4);
    ring.strokeCircle(0, 0, hero.detectRange || 0);
    ring.setPosition(hero.x, hero.y).setDepth(3).setAlpha(0);
    scene.tweens.add({ targets: ring, alpha: 1, duration: 150, ease: 'Quad.easeOut' });
    hero._rangeRing = ring;
  });

  hero.on('drag', (pointer, dragX, dragY) => {
    if (!hero.alive || !hero.isBeingDragged) return;
    const x = Phaser.Math.Clamp(dragX, 12, GAME_W - 12);
    const y = Phaser.Math.Clamp(dragY, 60, GAME_H - BOTTOM_UI_HEIGHT - 12);
    hero.x = x;
    hero.y = y;
    applyCastleCollision(hero);
    syncUnit(hero);
    if (hero._rangeRing) hero._rangeRing.setPosition(hero.x, hero.y);
  });

  hero.on('dragend', () => {
    if (!hero.isBeingDragged) return;
    hero.isBeingDragged = false;
    hero.setDepth(hero._dragSavedDepth || 4);
    if (hero.shadow) hero.shadow.setDepth(2);
    scene.tweens.add({ targets: hero, scaleX: 1, scaleY: 1, duration: 140, ease: 'Quad.easeOut' });
    if (hero._rangeRing) {
      const ring = hero._rangeRing;
      hero._rangeRing = null;
      scene.tweens.add({ targets: ring, alpha: 0, duration: 180, ease: 'Quad.easeOut', onComplete: () => ring.destroy() });
    }
  });
}

// 영웅 maxHp/damage/defense 계산 — 실제 전투와 상세창 표시가 항상 일치하도록 공용 사용.
//  · 등급(rarity): base에 곱하는 배수
//  · 강화(enhance): flat 가산 (강화수 × 강화당 정수 증가, floor 소실 없음)
//  · 훈련(classTrain): % 배수 (클래스 전체 일괄)
//  · 인구: 공격 = % 배수(getHeroDamageMultiplier), 방어 = flat 가산(castleStatHeroDef)
function computeHeroStatValues(def, enhance) {
  const classBase = CLASSES[def.class].baseStats;
  // baseStatOverride로 같은 class지만 다른 hp/dmg/def 영웅 정의 가능 (딴딴기사 등).
  // statOverride(applyHeroStats 쪽)는 range/speed/interval 등 비-스케일링 스탯에만 적용.
  const base = def.baseStatOverride ? { ...classBase, ...def.baseStatOverride } : classBase;
  const rMult = RARITY_MULT[def.rarity] || 1;
  const atkMult = getHeroDamageMultiplier();
  const tMult = 1 + ((classTrainLevels && classTrainLevels[def.class]) || 0) * CLASS_TRAIN_PER;
  const eAmt = clampEnhance(enhance);
  // 강화 = 등급 적용된 '실효 기본 스탯'에 정수 flat 가산 (강화수만큼 base 자체가 커짐).
  //  → 정수라 floor에 안 먹히고, 아래 %가 이 커진 스탯에 곱해진다.
  const baseDmg = Math.floor(base.damage * rMult) + Math.max(1, Math.round(base.damage * rMult * ENHANCE_FLAT_PER)) * eAmt;
  const baseHp  = Math.floor(base.maxHp  * rMult) + Math.max(1, Math.round(base.maxHp  * rMult * ENHANCE_FLAT_PER)) * eAmt;
  const baseDef = Math.floor((base.defense || 0) * rMult) + Math.round((base.defense || 0) * rMult * ENHANCE_FLAT_PER) * eAmt;
  // 훈련(%)·인구공격(%)은 강화 포함 실효 스탯에 곱 → 강화 많은 영웅일수록 % 절대 효과 커짐.
  // 인구방어(castleStatHeroDef)는 flat 가산.
  return {
    maxHp: Math.floor(baseHp * tMult),
    damage: Math.max(1, Math.floor(baseDmg * atkMult * tMult)),
    defense: Math.floor(baseDef * tMult + castleStatHeroDef * STAT_HERO_DEF_PER_POINT),
  };
}

function applyHeroStats(hero) {
  const classBase = CLASSES[hero.heroDef.class].baseStats;
  const base = hero.heroDef.baseStatOverride
    ? { ...classBase, ...hero.heroDef.baseStatOverride }
    : classBase;
  const s = computeHeroStatValues(hero.heroDef, hero.enhance);
  hero.maxHp = s.maxHp;
  hero.damage = s.damage;
  hero.defense = s.defense;
  hero.detectRange = base.detectRange;
  hero.attackRange = base.attackRange;
  hero.attackInterval = base.attackInterval;
  hero.speed = base.speed;
  hero.aoeRadius = base.aoeRadius || 0;
  // Hero-level override (백스오: 짧은 사거리/빠른 평타 등 class baseStats를 덮어쓰기)
  const o = hero.heroDef.statOverride;
  if (o) {
    if (o.detectRange != null)    hero.detectRange = o.detectRange;
    if (o.attackRange != null)    hero.attackRange = o.attackRange;
    if (o.attackInterval != null) hero.attackInterval = o.attackInterval;
    if (o.speed != null)          hero.speed = o.speed;
    if (o.aoeRadius != null)      hero.aoeRadius = o.aoeRadius;
  }
}

// === Hero death / respawn ==================================================

function killHero(scene, hero) {
  hero.alive = false;
  hero.setActive(false);
  hero.target = null;
  hero.isBeingDragged = false;
  if (hero._rangeRing) { hero._rangeRing.destroy(); hero._rangeRing = null; }
  releaseHomeAnchor(hero);
  if (hero.hpBar) {
    hero.hpBar.bg.setVisible(false);
    hero.hpBar.fill.setVisible(false);
  }
  const hasDieAnim = hero.heroDef && hero.heroDef.animKeys && hero.heroDef.animKeys.die;
  if (hasDieAnim) {
    // die anim 재생 — 마지막 frame이 묘비라 그대로 유지. alpha/scale fade 안 함.
    playHeroAnim(scene, hero, 'die');
    if (hero.shadow) {
      scene.tweens.add({
        targets: hero.shadow, alpha: 0, duration: 220,
        onComplete: () => hero.shadow.setVisible(false),
      });
    }
  } else {
    scene.tweens.add({
      targets: hero, alpha: 0, scaleX: 0.6, scaleY: 0.6,
      duration: 220, ease: 'Quad.easeIn',
      onComplete: () => hero.setVisible(false),
    });
    if (hero.shadow) {
      scene.tweens.add({
        targets: hero.shadow, alpha: 0, duration: 220,
        onComplete: () => hero.shadow.setVisible(false),
      });
    }
  }
  // 신전 인구로 부활시간 단축 (최대 -60%)
  const reduction = Math.min(STAT_RESPAWN_MAX_REDUCTION, castleStatRespawn * STAT_RESPAWN_PCT_PER_POINT);
  const baseRespawn = RARITY[hero.heroDef.rarity].respawnSec * 1000;
  hero.respawnStart = scene.time.now;
  hero.respawnAt = scene.time.now + baseRespawn * (1 - reduction);
}

// 시장 인구로 골드 획득량 배율
function getGoldMultiplier() {
  return 1 + castleStatGold * STAT_GOLD_PCT_PER_POINT;
}

function respawnHero(scene, hero) {
  hero.alive = true;
  hero.setActive(true);
  hero.setVisible(true);
  hero.alpha = 1;
  // anim 영웅은 die 상태에서 깨어남 — 다음 update에서 idle/walk로 전환되도록 lock 풀고 anim 강제 재시작
  hero._currentAnim = null;
  hero._animLockUntil = 0;
  const initial = getHeroHomePosition(hero.slotIndex);
  claimNearestHomeAnchor(scene, hero, initial.x, initial.y);
  hero.x = hero.homeX;
  hero.y = hero.homeY;
  hero.hp = hero.maxHp;
  hero.target = null;
  hero.attackCooldown = 0;
  hero.skillCooldown = CLASSES[hero.heroDef.class].skill.cooldownMs * 0.5;
  hero.boostedNextAttack = false;
  if (hero.rotates) {
    hero.rotation = Math.atan2(hero.y - CENTER.y, hero.x - CENTER.x);
  }
  if (hero.shadow) {
    hero.shadow.setVisible(true);
    hero.shadow.alpha = 0.35;
    hero.shadow.x = hero.x + 2;
    hero.shadow.y = hero.y + 13;
  }
  if (hero.hpBar) {
    hero.hpBar.bg.setVisible(true);
    hero.hpBar.fill.setVisible(true);
  }
  scene.tweens.add({
    targets: hero, scaleX: { from: 0, to: 1 }, scaleY: { from: 0, to: 1 },
    duration: 280, ease: 'Back.easeOut',
  });
}

// === Skills ================================================================

function skill_strongStrike(scene, hero) {
  hero.boostedNextAttack = true;
  const glow = scene.add.circle(hero.x, hero.y, 18, 0xff4444, 0.45).setDepth(3);
  scene.tweens.add({
    targets: glow, alpha: 0, scale: 1.6, duration: 700,
    onComplete: () => glow.destroy(),
  });
}

function skill_multiShot(scene, hero) {
  const enemies = scene.enemies.getChildren()
    .filter((e) => e.active && e.hp > 0)
    .map((e) => ({ e, d: Phaser.Math.Distance.Between(hero.x, hero.y, e.x, e.y) }))
    .filter((o) => o.d <= hero.detectRange + 50)
    .sort((a, b) => a.d - b.d)
    .slice(0, 3)
    .map((o) => o.e);
  if (enemies.length === 0) return;
  enemies.forEach((e, i) => {
    scene.time.delayedCall(i * 90, () => {
      if (e.active && e.hp > 0 && hero.alive) rangedStrike(scene, hero, e);
    });
  });
}

function skill_explosion(scene, hero) {
  let target = hero.target && hero.target.active && hero.target.hp > 0 ? hero.target : null;
  if (!target) target = findNearestInGroup(scene.enemies, hero.x, hero.y, hero.detectRange + 80);
  if (!target) return;
  const tx = target.x, ty = target.y;
  const aoeR = 80;
  const dmg = Math.floor(hero.damage * 1.5);
  scene.enemies.getChildren().forEach((e) => {
    if (!e.active || e.hp <= 0) return;
    const d = Phaser.Math.Distance.Between(tx, ty, e.x, e.y);
    if (d <= aoeR) {
      e.hp -= dmg;
      showDamagePopup(scene, e.x, e.y - 14, dmg, { crit: true });
      flashHit(scene, e.body, e.bodyColor);
      if (e.hp <= 0) onUnitDeath(scene, e);
    }
  });
  drawExplosion(scene, tx, ty, aoeR, 0xFFAA00);
}

function skill_rage(scene, hero) {
  const heal = Math.floor(hero.maxHp * 0.25);
  hero.hp = Math.min(hero.hp + heal, hero.maxHp);
  drawTauntRing(scene, hero);
  scene.enemies.getChildren().forEach((e) => {
    if (!e.active || e.hp <= 0) return;
    const d = Phaser.Math.Distance.Between(hero.x, hero.y, e.x, e.y);
    if (d <= hero.detectRange + 40) {
      e.forcedTarget = hero;
      e.forcedTargetUntil = scene.time.now + 5000;
    }
  });
}

// 암살자: 그림자 베기 — 현재 타겟에 3연타. 잔상 효과.
function skill_shadowStrike(scene, hero) {
  let target = hero.target && hero.target.active && hero.target.hp > 0 ? hero.target : null;
  if (!target) target = findNearestInGroup(scene.enemies, hero.x, hero.y, hero.detectRange + 40);
  if (!target) return;

  // 잔상 — 현재 위치에 어두운 잔영 남기기
  const ghost = scene.add.circle(hero.x, hero.y, 11, 0x000000, 0.55).setDepth(3);
  scene.tweens.add({
    targets: ghost, alpha: 0, scaleX: 0.6, scaleY: 0.6, duration: 380,
    onComplete: () => ghost.destroy(),
  });

  const dmgPerHit = Math.max(1, Math.floor(hero.damage * 1.0));
  for (let i = 0; i < 3; i++) {
    scene.time.delayedCall(i * 90, () => {
      if (!target.active || target.hp <= 0 || !hero.alive) return;
      target.hp -= dmgPerHit;
      showDamagePopup(scene, target.x, target.y - 14, dmgPerHit);
      flashHit(scene, target.body, target.bodyColor);
      const slash = scene.add.circle(target.x, target.y, 8, 0xFF66CC, 0.55).setDepth(4);
      scene.tweens.add({
        targets: slash, alpha: 0, scaleX: 1.7, scaleY: 1.7, duration: 220,
        onComplete: () => slash.destroy(),
      });
      if (target.hp <= 0) onUnitDeath(scene, target);
    });
  }
}

// === Enemies ===============================================================

function makeSlime(scene, x, y) {
  const stageScale = 1 + (stage - 1) * STAGE_DIFFICULTY_PER;
  const shadow = scene.add.ellipse(x + 1, y + 11, 22, 7, COLOR.shadow, 0.35).setDepth(2);
  const c = scene.add.container(x, y);

  const body = scene.add.circle(0, 0, 12, COLOR.slimeBody).setStrokeStyle(1.5, COLOR.slimeStroke);
  const highlight = scene.add.ellipse(-3, -4, 9, 4.5, COLOR.slimeHighlight, 0.75);
  const eye1 = scene.add.circle(-3.5, -1, 1.8, 0x000000);
  const eye2 = scene.add.circle(3.5, -1, 1.8, 0x000000);
  const eyeShine1 = scene.add.circle(-3.1, -1.5, 0.6, COLOR.white);
  const eyeShine2 = scene.add.circle(3.9, -1.5, 0.6, COLOR.white);

  c.add([body, highlight, eye1, eye2, eyeShine1, eyeShine2]);
  c.setDepth(3);

  c.maxHp = Math.floor(15 * stageScale);
  c.hp = c.maxHp;
  c.damage = Math.max(2, Math.round(2 * stageScale));
  c.detectRange = 110;
  c.attackRange = 28;
  c.attackInterval = 900;
  c.attackCooldown = 0;
  c.speed = Phaser.Math.Between(40, 54);
  c.target = null;
  c.shadow = shadow;
  c.body = body;
  c.bodyColor = COLOR.slimeBody;
  c.isEnemy = true;
  c.isBoss = false;
  c.rotates = false;
  c.alive = true;
  c.forcedTarget = null;
  c.forcedTargetUntil = 0;

  c.hpBar = makeHpBar(scene, x, y - 22, 26, 7, COLOR.hpLow); // 적: 빨강 고정

  scene.tweens.add({
    targets: body, scaleY: 0.85, scaleX: 1.12,
    duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });
  return c;
}

function makeBoss(scene, x, y, stageNum) {
  const shadow = scene.add.ellipse(x + 3, y + 18, 56, 16, COLOR.shadow, 0.4).setDepth(2);
  const c = scene.add.container(x, y);

  const body = scene.add.circle(0, 0, 22, COLOR.bossBody).setStrokeStyle(2.5, COLOR.bossStroke);
  const highlight = scene.add.ellipse(-5, -7, 14, 7, 0xD8A8E5, 0.7);
  const eye1 = scene.add.circle(-7, -2, 3, 0x000000);
  const eye2 = scene.add.circle(7, -2, 3, 0x000000);
  const eyeShine1 = scene.add.circle(-6, -3, 1, COLOR.white);
  const eyeShine2 = scene.add.circle(8, -3, 1, COLOR.white);
  const fang1 = scene.add.triangle(-4, 8, -2, 0, 2, 0, 0, 4, COLOR.white);
  const fang2 = scene.add.triangle(4, 8, -2, 0, 2, 0, 0, 4, COLOR.white);

  // Crown (boss indicator)
  const crownBase = scene.add.rectangle(0, -22, 26, 5, COLOR.bossCrown).setStrokeStyle(1, 0x8B6914);
  const crownPoint1 = scene.add.triangle(-9, -25, -3, 3, 3, 3, 0, -5, COLOR.bossCrown);
  const crownPoint2 = scene.add.triangle(0, -27, -3, 3, 3, 3, 0, -7, COLOR.bossCrown);
  const crownPoint3 = scene.add.triangle(9, -25, -3, 3, 3, 3, 0, -5, COLOR.bossCrown);
  const crownGem = scene.add.circle(0, -30, 2.5, COLOR.bossGem).setStrokeStyle(0.5, COLOR.white);

  c.add([body, highlight, eye1, eye2, eyeShine1, eyeShine2, fang1, fang2, crownBase, crownPoint1, crownPoint2, crownPoint3, crownGem]);
  c.setDepth(3);

  c.maxHp = stageNum * BOSS_HP_PER_STAGE;
  c.hp = c.maxHp;
  c.damage = Math.floor(BOSS_DAMAGE_BASE + (stageNum - 1) * BOSS_DAMAGE_PER_STAGE);
  c.detectRange = 150;
  c.attackRange = 38;
  c.attackInterval = 1100;
  c.attackCooldown = 0;
  c.speed = 32;
  c.target = null;
  c.shadow = shadow;
  c.body = body;
  c.bodyColor = COLOR.bossBody;
  c.isEnemy = true;
  c.isBoss = true;
  c.rotates = false;
  c.alive = true;
  c.forcedTarget = null;
  c.forcedTargetUntil = 0;

  // No individual hpBar for boss — top BOSS UI handles HP display

  scene.tweens.add({
    targets: body, scaleY: 0.92, scaleX: 1.06,
    duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });

  return c;
}

// === Spawning ==============================================================

function spawnSlimeAtEdge(scene) {
  const angle = Math.random() * Math.PI * 2;
  const dx = Math.cos(angle), dy = Math.sin(angle);
  const margin = 30;
  const dToEdgeX = (GAME_W / 2 + margin) / Math.max(0.0001, Math.abs(dx));
  const dToEdgeY = (GAME_H / 2 + margin) / Math.max(0.0001, Math.abs(dy));
  const dist = Math.min(dToEdgeX, dToEdgeY);
  const x = CENTER.x + dx * dist;
  const y = CENTER.y + dy * dist;
  scene.enemies.add(makeSlime(scene, x, y));
}

function spawnBossAtEdge(scene) {
  const angle = Math.random() * Math.PI * 2;
  const dx = Math.cos(angle), dy = Math.sin(angle);
  const margin = 50;
  const dToEdgeX = (GAME_W / 2 + margin) / Math.max(0.0001, Math.abs(dx));
  const dToEdgeY = (GAME_H / 2 + margin) / Math.max(0.0001, Math.abs(dy));
  const dist = Math.min(dToEdgeX, dToEdgeY);
  const x = CENTER.x + dx * dist;
  const y = CENTER.y + dy * dist;
  const boss = makeBoss(scene, x, y, stage);
  scene.enemies.add(boss);
  return boss;
}

function trySpawnEnemy(scene) {
  if (isGameOver || scenePaused) return;
  if (bossPhase !== 'mobs') return;
  if (countLiveEnemies(scene) >= MAX_ENEMIES_ON_SCREEN) return;
  spawnSlimeAtEdge(scene);
}

function countLiveEnemies(scene) {
  return scene.enemies.getChildren().filter((e) => e.active).length;
}

// === Stage progression =====================================================

function startStage(scene) {
  bossPhase = 'mobs';
  currentBoss = null;
  bossTimerRemaining = 0;
  hideBossUI(scene);
  mobsKilledThisStage = 0;

  // Apply biome (redraws terrain if biome changed)
  applyBiome(scene, getBiomeIndexForStage(stage));

  if (scene.spawnTimer) scene.spawnTimer.remove();
  scene.spawnTimer = scene.time.addEvent({
    delay: getStageSpawnDelay(stage), // stage 1~50 동안 3000→1000 선형 감소, 이후 1000 고정
    loop: true,
    callback: () => trySpawnEnemy(scene),
  });

  showStageBanner(scene);
  updateStageUI(scene);
}

function maybeAutoChallenge(scene) {
  if (!autoBossSummon || !canChallengeBoss()) return;
  scene.time.delayedCall(800, () => {
    if (autoBossSummon && canChallengeBoss()) challengeBoss(scene);
  });
}

function challengeBoss(scene, force) {
  if (!force && !canChallengeBoss()) return;
  if (bossPhase === 'boss-fight') return; // 이미 보스전이면 중복 방지
  // 진행 중인 잡몹 모두 제거 — 보스 단독 전투 (보상/킬카운트 없음)
  clearActiveMobs(scene);
  bossPhase = 'boss-fight';
  bossTimerRemaining = BOSS_TIME_LIMIT_SEC;
  currentBoss = spawnBossAtEdge(scene);
  showBossUI(scene);
  showBossBanner(scene);
  updateStageUI(scene);
}

function clearActiveMobs(scene) {
  scene.enemies.getChildren().forEach((e) => {
    if (!e.active || e.isBoss) return;
    e.setActive(false);
    if (e.hpBar) {
      if (e.hpBar.bg) e.hpBar.bg.destroy();
      if (e.hpBar.fill) e.hpBar.fill.destroy();
    }
    if (e.shadow) {
      scene.tweens.add({
        targets: e.shadow, alpha: 0, duration: 220,
        onComplete: () => e.shadow.destroy(),
      });
    }
    scene.tweens.add({
      targets: e, alpha: 0, scaleX: 0.5, scaleY: 0.5,
      duration: 220, ease: 'Quad.easeIn',
      onComplete: () => e.destroy(),
    });
  });
  // 영웅 상태 강제 리셋 — 잡몹 target 잔재 + anim lock 풀어 보스로 즉시 전환되도록
  if (scene.allies) {
    scene.allies.getChildren().forEach((h) => {
      h.target = null;
      h.forcedTarget = null;
      h.forcedTargetUntil = 0;
      h._animLockUntil = 0;
      h._currentAnim = null;
      if (h.heroSprite && h.heroSprite.anims) h.heroSprite.anims.stop();
    });
  }
}

function onMobKilled(scene) {
  mobsKilledThisStage += 1;
  updateStageUI(scene);
  if (mobsKilledThisStage === BOSS_UNLOCK_KILLS) {
    maybeAutoChallenge(scene);
  }
}

function onBossTimeout(scene) {
  if (bossPhase !== 'boss-fight') return;
  escapeBoss(scene);
  bossPhase = 'mobs';
  hideBossUI(scene);
  autoBossSummon = false;
  // 보스 패배 보상 — 골드 100 고정
  gold += GOLD_PER_BOSS_FAIL;
  updateGoldUI(scene);
  updateTavernButton(scene);
  saveGame(scene);
  showBossResultBanner(scene, false);
  updateStageUI(scene);
}

function escapeBoss(scene) {
  const boss = currentBoss;
  currentBoss = null;
  if (!boss) return;
  boss.setActive(false);
  if (boss.hpBar) {
    boss.hpBar.bg.destroy();
    boss.hpBar.fill.destroy();
  }
  if (boss.shadow) {
    scene.tweens.add({
      targets: boss.shadow, alpha: 0, duration: 400,
      onComplete: () => boss.shadow.destroy(),
    });
  }
  scene.tweens.add({
    targets: boss, alpha: 0, scaleX: 0.6, scaleY: 0.6,
    duration: 400, ease: 'Quad.easeIn',
    onComplete: () => boss.destroy(),
  });
}

function showBossFailBanner(scene) {
  showBossResultBanner(scene, false);
}

function onBossKilled(scene) {
  bossPhase = 'transition';
  currentBoss = null;
  hideBossUI(scene);

  // 보스 승리 보상 — 보석 100 고정 (gems += GEMS_PER_BOSS는 onUnitDeath에서 이미 처리됨)
  updateGoldUI(scene);
  updateTavernButton(scene);
  showBossResultBanner(scene, true);

  scene.time.delayedCall(STAGE_TRANSITION_MS, () => {
    if (isGameOver) return;
    stage += 1;
    saveGame(scene);
    startStage(scene);
  });
}

function showStageBanner(scene) {
  // Layer Lab ActionText_Go 스프라이트 — 절반 크기, 통통 튀는 연출
  const FINAL = 0.35; // 기본 크기의 0.5 → 0.35 (30% 추가 감소)
  const banner = scene.add.image(CENTER.x, CENTER.y - 200, 'ui_action_go')
    .setOrigin(0.5).setDepth(45).setAlpha(0).setScale(FINAL * 0.2);
  // 1단계: 팝인 (오버슈트, 0.1 → 0.65)
  scene.tweens.add({
    targets: banner, alpha: 1, scale: FINAL * 1.3,
    duration: 220, ease: 'Back.easeOut',
  });
  // 2단계: 쪼그라들기 (튕김, → 0.42)
  scene.tweens.add({
    targets: banner, scale: FINAL * 0.85,
    duration: 140, delay: 220, ease: 'Quad.easeIn',
  });
  // 3단계: 다시 살짝 (→ 0.55)
  scene.tweens.add({
    targets: banner, scale: FINAL * 1.1,
    duration: 120, delay: 360, ease: 'Quad.easeOut',
  });
  // 4단계: 안정 (→ 0.5)
  scene.tweens.add({
    targets: banner, scale: FINAL,
    duration: 100, delay: 480, ease: 'Quad.easeOut',
  });
  // 5단계: 미세 펄스 (호흡)
  scene.tweens.add({
    targets: banner, scale: FINAL * 1.04,
    duration: 300, delay: 580, yoyo: true, repeat: 1, ease: 'Sine.easeInOut',
  });
  // 6단계: 페이드아웃 + 줌
  scene.tweens.add({
    targets: banner, alpha: 0, scale: FINAL * 1.25,
    duration: 350, delay: 1380, ease: 'Quad.easeIn',
    onComplete: () => banner.destroy(),
  });
}

function showBossBanner(scene) {
  const banner = scene.add.text(CENTER.x, CENTER.y - 200, 'BOSS!', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '50px',
    color: '#FF6666', stroke: '#1F1208', strokeThickness: 6,
  }).setOrigin(0.5).setDepth(45).setAlpha(0).setScale(0.5);
  scene.tweens.add({
    targets: banner, alpha: 1, scale: 1.1, duration: 300, ease: 'Back.easeOut',
  });
  scene.tweens.add({
    targets: banner, alpha: 0, duration: 400, delay: 1100,
    onComplete: () => banner.destroy(),
  });
  scene.cameras.main.shake(150, 0.008);
}

function showStageClearBanner(scene, bonus) {
  // legacy — 새 banner로 라우팅
  showBossResultBanner(scene, true);
}

// 보상 아이콘 N개가 시작점에서 흩뿌려져 HUD 재화 카운터로 빨려가는 연출 (보스 결과 = 가이드 미션 공용)
function flyRewardToHud(scene, startX, startY, iconKey, targetPill, count, delay0) {
  if (!targetPill) return;
  const tx = targetPill.x, ty = targetPill.y;
  const d0 = delay0 || 0;
  for (let i = 0; i < count; i++) {
    const small = scene.add.image(startX, startY, iconKey).setDisplaySize(22, 22).setDepth(74).setAlpha(0);
    const ang = Math.random() * Math.PI * 2;
    const dist = 12 + Math.random() * 18;
    const sX = startX + Math.cos(ang) * dist, sY = startY + Math.sin(ang) * dist;
    const bd = d0 + i * 40;
    // 1단계: 시작점에서 약간 흩뿌림 + 등장
    scene.tweens.add({ targets: small, x: sX, y: sY, alpha: 1, duration: 160, delay: bd, ease: 'Quad.easeOut' });
    // 2단계: HUD pill로 빨려감 + punch
    scene.tweens.add({
      targets: small, x: tx, y: ty, alpha: 0, scaleX: 0.5, scaleY: 0.5,
      duration: 420, delay: bd + 160, ease: 'Cubic.easeIn',
      onComplete: () => { small.destroy(); if (typeof punchCounter === 'function') punchCounter(targetPill); },
    });
  }
}

// 보스 승리/패배 결과 banner — Layer Lab 리본 + REWARDS 영역 + 보상 카드
// 토스트 형식 (어두운 BG 없음). 약 2.4초 후 fade out.
function showBossResultBanner(scene, isVictory) {
  const cx = CENTER.x;
  // 승리/패배 영역 (배지+리본+라벨)은 30% 축소. REWARDS/보상 카드는 그대로.
  const cyBadge = CENTER.y - 120;
  const cyRibbon = CENTER.y - 25;
  const cyRewardsLabel = CENTER.y + 35;
  const cyRewardCard = CENTER.y + 95;
  const parts = [];

  // 0) 배지 일러스트 (Wing/Skull) — 30% 축소
  const badgeKey = isVictory ? 'ui_badge_victory' : 'ui_badge_defeat';
  const badgeH = isVictory ? 168 : 140;
  const badgeRatio = isVictory ? (536 / 460) : (568 / 320);
  const badgeW = badgeH * badgeRatio;

  // 승리 한정 — 배지 뒤 빛 이펙트 (맨 뒤 레이어). 30% 축소 + 50% 투명도.
  let victoryLight = null;
  if (isVictory) {
    const lightW = badgeW * 1.61; // 1.4 × 1.15 (15% 추가 확대)
    const lightH = lightW * (129 / 322);
    victoryLight = scene.add.image(cx, cyBadge, 'ui_effect_light_badge')
      .setDisplaySize(lightW, lightH).setDepth(70).setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD);
    // parts에 push 안 함 — 알파 0.5로 별도 tween (다른 parts는 alpha 1까지 fade)
  }

  const badge = scene.add.image(cx, cyBadge, badgeKey)
    .setDisplaySize(badgeW, badgeH).setDepth(71).setAlpha(0);
  parts.push(badge);

  // 0a) 승리 한정 — 검 X 크레스트 (Wing2). 30% 축소 + 아래로 내려 리본/글씨에 살짝 가려지게.
  if (isVictory) {
    const crestH = badgeH * 0.42; // 0.6 × 0.7 = 0.42 (30% 축소)
    const crestRatio = 305 / 235;
    const crestW = crestH * crestRatio;
    const crest = scene.add.image(cx, cyBadge + badgeH * 0.28, 'ui_badge_victory_swords')
      .setDisplaySize(crestW, crestH).setDepth(71.5).setAlpha(0);
    parts.push(crest);
  }

  // 1) 와이드 리본 + 라벨 텍스트 — 30% 축소 (74→52)
  const ribbonKey = isVictory ? 'ui_ribbon_wide_blue' : 'ui_ribbon_wide_red';
  const ribbonH = 52;
  const ribbonW = ribbonH * (659 / 136);
  const ribbon = scene.add.image(cx, cyRibbon, ribbonKey)
    .setDisplaySize(ribbonW, ribbonH).setDepth(72).setAlpha(0);
  const labelText = isVictory ? 'VICTORY' : 'DEFEAT';
  // 라벨 30% 축소 (28→20), descender 짤림 방지로 y 살짝 위로
  // padding으로 text 박스 확장 — stroke가 좌/우 끝에서 짤리는 Phaser 이슈 회피
  const label = scene.add.text(cx, cyRibbon - 3, labelText, {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '20px',
    color: '#FFFFFF', stroke: '#000000', strokeThickness: 4,
    shadow: { offsetX: 0, offsetY: 2, color: '#000', blur: 3, fill: true },
    padding: { x: 6, y: 4 },
  }).setOrigin(0.5).setDepth(73).setAlpha(0);
  if (label.setLetterSpacing) label.setLetterSpacing(3);
  parts.push(ribbon, label);

  // 2) REWARDS 라벨 + 토스트식 ornament (좌우 라인 + 다이아)
  const rewardsText = scene.add.text(cx, cyRewardsLabel, 'REWARDS', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '15px',
    color: '#FFFFFF', stroke: '#000000', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(73).setAlpha(0);
  const halfW = rewardsText.width / 2;
  const gap = 12;
  const lineLen = 30;
  const diaSize = 3;
  const lineDiaGap = 5;
  const orn = scene.add.graphics().setDepth(73).setAlpha(0);
  const leftLineInner = cx - halfW - gap;
  const leftLineOuter = leftLineInner - lineLen;
  const leftDiaCX = leftLineOuter - lineDiaGap - diaSize;
  const rightLineInner = cx + halfW + gap;
  const rightLineOuter = rightLineInner + lineLen;
  const rightDiaCX = rightLineOuter + lineDiaGap + diaSize;
  orn.lineStyle(4, 0x000000, 1);
  orn.beginPath();
  orn.moveTo(leftLineOuter - 1, cyRewardsLabel); orn.lineTo(leftLineInner + 1, cyRewardsLabel);
  orn.moveTo(rightLineInner - 1, cyRewardsLabel); orn.lineTo(rightLineOuter + 1, cyRewardsLabel);
  orn.strokePath();
  orn.lineStyle(2, 0xFFFFFF, 1);
  orn.beginPath();
  orn.moveTo(leftLineOuter, cyRewardsLabel); orn.lineTo(leftLineInner, cyRewardsLabel);
  orn.moveTo(rightLineInner, cyRewardsLabel); orn.lineTo(rightLineOuter, cyRewardsLabel);
  orn.strokePath();
  const drawDia = (dx, sz, color) => {
    orn.fillStyle(color, 1);
    orn.fillPoints([
      { x: dx, y: cyRewardsLabel - sz },
      { x: dx + sz, y: cyRewardsLabel },
      { x: dx, y: cyRewardsLabel + sz },
      { x: dx - sz, y: cyRewardsLabel },
    ], true);
  };
  drawDia(leftDiaCX, diaSize + 1.5, 0x000000);
  drawDia(rightDiaCX, diaSize + 1.5, 0x000000);
  drawDia(leftDiaCX, diaSize, 0xFFFFFF);
  drawDia(rightDiaCX, diaSize, 0xFFFFFF);
  parts.push(rewardsText, orn);

  // 3) 보상 카드 — Layer Lab K-275 슬롯 sprite (골드=흰색, 보석=보라색)
  // 아이콘은 정중앙, 수량은 우측 하단 정렬 (아이콘 위 오버레이 OK)
  const iconKey = isVictory ? 'ui_rb_icon_gem' : 'ui_rb_icon_coin';
  const slotKey = isVictory ? 'ui_reward_slot_gem' : 'ui_reward_slot_gold';
  const amount = isVictory ? GEMS_PER_BOSS : GOLD_PER_BOSS_FAIL;
  const slotSize = 68;
  const cardBg = scene.add.image(cx, cyRewardCard, slotKey)
    .setDisplaySize(slotSize, slotSize).setDepth(72).setAlpha(0);
  const rewardIcon = scene.add.image(cx, cyRewardCard, iconKey)
    .setDisplaySize(50, 50).setDepth(73).setAlpha(0);
  const textPad = 6;
  const rewardText = scene.add.text(
    cx + slotSize / 2 - textPad,
    cyRewardCard + slotSize / 2 - textPad,
    String(amount),
    {
      fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '15px',
      color: '#FFFFFF', stroke: '#000000', strokeThickness: 3.5,
      shadow: { offsetX: 0, offsetY: 2, color: '#000', blur: 3, fill: true },
    }
  ).setOrigin(1, 1).setDepth(74).setAlpha(0);
  parts.push(cardBg, rewardIcon, rewardText);

  // 등장: 위에서 아래로 살짝 + 페이드인 (토스트 패턴)
  const startOffset = 12;
  parts.forEach((p) => { p.y -= startOffset; });
  scene.tweens.add({
    targets: parts, alpha: 1, y: '+=' + startOffset,
    duration: 260, ease: 'Back.easeOut',
  });
  // 빛 이펙트는 최대 alpha 0.5로 별도 tween
  if (victoryLight) {
    victoryLight.y -= startOffset;
    scene.tweens.add({
      targets: victoryLight, alpha: 0.5, y: '+=' + startOffset,
      duration: 260, ease: 'Back.easeOut',
    });
  }
  // 2.4초 후 페이드아웃 — banner 전체 fade. 슬롯/숫자는 제자리 fade. 아이콘은 별도 spawn으로 HUD 이동.
  const fadeDelay = 2400;
  scene.tweens.add({
    targets: parts, alpha: 0,
    duration: 380, delay: fadeDelay, ease: 'Quad.easeIn',
    onComplete: () => parts.forEach((p) => p.destroy()),
  });
  if (victoryLight) {
    scene.tweens.add({
      targets: victoryLight, alpha: 0,
      duration: 380, delay: fadeDelay, ease: 'Quad.easeIn',
      onComplete: () => victoryLight.destroy(),
    });
  }
  // HUD pill로 빨려가는 작은 아이콘 N개 — fade 시점에 카드 위치에서 spawn (공용 연출)
  const targetPill = isVictory ? scene.uiGems : scene.uiGold;
  flyRewardToHud(scene, cx, cyRewardCard, iconKey, targetPill, 10, fadeDelay);
}

// === AI ticks ==============================================================

function tickAlly(scene, ally, dt, delta, time) {
  if (!ally.active || !ally.alive) return;

  if (ally.isBeingDragged) {
    // 드래그 중엔 AI 정지 (스킬 쿨도 일시정지). 위치는 drag 핸들러가 직접 갱신.
    return;
  }

  if (SKILLS_ENABLED) {
    ally.skillCooldown -= delta;
    if (ally.skillCooldown <= 0) {
      const cls = ally.classDef;
      cls.skill.fire(scene, ally);
      ally.skillCooldown = cls.skill.cooldownMs;
      if (ally.heroDef && ally.heroDef.animKeys && ally.heroDef.animKeys.skill) {
        playHeroAnim(scene, ally, 'skill', { lockMs: 1100 });
      }
    }
  }

  // 패시브 도발 (딴딴기사 등): tauntRange 안 모든 적을 forcedTarget=self로 묶음
  if (ally.heroDef && ally.heroDef.tauntRange) {
    applyTauntAura(scene, ally, time);
  }

  // 힐러(응급할배 등): 적 대신 부상 아군을 target으로
  const isHealer = ally.heroDef && ally.heroDef.attackType === 'heal';
  if (isHealer) {
    refreshHealTarget(ally, scene.allies, time);
  } else {
    refreshTarget(ally, scene.enemies, time);
  }
  if (ally.target) {
    if (ally.homeAnchor) releaseHomeAnchor(ally);
    engageOrChase(scene, ally, ally.target, dt, delta);
  } else {
    if (!ally.homeAnchor) claimNearestHomeAnchor(scene, ally);
    returnHome(ally, dt);
  }
  applyCastleCollision(ally);
  syncUnit(ally);
  updateHeroAnim(scene, ally);
}

// 힐러용 타겟 갱신: 가장 부상 심한 (hp/maxHp 낮은) 아군을 detectRange 안에서 선택.
// 자기 자신 포함. 부상자 없으면 target null → idle/home으로 복귀.
function refreshHealTarget(healer, allyGroup, time) {
  if (healer.target) {
    const t = healer.target;
    if (!t.active || t.alive === false || t.hp <= 0 || t.hp >= t.maxHp) {
      healer.target = null;
    } else {
      const d = Math.hypot(t.x - healer.x, t.y - healer.y);
      if (d > healer.detectRange * 1.6) healer.target = null;
    }
  }
  if (!healer.target) {
    let best = null, bestRatio = 1.0;
    allyGroup.getChildren().forEach((u) => {
      if (!u.active || u.alive === false || u.hp <= 0) return;
      if (u.hp >= u.maxHp) return; // 완전 회복 상태는 대상 아님
      const d = Math.hypot(u.x - healer.x, u.y - healer.y);
      if (d > healer.detectRange) return;
      const ratio = u.hp / u.maxHp;
      if (ratio < bestRatio) { best = u; bestRatio = ratio; }
    });
    healer.target = best;
  }
}

// 패시브 도발: tauntRange 안 적 전부 forcedTarget=hero로 매 틱 갱신.
// forcedTargetUntil은 짧게(700ms) 둬서 범위 벗어나면 자연 해제. 220ms 간격 시각 펄스.
function applyTauntAura(scene, hero, time) {
  const r = hero.heroDef.tauntRange;
  const r2 = r * r;
  scene.enemies.getChildren().forEach((e) => {
    if (!e.active || e.alive === false || e.hp <= 0) return;
    const dx = e.x - hero.x, dy = e.y - hero.y;
    if (dx * dx + dy * dy > r2) return;
    e.forcedTarget = hero;
    e.forcedTargetUntil = time + 700;
  });
  if (!hero._lastTauntPulse || time - hero._lastTauntPulse > 1200) {
    hero._lastTauntPulse = time;
    const ring = scene.add.circle(hero.x, hero.y, r * 0.4, 0xE8B040, 0.18)
      .setStrokeStyle(2, 0xFFD680, 0.55).setDepth((hero.depth || 4) - 0.5);
    scene.tweens.add({
      targets: ring, scale: 2.5, alpha: 0,
      duration: 1000, ease: 'Sine.easeOut',
      onComplete: () => ring.destroy(),
    });
  }
}

function tickEnemy(scene, enemy, dt, delta, time) {
  if (!enemy.active) return;

  // 성 공격 사거리 안 + 피격 어그로 없음 → 영웅 무시하고 성에 집중
  const dxC = CENTER.x - enemy.x;
  const dyC = CENTER.y - enemy.y;
  const distToCastle = Math.hypot(dxC, dyC);
  const castleStopAt = CASTLE_RADIUS + enemy.attackRange * 0.4;
  const hasForcedTarget = enemy.forcedTarget && enemy.forcedTargetUntil > time
    && enemy.forcedTarget.active && enemy.forcedTarget.alive !== false;
  if (distToCastle <= castleStopAt && !hasForcedTarget) {
    enemy.target = null;
    advanceOnCastle(scene, enemy, dt, delta);
    applyCastleCollision(enemy);
    syncUnit(enemy);
    return;
  }

  refreshTarget(enemy, scene.allies, time);
  if (enemy.target) engageOrChase(scene, enemy, enemy.target, dt, delta);
  else advanceOnCastle(scene, enemy, dt, delta);
  applyCastleCollision(enemy);
  syncUnit(enemy);
}

function refreshTarget(unit, opposingGroup, time) {
  if (unit.forcedTarget && unit.forcedTargetUntil > time) {
    if (unit.forcedTarget.active && unit.forcedTarget.alive !== false) {
      unit.target = unit.forcedTarget;
      return;
    }
  }
  unit.forcedTarget = null;

  if (unit.target) {
    const t = unit.target;
    if (!t.active || t.hp <= 0 || t.alive === false) {
      unit.target = null;
    } else {
      // 리쉬: 인식 범위를 벗어나면 어그로 풀림. 성을 우회해야 하면 우회 거리 기준 + 여유를 둠
      // (성 뒤로 돌아가는 도중 직선거리가 늘어나 target을 놓치는 현상 방지)
      const d = pathDistanceTo(unit.x, unit.y, t.x, t.y);
      if (d > unit.detectRange * 1.6) unit.target = null;
    }
  }
  if (!unit.target) {
    unit.target = findNearestInGroup(opposingGroup, unit.x, unit.y, unit.detectRange);
  }
}

// 피격 시 보복 어그로: 영웅 + 적 모두 적용.
// 적은 성 공격 중에도 피격받으면 공격자(영웅)로 어그로 전환.
// 이미 사거리 안에서 교전 중이면 유지(타겟 핑퐁 방지).
function aggroOnHit(scene, attacker, target) {
  if (!target) return;
  if (!target.heroDef && !target.isEnemy) return; // 영웅/적만 적용 (성 등 제외)
  if (!attacker || !attacker.active || attacker.alive === false) return;
  const cur = target.target;
  if (cur && cur.active && cur.hp > 0) {
    const dCur = Math.hypot(cur.x - target.x, cur.y - target.y);
    if (dCur <= target.attackRange) return;
  }
  target.forcedTarget = attacker;
  target.forcedTargetUntil = scene.time.now + 2500;
}

function engageOrChase(scene, unit, target, dt, delta) {
  const dx = target.x - unit.x;
  const dy = target.y - unit.y;
  const d = Math.hypot(dx, dy);
  if (unit.rotates && d > 0.5) unit.rotation = Math.atan2(dy, dx);
  updateSpriteFacing(unit, dx);
  // 성이 둘 사이를 가로막으면 공격 사거리 안이어도 우회 — 사거리 판정에 우회 보너스 추가
  const blocked = lineCrossesCastleBox(unit.x, unit.y, target.x, target.y);
  if (d <= unit.attackRange && !blocked) {
    unit.attackCooldown -= delta;
    if (unit.attackCooldown <= 0) {
      attackTarget(scene, unit, target);
      unit.attackCooldown = unit.attackInterval;
      // anim 있는 영웅(미남 전사 등)은 attack anim 한 사이클 재생 잠그기
      if (unit.heroDef && unit.heroDef.animKeys && unit.heroDef.animKeys.attack) {
        playHeroAnim(scene, unit, 'attack', { lockMs: Math.min(unit.attackInterval, 800) });
      }
    }
  } else {
    // 백스오 등 dashSpeedMult heroDef는 chase 중 빠르게 돌진 (바람돌진)
    const dashMult = (unit.heroDef && unit.heroDef.dashSpeedMult) || 1;
    const slowMult = effectiveSpeedMult(unit, scene.time.now);
    moveUnitToward(unit, target.x, target.y, unit.speed * dashMult * slowMult * dt);
    if (dashMult > 1.5 && unit.heroDef && unit.heroDef.dashTrail) {
      spawnDashTrail(scene, unit);
    }
  }
}

// dash 잔상 — 현재 sprite frame을 반투명 ghost로 spawn해서 fade out.
// chase 중 60ms 간격으로 호출 → 바람 같은 모션 트레일.
function spawnDashTrail(scene, unit) {
  const now = scene.time.now;
  if (unit._lastDashTrail && now - unit._lastDashTrail < 55) return;
  unit._lastDashTrail = now;
  const src = unit.heroSprite;
  if (!src || !src.texture || !src.frame) return;
  const ghost = scene.add.image(unit.x, unit.y, src.texture.key, src.frame.name);
  ghost.setScale(src.scaleX, src.scaleY);
  ghost.setDepth((unit.depth || 4) - 0.5);
  ghost.setAlpha(0.5);
  ghost.setTint(0xCFE4FF);
  scene.tweens.add({
    targets: ghost, alpha: 0, scaleX: src.scaleX * 0.92, scaleY: src.scaleY * 0.92,
    duration: 280, ease: 'Quad.easeOut',
    onComplete: () => ghost.destroy(),
  });
}

// 성을 우회해야 하는 경우의 실효 이동 거리. 직선이 박스를 가로지르지 않으면 직선거리.
// 가시성 그래프를 따라 최대 2코너까지 추적해서 실제 경로 길이를 반환.
function pathDistanceTo(ax, ay, bx, by) {
  if (!lineCrossesCastleBox(ax, ay, bx, by)) {
    return Math.hypot(bx - ax, by - ay);
  }
  let cx = ax, cy = ay, total = 0;
  for (let step = 0; step < 3; step++) {
    const wp = chooseCastleWaypoint(cx, cy, bx, by);
    if (!wp) break;
    total += Math.hypot(wp.x - cx, wp.y - cy);
    cx = wp.x; cy = wp.y;
    if (!lineCrossesCastleBox(cx, cy, bx, by)) break;
  }
  return total + Math.hypot(bx - cx, by - cy);
}

// 성 박스를 직선이 가로지르면 가장 효율적인 모서리 웨이포인트로 우회.
// 매 프레임 재계산되므로 모서리 도달 시 자동으로 다음 단계로 전환.
function moveUnitToward(unit, tx, ty, distancePerFrame) {
  let goalX = tx, goalY = ty;
  if (lineCrossesCastleBox(unit.x, unit.y, tx, ty)) {
    const wp = chooseCastleWaypoint(unit.x, unit.y, tx, ty);
    if (wp) { goalX = wp.x; goalY = wp.y; }
  }
  const dx = goalX - unit.x;
  const dy = goalY - unit.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.5) return;
  const mx = (dx / d) * distancePerFrame;
  const my = (dy / d) * distancePerFrame;
  // 축 분리 콜리전: 한 축씩 이동 시도, 박스 안이면 그 축은 거부
  const nx = unit.x + mx;
  if (!isInsideCastleBox(nx, unit.y)) unit.x = nx;
  const ny = unit.y + my;
  if (!isInsideCastleBox(unit.x, ny)) unit.y = ny;
}

function isInsideCastleBox(x, y) {
  return Math.abs(x - CENTER.x) < CASTLE_COL_HALF_W &&
         Math.abs(y - CENTER.y) < CASTLE_COL_HALF_H;
}

function lineCrossesCastleBox(ax, ay, bx, by) {
  const minX = CENTER.x - CASTLE_COL_HALF_W;
  const maxX = CENTER.x + CASTLE_COL_HALF_W;
  const minY = CENTER.y - CASTLE_COL_HALF_H;
  const maxY = CENTER.y + CASTLE_COL_HALF_H;
  const dx = bx - ax, dy = by - ay;
  let tMin = 0, tMax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (ax <= minX || ax >= maxX) return false;
  } else {
    const t1 = (minX - ax) / dx;
    const t2 = (maxX - ax) / dx;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
    if (tMin > tMax) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (ay <= minY || ay >= maxY) return false;
  } else {
    const t1 = (minY - ay) / dy;
    const t2 = (maxY - ay) / dy;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
    if (tMin > tMax) return false;
  }
  return tMin < 1 && tMax > 0;
}

// 4개 코너 웨이포인트(성 외곽 여유 m 포함). 캐스트는 한 번만 — 호출당 같은 객체 재사용.
const CASTLE_WAYPOINT_MARGIN = 14;
const CASTLE_CORNERS = [
  { x: CENTER.x - CASTLE_COL_HALF_W - CASTLE_WAYPOINT_MARGIN, y: CENTER.y - CASTLE_COL_HALF_H - CASTLE_WAYPOINT_MARGIN }, // 0: TL
  { x: CENTER.x + CASTLE_COL_HALF_W + CASTLE_WAYPOINT_MARGIN, y: CENTER.y - CASTLE_COL_HALF_H - CASTLE_WAYPOINT_MARGIN }, // 1: TR
  { x: CENTER.x - CASTLE_COL_HALF_W - CASTLE_WAYPOINT_MARGIN, y: CENTER.y + CASTLE_COL_HALF_H + CASTLE_WAYPOINT_MARGIN }, // 2: BL
  { x: CENTER.x + CASTLE_COL_HALF_W + CASTLE_WAYPOINT_MARGIN, y: CENTER.y + CASTLE_COL_HALF_H + CASTLE_WAYPOINT_MARGIN }, // 3: BR
];

// 가시성 그래프 기반 최단 우회 경로의 다음 웨이포인트.
// 1코너 경로(unit→corner→target)와 2코너 경로(unit→C1→C2→target)를 모두 평가하고
// 비용이 최소인 경로의 FIRST 코너를 반환. 프레임 간 진동 없음.
function chooseCastleWaypoint(ax, ay, tx, ty) {
  const cs = CASTLE_CORNERS;
  let best = null, bestCost = Infinity;

  // 1-corner: unit → c → target
  for (let i = 0; i < 4; i++) {
    const c = cs[i];
    if (lineCrossesCastleBox(ax, ay, c.x, c.y)) continue;
    if (lineCrossesCastleBox(c.x, c.y, tx, ty)) continue;
    const cost = Math.hypot(c.x - ax, c.y - ay) + Math.hypot(tx - c.x, ty - c.y);
    if (cost < bestCost) { bestCost = cost; best = c; }
  }

  // 2-corner: unit → c1 → c2 → target  (return c1 — 다음으로 갈 곳)
  for (let i = 0; i < 4; i++) {
    const c1 = cs[i];
    if (lineCrossesCastleBox(ax, ay, c1.x, c1.y)) continue;
    for (let j = 0; j < 4; j++) {
      if (j === i) continue;
      const c2 = cs[j];
      if (lineCrossesCastleBox(c1.x, c1.y, c2.x, c2.y)) continue;
      if (lineCrossesCastleBox(c2.x, c2.y, tx, ty)) continue;
      const cost = Math.hypot(c1.x - ax, c1.y - ay)
                 + Math.hypot(c2.x - c1.x, c2.y - c1.y)
                 + Math.hypot(tx - c2.x, ty - c2.y);
      if (cost < bestCost) { bestCost = cost; best = c1; }
    }
  }
  return best;
}

function returnHome(ally, dt) {
  const dx = ally.homeX - ally.x;
  const dy = ally.homeY - ally.y;
  const d = Math.hypot(dx, dy);
  if (d > 2) {
    if (ally.rotates) ally.rotation = Math.atan2(dy, dx);
    updateSpriteFacing(ally, dx);
    // 성을 우회하는 경로로 슬롯 복귀 — 직선 이동 시 성 모서리에 막혀 멈추는 현상 방지
    moveUnitToward(ally, ally.homeX, ally.homeY, ally.speed * dt);
  } else if (ally.rotates) {
    ally.rotation = Math.atan2(ally.y - CENTER.y, ally.x - CENTER.x);
  } else {
    // 슬롯에 도착 후 정지: 성 바깥쪽을 향하도록 (전투 대기 자세)
    updateSpriteFacing(ally, ally.x - CENTER.x);
  }
}

function buildCastleStatusUI(scene) {
  // 닉네임/레벨/EXP는 모두 상단 프로필 바에서 보여줌 — 성 주변에는 표시 안 함.
}

function makeExpBar(scene, x, y, w, h) {
  const bg = scene.add.rectangle(x, y, w + 2, h + 2, COLOR.shadow, 0.7).setOrigin(0.5);
  const fill = scene.add.rectangle(x - w / 2, y, w, h, COLOR.gold).setOrigin(0, 0.5);
  fill.scaleX = 0;
  bg.setDepth(14);
  fill.setDepth(15);
  return { bg, fill, w };
}

function updateCastleStatusUI(scene) {
  if (scene.uiCastleNameTop) scene.uiCastleNameTop.setText(castleNickname);
  if (scene.uiCastleLevelText) scene.uiCastleLevelText.setText(String(castleLevel));
  const pct = castleLevel >= CASTLE_LEVEL_CAP
    ? 1
    : Math.min(1, castleExp / castleExpToNextLevel(castleLevel));
  if (scene.uiExpFill) {
    // Graphics: 평행사변형 (대각선 끝점) — 위/아래 1px씩 inset해서 뒤 네이비가 위아래로 보이게
    const g = scene.uiExpFill;
    const h = scene.uiExpBarH || 14;
    const PAD = 1; // 위아래 여백 (뒤 네이비 보이게)
    const SKEW = 5; // 대각선 기울기
    const w = GAME_W * pct;
    g.clear();
    if (w > 0.5) {
      g.fillStyle(0xFF8830, 1);
      g.beginPath();
      g.moveTo(0, PAD);
      g.lineTo(w, PAD);
      g.lineTo(Math.max(0, w - SKEW), h - PAD);
      g.lineTo(0, h - PAD);
      g.closePath();
      g.fillPath();
    }
  }
  if (scene.uiExpText) {
    scene.uiExpText.setText(castleLevel >= CASTLE_LEVEL_CAP ? 'MAX' : `EXP ${Math.floor(pct * 100)}%`);
  }
}

function addCastleExp(scene, amount) {
  if (castleLevel >= CASTLE_LEVEL_CAP) {
    updateCastleStatusUI(scene);
    return;
  }
  castleExp += amount;
  let leveled = 0;
  while (castleLevel < CASTLE_LEVEL_CAP && castleExp >= castleExpToNextLevel(castleLevel)) {
    castleExp -= castleExpToNextLevel(castleLevel);
    castleLevel += 1;
    leveled += 1;
  }
  if (castleLevel >= CASTLE_LEVEL_CAP) castleExp = 0;
  if (leveled > 0) onCastleLevelUp(scene, leveled);
  updateCastleStatusUI(scene);
}

function onCastleLevelUp(scene, gainedLevels) {
  castleStatPoints += gainedLevels;
  castleMaxHp = computeCastleMaxHp();
  castleHP = castleMaxHp;
  updateHpBar(scene.castleHpBar, castleHP, castleMaxHp);
  flashCastleLevelUp(scene);
  refreshTabBar(scene);
  refreshGrowthModal(scene);
  refreshHeroSlotUnlock(scene);
  saveGame(scene);
}

function computeCastleMaxHp() {
  return CASTLE_MAX_HP + (castleLevel - 1) * CASTLE_HP_PER_LEVEL + castleStatHp * STAT_HP_PER_POINT;
}

function clampStat(v) {
  return Math.max(0, Math.min(CASTLE_STAT_CAP, Math.floor(v)));
}

function getHeroDamageMultiplier() {
  return 1 + castleStatAtk * STAT_ATK_PCT_PER_POINT;
}

function refreshAllHeroStats(scene) {
  scene.allies.getChildren().forEach((h) => {
    const prevPct = h.maxHp > 0 ? h.hp / h.maxHp : 1;
    applyHeroStats(h);
    h.hp = Math.max(1, Math.round(h.maxHp * prevPct));
  });
}

function flashCastleLevelUp(scene) {
  // 심플 — "Level UP!" 텍스트만 팝 등장 → 떠오르며 페이드아웃
  const text = scene.add.text(CENTER.x, CENTER.y - 120, 'Level UP!', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '32px',
    color: '#FFD24A', stroke: '#1A0F08', strokeThickness: 5,
    shadow: { offsetX: 0, offsetY: 3, color: '#000', blur: 4, fill: true },
  }).setOrigin(0.5).setDepth(50).setAlpha(0).setScale(0.6);
  scene.tweens.add({ targets: text, alpha: 1, scale: 1, duration: 280, ease: 'Back.easeOut' });
  scene.tweens.add({
    targets: text, y: CENTER.y - 150, alpha: 0,
    duration: 550, delay: 700, ease: 'Quad.easeIn', onComplete: () => text.destroy(),
  });
}

function applyCastleCollision(unit) {
  const dx = unit.x - CENTER.x;
  const dy = unit.y - CENTER.y;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax >= CASTLE_COL_HALF_W || ay >= CASTLE_COL_HALF_H) return;
  const overX = CASTLE_COL_HALF_W - ax;
  const overY = CASTLE_COL_HALF_H - ay;
  if (overX < overY) {
    unit.x = CENTER.x + (dx >= 0 ? CASTLE_COL_HALF_W : -CASTLE_COL_HALF_W);
  } else {
    unit.y = CENTER.y + (dy >= 0 ? CASTLE_COL_HALF_H : -CASTLE_COL_HALF_H);
  }
}

function advanceOnCastle(scene, enemy, dt, delta) {
  const dx = CENTER.x - enemy.x;
  const dy = CENTER.y - enemy.y;
  const d = Math.hypot(dx, dy);
  const stopAt = CASTLE_RADIUS + enemy.attackRange * 0.4;
  if (d > stopAt) {
    if (enemy.rotates) enemy.rotation = Math.atan2(dy, dx);
    const sm = effectiveSpeedMult(enemy, scene.time.now);
    enemy.x += (dx / d) * enemy.speed * sm * dt;
    enemy.y += (dy / d) * enemy.speed * sm * dt;
  } else {
    enemy.attackCooldown -= delta;
    if (enemy.attackCooldown <= 0) {
      const dmg = Math.max(1, Math.floor(enemy.damage - castleStatDef * STAT_DEF_REDUCTION_PER_POINT));
      castleHP -= dmg;
      showDamagePopup(scene, CENTER.x, CENTER.y - 32, dmg, { enemy: true });
      flashCastle(scene);
      playSfxCastleHit();
      enemy.attackCooldown = enemy.attackInterval;
    }
  }
}

function findNearestInGroup(group, x, y, maxRange) {
  let best = null, bestD = maxRange;
  group.getChildren().forEach((u) => {
    if (!u.active || u.hp <= 0 || u.alive === false) return;
    const d = Phaser.Math.Distance.Between(x, y, u.x, u.y);
    if (d < bestD) { best = u; bestD = d; }
  });
  return best;
}

function syncUnit(unit) {
  if (unit.shadow && unit.shadow.visible) {
    unit.shadow.x = unit.x + (unit.isBoss ? 3 : 2);
    unit.shadow.y = unit.y + (unit.isBoss ? 18 : (unit.isEnemy ? 11 : 13));
  }
  if (unit.hpBar && unit.hpBar.bg.visible) {
    const x = unit.x;
    const y = unit.y - (unit.isBoss ? 38 : (unit.isEnemy ? 22 : 28));
    unit.hpBar.bg.x = x; unit.hpBar.bg.y = y;
    // fill은 graphics — bar.bg 위치 기반으로 updateHpBar에서 매번 redraw
    updateHpBar(unit.hpBar, unit.hp, unit.maxHp);
  }
}

// === Combat ================================================================

// 데미지 팝업 — 타겟 위로 숫자가 튀어오르며 페이드 (우르르 용병단 스타일)
// opts: { crit: bool, enemy: bool } — enemy=true면 몬스터가 때린 것 (붉은 톤)
function showDamagePopup(scene, x, y, dmg, opts) {
  const isCrit = opts && opts.crit;
  const isEnemy = opts && opts.enemy;
  // 컬러: 플레이어→몬스터 = 흰/노랑(crit), 몬스터→플레이어 = 붉은톤
  const color = isEnemy
    ? (isCrit ? '#FF7060' : '#FF9C8A')
    : (isCrit ? '#FFD24A' : '#FFFFFF');
  const stroke = isEnemy ? '#3A0A0A' : (isCrit ? '#7A1F02' : '#1F0410');
  const fontSize = isCrit ? '18px' : '13px';
  const strokeWidth = isCrit ? 4 : 3;
  // 약간의 가로 랜덤 오프셋 — 여러 히트가 한 자리에 안 겹치게
  const offsetX = Phaser.Math.Between(-10, 10);
  const startY = y - 6;
  const text = scene.add.text(x + offsetX, startY, String(Math.max(1, Math.floor(dmg))), {
    fontFamily: 'BMJUA', fontStyle: 'bold',
    fontSize, color, stroke, strokeThickness: strokeWidth,
  }).setOrigin(0.5, 1).setDepth(50).setScale(0.3);
  // 1단계: 팝-인 (커지면서 살짝 튕김)
  scene.tweens.add({
    targets: text, scale: isCrit ? 1.25 : 1.0,
    duration: 120, ease: 'Back.easeOut',
  });
  // 2단계: 위로 떠오르며 페이드아웃
  scene.tweens.add({
    targets: text, y: startY - 42, alpha: 0,
    duration: 550, delay: 180, ease: 'Quad.easeIn',
    onComplete: () => text.destroy(),
  });
}

function attackTarget(scene, attacker, target) {
  if (attacker.heroDef) {
    // 영웅 def.attackType이 있으면 그걸 우선 (class 기본을 override)
    const t = attacker.heroDef.attackType || attacker.classDef.attackType;
    if (t === 'ranged') return rangedStrike(scene, attacker, target);
    if (t === 'aoe') return aoeStrike(scene, attacker, target);
    if (t === 'icefall') return icefallStrike(scene, attacker, target);
    if (t === 'heal')   return healStrike(scene, attacker, target);
    if (t === 'beam')   return darkBeamStrike(scene, attacker, target);
  }
  meleeStrike(scene, attacker, target);
}

// 힐러 '공격' = 아군 회복. attacker.damage를 heal 양으로 사용.
// 시각: 타겟 위 초록 '+' 부유 + 발산 sparkle, 힐러→타겟 짧은 라인 광선.
function healStrike(scene, healer, target) {
  if (!target || !target.active || target.alive === false || target.hp <= 0) return;
  const amount = Math.max(1, Math.floor(healer.damage));
  const before = target.hp;
  target.hp = Math.min(target.hp + amount, target.maxHp);
  const healed = target.hp - before;
  if (healed <= 0) return;
  // 타겟 위 '+' 숫자
  const txt = scene.add.text(target.x, target.y - 18, '+' + healed, {
    fontFamily: 'BMJUA', fontStyle: 'bold',
    fontSize: '14px', color: '#9CFF8A', stroke: '#1A4A12', strokeThickness: 3,
  }).setOrigin(0.5, 1).setDepth(50).setScale(0.4);
  scene.tweens.add({ targets: txt, scale: 1.05, duration: 130, ease: 'Back.easeOut' });
  scene.tweens.add({
    targets: txt, y: target.y - 56, alpha: 0,
    duration: 600, delay: 180, ease: 'Quad.easeIn',
    onComplete: () => txt.destroy(),
  });
  // 타겟 발 밑에 초록 빛 ring
  const ring = scene.add.circle(target.x, target.y + 4, 8, 0x88FFA0, 0.5)
    .setStrokeStyle(2, 0xBFFFC8, 0.8).setDepth(target.depth - 0.5);
  scene.tweens.add({
    targets: ring, scaleX: 2.4, scaleY: 2.4, alpha: 0,
    duration: 480, ease: 'Quad.easeOut',
    onComplete: () => ring.destroy(),
  });
  // 힐러 → 타겟 짧은 광선
  const beam = scene.add.graphics().setDepth(20);
  beam.lineStyle(2.5, 0xBFFFC8, 0.85);
  beam.beginPath();
  beam.moveTo(healer.x, healer.y - 8);
  beam.lineTo(target.x, target.y - 4);
  beam.strokePath();
  scene.tweens.add({
    targets: beam, alpha: 0,
    duration: 260, ease: 'Quad.easeOut',
    onComplete: () => beam.destroy(),
  });
}

// 하늘에서 얼음 다이아몬드가 떨어져 target에 도착 시 damage + shatter.
// 꽁꽁술사(mage_ice) 등 def.attackType='icefall' 영웅 전용.
function icefallStrike(scene, attacker, target) {
  if (!target || !target.active) return;
  const tx = target.x, ty = target.y;
  const startY = ty - 180;
  // 얼음 다이아몬드 — graphics 합성 (위 삼각형 + 아래 삼각형)
  const ice = scene.add.graphics().setDepth(20);
  ice.fillStyle(0x9EE7F0, 1);
  ice.lineStyle(1.5, 0x4A8FAA, 1);
  ice.fillTriangle(0, -11, 9, 1, -9, 1);
  ice.strokeTriangle(0, -11, 9, 1, -9, 1);
  ice.fillTriangle(0, 15, 9, 1, -9, 1);
  ice.strokeTriangle(0, 15, 9, 1, -9, 1);
  // 얼음 내부 반사광 (작은 흰 선)
  ice.lineStyle(1, 0xFFFFFF, 0.7);
  ice.beginPath(); ice.moveTo(-4, -6); ice.lineTo(-2, 10); ice.strokePath();
  ice.x = tx; ice.y = startY;
  ice.angle = -10;
  // 그림자 (target 위치에 작은 회색 타원)
  const shadow = scene.add.ellipse(tx, ty + 6, 8, 3, 0x000000, 0.35).setDepth(2);
  scene.tweens.add({
    targets: shadow, scaleX: 2, scaleY: 2, alpha: 0.5,
    duration: 350,
  });
  scene.tweens.add({
    targets: ice, y: ty, angle: 5,
    duration: 350, ease: 'Quad.easeIn',
    onComplete: () => {
      ice.destroy();
      shadow.destroy();
      // 얼음 깨짐 — 작은 파편 6개 사방으로
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 + Math.random() * 0.3;
        const dist = 18 + Math.random() * 8;
        const shard = scene.add.triangle(tx, ty, 0, -4, 3, 3, -3, 3, 0xA8E8F4)
          .setStrokeStyle(1, 0x4A8FAA).setDepth(21);
        scene.tweens.add({
          targets: shard,
          x: tx + Math.cos(ang) * dist,
          y: ty + Math.sin(ang) * dist,
          alpha: 0, scaleX: 0.4, scaleY: 0.4,
          duration: 380, ease: 'Quad.easeOut',
          onComplete: () => shard.destroy(),
        });
      }
      // damage 적용
      flashHit(scene, target.body, target.bodyColor);
      const dealt = target.heroDef ? Math.max(1, attacker.damage - (target.defense || 0)) : attacker.damage;
      target.hp -= dealt;
      showDamagePopup(scene, tx, ty - 14, dealt, { enemy: !!attacker.isEnemy });
      aggroOnHit(scene, attacker, target);
      // 얼음 슬로우 — 1.5초간 이동속도 50%
      applySlow(scene, target, 1500, 0.5);
      if (target.hp <= 0) onUnitDeath(scene, target);
    },
  });
}

// 슬로우 상태 적용 — 이동 관련 헬퍼가 effectiveSpeedMult로 _slowUntil/_slowMult 참조.
// 중첩 hit는 종료 시점을 max로 갱신 (더 길게 유지). 시각: 푸른 ring 한 번 펄스.
function applySlow(scene, target, durationMs, mult) {
  if (!target || !target.active || target.alive === false) return;
  const now = scene.time.now;
  target._slowUntil = Math.max(target._slowUntil || 0, now + durationMs);
  target._slowMult = mult;
  const ring = scene.add.circle(target.x, target.y, 12, 0x9EE7F0, 0.4)
    .setStrokeStyle(2, 0xCFF6FA, 0.85).setDepth(3);
  scene.tweens.add({
    targets: ring, scale: 1.7, alpha: 0,
    duration: 420, ease: 'Quad.easeOut',
    onComplete: () => ring.destroy(),
  });
}

function effectiveSpeedMult(unit, now) {
  if (unit._slowUntil && now < unit._slowUntil) return unit._slowMult || 1;
  return 1;
}

function meleeStrike(scene, attacker, target) {
  if (!target || !target.active) return;
  const angle = Math.atan2(target.y - attacker.y, target.x - attacker.x);
  const lunge = 5;
  const sx = attacker.x, sy = attacker.y;
  scene.tweens.add({
    targets: attacker,
    x: sx + Math.cos(angle) * lunge, y: sy + Math.sin(angle) * lunge,
    duration: 60, yoyo: true, ease: 'Quad.easeOut',
  });

  let damage = attacker.damage;
  let big = false;
  if (attacker.boostedNextAttack) {
    damage *= 2;
    attacker.boostedNextAttack = false;
    big = true;
  }
  flashHit(scene, target.body, target.bodyColor);
  drawSlash(scene, attacker.x, attacker.y, target.x, target.y, big);
  playSfxSwing();
  const dealt = target.heroDef ? Math.max(1, damage - (target.defense || 0)) : damage;
  target.hp -= dealt;
  // 영웅이 피격당하면(=적이 공격) hurt, 적/일반 타깃이면 hit
  if (target.heroDef && attacker.isEnemy) playSfxHurt(); else playSfxHit();
  showDamagePopup(scene, target.x, target.y - 14, dealt, { crit: big, enemy: !!attacker.isEnemy });
  aggroOnHit(scene, attacker, target);
  applyGoldPerHit(scene, attacker, target);
  if (target.hp <= 0) onUnitDeath(scene, target);
}

// 흑마법사(mage_dark) 등 attackType='beam' — 굵은 검은 일직선 빔 단발 데미지.
// 시각: 두꺼운 어두운 줄기 + 보라 글로우 라인 + 타겟 임팩트 보라 플래시. 화살 tip 없음.
function darkBeamStrike(scene, attacker, target) {
  if (!target || !target.active) return;
  const sx = attacker.x, sy = attacker.y - 6;
  const tx = target.x, ty = target.y - 4;
  // 1) 보라 글로우 (뒤쪽 두꺼운 빛 라인)
  const glow = scene.add.graphics().setDepth(19);
  glow.lineStyle(7, 0x9C3AE8, 0.55);
  glow.lineBetween(sx, sy, tx, ty);
  // 2) 검은 빔 (앞쪽 메인 라인)
  const core = scene.add.graphics().setDepth(20);
  core.lineStyle(3.5, 0x0A0014, 0.95);
  core.lineBetween(sx, sy, tx, ty);
  // 3) 타겟 임팩트 — 보라 플래시
  const impact = scene.add.circle(tx, ty, 7, 0xB23AE8, 0.7).setDepth(21);
  scene.tweens.add({
    targets: impact, scale: 2.4, alpha: 0,
    duration: 280, ease: 'Quad.easeOut',
    onComplete: () => impact.destroy(),
  });
  scene.tweens.add({
    targets: [glow, core], alpha: 0,
    duration: 220, ease: 'Quad.easeOut',
    onComplete: () => { glow.destroy(); core.destroy(); },
  });
  playSfxMagic();
  flashHit(scene, target.body, target.bodyColor);
  target.hp -= attacker.damage;
  if (target.heroDef && attacker.isEnemy) playSfxHurt(); else playSfxHit();
  showDamagePopup(scene, target.x, target.y - 14, attacker.damage, { enemy: !!attacker.isEnemy });
  aggroOnHit(scene, attacker, target);
  if (target.hp <= 0) onUnitDeath(scene, target);
}

// 산적 등 heroDef.goldPerHit 영웅: 적 타격마다 골드 획득.
// 영웅 레벨(enhance)에 따라 +1씩 선형 증가 + 시장 인구 배율(getGoldMultiplier) 적용.
// 시각은 몬스터 드랍과 동일한 showGoldDrop 코인 연출.
function applyGoldPerHit(scene, attacker, target) {
  if (!attacker.heroDef || !attacker.heroDef.goldPerHit) return;
  if (!target.isEnemy || target.alive === false) return;
  const base = attacker.heroDef.goldPerHit;
  const level = attacker.enhance || 0;
  const amount = Math.max(1, Math.floor((base + level) * getGoldMultiplier()));
  gold += amount;
  showGoldDrop(scene, target.x, target.y, 1);
  updateGoldUI(scene);
}

function rangedStrike(scene, attacker, target) {
  if (!target || !target.active) return;
  drawArrowLine(scene, attacker.x, attacker.y, target.x, target.y);
  playSfxArrow();
  flashHit(scene, target.body, target.bodyColor);
  target.hp -= attacker.damage;
  if (target.heroDef && attacker.isEnemy) playSfxHurt(); else playSfxHit();
  showDamagePopup(scene, target.x, target.y - 14, attacker.damage, { enemy: !!attacker.isEnemy });
  aggroOnHit(scene, attacker, target);
  if (target.hp <= 0) onUnitDeath(scene, target);
}

function aoeStrike(scene, attacker, target) {
  if (!target || !target.active) return;
  const tx = target.x, ty = target.y;
  const orbColor = attacker.heroDef ? attacker.heroDef.crestColor : 0xFF66FF;
  const orb = scene.add.circle(attacker.x, attacker.y, 6, orbColor)
    .setStrokeStyle(1.5, COLOR.white).setDepth(20);
  playSfxMagic(); // 발사 시점 마법 소리
  scene.tweens.add({
    targets: orb, x: tx, y: ty, duration: 220,
    onComplete: () => {
      orb.destroy();
      const aoeR = attacker.aoeRadius || 50;
      let hitAny = false;
      scene.enemies.getChildren().forEach((e) => {
        if (!e.active || e.hp <= 0) return;
        const d = Phaser.Math.Distance.Between(tx, ty, e.x, e.y);
        if (d <= aoeR) {
          const dmg = e === target ? attacker.damage : Math.floor(attacker.damage * 0.55);
          e.hp -= dmg;
          showDamagePopup(scene, e.x, e.y - 14, dmg, { enemy: !!attacker.isEnemy });
          aggroOnHit(scene, attacker, e);
          flashHit(scene, e.body, e.bodyColor);
          hitAny = true;
          if (e.hp <= 0) onUnitDeath(scene, e);
        }
      });
      if (hitAny) playSfxHit(); // 폭발 적중 시 한 번
      drawExplosion(scene, tx, ty, aoeR, orbColor);
    },
  });
}

function onUnitDeath(scene, unit) {
  if (unit.isEnemy) {
    unit.setActive(false);
    if (unit.hpBar) {
      unit.hpBar.bg.destroy();
      unit.hpBar.fill.destroy();
    }
    if (unit.shadow) {
      scene.tweens.add({
        targets: unit.shadow, alpha: 0, duration: 220,
        onComplete: () => unit.shadow.destroy(),
      });
    }
    kills += 1;
    // stage 비례 보상 스케일 (난이도 상승된 만큼 골드/경험치 ↑)
    const rewardScale = getStageRewardScale(stage);
    const goldGain = Math.max(1, Math.floor(GOLD_PER_KILL * rewardScale * getGoldMultiplier()));
    gold += goldGain;
    updateKillsUI(scene);
    updateGoldUI(scene);
    showGoldDrop(scene, unit.x, unit.y, unit.isBoss ? 4 : 1);
    showGoldGainPopup(scene, goldGain);

    if (unit.isBoss) {
      gems += GEMS_PER_BOSS;
      updateGemsUI(scene);
      updateTavernButton(scene);
      // 보석 드롭 연출 제거 — 보스 보상은 스테이지 결과 banner에서 표시 (중복 회피)
    }

    const expBase = unit.isBoss ? CASTLE_EXP_PER_BOSS : CASTLE_EXP_PER_MOB;
    addCastleExp(scene, Math.max(1, Math.floor(expBase * rewardScale)));

    if (unit.isBoss) onBossKilled(scene);
    else onMobKilled(scene);

    scene.tweens.add({
      targets: unit, alpha: 0, scaleX: 0.6, scaleY: 0.6,
      duration: unit.isBoss ? 400 : 220, ease: 'Quad.easeIn',
      onComplete: () => unit.destroy(),
    });
  } else {
    killHero(scene, unit);
  }
}

// === Effects ===============================================================

function drawSlash(scene, x1, y1, x2, y2, big) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const cx = mx - Math.cos(angle) * 6;
  const cy = my - Math.sin(angle) * 6;
  const r = big ? 22 : 14;
  const w = big ? 4 : 3;
  const color = big ? 0xFFAA22 : COLOR.white;
  const g = scene.add.graphics();
  g.lineStyle(w, color, 0.95);
  g.beginPath();
  g.arc(cx, cy, r, angle - Math.PI / 3, angle + Math.PI / 3);
  g.strokePath();
  g.setDepth(20);
  scene.tweens.add({
    targets: g, alpha: 0, duration: big ? 200 : 140,
    onComplete: () => g.destroy(),
  });
}

function drawArrowLine(scene, x1, y1, x2, y2) {
  const g = scene.add.graphics();
  g.lineStyle(2, COLOR.white, 0.9);
  g.lineBetween(x1, y1, x2, y2);
  g.setDepth(20);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const tip = scene.add.triangle(x2, y2, -8, -3, 0, 0, -8, 3, COLOR.white)
    .setRotation(angle).setDepth(20);
  scene.tweens.add({
    targets: [g, tip], alpha: 0, duration: 200,
    onComplete: () => { g.destroy(); tip.destroy(); },
  });
}

function drawExplosion(scene, x, y, radius, color) {
  const c = color || 0xFFAA00;
  const ring = scene.add.circle(x, y, 12, c, 0.6).setStrokeStyle(3, 0xFFFFAA).setDepth(20);
  scene.tweens.add({
    targets: ring, scale: radius / 12, alpha: 0,
    duration: 380, ease: 'Quad.easeOut',
    onComplete: () => ring.destroy(),
  });
  const flash = scene.add.circle(x, y, radius * 0.6, COLOR.white, 0.4).setDepth(20);
  scene.tweens.add({
    targets: flash, alpha: 0, duration: 200,
    onComplete: () => flash.destroy(),
  });
}

function drawTauntRing(scene, hero) {
  const ring = scene.add.circle(hero.x, hero.y, 12, 0x4488FF, 0.4).setStrokeStyle(3, 0x88CCFF).setDepth(3);
  scene.tweens.add({
    targets: ring, scale: 9, alpha: 0,
    duration: 500, ease: 'Quad.easeOut',
    onComplete: () => ring.destroy(),
  });
}

function flashHit(scene, shape, originalColor) {
  if (!shape || !shape.active) return;
  shape.fillColor = COLOR.white;
  scene.time.delayedCall(60, () => { if (shape.active) shape.fillColor = originalColor; });
}

function flashCastle(scene) {
  scene.cameras.main.shake(60, 0.0022);
}

// 동전이 적 위치에서 팝→상단 골드 카운터로 흡수. 카운터는 펀치 효과.
function showGoldDrop(scene, x, y, count) {
  if (!scene.uiGold) return;
  const tx = scene.uiGold.x + 14;
  const ty = scene.uiGold.y + 10;
  const n = Math.max(1, count | 0);
  for (let i = 0; i < n; i++) {
    scene.time.delayedCall(i * 70, () => spawnCoin(scene, x, y, tx, ty));
  }
}

const GOLD_POPUP_ANCHOR_X = 28;
const GOLD_POPUP_ANCHOR_Y = GAME_H - BOTTOM_UI_HEIGHT - 80;
const GOLD_POPUP_ENTRY_H = 20;
const GOLD_POPUP_SLIDE_PX = 14;
const GOLD_POPUP_IN_MS = 100;
const GOLD_POPUP_HOLD_MS = 200;
const GOLD_POPUP_OUT_MS = 200;
const GOLD_POPUP_MAX = 5;

function showGoldGainPopup(scene, amount) {
  const n = Math.max(0, amount | 0);
  if (n <= 0) return;
  if (!scene.goldPopupStack) scene.goldPopupStack = [];
  // 기존 항목 한 칸씩 위로 밀어올림
  scene.goldPopupStack.forEach((e) => {
    e.slot += 1;
    scene.tweens.add({
      targets: e.container, y: GOLD_POPUP_ANCHOR_Y - e.slot * GOLD_POPUP_ENTRY_H,
      duration: 100, ease: 'Quad.easeOut',
    });
  });
  while (scene.goldPopupStack.length >= GOLD_POPUP_MAX) {
    const oldest = scene.goldPopupStack.shift();
    if (oldest.container && oldest.container.active) oldest.container.destroy();
  }
  const c = scene.add.container(GOLD_POPUP_ANCHOR_X - GOLD_POPUP_SLIDE_PX, GOLD_POPUP_ANCHOR_Y)
    .setDepth(40).setAlpha(0);
  // HUD pill과 동일한 코인 sprite 사용 (시각 일관성)
  const coin = scene.add.image(0, 0, 'ui_rb_icon_coin').setDisplaySize(18, 18);
  const label = scene.add.text(13, 0, `+${n.toLocaleString()}`, {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '13px',
    color: '#FACC15', stroke: '#1F1208', strokeThickness: 3,
  }).setOrigin(0, 0.5);
  c.add([coin, label]);
  const entry = { container: c, slot: 0 };
  scene.goldPopupStack.push(entry);
  // 슬라이드 인 + 페이드 인
  scene.tweens.add({
    targets: c, x: GOLD_POPUP_ANCHOR_X, alpha: 1,
    duration: GOLD_POPUP_IN_MS, ease: 'Quad.easeOut',
  });
  // 홀드 후 페이드 아웃
  scene.tweens.add({
    targets: c, alpha: 0,
    duration: GOLD_POPUP_OUT_MS,
    delay: GOLD_POPUP_IN_MS + GOLD_POPUP_HOLD_MS,
    ease: 'Linear',
    onComplete: () => {
      if (c.active) c.destroy();
      scene.goldPopupStack = (scene.goldPopupStack || []).filter((e) => e !== entry);
    },
  });
}

function spawnCoin(scene, x, y, tx, ty) {
  const c = scene.add.container(x, y - 6).setDepth(30);
  const shadow = scene.add.ellipse(0, 5, 9, 3, 0x000000, 0.4);
  const body = scene.add.circle(0, 0, 5, 0xFACC15).setStrokeStyle(1.2, 0x8B6914);
  const sheen = scene.add.circle(-1.5, -1.5, 1.5, 0xFFFAE0);
  c.add([shadow, body, sheen]);
  // 동전 회전감 (scaleX 토글)
  scene.tweens.add({
    targets: body, scaleX: -1, duration: 280, repeat: -1, yoyo: true, ease: 'Sine.easeInOut',
  });
  scene.tweens.add({
    targets: sheen, scaleX: -1, duration: 280, repeat: -1, yoyo: true, ease: 'Sine.easeInOut',
  });
  // Phase 1: 팝업 아크
  const popX = x + Phaser.Math.Between(-22, 22);
  const popY = y - Phaser.Math.Between(20, 32);
  scene.tweens.add({
    targets: c, x: popX, y: popY, duration: 280, ease: 'Quad.easeOut',
    onComplete: () => {
      // Phase 2: HUD로 회수
      scene.tweens.add({
        targets: c, x: tx, y: ty, scaleX: 0.55, scaleY: 0.55,
        duration: 380, ease: 'Cubic.easeIn',
        onComplete: () => {
          c.destroy();
          punchCounter(scene.uiGold);
        },
      });
    },
  });
}

function showGemDrop(scene, x, y, count) {
  if (!scene.uiGems) return;
  const tx = scene.uiGems.x + 14;
  const ty = scene.uiGems.y + 10;
  const n = Math.max(1, count | 0);
  for (let i = 0; i < n; i++) {
    scene.time.delayedCall(60 + i * 80, () => spawnGem(scene, x, y, tx, ty));
  }
}

function spawnGem(scene, x, y, tx, ty) {
  const c = scene.add.container(x, y - 6).setDepth(31);
  const shadow = scene.add.rectangle(0, 5, 9, 4, 0x000000, 0.4).setRotation(Math.PI / 4);
  const body = scene.add.rectangle(0, 0, 8, 8, 0x6BCED5)
    .setStrokeStyle(1.2, 0x2A8A91).setRotation(Math.PI / 4);
  const sheen = scene.add.rectangle(-1.2, -1.2, 2.2, 2.2, 0xFFFFFF, 0.85).setRotation(Math.PI / 4);
  c.add([shadow, body, sheen]);
  const popX = x + Phaser.Math.Between(-26, 26);
  const popY = y - Phaser.Math.Between(22, 36);
  scene.tweens.add({
    targets: c, x: popX, y: popY, duration: 320, ease: 'Quad.easeOut',
    onComplete: () => {
      scene.tweens.add({
        targets: c, x: tx, y: ty, scaleX: 0.65, scaleY: 0.65,
        duration: 420, ease: 'Cubic.easeIn',
        onComplete: () => {
          c.destroy();
          punchCounter(scene.uiGems);
        },
      });
    },
  });
}

function punchCounter(textObj) {
  if (!textObj || !textObj.scene) return;
  textObj.scene.tweens.killTweensOf(textObj);
  textObj.setScale(1);
  textObj.scene.tweens.add({
    targets: textObj, scaleX: 1.25, scaleY: 1.25,
    duration: 110, yoyo: true, ease: 'Back.easeOut',
  });
}

// === HP bars ===============================================================

// BG는 Layer Lab Slider_StageHorizontal_Bg 스프라이트. scale 0.5로 외곽선 두께 절반.
// nineslice를 2배 사이즈로 그리고 setScale(0.5) → 외곽선/라운드 코너 모두 2 world (= 4 screen px)
function makeHpBar(scene, x, y, w, h, fillColor) {
  const bg = scene.add.nineslice(
    x, y, 'ui_stage_bar_bg', null, w * 2, h * 2, 4, 4, 4, 4
  ).setScale(0.5).setDepth(14).setTint(0x1A2A50);
  const fill = scene.add.graphics().setDepth(15);
  return { bg, fill, w, h, fillColor, fillPadding: 2 };
}

function updateHpBar(bar, current, max) {
  const pct = Math.max(0, current / max);
  bar.fill.clear();
  if (pct <= 0) return;
  const color = bar.fillColor !== undefined
    ? bar.fillColor
    : (pct > 0.5 ? COLOR.hpGood : pct > 0.25 ? COLOR.hpMid : COLOR.hpLow);
  const pad = bar.fillPadding;
  const innerW = bar.w - pad * 2;
  const innerH = bar.h - pad * 2;
  bar.fill.fillStyle(color, 1);
  bar.fill.fillRect(
    bar.bg.x - bar.w / 2 + pad,
    bar.bg.y - innerH / 2,
    innerW * pct,
    innerH
  );
}

// === Top UI ================================================================

const TOP_UI_HEIGHT = 100;

// 보석 아이콘 — 대칭형 5각 컷 다이아. 상단 밝은 면 + 좌상단 하이라이트로 입체감.
function drawGemIcon(scene, x, y, baseDepth) {
  // 어두운 외곽
  scene.add.polygon(x, y, [
    0, -12, 10, -3, 7, 11, -7, 11, -10, -3,
  ], 0x0E4853).setDepth(baseDepth);
  // 메인 본체 (밝은 청록)
  scene.add.polygon(x, y, [
    0, -10, 8, -2, 5.5, 9, -5.5, 9, -8, -2,
  ], 0x4ABFC9).setDepth(baseDepth + 1);
  // 상단 페이싯 (좀 더 밝은 윗면)
  scene.add.polygon(x, y, [
    0, -10, 8, -2, -8, -2,
  ], 0x80D8E2).setDepth(baseDepth + 2);
  // 좌상단 하이라이트
  scene.add.polygon(x, y, [
    0, -10, -4, -7, -7, -2, -3, -2,
  ], 0xC8EEF2, 0.95).setDepth(baseDepth + 3);
  // 반짝 점
  scene.add.circle(x - 2.5, y - 5, 1.3, 0xFFFFFF, 1).setDepth(baseDepth + 4);
}

// 육각형 레벨 배지 — pointy-top hex, 흰 stroke + 골드 채움 + 상단 광택.
function drawLevelHex(scene, x, y, baseDepth) {
  const HW = 15;  // 절반 너비
  const HH = 17;  // 절반 높이 (꼭지점까지)
  const hex = [
    0, -HH,
    -HW, -HH * 0.5,
    -HW,  HH * 0.5,
    0,  HH,
     HW,  HH * 0.5,
     HW, -HH * 0.5,
  ];
  // 어두운 본체 + 흰 외곽선
  scene.add.polygon(x, y, hex, 0x1B3258).setStrokeStyle(2.5, 0xFFFFFF).setDepth(baseDepth);
  // 안쪽 hex — 골드
  const inner = hex.map((v) => v * 0.82);
  scene.add.polygon(x, y, inner, 0xE6A11B).setDepth(baseDepth + 1);
  // 상단 그라데이션 (밝은 노랑)
  scene.add.polygon(x, y, [
    0, -HH * 0.82,
    -HW * 0.82, -HH * 0.41,
    HW * 0.82, -HH * 0.41,
  ], 0xFFE066, 0.9).setDepth(baseDepth + 2);
  // 좌상단 광택
  scene.add.polygon(x, y, [
    0, -HH * 0.82,
    -HW * 0.6, -HH * 0.55,
    -4, -4,
  ], 0xFFF6C2, 0.85).setDepth(baseDepth + 3);
}

function drawTopUI(scene) {
  const H = TOP_UI_HEIGHT;
  const expBarH = 24; // 4배 키움 (사용자 요청에 따라 추가 2배)
  // 좌측 프로필(아바타+닉네임)은 더 내리고, 우측 재화 알약은 위로 — 사용자 요청.
  const cyBase = (H - expBarH) / 2; // 38
  const cy = cyBase + 14;       // 프로필 (52) — 상단 여백 충분히
  const cyRight = cyBase - 4;   // 재화 알약 (34) — 위로 올림

  // === Backgrounds === (제거 — 배경 그대로 노출)

  // === Left: 정사각형 프로필 — K-288 프레임 깔고 그 위 portrait. 아웃라인 유지되게 안쪽 fit ===
  const avatarSize = 77;
  const avatarX = 12 + avatarSize / 2;
  // (1) 프레임 자산
  scene.add.image(avatarX, cy, 'profile_frame')
    .setDisplaySize(avatarSize, avatarSize).setDepth(42);
  // (2) portrait — 검정 외곽선 안쪽까지 fit (자산 외곽선 + 어두운 BG 안쪽으로 더 들어감)
  const portraitInner = avatarSize * 0.83;
  scene.uiAvatarSprite = scene.add.image(avatarX, cy, scene.userProfileKey || 'portrait_01')
    .setDisplaySize(portraitInner, portraitInner).setDepth(43)
    .setInteractive({ useHandCursor: true });
  scene.uiAvatarSprite.on('pointerup', () => openProfileModal(scene));

  // 우측 텍스트 영역
  const textX = avatarX + avatarSize / 2 + 10;
  // 상단: 닉네임
  scene.uiCastleNameTop = scene.add.text(textX, cy - 14, castleNickname, {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '20px',
    color: '#FFFFFF', stroke: '#1F0410', strokeThickness: 4,
  }).setOrigin(0, 0.5).setDepth(42);
  // 하단: 성(Castle) 아이콘 + "성 레벨" (위, 작게) / 숫자 (아래, 크게) 두 줄
  const castleH = 28;
  const castleW = castleH * (123 / 101); // 원본 비율 유지
  const castleCY = cy + 18;
  const castleImg = scene.add.image(textX + castleW / 2, castleCY, 'ui_icon_castle')
    .setDepth(44);
  castleImg.setDisplaySize(castleW, castleH);
  const castleTextX = textX + castleW + 6;
  scene.add.text(castleTextX, castleCY - 11, '성 레벨', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '10px',
    color: '#FFFFFF', stroke: '#1F0410', strokeThickness: 3,
  }).setOrigin(0, 0.5).setDepth(44);
  scene.uiCastleLevelText = scene.add.text(castleTextX, castleCY + 5, '1', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '16px',
    color: '#FFD577', stroke: '#1F0410', strokeThickness: 4,
  }).setOrigin(0, 0.5).setDepth(44);

  // === Right: Currency pills (Layer Lab ResourceBar_Single 시리즈) ===
  const pillH = 23;
  const pillW = 118;
  const gap = 16;
  const rightStart = 259;
  const iconSize = 30;       // 알약보다 충분히 커서 위/아래/왼쪽으로 튀어나옴
  const plusBtnSize = pillH + 6; // 알약보다 살짝 큼 (위/아래로 살짝 돌출)
  const iconOverflow = 2;    // 아이콘이 알약 왼쪽 코너를 살짝 덮도록 좌측으로 이동
  const plusOverflow = 2;    // + 버튼이 알약 오른쪽 코너를 덮도록 우측으로 이동

  function drawCurrencyPill(pillX, iconKey, plusBtnKey, plusIconKey) {
    // 알약 BG (nineslice + 다크 네이비 틴트)
    scene.add.nineslice(pillX, cyRight, 'ui_rb_bg', null, pillW, pillH, 7, 7, 7, 7)
      .setOrigin(0, 0.5).setDepth(41).setTint(0x0A1A36);
    // 아이콘 — 알약 왼쪽 코너를 덮도록 좌측으로 이동
    const iconX = pillX + iconSize / 2 - iconOverflow;
    scene.add.image(iconX, cyRight, iconKey)
      .setDisplaySize(iconSize, iconSize).setDepth(45);
    // "+" 버튼 BG (Layer Lab 원본 sprite, 네이티브 비율 60:62 보존)
    const plusBtnH = plusBtnSize * (62 / 60);
    const plusX = pillX + pillW - plusBtnSize / 2 + plusOverflow;
    scene.add.image(plusX, cyRight, plusBtnKey)
      .setDisplaySize(plusBtnSize, plusBtnH).setDepth(44);
    // "+" 아이콘 sprite (Layer Lab 원본 33:34, 흰색 틴트, 살짝 위로 보정)
    const plusIconW = plusBtnSize * 0.5;
    const plusIconH = plusIconW * (34 / 33);
    scene.add.image(plusX, cyRight - 2, plusIconKey)
      .setDisplaySize(plusIconW, plusIconH).setDepth(45).setTint(0xFFFFFF);
    // 숫자 (아이콘과 "+" 버튼 사이 중앙 정렬)
    const numCenterX = (iconX + iconSize / 2 + plusX - plusBtnSize / 2) / 2;
    const numText = scene.add.text(numCenterX, cyRight - 1, '0', {
      fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '13px',
      color: '#FFFFFF', stroke: '#0A1428', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(43);
    return numText;
  }

  // --- Gold pill (노란 + 버튼 + 흰 +) ---
  const goldX = rightStart;
  scene.uiGold = drawCurrencyPill(goldX, 'ui_rb_icon_coin', 'ui_rb_btn_yellow', 'ui_rb_btn_plus_yellow');

  // --- Gem pill (보라 + 버튼 + 흰 +) ---
  const gemX = goldX + pillW + gap;
  scene.uiGems = drawCurrencyPill(gemX, 'ui_rb_icon_gem', 'ui_rb_btn_pink', 'ui_rb_btn_plus_purple');

  // === EXP progress bar — 레퍼런스 매칭: 얇은 두께 + 위아래 1px 검정 + 대각선 fill 끝점 ===
  const barH = 14; // 두께 적당히 (이전 24 → 14)
  scene.uiExpBarH = barH;
  const expY = GAME_H - TAB_BAR_HEIGHT - barH / 2;
  const expW = GAME_W;
  // EXP 바 — 씬에 고정. 모달 슬라이드 시에도 움직이지 않음 (사용자 명시 요청)
  scene.add.rectangle(GAME_W / 2, expY, expW, barH, 0x1A2A50).setDepth(62);
  scene.add.rectangle(GAME_W / 2, expY - barH / 2, expW, 1, 0x000000).setDepth(63);
  scene.add.rectangle(GAME_W / 2, expY + barH / 2, expW, 1, 0x000000).setDepth(63);
  scene.uiExpFill = scene.add.graphics().setDepth(63);
  scene.uiExpFill.x = 0;
  scene.uiExpFill.y = expY - barH / 2;
  scene.uiExpText = scene.add.text(GAME_W - 6, expY - 0.5, 'EXP 0%', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '8px',
    color: '#FFFFFF', stroke: '#05101F', strokeThickness: 2,
  }).setOrigin(1, 0.5).setDepth(64);
}

function buildStagePanel(scene) {
  const cy = TOP_UI_HEIGHT + 50;

  // 전체 너비를 절반(190)으로 축소, 가운데 정렬.
  const iconSize = 30;
  const iconR = iconSize / 2;
  const contentW = 190;
  const barLeft = (GAME_W - contentW) / 2;
  const barRight = barLeft + contentW;
  const barW = barRight - barLeft;
  const barX = (barLeft + barRight) / 2;
  const barY = cy;
  // 카메라 zoom 2x 보정용: nineslice는 2배 사이즈로 그리고 setScale(0.5)
  // barH 값은 visual world height (마커 22의 절반)
  const barH = 11;
  const barRadius = barH / 2;
  const iconY = cy;
  const bossX = barRight;

  // === 스테이지 라벨 (바 상단 중앙) ===
  const stageText = scene.add.text(barX, barY - 22, '스테이지 1', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '13px',
    color: '#FFFFFF', stroke: '#1F0410', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(42);

  // === 바 배경 ===
  // nineslice를 2배 사이즈로 그리고 setScale(0.5) → 외곽선이 visual 2 world px (= 4 screen px)로 얇아짐
  const barTrack = scene.add.nineslice(
    barX, barY, 'ui_stage_bar_bg', null, barW * 2, barH * 2, 4, 4, 4, 4
  ).setScale(0.5).setDepth(41).setTint(0x1A2A50);

  // === 바 채움: graphics 사각형 (외곽선 없는 순수한 시안)
  // BG 외곽선 두께(visual 2 world px)만큼 안쪽으로 padding
  const fillPadding = 2;
  const barFill = scene.add.graphics().setDepth(42);

  // === 3단계 마커 (시작 / 중간 / 보스) — 모두 동일한 다이아 스프라이트 시리즈 ===
  const smallBadge = 22;
  const startMarker = scene.add.image(barLeft, barY, 'ui_stage_diamond_blue')
    .setDisplaySize(smallBadge, smallBadge).setDepth(43);
  const midMarker = scene.add.image(barX, barY, 'ui_stage_diamond_gray') // 디폴트 딤 — 바가 중앙 지나면 점등
    .setDisplaySize(smallBadge, smallBadge).setDepth(43);

  // === 보스 마커 (오른쪽 끝, BOSS 라벨 + 클릭 시 도전) ===
  // 활성/비활성은 텍스처 스왑(yellow/gray)으로 처리
  const bossMarker = scene.add.image(bossX, iconY, 'ui_stage_diamond_gray')
    .setDisplaySize(iconSize, iconSize).setDepth(44)
    .setInteractive({ useHandCursor: true });
  // 마커 안의 해골 아이콘 (마커는 정지, 이 아이콘이 움직임)
  const bossSkullSize = iconSize * 0.85;
  const bossIcon = scene.add.image(bossX, iconY, 'ui_icon_boss_skull')
    .setDisplaySize(bossSkullSize, bossSkullSize).setDepth(45);
  const bossLabel = scene.add.text(bossX, iconY + iconR + 8, 'BOSS', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '10px',
    color: '#888888', stroke: '#1F0410', strokeThickness: 2,
  }).setOrigin(0.5).setDepth(46);
  bossMarker.on('pointerdown', () => {
    if (canChallengeBoss()) challengeBoss(scene);
    else flashBossLockedHint(scene);
  });

  scene.stagePanel = {
    stageText,
    barTrack, barFill, barLeft, barY, barW, barH, barRadius, barX,
    fillPadding,
    startMarker, midMarker,
    bossMarker, bossIcon, bossLabel, bossMarkerSize: iconSize, bossSkullSize,
    bossIconBaseY: iconY,
  };

  // 보스 활성화 시: 마커는 정지, 해골 아이콘만 위아래 바운스 + 좌우 흔들림
  const baseScale = bossIcon.scaleX;
  scene.bossBtnPulse = scene.tweens.add({
    targets: bossIcon, y: { from: iconY - 3, to: iconY + 3 },
    duration: 360, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    paused: true,
  });
  scene.bossBtnWiggle = scene.tweens.add({
    targets: bossIcon, angle: { from: -10, to: 10 },
    duration: 240, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    paused: true,
  });
}

function canChallengeBoss() {
  return bossPhase === 'mobs'
    && mobsKilledThisStage >= BOSS_UNLOCK_KILLS
    && !isGameOver;
}

function flashBossLockedHint(scene) {
  const remaining = Math.max(0, BOSS_UNLOCK_KILLS - mobsKilledThisStage);
  const text = scene.add.text(CENTER.x, CENTER.y - 200,
    `${remaining}마리 더 처치 필요\n(${mobsKilledThisStage}/${BOSS_UNLOCK_KILLS})`, {
      fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '17px',
      color: '#FF8866', backgroundColor: '#1F1208', padding: { x: 12, y: 6 },
      align: 'center',
    }).setOrigin(0.5).setDepth(60);
  scene.tweens.add({
    targets: text, alpha: 0, y: text.y - 30,
    duration: 1100, delay: 700,
    onComplete: () => text.destroy(),
  });
}

function updateKillsUI(scene) { if (scene.stageKillsText) scene.stageKillsText.setText(String(kills)); }
function updateGoldUI(scene) { if (scene.uiGold) scene.uiGold.setText(String(gold)); }
function updateGemsUI(scene) { if (scene.uiGems) scene.uiGems.setText(String(gems)); }
function updateStageUI(scene) {
  const sp = scene.stagePanel;
  if (!sp) return;

  sp.stageText.setText(`스테이지 ${stage}`);

  const k = Math.min(mobsKilledThisStage, BOSS_UNLOCK_KILLS);
  const pct = k / BOSS_UNLOCK_KILLS;
  // 채움 바: graphics 사각형 (BG 외곽선 안쪽에 들어가도록 padding 적용)
  sp.barFill.clear();
  if (pct > 0) {
    const pad = sp.fillPadding;
    const innerW = sp.barW - pad * 2;
    const innerH = sp.barH - pad * 2;
    sp.barFill.fillStyle(0x4DC8F0, 1);
    sp.barFill.fillRect(
      sp.barLeft + pad,
      sp.barY - innerH / 2,
      innerW * pct,
      innerH
    );
  }

  // 중간 마커: 진행 바가 중앙(50%)을 지나면 점등 (딤 gray → blue)
  const midKey = pct >= 0.5 ? 'ui_stage_diamond_blue' : 'ui_stage_diamond_gray';
  if (sp.midMarker.texture.key !== midKey) {
    sp.midMarker.setTexture(midKey).setDisplaySize(22, 22);
  }

  // 보스 마커: 도전 가능 시 노란 다이아 + 해골 컬러 + 흔들림, 아니면 그레이 다이아 + 어두운 해골
  const ready = canChallengeBoss();
  if (ready) {
    if (sp.bossMarker.texture.key !== 'ui_stage_diamond_yellow') {
      sp.bossMarker.setTexture('ui_stage_diamond_yellow');
      sp.bossMarker.setDisplaySize(sp.bossMarkerSize, sp.bossMarkerSize);
    }
    sp.bossIcon.clearTint();
    sp.bossLabel.setColor('#FFE08A');
    if (scene.bossBtnPulse && scene.bossBtnPulse.paused) scene.bossBtnPulse.resume();
    if (scene.bossBtnWiggle && scene.bossBtnWiggle.paused) scene.bossBtnWiggle.resume();
  } else {
    if (sp.bossMarker.texture.key !== 'ui_stage_diamond_gray') {
      sp.bossMarker.setTexture('ui_stage_diamond_gray');
      sp.bossMarker.setDisplaySize(sp.bossMarkerSize, sp.bossMarkerSize);
    }
    sp.bossIcon.setTint(0x6B6B7A);
    sp.bossLabel.setColor('#888888');
    if (scene.bossBtnPulse && !scene.bossBtnPulse.paused) {
      scene.bossBtnPulse.pause();
      sp.bossIcon.y = sp.bossIconBaseY;
    }
    if (scene.bossBtnWiggle && !scene.bossBtnWiggle.paused) {
      scene.bossBtnWiggle.pause();
      sp.bossIcon.setAngle(0);
    }
  }
}

// === Tavern button =========================================================

function drawTavernButton(scene) {
  // 우측 상단 floating 콘텐츠 버튼 — Layer Lab ItemIcon_Book sprite만, BG 없음. 화면 우측에 바짝 붙임.
  const x = GAME_W - 36, y = TOP_UI_HEIGHT + 122;
  const icon = scene.add.image(x, y, 'ui_icon_tavern')
    .setDisplaySize(56, 56).setDepth(40)
    .setInteractive({ useHandCursor: true });
  icon.on('pointerover', () => icon.setScale(icon.scaleX * 1.08));
  icon.on('pointerout', () => icon.setDisplaySize(56, 56));
  icon.on('pointerdown', () => openTavern(scene));
  scene.uiTavernBg = icon;
  scene._tavernIconBaseX = x;
  scene._tavernIconBaseY = y;
  scene.add.text(x, y + 32, '영웅 소환', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '11px',
    color: '#FFFFFF', stroke: '#000000', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(40);
}

// === 스테이지 돌파 보상 (Stage Level Reward) — HUD 진입 버튼 ===
function drawStageRewardButton(scene) {
  const x = GAME_W - 36, y = TOP_UI_HEIGHT + 122 + 88; // 영웅 소환 버튼 아래
  const icon = scene.add.image(x, y, 'sr_chest')
    .setDisplaySize(58, 58).setDepth(40)
    .setInteractive({ useHandCursor: true });
  icon.on('pointerover', () => icon.setDisplaySize(62, 62));
  icon.on('pointerout',  () => icon.setDisplaySize(58, 58));
  icon.on('pointerdown', () => openStageRewardPanel(scene));
  scene.add.text(x, y + 32, '돌파 보상', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '11px',
    color: '#FFFFFF', stroke: '#000000', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(40);
  const dot = scene.add.image(x + 20, y - 22, 'ui_red_dot')
    .setDisplaySize(16, 16).setDepth(42).setVisible(false);
  scene.stageRewardBtn = { icon, dot, x, y };
  refreshStageRewardButton(scene);
}

function refreshStageRewardButton(scene) {
  if (!scene.stageRewardBtn) return;
  scene.stageRewardBtn.dot.setVisible(hasStageRewardReady());
}

function openStageRewardPanel(scene) {
  if (scene.stageRewardPanel) return;
  const els = [];
  const HEADER_H = 70;
  const CONTENT_TOP = HEADER_H + 6;
  const CONTENT_BOT = GAME_H - 70; // 좌하단 뒤로가기 자리
  const CONTENT_H = CONTENT_BOT - CONTENT_TOP;
  const ROW_H = 126; // 149에서 더 좁힘 (~85%)
  const ROWS = STAGE_REWARDS.length;

  // 풀스크린 배경 — 사용자 제공 이미지를 화면 전체로 채움. 빈 곳 없이 위 끝까지 패턴 노출.
  const solidBg = scene.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x3A7BC8, 1)
    .setDepth(99).setInteractive(); // drag/wheel 입력 받는 풀스크린
  // 자산을 화면 전체로 stretch — 사용자 제공 BG 이미지를 화면 BG로 그대로 사용
  const baseBg = scene.add.image(GAME_W / 2, GAME_H / 2, 'sr_panel_bg')
    .setOrigin(0.5, 0.5).setDisplaySize(GAME_W, GAME_H).setDepth(100);
  els.push(solidBg, baseBg);

  // 헤더 — 반투명 검정 띠 + 한글 제목 + 부제목 (작고 옅은 컬러)
  const headerBg = scene.add.rectangle(GAME_W / 2, HEADER_H / 2, GAME_W, HEADER_H, 0x000000).setDepth(103).setAlpha(0.6);
  const headerTxt = scene.add.text(20, 26, '스테이지 돌파 보상', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '22px', color: '#FFFFFF', stroke: '#000', strokeThickness: 4,
  }).setOrigin(0, 0.5).setDepth(104);
  const headerSubTxt = scene.add.text(20, 52, '스테이지를 돌파하면 보상을 획득 할 수 있어요!', {
    fontFamily: 'BMJUA', fontSize: '11px', color: '#9FC2E8',
  }).setOrigin(0, 0.5).setDepth(104);
  els.push(headerBg, headerTxt, headerSubTxt);
  // 헤더 하단 검은 줄 (alpha 0.95) — 헤더와 본문 경계 강조
  const headerBottomLine = scene.add.rectangle(GAME_W / 2, HEADER_H + 1, GAME_W, 2, 0x000000)
    .setDepth(103).setAlpha(0.95);
  els.push(headerBottomLine);

  // 스크롤 마스크 + 컨테이너 — 마스크는 화면 전체(y=0~GAME_H). 뒤로가기 버튼은 더 위 depth로 별도.
  const maskShape = scene.add.graphics().setDepth(101);
  maskShape.fillStyle(0xffffff).fillRect(0, 0, GAME_W, GAME_H);
  maskShape.setVisible(false);
  const mask = maskShape.createGeometryMask();
  const container = scene.add.container(0, 0).setDepth(101);
  container.setMask(mask);
  els.push(maskShape, container);

  // 트랙 (좌측) — 카드 좌단에서 0.5cm(~17px) 정도 띄움 (1.5×0.9 = 1.35배)
  const trackX = 113;
  const startY = CONTENT_TOP + 81; // 90 × 0.9
  const trackTopY = startY;                              // 첫 노드 y (위쪽: stage 100)
  const trackBotY = startY + (ROWS - 1) * ROW_H;         // 마지막 노드 y (아래: stage 5)
  const trackH = trackBotY - trackTopY;
  const trackMidY = (trackTopY + trackBotY) / 2;
  const trackW = 19; // 21 × 0.9
  const trackDark = scene.add.nineslice(trackX, trackMidY, 'ui_stage_bar_bg', null, trackW * 2, trackH * 2, 4, 4, 4, 4)
    .setScale(0.5).setDepth(101).setTint(0x14253E);
  container.add(trackDark);
  // 진행 청록 (아래쪽 = 클리어한 stage부터 차오름)
  let progIdx = -1;
  for (let i = 0; i < ROWS; i++) if (stage > STAGE_REWARDS[i].stage) progIdx = i;
  if (progIdx >= 0) {
    const progTopY = startY + (ROWS - 1 - progIdx) * ROW_H;
    const progH = trackBotY - progTopY;
    const progMidY = (progTopY + trackBotY) / 2;
    const progFill = scene.add.nineslice(trackX, progMidY, 'ui_stage_bar_bg', null, (trackW - 4) * 2, progH * 2, 4, 4, 4, 4)
      .setScale(0.5).setDepth(102).setTint(0x4DC8F0);
    container.add(progFill);
  }

  // 첫 미달성 idx (Next 표시용)
  let nextIdx = -1;
  for (let i = ROWS - 1; i >= 0; i--) if (stage <= STAGE_REWARDS[i].stage) nextIdx = i;

  // 마일스톤 카드 (위가 큰 stage, 아래 작은)
  STAGE_REWARDS.forEach((r, idx) => {
    const rowY = startY + (ROWS - 1 - idx) * ROW_H;
    addStageRewardRow(scene, container, r, rowY, trackX, idx === nextIdx);
  });

  // 좌하단 뒤로가기 — 클릭 반응(hover 확대 + click 축소) tween으로 부드럽게
  const backBtn = scene.add.image(-15, GAME_H - 38, 'sr_back_btn')
    .setOrigin(0, 1).setDisplaySize(100, 80).setDepth(105).setInteractive({ useHandCursor: true });
  const backBaseSX = backBtn.scaleX, backBaseSY = backBtn.scaleY;
  const backTween = (sx, sy, dur) => {
    if (backBtn._t) backBtn._t.stop();
    backBtn._t = scene.tweens.add({ targets: backBtn, scaleX: sx, scaleY: sy, duration: dur, ease: 'Quad.easeOut' });
  };
  backBtn.on('pointerover',     () => backTween(backBaseSX * 1.06, backBaseSY * 1.06, 110));
  backBtn.on('pointerout',      () => backTween(backBaseSX, backBaseSY, 110));
  backBtn.on('pointerdown',     () => backTween(backBaseSX * 0.88, backBaseSY * 0.88, 60));
  backBtn.on('pointerup',       () => { backTween(backBaseSX, backBaseSY, 80); closeStageRewardPanel(scene); });
  backBtn.on('pointerupoutside',() => backTween(backBaseSX, backBaseSY, 80));
  els.push(backBtn);

  // 스크롤 — 초기 위치: 현재 진행도 행이 화면 위쪽 1/3 지점 (위/아래 모두 카드가 빈 곳 없이 보이게)
  const focusIdx = Math.max(0, Math.min(ROWS - 1, progIdx + 1));
  const focusY = startY + (ROWS - 1 - focusIdx) * ROW_H;
  const minY = CONTENT_BOT - (trackBotY + 60);
  const initOffset = Phaser.Math.Clamp(CONTENT_TOP + CONTENT_H / 3 - focusY, Math.min(0, minY), 0);
  container.y = initOffset;

  const clampContY = (y) => Phaser.Math.Clamp(y, Math.min(0, minY), 0);

  // drag 스크롤
  let dragStartY = null, contStartY = 0, dragMoved = false;
  solidBg.on('pointerdown', (p) => { dragStartY = p.y; contStartY = container.y; dragMoved = false; });
  solidBg.on('pointermove', (p) => {
    if (dragStartY == null) return;
    const dy = p.y - dragStartY;
    if (Math.abs(dy) > 4) dragMoved = true;
    container.y = clampContY(contStartY + dy);
  });
  const endDrag = () => { dragStartY = null; };
  solidBg.on('pointerup', endDrag);
  solidBg.on('pointerupoutside', endDrag);

  // 마우스 휠 스크롤 — 패널 열린 동안만 활성
  const wheelHandler = (pointer, gameObjects, dx, dy) => {
    if (!scene.stageRewardPanel) return;
    container.y = clampContY(container.y - dy * 0.6);
  };
  scene.input.on('wheel', wheelHandler);

  scene.stageRewardPanel = { els, container, wheelHandler };
}

function addStageRewardRow(scene, container, reward, rowY, trackX, isNext) {
  const state = getStageRewardState(reward); // claimed / canClaim / locked

  // 좌측 노드 — 필드 스테이지 바와 동일 다이아 — 1.35배 (1.5 × 0.9)
  const nodeKey = state === 'canClaim' ? 'ui_stage_diamond_yellow'
    : (state === 'claimed' ? 'ui_stage_diamond_blue' : 'ui_stage_diamond_gray');
  const nodeSize = state === 'canClaim' ? 38 : 30; // 42/33 × 0.9
  const node = scene.add.image(trackX, rowY, nodeKey)
    .setDisplaySize(nodeSize, nodeSize).setDepth(103);
  container.add(node);

  // 카드 — Layer Lab K-263. 1.5×0.9 = 1.35배
  const cardKey = state === 'claimed' ? 'sr_card_claimed'
    : (state === 'canClaim' ? 'sr_card_can' : 'sr_card_locked');
  const cardW = 340, cardH = 121;         // 378×134 × 0.9
  const cardCX = trackX + 17 + cardW / 2;
  const card = scene.add.image(cardCX, rowY, cardKey).setDisplaySize(cardW, cardH).setDepth(102);
  container.add(card);

  // 카드 자산 내부 비율
  const cardLeftX = cardCX - cardW / 2;
  const hexCX = cardCX + cardW * 0.31;
  const textCX = cardLeftX + 43;          // 48 × 0.9

  // "N Stage" 텍스트 — 상태별 컬러
  // locked(기본): BG 유사 파란색 / canClaim(수령 가능): 검정 / claimed(완료): 딤드
  const numColor = state === 'locked' ? '#3A7BC8' : (state === 'canClaim' ? '#1A1A1A' : '#A8B4C6');
  const wordColor = state === 'locked' ? '#5A9BD8' : (state === 'canClaim' ? '#444444' : '#B8C4D6');
  const numTxt = scene.add.text(textCX, rowY, String(reward.stage), {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '46px', color: numColor,
  }).setOrigin(0, 0.5).setDepth(103);
  const wordTxt = scene.add.text(textCX + numTxt.width + 8, rowY + 5, 'Stage', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '27px', color: wordColor,
  }).setOrigin(0, 0.5).setDepth(103);
  container.add([numTxt, wordTxt]);

  // Next 깃발 — 추가로 30% 감소 (76×34 → 53×24), 위치 살짝 아래로
  if (isNext) {
    const flagY = rowY - cardH / 2 + 30;
    const ribbon = scene.add.image(cardLeftX + 40, flagY, 'sr_next_flag')
      .setDisplaySize(53, 24).setDepth(104);
    const nextLbl = scene.add.text(cardLeftX + 40 - 3, flagY - 2, 'Next', {
      fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '11px',
      color: '#FFFFFF', stroke: '#7A1818', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(105);
    container.add([ribbon, nextLbl]);
  }

  // 우측 헥사곤 안 보석 + 수량 — 1.35배, 헥사곤 시각 중심 보정 위해 살짝 우측 시프트
  const gemX = hexCX + 6;
  const gem = scene.add.image(gemX, rowY, 'ui_rb_icon_gem').setDisplaySize(76, 76).setDepth(103);
  if (state === 'claimed') gem.setAlpha(0.45);
  const rewardTxt = scene.add.text(gemX, rowY + 22, String(reward.gems), {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '19px',
    color: '#FFFFFF', stroke: '#000', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(104);
  container.add([gem, rewardTxt]);

  // 체크 (claimed) — 우측 헥사곤 우상단
  if (state === 'claimed') {
    const check = scene.add.image(hexCX + 28, rowY - 24, 'sr_check').setDisplaySize(26, 26).setDepth(106);
    container.add(check);
  }

  // canClaim → 카드 전체 클릭으로 수령
  if (state === 'canClaim') {
    card.setInteractive({ useHandCursor: true });
    card.on('pointerup', () => {
      if (claimStageReward(scene, reward.stage)) {
        flyRewardToHud(scene, hexCX, rowY, 'ui_rb_icon_gem', scene.uiGems, 8, 0);
        closeStageRewardPanel(scene);
        scene.time.delayedCall(900, () => openStageRewardPanel(scene));
      }
    });
  }
}

function closeStageRewardPanel(scene) {
  const p = scene.stageRewardPanel;
  if (!p) return;
  if (p.wheelHandler) { try { scene.input.off('wheel', p.wheelHandler); } catch (e) {} }
  if (p.container) { try { p.container.clearMask(true); } catch (e) {} p.container.destroy(); }
  p.els.forEach((e) => e && e.destroy && e.destroy());
  scene.stageRewardPanel = null;
}

// === 프로필 모달 — HUD 아바타 클릭 시 표시 ==================================
function openProfileModal(scene) {
  if (scene.profileModal) return;
  const els = [];

  // 풀스크린 dim — 클릭 가로채기
  const dim = scene.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.6)
    .setDepth(150).setInteractive();
  els.push(dim);

  // 모달 BG — K-335 자산 (X마크 포함되어 있음). 사이즈 10% 감소
  const modalW = 414, modalH = 495;
  const modalCX = GAME_W / 2, modalCY = GAME_H / 2 - 20;
  const bg = scene.add.image(modalCX, modalCY, 'profile_modal_bg')
    .setDisplaySize(modalW, modalH).setDepth(151);
  els.push(bg);

  const modalTop = modalCY - modalH / 2;
  const modalLeft = modalCX - modalW / 2;
  const modalRight = modalCX + modalW / 2;

  // 모든 텍스트 공용 — 아래쪽 검은 그림자
  const addShadow = (t) => t.setShadow(0, 2, '#000000', 2, true, true);

  // 헤더 "프로필" (한글)
  const headerTxt = scene.add.text(modalCX, modalTop + 28, '프로필', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '22px',
    color: '#FFFFFF', stroke: '#1B3258', strokeThickness: 4,
  }).setOrigin(0.5).setDepth(152);
  addShadow(headerTxt);
  els.push(headerTxt);

  // X 닫기 — BG 자산에 이미 X마크 있음. 그 위치에 투명 hit zone만.
  // 자산상 X마크 = 우상단(자산 583×697 기준 약 x=505 y=50 ~ 정사각형 ~ 60px). 표시 비율: 460/583, 모달 좌표로 환산.
  const closeX = modalRight - 30, closeY = modalTop + 30;
  const closeHit = scene.add.rectangle(closeX, closeY, 42, 42, 0x000000, 0)
    .setDepth(155).setInteractive({ useHandCursor: true });
  closeHit.on('pointerup', () => closeProfileModal(scene));
  els.push(closeHit);

  // === 좌측 portrait + 우측 닉네임/ID/성레벨 — 0.6cm 위로 ===
  const headRowY = modalTop + 122; // 145 → 122 (23px ≈ 0.6cm 위로)
  const frameSize = 100;
  const portraitX = modalLeft + 36 + frameSize / 2;
  const portraitSize = frameSize * 0.83;
  // (1) 프레임 자산 깔기 (K-288)
  const portraitFrame = scene.add.image(portraitX, headRowY, 'profile_frame')
    .setDisplaySize(frameSize, frameSize).setDepth(152);
  // (2) portrait 자산 그 위에
  const portraitImg = scene.add.image(portraitX, headRowY, scene.userProfileKey || 'portrait_01')
    .setDisplaySize(portraitSize, portraitSize).setDepth(153);

  // (3) hover overlay (검정 어둠) + 연필 아이콘 — 마우스 오버 시 alpha 0.7로 등장
  const portraitDim = scene.add.rectangle(portraitX, headRowY, portraitSize, portraitSize, 0x000000, 0)
    .setDepth(154);
  const portraitPencil = scene.add.image(portraitX, headRowY, 'icon_pencil')
    .setDisplaySize(32, 32).setDepth(155).setAlpha(0);
  // 클릭 받는 풀 hit zone (frame 전체)
  const portraitHit = scene.add.rectangle(portraitX, headRowY, frameSize, frameSize, 0x000000, 0)
    .setDepth(156).setInteractive({ useHandCursor: true });
  portraitHit.on('pointerover', () => {
    portraitDim.setFillStyle(0x000000, 0.35);
    portraitPencil.setAlpha(0.7);
  });
  portraitHit.on('pointerout', () => {
    portraitDim.setFillStyle(0x000000, 0);
    portraitPencil.setAlpha(0);
  });
  portraitHit.on('pointerup', () => openPortraitPicker(scene));
  els.push(portraitFrame, portraitImg, portraitDim, portraitPencil, portraitHit);

  // 우측 닉네임 — portrait 윗 기준 (간격 조정)
  const nameX = portraitX + portraitSize / 2 + 16;
  const nameTxt = scene.add.text(nameX, headRowY - 32, castleNickname, {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '26px',
    color: '#FFFFFF', stroke: '#1B3258', strokeThickness: 4,
  }).setOrigin(0, 0.5).setDepth(152);
  addShadow(nameTxt);
  els.push(nameTxt);

  // 닉네임 옆 연필 아이콘 — 검정 외곽선 + 검정 그림자 + 흰 본체
  const editIconX = nameX + nameTxt.width + 18;
  const editIconY = headRowY - 32;
  const PENCIL_SIZE = 24;
  // (1) 그림자 — 본체 아래로 명확하게 (텍스트 그림자처럼 보이도록 2단계 stamp)
  const pencilShadow1 = scene.add.image(editIconX, editIconY + 3, 'icon_pencil')
    .setDisplaySize(PENCIL_SIZE, PENCIL_SIZE).setTint(0x000000).setAlpha(0.65).setDepth(152);
  const pencilShadow2 = scene.add.image(editIconX, editIconY + 5, 'icon_pencil')
    .setDisplaySize(PENCIL_SIZE, PENCIL_SIZE).setTint(0x000000).setAlpha(0.35).setDepth(152);
  // (2) 검정 외곽선 — 8방향 1.5px 복제 stamp
  const outlineOffsets = [[-1.5,0],[1.5,0],[0,-1.5],[0,1.5],[-1.1,-1.1],[1.1,-1.1],[-1.1,1.1],[1.1,1.1]];
  const pencilOutlines = outlineOffsets.map(([dx, dy]) =>
    scene.add.image(editIconX + dx, editIconY + dy, 'icon_pencil')
      .setDisplaySize(PENCIL_SIZE, PENCIL_SIZE).setTint(0x000000).setDepth(153)
  );
  // (3) 본체 — 흰색 (interactive)
  const editIcon = scene.add.image(editIconX, editIconY, 'icon_pencil')
    .setDisplaySize(PENCIL_SIZE, PENCIL_SIZE).setDepth(154)
    .setInteractive({ useHandCursor: true });
  editIcon.on('pointerup', () => openNicknameEdit(scene));
  els.push(pencilShadow1, pencilShadow2, ...pencilOutlines, editIcon);

  // Player ID — 닉네임 아래 (간격 넓힘)
  if (!scene.playerId) scene.playerId = 'Pk-' + Math.floor(100000 + Math.random() * 900000);
  const idTxt = scene.add.text(nameX, headRowY - 8, '플레이어 ID  ' + scene.playerId, {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '11px',
    color: '#B8A0FF', stroke: '#000000', strokeThickness: 2,
  }).setOrigin(0, 0.5).setDepth(152);
  addShadow(idTxt);
  els.push(idTxt);

  // 성 레벨 — 아이콘 (이전 2배의 80% = 약 38px) + portrait 아랫 기준 정렬
  const castleH = 38;                            // 48 → 38 (20% 감소)
  const castleW = castleH * (123 / 101);
  const castleY = headRowY + 46 - castleH / 2;   // 아이콘 하단 = portrait 하단
  const castleImg = scene.add.image(nameX + castleW / 2, castleY, 'ui_icon_castle')
    .setDisplaySize(castleW, castleH).setDepth(152);
  const castleLbl = scene.add.text(nameX + castleW + 8, castleY - 12, '성 레벨', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '12px',
    color: '#FFFFFF', stroke: '#1F0410', strokeThickness: 3,
  }).setOrigin(0, 0.5).setDepth(152);
  const castleNum = scene.add.text(nameX + castleW + 8, castleY + 10, String(castleLevel || 1), {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '18px',
    color: '#FFE96B', stroke: '#1F0410', strokeThickness: 3,
  }).setOrigin(0, 0.5).setDepth(152);
  addShadow(castleLbl); addShadow(castleNum);
  els.push(castleImg, castleLbl, castleNum);

  // === STATS 영역 ===
  const statsHeaderY = headRowY + 127; // 이전 +176에서 49px(=1.3cm) 위로
  const statsHeaderTxt = scene.add.text(modalCX, statsHeaderY, 'STATS', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '15px',
    color: '#FFFFFF', stroke: '#1B3258', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(152);
  addShadow(statsHeaderTxt);
  els.push(statsHeaderTxt);

  // 6개 stat (2x3 grid). 실 데이터 + 좌측 아이콘.
  const heroCount = Object.keys(scene.heroInventory || {}).length;
  const stats = [
    { label: '스테이지 클리어',  value: '스테이지 ' + (typeof stage === 'number' ? stage : 1), icon: 'profile_stat_stage' },
    { label: '랭킹',            value: '집계중',                                                icon: 'profile_stat_ranking' },
    { label: '사용 보석',        value: String(totalGemsSpent || 0),                            icon: 'profile_stat_gem' },
    { label: '사용 골드',        value: String(totalGoldSpent || 0),                            icon: 'profile_stat_gold' },
    { label: '몬스터 처치',      value: String(kills || 0),                                     icon: 'profile_stat_kill' },
    { label: '영웅 보유 수',     value: String(heroCount),                                      icon: 'profile_stat_hero' },
  ];

  const colCount = 2;
  const cellW = (modalW - 60) / colCount;
  const cellH = 56;
  const statsStartY = statsHeaderY + 22;
  stats.forEach((s, i) => {
    const col = i % colCount, row = Math.floor(i / colCount);
    const sx = modalLeft + 30 + cellW * (col + 0.5);
    const sy = statsStartY + cellH * (row + 0.5);
    // 셀 BG — K-244 자산
    const cellBg = scene.add.image(sx, sy, 'stat_cell_bg')
      .setDisplaySize(cellW - 12, cellH - 8).setDepth(152);
    // 아이콘 — 셀 좌측 가장자리에서 살짝 외부로 삐져나옴
    const iconImg = scene.add.image(sx - (cellW - 12) / 2 + 10, sy + 2, s.icon)
      .setDisplaySize(51, 51).setDepth(153);
    // 라벨 — 셀 상단 외곽선 라인에 걸침 (노란색 강조)
    const labelTxt = scene.add.text(sx, sy - (cellH - 8) / 2, s.label, {
      fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '11px',
      color: '#FFE96B', stroke: '#0E1A2D', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(154);
    // 값 — 아이콘 우측 (셀 우측 영역, 큰 아이콘에 맞춰 더 우측)
    const valueTxt = scene.add.text(sx + 22, sy + 4, s.value, {
      fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '17px',
      color: '#FFFFFF', stroke: '#0E1A2D', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(154);
    addShadow(labelTxt); addShadow(valueTxt);
    els.push(cellBg, iconImg, labelTxt, valueTxt);
  });

  scene.profileModal = { els };
}

function closeProfileModal(scene) {
  const p = scene.profileModal;
  if (!p) return;
  p.els.forEach((e) => e && e.destroy && e.destroy());
  scene.profileModal = null;
}

// === 프로필 사진 선택 — portraits/ 폴더의 43개 자산 그리드 ====================
function openPortraitPicker(scene) {
  if (scene.portraitPicker) return;
  const els = [];

  // 풀스크린 dim (모달 위 layer). dim 바깥 클릭하면 닫기.
  const dim = scene.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.75)
    .setDepth(200).setInteractive();
  dim.on('pointerup', () => closePortraitPicker(scene));
  els.push(dim);

  // 헤더
  const headerTxt = scene.add.text(GAME_W / 2, 50, '프로필 선택', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '24px',
    color: '#FFFFFF', stroke: '#000', strokeThickness: 4,
  }).setOrigin(0.5).setDepth(201);
  headerTxt.setShadow(0, 2, '#000000', 2, true, true);
  els.push(headerTxt);

  // X 닫기 (우상단) — Layer Lab K-240 빨간 X 자산
  const closeX = GAME_W - 36, closeY = 50;
  const closeBtn = scene.add.image(closeX, closeY, 'btn_close_x')
    .setDisplaySize(44, 44).setDepth(201)
    .setInteractive({ useHandCursor: true });
  closeBtn.on('pointerdown', () => closeBtn.setScale(closeBtn.scaleX * 0.9, closeBtn.scaleY * 0.9));
  closeBtn.on('pointerup', () => closePortraitPicker(scene));
  els.push(closeBtn);

  // 그리드 — 5열, 9행 (43개)
  const cols = 5;
  const cellSize = 86;
  const gap = 8;
  const gridW = cols * cellSize + (cols - 1) * gap;
  const startX = (GAME_W - gridW) / 2 + cellSize / 2;
  const startY = 110;
  const portraitSizeInner = cellSize * 0.83;
  const currentKey = scene.userProfileKey || 'portrait_01';

  for (let i = 1; i <= 43; i++) {
    const key = 'portrait_' + String(i).padStart(2, '0');
    const col = (i - 1) % cols;
    const row = Math.floor((i - 1) / cols);
    const cx = startX + col * (cellSize + gap);
    const cy = startY + row * (cellSize + gap);

    // 프레임 자산
    const frameImg = scene.add.image(cx, cy, 'profile_frame')
      .setDisplaySize(cellSize, cellSize).setDepth(201);
    // portrait
    const portraitImg = scene.add.image(cx, cy, key)
      .setDisplaySize(portraitSizeInner, portraitSizeInner).setDepth(202);

    // 현재 선택 강조 — 옅은 시안 외곽선, 미세하게 숨쉬는 alpha
    let highlight = null;
    if (key === currentKey) {
      highlight = scene.add.rectangle(cx, cy, cellSize + 6, cellSize + 6)
        .setStrokeStyle(3, 0x9FE6FF).setDepth(203);
      scene.tweens.add({
        targets: highlight, alpha: 0.55,
        duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      els.push(highlight);
    }

    // hit zone (셀 전체 클릭)
    const hit = scene.add.rectangle(cx, cy, cellSize, cellSize, 0x000000, 0)
      .setDepth(204).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => { if (key !== currentKey) frameImg.setTint(0x6A7AA8); });
    hit.on('pointerout',  () => { if (key !== currentKey) frameImg.clearTint(); });
    hit.on('pointerup', () => {
      scene.userProfileKey = key;
      // HUD 프로필 아이콘 즉시 동기화 — setTexture가 displaySize를 reset하므로 다시 호출
      if (scene.uiAvatarSprite && scene.uiAvatarSprite.setTexture) {
        scene.uiAvatarSprite.setTexture(key);
        const _avSize = 77 * 0.83; // HUD avatarSize * portraitInner ratio
        scene.uiAvatarSprite.setDisplaySize(_avSize, _avSize);
      }
      try { saveGame(scene); } catch (e) {}
      closePortraitPicker(scene);
      closeProfileModal(scene);
      openProfileModal(scene);
    });

    els.push(frameImg, portraitImg, hit);
  }

  scene.portraitPicker = { els };
}

function closePortraitPicker(scene) {
  const p = scene.portraitPicker;
  if (!p) return;
  p.els.forEach((e) => e && e.destroy && e.destroy());
  scene.portraitPicker = null;
}

// === 닉네임 변경 모달 — K-354 BG + HTML input (Layer Lab "Input your name" 스타일) ===
function openNicknameEdit(scene) {
  if (scene.nicknameEdit) return;
  const els = [];

  // dim — 풀스크린
  const dim = scene.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.65)
    .setDepth(220).setInteractive();
  els.push(dim);

  // 모달 BG (K-354)
  const modalW = 360, modalH = 300;
  const modalCX = GAME_W / 2, modalCY = GAME_H / 2;
  const bg = scene.add.image(modalCX, modalCY, 'nickname_modal_bg')
    .setDisplaySize(modalW, modalH).setDepth(221);
  els.push(bg);

  // 모든 텍스트 그림자 헬퍼
  const addShadow = (t) => t.setShadow(0, 2, '#000000', 2, true, true);

  // 헤더 "이름 입력" — 살짝 위로
  const headerY = modalCY - modalH / 2 + 22;
  const headerTxt = scene.add.text(modalCX, headerY, '이름 입력', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '20px',
    color: '#FFFFFF',
  }).setOrigin(0.5).setDepth(222);
  addShadow(headerTxt);
  els.push(headerTxt);

  // 입력 박스 BG (K-364 자산)
  const inputBoxW = 280, inputBoxH = 48;
  const inputBoxY = modalCY - 30;
  const inputBox = scene.add.image(modalCX, inputBoxY, 'input_box_bg')
    .setDisplaySize(inputBoxW, inputBoxH).setDepth(221);
  els.push(inputBox);

  // HTML input — 박스 자산 위에 transparent로 띄움
  const canvas = scene.game.canvas;
  const canvasRect = canvas.getBoundingClientRect();
  const screenX = canvasRect.left + (modalCX * canvasRect.width / GAME_W);
  const screenY = canvasRect.top + (inputBoxY * canvasRect.height / GAME_H);
  const inputEl = document.createElement('input');
  inputEl.type = 'text';
  inputEl.maxLength = 16;
  inputEl.value = castleNickname || '';
  Object.assign(inputEl.style, {
    position: 'fixed',
    left: screenX + 'px', top: screenY + 'px',
    transform: 'translate(-50%, -50%)',
    width: (inputBoxW * canvasRect.width / GAME_W - 30) + 'px',
    height: (inputBoxH * canvasRect.height / GAME_H - 12) + 'px',
    fontSize: '18px', fontWeight: 'bold',
    textAlign: 'center', color: '#2A6BC8',
    background: 'transparent',
    border: 'none', outline: 'none',
    padding: '0', margin: '0',
    fontFamily: 'BMJUA, sans-serif',
    zIndex: '2000',
  });
  document.body.appendChild(inputEl);
  setTimeout(() => { try { inputEl.focus(); inputEl.select(); } catch (e) {} }, 50);

  // 안내 텍스트 — 컬러 진하게 (옅은 회색 BG에서 가독성)
  const guideY = modalCY + 8;
  const guideTxt = scene.add.text(modalCX, guideY, '언제든지 이름을 변경할 수 있어요', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '12px', color: '#1B3258',
  }).setOrigin(0.5).setDepth(222);
  addShadow(guideTxt);
  els.push(guideTxt);

  // 확인 함수
  const confirm = () => {
    const v = (inputEl.value || '').trim();
    if (v.length > 0 && v.length <= 16) {
      castleNickname = v;
      if (scene.uiCastleNameTop) scene.uiCastleNameTop.setText(castleNickname);
      try { saveGame(scene); } catch (e) {}
      // 튜토리얼 step4 hook
      if (scene._onNicknameChangedTutorial) {
        const cb = scene._onNicknameChangedTutorial;
        scene._onNicknameChangedTutorial = null;
        try { cb(); } catch (e) {}
      }
      closeNicknameEdit(scene);
      closeProfileModal(scene);
      openProfileModal(scene);
    } else {
      closeNicknameEdit(scene);
    }
  };
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirm();
    if (e.key === 'Escape') closeNicknameEdit(scene);
  });

  // 버튼 helper — 자산 이미지 + 텍스트 + hit zone + 클릭 반응
  const btnW = 110, btnH = 50, btnY = modalCY + 80;
  const makeBtn = (btnX, assetKey, label, onClick, strokeColor) => {
    const img = scene.add.image(btnX, btnY, assetKey)
      .setDisplaySize(btnW, btnH).setDepth(222);
    // 텍스트는 버튼 자산의 시각 중심(글로시 영역 위)에 맞춰 살짝 위로
    const txt = scene.add.text(btnX, btnY - 3, label, {
      fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '20px',
      color: '#FFFFFF', stroke: strokeColor || '#1A1A1A', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(223);
    addShadow(txt);
    const hit = scene.add.rectangle(btnX, btnY, btnW + 14, btnH + 14, 0x000000, 0)
      .setDepth(224).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => { img.setScale(img.scaleX * 0.92, img.scaleY * 0.92); txt.setScale(0.92); });
    hit.on('pointerout',  () => { img.setDisplaySize(btnW, btnH); txt.setScale(1); });
    hit.on('pointerup',   () => { img.setDisplaySize(btnW, btnH); txt.setScale(1); onClick(); });
    els.push(img, txt, hit);
  };
  // 확인 (파란) — 왼쪽, 어두운 파랑 stroke
  makeBtn(modalCX - 62, 'btn_blue', '확인', confirm, '#143E78');
  // 취소 (빨강) — 오른쪽, 어두운 빨강 stroke
  makeBtn(modalCX + 62, 'btn_red', '취소', () => closeNicknameEdit(scene), '#7A1818');

  scene.nicknameEdit = { els, inputEl };
}

function closeNicknameEdit(scene) {
  const p = scene.nicknameEdit;
  if (!p) return;
  if (p.inputEl && p.inputEl.parentNode) {
    try { p.inputEl.parentNode.removeChild(p.inputEl); } catch (e) {}
  }
  p.els.forEach((e) => e && e.destroy && e.destroy());
  scene.nicknameEdit = null;
}

function updateTavernButton(scene) {
  // 무료 소환 '실제로' 가능할 때만 wobble + 말풍선. stock 남아도 5분 쿨다운 중이면 멈춤.
  const canFree = isTavernFreeReady();
  const icon = scene.uiTavernBg;
  if (!icon) return;
  if (canFree && !scene._tavernWobbleTween) {
    // 좌우 약간 흔들기 (반복)
    scene._tavernWobbleTween = scene.tweens.add({
      targets: icon, angle: { from: -8, to: 8 },
      duration: 160, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    // 말풍선 — 한 번 띄우고 자동 페이드 (반복은 너무 산만)
    showTavernFreeBubble(scene);
  } else if (!canFree && scene._tavernWobbleTween) {
    scene._tavernWobbleTween.stop();
    scene._tavernWobbleTween = null;
    icon.angle = 0;
    if (scene._tavernBubble) {
      scene._tavernBubble.destroy();
      scene._tavernBubble = null;
    }
  }
}

function showTavernFreeBubble(scene) {
  const icon = scene.uiTavernBg;
  if (!icon) return;
  if (scene._tavernBubble) { scene._tavernBubble.destroy(); scene._tavernBubble = null; }
  const tipX = icon.x;
  const tipY = icon.y - 28;
  const bubble = drawSpeechBubble(scene, tipX, tipY, '무료 소환 가능!', 45);
  scene._tavernBubble = bubble;
  // 가벼운 펄스 (위아래)
  const bubbleParts = [bubble.bg, bubble.txt];
  scene.tweens.add({
    targets: bubbleParts, y: '-=3',
    duration: 360, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });
}

// === Speech bubble =========================================================
// tipX, tipY는 꼬리 끝점. 본체는 그 위에 자동 배치되고, 화면 가장자리에서는 본체 중심만 클램프된다.
function drawSpeechBubble(scene, tipX, tipY, text, depth = 8) {
  const bg = scene.add.graphics().setDepth(depth);
  const txt = scene.add.text(0, 0, text, {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '10px',
    color: '#000000',
  }).setOrigin(0.5).setDepth(depth + 1);
  const obj = {
    bg, txt, text,
    move(nx, ny) { renderSpeechBubble(bg, txt, text, nx, ny); },
    destroy() { bg.destroy(); txt.destroy(); },
  };
  obj.move(tipX, tipY);
  return obj;
}

function renderSpeechBubble(bg, txt, text, tipX, tipY) {
  bg.clear();
  const bubbleR = 6, tailHalf = 5, tailH = 7, padX = 8, bubbleH = 21;
  txt.setText(text);
  const textW = txt.width;
  const bubbleW = Math.max(28, Math.ceil(textW) + padX * 2);
  const margin = 4;
  const bubbleCX = Phaser.Math.Clamp(tipX, margin + bubbleW / 2, GAME_W - margin - bubbleW / 2);
  const bubbleX = bubbleCX - bubbleW / 2;
  const bubbleY = tipY - tailH - bubbleH;
  const bbR = bubbleX + bubbleW;
  const bbB = bubbleY + bubbleH;
  // 본체 흰색 fill
  bg.fillStyle(0xFFFFFF, 1);
  bg.fillRoundedRect(bubbleX, bubbleY, bubbleW, bubbleH, bubbleR);
  // 꼬리 흰색 fill (본체와 1px 겹침)
  bg.beginPath();
  bg.moveTo(tipX - tailHalf, bbB - 1);
  bg.lineTo(tipX + tailHalf, bbB - 1);
  bg.lineTo(tipX, tipY);
  bg.closePath();
  bg.fillPath();
  // 외곽선 — 본체 + 꼬리 빗변 (꼬리 부착부의 본체 하단은 그리지 않음)
  bg.lineStyle(2, 0x000000, 1);
  bg.beginPath();
  bg.moveTo(tipX + tailHalf, bbB);
  bg.lineTo(tipX, tipY);
  bg.lineTo(tipX - tailHalf, bbB);
  bg.lineTo(bubbleX + bubbleR, bbB);
  bg.arc(bubbleX + bubbleR, bbB - bubbleR, bubbleR, Math.PI / 2, Math.PI, false);
  bg.lineTo(bubbleX, bubbleY + bubbleR);
  bg.arc(bubbleX + bubbleR, bubbleY + bubbleR, bubbleR, Math.PI, 1.5 * Math.PI, false);
  bg.lineTo(bbR - bubbleR, bubbleY);
  bg.arc(bbR - bubbleR, bubbleY + bubbleR, bubbleR, 1.5 * Math.PI, 2 * Math.PI, false);
  bg.lineTo(bbR, bbB - bubbleR);
  bg.arc(bbR - bubbleR, bbB - bubbleR, bubbleR, 0, Math.PI / 2, false);
  bg.lineTo(tipX + tailHalf, bbB);
  bg.strokePath();
  txt.setPosition(bubbleCX, bubbleY + bubbleH / 2);
}

// === Hero chatter ==========================================================
// 배치된 영웅 중 1명만 가끔 짧은 한 마디. 동시에 1개의 말풍선만 유지.
const HERO_CHATTER_LINES = [
  '가자!', '준비됐다!', '몬스터다!', '한방이다!', '으랏차!',
  '버텨라!', '내 차례!', '훗!', '쉽군!', '조심해!',
  '괜찮아?', '좋아!', '으하하!', '뭐야!?', '간다!',
  '받아라!', '여기야!', '재밌네!',
];
const HERO_CHATTER_MIN_GAP_MS = 12000;
const HERO_CHATTER_MAX_GAP_MS = 27000;
const HERO_CHATTER_DURATION_MS = 2200;
const HERO_CHATTER_TIP_OFFSET_Y = 33;

function updateHeroChatter(scene, time) {
  const active = scene.activeChatter;
  if (active) {
    if (!active.hero.active || !active.hero.alive || time >= active.expiresAt) {
      active.bubble.destroy();
      scene.activeChatter = null;
    } else {
      active.bubble.move(active.hero.x, active.hero.y - HERO_CHATTER_TIP_OFFSET_Y);
    }
  }
  if (scene.heroChatterNextAt == null) {
    scene.heroChatterNextAt = time + Phaser.Math.Between(HERO_CHATTER_MIN_GAP_MS, HERO_CHATTER_MAX_GAP_MS);
    return;
  }
  if (scene.activeChatter || time < scene.heroChatterNextAt) return;
  const candidates = scene.allies.getChildren().filter((h) => h.alive);
  if (candidates.length === 0) {
    scene.heroChatterNextAt = time + 1000;
    return;
  }
  const hero = Phaser.Utils.Array.GetRandom(candidates);
  // 영웅별 quotes 정의 시 우선 사용 — 캐릭터 컨셉 살린 대사. 없으면 generic 폴백
  const pool = (hero.heroDef && hero.heroDef.quotes && hero.heroDef.quotes.length)
    ? hero.heroDef.quotes
    : HERO_CHATTER_LINES;
  const line = Phaser.Utils.Array.GetRandom(pool);
  const bubble = drawSpeechBubble(scene, hero.x, hero.y - HERO_CHATTER_TIP_OFFSET_Y, line, 8);
  scene.activeChatter = { bubble, hero, expiresAt: time + HERO_CHATTER_DURATION_MS };
  scene.heroChatterNextAt = time + HERO_CHATTER_DURATION_MS + Phaser.Math.Between(HERO_CHATTER_MIN_GAP_MS, HERO_CHATTER_MAX_GAP_MS);
}

function flashInsufficientGems(scene) {
  showToast(scene, '보석이 부족합니다');
}

// === Hero HUD ==============================================================

// 성 레벨에 따라 오픈된 슬롯 수 (8칸 기준, +1씩 5단계)
function getUnlockedSlotCount(level) {
  if (cheatAllSlotsUnlocked) return 8;
  if (level >= 25) return 8;
  if (level >= 20) return 7;
  if (level >= 15) return 6;
  if (level >= 10) return 5;
  if (level >= 5)  return 4;
  return 3;
}
let cheatAllSlotsUnlocked = false;

// 슬롯 인덱스가 해금되는 성 레벨 (잠금 토스트용)
function getSlotUnlockLevel(index) {
  if (index < 3)   return 1;
  if (index === 3) return 5;
  if (index === 4) return 10;
  if (index === 5) return 15;
  if (index === 6) return 20;
  return 25;
}

// 슬롯 형태 — 사용자 레퍼런스 정확 매칭 (작은 radius 5px, 얇은 검정 외곽, 상단 inset shadow).
// occupied=true 이면 sprite BG가 덮으므로 본체/외곽선 생략 (drop zone 유지용 투명만)
function drawAngularSlot(g, occupied) {
  const W = HUD_CARD_W, H = HUD_CARD_H;
  const R = 5;
  g.clear();
  if (occupied) return;  // sprite BG가 덮음 — 더블 아웃라인 방지
  // 다크 본체 — 더 투명하게 (뒤 배경 잘 비침)
  g.fillStyle(0x2D2D39, 0.45);
  g.fillRoundedRect(-W / 2, -H / 2, W, H, R);
  // 상단 inset shadow — 14px 높이 검정 알파 그라데이션 (위→아래 감소)
  const SHADOW_H = 14;
  for (let i = 0; i < SHADOW_H; i++) {
    const a = 0.18 * (1 - i / SHADOW_H);
    g.fillStyle(0x000000, a);
    g.fillRect(-W / 2 + 2, -H / 2 + 1 + i, W - 4, 1);
  }
  // 얇은 검정 외곽
  g.lineStyle(1.5, 0x000000, 0.7);
  g.strokeRoundedRect(-W / 2, -H / 2, W, H, R);
}

// 드롭 그림자 — 슬롯 본체와 같은 모양, 검정 알파
function drawAngularSlotShadow(g) {
  const W = HUD_CARD_W, H = HUD_CARD_H;
  const R = 5;
  g.clear();
  g.fillStyle(0x000000, 0.28);
  g.fillRoundedRect(-W / 2, -H / 2, W, H, R);
}

function buildHeroHUD(scene) {
  const cols = HERO_SLOT_COUNT; // 1줄 × 10 슬롯
  const totalW = cols * HUD_CARD_W + (cols - 1) * HUD_GAP;
  const startX = (GAME_W - totalW) / 2 + HUD_CARD_W / 2;
  const hudTop = GAME_H - BOTTOM_UI_HEIGHT;
  // 슬롯 bottom 위치를 EXP 바 위 22px 으로 고정 — 슬롯 크기 변해도 분리 영역 유지 (사용자 요청)
  const startY = hudTop + 36 - HUD_CARD_H / 2;

  // HUD 컨테이너 — 슬롯만 (EXP 바는 별도, 슬라이드 안 함)
  scene.heroHudContainer = scene.add.container(0, 0).setDepth(60);

  scene.heroSlots = [];
  for (let i = 0; i < HERO_SLOT_COUNT; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = startX + col * (HUD_CARD_W + HUD_GAP);
    const cy = startY + row * (HUD_CARD_H + HUD_GAP);
    // 사용자 레퍼런스 정확 매칭: 작은 코너(각진) + 얇은 검정 외곽 + 상단 inset shadow + 드롭 그림자.
    // SkillFrame_l~m_Empty.png 알약 강제 정사각화 시 코너 깨짐 → Phaser graphics로 직접 그리는 게 가장 정확.
    const SHADOW_OFFSET_Y = 3;
    const shadow = scene.add.graphics().setDepth(58);
    shadow.x = cx; shadow.y = cy + SHADOW_OFFSET_Y;
    drawAngularSlotShadow(shadow);
    const bg = scene.add.graphics().setDepth(59);
    bg.x = cx; bg.y = cy;
    drawAngularSlot(bg);
    bg.setInteractive(
      new Phaser.Geom.Rectangle(-HUD_CARD_W / 2, -HUD_CARD_H / 2, HUD_CARD_W, HUD_CARD_H),
      Phaser.Geom.Rectangle.Contains
    );
    bg.input.dropZone = true;
    bg.input.draggable = true;
    bg.input.cursor = 'pointer';
    // 잠금 아이콘 (slot이 unlocked가 아닐 때 보임)
    const lockIcon = scene.add.image(cx, cy, 'ui_icon_lock')
      .setDisplaySize(18, 26).setDepth(61).setAlpha(0.85);
    const slotEntry = { index: i, x: cx, y: cy, bg, shadow, lockIcon, occupied: false, hero: null, parts: null };
    bg.slotEntry = slotEntry;
    // 슬롯 탭(패널 닫혀있을 때만): 영웅 배치된 슬롯 → 디테일 팝업, 빈 슬롯 → 인벤토리 열기.
    // 패널 열린 상태에선 슬롯이 헤더 바로 위로 올라와 헤더 글씨 영역과 시각적으로 붙음 →
    // 슬롯 탭이 "헤더 클릭"으로 오인되므로 패널 열린 동안은 비활성.
    bg.on('pointerup', (pointer) => {
      if (!bg.input || !bg.input.enabled) return;
      if (pointer.getDistance() > 8) return; // 드래그였음 — 무시
      if (scene.inventoryPanelElements || scene.growthElements) return; // 패널 열려있으면 무시
      if (slotEntry.isLocked) {
        const lv = getSlotUnlockLevel(slotEntry.index);
        showToast(scene, `성 레벨 ${lv}에서 해금됩니다`);
        return;
      }
      if (slotEntry.occupied && slotEntry.hero) {
        openHeroDetailPanel(scene, slotEntry.hero.heroDef.id);
      } else {
        onTabPressed(scene, 'heroes');
      }
    });

    // 슬롯 드래그 → 해제. ghost로 영웅 끌어내고 떼면 그냥 unequip.
    bg.on('dragstart', (pointer) => {
      if (!slotEntry.occupied || !slotEntry.hero) return;
      const hero = slotEntry.hero;
      const def = hero.heroDef;
      if (slotEntry.parts && slotEntry.parts.portrait) {
        slotEntry.parts.portrait.setAlpha(0.3);
      }
      const ghost = scene.add.container(pointer.worldX, pointer.worldY).setDepth(200).setAlpha(0.85);
      const ghostScale = def.drawBody ? 0.55 : 1.7;
      ghost.setScale(ghostScale);
      drawHeroPortraitStatic(scene, def, ghost);
      bg._ghost = ghost;
      bg._dragHeroId = def.id;
    });

    bg.on('drag', (pointer) => {
      if (!bg._ghost) return;
      bg._ghost.x = pointer.worldX;
      bg._ghost.y = pointer.worldY;
    });

    bg.on('dragend', () => {
      if (!bg._ghost) return;
      bg._ghost.destroy();
      bg._ghost = null;
      bg._dragHeroId = null;
      if (slotEntry.occupied) {
        recallHeroFromSlot(scene, slotEntry.index);
        saveGame(scene);
        if (scene.inventoryPanelElements) refreshInventoryPanel(scene);
      }
    });
    scene.heroHudContainer.add([shadow, bg, lockIcon]);
    scene.heroSlots.push(slotEntry);
  }

  refreshHeroSlotUnlock(scene);
}

// 슬라이드 후 슬롯 input hit area 재등록 (Phaser 컨테이너 transform 후 자식 hit area 자동 갱신 안 되는 이슈)
function refreshHeroSlotInteractivity(scene) {
  if (!scene.heroSlots) return;
  scene.heroSlots.forEach((slot) => {
    if (!slot.bg) return;
    const wasEnabled = slot.bg.input && slot.bg.input.enabled;
    slot.bg.disableInteractive();
    slot.bg.setInteractive(
      new Phaser.Geom.Rectangle(-HUD_CARD_W / 2, -HUD_CARD_H / 2, HUD_CARD_W, HUD_CARD_H),
      Phaser.Geom.Rectangle.Contains
    );
    slot.bg.input.dropZone = true;
    slot.bg.input.draggable = true;
    slot.bg.input.cursor = 'pointer';
    slot.bg.input.enabled = wasEnabled;
  });
}

// 성 레벨에 따라 슬롯의 lock/unlock 상태 갱신
function refreshHeroSlotUnlock(scene) {
  if (!scene.heroSlots) return;
  const unlocked = getUnlockedSlotCount(castleLevel || 1);
  scene.heroSlots.forEach((slot, i) => {
    const isUnlocked = i < unlocked;
    slot.isLocked = !isUnlocked;
    if (slot.lockIcon) slot.lockIcon.setVisible(!isUnlocked && !slot.occupied);
    // input은 잠긴 슬롯도 활성 유지 — pointerup에서 토스트 표시. drop snap은 slot.isLocked 체크로 차단.
    if (slot.bg && slot.bg.input) {
      slot.bg.input.enabled = true;
    }
  });
}

// === Bottom tab bar (영웅 / 훈련 / 내정 / 던전 / 상점) =======================

// 탭 순서: 내정 → 영웅 → 훈련 → 던전 → 상점
// iconKey: Layer Lab 스프라이트 (preload에 등록된 키)
// iconRatio: 스프라이트의 width/height ratio (네이티브 비율 보존)
const TAB_DEFS = [
  { id: 'castle',   iconKey: 'ui_icon_castle',         iconRatio: 123 / 101, label: '내정' },
  { id: 'heroes',   iconKey: 'ui_tab_icon_hero',       iconRatio: 72 / 77,   label: '영웅' },
  { id: 'training', iconKey: 'ui_tab_icon_training',   iconRatio: 1,         label: '훈련' },
  { id: 'dungeon',  iconKey: 'ui_tab_icon_dungeon',    iconRatio: 1,         label: '던전' },
  { id: 'shop',     iconKey: 'ui_tab_icon_shop',       iconRatio: 1,         label: '상점' },
];

function buildBottomTabBar(scene) {
  const top = GAME_H - TAB_BAR_HEIGHT;
  const cy = top + TAB_BAR_HEIGHT / 2;
  // 바 BG — 다크 네이비 솔리드 (Layer Lab Menu_BottomBtn_Bg는 4x9 짜투리라 nineslice로 못 씀 → prefab의 m_Color 그대로 사각형으로)
  scene.add.rectangle(GAME_W / 2, cy, GAME_W, TAB_BAR_HEIGHT, 0x1E2440).setDepth(70);

  const tabW = GAME_W / TAB_DEFS.length;
  scene.tabButtons = [];
  // Focus 상단을 EXP 바 위로 8px 오버랩시켜 입체감 강조 (사용자 요청)
  const FOCUS_TOP_OVERLAP = 8;
  TAB_DEFS.forEach((def, i) => {
    const tx = tabW * (i + 0.5);
    // Active focus — graphics로 둥근-상단 사각형. 본체 + 상단 볼록 하이라이트 + 검정 외곽.
    // depth 64 → EXP 바(63) 위에 그려져 오버랩 영역 보임.
    const focus = scene.add.graphics().setDepth(74).setVisible(false);
    const fx = tx - tabW / 2;
    const fy = top - FOCUS_TOP_OVERLAP;
    const fh = TAB_BAR_HEIGHT + FOCUS_TOP_OVERLAP;
    const R = 10;
    // 1단계: 밝은 보라로 전체 채움 (하이라이트 색)
    focus.fillStyle(0x8090F0, 1);
    focus.fillRoundedRect(fx, fy, tabW, fh, { tl: R, tr: R, bl: 0, br: 0 });
    // 2단계: 본체 어두운 보라를 4px 아래 + inner radius R-offset(=6)로 덮음
    //  → outer R(10)과 평행한 curve가 되어 음영이 라운드 코너 따라 내려감
    focus.fillStyle(0x4452D5, 1);
    focus.fillRoundedRect(fx, fy + 4, tabW, fh - 4, { tl: R - 4, tr: R - 4, bl: 0, br: 0 });
    // 검정 외곽
    focus.lineStyle(2, 0x000000, 1);
    focus.strokeRoundedRect(fx, fy, tabW, fh, { tl: R, tr: R, bl: 0, br: 0 });
    const focusLight = null;
    // 클릭 zone (보이지 않음)
    const zone = scene.add.zone(tx, cy, tabW, TAB_BAR_HEIGHT).setInteractive({ useHandCursor: true });
    // 아이콘은 sprite (네이티브 비율 보존) — 1.5배 키움 (사용자 요청)
    const iconH = 42;
    const iconW = iconH * def.iconRatio;
    const icon = scene.add.image(tx, cy - 8, def.iconKey)
      .setDisplaySize(iconW, iconH).setDepth(76);
    // 패널 열렸을 때 표시될 close chip BG (시안 ring + 어두운 fill)
    const closeChipR = 20;
    const closeChipBg = scene.add.graphics().setDepth(75).setVisible(false);
    closeChipBg.fillStyle(0x0A2128, 1);
    closeChipBg.fillCircle(tx, cy - 8, closeChipR);
    closeChipBg.fillStyle(0xFFFFFF, 1);
    closeChipBg.fillCircle(tx, cy - 8, closeChipR - 1.5);
    closeChipBg.fillStyle(0x0F2A30, 1);
    closeChipBg.fillCircle(tx, cy - 8, closeChipR - 4);
    const label = scene.add.text(tx, cy + 22, def.label, {
      fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '13px',
      color: '#FFFFFF', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(76);
    // 레드닷 — 표준 sprite (ui_red_dot, K-359). 숫자 있는 큰 버전 (sprite + 텍스트 한 쌍)
    const badgeSize = 22;
    const badge = scene.add.image(tx + 22, cy - 14, 'ui_red_dot')
      .setDisplaySize(badgeSize, badgeSize)
      .setDepth(77).setVisible(false);
    const badgeText = scene.add.text(tx + 22, cy - 15, '', {
      fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '12px',
      color: '#FFFFFF', stroke: '#000000', strokeThickness: 2.5,
    }).setOrigin(0.5).setDepth(78).setVisible(false);

    zone.on('pointerdown', () => onTabPressed(scene, def.id));

    // 미구현 탭 — 그레이 처리 + 자물쇠 오버레이
    const isLocked = (def.id === 'dungeon' || def.id === 'shop');
    if (isLocked) {
      icon.setTint(0x555555);
      label.setColor('#7A7E8C');
      const lockIcon = scene.add.image(tx + 14, cy - 14, 'ui_icon_lock')
        .setDisplaySize(16, 22).setDepth(78);
      scene.tabButtons.push({ id: def.id, zone, focus, focusLight, icon, label, badge, badgeText, closeChipBg, lockIcon });
    } else {
      scene.tabButtons.push({ id: def.id, zone, focus, focusLight, icon, label, badge, badgeText, closeChipBg });
    }
  });

  scene.activeTabId = null;
  refreshTabBar(scene);
}

// 활성 탭 표시 — 해당 탭의 focus만 visible + 아이콘/라벨 흰색, 나머지는 hidden + 기본색
// 패널 열린 동안 활성 탭 아이콘을 X로 swap (사용자가 닫는 방법 명확)
function setActiveTab(scene, tabId) {
  scene.activeTabId = tabId;
  if (!scene.tabButtons) return;
  const panelOpen = !!(scene.inventoryPanelElements || scene.growthElements);
  scene.tabButtons.forEach((b) => {
    const active = b.id === tabId;
    if (b.focus) b.focus.setVisible(active);
    if (b.focusLight) b.focusLight.setVisible(active);
    if (b.icon) {
      const def = TAB_DEFS.find((d) => d.id === b.id);
      const iconH = 42;
      if (active && panelOpen) {
        // close chip BG + X sprite (작게)
        if (b.closeChipBg) b.closeChipBg.setVisible(true);
        b.icon.setTexture('ui_icon_close');
        b.icon.setDisplaySize(16, 16);
        b.icon.clearTint();
      } else {
        if (b.closeChipBg) b.closeChipBg.setVisible(false);
        b.icon.setTexture(def.iconKey);
        b.icon.setDisplaySize(iconH * def.iconRatio, iconH);
        // 잠긴 탭은 항상 그레이 유지 (active 여부 무시)
        if (b.lockIcon) {
          b.icon.setTint(0x555555);
          if (b.label) b.label.setColor('#7A7E8C');
        } else if (active) {
          b.icon.setTint(0xFFFFFF);
        } else {
          b.icon.clearTint();
        }
      }
    }
  });
  refreshTabBar(scene);  // X 상태 진입/이탈 시 레드닷 표시 즉시 갱신
}

function refreshTabBar(scene) {
  if (!scene.tabButtons) return;
  const panelOpen = !!(scene.inventoryPanelElements || scene.growthElements);
  scene.tabButtons.forEach((b) => {
    if (b.id === 'castle') {
      // active 탭이 X(close) 상태일 땐 레드닷 숨김
      const isCloseState = panelOpen && scene.activeTabId === b.id;
      const show = !isCloseState && castleStatPoints > 0;
      if (b.badge) b.badge.setVisible(show);
      if (b.badgeText) b.badgeText.setText(String(castleStatPoints)).setVisible(show);
    }
  });
}

// 패널 close 애니메이션 duration (slot이 아래로 내려오는 시간) — 이만큼 지연 후 open
const PANEL_CLOSE_DURATION = 200;

function onTabPressed(scene, tabId) {
  // 탭 전환: 기존 패널 닫고, 슬롯 내려가는 close 애니메이션 끝나면 새 패널 open (슬롯이 다시 올라감)
  // → 사용자 의도: 슬롯이 함께 down then up 시퀀스로 보임
  const openAfterClose = (openFn) => {
    const hasOpen = scene.growthElements || scene.inventoryPanelElements;
    if (scene.growthElements) closeGrowthModal(scene);
    if (scene.inventoryPanelElements) closeInventoryPanel(scene);
    if (hasOpen) {
      scene.time.delayedCall(PANEL_CLOSE_DURATION, () => {
        openFn();
        syncActiveTab(scene);
      });
    } else {
      openFn();
      syncActiveTab(scene);
    }
  };

  if (tabId === 'heroes') {
    // 토글: 인벤토리만 열려있으면 닫기. 그 외엔 (growth열려있거나 닫혀있거나) → 인벤토리 open
    if (scene.inventoryPanelElements && !scene.growthElements) {
      closeInventoryPanel(scene);
      syncActiveTab(scene);
      return;
    }
    openAfterClose(() => openInventoryPanel(scene));
    return;
  }

  // 훈련/내정은 같은 모달 공유
  const modalTab = (tabId === 'training') ? 'heroes'
                 : (tabId === 'castle')   ? 'castle'
                 : null;
  if (modalTab) {
    // 같은 탭이면 토글 닫기
    if (scene.growthElements && scene.growthActiveTab === modalTab && !scene.inventoryPanelElements) {
      closeGrowthModal(scene);
      syncActiveTab(scene);
      return;
    }
    openAfterClose(() => openGrowthModal(scene, modalTab));
    return;
  }

  // dungeon/shop — 다 닫고 placeholder
  if (scene.growthElements) closeGrowthModal(scene);
  if (scene.inventoryPanelElements) closeInventoryPanel(scene);
  syncActiveTab(scene);
  if (tabId === 'dungeon')  { flashTabPlaceholder(scene, '던전 — 준비 중'); return; }
  if (tabId === 'shop')     { flashTabPlaceholder(scene, '상점 — 준비 중'); return; }
}

// 현재 열려있는 패널을 기준으로 active 탭 동기화
function syncActiveTab(scene) {
  let id = null;
  if (scene.inventoryPanelElements) id = 'heroes';
  else if (scene.growthElements) {
    id = scene.growthActiveTab === 'castle' ? 'castle' : 'training';
  }
  setActiveTab(scene, id);
}

// 화면 중앙 토스트 — BG 없이 텍스트 + 좌우 라인+다이아 장식. 여러번 호출 시 교체.
function showToast(scene, msg) {
  if (scene._toast) {
    if (scene._toast.tween) scene._toast.tween.remove();
    scene._toast.parts.forEach((p) => p.destroy());
    scene._toast = null;
  }
  const tx = CENTER.x;
  const ty = CENTER.y;
  const text = scene.add.text(tx, ty, msg, {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '16px',
    color: '#FFFFFF', stroke: '#000000', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(71);

  // 좌우 장식 — 라인이 텍스트 가까이, 다이아가 바깥쪽 (간격 16)
  const halfW = text.width / 2;
  const gap = 16;
  const lineLen = 40;
  const diaSize = 3;          // 다이아 절반 축소
  const lineDiaGap = 6;       // 선-다이아 간격 2배 (2 → 6)
  const orn = scene.add.graphics().setDepth(71);
  // 좌측: 텍스트 옆 [gap] → line → [lineDiaGap] → 다이아
  const leftLineInner = tx - halfW - gap;
  const leftLineOuter = leftLineInner - lineLen;
  const leftDiaCX = leftLineOuter - lineDiaGap - diaSize;
  const rightLineInner = tx + halfW + gap;
  const rightLineOuter = rightLineInner + lineLen;
  const rightDiaCX = rightLineOuter + lineDiaGap + diaSize;
  // 검정 아웃라인 — 4px 두께 + 양끝 1px 더 길게 (양옆 ends도 outline 적용)
  orn.lineStyle(4, 0x000000, 1);
  orn.beginPath();
  orn.moveTo(leftLineOuter - 1, ty); orn.lineTo(leftLineInner + 1, ty);
  orn.moveTo(rightLineInner - 1, ty); orn.lineTo(rightLineOuter + 1, ty);
  orn.strokePath();
  orn.lineStyle(2, 0xFFFFFF, 1);
  orn.beginPath();
  orn.moveTo(leftLineOuter, ty); orn.lineTo(leftLineInner, ty);
  orn.moveTo(rightLineInner, ty); orn.lineTo(rightLineOuter, ty);
  orn.strokePath();
  // 다이아 — 검정 아웃라인 큰 거 먼저, 흰 작은 거 위에
  const drawDia = (cx, sz, color) => {
    orn.fillStyle(color, 1);
    orn.fillPoints([
      { x: cx, y: ty - sz },
      { x: cx + sz, y: ty },
      { x: cx, y: ty + sz },
      { x: cx - sz, y: ty },
    ], true);
  };
  drawDia(leftDiaCX, diaSize + 1.5, 0x000000);
  drawDia(rightDiaCX, diaSize + 1.5, 0x000000);
  drawDia(leftDiaCX, diaSize, 0xFFFFFF);
  drawDia(rightDiaCX, diaSize, 0xFFFFFF);

  // 등장: 살짝 아래에서 위 + 페이드인
  text.alpha = 0; orn.alpha = 0;
  const startY = ty + 8;
  text.y = startY; orn.y = 8;
  scene.tweens.add({
    targets: [text], y: ty, alpha: 1,
    duration: 180, ease: 'Quad.easeOut',
  });
  scene.tweens.add({
    targets: [orn], y: 0, alpha: 1,
    duration: 180, ease: 'Quad.easeOut',
  });
  // 1.2s 후 페이드아웃
  const tween = scene.tweens.add({
    targets: [text, orn], alpha: 0,
    duration: 320, delay: 1200, ease: 'Quad.easeIn',
    onComplete: () => {
      text.destroy(); orn.destroy();
      if (scene._toast && scene._toast.parts.includes(text)) scene._toast = null;
    },
  });
  scene._toast = { parts: [text, orn], tween };
}

// 호환 — 기존 placeholder 호출도 새 토스트로 라우팅
function flashTabPlaceholder(scene, msg) { showToast(scene, msg); }

// === Growth modal (스탯 강화) ============================================

// 소수점 표시 헬퍼 — 정수면 최소 .0 표시(15→"15.0"), 소수점 있으면 그대로(0.15→"0.15", 1.5→"1.5")
function fmtStat(v) {
  const rounded = Number(v.toFixed(2));
  return Number.isInteger(rounded) ? rounded.toFixed(1) : rounded.toString();
}

const STAT_ROWS = [
  { id: 'atk',     label: '훈련소',    icon: '⚔', color: '#FF8866',
    imgKey: 'ui_icon_bldg_training',
    effectLabel: '영웅 공격력 ',
    effectVal: (v) => `+${fmtStat(v * STAT_ATK_PCT_PER_POINT * 100)}%` },
  { id: 'heroDef', label: '수련관',    icon: '🛡', color: '#A8D8FF',
    imgKey: 'ui_icon_bldg_heroDef', imgScale: 0.9,
    effectLabel: '영웅 방어력 ',
    effectVal: (v) => `+${fmtStat(v * STAT_HERO_DEF_PER_POINT)}` },
  { id: 'def',     label: '성 내구도', icon: '🏯', color: '#88CCFF',
    imgKey: 'ui_icon_bldg_def', imgScale: 0.8,
    effectLabel: '성 피격 데미지 ',
    effectVal: (v) => `-${fmtStat(v * STAT_DEF_REDUCTION_PER_POINT)}` },
  { id: 'hp',      label: '성벽 증축', icon: '❤', color: '#FF6688',
    imgKey: 'ui_icon_bldg_hp', imgScale: 0.8,
    effectLabel: '성 최대 HP ',
    effectVal: (v) => `+${fmtStat(v * STAT_HP_PER_POINT)}` },
  { id: 'respawn', label: '신전',      icon: '⏳', color: '#FFE082',
    imgKey: 'ui_icon_bldg_respawn', imgScale: 0.9,
    effectLabel: '영웅 부활시간 ',
    effectVal: (v) => `-${fmtStat(Math.min(STAT_RESPAWN_MAX_REDUCTION, v * STAT_RESPAWN_PCT_PER_POINT) * 100)}%` },
  { id: 'gold',    label: '시장',      icon: '🪙', color: '#FFD54F',
    imgKey: 'ui_icon_bldg_gold', imgScale: 0.9,
    effectLabel: '골드 획득량 ',
    effectVal: (v) => `+${fmtStat(v * STAT_GOLD_PCT_PER_POINT * 100)}%` },
];

function getStatValue(id) {
  if (id === 'atk')     return castleStatAtk;
  if (id === 'def')     return castleStatDef;
  if (id === 'hp')      return castleStatHp;
  if (id === 'heroDef') return castleStatHeroDef;
  if (id === 'respawn') return castleStatRespawn;
  if (id === 'gold')    return castleStatGold;
  return 0;
}

// 도시 인구 총계 = 배치 가능 + 모든 영역에 배치된 인구
function getTotalPopulation() {
  return castleStatPoints + castleStatAtk + castleStatDef + castleStatHp
    + castleStatHeroDef + castleStatRespawn + castleStatGold;
}

function setStatValue(id, v) {
  if (id === 'atk')          castleStatAtk = v;
  else if (id === 'def')     castleStatDef = v;
  else if (id === 'hp')      castleStatHp = v;
  else if (id === 'heroDef') castleStatHeroDef = v;
  else if (id === 'respawn') castleStatRespawn = v;
  else if (id === 'gold')    castleStatGold = v;
}

function openGrowthModal(scene, activeTab) {
  if (scene.growthElements) return;
  const tab = activeTab || scene.growthActiveTab || 'heroes';
  scene.growthActiveTab = tab;
  const panelH = (tab === 'castle') ? CASTLE_PANEL_H : TRAIN_PANEL_H;
  scene.activePanelH = panelH;

  const elements = [];

  const panelTop = GAME_H - TAB_BAR_HEIGHT - panelH;
  const panelCenterY = panelTop + panelH / 2;

  // 게임 영역 dim — 패널 top까지 전부 덮어 슬롯 row + 22px gap 영역도 일관되게 어둡게.
  // ★ click area는 slot row를 피해 위/아래로 split (slot.bg input 가로채기 방지)
  const dimH = panelTop;
  const dim = scene.add.rectangle(CENTER.x, dimH / 2, GAME_W, dimH, 0x000000, 0.30).setDepth(57);
  dim._skipSlide = true;
  if (!scene._skipGrowthAnim) {
    dim.alpha = 0;
    scene.tweens.add({ targets: dim, alpha: 0.30, duration: 220 });
  }
  elements.push(dim);

  const slotBaseCy_g = (scene.heroSlots && scene.heroSlots[0]) ? scene.heroSlots[0].y : 0;
  const slotSlideY_g = -(panelH - 14);
  const slotScreenCy_g = slotBaseCy_g + slotSlideY_g;
  const slotMargin_g = 6;
  const slotRowTop_g = slotScreenCy_g - HUD_CARD_H / 2 - slotMargin_g;
  const slotRowBot_g = slotScreenCy_g + HUD_CARD_H / 2 + slotMargin_g;

  if (slotRowTop_g > 0) {
    const dimTop = scene.add.rectangle(CENTER.x, slotRowTop_g / 2, GAME_W, slotRowTop_g, 0x000000, 0)
      .setDepth(57.5).setInteractive();
    dimTop._skipSlide = true;
    dimTop.on('pointerdown', () => closeGrowthModal(scene));
    elements.push(dimTop);
  }
  if (slotRowBot_g < panelTop) {
    const dimBotH = panelTop - slotRowBot_g;
    const dimBot = scene.add.rectangle(CENTER.x, slotRowBot_g + dimBotH / 2, GAME_W, dimBotH, 0x000000, 0)
      .setDepth(57.5).setInteractive();
    dimBot._skipSlide = true;
    dimBot.on('pointerdown', () => closeGrowthModal(scene));
    elements.push(dimBot);
  }

  // 슬롯 row만 panelH-14만큼 위로 슬라이드 — 슬롯 바닥과 패널 top 사이에 22px gap (디폴트 동일)
  // EXP 바는 씬에 고정되어 움직이지 않음
  const hudSlideY = -(panelH - 14);
  if (scene.heroHudContainer) {
    if (scene._skipGrowthAnim) {
      scene.heroHudContainer.y = hudSlideY;
      refreshHeroSlotInteractivity(scene);
    } else {
      scene.tweens.add({
        targets: scene.heroHudContainer, y: hudSlideY,
        duration: 240, ease: 'Quad.easeOut',
        onComplete: () => refreshHeroSlotInteractivity(scene),
      });
    }
  }

  // 패널 배경 — 딥 네이비 통일 (헤더는 별도 headerBg가 덮음)
  const panelBg = scene.add.rectangle(CENTER.x, panelCenterY, GAME_W, panelH, 0x142B71, 1)
    .setDepth(58).setInteractive();
  elements.push(panelBg);

  // 헤더 BG + outline + highlight/shadow (영웅 인벤 헤더와 동일)
  const headerH = 52;
  const headerBg = scene.add.rectangle(CENTER.x, panelTop + headerH / 2, GAME_W, headerH, 0x353548, 1).setDepth(59);
  const headerHighlight = scene.add.rectangle(CENTER.x, panelTop + 1, GAME_W, 2, 0x5A5C75, 1).setDepth(64);
  const headerShadow = scene.add.rectangle(CENTER.x, panelTop + headerH - 1, GAME_W, 2, 0x15151E, 1).setDepth(64);
  const headerOutlineTop = scene.add.rectangle(CENTER.x, panelTop + 0.75, GAME_W, 1.5, 0x000000, 1).setDepth(65);
  const headerOutlineBot = scene.add.rectangle(CENTER.x, panelTop + headerH - 0.75, GAME_W, 1.5, 0x000000, 1).setDepth(65);
  elements.push(headerBg, headerHighlight, headerShadow, headerOutlineTop, headerOutlineBot);
  // 헤더 아래 짧고 옅은 검정 그림자 (drop shadow, 약하게)
  const dropShadowH = 8;
  const dropShadowG = scene.add.graphics().setDepth(63);
  const dropSteps = 8;
  for (let i = 0; i < dropSteps; i++) {
    const t = i / (dropSteps - 1);
    const a = 0.3 * (1 - t);
    dropShadowG.fillStyle(0x000000, a);
    dropShadowG.fillRect(0, panelTop + headerH + (dropShadowH * i / dropSteps), GAME_W, dropShadowH / dropSteps + 1);
  }
  elements.push(dropShadowG);

  // 타이틀 — 하단 탭바 아이콘과 동일 sprite 사용
  const titleText = (tab === 'castle') ? '내정' : '훈련';
  const titleIconKey = (tab === 'castle') ? 'ui_icon_castle' : 'ui_tab_icon_training';
  const titleY = panelTop + headerH / 2;
  // 아이콘 2배 확대 — 헤더 위로 삐져나가는 영역이 헤더 외곽선(depth 65)에 가려지지 않도록 depth ↑
  const titleIcon = scene.add.image(18, titleY + 14, titleIconKey)
    .setDisplaySize(60, 56).setOrigin(0, 1).setDepth(66);
  const title = scene.add.text(18 + 70, titleY, titleText, {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '19px',
    color: '#FFFFFF', stroke: '#000000', strokeThickness: 4,
    shadow: { offsetX: 0, offsetY: 4, color: '#000000', blur: 5, fill: true },
  }).setOrigin(0, 0.5).setDepth(60);
  elements.push(titleIcon, title);

  // 우측 카운터 chip — castle 탭만 표시 (heroes 탭은 HUD에 골드가 있어 중복 제거)
  if (tab === 'castle') {
    const chipBotW = 110;
    const slope = 22;
    const chipRight = GAME_W;
    const chipBotLeft = chipRight - chipBotW;
    const chipTopLeft = chipBotLeft + slope;
    const chipTop = panelTop;
    const chipBot = panelTop + headerH;

    const counterBg = scene.add.graphics().setDepth(61);
    counterBg.fillStyle(0xDAE8FE, 1);
    counterBg.fillPoints([
      { x: chipTopLeft, y: chipTop },
      { x: chipRight,   y: chipTop },
      { x: chipRight,   y: chipBot },
      { x: chipBotLeft, y: chipBot },
    ], true);
    counterBg.fillStyle(0xB8C5D8, 1);
    counterBg.fillPoints([
      { x: chipTopLeft, y: chipTop },
      { x: chipRight,   y: chipTop },
      { x: chipRight,   y: chipTop + 2 },
      { x: chipTopLeft + 2, y: chipTop + 2 },
    ], true);
    counterBg.fillStyle(0x9DA5BA, 1);
    counterBg.fillPoints([
      { x: chipBotLeft + 2, y: chipBot - 3 },
      { x: chipRight,       y: chipBot - 3 },
      { x: chipRight,       y: chipBot },
      { x: chipBotLeft,     y: chipBot },
    ], true);
    elements.push(counterBg);

    const textCenterX = (chipTopLeft + chipRight) / 2 - slope / 4;
    // 인구 아이콘 — chip 좌측 사선 edge의 중간점
    const leftEdgeMidX = (chipTopLeft + chipBotLeft) / 2;
    const popIcon = scene.add.image(leftEdgeMidX, panelTop + headerH / 2, 'ui_icon_population')
      .setDisplaySize(39, 34).setOrigin(0.5, 0.5).setDepth(63);
    elements.push(popIcon);
    const ptsLabel = scene.add.text(textCenterX, panelTop + headerH / 2 - 10, '도시 인구', {
      fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '11px',
      color: '#4A5468',
    }).setOrigin(0.5).setDepth(62);
    const ptsValue = scene.add.text(textCenterX, panelTop + headerH / 2 + 8, '', {
      fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '18px',
      color: '#2E5CDA',
    }).setOrigin(0.5).setDepth(62);
    elements.push(ptsLabel, ptsValue);
    scene.growthPtsText = ptsValue;
  }

  const contentTop = panelTop + headerH + 8;
  if (tab === 'heroes') {
    buildHeroTrainContent(scene, elements, contentTop);
  } else {
    buildCastleStatContent(scene, elements, contentTop);
  }

  // 슬라이드 업 애니메이션
  if (!scene._skipGrowthAnim) {
    elements.forEach((el) => {
      if (!el || el._skipSlide) return;
      const finalY = el.y;
      el.y = finalY + panelH;
      scene.tweens.add({
        targets: el, y: finalY, duration: 220, ease: 'Quad.easeOut',
      });
    });
  }

  scene.growthElements = elements;
  refreshGrowthModal(scene);
}

// === 성 (Castle) 탭 — 기존 stat point 분배 =================================

function buildCastleStatContent(scene, elements, contentTop) {
  // 서브헤더: "배치 가능 인구" 라벨 + [인구 아이콘 overhang][pill with N명]
  const labelY = contentTop + 14;
  const subLabel = scene.add.text(CENTER.x, labelY, '배치 가능 인구', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '12px',
    color: '#FFE082', stroke: '#000000', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(60);
  elements.push(subLabel);

  // [인구 아이콘] [pill] 그룹 — 아이콘이 pill 좌측을 overhang
  const pillW = 100;
  const pillH = 33;
  const iconW = 36;
  const iconH = 32;
  const overhang = 14;  // 아이콘이 pill 좌측으로 삐져나오는 가로 길이
  const groupW = pillW + overhang;
  const groupLeftX = CENTER.x - groupW / 2;
  const iconCX = groupLeftX + iconW / 2;
  const pillCX = groupLeftX + overhang + pillW / 2;
  const rowY = labelY + 28;

  const pillBg = scene.add.image(pillCX, rowY, 'ui_pill_dark')
    .setDisplaySize(pillW, pillH).setDepth(60);
  const availText = scene.add.text(pillCX + 6, rowY, '', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '16px',
    color: '#FFFFFF', stroke: '#000000', strokeThickness: 2.5,
  }).setOrigin(0.5).setDepth(61);
  const subPopIcon = scene.add.image(iconCX, rowY, 'ui_icon_population')
    .setDisplaySize(iconW, iconH).setDepth(62);
  elements.push(pillBg, availText, subPopIcon);
  scene.growthAvailText = availText;

  // 3×2 카드 그리드 (라벤더 카드 sprite BG) — 6개 영역. sprite 원본 비율(0.683)보다 가로로 넓혀서 길죽함 완화
  const cardW = 154;
  const cardH = 184;
  const colGap = 8;
  const rowGap = 32;  // 리소스(건물 아이콘)가 카드 위로 삐져나오니까 행 간격 확대
  const gridW = 3 * cardW + 2 * colGap;
  const gridStartX = CENTER.x - gridW / 2 + cardW / 2;
  const gridTop = contentTop + 90;  // 라벨 + [icon][pill] 단일행 아래 + 카드 icon overhang 여유

  const rowEls = [];
  STAT_ROWS.forEach((row, i) => {
    const col = i % 3;
    const r   = Math.floor(i / 3);
    const cx  = gridStartX + col * (cardW + colGap);
    const cy  = gridTop + cardH / 2 + r * (cardH + rowGap);

    const cardBg = scene.add.image(cx, cy, 'ui_stat_card_bg')
      .setDisplaySize(cardW, cardH).setDepth(59);

    // 영역별 건물 아이콘 — sprite 원본 aspect 유지, max=153*scale, 하단 정렬
    if (row.imgKey) {
      const tex = scene.textures.get(row.imgKey).getSourceImage();
      const aspect = tex.width / tex.height;
      const MAX_SIZE = 153 * (row.imgScale || 1);
      const dw = aspect >= 1 ? MAX_SIZE : MAX_SIZE * aspect;
      const dh = aspect >= 1 ? MAX_SIZE / aspect : MAX_SIZE;
      const bldgIcon = scene.add.image(cx, cy, row.imgKey)
        .setDisplaySize(dw, dh).setOrigin(0.5, 1).setDepth(60);
      elements.push(bldgIcon);
    }

    // 시설 이름 — 카드 BG 상단에 오버레이 (icon보다 위 layer)
    const labelText = scene.add.text(cx, cy - 78, row.label, {
      fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '15px', color: '#FFFFFF',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(62);

    // 효과 — 라벨(어두운 글씨) + 수치(흰글씨+검정 stroke) 두 텍스트
    // refreshGrowthModal에서 값이 바뀌면 그룹 전체를 cx 가운데 재정렬
    const effectLabelTxt = scene.add.text(cx, cy + 12, row.effectLabel || '', {
      fontFamily: 'BMJUA', fontSize: '11px', color: '#2A3048',
    }).setOrigin(0, 0.5).setDepth(60);
    const valueText = scene.add.text(cx, cy + 12, '', {
      fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '12px',
      color: '#FFFFFF', stroke: '#000000', strokeThickness: 2.5,
    }).setOrigin(0, 0.5).setDepth(60);

    // 인원수 표시 — 어두운 pill (조금 작게)
    const miniPillW = 42;
    const miniPillH = 20;
    const lvlY = cy + 36;
    const lvlPillBg = scene.add.image(cx, lvlY, 'ui_pill_dark')
      .setDisplaySize(miniPillW, miniPillH).setDepth(60);
    const lvlText = scene.add.text(cx, lvlY, '', {
      fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '12px',
      color: '#FFFFFF', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(61);

    // -1 (빨강) / +1 (초록) 두 버튼 — 카드 하단 strip(0.78~1.0 영역)에 fit, 여백 줄여 넓게
    const btnW = 56;
    const btnH = 30;
    const btnGap = 8;
    const btnY = cy + 70;  // 인구칸 바닥(cy+48)과 카드 바닥(cy+92)의 정중앙 → 위/아래 여백 7px 동일
    const minusBg = scene.add.image(cx - (btnW + btnGap) / 2, btnY, 'ui_btn_minus')
      .setDisplaySize(btnW, btnH).setDepth(60).setInteractive({ useHandCursor: true });
    const minusText = scene.add.text(cx - (btnW + btnGap) / 2, btnY - 2, '-1', {
      fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '14px',
      color: '#FFFFFF', stroke: '#7A1322', strokeThickness: 2.5,
    }).setOrigin(0.5).setDepth(61);
    const plusBg = scene.add.image(cx + (btnW + btnGap) / 2, btnY, 'ui_btn_plus')
      .setDisplaySize(btnW, btnH).setDepth(60).setInteractive({ useHandCursor: true });
    const plusText = scene.add.text(cx + (btnW + btnGap) / 2, btnY - 2, '+1', {
      fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '14px',
      color: '#FFFFFF', stroke: '#1F6F28', strokeThickness: 2.5,
    }).setOrigin(0.5).setDepth(61);

    minusBg.on('pointerdown', () => refundStatPoint(scene, row.id));
    plusBg.on('pointerdown', () => spendStatPoint(scene, row.id));

    elements.push(cardBg, labelText, effectLabelTxt, valueText, lvlPillBg, lvlText, minusBg, minusText, plusBg, plusText);
    rowEls.push({ id: row.id, valueText, lvlText, effectLabelTxt, groupCx: cx,
      minusBg, minusText, plusBg, plusText, descFn: row.effectVal });
  });
  scene.growthRowEls = rowEls;
}

// === 영웅 클래스 탭 — 골드 소비 클래스 훈련 =================================

function buildHeroTrainContent(scene, elements, contentTop) {
  // 보유 골드는 헤더 카운터에 표시 (scene.classTrainGoldText는 openGrowthModal에서 세팅)
  const rowEls = [];
  const classIds = Object.keys(CLASSES);
  classIds.forEach((classId, i) => {
    const ry = contentTop + 30 + i * 64;
    const rowBg = scene.add.image(CENTER.x, ry, 'ui_train_row_bg')
      .setDisplaySize(460, 61).setDepth(59);
    const iconTxt = scene.add.image(CENTER.x - 198, ry, CLASS_ICON_SPRITE[classId] || 'ui_class_warrior')
      .setDisplaySize(29.4, 29.4).setDepth(60);
    // 정렬: 레벨 → 직업명 → 능력치 상승 문구
    const initLvl = classTrainLevels[classId] || 0;
    const lvlText = scene.add.text(CENTER.x - 168, ry, `Lv.${initLvl}`, {
      fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '18px',
      color: '#FFFFFF', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0, 0.5).setDepth(60);
    const nameText = scene.add.text(lvlText.x + lvlText.width + 8, ry, CLASSES[classId].name, {
      fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '18px',
      color: '#FFFFFF', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0, 0.5).setDepth(60);
    // 능력치 설명 — 이름 뒤에 작은 글씨, 바닥 정렬 (nameText 바닥선과 일치)
    const bonusTextX = nameText.x + nameText.width + 4;
    const bonusTextY = ry + nameText.displayHeight / 2;
    const bonusText = scene.add.text(bonusTextX, bonusTextY, '', {
      fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '12px',
      color: '#D8C8FF', stroke: '#1A0F38', strokeThickness: 2,
    }).setOrigin(0, 1).setDepth(60);
    // 강화 버튼 — K-229 노란 pill sprite, 안에 [코인][골드 비용] 표기
    const btnBg = scene.add.image(CENTER.x + 170, ry, 'ui_btn_train_upgrade')
      .setDisplaySize(86, 40).setDepth(60).setInteractive({ useHandCursor: true });
    btnBg._baseScaleX = btnBg.scaleX;
    btnBg._baseScaleY = btnBg.scaleY;
    const btnCoin = scene.add.image(CENTER.x + 170 - 22, ry - 1, 'ui_rb_icon_coin')
      .setDisplaySize(18, 18).setDepth(61);
    const btnText = scene.add.text(CENTER.x + 170 + 8, ry - 1, '', {
      fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '14px',
      color: '#FFFFFF', stroke: '#8A5A00', strokeThickness: 2.5,
    }).setOrigin(0.5).setDepth(61);
    // 누르고 있으면 연타 — 첫 클릭 즉시, 200ms 후 70ms 간격으로 반복
    let repeatTimer = null;
    let firstDelay = null;
    const startRepeat = () => {
      spendClassTrain(scene, classId);
      firstDelay = scene.time.delayedCall(200, () => {
        repeatTimer = scene.time.addEvent({
          delay: 70, loop: true,
          callback: () => spendClassTrain(scene, classId),
        });
      });
    };
    const stopRepeat = () => {
      if (firstDelay) { firstDelay.remove(); firstDelay = null; }
      if (repeatTimer) { repeatTimer.remove(); repeatTimer = null; }
    };
    btnBg.on('pointerdown', startRepeat);
    btnBg.on('pointerup', stopRepeat);
    btnBg.on('pointerupoutside', stopRepeat);
    btnBg.on('pointerout', stopRepeat);
    elements.push(rowBg, iconTxt, nameText, bonusText, lvlText, btnBg, btnCoin, btnText);
    rowEls.push({ classId, nameText, bonusText, lvlText, btnBg, btnCoin, btnText });
  });
  scene.classTrainRowEls = rowEls;
}

function refreshGrowthModal(scene) {
  if (!scene.growthElements) return;
  const tab = scene.growthActiveTab;
  if (tab === 'castle') {
    if (scene.growthPtsText) {
      scene.growthPtsText.setText(`${getTotalPopulation()}명`);
      if (scene.growthAvailText) scene.growthAvailText.setText(`${castleStatPoints}`);
    }
    if (scene.growthRowEls) {
      scene.growthRowEls.forEach((r) => {
        const v = getStatValue(r.id);
        r.lvlText.setText(`${v}`);
        r.valueText.setText(r.descFn(v));
        // 효과 라벨 + 수치 그룹을 cx 가운데로 재정렬
        if (r.effectLabelTxt && r.groupCx !== undefined) {
          const totalW = r.effectLabelTxt.width + r.valueText.width;
          r.effectLabelTxt.x = r.groupCx - totalW / 2;
          r.valueText.x = r.effectLabelTxt.x + r.effectLabelTxt.width;
        }
        const canSpend = castleStatPoints > 0 && v < CASTLE_STAT_CAP;
        const canRefund = v > 0;
        if (r.plusBg) {
          r.plusBg.setAlpha(canSpend ? 1 : 0.4);
          r.plusBg.input && (r.plusBg.input.enabled = canSpend);
        }
        if (r.plusText) r.plusText.setAlpha(canSpend ? 1 : 0.4);
        if (r.minusBg) {
          r.minusBg.setAlpha(canRefund ? 1 : 0.4);
          r.minusBg.input && (r.minusBg.input.enabled = canRefund);
        }
        if (r.minusText) r.minusText.setAlpha(canRefund ? 1 : 0.4);
      });
    }
  } else if (tab === 'heroes') {
    if (scene.classTrainGoldText) {
      scene.classTrainGoldText.setText(`${gold}`);
    }
    if (scene.classTrainRowEls) {
      scene.classTrainRowEls.forEach((r) => {
        const lvl = classTrainLevels[r.classId] || 0;
        r.lvlText.setText(`Lv.${lvl}`);
        // 레벨 폭 변하면 직업명/설명도 우측으로 따라 이동
        if (r.nameText && r.bonusText) {
          r.nameText.x = r.lvlText.x + r.lvlText.width + 8;
          r.bonusText.x = r.nameText.x + r.nameText.width + 4;
        }
        // 능력치 설명 — 이름 뒤에 이어붙이기
        const pct = (lvl * CLASS_TRAIN_PER * 100).toFixed(1);
        r.bonusText.setText(`의 능력치가 상승됩니다. ${pct}%`);
        const atCap = lvl >= CLASS_TRAIN_CAP;
        const cost = classTrainCost(lvl);
        const canSpend = !atCap && gold >= cost;
        r.btnBg.setAlpha(canSpend ? 1 : 0.45);
        r.btnCoin.setAlpha(canSpend ? 1 : 0.45).setVisible(!atCap);
        r.btnText.setAlpha(canSpend ? 1 : 0.5);
        if (atCap) {
          r.btnText.setText('MAX');
          r.btnText.x = CENTER.x + 170;
        } else {
          r.btnText.setText(`${cost}`);
          r.btnText.x = CENTER.x + 170 + 8;
        }
      });
    }
  }
}

function animateStatChange(scene, id, delta) {
  if (!scene.growthRowEls) return;
  const row = scene.growthRowEls.find((r) => r.id === id);
  if (!row || !row.lvlText) return;
  // 인구수 칸 자체는 건드리지 않고 — 위/아래로 떠오르는 +1 / -1 텍스트만
  const floatX = row.lvlText.x;
  const floatY = row.lvlText.y - 18;
  const sign = delta > 0 ? '+1' : '-1';
  const color = delta > 0 ? '#4AE08A' : '#FF6868';
  const dirY = delta > 0 ? -22 : 22;
  const floatTxt = scene.add.text(floatX, floatY, sign, {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '11px',
    color: color, stroke: '#000', strokeThickness: 2,
  }).setOrigin(0.5).setDepth(70);
  scene.tweens.add({
    targets: floatTxt, y: floatY + dirY, alpha: 0,
    duration: 600, ease: 'Quad.easeOut',
    onComplete: () => floatTxt.destroy(),
  });
}

function refundStatPoint(scene, id) {
  const cur = getStatValue(id);
  if (cur <= 0) return;
  setStatValue(id, cur - 1);
  castleStatPoints += 1;

  if (id === 'hp') {
    castleMaxHp = computeCastleMaxHp();
    castleHP = Math.min(castleHP, castleMaxHp);
    updateHpBar(scene.castleHpBar, castleHP, castleMaxHp);
  } else if (id === 'atk' || id === 'heroDef') {
    refreshAllHeroStats(scene);
  }
  // def/respawn/gold는 적용 시점에 즉시 반영되므로 추가 작업 X

  refreshGrowthModal(scene);
  refreshTabBar(scene);
  animateStatChange(scene, id, -1);
  saveGame(scene);
}

function spendStatPoint(scene, id) {
  if (castleStatPoints <= 0) return;
  const cur = getStatValue(id);
  if (cur >= CASTLE_STAT_CAP) return;
  setStatValue(id, cur + 1);
  castleStatPoints -= 1;

  if (id === 'hp') {
    const gain = STAT_HP_PER_POINT;
    castleMaxHp = computeCastleMaxHp();
    castleHP = Math.min(castleMaxHp, castleHP + gain);
    updateHpBar(scene.castleHpBar, castleHP, castleMaxHp);
  } else if (id === 'atk' || id === 'heroDef') {
    refreshAllHeroStats(scene);
  }
  // def(성 내구도), respawn(신전), gold(시장)은 매 적용 시점에 즉시 반영되므로 별도 작업 불필요

  refreshGrowthModal(scene);
  refreshTabBar(scene);
  animateStatChange(scene, id, +1);
  saveGame(scene);
}

function spendClassTrain(scene, classId) {
  const lvl = classTrainLevels[classId] || 0;
  if (lvl >= CLASS_TRAIN_CAP) return;
  const cost = classTrainCost(lvl);
  if (gold < cost) { flashInsufficientGold(scene); return; }
  gold -= cost;
  totalGoldSpent += cost;
  classTrainLevels[classId] = lvl + 1;
  updateGoldUI(scene);
  refreshAllHeroStats(scene);
  refreshGrowthModal(scene);
  animateClassTrain(scene, classId);
  saveGame(scene);
}

function animateClassTrain(scene, classId) {
  if (!scene.classTrainRowEls) return;
  const row = scene.classTrainRowEls.find((r) => r.classId === classId);
  if (!row) return;
  // 버튼 펀치 — base 스케일 기준으로 yoyo (setDisplaySize 유지)
  scene.tweens.killTweensOf(row.btnBg);
  const bx = row.btnBg._baseScaleX || row.btnBg.scaleX;
  const by = row.btnBg._baseScaleY || row.btnBg.scaleY;
  row.btnBg.setScale(bx, by);
  scene.tweens.add({
    targets: row.btnBg,
    scaleX: bx * 1.08, scaleY: by * 1.08,
    duration: 90, yoyo: true, ease: 'Quad.easeOut',
  });
  // 레벨 텍스트 펀치 + 금색 flash
  scene.tweens.killTweensOf(row.lvlText);
  row.lvlText.setScale(1);
  row.lvlText.setColor('#FFE082');
  scene.tweens.add({
    targets: row.lvlText, scale: { from: 1.4, to: 1.0 },
    duration: 220, ease: 'Back.easeOut',
    onComplete: () => row.lvlText.active && row.lvlText.setColor('#FFFFFF'),
  });
  // +1 떠오르는 텍스트 (레벨 위로)
  const float = scene.add.text(row.lvlText.x, row.lvlText.y - 12, '+1', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '13px',
    color: '#4AE08A', stroke: '#000', strokeThickness: 2,
  }).setOrigin(0.5).setDepth(70);
  scene.tweens.add({
    targets: float, y: float.y - 22, alpha: 0,
    duration: 520, ease: 'Quad.easeOut',
    onComplete: () => float.destroy(),
  });
}

function flashInsufficientGold(scene) {
  const text = scene.add.text(CENTER.x, CENTER.y, '골드 부족', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '18px',
    color: '#FF6666', backgroundColor: '#1A0F08', padding: { x: 12, y: 6 },
    stroke: '#000', strokeThickness: 2,
  }).setOrigin(0.5).setDepth(130);
  scene.tweens.add({
    targets: text, alpha: 0, y: CENTER.y - 30,
    duration: 800, delay: 300,
    onComplete: () => text.destroy(),
  });
}

function closeGrowthModal(scene) {
  if (!scene.growthElements) return;
  const panelH = scene.activePanelH || TRAIN_PANEL_H;
  const elements = scene.growthElements;
  scene.growthElements = null;
  scene.activePanelH = null;
  scene.growthPtsText = null;
  scene.growthAvailText = null;
  scene.growthRowEls = null;
  scene.classTrainGoldText = null;
  scene.classTrainRowEls = null;
  syncActiveTab(scene);

  elements.forEach((el) => {
    if (!el || !el.scene) return;
    scene.tweens.killTweensOf(el);
    if (el._skipSlide) {
      scene.tweens.add({
        targets: el, alpha: 0, duration: 160, ease: 'Quad.easeIn',
        onComplete: () => { if (el.destroy) el.destroy(); },
      });
    } else {
      scene.tweens.add({
        targets: el, y: el.y + panelH, duration: 180, ease: 'Quad.easeIn',
        onComplete: () => { if (el.destroy) el.destroy(); },
      });
    }
  });

  // HUD 슬롯 원위치 복귀
  if (scene.heroHudContainer) {
    scene.tweens.killTweensOf(scene.heroHudContainer);
    scene.tweens.add({
      targets: scene.heroHudContainer, y: 0,
      duration: 180, ease: 'Quad.easeIn',
      onComplete: () => refreshHeroSlotInteractivity(scene),
    });
  }
}

// === Hero inventory panel (expand from bottom) =============================

const RARITY_ORDER = {
  EXOTIC: 0, MYTHIC: 1, LEGENDARY: 2, EPIC: 3,
  RARE: 4, UNCOMMON: 5, COMMON: 6,
};

// 패널이 차지하는 영역: 화면 절반(480px) 중 HUD/탭바를 제외한 위쪽 362px
// 모달별 패널 높이 — 컨텐츠에 맞춰 다르게. scene.activePanelH로 현재 열린 패널 높이 추적.
const INVENTORY_PANEL_H = 600; // 영웅 인벤토리 (4×5 = 20칸, 안 들어가는 행은 스크롤)
const INVENTORY_CAPACITY = 20; // 인벤 카드 그리드 칸 수 (헤더 counter "보유/용량"용)
const CASTLE_PANEL_H = 600;    // 내정 (3×2 카드 그리드 + 서브헤더와 안 겹치게 grid 아래로)
const TRAIN_PANEL_H = 410;     // 훈련 (클래스 5행 — 한 화면에 모두 노출)

function sortInventoryEntries(entries) {
  return entries.slice().sort((a, b) => {
    if ((a.deployedSlot === null) !== (b.deployedSlot === null)) {
      return a.deployedSlot === null ? 1 : -1;
    }
    const da = HEROES[a.heroId], db = HEROES[b.heroId];
    const ro = RARITY_ORDER[da.rarity] - RARITY_ORDER[db.rarity];
    if (ro !== 0) return ro;
    return clampEnhance(b.enhance) - clampEnhance(a.enhance);
  });
}

function openInventoryPanel(scene) {
  if (scene.inventoryPanelElements) return;

  // 드래그 임계 — 짧은 탭은 드래그 X (디테일 패널 열기와 분리)
  scene.input.dragDistanceThreshold = 5;

  const elements = [];

  const panelH = INVENTORY_PANEL_H;
  scene.activePanelH = panelH;
  const panelTop = GAME_H - TAB_BAR_HEIGHT - panelH;
  const panelCenterY = panelTop + panelH / 2;

  // 게임 영역 dim — 패널 top까지 전부 덮어 슬롯 row + 22px gap 영역도 일관되게 어둡게.
  // ★ click area는 slot row를 피해 위/아래로 split — dim setInteractive가 컨테이너 자식 slot.bg의
  // input을 가로채는 Phaser depth 처리 이슈가 있어 slot row 영역은 input 통과시킴.
  const dimH = panelTop;
  const dim = scene.add.rectangle(CENTER.x, dimH / 2, GAME_W, dimH, 0x000000, 0.30).setDepth(57);
  dim._skipSlide = true;
  if (!scene._skipInventoryAnim) {
    dim.alpha = 0;
    scene.tweens.add({ targets: dim, alpha: 0.30, duration: 220 });
  }
  elements.push(dim);

  // 슬롯 row의 슬라이드 후 화면 y 범위 (slot row click 통과 영역)
  const slotBaseCy = (scene.heroSlots && scene.heroSlots[0]) ? scene.heroSlots[0].y : 0;
  const slotSlideY = -(panelH - 14);
  const slotScreenCy = slotBaseCy + slotSlideY;
  const slotMargin = 6;
  const slotRowTop = slotScreenCy - HUD_CARD_H / 2 - slotMargin;
  const slotRowBot = slotScreenCy + HUD_CARD_H / 2 + slotMargin;

  // click area 1: slot row 위
  if (slotRowTop > 0) {
    const dimTop = scene.add.rectangle(CENTER.x, slotRowTop / 2, GAME_W, slotRowTop, 0x000000, 0)
      .setDepth(57.5).setInteractive();
    dimTop._skipSlide = true;
    dimTop.on('pointerup', () => closeInventoryPanel(scene));
    elements.push(dimTop);
  }
  // click area 2: slot row 아래 ~ panelTop
  if (slotRowBot < panelTop) {
    const dimBotH = panelTop - slotRowBot;
    const dimBot = scene.add.rectangle(CENTER.x, slotRowBot + dimBotH / 2, GAME_W, dimBotH, 0x000000, 0)
      .setDepth(57.5).setInteractive();
    dimBot._skipSlide = true;
    dimBot.on('pointerup', () => closeInventoryPanel(scene));
    elements.push(dimBot);
  }

  // 슬롯 row만 panelH-14만큼 위로 슬라이드 — 슬롯 바닥과 패널 top 사이에 22px gap (디폴트 동일)
  // EXP 바는 씬에 고정되어 움직이지 않음
  const hudSlideY = -(panelH - 14);
  if (scene.heroHudContainer) {
    if (scene._skipInventoryAnim) {
      scene.heroHudContainer.y = hudSlideY;
      refreshHeroSlotInteractivity(scene);
    } else {
      scene.tweens.add({
        targets: scene.heroHudContainer, y: hudSlideY,
        duration: 240, ease: 'Quad.easeOut',
        onComplete: () => refreshHeroSlotInteractivity(scene),
      });
    }
  }

  // 패널 배경 — 딥 네이비 통일
  const panelBg = scene.add.rectangle(CENTER.x, panelCenterY, GAME_W, panelH, 0x142B71, 1)
    .setDepth(58).setInteractive();
  elements.push(panelBg);

  // 헤더 (dark bar)
  const allEntries = Object.values(scene.heroInventory || {});
  const ownedCount = allEntries.length;

  const headerH = 52;
  const headerBg = scene.add.rectangle(CENTER.x, panelTop + headerH / 2, GAME_W, headerH, 0x353548, 1)
    .setDepth(59);
  elements.push(headerBg);
  // 헤더 네모 안쪽 입체감 — 위 2px 밝은 strip + 아래 2px 어두운 strip (chip보다 위 layer)
  const headerHighlight = scene.add.rectangle(CENTER.x, panelTop + 1, GAME_W, 2, 0x5A5C75, 1).setDepth(64);
  const headerShadow = scene.add.rectangle(CENTER.x, panelTop + headerH - 1, GAME_W, 2, 0x15151E, 1).setDepth(64);
  // 헤더 위/아래 검정 outline (1.5px) — highlight/shadow보다 위 layer
  const headerOutlineTop = scene.add.rectangle(CENTER.x, panelTop + 0.75, GAME_W, 1.5, 0x000000, 1).setDepth(65);
  const headerOutlineBot = scene.add.rectangle(CENTER.x, panelTop + headerH - 0.75, GAME_W, 1.5, 0x000000, 1).setDepth(65);
  elements.push(headerHighlight, headerShadow, headerOutlineTop, headerOutlineBot);
  // 헤더 아래 짧고 옅은 검정 그림자 (drop shadow, 약하게)
  const dropShadowH = 8;
  const dropShadowG = scene.add.graphics().setDepth(63);
  const dropSteps = 8;
  for (let i = 0; i < dropSteps; i++) {
    const t = i / (dropSteps - 1);
    const a = 0.3 * (1 - t);
    dropShadowG.fillStyle(0x000000, a);
    dropShadowG.fillRect(0, panelTop + headerH + (dropShadowH * i / dropSteps), GAME_W, dropShadowH / dropSteps + 1);
  }
  elements.push(dropShadowG);
  // 헤더 하단 hairline divider — 패널 영역과 부드럽게 분리
  const headerDivider = scene.add.rectangle(CENTER.x, panelTop + headerH, GAME_W, 1, 0x2A3450, 1)
    .setDepth(60);
  elements.push(headerDivider);

  // 타이틀 — 영웅 탭 아이콘 + 한글 라벨
  const titleIconX = 18;
  const titleY = panelTop + headerH / 2;
  // 아이콘 2배 확대 — 헤더 외곽선 위로 올라가도록 depth ↑
  const titleIcon = scene.add.image(titleIconX, titleY + 14, 'ui_tab_icon_hero')
    .setDisplaySize(60, 56).setOrigin(0, 1).setDepth(66);
  elements.push(titleIcon);
  const title = scene.add.text(titleIconX + 70, titleY, '영웅 인벤토리', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '19px',
    color: '#FFFFFF', stroke: '#000000', strokeThickness: 4,
    shadow: { offsetX: 0, offsetY: 4, color: '#000000', blur: 5, fill: true },
  }).setOrigin(0, 0.5).setDepth(60);
  elements.push(title);

  // 우측 counter chip — 평행사변형, 헤더 전체 높이와 정확히 일치
  const counterStr = `${ownedCount}/${INVENTORY_CAPACITY}`;
  const chipBotW = 110;
  const chipH = headerH;
  const slope = 22;
  const counterCenterY = panelTop + headerH / 2;
  const chipRight = GAME_W;
  const chipBotLeft = chipRight - chipBotW;
  const chipTopLeft = chipBotLeft + slope;
  const chipTop = panelTop;
  const chipBot = panelTop + headerH;

  const counterBg = scene.add.graphics().setDepth(61);
  // 1) 메인 흰색 fill (헤더 영역 안에 정확히 fit)
  counterBg.fillStyle(0xDAE8FE, 1);
  counterBg.fillPoints([
    { x: chipTopLeft, y: chipTop },
    { x: chipRight,   y: chipTop },
    { x: chipRight,   y: chipBot },
    { x: chipBotLeft, y: chipBot },
  ], true);
  // 2) 위쪽 highlight (밝은 회색 1px) — 헤더 위 경계 안쪽
  counterBg.fillStyle(0xB8C5D8, 1);
  counterBg.fillPoints([
    { x: chipTopLeft, y: chipTop },
    { x: chipRight,   y: chipTop },
    { x: chipRight,   y: chipTop + 2 },
    { x: chipTopLeft + 2, y: chipTop + 2 },
  ], true);
  // 3) 아래쪽 음영 (어두운 회보라 strip — 볼록 효과)
  counterBg.fillStyle(0x9DA5BA, 1);
  counterBg.fillPoints([
    { x: chipBotLeft + 2, y: chipBot - 3 },
    { x: chipRight,       y: chipBot - 3 },
    { x: chipRight,       y: chipBot },
    { x: chipBotLeft,     y: chipBot },
  ], true);

  // 텍스트 — chip 가로 가운데
  const textCenterX = (chipTopLeft + chipRight) / 2 - slope / 4;
  const counterText = scene.add.text(textCenterX, counterCenterY, counterStr, {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '20px',
    color: '#FFFFFF', stroke: '#000000', strokeThickness: 3,
    shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 3, fill: true },
  }).setOrigin(0.5).setDepth(62);
  elements.push(counterBg, counterText);

  // 그리드 — 4×5 (20칸). panel 영역 안 들어가는 행은 세로 드래그 스크롤
  const sorted = sortInventoryEntries(allEntries);
  const ownedIds = new Set(sorted.map((e) => e.heroId));
  const unownedDefs = Object.values(HEROES).filter((d) => !ownedIds.has(d.id));
  const totalSlots = INVENTORY_CAPACITY;
  const cols = 4;
  const cardW = 122, cardH = 148, gap = 8;
  const gridW = cols * cardW + (cols - 1) * gap;
  const gridStartX = CENTER.x - gridW / 2 + cardW / 2;
  const gridStartY = panelTop + headerH + 22 + cardH / 2;
  const rows = Math.ceil(totalSlots / cols);
  const totalGridH = rows * cardH + (rows - 1) * gap;

  // 스크롤 그룹 — 카드들을 묶어서 한꺼번에 y 이동
  const scrollGroup = scene.add.container(0, 0).setDepth(60);
  elements.push(scrollGroup);

  for (let i = 0; i < totalSlots; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = gridStartX + col * (cardW + gap);
    const cy = gridStartY + row * (cardH + gap);
    let card;
    if (i < sorted.length) {
      card = makeInventoryCardContainer(scene, sorted[i], cx, cy, cardW, cardH);
    } else {
      const placeholderDef = unownedDefs[i - sorted.length] || null;
      card = makeInventoryPlaceholderCard(scene, placeholderDef, cx, cy, cardW, cardH);
    }
    scrollGroup.add(card);
  }

  // 그리드 영역 mask — panel 안에서 헤더 아래 ~ panel 하단까지만 카드 보이게
  const gridAreaTop = panelTop + headerH + 6;
  const gridAreaH = panelH - headerH - 12;
  const scrollMaskGfx = scene.make.graphics({ x: 0, y: 0, add: false });
  scrollMaskGfx.fillStyle(0xffffff, 1);
  scrollMaskGfx.fillRect(0, gridAreaTop, GAME_W, gridAreaH);
  scrollGroup.setMask(scrollMaskGfx.createGeometryMask());

  // 스크롤 한계 — 그리드 총 높이가 panel 가용 영역보다 크면 그 차이만큼 스크롤 가능
  const visibleH = gridAreaH - 22; // 헤더 아래 22 gap
  const maxScroll = Math.max(0, totalGridH - visibleH);
  scrollGroup._maxScroll = maxScroll;
  scrollGroup._scrollY = 0;

  // 마우스 휠 스크롤만 — drag/스크롤바 X
  const wheelHandler = (pointer, gameObjects, dx, dy) => {
    if (!scene.inventoryPanelElements) return;
    const newScroll = Math.max(0, Math.min(maxScroll, scrollGroup._scrollY + dy * 0.5));
    scrollGroup._scrollY = newScroll;
    scrollGroup.y = -newScroll;
  };
  scene.input.on('wheel', wheelHandler);
  scrollGroup._wheelHandler = wheelHandler;

  // 슬라이드 업 애니메이션 (refresh 시엔 skip)
  // 슬라이드 도중 카드 위로 pointerup이 떨어지면 detail 팝업이 의도치 않게 열리는 문제 방지.
  // _inventorySliding 플래그를 220ms 동안 켜고, 카드 pointerup 핸들러에서 체크.
  if (!scene._skipInventoryAnim) {
    scene._inventorySliding = true;
    elements.forEach((el) => {
      if (!el || el._skipSlide) return;
      const finalY = el.y;
      el.y = finalY + panelH;
      scene.tweens.add({
        targets: el, y: finalY, duration: 220, ease: 'Quad.easeOut',
      });
    });
    scene.time.delayedCall(240, () => { scene._inventorySliding = false; });
  }

  scene.inventoryPanelElements = elements;
}

// 카드 백판 팔레트 — 첨부 백판 스크린샷 픽셀 샘플링값.
// base: 카드 전체 베이스 단색, glow: 중앙 radial glow 색, strip: 하단 진한 띠.
const INV_CARD_PALETTE = {
  COMMON:    { base: 0x657D89, glow: 0xA6C0CC, strip: 0x4A6272 },
  UNCOMMON:  { base: 0x63D620, glow: 0xC8FF7F, strip: 0x35B659 },
  RARE:      { base: 0x47BEFD, glow: 0xA8E8FF, strip: 0x3F9CF6 },
  EPIC:      { base: 0xC55BFD, glow: 0xF0B8FF, strip: 0x9F3DF7 },
  LEGENDARY: { base: 0xFAD95A, glow: 0xFFF4A0, strip: 0xF8BE51 },
  MYTHIC:    { base: 0xF54752, glow: 0xFF9CA0, strip: 0xD63A44 },
  EXOTIC:    { base: 0xD9C5FE, glow: 0xFFFFFF, strip: 0xFCCBFD },
};
const RARITY_STARS = {
  COMMON: 1, UNCOMMON: 2, RARE: 3, EPIC: 4,
  LEGENDARY: 5, MYTHIC: 6, EXOTIC: 7,
};
// 등급별 HUD 슬롯 BG sprite key (Layer Lab ItemFrame01_Single)
const RARITY_SLOT_SPRITE = {
  COMMON:    'ui_slot_common',
  UNCOMMON:  'ui_slot_uncommon',
  RARE:      'ui_slot_rare',
  EPIC:      'ui_slot_epic',
  LEGENDARY: 'ui_slot_legendary',
  MYTHIC:    'ui_slot_mythic',
  EXOTIC:    'ui_slot_exotic',
};
// 등급별 HUD 배치 슬롯 BG sprite key (Layer Lab K-276)
const RARITY_HUD_SLOT_BG = {
  COMMON:    'ui_hud_slot_bg_common',
  UNCOMMON:  'ui_hud_slot_bg_uncommon',
  RARE:      'ui_hud_slot_bg_rare',
  EPIC:      'ui_hud_slot_bg_epic',
  LEGENDARY: 'ui_hud_slot_bg_legendary',
  MYTHIC:    'ui_hud_slot_bg_mythic',
  EXOTIC:    'ui_hud_slot_bg_exotic',
};
// 등급별 인벤토리 카드 BG sprite key (절차적 그라데이션 대신 단일 이미지)
const RARITY_INV_CARD_BG = {
  COMMON:    'ui_inv_card_bg_common',
  UNCOMMON:  'ui_inv_card_bg_uncommon',
  RARE:      'ui_inv_card_bg_rare',
  EPIC:      'ui_inv_card_bg_epic',
  LEGENDARY: 'ui_inv_card_bg_legendary',
  MYTHIC:    'ui_inv_card_bg_mythic',
  EXOTIC:    'ui_inv_card_bg_exotic',
};
// 등급별 영웅 상세창 portrait 슬롯 BG (K-276 시리즈) — openHeroDetailPanel mainChipBg에 사용
const RARITY_HERO_SLOT_MAIN = {
  COMMON:    'ui_hero_slot_main_common',
  UNCOMMON:  'ui_hero_slot_main_uncommon',
  RARE:      'ui_hero_slot_main_rare',
  EPIC:      'ui_hero_slot_main_epic',
  LEGENDARY: 'ui_hero_slot_main_legendary',
  MYTHIC:    'ui_hero_slot_main_mythic',
  EXOTIC:    'ui_hero_slot_main_exotic',
};
// 등급별 영웅 디테일 모달 백판 sprite key (Layer Lab UI 리소스/우선 사용 K-326~332)
const RARITY_MODAL_BG_SPRITE = {
  COMMON:    'ui_hero_modal_bg_common',
  UNCOMMON:  'ui_hero_modal_bg_uncommon',
  RARE:      'ui_hero_modal_bg_rare',
  EPIC:      'ui_hero_modal_bg_epic',
  LEGENDARY: 'ui_hero_modal_bg_legendary',
  MYTHIC:    'ui_hero_modal_bg_mythic',
  EXOTIC:    'ui_hero_modal_bg_exotic',
};
// 등급별 라벨 chip sprite key (영웅 디테일 모달 타이틀 아래 등급 표시)
const RARITY_LABEL_SPRITE = {
  COMMON:    'ui_rarity_common',
  UNCOMMON:  'ui_rarity_uncommon',
  RARE:      'ui_rarity_rare',
  EPIC:      'ui_rarity_epic',
  LEGENDARY: 'ui_rarity_legendary',
  MYTHIC:    'ui_rarity_mythic',
  EXOTIC:    'ui_rarity_exotic',
};

// 색상을 일정 비율 어둡게
function darkenHex(c, factor) {
  const r = ((c >> 16) & 0xff) * factor;
  const g = ((c >> 8) & 0xff) * factor;
  const b = (c & 0xff) * factor;
  return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
}

// 두 0xRRGGBB 색을 t∈[0,1]로 선형 보간 (스트라이프 그라데이션용)
function lerpRgb(c1, c2, t) {
  const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff;
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return (r << 16) | (g << 8) | b;
}

// Heraldic 방패 — 위 둥근 사각형(top corners = halfW로 반원 효과) + 아래 V자 삼각형
// stroke 없이 fill만 (작은 크기에서 stroke가 모양 망침), 상단 하이라이트로 입체감
function drawHeraldicShield(g, cx, cy, w, h) {
  const halfW = w / 2;
  const top = cy - h / 2;
  const left = cx - halfW;
  const right = cx + halfW;
  const shoulderBot = top + h * 0.58;

  // 본체 회색 — 위 반원 + 아래 V
  g.fillStyle(0xB5C0CC, 1);
  g.fillRoundedRect(left, top, w, shoulderBot - top,
    { tl: halfW, tr: halfW, bl: 0, br: 0 });
  g.fillTriangle(left, shoulderBot, right, shoulderBot, cx, cy + h / 2);

  // 상단 하이라이트 (좌상단 1/3 영역에 밝은 띠)
  g.fillStyle(0xE6ECF3, 0.65);
  g.fillRoundedRect(left + 3, top + 2, w * 0.35, (shoulderBot - top) * 0.5,
    { tl: halfW, tr: halfW * 0.5, bl: halfW * 0.3, br: 0 });
}

// 카드 영역(둥근 사각형) BitmapMask 용 흰색 texture — 캐릭터를 카드 안에 가두기
function ensureCardMaskTexture(scene, w, h, radius) {
  const key = `inv_card_mask_${w}x${h}_${radius}`;
  if (scene.textures.exists(key)) return key;
  const gfx = scene.make.graphics({ x: 0, y: 0, add: false });
  gfx.fillStyle(0xffffff, 1);
  gfx.fillRoundedRect(0, 0, w, h, radius);
  gfx.generateTexture(key, w, h);
  gfx.destroy();
  return key;
}

// 흰색 radial gradient texture — graphics fillCircle 누적은 동심원 band가 보임.
// canvas createRadialGradient으로 그려서 sprite에 tint 적용하면 부드럽게 빛남.
function ensureRadialGlowTexture(scene) {
  if (scene.textures.exists('inv_card_glow')) return;
  const W = 256;
  const tex = scene.textures.createCanvas('inv_card_glow', W, W);
  const ctx = tex.getContext();
  const grad = ctx.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2);
  grad.addColorStop(0, 'rgba(255,255,255,0.55)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.25)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, W);
  tex.refresh();
}

// 5각 별 fill — center cx/cy, outer/inner radius
// strokeColor/strokeWidth 주면 검은 외곽선 같이 그림 (카드 배경과 대비)
function drawStarShape(g, cx, cy, outerR, innerR, color, points = 5,
                       strokeColor = null, strokeWidth = 0) {
  const step = Math.PI / points;
  g.fillStyle(color, 1);
  if (strokeColor != null) g.lineStyle(strokeWidth, strokeColor, 1);
  g.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = (i % 2 === 0) ? outerR : innerR;
    const a = i * step - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.fillPath();
  if (strokeColor != null) g.strokePath();
}

function makeInventoryCardContainer(scene, entry, cx, cy, w, h, opts) {
  const def = HEROES[entry.heroId];
  opts = opts || {};

  const container = scene.add.container(cx, cy).setDepth(60);
  const isDeployed = !opts.hideDeployed && entry.deployedSlot !== null;

  ensureRadialGlowTexture(scene);

  // 카드 아래 검정 그림자 (위로 떠있는 느낌)
  const cardShadow = scene.add.graphics();
  cardShadow.fillStyle(0x000000, 0.85);
  cardShadow.fillRoundedRect(-w / 2, -h / 2 + 2.5, w, h, 10);
  const pal = INV_CARD_PALETTE[def.rarity] || INV_CARD_PALETTE.COMMON;
  const outerColor = 0x181728;
  const R_OUTER = 10;
  const R_INNER = 8;
  const STRIP_H = Math.round(h * 0.17);
  const innerLeft = -w / 2 + 2, innerTop = -h / 2 + 2;
  const innerW = w - 4, innerH = h - 4;

  // 외곽 어두운 BG (border)
  const outerBg = scene.add.graphics();
  outerBg.fillStyle(outerColor, 1);
  outerBg.fillRoundedRect(-w / 2, -h / 2, w, h, R_OUTER);

  // 내부 컬러 영역 — 등급별 sprite. 라운드 상단 코너는 sprite PNG에 미리 베이크됨
  // (GeometryMask는 컨테이너 slide transform을 안 따라가서 슬라이드 도중 sprite가 사라지는 버그 있었음 → 마스크 제거)
  const _STRIP_TOP = h / 2 - 2 - STRIP_H;
  const _SPRITE_BOT = _STRIP_TOP + STRIP_H * 0.28;   // stripTopL과 동일
  const cardBgKey = RARITY_INV_CARD_BG[def.rarity] || RARITY_INV_CARD_BG.COMMON;
  const innerBgImg = scene.add.image(0, (innerTop + _SPRITE_BOT) / 2, cardBgKey)
    .setDisplaySize(innerW, _SPRITE_BOT - innerTop);

  // 중앙 radial glow — 닉네임+chip 2라인 헤더 아래부터 strip 위까지
  const mainTop = -h / 2 + 50;
  const mainBot = h / 2 - 2 - STRIP_H;
  const glowCy = (mainTop + mainBot) / 2;
  const glowSize = Math.min(w * 0.95, (mainBot - mainTop) * 1.4);
  const glow = scene.add.image(0, glowCy, 'inv_card_glow')
    .setDisplaySize(glowSize, glowSize)
    .setTint(pal.glow);

  // 하단 strip — 두 layer 분리:
  // (A) stripBaseG: 사선 위 base 색 (portrait 아래) — 캐릭터가 그 영역에 있어도 안 덮음
  // (B) stripG: 검정 사선 polygon + 둥근 하단 모서리 (portrait 위) — 캐릭터 발만 가림
  const stripTopR = h / 2 - 2 - STRIP_H + 4;
  const stripTopL = h / 2 - 2 - STRIP_H + STRIP_H * 0.28;
  const stripTop = h / 2 - 2 - STRIP_H;
  const stripBot = h / 2 - 2;
  // stripBaseG 삼각형 patch 제거됨 — sprite가 stripTopL까지 늘어나 있음
  const stripG = scene.add.graphics();
  stripG.fillStyle(0x1A1F2E, 1);
  stripG.fillPoints([
    { x: innerLeft, y: stripTopL },
    { x: innerLeft + innerW, y: stripTopR },
    { x: innerLeft + innerW, y: stripBot - R_INNER },
    { x: innerLeft, y: stripBot - R_INNER },
  ], true);
  stripG.fillRoundedRect(innerLeft, stripBot - R_INNER - 1, innerW, R_INNER + 1,
    { tl: 0, tr: 0, bl: R_INNER, br: R_INNER });

  // 상단 라인: 영웅 이름(좌측 정렬 큰 글씨) — 카드 위로 떠 있는 느낌의 drop shadow
  const nameY = -h / 2 + 14;
  const nameText = scene.add.text(-w / 2 + 10, nameY, def.name, {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '16px',
    color: '#FFFFFF', stroke: '#000000', strokeThickness: 3,
    shadow: { offsetX: 0, offsetY: 3, color: '#000000', blur: 4, fill: true },
  }).setOrigin(0, 0.5);

  const chipR = 9;
  // 직업 chip은 닉네임 아래, 닉네임과 같은 좌측 정렬 (x = 닉네임 시작 + chipR)
  const chipX = -w / 2 + 10 + chipR;
  const chipY = nameY + chipR + 12;
  const classChipBg = scene.add.graphics();
  classChipBg.fillStyle(outerColor, 0.9);
  classChipBg.fillCircle(chipX, chipY, chipR);
  classChipBg.lineStyle(1.2, 0x6E7383, 1);
  classChipBg.strokeCircle(chipX, chipY, chipR);
  const classKey = CLASS_ICON_SPRITE[def.class] || 'ui_class_warrior';
  const classIcon = scene.add.image(chipX, chipY, classKey)
    .setDisplaySize(chipR * 1.4, chipR * 1.4);

  // 포트레이트 — 큰 사이즈 유지. 카드 영역 밖은 GeometryMask로 자름
  // 인벤토리 큰 영웅 카드 → lobby_xxx PNG (portraitBig) 사용
  const portraitY = glowCy + 4;
  const portraitScale = def.drawBody ? 2.8 : 1.6; // portraitBig 사용 시 자체 베이스 96이라 scale 줄임
  const portrait = scene.add.container(0, portraitY).setScale(portraitScale);
  drawHeroPortraitStatic(scene, def, portrait, { useBig: true });
  const portraitMaskGfx = scene.make.graphics({ x: 0, y: 0, add: false });
  portraitMaskGfx.fillStyle(0xffffff, 1);
  portraitMaskGfx.fillRoundedRect(cx + innerLeft, cy + innerTop, innerW, innerH, R_INNER);
  portrait.setMask(portraitMaskGfx.createGeometryMask());

  // 좌하단: 영웅 레벨 chip — Layer Lab Slider_Level02_Icon_Badge_Blue sprite
  // (hideLevel 옵션이 켜져있으면 생략 — 주점 영입 카드처럼 레벨 의미없는 경우)
  const lvShieldW = 32;
  const lvShieldH = 32;
  const lvX = -w / 2 + 4 + lvShieldW / 2;
  const lvY = mainBot + 4 + lvShieldH / 2;
  let lvChipBg = null, lvText = null;
  if (!opts.hideLevel) {
    lvChipBg = scene.add.image(lvX, lvY, 'ui_level_badge')
      .setDisplaySize(lvShieldW, lvShieldH);
    lvText = scene.add.text(lvX, lvY - 1, `${clampEnhance(entry.enhance)}`, {
      fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '13px',
      color: '#FFFFFF', stroke: '#000000', strokeThickness: 2.5,
    }).setOrigin(0.5);
  }

  // 우하단: 별 sprite — 옆 별을 살짝 가리게 겹쳐 배치 + strip 사선 기울기에 맞춰 정렬
  const starCount = RARITY_STARS[def.rarity] || 1;
  const starKey = def.rarity === 'EXOTIC' ? 'ui_star_premium' : 'ui_star_yellow';
  const starSize = 16;
  const starOverlap = 5;
  const starUnit = starSize - starOverlap;
  const starsW = starCount * starUnit + starOverlap;
  const starsRightX = w / 2 - 8;
  const starsBaseY = stripTopR + 11;
  const stripSlopeY = (stripTopR - stripTopL) * (starsW / innerW);
  const starsSprites = [];
  for (let i = 0; i < starCount; i++) {
    const sx = starsRightX - starsW + starSize / 2 + i * starUnit;
    const t = starCount > 1 ? i / (starCount - 1) : 0.5;
    const sy = starsBaseY + stripSlopeY * (t - 0.5);
    const star = scene.add.image(sx, sy, starKey).setDisplaySize(starSize, starSize);
    starsSprites.push(star);
  }

  // 배치 표시 — 동그란 시안 체크 chip (볼록 입체감 + 하단 음영, 30% 줄어든 크기)
  // 배치 표시 — 동그란 시안 체크 chip (볼록 입체감 + 하단 음영, 30% 줄어든 크기)
  const deployedParts = [];
  if (isDeployed) {
    const cR = 10;
    const checkX = w / 2 - 6 - cR;
    const checkY = nameY + 2;
    const checkBg = scene.add.graphics();
    // 1) 검정 외곽선 ring (얇게)
    checkBg.fillStyle(0x0A2128, 1);
    checkBg.fillCircle(checkX, checkY, cR);
    // 2) 시안 메인 fill
    checkBg.fillStyle(0x1FE0CC, 1);
    checkBg.fillCircle(checkX, checkY, cR - 1.2);
    // 3) 하단 음영 — 어두운 시안 ellipse (chip 하단 1/3 영역)
    checkBg.fillStyle(0x0F8E85, 0.55);
    checkBg.fillEllipse(checkX, checkY + cR * 0.4, cR * 1.5, cR * 0.85);
    // 4) 상단 highlight — 밝은 시안 ellipse (chip 상단 1/3 영역)
    checkBg.fillStyle(0x9DFCF1, 0.65);
    checkBg.fillEllipse(checkX, checkY - cR * 0.45, cR * 1.3, cR * 0.65);
    // 5) 흰 체크 + 검정 stroke 내장 sprite
    const checkIcon = scene.add.image(checkX, checkY, 'ui_icon_check')
      .setDisplaySize(cR * 1.5, cR * 1.5);
    deployedParts.push(checkBg, checkIcon);
  }

  // 그리기 순서: 그림자 → 외곽 BG → 내부 BG sprite → glow → 캐릭터 → strip → UI
  const lvParts = (lvChipBg && lvText) ? [lvChipBg, lvText] : [];
  const parts = [cardShadow, outerBg, innerBgImg, glow, portrait, stripG,
    classChipBg, classIcon, nameText, ...lvParts, ...starsSprites,
    ...deployedParts];
  container.add(parts);
  container.setSize(w, h);

  // 메타데이터
  container._homeX = cx;
  container._homeY = cy;
  container._heroId = entry.heroId;
  container._dragging = false;

  // Hit detection은 Zone child로 처리 — Phaser Container.setInteractive(hitArea)가
  // 일부 환경에서 origin/transform과 어긋나는 사례가 있어 Zone이 가장 신뢰성 있음.
  const hitZone = scene.add.zone(0, 0, w, h).setOrigin(0.5, 0.5);
  container.add(hitZone);
  container._hitZone = hitZone;

  if (isDeployed) {
    // 배치된 영웅 — 탭만 (해제는 디테일 패널에서)
    hitZone.setInteractive({ useHandCursor: true });
    hitZone.on('pointerup', (pointer) => {
      if (scene._inventorySliding) return;  // 슬라이드 중에는 detail 팝업 차단
      if (pointer.getDistance() > 8) return;
      openHeroDetailPanel(scene, entry.heroId);
    });
  } else {
    // 미배치 영웅 — 드래그(고스트 + 자석 snap) + 탭(디테일 팝업).
    // 카드 자체는 그리드에 고정. 드래그하면 반투명 영웅 스프라이트만 포인터 따라오고,
    // 빈 슬롯 근접 시 자석처럼 snap + 슬롯 하이라이트. snap 상태에서 떼면 deploy.
    hitZone.setInteractive({ useHandCursor: true, draggable: true });

    hitZone.on('dragstart', (pointer) => {
      container._dragging = true;
      container._snapSlot = null;
      container.setAlpha(0.5);
      // Ghost: 영웅 body만 반투명하게 포인터 따라옴 (world coord 사용)
      // 슬롯(50px)과 시각적으로 어울리도록 슬롯 크기에 근접한 스케일
      const ghost = scene.add.container(pointer.worldX, pointer.worldY).setDepth(200).setAlpha(0.85);
      const ghostScale = def.drawBody ? 0.55 : 1.7;
      ghost.setScale(ghostScale);
      drawHeroPortraitStatic(scene, def, ghost);
      container._ghost = ghost;
    });

    hitZone.on('drag', (pointer) => {
      const ghost = container._ghost;
      if (!ghost) return;
      // 자석 snap — 가장 가까운 unlocked + unoccupied 슬롯 (슬롯 경계 + 약간 마진)
      const SNAP_DIST = 30;
      let snap = null;
      let minD = Infinity;
      if (scene.heroSlots && scene.heroHudContainer) {
        const cx0 = scene.heroHudContainer.x;
        const cy0 = scene.heroHudContainer.y;
        scene.heroSlots.forEach((slot) => {
          if (!slot.bg || !slot.bg.input || !slot.bg.input.enabled) return;
          if (slot.isLocked) return;
          const sx = cx0 + slot.x;
          const sy = cy0 + slot.y;
          const dx = pointer.worldX - sx;
          const dy = pointer.worldY - sy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d <= SNAP_DIST && d < minD) { minD = d; snap = slot; }
        });
      }
      if (snap) {
        ghost.x = scene.heroHudContainer.x + snap.x;
        ghost.y = scene.heroHudContainer.y + snap.y;
      } else {
        ghost.x = pointer.worldX;
        ghost.y = pointer.worldY;
      }
      // 슬롯 하이라이트 갱신
      if (container._snapSlot !== snap) {
        if (container._snapSlot) clearSlotSnapHighlight(scene, container._snapSlot);
        if (snap) drawSlotSnapHighlight(scene, snap);
        container._snapSlot = snap;
      }
    });

    hitZone.on('dragend', () => {
      const snap = container._snapSlot;
      if (snap) clearSlotSnapHighlight(scene, snap);
      if (container._ghost) { container._ghost.destroy(); container._ghost = null; }
      container.setAlpha(1);
      container._snapSlot = null;
      // _dragging은 pointerup 다음에 풀어야 탭/디테일 오인 안 됨
      scene.time.delayedCall(50, () => { container._dragging = false; });
      if (snap) {
        deployHeroFromInventory(scene, container._heroId, snap.index);
        saveGame(scene);
        refreshInventoryPanel(scene);
      }
      // snap 아니면 그냥 취소 — 카드는 원래부터 안 움직였으니 원위치 애니메이션 불필요
    });

    hitZone.on('pointerup', (pointer) => {
      if (scene._inventorySliding) return;  // 슬라이드 중에는 detail 팝업 차단
      if (container._dragging) return;
      if (pointer.getDistance() > 8) return;
      openHeroDetailPanel(scene, entry.heroId);
    });
  }

  return container;
}

// 미보유/빈 슬롯 카드 — 다크 그레이 BG + 중앙 "?" 실루엣
function makeInventoryPlaceholderCard(scene, def, cx, cy, w, h) {
  const container = scene.add.container(cx, cy).setDepth(60);
  const outerColor = 0x0F1320;
  const baseColor = 0x2E2F41;
  const altColor  = 0x313145;
  const R_OUTER = 10;
  const R_INNER = 8;

  // 카드 아래 검정 그림자 (떠있는 느낌)
  const cardShadow = scene.add.graphics();
  cardShadow.fillStyle(0x000000, 0.85);
  cardShadow.fillRoundedRect(-w / 2, -h / 2 + 2.5, w, h, R_OUTER);

  // 외곽 어두운 border
  const outerBg = scene.add.graphics();
  outerBg.fillStyle(outerColor, 1);
  outerBg.fillRoundedRect(-w / 2, -h / 2, w, h, R_OUTER);

  // 메인 base fill
  const innerBg = scene.add.graphics();
  innerBg.fillStyle(baseColor, 1);
  innerBg.fillRoundedRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4, R_INNER);

  // 다이아 체크 패턴 (8x8 cell 교차) — 둥근 모서리 침범 안 하게 corner-clip
  const cellSize = 8;
  const patternG = scene.add.graphics();
  patternG.fillStyle(altColor, 1);
  const innerLeft = -w / 2 + 2;
  const innerTop = -h / 2 + 2;
  const innerW = w - 4;
  const innerH = h - 4;
  const cornerR = R_INNER;
  for (let py = 0; py < innerH; py += cellSize) {
    for (let px = 0; px < innerW; px += cellSize) {
      if ((Math.floor(px / cellSize) + Math.floor(py / cellSize)) % 2 !== 0) continue;
      const cellW = Math.min(cellSize, innerW - px);
      const cellH = Math.min(cellSize, innerH - py);
      // 모서리 영역 (corner R 안쪽)이면 셀을 더 잘게 픽셀 단위 그려서 둥근 모양 안에만 fill
      const corners = [
        [px, py, 0, 0],                              // 좌상
        [px + cellW - cornerR, py, cornerR, 0],      // 우상
        [px + cellW - cornerR, py + cellH - cornerR, cornerR, cornerR],   // 우하
        [px, py + cellH - cornerR, 0, cornerR],      // 좌하
      ];
      // 셀이 코너 영역에 들어가는지 체크
      const inCornerTL = (px < cornerR) && (py < cornerR);
      const inCornerTR = (px + cellW > innerW - cornerR) && (py < cornerR);
      const inCornerBR = (px + cellW > innerW - cornerR) && (py + cellH > innerH - cornerR);
      const inCornerBL = (px < cornerR) && (py + cellH > innerH - cornerR);
      if (!inCornerTL && !inCornerTR && !inCornerBR && !inCornerBL) {
        patternG.fillRect(innerLeft + px, innerTop + py, cellW, cellH);
        continue;
      }
      // 코너 영역 — 픽셀 단위로 검사해서 둥근 모서리 안만 fill
      for (let dy = 0; dy < cellH; dy++) {
        for (let dx = 0; dx < cellW; dx++) {
          const ax = px + dx;
          const ay = py + dy;
          // 4개 코너 중 어느 곳에 속하는지 + 그 코너 중심에서의 거리
          let cxx = -1, cyy = -1;
          if (ax < cornerR && ay < cornerR)                                   { cxx = cornerR; cyy = cornerR; }
          else if (ax >= innerW - cornerR && ay < cornerR)                    { cxx = innerW - cornerR; cyy = cornerR; }
          else if (ax >= innerW - cornerR && ay >= innerH - cornerR)          { cxx = innerW - cornerR; cyy = innerH - cornerR; }
          else if (ax < cornerR && ay >= innerH - cornerR)                    { cxx = cornerR; cyy = innerH - cornerR; }
          if (cxx >= 0) {
            const dist = Math.hypot(ax - cxx, ay - cyy);
            if (dist > cornerR) continue;
          }
          patternG.fillRect(innerLeft + ax, innerTop + ay, 1, 1);
        }
      }
    }
  }

  // 가운데 스마일 chip — 어두운 동그라미 + graphics 정면 미소 (1.3배 크게)
  const chipR = 18;
  const chipX = 0;
  const chipY = 0;
  const chipBg = scene.add.graphics();
  chipBg.fillStyle(0x1F2030, 1);
  chipBg.fillCircle(chipX, chipY, chipR);
  // graphics 미소
  const smile = scene.add.graphics();
  const faceColor = 0x141420;
  smile.fillStyle(faceColor, 1);
  smile.fillCircle(chipX - 5, chipY - 3, 2.1);     // 좌측 눈
  smile.fillCircle(chipX + 5, chipY - 3, 2.1);     // 우측 눈
  // 입 (호)
  smile.lineStyle(2, faceColor, 1);
  smile.beginPath();
  smile.arc(chipX, chipY + 2, 6.5, 0.15 * Math.PI, 0.85 * Math.PI);
  smile.strokePath();

  container.add([cardShadow, outerBg, innerBg, patternG, chipBg, smile]);
  container.setSize(w, h);
  container._isPlaceholder = true;
  container._homeX = cx;
  container._homeY = cy;
  return container;
}

// 슬롯 자석 snap 시각 하이라이트 — 슬롯 위에 녹색 외곽선 graphics 추가.
// heroHudContainer 자식이므로 슬라이드 시 함께 이동.
function drawSlotSnapHighlight(scene, slot) {
  if (slot._snapHighlight) return;
  const hl = scene.add.graphics();
  hl.lineStyle(3, 0x4ADE80, 1);
  const W = HUD_CARD_W + 4, H = HUD_CARD_H + 4;
  hl.strokeRoundedRect(-W / 2, -H / 2, W, H, 7);
  hl.x = slot.x;
  hl.y = slot.y;
  hl.setDepth(62);
  if (scene.heroHudContainer) scene.heroHudContainer.add(hl);
  slot._snapHighlight = hl;
}

function clearSlotSnapHighlight(scene, slot) {
  if (slot._snapHighlight) {
    slot._snapHighlight.destroy();
    slot._snapHighlight = null;
  }
}

function closeInventoryPanel(scene) {
  closeHeroDetailPanel(scene);
  if (!scene.inventoryPanelElements) return;
  const panelH = scene.activePanelH || INVENTORY_PANEL_H;
  const elements = scene.inventoryPanelElements;
  // wheel 핸들러 cleanup
  const sg = elements.find((el) => el && el._wheelHandler);
  if (sg) scene.input.off('wheel', sg._wheelHandler);
  scene.inventoryPanelElements = null;
  scene.activePanelH = null;
  syncActiveTab(scene);
  elements.forEach((el) => {
    if (!el || !el.scene) return;
    scene.tweens.killTweensOf(el);
    if (el._skipSlide) {
      scene.tweens.add({
        targets: el, alpha: 0, duration: 160, ease: 'Quad.easeIn',
        onComplete: () => { if (el.destroy) el.destroy(); },
      });
    } else {
      scene.tweens.add({
        targets: el, y: el.y + panelH, duration: 180, ease: 'Quad.easeIn',
        onComplete: () => { if (el.destroy) el.destroy(); },
      });
    }
  });

  // HUD 슬롯 원위치 복귀
  if (scene.heroHudContainer) {
    scene.tweens.killTweensOf(scene.heroHudContainer);
    scene.tweens.add({
      targets: scene.heroHudContainer, y: 0,
      duration: 180, ease: 'Quad.easeIn',
      onComplete: () => refreshHeroSlotInteractivity(scene),
    });
  }
}

function refreshInventoryPanel(scene) {
  if (!scene.inventoryPanelElements) return;
  // 즉시 destroy + 재생성 (애니메이션 없음 — 이미 열려있는 상태)
  scene.inventoryPanelElements.forEach((el) => { if (el && el.destroy) el.destroy(); });
  scene.inventoryPanelElements = null;
  closeHeroDetailPanel(scene);
  scene._skipInventoryAnim = true;
  openInventoryPanel(scene);
  scene._skipInventoryAnim = false;
}

function openHeroDetailPanel(scene, heroId) {
  closeHeroDetailPanel(scene);
  const entry = scene.heroInventory[heroId];
  if (!entry) return;
  const def = HEROES[heroId];
  const cls = CLASSES[def.class];
  const rarity = RARITY[def.rarity];
  const els = [];

  const overlay = scene.add.rectangle(CENTER.x, CENTER.y, GAME_W, GAME_H, 0x000000, 0.55)
    .setDepth(120).setInteractive();
  // pointerup으로 닫기 — pointerdown에서 닫으면 overlay가 destroy된 뒤 같은 클릭의 up이
  // 뒤 카드에 떨어져 새 디테일 팝업이 또 열리는 버그가 생김.
  overlay.on('pointerup', () => closeHeroDetailPanel(scene));
  els.push(overlay);

  // sprite 비율(639:719 ≈ 0.889) 유지: stretching 방지
  const h = 510;
  const w = Math.round(h * 639 / 719);  // ≈ 453
  // 모달 중심을 화면 중앙에서 위로 이동 (등록 버튼이 화면 하단 잘림 방지)
  const modalCY = CENTER.y - 40;
  // 1단계: 팝업 BG — Layer Lab UI 리소스/우선 사용 sprite 그대로 (X 버튼도 sprite에 포함)
  const panelLeft = CENTER.x - w / 2;
  const panelTopY = modalCY - h / 2;
  const panelR = 14;

  const modalBgKey = RARITY_MODAL_BG_SPRITE[def.rarity] || 'ui_hero_modal_bg_common';
  const modalBg = scene.add.image(CENTER.x, modalCY, modalBgKey)
    .setDisplaySize(w, h).setDepth(121).setInteractive();
  els.push(modalBg);

  // 우상단 X 버튼 — sprite에 그려진 X 위치에 hit zone만 (비율: cx 0.927, cy 0.067)
  const xX = panelLeft + w * 0.927;
  const xY = panelTopY + h * 0.067;
  const xHitSize = 44;
  const xHit = scene.add.zone(xX, xY, xHitSize, xHitSize).setOrigin(0.5).setDepth(125)
    .setInteractive({ useHandCursor: true });
  xHit.on('pointerup', () => closeHeroDetailPanel(scene));
  els.push(xHit);

  const top = modalCY - h / 2;
  const tx = CENTER.x;

  // 2단계: 상단 타이틀 — 영웅 이름(큰 흰 글씨) + 등급(작은 시안톤)
  const titleName = scene.add.text(tx, top + 32, def.name, {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '24px',
    color: '#FFFFFF', stroke: '#000', strokeThickness: 4,
    shadow: { offsetX: 0, offsetY: 5, color: '#000', blur: 6, fill: true },
  }).setOrigin(0.5).setDepth(122);
  els.push(titleName);

  // 등급 라벨 — sprite (높이 28 고정, 비율 유지)
  const rarityLabelKey = RARITY_LABEL_SPRITE[def.rarity] || 'ui_rarity_common';
  const titleRarity = scene.add.image(tx, top + 62, rarityLabelKey).setDepth(122);
  const rarityScale = 28 / titleRarity.height;
  titleRarity.setScale(rarityScale);
  els.push(titleRarity);

  // 좌상단 클래스 — 인벤토리와 동일 (원 + 아이콘 + 글씨, 좌측 마진 24px)
  const lcR = 9;  // 인벤토리와 같은 반지름
  const lcChipX = panelLeft + 24 + lcR;
  const lcChipY = top + 30;
  const lcChipBg = scene.add.graphics().setDepth(122);
  lcChipBg.fillStyle(0x181728, 0.9);
  lcChipBg.fillCircle(lcChipX, lcChipY, lcR);
  lcChipBg.lineStyle(1.2, 0x6E7383, 1);
  lcChipBg.strokeCircle(lcChipX, lcChipY, lcR);
  const lcIcon = scene.add.image(lcChipX, lcChipY,
    CLASS_ICON_SPRITE[def.class] || 'ui_class_warrior')
    .setDisplaySize(lcR * 1.4, lcR * 1.4).setDepth(123);
  const lcLabel = scene.add.text(lcChipX + lcR + 6, lcChipY, cls.name, {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '14px',
    color: '#FFFFFF', stroke: '#000', strokeThickness: 3,
    shadow: { offsetX: 0, offsetY: 4, color: '#000', blur: 5, fill: true },
  }).setOrigin(0, 0.5).setDepth(123);
  els.push(lcChipBg, lcIcon, lcLabel);


  // 3단계: 가운데 캐릭터 chip (시안 outline 사각형 + portrait + 우상단 카운터)
  const mainChipW = 91;   // 130 → 91 (30% 축소)
  const mainChipH = 91;
  const mainChipCY = top + 145;  // 슬롯+별 묶음 위치 (별도 자동 따라감)
  const mainChipL = tx - mainChipW / 2;
  const mainChipT = mainChipCY - mainChipH / 2;

  // 영웅 슬롯 — Layer Lab K-276 등급별 sprite (사용자 제공 2026-05-22)
  const mainChipBgKey = RARITY_HERO_SLOT_MAIN[def.rarity] || 'ui_hero_slot_main_common';
  const mainChipBg = scene.add.image(tx, mainChipCY, mainChipBgKey)
    .setDisplaySize(mainChipW, mainChipH).setDepth(122);
  els.push(mainChipBg);

  const detailPortraitScale = def.drawBody ? 1.0 : 2.4;
  const portrait = scene.add.container(tx, mainChipCY).setDepth(123).setScale(detailPortraitScale);
  drawHeroPortraitStatic(scene, def, portrait);
  els.push(portrait);

  // 우상단 영웅 레벨 chip — 인벤토리와 동일한 방패 sprite (ui_level_badge)
  const enhanceVal = clampEnhance(entry.enhance);
  const lvShieldSize = 30;
  const cntX = mainChipL + mainChipW - 4;
  const cntY = mainChipT + 4;
  const cntBg = scene.add.image(cntX, cntY, 'ui_level_badge')
    .setDisplaySize(lvShieldSize, lvShieldSize).setDepth(124);
  const cntText = scene.add.text(cntX, cntY - 1, `${enhanceVal}`, {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '13px',
    color: '#FFFFFF', stroke: '#000', strokeThickness: 2.5,
    shadow: { offsetX: 0, offsetY: 4, color: '#000', blur: 5, fill: true },
  }).setOrigin(0.5).setDepth(125);
  els.push(cntBg, cntText);

  // chip 아래 등급 별
  const starCount = RARITY_STARS[def.rarity] || 1;
  const starKey = def.rarity === 'EXOTIC' ? 'ui_star_premium' : 'ui_star_yellow';
  const starSize = 22;
  const starOverlap = 6;
  const starUnit = starSize - starOverlap;
  const starsTotalW = starCount * starUnit + starOverlap;
  const starsY = mainChipT + mainChipH + 18;
  const starsStartX = tx - starsTotalW / 2 + starSize / 2;
  for (let i = 0; i < starCount; i++) {
    const sx = starsStartX + i * starUnit;
    const star = scene.add.image(sx, starsY, starKey)
      .setDisplaySize(starSize, starSize).setDepth(123);
    els.push(star);
  }

  // 4단계: 하단 흰 영역 — sprite에 이미 그려져 있어 별도 그래픽 제거.
  // 좌표 변수는 아래 스탯/버튼 배치에 그대로 사용.
  const whiteTop = top + 231;  // sprite 흰 영역 실제 시작점 (sprite y 325/719 ≈ 0.452 → modal h 510 × 0.452)
  const whiteBot = top + h - 4;
  const whiteH = whiteBot - whiteTop;
  const whiteL = panelLeft + 4;
  const whiteW = w - 8;

  // 5단계: 능력치 7개 (2/2/2/1 4행) — 라벨(chip 위) + chip + 숫자
  // 실제 전투 스탯과 동일 공식 (강화 flat + 훈련% + 인구) — applyHeroStats와 일치.
  const s = computeHeroStatValues(def, enhanceVal);
  const hp = s.maxHp;
  const dmg = s.damage;
  const defVal = s.defense;
  const atkSpd = (1000 / cls.baseStats.attackInterval).toFixed(1);
  const atkRng = cls.baseStats.attackRange;
  const movSpd = cls.baseStats.speed;
  const detRng = cls.baseStats.detectRange;
  const respawn = rarity.respawnSec;

  // 4 컬럼 layout (행2도 같은 4컬럼 자리에 3개 배치 — col1, col2, col3)
  const colW = (whiteW - 32) / 4;
  const col1CX = whiteL + 16 + colW * 0.5;
  const col2CX = whiteL + 16 + colW * 1.5;
  const col3CX = whiteL + 16 + colW * 2.5;
  const col4CX = whiteL + 16 + colW * 3.5;

  // 행별 chip 중심 y — chip 세로 28에 맞춰 행 간격 넓힘
  const rowYs = [
    whiteTop + 40,   // 행1 (4개)
    whiteTop + 96,   // 행2 (3개, 간격 56)
  ];
  // chip 가로는 이전(20 스케일 기준)을 유지하고 세로만 28로 늘림 → NineSlice로 stretching 방지
  const chipW = Math.round(922 * 20 / 196);  // ≈ 94 (가로 유지)
  const chipH = 28;

  const makeStatBlock = (cxBlock, cyChip, label, valueStr, iconKey) => {
    // 라벨 — chip 바로 위 가운데
    const lbl = scene.add.text(cxBlock, cyChip - 14, label, {
      fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '11px',
      color: '#3A4458',
    }).setOrigin(0.5, 1).setDepth(124);
    els.push(lbl);
    // iconKey 있으면 chip 좌측에 아이콘 (chip을 좌상단으로 살짝 삐져나가게)
    let valOffsetX = 0;
    if (iconKey) {
      const iconSize = Math.round((chipH - 6) * 1.3);  // 1.3배 키움
      const iconX = cxBlock - chipW / 2 + 10;           // chip 좌측 약간 안쪽 + 좌측으로 약 4-5px만 살짝 삐져
      const iconY = cyChip - 6;                          // 위로도 6px 삐져
      const icon = scene.add.image(iconX, iconY, iconKey)
        .setDisplaySize(iconSize, iconSize).setDepth(126);
      els.push(icon);
      valOffsetX = 6;
    }
    // setDisplaySize — 기존 가로폭 그대로 + 세로만 늘림 (단순 stretch)
    const chipBg = scene.add.image(cxBlock, cyChip, 'ui_stat_chip')
      .setDisplaySize(chipW, chipH).setDepth(124);
    els.push(chipBg);
    // 수치 — 좌상단 클래스 라벨과 동일한 흰색 + 검정 stroke + shadow
    const valTxt = scene.add.text(cxBlock + valOffsetX, cyChip, valueStr, {
      fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '14px',
      color: '#FFFFFF', stroke: '#000', strokeThickness: 3,
      shadow: { offsetX: 0, offsetY: 4, color: '#000', blur: 5, fill: true },
    }).setOrigin(0.5).setDepth(125);
    els.push(valTxt);
  };

  // 행1: 공격력 / 방어력 / 체력 / 사거리
  makeStatBlock(col1CX, rowYs[0], '공격력',   `${dmg}`, 'ui_stat_icon_atk');
  makeStatBlock(col2CX, rowYs[0], '방어력',   `${defVal}`, 'ui_stat_icon_def');
  makeStatBlock(col3CX, rowYs[0], '체력',     `${hp}`, 'ui_stat_icon_hp');
  makeStatBlock(col4CX, rowYs[0], '사거리',   `${atkRng}`, 'ui_stat_icon_range');
  // 행2: 공격속도 / 이동속도 / 감지범위 / 부활쿨타임
  makeStatBlock(col1CX, rowYs[1], '공격속도', `${atkSpd}/s`, 'ui_stat_icon_atkspd');
  makeStatBlock(col2CX, rowYs[1], '이동속도', `${movSpd}`, 'ui_stat_icon_movspd');
  makeStatBlock(col3CX, rowYs[1], '감지범위', `${detRng}`, 'ui_stat_icon_detect');
  makeStatBlock(col4CX, rowYs[1], '부활쿨타임', `${respawn}초`, 'ui_stat_icon_respawn');

  // 스킬 정보 — 단일 chip 안에 이름 / 쿨타임 / 설명 한 번에 (능력치 행의 좌우 외곽선과 맞춤)
  const skillChipW = colW * 3 + chipW;  // 행1/행2의 col1 좌단 ~ col4 우단 폭과 동일
  const skillChipH = 64;
  const skillChipCX = tx;
  const skillChipCY = rowYs[1] + 26 + skillChipH / 2;

  const skillChipBg = scene.add.image(skillChipCX, skillChipCY, 'ui_stat_chip')
    .setDisplaySize(skillChipW, skillChipH).setDepth(124);
  els.push(skillChipBg);

  // 상단 행: 스킬명 (좌) / 쿨타임 (우)
  const skillTopY = skillChipCY - skillChipH / 2 + 16;
  const skillLeftX = skillChipCX - skillChipW / 2 + 14;

  const skillNameTxt = scene.add.text(skillLeftX, skillTopY, cls.skill.name, {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '15px',
    color: '#FFFFFF', stroke: '#000', strokeThickness: 3,
    shadow: { offsetX: 0, offsetY: 4, color: '#000', blur: 5, fill: true },
  }).setOrigin(0, 0.5).setDepth(125);
  els.push(skillNameTxt);

  const cdTxt = scene.add.text(skillChipCX + skillChipW / 2 - 12, skillTopY,
    `쿨타임 ${(cls.skill.cooldownMs / 1000).toFixed(0)}초`, {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '13px',
    color: '#FFE082', stroke: '#000', strokeThickness: 3,
    shadow: { offsetX: 0, offsetY: 3, color: '#000', blur: 4, fill: true },
  }).setOrigin(1, 0.5).setDepth(125);
  els.push(cdTxt);

  // 하단 행: 설명 (좌측 정렬)
  const descTxt = scene.add.text(skillLeftX, skillChipCY + 12,
    cls.skill.desc || '', {
    fontFamily: 'BMJUA', fontSize: '12px',
    color: '#FFFFFF', stroke: '#000', strokeThickness: 2.5,
    align: 'left',
    wordWrap: { width: skillChipW - 28 },
  }).setOrigin(0, 0.5).setDepth(125);
  els.push(descTxt);

  // 액션 버튼 (배치 / 해제)
  const isDeployed = entry.deployedSlot !== null;
  const slotsFull = scene.heroSlots.every((s) => s.occupied);
  let btnLabel, btnColor, btnHover, btnEnabled, btnAction;
  if (isDeployed) {
    btnLabel = `✕ 해제 (슬롯 ${entry.deployedSlot + 1})`;
    btnColor = 0x9B3A2A; btnHover = 0xC04A3A; btnEnabled = true;
    btnAction = () => {
      recallHeroFromSlot(scene, entry.deployedSlot);
      saveGame(scene);
      refreshInventoryPanel(scene);
    };
  } else if (slotsFull) {
    btnLabel = '배치 (슬롯 부족)';
    btnColor = 0x3A3A3A; btnHover = 0x3A3A3A; btnEnabled = false;
    btnAction = null;
  } else {
    btnLabel = '▶ 배치';
    btnColor = 0x4A7A2D; btnHover = 0x6FA340; btnEnabled = true;
    btnAction = () => {
      const freeIdx = scene.heroSlots.findIndex((s) => !s.occupied);
      if (freeIdx === -1) return;
      deployHeroFromInventory(scene, heroId, freeIdx);
      saveGame(scene);
      refreshInventoryPanel(scene);
    };
  }

  // 6단계: 하단 단일 버튼 (등록 초록 / 해제 빨강) — sprite 원본 240x107의 1/2 크기
  const btnW = 120;
  const btnH = 54;
  const btnY = top + h - btnH / 2 - 30;  // 모달 하단에서 위로 ≥ 0.8cm 마진 (절대 룰)
  const btnCX = tx;

  const spriteKey = isDeployed ? 'ui_hero_btn_unregister' : 'ui_hero_btn_register';
  const label = isDeployed ? '해제' : '등록';
  const btnBg = scene.add.image(btnCX, btnY, spriteKey).setDisplaySize(btnW, btnH).setDepth(124);
  if (!btnEnabled) btnBg.setTint(0xAAAAAA);
  const btnTxt = scene.add.text(btnCX, btnY, label, {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '20px',
    color: '#FFFFFF', stroke: '#000', strokeThickness: 3,
    shadow: { offsetX: 0, offsetY: 4, color: '#000', blur: 6, fill: true },
  }).setOrigin(0.5).setDepth(125);
  if (btnEnabled) {
    const hit = scene.add.zone(btnCX, btnY, btnW, btnH).setOrigin(0.5).setDepth(126)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerup', btnAction);
    els.push(hit);
  }
  els.push(btnBg, btnTxt);

  scene.heroDetailElements = els;
}

function closeHeroDetailPanel(scene) {
  if (!scene.heroDetailElements) return;
  scene.heroDetailElements.forEach((el) => { if (el.destroy) el.destroy(); });
  scene.heroDetailElements = null;
}

function bindHeroToHUDSlot(scene, hero, slotIndex) {
  const slot = scene.heroSlots[slotIndex];
  if (!slot) return;

  const def = hero.heroDef;
  const cls = CLASSES[def.class];
  const rarity = RARITY[def.rarity];

  // 영웅 배치 시: 우든 슬롯 그대로. 등급/레벨은 corner label로 표시 (아래쪽 코드).
  if (slot.lockIcon) slot.lockIcon.setVisible(false);

  // 슬롯 안쪽 패딩 (라운드 코너 + 외곽선 회피)
  const innerPad = 7;
  // 영웅 포트레이트 — sprite sheet frame 0을 비율 유지로 fit (긴 변 기준)
  const portraitSize = HUD_CARD_W - 4;
  let portrait;
  if (def.portraitSheet) {
    portrait = scene.add.image(slot.x, slot.y, def.portraitSheet, def.portraitSheetFrame || 0);
    const sw = def.portraitSheetSize.w, sh = def.portraitSheetSize.h;
    portrait.setScale(portraitSize / Math.max(sw, sh));
  }
  // sprite sheet 영웅은 frame이 캐릭터에 tight해서 mask 불필요.
  let maskShape = null;
  if (!def.portraitSheet) {
    // 미래에 sprite 안 가진 영웅 추가 시만 사용 — 슬롯 사각형 영역 mask로 클립
    portrait = scene.add.rectangle(slot.x, slot.y, portraitSize, portraitSize, 0x333333);
    maskShape = scene.add.graphics();
    maskShape.fillStyle(0xffffff, 1);
    maskShape.fillRect(slot.x - HUD_CARD_W / 2, slot.y - HUD_CARD_H / 2, HUD_CARD_W, HUD_CARD_H);
    maskShape.setVisible(false);
    if (scene.heroHudContainer) scene.heroHudContainer.add(maskShape);
    portrait.setMask(new Phaser.Display.Masks.BitmapMask(scene, maskShape));
  }

  // 절차적 외곽/inset shadow 끄기 (sprite와 더블 겹침 방지)
  drawAngularSlot(slot.bg, true);

  // 안쪽 BG는 Layer Lab K-276 sprite — 등급별. 빈 슬롯과 동일한 시각 크기로 보정
  // sprite 204x211 중 컬러 내부는 187x192 → 컬러 내부가 슬롯 크기가 되도록 sprite를 확대
  const slotBgKey = RARITY_HUD_SLOT_BG[def.rarity] || RARITY_HUD_SLOT_BG.COMMON;
  const SPRITE_FIT_RATIO = 204 / 187;
  const rarityFill = scene.add.image(slot.x, slot.y, slotBgKey)
    .setDisplaySize(HUD_CARD_W * SPRITE_FIT_RATIO, HUD_CARD_H * SPRITE_FIT_RATIO);

  // HP 바 제거 (사용자 요청) — 슬롯 내 영웅 HP는 표시 안 함
  // 부활 쿨다운 dim — Graphics pie slice (시계방향 sweep)
  const overlay = scene.add.graphics().setVisible(false);
  const respawnText = scene.add.text(slot.x, slot.y, '', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '14px', color: '#ffffff',
  }).setOrigin(0.5).setVisible(false);

  // HUD 컨테이너로 reparent — slot BG는 portrait 아래 layer
  if (scene.heroHudContainer) {
    scene.heroHudContainer.add([rarityFill, portrait, overlay, respawnText]);
  }

  slot.occupied = true;
  slot.hero = hero;
  slot.parts = { portrait, maskShape, rarityFill, overlay, respawnText };
  hero.cardSlot = slot;
}

function updateHeroHUD(scene) {
  if (!scene.heroSlots) return;
  scene.heroSlots.forEach((slot) => {
    if (!slot.occupied || !slot.hero) return;
    const hero = slot.hero;
    const parts = slot.parts;
    if (hero.alive) {
      parts.overlay.clear();
      parts.overlay.setVisible(false);
      parts.respawnText.setVisible(false);
      parts.portrait.alpha = 1;
    } else {
      const remainingMs = Math.max(0, hero.respawnAt - scene.time.now);
      const totalMs = Math.max(1, hero.respawnAt - (hero.respawnStart || (hero.respawnAt - 1)));
      const ratio = Phaser.Math.Clamp(remainingMs / totalMs, 0, 1);

      // 시계방향 reveal — 남은 시간만큼 dim. 슬롯이 정사각이라 사각형 경계 따라 sweep
      parts.overlay.setVisible(true);
      parts.overlay.clear();
      parts.overlay.fillStyle(0x000000, 0.65);
      const half = HUD_CARD_W / 2 - 1;
      const cx = slot.x, cy = slot.y;
      const pts = [{ x: cx, y: cy }, { x: cx, y: cy - half }]; // 중심 → 12시
      const SLICES = 64;
      const total = ratio * 2 * Math.PI;
      for (let i = 1; i <= SLICES; i++) {
        const a = total * (i / SLICES);
        const ang = -Math.PI / 2 + a; // 12시에서 시계방향
        const dx = Math.cos(ang), dy = Math.sin(ang);
        const tx = half / Math.max(1e-4, Math.abs(dx));
        const ty = half / Math.max(1e-4, Math.abs(dy));
        const s = Math.min(tx, ty); // 사각형 경계까지 거리
        pts.push({ x: cx + dx * s, y: cy + dy * s });
      }
      parts.overlay.fillPoints(pts, true);

      parts.respawnText.setVisible(true);
      parts.respawnText.setText((remainingMs / 1000).toFixed(1));
      parts.portrait.alpha = 0.4;
    }
  });
}

// === Boss UI ===============================================================

function setStagePanelVisible(scene, visible) {
  const sp = scene.stagePanel;
  if (!sp) return;
  [sp.stageText, sp.barTrack, sp.barFill, sp.startMarker, sp.midMarker,
   sp.bossMarker, sp.bossIcon, sp.bossLabel].forEach((el) => {
    if (el && el.setVisible) el.setVisible(visible);
  });
}

function showBossUI(scene) {
  hideBossUI(scene);
  // 스테이지 패널 자리에 보스 HP UI 표시 (UI swap)
  setStagePanelVisible(scene, false);
  const y = TOP_UI_HEIGHT + 50; // 스테이지 바와 동일 위치
  const w = 380, h = 22;
  // 전체 bar (BG + Fill) 모두 graphics로 직접 그림 — 레퍼런스 픽셀 분석 결과 재현
  const bar = scene.add.graphics().setDepth(46);
  bar._x = GAME_W / 2 - w / 2;
  bar._y = y - h / 2;
  bar._w = w;
  bar._h = h;
  drawBossHpFill(bar, 1);
  // 위쪽: 스테이지 N (작은 글씨) — 충분히 위로 올려 보스 이름과 겹침 방지
  const stageText = scene.add.text(GAME_W / 2, y - h / 2 - 40, `스테이지 ${stage}`, {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '11px',
    color: '#FFFFFF', stroke: '#1F0410', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(47);
  // 보스 이름 — 보라색 강조 (흰색 stageText와 색상 분리)
  const label = scene.add.text(GAME_W / 2, y - h / 2 - 4, getCurrentBossName(), {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '18px',
    color: '#C084FC', stroke: '#1A0530', strokeThickness: 4,
    shadow: { offsetX: 0, offsetY: 3, color: '#000', blur: 5, fill: true },
  }).setOrigin(0.5, 1).setDepth(47);
  // 타이머 — pill BG (Layer Lab K-241 원본 비율 그대로) + 시계 아이콘 + 텍스트
  const timerY = y + h / 2 + 22;
  const pillH = 28;
  const pillRatio = 255 / 61;
  const pillW = pillH * pillRatio; // 원본 비율 유지
  const timerBg = scene.add.image(GAME_W / 2, timerY, 'ui_timer_pill_bg')
    .setDisplaySize(pillW, pillH).setDepth(46).setAlpha(0.7);
  // 시계 아이콘 — pill보다 살짝 크게(돌출) + 좌측 끝 덮음
  const iconSize = pillH + 6;
  const iconX = GAME_W / 2 - pillW / 2 + iconSize / 2 - 4;
  const timerIcon = scene.add.image(iconX, timerY, 'ui_icon_timer')
    .setDisplaySize(iconSize, iconSize).setDepth(47);
  // 텍스트 — 숫자(크게) + "초"(작게) 분리. pill 우측 영역 가운데 정렬
  const timerTextX = (iconX + iconSize / 2 + (GAME_W / 2 + pillW / 2)) / 2;
  const timer = scene.add.text(timerTextX - 1, timerY, '', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '16px',
    color: '#FACC15', stroke: '#000', strokeThickness: 4,
  }).setOrigin(1, 0.5).setDepth(47);
  const timerUnit = scene.add.text(timerTextX + 1, timerY + 1, '초', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '11px',
    color: '#FACC15', stroke: '#000', strokeThickness: 3,
  }).setOrigin(0, 0.5).setDepth(47);
  scene.bossUI = { fill: bar, stageText, label, timerBg, timerIcon, timer, timerUnit, w };
}

// 보스 HP 바 — 레퍼런스 픽셀 분석 기반 (외곽 검정 outline + 어두운 회색 BG + 빨강 fill)
function drawBossHpFill(g, pct) {
  g.clear();
  const x = g._x, y = g._y, w = g._w, h = g._h;
  const radius = 5;
  const outline = 2.5;
  // 1) 외곽 검정 outline (전체 bar 영역 + 외곽)
  g.fillStyle(0x000000, 1);
  g.fillRoundedRect(x - outline, y - outline, w + outline * 2, h + outline * 2, radius + outline);
  // 2) 빈 영역 BG — 어두운 회색 (#252525)
  g.fillStyle(0x252525, 1);
  g.fillRoundedRect(x, y, w, h, radius);
  // 3) 빨강 fill (HP %)
  const fillW = Math.max(0, w * pct);
  if (fillW <= 1) return;
  const mainColor = 0xE3493D;       // 메인 빨강
  const highlightColor = 0xFF7A6E;  // 위 highlight (밝은 빨강)
  const shadowColor = 0xC22B22;     // 아래 strip (진한 빨강)
  // 메인 fill
  g.fillStyle(mainColor, 1);
  g.fillRoundedRect(x, y, fillW, h, radius);
  // 상단 highlight strip (2px)
  g.fillStyle(highlightColor, 1);
  g.fillRoundedRect(x + 1.5, y + 1.5, Math.max(0, fillW - 3), 2, { tl: radius - 2, tr: radius - 2, bl: 0, br: 0 });
  // 하단 shadow strip — 메인보다 진한 빨강 (입체감)
  g.fillStyle(shadowColor, 1);
  g.fillRoundedRect(x + 1.5, y + h - 6, Math.max(0, fillW - 3), 4, { tl: 0, tr: 0, bl: radius - 2, br: radius - 2 });
}

function updateBossUI(scene) {
  if (!scene.bossUI || !currentBoss || !currentBoss.active) return;
  const pct = Math.max(0, currentBoss.hp / currentBoss.maxHp);
  // HP는 항상 빨강 고정 (단계별 색 변화 없음)
  drawBossHpFill(scene.bossUI.fill, pct);
  const t = Math.max(0, bossTimerRemaining);
  const color = t <= 5 ? '#FF6666' : t <= 10 ? '#FFAA33' : '#FACC15';
  scene.bossUI.timer.setText(`${t.toFixed(1)}`).setColor(color);
  if (scene.bossUI.timerUnit) scene.bossUI.timerUnit.setColor(color);
}

function hideBossUI(scene) {
  if (scene.bossUI) {
    if (scene.bossUI.fill) scene.bossUI.fill.destroy();
    if (scene.bossUI.label) scene.bossUI.label.destroy();
    if (scene.bossUI.stageText) scene.bossUI.stageText.destroy();
    if (scene.bossUI.timer) scene.bossUI.timer.destroy();
    if (scene.bossUI.timerUnit) scene.bossUI.timerUnit.destroy();
    if (scene.bossUI.timerBg) scene.bossUI.timerBg.destroy();
    if (scene.bossUI.timerIcon) scene.bossUI.timerIcon.destroy();
    scene.bossUI = null;
  }
  // 스테이지 패널 복귀
  setStagePanelVisible(scene, true);
}

function getStageDisplay() {
  return `${stage}`;
}

// === Tavern modal ==========================================================

function rollGachaCandidates(count) {
  const totalWeight = Object.values(GACHA_WEIGHTS).reduce((a, b) => a + b, 0);
  const pool = Object.values(HEROES);
  const result = [];
  for (let i = 0; i < count; i++) {
    let r = Math.random() * totalWeight;
    let chosenTier = 'COMMON';
    for (const [tier, w] of Object.entries(GACHA_WEIGHTS)) {
      r -= w;
      if (r <= 0) { chosenTier = tier; break; }
    }
    const eligible = pool.filter((h) => h.rarity === chosenTier);
    const def = eligible.length
      ? eligible[Math.floor(Math.random() * eligible.length)]
      : pool[Math.floor(Math.random() * pool.length)];
    result.push(def);
  }
  return result;
}

function openTavern(scene) {
  if (scene.tavernElements) return;
  scenePaused = true;
  // flip 연출에서 사용 — 텍스처 미리 생성 (없으면 Phaser placeholder 사각이 보임)
  ensureRadialGlowTexture(scene);
  const elements = [];

  // 풀스크린 dim
  const overlay = scene.add.rectangle(CENTER.x, CENTER.y, GAME_W, GAME_H, 0x000000, 0.55)
    .setDepth(100).setInteractive();
  elements.push(overlay);

  // 보라 팝업 sprite — 원본 비율(425:532) 유지, 화면 가운데 부유
  const popupW = 384; // 480 × 0.8 (20% 축소)
  const popupH = popupW * (532 / 425); // ≈ 481
  const popupCX = CENTER.x;
  const popupCY = CENTER.y - 20; // 살짝 위로
  const popup = scene.add.image(popupCX, popupCY, 'ui_popup_purple')
    .setDisplaySize(popupW, popupH).setDepth(101).setInteractive();
  elements.push(popup);

  // 우상단 X 버튼 — sprite에 베이크된 위치에 hit zone만 overlay
  const closeHitX = popupCX + popupW / 2 - 36;
  const closeHitY = popupCY - popupH / 2 + 36;
  const closeHit = scene.add.zone(closeHitX, closeHitY, 56, 56).setOrigin(0.5)
    .setDepth(106).setInteractive({ useHandCursor: true });
  closeHit.on('pointerup', () => closeTavern(scene));
  elements.push(closeHit);

  // 타이틀 — 좌상단 모서리에 아이콘 (HUD와 동일 정사각 56x56) 삐져나오게, "영웅 소환" 텍스트는 헤더 가운데 정렬
  const headerY = popupCY - popupH / 2 + 30;
  const titleIcon = scene.add.image(popupCX - popupW / 2 - 18, popupCY - popupH / 2 - 14, 'ui_icon_tavern')
    .setDisplaySize(56, 56).setOrigin(0, 0).setDepth(106);
  const title = scene.add.text(popupCX, headerY, '영웅 소환', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '19px',
    color: '#FFFFFF', stroke: '#000000', strokeThickness: 4,
    shadow: { offsetX: 0, offsetY: 4, color: '#000000', blur: 5, fill: true },
  }).setOrigin(0.5).setDepth(105);
  elements.push(titleIcon, title);

  // 안내문 — 팝업 가운데 정렬 (1cm ≈ 38px 위로)
  const subtitleY = popupCY - popupH / 2 + 71;
  const subtitle = scene.add.text(popupCX, subtitleY, '영웅 한 명 선택!', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '13px',
    color: '#F0E6FF', stroke: '#3A1A50', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(103);
  elements.push(subtitle);

  // 카드 영역 — 초기에는 뒷면 3장만. "소환" 버튼 누르면 reveal 시작
  const cardW = 96, cardH = 132;
  const cardSpacing = 110;
  const cardCenterY = subtitleY + 38 + cardH / 2;
  scene.tavernCardSlots = [];
  for (let i = 0; i < 3; i++) {
    const cardX = popupCX + (i - 1) * cardSpacing;
    const back = scene.add.image(cardX, cardCenterY, 'ui_card_back')
      .setDisplaySize(cardW, cardH).setDepth(103);
    elements.push(back);
    scene.tavernCardSlots.push({ x: cardX, y: cardCenterY, w: cardW, h: cardH, back, transient: [] });
  }
  scene.tavernRevealed = false;

  // (구) 카드 reveal forEach 본문 제거됨 — summonTavernHeroes 함수에서 처리
  if (false) (function legacy() {
    const candidates = []; const i = 0; const def = candidates[i];
    const cardX = popupCX + (i - 1) * cardSpacing;
    // 뒷면 sprite (등장 시점부터 보임)
    const back = scene.add.image(cardX, cardCenterY, 'ui_card_back')
      .setDisplaySize(cardW, cardH).setDepth(103);
    elements.push(back);
    const flipDelay = i * 280; // 좌측부터 280ms 간격
    const flipDuration = 220;
    // 뒷면 wobble (뒤집기 직전에 살짝 흔들림 — 기대감 연출)
    scene.tweens.add({
      targets: back, angle: { from: -3, to: 3 },
      duration: 80, yoyo: true, repeat: 2,
      delay: flipDelay + 400,
    });
    // 1단계: 뒷면 scaleX 1 → 0
    scene.tweens.add({
      targets: back, scaleX: 0,
      duration: flipDuration, delay: flipDelay + 600,
      ease: 'Quad.easeIn',
      onComplete: () => {
        back.destroy();
        if (!scene.tavernElements) return;
        // 등급 글로우 (카드 뒤 후광)
        const pal = INV_CARD_PALETTE[def.rarity] || INV_CARD_PALETTE.COMMON;
        const glow = scene.add.image(cardX, cardCenterY, 'inv_card_glow')
          .setDisplaySize(cardW * 0.4, cardW * 0.4).setDepth(102).setAlpha(0).setTint(pal.glow)
          .setBlendMode(Phaser.BlendModes.ADD);
        scene.tweens.add({
          targets: glow, alpha: 0.95,
          scaleX: (cardW * 1.7) / glow.width, scaleY: (cardW * 1.7) / glow.width,
          duration: 220, ease: 'Quad.easeOut',
        });
        scene.tweens.add({
          targets: glow, alpha: 0,
          duration: 500, delay: 220, ease: 'Quad.easeIn',
          onComplete: () => glow.destroy(),
        });

        // 흰 플래시 (카드 중심에서 확산)
        const flash = scene.add.image(cardX, cardCenterY, 'inv_card_glow')
          .setDisplaySize(40, 40).setDepth(108).setAlpha(0)
          .setBlendMode(Phaser.BlendModes.ADD);
        scene.tweens.add({
          targets: flash, alpha: 0.9,
          scaleX: (cardW * 1.4) / flash.width, scaleY: (cardW * 1.4) / flash.width,
          duration: 130, ease: 'Quad.easeOut',
          onComplete: () => {
            scene.tweens.add({
              targets: flash, alpha: 0, duration: 320,
              onComplete: () => flash.destroy(),
            });
          },
        });

        // 앞면 카드
        const cardEls = drawTavernCard(scene, cardX, cardCenterY, def, cardW, cardH);
        const cardBody = cardEls[0];
        const rest = cardEls.slice(1);
        // 카드 본체 — scaleX 0 → 1.18 overshoot → 1.0 (Back.easeOut)
        cardBody.scaleX = 0; cardBody.scaleY = 0.92;
        rest.forEach((el) => { if (el.setAlpha) el.setAlpha(0); else el.alpha = 0; });
        scene.tweens.add({
          targets: cardBody, scaleX: 1, scaleY: 1,
          duration: flipDuration + 40, ease: 'Back.easeOut',
        });
        // 영입 버튼 fade-in + 살짝 위로 떠오름
        rest.forEach((el) => { el._baseY = el.y; el.y += 6; });
        scene.tweens.add({
          targets: rest, alpha: 1,
          duration: 240, delay: flipDuration - 40, ease: 'Quad.easeOut',
        });
        rest.forEach((el) => {
          if (el._baseY !== undefined) {
            scene.tweens.add({
              targets: el, y: el._baseY,
              duration: 240, delay: flipDuration - 40, ease: 'Back.easeOut',
            });
          }
        });

        // 등급별 sparkle 별 4개 (카드 모서리에서 튀어나옴)
        const starColor = pal.glow;
        for (let k = 0; k < 4; k++) {
          const sang = (k / 4) * Math.PI * 2 + Math.PI / 4;
          const sx = cardX + Math.cos(sang) * (cardW * 0.45);
          const sy = cardCenterY + Math.sin(sang) * (cardH * 0.45);
          const spark = scene.add.circle(cardX, cardCenterY, 3, 0xFFFFFF)
            .setDepth(109).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
          scene.tweens.add({
            targets: spark, x: sx, y: sy, alpha: 1,
            duration: 240, delay: 60, ease: 'Quad.easeOut',
          });
          scene.tweens.add({
            targets: spark, alpha: 0, scaleX: 0.3, scaleY: 0.3,
            duration: 280, delay: 320, ease: 'Quad.easeIn',
            onComplete: () => spark.destroy(),
          });
        }

        scene.tavernElements.push(...cardEls);
      },
    });
  });

  // 하단 "소환" 버튼 + 위에 충전 타이머 pill (보스 타이머와 동일 패턴, 더 작게)
  const btnW = 120, btnH = 54;
  const btnY = popupCY + popupH / 2 - btnH / 2 - 32;
  const infoY = btnY - btnH / 2 - 14;
  // 타이머 pill BG (원본 비율 유지) — 보스 타이머와 같은 sprite, 작은 사이즈
  const pillH = 20;
  const pillW = pillH * (255 / 61); // ≈ 84
  const infoPillBg = scene.add.image(popupCX, infoY, 'ui_timer_pill_bg')
    .setDisplaySize(pillW, pillH).setDepth(103).setAlpha(0.7);
  // 시계 아이콘 (pill보다 살짝 큼)
  const infoIconSize = pillH + 4;
  const infoIconX = popupCX - pillW / 2 + infoIconSize / 2 - 3;
  const infoIcon = scene.add.image(infoIconX, infoY, 'ui_icon_timer')
    .setDisplaySize(infoIconSize, infoIconSize).setDepth(104);
  // 텍스트 (시간) — pill 우측 영역 가운데
  const infoTextXClock = (infoIconX + infoIconSize / 2 + (popupCX + pillW / 2)) / 2; // 시계 보일 때(쿨다운)
  const infoTextXCenter = popupCX;                                                    // 시계 없을 때(무료 가능) — pill 중앙
  const infoText = scene.add.text(infoTextXClock, infoY, '', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '11px',
    color: '#FFE08A', stroke: '#000', strokeThickness: 2.5,
  }).setOrigin(0.5).setDepth(104);
  const summonBtn = scene.add.image(popupCX, btnY, 'ui_hero_btn_register')
    .setDisplaySize(btnW, btnH).setDepth(103).setInteractive({ useHandCursor: true });
  const summonLabel = scene.add.text(popupCX - 30, btnY, '소환', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '16px',
    color: '#FFFFFF', stroke: '#000', strokeThickness: 3,
    shadow: { offsetX: 0, offsetY: 4, color: '#000', blur: 6, fill: true },
  }).setOrigin(0.5).setDepth(104);
  const summonGem = scene.add.image(popupCX + 4, btnY, 'ui_rb_icon_gem')
    .setDisplaySize(18, 18).setDepth(104);
  const summonCost = scene.add.text(popupCX + 16, btnY, `${GACHA_COST}`, {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '15px',
    color: '#FFFFFF', stroke: '#000', strokeThickness: 3,
    shadow: { offsetX: 0, offsetY: 4, color: '#000', blur: 6, fill: true },
  }).setOrigin(0, 0.5).setDepth(104);
  scene.tavernSummonBtn = {
    bg: summonBtn, label: summonLabel, gem: summonGem, cost: summonCost,
    info: infoText, infoPill: infoPillBg, infoIcon: infoIcon, infoTextXClock, infoTextXCenter,
  };
  refreshTavernSummonBtn(scene);
  summonBtn.on('pointerup', () => summonTavernHeroes(scene));
  elements.push(infoPillBg, infoIcon, infoText, summonBtn, summonLabel, summonGem, summonCost);

  // 1초마다 타이머/스택 갱신
  scene.tavernInfoTimer = scene.time.addEvent({
    delay: 1000, loop: true,
    callback: () => { refillTavernStock(); refreshTavernSummonBtn(scene); },
  });

  scene.tavernElements = elements;
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// 일일 자정 reset + 무료 사용 cooldown 상태 갱신.
function refillTavernStock() {
  const today = todayKey();
  if (tavernResetDay !== today) {
    tavernFreeStock = TAVERN_FREE_MAX;
    tavernNextRefillAt = 0;
    tavernResetDay = today;
  }
}

function isTavernFreeReady() {
  refillTavernStock();
  return tavernFreeStock > 0 && Date.now() >= tavernNextRefillAt;
}

function refreshTavernSummonBtn(scene) {
  const b = scene.tavernSummonBtn;
  if (!b) return;
  refillTavernStock();
  const freeReady = isTavernFreeReady();           // 무료 사용 가능
  const inCooldown = tavernFreeStock > 0 && Date.now() < tavernNextRefillAt;
  const capped = tavernFreeStock <= 0;              // 일일 cap 다 씀
  const canGem = gems >= GACHA_COST;
  const enabled = freeReady || canGem;

  // 버튼 색 — 무료 가능 = 초록(hero_btn_register), 무료 X = 보라(btn_purple)
  b.bg.setTexture(freeReady ? 'ui_hero_btn_register' : 'ui_btn_purple');
  b.bg.setDisplaySize(120, 54);
  if (enabled) b.bg.clearTint(); else b.bg.setTint(0xAAAAAA);

  // 보석 비용 표시 — 무료 가능하면 숨김, 무료 X면 표시
  if (freeReady) {
    b.gem.setVisible(false);
    b.cost.setVisible(false);
    b.label.x = b.bg.x;
  } else {
    b.gem.setVisible(true);
    b.cost.setVisible(true);
    b.label.x = b.bg.x - 30;
    if (canGem) {
      b.gem.setAlpha(1);
      b.cost.setColor('#FFFFFF');
    } else {
      b.gem.setAlpha(0.55);
      b.cost.setColor('#888888');
    }
  }
  b.label.setColor(enabled ? '#FFFFFF' : '#888888');

  // pill 표시 조건:
  // - 쿨다운 진행 중 → "X/5 · M:SS" 표시
  // - 일일 cap 다 씀 → pill 숨김 (보석만 사용 가능)
  // - 무료 가능 (쿨다운 끝 + stock > 0) → "X/5"만 (timer X)
  if (b.info) {
    if (capped) {
      b.infoPill && b.infoPill.setVisible(false);
      b.infoIcon && b.infoIcon.setVisible(false);
      b.info.setText('');
    } else if (inCooldown) {
      b.infoPill && b.infoPill.setVisible(true);
      b.infoIcon && b.infoIcon.setVisible(true);
      const remainMs = Math.max(0, tavernNextRefillAt - Date.now());
      b.info.setText(`${tavernFreeStock}/${TAVERN_FREE_MAX} · ${formatMmSs(remainMs)}`);
      b.info.x = b.infoTextXClock; // 시계 옆 우측 영역
    } else {
      // 무료 가능 (쿨다운 끝) — 시계 없으니 pill 중앙 정렬
      b.infoPill && b.infoPill.setVisible(true);
      b.infoIcon && b.infoIcon.setVisible(false);
      b.info.setText(`무료 ${tavernFreeStock}/${TAVERN_FREE_MAX}`);
      b.info.x = b.infoTextXCenter;
    }
  }
}

function formatMmSs(ms) {
  const totalSec = Math.ceil(ms / 1000);
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return `${mm}:${String(ss).padStart(2, '0')}`;
}

// === 가이드 미션 진행 판정 ====================================================
// 미션 타입별 현재 진행 값. 전부 기존 게임 상태에서 즉시 산출 (별도 추적 불필요).
function guideMissionCurrent(scene, m) {
  switch (m.type) {
    case 'kills':  return kills;
    case 'stage':  return Math.max(0, stage - 1); // 클리어한 스테이지 수 (현재 stage 진행 중 = stage-1까지 클리어)
    case 'summon': return totalSummons;
    case 'castle': return castleLevel;
    case 'train':  return Math.max(0, ...Object.values(classTrainLevels || {}));
    case 'heroLevel': {                // 아무 영웅의 최고 레벨(=enhance)
      const inv = (scene && scene.heroInventory) || {};
      let mx = 0;
      Object.keys(inv).forEach((k) => { mx = Math.max(mx, clampEnhance(inv[k].enhance)); });
      return mx;
    }
    case 'nickname': {                 // 임시 닉네임(기사_/디폴트) → 사용자 변경 시 1
      const n = castleNickname || '';
      if (!n || n === CASTLE_DEFAULT_NAME) return 0;
      if (/^기사_\d+$/.test(n)) return 0; // 자동 생성 닉네임은 미변경으로 간주
      return 1;
    }
    case 'deploy': {                   // 슬롯에 배치된 영웅 수 (1 이상이면 달성)
      const inv = (scene && scene.heroInventory) || {};
      let cnt = 0;
      Object.keys(inv).forEach((k) => { if (inv[k].deployedSlot !== null && inv[k].deployedSlot !== undefined) cnt++; });
      return cnt;
    }
    default: return 0;
  }
}

// 현재 진행 중인 가이드 미션 객체 — 전부 완료했으면 null.
function currentGuideMission() {
  return guideStep < GUIDE_MISSIONS.length ? GUIDE_MISSIONS[guideStep] : null;
}

// 미션 타입 → 유저향 카테고리 라벨 (타이틀 [ ] 표기용). 게임 탭 분류와 일관.
function guideMissionCategory(m) {
  switch (m.type) {
    case 'kills':     return '전투';
    case 'stage':     return '진행';
    case 'summon':    return '영웅';
    case 'heroLevel': return '영웅';
    case 'castle':    return '내정';
    case 'train':     return '훈련';
    case 'nickname':  return '가이드';
    case 'deploy':    return '영웅';
    default:          return '';
  }
}

// 현재 미션의 보상을 받을 수 있는가? (조건 충족 + 아직 미수령 상태)
function isGuideRewardReady(scene) {
  const m = currentGuideMission();
  if (!m) return false;
  return guideMissionCurrent(scene, m) >= m.target;
}

// 보상 텍스트 (위젯/패널 공용)
function guideRewardLabel(reward) {
  if (reward.gems) return `보석 ${reward.gems}`;
  if (reward.gold) return `골드 ${reward.gold}`;
  return '';
}

// 미션 완료 보상 수령 — 위젯 클릭 시 발동. 연출 후 보상 지급 + 다음 미션으로.
function playGuideClaim(scene) {
  const gw = scene.guideWidget;
  const m = currentGuideMission();
  if (!gw || !m || gw._claiming) return;
  gw._claiming = true;
  stopGuideReadyPulse(gw);     // 대기 펄스 정지 (수령 연출로 전환)
  gw.dot.setVisible(false);

  // 1) BG 초록 플래시
  gw.bg.setTint(0x2E7D52);
  scene.time.delayedCall(200, () => gw.bg && gw.bg.setTint(0x0A1A36));
  // 2) 보상 슬롯 + 아이콘 펄스 (수령 강조)
  [gw.rewardSlot, gw.rewardIcon].forEach((o) => {
    if (!o) return;
    scene.tweens.add({
      targets: o, scaleX: o.scaleX * 1.3, scaleY: o.scaleY * 1.3,
      duration: 150, yoyo: true, ease: 'Quad.easeOut',
    });
  });
  // 3) "미션 완료!" 팝업 (위젯 위로 떠오르며 페이드)
  const done = scene.add.text(gw.cx, gw.y - 2, '미션 완료!', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '16px',
    color: '#4ADE80', stroke: '#04200F', strokeThickness: 4,
  }).setOrigin(0.5, 1).setDepth(60);
  scene.tweens.add({
    targets: done, y: gw.y - 24, alpha: 0, duration: 900, ease: 'Quad.easeOut',
    onComplete: () => done.destroy(),
  });
  // 4) 보상 아이콘이 보상 슬롯에서 HUD 재화 카운터로 빨려감 (보스 결과와 동일 연출)
  const sx = gw.rewardIcon.x, sy = gw.rewardIcon.y;
  if (m.reward.gold) flyRewardToHud(scene, sx, sy, 'ui_rb_icon_coin', scene.uiGold, 8, 0);
  if (m.reward.gems) flyRewardToHud(scene, sx, sy, 'ui_rb_icon_gem', scene.uiGems, 8, 0);

  // 5) 보상 지급 후 부드러운 미션 전환 — 현재 내용 페이드아웃 → 다음 미션 페이드인 + 통통 등장
  scene.time.delayedCall(760, () => {
    if (m.reward.gold) { gold += m.reward.gold; updateGoldUI(scene); }
    if (m.reward.gems) { gems += m.reward.gems; updateGemsUI(scene); }
    guideStep += 1;
    saveGame(scene);
    const content = [gw.trophy, gw.title, gw.descText, gw.progBg, gw.progFill,
      gw.progText, gw.rewardSlot, gw.rewardIcon, gw.rewardText];
    scene.tweens.add({
      targets: content, alpha: 0, duration: 160, ease: 'Quad.easeIn',
      onComplete: () => {
        gw._claiming = false;
        content.forEach((o) => o && o.setAlpha(1)); // alpha 원복 (표시는 refresh가 제어)
        refreshGuideWidget(scene);                  // 다음 미션 갱신 (전부 완료면 숨김)
        if (currentGuideMission() && bossPhase !== 'boss-fight') {
          // 다음 미션 등장 — 페이드인 + 설명 통통
          content.forEach((o) => o && o.setAlpha(0));
          scene.tweens.add({ targets: content, alpha: 1, duration: 280, ease: 'Quad.easeOut' });
          scene.tweens.add({
            targets: gw.descText, scaleX: 1.12, scaleY: 1.12,
            duration: 200, yoyo: true, ease: 'Quad.easeOut',
          });
        }
      },
    });
  });
}

// === 가이드 미션 메인 위젯 (전장 좌상단) =====================================
// 좌측 트로피 아이콘 + 미션/진행바 + 우측 보상 아이콘. 완료 시 자동 수령(연출).
function buildGuideWidget(scene) {
  const w = 290, h = 72;
  const x = (GAME_W - w) / 2;                   // 가로 중앙 (세븐나이츠처럼)
  const y = GAME_H - BOTTOM_UI_HEIGHT - h - 27; // 하단 UI 위 + 0.5cm(~19px) 더 올림 (캐릭터 영역 겹침 회피)
  const cx = x + w / 2, cy = y + h / 2;

  const bg = scene.add.nineslice(cx, cy, 'ui_rb_bg', null, w, h, 7, 7, 7, 7)
    .setDepth(48).setTint(0x0A1A36).setAlpha(0.5);

  const tx = x + 12; // 텍스트/진행바 좌단
  // 트로피 — 위젯 좌상단에 크게, 박스를 살짝 벗어나게 돌출 (엠블럼 느낌). 크게 그릴수록 자글거림도 완화.
  const trophy = scene.add.image(x + 18, y + 10, 'ui_icon_trophy')
    .setDisplaySize(44, 28).setDepth(49);
  const title = scene.add.text(x + 44, y + 15, '', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '11px',
    color: '#FFD577', stroke: '#1F0410', strokeThickness: 3,
  }).setOrigin(0, 0.5).setDepth(49);
  const descText = scene.add.text(tx, y + 37, '', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '15px',
    color: '#FFFFFF', stroke: '#000000', strokeThickness: 3,
  }).setOrigin(0, 0.5).setDepth(49);

  // 진행바 (graphics)
  const barX = tx, barY = y + 59, barW = 178, barH = 9;
  const progBg = scene.add.graphics().setDepth(49);
  const progFill = scene.add.graphics().setDepth(49);
  const progText = scene.add.text(barX + barW + 6, barY, '', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '12px',
    color: '#FFFFFF', stroke: '#000000', strokeThickness: 2.5,
  }).setOrigin(0, 0.5).setDepth(49);

  // 우측 보상 — 보상 슬롯 규약 (슬롯 BG + 아이콘 정중앙 + 수량 우하단). 단일 재화.
  const slotSize = 46;
  const rsCX = x + w - 30, rsCY = cy;
  const rewardSlot = scene.add.image(rsCX, rsCY, 'ui_reward_slot_gem')
    .setDisplaySize(slotSize, slotSize).setDepth(49);
  const rewardIcon = scene.add.image(rsCX, rsCY, 'ui_rb_icon_gem')
    .setDisplaySize(slotSize * 0.74, slotSize * 0.74).setDepth(50);
  const rewardText = scene.add.text(rsCX + slotSize / 2 - 4, rsCY + slotSize / 2 - 4, '', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '12px',
    color: '#FFFFFF', stroke: '#000000', strokeThickness: 3,
    shadow: { offsetX: 0, offsetY: 1, color: '#000', blur: 2, fill: true },
  }).setOrigin(1, 1).setDepth(51);

  // 레드닷 — 완료(수령 가능) 알림, 우상단 모서리
  const dot = scene.add.image(x + w - 7, y + 7, 'ui_red_dot')
    .setDisplaySize(15, 15).setDepth(52);

  // 위젯 전체 탭 → 보상 수령 (완료 시에만 입력 활성). pointerup으로 뒤 클릭 새는 것 방지.
  const zone = scene.add.zone(cx, cy, w, h).setInteractive({ useHandCursor: true }).setDepth(51);
  zone.on('pointerup', () => {
    if (isGuideRewardReady(scene)) playGuideClaim(scene);
  });

  scene.guideWidget = {
    bg, trophy, title, descText, progBg, progFill, progText,
    rewardSlot, rewardIcon, rewardText, dot, zone,
    x, y, w, h, cx, cy, barX, barY, barW, barH,
    trophyBaseS: [trophy.scaleX, trophy.scaleY],
    slotBaseS: [rewardSlot.scaleX, rewardSlot.scaleY, rewardIcon.scaleX, rewardIcon.scaleY],
    slotSize,
    _claiming: false, _readyFx: null,
  };
  refreshGuideWidget(scene);
}

function refreshGuideWidget(scene) {
  const gw = scene.guideWidget;
  if (!gw || gw._claiming) return; // 수령 연출 중엔 갱신 보류
  const m = currentGuideMission();
  const visible = !!m && bossPhase !== 'boss-fight'; // 전부 완료 or 보스전이면 숨김
  const els = [gw.bg, gw.trophy, gw.title, gw.descText, gw.progBg, gw.progFill,
    gw.progText, gw.rewardSlot, gw.rewardIcon, gw.rewardText, gw.zone];
  els.forEach((o) => o && o.setVisible(visible));
  if (!visible) {
    gw.dot.setVisible(false);
    if (gw.zone && gw.zone.input) gw.zone.input.enabled = false;
    stopGuideReadyPulse(gw);
    return;
  }

  const cat = guideMissionCategory(m);
  gw.title.setText(`가이드 미션 ${guideStep + 1}${cat ? ` [${cat}]` : ''}`);
  gw.descText.setText(m.desc);
  // 보상 표시 — 보상 슬롯 규약(골드=흰 슬롯, 보석=보라 슬롯) + 아이콘 + 수량
  const isGem = !!m.reward.gems;
  // setTexture는 scale 유지 → 텍스처 원본 크기가 다르면 찌그러짐. 교체 후 displaySize 재설정.
  gw.rewardSlot.setTexture(isGem ? 'ui_reward_slot_gem' : 'ui_reward_slot_gold')
    .setDisplaySize(gw.slotSize, gw.slotSize);
  gw.rewardIcon.setTexture(isGem ? 'ui_rb_icon_gem' : 'ui_rb_icon_coin')
    .setDisplaySize(gw.slotSize * 0.74, gw.slotSize * 0.74);
  gw.rewardText.setText(`${isGem ? m.reward.gems : m.reward.gold}`);

  const cur = Math.min(guideMissionCurrent(scene, m), m.target);
  const ready = cur >= m.target;

  // 진행바
  gw.progBg.clear();
  gw.progFill.clear();
  gw.progBg.fillStyle(0x1A2A50, 1).fillRoundedRect(gw.barX, gw.barY - gw.barH / 2, gw.barW, gw.barH, 3);
  const pct = m.target > 0 ? Math.min(1, cur / m.target) : 0;
  const fillW = gw.barW * pct;
  if (fillW > 0) {
    // 진행도 0이면 아무것도 안 그림. 너비가 작을 땐 radius를 너비에 맞춰 줄여 깨짐 방지.
    const r = Math.min(gw.barH / 2, fillW / 2);
    gw.progFill.fillStyle(ready ? 0x4ADE80 : 0xFFD577, 1)
      .fillRoundedRect(gw.barX, gw.barY - gw.barH / 2, fillW, gw.barH, r);
  }
  gw.progText.setText(`${cur}/${m.target}`);

  // 완료(수령 가능) — 텍스트 없이 연출로 어필: 레드닷 + 트로피 펄스. 클릭해야 수령됨.
  gw.dot.setVisible(ready);
  if (gw.zone && gw.zone.input) gw.zone.input.enabled = ready;
  if (ready) startGuideReadyPulse(scene, gw);
  else stopGuideReadyPulse(gw);
}

// 수령 가능 상태 어필 — 동적 연출: BG 빛남 + 트로피/보상 슬롯 통통 + 보상 슬롯 radar 링 (클릭 유도)
function startGuideReadyPulse(scene, gw) {
  if (gw._readyFx) return; // 이미 진행 중
  const fx = { tweens: [], objs: [] };
  const [tbx, tby] = gw.trophyBaseS;
  // BG 은은하게 빛남
  fx.tweens.push(scene.tweens.add({
    targets: gw.bg, alpha: 0.85, duration: 480, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  }));
  // 트로피 통통 (대기 어필 — 보상 슬롯/아이콘은 정적 유지)
  fx.tweens.push(scene.tweens.add({
    targets: gw.trophy, scaleX: tbx * 1.18, scaleY: tby * 1.18,
    duration: 340, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  }));
  gw._readyFx = fx;
}

function stopGuideReadyPulse(gw) {
  if (!gw._readyFx) return;
  gw._readyFx.tweens.forEach((t) => t && t.stop());
  gw._readyFx.objs.forEach((o) => o && o.destroy());
  gw._readyFx = null;
  // 펄스로 바뀐 alpha/scale 원복
  if (gw.bg) gw.bg.setAlpha(0.5);
  if (gw.trophy) gw.trophy.setScale(gw.trophyBaseS[0], gw.trophyBaseS[1]);
}

function summonTavernHeroes(scene) {
  if (!scene.tavernCardSlots) return;
  refillTavernStock();
  // 무료 사용 가능: stock > 0 + cooldown 끝
  if (isTavernFreeReady()) {
    tavernFreeStock -= 1;
    // 다음 무료 사용까지 5분 쿨다운 (남은 stock이 있을 때만)
    if (tavernFreeStock > 0) {
      tavernNextRefillAt = Date.now() + TAVERN_REFILL_MS;
    } else {
      tavernNextRefillAt = 0; // 일일 cap 다 씀, 자정까지 wait
    }
  } else {
    if (gems < GACHA_COST) { flashInsufficientGems(scene); return; }
    gems -= GACHA_COST;
    totalGemsSpent += GACHA_COST;
    updateGemsUI(scene);
  }
  totalSummons += 1; // 가이드 미션 'summon' 판정용 누적 카운터 (무료/유료 공통)
  saveGame(scene);
  refreshTavernSummonBtn(scene);
  updateTavernButton(scene); // 무료 stock/쿨다운 변화 → 필드 버튼 wobble·말풍선 즉시 갱신
  // 이전 reveal된 카드 정리 + 뒷면 다시 표시
  scene.tavernCardSlots.forEach((slot) => {
    slot.transient.forEach((el) => el && el.destroy && el.destroy());
    slot.transient = [];
    if (!slot.back || !slot.back.scene) {
      slot.back = scene.add.image(slot.x, slot.y, 'ui_card_back')
        .setDisplaySize(slot.w, slot.h).setDepth(103);
      scene.tavernElements.push(slot.back);
    } else {
      slot.back.setScale((slot.w / slot.back.width), (slot.h / slot.back.height));
      slot.back.setVisible(true);
    }
  });
  scene.tavernRevealed = true;
  const candidates = rollGachaCandidates(3);
  candidates.forEach((def, i) => {
    const slot = scene.tavernCardSlots[i];
    if (!slot) return;
    slot._def = def; // 선택 시 어느 슬롯인지 매칭용
    const back = slot.back;
    const flipDelay = i * 280;
    const flipDuration = 220;
    // 뒷면 wobble
    scene.tweens.add({
      targets: back, angle: { from: -3, to: 3 },
      duration: 80, yoyo: true, repeat: 2, delay: flipDelay + 100,
    });
    // 1단계: scaleX 1 → 0
    scene.tweens.add({
      targets: back, scaleX: 0,
      duration: flipDuration, delay: flipDelay + 300,
      ease: 'Quad.easeIn',
      onComplete: () => {
        if (!scene.tavernElements) return;
        back.setVisible(false);
        // 등급 후광
        const pal = INV_CARD_PALETTE[def.rarity] || INV_CARD_PALETTE.COMMON;
        const glow = scene.add.image(slot.x, slot.y, 'inv_card_glow')
          .setDisplaySize(slot.w * 0.4, slot.w * 0.4).setDepth(102).setAlpha(0)
          .setTint(pal.glow).setBlendMode(Phaser.BlendModes.ADD);
        scene.tweens.add({ targets: glow, alpha: 0.95,
          scaleX: (slot.w * 1.7) / glow.width, scaleY: (slot.w * 1.7) / glow.width,
          duration: 220, ease: 'Quad.easeOut' });
        scene.tweens.add({ targets: glow, alpha: 0, duration: 500, delay: 220,
          ease: 'Quad.easeIn', onComplete: () => glow.destroy() });
        // 흰 플래시
        const flash = scene.add.image(slot.x, slot.y, 'inv_card_glow')
          .setDisplaySize(40, 40).setDepth(108).setAlpha(0)
          .setBlendMode(Phaser.BlendModes.ADD);
        scene.tweens.add({ targets: flash, alpha: 0.9,
          scaleX: (slot.w * 1.4) / flash.width, scaleY: (slot.w * 1.4) / flash.width,
          duration: 130, ease: 'Quad.easeOut',
          onComplete: () => scene.tweens.add({ targets: flash, alpha: 0, duration: 320,
            onComplete: () => flash.destroy() }) });
        // 앞면 카드 + 선택 버튼
        const cardEls = drawTavernCard(scene, slot.x, slot.y, def, slot.w, slot.h);
        const selectEls = buildTavernSelectButton(scene, slot.x, slot.y, def, slot.h, slot);
        const cardBody = cardEls[0];
        cardBody.scaleX = 0; cardBody.scaleY = 0.92;
        selectEls.forEach((el) => { if (el.setAlpha) el.setAlpha(0); else el.alpha = 0; });
        scene.tweens.add({ targets: cardBody, scaleX: 1, scaleY: 1,
          duration: flipDuration + 40, ease: 'Back.easeOut' });
        selectEls.forEach((el) => { el._baseY = el.y; el.y += 6; });
        scene.tweens.add({ targets: selectEls, alpha: 1,
          duration: 240, delay: flipDuration - 40, ease: 'Quad.easeOut' });
        selectEls.forEach((el) => {
          if (el._baseY !== undefined) {
            scene.tweens.add({ targets: el, y: el._baseY,
              duration: 240, delay: flipDuration - 40, ease: 'Back.easeOut' });
          }
        });
        // sparkle
        for (let k = 0; k < 4; k++) {
          const sang = (k / 4) * Math.PI * 2 + Math.PI / 4;
          const sx = slot.x + Math.cos(sang) * (slot.w * 0.45);
          const sy = slot.y + Math.sin(sang) * (slot.h * 0.45);
          const spark = scene.add.circle(slot.x, slot.y, 3, 0xFFFFFF)
            .setDepth(109).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
          scene.tweens.add({ targets: spark, x: sx, y: sy, alpha: 1,
            duration: 240, delay: 60, ease: 'Quad.easeOut' });
          scene.tweens.add({ targets: spark, alpha: 0, scaleX: 0.3, scaleY: 0.3,
            duration: 280, delay: 320, ease: 'Quad.easeIn',
            onComplete: () => spark.destroy() });
          slot.transient.push(spark);
        }
        slot.transient.push(glow, flash, ...cardEls, ...selectEls);
        scene.tavernElements.push(...cardEls, ...selectEls);
      },
    });
  });
}

function closeTavern(scene) {
  if (!scene.tavernElements) return;
  scene.tavernElements.forEach((el) => { if (el.destroy) el.destroy(); });
  scene.tavernElements = null;
  scene.tavernCardSlots = null;
  scene.tavernSummonBtn = null;
  scene.tavernRevealed = false;
  if (scene.tavernInfoTimer) { scene.tavernInfoTimer.remove(); scene.tavernInfoTimer = null; }
  scenePaused = false;
}

// 카드 본체만 그림 (선택 버튼은 별도 — buildTavernSelectButton)
function drawTavernCard(scene, x, y, def, cardW, cardH) {
  const els = [];
  cardW = cardW || 124;
  cardH = cardH || 170;

  // 인벤 카드 컨테이너 재활용 — 레벨 chip / 배치 표시 제외 (주점 영입용)
  const fakeEntry = { heroId: def.id, enhance: 0, deployedSlot: null };
  const card = makeInventoryCardContainer(scene, fakeEntry, x, y, cardW, cardH, {
    hideLevel: true,
    hideDeployed: true,
  });
  card.setDepth(103);
  els.push(card);

  return els;
}

// 카드 아래 노란 "선택" 버튼 (Layer Lab K-229 노란 sprite)
function buildTavernSelectButton(scene, x, y, def, cardH, slot) {
  const els = [];
  const btnH = 36;
  const btnW = btnH * (313 / 135); // 원본 비율 (≈ 83)
  const btnY = y + cardH / 2 + 22;
  const btnBg = scene.add.image(x, btnY, 'ui_btn_yellow')
    .setDisplaySize(btnW, btnH).setDepth(104).setInteractive({ useHandCursor: true });
  const label = scene.add.text(x, btnY, '선택', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '15px',
    color: '#FFFFFF', stroke: '#000', strokeThickness: 3,
    shadow: { offsetX: 0, offsetY: 2, color: '#000', blur: 3, fill: true },
  }).setOrigin(0.5).setDepth(105);
  btnBg.on('pointerup', () => pickFromTavern(scene, def, slot));
  els.push(btnBg, label);
  return els;
}

function pickFromTavern(scene, def, slot) {
  // 비용은 이미 summonTavernHeroes 시점에 차감됨 — 여기선 영웅만 영입
  const entry = scene.heroInventory[def.id];
  let isDup = false;
  let enhanceAfter = 0;
  if (entry) {
    isDup = true;
    const before = clampEnhance(entry.enhance);
    if (before < ENHANCE_CAP) entry.enhance = before + 1;
    enhanceAfter = entry.enhance;
    if (entry.deployedSlot !== null) {
      const slot = scene.heroSlots[entry.deployedSlot];
      const hero = slot && slot.hero;
      if (hero) {
        hero.enhance = entry.enhance;
        const prevMaxHp = hero.maxHp;
        applyHeroStats(hero);
        const hpPct = prevMaxHp > 0 ? hero.hp / prevMaxHp : 1;
        hero.hp = Math.max(1, Math.round(hero.maxHp * hpPct));
        flashEnhanceUp(scene, hero);
      }
    }
  } else {
    scene.heroInventory[def.id] = { heroId: def.id, enhance: 0, deployedSlot: null };
  }
  // 선택한 카드만 뒷면으로 — slot reference 직접 사용 (같은 def 중복 시 첫 번째 매치 X)
  resetSingleTavernCard(scene, slot);
  // 주점은 닫지 않고 유지 — banner가 위에 떠 있음
  showHeroAcquiredBanner(scene, def, isDup, enhanceAfter);
  saveGame(scene);
  // 튜토리얼 step2 hook — 영웅 소환 완료 시 자동 진행
  if (scene._onHeroAcquiredTutorial) {
    const cb = scene._onHeroAcquiredTutorial;
    scene._onHeroAcquiredTutorial = null;
    try { cb(); } catch (e) {}
  }
}

// 특정 slot의 카드만 뒷면으로 복귀 + 남은 다른 카드의 선택 버튼을 광고 보기 버튼으로 교체
function resetSingleTavernCard(scene, slot) {
  if (!slot) return;
  // 진행 중인 tween 정리
  scene.tweens.killTweensOf(slot.back);
  slot.transient.forEach((el) => {
    if (el && el.destroy) {
      scene.tweens.killTweensOf(el);
      el.destroy();
    }
  });
  slot.transient = [];
  slot._def = null;
  // 뒷면 재표시 (angle/scale reset)
  if (!slot.back || !slot.back.scene) {
    slot.back = scene.add.image(slot.x, slot.y, 'ui_card_back')
      .setDisplaySize(slot.w, slot.h).setDepth(103);
    if (scene.tavernElements) scene.tavernElements.push(slot.back);
  } else {
    slot.back.setVisible(true);
    slot.back.angle = 0;
    slot.back.setDisplaySize(slot.w, slot.h);
  }
  // 남은 다른 슬롯의 선택 버튼 → 광고 보기 버튼으로 교체
  if (scene.tavernCardSlots) {
    scene.tavernCardSlots.forEach((other) => {
      if (other === slot || !other._def) return;
      swapSelectButtonToAd(scene, other);
    });
  }
}

// 슬롯의 노란 선택 버튼을 초록 광고 보기 버튼으로 교체
function swapSelectButtonToAd(scene, slot) {
  if (!slot || slot._adSwapped) return;
  slot._adSwapped = true;
  // 기존 select button (노란 sprite + "선택" 텍스트) 찾아서 destroy
  // transient에 카드 + select button 다 들어있음. select button만 떼기 어렵.
  // 단순화: 모든 transient 정리 후 카드만 다시 그리고 광고 버튼 추가
  const def = slot._def;
  slot.transient.forEach((el) => {
    if (el && el.destroy) { scene.tweens.killTweensOf(el); el.destroy(); }
  });
  slot.transient = [];
  // 카드 다시 그림 (앞면)
  const cardEls = drawTavernCard(scene, slot.x, slot.y, def, slot.w, slot.h);
  const adEls = buildTavernAdButton(scene, slot.x, slot.y, def, slot.h, slot);
  const all = [...cardEls, ...adEls];
  slot.transient.push(...all);
  if (scene.tavernElements) scene.tavernElements.push(...all);
}

// 광고 보기 버튼 — 영웅 등록(초록) 버튼 sprite 재사용 + 좌측 영상 클래퍼 아이콘 overlay
function buildTavernAdButton(scene, x, y, def, cardH, slot) {
  const els = [];
  // 선택 버튼과 동일 사이즈 (노란 버튼 buildTavernSelectButton 기준)
  const btnH = 36;
  const btnW = btnH * (313 / 135); // K-229 비율 (선택 버튼과 동일)
  const btnY = y + cardH / 2 + 22;
  const btnBg = scene.add.image(x, btnY, 'ui_hero_btn_register')
    .setDisplaySize(btnW, btnH).setDepth(104).setInteractive({ useHandCursor: true });
  // 영상 클래퍼 아이콘 — 40% 축소 (btnH+4 → 0.6 배)
  const iconSize = (btnH + 4) * 0.6;
  const iconX = x - btnW / 2 + iconSize / 2 + 8;
  const adIcon = scene.add.image(iconX, btnY, 'ui_icon_ad_video')
    .setDisplaySize(iconSize, iconSize).setDepth(106);
  // "보기" 텍스트 — 버튼 우측 영역 가운데
  const labelX = (iconX + iconSize / 2 + (x + btnW / 2)) / 2;
  const label = scene.add.text(labelX, btnY, '보기', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '15px',
    color: '#FFFFFF', stroke: '#000', strokeThickness: 3,
    shadow: { offsetX: 0, offsetY: 2, color: '#000', blur: 3, fill: true },
  }).setOrigin(0.5).setDepth(105);
  btnBg.on('pointerup', () => {
    // 광고 시스템 미연동 — 일단 즉시 영입
    showToast(scene, '광고 시스템 준비 중 — 임시 영입');
    pickFromTavern(scene, def, slot);
  });
  els.push(btnBg, adIcon, label);
  return els;
}

// 영웅 획득 연출 — dim BG + 큰 영웅 카드 + 등급 후광 + ribbon + sparkle
function showHeroAcquiredBanner(scene, def, isDup, enhanceLevel) {
  const cx = CENTER.x, cy = CENTER.y;
  const els = [];
  // dim BG — Graphics + setScrollFactor(0): 카메라 transform 무시, 화면 좌표 그대로
  const canvasW = scene.game.scale.gameSize.width;
  const canvasH = scene.game.scale.gameSize.height;
  const dim = scene.add.graphics().setDepth(999).setScrollFactor(0);
  dim.fillStyle(0x000000, 1);
  dim.fillRect(-canvasW, -canvasH, canvasW * 3, canvasH * 3);
  dim.setAlpha(0);
  dim._camAssigned = true;
  // 클릭 처리용 zone (어차피 setScrollFactor 0)
  const dimHit = scene.add.zone(cx, CENTER.y, GAME_W * 4, GAME_H * 4)
    .setOrigin(0.5).setDepth(999).setScrollFactor(0).setInteractive();
  dimHit._camAssigned = true;
  scene.tweens.add({ targets: dim, alpha: 0.8, duration: 250 });
  els.push(dim, dimHit);

  // (이전 큰 등급 후광 inv_card_glow 제거 — 사용자 요청 "동그란 빛" 안 보이게)
  ensureRadialGlowTexture(scene);

  // 등급 ribbon — 보스 VICTORY banner와 동일 사이즈/폰트
  const ribbonKey = 'ui_ribbon_wide_blue';
  const ribbonH = 52;
  const ribbonW = ribbonH * (659 / 136);
  const ribbon = scene.add.image(cx, cy - 150, ribbonKey).setDepth(1002).setAlpha(0);
  ribbon.setDisplaySize(ribbonW, ribbonH);
  const baseSX = ribbon.scaleX, baseSY = ribbon.scaleY;
  ribbon.scaleX = baseSX * 0.7;
  ribbon.scaleY = baseSY * 0.7;
  const ribbonLabel = scene.add.text(cx, cy - 153, '영웅 획득!', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '20px',
    color: '#FFFFFF', stroke: '#000000', strokeThickness: 4,
    shadow: { offsetX: 0, offsetY: 2, color: '#000', blur: 3, fill: true },
    padding: { x: 6, y: 4 },
  }).setOrigin(0.5).setDepth(1003).setAlpha(0);
  if (ribbonLabel.setLetterSpacing) ribbonLabel.setLetterSpacing(3);
  scene.tweens.add({
    targets: ribbon, alpha: 1, scaleX: baseSX, scaleY: baseSY,
    duration: 350, delay: 150, ease: 'Back.easeOut',
  });
  scene.tweens.add({
    targets: ribbonLabel, alpha: 1,
    duration: 350, delay: 150, ease: 'Quad.easeOut',
  });
  els.push(ribbon, ribbonLabel);

  // 큰 영웅 카드 (인벤 카드 컨테이너) — 강화 단계 표시 제거 (사용자 요청)
  const cardW = 180, cardH = 248;
  const fakeEntry = { heroId: def.id, enhance: 0, deployedSlot: null };
  const card = makeInventoryCardContainer(scene, fakeEntry, cx, cy + 30, cardW, cardH, {
    hideLevel: true,
    hideDeployed: true,
  });
  card.setDepth(1003).setAlpha(0).setScale(0.4);
  scene.tweens.add({
    targets: card, alpha: 1, scaleX: 1, scaleY: 1,
    duration: 480, delay: 200, ease: 'Back.easeOut',
  });
  els.push(card);

  // (흰 플래시 동그란 빛도 제거)

  // sparkle 다수 — 카드 둘레에서 사방으로 튀어나옴
  scene.time.delayedCall(500, () => {
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2 + Math.random() * 0.3;
      const r0 = cardW * 0.45;
      const r1 = cardW * 0.95;
      const sx0 = cx + Math.cos(ang) * r0;
      const sy0 = cy + 30 + Math.sin(ang) * r0;
      const sx1 = cx + Math.cos(ang) * r1;
      const sy1 = cy + 30 + Math.sin(ang) * r1;
      const spark = scene.add.circle(sx0, sy0, 4, 0xFFFFFF)
        .setDepth(1004).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
      scene.tweens.add({
        targets: spark, x: sx1, y: sy1, alpha: 1,
        duration: 250, ease: 'Quad.easeOut',
      });
      scene.tweens.add({
        targets: spark, alpha: 0, scaleX: 0.3, scaleY: 0.3,
        duration: 320, delay: 280, ease: 'Quad.easeIn',
        onComplete: () => spark.destroy(),
      });
    }
  });

  // 영웅 상세창 portrait 영역 (등급 K-276 BG + 영웅 portrait + 레벨 chip)
  const slotSize = 84;
  const slotCY = cy + 30 + cardH / 2 + slotSize / 2 + 12;
  const slotBgKey = RARITY_HERO_SLOT_MAIN[def.rarity] || 'ui_hero_slot_main_common';
  const slotBg = scene.add.image(cx, slotCY, slotBgKey)
    .setDisplaySize(slotSize, slotSize).setDepth(1003).setAlpha(0);
  // 영웅 sprite anim — idle → attack → walk → skill 순서 loop. 각 anim frame size에 맞춰 scale 조정.
  // (소환 결과 작은 네모 슬롯은 sprite anim 유지 — 사용자가 명시적으로 유지 요청)
  let slotPortrait;
  if (def.animKeys && def.portraitSheet) {
    slotPortrait = scene.add.sprite(cx, slotCY, def.portraitSheet, def.portraitSheetFrame || 0)
      .setDepth(1004).setAlpha(0);
    // scale은 idle frame H 기준 한 번만 고정 — anim마다 scale 변경하면 캐릭터 크기 튐.
    // 다른 anim(attack/skill 등)의 frame이 더 크면 검/지팡이 등이 슬롯 밖으로 살짝 튀어나옴(자연스러움).
    const targetH = slotSize - 16;
    const fixedScale = (targetH / def.portraitSheetSize.h) * (def.portraitScale || 1);
    slotPortrait.setScale(fixedScale);
    const seq = ['idle', 'attack', 'walk', 'skill'];
    const durations = { idle: 700, attack: 700, walk: 650, skill: 1000 };
    let seqIdx = 0;
    function playNextAnim() {
      if (!scene.tavernHeroAcqLive || !slotPortrait || !slotPortrait.scene) return;
      const key = def.animKeys[seq[seqIdx]];
      if (key && scene.anims.exists(key)) slotPortrait.play(key);
      const dur = durations[seq[seqIdx]] || 800;
      seqIdx = (seqIdx + 1) % seq.length;
      scene.time.delayedCall(dur, playNextAnim);
    }
    scene.time.delayedCall(550, playNextAnim);
  } else {
    const portraitScale = def.drawBody ? 1.0 : 2.4;
    slotPortrait = scene.add.container(cx, slotCY).setDepth(1004).setAlpha(0).setScale(portraitScale);
    drawHeroPortraitStatic(scene, def, slotPortrait);
  }
  const slotEls = [slotBg, slotPortrait];
  scene.tweens.add({
    targets: slotEls, alpha: 1,
    duration: 300, delay: 500, ease: 'Quad.easeOut',
  });
  els.push(...slotEls);

  // 말풍선 loop — 영웅 채터 라인 무작위. 위치는 작은 캐릭터 슬롯 바로 위.
  let chatBubble = null;
  function showChat() {
    if (!scene.tavernHeroAcqLive) return;
    if (chatBubble) { chatBubble.destroy(); chatBubble = null; }
    const line = Phaser.Utils.Array.GetRandom(HERO_CHATTER_LINES);
    // tip = 슬롯 위쪽 가운데. logical 좌표 그대로 (scrollFactor 안 건드림).
    const tipX = cx;
    const tipY = slotCY - slotSize / 2 + 17; // 0.5cm(≈19px) 아래로 — 캐릭터 위에 오버레이
    const bubble = drawSpeechBubble(scene, tipX, tipY, line, 1010);
    // 카메라 분배 무력화 — 양쪽 카메라에서 보이게
    if (bubble.bg) bubble.bg._camAssigned = true;
    if (bubble.txt) bubble.txt._camAssigned = true;
    chatBubble = bubble;
    scene.time.delayedCall(1900, () => {
      if (chatBubble === bubble) { bubble.destroy(); chatBubble = null; }
      if (scene.tavernHeroAcqLive) scene.time.delayedCall(600, showChat);
    });
  }
  scene.time.delayedCall(1100, showChat);

  // 하단 안내 — "탭하여 닫기"
  const hintText = scene.add.text(cx, cy + 30 + cardH / 2 + 120, '탭하여 닫기', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '14px',
    color: '#FFFFFF', stroke: '#000', strokeThickness: 3,
    shadow: { offsetX: 0, offsetY: 2, color: '#000', blur: 3, fill: true },
  }).setOrigin(0.5).setDepth(1003).setAlpha(0);
  scene.tweens.add({
    targets: hintText, alpha: 0.7,
    duration: 400, delay: 800,
    onComplete: () => {
      scene.tweens.add({
        targets: hintText, alpha: 0.4,
        duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    },
  });
  els.push(hintText);

  // 컨페티 papers — close 전까지 반복 spawn (loop)
  scene.tavernHeroAcqLive = true;
  function spawnPaperLayer(i) {
    if (!scene.tavernHeroAcqLive) return;
    const p = scene.add.image(cx, cy, 'ui_effect_papers')
      .setDepth(1005 + i).setScrollFactor(0);
    p.setDisplaySize(GAME_W * 1.1, GAME_H * 1.1);
    p.y = cy - GAME_H;
    p.alpha = 0.85;
    p.angle = i === 0 ? -8 : 8;
    p._camAssigned = true;
    scene.tweens.add({
      targets: p, y: cy + GAME_H * 0.6,
      duration: 2400 + i * 400, ease: 'Quad.easeIn',
      onComplete: () => {
        p.destroy();
        // 다음 layer 재spawn
        if (scene.tavernHeroAcqLive) spawnPaperLayer(i);
      },
    });
    scene.tweens.add({
      targets: p, angle: p.angle + (i === 0 ? 20 : -20),
      duration: 2800, ease: 'Sine.easeInOut',
    });
    scene.tweens.add({
      targets: p, alpha: 0,
      duration: 700, delay: 1700 + i * 200, ease: 'Quad.easeIn',
    });
    // close 시 cleanup용으로 els에 push (있을 때만)
    els.push(p);
  }
  spawnPaperLayer(0);
  scene.time.delayedCall(800, () => spawnPaperLayer(1));

  // 탭하여 닫기 (dim 클릭) — 모든 loop 중지 + element fade out
  const close = () => {
    scene.tavernHeroAcqLive = false; // papers/anim/chat loop 멈춤
    if (chatBubble) { chatBubble.destroy(); chatBubble = null; }
    scene.tweens.add({
      targets: els, alpha: 0,
      duration: 240, ease: 'Quad.easeIn',
      onComplete: () => els.forEach((el) => el && el.destroy && el.destroy()),
    });
  };
  dimHit.on('pointerup', close);
}

function showHeroAcquiredToast(scene, def, isDup, enhance) {
  let msg;
  if (!isDup) msg = `${def.name} 획득! 영웅 탭에서 배치`;
  else if (enhance >= ENHANCE_CAP) msg = `${def.name} +${enhance}강화 (MAX)`;
  else msg = `${def.name} +${enhance}강화!`;
  const text = scene.add.text(CENTER.x, GAME_H - BOTTOM_UI_HEIGHT - 40, msg, {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '15px',
    color: '#F5E8C0', backgroundColor: '#1A0F08', padding: { x: 12, y: 6 },
    stroke: '#000', strokeThickness: 2,
  }).setOrigin(0.5).setDepth(70);
  scene.tweens.add({
    targets: text, alpha: 0, y: GAME_H - BOTTOM_UI_HEIGHT - 80,
    duration: 1400, delay: 900,
    onComplete: () => text.destroy(),
  });
}

function flashEnhanceUp(scene, hero) {
  const text = scene.add.text(hero.x, hero.y - 30, `+${hero.enhance}강화`, {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '16px',
    color: '#FACC15', stroke: '#000', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(30);
  scene.tweens.add({
    targets: text, y: hero.y - 60, alpha: 0,
    duration: 1000, ease: 'Quad.easeOut',
    onComplete: () => text.destroy(),
  });
  if (hero.cardSlot && hero.cardSlot.bg) {
    scene.tweens.add({
      targets: hero.cardSlot.bg, scaleX: 1.25, scaleY: 1.25,
      duration: 250, yoyo: true, ease: 'Back.easeOut',
    });
  }
}

function showRosterFullMessage(scene) {
  const text = scene.add.text(CENTER.x, CENTER.y, '로스터 가득 (10/10)', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '20px',
    color: '#FF6666', backgroundColor: '#000000', padding: { x: 18, y: 8 },
  }).setOrigin(0.5).setDepth(120);
  scene.tweens.add({
    targets: text, alpha: 0, duration: 1400, delay: 1000,
    onComplete: () => text.destroy(),
  });
}

// === Stage fail (성 함락 → 재시도) =========================================

function triggerGameOver(scene) {
  if (isGameOver) return;
  // 다른 UI 컨텐츠가 열려있으면 성 함락 팝업 표시 안 함 (백그라운드로 게임 계속).
  // 모달 닫힌 후 다음 프레임에서 castleHP <= 0이면 다시 이 함수 호출됨.
  if (scene.profileModal || scene.stageRewardPanel || scene.portraitPicker ||
      scene.nicknameEdit || scene.tavernHeroAcqLive) {
    return;
  }
  isGameOver = true;
  if (scene.spawnTimer) scene.spawnTimer.remove();

  autoBossSummon = false;
  saveGame(scene);

  // 반투명 검정 오버레이 (더 어둡게)
  const overlay = scene.add.rectangle(CENTER.x, CENTER.y, GAME_W, GAME_H, 0x000000, 0).setDepth(80);
  scene.tweens.add({ targets: overlay, fillAlpha: 0.75, duration: 350 });

  // 해골 배지 — 작게 시작 → 팝 + 페이드인
  const badge = scene.add.image(CENTER.x, CENTER.y - 85, 'ui_badge_defeat').setDepth(81);
  const bH = 150, bW = bH * (562 / 329); // 패배 배지 실제 비율
  badge.setDisplaySize(bW, bH);
  const fsx = badge.scaleX, fsy = badge.scaleY;
  badge.setScale(fsx * 0.4, fsy * 0.4).setAlpha(0);
  scene.tweens.add({ targets: badge, scaleX: fsx, scaleY: fsy, alpha: 1, duration: 450, ease: 'Back.easeOut' });

  // DEFEAT 리본 + 텍스트 — 배지 아래 (showBossResultBanner와 동일 구조)
  const ribbon = scene.add.image(CENTER.x, CENTER.y - 5, 'ui_ribbon_wide_red').setDepth(82).setAlpha(0);
  const rH = 56, rW = rH * (659 / 136);
  ribbon.setDisplaySize(rW, rH);
  const rsx = ribbon.scaleX, rsy = ribbon.scaleY;
  ribbon.setScale(rsx * 0.4, rsy * 0.4);
  const defeatLabel = scene.add.text(CENTER.x, CENTER.y - 8, 'DEFEAT', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '24px',
    color: '#FFFFFF', stroke: '#000000', strokeThickness: 4,
    shadow: { offsetX: 0, offsetY: 2, color: '#000', blur: 3, fill: true }, padding: { x: 6, y: 4 },
  }).setOrigin(0.5).setDepth(83).setAlpha(0);
  if (defeatLabel.setLetterSpacing) defeatLabel.setLetterSpacing(3);
  scene.tweens.add({ targets: ribbon, scaleX: rsx, scaleY: rsy, alpha: 1, duration: 420, delay: 220, ease: 'Back.easeOut' });
  scene.tweens.add({ targets: defeatLabel, alpha: 1, duration: 350, delay: 320 });

  // 문구 — 한 글자씩 타이핑 → 끝나면 마지막 점이 . → .. → ... 로 흐름(반복)
  const msgY = CENTER.y + 95;
  const baseMsg = '성이 함락되었습니다';
  const msg = scene.add.text(CENTER.x, msgY, '', {
    fontFamily: 'BMJUA', fontStyle: 'bold', fontSize: '21px',
    color: '#FFFFFF', stroke: '#1F0410', strokeThickness: 5, align: 'center',
  }).setOrigin(0.5).setDepth(82);
  scene.time.delayedCall(480, () => {
    let i = 0;
    scene.time.addEvent({
      delay: 85, repeat: baseMsg.length - 1,
      callback: () => { i++; msg.setText(baseMsg.slice(0, i)); },
    });
    // 타이핑 완료 후 점이 . → .. → ... 한 번만 흐름 (반복 X — 곧 인게임으로 전환됨)
    scene.time.delayedCall(baseMsg.length * 85 + 120, () => {
      let d = 0;
      scene.time.addEvent({
        delay: 360, repeat: 2,
        callback: () => { d += 1; msg.setText(baseMsg + '.'.repeat(d)); },
      });
    });
  });

  scene.cameras.main.shake(280, 0.01);

  // 잠시 후 자동으로 팝업 페이드아웃 → 재시작
  scene.time.delayedCall(2900, () => {
    scene.tweens.add({
      targets: [overlay, badge, ribbon, defeatLabel, msg], alpha: 0, duration: 400, ease: 'Quad.easeIn',
      onComplete: () => scene.scene.restart(),
    });
  });
}
