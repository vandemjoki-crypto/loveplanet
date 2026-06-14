import { useRef, useMemo, useState, useEffect, Suspense, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Stars, useVideoTexture, Billboard, Html } from '@react-three/drei';
import * as THREE from 'three';

// Buat tekstur lingkaran sempurna untuk partikel bulat
function makeCircleTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

function ImagePhoto({ url, ...props }) {
  const texture = useLoader(THREE.TextureLoader, url);
  return (
    <mesh {...props}>
      <planeGeometry args={[0.8, 0.8]} />
      <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
    </mesh>
  );
}

function VideoPhoto({ url, ...props }) {
  const texture = useVideoTexture(url, { muted: true, loop: true, start: true, crossOrigin: 'Anonymous' });
  return (
    <mesh {...props}>
      <planeGeometry args={[0.8, 0.8]} />
      <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
    </mesh>
  );
}

function MediaItem({ url, ...props }) {
  const isVideo = url.match(/\.(mp4|webm|ogg|mov)$/i);
  if (isVideo) {
    return <VideoPhoto url={url} {...props} />;
  }
  return <ImagePhoto url={url} {...props} />;
}

function PhotoRing({ photos, config, baseRadius = 5.5, layerSpacing = 1.0, numLayers = 4, totalCount = 120 }) {
  // Rotasi akan dikendalikan oleh grup induk (RotatingRingsSystem)
  const photoData = useMemo(() => {
    const photosPerLayer = Math.max(1, Math.round(totalCount / numLayers));
    const total = photosPerLayer * numLayers;
    const data = [];

    // Buat offset sudut acak untuk setiap lapisan agar tidak sejajar
    const layerOffsets = Array.from({ length: numLayers }, () => Math.random() * Math.PI * 2);

    for (let i = 0; i < total; i++) {
      const url = photos[i % photos.length];
      const layerIndex = Math.floor(i / photosPerLayer);
      const photoIndexInLayer = i % photosPerLayer;

      const angleOffset = layerOffsets[layerIndex];
      const randomJitter = (Math.random() - 0.5) * 0.2;
      const angle = (photoIndexInLayer / photosPerLayer) * Math.PI * 2 + angleOffset + randomJitter;

      // Ambil konfigurasi dinamis dari Admin Panel
      const ringConfig = config.particleRingLayers || [];
      const currentLayerConfig = ringConfig.length > 0 ? ringConfig[layerIndex % ringConfig.length] : {};
      const currentSubLayers = currentLayerConfig.subLayers || 10;
      
      // Pilih secara acak di garis/sub-lapisan mana foto ini akan ditaruh!
      const randomSubLayer = Math.floor(Math.random() * currentSubLayers);
      const rOffset = (randomSubLayer - (currentSubLayers - 1) / 2) * 0.1;

      const r = baseRadius + (layerIndex * layerSpacing);
      const finalR = r + rOffset; // Foto ditaruh acak di sabuk, tapi tetap di atas garis orbit partikel yang presisi

      const x = Math.cos(angle) * finalR;
      const z = Math.sin(angle) * finalR;
      const y = 0; // Sejajar rata di satu bidang horizontal

      data.push({ url, position: [x, y, z], rotation: [0, -angle + Math.PI / 2, 0] });
    }
    return data;
  }, [photos, baseRadius, layerSpacing, numLayers, totalCount]);

  return (
    <group>
      {photoData.map((data, i) => (
        <MediaItem
          key={i}
          url={data.url}
          position={data.position}
          rotation={data.rotation}
        />
      ))}
    </group>
  );
}

function CenterSlideshow({ photos }) {
  const [index, setIndex] = useState(0);
  const groupRef = useRef();

  useEffect(() => {
    if (!photos || photos.length === 0) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % photos.length);
    }, 4000); // Ganti foto di tengah setiap 4 detik
    return () => clearInterval(interval);
  }, [photos]);

  if (!photos || photos.length === 0) return null;

  const currentUrl = photos[index];

  return (
    <group>
      {/* Ukuran planet radius=4 (diameter=8). Skala 5 dari plane 0.8 = ukuran 4 */}
      <MediaItem url={currentUrl} position={[0, 0, 0]} scale={[5, 5, 5]} />
    </group>
  );
}

function ParticlePlanet({ colors }) {
  const pointsRef = useRef();
  
  const particlesData = useMemo(() => {
    const count = 5000;
    const positions = new Float32Array(count * 3);
    const colorArray = new Float32Array(count * 3);
    const palette = colors && colors.length > 0 ? colors : ['#b100ff', '#ff00b1', '#00b1ff'];
    const THREEColors = palette.map(c => new THREE.Color(c));
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos((Math.random() * 2) - 1);
      const r = 4 + (Math.random() - 0.5) * 0.2; 
      positions.set([r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi)], i * 3);
      THREEColors[Math.floor(Math.random() * THREEColors.length)].toArray(colorArray, i * 3);
    }
    return { positions, colors: colorArray };
  }, [colors]);

  const circleTex = useMemo(() => makeCircleTexture(), []);

  useFrame(() => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.001; 
      pointsRef.current.rotation.x += 0.0005;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={particlesData.positions.length / 3} array={particlesData.positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={particlesData.colors.length / 3} array={particlesData.colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.12} vertexColors={true} transparent alphaMap={circleTex} alphaTest={0.01} depthWrite={false} sizeAttenuation={true} />
    </points>
  );
}

// Satu lapisan cincin partikel dengan warna dan radius tertentu
function ParticleRingLayer({ color = '#00d2ff', radius = 5, count = 3000, subLayers = 10 }) {
  const particlesData = useMemo(() => {
    const countPerSub = Math.floor(count / subLayers);
    const positions = new Float32Array(subLayers * countPerSub * 3);
    
    let index = 0;
    for (let s = 0; s < subLayers; s++) {
      // Offset garis cincin: diseimbangkan di sekitar radius utama
      const rOffset = (s - (subLayers - 1) / 2) * 0.1; 
      for (let i = 0; i < countPerSub; i++) {
        const theta = Math.random() * 2 * Math.PI;
        const r = radius + rOffset + (Math.random() - 0.5) * 0.05;
        positions.set([r * Math.cos(theta), 0, r * Math.sin(theta)], index * 3);
        index++;
      }
    }
    return positions;
  }, [radius, count, subLayers]);

  const circleTex = useMemo(() => makeCircleTexture(), []);
  const threeColor = useMemo(() => new THREE.Color(color), [color]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={particlesData.length / 3} array={particlesData} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color={threeColor} transparent opacity={0.8} alphaMap={circleTex} alphaTest={0.01} depthWrite={false} sizeAttenuation={true} />
    </points>
  );
}

// Multi lapisan cincin dari konfigurasi admin
function MultiParticleRings({ layers, numLayers = 4, baseRadius = 5.5, layerSpacing = 1.0 }) {
  const defaultLayers = [ { color: '#00d2ff' }, { color: '#b100ff' } ];
  const ringLayers = (layers && layers.length > 0) ? layers : defaultLayers;

  // Render sebanyak numLayers agar selalu identik jumlahnya dengan PhotoRing
  const ringLayersToDraw = Array.from({ length: numLayers }, (_, i) => {
    return ringLayers[i % ringLayers.length];
  });

  return (
    <>
      {ringLayersToDraw.map((layer, i) => {
        // Ambil pengaturan ketebalan subLayers langsung dari config yang diatur Admin
        const subLayersCount = layer.subLayers || 10;
        return (
          <ParticleRingLayer
            key={i}
            color={layer.color || '#ffffff'}
            radius={baseRadius + i * layerSpacing}
            subLayers={subLayersCount}
            count={subLayersCount * 300} // Tetap 300 partikel per sub-lapisan
          />
        );
      })}
    </>
  );
}

// Tetap ada untuk backward-compat
function ParticleRing({ colors }) {
  return null; // Digantikan MultiParticleRings
}

function AmbientParticles({ colors }) {
  const pointsRef = useRef();
  const circleTex = useMemo(() => makeCircleTexture(), []);

  const particlesData = useMemo(() => {
    const count = 3000;
    const positions = new Float32Array(count * 3);
    const colorArray = new Float32Array(count * 3);
    const palette = colors && colors.length > 0 ? colors : ['#ffffff', '#00d2ff', '#b100ff'];
    const THREEColors = palette.map(c => new THREE.Color(c));
    for (let i = 0; i < count; i++) {
      positions.set([
        (Math.random()-0.5)*50, 
        (Math.random()-0.5)*50, 
        (Math.random()-0.5)*50
      ], i * 3);
      THREEColors[Math.floor(Math.random() * THREEColors.length)].toArray(colorArray, i * 3);
    }
    return { positions, colors: colorArray };
  }, [colors]);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.015;
      pointsRef.current.rotation.x = state.clock.elapsedTime * 0.005;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={particlesData.positions.length / 3} array={particlesData.positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={particlesData.colors.length / 3} array={particlesData.colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.15} vertexColors={true} transparent opacity={0.25} alphaMap={circleTex} alphaTest={0.01} depthWrite={false} sizeAttenuation={true} />
    </points>
  );
}

