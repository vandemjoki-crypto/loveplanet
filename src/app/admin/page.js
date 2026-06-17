'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './admin.module.css';

function ColorPickerGroup({ label, colors, setColors }) {
  const handleCountChange = (e) => {
    const count = Math.max(1, Math.min(15, parseInt(e.target.value) || 1));
    const newColors = [...colors];
    if (count > newColors.length) {
      while (newColors.length < count) newColors.push('#ffffff');
    } else {
      newColors.length = count;
    }
    setColors([...newColors]);
  };

  const handleColorChange = (idx, val) => {
    const newColors = [...colors];
    newColors[idx] = val;
    setColors(newColors);
  };

  return (
    <div className={styles.formGroup}>
      <label className={styles.label}>{label}</label>
      <div className={styles.numberRow}>
        <span style={{ fontSize: 13, color: '#888' }}>Jumlah warna:</span>
        <input
          type="number"
          className={styles.inputSmall}
          min="1" max="15"
          value={colors.length}
          onChange={handleCountChange}
        />
      </div>
      <div className={styles.colorRow}>
        {colors.map((color, idx) => (
          <input
            key={idx}
            type="color"
            value={color}
            className={styles.colorSwatch}
            onChange={(e) => handleColorChange(idx, e.target.value)}
            title={`Warna ${idx + 1}`}
          />
        ))}
      </div>
      <p className={styles.hint}>Klik kotak warna untuk mengganti. Sesuaikan jumlahnya sesuka Anda (maks 15).</p>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [targetName, setTargetName] = useState('');
  const [greetingMessage, setGreetingMessage] = useState('');
  const [finaleGreeting, setFinaleGreeting] = useState('');
  const [cakeGifFile, setCakeGifFile] = useState(null);
  const [selectedGifUrl, setSelectedGifUrl] = useState('');
  const [availableGifs, setAvailableGifs] = useState([]);
  const [selectedMusicUrl, setSelectedMusicUrl] = useState('');
  const [tunnelMusicFile, setTunnelMusicFile] = useState(null);
  const [selectedTunnelMusicUrl, setSelectedTunnelMusicUrl] = useState('');
  const [finaleMusicFile, setFinaleMusicFile] = useState(null);
  const [selectedFinaleMusicUrl, setSelectedFinaleMusicUrl] = useState('');
  const [availableMusic, setAvailableMusic] = useState([]);
  const [astronautName, setAstronautName] = useState('Astronot');
  const [tunnelDialogues, setTunnelDialogues] = useState([
    "Apakah kamu melihatnya, perempuan yang sangat cantik itu...."
  ]);
  const [finaleDialogues, setFinaleDialogues] = useState([
    "Apakah Kamu Menyukai kejutan ini?",
    "Semoga harapanmu terkabul!"
  ]);
  const [activeTab, setActiveTab] = useState('profil');
  const [config, setConfig] = useState({ photos: [], musicUrl: '' });
  const [photosFiles, setPhotosFiles] = useState([]);
  const [musicFile, setMusicFile] = useState(null);

  // Warna partikel planet & cincin
  const [planetColors, setPlanetColors] = useState(['#b100ff', '#ff00b1']);
  const [ringColors, setRingColors] = useState(['#00d2ff', '#ffffff']);
  const [particleRingLayers, setParticleRingLayers] = useState([
    { color: '#00d2ff', subLayers: 5 },
    { color: '#b100ff', subLayers: 7 },
    { color: '#ff00b1', subLayers: 10 },
  ]);

  // Pengaturan Volume
  const [musicVolume, setMusicVolume] = useState(1.0);
  const [sfxVolume, setSfxVolume] = useState(1.0);

  // Pengaturan foto cincin
  const [photoLayers, setPhotoLayers] = useState(4);
  const [totalPhotos, setTotalPhotos] = useState(120);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const pageRef = useRef(null);

  useEffect(() => {
    // Fetch daftar GIF yang sudah pernah diupload
    fetch('/api/gifs')
      .then(res => res.json())
      .then(data => {
        if (data.gifs) setAvailableGifs(data.gifs);
      })
      .catch(err => console.error(err));

    // Fetch daftar Musik yang sudah pernah diupload
    fetch('/api/music')
      .then(res => res.json())
      .then(data => {
        if (data.music) setAvailableMusic(data.music);
      })
      .catch(err => console.error(err));

    fetch(`/api/config?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (!data || data.error) return; // Skip jika error dari Supabase
        // Merge dengan defaults agar photos/musicUrl tidak pernah undefined
        const safeData = { photos: [], musicUrl: '', tunnelMusicUrl: '', finaleMusicUrl: '', ...data };
        setConfig(safeData);
        setTargetName(safeData.targetName || '');
        setGreetingMessage(safeData.greetingMessage || '');
        setFinaleGreeting(safeData.finaleGreeting || 'Selamat Ulang Tahun Ke 24');
        setSelectedGifUrl(safeData.cakeGifUrl || '');
        setSelectedMusicUrl(safeData.musicUrl || '');
        setSelectedTunnelMusicUrl(safeData.tunnelMusicUrl || '');
        setSelectedFinaleMusicUrl(safeData.finaleMusicUrl || '');
        setAstronautName(safeData.astronautName || 'Astronot');
        if (safeData.tunnelDialogues) setTunnelDialogues(safeData.tunnelDialogues);
        if (safeData.finaleDialogues) setFinaleDialogues(safeData.finaleDialogues);

        if (safeData.planetColors?.length > 0) setPlanetColors(safeData.planetColors);
        else if (safeData.particleColors) setPlanetColors(safeData.particleColors);

        if (safeData.ringColors?.length > 0) setRingColors(safeData.ringColors);
        else if (safeData.particleColors) setRingColors(safeData.particleColors);

        if (safeData.particleRingLayers?.length > 0) setParticleRingLayers(safeData.particleRingLayers);

        if (safeData.musicVolume !== undefined) setMusicVolume(safeData.musicVolume);
        if (safeData.sfxVolume !== undefined) setSfxVolume(safeData.sfxVolume);

        if (safeData.photoLayers) setPhotoLayers(safeData.photoLayers);
        if (safeData.totalPhotos) setTotalPhotos(safeData.totalPhotos);
      })
      .catch(console.error);
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setIsError(false);

    try {
      let updatedPhotos = [...config.photos];
      let updatedMusic = selectedMusicUrl;
      let updatedCakeGif = selectedGifUrl;

      if (cakeGifFile) {
        const formData = new FormData();
        formData.append('file', cakeGifFile);
        formData.append('type', 'image');
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.urls?.length > 0) {
          updatedCakeGif = data.urls[0];
          // Tambahkan ke library lokal dan pilih
          setAvailableGifs(prev => [updatedCakeGif, ...prev.filter(g => g !== updatedCakeGif)]);
          setSelectedGifUrl(updatedCakeGif);
        }
      }

      if (photosFiles.length > 0) {
        const formData = new FormData();
        for (let i = 0; i < photosFiles.length; i++) {
          formData.append('file', photosFiles[i]);
        }
        formData.append('type', 'photo');
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.urls) updatedPhotos = [...updatedPhotos, ...data.urls];
      }

      if (musicFile) {
        const formData = new FormData();
        formData.append('file', musicFile);
        formData.append('type', 'music');
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.urls?.length > 0) {
          updatedMusic = data.urls[0];
          setAvailableMusic(prev => [updatedMusic, ...prev.filter(m => m !== updatedMusic)]);
          setSelectedMusicUrl(updatedMusic);
        }
      }

      let updatedTunnelMusic = selectedTunnelMusicUrl;
      if (tunnelMusicFile) {
        const formData = new FormData();
        formData.append('file', tunnelMusicFile);
        formData.append('type', 'music');
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.urls?.length > 0) {
          updatedTunnelMusic = data.urls[0];
          setAvailableMusic(prev => [updatedTunnelMusic, ...prev.filter(m => m !== updatedTunnelMusic)]);
          setSelectedTunnelMusicUrl(updatedTunnelMusic);
        }
      }

      let updatedFinaleMusic = selectedFinaleMusicUrl;
      if (finaleMusicFile) {
        const formData = new FormData();
        formData.append('file', finaleMusicFile);
        formData.append('type', 'music');
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.urls?.length > 0) {
          updatedFinaleMusic = data.urls[0];
          setAvailableMusic(prev => [updatedFinaleMusic, ...prev.filter(m => m !== updatedFinaleMusic)]);
          setSelectedFinaleMusicUrl(updatedFinaleMusic);
        }
      }

      const finalConfig = {
        targetName,
        greetingMessage,
        finaleGreeting,
        astronautName,
        tunnelDialogues,
        finaleDialogues,
        planetColors,
        ringColors,
        particleRingLayers,
        photoLayers: parseInt(photoLayers) || 4,
        totalPhotos: parseInt(totalPhotos) || 120,
        musicVolume: parseFloat(musicVolume),
        sfxVolume: parseFloat(sfxVolume),
        photos: updatedPhotos,
        musicUrl: updatedMusic,
        tunnelMusicUrl: updatedTunnelMusic,
        finaleMusicUrl: updatedFinaleMusic,
        cakeGifUrl: updatedCakeGif,
      };

      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalConfig),
      });

      setConfig(finalConfig);
      setPhotosFiles([]);
      setMusicFile(null);
      setTunnelMusicFile(null);
      setFinaleMusicFile(null);
      setCakeGifFile(null);
      setMessage('✅ Pengaturan berhasil disimpan! Mengalihkan ke beranda...');
      e.target.reset();
      
      // Redirect ke halaman utama setelah 1.5 detik dengan full reload
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (error) {
      console.error(error);
      setIsError(true);
      setMessage('❌ Terjadi kesalahan saat menyimpan.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearPhotos = () => {
    if (confirm('Hapus semua foto & video dari pengaturan? (File di server tidak akan terhapus)')) {
      setConfig({ ...config, photos: [] });
    }
  };

  const handleRemovePhoto = (indexToRemove) => {
    const updatedPhotos = config.photos.filter((_, i) => i !== indexToRemove);
    setConfig({ ...config, photos: updatedPhotos });
  };

  const hardDeleteFile = async (fileUrl, type) => {
    if (!confirm(`Hapus file secara permanen dari server?`)) return;
    try {
      await fetch(`/api/upload?file=${encodeURIComponent(fileUrl)}`, { method: 'DELETE' });
      if (type === 'gif') {
        setAvailableGifs(prev => prev.filter(f => f !== fileUrl));
        if (selectedGifUrl === fileUrl) setSelectedGifUrl('');
      } else if (type === 'music') {
        setAvailableMusic(prev => prev.filter(f => f !== fileUrl));
        if (selectedMusicUrl === fileUrl) setSelectedMusicUrl('');
        if (selectedTunnelMusicUrl === fileUrl) setSelectedTunnelMusicUrl('');
        if (selectedFinaleMusicUrl === fileUrl) setSelectedFinaleMusicUrl('');
      }
    } catch (e) {
      console.error(e);
      alert('Gagal menghapus file.');
    }
  };

  const hardDeleteAll = async (type) => {
    const list = type === 'gif' ? availableGifs : availableMusic;
    if (list.length === 0) return;
    if (!confirm(`Hapus SEMUA file ${type.toUpperCase()} dari server? (${list.length} file)`)) return;
    try {
      for (const fileUrl of list) {
        await fetch(`/api/upload?file=${encodeURIComponent(fileUrl)}`, { method: 'DELETE' });
      }
      if (type === 'gif') {
        setAvailableGifs([]);
        setSelectedGifUrl('');
      } else {
        setAvailableMusic([]);
        setSelectedMusicUrl('');
        setSelectedTunnelMusicUrl('');
        setSelectedFinaleMusicUrl('');
      }
      alert(`Semua file ${type.toUpperCase()} berhasil dihapus!`);
    } catch (e) {
      console.error(e);
      alert('Gagal menghapus sebagian file.');
    }
  };

  return (
    <div className={styles.page} ref={pageRef}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>✨ Love Planet Admin</h1>
          <p className={styles.subtitle}>Kustomisasi semua aspek tampilan planet Anda</p>
        </div>

        {message && (
          <div className={`${styles.message} ${isError ? styles.errorMessage : ''}`}>
            {message}
          </div>
        )}

        {/* TABS NAVIGATION */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {['profil', 'warna', 'dialog_lorong', 'dialog_finale'].map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 16px',
                background: activeTab === tab ? '#ff3366' : '#222',
                color: 'white',
                border: activeTab === tab ? '2px solid #ff3366' : '1px solid #444',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: activeTab === tab ? 'bold' : 'normal',
                transition: 'all 0.2s'
              }}
            >
              {tab === 'profil' && '📸 Profil & Media'}
              {tab === 'warna' && '🎨 Warna & Elemen'}
              {tab === 'dialog_lorong' && '🚀 Dialog Lorong'}
              {tab === 'dialog_finale' && '🎂 Dialog Finale'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSave}>

          {/* — SECTION: Konten — */}
          {activeTab === 'profil' && (
          <div className={styles.section}>
            <p className={styles.sectionTitle}>Konten</p>

            <div className={styles.formGroup}>
              <label className={styles.label}>Nama (yang dituju)</label>
              <input
                type="text"
                className={styles.input}
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                placeholder="Contoh: Anita"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Pesan di Atas Planet</label>
              <input
                type="text"
                className={styles.input}
                value={greetingMessage}
                onChange={(e) => setGreetingMessage(e.target.value)}
                placeholder="Contoh: Happy Birthday"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Teks Kembang Api (Satu Baris)</label>
              <input
                type="text"
                className={styles.input}
                value={finaleGreeting}
                onChange={(e) => setFinaleGreeting(e.target.value)}
                placeholder="Contoh: Selamat Ulang Tahun Ke 24"
                required
              />
              <p className={styles.hint} style={{ marginTop: '6px' }}>Pesan dan angka ultah ini akan dilukis oleh ledakan kembang api secara bersamaan dalam satu baris panjang.</p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>GIF Kue Ulang Tahun (Galeri & Upload)</label>
              
              {availableGifs.length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                  <p className={styles.hint} style={{ marginBottom: '8px', color: '#00e5ff' }}>Pilih dari GIF yang sudah pernah di-upload:</p>
                  <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'thin' }}>
                    <div 
                      onClick={() => { setSelectedGifUrl(''); setCakeGifFile(null); }}
                      style={{
                        minWidth: '60px', height: '60px', borderRadius: '8px', border: selectedGifUrl === '' ? '2px solid #00e5ff' : '1px solid #444',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#222', color: '#888', fontSize: '12px', flexShrink: 0
                      }}
                    >
                      Kosong
                    </div>
                    {availableGifs.map((gif, idx) => (
                      <div key={idx} style={{ position: 'relative', flexShrink: 0 }}>
                        <img 
                          src={gif} 
                          alt="GIF History" 
                          onClick={() => { setSelectedGifUrl(gif); setCakeGifFile(null); }}
                          style={{
                            width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer',
                            border: selectedGifUrl === gif && !cakeGifFile ? '2px solid #00e5ff' : '1px solid transparent',
                            opacity: (selectedGifUrl && selectedGifUrl !== gif) || cakeGifFile ? 0.3 : 1
                          }}
                        />
                        <button 
                          type="button" 
                          onClick={(e) => { e.stopPropagation(); hardDeleteFile(gif, 'gif'); }}
                          style={{
                            position: 'absolute', top: '-6px', right: '-6px', 
                            background: '#ff3366', color: 'white', border: 'none', 
                            borderRadius: '50%', width: '20px', height: '20px', 
                            cursor: 'pointer', fontSize: '10px', fontWeight: 'bold',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 10
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" className={styles.btnDanger} onClick={() => hardDeleteAll('gif')} style={{ marginTop: '5px', padding: '5px 10px', fontSize: '12px' }}>
                    🗑 Hapus Semua GIF di Server
                  </button>
                </div>
              )}

              <p className={styles.hint} style={{ marginBottom: '6px' }}>Atau unggah file GIF baru:</p>
              <input
                type="file"
                className={styles.input}
                accept="image/gif"
                onChange={(e) => {
                  setCakeGifFile(e.target.files[0]);
                  if (e.target.files[0]) setSelectedGifUrl('');
                }}
              />
              <p className={styles.hint} style={{ marginTop: '6px' }}>Pilih "Kosong" di galeri jika tidak ingin menampilkan GIF sama sekali.</p>
            </div>
          </div>
          )}

          {/* — SECTION: Dialog Astronot Lorong Waktu — */}
          {activeTab === 'dialog_lorong' && (
          <div className={styles.section}>
            <p className={styles.sectionTitle}>Dialog Astronot Lorong Waktu</p>
            
            <div className={styles.formGroup} style={{ marginBottom: '24px' }}>
              <label className={styles.label}>Nama Panggilan Dialog</label>
              <input
                type="text"
                className={styles.input}
                value={astronautName}
                onChange={(e) => setAstronautName(e.target.value)}
                placeholder="Contoh: Yunus"
                required
              />
              <p className={styles.hint} style={{ marginTop: '6px' }}>Nama yang akan ditampilkan sebagai pembicara pada dialog di bawah.</p>
            </div>

            <p className={styles.hint} style={{ marginBottom: '20px' }}>
              Teks ini akan muncul secara bergantian setiap kali Anda mengeklik layar 1 kali (mode lambat) saat melaju di dalam lorong waktu.
            </p>
            
            {tunnelDialogues.map((dialogue, idx) => (
              <div key={idx} className={styles.formGroup} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '16px' }}>
                <span style={{ color: '#00e5ff', fontWeight: 'bold', fontSize: '18px', marginTop: '10px', minWidth: '25px' }}>#{idx + 1}</span>
                <textarea
                  className={styles.input}
                  style={{ flex: 1, minHeight: '60px', resize: 'vertical' }}
                  value={dialogue}
                  onChange={(e) => {
                    const newDialogues = [...tunnelDialogues];
                    newDialogues[idx] = e.target.value;
                    setTunnelDialogues(newDialogues);
                  }}
                  required
                />
                <button
                  type="button"
                  className={styles.btnDanger}
                  style={{ padding: '10px 16px', fontSize: '14px', marginTop: '4px' }}
                  onClick={() => {
                    if (tunnelDialogues.length <= 1) {
                      alert("Minimal harus ada 1 dialog!");
                      return;
                    }
                    const newDialogues = tunnelDialogues.filter((_, i) => i !== idx);
                    setTunnelDialogues(newDialogues);
                  }}
                >
                  Hapus
                </button>
              </div>
            ))}
            
            <button
              type="button"
              className={styles.button}
              style={{ background: 'transparent', border: '2px dashed #00e5ff', color: '#00e5ff', padding: '12px', marginTop: '10px' }}
              onClick={() => setTunnelDialogues([...tunnelDialogues, ""])}
            >
              + Tambah Dialog Baru
            </button>
          </div>
          )}

          {/* — SECTION: Musik — */}
          {activeTab === 'profil' && (
          <div className={styles.section}>
            <p className={styles.sectionTitle}>Pengaturan Suara & Musik</p>
            
            <div className={styles.formGroup} style={{ background: 'rgba(0, 229, 255, 0.05)', padding: '15px', borderRadius: '8px', border: '1px solid #00e5ff33', marginBottom: '20px' }}>
              <label className={styles.label}>Volume Musik (Planet, Lorong, Kue)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <input 
                  type="range" 
                  min="0" max="1" step="0.05" 
                  value={musicVolume} 
                  onChange={(e) => setMusicVolume(e.target.value)}
                  style={{ flex: 1, accentColor: '#00e5ff' }}
                />
                <span style={{ minWidth: '45px', color: '#00e5ff', fontWeight: 'bold' }}>{Math.round(musicVolume * 100)}%</span>
              </div>
              
              <label className={styles.label} style={{ marginTop: '15px' }}>Volume Efek Suara (Hitung Mundur, Kembang Api)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <input 
                  type="range" 
                  min="0" max="1" step="0.05" 
                  value={sfxVolume} 
                  onChange={(e) => setSfxVolume(e.target.value)}
                  style={{ flex: 1, accentColor: '#00e5ff' }}
                />
                <span style={{ minWidth: '45px', color: '#00e5ff', fontWeight: 'bold' }}>{Math.round(sfxVolume * 100)}%</span>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Musik Latar Planet (Galeri & Upload)</label>

              {availableMusic.length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                  <p className={styles.hint} style={{ marginBottom: '8px', color: '#00e5ff' }}>Pilih dari musik yang sudah pernah di-upload:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                    <div 
                      onClick={() => { setSelectedMusicUrl(''); setMusicFile(null); }}
                      style={{
                        padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                        border: selectedMusicUrl === '' ? '2px solid #00e5ff' : '1px solid #444',
                        background: '#222', color: '#888', fontSize: '13px', display: 'flex', alignItems: 'center'
                      }}
                    >
                      <span style={{ flex: 1 }}>Tanpa Musik (Mute)</span>
                    </div>
                    {availableMusic.map((music, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => { setSelectedMusicUrl(music); setMusicFile(null); }}
                        style={{
                          padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                          border: selectedMusicUrl === music && !musicFile ? '2px solid #00e5ff' : '1px solid #444',
                          background: '#1a1a1a', color: '#eee', fontSize: '13px', display: 'flex', alignItems: 'center',
                          opacity: (selectedMusicUrl && selectedMusicUrl !== music) || musicFile ? 0.4 : 1
                        }}
                      >
                        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          🎵 {music.split('/').pop()}
                        </span>
                        <button 
                          type="button" 
                          onClick={(e) => { e.stopPropagation(); hardDeleteFile(music, 'music'); }}
                          style={{
                            background: '#ff3366', color: 'white', border: 'none', 
                            borderRadius: '4px', padding: '4px 8px', marginLeft: '10px',
                            cursor: 'pointer', fontSize: '11px', fontWeight: 'bold'
                          }}
                        >
                          Hapus
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" className={styles.btnDanger} onClick={() => hardDeleteAll('music')} style={{ padding: '5px 10px', fontSize: '12px' }}>
                    🗑 Hapus Semua Musik di Server
                  </button>
                </div>
              )}

              <p className={styles.hint} style={{ marginBottom: '6px' }}>Atau unggah file musik baru:</p>
              <input
                type="file"
                className={styles.input}
                accept="audio/*,.mp3,.wav,.ogg"
                onChange={(e) => {
                  setMusicFile(e.target.files[0]);
                  if (e.target.files[0]) setSelectedMusicUrl('');
                }}
              />
              {musicFile && <p className={styles.hint} style={{ color: '#00e5ff', marginTop: '5px' }}>File siap diupload: {musicFile.name}</p>}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Musik Lorong Waktu (Warp Tunnel)</label>
              {availableMusic.length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                    <div 
                      onClick={() => { setSelectedTunnelMusicUrl(''); setTunnelMusicFile(null); }}
                      style={{
                        padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                        border: selectedTunnelMusicUrl === '' ? '2px solid #00e5ff' : '1px solid #444',
                        background: '#222', color: '#888', fontSize: '13px', display: 'flex', alignItems: 'center'
                      }}
                    >
                      <span style={{ flex: 1 }}>Tanpa Musik (Mute)</span>
                    </div>
                    {availableMusic.map((music, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => { setSelectedTunnelMusicUrl(music); setTunnelMusicFile(null); }}
                        style={{
                          padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                          border: selectedTunnelMusicUrl === music && !tunnelMusicFile ? '2px solid #00e5ff' : '1px solid #444',
                          background: '#1a1a1a', color: '#eee', fontSize: '13px', display: 'flex', alignItems: 'center',
                          opacity: (selectedTunnelMusicUrl && selectedTunnelMusicUrl !== music) || tunnelMusicFile ? 0.4 : 1
                        }}
                      >
                        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          🎵 {music.split('/').pop()}
                        </span>
                        <button 
                          type="button" 
                          onClick={(e) => { e.stopPropagation(); hardDeleteFile(music, 'music'); }}
                          style={{
                            background: '#ff3366', color: 'white', border: 'none', 
                            borderRadius: '4px', padding: '4px 8px', marginLeft: '10px',
                            cursor: 'pointer', fontSize: '11px', fontWeight: 'bold'
                          }}
                        >
                          Hapus
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className={styles.hint} style={{ marginBottom: '6px' }}>Atau unggah file musik lorong baru:</p>
              <input
                type="file"
                className={styles.input}
                accept="audio/*,.mp3,.wav,.ogg"
                onChange={(e) => {
                  setTunnelMusicFile(e.target.files[0]);
                  if (e.target.files[0]) setSelectedTunnelMusicUrl('');
                }}
              />
              {tunnelMusicFile && <p className={styles.hint} style={{ color: '#00e5ff', marginTop: '5px' }}>File siap diupload: {tunnelMusicFile.name}</p>}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Musik Animasi Kue Ulang Tahun (Finale)</label>
              {availableMusic.length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                    <div 
                      onClick={() => { setSelectedFinaleMusicUrl(''); setFinaleMusicFile(null); }}
                      style={{
                        padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                        border: selectedFinaleMusicUrl === '' ? '2px solid #00e5ff' : '1px solid #444',
                        background: '#222', color: '#888', fontSize: '13px', display: 'flex', alignItems: 'center'
                      }}
                    >
                      <span style={{ flex: 1 }}>Tanpa Musik (Mute)</span>
                    </div>
                    {availableMusic.map((music, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => { setSelectedFinaleMusicUrl(music); setFinaleMusicFile(null); }}
                        style={{
                          padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                          border: selectedFinaleMusicUrl === music && !finaleMusicFile ? '2px solid #00e5ff' : '1px solid #444',
                          background: '#1a1a1a', color: '#eee', fontSize: '13px', display: 'flex', alignItems: 'center',
                          opacity: (selectedFinaleMusicUrl && selectedFinaleMusicUrl !== music) || finaleMusicFile ? 0.4 : 1
                        }}
                      >
                        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          🎵 {music.split('/').pop()}
                        </span>
                        <button 
                          type="button" 
                          onClick={(e) => { e.stopPropagation(); hardDeleteFile(music, 'music'); }}
                          style={{
                            background: '#ff3366', color: 'white', border: 'none', 
                            borderRadius: '4px', padding: '4px 8px', marginLeft: '10px',
                            cursor: 'pointer', fontSize: '11px', fontWeight: 'bold'
                          }}
                        >
                          Hapus
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className={styles.hint} style={{ marginBottom: '6px' }}>Atau unggah file musik kue ultah baru:</p>
              <input
                type="file"
                className={styles.input}
                accept="audio/*,.mp3,.wav,.ogg"
                onChange={(e) => {
                  setFinaleMusicFile(e.target.files[0]);
                  if (e.target.files[0]) setSelectedFinaleMusicUrl('');
                }}
              />
              {finaleMusicFile && <p className={styles.hint} style={{ color: '#00e5ff', marginTop: '5px' }}>File siap diupload: {finaleMusicFile.name}</p>}
            </div>
          </div>
          )}

          {/* — SECTION: Foto & Video — */}
          {activeTab === 'profil' && (
          <div className={styles.section}>
            <p className={styles.sectionTitle}>Foto &amp; Video</p>

            <div className={styles.formGroup}>
              <label className={styles.label}>Tambah Foto / Video (bisa pilih banyak)</label>
              <input
                type="file"
                className={styles.input}
                accept="image/*,video/*"
                multiple
                onChange={(e) => setPhotosFiles(e.target.files)}
              />
            </div>

            {config.photos.length > 0 && (
              <div className={styles.formGroup}>
                <label className={styles.label}>Pratinjau ({config.photos.length} file tersimpan)</label>
                <div className={styles.photoPreview} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  {config.photos.map((url, i) => (
                    <div key={i} style={{ position: 'relative', display: 'inline-block' }}>
                      <img src={url} alt={`foto ${i + 1}`} className={styles.thumbnail} onError={(e) => { e.target.style.display = 'none'; }} />
                      <button 
                        type="button" 
                        onClick={() => handleRemovePhoto(i)}
                        title="Hapus foto ini"
                        style={{
                          position: 'absolute', top: '-6px', right: '-6px', 
                          background: '#ff3366', color: 'white', border: 'none', 
                          borderRadius: '50%', width: '22px', height: '22px', 
                          cursor: 'pointer', fontSize: '12px', fontWeight: 'bold',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.5)'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" className={styles.btnDanger} onClick={handleClearPhotos} style={{ marginTop: '15px' }}>
                  🗑 Hapus Semua Foto
                </button>
              </div>
            )}
          </div>
          )}

          {/* — SECTION: Pengaturan Cincin Foto — */}
          {activeTab === 'profil' && (
          <div className={styles.section}>
            <p className={styles.sectionTitle}>Pengaturan Cincin Foto</p>

            <div className={styles.formGroup}>
              <label className={styles.label}>Jumlah Lapisan Cincin</label>
              <div className={styles.numberRow}>
                <input
                  type="number"
                  className={styles.inputSmall}
                  min="1" max="10"
                  value={photoLayers}
                  onChange={(e) => setPhotoLayers(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                />
                <span style={{ fontSize: 13, color: '#888' }}>lapisan mengelilingi planet</span>
              </div>
              <p className={styles.hint}>Contoh: 4 lapisan = seperti cincin Saturnus berlapis-lapis.</p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Total Foto yang Ditampilkan</label>
              <div className={styles.numberRow}>
                <input
                  type="number"
                  className={styles.inputSmall}
                  min="6" max="500"
                  value={totalPhotos}
                  onChange={(e) => setTotalPhotos(Math.max(6, Math.min(500, parseInt(e.target.value) || 60)))}
                />
                <span style={{ fontSize: 13, color: '#888' }}>foto (dibagi rata ke semua lapisan)</span>
              </div>
              <p className={styles.hint}>
                Foto yang Anda unggah akan diulang mengisi {totalPhotos} bingkai.
                {photoLayers > 0 && ` Setiap lapisan akan berisi ~${Math.round(totalPhotos / photoLayers)} foto.`}
              </p>
            </div>
          </div>
          )}

          {/* — SECTION: Warna Partikel — */}
          {activeTab === 'warna' && (
          <div className={styles.section}>
            <p className={styles.sectionTitle}>Warna Partikel</p>

            <ColorPickerGroup
              label="🌐 Partikel Planet (Bola Tengah)"
              colors={planetColors}
              setColors={setPlanetColors}
            />

            {/* Warna Cincin Partikel (lama) */}
          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '18px 0' }} />

          <ColorPickerGroup
            label="🌊 Warna Debu Kosmik (Latar)"
            colors={ringColors}
            setColors={setRingColors}
          />
        </div>
        )}

        {/* — SECTION: Lapisan Cincin Partikel — */}
        {activeTab === 'warna' && (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Lapisan Cincin Partikel</p>

          <div className={styles.formGroup}>
            <label className={styles.label}>Jumlah Lapisan Cincin yang Mengelilingi Planet</label>
            <div className={styles.numberRow}>
              <input
                type="number"
                className={styles.inputSmall}
                min="1" max="10"
                value={particleRingLayers.length}
                onChange={(e) => {
                  const count = Math.max(1, Math.min(10, parseInt(e.target.value) || 1));
                  const newLayers = [...particleRingLayers];
                  if (count > newLayers.length) {
                    while (newLayers.length < count) newLayers.push({ color: '#ffffff', subLayers: 10 });
                  } else {
                    newLayers.length = count;
                  }
                  setParticleRingLayers([...newLayers]);
                }}
              />
              <span style={{ fontSize: 13, color: '#888' }}>lapisan (maks 10)</span>
            </div>
            <p className={styles.hint}>Setiap lapisan berputar dengan arah selang-seling untuk tampilan yang dinamis.</p>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Pengaturan per Lapisan (Warna & Ketebalan)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {particleRingLayers.map((layer, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, color: '#888', minWidth: 70 }}>Lapisan {idx + 1}</span>
                  <input
                    type="color"
                    value={layer.color || '#ffffff'}
                    className={styles.colorSwatch}
                    onChange={(e) => {
                      const newLayers = [...particleRingLayers];
                      newLayers[idx] = { ...newLayers[idx], color: e.target.value };
                      setParticleRingLayers(newLayers);
                    }}
                    title={`Warna Lapisan ${idx + 1}`}
                  />
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: 12, color: '#aaa' }}>Ketebalan:</span>
                    <input
                      type="number"
                      className={styles.inputSmall}
                      style={{ width: '60px' }}
                      min="1" max="30"
                      value={layer.subLayers || 10}
                      onChange={(e) => {
                        const newLayers = [...particleRingLayers];
                        newLayers[idx] = { ...newLayers[idx], subLayers: parseInt(e.target.value) || 1 };
                        setParticleRingLayers(newLayers);
                      }}
                      title={`Jumlah sabuk garis tipis (ketebalan) Lapisan ${idx + 1}`}
                    />
                    <span style={{ fontSize: 11, color: '#888' }}>garis</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        )}

        {/* — SECTION: Dialog Finale — */}
        {activeTab === 'dialog_finale' && (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Dialog Astronot Finale (Saat Kue Muncul)</p>
          <p className={styles.hint} style={{ marginBottom: '20px' }}>
            Teks ini akan muncul secara berurutan setiap kali Anda mengeklik layar saat kue ulang tahun ditampilkan.
          </p>
          
          {finaleDialogues.map((dialogue, idx) => (
            <div key={idx} className={styles.formGroup} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '16px' }}>
              <span style={{ color: '#00e5ff', fontWeight: 'bold', fontSize: '18px', marginTop: '10px', minWidth: '25px' }}>#{idx + 1}</span>
              <textarea
                className={styles.input}
                style={{ flex: 1, minHeight: '60px', resize: 'vertical' }}
                value={dialogue}
                onChange={(e) => {
                  const newDialogues = [...finaleDialogues];
                  newDialogues[idx] = e.target.value;
                  setFinaleDialogues(newDialogues);
                }}
                required
              />
              <button
                type="button"
                className={styles.btnDanger}
                style={{ padding: '10px 16px', fontSize: '14px', marginTop: '4px' }}
                onClick={() => {
                  if (finaleDialogues.length <= 1) {
                    alert("Minimal harus ada 1 dialog!");
                    return;
                  }
                  const newDialogues = finaleDialogues.filter((_, i) => i !== idx);
                  setFinaleDialogues(newDialogues);
                }}
              >
                Hapus
              </button>
            </div>
          ))}
          
          <button
            type="button"
            className={styles.button}
            style={{ background: 'transparent', border: '2px dashed #00e5ff', color: '#00e5ff', padding: '12px', marginTop: '10px' }}
            onClick={() => setFinaleDialogues([...finaleDialogues, ""])}
          >
            + Tambah Dialog Baru
          </button>
        </div>
        )}

          {/* — STICKY SAVE BAR — */}
          <div className={styles.saveBar}>
            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? '⏳ Menyimpan...' : '💾 Simpan Semua Perubahan'}
            </button>
          </div>

        </form>

        {/* Tombol Scroll */}
        <button
          type="button"
          className={`${styles.fabBtn} ${styles.scrollFabTop}`}
          style={{ position: 'fixed', right: 24, bottom: 84 }}
          onClick={() => pageRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          title="Scroll ke Atas"
        >
          ↑
        </button>
        <button
          type="button"
          className={`${styles.fabBtn} ${styles.scrollFabBottom}`}
          style={{ position: 'fixed', right: 24, bottom: 24 }}
          onClick={() => pageRef.current?.scrollTo({ top: pageRef.current.scrollHeight, behavior: 'smooth' })}
          title="Scroll ke Bawah"
        >
          ↓
        </button>

      </div>
    </div>
  );
}
