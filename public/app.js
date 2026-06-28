const state = {
    languagesChartDashboard: null,
    languagesChartDetailed: null,
    repoOverviewChartDashboard: null,
    repoOverviewChartDetailed: null,
    repositories: [],
    history: JSON.parse(localStorage.getItem("githubAnalyzerHistory") || "[]"),
};

const API_BASE_URL = `${window.location.origin}/api/github`;

const elements = {
    form: document.getElementById("searchForm"),
    input: document.getElementById("usernameInput"),
    analyzeBtn: document.getElementById("analyzeBtn"),
    buttonSpinner: document.getElementById("buttonSpinner"),
    buttonText: document.getElementById("buttonText"),
    welcomeState: document.getElementById("welcomeState"),
    errorState: document.getElementById("errorState"),
    skeletonState: document.getElementById("skeletonState"),
    dashboardContent: document.getElementById("dashboardContent"),
    profileSection: document.getElementById("profileSection"),
    scoreCard: document.getElementById("scoreCard"),
    statisticsRow: document.getElementById("statisticsRow"),
    languageBreakdown: document.getElementById("languageBreakdown"),
    repoOverviewStats: document.getElementById("repoOverviewStats"),
    topRepositories: document.getElementById("topRepositories"),
    activityHeatmap: document.getElementById("activityHeatmap"),
    recentSearches: document.getElementById("recentSearches"),
    clearHistoryBtn: document.getElementById("clearHistoryBtn"),
    allReposLink: document.getElementById("allReposLink"),
    themeToggle: document.getElementById("themeToggle"),
    sidebar: document.getElementById("sidebar"),
    sidebarOverlay: document.getElementById("sidebarOverlay"),
    mobileMenuBtn: document.getElementById("mobileMenuBtn"),
};


 

function extractUsername(value) {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
        return "";
    }

    try {
        const url = new URL(trimmedValue);
        if (!url.hostname.includes("github.com")) {
            return "";
        }

        return url.pathname.split("/").filter(Boolean)[0] || "";
    } catch {
        return trimmedValue.replace(/^@/, "").split("/").filter(Boolean)[0] || "";
    }
}

async function requestGitHub(url) {
    const response = await fetch(url);

    if (response.status === 404) {
        throw new Error("USER_NOT_FOUND");
    }

    if (response.status === 403 || response.status === 429) {
        throw new Error("RATE_LIMIT");
    }

    if (!response.ok) {
        throw new Error("NETWORK_ERROR");
    }

    return response.json();
}

async function fetchProfile(username) {
    return requestGitHub(`${API_BASE_URL}/${encodeURIComponent(username)}`);
}

async function fetchRepositories(username) {
    return requestGitHub(`${API_BASE_URL}/${encodeURIComponent(username)}/repos`);
}

function calculateDeveloperScore(profile, repositories) {
    const totalStars = repositories.reduce((sum, repository) => sum + repository.stargazers_count, 0);
    const score = profile.followers * 2 + profile.public_repos * 5 + totalStars * 3;
    const level = score >= 1000 ? "Advanced" : score >= 300 ? "Intermediate" : "Beginner";

    return { score, level, totalStars };
}

function formatNumber(value) {
    return new Intl.NumberFormat("en", { notation: value >= 1000 ? "compact" : "standard" }).format(value);
}

