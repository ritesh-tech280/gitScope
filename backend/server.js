const express = require("express")
const cors = require("cors")
const axios = require("axios")
const apiLimiter = require("./middleware/ratelimit");
const path = require("path");


const app = express();
app.use(cors())
app.use(express.json())
app.use("/api/github", apiLimiter)

app.use(express.static(path.join(__dirname, "../public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

async function requestGitHub(path, params = {}) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "github-analyzer-dashboard",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return axios.get(`https://api.github.com${path}`, {
    params,
    headers,
  });
}

function handleGitHubError(error, res) {
  const status = error.response?.status;

  if (status === 404) {
    return res.status(404).json({ message: "User not found" });
  }

  if (status === 403 || status === 429) {
    return res.status(429).json({
      message: "GitHub API rate limit exceeded",
    });
  }

  return res.status(500).json({
    message: "Unable to fetch GitHub data",
  });
}

app.get("/api/github/:username/repos", async (req, res) => {
  try {
    const username = req.params.username;

    const response = await requestGitHub(`/users/${encodeURIComponent(username)}/repos`, {
      per_page: 100,
      sort: "updated",
    });

    res.json(response.data);

  } catch (error) {
    handleGitHubError(error, res);
  }
});

app.get("/api/github/:username", async (req, res) => {
  try {
    const username = req.params.username;

    const response = await requestGitHub(`/users/${encodeURIComponent(username)}`);

    res.json(response.data);

  } catch (error) {
    handleGitHubError(error, res);
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});;
