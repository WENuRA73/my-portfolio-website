export type WeaponKey = "glock" | "deagle" | "mp5" | "vector" | "m4a1" | "ak47" | "m870" | "m24" | "m249" | "m79" | "rpg7";
export type ZombieKind = "shambler" | "runner" | "tank" | "spitter" | "exploder" | "brute";

export type WeaponSpec = {
  id: WeaponKey;
  name: string;
  damage: number;
  fireDelay: number;
  magazine: number;
  reserve: number;
  reload: number;
  bulletSpeed: number;
  spread: number;
  pellets: number;
  penetration: number;
  knockback: number;
  price: number;
  color: string;
  rarity: "Common" | "Uncommon" | "Rare" | "Epic";
  fireMode: "SEMI-AUTO" | "FULL-AUTO" | "PUMP-ACTION" | "BOLT-ACTION";
  caliber: string;
  weaponClass: "PISTOL" | "SMG" | "AR" | "SHOTGUN" | "SNIPER" | "HEAVY" | "LAUNCHER";
  range: number;
  recoil: number;
  explosion?: number;
};

export const WEAPONS: Record<WeaponKey, WeaponSpec> = {
  glock: { id: "glock", name: "Glock 17", damage: 21, fireDelay: 235, magazine: 17, reserve: 136, reload: 1350, bulletSpeed: 920, spread: .026, pellets: 1, penetration: 1, knockback: 32, price: 0, color: "#e7f09b", rarity: "Common", fireMode: "SEMI-AUTO", caliber: "9×19mm", weaponClass: "PISTOL", range: 620, recoil: .018 },
  deagle: { id: "deagle", name: "Desert Eagle", damage: 54, fireDelay: 390, magazine: 7, reserve: 56, reload: 1650, bulletSpeed: 1080, spread: .038, pellets: 1, penetration: 2, knockback: 90, price: 940, color: "#e9b85d", rarity: "Rare", fireMode: "SEMI-AUTO", caliber: ".50 AE", weaponClass: "PISTOL", range: 760, recoil: .05 },
  mp5: { id: "mp5", name: "H&K MP5", damage: 14, fireDelay: 78, magazine: 30, reserve: 210, reload: 1720, bulletSpeed: 980, spread: .058, pellets: 1, penetration: 1, knockback: 18, price: 720, color: "#79e8ac", rarity: "Uncommon", fireMode: "FULL-AUTO", caliber: "9×19mm", weaponClass: "SMG", range: 430, recoil: .018 },
  vector: { id: "vector", name: "KRISS Vector", damage: 15, fireDelay: 55, magazine: 25, reserve: 200, reload: 1850, bulletSpeed: 1010, spread: .065, pellets: 1, penetration: 1, knockback: 15, price: 1180, color: "#69d5e7", rarity: "Rare", fireMode: "FULL-AUTO", caliber: ".45 ACP", weaponClass: "SMG", range: 390, recoil: .021 },
  m4a1: { id: "m4a1", name: "M4A1 Carbine", damage: 28, fireDelay: 105, magazine: 30, reserve: 180, reload: 1900, bulletSpeed: 1210, spread: .025, pellets: 1, penetration: 2, knockback: 40, price: 1380, color: "#60a5fa", rarity: "Rare", fireMode: "FULL-AUTO", caliber: "5.56 NATO", weaponClass: "AR", range: 880, recoil: .006 },
  ak47: { id: "ak47", name: "AK-47", damage: 35, fireDelay: 120, magazine: 30, reserve: 180, reload: 2200, bulletSpeed: 1160, spread: .04, pellets: 1, penetration: 2, knockback: 56, price: 1540, color: "#c084fc", rarity: "Epic", fireMode: "FULL-AUTO", caliber: "7.62×39mm", weaponClass: "AR", range: 820, recoil: .011 },
  m870: { id: "m870", name: "Remington 870", damage: 17, fireDelay: 690, magazine: 7, reserve: 56, reload: 2250, bulletSpeed: 780, spread: .19, pellets: 8, penetration: 1, knockback: 125, price: 1050, color: "#72a9ff", rarity: "Rare", fireMode: "PUMP-ACTION", caliber: "12 Gauge", weaponClass: "SHOTGUN", range: 340, recoil: .07 },
  m24: { id: "m24", name: "M24 SWS", damage: 128, fireDelay: 980, magazine: 5, reserve: 35, reload: 2450, bulletSpeed: 1500, spread: .008, pellets: 1, penetration: 4, knockback: 145, price: 1900, color: "#d191ff", rarity: "Epic", fireMode: "BOLT-ACTION", caliber: "7.62 NATO", weaponClass: "SNIPER", range: 1450, recoil: .055 },
  m249: { id: "m249", name: "M249 SAW", damage: 25, fireDelay: 84, magazine: 100, reserve: 300, reload: 4100, bulletSpeed: 1150, spread: .052, pellets: 1, penetration: 2, knockback: 35, price: 2400, color: "#f0a75f", rarity: "Epic", fireMode: "FULL-AUTO", caliber: "5.56 NATO", weaponClass: "HEAVY", range: 780, recoil: .014 },
  m79: { id: "m79", name: "M79 Grenade Launcher", damage: 120, fireDelay: 1200, magazine: 1, reserve: 12, reload: 2300, bulletSpeed: 480, spread: .018, pellets: 1, penetration: 1, knockback: 190, price: 2700, color: "#ff9a58", rarity: "Epic", fireMode: "BOLT-ACTION", caliber: "40mm", weaponClass: "LAUNCHER", range: 620, recoil: .075, explosion: 175 },
  rpg7: { id: "rpg7", name: "RPG-7", damage: 220, fireDelay: 1650, magazine: 1, reserve: 7, reload: 3100, bulletSpeed: 620, spread: .014, pellets: 1, penetration: 1, knockback: 280, price: 3600, color: "#ff654f", rarity: "Epic", fireMode: "BOLT-ACTION", caliber: "40mm Rocket", weaponClass: "LAUNCHER", range: 900, recoil: .09, explosion: 245 },
};