function formatDate(value) {
    return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function getTotalForks(repositories) {
    return repositories.reduce((sum, repository) => sum + repository.forks_count, 0);
}

function renderProfile(profile, repositories) {
    const website = profile.blog ? (profile.blog.startsWith("http") ? profile.blog : `https://${profile.blog}`) : "";

    elements.profileSection.innerHTML = `
    <div class="flex flex-col gap-5 md:flex-row md:items-center">
      <img src="${profile.avatar_url}" alt="${profile.login} avatar" class="h-28 w-28 rounded-3xl border border-white/10 object-cover shadow-xl shadow-emerald-950/30">
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-3">
          <h1 class="text-3xl font-bold tracking-normal">${profile.name || profile.login}</h1>
          <span class="rounded-full bg-blue-500 px-2 py-1 text-xs font-bold">✓</span>
        </div>
        <p class="mt-1 text-lg font-semibold text-emerald-300">@${profile.login}</p>
        <p class="mt-3 max-w-3xl leading-7 text-slate-300 light-mode:text-slate-600">${profile.bio || "No bio available for this profile."}</p>
        <div class="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400 light-mode:text-slate-600">
          <span>⌖ ${profile.location || "Location unavailable"}</span>
          ${website ? `<a class="text-emerald-300 transition hover:text-white light-mode:text-emerald-700" href="${website}" target="_blank" rel="noreferrer">↗ ${website.replace(/^https?:\/\//, "")}</a>` : "<span>↗ Website unavailable</span>"}
          <span>□ Joined ${formatDate(profile.created_at)}</span>
        </div>
        <div class="mt-5 flex flex-wrap gap-3">
          <button id="copyProfileUrlBtn" class="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold transition hover:bg-white/10 light-mode:border-slate-200 light-mode:bg-white">Copy Profile URL</button>
          <a class="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5" href="${profile.html_url}" target="_blank" rel="noreferrer">Open GitHub Profile</a>
        </div>
      </div>
    </div>
     
  `
  ;

 

    document.getElementById("copyProfileUrlBtn").addEventListener("click", async () => {
        await navigator.clipboard.writeText(profile.html_url);
        document.getElementById("copyProfileUrlBtn").textContent = "Copied";
        setTimeout(() => {
            const copyButton = document.getElementById("copyProfileUrlBtn");
            if (copyButton) copyButton.textContent = "Copy Profile URL";
        }, 1400);
    });

    if (elements.allReposLink) {
        elements.allReposLink.href = `https://github.com/${profile.login}?tab=repositories`;
    }
}

function renderDeveloperScore(profile, repositories) {
    const { score, level } = calculateDeveloperScore(profile, repositories);
    const badgeClasses = {
        Beginner: "bg-sky-500/15 text-sky-200",
        Intermediate: "bg-amber-500/15 text-amber-200",
        Advanced: "bg-emerald-500/15 text-emerald-200",
    };

    elements.scoreCard.innerHTML = `
    <div class="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center shadow-inner shadow-white/5 light-mode:border-slate-200 light-mode:bg-white">
      <p class="text-sm text-slate-300 light-mode:text-slate-600">🏆 Developer Score</p>
      <p class="mt-5 bg-gradient-to-r from-emerald-300 to-blue-300 bg-clip-text text-6xl font-black text-transparent">${formatNumber(score)}</p>
      <span class="mt-4 light-mode:text-emerald-600 inline-flex rounded-xl px-4 py-2 text-sm font-semibold ${badgeClasses[level]}">${level} Developer</span>
    </div>
  `;
}

function renderStatistics(profile, repositories) {
    const { totalStars } = calculateDeveloperScore(profile, repositories);
    const totalForks = getTotalForks(repositories);
    const stats = [
        ["▣", "Total Repositories", profile.public_repos],
        ["◬", "Followers", profile.followers],
        ["◌", "Following", profile.following],
        ["☆", "Total Stars", totalStars],
        ["⑂", "Total Forks", totalForks],
    ];

    elements.statisticsRow.innerHTML = stats
        .map(([icon, label, value]) => `
      <article class="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:-translate-y-1 hover:border-emerald-400/50 light-mode:border-slate-200 light-mode:bg-white">
        <div class="flex items-center gap-3">
          <span class="text-2xl text-emerald-300">${icon}</span>
          <div>
            <p class="text-2xl font-bold">${formatNumber(value)}</p>
            <p class="text-sm text-slate-400 light-mode:text-slate-600">${label}</p>
          </div>
        </div>
      </article>
    `)
        .join("");
}

function getLanguageData(repositories) {
    const languageCounts = repositories.reduce((accumulator, repository) => {
        if (!repository.language) return accumulator;
        accumulator[repository.language] = (accumulator[repository.language] || 0) + 1;
        return accumulator;
    }, {});

    return Object.entries(languageCounts)
        .sort((first, second) => second[1] - first[1])
        .slice(0, 6);
}

function renderLanguagesChart(repositories) {
    const languageData = getLanguageData(repositories);
    const labels = languageData.length ? languageData.map(([language]) => language) : ["No language"];
    const values = languageData.length ? languageData.map(([, count]) => count) : [1];
    const total = values.reduce((sum, value) => sum + value, 0);
    const colors = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#94a3b8"];

    // 1. Render Dashboard Version
    if (state.languagesChartDashboard) {
        state.languagesChartDashboard.destroy();
    }
    const canvasDashboard = document.getElementById("languagesChartDashboard");
    if (canvasDashboard) {
        state.languagesChartDashboard = new Chart(canvasDashboard, {
            type: "doughnut",
            data: {
                labels,
                datasets: [{ data: values, backgroundColor: colors, borderColor: "transparent", cutout: "62%" }],
            },
            options: {
                plugins: { legend: { display: false } },
                responsive: true,
                maintainAspectRatio: true,
            },
        });
    }

    const breakdownDashboard = document.getElementById("languageBreakdownDashboard");
    if (breakdownDashboard) {
        breakdownDashboard.innerHTML = labels
            .map((label, index) => {
                const percentage = Math.round((values[index] / total) * 100);
                return `
            <div class="flex items-center justify-between gap-3 text-sm">
              <span class="flex items-center gap-2"><span class="h-3 w-3 rounded-full" style="background:${colors[index]}"></span>${label}</span>
              <span class="font-semibold">${percentage}%</span>
            </div>
          `;
            })
            .join("");
    }

    // 2. Render Detailed Version
    if (state.languagesChartDetailed) {
        state.languagesChartDetailed.destroy();
    }
    const canvasDetailed = document.getElementById("languagesChartDetailed");
    if (canvasDetailed) {
        state.languagesChartDetailed = new Chart(canvasDetailed, {
            type: "doughnut",
            data: {
                labels,
                datasets: [{ data: values, backgroundColor: colors, borderColor: "transparent", cutout: "62%" }],
            },
            options: {
                plugins: { legend: { display: false } },
                responsive: true,
                maintainAspectRatio: true,
            },
        });
    }

    const breakdownDetailed = document.getElementById("languageBreakdownDetailed");
    if (breakdownDetailed) {
        breakdownDetailed.innerHTML = labels
            .map((label, index) => {
                const percentage = Math.round((values[index] / total) * 100);
                return `
            <div class="flex items-center justify-between gap-3 text-base p-2 rounded-xl bg-white/[0.02] light-mode:bg-slate-50">
              <span class="flex items-center gap-3"><span class="h-3.5 w-3.5 rounded-full" style="background:${colors[index]}"></span>${label}</span>
              <span class="font-semibold text-emerald-300 light-mode:text-emerald-700">${percentage}%</span>
            </div>
          `;
            })
            .join("");
    }
}

function getMonthlyRepositoryData(repositories) {
    const sortedRepos = [...repositories].sort((first, second) => new Date(first.created_at) - new Date(second.created_at));
    const monthMap = new Map();

    sortedRepos.forEach((repository) => {
        const month = new Intl.DateTimeFormat("en", { month: "short", year: "2-digit" }).format(new Date(repository.created_at));
        const current = monthMap.get(month) || { repos: 0, stars: 0, forks: 0 };
        current.repos += 1;
        current.stars += repository.stargazers_count;
        current.forks += repository.forks_count;
        monthMap.set(month, current);
    });

    const entries = Array.from(monthMap.entries()).slice(-12);
    return {
        labels: entries.map(([month]) => month),
        repos: entries.map(([, value], index) => entries.slice(0, index + 1).reduce((sum, [, item]) => sum + item.repos, 0)),
        stars: entries.map(([, value]) => value.stars),
        forks: entries.map(([, value]) => value.forks),
    };
}

function renderRepositoryOverview(repositories) {
    const data = getMonthlyRepositoryData(repositories);

    const makeConfig = () => ({
        type: "line",
        data: {
            labels: data.labels.length ? data.labels : ["No repos"],
            datasets: [
                {
                    label: "Repository growth",
                    data: data.repos.length ? data.repos : [0],
                    borderColor: "#8b5cf6",
                    backgroundColor: "rgba(139,92,246,0.18)",
                    fill: true,
                    tension: 0.42,
                },
                {
                    label: "Stars earned",
                    data: data.stars.length ? data.stars : [0],
                    borderColor: "#3b82f6",
                    tension: 0.42,
                },
                {
                    label: "Forks earned",
                    data: data.forks.length ? data.forks : [0],
                    borderColor: "#10b981",
                    tension: 0.42,
                },
            ],
        },
        options: {
            plugins: { legend: { labels: { color: "#cbd5e1" } } },
            scales: {
                x: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148,163,184,0.08)" } },
                y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148,163,184,0.1)" } },
            },
            responsive: true,
            maintainAspectRatio: false,
        },
    });

    // 1. Render Dashboard version
    if (state.repoOverviewChartDashboard) {
        state.repoOverviewChartDashboard.destroy();
    }
    const canvasDashboard = document.getElementById("repoOverviewChartDashboard");
    if (canvasDashboard) {
        state.repoOverviewChartDashboard = new Chart(canvasDashboard, makeConfig());
    }

    const statsHTML = [
        ["New Repos", repositories.length],
        ["Stars Earned", repositories.reduce((sum, repository) => sum + repository.stargazers_count, 0)],
        ["Forks Earned", getTotalForks(repositories)],
    ]
        .map(([label, value]) => `
      <div class="rounded-2xl bg-white/[0.04] p-4 light-mode:bg-slate-100">
        <p class="text-2xl font-bold text-emerald-300">${formatNumber(value)}</p>
        <p class="mt-1 text-sm text-slate-400 light-mode:text-slate-600">${label}</p>
      </div>
    `)
        .join("");

    const statsDashboard = document.getElementById("repoOverviewStatsDashboard");
    if (statsDashboard) {
        statsDashboard.innerHTML = statsHTML;
    }

    // 2. Render Detailed version
    if (state.repoOverviewChartDetailed) {
        state.repoOverviewChartDetailed.destroy();
    }
    const canvasDetailed = document.getElementById("repoOverviewChartDetailed");
    if (canvasDetailed) {
        state.repoOverviewChartDetailed = new Chart(canvasDetailed, makeConfig());
    }
    const statsDetailed = document.getElementById("repoOverviewStatsDetailed");
    if (statsDetailed) {
        statsDetailed.innerHTML = statsHTML;
    }
}

