import { audio } from "./audio";
import { DIFFICULTY, MAPS, WEAPONS, ZOMBIES, type MapKey, type WeaponKey, type ZombieKind } from "./config";

type V = { x: number; y: number };
type Bullet = V & { vx: number; vy: number; damage: number; life: number; radius: number; color: string; pierce: number; knockback: number; critical: boolean; explosion?: number };
type Enemy = V & { id: number; kind: ZombieKind; hp: number; maxHp: number; radius: number; speed: number; damage: number; attackAt: number; phase: number; flash: number; angle: number; specialAt: number; dead?: boolean };
type Pickup = V & { kind: "coin" | "ammo" | "medkit" | "armor" | "grenade"; value: number; life: number; bob: number };
type Particle = V & { vx: number; vy: number; life: number; max: number; size: number; color: string };
type FloatText = V & { text: string; life: number; color: string; size: number };
type Toxic = V & { vx: number; vy: number; life: number; radius: number; damage: number };
type BossWarning = V & { radius: number; fireAt: number; kind: "slam" | "rock" };
type Barrel = V & { hp: number; dead: boolean; burning: number };
type Support = V & { radius: number; angle: number; lastShot: number; ammo: number; reloadUntil: number };

export type GameSnapshot = {
  state: "menu" | "playing" | "paused" | "prep" | "levelup" | "gameover";
  health: number; maxHealth: number; armor: number; maxArmor: number;
  ammo: number; reserve: number; weapon: WeaponKey; reload: number;
  wave: number; remaining: number; coins: number; score: number; kills: number;
  xp: number; xpNext: number; level: number; grenades: number; medkits: number;
  prep: number; boss?: { name: string; hp: number; max: number; phase: number };
  combo: number; dodge: number; elapsed: number;
};

export type EngineCallbacks = {
  onSnapshot: (s: GameSnapshot) => void;
  onLevelUp: (choices: UpgradeChoice[]) => void;
  onGameOver: (stats: GameStats) => void;
  onMessage: (title: string, sub: string) => void;
};

