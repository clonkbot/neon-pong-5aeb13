import React, { useEffect, useRef, useState, useCallback } from 'react';

interface GameState {
  ballX: number;
  ballY: number;
  ballVX: number;
  ballVY: number;
  playerY: number;
  botY: number;
  playerScore: number;
  botScore: number;
  gameStarted: boolean;
  isPaused: boolean;
}

const PADDLE_HEIGHT = 100;
const PADDLE_WIDTH = 12;
const BALL_SIZE = 16;
const PADDLE_SPEED = 8;
const INITIAL_BALL_SPEED = 6;
const BOT_SPEED = 5;
const WINNING_SCORE = 7;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameStateRef = useRef<GameState>({
    ballX: 0,
    ballY: 0,
    ballVX: INITIAL_BALL_SPEED,
    ballVY: INITIAL_BALL_SPEED * 0.5,
    playerY: 0,
    botY: 0,
    playerScore: 0,
    botScore: 0,
    gameStarted: false,
    isPaused: false,
  });
  const keysRef = useRef<Set<string>>(new Set());
  const animationRef = useRef<number>(0);
  const trailRef = useRef<Array<{x: number, y: number, age: number}>>([]);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [displayState, setDisplayState] = useState({
    playerScore: 0,
    botScore: 0,
    gameStarted: false,
    winner: null as string | null,
  });
  const touchStartRef = useRef<number | null>(null);
  const playerYOnTouchStart = useRef<number>(0);

  const resetBall = useCallback((width: number, height: number, direction: number = 1) => {
    const state = gameStateRef.current;
    state.ballX = width / 2;
    state.ballY = height / 2;
    const angle = (Math.random() - 0.5) * Math.PI / 3;
    state.ballVX = INITIAL_BALL_SPEED * direction * Math.cos(angle);
    state.ballVY = INITIAL_BALL_SPEED * Math.sin(angle);
    trailRef.current = [];
  }, []);

  const initGame = useCallback((width: number, height: number) => {
    const state = gameStateRef.current;
    state.playerY = height / 2 - PADDLE_HEIGHT / 2;
    state.botY = height / 2 - PADDLE_HEIGHT / 2;
    state.playerScore = 0;
    state.botScore = 0;
    state.gameStarted = false;
    state.isPaused = false;
    resetBall(width, height, Math.random() > 0.5 ? 1 : -1);
    setDisplayState({
      playerScore: 0,
      botScore: 0,
      gameStarted: false,
      winner: null,
    });
  }, [resetBall]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const maxWidth = Math.min(rect.width - 32, 900);
        const maxHeight = Math.min(window.innerHeight - 280, 600);
        const aspectRatio = 16 / 10;

        let width = maxWidth;
        let height = width / aspectRatio;

        if (height > maxHeight) {
          height = maxHeight;
          width = height * aspectRatio;
        }

        setDimensions({ width: Math.floor(width), height: Math.floor(height) });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    initGame(dimensions.width, dimensions.height);
  }, [dimensions, initGame]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());

      if ((e.key === ' ' || e.key === 'Enter') && !gameStateRef.current.gameStarted) {
        gameStateRef.current.gameStarted = true;
        setDisplayState(prev => ({ ...prev, gameStarted: true }));
      }

      if (e.key === 'p' || e.key === 'P') {
        gameStateRef.current.isPaused = !gameStateRef.current.isPaused;
      }

      if (e.key === 'r' || e.key === 'R') {
        initGame(dimensions.width, dimensions.height);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [dimensions, initGame]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!gameStateRef.current.gameStarted) {
      gameStateRef.current.gameStarted = true;
      setDisplayState(prev => ({ ...prev, gameStarted: true }));
      return;
    }
    const touch = e.touches[0];
    touchStartRef.current = touch.clientY;
    playerYOnTouchStart.current = gameStateRef.current.playerY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const touch = e.touches[0];
    const deltaY = touch.clientY - touchStartRef.current;
    const newY = playerYOnTouchStart.current + deltaY;
    gameStateRef.current.playerY = Math.max(0, Math.min(dimensions.height - PADDLE_HEIGHT, newY));
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      const state = gameStateRef.current;
      const { width, height } = dimensions;

      // Handle player input
      if (keysRef.current.has('w') || keysRef.current.has('arrowup')) {
        state.playerY = Math.max(0, state.playerY - PADDLE_SPEED);
      }
      if (keysRef.current.has('s') || keysRef.current.has('arrowdown')) {
        state.playerY = Math.min(height - PADDLE_HEIGHT, state.playerY + PADDLE_SPEED);
      }

      if (state.gameStarted && !state.isPaused && displayState.winner === null) {
        // Bot AI - follows ball with slight delay and imperfection
        const botCenter = state.botY + PADDLE_HEIGHT / 2;
        const targetY = state.ballY + (Math.random() - 0.5) * 30;
        const diff = targetY - botCenter;
        const botMoveSpeed = BOT_SPEED * (0.7 + Math.random() * 0.3);

        if (Math.abs(diff) > 10) {
          state.botY += Math.sign(diff) * Math.min(Math.abs(diff), botMoveSpeed);
          state.botY = Math.max(0, Math.min(height - PADDLE_HEIGHT, state.botY));
        }

        // Update ball trail
        trailRef.current.push({ x: state.ballX, y: state.ballY, age: 0 });
        trailRef.current = trailRef.current
          .map(p => ({ ...p, age: p.age + 1 }))
          .filter(p => p.age < 20);

        // Move ball
        state.ballX += state.ballVX;
        state.ballY += state.ballVY;

        // Ball collision with top/bottom
        if (state.ballY <= BALL_SIZE / 2 || state.ballY >= height - BALL_SIZE / 2) {
          state.ballVY *= -1;
          state.ballY = state.ballY <= BALL_SIZE / 2 ? BALL_SIZE / 2 : height - BALL_SIZE / 2;
        }

        // Ball collision with paddles
        const paddleMargin = 30;

        // Player paddle (left)
        if (
          state.ballX - BALL_SIZE / 2 <= paddleMargin + PADDLE_WIDTH &&
          state.ballX + BALL_SIZE / 2 >= paddleMargin &&
          state.ballY >= state.playerY &&
          state.ballY <= state.playerY + PADDLE_HEIGHT &&
          state.ballVX < 0
        ) {
          const hitPos = (state.ballY - state.playerY) / PADDLE_HEIGHT - 0.5;
          state.ballVX = Math.abs(state.ballVX) * 1.05;
          state.ballVY = hitPos * INITIAL_BALL_SPEED * 1.5;
          state.ballX = paddleMargin + PADDLE_WIDTH + BALL_SIZE / 2;
        }

        // Bot paddle (right)
        if (
          state.ballX + BALL_SIZE / 2 >= width - paddleMargin - PADDLE_WIDTH &&
          state.ballX - BALL_SIZE / 2 <= width - paddleMargin &&
          state.ballY >= state.botY &&
          state.ballY <= state.botY + PADDLE_HEIGHT &&
          state.ballVX > 0
        ) {
          const hitPos = (state.ballY - state.botY) / PADDLE_HEIGHT - 0.5;
          state.ballVX = -Math.abs(state.ballVX) * 1.05;
          state.ballVY = hitPos * INITIAL_BALL_SPEED * 1.5;
          state.ballX = width - paddleMargin - PADDLE_WIDTH - BALL_SIZE / 2;
        }

        // Clamp ball speed
        const maxSpeed = 15;
        state.ballVX = Math.max(-maxSpeed, Math.min(maxSpeed, state.ballVX));
        state.ballVY = Math.max(-maxSpeed, Math.min(maxSpeed, state.ballVY));

        // Score
        if (state.ballX < 0) {
          state.botScore++;
          setDisplayState(prev => ({
            ...prev,
            botScore: state.botScore,
            winner: state.botScore >= WINNING_SCORE ? 'BOT' : null
          }));
          if (state.botScore < WINNING_SCORE) {
            resetBall(width, height, 1);
          }
        } else if (state.ballX > width) {
          state.playerScore++;
          setDisplayState(prev => ({
            ...prev,
            playerScore: state.playerScore,
            winner: state.playerScore >= WINNING_SCORE ? 'YOU' : null
          }));
          if (state.playerScore < WINNING_SCORE) {
            resetBall(width, height, -1);
          }
        }
      }

      // Render
      ctx.fillStyle = '#0a0a12';
      ctx.fillRect(0, 0, width, height);

      // Scanline effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      for (let i = 0; i < height; i += 4) {
        ctx.fillRect(0, i, width, 2);
      }

      // Center line
      ctx.setLineDash([15, 15]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Ball trail with rainbow gradient
      trailRef.current.forEach((point, i) => {
        const alpha = (1 - point.age / 20) * 0.6;
        const hue = (Date.now() / 10 + i * 10) % 360;
        ctx.beginPath();
        ctx.arc(point.x, point.y, BALL_SIZE / 2 * (1 - point.age / 25), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${alpha})`;
        ctx.fill();
      });

      // Ball with glow
      const ballGlowRadius = BALL_SIZE * 2;
      const ballGradient = ctx.createRadialGradient(
        state.ballX, state.ballY, 0,
        state.ballX, state.ballY, ballGlowRadius
      );
      ballGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      ballGradient.addColorStop(0.3, 'rgba(255, 220, 100, 0.5)');
      ballGradient.addColorStop(1, 'rgba(255, 100, 50, 0)');
      ctx.fillStyle = ballGradient;
      ctx.fillRect(state.ballX - ballGlowRadius, state.ballY - ballGlowRadius, ballGlowRadius * 2, ballGlowRadius * 2);

      ctx.beginPath();
      ctx.arc(state.ballX, state.ballY, BALL_SIZE / 2, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Player paddle with cyan glow
      const playerGradient = ctx.createLinearGradient(30, state.playerY, 30 + PADDLE_WIDTH, state.playerY + PADDLE_HEIGHT);
      playerGradient.addColorStop(0, '#00f0ff');
      playerGradient.addColorStop(1, '#0080ff');

      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 25;
      ctx.fillStyle = playerGradient;
      ctx.fillRect(30, state.playerY, PADDLE_WIDTH, PADDLE_HEIGHT);

      // Extra glow layer
      ctx.shadowBlur = 50;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(30, state.playerY, PADDLE_WIDTH, PADDLE_HEIGHT);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // Bot paddle with magenta glow
      const botGradient = ctx.createLinearGradient(width - 30 - PADDLE_WIDTH, state.botY, width - 30, state.botY + PADDLE_HEIGHT);
      botGradient.addColorStop(0, '#ff00aa');
      botGradient.addColorStop(1, '#ff0066');

      ctx.shadowColor = '#ff00aa';
      ctx.shadowBlur = 25;
      ctx.fillStyle = botGradient;
      ctx.fillRect(width - 30 - PADDLE_WIDTH, state.botY, PADDLE_WIDTH, PADDLE_HEIGHT);

      ctx.shadowBlur = 50;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(width - 30 - PADDLE_WIDTH, state.botY, PADDLE_WIDTH, PADDLE_HEIGHT);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // Vignette effect
      const vignetteGradient = ctx.createRadialGradient(
        width / 2, height / 2, height * 0.3,
        width / 2, height / 2, height
      );
      vignetteGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vignetteGradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
      ctx.fillStyle = vignetteGradient;
      ctx.fillRect(0, 0, width, height);

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoop();
    return () => cancelAnimationFrame(animationRef.current);
  }, [dimensions, displayState.winner, resetBall]);

  return (
    <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-between px-4 py-6 md:py-8 overflow-hidden">
      {/* Background glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-[150px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 text-center mb-4 md:mb-6">
        <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-pink-400 drop-shadow-[0_0_30px_rgba(0,240,255,0.5)]">
            NEON PONG
          </span>
        </h1>
        <p className="text-gray-500 text-xs md:text-sm mt-2 font-mono tracking-widest uppercase">
          First to {WINNING_SCORE} wins
        </p>
      </header>

      {/* Score Display */}
      <div className="relative z-10 flex items-center justify-center gap-8 md:gap-16 mb-4">
        <div className="text-center">
          <p className="text-cyan-400 text-xs md:text-sm font-mono tracking-wider mb-1">YOU</p>
          <p className="text-5xl md:text-7xl font-display font-black text-cyan-400 drop-shadow-[0_0_20px_rgba(0,240,255,0.8)]">
            {displayState.playerScore}
          </p>
        </div>
        <div className="text-gray-600 text-2xl md:text-4xl font-thin">—</div>
        <div className="text-center">
          <p className="text-pink-400 text-xs md:text-sm font-mono tracking-wider mb-1">BOT</p>
          <p className="text-5xl md:text-7xl font-display font-black text-pink-400 drop-shadow-[0_0_20px_rgba(255,0,170,0.8)]">
            {displayState.botScore}
          </p>
        </div>
      </div>

      {/* Game Canvas */}
      <div
        ref={containerRef}
        className="relative z-10 w-full flex justify-center flex-1 max-h-[60vh] md:max-h-none"
      >
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={dimensions.width}
            height={dimensions.height}
            className="rounded-lg border border-gray-800/50 shadow-2xl shadow-black/50"
            style={{
              maxWidth: '100%',
              height: 'auto',
              imageRendering: 'crisp-edges'
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />

          {/* Overlay for game states */}
          {!displayState.gameStarted && !displayState.winner && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-lg backdrop-blur-sm">
              <p className="text-xl md:text-3xl font-display font-bold text-white mb-4 text-center px-4">
                Ready to Play?
              </p>
              <p className="text-gray-400 text-sm md:text-base font-mono mb-6 text-center px-4">
                <span className="hidden md:inline">Press SPACE or ENTER to start</span>
                <span className="md:hidden">Tap to start</span>
              </p>
              <div className="text-gray-500 text-xs font-mono space-y-1 text-center">
                <p className="hidden md:block">W / S or ↑ / ↓ to move paddle</p>
                <p className="md:hidden">Drag to move paddle</p>
                <p className="hidden md:block">P to pause · R to restart</p>
              </div>
            </div>
          )}

          {displayState.winner && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-lg backdrop-blur-sm">
              <p className={`text-4xl md:text-6xl font-display font-black mb-4 ${
                displayState.winner === 'YOU'
                  ? 'text-cyan-400 drop-shadow-[0_0_30px_rgba(0,240,255,0.8)]'
                  : 'text-pink-400 drop-shadow-[0_0_30px_rgba(255,0,170,0.8)]'
              }`}>
                {displayState.winner === 'YOU' ? 'YOU WIN!' : 'BOT WINS'}
              </p>
              <p className="text-gray-400 text-sm md:text-base font-mono">
                <span className="hidden md:inline">Press R to play again</span>
                <span className="md:hidden">Refresh to play again</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Controls hint for desktop */}
      <div className="relative z-10 hidden md:flex items-center gap-6 mt-4 text-gray-600 text-xs font-mono">
        <span className="flex items-center gap-2">
          <kbd className="px-2 py-1 bg-gray-800/50 rounded border border-gray-700 text-gray-400">W</kbd>
          <kbd className="px-2 py-1 bg-gray-800/50 rounded border border-gray-700 text-gray-400">S</kbd>
          Move
        </span>
        <span className="flex items-center gap-2">
          <kbd className="px-2 py-1 bg-gray-800/50 rounded border border-gray-700 text-gray-400">P</kbd>
          Pause
        </span>
        <span className="flex items-center gap-2">
          <kbd className="px-2 py-1 bg-gray-800/50 rounded border border-gray-700 text-gray-400">R</kbd>
          Restart
        </span>
      </div>

      {/* Footer */}
      <footer className="relative z-10 mt-6 text-center">
        <p className="text-gray-600 text-xs font-mono">
          Requested by <span className="text-gray-500">@trustnoneisakey</span> · Built by <span className="text-gray-500">@clonkbot</span>
        </p>
      </footer>
    </div>
  );
}