export const ZOMBIES = {
  shambler: { name: "Shambler", health: 58, speed: 62, damage: 9, radius: 18, reward: 16, xp: 12, color: "#8e9d68" },
  runner: { name: "Runner", health: 39, speed: 118, damage: 7, radius: 14, reward: 22, xp: 17, color: "#b8a765" },
  tank: { name: "Tank", health: 260, speed: 42, damage: 21, radius: 28, reward: 70, xp: 52, color: "#596f55" },
  spitter: { name: "Spitter", health: 74, speed: 54, damage: 11, radius: 18, reward: 34, xp: 27, color: "#79c760" },
  exploder: { name: "Exploder", health: 62, speed: 75, damage: 24, radius: 20, reward: 40, xp: 32, color: "#d7a34e" },
  brute: { name: "THE BRUTE", health: 1350, speed: 50, damage: 28, radius: 52, reward: 500, xp: 420, color: "#8b413f" },
} satisfies Record<ZombieKind, { name: string; health: number; speed: number; damage: number; radius: number; reward: number; xp: number; color: string }>;

export type MapKey = "deadzone" | "overgrowth";
export const MAPS = {
  deadzone: {
    id: "deadzone", name: "DEADZONE 17", zone: "CITY INTERSECTION", description: "Tight streets · balanced cover", width: 2200, height: 1600, spawn: { x: 1430, y: 560 }, roadX: 1435, roadY: 545, ground: "#101719", accent: "#e0be52",
    obstacles: [
      { x: 260, y: 210, w: 420, h: 220, label: "RAVEN MOTORS" }, { x: 850, y: 120, w: 540, h: 170, label: "BLOCK 17" },
      { x: 1620, y: 200, w: 350, h: 280, label: "CLINIC" }, { x: 340, y: 690, w: 260, h: 410, label: "WAREHOUSE" },
      { x: 950, y: 620, w: 300, h: 210, label: "CHECKPOINT" }, { x: 1600, y: 780, w: 370, h: 190, label: "GAS & GO" },
      { x: 750, y: 1160, w: 520, h: 210, label: "NIGHT MARKET" }, { x: 1510, y: 1200, w: 270, h: 190, label: "DEPOT" },
    ],
    barrels: [{ x: 720, y: 535 }, { x: 1440, y: 880 }, { x: 1370, y: 1130 }, { x: 2040, y: 610 }, { x: 680, y: 980 }], nature: [],
  },
  overgrowth: {
    id: "overgrowth", name: "OVERGROWTH BASIN", zone: "INFECTED RAINFOREST", description: "Dense jungle · ruined outposts", width: 2400, height: 1700, spawn: { x: 1130, y: 835 }, roadX: 1130, roadY: 835, ground: "#101d13", accent: "#86c85c",
    obstacles: [
      { x: 250, y: 170, w: 430, h: 190, label: "RANGER STATION" }, { x: 880, y: 130, w: 310, h: 250, label: "RESEARCH CAMP" },
      { x: 1500, y: 180, w: 450, h: 210, label: "TEMPLE RUINS" }, { x: 2050, y: 300, w: 190, h: 330, label: "WATCH TOWER" },
      { x: 190, y: 690, w: 300, h: 220, label: "SUPPLY HUT" }, { x: 720, y: 680, w: 260, h: 170, label: "CRASHED HELI" },
      { x: 1370, y: 660, w: 300, h: 210, label: "STONE SHRINE" }, { x: 1850, y: 880, w: 360, h: 190, label: "FIELD LAB" },
      { x: 330, y: 1210, w: 470, h: 180, label: "ABANDONED CAMP" }, { x: 1080, y: 1160, w: 260, h: 330, label: "COMMS BUNKER" },
      { x: 1600, y: 1290, w: 430, h: 160, label: "ANCIENT GATE" },
    ],
    barrels: [{ x: 610, y: 510 }, { x: 1200, y: 600 }, { x: 1740, y: 560 }, { x: 900, y: 1030 }, { x: 2160, y: 1220 }, { x: 1480, y: 1080 }],
    nature: [
      { x: 110, y: 150, r: 34 }, { x: 780, y: 120, r: 42 }, { x: 1320, y: 110, r: 38 }, { x: 2180, y: 120, r: 46 },
      { x: 120, y: 480, r: 44 }, { x: 620, y: 430, r: 36 }, { x: 1250, y: 470, r: 48 }, { x: 1780, y: 510, r: 39 }, { x: 2290, y: 720, r: 45 },
      { x: 100, y: 1010, r: 42 }, { x: 580, y: 1030, r: 47 }, { x: 1040, y: 960, r: 35 }, { x: 1720, y: 970, r: 46 }, { x: 2260, y: 1090, r: 38 },
      { x: 150, y: 1470, r: 48 }, { x: 890, y: 1510, r: 43 }, { x: 1450, y: 1530, r: 39 }, { x: 2160, y: 1510, r: 49 },
      { x: 530, y: 430, r: 28 }, { x: 2020, y: 740, r: 31 }, { x: 1580, y: 1040, r: 34 }, { x: 820, y: 930, r: 30 },
    ],
  },
} satisfies Record<MapKey, { id: MapKey; name: string; zone: string; description: string; width: number; height: number; spawn: { x: number; y: number }; roadX: number; roadY: number; ground: string; accent: string; obstacles: { x: number; y: number; w: number; h: number; label: string }[]; barrels: { x: number; y: number }[]; nature: { x: number; y: number; r: number }[] }>;

export const DIFFICULTY = {
  Easy: { hp: .8, damage: .72, count: .82, reward: .9 },
  Normal: { hp: 1, damage: 1, count: 1, reward: 1 },
  Hard: { hp: 1.28, damage: 1.25, count: 1.18, reward: 1.2 },
  Nightmare: { hp: 1.65, damage: 1.55, count: 1.38, reward: 1.5 },
};