// ===== MODEL PESAWAT LUAR ANGKASA (ROKET) =====
function StylizedRocket({ isSlowMode }) {
  const rocketRef = useRef();
  const fireRef = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const speedMultiplier = isSlowMode ? 0.2 : 1.0;
    
    if (rocketRef.current) {
      // Turbulensi: roket bergetar hebat saat warp speed, tenang saat ngerem
      rocketRef.current.position.y = -1.5 + Math.sin(t * 30 * speedMultiplier) * 0.05;
      rocketRef.current.position.x = Math.cos(t * 25 * speedMultiplier) * 0.05;
      // Rotasi pelan di sumbu Z agar terasa dinamis
      rocketRef.current.rotation.z = Math.sin(t * 10 * speedMultiplier) * 0.02;
    }

    if (fireRef.current) {
      // Api pendorong berkedip dan membesar saat cepat, mengecil saat lambat
      const fireScale = isSlowMode ? 0.4 : 1.2;
      fireRef.current.scale.y = fireScale + Math.random() * (isSlowMode ? 0.1 : 0.5);
      fireRef.current.scale.x = 1 + Math.random() * (isSlowMode ? 0.05 : 0.2);
      fireRef.current.scale.z = 1 + Math.random() * (isSlowMode ? 0.05 : 0.2);
    }
  });

  return (
    // Dimundurkan lebih jauh (Z=85) dan sedikit diturunkan agar seluruh badan roket masuk ke layar penuh
    <group ref={rocketRef} position={[0, -2.0, 85]} scale={[0.7, 0.7, 0.7]}>
       {/* Rotasi dibuat SERONG (Miring dan Menukik) agar seluruh badan, sayap, dan jendela terlihat jelas oleh kamera */}
       <group rotation={[-Math.PI / 2 + 0.4, 0.6, 0.2]}>
         
         {/* 1. Badan Utama */}
         <mesh position={[0, 0, 0]}>
           <cylinderGeometry args={[0.8, 1.2, 4, 32]} />
           <meshStandardMaterial color="#eeeeee" metalness={0.6} roughness={0.2} />
         </mesh>
         
         {/* 2. Hidung Roket */}
         <mesh position={[0, 2.9, 0]}>
           <coneGeometry args={[0.8, 1.8, 32]} />
           <meshStandardMaterial color="#ff3366" metalness={0.5} roughness={0.3} />
         </mesh>
         
         {/* 3. Jendela Kabin Astronot (Bercahaya Biru) */}
         <mesh position={[0, 1, 0.8]} rotation={[Math.PI / 2, 0, 0]}>
           <cylinderGeometry args={[0.35, 0.35, 0.4, 32]} />
           <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={0.8} />
         </mesh>

         {/* 4. Sayap (Fins) */}
         <mesh position={[1.2, -1.5, 0]} rotation={[0, 0, -Math.PI/6]}>
           <boxGeometry args={[1.5, 1.2, 0.1]} />
           <meshStandardMaterial color="#ff3366" />
         </mesh>
         <mesh position={[-1.2, -1.5, 0]} rotation={[0, 0, Math.PI/6]}>
           <boxGeometry args={[1.5, 1.2, 0.1]} />
           <meshStandardMaterial color="#ff3366" />
         </mesh>
         <mesh position={[0, -1.5, -1.2]} rotation={[Math.PI/6, 0, 0]}>
           <boxGeometry args={[0.1, 1.2, 1.5]} />
           <meshStandardMaterial color="#ff3366" />
         </mesh>

         {/* 5. Mesin Pendorong */}
         <mesh position={[0, -2.3, 0]}>
           <cylinderGeometry args={[1.0, 1.4, 0.6, 32]} />
           <meshStandardMaterial color="#222222" metalness={0.8} roughness={0.5} />
         </mesh>

         {/* 6. Semburan Api Plasma */}
         {/* Diputar 180 derajat (Math.PI) agar ujung lancip api mengarah ke belakang pesawat */}
         {/* Api disembunyikan jika roket sedang parkir (isParked) */}
         {!isSlowMode?.isParked && (
           <>
             <mesh ref={fireRef} position={[0, -4.1, 0]} rotation={[Math.PI, 0, 0]}>
               <coneGeometry args={[1.0, 3.0, 32]} />
               <meshBasicMaterial color="#00e5ff" transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} />
             </mesh>
             <pointLight position={[0, -3, 0]} distance={15} intensity={isSlowMode ? 1 : 4} color="#00e5ff" />
           </>
         )}
       </group>
    </group>
  );
}

// Animasi Boarding dan LaunchPlatform dihapus, transisi langsung lompat ke lorong dengan Flash Putih

// ===== HOOK: Ikuti visual viewport (area layar yang terlihat saat zoom) =====
// Saat user pinch-zoom, visualViewport mengecil dan bergeser.
// Hook ini mengambil posisi & ukuran visual viewport secara real-time,
// sehingga container overlay dapat terkunci tepat pada area yang terlihat.
// scale berisi kebalikan dari zoom browser (untuk melawan scale-up UI)
function useVisualViewport() {
  const getState = () => {
    if (typeof window === 'undefined') return { width: 375, height: 667, offsetLeft: 0, offsetTop: 0, scale: 1 };
    const vvp = window.visualViewport;
    if (!vvp) return { width: window.innerWidth, height: window.innerHeight, offsetLeft: 0, offsetTop: 0, scale: 1 };
    return {
      width: vvp.width,
      height: vvp.height,
      offsetLeft: vvp.offsetLeft,
      offsetTop: vvp.offsetTop,
      scale: vvp.scale || 1,
    };
  };
  const [state, setState] = useState(getState);
  useEffect(() => {
    const update = () => setState(getState());
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', update);
      window.visualViewport.addEventListener('scroll', update);
    }
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', update);
        window.visualViewport.removeEventListener('scroll', update);
      }
    };
  }, []);
  return state;
}

// ===== LORONG WAKTU (WARP SPEED TUNNEL) ======
function GalaxyTimeTunnel({ active, photos, dialogues = [], isExiting, tunnelClickCount, setTunnelClickCount, config, tunnelIsSlowMode, setTunnelIsSlowMode, setTunnelDialogueIndex }) {
  const dustRef = useRef();
  const photosGroupRef = useRef();
  const circleTex = useMemo(() => makeCircleTexture(), []);
  const isSlowRef = useRef(false);
  const speedRef = useRef(250);

  // Fallback jika array kosong
  const safeDialogues = dialogues && dialogues.length > 0 ? dialogues : ["..."];

  // Mencegah bentrok dengan double-click
  useEffect(() => {
    let clickTimer;
    const handleClick = (e) => {
      if (e.detail === 1) {
        clickTimer = setTimeout(() => {
          const nextSlowMode = !isSlowRef.current;
          isSlowRef.current = nextSlowMode;
          setTunnelIsSlowMode(nextSlowMode);
          
          if (nextSlowMode) {
            setTunnelDialogueIndex(curr => (curr + 1) % safeDialogues.length);
          }
          
          setTunnelClickCount(c => c + 1);
        }, 200);
      }
    };
    const handleDblClick = () => {
      clearTimeout(clickTimer);
    };

    if (active) {
      window.addEventListener('click', handleClick);
      window.addEventListener('dblclick', handleDblClick);
    }
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('dblclick', handleDblClick);
      clearTimeout(clickTimer);
    };
  }, [active]);

  // Fast Passing Dust (Efek Bintang Bergerak Cepat / Warp Speed)
  const dustData = useMemo(() => {
    const count = 5000; 
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const r = 1 + Math.random() * 35; 
      const z = -50 + Math.random() * 200;
      pos.set([Math.cos(theta) * r, Math.sin(theta) * r, z], i * 3);
    }
    return { pos };
  }, []);

  // Foto-foto yang melayang di dalam lorong
  const tunnelPhotos = useMemo(() => {
    if (!photos || photos.length === 0) return [];
    return Array.from({length: 15}).map((_, i) => {
      const url = photos[i % photos.length];
      const theta = Math.random() * Math.PI * 2;
      const r = 3 + Math.random() * 8; // Radius aman agar tidak tertabrak kamera langsung
      const z = -50 + (i / 15) * 200; 
      return { url, x: Math.cos(theta)*r, y: Math.sin(theta)*r, z };
    });
  }, [photos]);

  useFrame((state, delta) => {
    // Lerp kecepatan agar transisi mengerem sangat mulus
    const targetSpeed = tunnelIsSlowMode ? 15 : 250;
    speedRef.current += (targetSpeed - speedRef.current) * delta * 3.0;

    if (dustRef.current) {
      const positions = dustRef.current.geometry.attributes.position.array;
      for (let i = 0; i < 5000; i++) {
        let z = positions[i * 3 + 2];
        z += delta * speedRef.current;
        if (z > 150) z -= 200; // Mencegah partikel menggumpal menjadi satu, mempertahankan distribusi acak
        positions[i * 3 + 2] = z;
      }
      dustRef.current.geometry.attributes.position.needsUpdate = true;
    }

    if (photosGroupRef.current) {
      photosGroupRef.current.children.forEach((child) => {
        child.position.z += delta * speedRef.current;
        if (child.position.z > 150) {
          child.position.z -= 200;
          // Acak ulang posisi XY agar letaknya bervariasi setiap kali wrap around
          const theta = Math.random() * Math.PI * 2;
          const r = 3 + Math.random() * 8;
          child.position.x = Math.cos(theta)*r;
          child.position.y = Math.sin(theta)*r;
        }
      });
    }
  });

  if (!active) return null;

  return (
    <group>
      {/* Fast Passing Dust */}
      <points ref={dustRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={dustData.pos.length / 3} array={dustData.pos} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.25} color="#ffffff" transparent opacity={0.8} alphaMap={circleTex} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>

      {/* Model Roket Astronot */}
      <StylizedRocket isSlowMode={tunnelIsSlowMode} />

      {/* Terbang Bersama Foto */}
      <group ref={photosGroupRef}>
        {tunnelPhotos.map((item, i) => (
          // Skala foto dibuat lebih kecil sedikit di lorong agar tidak menutupi bintang
          <MediaItem key={i} url={item.url} position={[item.x, item.y, item.z]} scale={[2.5, 2.5, 2.5]} />
        ))}
      </group>
    </group>
  );
}

