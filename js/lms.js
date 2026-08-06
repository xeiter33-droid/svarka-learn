(() => {
  const Auth = window.LMS_AUTH;
  const Data = window.LMS_DATA;

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function currentUser() {
    return Auth.getSession();
  }

  function requireAuth(htmlGuest) {
    const u = currentUser();
    if (!u) return { user: null, html: htmlGuest };
    return { user: u, html: null };
  }

  function authBar(user) {
    if (!user) {
      return `
        <div class="lms-authbar">
          <span class="muted">Войдите, чтобы сохранять прогресс</span>
          <a class="btn btn-ghost" href="#/login" data-nav>Вход</a>
          <a class="btn btn-primary" href="#/register" data-nav>Регистрация</a>
        </div>`;
    }
    return `
      <div class="lms-authbar">
        <span><strong>${esc(user.name)}</strong>
          <span class="tag">${user.role === "admin" ? "админ" : "слушатель"}</span>
        </span>
        ${user.role === "admin" ? `<a class="btn btn-ghost" href="#/admin" data-nav>Админ-панель</a>` : ""}
        <a class="btn btn-ghost" href="#/cabinet" data-nav>Кабинет</a>
        <button type="button" class="btn btn-ghost" id="lmsLogout">Выйти</button>
      </div>`;
  }

  function mergeLesson(course, lesson) {
    const overlay = Auth.getContentOverlay();
    const extra = overlay.lessons?.[lesson.id];
    if (!extra) return lesson;
    return {
      ...lesson,
      title: extra.title || lesson.title,
      html: extra.html || lesson.html,
      images: extra.images || lesson.images,
      minutes: extra.minutes || lesson.minutes,
    };
  }

  function progressBar(pct) {
    return `
      <div class="lms-progress" aria-label="Прогресс ${pct}%">
        <span style="width:${pct}%"></span>
      </div>
      <div class="lms-progress-label">${pct}%</div>`;
  }

  function renderLearnHome() {
    const user = currentUser();
    const courses = Data.courses || [];
    const cards = courses
      .map((c) => {
        const st = Auth.courseStats(user, c);
        return `
          <a class="lms-course-card" href="#/course/${esc(c.id)}" data-nav style="--course:${esc(c.color)}">
            <strong>${esc(c.title)}</strong>
            <span class="muted">${esc(c.short)}</span>
            ${user ? progressBar(st.pct) : `<span class="muted">Уроков: ${c.lessons.length} · тест после блока</span>`}
            ${st.quizPassed ? `<span class="tag ok">тест сдан</span>` : ""}
          </a>`;
      })
      .join("");

    return `
      <section class="hero lms-hero">
        <div class="hero-panel">
          <p class="hero-kicker">Учёба · ГОСТ · пособия</p>
          <h1>Сварка</h1>
          <p class="hero-lead">
            Лекции и тесты по РДС, аргонодуговой и полуавтоматической сварке,
            плюс материаловедение с расшифровкой марок.
          </p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="#/course/mma" data-nav>Начать с РДС</a>
            <a class="btn btn-ghost" href="#/course/materials" data-nav>Марки сталей</a>
            ${!user ? `<a class="btn btn-ghost" href="#/register" data-nav>Регистрация</a>` : ""}
          </div>
        </div>
      </section>
      ${authBar(user)}
      <div class="page-head">
        <h2>Курсы</h2>
        <p class="note">Материалы подготовлены по учебным пособиям и ГОСТ. Иллюстрации — из учебных источников (Васильев, 2011 и др.).</p>
      </div>
      <div class="lms-course-grid">${cards}</div>
      <div class="card" style="margin-top:1.25rem">
        <h3>Источники</h3>
        <ul class="source-list">
          ${(Data.sources || []).map((s) => `<li>${esc(s)}</li>`).join("")}
        </ul>
      </div>`;
  }

  function renderLogin() {
    return `
      ${authBar(currentUser())}
      <div class="page-head"><h1>Вход</h1><p>Сохранение прогресса на этом устройстве (локально).</p></div>
      <form class="lms-form card" id="lmsLoginForm">
        <label>Логин <input name="login" class="search-input" required autocomplete="username" /></label>
        <label>Пароль <input name="password" type="password" class="search-input" required autocomplete="current-password" /></label>
        <button class="btn btn-primary" type="submit">Войти</button>
        <p class="note">Нет аккаунта? <a href="#/register" data-nav>Регистрация</a></p>
      </form>`;
  }

  function renderRegister() {
    return `
      ${authBar(currentUser())}
      <div class="page-head"><h1>Регистрация</h1><p>Создайте учётную запись слушателя.</p></div>
      <form class="lms-form card" id="lmsRegisterForm">
        <label>Имя <input name="name" class="search-input" required /></label>
        <label>Логин <input name="login" class="search-input" required autocomplete="username" /></label>
        <label>Пароль <input name="password" type="password" class="search-input" required autocomplete="new-password" /></label>
        <button class="btn btn-primary" type="submit">Создать аккаунт</button>
        <p class="note">Уже есть аккаунт? <a href="#/login" data-nav>Вход</a></p>
      </form>`;
  }

  function renderCabinet() {
    const { user, html } = requireAuth(`
      <div class="page-head"><h1>Кабинет</h1><p>Нужен <a href="#/login" data-nav>вход</a>.</p></div>`);
    if (html) return html;

    const courses = Data.courses || [];
    const assigns = Auth.getAssignments().filter(
      (a) => !a.userIds?.length || a.userIds.includes(user.id)
    );

    const rows = courses
      .map((c) => {
        const st = Auth.courseStats(user, c);
        return `<tr>
          <td><a href="#/course/${esc(c.id)}" data-nav>${esc(c.title)}</a></td>
          <td>${st.done}/${st.total}</td>
          <td>${progressBar(st.pct)}</td>
          <td>${st.quiz ? (st.quizPassed ? `✓ ${st.quiz.score}%` : `✗ ${st.quiz.score}%`) : "—"}</td>
        </tr>`;
      })
      .join("");

    return `
      ${authBar(user)}
      <div class="page-head">
        <h1>Личный кабинет</h1>
        <p>${esc(user.name)} · @${esc(user.login)}</p>
      </div>
      <div class="card">
        <h3>Прогресс по курсам</h3>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Курс</th><th>Уроки</th><th>Прогресс</th><th>Тест</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      </div>
      <div class="card" style="margin-top:1rem">
        <h3>Задания от преподавателя</h3>
        ${
          assigns.length
            ? `<ul class="assign-list">${assigns
                .map(
                  (a) => `<li>
                    <strong>${esc(a.title)}</strong>
                    ${a.courseId ? `· <a href="#/course/${esc(a.courseId)}" data-nav>курс</a>` : ""}
                    ${a.due ? `· срок ${esc(a.due)}` : ""}
                    ${a.note ? `<div class="muted">${esc(a.note)}</div>` : ""}
                  </li>`
                )
                .join("")}</ul>`
            : `<p class="muted">Пока нет назначенных заданий.</p>`
        }
      </div>`;
  }

  function renderCourse(courseId) {
    const course = (Data.courses || []).find((c) => c.id === courseId);
    if (!course) {
      return `<div class="page-head"><h1>Курс не найден</h1><p><a href="#/" data-nav>К курсам</a></p></div>`;
    }
    const user = currentUser();
    const st = Auth.courseStats(user, course);
    const lessons = course.lessons
      .map((raw, idx) => {
        const l = mergeLesson(course, raw);
        const done = user && st && user.progress?.[course.id]?.lessons?.[l.id]?.done;
        return `
          <a class="lms-lesson-row" href="#/lesson/${esc(course.id)}/${esc(l.id)}" data-nav>
            <span class="lms-num">${idx + 1}</span>
            <span>
              <strong>${esc(l.title)}</strong>
              <span class="muted">${l.minutes || "—"} мин</span>
            </span>
            <span class="tag ${done ? "ok" : ""}">${done ? "пройден" : "открыть"}</span>
          </a>`;
      })
      .join("");

    const canQuiz = !user || st.allLessonsDone;

    return `
      ${authBar(user)}
      <div class="page-head">
        <p class="crumb"><a href="#/" data-nav>Учёба</a> / ${esc(course.title)}</p>
        <h1>${esc(course.title)}</h1>
        <p>${esc(course.short)}</p>
        <p class="note">Источник: ${esc(course.source)}</p>
        ${user ? progressBar(st.pct) : ""}
      </div>
      <div class="lms-lesson-list">${lessons}</div>
      <div class="card" style="margin-top:1.25rem">
        <h3>Проверочный тест</h3>
        <p class="muted">После изучения всех уроков блока. Проходной балл — ${course.quiz.passScore}%.</p>
        ${
          canQuiz
            ? `<a class="btn btn-primary" href="#/quiz/${esc(course.id)}" data-nav>Пройти тест</a>`
            : `<p class="note">Сначала отметьте все уроки как изученные (кнопка в конце урока).</p>`
        }
        ${
          st.quiz
            ? `<p>Последняя попытка: <strong>${st.quiz.score}%</strong> ${st.quizPassed ? "(зачёт)" : "(нужно повторить)"}</p>`
            : ""
        }
      </div>`;
  }

  function renderLesson(courseId, lessonId) {
    const course = (Data.courses || []).find((c) => c.id === courseId);
    const raw = course?.lessons?.find((l) => l.id === lessonId);
    if (!course || !raw) {
      return `<div class="page-head"><h1>Урок не найден</h1></div>`;
    }
    const lesson = mergeLesson(course, raw);
    const user = currentUser();
    const imgs = (lesson.images || [])
      .map(
        (im) => `
        <figure class="lms-figure">
          <img src="${esc(im.src)}" alt="${esc(im.caption || lesson.title)}" loading="lazy" />
          <figcaption>${esc(im.caption || "")}</figcaption>
        </figure>`
      )
      .join("");

    const idx = course.lessons.findIndex((l) => l.id === lessonId);
    const prev = course.lessons[idx - 1];
    const next = course.lessons[idx + 1];

    return `
      ${authBar(user)}
      <article class="lms-lesson">
        <p class="crumb">
          <a href="#/" data-nav>Учёба</a> /
          <a href="#/course/${esc(course.id)}" data-nav>${esc(course.title)}</a>
        </p>
        <h1>${esc(lesson.title)}</h1>
        <p class="muted">${lesson.minutes || "—"} мин · урок ${idx + 1} из ${course.lessons.length}</p>
        <div class="lms-figures">${imgs}</div>
        <div class="lms-body prose">${lesson.html || ""}</div>
        <div class="lms-lesson-actions">
          ${
            user
              ? `<button type="button" class="btn btn-primary" id="lmsMarkDone"
                  data-course="${esc(course.id)}" data-lesson="${esc(lesson.id)}">Отметить изученным</button>`
              : `<a class="btn btn-ghost" href="#/login" data-nav>Войдите, чтобы сохранить прогресс</a>`
          }
          ${prev ? `<a class="btn btn-ghost" href="#/lesson/${esc(course.id)}/${esc(prev.id)}" data-nav>← Предыдущий</a>` : ""}
          ${next ? `<a class="btn btn-ghost" href="#/lesson/${esc(course.id)}/${esc(next.id)}" data-nav>Следующий →</a>` : `<a class="btn btn-primary" href="#/quiz/${esc(course.id)}" data-nav>К тесту блока</a>`}
        </div>
      </article>`;
  }

  function renderQuiz(courseId) {
    const course = (Data.courses || []).find((c) => c.id === courseId);
    if (!course?.quiz) return `<div class="page-head"><h1>Тест не найден</h1></div>`;
    const user = currentUser();
    const st = Auth.courseStats(user, course);
    if (user && !st.allLessonsDone) {
      return `
        ${authBar(user)}
        <div class="page-head">
          <h1>${esc(course.quiz.title)}</h1>
          <p>Сначала завершите все уроки курса (${st.done}/${st.total}).</p>
          <a class="btn btn-primary" href="#/course/${esc(course.id)}" data-nav>К урокам</a>
        </div>`;
    }

    const qs = course.quiz.questions
      .map((q, i) => {
        const opts = q.options
          .map(
            (o, j) => `
            <label class="lms-option">
              <input type="radio" name="q_${esc(q.id)}" value="${j}" required />
              <span>${esc(o)}</span>
            </label>`
          )
          .join("");
        return `
          <fieldset class="lms-q card" data-qid="${esc(q.id)}">
            <legend>${i + 1}. ${esc(q.q)}</legend>
            ${opts}
          </fieldset>`;
      })
      .join("");

    return `
      ${authBar(user)}
      <div class="page-head">
        <h1>${esc(course.quiz.title)}</h1>
        <p>Проходной балл: ${course.quiz.passScore}%. Ответьте на все вопросы.</p>
      </div>
      <form id="lmsQuizForm" data-course="${esc(course.id)}">
        ${qs}
        <button class="btn btn-primary" type="submit">Сдать тест</button>
      </form>
      <div id="lmsQuizResult"></div>`;
  }

  function renderAdmin() {
    const user = currentUser();
    if (!user || user.role !== "admin") {
      return `
        <div class="page-head">
          <h1>Админ-панель</h1>
          <p>Доступ только для администратора. <a href="#/login" data-nav>Войти</a></p>
          <p class="note">Учётная запись администратора создаётся при первом запуске (см. README).</p>
        </div>`;
    }

    const students = Auth.getUsers().filter((u) => u.role !== "admin");
    const courses = Data.courses || [];

    const monitor = students
      .map((s) => {
        const cells = courses
          .map((c) => {
            const st = Auth.courseStats(s, c);
            return `<td title="${esc(c.title)}">${st.done}/${st.total}${st.quiz ? ` · ${st.quiz.score}%` : ""}</td>`;
          })
          .join("");
        return `<tr><td>${esc(s.name)}<div class="muted">@${esc(s.login)}</div></td>${cells}</tr>`;
      })
      .join("");

    const courseOpts = courses
      .map((c) => `<option value="${esc(c.id)}">${esc(c.title)}</option>`)
      .join("");
    const userOpts = students
      .map((s) => `<option value="${esc(s.id)}">${esc(s.name)} (@${esc(s.login)})</option>`)
      .join("");

    const assigns = Auth.getAssignments()
      .map(
        (a) => `<li>
          <strong>${esc(a.title)}</strong> · ${esc(a.courseId || "—")}
          ${a.due ? `· до ${esc(a.due)}` : ""}
          <div class="muted">${esc(a.note || "")}</div>
        </li>`
      )
      .join("");

    return `
      ${authBar(user)}
      <div class="page-head">
        <h1>Админ-панель</h1>
        <p>Мониторинг прогресса, задания и дополнение материалов.</p>
      </div>

      <div class="card">
        <h3>Прогресс слушателей</h3>
        ${
          students.length
            ? `<div class="table-wrap"><table class="data-table lms-admin-table">
                <thead><tr><th>Слушатель</th>${courses.map((c) => `<th>${esc(c.id)}</th>`).join("")}</tr></thead>
                <tbody>${monitor}</tbody>
              </table></div>`
            : `<p class="muted">Пока никто не зарегистрировался на этом устройстве.</p>`
        }
        <p class="note">Данные хранятся локально в браузере. Для переноса между ПК используйте экспорт/импорт.</p>
      </div>

      <div class="card" style="margin-top:1rem">
        <h3>Выдать задание</h3>
        <form class="lms-form" id="lmsAssignForm">
          <label>Название <input name="title" class="search-input" required placeholder="Изучить РДС, сдать тест" /></label>
          <label>Курс <select name="courseId" class="select">${courseOpts}</select></label>
          <label>Слушатель
            <select name="userId" class="select">
              <option value="">Всем</option>
              ${userOpts}
            </select>
          </label>
          <label>Срок <input name="due" type="date" class="search-input" /></label>
          <label>Комментарий <textarea name="note" class="search-input card-note" rows="2"></textarea></label>
          <button class="btn btn-primary" type="submit">Назначить</button>
        </form>
        <ul class="assign-list" style="margin-top:1rem">${assigns || "<li class='muted'>Заданий нет</li>"}</ul>
      </div>

      <div class="card" style="margin-top:1rem">
        <h3>Дополнить урок</h3>
        <form class="lms-form" id="lmsEditLessonForm">
          <label>Курс
            <select name="courseId" id="adminCourseSelect" class="select">${courseOpts}</select>
          </label>
          <label>Урок
            <select name="lessonId" id="adminLessonSelect" class="select"></select>
          </label>
          <label>Заголовок <input name="title" class="search-input" /></label>
          <label>HTML-текст урока
            <textarea name="html" class="search-input card-note" rows="8" placeholder="<p>Дополнительный абзац…</p>"></textarea>
          </label>
          <button class="btn btn-primary" type="submit">Сохранить дополнение</button>
        </form>
      </div>

      <div class="card" style="margin-top:1rem">
        <h3>Экспорт / импорт данных</h3>
        <div class="hero-actions">
          <button type="button" class="btn btn-ghost" id="lmsExport">Скачать JSON</button>
          <label class="btn btn-ghost">Импорт JSON
            <input type="file" id="lmsImport" accept="application/json,.json" hidden />
          </label>
        </div>
      </div>`;
  }

  function renderSources() {
    return `
      <div class="page-head">
        <h1>Источники</h1>
        <p>Официальные и учебные материалы, на которых построены лекции и тесты.</p>
      </div>
      <ul class="source-list">
        ${(Data.sources || []).map((s) => `<li>${esc(s)}</li>`).join("")}
      </ul>
      <p style="margin-top:1rem"><a class="btn btn-primary" href="#/" data-nav>К курсам</a></p>`;
  }

  function render(pathParts) {
    const [a, b, c] = pathParts;
    if (!a) return renderLearnHome();
    if (a === "login") return renderLogin();
    if (a === "register") return renderRegister();
    if (a === "cabinet") return renderCabinet();
    if (a === "admin") return renderAdmin();
    if (a === "sources") return renderSources();
    if (a === "course" && b) return renderCourse(b);
    if (a === "lesson" && b && c) return renderLesson(b, c);
    if (a === "quiz" && b) return renderQuiz(b);
    return renderLearnHome();
  }

  function toast(msg) {
    if (window.SVARKA_EXTRAS?.toast) window.SVARKA_EXTRAS.toast(msg);
    else alert(msg);
  }

  function bind(pathParts) {
    document.getElementById("lmsLogout")?.addEventListener("click", () => {
      Auth.logout();
      location.hash = "#/";
    });

    document.getElementById("lmsLoginForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const res = Auth.login(fd.get("login"), fd.get("password"));
      if (!res.ok) return toast(res.error);
      toast("Вход выполнен");
      location.hash = res.user.role === "admin" ? "#/admin" : "#/cabinet";
    });

    document.getElementById("lmsRegisterForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const res = Auth.register({
        login: fd.get("login"),
        password: fd.get("password"),
        name: fd.get("name"),
      });
      if (!res.ok) return toast(res.error);
      toast("Аккаунт создан");
      location.hash = "#/cabinet";
    });

    document.getElementById("lmsMarkDone")?.addEventListener("click", (e) => {
      const btn = e.currentTarget;
      const user = currentUser();
      if (!user) return;
      Auth.markLessonComplete(user.id, btn.dataset.course, btn.dataset.lesson);
      toast("Урок отмечен");
      location.hash = `#/course/${btn.dataset.course}`;
    });

    document.getElementById("lmsQuizForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const courseId = e.target.getAttribute("data-course");
      const course = (Data.courses || []).find((c) => c.id === courseId);
      if (!course) return;
      const form = new FormData(e.target);
      let correct = 0;
      for (const q of course.quiz.questions) {
        const val = form.get("q_" + q.id);
        if (val != null && Number(val) === q.answer) correct++;
      }
      const score = Math.round((correct / course.quiz.questions.length) * 100);
      const passed = score >= course.quiz.passScore;
      const user = currentUser();
      if (user) {
        Auth.saveQuizResult(user.id, courseId, {
          quizId: course.quiz.id,
          score,
          correct,
          total: course.quiz.questions.length,
          passed,
        });
      }
      const box = document.getElementById("lmsQuizResult");
      if (box) {
        box.innerHTML = `
          <div class="card" style="margin-top:1rem">
            <h3>${passed ? "Зачёт" : "Нужно повторить материал"}</h3>
            <p>Результат: <strong>${score}%</strong> (${correct} из ${course.quiz.questions.length})</p>
            <a class="btn btn-ghost" href="#/course/${esc(courseId)}" data-nav>К курсу</a>
            ${!passed ? `<a class="btn btn-primary" href="#/quiz/${esc(courseId)}" data-nav>Ещё попытка</a>` : ""}
          </div>`;
      }
      toast(passed ? `Тест сдан: ${score}%` : `Пока ${score}% — порог ${course.quiz.passScore}%`);
    });

    // Admin binders
    const courseSelect = document.getElementById("adminCourseSelect");
    const lessonSelect = document.getElementById("adminLessonSelect");
    const fillLessons = () => {
      if (!courseSelect || !lessonSelect) return;
      const course = (Data.courses || []).find((c) => c.id === courseSelect.value);
      lessonSelect.innerHTML = (course?.lessons || [])
        .map((l) => `<option value="${esc(l.id)}">${esc(l.title)}</option>`)
        .join("");
      const lesson = course?.lessons?.find((l) => l.id === lessonSelect.value);
      const form = document.getElementById("lmsEditLessonForm");
      if (form && lesson) {
        form.title.value = lesson.title || "";
        form.html.value = lesson.html || "";
      }
    };
    courseSelect?.addEventListener("change", fillLessons);
    lessonSelect?.addEventListener("change", fillLessons);
    fillLessons();

    document.getElementById("lmsAssignForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const userId = String(fd.get("userId") || "");
      Auth.addAssignment({
        title: fd.get("title"),
        courseId: fd.get("courseId"),
        userIds: userId ? [userId] : [],
        due: fd.get("due") || null,
        note: fd.get("note") || "",
      });
      toast("Задание создано");
      location.hash = "#/admin";
      location.reload();
    });

    document.getElementById("lmsEditLessonForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      Auth.upsertLessonOverlay(fd.get("courseId"), {
        id: fd.get("lessonId"),
        title: fd.get("title"),
        html: fd.get("html"),
      });
      toast("Материал сохранён");
    });

    document.getElementById("lmsExport")?.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(Auth.exportAll(), null, 2)], {
        type: "application/json",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `svarka-lms-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    });

    document.getElementById("lmsImport")?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const res = Auth.importAll(data);
        toast(res.ok ? "Импорт выполнен" : res.error);
        if (res.ok) location.reload();
      } catch {
        toast("Не удалось прочитать JSON");
      }
    });
  }

  window.LMS = { render, bind, currentUser, authBar };
})();
