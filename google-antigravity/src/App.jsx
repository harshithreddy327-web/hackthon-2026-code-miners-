import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Mic, Camera, Settings, RotateCcw, Play, Square, Sparkles, 
  Sun, Moon, ArrowDown, ArrowUp, ArrowLeft, ArrowRight, HelpCircle, RefreshCw
} from 'lucide-react';
import PhysicsEngine from './utils/PhysicsEngine';

// Predefined funny search results for antigravity integration
const MOCK_RESULTS = [
  {
    title: "Google Antigravity: The Definitive Guide",
    snippet: "Scientists confirm Newton's laws are temporarily suspended on Google. Click to read about floating logos."
  },
  {
    title: "Is zero-gravity typing possible?",
    snippet: "Experts suggest using magnetic keyboards or heavy keycaps to prevent letters from drifting away."
  },
  {
    title: "Vite + React: Building Web Apps in Space",
    snippet: "Speed up your local server to light-speed. Zero-gravity configuration guide inside."
  },
  {
    title: "Newton's Apple Falls Upwards",
    snippet: "A strange anomaly in physics history shows apples escaping the Earth's atmosphere."
  },
  {
    title: "NeuroScribe: Zero-G Handwriting writer tool",
    snippet: "Generate pristine handwritten files even while floating in orbit. Payouts processed instantly."
  },
  {
    title: "Antigravity IDE: Coding without constraints",
    snippet: "Develop complex multi-agent architectures while floating upside down."
  }
];

