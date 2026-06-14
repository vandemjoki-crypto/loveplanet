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

  const handleReachDestination = useCallback(() => {
    if (tunnelAudio) {
      tunnelAudio.pause();
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
           <Scene config={config} isFinale={isFinale} onReachDestination={handleReachDestination} audioDuration={audioDuration} />
           
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