function renderTopRepositories(repositories) {
    const topRepositories = [...repositories]
        .sort((first, second) => second.stargazers_count - first.stargazers_count)
        .slice(0, 4);

    const topContainer = document.getElementById("topRepositoriesDashboard");
    if (topContainer) {
        topContainer.innerHTML = topRepositories.length
            ? topRepositories
                .map((repository) => `
              <a href="${repository.html_url}" target="_blank" rel="noreferrer" class="group flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:-translate-y-1 hover:border-emerald-400/50 hover:bg-white/[0.07] light-mode:border-slate-200 light-mode:bg-white">
                <div class="min-w-0">
                  <h3 class="truncate font-semibold group-hover:text-emerald-200 light-mode:group-hover:text-emerald-700">${repository.name}</h3>
                  <p class="mt-1 text-sm text-slate-400 light-mode:text-slate-600">${repository.language || "Unknown"}</p>
                </div>
                <div class="flex shrink-0 items-center gap-4 text-sm text-slate-300 light-mode:text-slate-600">
                  <span>☆ ${formatNumber(repository.stargazers_count)}</span>
                  <span>⑂ ${formatNumber(repository.forks_count)}</span>
                </div>
              </a>
            `)
                .join("")
            : `<div class="rounded-2xl bg-white/[0.04] p-5 text-sm text-slate-400 light-mode:bg-slate-100">No public repositories found.</div>`;
    }

    state.repositories = repositories;
    
    const searchInput = document.getElementById("repoSearchInput");
    if (searchInput) {
        searchInput.value = "";
    }
    
    renderAllRepositoriesDetailed(repositories);
}

