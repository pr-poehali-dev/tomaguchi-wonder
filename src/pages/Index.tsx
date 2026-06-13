import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Pet {
  name: string;
  level: number;
  xp: number;
  xpToNext: number;
  hunger: number;
  happiness: number;
  health: number;
  energy: number;
  coins: number;
  age: number;
  mood: "happy" | "neutral" | "sad" | "sleepy" | "excited";
  inventory: Record<string, number>;
  achievements: string[];
}

interface ShopItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
  effect: Partial<{ hunger: number; happiness: number; health: number; energy: number }>;
  category: "food" | "toy" | "boost";
  description: string;
}

interface MiniGame {
  id: string;
  title: string;
  emoji: string;
  description: string;
  reward: { xp: number; coins: number; happiness: number };
  difficulty: "easy" | "medium" | "hard";
}

// ─── Constants ───────────────────────────────────────────────────────────────
const PET_IMAGE = "https://cdn.poehali.dev/projects/0ac810e2-b37f-4089-a22d-85b9fd205607/files/08f24ebf-af39-4f3e-a7a8-bde9778be459.jpg";

const SHOP_ITEMS: ShopItem[] = [
  { id: "apple", name: "Яблоко", emoji: "🍎", price: 5, effect: { hunger: 20, health: 5 }, category: "food", description: "+20 сытость, +5 здоровье" },
  { id: "cake", name: "Тортик", emoji: "🎂", price: 15, effect: { hunger: 40, happiness: 15 }, category: "food", description: "+40 сытость, +15 настроение" },
  { id: "sushi", name: "Суши", emoji: "🍣", price: 25, effect: { hunger: 60, health: 20, energy: 10 }, category: "food", description: "+60 сытость, +20 здоровье" },
  { id: "pizza", name: "Пицца", emoji: "🍕", price: 20, effect: { hunger: 50, happiness: 10 }, category: "food", description: "+50 сытость, +10 настроение" },
  { id: "ice_cream", name: "Мороженое", emoji: "🍦", price: 12, effect: { hunger: 15, happiness: 30 }, category: "food", description: "+15 сытость, +30 настроение" },
  { id: "ball", name: "Мячик", emoji: "⚽", price: 20, effect: { happiness: 25, energy: -10 }, category: "toy", description: "+25 настроение, -10 энергия" },
  { id: "teddy", name: "Мишка", emoji: "🧸", price: 30, effect: { happiness: 20, energy: 10 }, category: "toy", description: "+20 настроение, +10 энергия" },
  { id: "star", name: "Звёздный буст", emoji: "⭐", price: 50, effect: { health: 30, happiness: 30 }, category: "boost", description: "+30 здоровье и настроение" },
];

const ALL_ACHIEVEMENTS = [
  { id: "first_feed", title: "Первый обед!", emoji: "🍽️", description: "Покорми питомца первый раз" },
  { id: "level_5", title: "Растёт!", emoji: "🌟", description: "Достигни 5 уровня" },
  { id: "happy_100", title: "Счастливчик", emoji: "😄", description: "Доведи счастье до 100%" },
  { id: "rich", title: "Богатей", emoji: "💰", description: "Накопи 100 монет" },
  { id: "gamer", title: "Геймер", emoji: "🎮", description: "Сыграй в 5 мини-игр" },
  { id: "healthy", title: "Здоровяк", emoji: "💪", description: "Держи здоровье на 100" },
  { id: "shopper", title: "Шопоголик", emoji: "🛍️", description: "Купи 10 предметов" },
  { id: "veteran", title: "Ветеран", emoji: "🏆", description: "Играй 7 дней подряд" },
];

const MINI_GAMES: MiniGame[] = [
  { id: "memory", title: "Запомни!", emoji: "🧠", description: "Найди пары карточек", reward: { xp: 20, coins: 10, happiness: 15 }, difficulty: "easy" },
  { id: "catch", title: "Поймай звезду", emoji: "⭐", description: "Лови падающие звёзды", reward: { xp: 35, coins: 15, happiness: 20 }, difficulty: "medium" },
  { id: "quiz", title: "Умник", emoji: "📚", description: "Ответь на вопросы", reward: { xp: 50, coins: 20, happiness: 25 }, difficulty: "hard" },
  { id: "dance", title: "Танцуй!", emoji: "💃", description: "Повтори ритм танца", reward: { xp: 30, coins: 12, happiness: 18 }, difficulty: "easy" },
  { id: "puzzle", title: "Пазл", emoji: "🧩", description: "Собери картинку", reward: { xp: 45, coins: 18, happiness: 22 }, difficulty: "medium" },
];

const MOOD_EMOJIS: Record<string, string> = {
  happy: "😄",
  neutral: "😊",
  sad: "😢",
  sleepy: "😴",
  excited: "🤩",
};

