(function () {
  "use strict";

  var localDateEl = document.getElementById("local-date");
  var localWeekdayEl = document.getElementById("local-weekday");
  var localTimeEl = document.getElementById("local-time");
  var gmtDateEl = document.getElementById("gmt-date");
  var gmtTimeEl = document.getElementById("gmt-time");
  var calendarTitleEl = document.getElementById("calendar-title");
  var calendarWeekdaysEl = document.getElementById("calendar-weekdays");
  var calendarGridEl = document.getElementById("calendar-grid");
  var appointmentPanelEl = document.getElementById("appointment-panel");
  var appointmentFormEl = document.getElementById("appointment-form");
  var appointmentDateInputEl = document.getElementById("appointment-date-input");
  var appointmentTimeInputEl = document.getElementById("appointment-time-input");
  var appointmentStatusEl = document.getElementById("appointment-status");
  var appointmentDateEl = document.getElementById("appointment-date");
  var appointmentCountdownEl = document.getElementById("appointment-countdown");
  var appointmentMessageEl = document.getElementById("appointment-message");
  var appointmentClearEl = document.getElementById("appointment-clear");
  var APPOINTMENT_KEY = "mobile-clock-appointment";

  var state = {
    locale: getLocale(),
    renderedMonthKey: "",
    appointmentTime: loadAppointment(),
    alerting: false
  };

  function setAppHeight() {
    var width = window.innerWidth || document.documentElement.clientWidth || screen.width || 0;
    var height = window.innerHeight || document.documentElement.clientHeight || screen.height || 0;
    var screenLongSide = Math.max(screen.width || 0, screen.height || 0);
    var screenShortSide = Math.min(screen.width || 0, screen.height || 0);
    var screenHeight = width > height ? screenShortSide : screenLongSide;
    var appHeight = Math.max(height, screenHeight);

    document.documentElement.style.setProperty("--app-height", appHeight + "px");
    document.documentElement.style.setProperty("--paint-height", appHeight + 360 + "px");
  }

  function preventZoom(event) {
    event.preventDefault();
  }

  function getLocale() {
    if (navigator.languages && navigator.languages.length) {
      return navigator.languages[0];
    }
    return navigator.language || "en-US";
  }

  function pad(value) {
    return value < 10 ? "0" + value : String(value);
  }

  function loadAppointment() {
    var stored;
    try {
      stored = Number(window.localStorage.getItem(APPOINTMENT_KEY));
    } catch (error) {
      return null;
    }
    return isFinite(stored) && stored > 0 ? stored : null;
  }

  function saveAppointment(value) {
    try {
      if (value) {
        window.localStorage.setItem(APPOINTMENT_KEY, String(value));
      } else {
        window.localStorage.removeItem(APPOINTMENT_KEY);
      }
    } catch (error) {
      // The countdown still works for this session when storage is unavailable.
    }
  }

  function parseLocalDateTime(dateValue, timeValue) {
    // iOS 12's combined datetime-local control can return a value shifted by
    // the time-zone offset. Separate date and time controls keep the selected
    // local fields intact; combine those fields without parsing an ISO string.
    var dateParts = String(dateValue).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    var timeParts = String(timeValue).match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
    var date;
    if (!dateParts || !timeParts) {
      return null;
    }
    date = new Date(
      Number(dateParts[1]),
      Number(dateParts[2]) - 1,
      Number(dateParts[3]),
      Number(timeParts[1]),
      Number(timeParts[2]),
      Number(timeParts[3] || 0),
      0
    );

    // The multi-argument Date constructor normalizes impossible dates, so
    // compare all fields to reject values such as February 31.
    if (isNaN(date.getTime()) ||
        date.getFullYear() !== Number(dateParts[1]) ||
        date.getMonth() !== Number(dateParts[2]) - 1 ||
        date.getDate() !== Number(dateParts[3]) ||
        date.getHours() !== Number(timeParts[1]) ||
        date.getMinutes() !== Number(timeParts[2]) ||
        date.getSeconds() !== Number(timeParts[3] || 0)) {
      return null;
    }
    return date;
  }

  function formatAppointment(date) {
    try {
      return new Intl.DateTimeFormat(state.locale, {
        year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
      }).format(date);
    } catch (error) {
      return date.getFullYear() + "/" + pad(date.getMonth() + 1) + "/" + pad(date.getDate()) + " " + pad(date.getHours()) + ":" + pad(date.getMinutes());
    }
  }

  function formatRemaining(milliseconds) {
    var seconds = Math.max(0, Math.ceil(milliseconds / 1000));
    var days = Math.floor(seconds / 86400);
    var hours = Math.floor((seconds % 86400) / 3600);
    var minutes = Math.floor((seconds % 3600) / 60);
    var remainder = seconds % 60;
    return (days ? days + "日 " : "") + pad(hours) + ":" + pad(minutes) + ":" + pad(remainder);
  }

  function clearAppointment() {
    state.appointmentTime = null;
    state.alerting = false;
    saveAppointment(null);
    document.body.classList.remove("is-alerting");
    appointmentPanelEl.classList.remove("has-appointment");
    appointmentStatusEl.setAttribute("hidden", "hidden");
    appointmentStatusEl.setAttribute("aria-hidden", "true");
    appointmentDateInputEl.value = "";
    appointmentTimeInputEl.value = "";
    appointmentMessageEl.textContent = "予定時刻を登録してください";
  }

  function updateAppointment(now) {
    var remaining;
    if (!state.appointmentTime) {
      return;
    }
    appointmentPanelEl.classList.add("has-appointment");
    // removeAttribute is used instead of assigning the hidden property so the
    // state is reflected reliably by older WebKit versions used by the PWA.
    appointmentStatusEl.removeAttribute("hidden");
    appointmentStatusEl.setAttribute("aria-hidden", "false");
    appointmentDateEl.textContent = formatAppointment(new Date(state.appointmentTime));
    remaining = state.appointmentTime - now.getTime();
    appointmentCountdownEl.textContent = formatRemaining(remaining);
    if (remaining <= 0) {
      appointmentCountdownEl.textContent = "予定時刻です";
      if (!state.alerting) {
        state.alerting = true;
        document.body.classList.add("is-alerting");
      }
    }
  }

  function getFirstDayOfWeek(locale) {
    var normalized = String(locale || "").toLowerCase();
    var sundayFirst = [
      "en-us",
      "en-ca",
      "ja",
      "ja-jp",
      "zh",
      "zh-cn",
      "zh-tw",
      "ko",
      "ko-kr",
      "th",
      "th-th"
    ];
    var i;

    for (i = 0; i < sundayFirst.length; i += 1) {
      if (normalized === sundayFirst[i] || normalized.indexOf(sundayFirst[i] + "-") === 0) {
        return 0;
      }
    }

    return 1;
  }

  function formatDate(date) {
    try {
      return new Intl.DateTimeFormat(state.locale, {
        year: "numeric",
        month: "long",
        day: "numeric"
      }).format(date);
    } catch (error) {
      return date.getFullYear() + "/" + pad(date.getMonth() + 1) + "/" + pad(date.getDate());
    }
  }

  function formatWeekday(date) {
    try {
      return new Intl.DateTimeFormat(state.locale, {
        weekday: "long"
      }).format(date);
    } catch (error) {
      return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()];
    }
  }

  function formatMonth(date) {
    try {
      return new Intl.DateTimeFormat(state.locale, {
        year: "numeric",
        month: "long"
      }).format(date);
    } catch (error) {
      return date.getFullYear() + "/" + pad(date.getMonth() + 1);
    }
  }

  function formatWeekdayShort(dayIndex) {
    var baseDate = new Date(2024, 0, 7 + dayIndex);
    try {
      return new Intl.DateTimeFormat(state.locale, {
        weekday: "narrow"
      }).format(baseDate);
    } catch (error) {
      return ["S", "M", "T", "W", "T", "F", "S"][dayIndex];
    }
  }

  function localTime(date) {
    return pad(date.getHours()) + ":" + pad(date.getMinutes()) + ":" + pad(date.getSeconds());
  }

  function gmtTime(date) {
    return pad(date.getUTCHours()) + ":" + pad(date.getUTCMinutes()) + ":" + pad(date.getUTCSeconds());
  }

  function gmtDate(date) {
    return date.getUTCFullYear() + "/" + pad(date.getUTCMonth() + 1) + "/" + pad(date.getUTCDate());
  }

  function weekendClass(dayIndex) {
    if (dayIndex === 0) {
      return " is-sunday";
    }

    if (dayIndex === 6) {
      return " is-saturday";
    }

    return "";
  }

  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
  }

  function renderCalendar(now) {
    var year = now.getFullYear();
    var month = now.getMonth();
    var monthKey = year + "-" + month + "-" + state.locale;
    var firstDay;
    var daysInMonth;
    var leadDays;
    var cells;
    var weekdayIndex;
    var i;
    var cellDate;
    var dayEl;
    var weekdayEl;

    if (state.renderedMonthKey === monthKey) {
      return;
    }

    state.renderedMonthKey = monthKey;
    firstDay = getFirstDayOfWeek(state.locale);
    daysInMonth = new Date(year, month + 1, 0).getDate();
    leadDays = (new Date(year, month, 1).getDay() - firstDay + 7) % 7;
    cells = Math.ceil((leadDays + daysInMonth) / 7) * 7;

    calendarTitleEl.textContent = formatMonth(now);
    calendarWeekdaysEl.innerHTML = "";
    calendarGridEl.innerHTML = "";

    for (i = 0; i < 7; i += 1) {
      weekdayIndex = (firstDay + i) % 7;
      weekdayEl = document.createElement("div");
      weekdayEl.className = "weekday" + weekendClass(weekdayIndex);
      weekdayEl.textContent = formatWeekdayShort(weekdayIndex);
      calendarWeekdaysEl.appendChild(weekdayEl);
    }

    for (i = 0; i < cells; i += 1) {
      cellDate = new Date(year, month, i - leadDays + 1);
      dayEl = document.createElement("div");
      dayEl.className = "day" + weekendClass(cellDate.getDay());
      dayEl.textContent = String(cellDate.getDate());

      if (cellDate.getMonth() !== month) {
        dayEl.className += " is-outside";
      }

      if (sameDay(cellDate, now)) {
        dayEl.className += " is-today";
      }

      calendarGridEl.appendChild(dayEl);
    }
  }

  function tick() {
    var now = new Date();

    localDateEl.textContent = formatDate(now);
    localWeekdayEl.textContent = formatWeekday(now);
    localTimeEl.textContent = localTime(now);
    gmtDateEl.textContent = gmtDate(now);
    gmtTimeEl.textContent = gmtTime(now);
    renderCalendar(now);
    updateAppointment(now);
  }

  appointmentFormEl.addEventListener("submit", function (event) {
    var appointment;
    event.preventDefault();
    appointment = parseLocalDateTime(appointmentDateInputEl.value, appointmentTimeInputEl.value);
    if (!appointment) {
      appointmentMessageEl.textContent = "有効な予定時刻を指定してください";
      return;
    }
    if (appointment.getTime() <= Date.now()) {
      appointmentMessageEl.textContent = "現在より後の時刻を指定してください";
      return;
    }
    state.appointmentTime = appointment.getTime();
    state.alerting = false;
    saveAppointment(state.appointmentTime);
    updateAppointment(new Date());
  });

  appointmentClearEl.addEventListener("click", clearAppointment);
  document.body.addEventListener("click", function () {
    if (state.alerting) {
      clearAppointment();
    }
  });

  setAppHeight();
  tick();
  window.setInterval(tick, 1000);
  window.addEventListener("resize", setAppHeight);
  window.addEventListener("orientationchange", function () {
    window.setTimeout(setAppHeight, 250);
  });
  window.addEventListener("pageshow", tick);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) {
      tick();
    }
  });
  document.addEventListener("gesturestart", preventZoom);
  document.addEventListener("gesturechange", preventZoom);
  document.addEventListener("gestureend", preventZoom);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./sw.js");
    });
  }
}());
