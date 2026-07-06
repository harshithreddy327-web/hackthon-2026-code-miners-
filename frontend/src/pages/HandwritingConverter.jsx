import React, { useState, useRef, useEffect } from 'react';
import { Download, Sliders, Type, Palette, AlignLeft } from 'lucide-react';

// Preload all handwriting fonts using the FontFace API so they are available on canvas
const FONT_NAMES = ['Caveat', 'Indie Flower', 'Homemade Apple', 'Architects Daughter'];
let fontsLoaded = false;
const ensureFontsLoaded = async () => {
  if (fontsLoaded) return;
  try {
    await document.fonts.ready;
    fontsLoaded = true;
  } catch (e) {
    fontsLoaded = true; // proceed anyway
  }
};

export default function HandwritingConverter() {
  // Input states
  const [text, setText] = useState(
    "Dear Professor,\n\nPlease find attached my assignment for the Neural Networks laboratory session.\n\nI have successfully modeled the feed-forward classifier and plotted the gradient convergence logs. The error dropped below the 0.05 threshold after approximately 450 epochs.\n\nSincerely,\nYour Student"
  );
  const [fontFamily, setFontFamily] = useState('Caveat');
  const [inkColor, setInkColor] = useState('#1e3a8a');
  const [paperStyle, setPaperStyle] = useState('ruled');
  const [fontsReady, setFontsReady] = useState(false);

  // Sliders
  const [fontSize, setFontSize] = useState(26);
  const [wordSpacing, setWordSpacing] = useState(8);
  const [lineHeight, setLineHeight] = useState(42);
  const [slantVariance, setSlantVariance] = useState(15);
  const [wobbleVariance, setWobbleVariance] = useState(12);

  const canvasRef = useRef(null);

  // Ensure fonts are loaded before first draw
  useEffect(() => {
    ensureFontsLoaded().then(() => setFontsReady(true));
  }, []);

  // Redraw Canvas whenever any parameter changes (only after fonts are ready)
  useEffect(() => {
    if (fontsReady) drawHandwriting();
  }, [text, fontFamily, inkColor, paperStyle, fontSize, wordSpacing, lineHeight, slantVariance, wobbleVariance, fontsReady]);

  const drawHandwriting = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // 1. Clear & Background Paper style
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Paper base color (warm notebook cream)
    ctx.fillStyle = '#fbfaf5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Draw Paper Rule Lines if selected
    const marginL = 90;
    if (paperStyle === 'ruled') {
      // Horizontal rules (Notebook lines)
      ctx.strokeStyle = 'rgba(74, 144, 226, 0.25)'; // Light blue
      ctx.lineWidth = 1;
      for (let y = 100; y < canvas.height; y += lineHeight) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      
      // Vertical margin line (Red binder margin)
      ctx.strokeStyle = 'rgba(235, 94, 85, 0.5)'; // Coral Red
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(marginL, 0);
      ctx.lineTo(marginL, canvas.height);
      ctx.stroke();
    }

    // 3. Draw Text
    ctx.fillStyle = inkColor;
    ctx.textBaseline = 'bottom';

    const lines = text.split('\n');
    let startY = 100; // Vertical cursor starting point
    const maxW = canvas.width - 60; // Right margin bound

    // Simple pseudo-random helper that resets seed based on text to make rendering stable
    let seed = 42;
    const random = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    lines.forEach((line) => {
      const words = line.split(' ');
      let currentX = paperStyle === 'ruled' ? marginL + 15 : 45; // Start after margin

      words.forEach((word) => {
        // Measure word size
        ctx.font = `${fontSize}px "${fontFamily}", cursive`;
        const wordWidth = ctx.measureText(word).width;

        // Word Wrapping
        if (currentX + wordWidth > maxW) {
          currentX = paperStyle === 'ruled' ? marginL + 15 : 45;
          startY += lineHeight;
        }

        // Draw word letter by letter or word by word
        // Word-by-word with letter rotations looks more organic
        ctx.save();
        
        // Calculate random vertical wobble (baseline variance)
        const wobble = (random() - 0.5) * (wobbleVariance * 0.3);
        const yPos = startY + wobble;

        // Calculate random word slant rotation
        const slantAngle = (random() - 0.5) * (slantVariance * 0.0035);

        ctx.translate(currentX, yPos);
        ctx.rotate(slantAngle);
        
        // Render word
        ctx.fillText(word, 0, 0);
        ctx.restore();

        // Advance cursor X
        // Add random word spacing variance
        const spacingVariance = (random() * 0.4 + 0.8) * wordSpacing;
        currentX += wordWidth + spacingVariance;
      });

      // Advance line cursor
      startY += lineHeight;
    });
  };

  // Download JPEG Image Action
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const link = document.createElement('a');
    link.download = 'handwritten-page.jpeg';
    link.href = dataUrl;
    link.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Title block */}
      <div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Real-Time Handwriting Converter</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
          Instantly transform typed text into beautiful, natural-looking hand-written notes.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.1fr 1.3fr',
        gap: '2.5rem',
        alignItems: 'start'
      }}>
        
        {/* LEFT COLUMN: Input Text & Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Text Editor Card */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlignLeft size={18} style={{ color: 'var(--primary)' }} />
              Type or Paste Digital Notes
            </h3>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="form-textarea"
              style={{
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                minHeight: '260px',
                lineHeight: 1.5,
              }}
              placeholder="Paste notes here..."
            />
          </div>

          {/* Controls Card */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={18} style={{ color: 'var(--secondary)' }} />
              Handwriting & Ink Customizers
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Row 1: Font Style & Ink Color */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Type size={14} /> Handwriting Font
                  </label>
                  <select 
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="form-select"
                  >
                    <option value="Caveat">Caveat (Flowing/Neat)</option>
                    <option value="Indie Flower">Indie Flower (Print/Friendly)</option>
                    <option value="Homemade Apple">Homemade Apple (Elegant Cursive)</option>
                    <option value="Architects Daughter">Architects Daughter (Architect/Block)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Palette size={14} /> Ink Shader
                  </label>
                  <select 
                    value={inkColor}
                    onChange={(e) => setInkColor(e.target.value)}
                    className="form-select"
                  >
                    <option value="#1e3a8a">🔵 Royal Blue Gel</option>
                    <option value="#0f172a">⚫ Midnight Black Ink</option>
                    <option value="#b91c1c">🔴 Gel Pen Red</option>
                    <option value="#047857">🟢 Forest Green Gel</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Paper Style & Font Size */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Paper Surface</label>
                  <select 
                    value={paperStyle}
                    onChange={(e) => setPaperStyle(e.target.value)}
                    className="form-select"
                  >
                    <option value="ruled">📖 Ruled Notebook Page</option>
                    <option value="plain">📄 Plain Blank Sheet</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Font Dimension</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input 
                      type="range" 
                      min="18" 
                      max="36" 
                      value={fontSize} 
                      onChange={(e) => setFontSize(parseInt(e.target.value))}
                      style={{ flex: 1, accentColor: 'var(--primary)' }}
                    />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, width: '30px' }}>{fontSize}px</span>
                  </div>
                </div>
              </div>

              <hr style={{ borderColor: 'var(--border-glass)', opacity: 0.5 }} />

              {/* Advanced Sliders */}
              <div className="form-group">
                <label className="form-label">Line Spacing Height</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input 
                    type="range" 
                    min="30" 
                    max="60" 
                    value={lineHeight} 
                    onChange={(e) => setLineHeight(parseInt(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--secondary)' }}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, width: '30px' }}>{lineHeight}px</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Word-Spacing Randomness</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input 
                    type="range" 
                    min="2" 
                    max="18" 
                    value={wordSpacing} 
                    onChange={(e) => setWordSpacing(parseInt(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--secondary)' }}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, width: '30px' }}>{wordSpacing}px</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Letter Rotation Slant (Imperfect Angle)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input 
                    type="range" 
                    min="0" 
                    max="30" 
                    value={slantVariance} 
                    onChange={(e) => setSlantVariance(parseInt(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, width: '30px' }}>{slantVariance}</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Wobble Baseline Variance (Imperfect Alignment)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input 
                    type="range" 
                    min="0" 
                    max="30" 
                    value={wobbleVariance} 
                    onChange={(e) => setWobbleVariance(parseInt(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, width: '30px' }}>{wobbleVariance}</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Ruled Canvas Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: '7rem' }}>
          
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>PAGE CANVAS PREVIEW</span>
              <button 
                onClick={handleDownload} 
                className="btn-primary" 
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                <Download size={14} /> Download handwritten-page.jpeg
              </button>
            </div>

            <div style={{
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-neon)',
              border: '1px solid var(--border-glass)',
              display: 'flex',
              justifyContent: 'center',
              backgroundColor: '#0c0e18'
            }}>
              <canvas
                ref={canvasRef}
                width={800}
                height={1000}
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                  backgroundColor: '#fff'
                }}
              />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