const MOOD_LABELS: Record<string, string> = {
  happy: "Весёлый",
  neutral: "Спокойный",
  sad: "Грустный",
  sleepy: "Сонный",
  excited: "Восторженный",
};

// ─── Default pet ─────────────────────────────────────────────────────────────
const defaultPet = (): Pet => ({
  name: "Бублик",
  level: 1,
  xp: 0,
  xpToNext: 100,
  hunger: 70,
  happiness: 80,
  health: 90,
  energy: 85,
  coins: 30,
  age: 0,
  mood: "happy",
  inventory: {},
  achievements: [],
});

function clamp(v: number) { return Math.max(0, Math.min(100, v)); }

function calcMood(pet: Pet): Pet["mood"] {
  const avg = (pet.hunger + pet.happiness + pet.health + pet.energy) / 4;
  if (pet.energy < 20) return "sleepy";
  if (avg >= 85) return "excited";
  if (avg >= 65) return "happy";
  if (avg >= 45) return "neutral";
  return "sad";
}

function addXp(pet: Pet, amount: number): Pet {
  let xp = pet.xp + amount;
  let level = pet.level;
  let xpToNext = pet.xpToNext;
  while (xp >= xpToNext) {
    xp -= xpToNext;
    level++;
    xpToNext = Math.floor(xpToNext * 1.4);
  }
  return { ...pet, xp, level, xpToNext };
}

