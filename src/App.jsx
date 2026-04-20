import { useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'sixty_day_growth_tracker_v3';
const DAYS = 60;
const PEOPLE = [
  { id: 'nachiket', name: 'Nachiket' },
  { id: 'preet', name: 'Preet' },
];
const ROUTINE_OPTIONS = [
  { key: 'DSA', label: 'DSA', accent: '#6c63ff' },
  { key: 'Mock', label: 'Mock', accent: '#f97316' },
  { key: 'System Design', label: 'System Design', accent: '#06b6d4' },
  {
    key: 'Course',
    label: 'Course - AlgoZenith Java Full Stack',
    accent: '#22c55e',
  },
  { key: 'Project', label: 'Project', accent: '#ef4444' },
];

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEmptyDay(dayNumber) {
  return {
    day: dayNumber,
    routines: [],
    internshipStatus: '',
    internshipNote: '',
    leetcodeId: '',
    leetcodeProfileData: null,
    leetcodeLastFetchedAt: '',
    leetcodeError: '',
    notes: '',
    completed: false,
  };
}

function createEmptyPerson(person) {
  return {
    id: person.id,
    name: person.name,
    startDate: getLocalDateString(),
    selectedDay: 1,
    leetcodeId: '',
    leetcodeProfileData: null,
    leetcodeLastFetchedAt: '',
    leetcodeError: '',
    days: Array.from({ length: DAYS }, (_, index) => createEmptyDay(index + 1)),
  };
}

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function migratePerson(parsedPerson, person) {
  const sourceDays = Array.isArray(parsedPerson?.days) ? parsedPerson.days : [];
  return {
    ...createEmptyPerson(person),
    ...(parsedPerson || {}),
    id: person.id,
    name: person.name,
    selectedDay: Math.min(
      DAYS,
      Math.max(1, Number(parsedPerson?.selectedDay) || 1)
    ),
    startDate: parsedPerson?.startDate || getLocalDateString(),
    days: Array.from({ length: DAYS }, (_, index) => migrateDay(sourceDays[index] || {}, index + 1)),
    leetcodeId: parsedPerson?.leetcodeId || '',
    leetcodeProfileData: parsedPerson?.leetcodeProfileData || null,
    leetcodeLastFetchedAt: parsedPerson?.leetcodeLastFetchedAt || '',
    leetcodeError: parsedPerson?.leetcodeError || '',
  };
}

function migrateDay(day, dayNumber) {
  const routines = Array.isArray(day.routines)
    ? day.routines
    : ROUTINE_OPTIONS.filter((option) => day[`${option.key}Done`]).map((option) => ({
        id: uid(),
        key: option.key,
        label: option.label,
        done: true,
      }));

  return {
    ...createEmptyDay(dayNumber),
    ...day,
    routines: routines.map((item) => ({
      id: item.id || uid(),
      key: item.key || item.label,
      label: item.label || item.key || 'Routine',
      done: Boolean(item.done),
      custom: Boolean(item.custom || String(item.key || '').startsWith('custom-')),
    })),
    leetcodeId: day.leetcodeId || day.leetcodeProfile || '',
    leetcodeProfileData: day.leetcodeProfileData || null,
    leetcodeLastFetchedAt: day.leetcodeLastFetchedAt || '',
    leetcodeError: day.leetcodeError || '',
    internshipStatus: day.internshipStatus || '',
    notes: day.notes || '',
    completed: Boolean(day.completed),
    day: dayNumber,
  };
}

function loadState() {
  if (typeof window === 'undefined') {
    return {
      activePersonId: PEOPLE[0].id,
      activeSection: 'tracking',
      people: PEOPLE.reduce((acc, person) => {
        acc[person.id] = createEmptyPerson(person);
        return acc;
      }, {}),
    };
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {
      activePersonId: PEOPLE[0].id,
      activeSection: 'tracking',
      people: PEOPLE.reduce((acc, person) => {
        acc[person.id] = createEmptyPerson(person);
        return acc;
      }, {}),
    };
  }
  const parsed = safeParse(raw);
  if (!parsed) {
    return {
      activePersonId: PEOPLE[0].id,
      activeSection: 'tracking',
      people: PEOPLE.reduce((acc, person) => {
        acc[person.id] = createEmptyPerson(person);
        return acc;
      }, {}),
    };
  }

  if (parsed.people && typeof parsed.people === 'object') {
    return {
      activePersonId: parsed.activePersonId && PEOPLE.some((person) => person.id === parsed.activePersonId)
        ? parsed.activePersonId
        : PEOPLE[0].id,
      activeSection: parsed.activeSection === 'daily' ? 'daily' : 'tracking',
      people: PEOPLE.reduce((acc, person) => {
        acc[person.id] = migratePerson(parsed.people[person.id] || {}, person);
        return acc;
      }, {}),
    };
  }

  const legacyPerson = migratePerson(parsed, PEOPLE[0]);
  return {
    activePersonId: PEOPLE[0].id,
    activeSection: parsed.activeSection === 'daily' ? 'daily' : 'tracking',
    people: {
      [PEOPLE[0].id]: legacyPerson,
      [PEOPLE[1].id]: createEmptyPerson(PEOPLE[1]),
    },
  };
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function addDays(date, offset) {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
}

function Card({ className = '', children }) {
  return <section className={`card ${className}`}>{children}</section>;
}

function formatCount(done, total) {
  return `${done}/${total}`;
}

function getDayStats(day) {
  const routinesDone = day.routines.filter((item) => item.done).length;
  return {
    routinesDone,
    routinesTotal: day.routines.length,
    completed: day.completed,
    completionTotal: routinesDone + (day.completed ? 1 : 0),
  };
}

function ProgressBar({ value, color }) {
  return (
    <div className="progress-shell">
      <span className="progress-line" style={{ width: `${Math.max(8, value)}%`, background: color }} />
    </div>
  );
}

function App() {
  const [state, setState] = useState(loadState);
  const [leetcodeFetching, setLeetcodeFetching] = useState(false);
  const [manualRoutineDraft, setManualRoutineDraft] = useState('');
  const [dayMenuOpen, setDayMenuOpen] = useState(false);
  const dayPickerRef = useRef(null);
  const todayString = getLocalDateString();

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (dayPickerRef.current && !dayPickerRef.current.contains(event.target)) {
        setDayMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const activeSection = state.activeSection === 'daily' ? 'daily' : 'tracking';
  const activePersonId = state.activePersonId && state.people[state.activePersonId] ? state.activePersonId : PEOPLE[0].id;
  const activePerson = state.people[activePersonId] || createEmptyPerson(PEOPLE[0]);
  const selectedDay = activePerson.selectedDay || 1;
  const currentDay = activePerson.days[selectedDay - 1] || activePerson.days[0];
  const globalLeetCode = activePerson.leetcodeProfileData;
  const startDate = useMemo(
    () => new Date(`${activePerson.startDate || todayString}T00:00:00`),
    [activePerson.startDate, todayString]
  );
  const heroContent =
    activeSection === 'tracking'
      ? {
          badge: 'Tracking',
          title: 'Progress board',
          copy: `Track routine progress, day-by-day momentum, and ${activePerson.name}'s global LeetCode profile in one calm dashboard.`,
        }
      : {
          badge: 'Daily Task',
          title: 'Daily routine',
          copy: `Manage one focused day at a time for ${activePerson.name} with the same day navigator and the same global LeetCode profile.`,
        };
  const changeDay = (delta) => {
    setState((current) => {
      const person = current.people[activePersonId] || createEmptyPerson(PEOPLE[0]);
      return {
        ...current,
        people: {
          ...current.people,
          [activePersonId]: {
            ...person,
            selectedDay: Math.min(DAYS, Math.max(1, person.selectedDay + delta)),
          },
        },
      };
    });
  };

  function setSelectedDayForActivePerson(dayNumber) {
    setState((current) => ({
      ...current,
      people: {
        ...current.people,
        [activePersonId]: {
          ...current.people[activePersonId],
          selectedDay: Math.min(DAYS, Math.max(1, dayNumber)),
        },
      },
    }));
    setDayMenuOpen(false);
  }

  const derived = useMemo(() => {
    const totals = activePerson.days.reduce(
      (acc, day) => {
        const stats = getDayStats(day);
        acc.completedDays += day.completed ? 1 : 0;
        acc.routinesDone += stats.routinesDone;
        acc.routines += stats.routinesTotal;
        return acc;
      },
      {
        completedDays: 0,
        routinesDone: 0,
        routines: 0,
      }
    );

    const completionRate = Math.round((totals.completedDays / DAYS) * 100);
    const routineRate = totals.routines ? Math.round((totals.routinesDone / totals.routines) * 100) : 0;
    const selectedDate = formatDate(addDays(startDate, selectedDay - 1));
    const dayStats = getDayStats(currentDay);

    return {
      ...totals,
      completionRate,
      routineRate,
      selectedDate,
      dayStats,
    };
  }, [activePerson.days, currentDay, selectedDay, startDate]);

  const routineCards = useMemo(() => {
    return ROUTINE_OPTIONS.map((option) => {
      const doneDays = activePerson.days.filter((day) =>
        day.routines.some((item) => item.key === option.key && item.done)
      ).length;
      const activeDays = activePerson.days.filter((day) =>
        day.routines.some((item) => item.key === option.key)
      ).length;
      const progress = Math.round((doneDays / DAYS) * 100);
      return {
        ...option,
        doneDays,
        activeDays,
        progress,
      };
    }).filter((option) => option.activeDays > 0);
  }, [activePerson.days]);

  const customRoutineCard = useMemo(() => {
    const customItems = activePerson.days.flatMap((day) =>
      day.routines.filter((item) => item.custom || String(item.key || '').startsWith('custom-'))
    );
    const customLabels = [...new Set(customItems.map((item) => item.label).filter(Boolean))];
    const doneCount = customItems.filter((item) => item.done).length;
    const activeDays = new Set(
      activePerson.days.filter((day) =>
        day.routines.some((item) => item.custom || String(item.key || '').startsWith('custom-'))
      ).map((day) => day.day)
    ).size;
    return {
      labels: customLabels,
      title: customLabels.length === 1 ? customLabels[0] : 'Custom tasks',
      total: customItems.length,
      doneCount,
      activeDays,
      progress: customItems.length ? Math.round((doneCount / customItems.length) * 100) : 0,
    };
  }, [activePerson.days]);

  const series = useMemo(() => {
    const max = Math.max(1, ...activePerson.days.map((day) => getDayStats(day).completionTotal));
    const width = 740;
    const height = 280;
    const padX = 34;
    const padY = 20;
    const usableWidth = width - padX * 2;
    const usableHeight = height - padY * 2;

    const points = activePerson.days.map((day, index) => {
      const metric = getDayStats(day).completionTotal;
      const x = padX + (index / (DAYS - 1)) * usableWidth;
      const y = padY + usableHeight - (metric / max) * usableHeight;
      return { x, y, metric };
    });

    const line = points.map((point) => `${point.x},${point.y}`).join(' ');
    const area = `M ${padX} ${height - padY} L ${points.map((p) => `${p.x} ${p.y}`).join(' L ')} L ${width - padX} ${height - padY} Z`;
    return { points, line, area, width, height, max };
  }, [activePerson.days]);

  const selectedRoutineIds = currentDay.routines.map((item) => item.key);
  const selectedRoutineCount = currentDay.routines.length;
  const profile = globalLeetCode;
  const activePersonInfo = PEOPLE.find((person) => person.id === activePersonId) || PEOPLE[0];

  function updateDay(dayNumber, field, value) {
    setState((current) => ({
      ...current,
      people: {
        ...current.people,
        [activePersonId]: {
          ...current.people[activePersonId],
          days: current.people[activePersonId].days.map((day) =>
            day.day === dayNumber ? { ...day, [field]: value } : day
          ),
        },
      },
    }));
  }

  function updateDayWithTransform(dayNumber, transform) {
    setState((current) => ({
      ...current,
      people: {
        ...current.people,
        [activePersonId]: {
          ...current.people[activePersonId],
          days: current.people[activePersonId].days.map((day) =>
            day.day === dayNumber ? transform(day) : day
          ),
        },
      },
    }));
  }

  function toggleRoutine(dayNumber, optionKey) {
    updateDayWithTransform(dayNumber, (day) => {
      const exists = day.routines.some((item) => item.key === optionKey);
      if (exists) {
        return { ...day, routines: day.routines.filter((item) => item.key !== optionKey) };
      }
      const option = ROUTINE_OPTIONS.find((item) => item.key === optionKey);
      if (!option) return day;
      return {
        ...day,
        routines: [...day.routines, { id: uid(), key: option.key, label: option.label, done: false }],
      };
    });
  }

  function addManualRoutine(dayNumber) {
    const label = manualRoutineDraft.trim();
    if (!label) return;

    updateDayWithTransform(dayNumber, (day) => ({
      ...day,
      routines: [...day.routines, { id: uid(), key: `custom-${label.toLowerCase()}-${uid()}`, label, done: false, custom: true }],
    }));
    setManualRoutineDraft('');
  }

  function removeRoutine(dayNumber, routineId) {
    updateDayWithTransform(dayNumber, (day) => ({
      ...day,
      routines: day.routines.filter((item) => item.id !== routineId),
    }));
  }

  function toggleRoutineDone(dayNumber, routineId) {
    updateDayWithTransform(dayNumber, (day) => ({
      ...day,
      routines: day.routines.map((item) =>
        item.id === routineId ? { ...item, done: !item.done } : item
      ),
    }));
  }

  function toggleComplete(dayNumber) {
    updateDayWithTransform(dayNumber, (day) => ({
      ...day,
      completed: !day.completed,
    }));
  }

  async function fetchLeetCodeProfile(dayNumber) {
    const username = activePerson.leetcodeId?.trim();
    if (!username) return;

    setLeetcodeFetching(true);
    setState((current) => ({ ...current, leetcodeError: '' }));

    try {
    const response = await fetch(`https://leetcode-stats.tashif.codes/${encodeURIComponent(username)}/profile`);
      if (!response.ok) {
        throw new Error(`LeetCode lookup failed (${response.status})`);
      }
      const data = await response.json();
      if (data.status !== 'success') {
        throw new Error(data.message || 'Unable to fetch profile');
      }

      setState((current) => ({
        ...current,
        people: {
          ...current.people,
          [activePersonId]: {
            ...current.people[activePersonId],
            leetcodeId: username,
            leetcodeProfileData: data,
            leetcodeLastFetchedAt: new Date().toISOString(),
            leetcodeError: '',
          },
        },
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        people: {
          ...current.people,
          [activePersonId]: {
            ...current.people[activePersonId],
            leetcodeError: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      }));
    } finally {
      setLeetcodeFetching(false);
    }
  }

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div>
            <strong>skillup</strong>
            <span>60 day tracker</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            type="button"
            className={`nav-item ${activeSection === 'tracking' ? 'active' : ''}`}
            onClick={() =>
              setState((current) => ({
                ...current,
                activeSection: 'tracking',
              }))
            }
          >
            <span>Tracking</span>
          </button>
          <button
            type="button"
            className={`nav-item ${activeSection === 'daily' ? 'active' : ''}`}
            onClick={() =>
              setState((current) => ({
                ...current,
                activeSection: 'daily',
              }))
            }
          >
            <span>Daily Task</span>
          </button>
        </nav>

        <div className="sidebar-card">
          <p>Active profile</p>
          <strong>{activePersonInfo.name}</strong>
          <span>{derived.completedDays} of {DAYS} days done</span>
          <div className="profile-switcher">
            {PEOPLE.map((person) => (
              <button
                key={person.id}
                type="button"
                className={`profile-pill ${activePersonId === person.id ? 'active' : ''}`}
                onClick={() =>
                  setState((current) => ({
                    ...current,
                    activePersonId: person.id,
                  }))
                }
              >
                {person.name}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="clear-data-button"
            onClick={() => {
              const confirmClear = window.confirm(
                `Clear all data for ${activePersonInfo.name}? This will reset their 60-day progress.`
              );
              if (!confirmClear) return;
              setState((current) => ({
                ...current,
                people: {
                  ...current.people,
                  [activePersonId]: createEmptyPerson(activePersonInfo),
                },
              }));
            }}
          >
            Clear data
          </button>
        </div>
      </aside>

      <main className="main-area">
        <Card className="mode-hero">
          <div className="mode-hero-copy">
            <p className="eyebrow">{heroContent.badge}</p>
            <h1>{heroContent.title}</h1>
          </div>
          <div className="mode-hero-meta">
            <div className="top-day-picker" ref={dayPickerRef}>
              <span>Change day</span>
              <div className="day-select-shell">
                <button
                  type="button"
                  className="day-step"
                  onClick={() => changeDay(-1)}
                  disabled={selectedDay === 1}
                  aria-label="Previous day"
                >
                  &lt;
                </button>
                <button
                  type="button"
                  className="day-trigger"
                  onClick={() => setDayMenuOpen((current) => !current)}
                  aria-expanded={dayMenuOpen}
                >
                  Day {selectedDay}
                </button>
                <button
                  type="button"
                  className="day-step"
                  onClick={() => changeDay(1)}
                  disabled={selectedDay === DAYS}
                  aria-label="Next day"
                >
                  &gt;
                </button>
              </div>
              {dayMenuOpen ? (
                <div className="day-menu">
                  {activePerson.days.map((day) => (
                    <button
                      key={day.day}
                      type="button"
                      className={`day-menu-item ${
                        day.completed ? 'done' : 'pending'
                      } ${selectedDay === day.day ? 'selected' : ''}`}
                      onClick={() => setSelectedDayForActivePerson(day.day)}
                    >
                      <span>Day {day.day}</span>
                      <small>{day.completed ? 'Completed' : 'Not done'}</small>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="avatar-chip">
              <span>{String(selectedDay).padStart(2, '0')}</span>
            </div>
          </div>
        </Card>

        {activeSection === 'tracking' ? (
          <section className="tracking-layout">
            {routineCards.length || customRoutineCard.total ? (
              <section className="routine-row">
                {routineCards.map((routine) => (
                  <article className="routine-card" key={routine.key}>
                    <div className="routine-top">
                      <div className="routine-badge" style={{ background: `${routine.accent}18`, color: routine.accent }}>
                        {routine.label[0]}
                      </div>
                      <span>{routine.progress}% Complete</span>
                    </div>
                    <h3>{routine.label}</h3>
                    <p>{routine.doneDays}/{DAYS} days completed</p>
                    <ProgressBar value={routine.progress} color={routine.accent} />
                  </article>
                ))}
                {customRoutineCard.total ? (
                  <article className="routine-card custom-routine-card">
                    <div className="routine-top">
                      <div className="routine-badge" style={{ background: 'rgba(37, 111, 99, 0.14)', color: '#256f63' }}>
                        C
                      </div>
                      <span>{customRoutineCard.progress}% Complete</span>
                    </div>
                    <h3>{customRoutineCard.title}</h3>
                    <p>{customRoutineCard.doneCount}/{customRoutineCard.total} tasks completed</p>
                    <ProgressBar value={customRoutineCard.progress} color="#256f63" />
                  </article>
                ) : null}
              </section>
            ) : (
              <Card className="empty-selection-card">
                <h2>No routines selected yet</h2>
                <p>Choose routines on the Daily Task page and they will appear here.</p>
              </Card>
            )}

            <section className="analytics-grid tracking-grid">
              <Card className="chart-card">
                <div className="section-header">
                  <div>
                    <p className="section-kicker">Progress</p>
                    <h2>Completion Trend</h2>
                  </div>
                  <span className="section-chip">{derived.routineRate}% routines done</span>
                </div>

                <div className="chart-wrap">
                  <svg viewBox={`0 0 ${series.width} ${series.height}`} className="line-chart" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="rgba(108, 99, 255, 0.32)" />
                        <stop offset="100%" stopColor="rgba(108, 99, 255, 0.03)" />
                      </linearGradient>
                    </defs>
                    {[0.2, 0.4, 0.6, 0.8].map((tick) => {
                      const y = 20 + (series.height - 40) * (1 - tick);
                      return <line key={tick} x1="32" x2={series.width - 32} y1={y} y2={y} className="grid-line" />;
                    })}
                    <path d={series.area} fill="url(#areaFill)" />
                    <polyline points={series.line} fill="none" stroke="#6c63ff" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
                    {series.points.map((point, index) => (
                      <circle key={index} cx={point.x} cy={point.y} r="4.5" className="chart-dot" />
                    ))}
                  </svg>
                  <div className="chart-footer">
                    <span>Jan</span>
                    <span>Mar</span>
                    <span>May</span>
                    <span>Jul</span>
                    <span>Sep</span>
                  </div>
                </div>
              </Card>

              <Card className="profile-card tracking-profile-card">
                <div className="section-header compact">
                  <div>
                    <p className="section-kicker">LeetCode</p>
                    <h2>Profile Snapshot</h2>
                  </div>
                </div>

                <div className="profile-inputs">
                  <label className="field">
                    <span>LeetCode ID</span>
                <input
                      type="text"
                      value={activePerson.leetcodeId}
                      onChange={(event) =>
                        setState((current) => ({
                          ...current,
                          people: {
                            ...current.people,
                            [activePersonId]: {
                              ...current.people[activePersonId],
                              leetcodeId: event.target.value,
                              leetcodeError: '',
                            },
                          },
                        }))
                      }
                      placeholder="your-id"
                    />
                  </label>
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => fetchLeetCodeProfile(selectedDay)}
                    disabled={leetcodeFetching}
                  >
                    {leetcodeFetching ? 'Fetching...' : 'Fetch profile'}
                  </button>
                  {activePerson.leetcodeError ? <p className="error-state">{activePerson.leetcodeError}</p> : null}
                </div>

                {profile ? (
                  <div className="leetcode-panel">
                    <div className="leetcode-head">
                      <img src={profile.profile?.userAvatar} alt={profile.username} />
                      <div>
                        <h3>{profile.profile?.realName || profile.username}</h3>
                        <p>@{profile.username}</p>
                      </div>
                    </div>
                    <div className="profile-metrics">
                      <div>
                        <span>Solved</span>
                        <strong>{profile.totalSolved ?? '-'}</strong>
                      </div>
                      <div>
                        <span>Acceptance</span>
                        <strong>{profile.acceptanceRate != null ? `${profile.acceptanceRate}%` : '-'}</strong>
                      </div>
                      <div>
                        <span>Ranking</span>
                        <strong>{profile.ranking ?? '-'}</strong>
                      </div>
                      <div>
                        <span>Rating</span>
                        <strong>{profile.profile?.starRating ?? profile.contestRating ?? '-'}</strong>
                      </div>
                    </div>
                  </div>
                ) : null}
              </Card>
            </section>
          </section>
        ) : (
          <Card className="control-card daily-view-card">
            <div className="section-header">
              <div>
                <p className="section-kicker">Daily Task</p>
                <h2>Day {selectedDay} routine</h2>
              </div>
              <button type="button" className="mini-pill" onClick={() => toggleComplete(selectedDay)}>
                {currentDay.completed ? 'Completed' : 'Mark complete'}
              </button>
            </div>

            <div className="control-grid daily-grid">
              <div className="control-panel">
                <div className="control-panel-head">
                  <div>
                    <h3>Routine</h3>
                    <p>{selectedRoutineCount} routines selected today</p>
                  </div>
                </div>
                <form
                  className="inline-add"
                  onSubmit={(event) => {
                    event.preventDefault();
                    addManualRoutine(selectedDay);
                  }}
                >
                  <input
                    type="text"
                    value={manualRoutineDraft}
                    onChange={(event) => setManualRoutineDraft(event.target.value)}
                    placeholder="Add a custom routine"
                  />
                  <button type="submit" className="button button-secondary">
                    Add
                  </button>
                </form>
                <div className="routine-toggle-grid">
                  {ROUTINE_OPTIONS.map((option) => {
                    const selected = selectedRoutineIds.includes(option.key);
                    return (
                      <button
                        key={option.key}
                        type="button"
                        className={`routine-toggle ${selected ? 'active' : ''}`}
                        onClick={() => toggleRoutine(selectedDay, option.key)}
                      >
                        <span>{option.label}</span>
                        <small>Routine</small>
                      </button>
                    );
                  })}
                </div>
                <div className="selected-list">
                  {currentDay.routines.length ? (
                    currentDay.routines.map((item) => (
                      <label key={item.id} className={`selected-item ${item.done ? 'done' : ''}`}>
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() => toggleRoutineDone(selectedDay, item.id)}
                        />
                        <span>{item.label}</span>
                        {item.custom ? (
                          <button
                            type="button"
                            className="remove-routine"
                            onClick={() => removeRoutine(selectedDay, item.id)}
                            aria-label={`Remove ${item.label}`}
                          >
                            Remove
                          </button>
                        ) : null}
                      </label>
                    ))
                  ) : (
                    <p className="empty-state">No routine selected.</p>
                  )}
                </div>
              </div>

              <div className="control-panel daily-summary-panel">
                <div className="control-panel-head">
                  <div>
                    <h3>Day overview</h3>
                    <p>{derived.selectedDate}</p>
                  </div>
                  <span className="summary-chip">{selectedDay} / {DAYS}</span>
                </div>

                <div className="daily-metrics">
                  <div>
                    <span>Routines done</span>
                    <strong>{derived.dayStats.routinesDone}</strong>
                  </div>
                  <div>
                    <span>Selected tasks</span>
                    <strong>{currentDay.routines.length}</strong>
                  </div>
                  <div>
                    <span>Completed</span>
                    <strong>{derived.dayStats.completed ? 'Yes' : 'No'}</strong>
                  </div>
                  <div>
                    <span>Status</span>
                    <strong>{currentDay.completed ? 'Done' : 'Open'}</strong>
                  </div>
                </div>

                <div className="daily-summary-note">
                  Keep this day focused. Routine choices here still count toward the full 60-day tracker.
                </div>
              </div>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}

export default App;
