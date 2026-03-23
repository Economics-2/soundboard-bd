// src/App.js
import React, { useState, useEffect, useRef } from "react";
import {
  collection, addDoc, getDocs, orderBy, query, serverTimestamp
} from "firebase/firestore";
import {
  ref, uploadBytesResumable, getDownloadURL
} from "firebase/storage";
import { db, storage } from "./firebase";
import "./App.css";

const CATEGORIES = ["সব","মজার","মিম","বাংলা","মিউজিক","এনিমে","ইফেক্ট"];
const CAT_MAP    = { সব:"all", মজার:"funny", মিম:"meme", বাংলা:"bengali", মিউজিক:"music", এনিমে:"anime", ইফেক্ট:"effect" };
const COLORS     = ["btn-red","btn-black","btn-blue","btn-green","btn-yellow","btn-purple","btn-cyan","btn-orange","btn-brown","btn-silver"];

// ─── Synthetic fallback sound ──────────────────────────────────────────────
let audioCtx;
function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
function synth(freq = 220, dur = 0.5) {
  const ctx = getCtx();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = "sine";
  o.frequency.setValueAtTime(freq, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(freq * 0.4, ctx.currentTime + dur);
  g.gain.setValueAtTime(0.7, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  o.start(); o.stop(ctx.currentTime + dur + 0.05);
}

// ─── Toast ─────────────────────────────────────────────────────────────────
function Toast({ msg, show }) {
  return <div className={`toast ${show ? "show" : ""}`}>{msg}</div>;
}

// ─── Sound Card ────────────────────────────────────────────────────────────
function SoundCard({ sound, onShare }) {
  const [playing, setPlaying]   = useState(false);
  const [fav, setFav]           = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);

  const playAudio = () => {
    if (sound.url) {
      if (!audioRef.current) audioRef.current = new Audio(sound.url);
      const audio = audioRef.current;
      audio.currentTime = 0;
      audio.play().catch(() => synth(sound.freq || 220));
      audio.ontimeupdate = () => setProgress((audio.currentTime / audio.duration) * 100 || 0);
      audio.onended = () => { setPlaying(false); setProgress(0); };
      setPlaying(true);
    } else {
      synth(sound.freq || 220);
      setPlaying(true);
      setTimeout(() => setPlaying(false), 500);
    }
  };

  const downloadMp3 = async () => {
    if (!sound.url) { alert("এই সাউন্ডের MP3 ফাইল নেই।"); return; }
    const a = document.createElement("a");
    a.href = sound.url;
    a.download = `${sound.name}.mp3`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className={`sound-card ${playing ? "playing" : ""}`}>
      <button
        className={`btn-3d ${sound.color || "btn-red"}`}
        onClick={playAudio}
        aria-label={sound.name}
      />
      <div className="sound-name">{sound.name}</div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: progress + "%" }} />
      </div>
      <div className="sound-actions">
        <button
          className={`action-btn heart ${fav ? "fav-active" : ""}`}
          onClick={() => setFav(f => !f)}
          title="ফেভারিট"
        >♥</button>
        <button
          className="action-btn download"
          onClick={downloadMp3}
          title="MP3 ডাউনলোড"
        >⬇</button>
        <button
          className="action-btn share-btn"
          onClick={() => onShare(sound)}
          title="শেয়ার"
        >➤</button>
      </div>
    </div>
  );
}

