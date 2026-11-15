export class AudioDirector {
  private ctx?: AudioContext;
  volume = .45;
  muted = false;

  private context() {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  tone(freq: number, duration: number, type: OscillatorType = "square", gain = .1, slide = 0) {
    if (this.muted) return;
    const ctx = this.context();
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), ctx.currentTime + duration);
    amp.gain.setValueAtTime(gain * this.volume, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + duration);
    osc.connect(amp).connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + duration);
  }

  shot(kind: string) {
    if (kind === "m870") { this.tone(72, .19, "sawtooth", .27, -38); this.tone(190, .055, "square", .09, -80); }
    else if (kind === "m24") { this.tone(61, .22, "sawtooth", .25, -22); this.tone(320, .06, "square", .1, -190); }
    else if (kind === "m249") { this.tone(78, .085, "sawtooth", .14, -24); this.tone(190, .025, "square", .05, -60); }
    else if (kind === "m79" || kind === "rpg7") { this.tone(kind === "rpg7" ? 44 : 58, .28, "sawtooth", .24, -16); }
    else if (kind === "deagle") { this.tone(88, .14, "sawtooth", .2, -40); this.tone(245, .04, "square", .07, -100); }
    else if (kind === "mp5" || kind === "vector") this.tone(kind === "vector" ? 165 : 145, .042, "square", .075, -32);
    else if (kind === "m4a1" || kind === "ak47") { this.tone(kind === "ak47" ? 92 : 112, .072, "sawtooth", .11, -28); }
    else this.tone(180, .07, "square", .09, -55);
  }
  hit(critical = false) { this.tone(critical ? 820 : 520, .035, "sine", critical ? .08 : .045, 80); }
  empty() { this.tone(240, .025, "square", .035); }
  reload() { this.tone(370, .035, "triangle", .04); setTimeout(() => this.tone(520, .04, "triangle", .04), 200); }
  pickup() { this.tone(620, .05, "sine", .045, 260); }
  hurt() { this.tone(68, .17, "sawtooth", .12, -20); }
  explosion() { this.tone(48, .35, "sawtooth", .2, -18); }
  wave() { this.tone(220, .13, "sawtooth", .07, 110); setTimeout(() => this.tone(330, .2, "sawtooth", .08, 150), 140); }
}

export const audio = new AudioDirector();
