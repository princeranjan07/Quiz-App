import React, { useEffect, useState, useRef } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import localQuestions from './data/questions.json';

function decodeHtml(html) {
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
}
function shuffle(array) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="mb-6 flex items-center justify-between">
      <h1 className="text-2xl font-semibold">Quiz App</h1>
      <nav className="space-x-4 text-sm" aria-label="Main navigation">
        <Link to="/" className="text-indigo-600 hover:underline">Home</Link>
        <Link to="/quiz" className="text-indigo-600 hover:underline">Quiz</Link>
        <Link to="/results" className="text-indigo-600 hover:underline">Results</Link>
        <Link to="/history" className="text-indigo-600 hover:underline">History</Link>
      </nav>
    </header>
  );
}

function Home() {
  const navigate = useNavigate();
  const [amount, setAmount] = useState(10);
  const [difficulty, setDifficulty] = useState('any');

  function start() {
    const diffParam = difficulty === 'any' ? '' : `difficulty=${difficulty}&`;
    navigate(`/quiz?amount=${amount}&${diffParam}`);
  }

  return (
    <main className="bg-white rounded-lg shadow p-6" aria-labelledby="home-heading">
      <h2 id="home-heading" className="text-xl font-medium mb-2">Welcome</h2>
      <p className="text-sm text-gray-600 mb-4">This quiz app demonstrates React fundamentals, routing, state, and persistent scores.</p>

      <label className="text-sm block text-gray-700">Number of questions</label>
      <select
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        className="mt-2 mb-4 px-3 py-2 border rounded focus:ring-2 focus:ring-indigo-200"
        aria-label="Number of questions"
      >
        <option value={5}>5</option>
        <option value={7}>7</option>
        <option value={10}>10</option>
      </select>

      <label className="text-sm block text-gray-700">Difficulty</label>
      <select
        value={difficulty}
        onChange={(e) => setDifficulty(e.target.value)}
        className="mt-2 mb-4 px-3 py-2 border rounded focus:ring-2 focus:ring-indigo-200"
        aria-label="Difficulty level"
      >
        <option value="any">Any</option>
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>

      <div className="flex gap-3">
        <button onClick={start} className="px-4 py-2 bg-indigo-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-indigo-300" aria-label="Start quiz">Start Quiz</button>
        <Link to="/results" className="px-4 py-2 border rounded text-sm inline-flex items-center">View Results</Link>
      </div>

      <section className="mt-6 text-sm text-gray-600" aria-hidden>
        <strong>Notes:</strong>
        <ul className="list-disc ml-5">
          <li>Choose amount/difficulty — the app will request matching questions from the API (falls back to local data when offline).</li>
          <li>Each completed attempt is recorded in <code>localStorage</code> and visible in History.</li>
        </ul>
      </section>
    </main>
  );
}

function QuizPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const amountParam = parseInt(params.get('amount') || '10', 10);
  const difficultyParam = params.get('difficulty') || '';

  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [locked, setLocked] = useState(false);

  const TIME_PER_Q = 30;
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q);
  const timerRef = useRef(null);
  const optionsRef = useRef([]); // refs for option buttons to manage focus

  useEffect(() => {
    let mounted = true;
    async function fetchQuestions() {
      setLoading(true);
      try {
        let url = `https://opentdb.com/api.php?amount=${amountParam}&type=multiple`;
        if (difficultyParam) url += `&difficulty=${difficultyParam}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Network error');
        const data = await res.json();
        if (data.response_code === 0 && data.results.length > 0) {
          const normalized = data.results.map((q) => ({
            question: decodeHtml(q.question),
            correct_answer: decodeHtml(q.correct_answer),
            incorrect_answers: q.incorrect_answers.map((ia) => decodeHtml(ia)),
          }));
          if (mounted) setQuestions(normalized.map(q => ({ ...q, options: shuffle([q.correct_answer, ...q.incorrect_answers]) })));
        } else {
          if (mounted) setQuestions(localQuestions.slice(0, amountParam).map(q => ({ ...q, options: shuffle([q.correct_answer, ...q.incorrect_answers]) })));
        }
      } catch (err) {
        console.warn('Using local questions due to fetch error', err);
        if (mounted) setQuestions(localQuestions.slice(0, amountParam).map(q => ({ ...q, options: shuffle([q.correct_answer, ...q.incorrect_answers]) })));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchQuestions();
    return () => (mounted = false);
  }, [amountParam, difficultyParam]);

  useEffect(() => {
    setTimeLeft(TIME_PER_Q);
    setLocked(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [index, questions]);

  useEffect(() => {
    if (timeLeft <= 0 && questions) {
      handleLock(null, true);
    }
  }, [timeLeft]);

  useEffect(() => {
    // focus first option when question changes
    if (optionsRef.current[0]) {
      optionsRef.current[0].focus();
    }
  }, [index, questions]);

  function currentQuestion() {
    return questions ? questions[index] : null;
  }
  function optionsFor(q) {
    if (!q) return [];
    return q.options || shuffle([q.correct_answer, ...q.incorrect_answers]);
  }

  function saveAttemptToHistory(summary) {
    try {
      const key = 'quizHistory';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.unshift(summary); // newest first
      const trimmed = existing.slice(0, 50);
      localStorage.setItem(key, JSON.stringify(trimmed));
    } catch (e) {
      console.error('Could not save history', e);
    }
  }

  function handleLock(selectedOption, auto = false) {
    if (locked) return;
    const q = currentQuestion();
    const correct = q && selectedOption === q.correct_answer;
    const record = {
      question: q ? q.question : '',
      selected: selectedOption,
      correctAnswer: q ? q.correct_answer : '',
      correct: !!correct,
      options: q ? (q.options || optionsFor(q)) : [],
      timedOut: auto && selectedOption == null,
    };
    setAnswers((a) => [...a, record]);
    setLocked(true);
    setTimeout(() => {
      if (index + 1 < (questions ? questions.length : 0)) {
        setIndex((i) => i + 1);
      } else {
        const totalCorrect = answers.filter((r) => r.correct).length + (record.correct ? 1 : 0);
        const resultSummary = {
          answers: [...answers, record],
          score: totalCorrect,
          total: questions.length,
          timestamp: Date.now(),
          amount: questions.length,
          difficulty: difficultyParam || 'any'
        };
        localStorage.setItem('latestResult', JSON.stringify(resultSummary));
        const prevBest = parseInt(localStorage.getItem('quizHighScore') || '0', 10);
        if (totalCorrect > prevBest) localStorage.setItem('quizHighScore', String(totalCorrect));
        saveAttemptToHistory(resultSummary);
        navigate('/results');
      }
    }, 600);
  }

  // keyboard handler for option buttons: allow Enter/Space to select, ArrowUp/ArrowDown to move focus
  function onOptionKeyDown(e, i, option) {
    const list = optionsRef.current;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleLock(option, false);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      const next = list[i + 1] || list[0];
      next && next.focus();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = list[i - 1] || list[list.length - 1];
      prev && prev.focus();
    }
  }

  if (loading) return <div className="card p-6 bg-white rounded shadow">Loading questions…</div>;
  if (!questions) return <div className="card p-6 bg-white rounded shadow">No questions available.</div>;

  const q = currentQuestion();
  const opts = optionsFor(q);
  const progressText = `${index + 1} / ${questions.length}`;

  return (
    <article className="card bg-white rounded-lg shadow p-6" aria-labelledby="q-heading">
      <header className="flex justify-between items-center mb-4">
        <div>
          <div className="text-sm text-gray-500">Question</div>
          <div id="q-heading" className="text-lg font-medium">{progressText}</div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Time</div>
          <div className="text-lg font-medium" aria-live="polite">{Math.max(0, timeLeft)}s</div>
        </div>
      </header>

      <section className="mb-4">
        <h3 className="text-base font-semibold mb-3" id="question-text">{q.question}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3" role="list" aria-labelledby="question-text">
          {opts.map((opt, i) => (
            <button
              key={opt}
              ref={(el) => optionsRef.current[i] = el}
              onClick={() => { if (!locked) handleLock(opt, false); }}
              disabled={locked}
              onKeyDown={(e) => onOptionKeyDown(e, i, opt)}
              className={`p-3 text-left rounded border hover:shadow-sm focus:outline-none focus:ring-2 ${locked ? 'opacity-70 cursor-not-allowed' : 'bg-white'}`}
              role="listitem"
              aria-label={`Option ${i + 1}: ${opt}`}
            >
              {opt}
            </button>
          ))}
        </div>
      </section>

      <footer className="flex items-center justify-between mt-6">
        <div className="text-sm text-gray-600">Pick an answer to continue — you can’t change it.</div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setIndex(0); setAnswers([]); }}
            className="px-3 py-1 border rounded focus:ring-2 focus:ring-indigo-200"
          >
            Restart
          </button>
          <button
            onClick={() => {
              const totalCorrect = answers.filter((r) => r.correct).length;
              const resultSummary = { answers, score: totalCorrect, total: questions.length, timestamp: Date.now(), amount: questions.length, difficulty: difficultyParam || 'any' };
              localStorage.setItem('latestResult', JSON.stringify(resultSummary));
              const prevBest = parseInt(localStorage.getItem('quizHighScore') || '0', 10);
              if (totalCorrect > prevBest) localStorage.setItem('quizHighScore', String(totalCorrect));
              saveAttemptToHistory(resultSummary);
              navigate('/results');
            }}
            className="px-4 py-2 rounded bg-gray-100 text-sm"
          >
            Finish Early
          </button>
        </div>
      </footer>

      <ProgressBar value={(index / questions.length) * 100} />
    </article>
  );
}

function ProgressBar({ value = 0 }) {
  return (
    <div className="mt-4" aria-hidden>
      <div className="w-full h-2 bg-gray-200 rounded">
        <div className="h-2 rounded" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: 'linear-gradient(90deg,#7c3aed,#06b6d4)' }} />
      </div>
    </div>
  );
}

function ResultsPage() {
  const [summary, setSummary] = useState(null);
  const [best, setBest] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const s = JSON.parse(localStorage.getItem('latestResult') || 'null');
    setSummary(s);
    const b = localStorage.getItem('quizHighScore');
    setBest(b ? parseInt(b, 10) : 0);
  }, []);

  if (!summary) {
    return (
      <div className="card bg-white rounded p-6">
        <h2 className="text-xl font-medium">No Results</h2>
        <p className="mt-2">You haven't completed a quiz yet. Start a new one.</p>
        <div className="mt-4 flex gap-2">
          <Link className="px-4 py-2 bg-indigo-600 text-white rounded" to="/quiz">Start Quiz</Link>
          <Link className="px-4 py-2 border rounded" to="/history">View History</Link>
        </div>
      </div>
    );
  }

  const { score, total, answers, timestamp, amount, difficulty } = summary;

  return (
    <div className="card bg-white rounded p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-semibold">Results</h2>
          <div className="text-sm text-gray-500">Your score</div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold">{score} / {total}</div>
          <div className="text-sm text-gray-500">High score: {best}</div>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-sm text-gray-500">Attempted at: {timestamp ? new Date(timestamp).toLocaleString() : '-'}</div>
        <div className="text-sm text-gray-500">Amount: {amount} · Difficulty: {difficulty}</div>
      </div>

      <div className="flex gap-3 mb-4">
        <button className="px-4 py-2 bg-indigo-600 text-white rounded" onClick={() => navigate('/quiz')}>Retry Quiz</button>
        <button className="px-4 py-2 border rounded" onClick={() => { localStorage.removeItem('quizHighScore'); setBest(0); }}>Clear High Score</button>
        <Link className="px-4 py-2 border rounded" to="/history">View History</Link>
      </div>

      <div className="space-y-3">
        {answers.map((a, i) => (
          <div key={i} className="p-3 border rounded bg-gray-50 flex justify-between items-start">
            <div>
              <div className="font-medium">Q{i + 1}. {a.question}</div>
              <div className="text-sm mt-1">Your Answer: <strong>{a.selected ?? (a.timedOut ? '(timed out)' : '-')}</strong></div>
              <div className="text-sm">Correct Answer: <strong>{a.correctAnswer}</strong></div>
            </div>
            <div className={`px-3 py-1 rounded text-sm font-medium ${a.correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {a.correct ? 'Correct' : 'Wrong'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const h = JSON.parse(localStorage.getItem('quizHistory') || '[]');
    setHistory(h);
  }, []);

  function viewAttempt(idx) {
    const h = JSON.parse(localStorage.getItem('quizHistory') || '[]');
    if (h[idx]) {
      localStorage.setItem('latestResult', JSON.stringify(h[idx]));
      navigate('/results');
    }
  }

  function clearHistory() {
    localStorage.removeItem('quizHistory');
    setHistory([]);
  }

  if (!history || history.length === 0) {
    return (
      <div className="card bg-white rounded p-6">
        <h2 className="text-xl font-medium">History</h2>
        <p className="mt-2">No attempts yet. Take a quiz to create history.</p>
        <div className="mt-4">
          <Link className="px-4 py-2 bg-indigo-600 text-white rounded" to="/quiz">Start Quiz</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-white rounded p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-medium">History</h2>
        <div>
          <button className="px-3 py-1 border rounded" onClick={clearHistory}>Clear</button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {history.map((h, i) => (
          <div key={i} className="p-3 border rounded flex justify-between items-center">
            <div>
              <div className="font-medium">Attempt {history.length - i} · {new Date(h.timestamp).toLocaleString()}</div>
              <div className="text-sm text-gray-500">Score: {h.score} / {h.total} · Amount: {h.amount} · Difficulty: {h.difficulty}</div>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 border rounded" onClick={() => viewAttempt(i)}>View</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="card bg-white rounded p-6">
      <h2 className="text-xl font-medium">404 – Not found</h2>
      <p className="mt-2">Try going back to home.</p>
      <div className="mt-4">
        <Link className="px-4 py-2 bg-indigo-600 text-white rounded" to="/">Home</Link>
      </div>
    </div>
  );
}