function renderAllRepositoriesDetailed(repos) {
    const container = document.getElementById("allRepositoriesDetailed");
    if (!container) return;

    container.innerHTML = repos.length
        ? repos
            .map((repository) => `
          <a href="${repository.html_url}" target="_blank" rel="noreferrer" class="group flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:-translate-y-0.5 hover:border-emerald-400/50 hover:bg-white/[0.07] light-mode:border-slate-200 light-mode:bg-white">
            <div class="min-w-0">
              <h3 class="truncate font-semibold group-hover:text-emerald-200 light-mode:group-hover:text-emerald-700">${repository.name}</h3>
              <p class="mt-1 text-sm text-slate-400 light-mode:text-slate-600">${repository.language || "Unknown"}</p>
            </div>
            <div class="flex shrink-0 items-center gap-4 text-sm text-slate-300 light-mode:text-slate-600">
              <span>☆ ${formatNumber(repository.stargazers_count)}</span>
              <span>⑂ ${formatNumber(repository.forks_count)}</span>
            </div>
          </a>
        `)
            .join("")
        : `<div class="rounded-2xl bg-white/[0.04] p-5 text-sm text-slate-400 light-mode:bg-slate-100">No matching repositories found.</div>`;
}

function renderActivity(repositories) {
    const activityMap = {};

    repositories.forEach((repo) => {
        const activities = [
            { type: "created", date: repo.created_at },
            { type: "updated", date: repo.updated_at },
            { type: "pushed", date: repo.pushed_at }
        ];

        activities.forEach(({ type, date }) => {
            if (!date) return;
            const dateObj = new Date(date);
            const yyyymmdd = dateObj.toISOString().split("T")[0];
            
            if (!activityMap[yyyymmdd]) {
                activityMap[yyyymmdd] = { count: 0, details: [] };
            }
            
            activityMap[yyyymmdd].count += 1;
            
            const detailText = `${repo.name} (${type})`;
            if (!activityMap[yyyymmdd].details.includes(detailText)) {
                activityMap[yyyymmdd].details.push(detailText);
            }
        });
    });

    const cells = Array.from({ length: 210 }, (_, index) => {
        const dateOfCell = new Date();
        dateOfCell.setDate(dateOfCell.getDate() - (209 - index));
        const yyyymmdd = dateOfCell.toISOString().split("T")[0];
        
        const activity = activityMap[yyyymmdd];
        const intensity = activity ? Math.min(5, Math.ceil(activity.count / 2)) : 0;
        
        const dateFormatted = formatDate(dateOfCell);
        let tooltip = `${dateFormatted}: No activity`;
        if (activity && activity.details.length > 0) {
            tooltip = `${dateFormatted}: ${activity.details.join(", ")}`;
        }
        
        return `<span class="heat-cell level-${intensity}" title="${tooltip}"></span>`;
    }).join("");

    const heatmapHTML = `
    <div class="min-w-[760px]">
      <div class="mb-3 grid grid-cols-12 pl-10 text-xs text-slate-500">
        ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month) => `<span>${month}</span>`).join("")}
      </div>
      <div class="flex gap-3">
        <div class="grid grid-rows-3 gap-2 text-xs text-slate-500">
          <span>Mon</span><span>Wed</span><span>Fri</span>
        </div>
        <div class="grid grid-flow-col grid-rows-7 gap-1.5">${cells}</div>
      </div>
    </div>
  `;

    const heatmapDashboard = document.getElementById("activityHeatmapDashboard");
    if (heatmapDashboard) {
        heatmapDashboard.innerHTML = heatmapHTML;
    }
    const heatmapDetailed = document.getElementById("activityHeatmapDetailed");
    if (heatmapDetailed) {
        heatmapDetailed.innerHTML = heatmapHTML;
    }
}

function showError(type) {
    const content = {
        EMPTY: ["Enter a GitHub username", "The dashboard opens only after a username or GitHub profile URL is provided."],
        USER_NOT_FOUND: ["User not found", "GitHub could not find that profile. Check the spelling or paste a valid profile URL."],
        NETWORK_ERROR: ["Network error", "The request could not be completed. Check your connection and try again."],
        RATE_LIMIT: ["API limit exceeded", "Too many requests were made. Wait a minute and try again."],
    }[type] || ["Something went wrong", "Please try again."];

    elements.welcomeState.classList.add("hidden");
    elements.skeletonState.classList.add("hidden");
    elements.dashboardContent.classList.add("hidden");
    elements.errorState.classList.remove("hidden");
    elements.errorState.innerHTML = `
    <div class="grid min-h-[calc(100vh-112px)] place-items-center">
      <article class="fade-in max-w-xl rounded-3xl border border-red-400/30 bg-red-500/10 p-8 text-center shadow-2xl shadow-red-950/20">
        <p class="text-5xl">!</p>
        <h1 class="mt-5 text-3xl font-bold">${content[0]}</h1>
        <p class="mt-3 text-slate-300 light-mode:text-slate-600">${content[1]}</p>
      </article>
    </div>
  `;
}

function setLoading(isLoading) {
    elements.analyzeBtn.disabled = isLoading;
    elements.buttonSpinner.classList.toggle("hidden", !isLoading);
    elements.buttonText.textContent = isLoading ? "Analyzing..." : "Analyze";

    if (isLoading) {
        elements.welcomeState.classList.add("hidden");
        elements.errorState.classList.add("hidden");
        elements.dashboardContent.classList.add("hidden");
        elements.skeletonState.classList.remove("hidden");
    }
}

