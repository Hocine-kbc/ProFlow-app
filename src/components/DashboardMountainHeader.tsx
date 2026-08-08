import { useEffect, useRef, useState } from 'react';

// Taille de référence du "canevas" original : les positions/tailles ci-dessous
// (bottom:20%, left:100px, etc.) restent strictement celles des fichiers fournis.
// On étire ensuite ce canevas de référence (non-uniformément) pour qu'il remplisse
// exactement le header, quelle que soit sa forme (large et bas).
const REF_WIDTH = 1400;
const REF_HEIGHT = 800;

export type DashboardScenePeriod = 'morning' | 'afternoon' | 'evening' | 'night';

interface SceneConfig {
  gradient: string;
  filter: string;
  showStars: boolean;
  groundGradient: string;
  treeFilter: string;
  hillFilter: string;
}

const DEFAULT_GROUND_GRADIENT = 'linear-gradient(210deg, #879759, #648459)';

const PERIOD_CONFIG: Record<DashboardScenePeriod, SceneConfig> = {
  morning: {
    gradient: 'linear-gradient(40deg, #1a2a45, #e0a06a)',
    filter: 'brightness(0.88) saturate(0.9) hue-rotate(-6deg)',
    showStars: false,
    groundGradient: DEFAULT_GROUND_GRADIENT,
    treeFilter: 'none',
    hillFilter: 'none',
  },
  afternoon: {
    gradient: 'linear-gradient(40deg, #1c5a92, #8fd0e8)',
    filter: 'brightness(1.08) saturate(1.05) hue-rotate(0deg)',
    showStars: false,
    groundGradient: DEFAULT_GROUND_GRADIENT,
    treeFilter: 'none',
    hillFilter: 'none',
  },
  evening: {
    gradient: 'linear-gradient(40deg, #3a1f42, #e0673a)',
    filter: 'brightness(0.95) saturate(1.15) hue-rotate(8deg)',
    showStars: false,
    groundGradient: 'linear-gradient(210deg, #5f6d3f, #3d5238)',
    treeFilter: 'brightness(0.65) saturate(1.1)',
    hillFilter: 'brightness(0.65) saturate(1.1)',
  },
  night: {
    gradient: 'linear-gradient(40deg, #0a1a27, #1c3350)',
    filter: 'brightness(0.55) saturate(0.8) hue-rotate(-4deg)',
    showStars: true,
    groundGradient: DEFAULT_GROUND_GRADIENT,
    treeFilter: 'none',
    hillFilter: 'none',
  },
};

interface DashboardMountainHeaderProps {
  period: DashboardScenePeriod;
}

const cloudPolygons = (
  <g>
    <polygon points="0,30 8,19 27,18 22,36 9,37" fill="#d5d6e2" />
    <polygon points="0,30 9,37 3,50" fill="#c7c2d1" />
    <polygon points="3,50 9,37 22,36 33,44 14,55" fill="#a8a9b7" />
    <polygon points="14,55 33,44 36,52 23,58" fill="#7a7789" />
    <polygon points="27,18 22,36 33,44" fill="#acabb9" />
    <polygon points="31,11 51,4 66,1 83,13 83,23 78,23" fill="#fff6e7" />
    <polygon points="27,18 31,11 54,6 56,32 33,40 29,36" fill="#d0d0dc" />
    <polygon points="29,36 58,65 42,67 31,57" fill="#9694a3" />
    <polygon points="33,40 56,32 75,37 58,65" fill="#a2a1b1" />
    <polygon points="58,65 75,37 82,57" fill="#9897a7" />
    <polygon points="56,32 54,6 80,14 82,57 75,37" fill="#d7d6e2" />
    <polygon points="80,15 84,17 88,30 85,50 81,51" fill="#9d9da9" />
    <polygon points="90,16 82,20 81,31 95,35" fill="#cdcdda" />
    <polygon points="81,31 82,47 95,35" fill="#a2a2b0" />
    <polygon points="82,47 95,35 105,45 91,53" fill="#878892" />
    <polygon points="105,45 95,35 106,22" fill="#fbe5d5" />
    <polygon points="106,22 95,35 90,16" fill="#dbd6dd" />
  </g>
);