// ─── StatBar ──────────────────────────────────────────────────────────────────
function StatBar({ label, value, color, emoji }: { label: string; value: number; color: string; emoji: string }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-bold text-tama-light flex items-center gap-1">
          <span>{emoji}</span> {label}
        </span>
        <span className="text-xs font-bold" style={{ color }}>{Math.round(value)}%</span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${value}%`, background: `linear-gradient(90deg, ${color}99, ${color})` }}
        />
      </div>
    </div>
  );
}

// ─── Catch game ───────────────────────────────────────────────────────────────
function CatchGame({ onFinish }: { onFinish: (score: number) => void }) {
  const [stars, setStars] = useState<{ id: number; x: number; y: number }[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { setRunning(false); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setStars(prev => [...prev.filter(s => s.y < 110), { id: Date.now(), x: Math.random() * 80 + 5, y: 0 }]);
    }, 1000);
    return () => clearInterval(interval);
  }, [running]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setStars(prev => prev.map(s => ({ ...s, y: s.y + 3 })));
    }, 100);
    return () => clearInterval(interval);
  }, [running]);

  const catchStar = (id: number) => {
    setStars(prev => prev.filter(s => s.id !== id));
    setScore(s => s + 1);
  };

  if (!running) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="text-6xl animate-pop-in">🏆</div>
        <h3 className="font-fredoka text-3xl text-tama-text">Результат!</h3>
        <p className="text-lg font-bold text-tama-light">Поймано: <span className="text-tama-purple">{score}</span> ⭐</p>
        <button onClick={() => onFinish(score)} className="tama-btn bg-gradient-to-r from-tama-pink to-tama-purple text-white px-8 py-3 text-lg">
          Получить награду! 🎁
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="font-bold text-tama-light">⭐ {score}</span>
        <span className="font-bold text-tama-light">⏱ {timeLeft}с</span>
      </div>
      <div className="relative w-full rounded-2xl overflow-hidden" style={{ height: 220, background: 'linear-gradient(180deg, #e0e7ff 0%, #fce7f3 100%)' }}>
        {stars.filter(s => s.y < 100).map(star => (
          <button
            key={star.id}
            onClick={() => catchStar(star.id)}
            className="absolute text-3xl border-none bg-transparent cursor-pointer hover:scale-125 transition-transform"
            style={{ left: `${star.x}%`, top: `${star.y}%`, transform: 'translateX(-50%)' }}
          >⭐</button>
        ))}
        {stars.filter(s => s.y < 100).length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-tama-light font-bold text-sm">Жди звёзды! ✨</div>
        )}
      </div>
      <p className="text-center text-xs text-tama-light mt-2">Нажимай на звёзды, чтобы поймать!</p>
    </div>
  );
}

// ─── Memory game ──────────────────────────────────────────────────────────────
function MemoryGame({ onFinish }: { onFinish: (score: number) => void }) {
  const emojis = ["🐱", "🐶", "🌸", "🍀", "🌈", "⭐", "🎈", "🍭"];
  const [board, setBoard] = useState(() =>
    [...emojis, ...emojis]
      .sort(() => Math.random() - 0.5)
      .map((e, i) => ({ id: i, emoji: e, flipped: false, matched: false }))
  );
  const [selected, setSelected] = useState<number[]>([]);
  const [matches, setMatches] = useState(0);
  const [moves, setMoves] = useState(0);

  const flip = (id: number) => {
    if (selected.length === 2) return;
    const card = board.find(c => c.id === id);
    if (!card || card.flipped || card.matched) return;
    const newBoard = board.map(c => c.id === id ? { ...c, flipped: true } : c);
    setBoard(newBoard);
    const newSel = [...selected, id];
    setSelected(newSel);
    if (newSel.length === 2) {
      setMoves(m => m + 1);
      const [a, b] = newSel.map(sid => newBoard.find(c => c.id === sid)!);
      if (a.emoji === b.emoji) {
        const matched = newBoard.map(c => newSel.includes(c.id) ? { ...c, matched: true } : c);
        setBoard(matched);
        setMatches(m => m + 1);
        setSelected([]);
      } else {
        setTimeout(() => {
          setBoard(prev => prev.map(c => newSel.includes(c.id) ? { ...c, flipped: false } : c));
          setSelected([]);
        }, 900);
      }
    }
  };

  if (matches === emojis.length) {
    const score = Math.max(1, emojis.length * 2 - moves + emojis.length);
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="text-6xl animate-pop-in">🎉</div>
        <h3 className="font-fredoka text-3xl text-tama-text">Молодец!</h3>
        <p className="text-lg font-bold text-tama-light">Ходов: <span className="text-tama-purple">{moves}</span></p>
        <button onClick={() => onFinish(score)} className="tama-btn bg-gradient-to-r from-tama-pink to-tama-purple text-white px-8 py-3 text-lg">
          Получить награду! 🎁
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="font-bold text-tama-light">🃏 {matches}/{emojis.length}</span>
        <span className="font-bold text-tama-light">👆 {moves}</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {board.map(card => (
          <button
            key={card.id}
            onClick={() => flip(card.id)}
            className={`aspect-square rounded-xl text-2xl transition-all duration-200 border-none cursor-pointer ${
              card.matched ? 'bg-green-100' : card.flipped ? 'bg-purple-100' : 'bg-gradient-to-br from-tama-pink to-tama-purple hover:scale-105'
            }`}
          >
            {card.flipped || card.matched ? card.emoji : "❓"}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Quiz game ────────────────────────────────────────────────────────────────
function QuizGame({ onFinish }: { onFinish: (score: number) => void }) {
  const questions = [
    { q: "Сколько ног у осьминога?", options: ["6", "8", "10", "4"], answer: 1 },
    { q: "Какая планета самая большая?", options: ["Земля", "Марс", "Юпитер", "Сатурн"], answer: 2 },
    { q: "Кто изобрёл телефон?", options: ["Эдисон", "Белл", "Тесла", "Маркони"], answer: 1 },
    { q: "Сколько цветов в радуге?", options: ["5", "6", "7", "8"], answer: 2 },
    { q: "Самое быстрое животное суши?", options: ["Лев", "Гепард", "Лошадь", "Орёл"], answer: 1 },
  ];
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState<number | null>(null);

  const answer = (idx: number) => {
    if (answered !== null) return;
    setAnswered(idx);
    if (idx === questions[current].answer) setScore(s => s + 1);
    setTimeout(() => {
      if (current + 1 >= questions.length) { /* done handled below */ }
      else { setCurrent(c => c + 1); setAnswered(null); }
    }, 1000);
  };

  const done = current + 1 >= questions.length && answered !== null;

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="text-6xl animate-pop-in">{score >= 4 ? "🏆" : "📚"}</div>
        <h3 className="font-fredoka text-3xl text-tama-text">Результат!</h3>
        <p className="text-lg font-bold text-tama-light">Правильно: <span className="text-tama-purple">{score}/{questions.length}</span></p>
        <button onClick={() => onFinish(score * 2)} className="tama-btn bg-gradient-to-r from-tama-mint to-tama-purple text-white px-8 py-3 text-lg">
          Получить награду! 🎁
        </button>
      </div>
    );
  }

  const q = questions[current];
  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="font-bold text-tama-light">Вопрос {current + 1}/{questions.length}</span>
        <span className="font-bold text-tama-light">✅ {score}</span>
      </div>
      <div className="tama-card p-4 mb-4 text-center">
        <p className="font-bold text-tama-text">{q.q}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {q.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => answer(i)}
            className={`tama-btn py-3 px-4 text-sm font-bold ${
              answered === null ? 'bg-purple-50 text-tama-text hover:bg-purple-100'
                : i === q.answer ? 'bg-green-400 text-white'
                : i === answered ? 'bg-red-400 text-white'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Home screen ──────────────────────────────────────────────────────────────
function HomeScreen({ pet, onFeed, onPlay, onSleep, coinAnim }: {
  pet: Pet; onFeed: () => void; onPlay: () => void; onSleep: () => void; coinAnim: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-4 pb-4 animate-fade-in">
      <div className="tama-card w-full p-5 relative">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-bold text-tama-light">Твой питомец</p>
            <h2 className="font-fredoka text-2xl text-tama-text">{pet.name}</h2>
            <span className="inline-block bg-gradient-to-r from-tama-pink to-tama-purple text-white text-xs font-bold px-3 py-1 rounded-full">
              Уровень {pet.level}
            </span>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-tama-light">Настроение</p>
            <p className="text-4xl">{MOOD_EMOJIS[pet.mood]}</p>
            <p className="text-xs font-semibold text-tama-light">{MOOD_LABELS[pet.mood]}</p>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-xs font-bold text-tama-light mb-1">
            <span>✨ Опыт</span>
            <span>{pet.xp} / {pet.xpToNext}</span>
          </div>
          <div className="progress-bar" style={{ background: '#FFF0F5' }}>
            <div className="progress-fill" style={{ width: `${(pet.xp / pet.xpToNext) * 100}%`, background: 'linear-gradient(90deg, #FF6B9D, #C77DFF)' }} />
          </div>
        </div>

        <StatBar label="Сытость" value={pet.hunger} color="#FF9F43" emoji="🍎" />
        <StatBar label="Счастье" value={pet.happiness} color="#FF6B9D" emoji="💖" />
        <StatBar label="Здоровье" value={pet.health} color="#6BCBCA" emoji="💚" />
        <StatBar label="Энергия" value={pet.energy} color="#C77DFF" emoji="⚡" />

        <div className="flex items-center gap-2 mt-3 bg-amber-50 rounded-2xl px-4 py-2">
          <span className="text-xl">🪙</span>
          <span className="font-fredoka text-xl text-amber-600">{pet.coins}</span>
          <span className="text-xs text-amber-500 font-semibold">монет</span>
        </div>

        {coinAnim && (
          <div className="absolute top-4 right-4 pointer-events-none">
            {[0, 1, 2].map(i => (
              <div key={i} className="absolute text-2xl animate-coin-fly" style={{ left: `${(i - 1) * 16}px`, animationDelay: `${i * 0.12}s` }}>🪙</div>
            ))}
          </div>
        )}
      </div>

      <div className="relative w-44 h-44">
        <div className="w-44 h-44 rounded-full overflow-hidden border-4 border-white shadow-xl animate-bounce-pet" style={{ boxShadow: '0 8px 40px rgba(255,107,157,0.4)' }}>
          <img src={PET_IMAGE} alt={pet.name} className="w-full h-full object-cover" />
        </div>
        <div className="absolute -top-2 -right-2 text-3xl animate-heartbeat">💖</div>
        <div className="absolute -bottom-2 -left-2 text-2xl animate-star-spin">⭐</div>
      </div>

      <div className="grid grid-cols-3 gap-3 w-full">
        {[
          { label: "Покормить", emoji: "🍎", onClick: onFeed, bg: "from-orange-400 to-orange-500", disabled: pet.hunger >= 95 },
          { label: "Поиграть", emoji: "🎮", onClick: onPlay, bg: "from-pink-400 to-pink-500", disabled: pet.energy < 15 },
          { label: "Спать", emoji: "💤", onClick: onSleep, bg: "from-purple-400 to-purple-500", disabled: pet.energy >= 95 },
        ].map(({ label, emoji, onClick, bg, disabled }) => (
          <button key={label} onClick={onClick} disabled={disabled}
            className={`tama-btn py-3 text-white text-sm bg-gradient-to-br ${bg} shadow-md ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <div className="text-2xl mb-1">{emoji}</div>
            <div>{label}</div>
          </button>
        ))}
      </div>

      {(pet.hunger < 30 || pet.happiness < 30 || pet.health < 30 || pet.energy < 30) && (
        <div className="w-full bg-red-50 border-2 border-red-200 rounded-2xl p-3 animate-slide-up">
          <p className="font-bold text-red-500 text-sm text-center">⚠️ Питомцу нужна твоя помощь!</p>
          <p className="text-xs text-red-400 text-center mt-1">
            {pet.hunger < 30 ? "Он голоден! " : ""}{pet.happiness < 30 ? "Ему скучно! " : ""}{pet.health < 30 ? "Он болеет! " : ""}{pet.energy < 30 ? "Он устал! " : ""}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Games screen ─────────────────────────────────────────────────────────────
function GamesScreen({ onGameFinish }: { onGameFinish: (game: MiniGame, score: number) => void }) {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const gameObj = MINI_GAMES.find(g => g.id === activeGame);

  if (activeGame === "catch" && gameObj) return (
    <div className="animate-fade-in">
      <button onClick={() => setActiveGame(null)} className="tama-btn bg-gray-100 text-tama-text px-4 py-2 text-sm mb-4 flex items-center gap-2">
        <Icon name="ArrowLeft" size={16} /> Назад
      </button>
      <div className="tama-card p-4">
        <h3 className="font-fredoka text-xl text-tama-text mb-4">⭐ Поймай звезду!</h3>
        <CatchGame onFinish={(s) => { onGameFinish(gameObj, s); setActiveGame(null); }} />
      </div>
    </div>
  );

  if (activeGame === "memory" && gameObj) return (
    <div className="animate-fade-in">
      <button onClick={() => setActiveGame(null)} className="tama-btn bg-gray-100 text-tama-text px-4 py-2 text-sm mb-4 flex items-center gap-2">
        <Icon name="ArrowLeft" size={16} /> Назад
      </button>
      <div className="tama-card p-4">
        <h3 className="font-fredoka text-xl text-tama-text mb-4">🧠 Запомни!</h3>
        <MemoryGame onFinish={(s) => { onGameFinish(gameObj, s); setActiveGame(null); }} />
      </div>
    </div>
  );

  if (activeGame === "quiz" && gameObj) return (
    <div className="animate-fade-in">
      <button onClick={() => setActiveGame(null)} className="tama-btn bg-gray-100 text-tama-text px-4 py-2 text-sm mb-4 flex items-center gap-2">
        <Icon name="ArrowLeft" size={16} /> Назад
      </button>
      <div className="tama-card p-4">
        <h3 className="font-fredoka text-xl text-tama-text mb-4">📚 Викторина</h3>
        <QuizGame onFinish={(s) => { onGameFinish(gameObj, s); setActiveGame(null); }} />
      </div>
    </div>
  );

  const diffColors: Record<string, string> = { easy: "bg-green-100 text-green-600", medium: "bg-yellow-100 text-yellow-600", hard: "bg-red-100 text-red-600" };
  const diffLabels: Record<string, string> = { easy: "Легко", medium: "Средне", hard: "Сложно" };

  return (
    <div className="animate-fade-in">
      <div className="tama-card p-4 mb-4 flex items-center gap-3">
        <span className="text-3xl">🎮</span>
        <div>
          <h3 className="font-fredoka text-xl text-tama-text">Мини-игры</h3>
          <p className="text-xs text-tama-light">Играй и развивай питомца!</p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {MINI_GAMES.map(game => {
          const playable = ["memory", "catch", "quiz"].includes(game.id);
          return (
            <button key={game.id} onClick={() => playable && setActiveGame(game.id)}
              className={`tama-card p-4 text-left transition-all border-none ${playable ? 'hover:shadow-lg cursor-pointer hover:-translate-y-0.5' : 'opacity-60 cursor-not-allowed'}`}>
              <div className="flex items-center gap-4">
                <span className="text-4xl">{game.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-tama-text">{game.title}</h4>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${diffColors[game.difficulty]}`}>{diffLabels[game.difficulty]}</span>
                    {!playable && <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Скоро</span>}
                  </div>
                  <p className="text-xs text-tama-light">{game.description}</p>
                  <div className="flex gap-3 mt-2">
                    <span className="text-xs text-tama-purple font-semibold">+{game.reward.xp} XP</span>
                    <span className="text-xs text-amber-500 font-semibold">+{game.reward.coins} 🪙</span>
                    <span className="text-xs text-pink-500 font-semibold">+{game.reward.happiness} 💖</span>
                  </div>
                </div>
                {playable && <Icon name="ChevronRight" size={20} className="text-tama-light flex-shrink-0" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Shop screen ──────────────────────────────────────────────────────────────
function ShopScreen({ pet, onBuy }: { pet: Pet; onBuy: (item: ShopItem) => void }) {
  const [category, setCategory] = useState<"all" | "food" | "toy" | "boost">("all");
  const [bought, setBought] = useState<string | null>(null);

  const filtered = category === "all" ? SHOP_ITEMS : SHOP_ITEMS.filter(i => i.category === category);

  const handleBuy = (item: ShopItem) => {
    if (pet.coins < item.price) return;
    onBuy(item);
    setBought(item.id);
    setTimeout(() => setBought(null), 1500);
  };

  return (
    <div className="animate-fade-in">
      <div className="tama-card p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏪</span>
          <div>
            <h3 className="font-fredoka text-xl text-tama-text">Магазин</h3>
            <p className="text-xs text-tama-light">Покупай для питомца!</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-amber-50 rounded-2xl px-3 py-2">
          <span className="text-lg">🪙</span>
          <span className="font-fredoka text-lg text-amber-600">{pet.coins}</span>
        </div>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {(["all", "food", "toy", "boost"] as const).map(cat => (
          <button key={cat} onClick={() => setCategory(cat)}
            className={`tama-btn flex-shrink-0 px-4 py-2 text-sm ${category === cat ? 'bg-gradient-to-r from-tama-pink to-tama-purple text-white' : 'bg-white text-tama-light border border-gray-100'}`}>
            {{ all: "🛍️ Все", food: "🍎 Еда", toy: "⚽ Игрушки", boost: "⭐ Бусты" }[cat]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {filtered.map(item => {
          const canBuy = pet.coins >= item.price;
          const wasBought = bought === item.id;
          return (
            <div key={item.id} className={`tama-card p-3 transition-all ${wasBought ? 'ring-2 ring-green-400' : ''}`}>
              <div className="text-4xl text-center mb-2">{item.emoji}</div>
              <h4 className="font-bold text-tama-text text-center text-sm">{item.name}</h4>
              <p className="text-xs text-tama-light text-center mb-3">{item.description}</p>
              <button onClick={() => handleBuy(item)} disabled={!canBuy}
                className={`tama-btn w-full py-2 text-sm font-bold ${wasBought ? 'bg-green-400 text-white' : canBuy ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                {wasBought ? "✅ Куплено!" : `🪙 ${item.price}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Progress screen ──────────────────────────────────────────────────────────
function ProgressScreen({ pet }: { pet: Pet }) {
  const achievements = ALL_ACHIEVEMENTS.map(a => ({ ...a, unlocked: pet.achievements.includes(a.id) }));
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="animate-fade-in flex flex-col gap-4">
      <div className="tama-card p-4">
        <h3 className="font-fredoka text-xl text-tama-text mb-3">📊 Статистика</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Уровень", value: pet.level, emoji: "⭐", color: "#FF6B9D" },
            { label: "Возраст", value: `${Math.floor(pet.age / 60)}ч`, emoji: "⏰", color: "#6BCBCA" },
            { label: "Монеты", value: pet.coins, emoji: "🪙", color: "#FFD93D" },
            { label: "Ачивки", value: `${unlockedCount}/${achievements.length}`, emoji: "🏆", color: "#C77DFF" },
          ].map(({ label, value, emoji, color }) => (
            <div key={label} className="bg-gray-50 rounded-2xl p-3 text-center">
              <div className="text-2xl mb-1">{emoji}</div>
              <div className="font-fredoka text-2xl" style={{ color }}>{value}</div>
              <div className="text-xs text-tama-light font-semibold">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="tama-card p-4">
        <h3 className="font-fredoka text-lg text-tama-text mb-3">✨ Прогресс уровня</h3>
        <div className="flex justify-between text-sm font-bold mb-2">
          <span className="text-tama-light">Уровень {pet.level}</span>
          <span className="text-tama-purple">{pet.xp} / {pet.xpToNext} XP</span>
        </div>
        <div className="progress-bar" style={{ height: 20, background: '#F0E6FF' }}>
          <div className="progress-fill" style={{ width: `${(pet.xp / pet.xpToNext) * 100}%`, background: 'linear-gradient(90deg, #FF6B9D, #C77DFF)' }} />
        </div>
        <p className="text-xs text-tama-light text-center mt-2">До следующего уровня: {pet.xpToNext - pet.xp} XP</p>
      </div>

      <div className="tama-card p-4">
        <h3 className="font-fredoka text-xl text-tama-text mb-3">🏆 Достижения ({unlockedCount}/{achievements.length})</h3>
        <div className="flex flex-col gap-3">
          {achievements.map(a => (
            <div key={a.id} className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${a.unlocked ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200' : 'bg-gray-50 opacity-60'}`}>
              <span className="text-3xl">{a.emoji}</span>
              <div className="flex-1">
                <h4 className={`font-bold text-sm ${a.unlocked ? 'text-tama-text' : 'text-gray-400'}`}>{a.title}</h4>
                <p className="text-xs text-tama-light">{a.description}</p>
              </div>
              <span className="text-lg">{a.unlocked ? "✅" : "🔒"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Settings screen ──────────────────────────────────────────────────────────
function SettingsScreen({ pet, onRename, onReset }: { pet: Pet; onRename: (name: string) => void; onReset: () => void }) {
  const [name, setName] = useState(pet.name);
  const [sound, setSound] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [difficulty, setDifficulty] = useState<"easy" | "normal" | "hard">("normal");
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="animate-fade-in flex flex-col gap-4">
      <div className="tama-card p-4">
        <h3 className="font-fredoka text-xl text-tama-text mb-4">⚙️ Настройки</h3>
        <div className="mb-4">
          <label className="text-sm font-bold text-tama-light block mb-2">🐾 Имя питомца</label>
          <div className="flex gap-2">
            <input value={name} onChange={e => setName(e.target.value)} maxLength={12}
              className="flex-1 border-2 border-purple-100 rounded-2xl px-4 py-2 font-nunito font-bold text-tama-text focus:outline-none focus:border-tama-pink bg-purple-50" />
            <button onClick={() => onRename(name)} className="tama-btn bg-gradient-to-r from-tama-pink to-tama-purple text-white px-4 py-2 text-sm">✓</button>
          </div>
        </div>

        {[{ label: "Звук", emoji: "🔊", state: sound, setState: setSound }, { label: "Уведомления", emoji: "🔔", state: notifications, setState: setNotifications }].map(({ label, emoji, state, setState }) => (
          <div key={label} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
            <span className="font-bold text-tama-text text-sm">{emoji} {label}</span>
            <button onClick={() => setState(!state)} className={`w-14 h-7 rounded-full relative transition-all ${state ? 'bg-gradient-to-r from-tama-pink to-tama-purple' : 'bg-gray-200'}`}>
              <div className={`w-5 h-5 bg-white rounded-full absolute top-1 shadow-sm transition-all ${state ? 'left-8' : 'left-1'}`} />
            </button>
          </div>
        ))}

        <div className="mt-4">
          <label className="text-sm font-bold text-tama-light block mb-2">🎯 Сложность</label>
          <div className="flex gap-2">
            {(["easy", "normal", "hard"] as const).map(d => (
              <button key={d} onClick={() => setDifficulty(d)}
                className={`tama-btn flex-1 py-2 text-xs ${difficulty === d ? 'bg-gradient-to-r from-tama-pink to-tama-purple text-white' : 'bg-gray-100 text-tama-light'}`}>
                {{ easy: "😌 Легко", normal: "😊 Норма", hard: "😤 Сложно" }[d]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="tama-card p-4">
        <h3 className="font-fredoka text-lg text-tama-text mb-3">ℹ️ О питомце</h3>
        <div className="text-sm text-tama-light space-y-2">
          <p>🐾 Имя: <strong className="text-tama-text">{pet.name}</strong></p>
          <p>⭐ Уровень: <strong className="text-tama-text">{pet.level}</strong></p>
          <p>🎂 Возраст: <strong className="text-tama-text">{Math.floor(pet.age / 60)}ч {pet.age % 60}мин</strong></p>
          <p>🏆 Достижений: <strong className="text-tama-text">{pet.achievements.length}</strong></p>
        </div>
      </div>

      <div className="tama-card p-4">
        {!confirmReset ? (
          <button onClick={() => setConfirmReset(true)} className="tama-btn w-full bg-red-50 text-red-400 py-3 text-sm font-bold border-2 border-red-100">
            🔄 Начать сначала
          </button>
        ) : (
          <div>
            <p className="text-center font-bold text-red-400 mb-3">Весь прогресс будет утерян!</p>
            <div className="flex gap-2">
              <button onClick={onReset} className="tama-btn flex-1 bg-red-400 text-white py-3 text-sm">Да, сбросить</button>
              <button onClick={() => setConfirmReset(false)} className="tama-btn flex-1 bg-gray-100 text-tama-text py-3 text-sm">Отмена</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Index() {
  const [tab, setTab] = useState<"home" | "games" | "shop" | "progress" | "settings">("home");
  const [pet, setPet] = useState<Pet>(() => {
    try {
      const saved = localStorage.getItem("tamagotchi-pet");
      return saved ? JSON.parse(saved) : defaultPet();
    } catch {
      return defaultPet();
    }
  });
  const [coinAnim, setCoinAnim] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("tamagotchi-pet", JSON.stringify(pet));
  }, [pet]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPet(prev => {
        const updated = {
          ...prev,
          hunger: clamp(prev.hunger - 0.5),
          happiness: clamp(prev.happiness - 0.3),
          energy: clamp(prev.energy - 0.2),
          health: clamp(prev.health - (prev.hunger < 20 ? 0.5 : 0.05)),
          age: prev.age + 1,
        };
        updated.mood = calcMood(updated);
        return updated;
      });
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const showNotif = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2500);
  };

  const checkAchievements = useCallback((p: Pet) => {
    const toUnlock: string[] = [];
    if (!p.achievements.includes("first_feed") && p.hunger >= 70) toUnlock.push("first_feed");
    if (!p.achievements.includes("level_5") && p.level >= 5) toUnlock.push("level_5");
    if (!p.achievements.includes("happy_100") && p.happiness >= 100) toUnlock.push("happy_100");
    if (!p.achievements.includes("rich") && p.coins >= 100) toUnlock.push("rich");
    return [...p.achievements, ...toUnlock];
  }, []);

  const feed = () => {
    setPet(prev => {
      const u = addXp({ ...prev, hunger: clamp(prev.hunger + 25), health: clamp(prev.health + 3), coins: prev.coins + 2 }, 10);
      u.mood = calcMood(u); u.achievements = checkAchievements(u); return u;
    });
    setCoinAnim(true); setTimeout(() => setCoinAnim(false), 1000);
    showNotif("🍎 Ням-ням! +25 сытость, +2 монеты");
  };

  const play = () => {
    setPet(prev => {
      const u = addXp({ ...prev, happiness: clamp(prev.happiness + 20), energy: clamp(prev.energy - 15), coins: prev.coins + 3 }, 15);
      u.mood = calcMood(u); u.achievements = checkAchievements(u); return u;
    });
    setCoinAnim(true); setTimeout(() => setCoinAnim(false), 1000);
    showNotif("🎉 Весело! +20 счастье, +3 монеты");
  };

  const sleep = () => {
    setPet(prev => {
      const u = { ...prev, energy: clamp(prev.energy + 40), health: clamp(prev.health + 5) };
      u.mood = calcMood(u); return u;
    });
    showNotif("😴 Спокойной ночи! +40 энергия");
  };

  const buyItem = (item: ShopItem) => {
    setPet(prev => {
      if (prev.coins < item.price) return prev;
      const u: Pet = {
        ...prev,
        coins: prev.coins - item.price,
        hunger: clamp(prev.hunger + (item.effect.hunger || 0)),
        happiness: clamp(prev.happiness + (item.effect.happiness || 0)),
        health: clamp(prev.health + (item.effect.health || 0)),
        energy: clamp(prev.energy + (item.effect.energy || 0)),
        inventory: { ...prev.inventory, [item.id]: (prev.inventory[item.id] || 0) + 1 },
      };
      u.mood = calcMood(u); u.achievements = checkAchievements(u); return u;
    });
    showNotif(`${item.emoji} ${item.name} куплено!`);
  };

  const handleGameFinish = (game: MiniGame, score: number) => {
    setPet(prev => {
      const xpGain = Math.round(game.reward.xp * (1 + score * 0.1));
      const coinGain = Math.round(game.reward.coins * (1 + score * 0.05));
      const u = addXp({ ...prev, happiness: clamp(prev.happiness + game.reward.happiness), coins: prev.coins + coinGain }, xpGain);
      u.mood = calcMood(u); u.achievements = checkAchievements(u); return u;
    });
    setCoinAnim(true); setTimeout(() => setCoinAnim(false), 1200);
    showNotif(`🎮 +${game.reward.xp} XP, +${game.reward.coins} монет!`);
  };

  const rename = (name: string) => {
    if (name.trim()) { setPet(prev => ({ ...prev, name: name.trim() })); showNotif(`✅ Переименован в ${name.trim()}!`); }
  };

  const reset = () => { setPet(defaultPet()); setTab("home"); showNotif("🔄 Начинаем сначала!"); };

  const navItems = [
    { id: "home", emoji: "🏠", label: "Дом" },
    { id: "games", emoji: "🎮", label: "Игры" },
    { id: "shop", emoji: "🏪", label: "Магазин" },
    { id: "progress", emoji: "📊", label: "Прогресс" },
    { id: "settings", emoji: "⚙️", label: "Настройки" },
  ] as const;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #FFF5E4 0%, #FFE5F5 50%, #E5F5FF 100%)' }}>
      {/* Background bubbles */}
      <div className="bubbles-bg">
        {[
          { size: 120, style: { top: "5%", left: "10%" }, color: "#FF6B9D", delay: "0s" },
          { size: 80, style: { top: "15%", right: "8%" }, color: "#FFD93D", delay: "1s" },
          { size: 60, style: { top: "45%", left: "3%" }, color: "#6BCBCA", delay: "2s" },
          { size: 100, style: { bottom: "20%", right: "5%" }, color: "#C77DFF", delay: "0.5s" },
          { size: 50, style: { bottom: "10%", left: "20%" }, color: "#FF9F43", delay: "1.5s" },
        ].map((b, i) => (
          <div key={i} className="bubble" style={{ width: b.size, height: b.size, background: b.color, animationDelay: b.delay, ...b.style }} />
        ))}
      </div>

      {/* Notification toast */}
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-white rounded-2xl shadow-xl px-5 py-3 font-bold text-tama-text text-sm animate-pop-in whitespace-nowrap"
          style={{ boxShadow: '0 8px 32px rgba(61,32,102,0.15)' }}>
          {notification}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 max-w-md mx-auto px-4 pt-6 pb-28">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-fredoka text-3xl text-tama-text">Тамагочи</h1>
            <p className="text-xs text-tama-light font-semibold">Твой виртуальный питомец</p>
          </div>
          <div className="bg-white rounded-2xl px-3 py-2 shadow-sm flex items-center gap-1">
            <span className="text-lg">⭐</span>
            <span className="font-fredoka text-tama-purple">Lvl {pet.level}</span>
          </div>
        </div>

        {tab === "home" && <HomeScreen pet={pet} onFeed={feed} onPlay={play} onSleep={sleep} coinAnim={coinAnim} />}
        {tab === "games" && <GamesScreen onGameFinish={handleGameFinish} />}
        {tab === "shop" && <ShopScreen pet={pet} onBuy={buyItem} />}
        {tab === "progress" && <ProgressScreen pet={pet} />}
        {tab === "settings" && <SettingsScreen pet={pet} onRename={rename} onReset={reset} />}
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', borderTop: '2px solid rgba(61,32,102,0.06)', boxShadow: '0 -8px 32px rgba(61,32,102,0.08)' }}>
        <div className="max-w-md mx-auto px-4 py-2 flex justify-around items-center">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)} className={`nav-tab ${tab === item.id ? 'active' : ''}`}>
              <span className="text-xl">{item.emoji}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
