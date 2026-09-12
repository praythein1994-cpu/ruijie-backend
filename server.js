const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const RUIJIE_BASE = "https://cloud-as.ruijienetworks.com";

// 1. RUIJIE OAUTH AUTHENTICATION ROUTE
app.post('/api/auth/login', async (req, res) => {
  const { email, password, token, appid, secret } = req.body;

  // Values from Client or Fallback to your registered Developer App credentials
  const targetToken = token || "d63dss0a81e4415a889ac5b78fsc904a";
  const targetAppId = appid || email || "open6dfe7fa50c37";
  const targetSecret = secret || password || "5b6df901ce97435ab49b3a5714faf947";

  console.log(`[LOGIN ATTEMPT] AppID: ${targetAppId}`);

  try {
    const response = await axios.post(
      `${RUIJIE_BASE}/service/api/oauth20/client/access_token`,
      {
        appid: targetAppId,
        secret: targetSecret
      },
      {
        params: { token: targetToken },
        headers: { "Content-Type": "application/json" },
        timeout: 15000
      }
    );

    console.log("[RUIJIE RESPONSE]:", response.data);

    if (response.data && response.data.code === 0) {
      return res.json({
        success: true,
        userToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
        message: "Logged in successfully"
      });
    } else {
      return res.status(401).json({
        success: false,
        message: response.data?.msg || "Authentication failed"
      });
    }
  } catch (error) {
    console.error("[AUTH ERROR]:", error.response?.status, error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: error.response?.data?.msg || "Ruijie Gateway Connection Failed",
      details: error.response?.data || error.message
    });
  }
});

// 2. PROJECT LIST
app.get('/api/projects', async (req, res) => {
  const accessToken = req.headers['x-ruijie-token'];
  if (!accessToken) return res.status(401).json({ error: "Missing x-ruijie-token" });

  try {
    const response = await axios.post(`${RUIJIE_BASE}/service/api/v1/project/list`, {}, {
      params: { access_token: accessToken },
      headers: { "Authorization": `Bearer ${accessToken}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. HARDWARE DEVICES
app.get('/api/devices', async (req, res) => {
  const accessToken = req.headers['x-ruijie-token'];
  const { projectId } = req.query;

  try {
    const response = await axios.get(`${RUIJIE_BASE}/service/api/maint/devices`, {
      params: { access_token: accessToken, projectId },
      headers: { "Authorization": `Bearer ${accessToken}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. CONNECTED CLIENTS
app.get('/api/clients', async (req, res) => {
  const accessToken = req.headers['x-ruijie-token'];
  const { projectId } = req.query;

  try {
    const response = await axios.post(`${RUIJIE_BASE}/service/api/v1/client/list`, {
      project_id: projectId
    }, {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. VOUCHER GENERATE
app.post('/api/vouchers/generate', async (req, res) => {
  const accessToken = req.headers['x-ruijie-token'];
  const { projectId, duration, quota } = req.body;

  try {
    const response = await axios.post(`${RUIJIE_BASE}/service/api/v1/auth/voucher/create`, {
      project_id: projectId,
      duration: duration || 60,
      quota: quota || 1
    }, {
      params: { access_token: accessToken },
      headers: { "Authorization": `Bearer ${accessToken}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. VOUCHER DELETE
app.post('/api/vouchers/delete', async (req, res) => {
  const accessToken = req.headers['x-ruijie-token'];
  const { projectId, code } = req.body;

  try {
    const response = await axios.post(`${RUIJIE_BASE}/service/api/v1/auth/voucher/delete`, {
      project_id: projectId,
      code: code
    }, {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
