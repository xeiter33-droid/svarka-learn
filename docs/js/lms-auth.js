(() => {
  const USERS_KEY = "svarka_lms_users_v1";
  const SESSION_KEY = "svarka_lms_session_v1";
  const ASSIGN_KEY = "svarka_lms_assignments_v1";
  const CONTENT_KEY = "svarka_lms_content_overlay_v1";

  const ADMIN = {
    id: "admin",
    login: "admin",
    name: "Администратор",
    role: "admin",
    // password: AdminSvarka2024!
    passHash: "8f3c2a1b9e0d7c6a5b4e3d2c1a0f9e8d7c6b5a4938271605f4e3d2c1b0a9",
  };

  function simpleHash(str) {
    let h = 2166136261;
    const s = String(str);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16).padStart(8, "0") +
      Array.from(s).reduce((a, c) => a + c.charCodeAt(0), 0).toString(16);
  }

  // Precompute expected admin hash once
  const ADMIN_PASS = "AdminSvarka2024!";
  ADMIN.passHash = simpleHash(ADMIN_PASS);

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function ensureSeed() {
    const users = readJson(USERS_KEY, []);
    if (!users.some((u) => u.login === "admin")) {
      users.unshift({
        id: ADMIN.id,
        login: ADMIN.login,
        name: ADMIN.name,
        role: "admin",
        passHash: ADMIN.passHash,
        createdAt: new Date().toISOString(),
        progress: {},
        quizResults: {},
      });
      writeJson(USERS_KEY, users);
    }
    return users;
  }

  function getUsers() {
    return ensureSeed();
  }

  function saveUsers(users) {
    writeJson(USERS_KEY, users);
  }

  function findUser(login) {
    return getUsers().find((u) => u.login.toLowerCase() === String(login).toLowerCase());
  }

  function getSession() {
    const id = localStorage.getItem(SESSION_KEY);
    if (!id) return null;
    return getUsers().find((u) => u.id === id) || null;
  }

  function setSession(userId) {
    if (userId) localStorage.setItem(SESSION_KEY, userId);
    else localStorage.removeItem(SESSION_KEY);
  }

  function register({ login, password, name }) {
    const cleanLogin = String(login || "").trim();
    const cleanName = String(name || "").trim();
    const pass = String(password || "");
    if (cleanLogin.length < 3) return { ok: false, error: "Логин — минимум 3 символа" };
    if (pass.length < 4) return { ok: false, error: "Пароль — минимум 4 символа" };
    if (!cleanName) return { ok: false, error: "Укажите имя" };
    if (findUser(cleanLogin)) return { ok: false, error: "Такой логин уже занят" };

    const users = getUsers();
    const user = {
      id: "u_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      login: cleanLogin,
      name: cleanName,
      role: "student",
      passHash: simpleHash(pass),
      createdAt: new Date().toISOString(),
      progress: {},
      quizResults: {},
    };
    users.push(user);
    saveUsers(users);
    setSession(user.id);
    return { ok: true, user };
  }

  function login(loginName, password) {
    const user = findUser(loginName);
    if (!user) return { ok: false, error: "Пользователь не найден" };
    if (user.passHash !== simpleHash(password)) return { ok: false, error: "Неверный пароль" };
    setSession(user.id);
    return { ok: true, user };
  }

  function logout() {
    setSession(null);
  }

  function updateUser(userId, patch) {
    const users = getUsers();
    const i = users.findIndex((u) => u.id === userId);
    if (i < 0) return null;
    users[i] = { ...users[i], ...patch, id: users[i].id, login: users[i].login };
    saveUsers(users);
    return users[i];
  }

  function markLessonComplete(userId, courseId, lessonId) {
    const users = getUsers();
    const u = users.find((x) => x.id === userId);
    if (!u) return null;
    u.progress = u.progress || {};
    u.progress[courseId] = u.progress[courseId] || { lessons: {}, quiz: null };
    const prev = u.progress[courseId].lessons[lessonId] || {};
    u.progress[courseId].lessons[lessonId] = {
      ...prev,
      done: true,
      at: new Date().toISOString(),
    };
    saveUsers(users);
    return u;
  }

  function saveLessonQuiz(userId, courseId, lessonId, result) {
    const users = getUsers();
    const u = users.find((x) => x.id === userId);
    if (!u) return null;
    u.progress = u.progress || {};
    u.progress[courseId] = u.progress[courseId] || { lessons: {}, quiz: null };
    const prev = u.progress[courseId].lessons[lessonId] || {};
    u.progress[courseId].lessons[lessonId] = {
      ...prev,
      miniQuiz: { ...result, at: new Date().toISOString() },
      done: prev.done || !!result.passed,
    };
    u.quizResults = u.quizResults || {};
    u.quizResults[result.quizId || `${courseId}:${lessonId}`] = u.progress[courseId].lessons[lessonId].miniQuiz;
    saveUsers(users);
    return u;
  }

  function saveQuizResult(userId, courseId, result) {
    const users = getUsers();
    const u = users.find((x) => x.id === userId);
    if (!u) return null;
    u.progress = u.progress || {};
    u.progress[courseId] = u.progress[courseId] || { lessons: {}, quiz: null };
    u.progress[courseId].quiz = {
      ...result,
      at: new Date().toISOString(),
    };
    u.quizResults = u.quizResults || {};
    u.quizResults[result.quizId || courseId] = u.progress[courseId].quiz;
    saveUsers(users);
    return u;
  }

  function courseStats(user, course) {
    const p = (user && user.progress && user.progress[course.id]) || { lessons: {}, quiz: null };
    const total = course.lessons.length;
    const done = course.lessons.filter((l) => p.lessons?.[l.id]?.done).length;
    const quiz = p.quiz;
    const quizPassed = !!(quiz && quiz.passed);
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { total, done, pct, quiz, quizPassed, allLessonsDone: done === total };
  }

  function getAssignments() {
    return readJson(ASSIGN_KEY, []);
  }

  function saveAssignments(list) {
    writeJson(ASSIGN_KEY, list);
  }

  function addAssignment({ title, courseId, lessonId, userIds, due, note }) {
    const list = getAssignments();
    const item = {
      id: "a_" + Date.now().toString(36),
      title: String(title || "").trim() || "Задание",
      courseId,
      lessonId: lessonId || null,
      userIds: userIds || [],
      due: due || null,
      note: note || "",
      createdAt: new Date().toISOString(),
    };
    list.unshift(item);
    saveAssignments(list);
    return item;
  }

  function getContentOverlay() {
    return readJson(CONTENT_KEY, { lessons: {}, courses: {} });
  }

  function saveContentOverlay(data) {
    writeJson(CONTENT_KEY, data);
  }

  function upsertLessonOverlay(courseId, lesson) {
    const data = getContentOverlay();
    data.lessons = data.lessons || {};
    data.lessons[lesson.id] = { ...lesson, courseId, updatedAt: new Date().toISOString() };
    saveContentOverlay(data);
    return data;
  }

  function exportAll() {
    return {
      exportedAt: new Date().toISOString(),
      users: getUsers().map((u) => ({ ...u, passHash: undefined })),
      usersFull: getUsers(),
      assignments: getAssignments(),
      contentOverlay: getContentOverlay(),
    };
  }

  function importAll(payload, { merge = true } = {}) {
    if (!payload || typeof payload !== "object") return { ok: false, error: "Пустой файл" };
    if (payload.usersFull && Array.isArray(payload.usersFull)) {
      if (merge) {
        const map = new Map(getUsers().map((u) => [u.id, u]));
        for (const u of payload.usersFull) map.set(u.id, u);
        saveUsers([...map.values()]);
      } else {
        saveUsers(payload.usersFull);
      }
    }
    if (payload.assignments) saveAssignments(payload.assignments);
    if (payload.contentOverlay) saveContentOverlay(payload.contentOverlay);
    return { ok: true };
  }

  window.LMS_AUTH = {
    ADMIN_LOGIN: "admin",
    ADMIN_PASS,
    simpleHash,
    getUsers,
    getSession,
    register,
    login,
    logout,
    updateUser,
    markLessonComplete,
    saveLessonQuiz,
    saveQuizResult,
    courseStats,
    getAssignments,
    addAssignment,
    saveAssignments,
    getContentOverlay,
    upsertLessonOverlay,
    exportAll,
    importAll,
  };
})();
