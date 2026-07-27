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

  var state = {
    locale: getLocale(),
    renderedMonthKey: ""
  };

  function setAppHeight() {
    document.documentElement.style.setProperty("--app-height", window.innerHeight + "px");
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
      weekdayEl.className = "weekday";
      weekdayEl.textContent = formatWeekdayShort(weekdayIndex);
      calendarWeekdaysEl.appendChild(weekdayEl);
    }

    for (i = 0; i < cells; i += 1) {
      cellDate = new Date(year, month, i - leadDays + 1);
      dayEl = document.createElement("div");
      dayEl.className = "day";
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
  }

  setAppHeight();
  tick();
  window.setInterval(tick, 1000);
  window.addEventListener("resize", setAppHeight);
  window.addEventListener("orientationchange", function () {
    window.setTimeout(setAppHeight, 250);
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./sw.js");
    });
  }
}());