export type UpgradeChoice = { id: string; name: string; detail: string; rarity: string };
export type GameStats = { wave: number; kills: number; score: number; time: number; coins: number; criticals: number; bosses: number };

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const length = (x: number, y: number) => Math.hypot(x, y) || 1;
const dist = (a: V, b: V) => Math.hypot(a.x - b.x, a.y - b.y);

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  cb: EngineCallbacks;
  dpr = 1; width = 0; height = 0; raf = 0; last = 0;
  state: GameSnapshot["state"] = "menu";
  keys = new Set<string>();
  touchMove = { x: 0, y: 0 }; touchAim?: V; firing = false;
  pointer = { x: 0, y: 0, worldX: 0, worldY: 0 };
  mapKey: MapKey = "deadzone";
  camera = { x: MAPS.deadzone.spawn.x, y: MAPS.deadzone.spawn.y, shake: 0 };
  player = { x: MAPS.deadzone.spawn.x, y: MAPS.deadzone.spawn.y, radius: 17, angle: 0, health: 100, maxHealth: 100, armor: 0, maxArmor: 50, speed: 225, damage: 1, fireRate: 1, reloadRate: 1, crit: .05, critDamage: 2, magnet: 1, invuln: 0 };
  support: Support = { x: MAPS.deadzone.spawn.x - 55, y: MAPS.deadzone.spawn.y + 55, radius: 15, angle: 0, lastShot: 0, ammo: 30, reloadUntil: 0 };
  weapon: WeaponKey = "glock"; secondary?: WeaponKey; owned = new Set<WeaponKey>(["glock"]); ammo = 17;
  reserves: Record<WeaponKey, number> = { glock: 136, deagle: 0, mp5: 0, vector: 0, m4a1: 0, ak47: 0, m870: 0, m24: 0, m249: 0, m79: 0, rpg7: 0 };
  magazines: Record<WeaponKey, number> = { glock: 17, deagle: 0, mp5: 0, vector: 0, m4a1: 0, ak47: 0, m870: 0, m24: 0, m249: 0, m79: 0, rpg7: 0 };
  weaponLevels: Record<WeaponKey, number> = { glock: 1, deagle: 1, mp5: 1, vector: 1, m4a1: 1, ak47: 1, m870: 1, m24: 1, m249: 1, m79: 1, rpg7: 1 };
  shopRotation: WeaponKey[] = ["mp5", "m4a1", "m870", "deagle"];
  bullets: Bullet[] = []; enemies: Enemy[] = []; pickups: Pickup[] = []; particles: Particle[] = []; texts: FloatText[] = []; toxic: Toxic[] = []; bossWarnings: BossWarning[] = [];
  barrels: Barrel[] = [];
  wave = 0; spawnLeft = 0; spawnAt = 0; prepUntil = 0; coins = 0; score = 0; kills = 0; level = 1; xp = 0; xpNext = 100; grenades = 1; medkits = 1; lastShot = 0; reloadingUntil = 0; reloadStarted = 0; combo = 0; comboUntil = 0; criticals = 0; bosses = 0; startedAt = 0; elapsed = 0; lastUi = 0; dodgeUntil = 0; dodgeReady = 0; gameTime = 0; difficulty: keyof typeof DIFFICULTY = "Normal"; reducedMotion = false; shakeSetting = 1;
  enemyId = 1;
  recoil = 0; bossPhase = 1; bossSpawned = false;
  zombieSprites?: HTMLImageElement; spritesReady = false;

  constructor(canvas: HTMLCanvasElement, cb: EngineCallbacks) {
    this.canvas = canvas; this.ctx = canvas.getContext("2d")!; this.cb = cb;
    this.zombieSprites = new Image(); this.zombieSprites.onload = () => { this.spritesReady = true; }; this.zombieSprites.src = "./zombie-sprites.png";
    this.resize(); this.bind(); this.loop = this.loop.bind(this); this.raf = requestAnimationFrame(this.loop);
  }

  bind() {
    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.canvas.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("resize", this.resize);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.canvas.addEventListener("contextmenu", e => e.preventDefault());
  }
  destroy() {
    cancelAnimationFrame(this.raf);
    this.canvas.removeEventListener("pointermove", this.onPointerMove); this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointerup", this.onPointerUp); window.removeEventListener("keydown", this.onKeyDown); window.removeEventListener("keyup", this.onKeyUp); window.removeEventListener("resize", this.resize); this.canvas.removeEventListener("wheel", this.onWheel); document.removeEventListener("visibilitychange", this.onVisibility);
  }
  resize = () => { this.dpr = Math.min(2, devicePixelRatio || 1); const r = this.canvas.getBoundingClientRect(); this.width = r.width; this.height = r.height; this.canvas.width = Math.round(r.width * this.dpr); this.canvas.height = Math.round(r.height * this.dpr); };
  onPointerMove = (e: PointerEvent) => { const r = this.canvas.getBoundingClientRect(); this.pointer.x = e.clientX - r.left; this.pointer.y = e.clientY - r.top; };
  onPointerDown = (e: PointerEvent) => { if (e.pointerType === "mouse" && e.button === 0) this.firing = true; };
  onPointerUp = () => { this.firing = false; };
  onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.code);
    if (["Space", "KeyR", "KeyQ", "KeyG", "KeyE", "Escape"].includes(e.code) || e.code.startsWith("Digit")) e.preventDefault();
    if (e.code === "KeyR") this.reload();
    if (e.code === "KeyQ") this.useMedkit();
    if (e.code === "KeyG") this.throwGrenade();
    if (e.code.startsWith("Digit")) this.switchWeapon(Array.from(this.owned)[Number(e.code.slice(5)) - 1]);
    if (e.code === "KeyE") this.cycleWeapon(1);
    if (e.code === "Space") this.dodge();
    if (e.code === "Escape") this.togglePause();
  };
  onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.code);
  onWheel = (e: WheelEvent) => { e.preventDefault(); this.cycleWeapon(e.deltaY >= 0 ? 1 : -1); };
  onVisibility = () => { if (document.hidden && (this.state === "playing" || this.state === "prep")) { this.state = "paused"; this.snapshot(true); } };

  setDifficulty(d: keyof typeof DIFFICULTY) { this.difficulty = d; }
  setMap(id: MapKey) { if (this.state === "menu" || this.state === "gameover") this.mapKey = id; }
  setOptions(opts: { reducedMotion: boolean; shake: number; volume: number }) { this.reducedMotion = opts.reducedMotion; this.shakeSetting = opts.shake; audio.volume = opts.volume; }
  setTouchMove(x: number, y: number) { this.touchMove = { x, y }; }
  setTouchAim(x?: number, y?: number) { this.touchAim = x === undefined || y === undefined ? undefined : { x, y }; this.firing = !!this.touchAim; }

  start() {
    const meta = JSON.parse(localStorage.getItem("deadzone-meta") || "{}") as { startingHealth?: number; startingCoins?: number };
    const map = MAPS[this.mapKey], spawn = map.spawn;
    Object.assign(this.player, { x: spawn.x, y: spawn.y, health: 100 + (meta.startingHealth || 0), maxHealth: 100 + (meta.startingHealth || 0), armor: 0, maxArmor: 50, speed: 225, damage: 1, fireRate: 1, reloadRate: 1, crit: .05, critDamage: 2, magnet: 1, invuln: 0 });
    Object.assign(this.support, { x: spawn.x - 55, y: spawn.y + 55, angle: 0, lastShot: 0, ammo: 30, reloadUntil: 0 });
    this.camera.x = spawn.x; this.camera.y = spawn.y;
    this.weapon = "glock"; this.secondary = undefined; this.owned = new Set(["glock"]); this.ammo = WEAPONS.glock.magazine;
    this.reserves = { glock: WEAPONS.glock.reserve, deagle: 0, mp5: 0, vector: 0, m4a1: 0, ak47: 0, m870: 0, m24: 0, m249: 0, m79: 0, rpg7: 0 };
    this.magazines = { glock: WEAPONS.glock.magazine, deagle: 0, mp5: 0, vector: 0, m4a1: 0, ak47: 0, m870: 0, m24: 0, m249: 0, m79: 0, rpg7: 0 };
    this.weaponLevels = { glock: 1, deagle: 1, mp5: 1, vector: 1, m4a1: 1, ak47: 1, m870: 1, m24: 1, m249: 1, m79: 1, rpg7: 1 }; this.shopRotation = this.rollShopRotation();
    this.bullets = []; this.enemies = []; this.pickups = []; this.particles = []; this.texts = []; this.toxic = []; this.bossWarnings = []; this.recoil = 0; this.bossPhase = 1;
    this.barrels = map.barrels.map(b => ({ ...b, hp: 45, dead: false, burning: 0 }));
    this.wave = 0; this.coins = meta.startingCoins || 0; this.score = 0; this.kills = 0; this.level = 1; this.xp = 0; this.xpNext = 100; this.grenades = 1; this.medkits = 1; this.combo = 0; this.criticals = 0; this.bosses = 0; this.elapsed = 0; this.startedAt = performance.now(); this.gameTime = 0; this.state = "playing";
    this.startWave();
  }

  startWave() {
    this.wave++; this.state = "playing"; this.prepUntil = 0;
    const boss = this.wave % 5 === 0;
    if (boss) { this.bossPhase = 1; this.bossWarnings = []; this.bossSpawned = false; }
    this.spawnLeft = boss ? 1 : Math.floor((4 + this.wave * 2.5) * DIFFICULTY[this.difficulty].count);
    this.spawnAt = this.gameTime + 450;
    this.cb.onMessage(boss ? "BOSS WAVE" : `WAVE ${this.wave}`, boss ? "THE BRUTE IS COMING" : this.wave > 1 ? "STAY SHARP" : "SURVIVE"); audio.wave(); this.snapshot(true);
  }
  startNextNow() { if (this.state === "prep") { this.score += 25; this.cb.onMessage("EARLY DEPLOYMENT", "+25 SCORE"); this.startWave(); } }
  togglePause() { if (this.state === "playing" || this.state === "prep") this.state = "paused"; else if (this.state === "paused") this.state = this.prepUntil ? "prep" : "playing"; this.snapshot(true); }

  reload() {
    if (!(["playing", "prep"] as string[]).includes(this.state) || this.reloadingUntil || this.ammo >= WEAPONS[this.weapon].magazine || this.reserves[this.weapon] <= 0) return;
    this.reloadStarted = this.gameTime; this.reloadingUntil = this.gameTime + WEAPONS[this.weapon].reload / this.player.reloadRate; audio.reload(); this.snapshot(true);
  }
  finishReload() { const spec = WEAPONS[this.weapon]; const need = spec.magazine - this.ammo; const use = Math.min(need, this.reserves[this.weapon]); this.ammo += use; this.magazines[this.weapon] = this.ammo; this.reserves[this.weapon] -= use; this.reloadingUntil = 0; }
  switchWeapon(id?: WeaponKey) { if (!id || !this.owned.has(id) || id === this.weapon) return; this.magazines[this.weapon] = this.ammo; this.reloadingUntil = 0; this.weapon = id; this.ammo = this.magazines[id]; if (!this.ammo && this.reserves[id]) this.reload(); this.snapshot(true); }
  cycleWeapon(direction = 1) { const list = Array.from(this.owned); if (list.length < 2) return; const current = list.indexOf(this.weapon); this.switchWeapon(list[(current + direction + list.length) % list.length]); }
  rollShopRotation() { return (Object.keys(WEAPONS) as WeaponKey[]).filter(id => id !== "glock").sort(() => Math.random() - .5).slice(0, 4); }
  useMedkit() { if (this.medkits < 1 || this.player.health >= this.player.maxHealth || this.state !== "playing") return; this.medkits--; this.player.health = Math.min(this.player.maxHealth, this.player.health + 42); this.burst(this.player.x, this.player.y, "#79e8ac", 18, 90); audio.pickup(); this.snapshot(true); }
  dodge() { if (this.gameTime < this.dodgeReady || this.state !== "playing") return; this.dodgeUntil = this.gameTime + 260; this.dodgeReady = this.gameTime + 1800; this.player.invuln = this.gameTime + 320; this.camera.shake = 5; }

  throwGrenade() {
    if (this.grenades < 1 || this.state !== "playing") return; this.grenades--;
    const map = MAPS[this.mapKey], a = this.player.angle, x = clamp(this.player.x + Math.cos(a) * 220, 40, map.width - 40), y = clamp(this.player.y + Math.sin(a) * 220, 40, map.height - 40);
    setTimeout(() => { if (this.state === "gameover") return; audio.explosion(); this.camera.shake = 18; this.burst(x, y, "#ffb45b", 42, 250); this.texts.push({ x, y, text: "BOOM", life: 650, color: "#fff0bf", size: 22 }); for (const z of this.enemies) if (dist(z, { x, y }) < 175) this.damageEnemy(z, 120, false, 250); }, 420);
    this.snapshot(true);
  }

  buy(item: string) {
    if (this.state !== "prep") return false;
    if (item in WEAPONS) { const id = item as WeaponKey; const w = WEAPONS[id]; if (this.owned.has(id)) return this.upgradeWeapon(id); if (this.coins < w.price) return false; this.magazines[this.weapon] = this.ammo; this.coins -= w.price; this.secondary = id; this.owned = new Set(["glock", id]); this.reserves[id] = w.reserve; this.magazines[id] = w.magazine; this.weapon = id; this.ammo = w.magazine; this.reloadingUntil = 0; }
    else if (item === "ammo" && this.coins >= 140) { this.coins -= 140; this.reserves[this.weapon] += Math.ceil(WEAPONS[this.weapon].reserve * .45); }
    else if (item === "armor" && this.coins >= 190) { this.coins -= 190; this.player.armor = this.player.maxArmor; }
    else if (item === "medkit" && this.coins >= 160 && this.medkits < 3) { this.coins -= 160; this.medkits++; }
    else if (item === "grenade" && this.coins >= 210 && this.grenades < 4) { this.coins -= 210; this.grenades++; }
    else return false;
    audio.pickup(); this.snapshot(true); return true;
  }
  upgradeWeapon(id: WeaponKey) { const cost = 300 * this.weaponLevels[id]; if (this.weaponLevels[id] >= 5 || this.coins < cost) return false; this.coins -= cost; this.weaponLevels[id]++; audio.pickup(); this.snapshot(true); return true; }

  getUpgradeChoices(): UpgradeChoice[] {
    const all = [
      { id: "damage", name: "Hollow Point", detail: "+18% weapon damage", rarity: "RARE" }, { id: "speed", name: "Lightweight Rig", detail: "+12% movement speed", rarity: "COMMON" },
      { id: "health", name: "Last Stand", detail: "+25 max health & heal", rarity: "EPIC" }, { id: "fire", name: "Hot Trigger", detail: "+14% fire rate", rarity: "RARE" },
      { id: "reload", name: "Fast Hands", detail: "+20% reload speed", rarity: "COMMON" }, { id: "critical", name: "Dead Eye", detail: "+7% critical chance", rarity: "EPIC" },
      { id: "armor", name: "Trauma Plates", detail: "+30 max armor & refill", rarity: "RARE" }, { id: "magnet", name: "Salvager", detail: "+45% pickup radius", rarity: "COMMON" },
    ];
    return all.sort(() => Math.random() - .5).slice(0, 3);
  }
  chooseUpgrade(id: string) {
    if (id === "damage") this.player.damage *= 1.18; if (id === "speed") this.player.speed *= 1.12; if (id === "health") { this.player.maxHealth += 25; this.player.health += 25; }
    if (id === "fire") this.player.fireRate *= 1.14; if (id === "reload") this.player.reloadRate *= 1.2; if (id === "critical") this.player.crit += .07;
    if (id === "armor") { this.player.maxArmor += 30; this.player.armor = this.player.maxArmor; } if (id === "magnet") this.player.magnet *= 1.45;
    this.state = "playing"; this.snapshot(true);
  }

  loop(now: number) {
    const dt = Math.min(.034, (now - (this.last || now)) / 1000); this.last = now;
    if (this.state === "playing" || this.state === "prep") { this.gameTime += dt * 1000; this.elapsed = (now - this.startedAt) / 1000; this.update(dt); }
    this.render(now); if (now - this.lastUi > 100) { this.snapshot(); this.lastUi = now; }
    this.raf = requestAnimationFrame(this.loop);
  }

  update(dt: number) {
    this.recoil *= Math.pow(.025, dt);
    this.updatePlayer(dt);
    this.updateSupport(dt);
    if (this.reloadingUntil && this.gameTime >= this.reloadingUntil) this.finishReload();
    if (this.state === "playing") {
      if (this.firing) this.fire();
      if (this.spawnLeft > 0 && this.gameTime >= this.spawnAt) { this.spawnEnemy(); this.spawnLeft--; this.spawnAt = this.gameTime + Math.max(240, 850 - this.wave * 32); }
      this.updateEnemies(dt); this.updateBossWarnings(); this.updateBullets(dt); this.updateToxic(dt);
      if (this.spawnLeft === 0 && this.enemies.length === 0) { this.state = "prep"; this.prepUntil = this.gameTime + 12000; this.shopRotation = this.rollShopRotation(); this.coins += 75 + this.wave * 15; this.cb.onMessage("WAVE COMPLETE", `+${75 + this.wave * 15} SALVAGE · NEW GUN ROTATION`); audio.wave(); }
    } else if (this.state === "prep" && this.gameTime >= this.prepUntil) this.startWave();
    this.updatePickups(dt); this.updateFx(dt);
  }

  updatePlayer(dt: number) {
    let x = (this.keys.has("KeyD") ? 1 : 0) - (this.keys.has("KeyA") ? 1 : 0) + this.touchMove.x;
    let y = (this.keys.has("KeyS") ? 1 : 0) - (this.keys.has("KeyW") ? 1 : 0) + this.touchMove.y;
    const l = Math.max(1, Math.hypot(x, y)); x /= l; y /= l;
    let speed = this.player.speed * (this.keys.has("ShiftLeft") ? 1.38 : 1) * (this.gameTime < this.dodgeUntil ? 2.4 : 1);
    this.moveEntity(this.player, x * speed * dt, y * speed * dt, this.player.radius);
    this.pointer.worldX = this.camera.x - this.width / 2 + this.pointer.x; this.pointer.worldY = this.camera.y - this.height / 2 + this.pointer.y;
    if (this.touchAim) this.player.angle = Math.atan2(this.touchAim.y, this.touchAim.x); else this.player.angle = Math.atan2(this.pointer.worldY - this.player.y, this.pointer.worldX - this.player.x);
    const follow = 1 - Math.pow(.002, dt); this.camera.x += (this.player.x - this.camera.x) * follow; this.camera.y += (this.player.y - this.camera.y) * follow;
  }

  updateSupport(dt: number) {
    const s = this.support, followAngle = this.player.angle + 2.35;
    const targetPos = { x: this.player.x + Math.cos(followAngle) * 72, y: this.player.y + Math.sin(followAngle) * 72 };
    const gap = dist(s, targetPos);
    if (dist(s, this.player) > 470) { s.x = this.player.x; s.y = this.player.y; }
    else if (gap > 8) { const move = Math.min(285, 110 + gap * 2.2), a = Math.atan2(targetPos.y - s.y, targetPos.x - s.x); this.moveEntity(s, Math.cos(a) * move * dt, Math.sin(a) * move * dt, s.radius); }

    let target: Enemy | undefined, nearest = 540;
    if (this.state === "playing") for (const z of this.enemies) { if (z.dead) continue; const d = dist(s, z); if (d < nearest) { nearest = d; target = z; } }
    s.angle = target ? Math.atan2(target.y - s.y, target.x - s.x) : this.player.angle;
    if (!target || this.state !== "playing") return;
    if (s.reloadUntil) { if (this.gameTime >= s.reloadUntil) { s.reloadUntil = 0; s.ammo = 30; } else return; }
    if (this.gameTime - s.lastShot < 340) return;
    if (s.ammo <= 0) { s.reloadUntil = this.gameTime + 1750; this.texts.push({ x: s.x, y: s.y - 28, text: "RELOADING", life: 700, color: "#75cfff", size: 9 }); return; }
    const a = s.angle + (Math.random() - .5) * .055;
    s.ammo--; s.lastShot = this.gameTime;
    this.bullets.push({ x: s.x + Math.cos(a) * 34, y: s.y + Math.sin(a) * 34, vx: Math.cos(a) * 1050, vy: Math.sin(a) * 1050, damage: 15, life: 620, radius: 3, color: "#75cfff", pierce: 1, knockback: 28, critical: false });
    this.burst(s.x + Math.cos(a) * 31, s.y + Math.sin(a) * 31, "#d8f4ff", 3, 55); audio.shot("m4a1");
  }

  moveEntity(e: V, dx: number, dy: number, r: number) {
    const map = MAPS[this.mapKey], tryX = clamp(e.x + dx, r + 18, map.width - r - 18); if (!this.hitsObstacle(tryX, e.y, r) && !this.hitsBarrel(tryX, e.y, r)) e.x = tryX;
    const tryY = clamp(e.y + dy, r + 18, map.height - r - 18); if (!this.hitsObstacle(e.x, tryY, r) && !this.hitsBarrel(e.x, tryY, r)) e.y = tryY;
  }
  hitsObstacle(x: number, y: number, r: number) { const map = MAPS[this.mapKey]; return map.obstacles.some(o => x + r > o.x && x - r < o.x + o.w && y + r > o.y && y - r < o.y + o.h) || map.nature.some(n => Math.hypot(x - n.x, y - n.y) < r + n.r * .48); }
  hitsBarrel(x: number, y: number, r: number) { return this.barrels.some(b => !b.dead && Math.hypot(x - b.x, y - b.y) < r + 15); }

  fire() {
    const w = WEAPONS[this.weapon]; if (this.reloadingUntil || this.gameTime - this.lastShot < w.fireDelay / this.player.fireRate) return;
    if (this.ammo <= 0) { audio.empty(); this.lastShot = this.gameTime; this.reload(); return; }
    this.ammo--; this.magazines[this.weapon] = this.ammo; this.lastShot = this.gameTime; audio.shot(this.weapon); this.camera.shake = Math.max(this.camera.shake, this.weapon === "m870" || this.weapon === "m24" || this.weapon === "deagle" ? 8 : 3);
    for (let i = 0; i < w.pellets; i++) {
      const a = this.player.angle + (Math.random() - .5) * (w.spread + this.recoil) * 2; const crit = Math.random() < this.player.crit; const level = this.weaponLevels[this.weapon];
      this.bullets.push({ x: this.player.x + Math.cos(a) * 36, y: this.player.y + Math.sin(a) * 36, vx: Math.cos(a) * w.bulletSpeed, vy: Math.sin(a) * w.bulletSpeed, damage: w.damage * this.player.damage * (1 + (level - 1) * .12) * (crit ? this.player.critDamage : 1), life: w.range / w.bulletSpeed * 1000, radius: w.explosion ? 7 : 3, color: w.color, pierce: w.penetration, knockback: w.knockback, critical: crit, explosion: w.explosion });
    }
    this.recoil = Math.min(.22, this.recoil + w.recoil);
    this.burst(this.player.x + Math.cos(this.player.angle) * 30, this.player.y + Math.sin(this.player.angle) * 30, "#fff1a6", 5, 80);
    if (this.ammo === 0) setTimeout(() => this.reload(), 160);
  }

  updateBullets(dt: number) {
    for (const b of this.bullets) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt * 1000;
      const barrel = this.barrels.find(x => !x.dead && dist(x, b) < 18 + b.radius); if (barrel) { barrel.hp -= b.damage; if (b.explosion) this.detonateBullet(b); else b.life = 0; this.burst(b.x, b.y, "#f2b563", 6, 70); if (barrel.hp <= 0) this.detonateBarrel(barrel); continue; }
      if (this.hitsObstacle(b.x, b.y, b.radius)) { if (b.explosion) this.detonateBullet(b); else { b.life = 0; this.burst(b.x, b.y, "#f4c97b", 4, 60); } continue; }
      for (const z of this.enemies) if (!z.dead && dist(b, z) < b.radius + z.radius) { if (b.explosion) { this.detonateBullet(b); break; } this.damageEnemy(z, b.damage, b.critical, b.knockback, Math.atan2(b.vy, b.vx)); b.pierce--; if (b.pierce <= 0) { b.life = 0; break; } }
      if (b.life <= 0 && b.explosion) this.detonateBullet(b);
    }
    const map = MAPS[this.mapKey]; this.bullets = this.bullets.filter(b => b.life > 0 && b.x > 0 && b.y > 0 && b.x < map.width && b.y < map.height);
  }

  detonateBullet(b: Bullet) { if (!b.explosion || b.life < -100) return; b.life = -999; audio.explosion(); this.camera.shake = Math.min(22, b.explosion / 10); this.burst(b.x, b.y, "#ff9c55", Math.round(b.explosion / 4), b.explosion * 1.3); for (const z of this.enemies) { const d = dist(z, b); if (d < b.explosion) this.damageEnemy(z, b.damage * (1 - d / b.explosion * .55), b.critical, b.knockback, Math.atan2(z.y - b.y, z.x - b.x)); } }
  detonateBarrel(barrel: Barrel) { if (barrel.dead) return; barrel.dead = true; audio.explosion(); this.camera.shake = 18; this.burst(barrel.x, barrel.y, "#ff8c42", 58, 290); this.texts.push({ x: barrel.x, y: barrel.y - 20, text: "CHAIN BLAST", life: 800, color: "#ffd28b", size: 16 }); for (const z of this.enemies) { const d = dist(z, barrel); if (d < 185) this.damageEnemy(z, 145 * (1 - d / 300), false, 240, Math.atan2(z.y - barrel.y, z.x - barrel.x)); } if (dist(this.player, barrel) < 150) this.hurtPlayer(24); for (const other of this.barrels) if (!other.dead && dist(other, barrel) < 220) setTimeout(() => this.detonateBarrel(other), 150); }

  damageEnemy(z: Enemy, amount: number, critical: boolean, knock = 0, angle = 0) {
    z.hp -= amount; z.flash = 100; if (critical) this.criticals++;
    this.texts.push({ x: z.x + (Math.random() - .5) * 12, y: z.y - z.radius, text: `${Math.round(amount)}${critical ? "!" : ""}`, life: 620, color: critical ? "#ffd45e" : "#e9f0df", size: critical ? 18 : 14 });
    audio.hit(critical); if (z.kind !== "tank" && z.kind !== "brute") this.moveEntity(z, Math.cos(angle) * knock * .12, Math.sin(angle) * knock * .12, z.radius);
    if (z.hp <= 0) this.killEnemy(z);
  }
  killEnemy(z: Enemy) {
    if (z.dead) return; z.dead = true; const cfg = ZOMBIES[z.kind], mult = DIFFICULTY[this.difficulty].reward; this.kills++; this.coins += Math.round(cfg.reward * mult); this.score += Math.round(cfg.reward * 12 * mult); this.xp += cfg.xp; this.combo = this.gameTime < this.comboUntil ? this.combo + 1 : 1; this.comboUntil = this.gameTime + 2200;
    if ([3, 5, 10].includes(this.combo)) this.cb.onMessage(this.combo === 3 ? "TRIPLE KILL" : this.combo === 5 ? "RAMPAGE" : "UNSTOPPABLE", `x${Math.min(2.5, 1 + this.combo * .05).toFixed(1)} SCORE`);
    this.burst(z.x, z.y, cfg.color, z.kind === "brute" ? 55 : 16, z.kind === "brute" ? 240 : 120);
    if (z.kind === "exploder") { audio.explosion(); this.camera.shake = 12; for (const other of this.enemies) if (other !== z && dist(other, z) < 125) this.damageEnemy(other, 70, false); if (dist(this.player, z) < 120) this.hurtPlayer(14); }
    if (z.kind === "brute") { this.bosses++; this.coins += 500; this.pickups.push({ x: z.x - 32, y: z.y, kind: "armor", value: 50, life: 20000, bob: 0 }, { x: z.x + 32, y: z.y, kind: "grenade", value: 1, life: 20000, bob: 1 }, { x: z.x, y: z.y + 34, kind: "ammo", value: 65, life: 20000, bob: 2 }); }
    const roll = Math.random();
    if (roll < .34) {
      const dropRoll = Math.random(); let kind: Pickup["kind"] = "coin"; let value = 35 + Math.round(Math.random() * 30);
      if (dropRoll < .30) { kind = "ammo"; value = 22 + Math.round(Math.random() * 28); }
      else if (dropRoll < .52) { kind = "armor"; value = 15 + Math.round(Math.random() * 20); }
      else if (dropRoll < .66) { kind = "medkit"; value = 1; }
      else if (dropRoll < .76) { kind = "grenade"; value = 1; }
      this.pickups.push({ x: z.x, y: z.y, kind, value, life: 18000, bob: Math.random() * 6 });
    }
    if (this.xp >= this.xpNext) { this.xp -= this.xpNext; this.level++; this.xpNext = Math.round(this.xpNext * 1.3); this.state = "levelup"; this.cb.onLevelUp(this.getUpgradeChoices()); this.cb.onMessage("LEVEL UP", "CHOOSE AN UPGRADE"); }
  }

  spawnEnemy() {
    let kind: ZombieKind = "shambler";
    if (this.wave % 5 === 0 && !this.bossSpawned) { kind = "brute"; this.bossSpawned = true; }
    else { const r = Math.random(); if (this.wave >= 4 && r < .12) kind = "tank"; else if (this.wave >= 3 && r < .28) kind = "spitter"; else if (this.wave >= 3 && r < .4) kind = "exploder"; else if (this.wave >= 2 && r < .67) kind = "runner"; }
    const map = MAPS[this.mapKey]; let p = { x: 30, y: Math.random() * map.height }; const edge = Math.floor(Math.random() * 4); if (edge === 1) p = { x: map.width - 30, y: Math.random() * map.height }; if (edge === 2) p = { x: Math.random() * map.width, y: 30 }; if (edge === 3) p = { x: Math.random() * map.width, y: map.height - 30 };
    if (dist(p, this.player) < 480) { p.x = this.player.x < map.width / 2 ? map.width - 35 : 35; }
    const cfg = ZOMBIES[kind], scale = 1 + Math.max(0, this.wave - 1) * .105, hp = cfg.health * scale * DIFFICULTY[this.difficulty].hp;
    this.enemies.push({ ...p, id: this.enemyId++, kind, hp, maxHp: hp, radius: cfg.radius, speed: cfg.speed * (1 + Math.min(.38, this.wave * .012)), damage: cfg.damage * DIFFICULTY[this.difficulty].damage, attackAt: 0, phase: Math.random() * 6, flash: 0, angle: 0, specialAt: this.gameTime + 1400 + Math.random() * 1200 });
  }

  updateEnemies(dt: number) {
    for (const z of this.enemies) {
      if (z.dead) continue; z.flash -= dt * 1000; const dx = this.player.x - z.x, dy = this.player.y - z.y, d = length(dx, dy); z.angle = Math.atan2(dy, dx); let speed = z.speed;
      if (z.kind === "runner") z.angle += Math.sin(this.gameTime * .006 + z.phase) * .22;
      if (z.kind === "spitter" && d < 420) { speed *= d < 260 ? -.5 : .05; if (this.gameTime > z.specialAt) { this.toxic.push({ x: z.x, y: z.y, vx: dx / d * 270, vy: dy / d * 270, life: 2200, radius: 9, damage: z.damage }); z.specialAt = this.gameTime + 1900; } }
      if (z.kind === "brute") {
        const nextPhase = z.hp / z.maxHp < .3 ? 3 : z.hp / z.maxHp < .62 ? 2 : 1;
        if (nextPhase > this.bossPhase) { this.bossPhase = nextPhase; this.cb.onMessage(nextPhase === 3 ? "BRUTE RAGE MODE" : "BRUTE PHASE II", nextPhase === 3 ? "ATTACK SPEED INCREASED" : "NEW ATTACKS DETECTED"); this.camera.shake = 18; }
        speed *= this.bossPhase === 3 ? 1.38 : this.bossPhase === 2 ? 1.16 : 1;
        if (this.gameTime > z.specialAt) {
          const attack = Math.random(); z.specialAt = this.gameTime + (this.bossPhase === 3 ? 1250 : this.bossPhase === 2 ? 1750 : 2300);
          if (attack < .4) { this.bossWarnings.push({ x: z.x, y: z.y, radius: 165 + this.bossPhase * 16, fireAt: this.gameTime + 850, kind: "slam" }); this.cb.onMessage("GROUND SLAM", "LEAVE THE RED ZONE"); }
          else if (attack < .72) { this.bossWarnings.push({ x: this.player.x, y: this.player.y, radius: 78 + this.bossPhase * 8, fireAt: this.gameTime + 1050, kind: "rock" }); this.cb.onMessage("ROCK BARRAGE", "KEEP MOVING"); }
          else { this.spawnLeft += this.bossPhase + 1; this.cb.onMessage("THE BRUTE ROARS", "REINFORCEMENTS INCOMING"); }
        }
      }
      let ax = Math.cos(z.angle), ay = Math.sin(z.angle);
      for (const other of this.enemies) if (other !== z && !other.dead) { const dd = dist(z, other); if (dd < z.radius + other.radius + 8 && dd > 0) { ax += (z.x - other.x) / dd * .7; ay += (z.y - other.y) / dd * .7; } }
      const al = length(ax, ay); this.moveEntity(z, ax / al * speed * dt, ay / al * speed * dt, z.radius);
      if (d < z.radius + this.player.radius + 5 && this.gameTime > z.attackAt) { this.hurtPlayer(z.damage); z.attackAt = this.gameTime + (z.kind === "runner" ? 650 : z.kind === "brute" ? 1050 : 900); }
    }
    this.enemies = this.enemies.filter(z => !z.dead);
  }

  updateBossWarnings() {
    for (const w of this.bossWarnings) if (this.gameTime >= w.fireAt) { const inside = dist(this.player, w) < w.radius + this.player.radius; if (inside) this.hurtPlayer(w.kind === "slam" ? 26 + this.bossPhase * 7 : 19 + this.bossPhase * 5); audio.explosion(); this.camera.shake = w.kind === "slam" ? 20 : 13; this.burst(w.x, w.y, w.kind === "slam" ? "#e55b4f" : "#c7a06a", w.kind === "slam" ? 55 : 30, w.radius * 1.3); w.fireAt = -1; }
    this.bossWarnings = this.bossWarnings.filter(w => w.fireAt > 0);
  }

  updateToxic(dt: number) { for (const t of this.toxic) { t.x += t.vx * dt; t.y += t.vy * dt; t.life -= dt * 1000; if (dist(t, this.player) < t.radius + this.player.radius) { this.hurtPlayer(t.damage); t.life = 0; } if (this.hitsObstacle(t.x, t.y, t.radius)) t.life = 0; } this.toxic = this.toxic.filter(t => t.life > 0); }
  hurtPlayer(amount: number) {
    if (this.gameTime < this.player.invuln) return; let left = amount; if (this.player.armor > 0) { const used = Math.min(this.player.armor, left * .75); this.player.armor -= used; left -= used; } this.player.health -= left; this.player.invuln = this.gameTime + 380; this.camera.shake = 12; audio.hurt();
    if (this.player.health <= 0) this.gameOver();
  }
  gameOver() {
    this.state = "gameover"; this.player.health = 0; const stats = { wave: this.wave, kills: this.kills, score: this.score, time: this.elapsed, coins: this.coins, criticals: this.criticals, bosses: this.bosses };
    const prior = JSON.parse(localStorage.getItem("deadzone-records") || "{}"); localStorage.setItem("deadzone-records", JSON.stringify({ wave: Math.max(prior.wave || 0, this.wave), score: Math.max(prior.score || 0, this.score), kills: Math.max(prior.kills || 0, this.kills), time: Math.max(prior.time || 0, this.elapsed) }));
    const meta = JSON.parse(localStorage.getItem("deadzone-meta") || "{}"); meta.credits = (meta.credits || 0) + Math.floor(this.score / 800); localStorage.setItem("deadzone-meta", JSON.stringify(meta)); this.cb.onGameOver(stats); this.snapshot(true);
  }

  updatePickups(dt: number) {
    for (const p of this.pickups) { p.life -= dt * 1000; p.bob += dt * 4; const d = dist(p, this.player); if (d < 110 * this.player.magnet) { const speed = Math.max(120, 500 - d); p.x += (this.player.x - p.x) / (d || 1) * speed * dt; p.y += (this.player.y - p.y) / (d || 1) * speed * dt; } if (d < 28) { if (p.kind === "coin") this.coins += p.value; if (p.kind === "ammo") this.reserves[this.weapon] += p.value; if (p.kind === "medkit") this.medkits = Math.min(3, this.medkits + 1); if (p.kind === "armor") this.player.armor = Math.min(this.player.maxArmor, this.player.armor + p.value); if (p.kind === "grenade") this.grenades = Math.min(4, this.grenades + 1); p.life = 0; audio.pickup(); } }
    this.pickups = this.pickups.filter(p => p.life > 0);
  }
  updateFx(dt: number) { for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .96; p.vy *= .96; p.life -= dt * 1000; } for (const t of this.texts) { t.y -= 28 * dt; t.life -= dt * 1000; } this.particles = this.particles.filter(p => p.life > 0); this.texts = this.texts.filter(t => t.life > 0); if (this.gameTime > this.comboUntil) this.combo = 0; }
  burst(x: number, y: number, color: string, count: number, speed: number) { count = this.reducedMotion ? Math.ceil(count * .4) : count; for (let i = 0; i < count; i++) { const a = Math.random() * Math.PI * 2, s = Math.random() * speed, life = 200 + Math.random() * 450; this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, size: 1 + Math.random() * 4, color }); } }

  snapshot(force = false) {
    const boss = this.enemies.find(e => e.kind === "brute" && !e.dead); const w = WEAPONS[this.weapon];
    this.cb.onSnapshot({ state: this.state, health: this.player.health, maxHealth: this.player.maxHealth, armor: this.player.armor, maxArmor: this.player.maxArmor, ammo: this.ammo, reserve: this.reserves[this.weapon], weapon: this.weapon, reload: this.reloadingUntil ? clamp((this.gameTime - this.reloadStarted) / (this.reloadingUntil - this.reloadStarted), 0, 1) : 0, wave: this.wave, remaining: this.enemies.length + this.spawnLeft, coins: this.coins, score: this.score, kills: this.kills, xp: this.xp, xpNext: this.xpNext, level: this.level, grenades: this.grenades, medkits: this.medkits, prep: this.state === "prep" ? Math.ceil((this.prepUntil - this.gameTime) / 1000) : 0, boss: boss ? { name: ZOMBIES.brute.name, hp: boss.hp, max: boss.maxHp, phase: this.bossPhase } : undefined, combo: this.combo, dodge: clamp((this.dodgeReady - this.gameTime) / 1800, 0, 1), elapsed: this.elapsed });
    void force; void w;
  }

  render(now: number) {
    const c = this.ctx; c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); c.clearRect(0, 0, this.width, this.height);
    const shake = this.reducedMotion ? 0 : this.camera.shake * this.shakeSetting; this.camera.shake *= .87; const sx = (Math.random() - .5) * shake, sy = (Math.random() - .5) * shake;
    c.save(); c.translate(this.width / 2 - this.camera.x + sx, this.height / 2 - this.camera.y + sy); this.drawWorld(c, now); c.restore();
    const grad = c.createRadialGradient(this.width / 2, this.height / 2, this.height * .2, this.width / 2, this.height / 2, this.height * .75); grad.addColorStop(0, "rgba(2,7,8,0)"); grad.addColorStop(1, this.player.health < 30 ? "rgba(85,5,4,.62)" : "rgba(0,4,6,.72)"); c.fillStyle = grad; c.fillRect(0, 0, this.width, this.height);
    if (this.state !== "menu" && matchMedia("(pointer:fine)").matches) this.drawCrosshair(c);
  }

  drawWorld(c: CanvasRenderingContext2D, now: number) {
    const map = MAPS[this.mapKey]; c.fillStyle = map.ground; c.fillRect(0, 0, map.width, map.height);
    if (this.mapKey === "overgrowth") {
      c.fillStyle = "rgba(72,116,57,.12)"; for (let i = 0; i < 64; i++) { const x = (i * 317) % map.width, y = (i * 571) % map.height, r = 18 + i % 5 * 9; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
      c.strokeStyle = "rgba(91,72,42,.34)"; c.lineCap = "round"; c.lineWidth = 104; c.beginPath(); c.moveTo(0, map.roadY); c.bezierCurveTo(650, map.roadY - 90, 1700, map.roadY + 80, map.width, map.roadY - 30); c.moveTo(map.roadX, 0); c.bezierCurveTo(map.roadX - 80, 470, map.roadX + 85, 1180, map.roadX - 40, map.height); c.stroke(); c.lineCap = "butt";
    }
    c.strokeStyle = this.mapKey === "overgrowth" ? "rgba(61,95,55,.17)" : "#202a2c"; c.lineWidth = 2; for (let x = 0; x < map.width; x += 110) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, map.height); c.stroke(); } for (let y = 0; y < map.height; y += 110) { c.beginPath(); c.moveTo(0, y); c.lineTo(map.width, y); c.stroke(); }
    c.strokeStyle = `${map.accent}40`; c.setLineDash(this.mapKey === "overgrowth" ? [10, 28] : [28, 24]); c.lineWidth = 3; c.beginPath(); c.moveTo(0, map.roadY); c.lineTo(map.width, map.roadY); c.moveTo(map.roadX, 0); c.lineTo(map.roadX, map.height); c.stroke(); c.setLineDash([]);
    if (this.mapKey === "overgrowth") for (const n of map.nature) { c.save(); c.translate(n.x, n.y); c.fillStyle = "rgba(0,0,0,.38)"; c.beginPath(); c.ellipse(8, 12, n.r * 1.2, n.r * .7, -.25, 0, Math.PI * 2); c.fill(); c.fillStyle = "#4b3521"; c.beginPath(); c.arc(0, 0, n.r * .34, 0, Math.PI * 2); c.fill(); const sway = Math.sin(now * .0007 + n.x) * 2; c.fillStyle = "#183c20"; c.beginPath(); c.arc(-n.r * .35 + sway, -n.r * .12, n.r * .72, 0, Math.PI * 2); c.arc(n.r * .35 + sway, -n.r * .18, n.r * .68, 0, Math.PI * 2); c.arc(sway, -n.r * .5, n.r * .75, 0, Math.PI * 2); c.fill(); c.fillStyle = "rgba(107,166,72,.32)"; c.beginPath(); c.arc(-n.r * .2, -n.r * .55, n.r * .42, 0, Math.PI * 2); c.fill(); c.restore(); }
    for (const o of map.obstacles) { c.fillStyle = this.mapKey === "overgrowth" ? "#121b14" : "#080e10"; c.shadowColor = "rgba(0,0,0,.8)"; c.shadowBlur = 22; c.fillRect(o.x, o.y, o.w, o.h); c.shadowBlur = 0; c.strokeStyle = this.mapKey === "overgrowth" ? "#536449" : "#354044"; c.lineWidth = 4; c.strokeRect(o.x, o.y, o.w, o.h); if (this.mapKey === "overgrowth") { c.strokeStyle = "rgba(112,157,77,.22)"; c.lineWidth = 7; c.beginPath(); c.moveTo(o.x, o.y + 12); c.lineTo(o.x + o.w * .35, o.y + o.h); c.moveTo(o.x + o.w, o.y + 20); c.lineTo(o.x + o.w * .68, o.y + o.h); c.stroke(); } c.fillStyle = this.mapKey === "overgrowth" ? "rgba(151,190,111,.26)" : "rgba(183,206,196,.13)"; c.font = "700 17px monospace"; c.fillText(o.label, o.x + 18, o.y + 30); }
    for (let i = 0; i < 18; i++) { const x = (i * 367) % map.width, y = (i * 613) % map.height; c.fillStyle = this.mapKey === "overgrowth" ? (i % 3 ? "#32452a" : "#5c4930") : (i % 3 ? "#263034" : "#6b3d2b"); c.fillRect(x, y, 35 + i % 4 * 8, 17); }
    for (const barrel of this.barrels) this.drawBarrel(c, barrel, now);
    for (const p of this.pickups) this.drawPickup(c, p);
    for (const w of this.bossWarnings) { const remain = clamp((w.fireAt - this.gameTime) / (w.kind === "slam" ? 850 : 1050), 0, 1); c.fillStyle = `rgba(232,68,57,${.12 + (1 - remain) * .18})`; c.strokeStyle = "#ef665b"; c.lineWidth = 3; c.setLineDash([12, 8]); c.beginPath(); c.arc(w.x, w.y, w.radius * (1.25 - remain * .25), 0, Math.PI * 2); c.fill(); c.stroke(); c.setLineDash([]); c.fillStyle = "#ff948a"; c.font = "900 10px monospace"; c.textAlign = "center"; c.fillText(w.kind === "slam" ? "SLAM IMPACT" : "ROCK IMPACT", w.x, w.y); c.textAlign = "left"; }
    for (const t of this.toxic) { c.fillStyle = "rgba(124,238,84,.25)"; c.beginPath(); c.arc(t.x, t.y, t.radius + 8, 0, Math.PI * 2); c.fill(); c.fillStyle = "#9bf56d"; c.beginPath(); c.arc(t.x, t.y, t.radius, 0, Math.PI * 2); c.fill(); }
    for (const b of this.bullets) { c.strokeStyle = b.color; c.lineWidth = 2; c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(b.x - b.vx * .018, b.y - b.vy * .018); c.stroke(); }
    for (const z of this.enemies) this.drawEnemy(c, z, now);
    this.drawSupport(c, now);
    this.drawPlayer(c, now);
    for (const p of this.particles) { c.globalAlpha = p.life / p.max; c.fillStyle = p.color; c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); } c.globalAlpha = 1;
    for (const t of this.texts) { c.globalAlpha = clamp(t.life / 280, 0, 1); c.fillStyle = t.color; c.font = `900 ${t.size}px monospace`; c.textAlign = "center"; c.fillText(t.text, t.x, t.y); } c.globalAlpha = 1; c.textAlign = "left";
    c.fillStyle = `rgba(175,202,186,${.025 + Math.sin(now * .0004) * .012})`; for (let i = 0; i < 14; i++) c.fillRect((i * 211 + now * .015) % map.width, (i * 353) % map.height, 260, 70);
  }

  drawPlayer(c: CanvasRenderingContext2D, now: number) {
    const p = this.player, moving = this.keys.has("KeyW") || this.keys.has("KeyA") || this.keys.has("KeyS") || this.keys.has("KeyD") || Math.hypot(this.touchMove.x, this.touchMove.y) > .1;
    const stride = moving ? Math.sin(now * .018) * 5 : 0, flash = this.gameTime < p.invuln && Math.floor(now / 70) % 2;
    c.save(); c.translate(p.x, p.y); c.rotate(p.angle);
    c.fillStyle = "rgba(0,0,0,.55)"; c.beginPath(); c.ellipse(-5, 10, 28, 14, 0, 0, Math.PI * 2); c.fill();
    // Boots and moving legs
    c.strokeStyle = "#242b28"; c.lineWidth = 7; c.lineCap = "round"; c.beginPath(); c.moveTo(-7, -5); c.lineTo(-18 - stride, -9); c.moveTo(-7, 5); c.lineTo(-18 + stride, 10); c.stroke();
    c.strokeStyle = "#111817"; c.lineWidth = 5; c.beginPath(); c.moveTo(-18 - stride, -9); c.lineTo(-23 - stride, -9); c.moveTo(-18 + stride, 10); c.lineTo(-23 + stride, 10); c.stroke();
    // Backpack and tactical torso
    c.fillStyle = "#26332e"; c.beginPath(); c.ellipse(-7, 0, 13, 12, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = "#5b6a61"; c.lineWidth = 2; c.stroke();
    c.fillStyle = flash ? "#eef7e8" : "#59685f"; c.beginPath(); c.ellipse(1, 0, 14, 12, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#1a2421"; c.fillRect(-3, -11, 5, 22); c.fillStyle = "#78877e"; c.fillRect(4, -8, 5, 5); c.fillRect(4, 3, 5, 5);
    // Head, bare forearms and two-handed weapon grip
    c.fillStyle = "#c59a76"; c.beginPath(); c.arc(10, 0, 7, 0, Math.PI * 2); c.fill(); c.fillStyle = "#30251f"; c.beginPath(); c.arc(8, 0, 7, Math.PI / 2, Math.PI * 1.5); c.fill();
    c.strokeStyle = "#c59a76"; c.lineWidth = 5; c.beginPath(); c.moveTo(5, -9); c.lineTo(19, -6); c.lineTo(25, -3); c.moveTo(5, 9); c.lineTo(19, 6); c.lineTo(26, 3); c.stroke();
    c.fillStyle = "#202827"; c.fillRect(19, -4, 23, 8); c.fillStyle = WEAPONS[this.weapon].color; c.fillRect(38, -2.5, this.weapon === "m24" ? 22 : 14, 5); c.fillStyle = "#0b1111"; c.fillRect(23, 4, 7, 8); c.restore();
  }
  drawSupport(c: CanvasRenderingContext2D, now: number) {
    const s = this.support, stride = Math.sin(now * .016) * 3;
    c.save(); c.translate(s.x, s.y); c.rotate(s.angle);
    c.fillStyle = "rgba(0,0,0,.55)"; c.beginPath(); c.ellipse(-4, 10, 25, 12, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = "#172329"; c.lineWidth = 6; c.lineCap = "round"; c.beginPath(); c.moveTo(-7, -5); c.lineTo(-18 - stride, -8); c.moveTo(-7, 5); c.lineTo(-18 + stride, 8); c.stroke();
    c.fillStyle = "#244454"; c.beginPath(); c.ellipse(-5, 0, 12, 11, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = "#75cfff"; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = "#52778a"; c.beginPath(); c.ellipse(2, 0, 13, 11, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = "#b9d9e5"; c.fillRect(-1, -9, 3, 18);
    c.fillStyle = "#b98868"; c.beginPath(); c.arc(11, 0, 6.5, 0, Math.PI * 2); c.fill(); c.fillStyle = "#172127"; c.beginPath(); c.arc(9, 0, 7, Math.PI / 2, Math.PI * 1.5); c.fill();
    c.strokeStyle = "#b98868"; c.lineWidth = 4.5; c.beginPath(); c.moveTo(5, -8); c.lineTo(20, -5); c.moveTo(5, 8); c.lineTo(21, 5); c.stroke();
    c.fillStyle = "#151d20"; c.fillRect(18, -3.5, 28, 7); c.fillStyle = "#75cfff"; c.fillRect(42, -2, 13, 4); c.fillStyle = "#090d0f"; c.fillRect(26, 3, 7, 9); c.restore();
    c.save(); c.textAlign = "center"; c.font = "900 7px monospace"; c.fillStyle = "#75cfff"; c.fillText("SUPPORT · RIFLEMAN", s.x, s.y - 28); c.fillStyle = "rgba(0,0,0,.7)"; c.fillRect(s.x - 18, s.y - 24, 36, 3); c.fillStyle = s.reloadUntil ? "#e9c46a" : "#75cfff"; c.fillRect(s.x - 18, s.y - 24, 36 * (s.reloadUntil ? clamp(1 - (s.reloadUntil - this.gameTime) / 1750, 0, 1) : s.ammo / 30), 3); c.restore();
  }
  drawEnemy(c: CanvasRenderingContext2D, z: Enemy, now: number) {
    const cfg = ZOMBIES[z.kind]; c.save(); c.translate(z.x, z.y); c.rotate(z.angle); c.fillStyle = "rgba(0,0,0,.58)"; c.beginPath(); c.ellipse(-4, z.radius * .55, z.radius * 1.35, z.radius * .58, 0, 0, Math.PI * 2); c.fill();
    if (z.kind === "exploder") { c.fillStyle = `rgba(255,126,37,${.15 + Math.sin(now * .014) * .11})`; c.beginPath(); c.arc(0, 0, z.radius + 13, 0, Math.PI * 2); c.fill(); }
    if (z.kind === "spitter") { c.fillStyle = "rgba(128,255,75,.13)"; c.beginPath(); c.arc(0, 0, z.radius + 10, 0, Math.PI * 2); c.fill(); }
    if (z.kind === "brute") { c.fillStyle = `rgba(199,52,43,${this.bossPhase === 3 ? .28 + Math.sin(now * .015) * .12 : .14})`; c.beginPath(); c.arc(0, 0, z.radius + 20, 0, Math.PI * 2); c.fill(); }
    if (this.spritesReady && this.zombieSprites) {
      const index: Record<ZombieKind, number> = { shambler: 0, runner: 1, tank: 2, spitter: 3, exploder: 4, brute: 5 }, n = index[z.kind], sx = n % 3 * 512, sy = Math.floor(n / 3) * 512;
      const size = z.radius * (z.kind === "brute" ? 4.1 : z.kind === "tank" ? 4 : 3.7); c.globalAlpha = z.flash > 0 ? .55 : 1; c.drawImage(this.zombieSprites, sx, sy, 512, 512, -size / 2, -size / 2, size, size); c.globalAlpha = 1;
      if (z.flash > 0) { c.globalCompositeOperation = "screen"; c.globalAlpha = .55; c.fillStyle = "#fff3c4"; c.beginPath(); c.arc(0, 0, z.radius * .9, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; c.globalCompositeOperation = "source-over"; }
    } else { c.fillStyle = z.flash > 0 ? "#f5f1d6" : cfg.color; c.beginPath(); c.arc(0, 0, z.radius, 0, Math.PI * 2); c.fill(); c.fillStyle = "#f3b74d"; c.fillRect(z.radius * .5, -z.radius * .3, 3, 3); }
    c.restore();
    if (z.hp < z.maxHp || z.kind === "brute") { c.fillStyle = "rgba(0,0,0,.7)"; c.fillRect(z.x - z.radius, z.y - z.radius - 13, z.radius * 2, 5); c.fillStyle = z.kind === "brute" ? "#dd4e45" : "#b5d85a"; c.fillRect(z.x - z.radius, z.y - z.radius - 13, z.radius * 2 * clamp(z.hp / z.maxHp, 0, 1), 5); }
  }
  drawPickup(c: CanvasRenderingContext2D, p: Pickup) { const colors = { coin: "#ffd45e", ammo: "#8fd6ff", medkit: "#7ce6a7", armor: "#7fa9ff", grenade: "#ff9867" }, icons = { coin: "$", ammo: "▰", medkit: "+", armor: "◆", grenade: "●" }; c.save(); c.translate(p.x, p.y + Math.sin(p.bob) * 4); c.shadowColor = colors[p.kind]; c.shadowBlur = 18; c.fillStyle = "#111a1b"; c.fillRect(-12, -12, 24, 24); c.strokeStyle = colors[p.kind]; c.lineWidth = 2; c.strokeRect(-12, -12, 24, 24); c.shadowBlur = 0; c.fillStyle = colors[p.kind]; c.font = "900 13px monospace"; c.textAlign = "center"; c.fillText(icons[p.kind], 0, 5); c.fillStyle = "rgba(235,245,238,.65)"; c.font = "700 5px monospace"; c.fillText(p.kind.toUpperCase(), 0, 18); c.restore(); }
  drawBarrel(c: CanvasRenderingContext2D, b: Barrel, now: number) { c.save(); c.translate(b.x, b.y); if (b.dead) { c.fillStyle = "rgba(20,14,10,.7)"; c.beginPath(); c.ellipse(0, 5, 19, 8, 0, 0, Math.PI * 2); c.fill(); c.restore(); return; } c.fillStyle = "rgba(0,0,0,.55)"; c.beginPath(); c.ellipse(3, 11, 19, 9, 0, 0, Math.PI * 2); c.fill(); c.shadowColor = "#e64f3e"; c.shadowBlur = 8 + Math.sin(now * .005) * 3; c.fillStyle = "#8e2f29"; c.fillRect(-13, -15, 26, 30); c.fillStyle = "#c74d3f"; c.beginPath(); c.ellipse(0, -15, 13, 5, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = "#e8b15c"; c.lineWidth = 3; c.beginPath(); c.moveTo(-13, -7); c.lineTo(13, -7); c.moveTo(-13, 8); c.lineTo(13, 8); c.stroke(); c.shadowBlur = 0; c.fillStyle = "#ffd17a"; c.font = "900 9px monospace"; c.textAlign = "center"; c.fillText("!", 0, 3); c.restore(); }
  drawCrosshair(c: CanvasRenderingContext2D) { const spread = 6 + this.recoil * 95; c.save(); c.translate(this.pointer.x, this.pointer.y); c.strokeStyle = this.reloadingUntil ? "#e9c46a" : this.recoil > .12 ? "#f07867" : "#e8f1e6"; c.lineWidth = 1.5; for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); c.beginPath(); c.moveTo(spread, 0); c.lineTo(spread + 7, 0); c.stroke(); } c.fillStyle = "#e8f1e6"; c.fillRect(-1, -1, 2, 2); c.restore(); }
}