export default function DashboardMountainHeader({ period }: DashboardMountainHeaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  // scale unique (proportions préservées) ; offsetX centre la scène ; groundHeight sert
  // à prolonger l'horizon (couleur du sol) sur toute la largeur du header.
  const [layout, setLayout] = useState({ scale: 1, offsetX: 0, groundHeight: 0 });
  const config = PERIOD_CONFIG[period];

  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;

    const updateLayout = () => {
      const { clientWidth, clientHeight } = outer;
      if (!clientWidth || !clientHeight) return;
      const scale = clientHeight / REF_HEIGHT;
      const scaledWidth = REF_WIDTH * scale;
      // Sur mobile, ancrer la montagne à l'extrême gauche plutôt que de la centrer.
      const isMobile = clientWidth < 640;
      setLayout({
        scale,
        offsetX: isMobile ? 0 : (clientWidth - scaledWidth) / 2,
        groundHeight: REF_HEIGHT * 0.2 * scale,
      });
    };

    updateLayout();
    const observer = new ResizeObserver(updateLayout);
    observer.observe(outer);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!config.showStars) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      for (let star = 0; star < 240; star++) {
        const min = (Math.random() * 30) / 10;
        const centerX = Math.random() * width;
        const centerY = Math.random() * height * 0.6;
        ctx.beginPath();
        ctx.arc(centerX, centerY, min, 0, 2 * Math.PI);
        const opacity = Math.random();
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.fill();
      }
    };

    draw();

    let resizeTimeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(draw, 150);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, [config.showStars]);

  return (
    <div ref={outerRef} className="stage absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Ciel dégradé */}
      <div className="absolute inset-0" style={{ background: config.gradient }} />

      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, zIndex: 1, width: '100%', height: '100%', opacity: config.showStars ? 1 : 0 }}
      />

      {/* Horizon élargi : seule et unique source de couleur du sol, sur toute la largeur du header */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: layout.groundHeight,
          background: config.groundGradient,
          filter: config.filter,
          zIndex: 1,
        }}
      />

      {/* Canevas de référence (dimensions et proportions d'origine), mis à l'échelle sans déformation */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: layout.offsetX,
          width: REF_WIDTH,
          height: REF_HEIGHT,
          transform: `scale(${layout.scale})`,
          transformOrigin: 'top left',
          zIndex: 2,
        }}
      >
      <div className="scene-group" style={{ position: 'absolute', inset: 0, zIndex: 2, filter: config.filter }}>
        <svg
          height="390"
          width="550"
          style={{ position: 'absolute', bottom: '20%', marginBottom: '-16px', left: '100px', zIndex: 2 }}
        >
          <polygon points="300,390 190,90 320,130 400,340" fill="#5d2042" />
          <polygon points="0,340 108,190 194,100 201,120 301,390" fill="#320e40" />
          <polygon points="14,348 117,174 194,102 172,377" fill="#3b1642" fillOpacity="0.8" />
          <polygon points="120,174 194,102 233,206 144,275" fill="#3d1744" fillOpacity="0.9" />
          <polygon points="233,206 288,177 324,214" fill="#421943" />
          <polygon points="233,206 324,214 247,245" fill="#3e1743" />
          <polygon points="247,245 324,214 360,360" fill="#411842" />
          <polygon points="324,214 288,177 350,210" fill="#632242" />
          <polygon points="324,214 350,210 360,360" fill="#652343" />
          <g>
            <polygon points="108,190 170,40 194,100" fill="#aeacb9" />
            <polygon points="170,40 234,6 260,70 288,178 194,102" fill="#ceced8" />
            <polygon points="234,6 290,80 320,132 288,178" fill="#ffffed" />
          </g>
        </svg>

        <svg
          width="700"
          height="170"
          style={{ position: 'absolute', left: '100px', marginLeft: '-120px', marginBottom: '-86px', bottom: '20%', zIndex: 3, filter: config.hillFilter }}
        >
          <polygon points="480,70 530,100 560,90 516,40" fill="#9b9d57" />
          <polygon points="480,70 530,100 412,84" fill="#7d8f57" />
          <polygon points="530,100 412,84 360,138" fill="#748857" />
          <polygon points="360,138 240,140 320,82" fill="#748857" />
          <polygon points="412,84 360,140 320,82" fill="#88945a" />
          <polygon points="320,82 240,140 210,64" fill="#597252" />
          <polygon points="300,78 100,100 0,104 170,58" fill="#4f654f" />
          <polygon points="172,58 145,40 122,48 66,79 0,104" fill="#536a50" />
        </svg>

        <svg
          height="347"
          width="168"
          style={{ position: 'absolute', top: '20%', right: '4%', zIndex: 2 }}
          className="animate-cloud-sway-big"
        >
          {cloudPolygons}
        </svg>

        <svg
          height="347"
          width="168"
          style={{ position: 'absolute', top: '22%', right: '16%', zIndex: 1 }}
          className="animate-cloud-sway-small"
        >
          <g transform="scale(0.5)">
            <polygon points="0,30 8,19 27,18 22,36 9,37" fill="#d5d6e2" />
            <polygon points="0,30 9,37 3,50" fill="#c7c2d1" />
            <polygon points="3,50 9,37 22,36 33,44 14,55" fill="#a8a9b7" />
            <polygon points="14,55 33,44 36,52 23,58" fill="#7a7789" />
            <polygon points="27,18 22,36 33,44" fill="#acabb9" />
            <polygon points="31,11 51,4 66,1 83,13 83,23 78,23" fill="#fff6e7" />
            <polygon points="27,18 31,11 54,6 56,32 33,40 29,36" fill="#d0d0dc" />
            <polygon points="29,36 58,65 42,67 31,57" fill="#9694a3" />
            <polygon points="33,40 56,32 75,37 58,65" fill="#a2a1b1" />
            <polygon points="58,65 75,37 82,57" fill="#9897a7" />
            <polygon points="56,32 54,6 80,14 82,57 75,37" fill="#d7d6e2" />
            <polygon points="80,15 84,17 88,30 85,50 81,51" fill="#9d9da9" />
            <polygon points="90,16 82,20 81,31 95,35" fill="#cdcdda" />
            <polygon points="81,31 82,47 95,35" fill="#a2a2b0" />
            <polygon points="82,47 95,35 105,45 91,53" fill="#878892" />
            <polygon points="105,45 95,35 106,22" fill="#fbe5d5" />
            <polygon points="106,22 95,35 90,16" fill="#dbd6dd" />
          </g>
        </svg>

        <svg
          className="trees"
          style={{ width: '100%', height: '130px', position: 'absolute', bottom: '20%', marginBottom: '-100px', zIndex: 4, filter: config.treeFilter }}
        >
          <g id={`dashboard-tree-${period}`} transform="translate(400,30)">
            <polygon points="25,75 27,44 21,34 25,33 30,41 38,33 40,34 31,46 29,75" fill="#3f2145" />
            <polygon points="29,75 31,46 32,45 32,74" fill="#812743" />
            <polygon points="2,21 11,33 20,32 27,29 32,23 24,35 11,34" fill="#282246" />
            <polygon points="27,29 33,13 18,0 29,2 37,13 32,23" fill="#6a7749" />
            <polygon points="33,23 35,32 45,37 55,27 44,35 37,31" fill="#210f3f" />
            <polygon points="37,31 38,17 46,17 50,31" fill="#354346" />
            <polygon points="37,31 50,31 45,37" fill="#292941" />
            <polygon points="33,23 37,31 38,17" fill="#2b2d42" />
            <polygon points="38,17 46,17 46,11" fill="#495e4b" />
            <polygon points="46,17 46,11 54,18" fill="#5b7049" />
            <polygon points="44,11 54,18 56,26 50,31" fill="#515d49" />
            <polygon points="11,33 20,32 27,29 15,19" fill="#292e42" />
            <polygon points="27,29 33,13 15,19" fill="#424f46" />
            <polygon points="33,13 18,0 15,19" fill="#48604a" />
            <polygon points="18,0 7,5 15,19" fill="#3a5449" />
            <polygon points="7,5 0,18 15,19" fill="#344847" />
            <polygon points="0,18 11,33 15,19" fill="#292c4b" />
            <polygon points="175,4 121,10 53,12 12,16 5,20 47,22 122,12 180,4" fill="#648155" transform="translate(-148,70)" />
          </g>
          <use x="-215" y="-23" xlinkHref={`#dashboard-tree-${period}`} transform="scale(0.8)" />
          <use x="-220" y="-20" xlinkHref={`#dashboard-tree-${period}`} />
          <use x="540" y="-30" xlinkHref={`#dashboard-tree-${period}`} />
          <use x="480" y="-20" xlinkHref={`#dashboard-tree-${period}`} />
          <use x="440" y="-15" xlinkHref={`#dashboard-tree-${period}`} transform="scale(1.2)" />
        </svg>
      </div>
      </div>
    </div>
  );
}