function saveSearch(username) {
    state.history = [username, ...state.history.filter((item) => item.toLowerCase() !== username.toLowerCase())].slice(0, 6);
    localStorage.setItem("githubAnalyzerHistory", JSON.stringify(state.history));
    renderSearchHistory();
}

function renderSearchHistory() {
    if (!elements.recentSearches) return;

    const historyHTML = state.history.length
        ? state.history
            .map((username) => `<button class="history-item w-full rounded-xl bg-white/[0.04] px-4 py-3 text-left text-sm transition hover:bg-white/10 light-mode:bg-slate-100" data-username="${username}">@${username}</button>`)
            .join("")
        : `<p class="rounded-xl bg-white/[0.04] px-4 py-3 text-sm text-slate-500 light-mode:bg-slate-100">No searches yet.</p>`;

    elements.recentSearches.innerHTML = historyHTML;

    const recentSearchesRight = document.getElementById("recentSearchesRight");
    if (recentSearchesRight) {
        const historyHTMLRight = state.history.length
            ? state.history
                .map((username) => `
                    <div class="flex items-center justify-between rounded-xl bg-white/[0.04] p-4 light-mode:bg-white light-mode:border light-mode:border-slate-200">
                        <span class="font-semibold text-slate-300 light-mode:text-slate-700">@${username}</span>
                        <button class="history-item-btn rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 hover:scale-105" data-username="${username}">Analyze</button>
                    </div>
                `)
                .join("")
            : `<p class="text-sm text-slate-500 col-span-3">No searches yet.</p>`;
        recentSearchesRight.innerHTML = historyHTMLRight;
    }

    document.querySelectorAll(".history-item, .history-item-btn").forEach((button) => {
        button.addEventListener("click", () => {
            elements.input.value = button.dataset.username;
            elements.form.requestSubmit();
        });
    });
}

async function analyzeProfile(event) {
    if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
    }
    const username = extractUsername(elements.input.value);

    if (!username) {
        showError("EMPTY");
        return;
    }

    // Reset Compare inputs/results
    const compareResult = document.getElementById("compareResult");
    if (compareResult) {
        compareResult.classList.add("hidden");
        compareResult.innerHTML = "";
    }
    const compareInput = document.getElementById("compareInput");
    if (compareInput) {
        compareInput.value = "";
    }

    // Switch view back to main Dashboard overview
    document.querySelectorAll(".dashboard-view").forEach((view) => {
        view.classList.add("hidden");
    });
    const dashboardView = document.getElementById("view-dashboard");
    if (dashboardView) {
        dashboardView.classList.remove("hidden");
    }
    document.querySelectorAll(".nav-link").forEach((nav) => {
        nav.classList.remove("active-nav");
    });
    const dashboardLink = document.querySelector('a[href="#dashboard"]');
    if (dashboardLink) {
        dashboardLink.classList.add("active-nav");
    }

    setLoading(true);

    try {
        const [profile, repositories] = await Promise.all([fetchProfile(username), fetchRepositories(username)]);
        renderProfile(profile, repositories);
        renderDeveloperScore(profile, repositories);
        renderStatistics(profile, repositories);
        renderLanguagesChart(repositories);
        renderRepositoryOverview(repositories);
        renderTopRepositories(repositories);
        renderActivity(repositories);
        saveSearch(profile.login);

        elements.skeletonState.classList.add("hidden");
        elements.errorState.classList.add("hidden");
        elements.dashboardContent.classList.remove("hidden");
    } catch (error) {
        showError(error.message);
    } finally {
        setLoading(false);
    }
}