// ─── Upload Modal ──────────────────────────────────────────────────────────
function UploadModal({ onClose, onUploaded }) {
  const [name, setName]       = useState("");
  const [cat, setCat]         = useState("funny");
  const [color, setColor]     = useState("btn-red");
  const [file, setFile]       = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [error, setError]     = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) { setError("সাউন্ডের নাম দিন।"); return; }
    if (!file)        { setError("MP3 ফাইল বেছে নিন।"); return; }
    if (!file.name.endsWith(".mp3") && file.type !== "audio/mpeg") {
      setError("শুধু MP3 ফাইল আপলোড করা যাবে।"); return;
    }
    setError(""); setUploading(true);

    try {
      const storageRef = ref(storage, `sounds/${Date.now()}_${file.name}`);
      const task = uploadBytesResumable(storageRef, file);

      task.on("state_changed",
        snap => setUploadPct(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
        err  => { setError("আপলোড ব্যর্থ: " + err.message); setUploading(false); },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          await addDoc(collection(db, "sounds"), {
            name: name.trim(), cat, color, url,
            freq: 220, views: 0,
            createdAt: serverTimestamp(),
          });
          setUploading(false);
          onUploaded();
          onClose();
        }
      );
    } catch (e) {
      setError("সমস্যা হয়েছে: " + e.message);
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal upload-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2>📤 নতুন সাউন্ড যুক্ত করুন</h2>
        <p className="modal-sub">MP3 আপলোড করুন এবং সবার সাথে শেয়ার করুন</p>

        {error && <div className="error-msg">⚠️ {error}</div>}

        <div className="form-group">
          <label>সাউন্ডের নাম *</label>
          <input
            type="text"
            placeholder="যেমন: VINE BOOM SOUND"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>ক্যাটাগরি</label>
          <select value={cat} onChange={e => setCat(e.target.value)}>
            <option value="funny">😂 মজার</option>
            <option value="meme">🎭 মিম</option>
            <option value="bengali">🇧🇩 বাংলা</option>
            <option value="music">🎵 মিউজিক</option>
            <option value="anime">✨ এনিমে</option>
            <option value="effect">💥 ইফেক্ট</option>
          </select>
        </div>

        <div className="form-group">
          <label>বাটনের রঙ</label>
          <div className="color-picker">
            {COLORS.map(c => (
              <button
                key={c}
                className={`color-dot btn-3d ${c} ${color === c ? "selected" : ""}`}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>MP3 ফাইল *</label>
          <div className="file-drop" onClick={() => document.getElementById("mp3input").click()}>
            {file ? `✅ ${file.name}` : "📁 ক্লিক করে MP3 বেছে নিন"}
          </div>
          <input
            id="mp3input"
            type="file"
            accept=".mp3,audio/mpeg"
            style={{ display: "none" }}
            onChange={e => setFile(e.target.files[0])}
          />
        </div>

        {uploading && (
          <div className="upload-progress-wrap">
            <div className="upload-progress-bar">
              <div className="upload-progress-fill" style={{ width: uploadPct + "%" }} />
            </div>
            <span>{uploadPct}% আপলোড হচ্ছে...</span>
          </div>
        )}

        <div className="modal-btns">
          <button className="modal-btn primary" onClick={handleSubmit} disabled={uploading}>
            {uploading ? "⏳ আপলোড হচ্ছে..." : "✅ আপলোড করুন"}
          </button>
          <button className="modal-btn cancel" onClick={onClose} disabled={uploading}>
            বাতিল
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Share Modal ───────────────────────────────────────────────────────────
function ShareModal({ sound, onClose }) {
  const link = `https://soundboard-bd.web.app/sound/${sound?.id}`;
  const copyLink = () => { navigator.clipboard?.writeText(link); };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2>{sound?.name}</h2>
        <p className="modal-sub">বন্ধুদের সাথে শেয়ার করুন</p>
        <div className="modal-btns">
          <button className="modal-btn" style={{background:"#1976d2"}} onClick={copyLink}>
            🔗 লিঙ্ক কপি করুন
          </button>
          <button className="modal-btn" style={{background:"#25d366"}}
            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(sound?.name + " - " + link)}`)}>
            💬 WhatsApp
          </button>
          <button className="modal-btn" style={{background:"#e1306c"}}
            onClick={() => window.open(`https://www.instagram.com/`)}>
            📸 Instagram
          </button>
          <button className="modal-btn cancel" onClick={onClose}>বাতিল</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────
export default function App() {
  const [sounds, setSounds]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [activeCat, setActiveCat] = useState("সব");
  const [showUpload, setShowUpload] = useState(false);
  const [shareSound, setShareSound] = useState(null);
  const [toast, setToast]         = useState({ msg: "", show: false });

  const showToast = (msg) => {
    setToast({ msg, show: true });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 2500);
  };

  const fetchSounds = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "sounds"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSounds(data);
    } catch (e) {
      console.error(e);
      // fallback demo sounds
      setSounds([
        { id:"1", name:"VINE BOOM SOUND", cat:"meme",   color:"btn-red",    freq:80,  url:"" },
        { id:"2", name:"FAAAH",           cat:"funny",  color:"btn-black",  freq:150, url:"" },
        { id:"3", name:"একবার ধোকা খাইছি", cat:"bengali", color:"btn-red", freq:220, url:"" },
        { id:"4", name:"Metal pipe clang", cat:"effect", color:"btn-black", freq:700, url:"" },
        { id:"5", name:"dun dun dunnnn",  cat:"music",  color:"btn-red",    freq:55,  url:"" },
        { id:"6", name:"baby laughing",   cat:"funny",  color:"btn-cyan",   freq:500, url:"" },
        { id:"7", name:"anime ahh",       cat:"anime",  color:"btn-red",    freq:420, url:"" },
        { id:"8", name:"Maaf Koira Dilam",cat:"bengali",color:"btn-silver", freq:240, url:"" },
      ]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSounds(); }, []);

  const filtered = sounds.filter(s => {
    const catKey = CAT_MAP[activeCat];
    const matchCat = catKey === "all" || s.cat === catKey;
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="app">
      {/* NAV */}
      <nav>
        <div className="nav-logo">Sound<span>Board</span> <em>BD</em></div>
        <button className="nav-upload-btn" onClick={() => setShowUpload(true)}>+ আপলোড</button>
      </nav>

      {/* SEARCH */}
      <div className="search-area">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="সাউন্ড খুঁজুন..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="clear-btn" onClick={() => setSearch("")}>✕</button>}
        </div>
      </div>

      {/* TRENDING BADGE */}
      <div className="trending-banner">
        🔥 <strong>বাংলাদেশে ট্রেন্ডিং</strong> — আজকের সেরা সাউন্ড বাটন
      </div>

      {/* CATEGORIES */}
      <div className="categories-row">
        {CATEGORIES.map(c => (
          <button
            key={c}
            className={`chip ${activeCat === c ? "active" : ""}`}
            onClick={() => setActiveCat(c)}
          >{c}</button>
        ))}
      </div>

      {/* SECTION TITLE */}
      <div className="section-title">
        {search ? `🔍 "${search}" এর ফলাফল` : "🔥 সব সাউন্ড"}
        <span className="count-badge">{filtered.length}</span>
      </div>

      {/* GRID */}
      {loading ? (
        <div className="loading">
          <div className="spinner" /><p>লোড হচ্ছে...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">😕</div>
          <p>কোনো সাউন্ড পাওয়া যায়নি</p>
          <button className="upload-btn" onClick={() => setShowUpload(true)}>প্রথম সাউন্ড যুক্ত করুন</button>
        </div>
      ) : (
        <div className="sound-grid">
          {filtered.map(s => (
            <SoundCard
              key={s.id}
              sound={s}
              onShare={snd => setShareSound(snd)}
            />
          ))}
        </div>
      )}

      {/* UPLOAD CTA */}
      <div className="upload-cta">
        <h3>📤 নিজের সাউন্ড যুক্ত করুন</h3>
        <p>MP3 আপলোড করুন এবং সবাই শুনুক!</p>
        <button className="upload-btn" onClick={() => setShowUpload(true)}>+ নতুন সাউন্ড</button>
      </div>

      <footer>
        &copy; 2026 <strong>SoundBoard BD</strong> — Firebase দ্বারা চালিত 🔥
      </footer>

      {/* MODALS */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={() => { fetchSounds(); showToast("✅ সাউন্ড সফলভাবে আপলোড হয়েছে!"); }}
        />
      )}
      {shareSound && (
        <ShareModal sound={shareSound} onClose={() => setShareSound(null)} />
      )}

      <Toast msg={toast.msg} show={toast.show} />
    </div>
  );
}