// ===== GALAXY TIME TUNNEL OVERLAY (2D) =====
function GalaxyTimeTunnelOverlay({ active, isExiting, tunnelClickCount, config, tunnelIsSlowMode, tunnelDialogueIndex, dialogues = [] }) {
  const vp = useVisualViewport();
  if (!active) return null;
  const safeDialogues = dialogues && dialogues.length > 0 ? dialogues : ["..."];

  // Container selalu terkunci tepat pada area visual viewport yang terlihat
  const containerStyle = {
    position: 'fixed',
    top: `${vp.offsetTop}px`,
    left: `${vp.offsetLeft}px`,
    width: `${vp.width}px`,
    height: `${vp.height}px`,
    pointerEvents: 'none',
    zIndex: 9999,
  };

  return (
    <div style={containerStyle}>
      {/* Tutorial Text (Atas) */}
      {!isExiting && (
        <div style={{
          position: 'absolute',
          top: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(10, 15, 30, 0.7)',
          padding: '12px 24px',
          borderRadius: '30px',
          color: '#fff',
          fontFamily: 'sans-serif',
          fontSize: '14px',
          textAlign: 'center',
          border: tunnelClickCount >= 6 ? '2px solid #ff3366' : '1px solid rgba(0, 229, 255, 0.5)',
          boxShadow: tunnelClickCount >= 6 ? '0 0 15px rgba(255, 51, 102, 0.5)' : 'none',
          textShadow: '0 0 5px #000',
          transition: 'all 0.5s ease',
          whiteSpace: 'nowrap'
        }}>
          {tunnelClickCount < 6 
            ? "Tekan layar 1x untuk memperlambat roket, dan tekan 1x lagi untuk melaju."
            : "🚀 Tekan layar 2x dengan cepat untuk sampai ke tujuan!"}
        </div>
      )}

      {/* Dialog Astronot Saat Mode Lambat (Klik 1x) */}
      {tunnelIsSlowMode && !isExiting && (
        <div style={{
          position: 'absolute',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(10, 15, 30, 0.85)',
          border: '2px solid #00e5ff',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: 'inset 0 0 20px rgba(0, 229, 255, 0.15), 0 0 30px rgba(0, 229, 255, 0.2)',
          backdropFilter: 'blur(8px)',
          maxWidth: '600px',
          width: '90%',
          color: 'white',
          fontFamily: "'Courier New', Courier, monospace",
          gap: '20px',
          animation: 'fadeInDialog 0.5s ease-out',
          pointerEvents: 'auto'
        }}>
          <img src="/astronaut_avatar.png" alt="Astronaut" style={{
            width: '80px', height: '80px', borderRadius: '50%',
            border: '3px solid #00e5ff', flexShrink: 0
          }} />
          <div style={{ textAlign: 'left' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#00e5ff', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
              {config.astronautName || 'Astronot'}
            </h4>
            <p style={{ margin: 0, fontSize: '16px', lineHeight: '1.5' }}>
              {safeDialogues[tunnelDialogueIndex >= 0 ? tunnelDialogueIndex : 0]}
            </p>
          </div>
        </div>
      )}
      <style>{`
        @keyframes fadeInDialog {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}



function CinematicController({ isCinematic, isFinale }) {
  const { camera } = useThree();
  const [animationStart, setAnimationStart] = useState(null);
  
  useEffect(() => {
    if (isCinematic) {
      setAnimationStart(performance.now());
    } else {
      setAnimationStart(null);
    }
  }, [isCinematic]);
  
  useFrame((state) => {
    if (isCinematic && animationStart) {
      const elapsed = (performance.now() - animationStart) / 1000;
      let targetPos;
      let targetLookAt = new THREE.Vector3(0, 3, 0);
      
      if (isFinale) {
        // Mode Sinematik Finale: Menjauh dan mengorbit besar agar Planet, Kue, GIF, dan Teks Kembang Api terlihat
        targetLookAt = new THREE.Vector3(0, 11, -10);
        
        // Radius orbit sangat besar
        const radius = 65 + Math.sin(elapsed * 0.1) * 25; 
        const angle = elapsed * 0.2;
        
        const targetX = Math.cos(angle) * radius;
        const targetZ = Math.sin(angle) * radius - 5;
        // Kamera berada di ketinggian sejajar dengan formasi tengah
        const targetY = 25 + Math.sin(elapsed * 0.15) * 15;
        
        targetPos = new THREE.Vector3(targetX, targetY, targetZ);
        camera.position.lerp(targetPos, 0.02);
      } else {
        // Mode Sinematik Biasa: Fokus ke planet
        if (elapsed < 3) {
          targetPos = new THREE.Vector3(0, 2, 10);
          camera.position.lerp(targetPos, 0.03);
        } else if (elapsed < 7) {
          targetPos = new THREE.Vector3(0, 20, 50);
          camera.position.lerp(targetPos, 0.02);
        } else {
          const t = elapsed - 7;
          const radius = 32.5 + Math.sin(t * 0.15) * 22.5; 
          const angle = t * 0.35 + Math.sin(t * 0.1) * 2;
          
          const targetX = Math.cos(angle) * radius;
          const targetZ = Math.sin(angle) * radius;
          const targetY = 10 + Math.sin(t * 0.25) * 20 + Math.cos(t * 0.12) * 10;
          
          targetPos = new THREE.Vector3(targetX, targetY, targetZ);
          camera.position.lerp(targetPos, 0.025);
        }
      }
      
      camera.lookAt(targetLookAt);
    }
  });
  return null;
}

function RotatingRingsSystem({ config }) {
  const groupRef = useRef();
  
  useFrame((state) => {
    if (groupRef.current) {
      // Menggunakan state.clock.elapsedTime agar rotasi mulus dan konsisten
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      <MultiParticleRings 
        layers={config.particleRingLayers} 
        numLayers={config.photoLayers || 4} 
        baseRadius={4.4} 
        layerSpacing={0.8} 
      />
      <Suspense fallback={null}>
        {config.photos && config.photos.length > 0 && (
          <>
            <CenterSlideshow photos={config.photos} />
            <PhotoRing
              photos={config.photos}
              config={config} // Pass config untuk baca ketebalan dinamis
              baseRadius={4.4}
              layerSpacing={0.8}
              numLayers={config.photoLayers || 4}
              totalCount={config.totalPhotos || 120}
            />
          </>
        )}
      </Suspense>
    </group>
  );
}

// ===== KOMPONEN KEMBANG API (Sistem Baru - Loop & Memenuhi Layar) =====
const PARTICLE_COUNT = 100;
const BURST_DURATION = 5.0;   // Durasi 1 ledakan: 5 detik
const BURST_PERIOD   = 6.5;   // Jeda antar ledakan berulang: 6.5 detik

function FireworkBurst({ position, delay, color }) {
  const pointsRef = useRef();
  const matRef    = useRef();
  const circleTex = useMemo(() => makeCircleTexture(), []);
  const threeColor = useMemo(() => new THREE.Color(color), [color]);
  const startTime = useRef(null);

  // Pre-hitung arah ledakan semua partikel
  const directions = useMemo(() => {
    const dirs = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const spd   = 5 + Math.random() * 12;
      dirs[i * 3]     = Math.sin(phi) * Math.cos(theta) * spd;
      dirs[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * spd;
      dirs[i * 3 + 2] = Math.cos(phi) * spd;
    }
    return dirs;
  }, []);

  // Buffer posisi partikel (diperbarui setiap frame)
  const positions = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);

  useFrame((state) => {
    if (!startTime.current) startTime.current = state.clock.elapsedTime;
    const currentT = state.clock.elapsedTime - startTime.current;
    
    const elapsed = currentT - delay;
    if (elapsed < 0) {
      if (matRef.current) matRef.current.opacity = 0;
      return;
    }

    // t bersiklus dari 0 → BURST_PERIOD, lalu reset → ledakan berulang terus
    const t        = elapsed % BURST_PERIOD;
    const progress = Math.min(t / BURST_DURATION, 1);
    const ease     = 1 - Math.pow(1 - progress, 3); // ease-out cubic

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const dx = directions[i * 3];
      const dy = directions[i * 3 + 1];
      const dz = directions[i * 3 + 2];
      positions[i * 3]     = position[0] + dx * ease;
      positions[i * 3 + 1] = position[1] + dy * ease - progress * progress * 6; // gravitasi
      positions[i * 3 + 2] = position[2] + dz * ease;
    }

    if (pointsRef.current) {
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
    if (matRef.current) {
      // Fade in cepat, fade out perlahan agar durasi tampak lebih lama
      const opacity = progress < 0.05
        ? progress / 0.05
        : Math.max(0, 1 - (progress - 0.05) / 0.95);
      matRef.current.opacity = progress < 1 ? opacity : 0;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        size={0.35}
        color={threeColor}
        transparent
        opacity={0}
        alphaMap={circleTex}
        alphaTest={0.01}
        depthWrite={false}
        sizeAttenuation={true}
      />
    </points>
  );
}

function Fireworks() {
  const palette = ['#ff3366','#ffcc00','#00e5ff','#ff6600','#aa00ff','#00ff88','#ffffff','#ff69b4','#ff4500','#7fff00'];

  // 30 titik ledakan tersebar luas memenuhi seluruh area layar
  const bursts = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      position: [
        (Math.random() - 0.5) * 70,   // Kiri ↔ Kanan sangat lebar
        14 + Math.random() * 30,       // Atas kue ke langit
        (Math.random() - 0.5) * 30,   // Depan ↔ Belakang
      ],
      // Jeda 6 detik: Menunggu kamera sampai ke langit (5 detik) + 1 detik jeda dramatis
      delay: 6.0 + (i % 10) * (BURST_PERIOD / 10) + Math.floor(i / 10) * 0.3,
      color: palette[Math.floor(Math.random() * palette.length)],
    }));
  }, []);

  return (
    <group>
      {bursts.map((b) => (
        <FireworkBurst key={b.id} position={b.position} delay={b.delay} color={b.color} />
      ))}
    </group>
  );
}

// ===== KOMPONEN KUE ULANG TAHUN 3D =====
function CandleFlame({ position }) {
  const coreRef = useRef();
  const midRef = useRef();
  const outRef = useRef();
  const lightRef = useRef();
  
  useFrame((state) => {
    const t = state.clock.elapsedTime * 12 + position[0] * 5; // Offset acak per lilin
    
    // Gerakan api menari-nari
    if (coreRef.current) {
      coreRef.current.position.y = Math.sin(t) * 0.01;
      coreRef.current.scale.setScalar(1 + Math.sin(t * 1.5) * 0.1);
    }
    if (midRef.current) {
      midRef.current.position.y = 0.03 + Math.sin(t + 2) * 0.015;
      midRef.current.scale.setScalar(1.2 + Math.sin(t * 1.2 + 1) * 0.15);
    }
    if (outRef.current) {
      outRef.current.position.y = 0.06 + Math.sin(t + 4) * 0.02;
      outRef.current.scale.setScalar(1.4 + Math.sin(t * 1.8 + 2) * 0.2);
    }
    if (lightRef.current) {
      lightRef.current.intensity = 1.0 + Math.sin(t * 2) * 0.3; // Cahaya berkedip
    }
  });

  return (
    <group position={position}>
      {/* Badan lilin elegan (Belang-belang) */}
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.4, 16]} />
        <meshStandardMaterial color="#ffffff" roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.15, 0]}>
        <torusGeometry args={[0.036, 0.01, 8, 16]} />
        <meshStandardMaterial color="#ff3366" />
      </mesh>

      {/* Sumbu Lilin */}
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.04, 8]} />
        <meshStandardMaterial color="#333333" />
      </mesh>

      {/* Api lilin volumetric (Berlapis-lapis dan Menyala) */}
      <group position={[0, 0.12, 0]}>
        {/* Lapisan luar (Merah/Oranye) */}
        <mesh ref={outRef}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshBasicMaterial color="#ff4500" transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        {/* Lapisan tengah (Kuning) */}
        <mesh ref={midRef}>
          <sphereGeometry args={[0.03, 16, 16]} />
          <meshBasicMaterial color="#ffaa00" transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        {/* Inti api (Putih terang) */}
        <mesh ref={coreRef}>
          <sphereGeometry args={[0.02, 16, 16]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={1.0} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>
      
      {/* Cahaya api ke sekeliling */}
      <pointLight ref={lightRef} color="#ffaa00" distance={4} decay={2} />
    </group>
  );
}

// Komponen Hiasan Krim (Icing) di pinggiran kue
const IcingRing = ({ radius, y, color }) => {
  const count = Math.floor(radius * 20); // Sesuaikan jumlah krim dengan keliling
  return (
    <group position={[0, y, 0]}>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        return (
          <mesh key={i} position={[x, 0, z]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
          </mesh>
        );
      })}
    </group>
  );
};

// Komponen Taburan Meses Warna-warni
const Sprinkles = ({ radius, y }) => {
  const count = Math.floor(radius * 30);
  const colors = ['#ff3366', '#00e5ff', '#ffcc00', '#aa00ff', '#ffffff'];
  return (
    <group position={[0, y, 0]}>
      {Array.from({ length: count }).map((_, i) => {
        const r = Math.random() * (radius - 0.2); // Jangan sampai keluar tepi
        const theta = Math.random() * Math.PI * 2;
        const x = Math.cos(theta) * r;
        const z = Math.sin(theta) * r;
        const rotY = Math.random() * Math.PI;
        return (
          <mesh key={i} position={[x, 0.02, z]} rotation={[Math.PI / 2, rotY, 0]}>
            <capsuleGeometry args={[0.015, 0.08, 4, 8]} />
            <meshStandardMaterial color={colors[Math.floor(Math.random() * colors.length)]} roughness={0.4} />
          </mesh>
        );
      })}
    </group>
  );
};

function BirthdayCake({ config }) {
  const groupRef = useRef();
  const startTime = useRef(null);

  // Animasi Pop-up Kue: Menunggu kamera sampai (5 detik), lalu kue muncul dengan efek membal (bounce)
  useFrame((state) => {
    if (!startTime.current) startTime.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - startTime.current;
    
    if (groupRef.current) {
      if (t < 5.0) {
        // Sembunyikan kue selama kamera terbang
        groupRef.current.scale.setScalar(0);
      } else {
        // Animasi muncul membal selama 1 detik
        const appearTime = t - 5.0;
        const progress = Math.min(appearTime / 1.0, 1.0); 
        
        // Rumus Elastic Out (Membal)
        const p = progress;
        const ease = p === 0 ? 0 : p === 1 ? 1 : Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
        
        groupRef.current.scale.setScalar(Math.max(0, ease));
      }
    }
  });

  // Posisi melingkar untuk 6 lilin
  const candlePositions = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const angle = (i / 6) * Math.PI * 2;
      return [Math.cos(angle) * 0.65, 1.6, Math.sin(angle) * 0.65];
    });
  }, []);

  return (
    <group ref={groupRef} position={[0, 8, 0]}>
      {/* ===== TIER BAWAH ===== */}
      <mesh position={[0, -0.6, 0]}>
        <cylinderGeometry args={[2.2, 2.2, 1.0, 64]} />
        <meshStandardMaterial color="#ff99cc" roughness={0.4} metalness={0.05} />
      </mesh>
      {/* Krim pinggiran bawah & atas tier 1 */}
      <IcingRing radius={2.25} y={-1.1} color="#ff3366" />
      <IcingRing radius={2.15} y={-0.1} color="#ffffff" />

      {/* ===== TIER TENGAH ===== */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[1.5, 1.5, 0.9, 64]} />
        <meshStandardMaterial color="#ffb3d9" roughness={0.4} metalness={0.05} />
      </mesh>
      {/* Krim pinggiran tier 2 */}
      <IcingRing radius={1.45} y={0.7} color="#ffffff" />
      <Sprinkles radius={1.5} y={0.7} />

      {/* ===== TIER ATAS ===== */}
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 0.8, 64]} />
        <meshStandardMaterial color="#ffd9ec" roughness={0.4} metalness={0.05} />
      </mesh>
      {/* Krim pinggiran tier 3 */}
      <IcingRing radius={0.85} y={1.6} color="#ffffff" />
      <Sprinkles radius={0.9} y={1.6} />

      {/* Hiasan mahkota bintang di tengah-tengah lilin */}
      <mesh position={[0, 1.8, 0]}>
        <octahedronGeometry args={[0.25, 0]} />
        <meshStandardMaterial color="#ffd700" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Deretan Lilin yang Menyala */}
      {candlePositions.map((pos, i) => (
        <CandleFlame key={i} position={pos} />
      ))}

      {/* GIF Animasi melayang di atas kue (jika diatur di Admin) */}
      {config?.cakeGifUrl && (
        <Html position={[0, 5.5, 0]} center transform scale={1.5} distanceFactor={15}>
          <img 
            src={config.cakeGifUrl} 
            alt="Cake GIF" 
            style={{ 
              width: '150px', 
              pointerEvents: 'none', 
              userSelect: 'none',
              background: 'transparent'
            }} 
          />
        </Html>
      )}
    </group>
  );
}

// ===== EFEK ROKET MELUKIS ANGKA (SKYWRITING) =====
// Jalur koordinat (Normalized X: 0 to 1, Y: 0 to 2) untuk melukis angka 0-9
// (digitPaths telah dihapus karena sekarang kita menggunakan teks Canvas estetik)

function NumberFirework({ greetingStr = "Selamat Ulang Tahun Ke 24" }) {
  const pointsRef = useRef();
  const [screenType, setScreenType] = useState('desktop');

  // Deteksi ukuran layar secara live (Responsif)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 600) setScreenType('mobile');
      else if (window.innerWidth < 1024) setScreenType('tablet');
      else setScreenType('desktop');
    };
    handleResize(); // Eksekusi pertama kali
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Meledak setelah kamera sampai (5s) + kembang api latar (6s) + jeda
  const startDelay = 8.0; 
  const baseZ = -15.0;
  
  // Konfigurasi Partikel (Diturunkan agar tidak menggumpal terlalu tebal)
  const PARTICLE_COUNT = 4000;
  
  const { targetPositions, centerPos, randomOffsets, explosions, colorsArray } = useMemo(() => {
    const targets = new Float32Array(PARTICLE_COUNT * 3);
    const offsets = new Float32Array(PARTICLE_COUNT * 3);
    const expls = new Float32Array(PARTICLE_COUNT * 3);
    const cols = new Float32Array(PARTICLE_COUNT * 3);
    
    // Skala dinamis: teks mengecil jika di layar HP agar tidak terpotong
    let scaleFactor = 0.06;
    let dynamicBaseY = 36.0; // Ditinggikan lebih atas lagi agar jauh dari kue
    
    if (screenType === 'mobile') {
      scaleFactor = 0.025;  // Diperkecil lagi untuk HP agar tulisan lebar tetap muat
      dynamicBaseY = 24.0;
    } else if (screenType === 'tablet') {
      scaleFactor = 0.045;
      dynamicBaseY = 30.0;
    }
    
    // Titik ledakan (pusat) menggunakan tinggi dinamis
    const center = new THREE.Vector3(0, dynamicBaseY + 2, baseZ);
    
    // Amankan dari Error saat SSR (Next.js server side)
    if (typeof window === 'undefined') {
      return { targetPositions: targets, centerPos: center, randomOffsets: offsets, explosions: expls, colorsArray: cols };
    }
    
    // Menggunakan Canvas 2D untuk membentuk partikel sesuai font nyata yang Estetik!
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 600;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    // Algoritma Pemisahan Baris Dinamis & Resizing Font Otomatis
    let fontSize = 110;
    ctx.font = `italic ${fontSize}px 'Monotype Corsiva', 'Apple Chancery', cursive`;
    
    const words = greetingStr.split(' ');
    let line1 = greetingStr;
    let line2 = "";
    
    // Jika lebar teks melampaui batas aman (900px), pecah jadi 2 baris
    if (ctx.measureText(greetingStr).width > 900 && words.length > 1) {
      let tempStr = "";
      let breakIndex = Math.ceil(words.length / 2);
      const totalWidth = ctx.measureText(greetingStr).width;
      
      for (let i = 0; i < words.length; i++) {
        tempStr += (i === 0 ? "" : " ") + words[i];
        if (ctx.measureText(tempStr).width > totalWidth / 2) {
          breakIndex = i;
          if (breakIndex === 0) breakIndex = 1;
          break;
        }
      }
      
      line1 = words.slice(0, breakIndex).join(' ');
      line2 = words.slice(breakIndex).join(' ');
      
      // Jika salah satu baris masih kepanjangan, kecilkan font perlahan
      while ((ctx.measureText(line1).width > 950 || ctx.measureText(line2).width > 950) && fontSize > 40) {
        fontSize -= 5;
        ctx.font = `italic ${fontSize}px 'Monotype Corsiva', 'Apple Chancery', cursive`;
      }
    } else {
      // Jika masih 1 baris tapi kepanjangan (misal 1 kata super panjang)
      while (ctx.measureText(line1).width > 950 && fontSize > 40) {
        fontSize -= 5;
        ctx.font = `italic ${fontSize}px 'Monotype Corsiva', 'Apple Chancery', cursive`;
      }
    }
    
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Tulis ke kanvas secara dinamis
    if (line2) {
      ctx.fillText(line1, 512, 300 - fontSize * 0.7);
      ctx.fillText(line2, 512, 300 + fontSize * 0.7);
    } else {
      ctx.fillText(line1, 512, 300);
    }
    
    const imgData = ctx.getImageData(0, 0, 1024, 600).data;
    const validPixels = [];
    
    // Scan pixel canvas dengan lompatan 3 pixel untuk resolusi merata
    for (let y = 0; y < 600; y += 3) { 
      for (let x = 0; x < 1024; x += 3) {
        const alpha = imgData[(y * 1024 + x) * 4 + 3];
        if (alpha > 50) validPixels.push({ x, y });
      }
    }
    
    if (validPixels.length === 0) validPixels.push({ x: 512, y: 300 });

    // Distribusikan partikel
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // 1. Posisi target sesuai cetakan huruf di canvas
      const pixel = validPixels[i % validPixels.length];
      
      const tx = (pixel.x - 512) * scaleFactor;
      const ty = (300 - pixel.y) * scaleFactor + dynamicBaseY; // 300 adalah titik tengah height 600
      const tz = baseZ;
      
      const spread = screenType === 'mobile' ? 0.02 : 0.05; // Sangat tipis di HP agar tidak bertumpuk
      targets[i * 3] = tx + (Math.random() - 0.5) * spread;
      targets[i * 3 + 1] = ty + (Math.random() - 0.5) * spread;
      targets[i * 3 + 2] = tz + (Math.random() - 0.5) * spread;
      
      // 2. Posisi ledakan acak (Sphere berhamburan)
      const radius = 5 + Math.random() * 25;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      expls[i * 3] = center.x + radius * Math.sin(phi) * Math.cos(theta);
      expls[i * 3 + 1] = center.y + radius * Math.sin(phi) * Math.sin(theta);
      expls[i * 3 + 2] = center.z + radius * Math.cos(phi);
      
      // 3. Warna murni Cyan (sesuai tepi dialog astronot: #00ffff)
      // Diset rata agar tidak ada bagian yang putih karena tumpukan warna bervariasi
      cols[i * 3] = 0.0; // R
      cols[i * 3 + 1] = 1.0; // G
      cols[i * 3 + 2] = 1.0; // B
      
      // 4. Random offset untuk kerlap-kerlip
      offsets[i * 3] = Math.random() * Math.PI * 2;
      offsets[i * 3 + 1] = 2 + Math.random() * 3;
      offsets[i * 3 + 2] = Math.random();
    }
    
    return { targetPositions: targets, centerPos: center, randomOffsets: offsets, explosions: expls, colorsArray: cols };
  }, [greetingStr, screenType]);
  
  const currentPositions = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);
  const circleTex = useMemo(() => makeCircleTexture(), []);
  const startTime = useRef(null);

  useFrame((state) => {
    if (!startTime.current) startTime.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - startTime.current;
    
    if (t < startDelay || targetPositions.length === 0) {
      if (pointsRef.current) pointsRef.current.visible = false;
      return;
    }
    
    if (pointsRef.current) pointsRef.current.visible = true;
    
    const burstTime = t - startDelay;
    const explosionDuration = 1.5;
    const gatherDuration = 2.0;
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      let currentX, currentY, currentZ;
      
      const sx = centerPos.x;
      const sy = centerPos.y;
      const sz = centerPos.z;
      
      const ex = explosions[i * 3];
      const ey = explosions[i * 3 + 1];
      const ez = explosions[i * 3 + 2];
      
      if (burstTime < explosionDuration) {
        const progress = Math.min(burstTime / explosionDuration, 1.0);
        const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        
        currentX = sx + (ex - sx) * ease;
        currentY = sy + (ey - sy) * ease;
        currentZ = sz + (ez - sz) * ease;
      } else {
        const gatherTime = burstTime - explosionDuration;
        const progress = Math.min(gatherTime / gatherDuration, 1.0);
        
        const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        
        const startGatherY = ey;
        
        const tx = targetPositions[i * 3];
        const ty = targetPositions[i * 3 + 1];
        const tz = targetPositions[i * 3 + 2];
        
        currentX = ex + (tx - ex) * ease;
        currentY = startGatherY + (ty - startGatherY) * ease;
        currentZ = ez + (tz - ez) * ease;
        
        if (progress > 0.8) {
          const offsetPhase = randomOffsets[i * 3];
          const speed = randomOffsets[i * 3 + 1];
          const shimmer = Math.sin(t * speed + offsetPhase) * 0.05;
          currentX += shimmer;
          currentY += shimmer;
        }
      }
      
      currentPositions[i * 3] = currentX;
      currentPositions[i * 3 + 1] = currentY;
      currentPositions[i * 3 + 2] = currentZ;
    }
    
    if (pointsRef.current) {
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
      pointsRef.current.material.opacity = 0.6;
    }
  });

  return (
    <points ref={pointsRef} visible={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={PARTICLE_COUNT} array={currentPositions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={PARTICLE_COUNT} array={colorsArray} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial 
        size={screenType === 'mobile' ? 0.35 : 0.8} 
        color="#00ffff"
        transparent 
        opacity={0.8} 
        alphaMap={circleTex} 
        depthWrite={false} 
      />
    </points>
  );
}

// ===== FINALE CAMERA CONTROLLER =====
function FinaleController({ onComplete }) {
  const { camera } = useThree();
  const startTime = useRef(null);
  const isDone = useRef(false);
  
  // Simpan posisi dan target kamera aktual saat transisi dimulai
  const startPos = useRef(new THREE.Vector3());
  const startLookAt = useRef(new THREE.Vector3(0, 0, 0)); // Sebelum finale, pusat target selalu di 0,0,0
  
  useEffect(() => {
    // Merekam posisi kamera sesungguhnya tepat di saat tombol ditekan
    startPos.current.copy(camera.position);
  }, [camera]);
  
  useFrame((state) => {
    if (!startTime.current) startTime.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - startTime.current;
    
    const flightDuration = 5.0; // Kamera terbang selama 5 detik
    const progress = Math.min(t / flightDuration, 1.0);
    
    // Ease-In-Out Cubic: Transisi halus menyambung tanpa sentakan di awal
    const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    
    const endPos = new THREE.Vector3(0, 16, 50);
    const endLookAt = new THREE.Vector3(0, 11, -10);
    
    // Terbang mulus dari posisi AKTUAL pengguna ke posisi tujuan
    camera.position.lerpVectors(startPos.current, endPos, ease);
    
    const currentLookAt = new THREE.Vector3().lerpVectors(startLookAt.current, endLookAt, ease);
    camera.lookAt(currentLookAt);

    // Buka kunci kamera (OrbitControls) di detik ke-10, setelah semua ledakan teks selesai
    if (t >= 10.0 && !isDone.current) {
      isDone.current = true;
      if (onComplete) onComplete();
    }
  });
  
  return null;
}

// ===== FLASH TRANSISI (WARP EXIT / KELUAR LORONG) =====
function WarpFlash() {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: '#ffffff',
      pointerEvents: 'none',
      zIndex: 9999,
      animation: 'flashFadeOut 2.0s ease-out forwards'
    }}>
      <style>{`
        @keyframes flashFadeOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ===== EXIT SEQUENCE (MUNDUR SEBELUM KELUAR LORONG) =====
function TunnelExitSequence({ onFinish, config }) {
  const [step, setStep] = useState('dialog');
  const vp = useVisualViewport();

  useEffect(() => {
    const t1 = setTimeout(() => setStep('3'), 2500);
    const t2 = setTimeout(() => setStep('2'), 3500);
    const t3 = setTimeout(() => setStep('1'), 4500);
    const t4 = setTimeout(() => onFinish(), 5500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); }
  }, [onFinish]);

  const containerStyle = {
    position: 'fixed',
    top: `${vp.offsetTop}px`,
    left: `${vp.offsetLeft}px`,
    width: `${vp.width}px`,
    height: `${vp.height}px`,
    pointerEvents: 'none',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  };

  return (
    <div style={containerStyle}>
      {step === 'dialog' && (
        <div style={{
          position: 'absolute',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(10, 15, 30, 0.85)',
          border: '2px solid #ff3366',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: 'inset 0 0 20px rgba(255, 51, 102, 0.15), 0 0 30px rgba(255, 51, 102, 0.2)',
          backdropFilter: 'blur(8px)',
          maxWidth: '600px',
          width: '90%',
          color: 'white',
          fontFamily: "'Courier New', Courier, monospace",
          gap: '20px',
          animation: 'fadeInDialog 0.5s ease-out'
        }}>
          <img src="/astronaut_avatar.png" alt="Astronaut" style={{
            width: '80px', height: '80px', borderRadius: '50%',
            border: '3px solid #ff3366', flexShrink: 0
          }} />
          <div style={{ textAlign: 'left' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#ff3366', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>{config.astronautName || 'Astronot'}</h4>
            <p style={{ margin: 0, fontSize: '16px', lineHeight: '1.5' }}>"Bersiaplah! Kita akan segera sampai di tujuan."</p>
          </div>
        </div>
      )}
      {['3','2','1'].includes(step) && (
        <div key={step} style={{
          fontSize: '150px', fontWeight: '900', color: '#ffffff',
          textShadow: '0 0 40px #00e5ff, 0 0 80px #ff3366',
          fontFamily: 'sans-serif',
          animation: 'popIn 1s ease-out forwards'
        }}>
          {step}
        </div>
      )}
      <style>{`
        @keyframes popIn {
          0% { transform: scale(0.3); opacity: 0; }
          40% { transform: scale(1.2); opacity: 1; }
          70% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ===== DESTINATION TUTORIAL (logika saja, tidak render UI) =====
// Komponen ini HANYA mengurus timer & stage transitions.
// Rendering UI dilakukan oleh DestinationTutorialOverlay di LUAR Canvas
// agar tidak terpengaruh oleh transformasi kamera 3D.
function DestinationTutorial({ isFinale, onReachDestination, audioDuration, onStageChange, onTimeChange }) {
  const timerInterval = useRef(null);

  useEffect(() => {
    if (onReachDestination) onReachDestination();
    onTimeChange(Math.floor(audioDuration || 0));
    onStageChange(0);

    const t1 = setTimeout(() => onStageChange(1), 4000);
    const t2 = setTimeout(() => onStageChange(2), 7000);
    const t3 = setTimeout(() => onStageChange(3), 12000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onReachDestination, audioDuration]);

  useEffect(() => {
    timerInterval.current = setInterval(() => {
      onTimeChange(prev => {
        if (typeof prev !== 'number') return 0;
        if (prev <= 1) {
          clearInterval(timerInterval.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerInterval.current);
  }, []);

  // Tidak merender apapun – hanya logika
  return null;
}

// ===== DESTINATION TUTORIAL OVERLAY (UI di luar Canvas) =====
// Di-render di LUAR Canvas sebagai DOM biasa dengan position:fixed.
// Dijamin tidak ikut terzoom oleh kamera 3D maupun browser zoom.
function DestinationTutorialOverlay({ config, stage, timeLeft, audioDuration, isCinematic }) {
  const vp = useVisualViewport();

  // Hanya tampil saat stage relevan
  if (stage >= 3) return null;

  const audioMinutes = Math.floor((audioDuration || 0) / 60);

  // Container mengikuti visual viewport
  const containerStyle = {
    position: 'fixed',
    top: `${vp.offsetTop}px`,
    left: `${vp.offsetLeft}px`,
    width: `${vp.width}px`,
    height: `${vp.height}px`,
    pointerEvents: 'none',
    zIndex: 9999,
  };

  const dialogStyle = {
    position: 'absolute',
    bottom: '40px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(10, 15, 30, 0.85)',
    border: '2px solid #00e5ff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: 'inset 0 0 20px rgba(0, 229, 255, 0.15), 0 0 30px rgba(0, 229, 255, 0.2)',
    backdropFilter: 'blur(8px)',
    maxWidth: '600px',
    width: '90%',
    color: 'white',
    fontFamily: "'Courier New', Courier, monospace",
    gap: '20px',
    animation: 'fadeInDialog 0.5s ease-out',
    pointerEvents: 'none',
  };

  return (
    <div style={containerStyle}>
      {/* TIMER */}
      {audioDuration > 0 && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          background: 'rgba(0,0,0,0.6)',
          padding: '10px 15px',
          borderRadius: '8px',
          color: '#fff',
          fontFamily: 'monospace',
          fontSize: '24px',
          border: '1px solid #00e5ff',
          boxShadow: '0 0 10px rgba(0,229,255,0.4)',
          textShadow: '0 0 5px #00e5ff',
        }}>
          {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
        </div>
      )}

      {/* Dialog "Akhirnya kita sampai" */}
      {stage === 0 && !isCinematic && (
        <div style={dialogStyle}>
          <img src="/astronaut_avatar.png" alt="Astronaut" style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid #00e5ff', flexShrink: 0 }} />
          <div style={{ textAlign: 'left' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#00e5ff', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>{config.astronautName || 'Astronot'}</h4>
            <p style={{ margin: 0, fontSize: '16px', lineHeight: '1.5' }}>Akhirnya kita sampai di tujuan! Silakan ZOOM (cubit/scroll) untuk mendekat ke planet.</p>
          </div>
        </div>
      )}

      {/* Dialog "Saya memberikan waktu" */}
      {stage === 1 && !isCinematic && (
        <div style={dialogStyle}>
          <img src="/astronaut_avatar.png" alt="Astronaut" style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid #00e5ff', flexShrink: 0 }} />
          <div style={{ textAlign: 'left' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#00e5ff', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>{config.astronautName || 'Astronot'}</h4>
            <p style={{ margin: 0, fontSize: '16px', lineHeight: '1.5' }}>Saya akan memberikan kamu waktu {audioMinutes} menit untuk mengelilingi planet.</p>
          </div>
        </div>
      )}

      {/* Notifikasi "Tekan 2x" */}
      {stage === 2 && !isCinematic && (
        <div style={{
          position: 'absolute',
          top: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(10, 15, 30, 0.7)',
          padding: '12px 24px',
          borderRadius: '30px',
          color: '#fff',
          fontFamily: 'sans-serif',
          fontSize: '14px',
          textAlign: 'center',
          border: '2px solid #ff3366',
          boxShadow: '0 0 15px rgba(255, 51, 102, 0.5)',
          textShadow: '0 0 5px #000',
          animation: 'fadeInDialog 1s ease-out',
        }}>
          ✨ Tekan layar 2x di mana saja untuk mengaktifkan mode sinematik ✨
        </div>
      )}
    </div>
  );
}


// ===== INITIAL FLY-IN CONTROLLER =====
function InitialFlyInController({ onComplete, isWaiting, setIsWaiting, isExiting, setIsExiting, tunnelClickCount }) {
  const { camera } = useThree();
  const startTime = useRef(null);
  const startPos = useRef(null);

  useEffect(() => {
    // Set posisi awal kamera hanya sekali, OrbitControls akan menangani zoom
    camera.position.set(0, 0, 100);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  useEffect(() => {
    const handleDoubleClick = () => {
      if (isWaiting && !isExiting && tunnelClickCount >= 6) {
        setIsExiting(true);
      }
    };
    
    window.addEventListener('dblclick', handleDoubleClick);
    return () => window.removeEventListener('dblclick', handleDoubleClick);
  }, [isWaiting, isExiting, setIsExiting, tunnelClickCount]);

  useFrame((state) => {
    if (!isWaiting) {
      if (!startTime.current) {
        startTime.current = state.clock.elapsedTime;
        startPos.current = camera.position.clone();
      }
      const t = state.clock.elapsedTime - startTime.current;
      const duration = 2.5;

      if (t < duration) {
        const progress = t / duration;
        const ease = 1 - Math.pow(1 - progress, 3);

        camera.position.x = THREE.MathUtils.lerp(startPos.current.x, 0, ease);
        camera.position.y = THREE.MathUtils.lerp(startPos.current.y, 10, ease);
        camera.position.z = THREE.MathUtils.lerp(startPos.current.z, 250, ease);
        
        camera.lookAt(0, 3, 0);
      } else {
        if (onComplete) onComplete();
      }
    }
  });

  return null;
}

// ===== FINALE DIALOGUE =====
// Di-render di LUAR Canvas sebagai DOM biasa dengan position:fixed.
// Karena OrbitControls selalu aktif untuk zoom (enabled=true, enableZoom=true),
// gesture pinch SELALU ditangkap Three.js dan browser tidak pernah nge-zoom HTML.
// Dengan demikian, dialog cukup pakai position:fixed biasa tanpa perlu
// melacak visualViewport atau menghitung inverse scale.
function FinaleDialogue({ dialogues, astronautName }) {
  const [index, setIndex] = useState(0);
  const vp = useVisualViewport();

  useEffect(() => {
    const handleGlobalClick = () => setIndex(prev => prev + 1);
    const t = setTimeout(() => window.addEventListener('click', handleGlobalClick), 500);
    return () => {
      clearTimeout(t);
      window.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  if (!dialogues || index >= dialogues.length) return null;

  // Container mengikuti visual viewport agar posisi benar saat keyboard muncul/hilang
  const containerStyle = {
    position: 'fixed',
    top: `${vp.offsetTop}px`,
    left: `${vp.offsetLeft}px`,
    width: `${vp.width}px`,
    height: `${vp.height}px`,
    pointerEvents: 'none',
    zIndex: 9999,
  };

  return (
    <div style={containerStyle}>
      <div style={{
        position: 'absolute',
        bottom: '40px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(10, 15, 30, 0.85)',
        border: '2px solid #00e5ff',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: 'inset 0 0 20px rgba(0, 229, 255, 0.15), 0 0 30px rgba(0, 229, 255, 0.2)',
        backdropFilter: 'blur(8px)',
        width: '90%',
        maxWidth: '600px',
        color: 'white',
        fontFamily: "'Courier New', Courier, monospace",
        gap: '20px',
        animation: 'fadeInDialog 0.5s ease-out',
        pointerEvents: 'none',
      }}>
        <img
          src="/astronaut_avatar.png"
          alt="Astronaut"
          style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid #00e5ff', flexShrink: 0 }}
        />
        <div style={{ textAlign: 'left' }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#00e5ff', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
            {astronautName || 'Astronot'}
          </h4>
          <p style={{ margin: 0, fontSize: '16px', lineHeight: '1.5' }}>
            {dialogues[index]}
          </p>
        </div>
      </div>
      <div style={{
        position: 'absolute',
        bottom: '15px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: '#00e5ff',
        fontSize: '12px',
        opacity: 0.8,
        animation: 'pulse 1.5s infinite',
        whiteSpace: 'nowrap',
      }}>
        Klik di mana saja untuk lanjut...
      </div>
    </div>
  );
}


export default function Scene({ config, isFinale, onReachDestination, audioDuration }) {
  const [isCinematic, setIsCinematic] = useState(false);
  const [isInitialFlyIn, setIsInitialFlyIn] = useState(true);
  const [isWaiting, setIsWaiting] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [finaleCameraDone, setFinaleCameraDone] = useState(false);
  const [finaleDialogueReady, setFinaleDialogueReady] = useState(false);
  const [tunnelClickCount, setTunnelClickCount] = useState(0);
  const [tunnelIsSlowMode, setTunnelIsSlowMode] = useState(false);
  const [tunnelDialogueIndex, setTunnelDialogueIndex] = useState(-1);
  const [showCinematicStopNotif, setShowCinematicStopNotif] = useState(false);
  // State untuk DestinationTutorial: diisi oleh komponen logika, ditampilkan oleh overlay di luar Canvas
  const [destStage, setDestStage] = useState(0);
  const [destTimeLeft, setDestTimeLeft] = useState(0);

  // Menampilkan notifikasi cara berhenti dari mode sinematik HANYA selama 5 detik pertama
  useEffect(() => {
    let t;
    if (isCinematic) {
      setShowCinematicStopNotif(true);
      t = setTimeout(() => {
        setShowCinematicStopNotif(false);
      }, 5000);
    } else {
      setShowCinematicStopNotif(false);
    }
    return () => clearTimeout(t);
  }, [isCinematic]);

  // Jeda 2 detik setelah animasi kamera selesai sebelum dialog astronot muncul
  useEffect(() => {
    if (!finaleCameraDone) return;
    const t = setTimeout(() => setFinaleDialogueReady(true), 2000);
    return () => clearTimeout(t);
  }, [finaleCameraDone]);

  useEffect(() => {
    if (isFinale) setIsCinematic(false);
  }, [isFinale]);

  // ============================================================
  // BLOKIR SENTUHAN saat animasi berlangsung:
  // 1. Fly-in ke planet (!isWaiting && isInitialFlyIn)
  // 2. Animasi kue ultah (isFinale && !finaleDialogueReady)
  // Menggunakan capture phase + passive:false agar preventDefault
  // benar-benar bekerja sebelum browser memproses gesture apapun.
  // ============================================================
  useEffect(() => {
    const shouldBlock =
      (!isWaiting && isInitialFlyIn) ||
      (isFinale && !finaleDialogueReady);

    if (!shouldBlock) return;

    const blockEvent = (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
    };

    const opts = { passive: false, capture: true };

    document.addEventListener('touchstart',  blockEvent, opts);
    document.addEventListener('touchmove',   blockEvent, opts);
    document.addEventListener('touchend',    blockEvent, opts);
    document.addEventListener('wheel',       blockEvent, opts);
    document.addEventListener('pointerdown', blockEvent, opts);
    document.addEventListener('pointermove', blockEvent, opts);

    return () => {
      document.removeEventListener('touchstart',  blockEvent, opts);
      document.removeEventListener('touchmove',   blockEvent, opts);
      document.removeEventListener('touchend',    blockEvent, opts);
      document.removeEventListener('wheel',       blockEvent, opts);
      document.removeEventListener('pointerdown', blockEvent, opts);
      document.removeEventListener('pointermove', blockEvent, opts);
    };
  }, [isWaiting, isInitialFlyIn, isFinale, finaleDialogueReady]);

  useEffect(() => {
    const handleDblClick = () => {
      if (!isInitialFlyIn) {
        if (!isFinale || finaleCameraDone) {
          setIsCinematic(prev => !prev);
        }
      }
    };
    window.addEventListener('dblclick', handleDblClick);
    return () => window.removeEventListener('dblclick', handleDblClick);
  }, [isFinale, isInitialFlyIn, finaleCameraDone]);

  const handleExitFinish = useCallback(() => {
    setIsWaiting(false);
  }, []);

  return (
    <>
    <Canvas 
      camera={{ position: [0, 5, 20], fov: 60 }} 
      style={{ touchAction: 'none' }}
      onCreated={({ gl }) => {
        // Set touch-action none langsung di canvas element
        gl.domElement.style.touchAction = 'none';

        // Pasang listener NON-PASSIVE langsung di canvas (event target pertama).
        // Ini memastikan preventDefault() dipanggil SEBELUM browser memutuskan untuk zoom.
        const preventCanvasZoom = (e) => {
          if (e.touches && e.touches.length > 1) {
            e.preventDefault();
          }
        };
        gl.domElement.addEventListener('touchstart', preventCanvasZoom, { passive: false });
        gl.domElement.addEventListener('touchmove', preventCanvasZoom, { passive: false });
      }}
    >
      <ambientLight intensity={isFinale ? 1.2 : 0.5} />
      <pointLight position={[10, 10, 10]} intensity={isFinale ? 2 : 1} />

      <GalaxyTimeTunnel 
        active={isWaiting} 
        photos={config.photos} 
        dialogues={config.tunnelDialogues} 
        isExiting={isExiting} 
        tunnelClickCount={tunnelClickCount} 
        setTunnelClickCount={setTunnelClickCount}
        config={config}
        tunnelIsSlowMode={tunnelIsSlowMode}
        setTunnelIsSlowMode={setTunnelIsSlowMode}
        setTunnelDialogueIndex={setTunnelDialogueIndex}
      />

      {isInitialFlyIn && (
        <InitialFlyInController 
          isWaiting={isWaiting}
          setIsWaiting={setIsWaiting}
          isExiting={isExiting}
          setIsExiting={setIsExiting}
          tunnelClickCount={tunnelClickCount}
          onComplete={() => setIsInitialFlyIn(false)} 
        />
      )}

      {/* DestinationTutorial: hanya logika timer/stage, UI dirender di luar Canvas */}
      {!isInitialFlyIn && !finaleCameraDone && (
        <DestinationTutorial
          isFinale={isFinale}
          onReachDestination={onReachDestination}
          audioDuration={audioDuration}
          onStageChange={setDestStage}
          onTimeChange={setDestTimeLeft}
        />
      )}

      <group visible={!isWaiting}>
        <Stars radius={500} depth={200} count={9000} factor={6} saturation={0} fade speed={1} />
        <AmbientParticles colors={config.ringColors} />
        
        {!isInitialFlyIn && (
          isFinale ? (
            !finaleCameraDone 
              ? <FinaleController onComplete={() => setFinaleCameraDone(true)} />
              : <CinematicController isCinematic={isCinematic} isFinale={isFinale} />
          ) : (
            <CinematicController isCinematic={isCinematic} isFinale={isFinale} />
          )
        )}
        
        {isFinale && (
          <group position={[0, 3, 0]}>
            <Fireworks />
            <BirthdayCake config={config} />
            <NumberFirework greetingStr={config.finaleGreeting || 'Selamat Ulang Tahun Ke 24'} />
          </group>
        )}

        <group rotation={[0.3, 0, 0]} position={[0, 3, 0]}>
          <ParticlePlanet colors={config.planetColors} />
          <RotatingRingsSystem config={config} />

          <Suspense fallback={null}>
            <Text
              position={[0, 6, 0]}
              fontSize={1}
              color="white"
              anchorX="center"
              anchorY="middle"
            >
              {config.greetingMessage} {config.targetName}
            </Text>
          </Suspense>
        </group>
      </group>



      {/* OrbitControls normal: aktif saat di planet (sebelum finale)
          ATAU setelah dialogue finale siap. TIDAK aktif selama animasi kue
          agar FinaleController bisa menggerakkan kamera tanpa gangguan.
          Zoom selalu aktif untuk menangkap pinch gesture (cegah browser zoom).*/}
      {!isInitialFlyIn && (!isFinale || finaleDialogueReady) && (
        <OrbitControls 
          enabled={true}
          enableZoom={true}
          enablePan={!isCinematic && finaleCameraDone}
          enableRotate={!isCinematic}
          autoRotate={!finaleCameraDone && !isCinematic} 
          autoRotateSpeed={0.5}
          target={finaleCameraDone ? [0, 11, -10] : [0, 3, 0]}
          maxDistance={400}
        />
      )}

      {/* OrbitControls saat di LORONG: hanya zoom saja, tanpa rotasi/pan.
          Mencegat gesture pinch agar jadi zoom kamera 3D (bukan browser zoom).
          minDistance/maxDistance sangat ketat agar efek zoom hampir tidak terasa.
          Tetap aktif saat isExiting agar dialog hitung mundur tidak ikut terzoom. */}
      {isWaiting && (
        <OrbitControls
          enableZoom={true}
          enableRotate={false}
          enablePan={false}
          target={[0, 0, 0]}
          minDistance={95}
          maxDistance={100}
        />
      )}
    </Canvas>

    {isFinale && finaleDialogueReady && (
      <FinaleDialogue 
        dialogues={config.finaleDialogues || ["Apakah Kamu Menyukai kejutan ini?", "Semoga harapanmu terkabul!"]} 
        astronautName={config.astronautName} 
      />
    )}

    {isWaiting && isExiting && (
      <TunnelExitSequence 
        config={config} 
        onFinish={handleExitFinish} 
      />
    )}

    {!isWaiting && isInitialFlyIn && <WarpFlash />}

    <GalaxyTimeTunnelOverlay 
      active={isWaiting}
      isExiting={isExiting}
      tunnelClickCount={tunnelClickCount}
      config={config}
      tunnelIsSlowMode={tunnelIsSlowMode}
      tunnelDialogueIndex={tunnelDialogueIndex}
      dialogues={config.tunnelDialogues}
    />

    {/* Notifikasi untuk menghentikan mode sinematik */}
    {showCinematicStopNotif && (
      <div style={{
        position: 'fixed',
        top: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(10, 15, 30, 0.7)',
        padding: '12px 24px',
        borderRadius: '30px',
        color: '#fff',
        fontFamily: 'sans-serif',
        fontSize: '14px',
        textAlign: 'center',
        border: '2px solid #ff3366',
        boxShadow: '0 0 15px rgba(255, 51, 102, 0.5)',
        textShadow: '0 0 5px #000',
        animation: 'fadeInDialog 1s ease-out',
        zIndex: 9999,
        pointerEvents: 'none'
      }}>
        ✨ Tekan layar 2x di mana saja untuk berhenti mode sinematik ✨
      </div>
    )}

    {/* Overlay destination tutorial di LUAR Canvas — tidak terpengaruh kamera 3D */}
    {!isInitialFlyIn && !finaleCameraDone && !isFinale && (
      <DestinationTutorialOverlay
        config={config}
        stage={destStage}
        timeLeft={destTimeLeft}
        audioDuration={audioDuration}
        isCinematic={isCinematic}
      />
    )}

    {/* Overlay blocker: aktif saat fly-in ke planet ATAU selama animasi kue ultah */}
    {((!isWaiting && isInitialFlyIn) || (isFinale && !finaleDialogueReady)) && (
      <div
        style={{
          position: 'fixed',
          top: 0, left: 0,
          width: '100%', height: '100%',
          zIndex: 9998,
          pointerEvents: 'all',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
        onTouchStart={(e) => e.preventDefault()}
        onTouchMove={(e) => e.preventDefault()}
        onWheel={(e) => e.preventDefault()}
      />
    )}
    </>
  );
}