async function compareProfiles(event) {
    if (event) event.preventDefault();
    const compareInput = document.getElementById("compareInput");
    const compareBtn = document.getElementById("compareBtn");
    const compareSpinner = document.getElementById("compareSpinner");
    const compareResult = document.getElementById("compareResult");

    if (!compareInput || !compareResult) return;

    const secondUsername = extractUsername(compareInput.value);
    const firstUsername = extractUsername(elements.input.value);

    if (!secondUsername) {
        alert("Please enter a valid GitHub username to compare.");
        return;
    }

    if (secondUsername.toLowerCase() === firstUsername.toLowerCase()) {
        alert("Cannot compare the user with themselves!");
        return;
    }

    if (compareBtn) compareBtn.disabled = true;
    if (compareSpinner) compareSpinner.classList.remove("hidden");

    try {
        const [profile1, repos1, profile2, repos2] = await Promise.all([
            fetchProfile(firstUsername),
            fetchRepositories(firstUsername),
            fetchProfile(secondUsername),
            fetchRepositories(secondUsername)
        ]);

        const score1 = calculateDeveloperScore(profile1, repos1);
        const score2 = calculateDeveloperScore(profile2, repos2);

        const forks1 = getTotalForks(repos1);
        const forks2 = getTotalForks(repos2);

        compareResult.classList.remove("hidden");
        compareResult.innerHTML = `
            <article class="rounded-3xl border border-white/10 bg-white/[0.04] p-6 light-mode:bg-white light-mode:border-slate-200">
                <div class="flex items-center gap-4 mb-6">
                    <img src="${profile1.avatar_url}" alt="${profile1.login}" class="h-16 w-16 rounded-2xl object-cover border border-white/10">
                    <div>
                        <h3 class="text-xl font-bold">${profile1.name || profile1.login}</h3>
                        <p class="text-sm text-emerald-300">@${profile1.login}</p>
                    </div>
                </div>
                <div class="space-y-4">
                    <div class="flex justify-between items-center border-b border-white/5 pb-2">
                        <span class="text-sm text-slate-400">Developer Score</span>
                        <span class="text-lg font-bold text-emerald-300">${formatNumber(score1.score)} (${score1.level})</span>
                    </div>
                    <div class="flex justify-between items-center border-b border-white/5 pb-2">
                        <span class="text-sm text-slate-400">Followers</span>
                        <span class="text-lg font-bold">${formatNumber(profile1.followers)}</span>
                    </div>
                    <div class="flex justify-between items-center border-b border-white/5 pb-2">
                        <span class="text-sm text-slate-400">Public Repos</span>
                        <span class="text-lg font-bold">${formatNumber(profile1.public_repos)}</span>
                    </div>
                    <div class="flex justify-between items-center border-b border-white/5 pb-2">
                        <span class="text-sm text-slate-400">Total Stars</span>
                        <span class="text-lg font-bold">${formatNumber(score1.totalStars)}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-sm text-slate-400">Total Forks</span>
                        <span class="text-lg font-bold">${formatNumber(forks1)}</span>
                    </div>
                </div>
            </article>

            <article class="rounded-3xl border border-white/10 bg-white/[0.04] p-6 light-mode:bg-white light-mode:border-slate-200">
                <div class="flex items-center gap-4 mb-6">
                    <img src="${profile2.avatar_url}" alt="${profile2.login}" class="h-16 w-16 rounded-2xl object-cover border border-white/10">
                    <div>
                        <h3 class="text-xl font-bold">${profile2.name || profile2.login}</h3>
                        <p class="text-sm text-emerald-300">@${profile2.login}</p>
                    </div>
                </div>
                <div class="space-y-4">
                    <div class="flex justify-between items-center border-b border-white/5 pb-2">
                        <span class="text-sm text-slate-400">Developer Score</span>
                        <span class="text-lg font-bold text-emerald-300">${formatNumber(score2.score)} (${score2.level})</span>
                    </div>
                    <div class="flex justify-between items-center border-b border-white/5 pb-2">
                        <span class="text-sm text-slate-400">Followers</span>
                        <span class="text-lg font-bold">${formatNumber(profile2.followers)}</span>
                    </div>
                    <div class="flex justify-between items-center border-b border-white/5 pb-2">
                        <span class="text-sm text-slate-400">Public Repos</span>
                        <span class="text-lg font-bold">${formatNumber(profile2.public_repos)}</span>
                    </div>
                    <div class="flex justify-between items-center border-b border-white/5 pb-2">
                        <span class="text-sm text-slate-400">Total Stars</span>
                        <span class="text-lg font-bold">${formatNumber(score2.totalStars)}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-sm text-slate-400">Total Forks</span>
                        <span class="text-lg font-bold">${formatNumber(forks2)}</span>
                    </div>
                </div>
            </article>


        `;
    } catch (error) {
        alert("Error fetching second user details. Please check the spelling.");
    } finally {
        if (compareBtn) compareBtn.disabled = false;
        if (compareSpinner) compareSpinner.classList.add("hidden");
    }
}

function initializeTheme() {
    const storedTheme = localStorage.getItem("githubAnalyzerTheme");
    const useLightMode = storedTheme === "light";
    document.body.classList.toggle("light-mode", useLightMode);
}

function toggleSidebar(isOpen) {
    elements.sidebar.classList.toggle("-translate-x-full", !isOpen);
    elements.sidebarOverlay.classList.toggle("hidden", !isOpen);
}

// Theme initialization is safe on all pages
initializeTheme();

const isDashboard = !!document.getElementById("welcomeState");

function isFirebaseMocked() {
    return typeof firebase === 'undefined' || 
           !firebaseConfig || 
           !firebaseConfig.apiKey || 
           firebaseConfig.apiKey.startsWith("YOUR_") || 
           firebaseConfig.apiKey.includes("PLACEHOLDER") ||
           firebaseConfig.apiKey === "YOUR_API_KEY";
}

function getAuthenticatedUser() {
    if (isFirebaseMocked()) {
        return localStorage.getItem("mockAuthUser");
    }
    return firebase.auth().currentUser;
}

function checkDashboardAuth() {
    if (isFirebaseMocked()) {
        const mockUser = localStorage.getItem("mockAuthUser");
        if (!mockUser) {
            window.location.href = "index.html";
        } else {
            const userProfileCard = document.getElementById("userProfileCard");
            const userEmailDisplay = document.getElementById("userEmailDisplay");
            const logoutBtn = document.getElementById("logoutBtn");
            
            if (userProfileCard) userProfileCard.classList.remove("hidden");
            if (userEmailDisplay) userEmailDisplay.textContent = mockUser;
            if (logoutBtn) {
                logoutBtn.onclick = () => {
                    localStorage.removeItem("mockAuthUser");
                    window.location.href = "index.html";
                };
            }
        }
    } else {
        firebase.auth().onAuthStateChanged((user) => {
            if (!user) {
                window.location.href = "index.html";
            } else {
                const userProfileCard = document.getElementById("userProfileCard");
                const userEmailDisplay = document.getElementById("userEmailDisplay");
                const logoutBtn = document.getElementById("logoutBtn");
                
                if (userProfileCard) userProfileCard.classList.remove("hidden");
                if (userEmailDisplay) userEmailDisplay.textContent = user.email || user.displayName || "Google User";
                if (logoutBtn) {
                    logoutBtn.onclick = () => {
                        firebase.auth().signOut().then(() => {
                            window.location.href = "index.html";
                        });
                    };
                }
            }
        });
    }
}

