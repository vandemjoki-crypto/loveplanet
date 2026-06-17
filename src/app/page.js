'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Scene from '../components/Scene';
import styles from './page.module.css';

export default function Home() {
  const [config, setConfig] = useState(null);
  const [started, setStarted] = useState(false);
  const [audio, setAudio] = useState(null);
  const [tunnelAudio, setTunnelAudio] = useState(null);
  const [finaleAudio, setFinaleAudio] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [showScroll, setShowScroll] = useState(false);
  const [isFinale, setIsFinale] = useState(false);
  const [dialogueStep, setDialogueStep] = useState(0);
  const overlayRef = useRef(null);

  useEffect(() => {
    fetch(`/api/config?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        setConfig(data);
        if (data.musicUrl) {
          const newAudio = new Audio(data.musicUrl);
          newAudio.addEventListener('loadedmetadata', () => {
            setAudioDuration(newAudio.duration);
          });
          setAudio(newAudio);
        }
        if (data.tunnelMusicUrl) {
          setTunnelAudio(new Audio(data.tunnelMusicUrl));
        }
        if (data.finaleMusicUrl) {
          setFinaleAudio(new Audio(data.finaleMusicUrl));
        }
      });
  }, []);

  // Mencegah browser melakukan native pinch-to-zoom agar dialog
  // tidak ikut membesar saat user mencubit layar.
  useEffect(() => {
    const blockMultiTouch = (e) => {
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
      }
    };
    // gesturestart/change/end adalah event proprietary iOS Safari untuk pinch
    const blockGesture = (e) => e.preventDefault();

    document.addEventListener('touchstart', blockMultiTouch, { passive: false });
    document.addEventListener('touchmove', blockMultiTouch, { passive: false });
    document.addEventListener('gesturestart', blockGesture, { passive: false });
    document.addEventListener('gesturechange', blockGesture, { passive: false });
    document.addEventListener('gestureend', blockGesture, { passive: false });

    return () => {
      document.removeEventListener('touchstart', blockMultiTouch);
      document.removeEventListener('touchmove', blockMultiTouch);
      document.removeEventListener('gesturestart', blockGesture);
      document.removeEventListener('gesturechange', blockGesture);
      document.removeEventListener('gestureend', blockGesture);
    };
  }, []);

  // Tampilkan tombol scroll jika konten overflow
  useEffect(() => {
    if (!started) {
      const el = overlayRef.current;
      if (el) {
        const check = () => setShowScroll(el.scrollHeight > el.clientHeight + 10);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
      }
    }
  }, [started, config]);

  const handleStart = () => {
    setStarted(true);
    
    // Unlock semua audio object agar tidak diblokir browser saat dimainkan nanti
    if (audio) {
      audio.play().then(() => audio.pause()).catch(() => {});
    }
    if (finaleAudio) {
      finaleAudio.play().then(() => finaleAudio.pause()).catch(() => {});
    }

    if (tunnelAudio) {
      tunnelAudio.loop = true;
      tunnelAudio.play().catch(e => console.error("Tunnel audio playback failed:", e));
    }
  };

  // Fade-out musik lorong saat hitung mundur 3-2-1 dimulai dan bunyikan efek suara
  const handleCountdownStart = useCallback(() => {
    // Generate sound efek hitung mundur (3, 2, 1, GO)
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const playBeep = (freq, time, duration, vol = 0.1) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + time);
          gain.gain.setValueAtTime(0, ctx.currentTime + time);
          gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + time + 0.05);
          gain.gain.setValueAtTime(vol, ctx.currentTime + time + duration - 0.05);
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + time + duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + time);
          osc.stop(ctx.currentTime + time + duration);
        };

        // Sinkronisasi dengan TunnelExitSequence di Scene.js (2.5s, 3.5s, 4.5s, 5.5s)
        playBeep(440, 2.5, 0.2); // 3
        playBeep(440, 3.5, 0.2); // 2
        playBeep(440, 4.5, 0.2); // 1
        playBeep(880, 5.5, 0.6, 0.15); // GO
      }
    } catch(e) {
      console.error("Gagal memutar suara hitung mundur", e);
    }

    if (!tunnelAudio) return;
    const fadeStep = 0.05;
    const interval = setInterval(() => {
      if (tunnelAudio.volume > fadeStep) {
        tunnelAudio.volume = Math.max(0, tunnelAudio.volume - fadeStep);
      } else {
        tunnelAudio.volume = 0;
        tunnelAudio.pause();
        clearInterval(interval);
      }
    }, 75); // setiap 75ms → fade selesai dalam ~1.5 detik
  }, [tunnelAudio]);

  const handleReachDestination = useCallback(() => {
    // Pastikan tunnelAudio benar-benar berhenti (sudah di-fade oleh handleCountdownStart)
    if (tunnelAudio) {
      tunnelAudio.pause();
      tunnelAudio.volume = 1; // reset volume untuk pakai ulang
    }
    if (audio) {
      audio.loop = false;
      audio.addEventListener('ended', () => {
        setIsFinale(true);
        if (finaleAudio) {
          finaleAudio.loop = true;
          finaleAudio.play().catch(e => console.error("Finale audio playback failed:", e));
        }
      });
      audio.play().catch(e => console.error("Audio playback failed:", e));
    } else {
      setIsFinale(true);
      if (finaleAudio) {
        finaleAudio.loop = true;
        finaleAudio.play().catch(e => console.error("Finale audio playback failed:", e));
      }
    }
  }, [audio, tunnelAudio, finaleAudio]);

  // Putar efek kembang api saat isFinale aktif
  useEffect(() => {
    if (!isFinale) return;
    
    let isActive = true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const playFirework = () => {
        if (!isActive) return;
        
        // --- 1. Suara luncuran (whistle up) ---
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        // Pitch naik perlahan
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.8);
        
        // Volume luncuran kecil
        oscGain.gain.setValueAtTime(0, ctx.currentTime);
        oscGain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.2);
        oscGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
        
        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.8);
        
        // --- 2. Suara ledakan (noise) ---
        setTimeout(() => {
          if (!isActive) return;
          const bufferSize = ctx.sampleRate * 1.5; // 1.5 detik ledakan
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1; // white noise
          }
          
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;
          
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1000, ctx.currentTime);
          filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 1.5);
          
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05); // attack cepat
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5); // decay perlahan
          
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          
          noise.start(ctx.currentTime);
          noise.stop(ctx.currentTime + 1.5);
        }, 800); // Ledakan terjadi 0.8 detik setelah luncuran
        
        // Jadwalkan kembang api berikutnya secara acak (1.5 - 3.5 detik)
        if (isActive) {
          setTimeout(playFirework, 1500 + Math.random() * 2000);
        }
      };
      
      // Mulai kembang api berantai setelah jeda 1 detik masuk finale
      setTimeout(playFirework, 1000);
      
    } catch(e) {
      console.error("Gagal memutar suara kembang api", e);
    }
    
    return () => { isActive = false; };
  }, [isFinale]);

  const handleYes = () => {
    setDialogueStep(2); // Menampilkan pesan ajakan naik roket (opsional, akan terlihat sekilas)
    handleStart(); // Langsung transisi ke 3D, delay akan ditangani oleh animasi kamera
  };

  const handleNo = () => {
    setDialogueStep(1); // Menampilkan pesan lucunya
  };

  const handleScrollDown = () => {
    const el = overlayRef.current;
    if (el) el.scrollBy({ top: el.clientHeight * 0.7, behavior: 'smooth' });
  };

  if (!config) return <div className={styles.loading}></div>;

  return (
    <main className={styles.main}>
      {!started ? (
        <>
          <div className={styles.overlay} ref={overlayRef}>
            <div className={styles.rpgContainer}>
              <div className={styles.avatarBox}>
                <img src="/astronaut_avatar.png" alt="Astronaut" className={styles.avatarImg} />
              </div>
              <div className={styles.dialogueBox}>
                <h3 className={styles.characterName}>{config.astronautName || 'Astronot'}</h3>
                
                {dialogueStep === 0 && (
                  <>
                    <p className={styles.dialogueText}>"Apakah kamu siap melihat kejutanmu?"</p>
                    <div className={styles.rpgButtons}>
                      <button className={styles.btnYes} onClick={handleYes}>Iya</button>
                      <button className={styles.btnNo} onClick={handleNo}>Tidak</button>
                    </div>
                  </>
                )}

                {dialogueStep === 1 && (
                  <>
                    <p className={styles.dialogueText}>"Ayo dong, aku udah nyiapin ini lama lho! 🥺"</p>
                    <div className={styles.rpgButtons}>
                      <button className={styles.btnYes} onClick={handleYes}>Iya deh</button>
                    </div>
                  </>
                )}

                {dialogueStep === 2 && (
                  <>
                    <p className={styles.dialogueText}>"Bagus! Ayo ikut aku naik roket luar angkasa dan bersiaplah untuk melompat ke kecepatan cahaya! 🚀"</p>
                  </>
                )}

              </div>
            </div>
          </div>
          {showScroll && (
            <button className={styles.scrollBtn} onClick={handleScrollDown}>
              ↓ scroll
            </button>
          )}
        </>
      ) : (
        <div className={styles.sceneContainer}>
           <Scene config={config} isFinale={isFinale} onReachDestination={handleReachDestination} onCountdownStart={handleCountdownStart} audioDuration={audioDuration} />
           
           {/* Flash Silau Putih Instan (Diletakkan di HTML murni agar tidak menunggu 3D Canvas selesai dimuat) */}
           <div style={{
             position: 'fixed',
             top: 0, left: 0, width: '100vw', height: '100vh',
             backgroundColor: '#ffffff',
             zIndex: 9999,
             pointerEvents: 'none',
             animation: 'enterFlashFadeDOM 3.0s ease-out forwards'
           }} />
           <style>{`
             @keyframes enterFlashFadeDOM {
               0% { opacity: 1; }
               20% { opacity: 1; }
               100% { opacity: 0; display: none; }
             }
           `}</style>

           {/* Tombol rahasia testing finale — kecil dan tersembunyi di pojok kanan bawah */}
           {!isFinale && (
             <button
               onClick={() => setIsFinale(true)}
               style={{
                 position: 'fixed',
                 bottom: '16px',
                 right: '16px',
                 background: 'rgba(255,255,255,0.07)',
                 border: '1px solid rgba(255,255,255,0.15)',
                 color: 'rgba(255,255,255,0.3)',
                 borderRadius: '8px',
                 padding: '6px 10px',
                 fontSize: '11px',
                 cursor: 'pointer',
                 zIndex: 100,
                 backdropFilter: 'blur(6px)',
                 transition: 'all 0.3s',
               }}
               onMouseEnter={e => {
                 e.target.style.background = 'rgba(255,100,200,0.25)';
                 e.target.style.color = 'rgba(255,255,255,0.9)';
                 e.target.style.borderColor = 'rgba(255,100,200,0.5)';
               }}
               onMouseLeave={e => {
                 e.target.style.background = 'rgba(255,255,255,0.07)';
                 e.target.style.color = 'rgba(255,255,255,0.3)';
                 e.target.style.borderColor = 'rgba(255,255,255,0.15)';
               }}
             >
               🎂 Finale
             </button>
           )}
        </div>
      )}
    </main>
  );
}