export default function App() {
  const [theme, setTheme] = useState('light');
  const [physicsActive, setPhysicsActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCards, setSearchCards] = useState([]);
  
  // Physics parameters
  const [gravityVal, setGravityVal] = useState(0.6);
  const [bouncinessVal, setBouncinessVal] = useState(0.6);
  const [frictionVal, setFrictionVal] = useState(0.99);
  const [gravityDirection, setGravityDirection] = useState('down'); // down, up, left, right, zero

  // Auto test panel states
  const [isAutoTesting, setIsAutoTesting] = useState(false);
  const [testLog, setTestLog] = useState([]);

  const physicsEngineRef = useRef(null);
  const elementsRegisteredRef = useRef(new Set());
  const initialStylesRef = useRef(new Map());

  // Setup theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Clean up physics on unmount
  useEffect(() => {
    return () => {
      if (physicsEngineRef.current) {
        physicsEngineRef.current.destroy();
      }
    };
  }, []);

  // Sync physics parameters
  useEffect(() => {
    if (physicsEngineRef.current) {
      physicsEngineRef.current.setGravity(gravityVal);
      physicsEngineRef.current.setBounciness(bouncinessVal);
      physicsEngineRef.current.setFriction(frictionVal);
    }
  }, [gravityVal, bouncinessVal, frictionVal]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const getGravityAngle = (dir) => {
    switch (dir) {
      case 'down': return Math.PI / 2;
      case 'up': return -Math.PI / 2;
      case 'left': return Math.PI;
      case 'right': return 0;
      default: return 0; // fallback
    }
  };

  const handleGravityDirection = (dir) => {
    setGravityDirection(dir);
    if (!physicsEngineRef.current) return;
    
    if (dir === 'zero') {
      physicsEngineRef.current.setGravity(0.02); // very tiny floating drift
    } else {
      physicsEngineRef.current.setGravity(gravityVal);
      physicsEngineRef.current.setGravityAngle(getGravityAngle(dir));
    }
  };

  const logTest = (msg) => {
    setTestLog(prev => [ `[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 8) ]);
  };

  // 1. Capture grid elements and convert them to absolute coordinates
  const activatePhysics = () => {
    if (physicsActive) return;
    
    logTest("Initializing physics playground...");

    // Create the physics engine instance
    const engine = new PhysicsEngine({
      gravity: gravityDirection === 'zero' ? 0.02 : gravityVal,
      gravityAngle: getGravityAngle(gravityDirection),
      bounciness: bouncinessVal,
      friction: frictionVal
    });
    physicsEngineRef.current = engine;

    // Get all targets that will be subject to physics
    const targets = document.querySelectorAll('.physics-body-target');
    
    targets.forEach((el, index) => {
      const id = el.id || `body-${index}`;
      
      // Save initial styling to restore on reset
      initialStylesRef.current.set(el, {
        position: el.style.position,
        left: el.style.left,
        top: el.style.top,
        width: el.style.width,
        height: el.style.height,
        transform: el.style.transform,
        margin: el.style.margin
      });

      // Capture geometry
      const rect = el.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const l = rect.left;
      const t = rect.top;

      // Set explicit fixed layout so they retain exact positions when grid constraints break
      el.style.position = 'fixed';
      el.style.left = '0';
      el.style.top = '0';
      el.style.margin = '0';
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      el.style.transform = `translate3d(${l}px, ${t}px, 0)`;

      // Add as rigid body to physics engine
      engine.addBody(el, id);
      elementsRegisteredRef.current.add(id);
    });

    engine.start();
    setPhysicsActive(true);
    logTest("Physics active. Try dragging logo/buttons!");
  };

  // Reset the playground to normal Google view
  const handleReset = () => {
    logTest("Resetting playground to grid view...");
    if (physicsEngineRef.current) {
      physicsEngineRef.current.destroy();
      physicsEngineRef.current = null;
    }

    // Restore styling for standard bodies
    initialStylesRef.current.forEach((style, el) => {
      el.style.position = style.position;
      el.style.left = style.left;
      el.style.top = style.top;
      el.style.width = style.width;
      el.style.height = style.height;
      el.style.transform = style.transform;
      el.style.margin = style.margin;
    });

    initialStylesRef.current.clear();
    elementsRegisteredRef.current.clear();
    setSearchCards([]);
    setPhysicsActive(false);
    logTest("Reset complete.");
  };

  // Dragging event handlers
  const handleMouseDown = (e, id) => {
    if (!physicsActive || !physicsEngineRef.current) return;
    
    // If user is clicking input box to type, do not drag
    if (e.target.tagName.toLowerCase() === 'input') return;

    e.preventDefault();
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    physicsEngineRef.current.startDrag(id, mouseX, mouseY);
    
    const onMouseMove = (moveEvent) => {
      physicsEngineRef.current.updateDrag(moveEvent.clientX, moveEvent.clientY);
    };

    const onMouseUp = () => {
      physicsEngineRef.current.endDrag();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleTouchStart = (e, id) => {
    if (!physicsActive || !physicsEngineRef.current) return;
    if (e.target.tagName.toLowerCase() === 'input') return;

    const touch = e.touches[0];
    physicsEngineRef.current.startDrag(id, touch.clientX, touch.clientY);
    
    const onTouchMove = (moveEvent) => {
      const moveTouch = moveEvent.touches[0];
      physicsEngineRef.current.updateDrag(moveTouch.clientX, moveTouch.clientY);
    };

    const onTouchEnd = () => {
      physicsEngineRef.current.endDrag();
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };

    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);
  };

  // Live search spawner
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    if (!physicsActive) {
      activatePhysics();
    }

    const randomIdx = Math.floor(Math.random() * MOCK_RESULTS.length);
    const mock = MOCK_RESULTS[randomIdx];

    const cardId = `card-${Date.now()}`;
    const newCard = {
      id: cardId,
      title: `${searchQuery}: ${mock.title}`,
      snippet: mock.snippet
    };

    logTest(`Spawning search result for: "${searchQuery}"`);
    setSearchCards(prev => [...prev, newCard]);
    setSearchQuery('');
  };

  // Register spawned search cards in the physics simulation after rendering
  useEffect(() => {
    if (!physicsActive || !physicsEngineRef.current) return;

    searchCards.forEach(card => {
      if (!elementsRegisteredRef.current.has(card.id)) {
        const el = document.getElementById(card.id);
        if (el) {
          // Set initial random coordinate at top screen
          const spawnX = Math.random() * (window.innerWidth - 340) + 170;
          const spawnY = -100;
          
          el.style.position = 'fixed';
          el.style.left = '0';
          el.style.top = '0';
          el.style.margin = '0';
          el.style.transform = `translate3d(${spawnX}px, ${spawnY}px, 0)`;

          // Register in engine
          const body = physicsEngineRef.current.addBody(el, card.id);
          // Give it a small downward push
          body.vy = 2 + Math.random() * 3;
          body.vx = (Math.random() - 0.5) * 4;

          elementsRegisteredRef.current.add(card.id);
        }
      }
    });
  }, [searchCards, physicsActive]);

  // Automated Testing suite tasks
  const triggerChaosThrow = () => {
    if (!physicsEngineRef.current) return;
    logTest("Triggering automatic chaos impulse!");
    physicsEngineRef.current.bodies.forEach(b => {
      if (b.isStatic) return;
      b.vx = (Math.random() - 0.5) * 25;
      b.vy = (Math.random() - 0.5) * 25;
      b.angularVelocity = (Math.random() - 0.5) * 0.3;
    });
  };

  const triggerGravityReversal = () => {
    logTest("Reversing gravity vector!");
    const nextDir = gravityDirection === 'down' ? 'up' : 'down';
    handleGravityDirection(nextDir);
  };

  const triggerMultiSpawn = () => {
    if (!physicsActive) activatePhysics();
    logTest("Multi-spawning search result blocks...");
    const currentQuery = searchQuery || "Automatic Test";
    const templates = [0, 1, 2];
    
    const newSpawns = templates.map((t, idx) => {
      const mock = MOCK_RESULTS[(idx + Date.now()) % MOCK_RESULTS.length];
      return {
        id: `card-auto-${idx}-${Date.now()}`,
        title: `${currentQuery} #${idx + 1}: ${mock.title}`,
        snippet: mock.snippet
      };
    });

    setSearchCards(prev => [...prev, ...newSpawns]);
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      
      {/* ─── Control Dashboard ─── */}
      <div className="control-dashboard animate-scale-in">
        <div className="dashboard-title">
          <Sparkles size={18} />
          <span>Physics Dashboard</span>
        </div>

        {/* Gravity Control sliders */}
        <div className="slider-group">
          <div className="slider-label">
            <span>Gravity</span>
            <span>{gravityVal.toFixed(1)}g</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="2" 
            step="0.1" 
            value={gravityVal}
            onChange={e => setGravityVal(parseFloat(e.target.value))}
            className="slider-input"
          />
        </div>

        <div className="slider-group">
          <div className="slider-label">
            <span>Bounciness</span>
            <span>{Math.round(bouncinessVal * 100)}%</span>
          </div>
          <input 
            type="range" 
            min="0.1" 
            max="1.0" 
            step="0.05" 
            value={bouncinessVal}
            onChange={e => setBouncinessVal(parseFloat(e.target.value))}
            className="slider-input"
          />
        </div>

        <div className="slider-group">
          <div className="slider-label">
            <span>Air Resistance</span>
            <span>{Math.round((1 - frictionVal) * 100)}%</span>
          </div>
          <input 
            type="range" 
            min="0.95" 
            max="1.0" 
            step="0.005" 
            value={frictionVal}
            onChange={e => setFrictionVal(parseFloat(e.target.value))}
            className="slider-input"
          />
        </div>

        {/* Direction Pad */}
        <div className="slider-label" style={{ marginBottom: '6px' }}>
          <span>Gravity Direction</span>
        </div>
        <div className="direction-grid">
          <button className="dir-btn" style={{ visibility: 'hidden' }} />
          <button 
            className={`dir-btn ${gravityDirection === 'up' ? 'active' : ''}`}
            onClick={() => handleGravityDirection('up')}
            title="Gravity Up"
          >
            <ArrowUp size={16} />
          </button>
          <button className="dir-btn" style={{ visibility: 'hidden' }} />

          <button 
            className={`dir-btn ${gravityDirection === 'left' ? 'active' : ''}`}
            onClick={() => handleGravityDirection('left')}
            title="Gravity Left"
          >
            <ArrowLeft size={16} />
          </button>
          <button 
            className={`dir-btn ${gravityDirection === 'zero' ? 'active' : ''}`}
            onClick={() => handleGravityDirection('zero')}
            style={{ fontSize: '0.62rem', fontWeight: 800 }}
            title="Zero-G drift"
          >
            0-G
          </button>
          <button 
            className={`dir-btn ${gravityDirection === 'right' ? 'active' : ''}`}
            onClick={() => handleGravityDirection('right')}
            title="Gravity Right"
          >
            <ArrowRight size={16} />
          </button>

          <button className="dir-btn" style={{ visibility: 'hidden' }} />
          <button 
            className={`dir-btn ${gravityDirection === 'down' ? 'active' : ''}`}
            onClick={() => handleGravityDirection('down')}
            title="Gravity Down"
          >
            <ArrowDown size={16} />
          </button>
          <button className="dir-btn" style={{ visibility: 'hidden' }} />
        </div>

        {/* System controls */}
        <div className="action-row">
          <button 
            onClick={physicsActive ? handleReset : activatePhysics} 
            className="dashboard-btn active"
          >
            {physicsActive ? (
              <>
                <RotateCcw size={13} /> Reset View
              </>
            ) : (
              <>
                <Play size={13} /> Loose Gravity
              </>
            )}
          </button>
          <button onClick={toggleTheme} className="dashboard-btn">
            {theme === 'dark' ? (
              <>
                <Sun size={13} /> Light Theme
              </>
            ) : (
              <>
                <Moon size={13} /> Dark Theme
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─── Auto Testing Panel ─── */}
      <div className="tester-panel animate-scale-in">
        <div className="dashboard-title" style={{ color: 'var(--secondary)' }}>
          <Settings size={18} />
          <span>Automation Tester</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={triggerChaosThrow} className="dashboard-btn" style={{ width: '100%' }}>
            🌪️ Throw Elements violently
          </button>
          <button onClick={triggerGravityReversal} className="dashboard-btn" style={{ width: '100%' }}>
            🔄 Flip Gravity Direction
          </button>
          <button onClick={triggerMultiSpawn} className="dashboard-btn" style={{ width: '100%' }}>
            📦 Spawn Multi-Result Cards
          </button>
        </div>

        <div style={{
          marginTop: '12px',
          background: 'rgba(0,0,0,0.25)',
          borderRadius: '6px',
          padding: '8px',
          height: '110px',
          overflowY: 'auto',
          fontSize: '0.65rem',
          fontFamily: 'monospace',
          border: '1px solid var(--border-glass)'
        }}>
          {testLog.length === 0 ? (
            <span style={{ color: 'var(--text-muted)' }}>Automation logs pending...</span>
          ) : (
            testLog.map((log, i) => <div key={i} style={{ color: 'var(--text-muted)', marginBottom: '3px' }}>{log}</div>)
          )}
        </div>
      </div>

      {/* ─── Google replica view layout ─── */}
      <div className={`home-layout ${physicsActive ? 'physics-playground' : ''}`}>
        
        {/* Top Navbar */}
        <header 
          id="nav-header" 
          className={`top-nav ${physicsActive ? 'physics-body physics-body-target' : ''}`}
          onMouseDown={e => handleMouseDown(e, 'nav-header')}
          onTouchStart={e => handleTouchStart(e, 'nav-header')}
        >
          <a href="#" className="nav-link">Gmail</a>
          <a href="#" className="nav-link">Images</a>
          <a href="#" className="nav-link" style={{ marginRight: '4px' }}>Apps</a>
          <button 
            className="google-btn" 
            style={{ 
              padding: '6px 14px', 
              fontSize: '0.8rem', 
              background: 'var(--primary)', 
              color: '#fff',
              border: 'none'
            }}
          >
            Sign In
          </button>
        </header>

        {/* Central Search block */}
        <div className="center-content">
          {/* Logo */}
          <h1 
            id="google-logo" 
            className={`google-logo ${physicsActive ? 'physics-body physics-body-target' : ''}`}
            onMouseDown={e => handleMouseDown(e, 'google-logo')}
            onTouchStart={e => handleTouchStart(e, 'google-logo')}
          >
            <span>G</span><span>o</span><span>o</span><span>g</span><span>l</span><span>e</span>
          </h1>

          {/* Search bar */}
          <form 
            onSubmit={handleSearchSubmit}
            id="search-bar" 
            className={`search-bar-container ${physicsActive ? 'physics-body physics-body-target' : ''}`}
            onMouseDown={e => handleMouseDown(e, 'search-bar')}
            onTouchStart={e => handleTouchStart(e, 'search-bar')}
          >
            <div className="search-icon">
              <Search size={18} />
            </div>
            <input 
              type="text" 
              className="search-input"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search or type a URL..."
            />
            <div className="search-tools">
              <Mic size={18} style={{ cursor: 'pointer' }} />
              <Camera size={18} style={{ cursor: 'pointer' }} />
            </div>
          </form>

          {/* Buttons Row */}
          <div 
            id="buttons-row" 
            className={`buttons-row ${physicsActive ? 'physics-body physics-body-target' : ''}`}
            onMouseDown={e => handleMouseDown(e, 'buttons-row')}
            onTouchStart={e => handleTouchStart(e, 'buttons-row')}
          >
            <button type="button" onClick={handleSearchSubmit} className="google-btn">Google Search</button>
            <button type="button" onClick={activatePhysics} className="google-btn">I'm Feeling Lucky</button>
          </div>
        </div>

        {/* Footer */}
        <footer 
          id="footer-bar" 
          className={`footer-bar ${physicsActive ? 'physics-body physics-body-target' : ''}`}
          onMouseDown={e => handleMouseDown(e, 'footer-bar')}
          onTouchStart={e => handleTouchStart(e, 'footer-bar')}
        >
          <div className="footer-section">
            <a href="#" className="nav-link">About</a>
            <a href="#" className="nav-link">Advertising</a>
            <a href="#" className="nav-link">Business</a>
          </div>
          <div className="footer-section">
            <a href="#" className="nav-link">Privacy</a>
            <a href="#" className="nav-link">Terms</a>
            <a href="#" className="nav-link">Settings</a>
          </div>
        </footer>

      </div>

      {/* ─── Render Spawning Search Result Cards ─── */}
      {searchCards.map(card => (
        <div
          key={card.id}
          id={card.id}
          className="search-card physics-body"
          onMouseDown={e => handleMouseDown(e, card.id)}
          onTouchStart={e => handleTouchStart(e, card.id)}
        >
          <a href="#" className="card-title" onClick={e => e.preventDefault()}>{card.title}</a>
          <span className="card-snippet">{card.snippet}</span>
        </div>
      ))}

    </div>
  );
}