// Global search landing function
const handleLandingSearch = (event) => {
    if (event) event.preventDefault();
    
    // Auth Guard
    const user = getAuthenticatedUser();
    if (!user) {
        const authModal = document.getElementById("authModal");
        if (authModal) {
            authModal.classList.remove("hidden");
            const authError = document.getElementById("authError");
            if (authError) {
                authError.textContent = "Please sign in or register to analyze profiles.";
                authError.classList.remove("hidden");
            }
        }
        return;
    }

    if (elements.input) {
        const username = extractUsername(elements.input.value);
        if (username) {
            localStorage.setItem("githubUsername", username);
            window.location.href = "dashboard.html";
        } else {
            alert("Please enter a valid GitHub username or profile URL.");
        }
    }
};

function setupAuthModal() {
    const authModal = document.getElementById("authModal");
    const loginBtn = document.getElementById("loginBtn");
    const closeAuthModal = document.getElementById("closeAuthModal");
    const tabSignIn = document.getElementById("tabSignIn");
    const tabSignUp = document.getElementById("tabSignUp");
    const authForm = document.getElementById("authForm");
    const authEmail = document.getElementById("authEmail");
    const authPassword = document.getElementById("authPassword");
    const authError = document.getElementById("authError");
    const authSubmitBtn = document.getElementById("authSubmitBtn");
    const authSpinner = document.getElementById("authSpinner");
    const authSubmitText = document.getElementById("authSubmitText");
    const googleAuthBtn = document.getElementById("googleAuthBtn");

    let isSignInMode = true;

    if (!authModal) return;

    // Toggle Modal / Sign Out
    if (loginBtn) {
        loginBtn.onclick = () => {
            const user = getAuthenticatedUser();
            if (user) {
                if (isFirebaseMocked()) {
                    localStorage.removeItem("mockAuthUser");
                    loginBtn.textContent = "Login";
                    alert("Logged out successfully.");
                } else {
                    firebase.auth().signOut().then(() => {
                        loginBtn.textContent = "Login";
                    });
                }
            } else {
                authModal.classList.remove("hidden");
                if (authError) authError.classList.add("hidden");
            }
        };
    }

    if (closeAuthModal) {
        closeAuthModal.onclick = () => {
            authModal.classList.add("hidden");
        };
    }

    // Switch Tabs
    if (tabSignIn && tabSignUp) {
        tabSignIn.onclick = () => {
            isSignInMode = true;
            tabSignIn.className = "flex-1 pb-3 text-emerald-300 border-b-2 border-emerald-300 cursor-pointer";
            tabSignUp.className = "flex-1 pb-3 text-zinc-400 hover:text-zinc-200 cursor-pointer";
            if (authSubmitText) authSubmitText.textContent = "Sign In";
            if (authError) authError.classList.add("hidden");
        };

        tabSignUp.onclick = () => {
            isSignInMode = false;
            tabSignUp.className = "flex-1 pb-3 text-emerald-300 border-b-2 border-emerald-300 cursor-pointer";
            tabSignIn.className = "flex-1 pb-3 text-zinc-400 hover:text-zinc-200 cursor-pointer";
            if (authSubmitText) authSubmitText.textContent = "Sign Up";
            if (authError) authError.classList.add("hidden");
        };
    }

    // Handle Form Submit
    if (authForm) {
        authForm.onsubmit = async (event) => {
            event.preventDefault();
            const email = authEmail.value;
            const password = authPassword.value;

            if (authSubmitBtn) authSubmitBtn.disabled = true;
            if (authSpinner) authSpinner.classList.remove("hidden");
            if (authError) authError.classList.add("hidden");

            try {
                if (isFirebaseMocked()) {
                    localStorage.setItem("mockAuthUser", email);
                    if (authSpinner) authSpinner.classList.add("hidden");
                    if (authSubmitBtn) authSubmitBtn.disabled = false;
                    
                    authModal.classList.add("hidden");
                    if (loginBtn) loginBtn.textContent = "Sign Out";
                    
                    if (elements.input && elements.input.value.trim()) {
                        handleLandingSearch();
                    } else {
                        window.location.href = "dashboard.html";
                    }
                } else {
                    if (isSignInMode) {
                        await firebase.auth().signInWithEmailAndPassword(email, password);
                    } else {
                        await firebase.auth().createUserWithEmailAndPassword(email, password);
                    }
                    if (authSpinner) authSpinner.classList.add("hidden");
                    if (authSubmitBtn) authSubmitBtn.disabled = false;
                    
                    authModal.classList.add("hidden");
                    if (loginBtn) loginBtn.textContent = "Sign Out";

                    if (elements.input && elements.input.value.trim()) {
                        handleLandingSearch();
                    } else {
                        window.location.href = "dashboard.html";
                    }
                }
            } catch (error) {
                if (authSpinner) authSpinner.classList.add("hidden");
                if (authSubmitBtn) authSubmitBtn.disabled = false;
                if (authError) {
                    authError.textContent = error.message;
                    authError.classList.remove("hidden");
                }
            }
        };
    }

    // Handle Google Auth Submit
    if (googleAuthBtn) {
        googleAuthBtn.onclick = async () => {
            if (authSubmitBtn) authSubmitBtn.disabled = true;
            if (authSpinner) authSpinner.classList.remove("hidden");
            if (authError) authError.classList.add("hidden");

            try {
                if (isFirebaseMocked()) {
                    // Simulate successful Google Login in mock mode
                    localStorage.setItem("mockAuthUser", "google-user@example.com");
                    
                    if (authSpinner) authSpinner.classList.add("hidden");
                    if (authSubmitBtn) authSubmitBtn.disabled = false;
                    
                    authModal.classList.add("hidden");
                    if (loginBtn) loginBtn.textContent = "Sign Out";
                    
                    if (elements.input && elements.input.value.trim()) {
                        handleLandingSearch();
                    } else {
                        window.location.href = "dashboard.html";
                    }
                } else {
                    const provider = new firebase.auth.GoogleAuthProvider();
                    provider.setCustomParameters({ prompt: 'select_account' });
                    
                    await firebase.auth().signInWithPopup(provider);
                    
                    if (authSpinner) authSpinner.classList.add("hidden");
                    if (authSubmitBtn) authSubmitBtn.disabled = false;
                    
                    authModal.classList.add("hidden");
                    if (loginBtn) loginBtn.textContent = "Sign Out";

                    if (elements.input && elements.input.value.trim()) {
                        handleLandingSearch();
                    } else {
                        window.location.href = "dashboard.html";
                    }
                }
            } catch (error) {
                if (authSpinner) authSpinner.classList.add("hidden");
                if (authSubmitBtn) authSubmitBtn.disabled = false;
                if (authError) {
                    authError.textContent = error.message;
                    authError.classList.remove("hidden");
                }
            }
        };
    }
}

