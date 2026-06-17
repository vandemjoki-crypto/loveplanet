// Helper untuk menghasilkan efek suara Web Audio API
let audioCtx = null;
let explosionBuffer = null;
let textExplosionBuffer = null;

function getContext() {
  if (!audioCtx) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    } catch(e) {
      console.error("Web Audio API not supported", e);
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {}); // Catch safely
  }
  return audioCtx;
}

function getExplosionBuffer(ctx) {
  if (!explosionBuffer) {
    const bufferSize = Math.floor(ctx.sampleRate * 1.5);
    explosionBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = explosionBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }
  return explosionBuffer;
}

function getTextExplosionBuffer(ctx) {
  if (!textExplosionBuffer) {
    const bufferSize = Math.floor(ctx.sampleRate * 3.0);
    textExplosionBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = textExplosionBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }
  return textExplosionBuffer;
}

export function playExplosionSound(sfxVol = 1.0) {
  const ctx = getContext();
  if (!ctx || sfxVol <= 0.01) return;

  try {
    const noise = ctx.createBufferSource();
    noise.buffer = getExplosionBuffer(ctx);
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800 + Math.random() * 400, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 1.5);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime((0.2 + Math.random() * 0.1) * sfxVol, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01 * sfxVol, ctx.currentTime + 1.5);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    noise.start(ctx.currentTime);
    noise.stop(ctx.currentTime + 1.5);
  } catch(e) {
    console.error("Error playing explosion", e);
  }
}

export function playTextExplosionSound(sfxVol = 1.0) {
  const ctx = getContext();
  if (!ctx || sfxVol <= 0.01) return;

  try {
    // 1. Ledakan super besar (Noise besar)
    const noise = ctx.createBufferSource();
    noise.buffer = getTextExplosionBuffer(ctx);
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 3.0);
    
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0, ctx.currentTime);
    noiseGain.gain.linearRampToValueAtTime(0.5 * sfxVol, ctx.currentTime + 0.05);
    noiseGain.gain.exponentialRampToValueAtTime(0.01 * sfxVol, ctx.currentTime + 3.0);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(ctx.currentTime);
    noise.stop(ctx.currentTime + 3.0);

    // 2. Efek Sweep Sintetis Keren (Membentuk Tulisan)
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.5);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 2.0);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0, ctx.currentTime);
    oscGain.gain.linearRampToValueAtTime(0.3 * sfxVol, ctx.currentTime + 0.1);
    oscGain.gain.exponentialRampToValueAtTime(0.01 * sfxVol, ctx.currentTime + 2.0);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 2.0);

    // 3. Suara gemerlap (Sparkles)
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        try {
          const sparkOsc = ctx.createOscillator();
          sparkOsc.type = 'sine';
          sparkOsc.frequency.setValueAtTime(1500 + Math.random() * 1000, ctx.currentTime);
          const sparkGain = ctx.createGain();
          sparkGain.gain.setValueAtTime(0, ctx.currentTime);
          sparkGain.gain.linearRampToValueAtTime(0.1 * sfxVol, ctx.currentTime + 0.01);
          sparkGain.gain.exponentialRampToValueAtTime(0.01 * sfxVol, ctx.currentTime + 0.5);
          sparkOsc.connect(sparkGain);
          sparkGain.connect(ctx.destination);
          sparkOsc.start(ctx.currentTime);
          sparkOsc.stop(ctx.currentTime + 0.5);
        } catch(e) {}
      }, i * 200 + Math.random() * 100);
    }

  } catch(e) {
    console.error("Error playing text explosion", e);
  }
}