if (isDashboard) {
    checkDashboardAuth();

    if (elements.form) {
        elements.form.addEventListener("submit", analyzeProfile);
    }
    if (elements.themeToggle) {
        elements.themeToggle.addEventListener("click", () => {
            const useLightMode = !document.body.classList.contains("light-mode");
            document.body.classList.toggle("light-mode", useLightMode);
            localStorage.setItem("githubAnalyzerTheme", useLightMode ? "light" : "dark");
        });
    }
    if (elements.mobileMenuBtn) {
        elements.mobileMenuBtn.addEventListener("click", () => toggleSidebar(true));
    }
    if (elements.sidebarOverlay) {
        elements.sidebarOverlay.addEventListener("click", () => toggleSidebar(false));
    }
    if (elements.clearHistoryBtn) {
        elements.clearHistoryBtn.addEventListener("click", () => {
            state.history = [];
            localStorage.removeItem("githubAnalyzerHistory");
            renderSearchHistory();
        });
    }
    
    const clearHistoryBtnRight = document.getElementById("clearHistoryBtnRight");
    if (clearHistoryBtnRight) {
        clearHistoryBtnRight.addEventListener("click", () => {
            state.history = [];
            localStorage.removeItem("githubAnalyzerHistory");
            renderSearchHistory();
        });
    }

    const compareForm = document.getElementById("compareForm");
    if (compareForm) {
        compareForm.addEventListener("submit", compareProfiles);
    }

    const repoSearchInput = document.getElementById("repoSearchInput");
    if (repoSearchInput) {
        repoSearchInput.addEventListener("input", (event) => {
            const query = event.target.value.toLowerCase();
            const filtered = (state.repositories || []).filter((repo) => 
                repo.name.toLowerCase().includes(query) || 
                (repo.language && repo.language.toLowerCase().includes(query))
            );
            renderAllRepositoriesDetailed(filtered);
        });
    }

    const viewAllReposLink = document.getElementById("viewAllReposLink");
    if (viewAllReposLink) {
        viewAllReposLink.addEventListener("click", (event) => {
            event.preventDefault();
            const reposNav = document.querySelector('a[href="#repositories"]');
            if (reposNav) {
                reposNav.click();
            }
        });
    }

    document.querySelectorAll(".nav-link").forEach((link) => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            
            if (elements.dashboardContent.classList.contains("hidden")) {
                alert("Please analyze a profile first to view dashboard tabs.");
                return;
            }

            document.querySelectorAll(".nav-link").forEach((nav) => {
                nav.classList.remove("active-nav");
            });
            link.classList.add("active-nav");

            document.querySelectorAll(".dashboard-view").forEach((view) => {
                view.classList.add("hidden");
            });

            const targetId = link.getAttribute("href").substring(1);
            const targetView = document.getElementById(`view-${targetId}`);
            if (targetView) {
                targetView.classList.remove("hidden");
            }
            toggleSidebar(false);
        });
    });

    renderSearchHistory();

    const pendingUsername = localStorage.getItem("githubUsername");
    if (pendingUsername) {
        if (elements.input) {
            elements.input.value = pendingUsername;
        }
        analyzeProfile();
        localStorage.removeItem("githubUsername");
    }
} else {
    // Setup login/auth states on index page
    setupAuthModal();

    if (typeof firebase !== 'undefined' && !isFirebaseMocked()) {
        firebase.auth().onAuthStateChanged((user) => {
            const loginBtn = document.getElementById("loginBtn");
            if (loginBtn) {
                loginBtn.textContent = user ? "Sign Out" : "Login";
            }
        });
    } else {
        const loginBtn = document.getElementById("loginBtn");
        if (loginBtn) {
            const user = getAuthenticatedUser();
            loginBtn.textContent = user ? "Sign Out" : "Login";
        }
    }

    if (elements.form) {
        elements.form.addEventListener("submit", handleLandingSearch);
    }
    if (elements.analyzeBtn) {
        elements.analyzeBtn.addEventListener("click", handleLandingSearch);
    }
}

 
